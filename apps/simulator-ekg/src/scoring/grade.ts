/**
 * Penilaian per langkah & per kasus (murni, teruji). Toleransi dari SCORING di ecg-criteria.ts.
 */
import { AXIS_LABEL, axisCategory, QT, RATE, SCORING, type AxisCategory } from '../clinical/ecg-criteria';
import { DIAGNOSES, MGMT_LABEL, PWAVE_LABEL, RHYTHM_LABEL, ST_LABEL, T_LABEL, type Competency, type MgmtKey, type PWave, type RhythmKey, type StFinding, type TFinding } from '../cases/diagnoses';
import type { CaseMeta, Truth } from '../cases/model';

export interface StepResult {
  step: string;
  label: string;
  /** null = tidak dinilai. */
  ok: boolean | null;
  /** 0–1 (nilai parsial dimungkinkan). */
  credit: number;
  user: string;
  truth: string;
  feedback: string;
  competency: Competency;
  weight: number;
  critical?: boolean;
}

export interface ItemResult {
  caseId: string;
  dx: string;
  kind: 'nyata' | 'sintetis';
  mode: string;
  /** 0–1 */
  score: number;
  correctDx: boolean;
  steps: StepResult[];
  criticalErrors: string[];
  timeS: number;
}

/** Keluarga diagnosis: jawaban dalam keluarga yang sama mendapat nilai parsial. */
export const DX_FAMILIES: string[][] = [
  ['hyperk-1', 'hyperk-2', 'hyperk-3'],
  ['wellens-a', 'wellens-b'],
  ['stemi-inferior', 'stemi-rv'],
  ['sgarbossa-lbbb', 'sgarbossa-paced'],
  ['lvh', 'lvh-strain'],
  ['pvc', 'bigeminy', 'trigeminy'],
  ['old-mi-inferior', 'old-mi-anterior'],
  ['misplacement-lara', 'misplacement-rlra', 'misplacement-prec'],
  ['pacing-noncapture', 'pacing-undersensing'],
  ['mobitz2', 'av-2to1'],
  ['svt', 'atrial-tachy'],
  ['digoxin', 'dig-toxicity'],
  ['hypocalcemia', 'long-qt'],
  ['low-voltage', 'electrical-alternans'],
];
export function sameFamily(a: string, b: string): boolean {
  return DX_FAMILIES.some((f) => f.includes(a) && f.includes(b));
}

/** Irama dasar sebenarnya (menyesuaikan laju terukur untuk irama sinus). */
export function truthRhythm(meta: CaseMeta, truth: Truth): RhythmKey {
  const r = DIAGNOSES[meta.dx].rhythm;
  if (r === 'sinus' && truth.hr !== null) {
    if (truth.hr < RATE.BRADY_BELOW) return 'sinus-brady';
    if (truth.hr > RATE.TACHY_ABOVE) return 'sinus-tachy';
  }
  return r;
}
const SINUS_FAMILY: RhythmKey[] = ['sinus', 'sinus-brady', 'sinus-tachy', 'sinus-arrhythmia'];
/** Irama sangat tidak teratur: QTc tidak dikoreksi/dinilai (RAUTAHARJU09). */
export const IRREGULAR_RHYTHMS: RhythmKey[] = ['af', 'mat'];

export interface SystematicAnswer {
  hr?: number | null;
  rhythm?: RhythmKey | '';
  axis?: number | null;
  axisCat?: AxisCategory | '';
  p?: PWave | '';
  pr?: number | null;
  prNA?: boolean;
  qrs?: number | null;
  st?: StFinding | '';
  t?: TFinding | '';
  qt?: number | null;
  qtc?: number | null;
  qtNA?: boolean;
  dx?: string;
  mgmt?: MgmtKey | '';
}

function numStep(step: string, label: string, user: number | null | undefined, na: boolean | undefined, truth: number | null, tol: number, unit: string, comp: Competency, why?: string): StepResult {
  const base = { step, label, competency: comp, weight: 1 };
  if (truth === null || truth === undefined) {
    const ok = na === true || user === null || user === undefined;
    return { ...base, ok, credit: ok ? 1 : 0, user: na || user == null ? 'tidak dapat diukur' : `${user} ${unit}`, truth: 'tidak dapat diukur', feedback: ok ? 'Tepat: parameter ini tidak dapat diukur pada irama ini.' : `Parameter ini tidak dapat diukur${why ? ` (${why})` : ''}.` };
  }
  if (user === null || user === undefined || Number.isNaN(user)) return { ...base, ok: false, credit: 0, user: 'kosong', truth: `${Math.round(truth)} ${unit}`, feedback: `Nilai sebenarnya ±${Math.round(truth)} ${unit}.` };
  const diff = Math.abs(user - truth);
  const ok = diff <= tol;
  const near = !ok && diff <= tol * 2;
  return {
    ...base,
    ok,
    credit: ok ? 1 : near ? 0.5 : 0,
    user: `${user} ${unit}`,
    truth: `${Math.round(truth)} ${unit}`,
    feedback: ok ? `Tepat (selisih ${Math.round(diff)} ${unit}, toleransi ±${tol}).` : `Selisih ${Math.round(diff)} ${unit} (toleransi ±${tol}). ${near ? 'Hampir — ' : ''}periksa ulang dengan kaliper.`,
  };
}

/** Penilaian formulir Interpretasi Sistematis. */
export function gradeSystematic(meta: CaseMeta, truth: Truth, a: SystematicAnswer): StepResult[] {
  const dx = DIAGNOSES[meta.dx];
  const out: StepResult[] = [];
  const hrTol = truth.hr !== null ? Math.max(SCORING.HR_TOL_ABS, (truth.hr * SCORING.HR_TOL_PCT) / 100) : 0;
  out.push(numStep('hr', 'Laju', a.hr, false, truth.hr && truth.hr > 0 ? truth.hr : null, Math.round(hrTol), '/menit', 'pengukuran'));
  // Irama
  const tr = truthRhythm(meta, truth);
  const ur = a.rhythm || '';
  let rOk = ur === tr;
  let rCredit = rOk ? 1 : 0;
  if (!rOk && SINUS_FAMILY.includes(tr) && SINUS_FAMILY.includes(ur as RhythmKey) && ur) rCredit = 0.5;
  if (!rOk && tr === 'disosiasi-av' && ur === 'sinus') rCredit = 0.5;
  out.push({ step: 'rhythm', label: 'Irama', ok: rOk, credit: rCredit, user: ur ? RHYTHM_LABEL[ur as RhythmKey] : 'kosong', truth: RHYTHM_LABEL[tr], feedback: rOk ? 'Irama tepat.' : `Irama: ${RHYTHM_LABEL[tr]}.`, competency: 'irama', weight: 1.5, critical: !rOk && dx.critical && ['vf', 'vt', 'torsades', 'asistol'].includes(tr) });
  if (out[out.length - 1].critical) out[out.length - 1].feedback += ' Ini irama henti jantung/mengancam nyawa — kesalahan kritis.';
  rOk = rOk || rCredit === 1;
  // Aksis
  if (truth.axis !== null) {
    if (a.axis !== null && a.axis !== undefined && !Number.isNaN(a.axis)) {
      const d = Math.abs((((a.axis - truth.axis) % 360) + 540) % 360 - 180);
      const ok = d <= SCORING.AXIS_TOL_DEG;
      const sameCat = axisCategory(a.axis) === axisCategory(truth.axis);
      out.push({ step: 'axis', label: 'Aksis', ok, credit: ok ? 1 : sameCat ? 0.5 : 0, user: `${a.axis}°`, truth: `${Math.round(truth.axis)}° — ${AXIS_LABEL[axisCategory(truth.axis)]}`, feedback: ok ? 'Aksis tepat.' : `Selisih ${Math.round(d)}° (toleransi ±${SCORING.AXIS_TOL_DEG}°)${sameCat ? '; kategori sudah benar' : ''}.`, competency: 'pengukuran', weight: 1 });
    } else if (a.axisCat) {
      const ok = a.axisCat === axisCategory(truth.axis);
      out.push({ step: 'axis', label: 'Aksis', ok, credit: ok ? 0.8 : 0, user: AXIS_LABEL[a.axisCat], truth: `${Math.round(truth.axis)}° — ${AXIS_LABEL[axisCategory(truth.axis)]}`, feedback: ok ? 'Kategori aksis tepat (isi derajat untuk nilai penuh).' : 'Kategori aksis kurang tepat.', competency: 'pengukuran', weight: 1 });
    } else out.push({ step: 'axis', label: 'Aksis', ok: false, credit: 0, user: 'kosong', truth: `${Math.round(truth.axis)}°`, feedback: 'Tentukan aksis dari sadapan I dan aVF (gunakan roda aksis).', competency: 'pengukuran', weight: 1 });
  }
  // Gelombang P
  const tp = dx.p;
  const up = a.p || '';
  const pOk = up === tp;
  out.push({ step: 'p', label: 'Gelombang P', ok: pOk, credit: pOk ? 1 : 0, user: up ? PWAVE_LABEL[up as PWave] : 'kosong', truth: PWAVE_LABEL[tp], feedback: pOk ? 'Tepat.' : `Gelombang P: ${PWAVE_LABEL[tp]}.`, competency: 'irama', weight: 1 });
  const naWhy = ['af', 'flutter', 'vt', 'vf', 'torsades', 'asistol', 'disosiasi-av', 'junctional', 'svt', 'pacu', 'aivr'].includes(tr) ? 'tidak ada P yang dikonduksikan secara konsisten' : undefined;
  out.push(numStep('pr', 'Interval PR', a.pr, a.prNA, truth.pr, SCORING.PR_TOL_MS, 'ms', 'pengukuran', naWhy));
  out.push(numStep('qrs', 'Durasi QRS', a.qrs, false, truth.qrs, SCORING.QRS_TOL_MS, 'ms', 'pengukuran'));
  const repComp: Competency = dx.category === 'elektrolit' ? 'elektrolit' : 'iskemia';
  const us = a.st || '';
  const stOk = us === dx.st;
  out.push({ step: 'st', label: 'Segmen ST', ok: stOk, credit: stOk ? 1 : 0, user: us ? ST_LABEL[us as StFinding] : 'kosong', truth: ST_LABEL[dx.st], feedback: stOk ? 'Tepat.' : `Segmen ST: ${ST_LABEL[dx.st]}.`, competency: repComp, weight: 1.2, critical: !stOk && !!dx.occlusion && (us === 'normal' || us === '') });
  if (out[out.length - 1].critical) out[out.length - 1].feedback += ' Melewatkan tanda oklusi koroner — kesalahan kritis.';
  const ut = a.t || '';
  const tOk = ut === dx.t;
  out.push({ step: 't', label: 'Gelombang T', ok: tOk, credit: tOk ? 1 : 0, user: ut ? T_LABEL[ut as TFinding] : 'kosong', truth: T_LABEL[dx.t], feedback: tOk ? 'Tepat.' : `Gelombang T: ${T_LABEL[dx.t]}.`, competency: repComp, weight: 1 });
  // RAUTAHARJU09: koreksi QT tidak dilakukan bila variabilitas RR besar (FA, MAT) →
  // langkah QTc ditampilkan sebagai catatan edukasi dan TIDAK dinilai (bobot 0).
  if (QT.NO_CORRECTION_IRREGULAR && IRREGULAR_RHYTHMS.includes(tr)) {
    const filled = !a.qtNA && a.qtc != null && !Number.isNaN(a.qtc);
    out.push({ step: 'qtc', label: 'QTc', ok: true, credit: 1, weight: 0, competency: 'pengukuran', user: filled ? `${a.qtc} ms` : 'tidak dikoreksi', truth: 'tidak dinilai (RR sangat tidak teratur)', feedback: 'Tidak dinilai: AHA/ACCF/HRS 2009 (Rautaharju) menganjurkan koreksi QT tidak dilakukan bila RR sangat bervariasi, seperti pada fibrilasi atrium. Bila perlu, ukur QT pada beberapa siklus dan laporkan rentangnya.' });
  } else {
    const qtNa = ['vf', 'asistol', 'torsades'].includes(tr) && truth.qt === null;
    out.push(numStep('qtc', 'QTc', a.qtc, a.qtNA, qtNa ? null : truth.qtcB, SCORING.QTC_TOL_MS, 'ms', 'pengukuran'));
  }
  // Kesimpulan
  const ud = a.dx ?? '';
  const exact = ud === meta.dx || meta.secondary.includes(ud);
  const fam = !exact && !!ud && sameFamily(ud, meta.dx);
  const critMiss = !exact && !fam && (dx.critical || dx.occlusion);
  out.push({ step: 'dx', label: 'Kesimpulan', ok: exact, credit: exact ? 1 : fam ? 0.5 : 0, user: ud ? DIAGNOSES[ud]?.label ?? ud : 'kosong', truth: dx.label, feedback: exact ? 'Diagnosis tepat.' : fam ? `Mendekati. Jawaban: ${dx.label}.` : `Jawaban: ${dx.label}.`, competency: dx.competency, weight: 3, critical: critMiss });
  if (critMiss) out[out.length - 1].feedback += ' Diagnosis kritis terlewat.';
  const um = a.mgmt || '';
  const mOk = um === dx.mgmt;
  out.push({ step: 'mgmt', label: 'Tata laksana awal', ok: mOk, credit: mOk ? 1 : 0, user: um ? MGMT_LABEL[um as MgmtKey] : 'kosong', truth: MGMT_LABEL[dx.mgmt], feedback: mOk ? 'Tepat.' : `Tata laksana: ${MGMT_LABEL[dx.mgmt]}.`, competency: 'tatalaksana', weight: 2, critical: !mOk && (dx.mgmt === 'reperfusi' || dx.mgmt === 'defibrilasi') });
  if (out[out.length - 1].critical) out[out.length - 1].feedback += ' Tindakan penyelamat nyawa terlewat — kesalahan kritis.';
  return out;
}

export function itemScore(steps: StepResult[]): number {
  const g = steps.filter((s) => s.ok !== null);
  const w = g.reduce((a, s) => a + s.weight, 0);
  return w ? g.reduce((a, s) => a + s.weight * s.credit, 0) / w : 0;
}

/** Diagnosis Cepat: pilihan diagnosis + keputusan kritis. */
export interface QuickQuestion {
  id: 'dx' | 'omi' | 'reperfusi' | 'kritis';
  text: string;
  options: Array<{ value: string; label: string }>;
  answer: string;
}

export function quickQuestions(meta: CaseMeta, distractors: string[]): QuickQuestion[] {
  const dx = DIAGNOSES[meta.dx];
  const opts = [meta.dx, ...distractors].map((k) => ({ value: k, label: DIAGNOSES[k].label }));
  const qs: QuickQuestion[] = [{ id: 'dx', text: 'Diagnosis utama EKG ini?', options: opts, answer: meta.dx }];
  const yn = [
    { value: 'ya', label: 'Ya' },
    { value: 'tidak', label: 'Tidak' },
  ];
  if (dx.category === 'iskemia' || dx.category === 'peniru' || dx.occlusion !== undefined) {
    qs.push({ id: 'omi', text: 'Apakah ini oklusi koroner akut (OMI/ekuivalen STEMI)?', options: yn, answer: dx.occlusion ? 'ya' : 'tidak' });
    qs.push({ id: 'reperfusi', text: 'Perlu reperfusi/angiografi segera?', options: yn, answer: dx.reperfusion ? 'ya' : 'tidak' });
  } else {
    qs.push({ id: 'kritis', text: 'Apakah kondisi ini mengancam nyawa dan butuh tindakan segera?', options: yn, answer: dx.critical ? 'ya' : 'tidak' });
  }
  return qs;
}

export function gradeQuick(meta: CaseMeta, qs: QuickQuestion[], answers: Record<string, string>, timedOut: boolean): StepResult[] {
  const dx = DIAGNOSES[meta.dx];
  return qs.map((q) => {
    const u = answers[q.id] ?? '';
    const ok = !timedOut && u === q.answer;
    const fam = q.id === 'dx' && !ok && !!u && sameFamily(u, q.answer);
    const label = q.id === 'dx' ? 'Diagnosis' : q.id === 'omi' ? 'Oklusi koroner?' : q.id === 'reperfusi' ? 'Reperfusi segera?' : 'Mengancam nyawa?';
    const critical = !ok && ((q.id === 'omi' && q.answer === 'ya') || (q.id === 'reperfusi' && q.answer === 'ya') || (q.id === 'kritis' && q.answer === 'ya' && ['vf', 'vt-mono', 'torsades', 'asystole', 'chb', 'hyperk-3', 'pre-excited-af'].includes(meta.dx)));
    return {
      step: q.id,
      label,
      ok,
      credit: ok ? 1 : fam ? 0.5 : 0,
      user: timedOut && !u ? 'waktu habis' : (q.options.find((o) => o.value === u)?.label ?? 'kosong'),
      truth: q.options.find((o) => o.value === q.answer)!.label,
      feedback: ok ? 'Tepat.' : q.id === 'dx' ? `Jawaban: ${dx.label}. ${dx.findings[0]}.` : `Jawaban: ${q.options.find((o) => o.value === q.answer)!.label}.`,
      competency: q.id === 'dx' ? dx.competency : 'tatalaksana',
      weight: q.id === 'dx' ? 3 : 1.5,
      critical,
    };
  });
}

/** Pengecoh: diagnosis yang sering tertukar lalu kategori yang sama (deterministik dari seed). */
export function pickDistractors(dxKey: string, pool: string[], n: number, rnd: () => number): string[] {
  const dx = DIAGNOSES[dxKey];
  const out: string[] = [];
  for (const c of dx.confusers ?? []) if (c !== dxKey && DIAGNOSES[c] && !out.includes(c) && out.length < n) out.push(c);
  const same = pool.filter((k) => k !== dxKey && !out.includes(k) && DIAGNOSES[k]?.category === dx.category);
  const other = pool.filter((k) => k !== dxKey && !out.includes(k) && !same.includes(k));
  const shuffle = (a: string[]) => a.map((x) => [rnd(), x] as const).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
  for (const k of [...shuffle(same), ...shuffle(other)]) {
    if (out.length >= n) break;
    out.push(k);
  }
  return out.slice(0, n);
}

export function makeItem(meta: CaseMeta, mode: string, steps: StepResult[], timeS: number): ItemResult {
  return {
    caseId: meta.id,
    dx: meta.dx,
    kind: meta.kind,
    mode,
    score: itemScore(steps),
    correctDx: steps.some((s) => (s.step === 'dx' || s.step === 'rhythm-id') && s.ok),
    steps,
    criticalErrors: steps.filter((s) => s.critical).map((s) => `${DIAGNOSES[meta.dx].label}: ${s.label} — ${s.feedback}`),
    timeS,
  };
}
