/**
 * Renderer: mengubah kejadian denyut + morfologi menjadi sampel per sadapan (mV).
 * Bersifat stateless terhadap rentang waktu (hasil identik walau dirender per potongan),
 * sehingga dapat dipakai untuk 10 detik penuh maupun streaming monitor.
 */
import type { LeadName, Vec3 } from '../core/types';
import { buildP, buildVentricular, type Kernel, type MorphSpec, type StShape, type VentricularTemplate } from './morph';
import type { AtrialEv, Continuous, VentEv } from './rhythm';
import { hashNoise } from './prng';
import { DOWER, EXTRA_VECTORS, add, norm, rotateFrontal, scale, territoryVector } from './vcg';
import { limbElectrodes } from '../core/leads';

export interface NoiseSpec {
  /** Baseline wander (mV). */
  wander?: number;
  /** Noise otot/EMG (mV). */
  emg?: number;
  /** Interferensi listrik 50 Hz (mV). */
  mains?: number;
  /** Tremor ~5 Hz pada sadapan ekstremitas (mV). */
  tremor?: number;
  /** Artefak gerak (pseudo-VT) dalam rentang waktu tertentu. */
  motion?: Array<{ t0: number; t1: number; amp: number; leads?: LeadName[] }>;
  /** Elektroda lepas (sinyal datar + noise) pada sadapan tertentu. */
  leadOff?: LeadName[];
}

export type ElectrodeFault = 'none' | 'la-ra' | 'la-ll' | 'ra-ll' | 'rl-ra' | 'v1-v2' | 'v2-v3' | 'v4-v6';

export interface RenderInput {
  atrial: AtrialEv[];
  vent: VentEv[];
  morph: MorphSpec;
  continuous: Array<{ c: Continuous; t0: number; t1: number }>;
  /** Morfologi per rentang waktu (untuk transisi/serial). */
  morphAt?: (t: number) => MorphSpec;
}

export interface RenderOpts {
  fs: number;
  /** Indeks sampel awal (absolut, t = i/fs). */
  i0: number;
  n: number;
  seed: number;
  leads: readonly LeadName[];
  noise?: NoiseSpec;
  electrodes?: ElectrodeFault;
}

const BASE_LEADS = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

function addKernel(X: Float32Array, Y: Float32Array, Z: Float32Array, k: Kernel, tAbs: number, gain: number, fs: number, i0: number) {
  const c = tAbs + k.c;
  const a = Math.max(0, Math.floor((c - 4 * k.sL) * fs) - i0);
  const b = Math.min(X.length - 1, Math.ceil((c + 4 * k.sR) * fs) - i0);
  if (b < 0 || a > X.length - 1) return;
  const vx = k.v[0] * gain;
  const vy = k.v[1] * gain;
  const vz = k.v[2] * gain;
  const iL = 1 / (2 * k.sL * k.sL);
  const iR = 1 / (2 * k.sR * k.sR);
  for (let i = a; i <= b; i++) {
    const x = (i + i0) / fs - c;
    const g = Math.exp(-x * x * (x < 0 ? iL : iR));
    X[i] += vx * g;
    Y[i] += vy * g;
    Z[i] += vz * g;
  }
}

function addLocal(arr: Float32Array, k: Kernel, tAbs: number, fs: number, i0: number) {
  const c = tAbs + k.c;
  const a = Math.max(0, Math.floor((c - 4 * k.sL) * fs) - i0);
  const b = Math.min(arr.length - 1, Math.ceil((c + 4 * k.sR) * fs) - i0);
  const iL = 1 / (2 * k.sL * k.sL);
  const iR = 1 / (2 * k.sR * k.sR);
  for (let i = a; i <= b; i++) {
    const x = (i + i0) / fs - c;
    arr[i] += k.v[0] * Math.exp(-x * x * (x < 0 ? iL : iR));
  }
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Profil segmen ST g(t) ∈ [0, ~1.2], bernilai 1 di titik J. */
export function stProfile(shape: StShape, t: number, j: number, tPeak: number, tEnd: number): number {
  if (t < j - 0.014 || t > tEnd) return 0;
  const ramp = smoothstep(j - 0.014, j, t);
  const taper = t <= tPeak ? 1 : 0.5 * (1 + Math.cos((Math.PI * (t - tPeak)) / Math.max(0.01, tEnd - tPeak)));
  const u = Math.min(1, Math.max(0, (t - j) / Math.max(0.02, tPeak - j)));
  switch (shape) {
    case 'plateau':
      return ramp * taper;
    case 'convex':
      return ramp * taper * (1 + 0.28 * Math.sin(Math.PI * u));
    case 'concave':
      return ramp * taper * (0.78 + 0.32 * u * u);
    case 'upsloping':
      return ramp * Math.exp(-Math.max(0, t - j) / 0.065) * (t <= tPeak ? 1 : taper);
    case 'downsloping':
      return ramp * taper * (0.6 + 0.5 * u);
    case 'scooped': {
      const w = Math.min(1, Math.max(0, (t - j) / Math.max(0.05, tEnd - j)));
      return ramp * (0.35 + 0.95 * Math.pow(Math.sin(Math.PI * w), 0.9)) * (t > tEnd - 0.02 ? taper : 1);
    }
  }
}

function addSt(X: Float32Array, Y: Float32Array, Z: Float32Array, v: Vec3, shape: StShape, j: number, tPeak: number, tEnd: number, fs: number, i0: number) {
  const a = Math.max(0, Math.floor((j - 0.016) * fs) - i0);
  const b = Math.min(X.length - 1, Math.ceil(tEnd * fs) - i0);
  for (let i = a; i <= b; i++) {
    const g = stProfile(shape, (i + i0) / fs, j, tPeak, tEnd);
    X[i] += v[0] * g;
    Y[i] += v[1] * g;
    Z[i] += v[2] * g;
  }
}

/** Template ventrikel untuk satu kejadian (memperhitungkan torsades/rotasi). */
export function templateFor(ev: VentEv, morph: MorphSpec, index: number): VentricularTemplate {
  const tpl = buildVentricular(morph, { rr: ev.rr, beat: ev.beat, origin: ev.origin, index, fusion: ev.fusion });
  const rot = ev.twist?.deg ?? ev.frontalRot;
  if (rot !== undefined || ev.twist) {
    const amp = ev.twist?.amp ?? 1;
    tpl.qrs = tpl.qrs.map((k) => ({ ...k, v: scale(rotateFrontal(k.v, rot ?? 0), amp) }));
    tpl.t = tpl.t.map((k) => ({ ...k, v: scale(rotateFrontal(k.v, rot ?? 0), amp) }));
  }
  if (ev.fusion) {
    // Denyut fusi: campuran gaya konduksi normal & ektopik
    const normal = buildVentricular(morph, { rr: ev.rr, beat: 'conducted' });
    tpl.qrs = [...tpl.qrs.map((k) => ({ ...k, v: scale(k.v, 0.5) })), ...normal.qrs.map((k) => ({ ...k, v: scale(k.v, 0.5) }))];
    tpl.t = tpl.t.map((k) => ({ ...k, v: scale(k.v, 0.6) }));
    tpl.qrsDur = Math.max(...tpl.qrs.map((k) => k.c + 2.5 * k.sR));
  }
  return tpl;
}

function flutterWave(u: number): number {
  // Gigi gergaji: turun perlahan (65%) lalu naik cepat (35%), rerata ~0
  return u < 0.65 ? 0.5 - u / 0.65 : -0.5 + (u - 0.65) / 0.35;
}

/** Render rentang sampel [i0, i0+n) untuk sadapan yang diminta. */
export function renderRange(inp: RenderInput, o: RenderOpts): Partial<Record<LeadName, Float32Array>> {
  const { fs, i0, n, seed } = o;
  const X = new Float32Array(n);
  const Y = new Float32Array(n);
  const Z = new Float32Array(n);
  const local: Partial<Record<LeadName, Float32Array>> = {};
  const localArr = (l: LeadName) => (local[l] ??= new Float32Array(n));
  const spikesV: Array<{ i: number; v: Vec3 }> = [];
  const tA = i0 / fs;
  const tB = (i0 + n) / fs;
  const morphAt = inp.morphAt ?? (() => inp.morph);

  // Atrium
  for (const a of inp.atrial) {
    if (a.t > tB + 0.05 || a.t < tA - 0.6) continue;
    const m = morphAt(a.t);
    const p = buildP(m, a.kind);
    for (const k of p.kernels) addKernel(X, Y, Z, k, a.t, 1, fs, i0);
    if (a.spike) spikesV.push({ i: Math.round(a.t * fs) - i0, v: [0.2, 0.4, -0.12] });
  }

  // Ventrikel
  let idx = 0;
  for (const ev of inp.vent) {
    idx++;
    if (ev.t > tB + 0.05 || ev.t < tA - 0.9) continue;
    if (ev.spike) spikesV.push({ i: Math.round((ev.t - 0.004) * fs) - i0, v: [0.3, -0.5, 0.32] });
    if (ev.spikeOnly) continue;
    const m = morphAt(ev.t);
    const tpl = templateFor(ev, m, idx);
    const resp = 1 + 0.035 * Math.sin(2 * Math.PI * 0.24 * ev.t + (seed % 7));
    for (const k of tpl.qrs) addKernel(X, Y, Z, k, ev.t, resp, fs, i0);
    for (const k of tpl.t) addKernel(X, Y, Z, k, ev.t, 1, fs, i0);
    for (const k of tpl.u) addKernel(X, Y, Z, k, ev.t, 1, fs, i0);
    for (const s of tpl.st) addSt(X, Y, Z, s.v, s.shape, ev.t + tpl.qrsDur, ev.t + tpl.tPeak, ev.t + tpl.qt, fs, i0);
    for (const k of tpl.local) if (k.lead) addLocal(localArr(k.lead), k, ev.t, fs, i0);
    // Depresi PR (perikarditis)
    if (m.prDepression && ev.pRef !== undefined && ev.beat === 'conducted') {
      const v = territoryVector('pericarditis', -m.prDepression / 10, 'II');
      const pEnd = ev.pRef + 0.1;
      const c = (pEnd + ev.t) / 2;
      addKernel(X, Y, Z, { c: 0, sL: Math.max(0.02, (ev.t - ev.pRef) * 0.35), sR: 0.02, v }, c, 1, fs, i0);
    }
  }

  // Komponen kontinu
  for (const seg of inp.continuous) {
    const c = seg.c;
    const a = Math.max(0, Math.floor(seg.t0 * fs) - i0);
    const b = Math.min(n - 1, Math.ceil(seg.t1 * fs) - i0);
    if (b < a) continue;
    const fade = (t: number) => smoothstep(seg.t0, seg.t0 + 0.6, t) * (1 - smoothstep(seg.t1 - 0.6, seg.t1, t));
    if (c.af) {
      const dir = norm([-0.25, 0.4, -0.75]);
      const f = [5.4 + (seed % 5) * 0.2, 6.3, 7.1];
      const ph = [0.3, 1.7, 2.9];
      for (let i = a; i <= b; i++) {
        const t = (i + i0) / fs;
        const env = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.37 * t + 1.1);
        let s = 0;
        for (let k = 0; k < 3; k++) s += Math.sin(2 * Math.PI * f[k] * t + ph[k] + 0.6 * Math.sin(2 * Math.PI * 0.21 * (k + 1) * t)) / (k + 1);
        const g = c.af.amp * env * s * 0.6 * fade(t);
        X[i] += dir[0] * g;
        Y[i] += dir[1] * g;
        Z[i] += dir[2] * g;
      }
    }
    if (c.flutter) {
      const v: Vec3 = scale(norm([0.05, 0.85, 0.42]), c.flutter.amp / 0.88);
      for (let i = a; i <= b; i++) {
        const t = (i + i0) / fs;
        const u = ((((t - c.flutter.t0) * c.flutter.rate) / 60) % 1 + 1) % 1;
        const g = flutterWave(u) * fade(t);
        X[i] += v[0] * g;
        Y[i] += v[1] * g;
        Z[i] += v[2] * g;
      }
    }
    if (c.vf) {
      const dirs: Vec3[] = [norm([0.7, 0.5, -0.4]), norm([-0.4, 0.8, 0.3]), norm([0.3, -0.6, 0.7]), norm([0.6, 0.2, 0.7])];
      const fr = [4.3, 5.1, 6.2, 7.0];
      for (let i = a; i <= b; i++) {
        const t = (i + i0) / fs;
        let x = 0;
        let y = 0;
        let z = 0;
        for (let k = 0; k < 4; k++) {
          const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * (0.23 + 0.11 * k) * t + k * 1.3 + (seed % 11));
          const s = env * Math.sin(2 * Math.PI * fr[k] * t + 0.8 * Math.sin(2 * Math.PI * 0.5 * t + k) + k);
          x += dirs[k][0] * s;
          y += dirs[k][1] * s;
          z += dirs[k][2] * s;
        }
        const g = c.vf.amp * 0.55 * fade(t);
        X[i] += x * g;
        Y[i] += y * g;
        Z[i] += z * g;
      }
    }
  }

  // Proyeksi ke 8 sadapan independen + sadapan tambahan
  const want = new Set<LeadName>(o.leads);
  const needBase = true;
  const out: Partial<Record<LeadName, Float32Array>> = {};
  const project = (vec: Vec3) => {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) arr[i] = vec[0] * X[i] + vec[1] * Y[i] + vec[2] * Z[i];
    return arr;
  };
  if (needBase) for (const l of BASE_LEADS) out[l] = project(DOWER[l]);
  for (const l of Object.keys(EXTRA_VECTORS) as Array<keyof typeof EXTRA_VECTORS>) if (want.has(l)) out[l] = project(EXTRA_VECTORS[l]);
  for (const [l, arr] of Object.entries(local) as Array<[LeadName, Float32Array]>) {
    const t = out[l];
    if (t) for (let i = 0; i < n; i++) t[i] += arr[i];
  }
  // Lonjakan pacu (2 sampel)
  for (const s of spikesV) {
    for (const l of Object.keys(out) as LeadName[]) {
      const vec = l in DOWER ? DOWER[l as keyof typeof DOWER] : EXTRA_VECTORS[l as keyof typeof EXTRA_VECTORS];
      const amp = vec[0] * s.v[0] + vec[1] * s.v[1] + vec[2] * s.v[2];
      const arr = out[l]!;
      if (s.i >= 0 && s.i < n) arr[s.i] += amp;
      if (s.i + 1 >= 0 && s.i + 1 < n) arr[s.i + 1] -= amp * 0.35;
    }
  }

  // Noise (pada sadapan independen agar Einthoven tetap konsisten)
  const nz = o.noise;
  if (nz) {
    const keys = Object.keys(out) as LeadName[];
    keys.forEach((l, ch) => {
      const arr = out[l]!;
      for (let i = 0; i < n; i++) {
        const ia = i + i0;
        const t = ia / fs;
        let v = 0;
        if (nz.wander) v += nz.wander * (0.6 * Math.sin(2 * Math.PI * 0.17 * t + ch * 0.9) + 0.4 * Math.sin(2 * Math.PI * 0.29 * t + ch * 1.7));
        if (nz.emg) v += nz.emg * (hashNoise(seed, ia, ch) + hashNoise(seed, ia - 1, ch) + hashNoise(seed, ia + 1, ch)) / 3;
        if (nz.mains) v += nz.mains * Math.sin(2 * Math.PI * 50 * t + ch * 0.3);
        if (nz.tremor && (l === 'I' || l === 'II')) v += nz.tremor * (l === 'I' ? 1 : -0.6) * Math.sin(2 * Math.PI * 5.3 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.4 * t));
        if (nz.motion) {
          for (const m of nz.motion) {
            if (t < m.t0 || t > m.t1) continue;
            if (m.leads && !m.leads.includes(l)) continue;
            const env = Math.sin((Math.PI * (t - m.t0)) / (m.t1 - m.t0));
            v += m.amp * env * (Math.sin(2 * Math.PI * 4.6 * t + ch) + 0.6 * Math.sin(2 * Math.PI * 7.3 * t + 2 * ch) + 0.3 * hashNoise(seed + 9, ia, ch));
          }
        }
        arr[i] += v;
      }
      if (nz.leadOff?.includes(l)) for (let i = 0; i < n; i++) arr[i] = 0.01 * hashNoise(seed + 3, i + i0, ch);
    });
  }

  applyElectrodeFault(out, o.electrodes ?? 'none', n);

  // Turunkan sadapan ekstremitas
  const I = out.I!;
  const II = out.II!;
  const III = new Float32Array(n);
  const aVR = new Float32Array(n);
  const aVL = new Float32Array(n);
  const aVF = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    III[i] = II[i] - I[i];
    aVR[i] = -(I[i] + II[i]) / 2;
    aVL[i] = I[i] - II[i] / 2;
    aVF[i] = II[i] - I[i] / 2;
  }
  out.III = III;
  out.aVR = aVR;
  out.aVL = aVL;
  out.aVF = aVF;
  return out;
}

/** Salah pasang elektroda, dihitung dari potensial elektroda (fisik konsisten). */
export function applyElectrodeFault(out: Partial<Record<LeadName, Float32Array>>, f: ElectrodeFault, n: number): void {
  if (f === 'none') return;
  const swap = (a: LeadName, b: LeadName) => {
    const t = out[a];
    out[a] = out[b];
    out[b] = t;
  };
  if (f === 'v1-v2') return swap('V1', 'V2');
  if (f === 'v2-v3') return swap('V2', 'V3');
  if (f === 'v4-v6') return swap('V4', 'V6');
  const I = out.I!;
  const II = out.II!;
  const nI = new Float32Array(n);
  const nII = new Float32Array(n);
  const wctShift = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = limbElectrodes(I[i], II[i]);
    let RA = e.RA;
    let LA = e.LA;
    let LL = e.LL;
    if (f === 'la-ra') [RA, LA] = [LA, RA];
    else if (f === 'la-ll') [LA, LL] = [LL, LA];
    else if (f === 'ra-ll') [RA, LL] = [LL, RA];
    else if (f === 'rl-ra') {
      // Elektroda RA terpasang di kaki kanan: potensialnya ≈ kaki kiri
      RA = LL;
      wctShift[i] = (RA + LA + LL) / 3;
    }
    nI[i] = LA - RA;
    nII[i] = LL - RA;
  }
  out.I = nI;
  out.II = nII;
  if (f === 'rl-ra') {
    for (const l of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
      const a = out[l]!;
      for (let i = 0; i < n; i++) a[i] -= wctShift[i];
    }
  }
}

export { add as vecAdd };
