import type { Scenario } from './schema';
import type { SimState } from './state';
import { MODEL } from './model';
import { AIRWAY, OXYGEN, SIM, VENTILATION, lmaAppropriate, spo2TargetAt, needsPlasticWrap } from '../clinical/guidelines';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const approach = (cur: number, target: number, tau: number) => cur + (target - cur) / Math.max(1, tau);

export function ventInterrupted(s: SimState): boolean {
  return s.busy.some((b) => b.interruptsVent);
}

/** FiO2 (%) yang benar-benar diterima bayi. */
export function deliveredFio2(s: SimState): number {
  if (s.vent.mode === 'none') return OXYGEN.SIB_FIO2_ROOM_AIR;
  if (s.vent.mode === 'ppv' && ventInterrupted(s)) return OXYGEN.SIB_FIO2_ROOM_AIR;
  return s.vent.fio2;
}

/** Efektivitas VTP (0–1) berdasar antarmuka, langkah MR. SOPA, tekanan, laju, dsb. */
export function computePpvEffect(s: SimState, sc: Scenario): number {
  if (s.vent.mode !== 'ppv' || ventInterrupted(s)) return 0;
  const h = sc.hidden;
  let eff = 1;
  const iface = s.vent.iface;
  if (iface === 'mask') {
    const smallNeeded = h.weightKg < AIRWAY.MASK_SMALL_BELOW_KG;
    if (s.vent.maskSmall !== smallNeeded) eff *= MODEL.MASK_WRONG_SIZE;
    if (h.maskLeak && !s.mr.M) eff *= MODEL.MASK_LEAK;
    if (h.positionIssue && !s.mr.R) eff *= MODEL.POSITION_ISSUE;
    if ((h.secretions || h.meconium) && !s.mr.S && !s.suctioned) eff *= MODEL.SECRETIONS;
    if (h.mouthClosed && !s.mr.O) eff *= MODEL.MOUTH_CLOSED;
    if (h.obstruction === 'robin' && !(s.prone || s.npa)) eff *= MODEL.ROBIN_MASK;
  } else if (iface === 'lma') {
    if (!lmaAppropriate(h.gaWeeks, h.weightKg)) eff *= MODEL.LMA_UNDERSIZED_PATIENT;
    if ((h.secretions || h.meconium) && !s.mr.S && !s.suctioned) eff *= MODEL.SECRETIONS_LMA;
  } else if (iface === 'ett') {
    switch (s.ett.position) {
      case 'trachea':
        break;
      case 'right-main':
        eff *= MODEL.ETT_RIGHT_MAIN;
        break;
      case 'shallow':
        eff *= MODEL.ETT_SHALLOW;
        break;
      default:
        eff *= MODEL.ETT_ESOPHAGUS;
    }
    if (s.flags.ettTooSmall) eff *= MODEL.ETT_TOO_SMALL_LEAK;
  }
  // tekanan
  const req = h.requiredPip;
  if (s.vent.pip < req) {
    eff *= clamp(1 - (req - s.vent.pip) / MODEL.PRESSURE_SLOPE, MODEL.PRESSURE_MIN_FACTOR, 1);
  }
  // laju
  const r = s.vent.rate;
  if (!s.compressions.active && (r < VENTILATION.RATE_PER_MIN.min || r > VENTILATION.RATE_PER_MIN.max)) {
    eff *= MODEL.RATE_OFF_RANGE;
  }
  if (s.compressions.active && s.compressions.ratio !== '3:1') eff *= MODEL.COMPRESSION_WRONG_RATIO_VENT;
  // hernia diafragmatika: distensi lambung saat VTP non-ETT
  if (h.cdh) eff *= 1 - MODEL.CDH_DISTENSION_IMPACT * s.gastricDistension;
  if (s.pneumothorax.active) eff *= MODEL.PNEUMOTHORAX_VENT;
  return clamp(eff, 0, 1);
}

/** Efektivitas napas spontan (0–1). */
export function computeSpontEffect(s: SimState, sc: Scenario): number {
  const h = sc.hidden;
  if (s.vent.iface === 'ett' && s.ett.placed && s.vent.mode !== 'ppv' && s.vent.mode !== 'cpap') {
    // napas spontan lewat ETT tanpa dukungan — tetap bisa, tapi kurang
    return s.drive * 0.6;
  }
  let eff = s.drive;
  if (h.obstruction === 'choanal' && !s.oralAirway && !(s.lma || s.ett.placed)) {
    // atresia koana: bayi bernapas melalui hidung; membaik saat menangis
    // menangis (saat mulai hipoksia) membuka jalur mulut → siklus sianosis
    eff *= s.asphyxia >= MODEL.CHOANAL_CRY_ABOVE_ASPHYXIA ? 0.9 : MODEL.CHOANAL_NO_AIRWAY;
  }
  if (h.obstruction === 'robin' && !(s.prone || s.npa || s.lma || s.ett.placed)) eff *= MODEL.ROBIN_SPONT;
  if ((h.secretions || h.meconium) && !s.suctioned && !s.mr.S) eff *= MODEL.SECRETIONS_SPONT;
  if (h.rds) eff *= s.vent.mode === 'cpap' || s.vent.mode === 'ppv' ? MODEL.RDS_SPONT_CPAP : MODEL.RDS_SPONT_NO_CPAP;
  if (h.cdh) eff *= 0.6;
  if (s.pneumothorax.active) eff *= MODEL.PNEUMOTHORAX_SPONT;
  return clamp(eff, 0, 1);
}

export function lungFactor(s: SimState, sc: Scenario): number {
  const h = sc.hidden;
  let lf = h.lungCompliance;
  const peep = s.vent.mode === 'ppv' || s.vent.mode === 'cpap' ? s.vent.peep : 0;
  if (h.rds && peep < VENTILATION.PEEP_CMH2O) lf *= MODEL.RDS_NO_PEEP_LUNG;
  if (s.pneumothorax.active) lf *= MODEL.PNEUMOTHORAX_LUNG;
  return clamp(lf, 0.05, 1);
}

export function compressionQuality(s: SimState): number {
  if (!s.compressions.active) return 0;
  let q = 1;
  if (s.compressions.technique !== 'dua-ibu-jari') q *= MODEL.CPR_TWO_FINGER;
  if (s.compressions.ratio !== '3:1') q *= MODEL.CPR_WRONG_RATIO;
  if (s.vent.mode !== 'ppv' || ventInterrupted(s)) q *= MODEL.CPR_NO_VENT;
  return q;
}

/** Satu langkah fisiologi 1 detik. */
export function physiologyTick(s: SimState, sc: Scenario): void {
  const h = sc.hidden;
  const ppv = computePpvEffect(s, sc);
  const spont = computeSpontEffect(s, sc);
  s.ventEff = ppv;
  s.spontEff = spont;
  const A = Math.max(ppv, spont);
  const fio2 = deliveredFio2(s);
  const lf = lungFactor(s, sc);

  // ---- distensi lambung (hernia diafragmatika) ----
  if (h.cdh) {
    if (s.ogt) s.gastricDistension = clamp(s.gastricDistension - MODEL.CDH_DECOMPRESS_RATE, 0, 1);
    else if (s.vent.mode === 'ppv' && s.vent.iface !== 'ett' && !ventInterrupted(s))
      s.gastricDistension = clamp(s.gastricDistension + MODEL.CDH_DISTENSION_RATE, 0, 1);
  }

  // ---- SpO2 ----
  let eq: number;
  if (A < 0.15) eq = MODEL.SPO2_FLOOR;
  else {
    const L = 0.45 + 0.55 * lf;
    eq = MODEL.SPO2_BASE + A * L * (MODEL.SPO2_GAIN_ROOM_AIR + (fio2 - OXYGEN.SIB_FIO2_ROOM_AIR) * MODEL.SPO2_GAIN_PER_FIO2);
  }
  eq = Math.min(eq, h.spo2Ceiling, 100);
  if (s.hr < 60) eq = Math.min(eq, 35 + s.hr * 0.5);
  s.spo2 = clamp(approach(s.spo2, eq, eq > s.spo2 ? MODEL.SPO2_TAU_RISE_S : MODEL.SPO2_TAU_FALL_S), 0, 100);

  // ---- asfiksia (utang oksigen) ----
  const oxyGood = s.spo2 >= 85 ? 1 : s.spo2 >= 70 ? 0.6 : s.spo2 >= 50 ? 0.25 : 0;
  if (A >= 0.5) {
    // pemulihan bergantung pada perfusi: HR rendah → lebih lambat; kompresi membantu
    const perfusion = Math.max(clamp(s.hr / 100, MODEL.PERFUSION_FLOOR, 1), compressionQuality(s) * MODEL.ASPHYXIA_RECOVERY_CPR_PERFUSION);
    s.asphyxia -= (MODEL.ASPHYXIA_RECOVERY_VENT * A + MODEL.ASPHYXIA_RECOVERY_OXY * A * oxyGood) * perfusion;
  } else {
    s.asphyxia += 2 * MODEL.ASPHYXIA_ACCUM_APNEA * Math.max(0, 0.5 - A) + (s.spo2 < 50 ? MODEL.ASPHYXIA_ACCUM_HYPOX : 0);
  }
  s.asphyxia = clamp(s.asphyxia, 0, 100);

  // ---- miokard ----
  const cq = compressionQuality(s);
  const cpp = cq * (A >= 0.5 ? 1 : 0.4) * (0.5 + (0.5 * fio2) / 100);
  if (s.cardiac >= MODEL.CARDIAC_FREE_RECOVERY_ABOVE && A >= 0.5 && s.hr >= 60) {
    s.cardiac += MODEL.CARDIAC_NATURAL_RECOVERY * A;
  }
  if (s.compressions.active && s.cardiac < h.compressionCeiling) {
    s.cardiac = Math.min(h.compressionCeiling, s.cardiac + MODEL.CARDIAC_CPR_GAIN * cpp);
  }
  if (s.asphyxia > 85 && A < 0.5 && !s.compressions.active) s.cardiac -= MODEL.CARDIAC_DECAY;
  // efek epinefrin yang jatuh tempo
  const due = s.pendingEffects.filter((e) => e.at <= s.t);
  s.pendingEffects = s.pendingEffects.filter((e) => e.at > s.t);
  for (const e of due) {
    const circulating = s.hr >= 60 || cq > 0.3;
    s.cardiac += MODEL.CARDIAC_EPI_GAIN * e.factor * h.epiResponse * (circulating ? 1 : 0.3);
    if (e.overdose) s.hr += MODEL.EPI_OVERDOSE_HR_SPIKE;
  }
  s.cardiac = clamp(s.cardiac, 0, 1);

  // ---- volume (infus berjalan) ----
  for (const inf of s.infusions) {
    if (s.t > inf.start && s.t <= inf.end) {
      const perS = (MODEL.VOLUME_DEFICIT_PER_BOLUS * (inf.mlPerKg / 10)) / Math.max(1, inf.end - inf.start);
      s.volumeDeficit = clamp(s.volumeDeficit - perS, 0, 1);
    }
  }

  // ---- HR ----
  const target = MODEL.hrTarget(s.asphyxia, s.cardiac, s.volumeDeficit, SIM.BASELINE_HR);
  s.hr = clamp(approach(s.hr, target, target > s.hr ? MODEL.HR_TAU_UP_S : MODEL.HR_TAU_DOWN_S), 0, 230);

  // ---- napas & tonus ----
  if (A >= 0.5 && s.spo2 >= 80) s.goodOxygenationS += 1;
  s.drive = clamp(approach(s.drive, MODEL.driveTarget(s, sc), MODEL.DRIVE_TAU_S), 0, 1);
  s.tone = clamp(approach(s.tone, MODEL.toneTarget(s.asphyxia, h.gaWeeks), MODEL.TONE_TAU_S), 0, 1);

  // ---- suhu ----
  const ga = h.gaWeeks;
  let loss = MODEL.TEMP_LOSS_BASE * MODEL.TEMP_GA_FACTOR(ga);
  if (s.wrapped) loss *= MODEL.TEMP_DRIED_OR_WRAPPED;
  else if (s.dried) loss *= needsPlasticWrap(ga, h.weightKg) ? MODEL.TEMP_DRIED_VERY_PRETERM : MODEL.TEMP_DRIED_OR_WRAPPED;
  if (s.hat) loss *= MODEL.TEMP_HAT;
  loss *= (s.temp - MODEL.TEMP_AMBIENT) / MODEL.TEMP_GRADIENT_REF;
  let gain = 0;
  if (s.warmer && s.temp < MODEL.TEMP_WARMER_SERVO_C) gain += MODEL.TEMP_WARMER_GAIN;
  if (s.skinToSkin && s.temp < MODEL.TEMP_SKIN_TO_SKIN_MAX_C) gain += MODEL.TEMP_SKIN_TO_SKIN_GAIN;
  s.temp = clamp(s.temp + gain - loss, 30, 40);

  // ---- pelacakan ventilasi efektif ----
  if (A >= MODEL.EFFECTIVE_VENT) {
    if (s.effectiveVentS === 0) s.lastEffectiveVentStart = s.t;
    s.effectiveVentS += 1;
    if (s.flags.firstEffectiveVentT === undefined && s.effectiveVentS >= 5 && (s.vent.mode === 'ppv' || spont >= MODEL.EFFECTIVE_VENT))
      s.flags.firstEffectiveVentT = s.t - 4;
  } else {
    s.effectiveVentS = 0;
  }
  if (s.vent.mode === 'ppv' && ppv >= MODEL.EFFECTIVE_VENT) {
    s.flags.ppvEffectiveS = ((s.flags.ppvEffectiveS as number) ?? 0) + 1;
    if (s.flags.firstPpvEffectiveT === undefined && ((s.flags.ppvEffectiveS as number) ?? 0) >= 5) s.flags.firstPpvEffectiveT = s.t - 4;
  }

  // ---- barotrauma & hiperoksia ----
  if (s.vent.mode === 'ppv' && s.vent.pip >= VENTILATION.BAROTRAUMA_PIP_CMH2O && !ventInterrupted(s)) s.barotraumaS += 1;
  const band = spo2TargetAt(s.t);
  if (fio2 > OXYGEN.SIB_FIO2_ROOM_AIR && s.spo2 > OXYGEN.SPO2_HYPEROXIA_ABOVE && !s.compressions.active) s.hyperoxiaS += 1;
  // ---- stabilisasi ----
  const inTarget = band ? s.spo2 >= band.min - OXYGEN.SPO2_TOLERANCE_BELOW : s.spo2 >= 60;
  if (s.hr >= 100 && A >= MODEL.EFFECTIVE_VENT && inTarget && !s.compressions.active) s.stableS += 1;
  else s.stableS = 0;
  if (s.stableS >= SIM.STABLE_HOLD_S && s.stabilizedAt === null) s.stabilizedAt = s.t - SIM.STABLE_HOLD_S;
}
