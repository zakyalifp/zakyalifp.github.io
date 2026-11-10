/**
 * Geometri kertas EKG (murni, tanpa DOM) — semua dalam milimeter kertas.
 * Diuji otomatis: 1 mV = gain mm (10 mm pada kalibrasi standar), 1 detik = speed mm (25 mm).
 */
import type { LeadName } from '../core/types';
import { PAPER } from '../../clinical/ecg-criteria';

export type LayoutKind = '3x4' | '6x2' | 'single' | '12x1';

export interface PaperSettings {
  /** mm/detik */
  speed: number;
  /** mm/mV */
  gain: number;
  layout: LayoutKind;
  /** Untuk layout 'single'. */
  singleLead?: LeadName;
  /** Tampilkan baris sadapan tambahan (V4R, V7–V9) bila tersedia. */
  extraRow?: boolean;
  /** Strip irama (sadapan II) di bawah. */
  rhythmLead?: LeadName;
}

export interface Panel {
  lead: LeadName;
  /** Waktu sinyal awal (detik) & durasi. */
  t0: number;
  dur: number;
  /** Posisi kiri panel (mm) & garis dasar (mm dari atas). */
  x: number;
  y: number;
  w: number;
  /** Tinggi baris (mm) — untuk kliping/anotasi. */
  h: number;
  isRhythm?: boolean;
}

export interface PaperLayout {
  width: number;
  height: number;
  panels: Panel[];
  /** Posisi pulsa kalibrasi per baris (mm). */
  calibrations: Array<{ x: number; y: number }>;
  speed: number;
  gain: number;
}

export const LEFT_MARGIN_MM = 12;
export const RIGHT_MARGIN_MM = 4;
export const TOP_MARGIN_MM = 6;
/** Lebar area sinyal standar (10 detik pada 25 mm/s). */
export const TRACE_WIDTH_MM = 250;

export function mvToMm(mv: number, gain: number = PAPER.GAIN_MM_PER_MV): number {
  return mv * gain;
}
export function secToMm(s: number, speed: number = PAPER.SPEED_MM_PER_S): number {
  return s * speed;
}
export function mmToMs(mm: number, speed: number = PAPER.SPEED_MM_PER_S): number {
  return (mm / speed) * 1000;
}
export function mmToMv(mm: number, gain: number = PAPER.GAIN_MM_PER_MV): number {
  return mm / gain;
}

const GRID_3X4: LeadName[][] = [
  ['I', 'aVR', 'V1', 'V4'],
  ['II', 'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];

/** Tinggi baris menyesuaikan gain agar QRS ±2 mV muat. */
export function rowHeight(gain: number): number {
  return Math.max(22, Math.min(60, gain * 3.4));
}

export function computeLayout(s: PaperSettings, durationS: number, extraLeadsAvailable: LeadName[] = []): PaperLayout {
  const speed = s.speed;
  const gain = s.gain;
  const rh = rowHeight(gain);
  const traceW = TRACE_WIDTH_MM;
  const visibleDur = Math.min(durationS, traceW / speed);
  const panels: Panel[] = [];
  const calibrations: Array<{ x: number; y: number }> = [];
  let y = TOP_MARGIN_MM + rh * 0.6;
  const x0 = LEFT_MARGIN_MM;
  const rhythm = s.rhythmLead ?? 'II';

  const addRow = (leads: LeadName[], colDur: number) => {
    const colW = colDur * speed;
    leads.forEach((lead, c) => panels.push({ lead, t0: c * colDur, dur: colDur, x: x0 + c * colW, y, w: colW, h: rh }));
    calibrations.push({ x: 2, y });
    y += rh;
  };

  if (s.layout === '3x4') {
    const colDur = visibleDur / 4;
    for (const row of GRID_3X4) addRow(row, colDur);
    if (s.extraRow && extraLeadsAvailable.length) {
      const ex = (['V4R', 'V7', 'V8', 'V9'] as LeadName[]).filter((l) => extraLeadsAvailable.includes(l));
      if (ex.length) addRow(ex, colDur);
    }
    panels.push({ lead: rhythm, t0: 0, dur: visibleDur, x: x0, y, w: visibleDur * speed, h: rh, isRhythm: true });
    calibrations.push({ x: 2, y });
    y += rh;
  } else if (s.layout === '6x2') {
    const colDur = visibleDur / 2;
    const left: LeadName[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
    const right: LeadName[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    for (let i = 0; i < 6; i++) addRow([left[i], right[i]], colDur);
    panels.push({ lead: rhythm, t0: 0, dur: visibleDur, x: x0, y, w: visibleDur * speed, h: rh, isRhythm: true });
    calibrations.push({ x: 2, y });
    y += rh;
  } else if (s.layout === '12x1') {
    const all: LeadName[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', ...extraLeadsAvailable.filter(() => !!s.extraRow)];
    for (const l of all) {
      panels.push({ lead: l, t0: 0, dur: visibleDur, x: x0, y, w: visibleDur * speed, h: rh * 0.85 });
      calibrations.push({ x: 2, y });
      y += rh * 0.85;
    }
  } else {
    const lead = s.singleLead ?? 'II';
    panels.push({ lead, t0: 0, dur: visibleDur, x: x0, y: y + rh * 0.3, w: visibleDur * speed, h: rh * 1.6 });
    calibrations.push({ x: 2, y: y + rh * 0.3 });
    y += rh * 1.6;
  }
  return { width: x0 + traceW + RIGHT_MARGIN_MM, height: y - rh * 0.4 + 4, panels, calibrations, speed, gain };
}

/** Koordinat kertas (mm) untuk sampel waktu t (detik) & amplitudo v (mV) pada panel. */
export function panelPoint(p: Panel, t: number, mv: number, speed: number, gain: number): { x: number; y: number } {
  return { x: p.x + (t - p.t0) * speed, y: p.y - mv * gain };
}

/** Panel & waktu di bawah titik kertas (untuk kaliper/anotasi). */
export function hitPanel(L: PaperLayout, xmm: number, ymm: number): { panel: Panel; t: number; mv: number } | null {
  for (const p of L.panels) {
    if (xmm >= p.x && xmm <= p.x + p.w && ymm >= p.y - p.h / 2 && ymm <= p.y + p.h / 2) {
      return { panel: p, t: p.t0 + (xmm - p.x) / L.speed, mv: (p.y - ymm) / L.gain };
    }
  }
  return null;
}
