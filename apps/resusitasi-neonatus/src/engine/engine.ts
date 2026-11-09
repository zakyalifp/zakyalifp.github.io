/**
 * Engine simulasi: deterministik (tanpa bilangan acak), langkah 1 detik.
 * Fungsi murni: setiap fungsi menerima state dan mengembalikan state baru.
 */
import type { Domain, IdealStep, Scenario } from './schema';
import { cloneState, createInitialState, type Judgement, type Params, type SimState } from './state';
import { ACTION_MAP, type Ctx } from './actions';
import { physiologyTick, deliveredFio2 } from './physiology';
import { MODEL } from './model';
import { HEART_RATE, OXYGEN, SIM, TEMPERATURE, TIMING, VENTILATION } from '../clinical/guidelines';

export interface DispatchResult {
  state: SimState;
  ok: boolean;
  message?: string;
  newJudgements: Judgement[];
}

export function createSim(sc: Scenario): SimState {
  return createInitialState(sc);
}

function makeCtx(s: SimState, sc: Scenario, p: Params, actionId: string, label: string): Ctx {
  return {
    s,
    sc,
    p,
    judge: (code, ok, domain, msg, critical = false) => {
      s.judgements.push({ t: s.phase === 'prebirth' ? -1 : s.t, code, ok, critical: !ok && critical, domain, msg });
    },
    note: (detail) => {
      s.log.push({ t: s.phase === 'prebirth' ? -1 : s.t, action: `${actionId}:note`, label, detail });
    },
  };
}

function judgeOnce(s: SimState, code: string, ok: boolean, domain: Domain, msg: string, critical = false) {
  if (s.judgements.some((j) => j.code === code)) return;
  s.judgements.push({ t: s.t, code, ok, critical: !ok && critical, domain, msg });
}

/** Jalankan tindakan pengguna. */
export function dispatch(prev: SimState, sc: Scenario, actionId: string, params: Params = {}): DispatchResult {
  const def = ACTION_MAP[actionId];
  if (!def) return { state: prev, ok: false, message: `Tindakan tidak dikenal: ${actionId}`, newJudgements: [] };
  if (prev.phase === 'ended') return { state: prev, ok: false, message: 'Skenario sudah berakhir.', newJudgements: [] };
  const avail = def.available(prev, sc);
  if (avail !== true) return { state: prev, ok: false, message: avail, newJudgements: [] };
  if (def.prebirthOnly && prev.phase !== 'prebirth' && actionId !== 'birth') return { state: prev, ok: false, message: 'Hanya sebelum lahir.', newJudgements: [] };

  const s = cloneState(prev);
  const before = s.judgements.length;
  const ctx = makeCtx(s, sc, params, actionId, def.label);
  const hands = def.hands ? def.hands(s) : 0;
  const duration = def.duration ? def.duration(s, sc, params) : 0;
  if (hands > 0 && s.staff - handsInUseLocal(s) < hands) {
    return { state: prev, ok: false, message: 'Semua anggota tim sedang sibuk — panggil bantuan atau hentikan tugas lain.', newJudgements: [] };
  }
  const logT = s.phase === 'prebirth' ? -1 : s.t;
  const rejected = def.start ? def.start(ctx) : undefined;
  if (typeof rejected === 'string') return { state: prev, ok: false, message: rejected, newJudgements: [] };
  s.log.push({ t: actionId === 'birth' ? 0 : logT, action: actionId, label: def.label, params: Object.keys(params).length ? params : undefined });

  if (duration > 0 && def.complete) {
    s.busy.push({
      action: actionId,
      label: def.label,
      startedAt: s.t,
      endsAt: s.t + duration,
      hands,
      interruptsVent: !!def.interruptsVent && s.vent.mode === 'ppv',
      params,
    });
  } else if (def.complete) {
    def.complete(ctx);
  }
  return { state: s, ok: true, newJudgements: s.judgements.slice(before) };
}

function handsInUseLocal(s: SimState): number {
  let n = 0;
  if (s.vent.mode === 'ppv' || s.vent.mode === 'cpap') n += 1;
  if (s.compressions.active) n += 1;
  for (const b of s.busy) n += b.hands;
  return n;
}

/** Maju satu detik. */
export function tick(prev: SimState, sc: Scenario): SimState {
  if (prev.phase !== 'running') return prev;
  const s = cloneState(prev);
  s.t += SIM.TICK_S;

  // tali pusat: penundaan selesai
  if (s.cord.decision === 'tunda' && s.cord.clampedAt === s.t) {
    s.log.push({ t: s.t, action: 'cord:note', label: 'Tali pusat', detail: 'Penundaan selesai — tali pusat dijepit.' });
  }
  // bantuan tiba
  if (s.helpArrivesAt !== null && s.t >= s.helpArrivesAt) {
    s.staff = Math.min(SIM.MAX_STAFF, s.staff + 1);
    s.helpArrivesAt = null;
    s.log.push({ t: s.t, action: 'call-help:note', label: 'Bantuan', detail: 'Tambahan personel tiba.' });
  }
  // tindakan yang selesai
  const done = s.busy.filter((b) => b.endsAt <= s.t);
  s.busy = s.busy.filter((b) => b.endsAt > s.t);
  for (const b of done) {
    const def = ACTION_MAP[b.action];
    if (def?.complete) def.complete(makeCtx(s, sc, b.params ?? {}, b.action, def.label));
  }
  // kejadian terjadwal
  for (const ev of sc.events) {
    if (ev.type === 'pneumothorax' && !s.pneumothorax.active && !s.pneumothorax.resolved) {
      const byTime = ev.at !== undefined && s.t >= ev.at;
      const byVent = ev.afterEffectiveVentilationS !== undefined && ((s.flags.ppvEffectiveS as number) ?? 0) >= ev.afterEffectiveVentilationS;
      if (byTime || byVent) {
        s.pneumothorax = { active: true, side: ev.side, resolved: false, at: s.t };
        s.flags.ptxEventT = s.t;
      }
    }
  }
  // barotrauma iatrogenik
  if (s.barotraumaS >= VENTILATION.BAROTRAUMA_DURATION_S && !s.pneumothorax.active && !s.pneumothorax.resolved && !s.flags.iatrogenicPtx) {
    s.pneumothorax = { active: true, side: 'kanan', resolved: false, at: s.t };
    s.flags.iatrogenicPtx = true;
    judgeOnce(s, 'barotrauma', false, 'ventilasi', `Tekanan inspirasi ≥${VENTILATION.BAROTRAUMA_PIP_CMH2O} cmH₂O berkepanjangan memicu pneumotoraks.`, true);
  }

  physiologyTick(s, sc);
  if (s.compressions.active) s.compressions.totalS += 1;

  // ---- penilaian berkala (sekali saja per kode) ----
  if (s.t === TIMING.PPV_START_DEADLINE_S + 1 && s.vent.firstStartedAt === null && (s.drive < 0.5 || s.hr < HEART_RATE.PPV_BELOW_BPM)) {
    judgeOnce(s, 'ppv-timing', false, 'ventilasi', `Bayi apnea/megap-megap atau HR <${HEART_RATE.PPV_BELOW_BPM} tetapi VTP belum dimulai dalam ${TIMING.PPV_START_DEADLINE_S} detik.`);
  }
  if (s.compressions.active && s.compressions.startedAt !== null && s.t - s.compressions.startedAt === 30 && sc.equipment.oxygen) {
    const ok = deliveredFio2(s) >= OXYGEN.FIO2_DURING_COMPRESSIONS;
    judgeOnce(s, 'fio2-compressions', ok, 'kompresi', ok ? `FiO₂ ${OXYGEN.FIO2_DURING_COMPRESSIONS}% saat kompresi.` : `Naikkan FiO₂ ke ${OXYGEN.FIO2_DURING_COMPRESSIONS}% saat kompresi dada.`);
  }
  if (s.compressions.active && s.compressions.startedAt !== null && s.t - s.compressions.startedAt === TIMING.COMPRESSIONS_REASSESS_S) {
    if (s.vent.iface === 'mask' && (sc.equipment.lma || sc.equipment.intubation))
      judgeOnce(s, 'alt-airway-compressions', false, 'kompresi', 'Saat kompresi dada, ventilasi sebaiknya melalui jalan napas alternatif (ETT/LMA).');
    if (s.ecg.placedAt === null && sc.equipment.ecgMonitor)
      judgeOnce(s, 'ecg-compressions', false, 'kompresi', 'Pasang EKG saat kompresi untuk menilai HR secara akurat.');
  }
  if (s.compressions.active && s.hr >= HEART_RATE.COMPRESSIONS_BELOW_BPM) {
    s.flags.compressionsHrOkS = ((s.flags.compressionsHrOkS as number) ?? 0) + 1;
    if ((s.flags.compressionsHrOkS as number) > SIM.COMPRESSIONS_OVERRUN_S)
      judgeOnce(s, 'compressions-overrun', false, 'kompresi', `Kompresi diteruskan >${SIM.COMPRESSIONS_OVERRUN_S} detik padahal HR sudah ≥${HEART_RATE.COMPRESSIONS_BELOW_BPM}.`);
  }
  if (s.hyperoxiaS > SIM.HYPEROXIA_TOLERANCE_S)
    judgeOnce(s, 'hyperoxia', false, 'ventilasi', `SpO₂ >${OXYGEN.SPO2_HYPEROXIA_ABOVE}% dengan O₂ tambahan lebih dari ${SIM.HYPEROXIA_TOLERANCE_S} detik — turunkan FiO₂.`);
  if (s.temp < TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C)
    judgeOnce(s, 'hypothermia', false, 'langkahAwal', `Suhu turun di bawah ${TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C} °C — perbaiki termoregulasi.`);
  if (s.temp > TEMPERATURE.HYPERTHERMIA_ABOVE_C)
    judgeOnce(s, 'hyperthermia', false, 'langkahAwal', `Suhu di atas ${TEMPERATURE.HYPERTHERMIA_ABOVE_C} °C — hindari hipertermia.`);

  // riwayat tanda vital
  if (s.t % MODEL.HISTORY_EVERY_S === 0) s.history.push({ t: s.t, hr: Math.round(s.hr), spo2: Math.round(s.spo2), fio2: deliveredFio2(s), temp: Math.round(s.temp * 10) / 10 });

  const max = sc.maxDurationS ?? SIM.DEFAULT_MAX_S;
  if (s.t >= max) {
    s.phase = 'ended';
    s.endReason = 'waktu-habis';
  }
  return s;
}

export function advance(s: SimState, sc: Scenario, seconds: number): SimState {
  let cur = s;
  for (let i = 0; i < seconds && cur.phase === 'running'; i++) cur = tick(cur, sc);
  return cur;
}

/** Jalankan serangkaian langkah (jalur ideal/salah) secara otomatis. */
export function runPath(sc: Scenario, path: IdealStep[], opts: { endAt?: number } = {}): { state: SimState; failures: string[] } {
  let s = createSim(sc);
  const failures: string[] = [];
  for (const step of path) {
    if (s.phase === 'running' && step.t > s.t) s = advance(s, sc, step.t - s.t);
    if (s.phase === 'ended') break;
    const r = dispatch(s, sc, step.action, step.params ?? {});
    if (!r.ok) failures.push(`t=${step.t} ${step.action}: ${r.message}`);
    s = r.state;
  }
  if (opts.endAt !== undefined && s.phase === 'running') {
    s = advance(s, sc, opts.endAt - s.t);
    if (s.phase === 'running') s = dispatch(s, sc, 'end').state;
  }
  return { state: s, failures };
}
