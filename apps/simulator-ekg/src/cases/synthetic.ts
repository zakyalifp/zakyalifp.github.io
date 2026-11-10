/**
 * Bank kasus SINTETIS (dibangkitkan synthesizer, deterministik dengan seed).
 * Selalu berlabel "Sintetis" di UI. Kepatuhan setiap kasus terhadap kriteria klinis
 * diuji otomatis di src/cases/synthetic.test.ts.
 */
import type { LeadName } from '../ekg/core/types';
import type { SynthSpec } from '../ekg/synth/synth';
import type { Level } from './diagnoses';

export interface SynthAnnot {
  leads: LeadName[];
  label: string;
  text: string;
  kind?: 'st-elevasi' | 'st-depresi' | 'gelombang-t' | 'qrs' | 'gelombang-p' | 'interval' | 'irama' | 'lain';
  /** Sorot denyut berlabel tertentu (dari rhythm engine), mis. 'PVC'. Kosong = seluruh strip. */
  beats?: string;
}

export interface SynthCase {
  id: string;
  dx: string;
  secondary?: string[];
  title?: string;
  level?: Level;
  age: number;
  sex: 'L' | 'P';
  spec: SynthSpec;
  annotations: SynthAnnot[];
  /** Kasus normal pembanding (tidak masuk kuis). */
  reference?: boolean;
}

const INF: LeadName[] = ['II', 'III', 'aVF'];
const PREC: LeadName[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const LIMB: LeadName[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const ALL: LeadName[] = [...LIMB, ...PREC];
const RHY: LeadName[] = ['II'];

const NOISE = { emg: 0.008, wander: 0.025 };
const sinus = (rate: number, prMs = 160) => ({ kind: 'sinus' as const, rate, prMs, sa: 0.02 });

let seq = 0;
function c(dx: string, age: number, sex: 'L' | 'P', spec: Omit<SynthSpec, 'seed'> & { seed?: number | string }, annotations: SynthAnnot[], extra: Partial<SynthCase> = {}): SynthCase {
  seq++;
  const id = extra.id ?? `syn-${dx}-${seq}`;
  return { id, dx, age, sex, spec: { noise: NOISE, ...spec, seed: spec.seed ?? id }, annotations, ...extra };
}

export const SYNTHETIC_CASES: SynthCase[] = [
  // ---------------------------------------------------------------- Pembanding normal
  c('sinus-normal', 45, 'L', { rhythm: sinus(72) }, [{ leads: ALL, label: 'Normal', text: 'Semua interval dan morfologi dalam batas normal.' }], { id: 'syn-normal-ref-l', reference: true }),
  c('sinus-normal', 38, 'P', { rhythm: sinus(78), morph: { qrsScale: 0.85 } }, [{ leads: ALL, label: 'Normal', text: 'Semua interval dan morfologi dalam batas normal.' }], { id: 'syn-normal-ref-p', reference: true }),

  // ---------------------------------------------------------------- Iskemia & infark
  c('stemi-anterior', 58, 'L', { rhythm: sinus(92), morph: { st: [{ territory: 'anteriorProximal', mm: 4, shape: 'convex' }], tExtra: [{ territory: 'anterior', mm: 4 }] } }, [
    { leads: ['V1', 'V2', 'V3', 'V4', 'I', 'aVL'], label: 'Elevasi ST', text: 'Elevasi ST konveks di V1–V4 serta I & aVL: oklusi LAD proksimal.', kind: 'st-elevasi' },
    { leads: INF, label: 'Depresi resiprokal', text: 'Depresi ST resiprokal di II, III, aVF memperkuat diagnosis oklusi akut.', kind: 'st-depresi' },
  ]),
  c('stemi-inferior', 63, 'P', { rhythm: sinus(64), morph: { st: [{ territory: 'inferior', mm: 3 }], tExtra: [{ territory: 'inferior', mm: 2 }] } }, [
    { leads: INF, label: 'Elevasi ST inferior', text: 'Elevasi ST di II, III, aVF dengan III > II (mengarah RCA).', kind: 'st-elevasi' },
    { leads: ['I', 'aVL'], label: 'Resiprokal', text: 'Depresi ST di aVL & I (resiprokal).', kind: 'st-depresi' },
  ]),
  c('stemi-rv', 61, 'L', { rhythm: sinus(58), morph: { st: [{ territory: 'inferiorRv', mm: 3 }] }, extraLeads: true }, [
    { leads: INF, label: 'Elevasi ST inferior', text: 'Elevasi ST II, III, aVF; III > II.', kind: 'st-elevasi' },
    { leads: ['V1', 'V4R'], label: 'Ventrikel kanan', text: 'Elevasi ST di V1 dan V4R ≥0,5 mm: infark ventrikel kanan (RCA proksimal).', kind: 'st-elevasi' },
    { leads: ['I', 'aVL'], label: 'Resiprokal', text: 'Depresi ST di I & aVL.', kind: 'st-depresi' },
  ]),
  c('stemi-rv', 55, 'P', { rhythm: { kind: 'avb', degree: 1, atrialRate: 62, prMs: 240 }, morph: { st: [{ territory: 'inferiorRv', mm: 2.5 }] }, extraLeads: true }, [
    { leads: INF, label: 'Elevasi ST inferior', text: 'Elevasi ST inferior dengan III > II.', kind: 'st-elevasi' },
    { leads: ['V1', 'V4R'], label: 'Ventrikel kanan', text: 'Elevasi ST V4R: keterlibatan ventrikel kanan — hindari nitrat.', kind: 'st-elevasi' },
    { leads: RHY, label: 'AV blok derajat 1', text: 'PR memanjang (>200 ms) sering menyertai infark inferior.', kind: 'interval' },
  ]),
  c('stemi-rv', 49, 'L', { rhythm: sinus(70), morph: { st: [{ territory: 'inferiorRv', mm: 2 }, { territory: 'rightVentricle', mm: 1.2 }] }, extraLeads: true }, [
    { leads: INF, label: 'Elevasi ST inferior', text: 'Elevasi ST inferior.', kind: 'st-elevasi' },
    { leads: ['V1', 'V4R'], label: 'Ventrikel kanan', text: 'Elevasi ST di V4R ≥1 mm.', kind: 'st-elevasi' },
  ]),
  c('stemi-posterior', 62, 'L', { rhythm: sinus(84), morph: { st: [{ territory: 'posterior', mm: 1.5 }] }, extraLeads: true }, [
    { leads: ['V1', 'V2', 'V3'], label: 'Depresi ST V1–V3', text: 'Depresi ST horizontal maksimal di V1–V3 dengan T tegak: cermin elevasi ST posterior.', kind: 'st-depresi' },
    { leads: ['V7', 'V8', 'V9'], label: 'Elevasi ST posterior', text: 'Elevasi ST ≥0,5 mm di V7–V9 memastikan infark posterior.', kind: 'st-elevasi' },
  ]),
  c('stemi-posterior', 70, 'P', { rhythm: sinus(76), morph: { st: [{ territory: 'posterior', mm: 1.0 }, { territory: 'inferiorLcx', mm: 0.6 }] , oldMi: ['posterior'] }, extraLeads: true }, [
    { leads: ['V1', 'V2', 'V3'], label: 'Depresi ST & R tinggi', text: 'Depresi ST V1–V3 dengan R dominan di V2.', kind: 'st-depresi' },
    { leads: ['V7', 'V8', 'V9'], label: 'Elevasi ST posterior', text: 'Elevasi ST di V7–V9.', kind: 'st-elevasi' },
  ]),
  c('stemi-posterior', 52, 'L', { rhythm: sinus(95), morph: { st: [{ territory: 'posterior', mm: 1.3 }] }, extraLeads: true }, [
    { leads: ['V1', 'V2', 'V3'], label: 'Depresi ST V1–V3', text: 'Depresi ST V1–V3 — rekam V7–V9.', kind: 'st-depresi' },
    { leads: ['V7', 'V8', 'V9'], label: 'Elevasi ST posterior', text: 'Elevasi ST di V7–V9.', kind: 'st-elevasi' },
  ]),
  c('hyperacute-t', 54, 'L', { rhythm: sinus(80), morph: { tExtra: [{ territory: 'anterior', mm: 7, symmetric: true }], st: [{ territory: 'anterior', mm: 0.8 }] } }, [
    { leads: ['V2', 'V3', 'V4'], label: 'T hiperakut', text: 'T besar, lebar, simetris di V2–V4 dengan elevasi ST minimal — fase paling awal oklusi LAD.', kind: 'gelombang-t' },
  ]),
  c('hyperacute-t', 47, 'P', { rhythm: sinus(88), morph: { tExtra: [{ territory: 'inferior', mm: 5, symmetric: true }], st: [{ territory: 'inferior', mm: 0.6 }] } }, [
    { leads: INF, label: 'T hiperakut inferior', text: 'T besar dan simetris di II, III, aVF; resiprokal T/ST di aVL.', kind: 'gelombang-t' },
    { leads: ['aVL'], label: 'Resiprokal', text: 'Inversi T/depresi ST ringan di aVL mendukung oklusi inferior dini.', kind: 'st-depresi' },
  ]),
  c('hyperacute-t', 66, 'L', { rhythm: sinus(74), morph: { tExtra: [{ territory: 'anteriorProximal', mm: 6, symmetric: true }], st: [{ territory: 'anteriorProximal', mm: 0.9 }] } }, [
    { leads: ['V2', 'V3', 'V4', 'aVL'], label: 'T hiperakut', text: 'T hiperakut di V2–V4 dan aVL.', kind: 'gelombang-t' },
  ]),
  c('de-winter', 51, 'L', { rhythm: sinus(90), morph: { st: [{ territory: 'posterior', mm: -2, shape: 'upsloping', index: 'V3' }, { territory: 'subendoLateral', mm: -1.2, shape: 'upsloping' }], tExtra: [{ territory: 'anterior', mm: 9, symmetric: true }] } }, [
    { leads: PREC, label: 'Depresi ST upsloping', text: 'Depresi titik J 1–3 mm berlanjut ke T tinggi simetris di V1–V6: pola de Winter (oklusi LAD proksimal).', kind: 'st-depresi' },
    { leads: ['aVR'], label: 'Elevasi aVR', text: 'Elevasi ST ringan di aVR.', kind: 'st-elevasi' },
  ]),
  c('de-winter', 44, 'L', { rhythm: sinus(98), morph: { st: [{ territory: 'posterior', mm: -1.6, shape: 'upsloping', index: 'V3' }, { territory: 'subendoLateral', mm: -1.8, shape: 'upsloping' }], tExtra: [{ territory: 'anterior', mm: 8, symmetric: true }] } }, [
    { leads: PREC, label: 'Pola de Winter', text: 'Depresi ST upsloping + T tinggi simetris prekordial.', kind: 'st-depresi' },
  ]),
  c('de-winter', 60, 'P', { rhythm: sinus(84), morph: { st: [{ territory: 'posterior', mm: -1.8, shape: 'upsloping', index: 'V3' }, { territory: 'subendoLateral', mm: -1.6, shape: 'upsloping' }], tExtra: [{ territory: 'anterior', mm: 7, symmetric: true }], qrsScale: 0.85 } }, [
    { leads: PREC, label: 'Pola de Winter', text: 'Depresi ST upsloping + T hiperakut prekordial tanpa elevasi ST.', kind: 'st-depresi' },
  ]),
  c('wellens-a', 49, 'L', { rhythm: sinus(68), morph: { wellens: 'A' } }, [{ leads: ['V2', 'V3'], label: 'T bifasik', text: 'T bifasik (positif lalu negatif) di V2–V3, ST isoelektrik, R terjaga: Wellens tipe A.', kind: 'gelombang-t' }]),
  c('wellens-a', 57, 'P', { rhythm: sinus(72), morph: { wellens: 'A', qrsScale: 0.9 } }, [{ leads: ['V2', 'V3'], label: 'T bifasik', text: 'Wellens tipe A di V2–V3.', kind: 'gelombang-t' }]),
  c('wellens-b', 53, 'L', { rhythm: sinus(66), morph: { wellens: 'B' } }, [{ leads: ['V1', 'V2', 'V3'], label: 'T inversi dalam', text: 'T inversi dalam & simetris di V1–V3 tanpa Q: Wellens tipe B.', kind: 'gelombang-t' }]),
  c('wellens-b', 62, 'P', { rhythm: sinus(74), morph: { wellens: 'B', tExtra: [{ territory: 'anterior', mm: -2, index: 'V4' }] } }, [{ leads: ['V1', 'V2', 'V3', 'V4'], label: 'T inversi dalam', text: 'Inversi T simetris V1–V4, progresi R normal.', kind: 'gelombang-t' }]),
  c('avr-std', 68, 'L', { rhythm: sinus(108), morph: { st: [{ territory: 'diffuseSubendo', mm: 2 }] } }, [
    { leads: ['aVR', 'V1'], label: 'Elevasi aVR', text: 'Elevasi ST di aVR (dan V1).', kind: 'st-elevasi' },
    { leads: ['I', 'II', 'aVF', 'V4', 'V5', 'V6'], label: 'Depresi ST difus', text: 'Depresi ST ≥1 mm di ≥6 sadapan: iskemia subendokardial difus (LM/tiga pembuluh).', kind: 'st-depresi' },
  ]),
  c('avr-std', 72, 'P', { rhythm: sinus(118), morph: { st: [{ territory: 'diffuseSubendo', mm: 1.8, shape: 'downsloping' }] } }, [
    { leads: ['aVR'], label: 'Elevasi aVR', text: 'Elevasi ST aVR.', kind: 'st-elevasi' },
    { leads: ['II', 'III', 'aVF', 'V3', 'V4', 'V5', 'V6'], label: 'Depresi ST difus', text: 'Depresi ST difus downsloping.', kind: 'st-depresi' },
  ]),
  c('avr-std', 59, 'L', { rhythm: sinus(96), morph: { st: [{ territory: 'diffuseSubendo', mm: 2.4 }], lvh: 0.3 } }, [
    { leads: ['aVR', 'V1'], label: 'Elevasi aVR/V1', text: 'Elevasi ST aVR & V1.', kind: 'st-elevasi' },
    { leads: ['I', 'II', 'aVF', 'V4', 'V5', 'V6'], label: 'Depresi ST', text: 'Depresi ST inferolateral luas.', kind: 'st-depresi' },
  ]),
  c('sgarbossa-lbbb', 71, 'L', { rhythm: sinus(84), morph: { conduction: 'lbbb', qtc: 420, st: [{ territory: 'lateral', mm: 2.2, index: 'V6' }] } }, [
    { leads: ['I', 'aVL', 'V5', 'V6'], label: 'STE konkordan', text: 'Elevasi ST konkordan ≥1 mm pada sadapan dengan QRS positif (Sgarbossa 5 poin).', kind: 'st-elevasi' },
  ]),
  c('sgarbossa-lbbb', 66, 'P', { rhythm: sinus(90), morph: { conduction: 'lbbb', qtc: 420, st: [{ territory: 'anterior', mm: 6, index: 'V2' }] } }, [
    { leads: ['V1', 'V2', 'V3'], label: 'STE diskordan berlebihan', text: 'Elevasi ST diskordan di V1–V3 dengan rasio ST/S ≤ −0,25 (modifikasi Smith positif).', kind: 'st-elevasi' },
  ]),
  c('sgarbossa-paced', 78, 'L', { rhythm: { kind: 'paced', mode: 'VVI', rate: 70 }, morph: { st: [{ territory: 'inferior', mm: 2.5 }] } }, [
    { leads: INF, label: 'STE pada irama pacu', text: 'Elevasi ST di II, III, aVF — pada irama pacu RV (QRS inferior negatif) ini diskordan berlebihan/konkordan; nilai dengan Sgarbossa-Smith.', kind: 'st-elevasi' },
  ]),
  c('sgarbossa-paced', 74, 'P', { rhythm: { kind: 'paced', mode: 'DDD', rate: 72 }, morph: { st: [{ territory: 'lateral', mm: 2.4, index: 'V6' }] } }, [
    { leads: ['I', 'aVL', 'V5', 'V6'], label: 'STE konkordan', text: 'Elevasi ST konkordan di sadapan lateral dengan QRS pacu positif.', kind: 'st-elevasi' },
  ]),
  c('old-mi-anterior', 67, 'L', { rhythm: sinus(70), morph: { oldMi: ['anterior'] } }, [{ leads: ['V1', 'V2', 'V3'], label: 'QS/Q anterior', text: 'QS di V1–V3 dengan progresi R buruk; tanpa elevasi ST akut.', kind: 'qrs' }]),
  c('aneurysm', 64, 'L', { rhythm: sinus(76), morph: { oldMi: ['anterior'], st: [{ territory: 'anterior', mm: 2 }], tScale: 0.6 } }, [{ leads: ['V1', 'V2', 'V3', 'V4'], label: 'Q + STE menetap', text: 'Gelombang QS dengan elevasi ST menetap & T kecil: aneurisma ventrikel kiri.', kind: 'st-elevasi' }]),
  // ---------------------------------------------------------------- Peniru
  c('pericarditis', 29, 'L', { rhythm: sinus(104), morph: { st: [{ territory: 'pericarditis', mm: 2, shape: 'concave' }], prDepression: 1 } }, [
    { leads: ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'], label: 'Elevasi ST difus', text: 'Elevasi ST cekung luas lintas teritori koroner.', kind: 'st-elevasi' },
    { leads: ['aVR'], label: 'aVR', text: 'Depresi ST dan elevasi PR di aVR.', kind: 'st-depresi' },
    { leads: ['II'], label: 'Depresi PR', text: 'Depresi segmen PR.', kind: 'interval' },
  ]),
  c('pericarditis', 35, 'P', { rhythm: sinus(96), morph: { st: [{ territory: 'pericarditis', mm: 1.6, shape: 'concave' }], prDepression: 0.9, qrsScale: 0.9 } }, [
    { leads: ['I', 'II', 'aVF', 'V3', 'V4', 'V5', 'V6'], label: 'Elevasi ST difus', text: 'Elevasi ST difus + depresi PR.', kind: 'st-elevasi' },
    { leads: ['aVR'], label: 'aVR', text: 'Elevasi PR di aVR.', kind: 'interval' },
  ]),
  c('pericarditis', 42, 'L', { rhythm: sinus(112), morph: { st: [{ territory: 'pericarditis', mm: 2.4, shape: 'concave' }], prDepression: 1.2 } }, [
    { leads: ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'], label: 'Elevasi ST difus', text: 'Elevasi ST difus, sinus takikardia, depresi PR.', kind: 'st-elevasi' },
  ]),
  c('early-repol', 24, 'L', { rhythm: sinus(58), morph: { osborn: 0.12, st: [{ territory: 'pericarditis', mm: 1.3, shape: 'concave', index: 'V4' }], tScale: 1.25 } }, [
    { leads: ['II', 'aVF', 'V3', 'V4', 'V5', 'V6'], label: 'Elevasi titik J + notch', text: 'Notch/slur di akhir QRS dengan elevasi ST cekung dan T tinggi, tanpa resiprokal.', kind: 'st-elevasi' },
  ]),
  c('brugada', 34, 'L', { rhythm: sinus(76), morph: { brugada: 1, conduction: 'irbbb' } }, [{ leads: ['V1', 'V2'], label: 'Coved ST', text: 'Elevasi ST "coved" ≥2 mm di V1–V2 diikuti T negatif: Brugada tipe 1.', kind: 'st-elevasi' }]),
  c('brugada', 41, 'L', { rhythm: sinus(94), morph: { brugada: 1, conduction: 'irbbb', qrsScale: 0.95 } }, [{ leads: ['V1', 'V2'], label: 'Coved ST', text: 'Brugada tipe 1 saat demam.', kind: 'st-elevasi' }]),
  c('brugada', 28, 'P', { rhythm: sinus(70), morph: { brugada: 1, conduction: 'irbbb', qrsScale: 0.85 } }, [{ leads: ['V1', 'V2'], label: 'Coved ST', text: 'Elevasi ST coved di V1–V2.', kind: 'st-elevasi' }]),
  c('takotsubo', 69, 'P', { rhythm: sinus(88), morph: { tExtra: [{ territory: 'anterior', mm: -5, index: 'V3' }, { territory: 'lateral', mm: -3, index: 'V5' }, { territory: 'inferior', mm: -1.5, index: 'II' }], qtc: 500 } }, [
    { leads: ['I', 'II', 'aVL', 'V2', 'V3', 'V4', 'V5', 'V6'], label: 'Inversi T difus', text: 'Inversi T dalam difus dengan QT memanjang — tidak dapat dibedakan dari SKA tanpa angiografi.', kind: 'gelombang-t' },
  ]),
  c('takotsubo', 73, 'P', { rhythm: sinus(96), morph: { st: [{ territory: 'anterior', mm: 2, index: 'V4' }, { territory: 'lateral', mm: 0.8, index: 'V5' }], qtc: 470 } }, [
    { leads: ['V2', 'V3', 'V4', 'V5'], label: 'Elevasi ST anterior', text: 'Elevasi ST anterior (fase awal) tanpa resiprokal inferior — tetap memerlukan angiografi.', kind: 'st-elevasi' },
  ]),
  // ---------------------------------------------------------------- Elektrolit, obat, metabolik
  c('hyperk-1', 58, 'L', { rhythm: sinus(76), morph: { tPeaked: 0.65 } }, [{ leads: ['V2', 'V3', 'V4', 'II'], label: 'T runcing', text: 'T tinggi, runcing, berbasis sempit (tenting).', kind: 'gelombang-t' }], { id: 'syn-hyperk-1' }),
  c('hyperk-2', 58, 'L', { rhythm: sinus(66, 240), morph: { tPeaked: 0.85, qrsWiden: 1.4, pScale: 0.45 } }, [
    { leads: RHY, label: 'P datar, PR memanjang', text: 'P melebar/mendatar dan PR memanjang.', kind: 'gelombang-p' },
    { leads: ['V2', 'V3', 'V4'], label: 'T runcing + QRS lebar', text: 'QRS mulai melebar dengan T runcing.', kind: 'qrs' },
  ], { id: 'syn-hyperk-2' }),
  c('hyperk-3', 58, 'L', { rhythm: { kind: 'junctional', rate: 96, retro: 'hidden' }, morph: { sineWave: true, pMorph: 'none' } }, [
    { leads: ALL, label: 'Pola sine wave', text: 'P hilang, QRS sangat lebar menyatu dengan T membentuk gelombang sinus: pra-henti jantung.', kind: 'qrs' },
  ], { id: 'syn-hyperk-3' }),
  c('hyperk-1', 64, 'P', { rhythm: sinus(84), morph: { tPeaked: 0.8, qrsScale: 0.9 } }, [{ leads: ['V2', 'V3', 'V4'], label: 'T runcing', text: 'T runcing berbasis sempit di prekordial.', kind: 'gelombang-t' }], { id: 'syn-hyperk-1b' }),
  c('hyperk-2', 71, 'P', { rhythm: sinus(52, 260), morph: { tPeaked: 0.9, qrsWiden: 1.6, pScale: 0.3 } }, [{ leads: ALL, label: 'QRS lebar + T runcing', text: 'Bradikardia, P sangat kecil, QRS lebar, T runcing.', kind: 'qrs' }], { id: 'syn-hyperk-2b' }),
  c('hypok', 46, 'P', { rhythm: sinus(80), morph: { tScale: 0.3, u: 0.18, st: [{ territory: 'subendoLateral', mm: -0.6, shape: 'downsloping' }] } }, [{ leads: ['V2', 'V3', 'V4'], label: 'Gelombang U', text: 'T mendatar dengan gelombang U menonjol (>1 mm) dan depresi ST ringan.', kind: 'gelombang-t' }]),
  c('hypok', 33, 'L', { rhythm: sinus(92), morph: { tScale: 0.25, u: 0.22, st: [{ territory: 'subendoLateral', mm: -0.8, shape: 'downsloping' }] } }, [{ leads: ['V2', 'V3', 'V4', 'V5'], label: 'Gelombang U', text: 'U > T di V2–V4.', kind: 'gelombang-t' }]),
  c('hypok', 61, 'P', { rhythm: sinus(70), morph: { tScale: 0.35, u: 0.15, qtc: 440 } }, [{ leads: ['V2', 'V3'], label: 'Gelombang U', text: 'T rendah dan U menonjol; interval QU tampak panjang.', kind: 'gelombang-t' }]),
  c('hypocalcemia', 52, 'P', { rhythm: sinus(78), morph: { qtc: 520, tWidthFixed: true } }, [{ leads: ALL, label: 'ST memanjang', text: 'QTc memanjang karena segmen ST panjang; morfologi T normal.', kind: 'interval' }]),
  c('hypocalcemia', 45, 'L', { rhythm: sinus(70), morph: { qtc: 500, tWidthFixed: true } }, [{ leads: ALL, label: 'ST memanjang', text: 'Segmen ST panjang, QTc ~500 ms.', kind: 'interval' }]),
  c('hypercalcemia', 66, 'P', { rhythm: sinus(72), morph: { qtc: 340, tWidthFixed: true } }, [{ leads: ALL, label: 'ST pendek', text: 'Segmen ST hampir tidak ada; T segera setelah QRS, QTc pendek.', kind: 'interval' }]),
  c('hypercalcemia', 58, 'L', { rhythm: sinus(80), morph: { qtc: 330, tWidthFixed: true, osborn: 0.06 } }, [{ leads: ALL, label: 'ST pendek', text: 'QTc pendek akibat ST pendek.', kind: 'interval' }]),
  c('long-qt', 39, 'P', { rhythm: sinus(68), morph: { qtc: 540, tScale: 0.9 } }, [{ leads: ALL, label: 'QT panjang', text: 'QTc >500 ms: risiko tinggi torsades.', kind: 'interval' }]),
  c('digoxin', 74, 'P', { rhythm: { kind: 'af', rate: 72, fAmp: 0.04 }, morph: { st: [{ territory: 'subendoLateral', mm: -1.5, shape: 'scooped' }], tScale: 0.4, qtc: 360 } }, [{ leads: ['V4', 'V5', 'V6', 'I', 'II'], label: 'ST scooped', text: 'Depresi ST cekung "Salvador Dali" dan QT pendek (efek digoksin) pada AF dengan respons terkendali.', kind: 'st-depresi' }]),
  c('digoxin', 69, 'L', { rhythm: sinus(64, 210), morph: { st: [{ territory: 'subendoLateral', mm: -1.3, shape: 'scooped' }], tScale: 0.45, qtc: 365 } }, [{ leads: ['V4', 'V5', 'V6'], label: 'ST scooped', text: 'Depresi ST "sagging" di lateral, T mendatar.', kind: 'st-depresi' }]),
  c('dig-toxicity', 79, 'P', { rhythm: { kind: 'bidirectional-vt', rate: 140 } }, [{ leads: ALL, label: 'VT bidireksional', text: 'Aksis QRS berganti setiap denyut: VT bidireksional (toksisitas digoksin).', kind: 'irama' }]),
  c('dig-toxicity', 82, 'L', { rhythm: { kind: 'at', rate: 170, block: 2 }, morph: { st: [{ territory: 'subendoLateral', mm: -1.0, shape: 'scooped' }], qtc: 370 } }, [{ leads: RHY, label: 'AT dengan blok', text: 'Takikardia atrium dengan blok 2:1 + efek digoksin: sugestif toksisitas.', kind: 'irama' }], { secondary: ['atrial-tachy'] }),
  c('tca', 22, 'P', { rhythm: sinus(128), morph: { qrsWiden: 1.35, tcaTerminal: 0.4 } }, [
    { leads: ['aVR'], label: 'R terminal aVR', text: 'R terminal di aVR ≥3 mm.', kind: 'qrs' },
    { leads: ['I', 'aVL', 'II'], label: 'QRS lebar', text: 'QRS ≥100 ms dengan S dalam di I/aVL (pergeseran aksis terminal ke kanan).', kind: 'qrs' },
  ]),
  c('tca', 30, 'L', { rhythm: sinus(136), morph: { qrsWiden: 1.6, tcaTerminal: 0.5 } }, [{ leads: ['aVR', 'I'], label: 'Blokade kanal Na', text: 'Sinus takikardia, QRS lebar, R terminal aVR.', kind: 'qrs' }]),
  c('tca', 45, 'P', { rhythm: sinus(118), morph: { qrsWiden: 1.25, tcaTerminal: 0.35 } }, [{ leads: ['aVR'], label: 'R terminal aVR', text: 'R terminal aVR ≥3 mm.', kind: 'qrs' }]),
  c('hypothermia', 71, 'L', { rhythm: sinus(44, 220), morph: { osborn: 0.35, qtc: 490 }, noise: { emg: 0.012, tremor: 0.05, wander: 0.03 } }, [{ leads: ['II', 'III', 'aVF', 'V3', 'V4', 'V5', 'V6'], label: 'Gelombang Osborn', text: 'Gelombang J (Osborn) di akhir QRS, bradikardia, QT panjang, artefak menggigil.', kind: 'qrs' }]),
  c('hypothermia', 63, 'P', { rhythm: { kind: 'af', rate: 46 }, morph: { osborn: 0.45, qtc: 500 }, noise: { emg: 0.01, tremor: 0.04 } }, [{ leads: ['II', 'V3', 'V4', 'V5', 'V6'], label: 'Gelombang Osborn', text: 'Gelombang Osborn besar dengan AF lambat.', kind: 'qrs' }]),
  c('hypothermia', 55, 'L', { rhythm: sinus(52, 210), morph: { osborn: 0.22, qtc: 470 } }, [{ leads: ['II', 'V4', 'V5', 'V6'], label: 'Gelombang Osborn', text: 'Gelombang J kecil.', kind: 'qrs' }]),
  // ---------------------------------------------------------------- Aritmia
  c('vt-mono', 66, 'L', { rhythm: { kind: 'vt', rate: 172, origin: 'lv-inferoapical', sinusRate: 82, captureAt: [8], fusionAt: [15] } }, [
    { leads: ALL, label: 'QRS lebar teratur', text: 'Takikardia QRS lebar ~170/menit dengan aksis northwest dan R/S <1 di V6.', kind: 'irama' },
    { leads: RHY, label: 'Capture/fusion', text: 'Capture beat (QRS sempit) dan fusion beat: bukti disosiasi AV → VT.', kind: 'irama', beats: 'capture beat' },
  ]),
  c('vt-mono', 58, 'L', { rhythm: { kind: 'vt', rate: 150, origin: 'lv-basal', sinusRate: 75 } }, [{ leads: PREC, label: 'Konkordansi positif', text: 'QRS lebar dengan konkordansi positif prekordial (tanpa RS): VT.', kind: 'qrs' }]),
  c('vt-mono', 41, 'P', { rhythm: { kind: 'vt', rate: 185, origin: 'rvot', sinusRate: 90 } }, [{ leads: ALL, label: 'VT RVOT', text: 'VT pola LBBB dengan aksis inferior (asal RVOT).', kind: 'qrs' }]),
  c('vt-mono', 29, 'L', { rhythm: { kind: 'vt', rate: 160, origin: 'fascicular', sinusRate: 80 } }, [{ leads: ALL, label: 'VT fasikular', text: 'VT relatif sempit (~130 ms) pola RBBB + aksis kiri: VT fasikular idiopatik.', kind: 'qrs' }], { level: 'lanjut' }),
  c('svt-aberrant', 47, 'P', { rhythm: { kind: 'avnrt', rate: 176 }, morph: { conduction: 'rbbb' } }, [{ leads: ['V1', 'V6', 'I'], label: 'Pola RBBB tipikal', text: 'Takikardia teratur dengan rsR′ V1 tipikal, ada RS prekordial <100 ms: SVT aberan.', kind: 'qrs' }]),
  c('svt-aberrant', 55, 'L', { rhythm: { kind: 'avrt', rate: 168 }, morph: { conduction: 'lbbb', qtc: 410 } }, [{ leads: ['V1', 'V6'], label: 'Pola LBBB tipikal', text: 'Morfologi LBBB tipikal (onset cepat, rS V1 sempit): SVT aberan — bila ragu perlakukan sebagai VT.', kind: 'qrs' }]),
  c('torsades', 62, 'P', { rhythm: sinus(60), morph: { qtc: 560 }, segments: [{ at: 3.2, rhythm: { kind: 'torsades', rate: 230 } }], durationS: 10 }, [
    { leads: RHY, label: 'QT panjang', text: 'Denyut awal dengan QT sangat panjang.', kind: 'interval', beats: 'sinus' },
    { leads: ALL, label: 'Twisting', text: 'VT polimorfik dengan amplitudo berputar mengelilingi garis dasar.', kind: 'irama', beats: 'torsades' },
  ]),
  c('torsades', 55, 'L', { rhythm: { kind: 'torsades', rate: 240 } }, [{ leads: ALL, label: 'Torsades', text: 'Polimorfik dengan "twisting of the points".', kind: 'irama' }]),
  c('torsades', 70, 'P', { rhythm: { kind: 'torsades', rate: 210, periodS: 2.0 } }, [{ leads: ALL, label: 'Torsades', text: 'Torsades de pointes.', kind: 'irama' }]),
  c('vf', 60, 'L', { rhythm: { kind: 'vf', coarse: true } }, [{ leads: ALL, label: 'VF kasar', text: 'Gelombang kacau tanpa QRS.', kind: 'irama' }]),
  c('vf', 75, 'P', { rhythm: { kind: 'vf', coarse: false } }, [{ leads: ALL, label: 'VF halus', text: 'VF halus — jangan keliru dengan asistol; naikkan gain dan periksa sadapan lain.', kind: 'irama' }]),
  c('vf', 52, 'L', { rhythm: sinus(80), morph: { st: [{ territory: 'anterior', mm: 3 }] }, segments: [{ at: 4.1, rhythm: { kind: 'vf', coarse: true } }] }, [{ leads: ALL, label: 'STEMI → VF', text: 'STEMI anterior yang berlanjut menjadi VF.', kind: 'irama' }]),
  c('asystole', 80, 'L', { rhythm: { kind: 'asystole' } }, [{ leads: ALL, label: 'Asistol', text: 'Garis datar di semua sadapan.', kind: 'irama' }]),
  c('asystole', 67, 'P', { rhythm: { kind: 'asystole', pRate: 70 } }, [{ leads: ALL, label: 'P saja', text: 'Hanya gelombang P tanpa QRS (ventricular standstill) — tetap henti jantung non-shockable; pertimbangkan pacing.', kind: 'irama' }]),
  c('mobitz2', 72, 'L', { rhythm: { kind: 'avb', degree: 'mobitz2', atrialRate: 80, prMs: 170, ratio: 4 }, morph: { conduction: 'rbbb' } }, [{ leads: RHY, label: 'P tak dikonduksikan', text: 'PR konstan lalu P tiba-tiba tidak diikuti QRS, disertai RBBB.', kind: 'irama' }]),
  c('mobitz2', 68, 'P', { rhythm: { kind: 'avb', degree: 'mobitz2', atrialRate: 75, prMs: 180, ratio: 3 }, morph: { conduction: 'rbbb-lafb' } }, [{ leads: RHY, label: 'Mobitz II', text: 'Mobitz II 3:2 dengan blok bifasikular.', kind: 'irama' }]),
  c('mobitz2', 77, 'L', { rhythm: { kind: 'avb', degree: 'mobitz2', atrialRate: 88, prMs: 160, ratio: 5 }, morph: { conduction: 'lbbb', qtc: 420 } }, [{ leads: RHY, label: 'Mobitz II', text: 'PR konstan dengan P blok intermiten, QRS lebar.', kind: 'irama' }]),
  c('mobitz1', 64, 'L', { rhythm: { kind: 'avb', degree: 'mobitz1', atrialRate: 84, prMs: 180, ratio: 4 } }, [{ leads: RHY, label: 'Wenckebach', text: 'PR memanjang progresif lalu satu P tidak dikonduksikan (4:3).', kind: 'irama' }]),
  c('av-2to1', 70, 'P', { rhythm: { kind: 'avb', degree: '2to1', atrialRate: 84, prMs: 180 } }, [{ leads: RHY, label: 'AV blok 2:1', text: 'Setiap P kedua tidak dikonduksikan; laju ventrikel setengah laju atrium.', kind: 'irama' }]),
  c('av-2to1', 76, 'L', { rhythm: { kind: 'avb', degree: '2to1', atrialRate: 90, prMs: 160 }, morph: { conduction: 'rbbb' } }, [{ leads: RHY, label: 'AV blok 2:1', text: 'AV blok 2:1 dengan RBBB (lebih mungkin infranodal).', kind: 'irama' }]),
  c('av-2to1', 59, 'L', { rhythm: { kind: 'avb', degree: '2to1', atrialRate: 76, prMs: 200 } }, [{ leads: RHY, label: 'AV blok 2:1', text: 'P tersembunyi di T pada setiap siklus kedua.', kind: 'irama' }]),
  c('chb', 81, 'P', { rhythm: { kind: 'avb', degree: 3, atrialRate: 78, escapeRate: 36, escape: 'ventricular' } }, [{ leads: RHY, label: 'Disosiasi AV', text: 'P (~78/menit) tidak berhubungan dengan QRS lebar lolos ventrikel (~36/menit).', kind: 'irama' }]),
  c('chb', 66, 'L', { rhythm: { kind: 'avb', degree: 3, atrialRate: 92, escapeRate: 48, escape: 'junctional' } }, [{ leads: RHY, label: 'Disosiasi AV', text: 'AV blok total dengan lolos junctional QRS sempit.', kind: 'irama' }]),
  c('junctional', 69, 'L', { rhythm: { kind: 'junctional', rate: 48, retro: 'before' } }, [{ leads: ['II', 'III', 'aVF'], label: 'P retrograd', text: 'P terbalik di II, III, aVF dengan PR pendek; laju 40–60.', kind: 'gelombang-p' }]),
  c('junctional', 55, 'P', { rhythm: { kind: 'junctional', rate: 52, retro: 'hidden' } }, [{ leads: RHY, label: 'Tanpa P', text: 'QRS sempit teratur tanpa P yang tampak.', kind: 'irama' }]),
  c('junctional', 74, 'L', { rhythm: { kind: 'junctional', rate: 78, retro: 'after' } }, [{ leads: ['II', 'III', 'aVF'], label: 'Junctional terakselerasi', text: 'P retrograd setelah QRS; laju 60–100.', kind: 'gelombang-p' }]),
  c('aivr', 57, 'L', { rhythm: { kind: 'aivr', rate: 74, sinusRate: 66 } }, [{ leads: ALL, label: 'AIVR', text: 'QRS lebar teratur ~74/menit dengan P sinus independen (pasca-reperfusi).', kind: 'irama' }]),
  c('aivr', 63, 'P', { rhythm: { kind: 'aivr', rate: 88, sinusRate: 80, origin: 'rvot' } }, [{ leads: ALL, label: 'AIVR', text: 'Irama idioventrikular terakselerasi.', kind: 'irama' }]),
  c('mat', 74, 'L', { rhythm: { kind: 'mat', rate: 118 } }, [{ leads: RHY, label: '≥3 bentuk P', text: 'Morfologi P bervariasi dengan PR dan RR tidak teratur.', kind: 'gelombang-p' }]),
  c('mat', 68, 'P', { rhythm: { kind: 'mat', rate: 108 }, morph: { pMorph: 'pulmonale' } }, [{ leads: RHY, label: '≥3 bentuk P', text: 'MAT pada PPOK.', kind: 'gelombang-p' }]),
  c('mat', 80, 'L', { rhythm: { kind: 'mat', rate: 126 } }, [{ leads: RHY, label: '≥3 bentuk P', text: 'MAT — bedakan dari AF.', kind: 'gelombang-p' }]),
  c('bigeminy', 61, 'L', { rhythm: { ...sinus(74), ectopy: [{ type: 'pvc', every: 2, origin: 'rvot' }] } }, [{ leads: RHY, label: 'Bigemini', text: 'PVC setiap denyut kedua.', kind: 'irama', beats: 'PVC' }]),
  c('bigeminy', 72, 'P', { rhythm: { ...sinus(80), ectopy: [{ type: 'pvc', every: 2, origin: 'lv-lateral', coupling: 0.55 }] } }, [{ leads: RHY, label: 'Bigemini', text: 'Bigemini ventrikel (PVC pola RBBB).', kind: 'irama', beats: 'PVC' }]),
  c('pvc', 50, 'L', { rhythm: { ...sinus(70), ectopy: [{ type: 'pvc', at: [4, 9], origin: 'rvot' }] } }, [{ leads: ALL, label: 'PVC', text: 'Denyut prematur lebar tanpa P, jeda kompensatoris penuh.', kind: 'qrs', beats: 'PVC' }]),
  c('pac', 44, 'P', { rhythm: { ...sinus(76), ectopy: [{ type: 'pac', at: [3, 8] }] } }, [{ leads: RHY, label: 'PAC', text: 'P prematur berbeda bentuk, QRS sempit, jeda tidak kompensatoris.', kind: 'irama', beats: 'PAC' }]),
  c('svt', 26, 'P', { rhythm: { kind: 'avnrt', rate: 186 } }, [{ leads: ['V1', 'II'], label: 'AVNRT', text: 'Takikardia QRS sempit teratur; pseudo-r′ V1/pseudo-S inferior (P retrograd).', kind: 'irama' }]),
  c('svt', 35, 'L', { rhythm: { kind: 'avrt', rate: 200 } }, [{ leads: ['II', 'III', 'aVF'], label: 'AVRT', text: 'P retrograd di segmen ST (RP ~110 ms).', kind: 'irama' }]),
  c('flutter', 67, 'L', { rhythm: { kind: 'flutter', conduction: 2 } }, [{ leads: ['II', 'III', 'aVF', 'V1'], label: 'Gelombang F', text: 'Flutter 2:1 (laju ventrikel ~150): gelombang F tersembunyi sebagian di QRS/T.', kind: 'gelombang-p' }]),
  c('flutter', 72, 'P', { rhythm: { kind: 'flutter', conduction: 4 } }, [{ leads: ['II', 'III', 'aVF'], label: 'Gigi gergaji', text: 'Flutter 4:1 dengan gelombang gigi gergaji jelas.', kind: 'gelombang-p' }]),
  c('af', 70, 'L', { rhythm: { kind: 'af', rate: 128 } }, [{ leads: RHY, label: 'Irregularly irregular', text: 'AF dengan respons ventrikel cepat.', kind: 'irama' }]),
  c('pre-excited-af', 31, 'L', { rhythm: { kind: 'af', rate: 210, irregularity: 0.28 }, morph: { conduction: 'wpw-ll', deltaS: 0.06 } }, [{ leads: ALL, label: 'AF pre-eksitasi', text: 'Takikardia QRS lebar sangat tidak teratur — hindari penyekat nodus AV.', kind: 'irama' }]),
  c('pre-excited-af', 24, 'P', { rhythm: { kind: 'af', rate: 190, irregularity: 0.3 }, morph: { conduction: 'wpw-ps', deltaS: 0.055 } }, [{ leads: ALL, label: 'AF pre-eksitasi', text: 'Laju >200/menit dengan QRS lebar bervariasi.', kind: 'irama' }]),
  c('paced', 79, 'L', { rhythm: { kind: 'paced', mode: 'DDD', rate: 70 } }, [{ leads: RHY, label: 'Pacu AV', text: 'Spike atrium dan ventrikel diikuti capture.', kind: 'irama' }]),
  c('pacing-noncapture', 83, 'P', { rhythm: { kind: 'paced', mode: 'VVI', rate: 70, fault: 'noncapture' } }, [{ leads: RHY, label: 'Gagal capture', text: 'Spike pacu tanpa QRS berikutnya.', kind: 'irama', beats: 'gagal capture' }]),
  c('pacing-noncapture', 76, 'L', { rhythm: { kind: 'paced', mode: 'VVI', rate: 60, fault: 'noncapture' } }, [{ leads: RHY, label: 'Gagal capture', text: 'Spike pacu yang tidak diikuti depolarisasi ventrikel.', kind: 'irama', beats: 'gagal capture' }]),
  c('pacing-undersensing', 80, 'L', { rhythm: { kind: 'paced', mode: 'VVI', rate: 60, fault: 'undersensing' } }, [{ leads: RHY, label: 'Undersensing', text: 'Spike muncul walau QRS intrinsik ada; sebagian jatuh di segmen ST/T.', kind: 'irama', beats: 'spike (undersensing)' }]),
  // ---------------------------------------------------------------- Konduksi tambahan
  c('rvh', 34, 'P', { rhythm: sinus(88), morph: { rvh: 1.1, strain: 'rv', pMorph: 'pulmonale' } }, [{ leads: ['V1', 'V2', 'V3'], label: 'R dominan V1 + strain', text: 'R tinggi di V1 (R/S >1), inversi T V1–V3, P pulmonal.', kind: 'qrs' }, { leads: ['I', 'V5', 'V6'], label: 'Aksis kanan', text: 'S dalam di I dan V5–V6.', kind: 'qrs' }]),
  c('rvh', 22, 'L', { rhythm: sinus(80), morph: { rvh: 1.3, strain: 'rv' } }, [{ leads: ['V1', 'V2'], label: 'R dominan V1', text: 'RVH dengan strain.', kind: 'qrs' }]),
  c('rae', 61, 'L', { rhythm: sinus(96), morph: { pMorph: 'pulmonale' } }, [{ leads: ['II', 'III', 'aVF', 'V1'], label: 'P pulmonal', text: 'P ≥2,5 mm di II/III/aVF.', kind: 'gelombang-p' }]),
  c('lbbb', 73, 'L', { rhythm: sinus(76), morph: { conduction: 'lbbb', qtc: 420 } }, [{ leads: ['I', 'aVL', 'V5', 'V6', 'V1'], label: 'LBBB', text: 'R lebar berlekuk di lateral, QS di V1, ST-T diskordan.', kind: 'qrs' }]),
  c('lafb', 64, 'P', { rhythm: sinus(70), morph: { conduction: 'lafb' } }, [{ leads: ['aVL', 'II', 'III', 'aVF'], label: 'LAFB', text: 'Aksis kiri ~−60°, qR di aVL, rS inferior.', kind: 'qrs' }]),
  c('wpw', 19, 'L', { rhythm: sinus(78, 100), morph: { conduction: 'wpw-ps', deltaS: 0.045 } }, [{ leads: ALL, label: 'Delta wave', text: 'PR pendek, gelombang delta (negatif di inferior → pseudo-infark).', kind: 'qrs' }]),
  // ---------------------------------------------------------------- Lain-lain
  c('pe', 44, 'P', { rhythm: sinus(118), morph: { s1q3t3: true, tExtra: [{ territory: 'anterior', mm: -2.5, index: 'V2' }] } }, [
    { leads: ['I', 'III'], label: 'S1Q3T3', text: 'S di I, Q dan T inversi di III.', kind: 'qrs' },
    { leads: ['V1', 'V2', 'V3'], label: 'Strain RV', text: 'T inversi V1–V3.', kind: 'gelombang-t' },
  ]),
  c('pe', 59, 'L', { rhythm: sinus(124), morph: { s1q3t3: true, conduction: 'irbbb', tExtra: [{ territory: 'anterior', mm: -2, index: 'V2' }] } }, [{ leads: ['I', 'III', 'V1', 'V2'], label: 'Strain RV akut', text: 'Sinus takikardia, S1Q3T3, RBBB inkomplet, T inversi V1–V3.', kind: 'qrs' }]),
  c('pe', 36, 'P', { rhythm: sinus(112), morph: { tExtra: [{ territory: 'anterior', mm: -2.2, index: 'V2' }, { territory: 'inferior', mm: -1.2, index: 'III' }] } }, [{ leads: ['III', 'V1', 'V2', 'V3'], label: 'T inversi III & V1–V3', text: 'Inversi T simultan di III dan V1–V3.', kind: 'gelombang-t' }]),
  c('hcm', 23, 'L', { rhythm: sinus(66), morph: { lvh: 0.8, hcmQ: 0.4, tExtra: [{ territory: 'lateral', mm: -2, index: 'V5' }] } }, [{ leads: ['I', 'aVL', 'V5', 'V6'], label: 'Dagger Q', text: 'Q dalam dan sempit di lateral dengan voltase LVH.', kind: 'qrs' }]),
  c('hcm', 31, 'P', { rhythm: sinus(72), morph: { lvh: 0.7, hcmQ: 0.35 } }, [{ leads: ['I', 'aVL', 'V5', 'V6'], label: 'Dagger Q', text: 'Q "dagger" lateral.', kind: 'qrs' }]),
  c('electrical-alternans', 52, 'P', { rhythm: sinus(118), morph: { qrsScale: 0.45, alternans: 0.35 } }, [{ leads: ALL, label: 'Alternans', text: 'Amplitudo QRS berganti besar-kecil tiap denyut dengan voltase rendah dan takikardia.', kind: 'qrs' }]),
  c('electrical-alternans', 60, 'L', { rhythm: sinus(126), morph: { qrsScale: 0.4, alternans: 0.3, tScale: 0.6 } }, [{ leads: ALL, label: 'Alternans', text: 'Alternans listrik + voltase rendah: efusi perikard besar.', kind: 'qrs' }]),
  // ---------------------------------------------------------------- Teknik
  c('misplacement-lara', 40, 'L', { rhythm: sinus(72), electrodes: 'la-ra' }, [{ leads: ['I', 'aVR', 'aVL'], label: 'Lengan tertukar', text: 'P/QRS/T terbalik di I, aVR positif; prekordial normal.', kind: 'lain' }]),
  c('misplacement-lara', 55, 'P', { rhythm: sinus(80), electrodes: 'la-ra', morph: { qrsScale: 0.9 } }, [{ leads: ['I', 'aVR', 'aVL'], label: 'Lengan tertukar', text: 'Sadapan I terbalik, progresi R prekordial normal.', kind: 'lain' }]),
  c('misplacement-rlra', 48, 'L', { rhythm: sinus(70), electrodes: 'rl-ra' }, [{ leads: ['II'], label: 'Sadapan II datar', text: 'Sadapan II hampir garis lurus.', kind: 'lain' }]),
  c('misplacement-prec', 50, 'P', { rhythm: sinus(76), electrodes: 'v2-v3' }, [{ leads: ['V2', 'V3'], label: 'Progresi R janggal', text: 'R di V2 lebih besar dari V3 — elektroda tertukar.', kind: 'lain' }]),
  c('misplacement-prec', 62, 'L', { rhythm: sinus(68), electrodes: 'v1-v2' }, [{ leads: ['V1', 'V2'], label: 'Progresi R janggal', text: 'V1 dan V2 tertukar.', kind: 'lain' }]),
  c('artifact', 72, 'P', { rhythm: sinus(76), noise: { emg: 0.01, tremor: 0.18 } }, [{ leads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'], label: 'Tremor', text: 'Osilasi ~5 Hz di sadapan ekstremitas (tremor) meniru flutter; prekordial bersih.', kind: 'lain' }]),
  c('artifact', 35, 'L', { rhythm: sinus(84), noise: { emg: 0.01, wander: 0.02, motion: [{ t0: 2.5, t1: 7.0, amp: 0.9, leads: ['I', 'II', 'V1', 'V2', 'V3'] }] } }, [{ leads: ['II', 'V1', 'V2', 'V3'], label: 'Pseudo-VT', text: 'Defleksi lebar cepat akibat gerakan; QRS sinus tetap terlihat menembus artefak.', kind: 'lain' }]),
  c('artifact', 58, 'P', { rhythm: sinus(66), noise: { emg: 0.05, mains: 0.06 } }, [{ leads: ALL, label: 'Noise', text: 'Interferensi listrik 50 Hz & noise otot — perbaiki grounding/elektroda.', kind: 'lain' }]),
  c('dextrocardia', 27, 'P', { rhythm: sinus(78), morph: { dextro: true } }, [{ leads: ['I', 'aVR', 'V4', 'V5', 'V6'], label: 'Dekstrokardia', text: 'I terbalik dan R mengecil progresif V1→V6.', kind: 'lain' }]),
  c('dextrocardia', 39, 'L', { rhythm: sinus(70), morph: { dextro: true } }, [{ leads: ['I', 'aVR', 'V4', 'V5', 'V6'], label: 'Dekstrokardia', text: 'Pola dekstrokardia.', kind: 'lain' }]),
  c('dextrocardia', 18, 'P', { rhythm: sinus(92), morph: { dextro: true, qrsScale: 0.9 } }, [{ leads: ['I', 'aVR', 'V4', 'V5', 'V6'], label: 'Dekstrokardia', text: 'Sadapan I terbalik dengan R yang makin kecil dari V1 ke V6.', kind: 'lain' }]),
  c('misplacement-lara', 66, 'L', { rhythm: { kind: 'af', rate: 88 }, electrodes: 'la-ra' }, [{ leads: ['I', 'aVR', 'aVL'], label: 'Lengan tertukar', text: 'QRS & T terbalik di I, aVR tegak; prekordial normal (AF dasar).', kind: 'lain' }]),
];

/** Seri EKG yang berevolusi (dipakai mode Kasus Klinis). */
export const SERIAL_SYNTH: SynthCase[] = [
  c('hyperacute-t', 56, 'L', { rhythm: sinus(86), morph: { tExtra: [{ territory: 'anteriorProximal', mm: 7, symmetric: true }], st: [{ territory: 'anteriorProximal', mm: 0.8 }] } }, [{ leads: ['V2', 'V3', 'V4'], label: 'T hiperakut', text: 'T besar dan simetris di V2–V4.', kind: 'gelombang-t' }], { id: 'ser-stemi-1' }),
  c('stemi-anterior', 56, 'L', { rhythm: sinus(94), morph: { st: [{ territory: 'anteriorProximal', mm: 4.5, shape: 'convex' }], tExtra: [{ territory: 'anterior', mm: 5 }] } }, [{ leads: ['V1', 'V2', 'V3', 'V4', 'aVL'], label: 'Elevasi ST', text: 'Elevasi ST anterior dengan resiprokal inferior.', kind: 'st-elevasi' }, { leads: INF, label: 'Resiprokal', text: 'Depresi ST inferior.', kind: 'st-depresi' }], { id: 'ser-stemi-2' }),
  c('old-mi-anterior', 56, 'L', { rhythm: sinus(76), morph: { oldMi: ['anteroseptal'], st: [{ territory: 'anterior', mm: 0.8 }], tExtra: [{ territory: 'anterior', mm: -3 }] } }, [{ leads: ['V1', 'V2', 'V3', 'V4'], label: 'Evolusi', text: 'Q/QS anterior dengan T inversi (evolusi pasca-reperfusi).', kind: 'qrs' }], { id: 'ser-stemi-3' }),
  c('hyperk-1', 63, 'P', { rhythm: sinus(80), morph: { tPeaked: 0.6 } }, [{ leads: ['V2', 'V3', 'V4'], label: 'T runcing tersisa', text: 'Setelah terapi: QRS kembali sempit, T masih runcing.', kind: 'gelombang-t' }], { id: 'ser-hyperk-after' }),
  c('hyperk-3', 63, 'P', { rhythm: { kind: 'junctional', rate: 88, retro: 'hidden' }, morph: { sineWave: true, pMorph: 'none', qrsScale: 0.9 } }, [{ leads: ALL, label: 'Sine wave', text: 'P hilang, QRS sangat lebar menyatu dengan T.', kind: 'qrs' }], { id: 'ser-hyperk-before' }),
  c('sinus-normal', 27, 'P', { rhythm: sinus(84) }, [{ leads: RHY, label: 'Sinus', text: 'Irama sinus setelah konversi.', kind: 'irama' }], { id: 'ser-svt-after', reference: true }),
  c('vt-mono', 64, 'L', { rhythm: { kind: 'vt', rate: 165, origin: 'lv-inferoapical', sinusRate: 80, captureAt: [10] } }, [{ leads: ALL, label: 'VT', text: 'Takikardia QRS lebar dengan disosiasi AV.', kind: 'irama' }], { id: 'ser-vt' }),
];
