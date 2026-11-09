import { describe, expect, it } from 'vitest';
import * as G from './guidelines';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('guidelines.ts — nilai pedoman (AHA/AAP 2025, NRP)', () => {
  it('ambang HR', () => {
    expect(G.HEART_RATE.PPV_BELOW_BPM).toBe(100);
    expect(G.HEART_RATE.COMPRESSIONS_BELOW_BPM).toBe(60);
    expect(G.HEART_RATE.EPINEPHRINE_BELOW_BPM).toBe(60);
  });
  it('tali pusat', () => {
    expect(G.CORD.DELAYED_CLAMP_MIN_S).toBe(60);
    expect(G.CORD.MILKING_MIN_GA_WEEKS).toBe(28);
  });
  it('ventilasi', () => {
    expect(G.VENTILATION.PIP_INITIAL_CMH2O).toEqual({ min: 20, max: 30 });
    expect(G.VENTILATION.PEEP_CMH2O).toBe(5);
    expect(G.VENTILATION.RATE_PER_MIN).toEqual({ min: 30, max: 60 });
    expect(G.VENTILATION.RATE_TYPICAL_PER_MIN).toBeGreaterThanOrEqual(G.VENTILATION.RATE_PER_MIN.min);
    expect(G.VENTILATION.RATE_TYPICAL_PER_MIN).toBeLessThanOrEqual(G.VENTILATION.RATE_PER_MIN.max);
  });
  it('FiO2 awal menurut usia gestasi', () => {
    expect(G.initialFio2Range(40)).toEqual({ min: 21, max: 21 });
    expect(G.initialFio2Range(35)).toEqual({ min: 21, max: 21 });
    expect(G.initialFio2Range(33)).toEqual({ min: 21, max: 30 });
    expect(G.initialFio2Range(32)).toEqual({ min: 21, max: 30 });
    expect(G.initialFio2Range(31)).toEqual({ min: 30, max: 100 });
    expect(G.initialFio2Range(24)).toEqual({ min: 30, max: 100 });
    expect(G.OXYGEN.FIO2_DURING_COMPRESSIONS).toBe(100);
  });
  it('target SpO2 preduktal per menit', () => {
    expect(G.spo2TargetAt(30)).toBeNull();
    expect(G.spo2TargetAt(60)).toEqual({ min: 60, max: 65 });
    expect(G.spo2TargetAt(150)).toEqual({ min: 65, max: 70 });
    expect(G.spo2TargetAt(300)).toEqual({ min: 80, max: 85 });
    expect(G.spo2TargetAt(600)).toEqual({ min: 85, max: 95 });
    expect(G.spo2TargetAt(1200)).toEqual({ min: 85, max: 95 });
    const mid = G.spo2TargetAt(450)!;
    expect(mid.min).toBeGreaterThan(80);
    expect(mid.min).toBeLessThan(85);
    // monoton naik
    let prev = 0;
    for (let t = 60; t <= 600; t += 10) {
      const r = G.spo2TargetAt(t)!;
      expect(r.min).toBeGreaterThanOrEqual(prev);
      expect(r.max).toBeGreaterThan(r.min);
      prev = r.min;
    }
  });
  it('kompresi 3:1, 120 kejadian/menit', () => {
    expect(G.COMPRESSIONS.RATIO_COMPRESSIONS).toBe(3);
    expect(G.COMPRESSIONS.RATIO_BREATHS).toBe(1);
    expect(G.COMPRESSIONS.COMPRESSIONS_PER_MIN + G.COMPRESSIONS.BREATHS_PER_MIN).toBe(G.COMPRESSIONS.EVENTS_PER_MIN);
    expect(G.COMPRESSIONS.COMPRESSIONS_PER_MIN / G.COMPRESSIONS.BREATHS_PER_MIN).toBe(3);
  });
  it('epinefrin: dosis dan volume', () => {
    expect(G.EPINEPHRINE.IV_DOSE_MG_PER_KG).toEqual({ min: 0.01, max: 0.03 });
    expect(G.EPINEPHRINE.ETT_DOSE_MG_PER_KG).toEqual({ min: 0.05, max: 0.1 });
    expect(G.EPINEPHRINE.CONCENTRATION_MG_PER_ML).toBe(0.1);
    const iv = G.epinephrineDose(3, 'iv');
    expect(iv.mg).toEqual({ min: 0.03, max: 0.09 });
    expect(iv.ml).toEqual({ min: 0.3, max: 0.9 });
    expect(iv.typicalMg).toBe(0.06);
    expect(iv.typicalMl).toBe(0.6);
    const ett = G.epinephrineDose(3, 'ett');
    expect(ett.mg).toEqual({ min: 0.15, max: 0.3 });
    expect(ett.ml).toEqual({ min: 1.5, max: 3 });
  });
  it('cairan & glukosa', () => {
    expect(G.volumeBolusMl(3.2)).toBe(32);
    expect(G.d10BolusMl(3)).toBe(6);
  });
  it('ETT & LMA', () => {
    expect(G.recommendedEttSize(0.8)).toBe(2.5);
    expect(G.recommendedEttSize(1.5)).toBe(3.0);
    expect(G.recommendedEttSize(2)).toBe(3.0);
    expect(G.recommendedEttSize(3.2)).toBe(3.5);
    expect(G.acceptableEttSizes(0.85, 26)).toEqual([2.5]);
    expect(G.recommendedEttDepth(26)).toBe(6.0);
    expect(G.recommendedEttDepth(39)).toBe(8.5);
    expect(G.recommendedEttDepth(41)).toBe(9.0);
    expect(G.lmaAppropriate(34, 2.1)).toBe(true);
    expect(G.lmaAppropriate(33, 2.1)).toBe(false);
    expect(G.recommendedBlade(26)).toBe('00');
    expect(G.recommendedBlade(39)).toBe('1');
  });
  it('suhu & penghentian', () => {
    expect(G.TEMPERATURE.TARGET_C).toEqual({ min: 36.5, max: 37.5 });
    expect(G.TIMING.DISCONTINUE_CONSIDER_S).toBe(1200);
  });
  it('setiap entri registri punya sumber & status', () => {
    for (const r of G.GUIDELINE_REGISTRY) {
      expect(r.source.length).toBeGreaterThanOrEqual(3);
      expect(['terverifikasi', 'VERIFY', 'asumsi-sim']).toContain(r.status);
    }
    const keys = G.GUIDELINE_REGISTRY.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('docs/CLINICAL_REVIEW.md memuat setiap parameter registri', () => {
    const md = readFileSync(resolve(__dirname, '../../docs/CLINICAL_REVIEW.md'), 'utf8');
    for (const r of G.GUIDELINE_REGISTRY) expect(md, r.key).toContain(r.key);
  });
});

describe('aturan: tidak ada angka klinis di komponen', () => {
  it('komponen tidak mengandung literal dosis/ambang klinis', async () => {
    const { readdirSync, statSync, existsSync } = await import('node:fs');
    const root = resolve(__dirname, '..');
    const files: string[] = [];
    const walk = (d: string) => {
      if (!existsSync(d)) return;
      for (const f of readdirSync(d)) {
        const p = resolve(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx)$/.test(f)) files.push(p);
      }
    };
    walk(resolve(root, 'components'));
    walk(resolve(root, 'pages'));
    const forbidden = [/0[.,]01\s*mg/, /0[.,]03\s*mg/, /0[.,]1\s*mg\/kg/, /10\s*mL\/kg/, /\b36[.,]5\b/, /\b37[.,]5\b/, /HR\s*<\s*(60|100)\b/, /\b3\s*:\s*1\b/];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const re of forbidden) expect(re.test(src), `${f} mengandung ${re}`).toBe(false);
    }
  });
});
