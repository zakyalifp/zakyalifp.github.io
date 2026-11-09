/**
 * Potongan data yang sering dipakai bersama oleh skenario (kriteria & langkah).
 * Hanya menyusun DATA — tidak ada logika engine di sini.
 */
import type { IdealStep, ScenarioInput } from '../engine/schema';
import { EQUIPMENT_ITEMS } from '../engine/actions';
import { AIRWAY, epinephrineDose, volumeBolusMl, d10BolusMl, recommendedEttSize, recommendedEttDepth, recommendedBlade, EPINEPHRINE, initialFio2Range, pipRange, VENTILATION } from '../clinical/guidelines';

type Criteria = NonNullable<ScenarioInput['criteria']>;

export const allEquipment = (): Record<string, boolean> => Object.fromEntries(EQUIPMENT_ITEMS.map((i) => [i.id, true]));
export const allRoles = { pemimpin: true, jalanNapas: true, sirkulasi: true, pencatat: true };

/** Langkah persiapan standar (sebelum lahir). */
export function prepSteps(callHelp: boolean): IdealStep[] {
  const steps: IdealStep[] = [
    { t: -1, action: 'prep-risk' },
    { t: -1, action: 'prep-team', params: allRoles },
    { t: -1, action: 'prep-equipment', params: allEquipment() },
  ];
  if (callHelp) steps.push({ t: -1, action: 'call-help' });
  steps.push({ t: 0, action: 'birth' });
  return steps;
}

/** Parameter VTP awal yang sesuai pedoman untuk usia gestasi & berat. */
export function ppvParams(ga: number, weightKg: number, opts: { device?: string; pip?: number; fio2?: number } = {}) {
  const fr = initialFio2Range(ga);
  return {
    device: opts.device ?? 't-piece',
    mask: weightKg < AIRWAY.MASK_SMALL_BELOW_KG ? 'kecil' : 'besar',
    pip: opts.pip ?? pipRange(ga).min,
    peep: VENTILATION.PEEP_CMH2O,
    fio2: opts.fio2 ?? fr.min,
    rate: VENTILATION.RATE_TYPICAL_PER_MIN,
  };
}

export function ettParams(ga: number, weightKg: number) {
  return { ukuran: recommendedEttSize(weightKg, ga), kedalaman: recommendedEttDepth(ga), bilah: recommendedBlade(ga) };
}

export function epiParams(weightKg: number, route: 'iv' | 'ett' = 'iv') {
  const d = epinephrineDose(weightKg, route);
  return route === 'ett'
    ? { rute: 'ett', dosisMg: d.typicalMg, volumeMl: d.typicalMl, bilasMl: 0, closedLoop: true }
    : { rute: 'iv', dosisMg: d.typicalMg, volumeMl: d.typicalMl, bilasMl: EPINEPHRINE.FLUSH_ML, closedLoop: true };
}

export function naclParams(weightKg: number) {
  return { volumeMl: volumeBolusMl(weightKg), durasiMenit: 5, closedLoop: true };
}

export function d10Params(weightKg: number) {
  return { volumeMl: d10BolusMl(weightKg) };
}

// ---------------------------------------------------------------------------
// Kriteria standar
// ---------------------------------------------------------------------------
export function prepCriteria(): Criteria {
  return [
    { id: 'prep-risk', domain: 'persiapan', text: 'Menilai faktor risiko pra-kelahiran', check: { kind: 'done', action: 'prep-risk' } },
    { id: 'prep-team', domain: 'persiapan', text: 'Briefing tim & pembagian peran', check: { kind: 'judgementOk', code: 'prep-team' } },
    { id: 'prep-equipment', domain: 'persiapan', text: 'Checklist alat lengkap', check: { kind: 'judgementOk', code: 'prep-equipment' } },
  ];
}

export function warmthCriteria(veryPreterm: boolean): Criteria {
  const c: Criteria = [
    { id: 'temp-final', domain: 'langkahAwal', text: 'Suhu akhir dalam target', check: { kind: 'metric', metric: 'finalTempInRange' } },
    { id: 'no-hypothermia', domain: 'langkahAwal', text: 'Tidak terjadi hipotermia selama resusitasi', check: { kind: 'noJudgement', code: 'hypothermia' } },
  ];
  if (veryPreterm) {
    c.push(
      { id: 'wrap', domain: 'langkahAwal', text: 'Dibungkus plastik tanpa dikeringkan', weight: 2, check: { kind: 'done', action: 'wrap', by: 30 } },
      { id: 'no-dry', domain: 'langkahAwal', text: 'Tidak dikeringkan (prematur <32 minggu)', check: { kind: 'noJudgement', code: 'dry-very-preterm' } },
      { id: 'hat', domain: 'langkahAwal', text: 'Memakai topi', check: { kind: 'done', action: 'hat' } },
    );
  } else {
    c.push({ id: 'dry', domain: 'langkahAwal', text: 'Bayi dikeringkan', check: { kind: 'done', action: 'dry', by: 30 } });
  }
  return c;
}

export function nonVigorousInitial(): Criteria {
  return [
    { id: 'cord', domain: 'langkahAwal', text: 'Keputusan tali pusat sesuai (bayi tidak bugar)', check: { kind: 'noJudgement', code: 'cord' } },
    { id: 'initial-assess', domain: 'langkahAwal', text: 'Penilaian awal (≤15 detik)', check: { kind: 'done', action: 'initial-assess', by: 15 } },
    { id: 'position', domain: 'langkahAwal', text: 'Posisi menghidu', check: { kind: 'done', action: 'position' } },
  ];
}

export function ppvCriteria(opts: { by?: number; effectiveBy?: number; critical?: boolean } = {}): Criteria {
  return [
    { id: 'ppv-by-60', domain: 'ventilasi', text: 'VTP dimulai ≤60 detik', weight: 3, critical: opts.critical ?? true, check: { kind: 'done', action: 'ppv-start', by: opts.by ?? 60 } },
    { id: 'fio2-start', domain: 'ventilasi', text: 'FiO₂ awal sesuai usia gestasi', weight: 2, check: { kind: 'judgementOk', code: 'fio2-start' } },
    { id: 'pip-start', domain: 'ventilasi', text: 'PIP awal sesuai', check: { kind: 'noJudgement', code: 'pip-start' } },
    { id: 'peep', domain: 'ventilasi', text: 'PEEP sesuai', check: { kind: 'noJudgement', code: 'peep' } },
    { id: 'pulseox', domain: 'ventilasi', text: 'Oksimeter preduktal (tangan kanan)', check: { kind: 'judgementOk', code: 'pulseox-site' } },
    { id: 'effective', domain: 'ventilasi', text: `Ventilasi efektif tercapai ≤${opts.effectiveBy ?? 90} detik`, weight: 2, check: { kind: 'metric', metric: 'timeToEffectiveVentilationBy', value: opts.effectiveBy ?? 90 } },
    { id: 'no-hyperoxia', domain: 'ventilasi', text: 'Tidak ada hiperoksia berkepanjangan', check: { kind: 'metric', metric: 'noHyperoxiaProlonged' } },
  ];
}

export function compressionCriteria(): Criteria {
  return [
    { id: 'cpr-start', domain: 'kompresi', text: 'Kompresi dimulai saat HR <60 setelah ventilasi efektif', weight: 3, critical: true, check: { kind: 'judgementOk', code: 'compressions-indication' } },
    { id: 'cpr-technique', domain: 'kompresi', text: 'Teknik dua ibu jari', check: { kind: 'judgementOk', code: 'compressions-technique' } },
    { id: 'cpr-ratio', domain: 'kompresi', text: 'Rasio 3:1', weight: 2, check: { kind: 'judgementOk', code: 'compressions-ratio' } },
    { id: 'cpr-fio2', domain: 'kompresi', text: 'FiO₂ 100% saat kompresi', weight: 2, check: { kind: 'judgementOk', code: 'fio2-compressions' } },
    { id: 'cpr-airway', domain: 'kompresi', text: 'Jalan napas alternatif sebelum/awal kompresi', weight: 2, check: { kind: 'noJudgement', code: 'alt-airway-compressions' } },
    { id: 'cpr-ecg', domain: 'kompresi', text: 'EKG terpasang saat kompresi', check: { kind: 'noJudgement', code: 'ecg-compressions' } },
    { id: 'cpr-stop', domain: 'kompresi', text: 'Kompresi dihentikan saat HR ≥60', check: { kind: 'judgementOk', code: 'compressions-stop' } },
  ];
}

export function epiCriteria(): Criteria {
  return [
    { id: 'uvc', domain: 'obat', text: 'Akses UVC dipasang', check: { kind: 'done', action: 'uvc' } },
    { id: 'epi-given', domain: 'obat', text: 'Epinefrin diberikan sesuai indikasi', weight: 3, critical: true, check: { kind: 'judgementOk', code: 'epi-indication' } },
    { id: 'epi-dose', domain: 'obat', text: 'Dosis epinefrin per kg benar', weight: 3, critical: true, check: { kind: 'noJudgement', code: 'epi-dose' } },
    { id: 'epi-volume', domain: 'obat', text: 'Volume sesuai konsentrasi 0,1 mg/mL', weight: 2, check: { kind: 'noJudgement', code: 'epi-volume' } },
    { id: 'epi-flush', domain: 'obat', text: 'Dibilas NaCl 0,9%', check: { kind: 'noJudgement', code: 'epi-flush' } },
  ];
}

export function teamCriteria(helpBy?: number): Criteria {
  return [
    { id: 'call-help', domain: 'komunikasi', text: 'Meminta bantuan tepat waktu', weight: 2, check: helpBy !== undefined ? { kind: 'done', action: 'call-help', by: helpBy } : { kind: 'done', action: 'call-help' } },
    { id: 'family', domain: 'komunikasi', text: 'Menginformasikan keluarga', check: { kind: 'done', action: 'inform-family' } },
  ];
}

export function postCriteria(opts: { refer: boolean; glucose?: boolean; hie?: boolean }): Criteria {
  const c: Criteria = [
    { id: 'stabilized', domain: 'pascaresusitasi', text: 'Bayi stabil (HR ≥100, SpO₂ sesuai target)', weight: 3, check: { kind: 'metric', metric: 'stabilized' } },
    { id: 'post-monitor', domain: 'pascaresusitasi', text: 'Monitoring pascaresusitasi', check: { kind: 'done', action: 'post-monitor' } },
    { id: 'referral', domain: 'pascaresusitasi', text: opts.refer ? 'Keputusan rujukan tepat' : 'Keputusan tempat perawatan tepat', weight: 2, check: { kind: 'judgementOk', code: 'referral-decision' } },
  ];
  if (opts.glucose !== false) c.push({ id: 'glucose', domain: 'pascaresusitasi', text: 'Glukosa darah diperiksa', check: { kind: 'done', action: 'glucose-check' } });
  if (opts.refer) c.push({ id: 'transport', domain: 'pascaresusitasi', text: 'Transport aman & hangat', check: { kind: 'judgementOk', code: 'transport' } });
  if (opts.refer) c.push({ id: 'refer-comm', domain: 'komunikasi', text: 'Komunikasi pra-rujukan', check: { kind: 'judgementOk', code: 'referral-communication' } });
  if (opts.hie) c.push({ id: 'hie', domain: 'pascaresusitasi', text: 'Rencana terapi hipotermia / hindari hipertermia', weight: 2, check: { kind: 'judgementOk', code: 'hypothermia-plan' } });
  return c;
}

/** Langkah pascaresusitasi standar mulai detik t. */
export function postSteps(t: number, weightKg: number, opts: { refer: boolean; hie?: boolean; transport?: string; dest?: string; d10?: boolean }): IdealStep[] {
  const steps: IdealStep[] = [
    { t, action: 'temp-probe' },
    { t: t + 1, action: 'post-monitor' },
    { t: t + 2, action: 'glucose-check' },
  ];
  let k = t + 63;
  if (opts.d10) steps.push({ t: k++, action: 'd10', params: d10Params(weightKg) });
  if (opts.hie) steps.push({ t: k++, action: 'hypothermia-plan', params: { rencana: 'rujuk-th' } });
  steps.push({ t: k++, action: 'inform-family' });
  steps.push({
    t: k++,
    action: 'refer',
    params: opts.refer
      ? { tujuan: 'nicu', transport: opts.transport ?? 'inkubator', komunikasi: true }
      : { tujuan: opts.dest ?? 'rawat-gabung', transport: '-', komunikasi: false },
  });
  steps.push({ t: k + 5, action: 'end' });
  return steps;
}
