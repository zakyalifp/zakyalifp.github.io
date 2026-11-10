/**
 * Pengukuran sederhana pada sinyal (dipakai untuk ground truth sintetis, uji otomatis,
 * dan validasi). Amplitudo dikembalikan dalam mm pada 10 mm/mV.
 */
import type { BeatMark, EcgSignal, LeadName } from './types';

const MM_PER_MV = 10;

function mean(arr: Float32Array, i0: number, i1: number): number {
  let s = 0;
  let c = 0;
  for (let i = Math.max(0, i0); i <= Math.min(arr.length - 1, i1); i++) {
    s += arr[i];
    c++;
  }
  return c ? s / c : 0;
}

/** Garis dasar sebelum QRS (segmen PR/TP), mV. */
export function baselineBefore(sig: EcgSignal, lead: LeadName, qrsT: number, pT?: number | null): number {
  const a = sig.leads[lead];
  if (!a) return 0;
  const fs = sig.fs;
  // Segmen PR: 30–10 ms sebelum QRS. Bila tidak ada P (AF/VT), ambil 60–20 ms sebelum QRS.
  const w = pT !== null && pT !== undefined ? [qrsT - 0.03, qrsT - 0.012] : [qrsT - 0.06, qrsT - 0.02];
  return mean(a, Math.round(w[0] * fs), Math.round(w[1] * fs));
}

export interface BeatMeasure {
  /** Deviasi ST di titik J (mm, + = elevasi). */
  stJ: number;
  /** Deviasi ST di J+60 ms (mm). */
  stJ60: number;
  /** R maksimum (mm, positif). */
  r: number;
  /** S/Q terdalam (mm, positif = kedalaman). */
  s: number;
  /** Puncak T (mm, bertanda; nilai absolut terbesar). */
  t: number;
  /** Luas netto QRS (mV·s). */
  qrsArea: number;
}

export function measureBeat(sig: EcgSignal, lead: LeadName, b: BeatMark): BeatMeasure | null {
  const a = sig.leads[lead];
  if (!a || b.qrs === null || b.j === null || b.tEnd === null) return null;
  const fs = sig.fs;
  const base = baselineBefore(sig, lead, b.qrs, b.p);
  const iq = Math.round(b.qrs * fs);
  const ij = Math.round(b.j * fs);
  const it = Math.round(b.tEnd * fs);
  if (iq < 0 || it >= a.length) return null;
  let rMax = 0;
  let sMin = 0;
  let area = 0;
  for (let i = iq; i <= ij; i++) {
    const v = a[i] - base;
    if (v > rMax) rMax = v;
    if (v < sMin) sMin = v;
    area += v / fs;
  }
  let tExt = 0;
  for (let i = ij + Math.round(0.04 * fs); i <= it; i++) {
    const v = a[i] - base;
    if (Math.abs(v) > Math.abs(tExt)) tExt = v;
  }
  const j60 = Math.min(a.length - 1, ij + Math.round(0.06 * fs));
  return {
    stJ: (a[ij] - base) * MM_PER_MV,
    stJ60: (a[j60] - base) * MM_PER_MV,
    r: rMax * MM_PER_MV,
    s: -sMin * MM_PER_MV,
    t: tExt * MM_PER_MV,
    qrsArea: area,
  };
}

/** Median pengukuran per sadapan atas denyut yang dipilih. */
export function measureLeads(sig: EcgSignal, beats: BeatMark[], leads: LeadName[], filter?: (b: BeatMark) => boolean): Partial<Record<LeadName, BeatMeasure>> {
  const out: Partial<Record<LeadName, BeatMeasure>> = {};
  const sel = beats.filter((b) => b.qrs !== null && b.tEnd !== null && b.qrs > 0.25 && b.tEnd < sig.length / sig.fs - 0.05 && (!filter || filter(b)));
  for (const l of leads) {
    const ms = sel.map((b) => measureBeat(sig, l, b)).filter((x): x is BeatMeasure => !!x);
    if (!ms.length) continue;
    const med = (f: (m: BeatMeasure) => number) => {
      const v = ms.map(f).sort((x, y) => x - y);
      return v[Math.floor(v.length / 2)];
    };
    out[l] = { stJ: med((m) => m.stJ), stJ60: med((m) => m.stJ60), r: med((m) => m.r), s: med((m) => m.s), t: med((m) => m.t), qrsArea: med((m) => m.qrsArea) };
  }
  return out;
}
