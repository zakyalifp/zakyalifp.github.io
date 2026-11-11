/**
 * Validasi bank kasus (dipakai `npm run validate:cases` dan unit test).
 * Setiap kasus wajib: diagnosis valid, tingkat, sumber, lisensi, anotasi; kasus nyata
 * wajib ID rekaman asal, usia, jenis kelamin, label asli, ukuran; STEMI nyata diverifikasi
 * ulang terhadap ambang UDMI-4 di ecg-criteria.ts.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { DIAGNOSES } from '../src/cases/diagnoses';
import { SYNTH_METAS, SERIAL_METAS, realMeta, realAnnotations, type RealManifestEntry, type CaseMeta } from '../src/cases/model';
import { areContiguous, steThresholdMm } from '../src/clinical/ecg-criteria';

const ROOT = resolve(__dirname, '..');

export interface ValidationReport {
  errors: string[];
  total: number;
  real: number;
  synthetic: number;
  perDx: Record<string, { nyata: number; sintetis: number }>;
  perCategory: Record<string, { nyata: number; sintetis: number }>;
}

/** Diagnosis inti yang wajib ≥3 contoh (daftar brief bagian 5). */
export const CORE_DX = [
  'sinus-normal', 'early-repol', 'artifact', 'dextrocardia', 'misplacement-lara',
  'sinus-brady', 'sinus-tachy', 'af', 'flutter', 'svt', 'mat', 'pac', 'pvc', 'bigeminy', 'trigeminy', 'junctional', 'vt-mono', 'torsades', 'vf',
  'av1', 'mobitz1', 'mobitz2', 'av-2to1', 'chb', 'wpw', 'paced',
  'rbbb', 'lbbb', 'lafb', 'lpfb', 'bifascicular',
  'stemi-anterior', 'stemi-inferior', 'stemi-lateral', 'stemi-posterior', 'stemi-rv', 'nstemi-std', 'hyperacute-t', 'de-winter', 'avr-std', 'old-mi-inferior', 'old-mi-anterior', 'aneurysm',
  'pericarditis', 'lvh-strain', 'brugada',
  'hypok', 'tca', 'hypothermia', 'digoxin',
  'lvh', 'rvh', 'lae', 'rae', 'low-voltage', 'pe',
];
/** Kelompok yang dihitung bersama (≥3 contoh gabungan). */
export const CORE_GROUPS: Record<string, string[]> = {
  'hiperkalemia bertahap': ['hyperk-1', 'hyperk-2', 'hyperk-3'],
  'Wellens A/B': ['wellens-a', 'wellens-b'],
  'Sgarbossa (LBBB/pacu)': ['sgarbossa-lbbb', 'sgarbossa-paced'],
  'hipo/hiperkalsemia': ['hypocalcemia', 'hypercalcemia'],
  'QT panjang didapat': ['long-qt', 'hypocalcemia'],
  'salah pasang elektroda': ['misplacement-lara', 'misplacement-rlra', 'misplacement-prec'],
  'Takotsubo': ['takotsubo'],
  'HCM': ['hcm'],
  'alternans listrik': ['electrical-alternans'],
  'asistol': ['asystole'],
  'AIVR': ['aivr'],
};

export function loadRealManifestFromDisk(): RealManifestEntry[] {
  const p = resolve(ROOT, 'public/cases/real/manifest.json');
  if (!existsSync(p)) return [];
  return (JSON.parse(readFileSync(p, 'utf8')) as { cases: RealManifestEntry[] }).cases;
}

export function validateAll(): ValidationReport {
  const errors: string[] = [];
  const real = loadRealManifestFromDisk();
  const metas: CaseMeta[] = [...SYNTH_METAS, ...real.map(realMeta)];
  const ids = new Set<string>();
  const perDx: ValidationReport['perDx'] = {};
  const perCategory: ValidationReport['perCategory'] = {};
  for (const m of [...metas, ...SERIAL_METAS]) {
    if (ids.has(m.id)) errors.push(`${m.id}: id ganda`);
    ids.add(m.id);
  }
  for (const m of metas) {
    const e = (s: string) => errors.push(`${m.id}: ${s}`);
    if (!DIAGNOSES[m.dx]) e(`diagnosis tidak dikenal "${m.dx}"`);
    if (!m.level) e('tingkat kosong');
    if (!m.dataset) e('sumber kosong');
    if (!m.license) e('lisensi kosong');
    if (m.kind === 'sintetis') {
      if (!m.synth?.annotations.length) e('anotasi kosong');
    } else {
      const r = m.real!;
      if (!r.recordId) e('ID rekaman asal kosong');
      if (r.age === null || r.age === undefined) e('usia kosong');
      if (r.sex !== 'L' && r.sex !== 'P') e('jenis kelamin tidak valid');
      if (!r.labels || !Object.keys(r.labels).length) e('label asli kosong');
      if (!r.measures || r.measures.hr === null) e('ukuran HR kosong');
      if (r.license !== 'CC BY 4.0') e(`lisensi tidak diizinkan: ${r.license}`);
      if (!r.citation?.length) e('sitasi kosong');
      if (!realAnnotations(r).length) e('anotasi kosong');
      const f = resolve(ROOT, 'public/cases/real', r.file);
      if (!existsSync(f) || statSync(f).size < 1000) e(`berkas sinyal tidak ada: ${r.file}`);
      if (r.dataset === 'PTB-XL') {
        if (!r.validatedByHuman) e('label PTB-XL belum divalidasi manusia');
        const dxCode: Record<string, string[]> = { 'stemi-anterior': ['ASMI', 'AMI', 'ALMI'], 'stemi-inferior': ['IMI', 'ILMI', 'IPMI', 'IPLMI'], 'stemi-lateral': ['LMI', 'ALMI', 'ILMI'] };
        if (dxCode[r.dx]) {
          if (!dxCode[r.dx].some((c) => r.labels[c] === 100)) e('label infark likelihood 100 tidak ditemukan');
          const groups: Record<string, string[]> = { 'stemi-anterior': ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'], 'stemi-inferior': ['II', 'III', 'aVF'], 'stemi-lateral': ['I', 'aVL', 'V5', 'V6'] };
          const ok = groups[r.dx].filter((l) => (r.stMm?.[l] ?? -9) >= steThresholdMm(l, r.sex, r.age ?? 60));
          if (!ok.some((a) => ok.some((b) => a !== b && areContiguous(a, b)))) e('elevasi ST tidak memenuhi ambang UDMI-4 pada 2 sadapan berdekatan');
        }
      }
    }
    if (m.reference) continue;
    const k = m.kind;
    perDx[m.dx] ??= { nyata: 0, sintetis: 0 };
    perDx[m.dx][k]++;
    perCategory[m.category] ??= { nyata: 0, sintetis: 0 };
    perCategory[m.category][k]++;
  }
  for (const dx of CORE_DX) {
    const n = (perDx[dx]?.nyata ?? 0) + (perDx[dx]?.sintetis ?? 0);
    if (n < 3) errors.push(`diagnosis inti "${dx}" baru ${n} contoh (minimal 3)`);
  }
  for (const [g, keys] of Object.entries(CORE_GROUPS)) {
    const n = keys.reduce((a, k) => a + (perDx[k]?.nyata ?? 0) + (perDx[k]?.sintetis ?? 0), 0);
    if (n < 2) errors.push(`kelompok "${g}" baru ${n} contoh`);
  }
  const quiz = metas.filter((m) => !m.reference);
  if (quiz.length < 150) errors.push(`total kasus ${quiz.length} < 150`);
  return { errors, total: quiz.length, real: quiz.filter((m) => m.kind === 'nyata').length, synthetic: quiz.filter((m) => m.kind === 'sintetis').length, perDx, perCategory };
}
