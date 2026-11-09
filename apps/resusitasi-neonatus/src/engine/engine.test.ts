import { describe, expect, it } from 'vitest';
import { SCENARIOS, getScenario } from '../scenarios';
import { advance, createSim, dispatch, runPath, tick } from './engine';
import { computeDebrief } from './scoring';
import { observe } from './observe';
import { getHint } from './hints';
import { ppvParams, prepSteps, epiParams } from '../scenarios/common';
import { parseScenario, type Scenario } from './schema';
import { HEART_RATE, SIM } from '../clinical/guidelines';

const sc = (id: string) => getScenario(id)!;
const born = (s: Scenario) => dispatch(createSim(s), s, 'birth').state;

describe('bank skenario', () => {
  it('memiliki ≥14 skenario valid dengan id unik', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(14);
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const nums = SCENARIOS.map((s) => s.number);
    expect(new Set(nums).size).toBe(nums.length);
  });
  it('skema menolak skenario tidak valid', () => {
    expect(() => parseScenario({ id: 'X Y' })).toThrow();
  });
  it('setiap tindakan dalam jalur skenario dikenal engine', async () => {
    const { ACTION_MAP } = await import('./actions');
    for (const s of SCENARIOS) for (const st of [...s.idealPath, ...s.wrongPath]) expect(ACTION_MAP[st.action], `${s.id}:${st.action}`).toBeDefined();
  });
});

describe.each(SCENARIOS.map((s) => [s.number, s.id, s] as const))('skenario %i %s', (_n, _id, s) => {
  it('jalur ideal berhasil, lulus, tanpa kesalahan kritis', () => {
    const { state, failures } = runPath(s, s.idealPath);
    expect(failures).toEqual([]);
    const d = computeDebrief(state, s);
    expect(d.criticalErrors).toEqual([]);
    expect(['stabil', 'dihentikan-tepat']).toContain(d.outcome);
    expect(d.passed).toBe(true);
    expect(d.score).toBeGreaterThanOrEqual(90);
  });
  it('jalur salah menurunkan skor / gagal', () => {
    const ideal = computeDebrief(runPath(s, s.idealPath).state, s);
    const { state } = runPath(s, s.wrongPath);
    const d = computeDebrief(state, s);
    expect(d.passed).toBe(false);
    expect(d.score).toBeLessThan(ideal.score);
  });
  it('deterministik: dua kali jalan → hasil identik', () => {
    const a = runPath(s, s.idealPath).state;
    const b = runPath(s, s.idealPath).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('fisiologi', () => {
  it('apnea tanpa VTP → HR turun; VTP efektif → HR naik >100 dalam ±1 menit', () => {
    const s0 = sc('apnea-vtp');
    let a = born(s0);
    const hr0 = a.hr;
    a = advance(a, s0, 40);
    expect(a.hr).toBeLessThan(hr0);
    let b = born(s0);
    b = dispatch(b, s0, 'cord', { pilihan: 'segera' }).state;
    b = dispatch(b, s0, 'ppv-start', ppvParams(40, 3.4)).state;
    b = advance(b, s0, 60);
    expect(b.hr).toBeGreaterThan(HEART_RATE.PPV_BELOW_BPM);
    expect(b.ventEff).toBeGreaterThan(0.9);
  });
  it('kebocoran masker → VTP tidak efektif sampai M dilakukan', () => {
    const s0 = sc('mr-sopa');
    let s = born(s0);
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'ppv-start', ppvParams(39, 3.3, { pip: 30 })).state;
    s = tick(s, s0);
    expect(s.ventEff).toBeLessThan(0.5);
    s = dispatch(s, s0, 'mr-m').state;
    s = advance(s, s0, 5);
    expect(s.ventEff).toBeGreaterThan(0.9);
    expect(observe(s, s0).chest).toBe('baik');
  });
  it('tekanan kurang → efektivitas rendah; P menaikkan tekanan', () => {
    const s0 = sc('mr-sopa');
    let s = born(s0);
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'ppv-start', ppvParams(39, 3.3, { pip: 20 })).state;
    s = dispatch(s, s0, 'mr-m').state;
    s = advance(s, s0, 5);
    const before = s.ventEff;
    s = dispatch(s, s0, 'mr-p').state;
    s = dispatch(s, s0, 'mr-p').state;
    s = tick(s, s0);
    expect(s.vent.pip).toBe(30);
    expect(s.ventEff).toBeGreaterThan(before);
  });
  it('intubasi menghentikan ventilasi selama tindakan', () => {
    const s0 = sc('kompresi');
    let s = born(s0);
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'ppv-start', ppvParams(39, 3.2)).state;
    s = dispatch(s, s0, 'intubate', { ukuran: 3.5, kedalaman: 8.5, bilah: '1' }).state;
    s = tick(s, s0);
    expect(s.ventEff).toBe(0);
    s = advance(s, s0, SIM.DURATION_S.intubation + 1);
    expect(s.ett.placed).toBe(true);
    expect(s.ett.position).toBe('trachea');
    expect(s.ventEff).toBeGreaterThan(0.9);
  });
  it('ETT terlalu dalam → bronkus kanan, suara napas asimetris', () => {
    const s0 = sc('kompresi');
    let s = born(s0);
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'ppv-start', ppvParams(39, 3.2)).state;
    s = dispatch(s, s0, 'intubate', { ukuran: 3.5, kedalaman: 10, bilah: '1' }).state;
    s = advance(s, s0, SIM.DURATION_S.intubation + 1);
    expect(s.ett.position).toBe('right-main');
    expect(observe(s, s0).chestAsymmetric).toBe(true);
  });
  it('epinefrin tanpa akses ditolak; dosis 10× → kesalahan kritis', () => {
    const s0 = sc('epinefrin');
    const state = advance(runPath(s0, s0.idealPath.filter((x) => x.t < 180)).state, s0, 91);
    const r = dispatch(state, s0, 'epinephrine', { rute: 'io', dosisMg: 0.06, volumeMl: 0.6, bilasMl: 3, closedLoop: true });
    expect(r.ok).toBe(false);
    let s = dispatch(state, s0, 'epinephrine', { rute: 'iv', dosisMg: 0.3, volumeMl: 3, bilasMl: 3, closedLoop: true }).state;
    s = advance(s, s0, SIM.DURATION_S.drugPrep + 1);
    const j = s.judgements.find((x) => x.code === 'epi-dose');
    expect(j?.ok).toBe(false);
    expect(j?.critical).toBe(true);
  });
  it('volume ditarik tidak sesuai dosis → dinilai dari volume yang benar-benar diberikan', () => {
    const s0 = sc('epinefrin');
    const state = advance(runPath(s0, s0.idealPath.filter((x) => x.t < 180)).state, s0, 91);
    let s = dispatch(state, s0, 'epinephrine', { ...epiParams(3, 'iv'), volumeMl: 6 }).state;
    s = advance(s, s0, SIM.DURATION_S.drugPrep + 1);
    expect(s.judgements.find((x) => x.code === 'epi-volume')?.ok).toBe(false);
    expect(s.drugs.at(-1)?.mg).toBeCloseTo(0.6);
  });
  it('bayi basah tanpa penghangat kehilangan suhu; prematur lebih cepat', () => {
    const t = born(sc('apnea-vtp'));
    const p = born(sc('prematur-ekstrem'));
    const t2 = advance(t, sc('apnea-vtp'), 120);
    const p2 = advance(p, sc('prematur-ekstrem'), 120);
    expect(t2.temp).toBeLessThan(t.temp);
    expect(p.temp - p2.temp).toBeGreaterThan(t.temp - t2.temp);
  });
  it('hernia diafragmatika: VTP masker → distensi lambung; OGT mendekompresi', () => {
    const s0 = sc('hernia-diafragmatika');
    let s = born(s0);
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'ppv-start', ppvParams(38, 3, { pip: 25 })).state;
    s = advance(s, s0, 60);
    expect(s.gastricDistension).toBeGreaterThan(0.4);
    s = dispatch(s, s0, 'ogt').state;
    s = advance(s, s0, 40);
    expect(s.gastricDistension).toBeLessThan(0.2);
  });
  it('tidak ada tangan bebas → tindakan ditolak', () => {
    const s0 = sc('aterm-bugar'); // 2 petugas
    let s = born(s0);
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'ppv-start', ppvParams(39, 3.2)).state;
    s = dispatch(s, s0, 'compressions-start', { teknik: 'dua-ibu-jari', rasio: '3:1' }).state;
    const r = dispatch(s, s0, 'ogt');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/bantuan/);
  });
  it('oksimeter perlu waktu akuisisi dan tidak membaca bila HR sangat rendah', () => {
    const s0 = sc('apnea-vtp');
    let s = born(s0);
    s = dispatch(s, s0, 'pulse-ox', { lokasi: 'tangan-kanan' }).state;
    s = advance(s, s0, SIM.DURATION_S.pulseOx + 1);
    expect(observe(s, s0).spo2Display).toBeNull();
    expect(observe(s, s0).spo2Acquiring).toBe(true);
  });
  it('hint Mode Belajar menyarankan VTP untuk bayi apnea', () => {
    const s0 = sc('apnea-vtp');
    let s = born(s0);
    s = dispatch(s, s0, 'initial-assess').state;
    s = dispatch(s, s0, 'cord', { pilihan: 'segera' }).state;
    s = dispatch(s, s0, 'warmer').state;
    s = dispatch(s, s0, 'dry').state;
    s = dispatch(s, s0, 'position').state;
    s = advance(s, s0, 15);
    expect(getHint(s, s0)?.actions).toContain('ppv-start');
  });
  it('VTP terlambat (>60 dtk) dinilai salah', () => {
    const s0 = sc('apnea-vtp');
    const { state } = runPath(s0, [...prepSteps(false), { t: 3, action: 'cord', params: { pilihan: 'segera' } }, { t: 90, action: 'ppv-start', params: ppvParams(40, 3.4) }, { t: 200, action: 'end' }]);
    expect(state.judgements.find((j) => j.code === 'ppv-timing')?.ok).toBe(false);
  });
  it('batas waktu skenario mengakhiri simulasi', () => {
    const s0 = sc('aterm-bugar');
    const s = advance(born(s0), s0, SIM.DEFAULT_MAX_S + 10);
    expect(s.phase).toBe('ended');
    expect(s.endReason).toBe('waktu-habis');
  });
});
