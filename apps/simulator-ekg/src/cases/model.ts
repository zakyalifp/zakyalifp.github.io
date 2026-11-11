/**
 * Model kasus & pemuat (lazy per kasus). Kasus nyata dari manifest PTB-XL/Chapman,
 * kasus sintetis dari synthetic.ts. Keduanya diberi tanda jenis data yang jelas.
 */
import type { Annotation, BeatMark, EcgSignal, LeadName } from '../ekg/core/types';
import { DIAGNOSES, type Category, type Level } from './diagnoses';
import { SERIAL_SYNTH, SYNTHETIC_CASES, type SynthCase } from './synthetic';
import { steThresholdMm } from '../clinical/ecg-criteria';

export type DataKind = 'nyata' | 'sintetis';

export interface Truth {
  hr: number | null;
  atrialRate?: number | null;
  pr: number | null;
  qrs: number | null;
  qt: number | null;
  qtcB: number | null;
  qtcF: number | null;
  axis: number | null;
  source: string;
}

export interface RealManifestEntry {
  id: string;
  dataset: string;
  datasetVersion: string;
  recordId: string;
  recordPath: string;
  file: string;
  dx: string;
  age: number | null;
  ageNote?: string | null;
  sex: 'L' | 'P';
  labels: Record<string, number | string>;
  labels12sl: string[];
  infarctionStadium?: string | null;
  validatedByHuman: boolean;
  measures: { source: string; hr: number | null; atrialRate?: number | null; pr: number | null; qrs: number | null; qt: number | null; qtcB: number | null; qtcF: number | null; axis: number | null };
  stMm?: Record<string, number>;
  tMm?: Record<string, number>;
  rMm?: Record<string, number>;
  sMm?: Record<string, number>;
  qMs?: Record<string, number>;
  quality: Record<string, unknown>;
  license: string;
  citation: string[];
}

export interface CaseMeta {
  id: string;
  dx: string;
  secondary: string[];
  kind: DataKind;
  category: Category;
  level: Level;
  title: string;
  age: number | null;
  sex: 'L' | 'P';
  dataset: string;
  license: string;
  citation: string[];
  recordId?: string;
  labels?: Record<string, number | string>;
  labels12sl?: string[];
  infarctionStadium?: string | null;
  reference?: boolean;
  extraLeads: boolean;
  /** Ground truth pengukuran (nyata: PTB-XL+; sintetis: dari model). Diisi saat dimuat untuk sintetis. */
  truth?: Truth;
  real?: RealManifestEntry;
  synth?: SynthCase;
}

export interface LoadedCase {
  meta: CaseMeta;
  signal: EcgSignal;
  annotations: Annotation[];
  beats: BeatMark[];
  truth: Truth;
}

export const SYNTH_LICENSE = 'Dibangkitkan oleh synthesizer simulator ini (bukan rekaman pasien).';

export function synthMeta(s: SynthCase): CaseMeta {
  const dx = DIAGNOSES[s.dx];
  return {
    id: s.id,
    dx: s.dx,
    secondary: s.secondary ?? [],
    kind: 'sintetis',
    category: dx.category,
    level: s.level ?? dx.level,
    title: s.title ?? dx.label,
    age: s.age,
    sex: s.sex,
    dataset: 'Sintetis (model VCG)',
    license: SYNTH_LICENSE,
    citation: [],
    reference: s.reference,
    extraLeads: !!s.spec.extraLeads,
    synth: s,
  };
}

export function realMeta(r: RealManifestEntry): CaseMeta {
  const dx = DIAGNOSES[r.dx];
  return {
    id: r.id,
    dx: r.dx,
    secondary: [],
    kind: 'nyata',
    category: dx.category,
    level: dx.level,
    title: dx.label,
    age: r.age,
    sex: r.sex,
    dataset: `${r.dataset} ${r.datasetVersion}`,
    license: r.license,
    citation: r.citation,
    recordId: r.recordId,
    labels: r.labels,
    labels12sl: r.labels12sl,
    infarctionStadium: r.infarctionStadium,
    extraLeads: false,
    truth: {
      hr: r.measures.hr,
      atrialRate: r.measures.atrialRate ?? null,
      pr: r.measures.pr,
      qrs: r.measures.qrs,
      qt: r.measures.qt,
      qtcB: r.measures.qtcB,
      qtcF: r.measures.qtcF,
      axis: r.measures.axis,
      source: r.measures.source,
    },
    real: r,
  };
}

export const SYNTH_METAS: CaseMeta[] = SYNTHETIC_CASES.map(synthMeta);
export const SERIAL_METAS: CaseMeta[] = SERIAL_SYNTH.map(synthMeta);

const LIMB: LeadName[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const ALL12: LeadName[] = [...LIMB, 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/** Anotasi kasus nyata diturunkan dari diagnosis + pengukuran 12SL (PTB-XL+). */
export function realAnnotations(r: RealManifestEntry): Annotation[] {
  const dx = DIAGNOSES[r.dx];
  const st = r.stMm ?? {};
  const t = r.tMm ?? {};
  const q = r.qMs ?? {};
  const age = r.age ?? 60;
  const out: Annotation[] = [];
  const fmt = (l: string, v: number) => `${l} ${v > 0 ? '+' : ''}${v.toFixed(1)} mm`;
  const ste = ALL12.filter((l) => (st[l] ?? 0) >= steThresholdMm(l, r.sex, age));
  const std = ALL12.filter((l) => (st[l] ?? 0) <= -0.5 && l !== 'aVR');
  const twi = ALL12.filter((l) => (t[l] ?? 0) <= -1 && l !== 'aVR' && l !== 'V1');
  const qw = ALL12.filter((l) => (q[l] ?? 0) >= 30 && l !== 'aVR');
  const rhythmLeads: LeadName[] = ['II', 'V1'];
  const add = (leads: LeadName[], label: string, text: string, kind: Annotation['kind']) => {
    if (leads.length) out.push({ leads, label, text, kind });
  };
  switch (r.dx) {
    case 'stemi-anterior':
    case 'stemi-inferior':
    case 'stemi-lateral':
      add(ste, 'Elevasi ST', `Elevasi ST memenuhi ambang UDMI-4/ESC 2023 di ${ste.length} sadapan berdekatan: ${ste.map((l) => fmt(l, st[l])).join(', ')} (ukuran titik J, GE 12SL).`, 'st-elevasi');
      add(std, 'Depresi resiprokal', `Depresi ST: ${std.map((l) => fmt(l, st[l])).join(', ')}.`, 'st-depresi');
      break;
    case 'nstemi-std':
    case 'digoxin':
      add(std, 'Depresi ST', `Depresi ST: ${std.map((l) => fmt(l, st[l])).join(', ')}.`, 'st-depresi');
      break;
    case 'ischemic-twi':
      add(twi, 'Inversi T', `Inversi T: ${twi.map((l) => `${l} ${t[l].toFixed(1)} mm`).join(', ')}.`, 'gelombang-t');
      break;
    case 'old-mi-inferior':
    case 'old-mi-anterior':
      add(qw.length ? qw : r.dx === 'old-mi-anterior' ? ['V1', 'V2', 'V3'] : ['II', 'III', 'aVF'], 'Gelombang Q', `Gelombang Q/QS patologis${qw.length ? `: ${qw.map((l) => `${l} ${q[l]} ms`).join(', ')}` : ' (progresi R buruk)'}; tanpa elevasi ST memenuhi kriteria.`, 'qrs');
      break;
    case 'aneurysm':
      add(qw.length ? qw : ['V1', 'V2', 'V3'], 'Gelombang Q', 'Gelombang Q/QS pada teritori infark lama.', 'qrs');
      add(ALL12.filter((l) => (st[l] ?? 0) >= 1), 'Elevasi ST menetap', 'Elevasi ST persisten pada sadapan dengan gelombang Q.', 'st-elevasi');
      break;
    case 'lvh':
    case 'lvh-strain':
      add(['V1', 'V5', 'V6', 'aVL'], 'Voltase LVH', `Sokolow–Lyon SV1+RV5/6 = ${(((r.sMm?.V1 ?? 0) + Math.max(r.rMm?.V5 ?? 0, r.rMm?.V6 ?? 0))).toFixed(0)} mm; Cornell RaVL+SV3 = ${((r.rMm?.aVL ?? 0) + (r.sMm?.V3 ?? 0)).toFixed(0)} mm.`, 'qrs');
      if (r.dx === 'lvh-strain') add(std.filter((l) => ['I', 'aVL', 'V4', 'V5', 'V6'].includes(l)), 'ST-T sekunder ("strain")', 'Depresi ST & inversi T asimetris di sadapan lateral.', 'st-depresi');
      break;
    case 'rvh':
      add(['V1', 'V2', 'I', 'V6'], 'RVH', 'R dominan di V1 dengan S dalam di I/V6.', 'qrs');
      break;
    case 'lae':
    case 'rae':
      add(['II', 'V1'], r.dx === 'lae' ? 'P mitral' : 'P pulmonal', dx.findings.join('; '), 'gelombang-p');
      break;
    case 'low-voltage':
      add(LIMB, 'Voltase rendah', 'Amplitudo QRS <5 mm di semua sadapan ekstremitas.', 'qrs');
      break;
    case 'long-qt':
      add(['II', 'V2', 'V5'], 'QT memanjang', `QTc Bazett ${r.measures.qtcB} ms (GE 12SL).`, 'interval');
      break;
    case 'rbbb':
    case 'bifascicular':
      add(['V1', 'V2'], 'rsR′', 'Pola rsR′ di V1–V2.', 'qrs');
      add(['I', 'V6'], 'S lebar', 'S lebar di I dan V6.', 'qrs');
      if (r.dx === 'bifascicular') add(['II', 'III', 'aVF', 'aVL'], 'Aksis kiri', `Aksis ${r.measures.axis}° (LAFB).`, 'qrs');
      break;
    case 'lbbb':
      add(['I', 'aVL', 'V5', 'V6'], 'R lebar berlekuk', 'R lebar berlekuk tanpa q septal.', 'qrs');
      add(['V1', 'V2', 'V3'], 'QS/rS dalam', 'QS/rS dalam dengan ST-T diskordan.', 'qrs');
      break;
    case 'lafb':
    case 'lpfb':
      add(['I', 'aVL', 'II', 'III', 'aVF'], r.dx === 'lafb' ? 'Aksis kiri' : 'Aksis kanan', `Aksis frontal ${r.measures.axis}°.`, 'qrs');
      break;
    case 'wpw':
      add(ALL12, 'Pre-eksitasi', `PR ${r.measures.pr} ms dengan gelombang delta, QRS ${r.measures.qrs} ms.`, 'qrs');
      break;
    case 'paced':
      add(['II', 'V1', 'V6'], 'Irama pacu', 'Spike pacu diikuti QRS lebar.', 'irama');
      break;
    case 'early-repol':
      add(ALL12.filter((l) => (st[l] ?? 0) >= 0.5), 'Elevasi titik J', 'Elevasi titik J/ST cekung tanpa resiprokal.', 'st-elevasi');
      break;
    default:
      add(rhythmLeads, dx.label, dx.findings.join('; '), 'irama');
  }
  if (!out.length) out.push({ leads: rhythmLeads, label: dx.label, text: dx.findings.join('; '), kind: 'lain' });
  return out;
}

/** Ubah anotasi sintetis (dengan label denyut) menjadi rentang waktu. */
export function resolveSynthAnnotations(s: SynthCase, beats: BeatMark[], durationS: number): Annotation[] {
  return s.annotations.map((a) => {
    if (!a.beats) return { leads: a.leads, label: a.label, text: a.text, kind: a.kind };
    const spans = beats
      .filter((b) => b.kind === a.beats && b.qrs !== null)
      .map((b) => ({ t0: Math.max(0, (b.p ?? b.qrs!) - 0.06), t1: Math.min(durationS, (b.tEnd ?? b.qrs! + 0.4) + 0.04) }));
    if (!spans.length) {
      // lonjakan tanpa QRS (gagal capture): pakai titik waktu terdekat
      return { leads: a.leads, label: a.label, text: a.text, kind: a.kind };
    }
    return { leads: a.leads, label: a.label, text: a.text, kind: a.kind, spans };
  });
}
