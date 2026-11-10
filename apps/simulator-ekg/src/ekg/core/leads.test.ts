import { describe, expect, it } from 'vitest';
import { completeLeads, deriveAVF, deriveAVL, deriveAVR, deriveIII, limbElectrodes } from './leads';
import { decodeEkg1, encodeEkg1 } from './binary';
import type { EcgSignal } from './types';

describe('Penurunan sadapan ekstremitas', () => {
  it('rumus Einthoven & Goldberger', () => {
    const I = 0.8;
    const II = 1.2;
    expect(deriveIII(I, II)).toBeCloseTo(0.4);
    expect(deriveAVR(I, II)).toBeCloseTo(-1.0);
    expect(deriveAVL(I, II)).toBeCloseTo(0.2);
    expect(deriveAVF(I, II)).toBeCloseTo(0.8);
    // I + III = II ; aVR + aVL + aVF = 0
    expect(I + deriveIII(I, II)).toBeCloseTo(II);
    expect(deriveAVR(I, II) + deriveAVL(I, II) + deriveAVF(I, II)).toBeCloseTo(0);
  });
  it('potensial elektroda konsisten', () => {
    const e = limbElectrodes(0.7, 1.1);
    expect(e.RA + e.LA + e.LL).toBeCloseTo(0);
    expect(e.LA - e.RA).toBeCloseTo(0.7);
    expect(e.LL - e.RA).toBeCloseTo(1.1);
  });
  it('completeLeads mengisi 4 sadapan turunan', () => {
    const sig: EcgSignal = { fs: 500, length: 3, leads: { I: new Float32Array([0, 1, -1]), II: new Float32Array([1, 1, 0.5]) } };
    completeLeads(sig);
    expect(Array.from(sig.leads.III!)).toEqual([1, 0, 1.5]);
    expect(Array.from(sig.leads.aVF!).map((x) => +x.toFixed(3))).toEqual([1, 0.5, 1]);
  });
});

describe('Format biner EKG1', () => {
  it('encode → decode bolak-balik (resolusi 1 µV)', () => {
    const n = 1000;
    const leads: EcgSignal['leads'] = {};
    for (const l of ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) leads[l] = Float32Array.from({ length: n }, (_, i) => Math.sin(i / 20) * 1.5);
    const sig: EcgSignal = { fs: 500, length: n, leads };
    const back = decodeEkg1(encodeEkg1(sig, ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']));
    expect(back.fs).toBe(500);
    expect(back.length).toBe(n);
    for (let i = 0; i < n; i += 97) expect(back.leads.V3![i]).toBeCloseTo(leads.V3![i], 3);
    expect(back.leads.aVR![10]).toBeCloseTo(-(leads.I![10] + leads.II![10]) / 2, 3);
  });
  it('menolak berkas rusak', () => {
    expect(() => decodeEkg1(new ArrayBuffer(32))).toThrow();
  });
});
