/**
 * Kepatuhan SETIAP kasus sintetis terhadap kriteria klinis di ecg-criteria.ts.
 * Bila synthesizer diubah dan sebuah pola tidak lagi memenuhi kriterianya, tes gagal.
 */
import { describe, expect, it } from 'vitest';
import { SERIAL_SYNTH, SYNTHETIC_CASES, type SynthCase } from './synthetic';
import { DIAGNOSES } from './diagnoses';
import { synthesize, type SynthResult } from '../ekg/synth/synth';
import { measureLeads, type BeatMeasure } from '../ekg/core/measure';
import type { LeadName } from '../ekg/core/types';
import { STANDARD_LEADS } from '../ekg/core/types';
import { areContiguous, ST_ELEVATION, AVR_PATTERN, BRUGADA, evaluateSgarbossa, INTERVALS, LVH, QT, RATE, RVH, steThresholdMm, ST_DEPRESSION, TCA, ATRIAL, DE_WINTER, WELLENS } from '../clinical/ecg-criteria';

const ALL: LeadName[] = [...STANDARD_LEADS, 'V3R', 'V4R', 'V5R', 'V7', 'V8', 'V9'];

interface Ctx {
  s: SynthCase;
  r: SynthResult;
  m: Partial<Record<LeadName, BeatMeasure>>;
}

function ctx(s: SynthCase): Ctx {
  const r = synthesize({ ...s.spec, noise: undefined });
  const dom = mostCommonKind(r);
  const m = measureLeads(r.signal, r.beats, ALL, (b) => b.kind === dom);
  return { s, r, m };
}
function mostCommonKind(r: SynthResult): string {
  const c = new Map<string, number>();
  for (const b of r.beats) if (b.qrs !== null) c.set(b.kind, (c.get(b.kind) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}
/** Sadapan yang memenuhi ambang elevasi ST (UDMI-4) dan punya tetangga yang juga memenuhi. */
function contiguousSte(c: Ctx, leads: LeadName[]): LeadName[] {
  const ok = leads.filter((l) => (c.m[l]?.stJ ?? -9) >= steThresholdMm(l, c.s.sex, c.s.age));
  const okAvr = (c.m.aVR?.stJ ?? 0) <= -1; // −aVR dalam urutan Cabrera
  return ok.filter((l) => ok.some((o) => o !== l && areContiguous(l, o)) || (okAvr && (l === 'I' || l === 'II')));
}
function pAmpMm(c: Ctx, lead: LeadName): number {
  const a = c.r.signal.leads[lead]!;
  let mx = 0;
  for (const b of c.r.beats) {
    if (b.p === null || b.p < 0.3) continue;
    const i0 = Math.round(b.p * 500);
    const base = a[i0 - 5];
    for (let i = i0; i < i0 + 70; i++) mx = Math.max(mx, (a[i] - base) * 10);
    break;
  }
  return mx;
}

type Check = (c: Ctx) => void;
const CHECKS: Record<string, Check> = {
  'stemi-anterior': (c) => expect(contiguousSte(c, ['V1', 'V2', 'V3', 'V4']).length).toBeGreaterThanOrEqual(2),
  'stemi-inferior': (c) => expect(contiguousSte(c, ['II', 'III', 'aVF']).length).toBeGreaterThanOrEqual(2),
  'stemi-rv': (c) => {
    expect(contiguousSte(c, ['II', 'III', 'aVF']).length).toBeGreaterThanOrEqual(2);
    expect(c.m.V4R!.stJ).toBeGreaterThanOrEqual(steThresholdMm('V4R', c.s.sex, c.s.age));
    expect(c.m.III!.stJ).toBeGreaterThan(c.m.II!.stJ);
  },
  'stemi-posterior': (c) => {
    expect(contiguousSte(c, ['V7', 'V8', 'V9']).length).toBeGreaterThanOrEqual(2);
    const dep = (['V1', 'V2', 'V3'] as LeadName[]).filter((l) => c.m[l]!.stJ <= -ST_DEPRESSION.ISCHEMIC_MM);
    expect(dep.length).toBeGreaterThanOrEqual(2);
  },
  'hyperacute-t': (c) => {
    const big = STANDARD_LEADS.filter((l) => c.m[l]!.t >= 0.75 * Math.max(c.m[l]!.r, c.m[l]!.s) && c.m[l]!.t > 4);
    expect(big.length).toBeGreaterThanOrEqual(2);
    expect(contiguousSte(c, [...STANDARD_LEADS]).length).toBe(0);
  },
  'de-winter': (c) => {
    const dep = (DE_WINTER.LEADS as readonly LeadName[]).filter((l) => c.m[l]!.stJ <= -DE_WINTER.STD_MIN_MM + 0.05 && c.m[l]!.stJ >= -DE_WINTER.STD_MAX_MM - 0.3);
    expect(dep.length).toBeGreaterThanOrEqual(4);
    expect(contiguousSte(c, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']).length).toBe(0);
    expect(Math.max(c.m.V2!.t, c.m.V3!.t)).toBeGreaterThan(8);
    expect(c.m.aVR!.stJ).toBeGreaterThan(0.4);
  },
  'wellens-a': (c) => {
    const a = c.r.signal.leads.V2!;
    const b = c.r.beats.find((x) => x.qrs !== null && x.qrs > 0.5)!;
    const base = a[Math.round((b.qrs! - 0.02) * 500)];
    let mn = 0;
    let mx = 0;
    for (let i = Math.round((b.j! + 0.05) * 500); i < Math.round(b.tEnd! * 500); i++) {
      mn = Math.min(mn, (a[i] - base) * 10);
      mx = Math.max(mx, (a[i] - base) * 10);
    }
    expect(mn).toBeLessThan(-1);
    expect(mx).toBeGreaterThan(0.5);
    for (const l of WELLENS.LEADS) expect(c.m[l]!.stJ).toBeLessThan(WELLENS.MAX_STE_MM);
  },
  'wellens-b': (c) => {
    // WAGNER09: inversi T >0,5 mV di V2–V4, sering dengan QT memanjang; ST <1 mm (DEZWAAN82)
    for (const l of WELLENS.TYPE_B_LEADS) {
      expect(c.m[l]!.t).toBeLessThan(-WELLENS.TYPE_B_DEEP_TWI_MM);
      expect(c.m[l]!.stJ).toBeLessThan(WELLENS.MAX_STE_MM);
    }
    expect(c.r.truth.qtcBazettMs!).toBeGreaterThanOrEqual(c.s.sex === 'P' ? QT.PROLONGED_FEMALE_MS : QT.PROLONGED_MALE_MS);
  },
  'avr-std': (c) => {
    const dep = STANDARD_LEADS.filter((l) => l !== 'aVR' && c.m[l]!.stJ <= -AVR_PATTERN.STD_MM + 0.05);
    expect(dep.length).toBeGreaterThanOrEqual(AVR_PATTERN.MIN_LEADS_WITH_STD);
    expect(c.m.aVR!.stJ).toBeGreaterThanOrEqual(AVR_PATTERN.STE_AVR_MM - 0.05);
  },
  'sgarbossa-lbbb': (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(INTERVALS.QRS_BBB_MIN_MS);
    const res = evaluateSgarbossa({
      leads: STANDARD_LEADS.map((l) => {
        const x = c.m[l]!;
        return { lead: l, qrsPolarity: x.qrsArea >= 0 ? 1 : -1, stMm: x.stJ, sDepthMm: x.s, rHeightMm: x.r };
      }),
    });
    expect(res.smithPositive).toBe(true);
  },
  'sgarbossa-paced': (c) => {
    const res = evaluateSgarbossa({
      leads: STANDARD_LEADS.map((l) => {
        const x = c.m[l]!;
        return { lead: l, qrsPolarity: x.qrsArea >= 0 ? 1 : -1, stMm: x.stJ, sDepthMm: x.s, rHeightMm: x.r };
      }),
    });
    expect(res.smithPositive).toBe(true);
  },
  lbbb: (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(INTERVALS.QRS_BBB_MIN_MS);
    const res = evaluateSgarbossa({
      leads: STANDARD_LEADS.map((l) => ({ lead: l, qrsPolarity: c.m[l]!.qrsArea >= 0 ? 1 : -1, stMm: c.m[l]!.stJ, sDepthMm: c.m[l]!.s, rHeightMm: c.m[l]!.r })),
    });
    expect(res.smithPositive).toBe(false);
  },
  brugada: (c) => {
    const hit = (BRUGADA.LEADS as readonly LeadName[]).filter((l) => c.m[l]!.stJ >= BRUGADA.TYPE1_STE_MM && c.m[l]!.t < 0);
    expect(hit.length).toBeGreaterThanOrEqual(1);
  },
  pericarditis: (c) => {
    const el = STANDARD_LEADS.filter((l) => c.m[l]!.stJ >= 0.9);
    expect(el.length).toBeGreaterThanOrEqual(6);
    expect(c.m.aVR!.stJ).toBeLessThan(-0.5);
  },
  'early-repol': (c) => expect((['II', 'aVF', 'V4', 'V5'] as LeadName[]).filter((l) => c.m[l]!.stJ >= 1).length).toBeGreaterThanOrEqual(2),
  'hyperk-1': (c) => {
    expect(Math.max(c.m.V2!.t, c.m.V3!.t, c.m.V4!.t)).toBeGreaterThan(9);
    expect(c.r.truth.qrsMs!).toBeLessThanOrEqual(INTERVALS.QRS_NORMAL_MAX_MS);
  },
  'hyperk-2': (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThan(INTERVALS.QRS_NORMAL_MAX_MS);
    expect(c.r.truth.prMs!).toBeGreaterThan(INTERVALS.PR_MAX_MS);
  },
  'hyperk-3': (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(180);
    expect(c.r.beats.filter((b) => b.p !== null && b.qrs !== null).length).toBe(0);
  },
  hypok: (c) => expect(Math.max(c.m.V2!.t, c.m.V3!.t)).toBeLessThan(3),
  hypocalcemia: (c) => expect(c.r.truth.qtcBazettMs!).toBeGreaterThanOrEqual(QT.PROLONGED_FEMALE_MS),
  hypercalcemia: (c) => expect(c.r.truth.qtcBazettMs!).toBeLessThanOrEqual(QT.SHORT_MS),
  'long-qt': (c) => expect(c.r.truth.qtcBazettMs!).toBeGreaterThan(QT.HIGH_RISK_MS),
  takotsubo: (c) => expect(c.r.truth.qtcBazettMs!).toBeGreaterThanOrEqual(QT.PROLONGED_FEMALE_MS),
  tca: (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(TCA.QRS_SEIZURE_MS);
    expect(c.m.aVR!.r).toBeGreaterThanOrEqual(TCA.R_AVR_MM);
    expect(c.r.truth.hr).toBeGreaterThan(RATE.TACHY_ABOVE);
  },
  hypothermia: (c) => {
    expect(Math.max(c.m.II!.stJ, c.m.V5!.stJ)).toBeGreaterThan(1.5);
    expect(c.r.truth.hr).toBeLessThan(RATE.BRADY_BELOW);
  },
  digoxin: (c) => {
    expect((['V4', 'V5', 'V6'] as LeadName[]).filter((l) => c.m[l]!.stJ60 <= -0.5).length).toBeGreaterThanOrEqual(2);
    expect(c.r.truth.qtcBazettMs!).toBeLessThan(QT.PROLONGED_MALE_MS);
  },
  rvh: (c) => {
    expect(c.m.V1!.r).toBeGreaterThan(RVH.R_V1_MM);
    expect(c.m.V1!.r / Math.max(0.1, c.m.V1!.s)).toBeGreaterThan(RVH.RS_RATIO_V1);
  },
  rae: (c) => expect(pAmpMm(c, 'II')).toBeGreaterThan(ATRIAL.RAE_P_II_MM),
  hcm: (c) => expect(c.m.V6!.s).toBeGreaterThan(2),
  lafb: (c) => expect(c.r.truth.axisDeg!).toBeLessThanOrEqual(-45),
  'vt-mono': (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(INTERVALS.QRS_BBB_MIN_MS);
    expect(c.r.truth.hr).toBeGreaterThan(RATE.TACHY_ABOVE);
    expect(c.r.truth.regular).toBe(true);
  },
  'svt-aberrant': (c) => {
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(INTERVALS.QRS_BBB_MIN_MS);
    expect(c.r.truth.hr).toBeGreaterThanOrEqual(RATE.SVT_TYPICAL.min);
  },
  svt: (c) => {
    expect(c.r.truth.hr).toBeGreaterThanOrEqual(RATE.SVT_TYPICAL.min);
    expect(c.r.truth.hr).toBeLessThanOrEqual(RATE.SVT_TYPICAL.max);
    expect(c.r.truth.qrsMs!).toBeLessThan(INTERVALS.QRS_BBB_MIN_MS);
  },
  flutter: (c) => {
    expect(c.r.truth.atrialRate!).toBeGreaterThanOrEqual(RATE.FLUTTER_ATRIAL.min);
    expect(c.r.truth.atrialRate!).toBeLessThanOrEqual(RATE.FLUTTER_ATRIAL.max);
  },
  af: (c) => expect(c.r.truth.regular).toBe(false),
  'pre-excited-af': (c) => {
    expect(c.r.truth.regular).toBe(false);
    expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(INTERVALS.QRS_BBB_MIN_MS);
  },
  mat: (c) => {
    expect(c.r.truth.hr).toBeGreaterThan(RATE.TACHY_ABOVE);
    expect(c.r.truth.regular).toBe(false);
  },
  junctional: (c) => {
    expect(c.r.truth.qrsMs!).toBeLessThanOrEqual(INTERVALS.QRS_NORMAL_MAX_MS);
    expect(c.r.truth.hr).toBeGreaterThanOrEqual(RATE.JUNCTIONAL_ESCAPE.min);
  },
  aivr: (c) => {
    expect(c.r.truth.hr).toBeGreaterThanOrEqual(RATE.AIVR.min);
    expect(c.r.truth.hr).toBeLessThanOrEqual(RATE.AIVR.max);
  },
  chb: (c) => expect(c.r.truth.atrialRate!).toBeGreaterThan(c.r.truth.hr),
  'av-2to1': (c) => expect(Math.abs(c.r.truth.atrialRate! / c.r.truth.hr - 2)).toBeLessThan(0.15),
  mobitz2: (c) => {
    const prs = c.r.vent.filter((v) => v.pRef !== undefined).map((v) => Math.round((v.t - v.pRef!) * 1000));
    expect(new Set(prs).size).toBe(1);
    expect(c.r.truth.atrialRate!).toBeGreaterThan(c.r.truth.hr);
  },
  mobitz1: (c) => {
    const prs = c.r.vent.filter((v) => v.pRef !== undefined).map((v) => v.t - v.pRef!);
    expect(Math.max(...prs) - Math.min(...prs)).toBeGreaterThan(0.1);
  },
  bigeminy: (c) => expect(c.r.vent.filter((v) => v.label === 'PVC' && v.t > 0 && v.t < 10).length).toBeGreaterThanOrEqual(5),
  'electrical-alternans': (c) => {
    const a = c.r.signal.leads.V3!;
    const rs = c.r.beats.filter((b) => b.qrs !== null && b.qrs > 0.2 && b.j! < 9.9).map((b) => {
      let mx = 0;
      for (let i = Math.round(b.qrs! * 500); i < Math.round(b.j! * 500); i++) mx = Math.max(mx, a[i]);
      return mx;
    });
    for (let i = 1; i < rs.length; i++) expect(Math.abs(rs[i] - rs[i - 1]) / Math.max(rs[i], rs[i - 1])).toBeGreaterThan(0.2);
  },
  'misplacement-lara': (c) => expect(c.m.I!.qrsArea).toBeLessThan(0),
  'misplacement-rlra': (c) => expect(Math.max(c.m.II!.r, c.m.II!.s)).toBeLessThan(1),
  dextrocardia: (c) => {
    expect(c.m.I!.qrsArea).toBeLessThan(0);
    expect(c.m.V6!.r).toBeLessThan(c.m.V2!.r);
  },
  'old-mi-anterior': (c) => expect(Math.max(c.m.V1!.r, c.m.V2!.r)).toBeLessThan(2),
  aneurysm: (c) => expect(c.m.V2!.stJ).toBeGreaterThanOrEqual(1),
};

const DEFAULT_CHECK: Check = (c) => {
  // Semua kasus: sinyal valid, amplitudo fisiologis.
  for (const l of STANDARD_LEADS) {
    const a = c.r.signal.leads[l]!;
    for (let i = 0; i < a.length; i += 11) expect(Math.abs(a[i])).toBeLessThan(6);
  }
};

describe('Kasus sintetis memenuhi kriteria klinis', () => {
  for (const s of [...SYNTHETIC_CASES, ...SERIAL_SYNTH]) {
    it(`${s.id} (${s.dx})`, () => {
      expect(DIAGNOSES[s.dx]).toBeTruthy();
      const c = ctx(s);
      DEFAULT_CHECK(c);
      CHECKS[s.dx]?.(c);
      if (DIAGNOSES[s.dx].category === 'konduksi' && ['lbbb', 'rbbb', 'bifascicular'].includes(s.dx)) expect(c.r.truth.qrsMs!).toBeGreaterThanOrEqual(INTERVALS.QRS_BBB_MIN_MS);
    });
  }
  it('IMA ventrikel kanan sintetis juga memenuhi ambang PERKI 2024 (V3R/V4R ≥1 mm)', () => {
    for (const sc of SYNTHETIC_CASES.filter((x) => x.dx === 'stemi-rv')) {
      const r = synthesize({ ...sc.spec, noise: undefined, extraLeads: true });
      const m = measureLeads(r.signal, r.beats, ['V3R', 'V4R'] as LeadName[], () => true);
      expect(Math.max(m.V3R!.stJ, m.V4R!.stJ)).toBeGreaterThanOrEqual(ST_ELEVATION.RIGHT_V4R_PERKI_MM);
    }
  });
  it('LVH sintetis dari synthesizer memenuhi Sokolow–Lyon', () => {
    const c = ctx({ id: 'lvh-probe', dx: 'lvh', age: 60, sex: 'L', spec: { rhythm: { kind: 'sinus', rate: 70 }, morph: { lvh: 1 }, seed: 'lvh' }, annotations: [] });
    expect(c.m.V1!.s + Math.max(c.m.V5!.r, c.m.V6!.r)).toBeGreaterThan(LVH.SOKOLOW_MM);
  });
  it('id unik', () => {
    const ids = [...SYNTHETIC_CASES, ...SERIAL_SYNTH].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
