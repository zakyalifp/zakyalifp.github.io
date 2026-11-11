/** Skenario Monitor Irama Dinamis: urutan perubahan irama yang harus dikenali & direspons. */
import type { RhythmSpec } from '../ekg/synth/rhythm';
import type { MorphSpec } from '../ekg/synth/morph';
import type { Level } from './diagnoses';

export type MonitorRhythm =
  | 'sinus'
  | 'sinus-tachy'
  | 'sinus-brady'
  | 'af'
  | 'flutter'
  | 'svt'
  | 'pvc'
  | 'vt'
  | 'vf'
  | 'torsades'
  | 'asistol'
  | 'mobitz2'
  | 'chb'
  | 'aivr';

export const MONITOR_RHYTHM_LABEL: Record<MonitorRhythm, string> = {
  sinus: 'Sinus normal',
  'sinus-tachy': 'Sinus takikardia',
  'sinus-brady': 'Sinus bradikardia',
  af: 'Fibrilasi atrium',
  flutter: 'Flutter atrium',
  svt: 'SVT',
  pvc: 'PVC (bigemini/sering)',
  vt: 'Takikardia ventrikel',
  vf: 'Fibrilasi ventrikel',
  torsades: 'Torsades de pointes',
  asistol: 'Asistol',
  mobitz2: 'AV blok Mobitz II',
  chb: 'AV blok total',
  aivr: 'AIVR',
};

export type MonitorAction = 'observasi' | 'defibrilasi' | 'kardioversi' | 'adenosin' | 'atropin-pacing' | 'rjp-epinefrin' | 'magnesium' | 'rate-control' | 'cek-pasien';
export const MONITOR_ACTION_LABEL: Record<MonitorAction, string> = {
  observasi: 'Observasi / lanjut pantau',
  'cek-pasien': 'Periksa pasien & elektrolit, siapkan bila memburuk',
  defibrilasi: 'RJP + defibrilasi',
  kardioversi: 'Kardioversi tersinkron (tidak stabil) / antiaritmia',
  adenosin: 'Manuver vagal → adenosin',
  'atropin-pacing': 'Atropin / pacing transkutan',
  'rjp-epinefrin': 'RJP + epinefrin',
  magnesium: 'Magnesium sulfat IV (+ defibrilasi bila tanpa nadi)',
  'rate-control': 'Kendali laju',
};

export interface MonitorEvent {
  rhythm: RhythmSpec;
  morph?: MorphSpec;
  answer: MonitorRhythm;
  action: MonitorAction;
  /** Konteks singkat yang tampil saat kejadian (nadi, TD). */
  context: string;
  /** Lama irama ini sebelum pengguna menjawab (minimal, detik). */
  minS?: number;
}

export interface MonitorScenario {
  id: string;
  title: string;
  level: Level;
  intro: string;
  baseline: { rhythm: RhythmSpec; morph?: MorphSpec; context: string };
  events: MonitorEvent[];
}

export const MONITOR_SCENARIOS: MonitorScenario[] = [
  {
    id: 'igd-nyeri-dada',
    title: 'IGD: pasien nyeri dada dipantau',
    level: 'dasar',
    intro: 'Pria 60 tahun dengan STEMI anterior menunggu transfer. Pantau monitor dan respons setiap perubahan irama.',
    baseline: { rhythm: { kind: 'sinus', rate: 84 }, context: 'Sadar, nadi 84, TD 130/80' },
    events: [
      { rhythm: { kind: 'sinus', rate: 88, ectopy: [{ type: 'pvc', every: 2, origin: 'lv-lateral' }] }, answer: 'pvc', action: 'cek-pasien', context: 'Sadar, nadi tidak teratur, TD 126/78' },
      { rhythm: { kind: 'vt', rate: 180, origin: 'lv-inferoapical' }, answer: 'vt', action: 'kardioversi', context: 'Gelisah, nadi lemah 180, TD 80/50' },
      { rhythm: { kind: 'vf', coarse: true }, answer: 'vf', action: 'defibrilasi', context: 'Tidak responsif, nadi tidak teraba' },
      { rhythm: { kind: 'sinus', rate: 96 }, answer: 'sinus', action: 'observasi', context: 'ROSC: nadi 96, TD 104/66' },
    ],
  },
  {
    id: 'bangsal-bradikardia',
    title: 'Bangsal: pusing pada lansia',
    level: 'menengah',
    intro: 'Wanita 78 tahun dengan riwayat sinkop. Perhatikan konduksi AV.',
    baseline: { rhythm: { kind: 'sinus', rate: 64, prMs: 210 }, context: 'Sadar, nadi 64, TD 120/70' },
    events: [
      { rhythm: { kind: 'avb', degree: 'mobitz2', atrialRate: 80, prMs: 180, ratio: 3 }, morph: { conduction: 'rbbb' }, answer: 'mobitz2', action: 'atropin-pacing', context: 'Pusing, nadi 52 tidak teratur, TD 100/60' },
      { rhythm: { kind: 'avb', degree: 3, atrialRate: 84, escapeRate: 34, escape: 'ventricular' }, answer: 'chb', action: 'atropin-pacing', context: 'Somnolen, nadi 34, TD 78/48' },
      { rhythm: { kind: 'asystole', pRate: 80 }, answer: 'asistol', action: 'rjp-epinefrin', context: 'Tidak responsif, nadi tidak teraba' },
    ],
  },
  {
    id: 'palpitasi',
    title: 'Klinik: palpitasi berulang',
    level: 'dasar',
    intro: 'Wanita 30 tahun dengan riwayat berdebar.',
    baseline: { rhythm: { kind: 'sinus', rate: 78 }, context: 'Sadar, nadi 78' },
    events: [
      { rhythm: { kind: 'avnrt', rate: 190 }, answer: 'svt', action: 'adenosin', context: 'Berdebar, sadar, nadi 190, TD 108/70' },
      { rhythm: { kind: 'sinus', rate: 92 }, answer: 'sinus', action: 'observasi', context: 'Setelah adenosin: nadi 92' },
      { rhythm: { kind: 'af', rate: 140 }, answer: 'af', action: 'rate-control', context: 'Berdebar, nadi tidak teratur 140, TD 118/76' },
    ],
  },
  {
    id: 'qt-panjang',
    title: 'ICU: QT panjang',
    level: 'lanjut',
    intro: 'Pasien dengan hipokalemia dan obat pemanjang QT.',
    baseline: { rhythm: { kind: 'sinus', rate: 62 }, morph: { qtc: 540, tScale: 0.8, u: 0.1 }, context: 'Sadar, nadi 62, K⁺ 2,9' },
    events: [
      { rhythm: { kind: 'torsades', rate: 230 }, answer: 'torsades', action: 'magnesium', context: 'Kehilangan kesadaran singkat' },
      { rhythm: { kind: 'sinus', rate: 70 }, morph: { qtc: 500 }, answer: 'sinus', action: 'observasi', context: 'Setelah MgSO₄: sadar, nadi 70' },
      { rhythm: { kind: 'flutter', conduction: 2 }, answer: 'flutter', action: 'rate-control', context: 'Berdebar, nadi 150 sangat teratur, TD stabil' },
    ],
  },
  {
    id: 'pasca-reperfusi',
    title: 'Pasca-reperfusi',
    level: 'lanjut',
    intro: 'Pria 58 tahun setelah fibrinolitik untuk STEMI inferior.',
    baseline: { rhythm: { kind: 'sinus', rate: 76 }, context: 'Nyeri berkurang, nadi 76' },
    events: [
      { rhythm: { kind: 'aivr', rate: 78, sinusRate: 70 }, answer: 'aivr', action: 'observasi', context: 'Stabil, nadi 78, TD 120/76' },
      { rhythm: { kind: 'sinus', rate: 50 }, answer: 'sinus-brady', action: 'observasi', context: 'Asimtomatik, nadi 50, TD 118/70' },
      { rhythm: { kind: 'sinus', rate: 118 }, answer: 'sinus-tachy', action: 'cek-pasien', context: 'Gelisah, nadi 118 (cari nyeri, perdarahan, hipovolemia)' },
    ],
  },
];
