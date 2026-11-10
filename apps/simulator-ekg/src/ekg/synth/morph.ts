/**
 * Morfologi denyut: template kernel Gaussian asimetris dalam ruang VCG (X kiri,
 * Y inferior, Z posterior; mV). Semua waktu relatif terhadap awal QRS (detik), kecuali
 * gelombang P yang relatif terhadap awal P.
 *
 * Template disusun agar setiap pola memenuhi kriteria di src/clinical/ecg-criteria.ts;
 * kepatuhan diuji otomatis di synth.test.ts / cases.test.ts.
 */
import type { LeadName, Vec3 } from '../core/types';
import { add, norm, rotateFrontal, rotateHorizontal, scale, territoryVector } from './vcg';

export interface Kernel {
  /** Pusat (detik). */
  c: number;
  sL: number;
  sR: number;
  /** Vektor (mV) — atau, bila `lead` diisi, v[0] = amplitudo skalar lokal di sadapan tsb. */
  v: Vec3;
  lead?: LeadName;
}

export type StShape = 'plateau' | 'convex' | 'concave' | 'upsloping' | 'downsloping' | 'scooped';

export interface StSeg {
  v: Vec3;
  shape: StShape;
}

export type Conduction =
  | 'normal'
  | 'rbbb'
  | 'irbbb'
  | 'lbbb'
  | 'lafb'
  | 'lpfb'
  | 'rbbb-lafb'
  | 'rbbb-lpfb'
  | 'ivcd'
  | 'wpw-ll'
  | 'wpw-ps'
  | 'wpw-r'
  | 'paced-rv'
  | 'paced-biv';

export type VentricularOrigin = 'rvot' | 'lv-lateral' | 'lv-inferoapical' | 'lv-basal' | 'fascicular' | 'rv-apex';

export interface StSpec {
  territory: string;
  /** Deviasi ST (mm) yang diinginkan di sadapan indeks teritori (positif = elevasi). */
  mm: number;
  shape?: StShape;
  index?: LeadName;
}
export interface TSpec {
  territory: string;
  /** Tambahan amplitudo T (mm) di sadapan indeks (negatif = inversi). */
  mm: number;
  index?: LeadName;
  /** T sempit & simetris (iskemik/hiperakut). */
  symmetric?: boolean;
}

export type PMorph = 'normal' | 'pulmonale' | 'mitrale' | 'biatrial' | 'none';

export interface MorphSpec {
  conduction?: Conduction;
  /** Rotasi aksis QRS di bidang frontal (derajat, + = ke kanan/inferior). */
  axisShift?: number;
  /** Rotasi horizontal (+ = searah jarum jam / transisi ke kiri). */
  horizRot?: number;
  /** Skala amplitudo QRS keseluruhan. */
  qrsScale?: number;
  /** Faktor pelebaran QRS (hiperkalemia, TCA). */
  qrsWiden?: number;
  lvh?: number;
  rvh?: number;
  strain?: 'lv' | 'rv';
  oldMi?: Array<'inferior' | 'anterior' | 'anteroseptal' | 'lateral' | 'posterior'>;
  st?: StSpec[];
  /** Skala gelombang T dasar. */
  tScale?: number;
  tExtra?: TSpec[];
  /** 0–1: T runcing berbasis sempit (hiperkalemia). */
  tPeaked?: number;
  /** QT berubah lewat panjang segmen ST saja (kalsium). */
  tWidthFixed?: boolean;
  wellens?: 'A' | 'B';
  /** Amplitudo gelombang U (mV) di V2–V3. */
  u?: number;
  /** QTc target (ms, model Fridericia). */
  qtc?: number;
  /** Gelombang J/Osborn (mV di V5). */
  osborn?: number;
  brugada?: 1 | 2;
  /** R terminal aVR (mV) — TCA/blokade kanal Na. */
  tcaTerminal?: number;
  dextro?: boolean;
  /** Fraksi alternans listrik (0–0,5). */
  alternans?: number;
  /** Depresi PR (mm di II) — perikarditis. */
  prDepression?: number;
  /** Gelombang Q "dagger" (mV di V6) — HCM. */
  hcmQ?: number;
  s1q3t3?: boolean;
  /** Durasi gelombang delta (detik). */
  deltaS?: number;
  pMorph?: PMorph;
  pScale?: number;
}

export interface VentricularTemplate {
  qrs: Kernel[];
  t: Kernel[];
  u: Kernel[];
  local: Kernel[];
  st: StSeg[];
  /** Durasi QRS (dari awal QRS/delta sampai titik J), detik. */
  qrsDur: number;
  /** QT (awal QRS → akhir T), detik. */
  qt: number;
  tPeak: number;
  /** Lonjakan pacu (relatif awal QRS). */
  spikes: Array<{ t: number; v: Vec3 }>;
}

const K = (c: number, s: number, v: Vec3, sR?: number): Kernel => ({ c, sL: s, sR: sR ?? s, v });

// ---------------------------------------------------------------------------
// Template QRS dasar per konduksi
// ---------------------------------------------------------------------------
function baseQrs(cond: Conduction, deltaS: number): { qrs: Kernel[]; t: Vec3; st?: Vec3 } {
  switch (cond) {
    case 'normal':
      return {
        qrs: [K(0.012, 0.006, [-0.1, 0.05, -0.12]), K(0.032, 0.008, [0.4, 0.3, -0.45]), K(0.048, 0.0085, [0.95, 0.55, 0.5]), K(0.068, 0.008, [-0.15, -0.1, 0.4])],
        t: [0.42, 0.28, -0.18],
      };
    case 'ivcd':
      return {
        qrs: [K(0.014, 0.008, [-0.08, 0.05, -0.1]), K(0.04, 0.011, [0.4, 0.3, -0.4]), K(0.064, 0.012, [0.9, 0.5, 0.45]), K(0.092, 0.011, [-0.1, -0.1, 0.35])],
        t: [0.32, 0.22, -0.1],
      };
    case 'irbbb':
      return {
        qrs: [K(0.012, 0.006, [-0.1, 0.05, -0.12]), K(0.032, 0.008, [0.4, 0.3, -0.45]), K(0.048, 0.0085, [0.9, 0.55, 0.45]), K(0.066, 0.008, [-0.1, -0.08, 0.3]), K(0.086, 0.009, [-0.28, -0.02, -0.36])],
        t: [0.4, 0.26, -0.05],
      };
    case 'rbbb':
      return {
        qrs: [K(0.012, 0.006, [-0.1, 0.05, -0.12]), K(0.032, 0.008, [0.4, 0.3, -0.45]), K(0.05, 0.009, [0.95, 0.55, 0.45]), K(0.07, 0.009, [-0.05, -0.05, 0.2]), K(0.102, 0.017, [-0.38, -0.02, -0.62])],
        t: [0.4, 0.25, 0.15],
      };
    case 'lbbb':
      return {
        qrs: [K(0.02, 0.012, [0.35, 0.05, 0.25]), K(0.06, 0.016, [0.85, 0.15, 0.75]), K(0.1, 0.016, [0.8, -0.05, 0.85]), K(0.126, 0.011, [0.2, -0.1, 0.3])],
        t: [-0.4, 0.1, -0.5],
        st: [-0.07, 0.02, -0.09],
      };
    case 'lafb':
      return {
        qrs: [K(0.012, 0.006, [-0.05, 0.2, -0.1]), K(0.034, 0.008, [0.45, -0.3, -0.35]), K(0.05, 0.009, [0.85, -0.75, 0.35]), K(0.068, 0.008, [0.1, -0.25, 0.35])],
        t: [0.42, 0.18, -0.15],
      };
    case 'lpfb':
      return {
        qrs: [K(0.012, 0.006, [0.12, -0.15, -0.08]), K(0.034, 0.008, [0.1, 0.45, -0.35]), K(0.05, 0.009, [-0.15, 1.0, 0.45]), K(0.068, 0.008, [-0.2, 0.1, 0.35])],
        t: [0.3, 0.35, -0.15],
      };
    case 'rbbb-lafb':
      return {
        qrs: [K(0.012, 0.006, [-0.05, 0.2, -0.1]), K(0.034, 0.008, [0.45, -0.3, -0.35]), K(0.052, 0.009, [0.8, -0.75, 0.3]), K(0.07, 0.009, [0.05, -0.2, 0.2]), K(0.104, 0.017, [-0.5, -0.1, -0.6])],
        t: [0.4, 0.12, 0.15],
      };
    case 'rbbb-lpfb':
      return {
        qrs: [K(0.012, 0.006, [0.12, -0.15, -0.08]), K(0.034, 0.008, [0.1, 0.45, -0.35]), K(0.052, 0.009, [-0.15, 1.0, 0.4]), K(0.07, 0.009, [-0.15, 0.1, 0.2]), K(0.104, 0.017, [-0.5, 0.05, -0.6])],
        t: [0.3, 0.3, 0.15],
      };
    case 'wpw-ll':
    case 'wpw-ps':
    case 'wpw-r': {
      const dv: Vec3 = cond === 'wpw-ll' ? [-0.35, 0.3, -0.5] : cond === 'wpw-ps' ? [0.3, -0.45, -0.35] : [0.45, 0.1, 0.4];
      const d = Math.max(0.02, deltaS);
      const shift = d * 0.75;
      return {
        qrs: [
          { c: d, sL: d * 0.55, sR: 0.012, v: dv },
          K(0.032 + shift, 0.008, [0.4, 0.3, -0.45]),
          K(0.048 + shift, 0.0085, [0.95, 0.55, 0.5]),
          K(0.068 + shift, 0.008, [-0.15, -0.1, 0.4]),
        ],
        // ST-T sekunder berlawanan arah delta
        t: add([0.25, 0.2, -0.1], scale(dv, -0.35)),
      };
    }
    case 'paced-rv':
      return {
        qrs: [K(0.03, 0.02, [0.3, -0.6, 0.4]), K(0.08, 0.024, [0.6, -0.9, 0.6]), K(0.13, 0.018, [0.2, -0.3, 0.4])],
        t: [-0.3, 0.4, -0.4],
        st: [-0.05, 0.06, -0.06],
      };
    case 'paced-biv':
      return {
        qrs: [K(0.02, 0.014, [-0.5, -0.4, -0.2]), K(0.06, 0.018, [-0.3, -0.7, 0.3]), K(0.1, 0.016, [0.2, -0.3, 0.4])],
        t: [0.3, 0.4, -0.2],
      };
  }
}

/** Template ektopik ventrikel (PVC/VT) menurut asal. */
function ectopicQrs(origin: VentricularOrigin): { qrs: Kernel[]; t: Vec3; st?: Vec3 } {
  switch (origin) {
    case 'rvot':
      // Pola LBBB, aksis inferior
      return { qrs: [K(0.03, 0.02, [0.15, 0.6, 0.35]), K(0.08, 0.024, [0.25, 1.15, 0.65]), K(0.13, 0.018, [0.1, 0.35, 0.4])], t: [-0.15, -0.5, -0.35] };
    case 'lv-lateral':
      // Pola RBBB, aksis kanan-inferior
      return { qrs: [K(0.03, 0.02, [-0.3, 0.4, -0.3]), K(0.08, 0.024, [-0.7, 0.8, -0.6]), K(0.13, 0.018, [-0.3, 0.3, -0.2])], t: [0.35, -0.35, 0.4] };
    case 'lv-inferoapical':
      // Pola RBBB, aksis ekstrem (northwest), R/S <1 di V6
      return { qrs: [K(0.035, 0.022, [-0.35, -0.4, -0.35]), K(0.085, 0.026, [-0.75, -0.85, -0.7]), K(0.14, 0.02, [-0.25, -0.3, -0.2])], t: [0.4, 0.45, 0.4] };
    case 'lv-basal':
      // Konkordansi positif prekordial
      return { qrs: [K(0.035, 0.022, [0.35, 0.25, -0.5]), K(0.085, 0.026, [0.75, 0.5, -1.0]), K(0.14, 0.02, [0.25, 0.15, -0.35])], t: [-0.45, -0.3, 0.6] };
    case 'fascicular':
      // VT fasikular: RBBB + LAFB, QRS relatif sempit (~130 ms)
      return { qrs: [K(0.014, 0.008, [0.25, -0.3, -0.2]), K(0.045, 0.012, [0.7, -0.9, 0.2]), K(0.09, 0.016, [-0.5, -0.2, -0.6])], t: [0.3, 0.3, 0.3] };
    case 'rv-apex':
      return { qrs: [K(0.03, 0.02, [0.3, -0.6, 0.4]), K(0.08, 0.024, [0.6, -0.9, 0.6]), K(0.13, 0.018, [0.2, -0.3, 0.4])], t: [-0.3, 0.4, -0.4] };
  }
}

function mirrorX(v: Vec3): Vec3 {
  return [-v[0], v[1], v[2]];
}

export interface BuildOpts {
  /** RR sebelumnya (detik) untuk adaptasi QT. */
  rr: number;
  /** Jenis denyut ventrikel. */
  beat?: 'conducted' | 'pvc' | 'vt' | 'paced' | 'escape-v' | 'fusion' | 'aberrant-rbbb' | 'aberrant-lbbb';
  origin?: VentricularOrigin;
  /** Indeks denyut (untuk alternans). */
  index?: number;
  /** Faktor pelebaran tambahan (mis. fusi). */
  fusion?: number;
}

/** Bangun template ventrikel lengkap untuk satu denyut. */
export function buildVentricular(spec: MorphSpec, o: BuildOpts): VentricularTemplate {
  const beat = o.beat ?? 'conducted';
  let cond: Conduction = spec.conduction ?? 'normal';
  if (beat === 'aberrant-rbbb') cond = 'rbbb';
  if (beat === 'aberrant-lbbb') cond = 'lbbb';
  if (beat === 'paced') cond = spec.conduction === 'paced-biv' ? 'paced-biv' : 'paced-rv';
  const isEctopic = beat === 'pvc' || beat === 'vt' || beat === 'escape-v';
  // Denyut ektopik/pacu tidak membawa pre-eksitasi atau perubahan konduksi dasar.
  const base = isEctopic ? ectopicQrs(o.origin ?? 'rvot') : baseQrs(cond, spec.deltaS ?? 0.04);
  let qrs = base.qrs.map((k) => ({ ...k, v: [...k.v] as Vec3 }));
  let tVec: Vec3 = [...base.t] as Vec3;
  const st: StSeg[] = [];
  const local: Kernel[] = [];
  const conducted = !isEctopic && beat !== 'paced';

  if (conducted) {
    // Hipertrofi
    if (spec.lvh) {
      const k = 1 + 0.9 * spec.lvh;
      qrs = qrs.map((q, i) => (i === 2 || i === 1 ? { ...q, v: [q.v[0] * k, q.v[1] * (1 + 0.4 * spec.lvh!), q.v[2] * (1 + 1.1 * spec.lvh!)] as Vec3, sL: q.sL * 1.12, sR: q.sR * 1.12 } : q));
      if (cond === 'normal') qrs[3] = { ...qrs[3], v: [qrs[3].v[0], qrs[3].v[1], qrs[3].v[2] * (1 + 0.8 * spec.lvh)] };
    }
    if (spec.rvh) {
      qrs.push(K(0.05, 0.011, scale([-0.55, 0.35, -0.9], spec.rvh)));
      qrs = qrs.map((q, i) => (i === 2 ? { ...q, v: scale(q.v, Math.max(0.3, 1 - 0.45 * spec.rvh!)) } : q));
    }
    // Infark lama: hilangnya gaya awal ke arah teritori → gelombang Q
    for (const mi of spec.oldMi ?? []) {
      if (mi === 'inferior') {
        qrs[0] = K(0.016, 0.01, [0.05, -0.32, -0.05]);
        tVec = add(tVec, [0.0, -0.32, 0.0]);
      } else if (mi === 'anterior' || mi === 'anteroseptal') {
        qrs[0] = K(0.016, 0.01, [-0.05, 0.0, 0.32]);
        qrs[1] = { ...qrs[1], v: [qrs[1].v[0] * (mi === 'anterior' ? 0.45 : 0.7), qrs[1].v[1], 0.25] };
        tVec = add(tVec, [0.0, 0.0, 0.35]);
      } else if (mi === 'lateral') {
        qrs[0] = K(0.016, 0.01, [-0.3, 0.1, 0.0]);
        tVec = add(tVec, [-0.3, 0.05, 0.0]);
      } else if (mi === 'posterior') {
        qrs[1] = { ...qrs[1], v: [qrs[1].v[0], qrs[1].v[1], qrs[1].v[2] - 0.45] };
        qrs[2] = { ...qrs[2], v: [qrs[2].v[0], qrs[2].v[1], qrs[2].v[2] * 0.2] };
        tVec = add(tVec, [0, 0, -0.2]);
      }
    }
    if (spec.hcmQ) qrs[0] = { ...qrs[0], v: scale(norm([-0.85, -0.15, -0.45]), spec.hcmQ / 0.53), sL: 0.007, sR: 0.007 };
    if (spec.s1q3t3) {
      qrs[0] = K(0.014, 0.008, [0.1, -0.28, -0.05]);
      qrs.push(K(0.08, 0.01, [-0.4, 0.1, -0.15]));
      tVec = add(tVec, [-0.05, -0.32, 0.45]);
    }
    if (spec.tcaTerminal) {
      const end = Math.max(...qrs.map((q) => q.c + 2.5 * q.sR));
      qrs.push(K(end - 0.01, 0.014, scale(norm([-0.6, -0.5, -0.1]), spec.tcaTerminal / 0.68)));
    }
  }

  // Rotasi aksis & skala
  if (spec.axisShift && conducted) qrs = qrs.map((q) => ({ ...q, v: rotateFrontal(q.v, spec.axisShift!) }));
  if (spec.horizRot && conducted) qrs = qrs.map((q) => ({ ...q, v: rotateHorizontal(q.v, spec.horizRot!) }));
  let qs = spec.qrsScale ?? 1;
  if (spec.alternans && o.index !== undefined) qs *= o.index % 2 === 0 ? 1 + spec.alternans : 1 - spec.alternans;
  if (qs !== 1) qrs = qrs.map((q) => ({ ...q, v: scale(q.v, qs) }));
  const widen = (spec.qrsWiden ?? 1) * (o.fusion ?? 1);
  if (widen !== 1) qrs = qrs.map((q) => ({ ...q, c: q.c * widen, sL: q.sL * widen, sR: q.sR * widen }));

  const qrsEnd = Math.max(...qrs.map((q) => q.c + 2.5 * q.sR));
  const qrsDur = qrsEnd;

  // QT: model Fridericia + pemanjangan akibat QRS lebar
  const qtc = (spec.qtc ?? 400) / 1000;
  const rr = Math.max(0.24, Math.min(2.5, o.rr));
  let qt = qtc * Math.cbrt(rr) + Math.max(0, qrsDur - 0.09);
  if (isEctopic || beat === 'paced') qt = Math.max(qt, qrsDur + 0.24);

  // Gelombang T
  const tScaleW = spec.tWidthFixed ? 1 : qt / 0.4;
  let sL = 0.07 * tScaleW;
  let sR = 0.042 * tScaleW;
  let tAmp = spec.tScale ?? 1;
  if (spec.tPeaked) {
    const p = spec.tPeaked;
    sL = sL * (1 - 0.62 * p);
    sR = sR * (1 - 0.45 * p);
    tAmp *= 1 + 1.05 * p;
    tVec = add(tVec, scale([0.1, 0.0, -0.22], p));
  }
  let tPeak = qt - 2.5 * sR;
  // T tidak boleh dimulai sebelum titik J
  const tOnsetMin = qrsEnd + 0.015;
  if (tPeak - 2.5 * sL < tOnsetMin) sL = Math.max(0.012, (tPeak - tOnsetMin) / 2.5);
  if (tPeak < qrsEnd + 0.04) tPeak = qrsEnd + 0.04;

  const t: Kernel[] = [];
  if (spec.wellens === 'A' && conducted) {
    t.push({ c: tPeak - 0.06, sL: sL * 0.6, sR: 0.03, v: scale(tVec, tAmp * 0.6) });
    t.push({ c: tPeak + 0.02, sL: 0.03, sR: sR, v: territoryVector('anterior', -0.32) });
  } else {
    t.push({ c: tPeak, sL, sR, v: scale(tVec, tAmp) });
    if (spec.wellens === 'B' && conducted) t.push({ c: tPeak, sL: sL * 0.8, sR: sR, v: territoryVector('anterior', -1.0) });
  }
  if (conducted) {
    for (const te of spec.tExtra ?? []) {
      const v = territoryVector(te.territory, te.mm / 10, te.index);
      t.push({ c: tPeak - (te.symmetric ? 0.01 : 0), sL: te.symmetric ? sR * 1.1 : sL, sR: te.symmetric ? sR * 1.1 : sR, v });
    }
    if (spec.strain === 'lv') t.push({ c: tPeak, sL: sL * 1.1, sR: sR * 0.85, v: [-0.55, -0.05, -0.35] });
    if (spec.strain === 'rv') t.push({ c: tPeak, sL, sR, v: [0.3, 0.1, 0.55] });
  }

  // Segmen ST
  if (base.st && conducted) st.push({ v: base.st, shape: 'plateau' });
  if (base.st && beat === 'paced') st.push({ v: base.st, shape: 'plateau' });
  // Arus injuri (ST) juga tampak pada denyut pacu (dasar kriteria Sgarbossa pada irama pacu)
  if (conducted || beat === 'paced') for (const s of spec.st ?? []) st.push({ v: territoryVector(s.territory, s.mm / 10, s.index), shape: s.shape ?? 'plateau' });
  if (conducted) {
    if (spec.strain === 'lv') st.push({ v: [-0.11, -0.02, -0.07], shape: 'downsloping' });
    if (spec.strain === 'rv') st.push({ v: [0.04, 0.02, 0.08], shape: 'downsloping' });
  }

  // Gelombang U
  const u: Kernel[] = [];
  if (spec.u && conducted) u.push({ c: qt + 0.07, sL: 0.035, sR: 0.04, v: scale(norm([0.2, 0.1, -0.85]), spec.u / 1.28) });

  // Gelombang J/Osborn: di akhir QRS searah gaya ventrikel utama
  if (spec.osborn && conducted) qrs.push({ c: qrsEnd - 0.004, sL: 0.009, sR: 0.02, v: scale(norm([0.75, 0.6, 0.05]), spec.osborn / 0.89) });

  // Brugada: komponen non-dipolar lokal V1–V2 (medan dekat RVOT)
  if (spec.brugada && conducted) {
    const j = qrsEnd;
    if (spec.brugada === 1) {
      for (const [lead, a] of [['V1', 0.27], ['V2', 0.36]] as const) {
        local.push({ lead, c: j - 0.004, sL: 0.008, sR: 0.075, v: [a, 0, 0] });
        local.push({ lead, c: j + 0.2, sL: 0.06, sR: 0.05, v: [-a * (lead === 'V2' ? 1.9 : 0.9), 0, 0] });
      }
    } else {
      for (const [lead, a] of [['V1', 0.12], ['V2', 0.22]] as const) {
        local.push({ lead, c: j - 0.002, sL: 0.006, sR: 0.012, v: [a * 0.7, 0, 0] });
        local.push({ lead, c: j + 0.06, sL: 0.03, sR: 0.04, v: [a * 0.55, 0, 0] });
      }
    }
  }

  // Lonjakan pacu
  const spikes: Array<{ t: number; v: Vec3 }> = [];
  if (beat === 'paced') spikes.push({ t: -0.004, v: [0.9, -1.6, 1.0] });

  // Dekstrokardia: cermin sumbu X untuk semua komponen
  if (spec.dextro) {
    qrs = qrs.map((q) => ({ ...q, v: mirrorX(q.v) }));
    for (const k of t) k.v = mirrorX(k.v);
    for (const s of st) s.v = mirrorX(s.v);
  }

  return { qrs, t, u, local, st, qrsDur, qt, tPeak, spikes };
}

// ---------------------------------------------------------------------------
// Gelombang P
// ---------------------------------------------------------------------------
export type PKind = 'sinus' | 'retrograde' | 'ectopic-low' | 'ectopic-left' | 'mat-a' | 'mat-b' | 'mat-c' | 'paced-a';

export interface PTemplate {
  kernels: Kernel[];
  dur: number;
}

export function buildP(spec: MorphSpec, kind: PKind): PTemplate {
  const s = spec.pScale ?? 1;
  const m = spec.pMorph ?? 'normal';
  let ks: Kernel[];
  switch (kind) {
    case 'sinus': {
      let ra: Kernel = K(0.04, 0.015, [0.02, 0.1, -0.06]);
      let la: Kernel = K(0.068, 0.016, [0.09, 0.07, 0.05]);
      if (m === 'pulmonale' || m === 'biatrial') ra = { ...ra, v: scale(ra.v, 2.5) };
      if (m === 'mitrale' || m === 'biatrial') la = { c: 0.094, sL: 0.02, sR: 0.02, v: scale([0.07, 0.04, 0.09], 1.7) };
      ks = m === 'none' ? [] : [ra, la];
      break;
    }
    case 'retrograde':
      ks = [K(0.03, 0.014, [-0.02, -0.13, 0.04])];
      break;
    case 'ectopic-low':
      ks = [K(0.035, 0.016, [0.04, -0.11, 0.0])];
      break;
    case 'ectopic-left':
      ks = [K(0.035, 0.016, [-0.08, 0.07, 0.07])];
      break;
    case 'mat-a':
      ks = [K(0.035, 0.015, [0.06, 0.13, -0.02])];
      break;
    case 'mat-b':
      ks = [K(0.035, 0.015, [0.05, -0.06, 0.05]), K(0.06, 0.012, [0.04, 0.05, 0.0])];
      break;
    case 'mat-c':
      ks = [K(0.04, 0.02, [-0.03, 0.08, -0.08])];
      break;
    case 'paced-a':
      ks = [K(0.045, 0.02, [0.06, 0.09, 0.02])];
      break;
  }
  ks = ks.map((k) => ({ ...k, v: scale(k.v, s) }));
  if (spec.dextro && kind === 'sinus') ks = ks.map((k) => ({ ...k, v: mirrorX(k.v) }));
  const dur = ks.length ? Math.max(...ks.map((k) => k.c + 2.5 * k.sR)) : 0;
  return { kernels: ks, dur };
}
