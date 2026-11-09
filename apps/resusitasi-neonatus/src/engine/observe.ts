/** Variabel TERLIHAT: apa yang dapat dilihat/diukur pengguna dari state tersembunyi. */
import type { Scenario } from './schema';
import type { SimState } from './state';
import { MODEL } from './model';
import { deliveredFio2 } from './physiology';
import { COMPRESSIONS, HEART_RATE, OXYGEN, SIM, spo2TargetAt, type Range } from '../clinical/guidelines';

export type Breathing = 'apnea' | 'megap-megap' | 'lemah' | 'teratur' | 'menangis';
export type Tone = 'lemas' | 'sedang' | 'baik';
export type SkinColor = 'pucat' | 'sianosis-sentral' | 'akrosianosis' | 'merah-muda';
export type Chest = 'tidak-tampak' | 'minimal' | 'baik';

export interface Observation {
  t: number;
  breathing: Breathing;
  tone: Tone;
  color: SkinColor;
  colorMix: number; // 0 = sangat sianosis, 1 = merah muda
  pallor: number; // 0–1
  chest: Chest;
  chestAsymmetric: boolean;
  crying: boolean;
  // monitor
  hrDisplay: number | null;
  hrSource: 'ekg' | 'oksimeter' | null;
  spo2Display: number | null;
  spo2Acquiring: boolean;
  spo2Site: string | null;
  tempDisplay: number | null;
  fio2: number;
  ecgOn: boolean;
  rhythm: 'sinus' | 'bradikardia' | 'asistol' | null;
  target: Range | null;
  alarms: string[];
  ventilating: boolean;
  ventRate: number;
  compressing: boolean;
  monitorAvailable: boolean;
  trueHr: number; // dipakai untuk suara/irama stetoskop (bukan tampilan)
}

export function observe(s: SimState, sc: Scenario): Observation {
  const breathing: Breathing =
    s.drive > 0.85 && s.asphyxia < 15 ? 'menangis' : s.drive > 0.5 ? 'teratur' : s.drive > 0.3 ? 'lemah' : s.drive > 0.1 ? 'megap-megap' : 'apnea';
  const tone: Tone = s.tone > 0.7 ? 'baik' : s.tone > 0.35 ? 'sedang' : 'lemas';
  const pallor = Math.max(0, Math.min(1, s.volumeDeficit * 2.5 + (s.cardiac < 0.4 ? 0.4 : 0)));
  const colorMix = Math.max(0, Math.min(1, (s.spo2 - 55) / 35));
  const color: SkinColor = pallor > 0.5 ? 'pucat' : s.spo2 < 70 ? 'sianosis-sentral' : s.spo2 < 88 ? 'akrosianosis' : 'merah-muda';
  const v = s.vent.mode === 'ppv' ? s.ventEff : s.spontEff;
  const chest: Chest = v >= MODEL.EFFECTIVE_VENT ? 'baik' : v >= MODEL.VISIBLE_CHEST_MIN ? 'minimal' : 'tidak-tampak';
  const crying = breathing === 'menangis' && !s.ett.placed && s.vent.mode === 'none';

  const ecgOn = s.ecg.placedAt !== null && s.t >= s.ecg.placedAt;
  const oxAcq = s.pulseOx.placedAt !== null && s.t - s.pulseOx.placedAt >= SIM.PULSE_OX_ACQUIRE_S;
  const oxReading = oxAcq && s.hr >= SIM.PULSE_OX_MIN_HR;
  const postductal = s.pulseOx.site !== null && s.pulseOx.site !== 'tangan-kanan';
  const offset = postductal ? (sc.hidden.cdh || sc.hidden.spo2Ceiling < 100 ? MODEL.POSTDUCTAL_OFFSET_PPHN : MODEL.POSTDUCTAL_OFFSET) : 0;
  const spo2Display = oxReading ? Math.max(0, Math.round(s.spo2 - offset)) : null;
  const hrDisplay = ecgOn ? Math.round(s.hr) : oxReading ? Math.round(s.hr) : null;
  const target = spo2TargetAt(s.t);
  const alarms: string[] = [];
  if (hrDisplay !== null && hrDisplay < HEART_RATE.COMPRESSIONS_BELOW_BPM) alarms.push(`HR <${HEART_RATE.COMPRESSIONS_BELOW_BPM}`);
  else if (hrDisplay !== null && hrDisplay < HEART_RATE.PPV_BELOW_BPM) alarms.push(`HR <${HEART_RATE.PPV_BELOW_BPM}`);
  if (spo2Display !== null && target && spo2Display < target.min - OXYGEN.SPO2_TOLERANCE_BELOW) alarms.push('SpO₂ di bawah target');
  if (spo2Display !== null && spo2Display > OXYGEN.SPO2_HYPEROXIA_ABOVE && deliveredFio2(s) > OXYGEN.SIB_FIO2_ROOM_AIR) alarms.push('SpO₂ tinggi — turunkan FiO₂');
  const rhythm = ecgOn ? (s.hr < 5 ? 'asistol' : s.hr < HEART_RATE.PPV_BELOW_BPM ? 'bradikardia' : 'sinus') : null;
  return {
    t: s.t,
    breathing,
    tone,
    color,
    colorMix,
    pallor,
    chest,
    chestAsymmetric: s.pneumothorax.active || (s.ett.placed && s.ett.position === 'right-main'),
    crying,
    hrDisplay,
    hrSource: ecgOn ? 'ekg' : oxReading ? 'oksimeter' : null,
    spo2Display,
    spo2Acquiring: s.pulseOx.placedAt !== null && !oxReading,
    spo2Site: s.pulseOx.site,
    tempDisplay: s.tempProbe ? Math.round(s.temp * 10) / 10 : null,
    fio2: deliveredFio2(s),
    ecgOn,
    rhythm,
    target,
    alarms,
    ventilating: s.vent.mode === 'ppv' && !s.busy.some((b) => b.interruptsVent),
    ventRate: s.compressions.active ? COMPRESSIONS.BREATHS_PER_MIN : s.vent.rate,
    compressing: s.compressions.active,
    monitorAvailable: sc.equipment.pulseOximeter || sc.equipment.ecgMonitor,
    trueHr: s.hr,
  };
}

export const BREATHING_LABEL: Record<Breathing, string> = {
  apnea: 'Apnea',
  'megap-megap': 'Megap-megap',
  lemah: 'Napas lemah',
  teratur: 'Napas teratur',
  menangis: 'Menangis kuat',
};
export const TONE_LABEL: Record<Tone, string> = { lemas: 'Lemas', sedang: 'Sedang', baik: 'Baik (fleksi)' };
export const COLOR_LABEL: Record<SkinColor, string> = {
  pucat: 'Pucat',
  'sianosis-sentral': 'Sianosis sentral',
  akrosianosis: 'Akrosianosis',
  'merah-muda': 'Merah muda',
};
export const CHEST_LABEL: Record<Chest, string> = { 'tidak-tampak': 'Tidak tampak', minimal: 'Minimal', baik: 'Baik' };
