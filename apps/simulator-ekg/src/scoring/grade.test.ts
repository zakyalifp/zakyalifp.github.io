import { describe, expect, it } from 'vitest';
import { gradeQuick, gradeSystematic, itemScore, pickDistractors, quickQuestions, sameFamily, truthRhythm } from './grade';
import { summarize, updateCard, adaptivePriority } from './session';
import { SYNTH_METAS } from '../cases/model';
import { DIAGNOSES } from '../cases/diagnoses';
import { SCORING } from '../clinical/ecg-criteria';

const stemi = SYNTH_METAS.find((m) => m.dx === 'stemi-anterior')!;
const truth = { hr: 92, pr: 160, qrs: 88, qt: 350, qtcB: 433, qtcF: 410, axis: 56, source: 'uji' };

describe('Penilaian interpretasi sistematis', () => {
  it('jawaban sempurna → skor 1', () => {
    const d = DIAGNOSES['stemi-anterior'];
    const s = gradeSystematic(stemi, truth, { hr: 90, rhythm: 'sinus', axis: 60, p: d.p, pr: 170, qrs: 90, st: d.st, t: d.t, qtc: 440, dx: 'stemi-anterior', mgmt: 'reperfusi' });
    expect(itemScore(s)).toBeCloseTo(1, 6);
    expect(s.some((x) => x.critical)).toBe(false);
  });
  it('toleransi pengukuran & nilai parsial', () => {
    const s = gradeSystematic(stemi, truth, { hr: 92 + 12, qrs: 88 + SCORING.QRS_TOL_MS + 5, axis: 56 - 35 });
    expect(s.find((x) => x.step === 'hr')!.credit).toBe(0.5);
    expect(s.find((x) => x.step === 'qrs')!.credit).toBe(0.5);
    expect(s.find((x) => x.step === 'axis')!.credit).toBe(0.5);
  });
  it('QTc tidak dinilai pada fibrilasi atrium (Rautaharju 2009)', () => {
    const af = SYNTH_METAS.find((m) => m.dx === 'af')!;
    const s = gradeSystematic(af, { ...truth, pr: null }, { qtc: 999 });
    const q = s.find((x) => x.step === 'qtc')!;
    expect(q.weight).toBe(0);
    expect(q.ok).toBe(true);
  });
  it('reperfusi vs IKP segera (PERKI 2024): nilai parsial, bukan kritis', () => {
    const avr = SYNTH_METAS.find((m) => m.dx === 'avr-std')!;
    const a = gradeSystematic(avr, truth, { mgmt: 'reperfusi' }).find((x) => x.step === 'mgmt')!;
    expect(a.credit).toBe(0.5);
    expect(a.critical).toBe(false);
    const b = gradeSystematic(stemi, truth, { mgmt: 'ikp-segera' }).find((x) => x.step === 'mgmt')!;
    expect(b.credit).toBe(0.75);
    expect(b.critical).toBe(false);
    const c = gradeSystematic(avr, truth, { mgmt: 'observasi' }).find((x) => x.step === 'mgmt')!;
    expect(c.critical).toBe(true);
  });
  it('melewatkan STEMI & reperfusi = kesalahan kritis', () => {
    const s = gradeSystematic(stemi, truth, { st: 'normal', dx: 'early-repol', mgmt: 'observasi' });
    expect(s.filter((x) => x.critical).length).toBeGreaterThanOrEqual(2);
    const sess = summarize('sistematis', 'uji', [{ caseId: 'x', dx: 'stemi-anterior', kind: 'sintetis', mode: 'sistematis', score: 1, correctDx: false, steps: s, criticalErrors: ['x'], timeS: 1 }], 10);
    expect(sess.score).toBeLessThanOrEqual(SCORING.CRITICAL_SCORE_CAP);
    expect(sess.passed).toBe(false);
  });
  it('PR tak terukur pada AF', () => {
    const af = SYNTH_METAS.find((m) => m.dx === 'af')!;
    const s = gradeSystematic(af, { ...truth, pr: null }, { prNA: true });
    expect(s.find((x) => x.step === 'pr')!.ok).toBe(true);
    const s2 = gradeSystematic(af, { ...truth, pr: null }, { pr: 160 });
    expect(s2.find((x) => x.step === 'pr')!.ok).toBe(false);
  });
  it('irama sinus menyesuaikan laju', () => {
    expect(truthRhythm(stemi, { ...truth, hr: 48 })).toBe('sinus-brady');
    expect(truthRhythm(stemi, { ...truth, hr: 120 })).toBe('sinus-tachy');
  });
  it('keluarga diagnosis', () => {
    expect(sameFamily('hyperk-1', 'hyperk-3')).toBe(true);
    expect(sameFamily('stemi-anterior', 'pericarditis')).toBe(false);
  });
});

describe('Diagnosis cepat', () => {
  it('pertanyaan OMI & reperfusi untuk iskemia', () => {
    const d = pickDistractors('de-winter', Object.keys(DIAGNOSES), 3, () => 0.5);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('de-winter');
    const dw = SYNTH_METAS.find((m) => m.dx === 'de-winter')!;
    const qs = quickQuestions(dw, d);
    expect(qs.map((q) => q.id)).toEqual(['dx', 'omi', 'reperfusi']);
    const g = gradeQuick(dw, qs, { dx: 'de-winter', omi: 'tidak', reperfusi: 'ya' }, false);
    expect(g.find((x) => x.step === 'omi')!.critical).toBe(true);
  });
  it('waktu habis = salah', () => {
    const vf = SYNTH_METAS.find((m) => m.dx === 'vf')!;
    const qs = quickQuestions(vf, ['torsades', 'asystole', 'artifact']);
    const g = gradeQuick(vf, qs, {}, true);
    expect(itemScore(g)).toBe(0);
  });
});

describe('Pengulangan berjarak', () => {
  it('salah → interval 0 & prioritas naik', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const bad = updateCard(undefined, 'wellens-b', 0.1, now);
    expect(bad.interval).toBe(0);
    const good = updateCard(undefined, 'af', 1, now);
    expect(good.interval).toBe(1);
    const order = adaptivePriority({ 'wellens-b': bad, af: good }, ['af', 'wellens-b'], now);
    expect(order[0]).toBe('wellens-b');
  });
});
