import { describe, expect, it } from 'vitest';
import { computeLayout, hitPanel, mmToMs, mvToMm, panelPoint, secToMm, TRACE_WIDTH_MM } from './layout';
import { PAPER } from '../../clinical/ecg-criteria';

describe('Akurasi skala kertas', () => {
  it('1 mV = 10 mm dan 1 detik = 25 mm pada kalibrasi standar', () => {
    expect(PAPER.GAIN_MM_PER_MV).toBe(10);
    expect(PAPER.SPEED_MM_PER_S).toBe(25);
    expect(mvToMm(1)).toBe(10);
    expect(secToMm(1)).toBe(25);
    expect(mmToMs(5)).toBe(200); // 1 kotak besar = 200 ms
    expect(mmToMs(1)).toBe(40); // 1 kotak kecil = 40 ms
  });
  it('panelPoint memetakan waktu & amplitudo secara fisik', () => {
    const L = computeLayout({ speed: 25, gain: 10, layout: '3x4' }, 10);
    const p = L.panels.find((x) => x.isRhythm)!;
    const a = panelPoint(p, 1, 0, 25, 10);
    const b = panelPoint(p, 2, 1, 25, 10);
    expect(b.x - a.x).toBeCloseTo(25, 9); // 1 detik
    expect(a.y - b.y).toBeCloseTo(10, 9); // 1 mV
  });
  it('opsi 50 mm/s dan gain 5/20 mm/mV', () => {
    const L50 = computeLayout({ speed: 50, gain: 20, layout: '3x4' }, 10);
    const p = L50.panels.find((x) => x.isRhythm)!;
    const a = panelPoint(p, 0, 0, 50, 20);
    const b = panelPoint(p, 1, 1, 50, 20);
    expect(b.x - a.x).toBeCloseTo(50, 9);
    expect(a.y - b.y).toBeCloseTo(20, 9);
    expect(p.dur).toBeCloseTo(TRACE_WIDTH_MM / 50, 9);
    const L5 = computeLayout({ speed: 25, gain: 5, layout: '6x2' }, 10);
    const q = L5.panels[0];
    expect(panelPoint(q, 0, 0, 25, 5).y - panelPoint(q, 0, 2, 25, 5).y).toBeCloseTo(10, 9);
  });
  it('layout 3×4: 12 panel 2,5 detik + strip irama 10 detik', () => {
    const L = computeLayout({ speed: 25, gain: 10, layout: '3x4' }, 10);
    const std = L.panels.filter((x) => !x.isRhythm);
    expect(std).toHaveLength(12);
    for (const p of std) expect(p.dur).toBeCloseTo(2.5, 9);
    expect(std.find((p) => p.lead === 'V4')!.t0).toBeCloseTo(7.5, 9);
    expect(L.panels.find((x) => x.isRhythm)!.w).toBeCloseTo(250, 9);
  });
  it('layout 6×2 dan tunggal', () => {
    expect(computeLayout({ speed: 25, gain: 10, layout: '6x2' }, 10).panels.filter((p) => !p.isRhythm)).toHaveLength(12);
    const s = computeLayout({ speed: 25, gain: 10, layout: 'single', singleLead: 'V2' }, 10);
    expect(s.panels).toHaveLength(1);
    expect(s.panels[0].lead).toBe('V2');
  });
  it('hitPanel mengembalikan waktu & mV di bawah kursor', () => {
    const L = computeLayout({ speed: 25, gain: 10, layout: '3x4' }, 10);
    const p = L.panels.find((x) => x.lead === 'V1')!;
    const h = hitPanel(L, p.x + 12.5, p.y - 5)!;
    expect(h.panel.lead).toBe('V1');
    expect(h.t).toBeCloseTo(p.t0 + 0.5, 9);
    expect(h.mv).toBeCloseTo(0.5, 9);
  });
});
