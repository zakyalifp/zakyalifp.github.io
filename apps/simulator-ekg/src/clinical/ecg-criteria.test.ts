import { describe, expect, it } from 'vitest';
import { areContiguous, axisCategory, axisFromIaVF, evaluateSgarbossa, lvhCriteria, qtcBazett, qtcCategory, qtcFridericia, rrFromHr, steThresholdMm, ST_ELEVATION, CRITERIA_REGISTRY } from './ecg-criteria';

describe('QTc', () => {
  it('Bazett: QT/√RR', () => {
    expect(qtcBazett(400, 1)).toBe(400);
    expect(qtcBazett(400, 0.64)).toBeCloseTo(500, 6);
    expect(qtcBazett(360, rrFromHr(100))).toBeCloseTo(360 / Math.sqrt(0.6), 6);
  });
  it('Fridericia: QT/∛RR', () => {
    expect(qtcFridericia(400, 1)).toBe(400);
    expect(qtcFridericia(400, 0.729)).toBeCloseTo(400 / 0.9, 6);
    expect(qtcFridericia(360, 0.512)).toBeCloseTo(450, 6);
  });
  it('Fridericia mengoreksi lebih sedikit dari Bazett pada takikardia', () => {
    const rr = rrFromHr(120);
    expect(qtcBazett(320, rr)).toBeGreaterThan(qtcFridericia(320, rr));
  });
  it('kategori QTc per jenis kelamin', () => {
    expect(qtcCategory(455, 'L')).toBe('memanjang');
    expect(qtcCategory(455, 'P')).toBe('normal');
    expect(qtcCategory(510, 'P')).toBe('sangat-memanjang');
    expect(qtcCategory(380, 'L')).toBe('pendek');
  });
});

describe('Aksis', () => {
  it('heksaksial dari I & aVF', () => {
    expect(axisFromIaVF(1, 0)).toBeCloseTo(0, 6);
    expect(axisFromIaVF(0, 1)).toBeCloseTo(90, 6);
    expect(axisFromIaVF(-1, 0)).toBeCloseTo(180, 6);
    expect(axisFromIaVF(0, -1)).toBeCloseTo(-90, 6);
    // Vektor 60° (II): I = cos60 = 0,5; aVF = sin60·√3/2 = 0,75
    expect(axisFromIaVF(0.5, 0.75)).toBeCloseTo(60, 6);
    // Vektor −30° (aVL): I = cos(−30) ; aVF = sin(−30)·√3/2
    expect(axisFromIaVF(Math.cos(-Math.PI / 6), (Math.sin(-Math.PI / 6) * Math.sqrt(3)) / 2)).toBeCloseTo(-30, 6);
  });
  it('kategori aksis', () => {
    expect(axisCategory(60)).toBe('normal');
    expect(axisCategory(-30)).toBe('normal');
    expect(axisCategory(-45)).toBe('deviasi-kiri');
    expect(axisCategory(120)).toBe('deviasi-kanan');
    expect(axisCategory(-120)).toBe('ekstrem');
  });
});

describe('Ambang elevasi ST (UDMI-4 / ESC 2023 / PNPK 2026)', () => {
  it('V2–V3 menurut usia & jenis kelamin', () => {
    expect(steThresholdMm('V2', 'L', 45)).toBe(2);
    expect(steThresholdMm('V3', 'L', 35)).toBe(2.5);
    expect(steThresholdMm('V2', 'P', 70)).toBe(1.5);
    expect(steThresholdMm('II', 'L', 50)).toBe(1);
  });
  it('sadapan posterior & kanan', () => {
    expect(steThresholdMm('V8', 'L', 60)).toBe(ST_ELEVATION.POSTERIOR_V7V9_MM);
    expect(steThresholdMm('V8', 'L', 35)).toBe(1);
    expect(steThresholdMm('V4R', 'L', 25)).toBe(1);
    expect(steThresholdMm('V4R', 'P', 25)).toBe(0.5);
  });
  it('sadapan berdekatan', () => {
    expect(areContiguous('V2', 'V3')).toBe(true);
    expect(areContiguous('II', 'aVF')).toBe(true);
    expect(areContiguous('aVF', 'III')).toBe(true);
    expect(areContiguous('aVL', 'I')).toBe(true);
    expect(areContiguous('V1', 'V3')).toBe(false);
    expect(areContiguous('I', 'II')).toBe(false);
  });
});

describe('Sgarbossa & Smith', () => {
  it('STE konkordan ≥1 mm = 5 poin (positif)', () => {
    const r = evaluateSgarbossa({ leads: [{ lead: 'V6', qrsPolarity: 1, stMm: 1.5, sDepthMm: 1, rHeightMm: 12 }] });
    expect(r.score).toBe(5);
    expect(r.classicPositive).toBe(true);
  });
  it('STE diskordan proporsional rendah = negatif; rasio ≤ −0,25 = Smith positif', () => {
    const neg = evaluateSgarbossa({ leads: [{ lead: 'V2', qrsPolarity: -1, stMm: 2, sDepthMm: 20, rHeightMm: 1 }] });
    expect(neg.classicPositive).toBe(false);
    expect(neg.smithPositive).toBe(false);
    const pos = evaluateSgarbossa({ leads: [{ lead: 'V2', qrsPolarity: -1, stMm: 4, sDepthMm: 12, rHeightMm: 1 }] });
    expect(pos.smithPositive).toBe(true);
    expect(pos.classicPositive).toBe(false);
  });
});

describe('LVH', () => {
  it('Sokolow & Cornell', () => {
    const r = lvhCriteria({ sV1: 15, rV5: 22, rV6: 18, rAVL: 9, sV3: 21 }, 'L');
    expect(r.sokolow).toBe(37);
    expect(r.sokolowPositive).toBe(true);
    expect(r.cornell).toBe(30);
    expect(r.cornellPositive).toBe(true);
    expect(lvhCriteria({ sV1: 10, rV5: 15, rV6: 12, rAVL: 8, sV3: 13 }, 'P').cornellPositive).toBe(true);
  });
});

describe('Registri review', () => {
  it('setiap baris punya sumber & status', () => {
    for (const r of CRITERIA_REGISTRY) {
      expect(r.source.length).toBeGreaterThan(2);
      expect(['terverifikasi', 'VERIFY', 'asumsi-sim']).toContain(r.status);
    }
  });
});
