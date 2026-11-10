/**
 * Tipe dasar modul EKG (tanpa ketergantungan framework).
 * Satuan: waktu dalam detik, amplitudo dalam milivolt (mV).
 */

/** 12 sadapan standar, urutan tampilan klinis. */
export const STANDARD_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
/** Sadapan tambahan (kanan & posterior). */
export const EXTRA_LEADS = ['V3R', 'V4R', 'V5R', 'V7', 'V8', 'V9'] as const;
/** 8 sadapan independen yang disimpan; III, aVR, aVL, aVF diturunkan saat render. */
export const STORED_LEADS = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

export type StandardLead = (typeof STANDARD_LEADS)[number];
export type ExtraLead = (typeof EXTRA_LEADS)[number];
export type LeadName = StandardLead | ExtraLead;
export type StoredLead = (typeof STORED_LEADS)[number];

/** Rekaman EKG multi-sadapan dalam mV. */
export interface EcgSignal {
  /** Frekuensi sampling (Hz). */
  fs: number;
  /** Jumlah sampel per sadapan. */
  length: number;
  /** Sinyal per sadapan (mV). Selalu berisi 12 sadapan standar setelah `completeLeads`. */
  leads: Partial<Record<LeadName, Float32Array>>;
}

/** Penanda waktu untuk anotasi (detik sejak awal rekaman). */
export interface TimeSpan {
  t0: number;
  t1: number;
}

/** Anotasi kelainan pada sadapan tertentu (dipakai overlay setelah menjawab). */
export interface Annotation {
  leads: LeadName[];
  /** Rentang waktu; bila kosong berarti seluruh rekaman pada sadapan tsb. */
  spans?: TimeSpan[];
  /** Judul singkat, mis. "Elevasi ST". */
  label: string;
  /** Penjelasan untuk pengguna. */
  text: string;
  kind?: 'st-elevasi' | 'st-depresi' | 'gelombang-t' | 'qrs' | 'gelombang-p' | 'interval' | 'irama' | 'lain';
}

/** Kejadian per denyut (dari rhythm engine), untuk anotasi dan ground truth. */
export interface BeatMark {
  /** Awal gelombang P (detik) atau null. */
  p: number | null;
  /** Awal QRS (detik) atau null bila P tidak dikonduksikan. */
  qrs: number | null;
  /** Akhir QRS / titik J. */
  j: number | null;
  /** Akhir gelombang T. */
  tEnd: number | null;
  /** Jenis denyut, mis. 'sinus', 'pvc', 'pac', 'paced', 'escape', 'blocked'. */
  kind: string;
}

export type Vec3 = [number, number, number];
