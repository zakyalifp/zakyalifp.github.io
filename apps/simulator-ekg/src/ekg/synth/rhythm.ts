/**
 * Rhythm engine: penjadwal denyut (atrium & ventrikel), konduksi AV, ektopi, pacu.
 * Terpisah dari morfologi. Inkremental (dipakai batch 10 detik maupun streaming
 * monitor real-time). Deterministik terhadap seed.
 */
import type { PKind, VentricularOrigin } from './morph';
import type { Rng } from './prng';

export type BeatType = 'conducted' | 'pvc' | 'vt' | 'paced' | 'escape-v' | 'fusion' | 'aberrant-rbbb' | 'aberrant-lbbb';

export interface AtrialEv {
  t: number;
  kind: PKind;
  /** Lonjakan pacu atrium sebelum P. */
  spike?: boolean;
}
export interface VentEv {
  /** Awal QRS (detik). */
  t: number;
  beat: BeatType;
  origin?: VentricularOrigin;
  /** RR sebelumnya untuk adaptasi QT. */
  rr: number;
  /** Label untuk anotasi, mis. 'sinus', 'PVC', 'capture'. */
  label: string;
  /** Awal P yang dikonduksikan (untuk PR). */
  pRef?: number;
  /** Lonjakan pacu ventrikel. */
  spike?: boolean;
  /** Lonjakan pacu tanpa capture (malfungsi) — tidak ada QRS. */
  spikeOnly?: boolean;
  fusion?: number;
  /** Rotasi torsades (derajat) & skala amplitudo. */
  twist?: { deg: number; amp: number };
  /** Rotasi frontal tetap (VT bidireksional). */
  frontalRot?: number;
}

export type EctopySpec = {
  type: 'pvc' | 'pac';
  /** Pola: setiap n denyut (2 = bigemini, 3 = trigemini) atau daftar indeks denyut. */
  every?: number;
  at?: number[];
  origin?: VentricularOrigin;
  /** Rasio interval kopling terhadap RR dasar. */
  coupling?: number;
  /** PVC berpasangan (couplet). */
  couplet?: boolean;
  /** PAC dengan konduksi aberan. */
  aberrant?: boolean;
};

export type RhythmSpec =
  | { kind: 'sinus'; rate: number; prMs?: number; sa?: number; pKind?: PKind; ectopy?: EctopySpec[] }
  | { kind: 'ectopic-atrial'; rate: number; prMs?: number; pKind?: PKind }
  | { kind: 'mat'; rate: number }
  | { kind: 'af'; rate: number; irregularity?: number; fAmp?: number; ectopy?: EctopySpec[]; regularized?: boolean }
  | { kind: 'flutter'; atrialRate?: number; conduction: 2 | 3 | 4 | 'variable'; fAmp?: number }
  | { kind: 'avnrt'; rate: number }
  | { kind: 'avrt'; rate: number }
  | { kind: 'at'; rate: number; block?: 1 | 2 }
  | { kind: 'junctional'; rate: number; retro?: 'before' | 'after' | 'hidden' }
  | { kind: 'aivr'; rate: number; sinusRate?: number; origin?: VentricularOrigin }
  | { kind: 'vt'; rate: number; origin?: VentricularOrigin; sinusRate?: number; captureAt?: number[]; fusionAt?: number[] }
  | { kind: 'bidirectional-vt'; rate: number }
  | { kind: 'torsades'; rate: number; periodS?: number; leadIn?: boolean }
  | { kind: 'vf'; coarse: boolean }
  | { kind: 'asystole'; pRate?: number }
  | {
      kind: 'avb';
      degree: 1 | 'mobitz1' | 'mobitz2' | '2to1' | 'high' | 3;
      atrialRate: number;
      prMs?: number;
      /** Jumlah P per siklus (mis. 4 → 4:3 pada Mobitz). */
      ratio?: number;
      escapeRate?: number;
      escape?: 'junctional' | 'ventricular';
    }
  | {
      kind: 'paced';
      mode: 'VVI' | 'AAI' | 'DDD';
      rate: number;
      avDelayMs?: number;
      atrialRate?: number;
      fault?: 'noncapture' | 'undersensing' | 'oversensing';
    };

export interface ScheduleState {
  atrial: AtrialEv[];
  vent: VentEv[];
}

/** Komponen kontinu (aktivitas atrium/ventrikel yang tidak berbasis denyut). */
export interface Continuous {
  af?: { amp: number };
  flutter?: { rate: number; amp: number; t0: number };
  vf?: { amp: number };
}

export function continuousFor(spec: RhythmSpec): Continuous {
  switch (spec.kind) {
    case 'af':
      return { af: { amp: spec.fAmp ?? 0.07 } };
    case 'flutter':
      return { flutter: { rate: spec.atrialRate ?? 300, amp: spec.fAmp ?? 0.22, t0: 0.05 } };
    case 'vf':
      return { vf: { amp: spec.coarse ? 0.55 : 0.14 } };
    default:
      return {};
  }
}

/** Penjadwal inkremental untuk satu RhythmSpec. */
export class Scheduler {
  private tNext: number;
  private n = 0;
  private lastQrs: number;
  private atrialT: number;
  private cycleIdx = 0;
  private escapeT: number;
  readonly out: ScheduleState = { atrial: [], vent: [] };

  constructor(
    readonly spec: RhythmSpec,
    private rng: Rng,
    /** Waktu mulai (QRS pertama tidak lebih awal dari ini). */
    t0 = 0,
    /** QRS terakhir sebelumnya (untuk transisi halus). */
    prevQrs?: number,
  ) {
    const rr0 = baseRr(spec);
    this.lastQrs = prevQrs ?? t0 - rr0 * this.rng.range(0.55, 0.95);
    this.tNext = Math.max(t0, this.lastQrs + rr0);
    if (spec.kind === 'flutter') {
      // Kunci QRS pada gelombang flutter (interval FR tetap 0,26 dtk; fase flutter absolut t0 = 0,05)
      const aRr = 60 / (spec.atrialRate ?? 300);
      const fr = 0.26;
      this.tNext = 0.05 + Math.ceil((this.tNext - 0.05 - fr) / aRr) * aRr + fr;
    }
    this.atrialT = this.tNext - 0.16;
    this.escapeT = this.tNext + this.rng.range(0, 0.4);
  }

  /** Jadwalkan kejadian hingga waktu `horizon`. */
  advanceTo(horizon: number): void {
    let guard = 0;
    while (this.frontier() < horizon && guard++ < 10000) this.step();
  }

  private frontier(): number {
    return Math.min(this.tNext, this.atrialT, this.escapeT);
  }

  private pushV(e: Omit<VentEv, 'rr'> & { rr?: number }) {
    const rr = e.rr ?? Math.max(0.2, e.t - this.lastQrs);
    this.out.vent.push({ ...e, rr });
    if (!e.spikeOnly) this.lastQrs = e.t;
  }

  private step(): void {
    const s = this.spec;
    const r = this.rng;
    switch (s.kind) {
      case 'sinus': {
        const rr = baseRr(s) * (1 + (s.sa ?? 0) * Math.sin(2 * Math.PI * 0.22 * this.tNext) + 0.012 * r.normal());
        const t = this.tNext;
        const pr = (s.prMs ?? 160) / 1000;
        const ect = matchEctopy(s.ectopy, this.n);
        if (ect && ect.type === 'pvc') {
          const tp = this.lastQrs + baseRr(s) * (ect.coupling ?? 0.58);
          this.pushV({ t: tp, beat: 'pvc', origin: ect.origin ?? 'rvot', label: 'PVC' });
          if (ect.couplet) this.pushV({ t: tp + 0.42, beat: 'pvc', origin: ect.origin ?? 'rvot', label: 'PVC (couplet)' });
          // P sinus tetap muncul tepat waktu (tersembunyi/tidak dikonduksikan), jeda kompensasi penuh
          this.out.atrial.push({ t: t - pr, kind: s.pKind ?? 'sinus' });
          this.tNext = t + rr;
          this.n++;
          return;
        }
        if (ect && ect.type === 'pac') {
          const tq = this.lastQrs + baseRr(s) * (ect.coupling ?? 0.65);
          this.out.atrial.push({ t: tq - pr, kind: 'ectopic-left' });
          this.pushV({ t: tq, beat: ect.aberrant ? 'aberrant-rbbb' : 'conducted', label: ect.aberrant ? 'PAC aberan' : 'PAC', pRef: tq - pr });
          // Jeda tidak kompensatoris: nodus sinus di-reset
          this.tNext = tq + baseRr(s) * 1.02;
          this.n++;
          return;
        }
        this.out.atrial.push({ t: t - pr, kind: s.pKind ?? 'sinus' });
        this.pushV({ t, beat: 'conducted', label: 'sinus', pRef: t - pr });
        this.tNext = t + rr;
        this.n++;
        return;
      }
      case 'ectopic-atrial': {
        const t = this.tNext;
        const pr = (s.prMs ?? 150) / 1000;
        this.out.atrial.push({ t: t - pr, kind: s.pKind ?? 'ectopic-low' });
        this.pushV({ t, beat: 'conducted', label: 'atrium ektopik', pRef: t - pr });
        this.tNext = t + baseRr(s) * (1 + 0.01 * r.normal());
        return;
      }
      case 'mat': {
        const t = this.tNext;
        const kinds: PKind[] = ['mat-a', 'mat-b', 'mat-c', 'sinus'];
        const k = kinds[Math.floor(r.next() * kinds.length)];
        const pr = r.range(0.11, 0.2);
        this.out.atrial.push({ t: t - pr, kind: k });
        this.pushV({ t, beat: 'conducted', label: 'MAT', pRef: t - pr });
        this.tNext = t + baseRr(s) * r.range(0.78, 1.25);
        return;
      }
      case 'af': {
        const t = this.tNext;
        const ect = matchEctopy(s.ectopy, this.n);
        if (ect && ect.type === 'pvc') {
          this.pushV({ t: this.lastQrs + baseRr(s) * (ect.coupling ?? 0.6), beat: 'pvc', origin: ect.origin ?? 'rvot', label: 'PVC' });
          this.tNext = this.lastQrs + baseRr(s) * r.range(0.9, 1.4);
          this.n++;
          return;
        }
        this.pushV({ t, beat: 'conducted', label: 'AF' });
        const sigma = s.regularized ? 0.01 : (s.irregularity ?? 0.24);
        this.tNext = t + Math.max(0.3, baseRr(s) * Math.exp(sigma * r.normal() - (sigma * sigma) / 2));
        this.n++;
        return;
      }
      case 'flutter': {
        const atrialRr = 60 / (s.atrialRate ?? 300);
        const ratio = s.conduction === 'variable' ? r.pick([2, 3, 4, 4, 3, 2]) : s.conduction;
        // gelombang flutter ke-k → QRS setelah interval FR tetap
        const t = this.tNext;
        this.pushV({ t, beat: 'conducted', label: `flutter ${ratio}:1` });
        const nextRatio = s.conduction === 'variable' ? ratio : s.conduction;
        this.tNext = t + atrialRr * nextRatio;
        return;
      }
      case 'avnrt': {
        const t = this.tNext;
        this.pushV({ t, beat: 'conducted', label: 'AVNRT' });
        this.out.atrial.push({ t: t + 0.035, kind: 'retrograde' });
        this.tNext = t + baseRr(s) * (1 + 0.003 * r.normal());
        return;
      }
      case 'avrt': {
        const t = this.tNext;
        this.pushV({ t, beat: 'conducted', label: 'AVRT' });
        this.out.atrial.push({ t: t + 0.12, kind: 'retrograde' });
        this.tNext = t + baseRr(s) * (1 + 0.003 * r.normal());
        return;
      }
      case 'at': {
        const t = this.atrialT;
        const block = s.block ?? 1;
        this.out.atrial.push({ t, kind: 'ectopic-left' });
        if (this.cycleIdx % block === 0) this.pushV({ t: t + 0.16, beat: 'conducted', label: 'AT', pRef: t });
        this.cycleIdx++;
        this.atrialT = t + 60 / s.rate;
        this.tNext = this.atrialT + 0.16;
        return;
      }
      case 'junctional': {
        const t = this.tNext;
        this.pushV({ t, beat: 'conducted', label: 'junctional' });
        const retro = s.retro ?? 'before';
        if (retro === 'before') this.out.atrial.push({ t: t - 0.075, kind: 'retrograde' });
        if (retro === 'after') this.out.atrial.push({ t: t + 0.1, kind: 'retrograde' });
        this.tNext = t + baseRr(s) * (1 + 0.006 * r.normal());
        return;
      }
      case 'aivr':
      case 'vt':
      case 'bidirectional-vt':
      case 'torsades': {
        // Ventrikel & atrium independen (disosiasi AV) — pilih kejadian terdekat
        const sinusRate = s.kind === 'aivr' ? (s.sinusRate ?? 62) : s.kind === 'vt' ? (s.sinusRate ?? 78) : 0;
        if (sinusRate && this.atrialT <= this.tNext) {
          this.out.atrial.push({ t: this.atrialT, kind: 'sinus' });
          this.atrialT += (60 / sinusRate) * (1 + 0.01 * r.normal());
          return;
        }
        if (!sinusRate) this.atrialT = Infinity;
        const t = this.tNext;
        if (s.kind === 'vt') {
          const idx = this.n;
          if (s.captureAt?.includes(idx)) {
            this.out.atrial.push({ t: t - 0.16, kind: 'sinus' });
            this.pushV({ t, beat: 'conducted', label: 'capture beat', pRef: t - 0.16 });
          } else if (s.fusionAt?.includes(idx)) {
            this.pushV({ t, beat: 'vt', origin: s.origin ?? 'lv-inferoapical', label: 'fusion beat', fusion: 0.8 });
          } else this.pushV({ t, beat: 'vt', origin: s.origin ?? 'lv-inferoapical', label: 'VT' });
          this.tNext = t + baseRr(s) * (1 + 0.006 * r.normal());
        } else if (s.kind === 'bidirectional-vt') {
          this.pushV({ t, beat: 'vt', origin: 'fascicular', label: 'VT bidireksional', frontalRot: this.n % 2 === 0 ? 0 : 150 });
          this.tNext = t + baseRr(s) * (1 + 0.004 * r.normal());
        } else if (s.kind === 'aivr') {
          this.pushV({ t, beat: 'escape-v', origin: s.origin ?? 'lv-lateral', label: 'AIVR' });
          this.tNext = t + baseRr(s) * (1 + 0.01 * r.normal());
        } else {
          const period = s.periodS ?? 2.4;
          const ph = (t / period) * Math.PI;
          this.pushV({ t, beat: 'vt', origin: 'rvot', label: 'torsades', twist: { deg: (t / period) * 180, amp: 0.3 + 0.75 * Math.abs(Math.cos(ph)) } });
          this.tNext = t + baseRr(s) * r.range(0.85, 1.15);
        }
        this.n++;
        return;
      }
      case 'vf': {
        this.tNext = Infinity;
        this.atrialT = Infinity;
        this.escapeT = Infinity;
        return;
      }
      case 'asystole': {
        if (s.pRate) {
          this.out.atrial.push({ t: this.atrialT, kind: 'sinus' });
          this.atrialT += 60 / s.pRate;
          this.tNext = this.atrialT;
          return;
        }
        this.tNext = this.atrialT = this.escapeT = Infinity;
        return;
      }
      case 'avb':
        return this.stepAvb(s);
      case 'paced':
        return this.stepPaced(s);
    }
  }

  private stepAvb(s: Extract<RhythmSpec, { kind: 'avb' }>): void {
    const r = this.rng;
    const pp = 60 / s.atrialRate;
    const pr = (s.prMs ?? 170) / 1000;
    if (s.degree === 3) {
      const escRr = 60 / (s.escapeRate ?? (s.escape === 'junctional' ? 45 : 35));
      if (this.atrialT <= this.escapeT) {
        this.out.atrial.push({ t: this.atrialT, kind: 'sinus' });
        this.atrialT += pp * (1 + 0.01 * r.normal());
      } else {
        const t = this.escapeT;
        this.pushV({ t, beat: s.escape === 'junctional' ? 'conducted' : 'escape-v', origin: 'lv-lateral', label: s.escape === 'junctional' ? 'lolos junctional' : 'lolos ventrikel' });
        this.escapeT = t + escRr * (1 + 0.005 * r.normal());
      }
      this.tNext = Math.min(this.atrialT, this.escapeT);
      return;
    }
    this.escapeT = Infinity;
    const tp = this.atrialT;
    const k = this.cycleIdx;
    this.cycleIdx++;
    this.atrialT = tp + pp * (1 + 0.006 * r.normal());
    this.tNext = this.atrialT;
    this.out.atrial.push({ t: tp, kind: 'sinus' });
    let conducted = true;
    let thisPr = pr;
    if (s.degree === 1) thisPr = pr;
    else if (s.degree === 'mobitz1') {
      const ratio = s.ratio ?? 4;
      const pos = k % ratio;
      if (pos === ratio - 1) conducted = false;
      else {
        // Kenaikan PR terbesar pada denyut kedua, lalu mengecil (Wenckebach klasik)
        const inc = [0, 0.11, 0.155, 0.18, 0.195, 0.205];
        thisPr = pr + (inc[pos] ?? 0.21);
      }
    } else if (s.degree === 'mobitz2') {
      const ratio = s.ratio ?? 4;
      if (k % ratio === ratio - 1) conducted = false;
    } else if (s.degree === '2to1') {
      if (k % 2 === 1) conducted = false;
    } else if (s.degree === 'high') {
      if (k % 3 !== 0) conducted = false;
    }
    if (conducted) this.pushV({ t: tp + thisPr, beat: 'conducted', label: 'dikonduksikan', pRef: tp });
    else if (s.degree !== 1) {
      // Bila jeda terlalu panjang, irama lolos dapat muncul (tidak dimodelkan di sini)
    }
  }

  private stepPaced(s: Extract<RhythmSpec, { kind: 'paced' }>): void {
    const rr = 60 / s.rate;
    const av = (s.avDelayMs ?? 160) / 1000;
    const t = this.tNext;
    const k = this.n++;
    if (s.mode === 'AAI') {
      this.out.atrial.push({ t: t - av, kind: 'paced-a', spike: true });
      this.pushV({ t, beat: 'conducted', label: 'pacu atrium', pRef: t - av });
      this.tNext = t + rr;
      return;
    }
    if (s.mode === 'DDD') {
      if (s.atrialRate && s.atrialRate > s.rate) {
        // Tracking P sinus
        const tr = 60 / s.atrialRate;
        this.out.atrial.push({ t: t - av, kind: 'sinus' });
        this.pushV({ t, beat: 'paced', spike: true, label: 'P-tracking', pRef: t - av });
        this.tNext = t + tr;
      } else {
        this.out.atrial.push({ t: t - av, kind: 'paced-a', spike: true });
        this.pushV({ t, beat: 'paced', spike: true, label: 'pacu AV', pRef: t - av });
        this.tNext = t + rr;
      }
      return;
    }
    // VVI
    if (s.fault === 'noncapture' && k % 3 === 2) {
      this.pushV({ t, beat: 'paced', spike: true, spikeOnly: true, label: 'gagal capture' });
      this.tNext = t + rr;
      return;
    }
    if (s.fault === 'undersensing') {
      // Irama intrinsik sinus 75/menit tetap berjalan; pacu menembak tetap 60/menit tanpa
      // mendeteksi QRS intrinsik (asinkron).
      const intrinsicRr = 0.8;
      while (this.escapeT < t) {
        this.escapeT += intrinsicRr;
      }
      const ti = this.escapeT;
      this.out.atrial.push({ t: ti - 0.16, kind: 'sinus' });
      this.pushV({ t: ti, beat: 'conducted', label: 'intrinsik', pRef: ti - 0.16 });
      this.escapeT = ti + intrinsicRr;
      // Lonjakan pacu (capture hanya bila di luar periode refrakter)
      const sinceQrs = t - ti;
      const refractory = Math.abs(sinceQrs) < 0.32;
      if (refractory) this.pushV({ t, beat: 'paced', spike: true, spikeOnly: true, label: 'spike (undersensing)' });
      else this.pushV({ t, beat: 'paced', spike: true, label: 'pacu asinkron' });
      this.tNext = t + rr;
      return;
    }
    if (s.atrialRate) this.out.atrial.push({ t: t - 0.3, kind: 'sinus' });
    this.pushV({ t, beat: 'paced', spike: true, label: 'pacu ventrikel' });
    this.tNext = t + rr;
  }
}

function matchEctopy(list: EctopySpec[] | undefined, n: number): EctopySpec | undefined {
  if (!list) return undefined;
  for (const e of list) {
    if (e.at?.includes(n)) return e;
    if (e.every && n > 0 && n % e.every === e.every - 1) return e;
  }
  return undefined;
}

export function baseRr(s: RhythmSpec): number {
  switch (s.kind) {
    case 'flutter':
      return (60 / (s.atrialRate ?? 300)) * (s.conduction === 'variable' ? 3 : s.conduction);
    case 'vf':
      return 1;
    case 'asystole':
      return 1;
    case 'avb':
      return 60 / s.atrialRate;
    default:
      return 60 / s.rate;
  }
}

/** Ringkasan laju target sebuah irama (untuk tampilan monitor). */
export function nominalRate(s: RhythmSpec): number {
  switch (s.kind) {
    case 'vf':
    case 'asystole':
      return 0;
    case 'flutter':
      return Math.round(60 / baseRr(s));
    case 'avb':
      if (s.degree === 3) return s.escapeRate ?? (s.escape === 'junctional' ? 45 : 35);
      if (s.degree === '2to1') return Math.round(s.atrialRate / 2);
      if (s.degree === 'high') return Math.round(s.atrialRate / 3);
      if (s.degree === 'mobitz1' || s.degree === 'mobitz2') return Math.round((s.atrialRate * ((s.ratio ?? 4) - 1)) / (s.ratio ?? 4));
      return s.atrialRate;
    default:
      return s.rate;
  }
}
