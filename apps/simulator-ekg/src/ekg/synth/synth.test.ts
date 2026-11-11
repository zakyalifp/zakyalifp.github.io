import { describe, expect, it } from 'vitest';
import { synthesize } from './synth';
import { createEcgStream } from './stream';
import { STANDARD_LEADS } from '../core/types';

describe('Determinisme synthesizer', () => {
  const spec = { rhythm: { kind: 'af' as const, rate: 110 }, morph: { conduction: 'rbbb' as const }, seed: 'uji-1', noise: { emg: 0.01, wander: 0.03 } };
  it('seed sama → sinyal identik', () => {
    const a = synthesize(spec);
    const b = synthesize(spec);
    for (const l of STANDARD_LEADS) expect(Array.from(a.signal.leads[l]!)).toEqual(Array.from(b.signal.leads[l]!));
    expect(a.truth).toEqual(b.truth);
  });
  it('seed berbeda → sinyal berbeda', () => {
    const a = synthesize(spec);
    const b = synthesize({ ...spec, seed: 'uji-2' });
    expect(Array.from(a.signal.leads.II!)).not.toEqual(Array.from(b.signal.leads.II!));
  });
  it('hukum Einthoven terpenuhi pada output', () => {
    const r = synthesize({ rhythm: { kind: 'sinus', rate: 75 }, seed: 3 });
    const { I, II, III, aVR, aVL, aVF } = r.signal.leads;
    for (let i = 0; i < r.signal.length; i += 37) {
      expect(I![i] + III![i]).toBeCloseTo(II![i], 5);
      expect(aVR![i] + aVL![i] + aVF![i]).toBeCloseTo(0, 5);
    }
  });
  it('500 Hz, 10 detik, 12 sadapan, tanpa NaN', () => {
    const r = synthesize({ rhythm: { kind: 'sinus', rate: 70 }, seed: 1 });
    expect(r.signal.fs).toBe(500);
    expect(r.signal.length).toBe(5000);
    for (const l of STANDARD_LEADS) expect(r.signal.leads[l]!.every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe('Rhythm engine', () => {
  it('laju sesuai spesifikasi', () => {
    for (const rate of [45, 72, 130]) {
      const r = synthesize({ rhythm: { kind: 'sinus', rate }, seed: rate });
      expect(Math.abs(r.truth.hr - rate)).toBeLessThanOrEqual(Math.max(2, rate * 0.03));
    }
  });
  it('AF tidak teratur; flutter 2:1 ≈150/menit teratur', () => {
    expect(synthesize({ rhythm: { kind: 'af', rate: 100 }, seed: 5 }).truth.regular).toBe(false);
    const fl = synthesize({ rhythm: { kind: 'flutter', conduction: 2 }, seed: 5 });
    expect(fl.truth.regular).toBe(true);
    expect(Math.abs(fl.truth.hr - 150)).toBeLessThanOrEqual(3);
    expect(fl.truth.atrialRate).toBe(300);
  });
  it('AV blok total: laju atrium > ventrikel; Mobitz II PR konstan', () => {
    const chb = synthesize({ rhythm: { kind: 'avb', degree: 3, atrialRate: 80, escapeRate: 38 }, seed: 1 });
    expect(chb.truth.atrialRate!).toBeGreaterThan(chb.truth.hr + 20);
    const m2 = synthesize({ rhythm: { kind: 'avb', degree: 'mobitz2', atrialRate: 80, prMs: 170, ratio: 4 }, seed: 1 });
    const prs = m2.vent.filter((v) => v.pRef !== undefined).map((v) => Math.round((v.t - v.pRef!) * 1000));
    expect(new Set(prs).size).toBe(1);
    const m1 = synthesize({ rhythm: { kind: 'avb', degree: 'mobitz1', atrialRate: 80, prMs: 170, ratio: 4 }, seed: 1 });
    const pr1 = m1.vent.filter((v) => v.pRef !== undefined && v.t > 0).map((v) => v.t - v.pRef!);
    expect(Math.max(...pr1) - Math.min(...pr1)).toBeGreaterThan(0.1);
  });
});

describe('Stream real-time', () => {
  it('hasil tidak bergantung pada ukuran potongan', () => {
    const mk = () => createEcgStream({ rhythm: { kind: 'sinus', rate: 80 }, seed: 'm', fs: 250, leads: ['II'] });
    const a = mk();
    const b = mk();
    const big = a.read(1000).II!;
    const parts: number[] = [];
    for (let i = 0; i < 10; i++) parts.push(...b.read(100).II!);
    for (let i = 0; i < 1000; i += 13) expect(parts[i]).toBeCloseTo(big[i], 5);
  });
  it('transisi irama mulus (tanpa lompatan besar)', () => {
    const s = createEcgStream({ rhythm: { kind: 'sinus', rate: 80 }, seed: 'x', fs: 250 });
    const a = s.read(500).II!;
    s.setRhythm({ kind: 'vt', rate: 170 });
    const b = s.read(1000).II!;
    expect(Math.abs(b[0] - a[a.length - 1])).toBeLessThan(0.5);
    expect(s.rate).toBe(170);
  });
});
