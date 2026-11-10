/**
 * API utama synthesizer 12 sadapan: `synthesize(spec)` → sinyal + penanda denyut + ground truth.
 * Deterministik terhadap `seed`.
 */
import type { BeatMark, EcgSignal, LeadName } from '../core/types';
import { STANDARD_LEADS } from '../core/types';
import type { MorphSpec } from './morph';
import { buildP } from './morph';
import { createRng, hashSeed } from './prng';
import { renderRange, templateFor, type ElectrodeFault, type NoiseSpec, type RenderInput } from './render';
import { Scheduler, baseRr, continuousFor, type RhythmSpec, type VentEv } from './rhythm';
import { axisFromIaVF, qtcBazett, qtcFridericia } from '../../clinical/ecg-criteria';

export interface SynthSegment {
  /** Waktu mulai segmen (detik). */
  at: number;
  rhythm: RhythmSpec;
  morph?: MorphSpec;
}

export interface SynthSpec {
  rhythm: RhythmSpec;
  morph?: MorphSpec;
  seed: number | string;
  durationS?: number;
  fs?: number;
  noise?: NoiseSpec;
  electrodes?: ElectrodeFault;
  /** Render juga V3R–V5R & V7–V9. */
  extraLeads?: boolean;
  /** Perubahan irama dalam satu rekaman. */
  segments?: SynthSegment[];
}

export interface SynthTruth {
  /** Laju ventrikel (/menit). */
  hr: number;
  /** Laju atrium (/menit) bila ada aktivitas atrium terorganisasi. */
  atrialRate: number | null;
  prMs: number | null;
  qrsMs: number | null;
  qtMs: number | null;
  qtcBazettMs: number | null;
  qtcFridericiaMs: number | null;
  axisDeg: number | null;
  rrS: number | null;
  regular: boolean;
}

export interface SynthResult {
  signal: EcgSignal;
  beats: BeatMark[];
  truth: SynthTruth;
  /** Kejadian mentah (untuk anotasi). */
  vent: VentEv[];
}

export const DEFAULT_FS = 500;

function scheduleAll(spec: SynthSpec, duration: number) {
  const rng = createRng(spec.seed);
  const segs: SynthSegment[] = [{ at: 0, rhythm: spec.rhythm, morph: spec.morph }, ...(spec.segments ?? [])].sort((a, b) => a.at - b.at);
  const atrial: RenderInput['atrial'] = [];
  const vent: VentEv[] = [];
  const continuous: RenderInput['continuous'] = [];
  let prevQrs: number | undefined;
  for (let s = 0; s < segs.length; s++) {
    const seg = segs[s];
    const end = s + 1 < segs.length ? segs[s + 1].at : duration + 1;
    // Mulai lebih awal agar denyut pertama di awal rekaman lengkap (P & T sebelumnya)
    const start = s === 0 ? -1.2 : seg.at;
    const sch = new Scheduler(seg.rhythm, rng, start, s === 0 ? undefined : prevQrs);
    sch.advanceTo(end);
    for (const a of sch.out.atrial) if (a.t >= start - 0.3 && a.t < end) atrial.push(a);
    for (const v of sch.out.vent) if (v.t >= start && v.t < end) vent.push(v);
    const last = vent[vent.length - 1];
    prevQrs = last?.t;
    const c = continuousFor(seg.rhythm);
    if (c.af || c.flutter || c.vf) continuous.push({ c, t0: s === 0 ? -2 : seg.at, t1: s + 1 < segs.length ? end + 0.3 : duration + 2 });
  }
  // Perbarui RR sebenarnya (setelah penggabungan segmen)
  vent.sort((a, b) => a.t - b.t);
  let last: number | null = null;
  for (const v of vent) {
    if (v.spikeOnly) continue;
    if (last !== null) v.rr = Math.max(0.2, v.t - last);
    else v.rr = baseRr(segs[0].rhythm);
    last = v.t;
  }
  const morphAt = (t: number): MorphSpec => {
    let m = segs[0].morph ?? {};
    for (const sg of segs) if (t >= sg.at && sg.morph) m = sg.morph;
    return m;
  };
  return { atrial, vent, continuous, morphAt };
}

export function synthesize(spec: SynthSpec): SynthResult {
  const fs = spec.fs ?? DEFAULT_FS;
  const duration = spec.durationS ?? 10;
  const n = Math.round(duration * fs);
  const sched = scheduleAll(spec, duration);
  const leads: LeadName[] = [...STANDARD_LEADS];
  if (spec.extraLeads) leads.push('V3R', 'V4R', 'V5R', 'V7', 'V8', 'V9');
  const morph = spec.morph ?? {};
  const out = renderRange(
    { atrial: sched.atrial, vent: sched.vent, morph, continuous: sched.continuous, morphAt: sched.morphAt },
    { fs, i0: 0, n, seed: hashSeed(spec.seed), leads, noise: spec.noise, electrodes: spec.electrodes },
  );
  const signal: EcgSignal = { fs, length: n, leads: {} };
  for (const l of leads) if (out[l]) signal.leads[l] = out[l];

  const beats = beatMarks(sched, duration);
  const truth = computeTruth(spec, sched, signal, duration);
  return { signal, beats, truth, vent: sched.vent.filter((v) => v.t >= 0 && v.t < duration) };
}

function beatMarks(sched: ReturnType<typeof scheduleAll>, duration: number): BeatMark[] {
  const marks: BeatMark[] = [];
  let idx = 0;
  const conductedP = new Set<number>();
  for (const v of sched.vent) {
    idx++;
    if (v.t < -0.5 || v.t > duration) continue;
    if (v.pRef !== undefined) conductedP.add(Math.round(v.pRef * 1000));
    if (v.spikeOnly) {
      marks.push({ p: null, qrs: null, j: null, tEnd: null, kind: v.label });
      continue;
    }
    const tpl = templateFor(v, sched.morphAt(v.t), idx);
    marks.push({ p: v.pRef ?? null, qrs: v.t, j: v.t + tpl.qrsDur, tEnd: v.t + tpl.qt, kind: v.label });
  }
  for (const a of sched.atrial) {
    if (a.t < 0 || a.t > duration) continue;
    if (!conductedP.has(Math.round(a.t * 1000))) marks.push({ p: a.t, qrs: null, j: null, tEnd: null, kind: 'P tidak dikonduksikan/independen' });
  }
  return marks.sort((a, b) => (a.qrs ?? a.p ?? 0) - (b.qrs ?? b.p ?? 0));
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
}

function computeTruth(spec: SynthSpec, sched: ReturnType<typeof scheduleAll>, sig: EcgSignal, duration: number): SynthTruth {
  const vs = sched.vent.filter((v) => !v.spikeOnly && v.t >= 0 && v.t <= duration);
  const rrs: number[] = [];
  for (let i = 1; i < vs.length; i++) rrs.push(vs[i].t - vs[i - 1].t);
  const meanRr = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : null;
  const cv = meanRr && rrs.length > 1 ? Math.sqrt(rrs.reduce((a, b) => a + (b - meanRr) ** 2, 0) / rrs.length) / meanRr : 0;
  const hr = meanRr ? Math.round(60 / meanRr) : 0;
  const atr = sched.atrial.filter((a) => a.t >= 0 && a.t <= duration).map((a) => a.t);
  const pp: number[] = [];
  for (let i = 1; i < atr.length; i++) pp.push(atr[i] - atr[i - 1]);
  const flutter = sched.continuous.find((c) => c.c.flutter);
  let atrialRate = pp.length ? Math.round(60 / median(pp)) : null;
  if (flutter?.c.flutter) atrialRate = flutter.c.flutter.rate;
  if (sched.continuous.some((c) => c.c.af || c.c.vf)) atrialRate = null;

  // Denyut dominan: label paling sering
  const counts = new Map<string, number>();
  for (const v of vs) counts.set(v.beat, (counts.get(v.beat) ?? 0) + 1);
  const dom = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const domBeats = vs.filter((v) => v.beat === dom);
  const prs = domBeats.filter((v) => v.pRef !== undefined && v.beat === 'conducted').map((v) => (v.t - v.pRef!) * 1000);
  const prMs = prs.length ? Math.round(Math.min(...prs)) : null;
  let qrsMs: number | null = null;
  let qtMs: number | null = null;
  let axis: number | null = null;
  if (domBeats.length) {
    const rep = domBeats[Math.floor(domBeats.length / 2)];
    const idx = sched.vent.indexOf(rep) + 1;
    const tpl = templateFor(rep, sched.morphAt(rep.t), idx);
    qrsMs = Math.round(tpl.qrsDur * 1000);
    qtMs = Math.round(tpl.qt * 1000);
    // Aksis dari luas netto QRS di I dan aVF (rerata denyut dominan)
    let sI = 0;
    let sF = 0;
    const I = sig.leads.I!;
    const F = sig.leads.aVF!;
    for (const b of domBeats) {
      const i0 = Math.round(b.t * sig.fs);
      const i1 = Math.round((b.t + tpl.qrsDur) * sig.fs);
      if (i0 < 5 || i1 >= sig.length) continue;
      const bi = I[i0 - 3];
      const bf = F[i0 - 3];
      for (let i = i0; i <= i1; i++) {
        sI += I[i] - bi;
        sF += F[i] - bf;
      }
    }
    if (Math.abs(sI) + Math.abs(sF) > 1e-6) axis = Math.round(axisFromIaVF(sI, sF));
  }
  if (sched.continuous.some((c) => c.c.vf) && !vs.length) {
    qrsMs = qtMs = axis = null;
  }
  const rrRep = meanRr ?? null;
  const qtcB = qtMs && rrRep ? Math.round(qtcBazett(qtMs, rrRep)) : null;
  const qtcF = qtMs && rrRep ? Math.round(qtcFridericia(qtMs, rrRep)) : null;
  void spec;
  return { hr, atrialRate, prMs, qrsMs, qtMs, qtcBazettMs: qtcB, qtcFridericiaMs: qtcF, axisDeg: axis, rrS: rrRep, regular: cv < 0.08 };
}

/** Untuk uji & anotasi: P tunggal. */
export { buildP };
