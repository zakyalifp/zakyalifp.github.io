/**
 * Streaming EKG real-time untuk monitor irama: `createEcgStream({ rhythm, morph, ... })`.
 * Menghasilkan sampel berurutan untuk sadapan yang diminta; perubahan irama lewat
 * `setRhythm()` diterapkan mulus pada batas denyut berikutnya (komponen kontinu seperti
 * AF/VF di-crossfade ±0,6 detik).
 */
import type { LeadName } from '../core/types';
import type { MorphSpec } from './morph';
import { createRng, hashSeed, type Rng } from './prng';
import { renderRange, type NoiseSpec, type RenderInput } from './render';
import { Scheduler, continuousFor, nominalRate, type AtrialEv, type RhythmSpec, type VentEv } from './rhythm';

export interface EcgStreamOptions {
  rhythm: RhythmSpec;
  morph?: MorphSpec;
  /** Laju jantung — pintasan untuk irama yang memakai `rate`. */
  hr?: number;
  seed?: number | string;
  fs?: number;
  leads?: LeadName[];
  noise?: NoiseSpec;
}

export interface EcgStream {
  readonly fs: number;
  /** Waktu stream saat ini (detik). */
  readonly time: number;
  /** Ambil `n` sampel berikutnya untuk setiap sadapan (mV). */
  read(n: number): Partial<Record<LeadName, Float32Array>>;
  /** Ganti irama; transisi pada denyut berikutnya. */
  setRhythm(rhythm: RhythmSpec, morph?: MorphSpec): void;
  /** Laju nominal irama aktif (/menit; 0 untuk VF/asistol). */
  readonly rate: number;
  readonly rhythm: RhythmSpec;
  /** Kejadian QRS dalam rentang [t0, t1) — untuk bunyi "beep"/deteksi. */
  qrsBetween(t0: number, t1: number): VentEv[];
}

function withHr(r: RhythmSpec, hr?: number): RhythmSpec {
  if (hr === undefined) return r;
  if ('rate' in r) return { ...r, rate: hr } as RhythmSpec;
  return r;
}

export function createEcgStream(opts: EcgStreamOptions): EcgStream {
  const fs = opts.fs ?? 250;
  const leads: LeadName[] = opts.leads ?? ['II'];
  const seedNum = hashSeed(opts.seed ?? 'stream');
  const rng: Rng = createRng(seedNum);
  let rhythm = withHr(opts.rhythm, opts.hr);
  let morph: MorphSpec = opts.morph ?? {};
  const atrial: AtrialEv[] = [];
  const vent: VentEv[] = [];
  const continuous: RenderInput['continuous'] = [];
  const morphs: Array<{ at: number; m: MorphSpec }> = [{ at: -Infinity, m: morph }];
  let sched = new Scheduler(rhythm, rng, -1);
  let segStart = -2;
  let cursor = 0; // indeks sampel berikutnya
  const pushCont = (r: RhythmSpec, t0: number) => {
    const c = continuousFor(r);
    if (c.af || c.flutter || c.vf) continuous.push({ c, t0, t1: Infinity });
  };
  pushCont(rhythm, segStart);

  let nA0 = 0;
  let nV0 = 0;
  const pull = (horizon: number) => {
    sched.advanceTo(horizon);
    for (let i = nA0; i < sched.out.atrial.length; i++) atrial.push(sched.out.atrial[i]);
    for (let i = nV0; i < sched.out.vent.length; i++) {
      const v = sched.out.vent[i];
      const prev = [...vent].reverse().find((x) => !x.spikeOnly);
      if (prev && !v.spikeOnly) v.rr = Math.max(0.2, v.t - prev.t);
      vent.push(v);
    }
    nA0 = sched.out.atrial.length;
    nV0 = sched.out.vent.length;
  };

  const morphAt = (t: number) => {
    let m = morphs[0].m;
    for (const x of morphs) if (t >= x.at) m = x.m;
    return m;
  };

  return {
    fs,
    get time() {
      return cursor / fs;
    },
    get rate() {
      return nominalRate(rhythm);
    },
    get rhythm() {
      return rhythm;
    },
    read(n: number) {
      const tEnd = (cursor + n) / fs;
      pull(tEnd + 1.2);
      // buang kejadian lama
      const tOld = cursor / fs - 2;
      while (vent.length > 2 && vent[0].t < tOld) vent.shift();
      while (atrial.length > 2 && atrial[0].t < tOld) atrial.shift();
      const out = renderRange({ atrial, vent, morph, continuous, morphAt }, { fs, i0: cursor, n, seed: seedNum, leads, noise: opts.noise });
      cursor += n;
      const res: Partial<Record<LeadName, Float32Array>> = {};
      for (const l of leads) res[l] = out[l];
      return res;
    },
    setRhythm(r: RhythmSpec, m?: MorphSpec) {
      const now = cursor / fs;
      // Buang kejadian yang belum dimulai (lebih dari 80 ms ke depan)
      const cut = now + 0.08;
      for (let i = vent.length - 1; i >= 0; i--) if (vent[i].t > cut) vent.splice(i, 1);
      for (let i = atrial.length - 1; i >= 0; i--) if (atrial[i].t > cut) atrial.splice(i, 1);
      const lastQrs = [...vent].reverse().find((v) => !v.spikeOnly)?.t;
      for (const c of continuous) if (c.t1 === Infinity) c.t1 = now + 0.6;
      rhythm = r;
      if (m) {
        morph = m;
        morphs.push({ at: cut, m });
      }
      sched = new Scheduler(r, rng, cut, lastQrs);
      nA0 = 0;
      nV0 = 0;
      segStart = now;
      pushCont(r, now);
    },
    qrsBetween(t0: number, t1: number) {
      return vent.filter((v) => !v.spikeOnly && v.t >= t0 && v.t < t1);
    },
  };
}
