/**
 * Model vektorkardiogram (VCG) → proyeksi ke sadapan.
 *
 * Sistem koordinat Frank: X positif ke KIRI pasien, Y positif ke INFERIOR (kaki),
 * Z positif ke POSTERIOR (punggung). Vektor dipol jantung V(t) = [X, Y, Z] dalam mV.
 *
 * Sadapan I, II, V1–V6 = koefisien transformasi Dower (Dower GE, Machado HB, Osborne JA.
 * On deriving the electrocardiogram from vectorcardiographic leads. Clin Cardiol
 * 1980;3:87–95). Pendekatan "VCG 3D → Dower → 12 sadapan" mengikuti model dinamis
 * Sameni R, Clifford GD, Jutten C, Shamsollahi MB. Multichannel ECG and noise modeling:
 * application to maternal and fetal ECG signals. EURASIP J Adv Signal Process 2007.
 *
 * Sadapan III, aVR, aVL, aVF SELALU diturunkan dari I dan II (lihat core/leads.ts)
 * sehingga hukum Einthoven terpenuhi persis, sama seperti untuk data nyata.
 *
 * Sadapan kanan (V3R–V5R) dan posterior (V7–V9) TIDAK ada dalam matriks Dower; koefisien
 * di bawah adalah ekstrapolasi model (pencerminan V3–V5 terhadap bidang sagital dan rotasi
 * lanjutan V6 ke posterior, dengan atenuasi). Status: asumsi-sim (lihat CLINICAL_REVIEW).
 */
import type { LeadName, Vec3 } from '../core/types';

export const DOWER: Record<'I' | 'II' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6', Vec3> = {
  I: [0.632, -0.235, 0.059],
  II: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
};

/** Ekstrapolasi model untuk sadapan tambahan (asumsi-sim). */
export const EXTRA_VECTORS: Record<'V3R' | 'V4R' | 'V5R' | 'V7' | 'V8' | 'V9', Vec3> = {
  V3R: [-0.62, 0.09, -1.02],
  V4R: [-0.85, 0.11, -0.5],
  V5R: [-0.8, 0.11, -0.08],
  V7: [0.55, 0.06, 0.5],
  V8: [0.3, 0.05, 0.6],
  V9: [0.06, 0.05, 0.6],
};

export const PROJECTED_LEADS = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

export function leadVector(lead: LeadName): Vec3 {
  if (lead in DOWER) return DOWER[lead as keyof typeof DOWER];
  if (lead in EXTRA_VECTORS) return EXTRA_VECTORS[lead as keyof typeof EXTRA_VECTORS];
  // Sadapan turunan: kombinasi linier I & II.
  const I = DOWER.I;
  const II = DOWER.II;
  const lin = (a: number, b: number): Vec3 => [a * I[0] + b * II[0], a * I[1] + b * II[1], a * I[2] + b * II[2]];
  switch (lead) {
    case 'III':
      return lin(-1, 1);
    case 'aVR':
      return lin(-0.5, -0.5);
    case 'aVL':
      return lin(1, -0.5);
    case 'aVF':
      return lin(-0.5, 1);
    default:
      return [0, 0, 0];
  }
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}
export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function norm(a: Vec3): Vec3 {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
}
/** Rotasi pada bidang frontal (sumbu Z) sebesar `deg` (positif = searah jarum jam pada
 *  roda heksaksial, yaitu menuju +90°/inferior). */
export function rotateFrontal(v: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  // Pada heksaksial, sudut θ diukur dari +X (kiri) menuju +Y (inferior).
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}
/** Rotasi pada bidang horizontal (sumbu Y), positif = searah jarum jam dilihat dari bawah
 *  (kiri → posterior), yaitu "clockwise rotation" transisi prekordial bergeser ke kiri. */
export function rotateHorizontal(v: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c];
}

/**
 * Arah vektor arus injuri/ST & T per teritori (satuan; akan diskalakan agar sadapan
 * indeks mencapai amplitudo yang diminta). Arah dipilih agar pola sadapan sesuai
 * teritori klinis pada PNPK26 Tabel 4 (V1–V4 anterior; I, aVL, V5–V6 lateral; II, III,
 * aVF inferior; V7–V9 posterior; V3R–V4R ventrikel kanan) beserta resiproknya.
 */
export const TERRITORY: Record<string, { dir: Vec3; index: LeadName }> = {
  // LAD (anterior/anteroseptal), elevasi maksimal V2–V3
  anterior: { dir: norm([0.25, -0.15, -1.0]), index: 'V3' },
  // LAD proksimal: anterior + lateral tinggi (I, aVL), resiprok inferior
  anteriorProximal: { dir: norm([0.45, -0.45, -1.0]), index: 'V3' },
  // LAD distal/"wrap-around": anterior + inferior
  anteroinferior: { dir: norm([0.4, 0.55, -0.9]), index: 'V3' },
  // RCA inferior: III > II, resiprok aVL/I
  inferior: { dir: norm([-0.25, 1.0, 0.1]), index: 'III' },
  // LCx inferior: II ≥ III, sering + lateral
  inferiorLcx: { dir: norm([0.25, 1.0, 0.3]), index: 'II' },
  // RCA proksimal + ventrikel kanan (V1 & V4R)
  inferiorRv: { dir: norm([-0.55, 1.0, -0.35]), index: 'III' },
  // Inferoposterior
  inferoposterior: { dir: norm([-0.15, 1.0, 0.75]), index: 'III' },
  // Lateral/posterolateral (LCx/diagonal)
  lateral: { dir: norm([1.0, -0.3, 0.5]), index: 'aVL' },
  highLateral: { dir: norm([0.9, -0.8, 0.0]), index: 'aVL' },
  // Posterior murni (depresi V1–V3, elevasi V7–V9)
  posterior: { dir: norm([0.15, 0.1, 1.0]), index: 'V8' },
  // Iskemia subendokardial difus (elevasi aVR/V1, depresi ≥6 sadapan)
  diffuseSubendo: { dir: norm([-0.75, -0.6, -0.1]), index: 'aVR' },
  // Iskemia subendokardial lateral (depresi V4–V6, I, II)
  subendoLateral: { dir: norm([-0.8, -0.2, 0.15]), index: 'V5' },
  // Perikarditis: searah rerata vektor ventrikel (difus), resiprok hanya aVR (± V1)
  pericarditis: { dir: norm([0.75, 0.6, -0.25]), index: 'II' },
  // Ventrikel kanan murni (V4R)
  rightVentricle: { dir: norm([-0.9, 0.2, -0.45]), index: 'V4R' },
};

/** Skala arah teritori agar proyeksi pada sadapan indeks = targetMv. */
export function territoryVector(name: keyof typeof TERRITORY | string, targetMv: number, indexLead?: LeadName): Vec3 {
  const t = TERRITORY[name];
  if (!t) throw new Error(`Teritori tidak dikenal: ${name}`);
  const lead = indexLead ?? t.index;
  const p = dot(t.dir, leadVector(lead));
  if (Math.abs(p) < 1e-6) throw new Error(`Sadapan indeks ${lead} tegak lurus teritori ${name}`);
  return scale(t.dir, targetMv / p);
}
