/**
 * Katalog tindakan. Setiap tindakan: label, fase, rasional (untuk Mode Belajar),
 * parameter (diisi pengguna), prasyarat, durasi, dan efeknya pada state.
 * Semua angka klinis diambil dari ../clinical/guidelines.
 */
import type { Domain, Scenario } from './schema';
import type { Params, SimState } from './state';
import {
  ACCESS,
  AIRWAY,
  COMPRESSIONS,
  CORD,
  EPINEPHRINE,
  GLUCOSE,
  HEART_RATE,
  OXYGEN,
  PNEUMOTHORAX,
  POST_RESUSCITATION,
  SIM,
  TEMPERATURE,
  TIMING,
  UI_OPTIONS,
  VENTILATION,
  VOLUME_EXPANDER,
  acceptableEttSizes,
  initialFio2Range,
  lmaAppropriate,
  needsPlasticWrap,
  pipMax,
  pipRange,
  recommendedBlade,
  recommendedEttDepth,
  round3,
} from '../clinical/guidelines';
import { MODEL } from './model';
import { ventInterrupted } from './physiology';

export type ActionGroup =
  | 'persiapan'
  | 'langkah-awal'
  | 'penilaian'
  | 'ventilasi'
  | 'jalan-napas'
  | 'sirkulasi'
  | 'obat'
  | 'komunikasi'
  | 'pasca';

export const GROUP_LABEL: Record<ActionGroup, string> = {
  persiapan: 'Persiapan',
  'langkah-awal': 'Langkah awal',
  penilaian: 'Penilaian & monitor',
  ventilasi: 'Ventilasi',
  'jalan-napas': 'Jalan napas lanjutan',
  sirkulasi: 'Sirkulasi',
  obat: 'Akses & obat',
  komunikasi: 'Komunikasi',
  pasca: 'Pascaresusitasi',
};

export type ParamDef =
  | { name: string; label: string; type: 'select'; options: Array<{ value: string | number; label: string }>; help?: string }
  | { name: string; label: string; type: 'number'; unit: string; step: number; min: number; max: number; help?: string }
  | { name: string; label: string; type: 'checkbox'; help?: string };

export interface Ctx {
  s: SimState;
  sc: Scenario;
  p: Params;
  judge: (code: string, ok: boolean, domain: Domain, msg: string, critical?: boolean) => void;
  note: (detail: string) => void;
}

export interface ActionDef {
  id: string;
  label: string;
  group: ActionGroup;
  rationale: string;
  prebirthOnly?: boolean;
  params?: (s: SimState, sc: Scenario) => ParamDef[];
  /** true = boleh; string = alasan tidak tersedia */
  available: (s: SimState, sc: Scenario) => true | string;
  /** Tangan yang dibutuhkan selama tindakan berlangsung (default 0). */
  hands?: (s: SimState) => number;
  duration?: (s: SimState, sc: Scenario, p: Params) => number;
  interruptsVent?: boolean;
  start?: (c: Ctx) => void | string; // string = ditolak dengan pesan
  complete?: (c: Ctx) => void;
  /** Ditampilkan menonjol (tombol besar) */
  primary?: boolean;
}

// ---------------------------------------------------------------------------
// Bantuan
// ---------------------------------------------------------------------------
const born = (s: SimState): true | string => (s.phase === 'running' ? true : 'Tersedia setelah bayi lahir.');
const num = (p: Params, k: string) => Number(p[k]);
const str = (p: Params, k: string) => String(p[k] ?? '');
const fmt = (n: number, d = 2) => n.toLocaleString('id-ID', { maximumFractionDigits: d });

export function handsInUse(s: SimState): number {
  let n = 0;
  if (s.vent.mode === 'ppv' || s.vent.mode === 'cpap') n += 1;
  if (s.compressions.active) n += 1;
  for (const b of s.busy) n += b.hands;
  return n;
}
export function freeHands(s: SimState): number {
  return s.staff - handsInUse(s);
}
const cordClamped = (s: SimState) => s.cord.clampedAt !== null && s.cord.clampedAt <= s.t;
const accessReady = (s: SimState) =>
  (s.access.uvcAt !== null && s.access.uvcAt <= s.t) || (s.access.ioAt !== null && s.access.ioAt <= s.t);
const isBusyWith = (s: SimState, id: string) => s.busy.some((b) => b.action === id);

function ensureCordClamped(c: Ctx) {
  const { s } = c;
  if (s.cord.decision === 'belum') {
    s.cord.decision = 'segera';
    s.cord.clampedAt = s.t;
    c.note('Tali pusat dijepit (tanpa keputusan eksplisit).');
    c.judge('cord-no-decision', false, 'langkahAwal', 'Putuskan penanganan tali pusat secara eksplisit sejak awal (tunda ≥60 detik bila bayi bugar).');
  }
}

function fio2Options(sc: Scenario): Array<{ value: number; label: string }> {
  const e = sc.equipment;
  if (!e.oxygen) return [{ value: OXYGEN.SIB_FIO2_ROOM_AIR, label: `${OXYGEN.SIB_FIO2_ROOM_AIR}% (udara ruang — tidak ada O₂)` }];
  if (!e.blender) {
    const opts: Array<{ value: number; label: string }> = [
      { value: OXYGEN.SIB_FIO2_ROOM_AIR, label: `${OXYGEN.SIB_FIO2_ROOM_AIR}% — balon tanpa O₂` },
      { value: OXYGEN.SIB_FIO2_NO_RESERVOIR, label: `±${OXYGEN.SIB_FIO2_NO_RESERVOIR}% — O₂ tanpa reservoir` },
    ];
    if (e.reservoir) opts.push({ value: OXYGEN.SIB_FIO2_WITH_RESERVOIR, label: `±90–${OXYGEN.SIB_FIO2_WITH_RESERVOIR}% — O₂ + reservoir` });
    return opts;
  }
  return UI_OPTIONS.FIO2.map((v) => ({ value: v, label: `${v}%` }));
}


function ventParams(s: SimState, sc: Scenario, includeMask: boolean): ParamDef[] {
  const defs: ParamDef[] = [];
  if (includeMask) {
    defs.push({
      name: 'device',
      label: 'Alat',
      type: 'select',
      options: [
        { value: 'balon', label: 'Balon mengembang sendiri (SIB)' },
        ...(sc.equipment.tPiece ? [{ value: 't-piece', label: 'T-piece resuscitator' }] : []),
      ],
    });
    defs.push({
      name: 'mask',
      label: 'Ukuran masker',
      type: 'select',
      options: [
        { value: 'kecil', label: 'Kecil (prematur)' },
        { value: 'besar', label: 'Besar (aterm)' },
      ],
      help: 'Masker menutupi dagu, mulut, dan hidung — tidak menekan mata.',
    });
  }
  defs.push(
    { name: 'pip', label: 'PIP', type: 'select', options: UI_OPTIONS.PIP.map((v) => ({ value: v, label: `${v} cmH₂O` })) },
    { name: 'peep', label: 'PEEP', type: 'select', options: UI_OPTIONS.PEEP.map((v) => ({ value: v, label: `${v} cmH₂O` })) },
    { name: 'fio2', label: 'FiO₂', type: 'select', options: fio2Options(sc) },
    { name: 'rate', label: 'Laju', type: 'select', options: UI_OPTIONS.RATE.map((v) => ({ value: v, label: `${v}/menit` })) },
  );
  void s;
  return defs;
}

function judgeVentSettings(c: Ctx, initial: boolean) {
  const { s, sc, p } = c;
  const ga = sc.hidden.gaWeeks;
  const pip = num(p, 'pip');
  const peep = num(p, 'peep');
  const rate = num(p, 'rate');
  const fio2 = num(p, 'fio2');
  const pr = pipRange(ga);
  if (initial) {
    c.judge(
      'pip-start',
      pip >= pr.min && pip <= pr.max,
      'ventilasi',
      pip >= pr.min && pip <= pr.max
        ? `PIP awal ${pip} cmH₂O sesuai (${pr.min}–${pr.max}).`
        : `PIP awal ${pip} cmH₂O di luar rentang awal yang dianjurkan (${pr.min}–${pr.max} cmH₂O).`,
    );
    const fr = initialFio2Range(ga);
    const okF = fio2 >= fr.min && fio2 <= fr.max;
    const sibLimited = !sc.equipment.blender && fio2 === OXYGEN.SIB_FIO2_ROOM_AIR && fr.min <= OXYGEN.SIB_FIO2_ROOM_AIR;
    c.judge(
      'fio2-start',
      okF || sibLimited,
      'ventilasi',
      okF || sibLimited
        ? `FiO₂ awal ${fio2}% sesuai untuk usia gestasi ${ga} minggu.`
        : `FiO₂ awal untuk ${ga} minggu sebaiknya ${fr.min === fr.max ? fr.min + '%' : fr.min + '–' + fr.max + '%'} (dipilih ${fio2}%).`,
    );
  } else if (s.vent.pip > 0 && pip - s.vent.pip > 10) {
    c.judge('pip-jump', false, 'ventilasi', `Naikkan tekanan bertahap (${VENTILATION.PIP_STEP_CMH2O}–10 cmH₂O), bukan melompat ${pip - s.vent.pip} cmH₂O.`);
  }
  if (pip > pipMax(ga)) {
    c.judge('pip-excess', false, 'ventilasi', `PIP ${pip} cmH₂O melebihi batas ${pipMax(ga)} cmH₂O untuk bayi ini — risiko pneumotoraks.`);
  }
  const peepOk = peep >= VENTILATION.PEEP_ACCEPTABLE_CMH2O.min && peep <= VENTILATION.PEEP_ACCEPTABLE_CMH2O.max;
  c.judge('peep', peepOk, 'ventilasi', peepOk ? `PEEP ${peep} cmH₂O sesuai.` : `PEEP yang dianjurkan ${VENTILATION.PEEP_CMH2O} cmH₂O (dipilih ${peep}).`);
  const rateOk = rate >= VENTILATION.RATE_PER_MIN.min && rate <= VENTILATION.RATE_PER_MIN.max;
  if (!s.compressions.active)
    c.judge('rate', rateOk, 'ventilasi', rateOk ? `Laju ${rate}/menit sesuai.` : `Laju VTP ${VENTILATION.RATE_PER_MIN.min}–${VENTILATION.RATE_PER_MIN.max}/menit (dipilih ${rate}).`);
}

function applyVentSettings(s: SimState, p: Params) {
  s.vent.pip = num(p, 'pip');
  s.vent.peep = num(p, 'peep');
  s.vent.fio2 = num(p, 'fio2');
  s.vent.rate = num(p, 'rate');
}

function ppvIndicatedNow(s: SimState): boolean {
  return s.drive < 0.5 || s.hr < HEART_RATE.PPV_BELOW_BPM;
}

export const EQUIPMENT_ITEMS: Array<{ id: string; label: string; needed: (sc: Scenario) => boolean; avail: (sc: Scenario) => boolean }> = [
  { id: 'penghangat', label: 'Penghangat radiant menyala, kain hangat', needed: () => true, avail: (sc) => sc.equipment.radiantWarmer },
  { id: 'isap', label: 'Balon/kateter isap & alat isap', needed: () => true, avail: () => true },
  { id: 'balon-masker', label: 'Balon/T-piece + masker 2 ukuran', needed: () => true, avail: () => true },
  { id: 'oksigen', label: 'Sumber O₂ & blender', needed: () => true, avail: (sc) => sc.equipment.oxygen },
  { id: 'oksimeter', label: 'Pulse oximeter + sensor', needed: () => true, avail: (sc) => sc.equipment.pulseOximeter },
  { id: 'stetoskop', label: 'Stetoskop', needed: () => true, avail: () => true },
  { id: 'lma-ett', label: `LMA ukuran ${AIRWAY.LMA_SIZE}, laringoskop, ETT, detektor CO₂`, needed: () => true, avail: (sc) => sc.equipment.lma || sc.equipment.intubation },
  { id: 'obat', label: `Epinefrin ${fmt(EPINEPHRINE.CONCENTRATION_MG_PER_ML, 2)} mg/mL, NaCl 0,9%, spuit`, needed: () => true, avail: (sc) => sc.equipment.epinephrine },
  { id: 'uvc', label: 'Set kateter umbilikal / jarum IO', needed: () => true, avail: (sc) => sc.equipment.uvc || sc.equipment.io },
  { id: 'plastik-topi', label: 'Plastik polietilen & topi', needed: (sc) => needsPlasticWrap(sc.hidden.gaWeeks, sc.hidden.weightKg), avail: () => true },
  { id: 'cpap', label: 'Perangkat CPAP / T-piece dengan PEEP', needed: (sc) => sc.hidden.gaWeeks < OXYGEN.GA_TERM_THRESHOLD_WEEKS, avail: (sc) => sc.equipment.tPiece },
  { id: 'ogt', label: 'Pipa orogastrik', needed: (sc) => sc.hidden.cdh, avail: () => true },
];

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------
export const ACTIONS: ActionDef[] = [
  // ======================= PERSIAPAN =======================
  {
    id: 'prep-risk',
    label: 'Penilaian faktor risiko (4 pertanyaan)',
    group: 'persiapan',
    prebirthOnly: true,
    rationale:
      'Empat pertanyaan pra-kelahiran: usia gestasi, kejernihan air ketuban, faktor risiko tambahan, dan rencana tali pusat — menentukan jumlah personel dan alat.',
    available: (s) => (s.phase === 'prebirth' ? true : 'Hanya sebelum bayi lahir.'),
    start: (c) => {
      const pb = c.sc.prebirth;
      c.note(`Usia gestasi: ${pb.gestation}. Air ketuban: ${pb.amnioticFluid}. Faktor risiko: ${pb.riskFactors.join('; ') || 'tidak ada'}. Rencana tali pusat: ${pb.cordPlan}.`);
      c.judge('prep-risk', true, 'persiapan', 'Penilaian risiko pra-kelahiran dilakukan.');
    },
  },
  {
    id: 'prep-team',
    label: 'Briefing tim & pembagian peran',
    group: 'persiapan',
    prebirthOnly: true,
    rationale:
      'Briefing singkat menetapkan pemimpin, petugas jalan napas, sirkulasi/obat, dan pencatat waktu; mengurangi kebingungan saat krisis.',
    available: (s) => (s.phase === 'prebirth' ? true : 'Hanya sebelum bayi lahir.'),
    params: () => [
      { name: 'pemimpin', label: 'Pemimpin tim ditetapkan', type: 'checkbox' },
      { name: 'jalanNapas', label: 'Petugas jalan napas/ventilasi', type: 'checkbox' },
      { name: 'sirkulasi', label: 'Petugas sirkulasi/obat', type: 'checkbox' },
      { name: 'pencatat', label: 'Pencatat waktu & tindakan', type: 'checkbox' },
    ],
    start: (c) => {
      const roles = ['pemimpin', 'jalanNapas', 'sirkulasi', 'pencatat'].filter((k) => c.p[k] === true);
      const ok = c.p.pemimpin === true && c.p.jalanNapas === true && (c.p.sirkulasi === true || c.p.pencatat === true);
      c.note(`Peran dibagi: ${roles.length ? roles.join(', ') : 'tidak ada'}.`);
      c.judge('prep-team', ok, 'persiapan', ok ? 'Peran tim jelas.' : 'Tetapkan peran inti: pemimpin, jalan napas, sirkulasi/obat, pencatat.');
    },
  },
  {
    id: 'prep-equipment',
    label: 'Checklist alat resusitasi',
    group: 'persiapan',
    prebirthOnly: true,
    rationale: 'Alat diperiksa berfungsi sebelum lahir: penghangat, isap, balon & masker, O₂, oksimeter, jalan napas lanjutan, obat.',
    available: (s) => (s.phase === 'prebirth' ? true : 'Hanya sebelum bayi lahir.'),
    params: (_s, sc) =>
      EQUIPMENT_ITEMS.map((it) => ({
        name: it.id,
        label: it.avail(sc) ? it.label : `${it.label} (tidak tersedia di fasilitas ini)`,
        type: 'checkbox' as const,
      })),
    start: (c) => {
      const missing = EQUIPMENT_ITEMS.filter((it) => it.needed(c.sc) && it.avail(c.sc) && c.p[it.id] !== true);
      c.note(missing.length ? `Belum diperiksa: ${missing.map((m) => m.label).join('; ')}.` : 'Semua alat yang tersedia diperiksa.');
      c.judge(
        'prep-equipment',
        missing.length === 0,
        'persiapan',
        missing.length === 0 ? 'Checklist alat lengkap.' : `Checklist belum lengkap: ${missing.map((m) => m.label).join('; ')}.`,
      );
      c.s.flags.equipmentChecked = missing.length === 0;
    },
  },
  {
    id: 'birth',
    label: 'Bayi lahir — mulai jam',
    group: 'persiapan',
    prebirthOnly: true,
    primary: true,
    rationale: 'Jam resusitasi dimulai saat bayi lahir.',
    available: (s) => (s.phase === 'prebirth' ? true : 'Bayi sudah lahir.'),
    start: (c) => {
      c.s.phase = 'running';
      c.s.t = 0;
      c.note('Bayi lahir.');
    },
  },

  // ======================= LANGKAH AWAL =======================
  {
    id: 'cord',
    label: 'Keputusan tali pusat',
    group: 'langkah-awal',
    primary: true,
    rationale: `Bayi bugar: tunda penjepitan ≥${CORD.DELAYED_CLAMP_MIN_S} detik. Bayi tidak bugar yang perlu VTP: jangan tunda resusitasi; pada ${CORD.MILKING_NONVIGOROUS_GA.min}–${CORD.MILKING_NONVIGOROUS_GA.max} minggu intact cord milking dapat dipertimbangkan; milking tidak untuk <${CORD.MILKING_MIN_GA_WEEKS} minggu.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.cord.decision !== 'belum' ? 'Keputusan sudah dibuat.' : true),
    params: () => [
      {
        name: 'pilihan',
        label: 'Penanganan tali pusat',
        type: 'select',
        options: [
          { value: 'tunda', label: `Tunda penjepitan ≥${CORD.DELAYED_CLAMP_MIN_S} detik` },
          { value: 'segera', label: 'Jepit & potong segera' },
          { value: 'milking', label: 'Intact cord milking lalu jepit' },
        ],
      },
    ],
    start: (c) => {
      const { s, sc } = c;
      const choice = str(c.p, 'pilihan') as 'tunda' | 'segera' | 'milking';
      const ga = sc.hidden.gaWeeks;
      s.cord.decision = choice;
      if (choice === 'tunda') {
        s.cord.clampedAt = s.t + CORD.DELAYED_CLAMP_MIN_S;
        c.note(`Penjepitan ditunda sampai detik ${s.cord.clampedAt}; langkah awal dilakukan di perut ibu.`);
        c.judge(
          'cord',
          sc.vigorousAtBirth,
          'langkahAwal',
          sc.vigorousAtBirth
            ? `Tepat: bayi bugar — penundaan penjepitan ≥${CORD.DELAYED_CLAMP_MIN_S} detik.`
            : 'Bayi tidak bugar dan perlu ventilasi — menunda penjepitan tanpa resusitasi menunda VTP.',
          !sc.vigorousAtBirth,
        );
      } else if (choice === 'milking') {
        s.cord.clampedAt = s.t;
        const ok = !sc.vigorousAtBirth && ga >= CORD.MILKING_NONVIGOROUS_GA.min && ga <= CORD.MILKING_NONVIGOROUS_GA.max;
        const harmful = ga < CORD.MILKING_MIN_GA_WEEKS;
        c.judge(
          'cord',
          ok,
          'langkahAwal',
          harmful
            ? `Intact cord milking tidak dianjurkan pada <${CORD.MILKING_MIN_GA_WEEKS} minggu (risiko perdarahan intraventrikular berat).`
            : ok
              ? 'Intact cord milking dapat dipertimbangkan pada bayi aterm/late-preterm tidak bugar.'
              : sc.vigorousAtBirth
                ? `Bayi bugar: pilihan utama adalah penundaan penjepitan ≥${CORD.DELAYED_CLAMP_MIN_S} detik.`
                : `Milking pada bayi tidak bugar hanya dipertimbangkan pada ${CORD.MILKING_NONVIGOROUS_GA.min}–${CORD.MILKING_NONVIGOROUS_GA.max} minggu.`,
          harmful,
        );
      } else {
        s.cord.clampedAt = s.t;
        c.judge(
          'cord',
          !sc.vigorousAtBirth,
          'langkahAwal',
          sc.vigorousAtBirth
            ? `Bayi bugar sebaiknya mendapat penundaan penjepitan ≥${CORD.DELAYED_CLAMP_MIN_S} detik.`
            : 'Tepat: bayi tidak bugar — tali pusat dijepit agar resusitasi segera dimulai.',
        );
      }
    },
  },
  {
    id: 'cord-clamp-now',
    label: 'Hentikan penundaan & jepit sekarang',
    group: 'langkah-awal',
    rationale: 'Bila selama penundaan bayi ternyata apnea/megap-megap atau HR turun, jepit tali pusat dan mulai resusitasi.',
    available: (s) => (s.phase === 'running' && s.cord.decision === 'tunda' && !cordClamped(s) ? true : 'Tidak dalam penundaan penjepitan.'),
    start: (c) => {
      c.s.cord.clampedAt = c.s.t;
      c.note('Tali pusat dijepit lebih awal.');
    },
  },
  {
    id: 'initial-assess',
    label: 'Penilaian awal: cukup bulan? tonus? napas/menangis?',
    group: 'langkah-awal',
    primary: true,
    rationale: 'Tiga pertanyaan cepat menentukan apakah bayi dapat tetap bersama ibu atau dibawa ke penghangat untuk langkah awal.',
    available: born,
    start: (c) => {
      const { s, sc } = c;
      s.initialAssessed = true;
      const breath = s.drive > 0.85 ? 'menangis' : s.drive > 0.5 ? 'bernapas' : s.drive > 0.1 ? 'megap-megap' : 'apnea';
      const tone = s.tone > 0.7 ? 'baik (fleksi)' : s.tone > 0.35 ? 'agak lemah' : 'lemas';
      c.note(`Cukup bulan: ${sc.hidden.gaWeeks >= 37 ? 'ya' : 'tidak'} (${sc.hidden.gaWeeks} mgg). Tonus: ${tone}. Napas: ${breath}.`);
      c.judge('initial-assess', true, 'langkahAwal', 'Penilaian awal dilakukan.');
    },
  },
  {
    id: 'warmer',
    label: 'Letakkan di bawah penghangat radiant',
    group: 'langkah-awal',
    rationale: 'Mencegah hipotermia. Pada bayi bugar, kontak kulit ke kulit dengan ibu adalah alternatif yang dianjurkan.',
    available: (s, sc) => {
      if (s.phase !== 'running') return 'Tersedia setelah bayi lahir.';
      if (!sc.equipment.radiantWarmer) return 'Penghangat radiant tidak tersedia — gunakan kontak kulit ke kulit / kain hangat.';
      if (s.warmer) return 'Sudah di bawah penghangat.';
      if (s.cord.decision === 'tunda' && !cordClamped(s)) return 'Tali pusat belum dijepit (penundaan berjalan).';
      return true;
    },
    start: (c) => {
      ensureCordClamped(c);
      c.s.warmer = true;
      c.s.skinToSkin = false;
      c.judge('warmer', true, 'langkahAwal', 'Bayi di bawah penghangat.');
    },
  },
  {
    id: 'dry',
    label: 'Keringkan & ganti kain basah',
    group: 'langkah-awal',
    rationale: `Mengeringkan mengurangi kehilangan panas dan sekaligus menstimulasi napas. Bayi <${TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS} minggu atau BL <${fmt(TEMPERATURE.PLASTIC_WRAP_BELOW_WEIGHT_KG * 1000, 0)} g: JANGAN dikeringkan (kecuali wajah) — langsung dibungkus plastik.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.dried ? 'Sudah dikeringkan.' : true),
    duration: () => SIM.DURATION_S.dry,
    hands: () => 1,
    complete: (c) => {
      c.s.dried = true;
      c.s.stimulated = true;
      const vp = needsPlasticWrap(c.sc.hidden.gaWeeks, c.sc.hidden.weightKg);
      if (vp) c.judge('dry-very-preterm', false, 'langkahAwal', `Bayi <${TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS} minggu atau BL <${fmt(TEMPERATURE.PLASTIC_WRAP_BELOW_WEIGHT_KG * 1000, 0)} g sebaiknya langsung dibungkus plastik tanpa dikeringkan (kecuali wajah).`);
      else c.judge('dry', true, 'langkahAwal', 'Bayi dikeringkan (juga menstimulasi napas).');
    },
  },
  {
    id: 'stimulate',
    label: 'Stimulasi taktil (gosok punggung/telapak kaki)',
    group: 'langkah-awal',
    rationale: 'Stimulasi singkat dapat memicu napas pada apnea primer. Jangan menunda VTP bila bayi tetap apnea.',
    available: born,
    duration: () => SIM.DURATION_S.stimulate,
    complete: (c) => {
      c.s.stimulated = true;
    },
  },
  {
    id: 'position',
    label: 'Posisi menghidu (sniffing)',
    group: 'langkah-awal',
    rationale: 'Kepala sedikit ekstensi membuka jalan napas; hindari fleksi atau hiperekstensi. Ganjal bahu bila perlu.',
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.positioned ? 'Sudah diposisikan.' : true),
    duration: () => SIM.DURATION_S.position,
    complete: (c) => {
      c.s.positioned = true;
      c.s.mr.R = true;
    },
  },
  {
    id: 'suction',
    label: 'Isap mulut lalu hidung',
    group: 'langkah-awal',
    rationale: 'Isap hanya bila ada sekret yang menyumbat jalan napas atau perlu VTP dengan dugaan sumbatan. Isap rutin tidak dianjurkan dan dapat menyebabkan bradikardia.',
    available: born,
    duration: () => SIM.DURATION_S.suction,
    complete: (c) => {
      const { s, sc } = c;
      const indicated = sc.hidden.secretions || sc.hidden.meconium || sc.hidden.obstruction !== 'none';
      s.suctioned = true;
      s.mr.S = true;
      if (!indicated) {
        c.judge('suction-not-indicated', false, 'langkahAwal', 'Isap rutin tanpa sumbatan tidak dianjurkan (risiko bradikardia vagal, cedera mukosa).');
        if (s.hr >= HEART_RATE.PPV_BELOW_BPM) s.hr = Math.max(60, s.hr - MODEL.SUCTION_VAGAL_HR_DROP);
      } else {
        c.judge('suction', true, 'langkahAwal', 'Isap dilakukan karena ada sekret/sumbatan.');
      }
    },
  },
  {
    id: 'wrap',
    label: 'Bungkus plastik polietilen (tanpa dikeringkan)',
    group: 'langkah-awal',
    rationale: `Untuk bayi <${TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS} minggu atau BL <${fmt(TEMPERATURE.PLASTIC_WRAP_BELOW_WEIGHT_KG * 1000, 0)} g: bungkus tubuh dengan plastik tanpa dikeringkan, beri topi, di bawah penghangat.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.wrapped ? 'Sudah dibungkus.' : true),
    duration: () => SIM.DURATION_S.wrap,
    hands: () => 1,
    complete: (c) => {
      c.s.wrapped = true;
      c.judge('wrap', true, 'langkahAwal', 'Bayi dibungkus plastik.');
    },
  },
  {
    id: 'hat',
    label: 'Pasang topi',
    group: 'langkah-awal',
    rationale: 'Kepala bayi adalah area besar kehilangan panas.',
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.hat ? 'Sudah memakai topi.' : true),
    duration: () => SIM.DURATION_S.hat,
    complete: (c) => {
      c.s.hat = true;
    },
  },
  {
    id: 'skin-to-skin',
    label: 'Kontak kulit ke kulit dengan ibu',
    group: 'langkah-awal',
    rationale: 'Untuk bayi bugar: menjaga suhu, mendukung menyusu dini, dan ikatan ibu–bayi. Juga dasar metode kanguru.',
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.skinToSkin ? 'Sudah kontak kulit.' : true),
    start: (c) => {
      const { s } = c;
      const needsSupport = s.vent.mode !== 'none' || s.compressions.active || ppvIndicatedNow(s);
      s.skinToSkin = true;
      s.warmer = false;
      if (needsSupport) c.judge('skin-to-skin', false, 'langkahAwal', 'Bayi yang perlu VTP/kompresi harus berada di area resusitasi, bukan di dada ibu.');
      else c.judge('skin-to-skin', true, 'langkahAwal', 'Kontak kulit ke kulit untuk bayi bugar.');
    },
  },

  // ======================= PENILAIAN =======================
  {
    id: 'auscultate',
    label: 'Hitung HR dengan stetoskop (6 detik)',
    group: 'penilaian',
    primary: true,
    rationale: `Dengarkan prekordium selama ${HEART_RATE.AUSCULTATION_WINDOW_S} detik, kalikan ${HEART_RATE.AUSCULTATION_MULTIPLIER}. HR adalah indikator terpenting respons resusitasi.`,
    available: born,
    params: () => [{ name: 'userHr', label: 'Hasil hitung Anda', type: 'number', unit: '/menit', step: 10, min: 0, max: 300 }],
    start: (c) => {
      const actual = Math.round(c.s.hr);
      const user = c.p.userHr === undefined || c.p.userHr === '' ? NaN : num(c.p, 'userHr');
      c.s.lastAuscultation = { t: c.s.t, hr: actual, userHr: Number.isNaN(user) ? undefined : user };
      if (Number.isNaN(user)) {
        c.note(`HR terdengar ±${actual}/menit.`);
        return;
      }
      const ok = Math.abs(user - actual) <= HEART_RATE.AUSCULTATION_TOLERANCE_BPM;
      c.note(`Hitungan Anda ${user}/menit; HR sebenarnya ±${actual}/menit.`);
      c.judge('hr-count', ok, 'langkahAwal', ok ? 'Hitungan HR akurat.' : `Hitungan HR meleset (Anda ${user}, sebenarnya ±${actual}/menit).`);
    },
  },
  {
    id: 'assess-breathing',
    label: 'Nilai napas, tonus, warna',
    group: 'penilaian',
    rationale: 'Nilai ulang napas dan tonus. Warna kulit tidak dapat diandalkan untuk menilai oksigenasi — gunakan oksimeter.',
    available: born,
    start: (c) => {
      const s = c.s;
      const breath = s.drive > 0.85 ? 'menangis kuat' : s.drive > 0.5 ? 'napas spontan teratur' : s.drive > 0.1 ? 'megap-megap' : 'apnea';
      c.note(`Napas: ${breath}. Tonus: ${s.tone > 0.7 ? 'baik' : s.tone > 0.35 ? 'sedang' : 'lemas'}.`);
    },
  },
  {
    id: 'pulse-ox',
    label: 'Pasang pulse oximeter',
    group: 'penilaian',
    primary: true,
    rationale: 'Pasang di tangan/pergelangan KANAN (preduktal) saat VTP diantisipasi atau dimulai. Sinyal butuh waktu untuk stabil.',
    available: (s, sc) =>
      s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.pulseOximeter ? 'Pulse oximeter tidak tersedia di fasilitas ini.' : s.pulseOx.site ? 'Sensor sudah terpasang.' : true,
    params: () => [
      {
        name: 'lokasi',
        label: 'Lokasi sensor',
        type: 'select',
        options: [
          { value: 'tangan-kanan', label: 'Tangan/pergelangan kanan' },
          { value: 'tangan-kiri', label: 'Tangan kiri' },
          { value: 'kaki', label: 'Kaki' },
        ],
      },
    ],
    duration: () => SIM.DURATION_S.pulseOx,
    complete: (c) => {
      const site = str(c.p, 'lokasi') as 'tangan-kanan' | 'tangan-kiri' | 'kaki';
      c.s.pulseOx = { site, placedAt: c.s.t };
      const ok = site === 'tangan-kanan';
      c.judge('pulseox-site', ok, 'ventilasi', ok ? 'Sensor preduktal (tangan kanan) — benar.' : 'Target SpO₂ resusitasi adalah PREDUKTAL: pasang di tangan/pergelangan kanan.');
    },
  },
  {
    id: 'ecg',
    label: 'Pasang EKG 3 sadapan',
    group: 'penilaian',
    rationale: 'EKG memberi HR paling akurat dan cepat, terutama saat perfusi buruk, saat kompresi, atau bila oksimeter belum membaca.',
    available: (s, sc) =>
      s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.ecgMonitor ? 'Monitor EKG tidak tersedia.' : s.ecg.placedAt !== null ? 'EKG sudah terpasang.' : true,
    duration: () => SIM.DURATION_S.ecg,
    complete: (c) => {
      c.s.ecg.placedAt = c.s.t;
      c.judge('ecg', true, 'ventilasi', 'EKG terpasang — HR terbaca kontinu.');
    },
  },
  {
    id: 'temp-probe',
    label: 'Ukur suhu aksila / pasang probe suhu',
    group: 'penilaian',
    rationale: `Target suhu ${TEMPERATURE.TARGET_C.min}–${TEMPERATURE.TARGET_C.max} °C. Hipotermia dan hipertermia sama-sama merugikan.`,
    available: born,
    duration: () => SIM.DURATION_S.tempProbe,
    complete: (c) => {
      c.s.tempProbe = true;
      c.note(`Suhu ${fmt(c.s.temp, 1)} °C.`);
    },
  },
  {
    id: 'check-chest',
    label: 'Lihat gerak dada & dengarkan suara napas',
    group: 'penilaian',
    rationale: 'Gerak dada dan suara napas bilateral adalah tanda ventilasi efektif; asimetri mengarah ke pneumotoraks atau ETT di bronkus kanan.',
    available: born,
    start: (c) => {
      const s = c.s;
      const v = s.vent.mode === 'ppv' ? s.ventEff : s.spontEff;
      const chest = v >= MODEL.EFFECTIVE_VENT ? 'baik' : v >= MODEL.VISIBLE_CHEST_MIN ? 'minimal' : 'tidak tampak';
      const asym = s.pneumothorax.active
        ? `suara napas ${s.pneumothorax.side} menurun`
        : s.ett.placed && s.ett.position === 'right-main'
          ? 'suara napas kiri menurun'
          : c.sc.hidden.cdh
            ? 'suara napas kiri menurun, bunyi jantung bergeser ke kanan, abdomen skafoid'
            : 'simetris';
      c.note(`Gerak dada: ${chest}. Suara napas: ${asym}.`);
    },
  },

  // ======================= VENTILASI =======================
  {
    id: 'ppv-start',
    label: 'Mulai VTP',
    group: 'ventilasi',
    primary: true,
    rationale: `Indikasi: apnea/megap-megap atau HR <${HEART_RATE.PPV_BELOW_BPM}. Mulai dalam ${TIMING.PPV_START_DEADLINE_S} detik pertama. PIP ${VENTILATION.PIP_INITIAL_CMH2O.min}–${VENTILATION.PIP_INITIAL_CMH2O.max} cmH₂O, PEEP ${VENTILATION.PEEP_CMH2O}, laju ${VENTILATION.RATE_PER_MIN.min}–${VENTILATION.RATE_PER_MIN.max}/menit, FiO₂ sesuai usia gestasi.`,
    available: (s) => {
      if (s.phase !== 'running') return 'Tersedia setelah bayi lahir.';
      if (s.vent.mode === 'ppv') return 'VTP sedang berjalan — gunakan "Ubah pengaturan".';
      if (s.cord.decision === 'tunda' && !cordClamped(s)) return 'Penundaan penjepitan berjalan — jepit tali pusat dulu bila bayi perlu VTP.';
      return true;
    },
    hands: () => 0,
    params: (s, sc) => ventParams(s, sc, true),
    start: (c) => {
      const { s, sc, p } = c;
      if (s.vent.mode !== 'cpap' && freeHands(s) < 1) return 'Tidak ada tangan bebas untuk VTP — panggil bantuan.';
      ensureCordClamped(c);
      const indicated = ppvIndicatedNow(s);
      if (!indicated && s.vent.firstStartedAt === null) {
        c.judge('ppv-not-indicated', false, 'ventilasi', `VTP tanpa indikasi: bayi bernapas dan HR ≥${HEART_RATE.PPV_BELOW_BPM}. Intervensi berlebihan.`, s.hr >= HEART_RATE.PPV_BELOW_BPM && s.drive > 0.85);
      }
      const first = s.vent.firstStartedAt === null;
      if (first && indicated) {
        const onTime = s.t <= TIMING.PPV_START_DEADLINE_S;
        c.judge('ppv-timing', onTime, 'ventilasi', onTime ? `VTP dimulai pada detik ${s.t} (≤${TIMING.PPV_START_DEADLINE_S}).` : `VTP baru dimulai pada detik ${s.t}; targetnya ≤${TIMING.PPV_START_DEADLINE_S} detik.`);
      }
      const smallNeeded = sc.hidden.weightKg < AIRWAY.MASK_SMALL_BELOW_KG;
      const small = str(p, 'mask') === 'kecil';
      if (!s.ett.placed && !s.lma)
        c.judge('mask-size', small === smallNeeded, 'ventilasi', small === smallNeeded ? 'Ukuran masker sesuai.' : 'Ukuran masker tidak sesuai: masker harus menutupi dagu, mulut, hidung tanpa menekan mata.');
      judgeVentSettings(c, first);
      s.vent.mode = 'ppv';
      if (!s.ett.placed && !s.lma) s.vent.iface = 'mask';
      s.vent.maskSmall = small;
      applyVentSettings(s, p);
      s.vent.startedAt = s.t;
      if (first) s.vent.firstStartedAt = s.t;
      s.flags.device = str(p, 'device');
    },
  },
  {
    id: 'ppv-adjust',
    label: 'Ubah pengaturan VTP (PIP/PEEP/FiO₂/laju)',
    group: 'ventilasi',
    rationale: 'Titrasi FiO₂ sesuai target SpO₂ preduktal per menit; naikkan tekanan bertahap bila dada tidak mengembang.',
    available: (s) => (s.vent.mode === 'ppv' ? true : 'VTP belum berjalan.'),
    params: (s, sc) => ventParams(s, sc, false),
    start: (c) => {
      judgeVentSettings(c, false);
      applyVentSettings(c.s, c.p);
    },
  },
  {
    id: 'fio2',
    label: 'Atur FiO₂',
    group: 'ventilasi',
    rationale: 'Titrasi oksigen ke pita target SpO₂ preduktal; turunkan bila >95%. Saat kompresi: 100%.',
    available: (s) => (s.vent.mode === 'none' ? 'Tidak ada VTP/CPAP yang berjalan.' : true),
    params: (_s, sc) => [{ name: 'fio2', label: 'FiO₂', type: 'select', options: fio2Options(sc) }],
    start: (c) => {
      c.s.vent.fio2 = num(c.p, 'fio2');
    },
  },
  {
    id: 'ppv-stop',
    label: 'Hentikan VTP',
    group: 'ventilasi',
    rationale: `Hentikan bertahap bila HR ≥${HEART_RATE.PPV_BELOW_BPM} dan napas spontan adekuat; pertimbangkan CPAP pada bayi prematur dengan distres.`,
    available: (s) => (s.vent.mode === 'ppv' ? true : 'VTP tidak berjalan.'),
    start: (c) => {
      const { s } = c;
      const premature = s.hr < HEART_RATE.PPV_BELOW_BPM || s.drive < 0.5 || s.compressions.active;
      if (premature)
        c.judge('ppv-stopped-early', false, 'ventilasi', 'VTP dihentikan padahal HR <100 atau napas spontan belum adekuat.', s.hr < HEART_RATE.COMPRESSIONS_BELOW_BPM || s.drive < 0.1);
      else c.judge('ppv-stop', true, 'ventilasi', 'VTP dihentikan saat HR ≥100 dan napas spontan adekuat.');
      s.vent.mode = 'none';
      s.vent.startedAt = null;
      s.flags.ppvEffectiveS = 0;
    },
  },
  {
    id: 'mr-m',
    label: 'M — Mask / S (IDAI: Sungkup): rapatkan masker',
    group: 'ventilasi',
    rationale: 'Langkah koreksi pertama bila dada tidak mengembang: kebocoran masker sangat sering. Teknik dua tangan membantu.',
    available: (s) => (s.vent.mode === 'ppv' && s.vent.iface === 'mask' ? true : 'Hanya saat VTP dengan masker.'),
    duration: () => SIM.DURATION_S.maskAdjust,
    complete: (c) => {
      c.s.mr.M = true;
      c.s.vent.maskSmall = c.sc.hidden.weightKg < AIRWAY.MASK_SMALL_BELOW_KG;
      c.judge('mr', true, 'ventilasi', 'M: masker dirapatkan.');
    },
  },
  {
    id: 'mr-r',
    label: 'R — Reposisi kepala (menghidu)',
    group: 'ventilasi',
    rationale: 'Posisi kepala netral–sedikit ekstensi membuka jalan napas.',
    available: (s) => (s.vent.mode === 'ppv' && s.vent.iface === 'mask' ? true : 'Hanya saat VTP dengan masker.'),
    duration: () => SIM.DURATION_S.reposition,
    complete: (c) => {
      c.s.mr.R = true;
      c.s.positioned = true;
    },
  },
  {
    id: 'mr-s',
    label: 'S — Suction / I (IDAI: Isap): isap mulut & hidung',
    group: 'ventilasi',
    rationale: 'Bila M dan R belum berhasil, isap sekret kental yang mungkin menyumbat.',
    available: (s) => (s.vent.mode === 'ppv' ? true : 'Hanya saat VTP.'),
    duration: () => SIM.DURATION_S.suction,
    interruptsVent: true,
    complete: (c) => {
      c.s.mr.S = true;
      c.s.suctioned = true;
    },
  },
  {
    id: 'mr-o',
    label: 'O — Open mouth / B (IDAI: Buka mulut)',
    group: 'ventilasi',
    rationale: 'Membuka mulut dan mengangkat rahang membantu aliran udara.',
    available: (s) => (s.vent.mode === 'ppv' && s.vent.iface === 'mask' ? true : 'Hanya saat VTP dengan masker.'),
    duration: () => SIM.DURATION_S.openMouth,
    complete: (c) => {
      c.s.mr.O = true;
    },
  },
  {
    id: 'mr-p',
    label: `P — Pressure / T (IDAI: Tekanan): PIP +${VENTILATION.PIP_STEP_CMH2O} cmH₂O`,
    group: 'ventilasi',
    rationale: `Naikkan tekanan bertahap ${VENTILATION.PIP_STEP_CMH2O}–10 cmH₂O sampai dada bergerak; batas ${VENTILATION.PIP_MAX_TERM_CMH2O} cmH₂O aterm / ${VENTILATION.PIP_MAX_PRETERM_CMH2O} prematur.`,
    available: (s) => (s.vent.mode === 'ppv' ? true : 'Hanya saat VTP.'),
    start: (c) => {
      const { s, sc } = c;
      const before = s.vent.pip;
      s.vent.pip = before + VENTILATION.PIP_STEP_CMH2O;
      s.mr.P += 1;
      c.note(`PIP ${before} → ${s.vent.pip} cmH₂O.`);
      if (s.vent.pip > pipMax(sc.hidden.gaWeeks))
        c.judge('pip-excess', false, 'ventilasi', `PIP ${s.vent.pip} melebihi batas ${pipMax(sc.hidden.gaWeeks)} cmH₂O — pertimbangkan jalan napas alternatif.`);
      if (!s.mr.M && !s.mr.R && s.vent.iface === 'mask')
        c.judge('mr-order', false, 'ventilasi', 'Urutan MR. SOPA: rapatkan masker (M) dan reposisi (R) dulu sebelum menaikkan tekanan.');
    },
  },
  {
    id: 'cpap-start',
    label: 'Mulai CPAP',
    group: 'ventilasi',
    rationale: `Untuk bayi yang BERNAPAS spontan dengan HR ≥${HEART_RATE.PPV_BELOW_BPM} tetapi mengalami distres napas/SpO₂ di bawah target (terutama prematur). Bukan pengganti VTP pada apnea.`,
    available: (s, sc) => {
      if (s.phase !== 'running') return 'Tersedia setelah bayi lahir.';
      if (!sc.equipment.tPiece) return 'Perangkat CPAP/T-piece tidak tersedia.';
      if (s.vent.mode === 'cpap') return 'CPAP sudah berjalan.';
      return true;
    },
    params: (_s, sc) => [
      { name: 'peep', label: 'Tekanan CPAP', type: 'select', options: UI_OPTIONS.CPAP.map((v) => ({ value: v, label: `${v} cmH₂O` })) },
      { name: 'fio2', label: 'FiO₂', type: 'select', options: fio2Options(sc) },
    ],
    start: (c) => {
      const { s, p } = c;
      if (s.vent.mode !== 'ppv' && freeHands(s) < 1) return 'Tidak ada tangan bebas — panggil bantuan.';
      ensureCordClamped(c);
      const indicated = s.drive >= 0.5 && s.hr >= HEART_RATE.PPV_BELOW_BPM;
      c.judge(
        'cpap-indication',
        indicated,
        'ventilasi',
        indicated ? 'CPAP tepat untuk bayi bernapas spontan dengan distres.' : 'CPAP tidak cukup: bayi apnea/megap-megap atau HR <100 memerlukan VTP.',
        s.hr < HEART_RATE.COMPRESSIONS_BELOW_BPM,
      );
      const peep = num(p, 'peep');
      const okP = peep >= VENTILATION.CPAP_ACCEPTABLE_CMH2O.min && peep <= VENTILATION.CPAP_ACCEPTABLE_CMH2O.max;
      c.judge('cpap-pressure', okP, 'ventilasi', okP ? `CPAP ${peep} cmH₂O sesuai.` : `CPAP yang dianjurkan ${VENTILATION.CPAP_CMH2O} cmH₂O.`);
      if (s.vent.firstStartedAt === null && s.flags.cpapFirst === undefined) {
        const fr = initialFio2Range(c.sc.hidden.gaWeeks);
        const f = num(p, 'fio2');
        const okF = f >= fr.min && f <= fr.max;
        c.judge('fio2-start', okF, 'ventilasi', okF ? `FiO₂ awal ${f}% sesuai.` : `FiO₂ awal untuk usia gestasi ini ${fr.min}–${fr.max}%.`);
        s.flags.cpapFirst = s.t;
      }
      s.vent.mode = 'cpap';
      s.vent.peep = peep;
      s.vent.fio2 = num(p, 'fio2');
      s.vent.pip = 0;
      s.vent.startedAt = s.t;
    },
  },
  {
    id: 'cpap-stop',
    label: 'Hentikan CPAP',
    group: 'ventilasi',
    rationale: 'Hentikan bila distres napas hilang dan SpO₂ stabil di udara ruang.',
    available: (s) => (s.vent.mode === 'cpap' ? true : 'CPAP tidak berjalan.'),
    start: (c) => {
      c.s.vent.mode = 'none';
      c.s.vent.startedAt = null;
    },
  },
  {
    id: 'ogt',
    label: `Pasang pipa orogastrik (${AIRWAY.OGT_FR} Fr)`,
    group: 'ventilasi',
    rationale: 'Dekompresi lambung pada VTP masker/LMA yang lama; WAJIB dini pada hernia diafragmatika (isap kontinu).',
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.ogt ? 'OGT sudah terpasang.' : true),
    duration: () => SIM.DURATION_S.ogt,
    hands: () => 1,
    complete: (c) => {
      c.s.ogt = true;
      c.judge('ogt', true, 'ventilasi', 'Pipa orogastrik terpasang — lambung didekompresi.');
    },
  },

  // ======================= JALAN NAPAS LANJUTAN =======================
  {
    id: 'lma',
    label: 'Pasang sungkup laring (LMA)',
    group: 'jalan-napas',
    rationale: `"A" pada MR. SOPA. LMA ukuran ${AIRWAY.LMA_SIZE} untuk bayi ≥${AIRWAY.LMA_MIN_GA_WEEKS} minggu dan >${AIRWAY.LMA_MIN_WEIGHT_KG} kg, terutama bila masker gagal atau intubasi sulit. Tidak untuk isap mekonium.`,
    available: (s, sc) =>
      s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.lma ? 'LMA tidak tersedia.' : s.lma ? 'LMA sudah terpasang.' : s.ett.placed ? 'ETT sudah terpasang.' : true,
    params: () => [{ name: 'ukuran', label: 'Ukuran LMA', type: 'select', options: UI_OPTIONS.LMA_SIZES.map((v) => ({ value: v, label: `Ukuran ${v}` })) }],
    duration: () => SIM.DURATION_S.lma,
    interruptsVent: true,
    complete: (c) => {
      const { s, sc } = c;
      const appropriate = lmaAppropriate(sc.hidden.gaWeeks, sc.hidden.weightKg);
      const sizeOk = num(c.p, 'ukuran') === AIRWAY.LMA_SIZE;
      s.lma = true;
      s.mr.A = true;
      s.vent.iface = 'lma';
      if (!sizeOk) s.flags.lmaWrongSize = true;
      c.judge(
        'lma',
        appropriate && sizeOk,
        'ventilasi',
        !appropriate
          ? `LMA neonatus dianjurkan untuk ≥${AIRWAY.LMA_MIN_GA_WEEKS} minggu dan >${AIRWAY.LMA_MIN_WEIGHT_KG} kg — pada bayi ini pertimbangkan intubasi.`
          : sizeOk
            ? 'LMA terpasang — jalan napas alternatif efektif.'
            : `Ukuran LMA neonatus: ${AIRWAY.LMA_SIZE}.`,
      );
      if (s.vent.mode !== 'ppv') c.note('LMA terpasang; mulai/lanjutkan VTP melalui LMA.');
    },
  },
  {
    id: 'intubate',
    label: 'Intubasi endotrakeal',
    group: 'jalan-napas',
    rationale: `Pilih ETT sesuai berat/usia gestasi dan kedalaman DI GUSI (tip-to-gum, tabel NRP edisi 9). Satu upaya ±${TIMING.INTUBATION_ATTEMPT_MAX_S} detik; VTP terhenti selama upaya.`,
    available: (s, sc) =>
      s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.intubation ? 'Peralatan intubasi tidak tersedia di fasilitas ini.' : s.ett.placed ? 'ETT sudah terpasang.' : true,
    params: () => [
      { name: 'ukuran', label: 'Ukuran ETT (diameter dalam)', type: 'select', options: AIRWAY.ETT_SIZES_MM.map((v) => ({ value: v, label: `${fmt(v, 1)} mm` })) },
      { name: 'kedalaman', label: 'Kedalaman di gusi (tip-to-gum)', type: 'select', options: UI_OPTIONS.ETT_DEPTH_CM.map((v) => ({ value: v, label: `${fmt(v, 1)} cm` })) },
      { name: 'bilah', label: 'Bilah laringoskop', type: 'select', options: UI_OPTIONS.BLADES.map((v) => ({ value: v, label: `Miller ${v}` })) },
    ],
    duration: () => SIM.DURATION_S.intubation,
    interruptsVent: true,
    start: (c) => {
      const { s, sc } = c;
      if (sc.hidden.meconium && s.vent.firstStartedAt === null) {
        c.judge(
          'routine-tracheal-suction',
          false,
          'ventilasi',
          'Laringoskopi/isap trakea rutin pada bayi tidak bugar dengan mekonium tidak dianjurkan — mulai VTP dalam 60 detik pertama.',
          true,
        );
      }
      s.ett.attempts += 1;
    },
    complete: (c) => {
      const { s, sc, p } = c;
      const size = num(p, 'ukuran');
      const depth = num(p, 'kedalaman');
      const ok = acceptableEttSizes(sc.hidden.weightKg, sc.hidden.gaWeeks);
      const recDepth = recommendedEttDepth(sc.hidden.gaWeeks);
      const blade = str(p, 'bilah');
      if (size > Math.max(...ok)) {
        c.note(`Upaya intubasi gagal: ETT ${fmt(size, 1)} mm terlalu besar untuk melewati glotis.`);
        c.judge('ett-size', false, 'ventilasi', `ETT terlalu besar. Ukuran yang sesuai: ${ok.map((v) => fmt(v, 1)).join(' atau ')} mm.`);
        return;
      }
      s.flags.ettTooSmall = size < Math.min(...ok);
      c.judge(
        'ett-size',
        !s.flags.ettTooSmall,
        'ventilasi',
        s.flags.ettTooSmall ? `ETT terlalu kecil (kebocoran). Ukuran sesuai: ${ok.map((v) => fmt(v, 1)).join(' atau ')} mm.` : `Ukuran ETT ${fmt(size, 1)} mm sesuai.`,
      );
      const diff = depth - recDepth;
      const pos = diff > AIRWAY.ETT_DEPTH_MALPOSITION_CM - 1e-9 ? 'right-main' : diff < -AIRWAY.ETT_DEPTH_MALPOSITION_CM + 1e-9 ? 'shallow' : 'trachea';
      const depthOk = Math.abs(diff) <= AIRWAY.ETT_DEPTH_TOLERANCE_CM + 1e-9;
      c.judge(
        'ett-depth',
        depthOk,
        'ventilasi',
        depthOk ? `Kedalaman ${fmt(depth, 1)} cm sesuai.` : `Kedalaman yang dianjurkan untuk ${sc.hidden.gaWeeks} minggu ±${fmt(recDepth, 1)} cm di gusi.`,
      );
      if (blade !== recommendedBlade(sc.hidden.gaWeeks)) c.judge('blade', false, 'ventilasi', `Bilah yang lazim untuk bayi ini: Miller ${recommendedBlade(sc.hidden.gaWeeks)}.`);
      s.ett = { ...s.ett, placed: true, size, depth, position: pos, confirmed: false };
      s.mr.A = true;
      s.vent.iface = 'ett';
      s.lma = false;
      c.note(`ETT ${fmt(size, 1)} mm terpasang, ${fmt(depth, 1)} cm di gusi.`);
    },
  },
  {
    id: 'confirm-tube',
    label: 'Konfirmasi posisi ETT (detektor CO₂, auskultasi)',
    group: 'jalan-napas',
    rationale: 'Perubahan warna detektor CO₂, HR naik, gerak dada & suara napas bilateral. Detektor CO₂ dapat negatif palsu bila curah jantung sangat rendah.',
    available: (s) => (s.ett.placed ? true : 'ETT belum terpasang.'),
    duration: () => SIM.DURATION_S.confirmTube,
    complete: (c) => {
      const { s, sc } = c;
      const co2 = sc.equipment.co2Detector
        ? s.ett.position !== 'esophagus' && (s.hr >= SIM.CO2_DETECTOR_MIN_HR || s.compressions.active)
          ? 'berubah warna (kuning)'
          : 'tidak berubah warna'
        : 'tidak tersedia';
      const sounds = s.ett.position === 'right-main' ? 'kanan > kiri' : s.ett.position === 'shallow' ? 'lemah, ada kebocoran di mulut' : 'bilateral simetris';
      s.ett.confirmed = true;
      c.note(`Detektor CO₂: ${co2}. Suara napas: ${sounds}.`);
      c.judge('ett-confirm', true, 'ventilasi', 'Posisi ETT dikonfirmasi.');
    },
  },
  {
    id: 'tube-adjust',
    label: 'Sesuaikan kedalaman ETT',
    group: 'jalan-napas',
    rationale: 'Tarik bila suara napas kanan > kiri (bronkus utama kanan); dorong sedikit bila terlalu dangkal.',
    available: (s) => (s.ett.placed ? true : 'ETT belum terpasang.'),
    params: () => [
      {
        name: 'ubah',
        label: 'Perubahan',
        type: 'select',
        options: [
          { value: -1, label: 'Tarik 1 cm' },
          { value: -0.5, label: 'Tarik 0,5 cm' },
          { value: 0.5, label: 'Dorong 0,5 cm' },
          { value: 1, label: 'Dorong 1 cm' },
        ],
      },
    ],
    start: (c) => {
      const { s, sc } = c;
      s.ett.depth = round3(s.ett.depth + num(c.p, 'ubah'));
      const diff = s.ett.depth - recommendedEttDepth(sc.hidden.gaWeeks);
      s.ett.position = diff >= AIRWAY.ETT_DEPTH_MALPOSITION_CM ? 'right-main' : diff <= -AIRWAY.ETT_DEPTH_MALPOSITION_CM ? 'shallow' : 'trachea';
      c.note(`ETT kini ${fmt(s.ett.depth, 1)} cm di gusi.`);
    },
  },
  {
    id: 'oral-airway',
    label: 'Pasang jalan napas orofaring (Guedel)',
    group: 'jalan-napas',
    rationale: 'Atresia koana bilateral: bayi bernapas obligat lewat hidung; jalan napas oral (atau ETT di mulut sebagai jalan napas oral) membuka jalur udara.',
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.oralAirway ? 'Sudah terpasang.' : true),
    duration: () => SIM.DURATION_S.oralAirway,
    complete: (c) => {
      c.s.oralAirway = true;
      const ok = c.sc.hidden.obstruction === 'choanal';
      c.judge('oral-airway', ok, 'ventilasi', ok ? 'Jalan napas oral mengatasi obstruksi akibat atresia koana.' : 'Jalan napas oral tidak diperlukan pada bayi ini.');
    },
  },
  {
    id: 'prone',
    label: 'Posisikan tengkurap (prone)',
    group: 'jalan-napas',
    rationale: 'Sekuens Pierre Robin: posisi tengkurap membuat lidah jatuh ke depan sehingga faring terbuka.',
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.prone ? 'Sudah tengkurap.' : true),
    duration: () => SIM.DURATION_S.prone,
    complete: (c) => {
      const ok = c.sc.hidden.obstruction === 'robin';
      if (!ok && (c.s.vent.mode === 'ppv' || c.s.compressions.active)) {
        c.judge('prone', false, 'ventilasi', 'Posisi tengkurap tidak tepat saat VTP/kompresi pada bayi tanpa obstruksi lidah.');
        return;
      }
      c.s.prone = true;
      c.judge('prone', ok, 'ventilasi', ok ? 'Posisi tengkurap memperbaiki obstruksi lidah (Pierre Robin).' : 'Posisi tengkurap tidak diperlukan.');
    },
  },
  {
    id: 'npa',
    label: `Pasang pipa nasofaring (ETT ${AIRWAY.NASOPHARYNGEAL_TUBE_MM} mm via hidung)`,
    group: 'jalan-napas',
    rationale: 'Pierre Robin: pipa nasofaring memintas obstruksi lidah bila posisi tengkurap belum cukup.',
    available: (s, sc) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.intubation ? 'ETT kecil tidak tersedia.' : s.npa ? 'Sudah terpasang.' : true),
    duration: () => SIM.DURATION_S.nasopharyngeal,
    complete: (c) => {
      c.s.npa = true;
      const ok = c.sc.hidden.obstruction === 'robin';
      c.judge('npa', ok, 'ventilasi', ok ? 'Pipa nasofaring membuka jalan napas.' : 'Pipa nasofaring tidak diperlukan pada bayi ini.');
    },
  },

  // ======================= SIRKULASI =======================
  {
    id: 'compressions-start',
    label: 'Mulai kompresi dada',
    group: 'sirkulasi',
    primary: true,
    rationale: `Indikasi: HR <${HEART_RATE.COMPRESSIONS_BELOW_BPM} setelah ≥${TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S} detik VTP yang mengembangkan paru (sebaiknya lewat ETT/LMA). Teknik dua ibu jari, sepertiga bawah sternum, kedalaman ±1/3 diameter AP, rasio ${COMPRESSIONS.RATIO_COMPRESSIONS}:${COMPRESSIONS.RATIO_BREATHS} (${COMPRESSIONS.EVENTS_PER_MIN} kejadian/menit), FiO₂ ${OXYGEN.FIO2_DURING_COMPRESSIONS}%.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : s.compressions.active ? 'Kompresi sedang berjalan.' : true),
    params: () => [
      {
        name: 'teknik',
        label: 'Teknik',
        type: 'select',
        options: [
          { value: 'dua-ibu-jari', label: 'Dua ibu jari melingkari dada' },
          { value: 'dua-jari', label: 'Dua jari' },
        ],
      },
      {
        name: 'rasio',
        label: 'Rasio kompresi : ventilasi',
        type: 'select',
        options: [
          { value: '3:1', label: '3 : 1' },
          { value: '15:2', label: '15 : 2' },
          { value: '30:2', label: '30 : 2' },
        ],
      },
    ],
    start: (c) => {
      const { s, sc } = c;
      if (freeHands(s) < 1) return 'Tidak ada tangan bebas untuk kompresi — panggil bantuan.';
      const hr = s.hr;
      const effS = (s.flags.ppvEffectiveS as number) ?? 0;
      if (hr >= HEART_RATE.COMPRESSIONS_BELOW_BPM)
        c.judge(
          'compressions-indication',
          false,
          'kompresi',
          `Kompresi tidak diindikasikan: HR ${Math.round(hr)}/menit (≥${HEART_RATE.COMPRESSIONS_BELOW_BPM}).`,
          hr >= HEART_RATE.PPV_BELOW_BPM,
        );
      else if (effS < TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S)
        c.judge(
          'compressions-before-ventilation',
          false,
          'kompresi',
          `Pastikan dulu ≥${TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S} detik ventilasi yang mengembangkan paru (dada bergerak) sebelum kompresi — ventilasi adalah prioritas.`,
        );
      else c.judge('compressions-indication', true, 'kompresi', 'Indikasi kompresi tepat: HR <60 setelah ventilasi efektif.');
      const tech = str(c.p, 'teknik');
      const ratio = str(c.p, 'rasio');
      c.judge('compressions-technique', tech === 'dua-ibu-jari', 'kompresi', tech === 'dua-ibu-jari' ? 'Teknik dua ibu jari — benar.' : 'Teknik yang dianjurkan: dua ibu jari melingkari dada.');
      c.judge('compressions-ratio', ratio === '3:1', 'kompresi', ratio === '3:1' ? 'Rasio 3:1 — benar.' : `Rasio resusitasi neonatus ${COMPRESSIONS.RATIO_COMPRESSIONS}:${COMPRESSIONS.RATIO_BREATHS}.`);
      if (s.vent.mode !== 'ppv') c.judge('compressions-no-vent', false, 'kompresi', 'Kompresi harus dikoordinasikan dengan ventilasi (VTP).', true);
      s.compressions = { ...s.compressions, active: true, startedAt: s.t, firstStartedAt: s.compressions.firstStartedAt ?? s.t, technique: tech, ratio };
      s.flags.compressionsHrOkS = 0;
      void sc;
    },
  },
  {
    id: 'compressions-stop',
    label: 'Hentikan kompresi',
    group: 'sirkulasi',
    primary: true,
    rationale: `Hentikan kompresi bila HR ≥${HEART_RATE.COMPRESSIONS_BELOW_BPM}; lanjutkan VTP.`,
    available: (s) => (s.compressions.active ? true : 'Kompresi tidak berjalan.'),
    start: (c) => {
      const { s } = c;
      if (s.hr < HEART_RATE.COMPRESSIONS_BELOW_BPM) c.judge('compressions-stopped-early', false, 'kompresi', 'Kompresi dihentikan padahal HR masih <60.', true);
      else c.judge('compressions-stop', true, 'kompresi', 'Kompresi dihentikan saat HR ≥60.');
      s.compressions.active = false;
      s.compressions.startedAt = null;
    },
  },
  {
    id: 'transillumination',
    label: 'Transiluminasi dada',
    group: 'sirkulasi',
    rationale: 'Dugaan pneumotoraks (perburukan mendadak, suara napas asimetris): transiluminasi atau rontgen bila waktu memungkinkan.',
    available: born,
    duration: () => SIM.DURATION_S.transillumination,
    complete: (c) => {
      const pt = c.s.pneumothorax;
      c.note(pt.active ? `Transiluminasi: hemitoraks ${pt.side} terang (positif).` : 'Transiluminasi: tidak ada perbedaan.');
    },
  },
  {
    id: 'needle',
    label: 'Aspirasi jarum toraks',
    group: 'sirkulasi',
    rationale: `Pneumotoraks tension: aspirasi dengan kateter ${PNEUMOTHORAX.NEEDLE_GAUGE.min}–${PNEUMOTHORAX.NEEDLE_GAUGE.max} G di SIC 4 linea aksilaris anterior atau SIC 2 linea midklavikula. Jangan dilakukan tanpa dugaan klinis kuat.`,
    available: born,
    params: () => [
      {
        name: 'sisi',
        label: 'Sisi',
        type: 'select',
        options: [
          { value: 'kanan', label: 'Kanan' },
          { value: 'kiri', label: 'Kiri' },
        ],
      },
    ],
    duration: () => SIM.DURATION_S.needle,
    hands: () => 1,
    complete: (c) => {
      const { s } = c;
      const side = str(c.p, 'sisi');
      if (s.pneumothorax.active && s.pneumothorax.side === side) {
        s.pneumothorax.active = false;
        s.pneumothorax.resolved = true;
        c.note('Udara teraspirasi — ventilasi membaik.');
        c.judge('needle', true, 'ventilasi', 'Aspirasi jarum pada sisi yang benar.');
      } else {
        c.judge('needle', false, 'ventilasi', s.pneumothorax.active ? 'Aspirasi pada sisi yang salah.' : 'Aspirasi jarum tanpa pneumotoraks — risiko cedera paru iatrogenik.', !s.pneumothorax.active);
      }
    },
  },

  // ======================= AKSES & OBAT =======================
  {
    id: 'uvc',
    label: 'Pasang kateter vena umbilikal (UVC) darurat',
    group: 'obat',
    rationale: `Akses vaskular pilihan di kamar bersalin. Kateter ${ACCESS.UVC_FR.min}–${ACCESS.UVC_FR.max} Fr dimasukkan ${ACCESS.UVC_DEPTH_CM.min}–${ACCESS.UVC_DEPTH_CM.max} cm sampai darah mengalir. Butuh petugas tambahan.`,
    available: (s, sc) =>
      s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.uvc ? 'Set UVC tidak tersedia.' : s.access.uvcAt !== null || isBusyWith(s, 'uvc') ? 'UVC sudah/ sedang dipasang.' : true,
    duration: () => SIM.DURATION_S.uvc,
    hands: () => 1,
    complete: (c) => {
      c.s.access.uvcAt = c.s.t;
      c.note('UVC terpasang, darah mengalir lancar.');
      c.judge('uvc', true, 'obat', 'Akses UVC tersedia.');
    },
  },
  {
    id: 'io',
    label: 'Pasang akses intraoseus (IO)',
    group: 'obat',
    rationale: 'Alternatif bila UVC tidak memungkinkan (mis. di luar kamar bersalin): tibia proksimal.',
    available: (s, sc) =>
      s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.io ? 'Jarum IO tidak tersedia.' : s.access.ioAt !== null || isBusyWith(s, 'io') ? 'IO sudah/ sedang dipasang.' : true,
    duration: () => SIM.DURATION_S.io,
    hands: () => 1,
    complete: (c) => {
      c.s.access.ioAt = c.s.t;
      c.note('Akses IO terpasang.');
      c.judge('io', true, 'obat', 'Akses IO tersedia.');
    },
  },
  {
    id: 'epinephrine',
    label: 'Epinefrin (hitung dosis & volume)',
    group: 'obat',
    primary: true,
    rationale: `Indikasi: HR <${HEART_RATE.EPINEPHRINE_BELOW_BPM} setelah ≥${TIMING.COMPRESSIONS_REASSESS_S} detik kompresi terkoordinasi dengan ventilasi efektif. Konsentrasi ${EPINEPHRINE.CONCENTRATION_MG_PER_ML} mg/mL. IV/IO ${EPINEPHRINE.IV_DOSE_MG_PER_KG.min}–${EPINEPHRINE.IV_DOSE_MG_PER_KG.max} mg/kg + bilas NaCl ${EPINEPHRINE.FLUSH_ML} mL; ETT ${EPINEPHRINE.ETT_DOSE_MG_PER_KG.min}–${EPINEPHRINE.ETT_DOSE_MG_PER_KG.max} mg/kg sambil menunggu akses. Ulang tiap ${TIMING.EPINEPHRINE_REPEAT_S.min / 60}–${TIMING.EPINEPHRINE_REPEAT_S.max / 60} menit.`,
    available: (s, sc) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !sc.equipment.epinephrine ? 'Epinefrin tidak tersedia.' : isBusyWith(s, 'epinephrine') ? 'Epinefrin sedang disiapkan.' : true),
    params: (s) => [
      {
        name: 'rute',
        label: 'Rute',
        type: 'select',
        options: [
          { value: 'iv', label: `UVC/IV${s.access.uvcAt !== null && s.access.uvcAt <= s.t ? '' : ' (akses belum siap)'}` },
          { value: 'io', label: `IO${s.access.ioAt !== null && s.access.ioAt <= s.t ? '' : ' (akses belum siap)'}` },
          { value: 'ett', label: `Endotrakeal${s.ett.placed ? '' : ' (ETT belum terpasang)'}` },
        ],
      },
      { name: 'dosisMg', label: 'Dosis', type: 'number', unit: 'mg', step: 0.001, min: 0, max: 10, help: `Konsentrasi ${EPINEPHRINE.CONCENTRATION_MG_PER_ML} mg/mL (1 mg/10 mL)` },
      { name: 'volumeMl', label: 'Volume ditarik', type: 'number', unit: 'mL', step: 0.01, min: 0, max: 50 },
      { name: 'bilasMl', label: 'Bilas NaCl 0,9% (IV/IO)', type: 'number', unit: 'mL', step: 0.5, min: 0, max: 20 },
      { name: 'closedLoop', label: 'Instruksi dibacakan ulang & dikonfirmasi (closed-loop)', type: 'checkbox' },
    ],
    duration: () => SIM.DURATION_S.drugPrep,
    hands: () => 1,
    start: (c) => {
      const { s, sc, p } = c;
      const route = str(p, 'rute');
      if (route === 'iv' && !(s.access.uvcAt !== null && s.access.uvcAt <= s.t))
        return 'Akses UVC/IV belum siap. Pasang UVC/IO dahulu, atau berikan via ETT sambil menunggu.';
      if (route === 'io' && !(s.access.ioAt !== null && s.access.ioAt <= s.t)) return 'Akses IO belum siap.';
      if (route === 'ett' && !s.ett.placed) return 'ETT belum terpasang.';
      if (freeHands(s) < 1) return 'Tidak ada tangan bebas untuk menyiapkan obat — panggil bantuan.';
      // indikasi
      const cprS = s.compressions.totalS;
      if (s.hr >= HEART_RATE.EPINEPHRINE_BELOW_BPM)
        c.judge('epi-indication', false, 'obat', `Epinefrin tidak diindikasikan: HR ${Math.round(s.hr)}/menit (≥${HEART_RATE.EPINEPHRINE_BELOW_BPM}).`, true);
      else if (cprS < TIMING.COMPRESSIONS_REASSESS_S)
        c.judge('epi-indication', false, 'obat', `Epinefrin diberikan sebelum ${TIMING.COMPRESSIONS_REASSESS_S} detik kompresi terkoordinasi dengan ventilasi efektif.`);
      else c.judge('epi-indication', true, 'obat', 'Indikasi epinefrin tepat.');
      const prev = s.drugs.filter((d) => d.drug === 'epinefrin');
      const last = prev[prev.length - 1];
      // AHA25 S415 (2a): bila respons dosis ETT tidak adekuat, berikan IV segera setelah
      // akses siap tanpa menunggu interval.
      if (last && !(last.route === 'ett' && route !== 'ett')) {
        const gap = s.t - last.t;
        if (gap < TIMING.EPINEPHRINE_REPEAT_S.min)
          c.judge('epi-interval', false, 'obat', `Dosis ulang terlalu cepat (${gap} detik); interval ${TIMING.EPINEPHRINE_REPEAT_S.min / 60}–${TIMING.EPINEPHRINE_REPEAT_S.max / 60} menit.`);
      }
      c.judge('closed-loop', p.closedLoop === true, 'komunikasi', p.closedLoop === true ? 'Instruksi obat closed-loop.' : 'Gunakan komunikasi closed-loop untuk instruksi obat.');
      void sc;
    },
    complete: (c) => {
      const { s, sc, p } = c;
      const route = str(p, 'rute');
      const w = sc.hidden.weightKg;
      const mg = num(p, 'dosisMg');
      const ml = num(p, 'volumeMl');
      const delivered = ml * EPINEPHRINE.CONCENTRATION_MG_PER_ML;
      const expectedMl = mg / EPINEPHRINE.CONCENTRATION_MG_PER_ML;
      const volTol = Math.max(EPINEPHRINE.VOLUME_TOLERANCE_ML, expectedMl * EPINEPHRINE.VOLUME_TOLERANCE_FRACTION);
      if (Math.abs(ml - expectedMl) > volTol)
        c.judge('epi-volume', false, 'obat', `Volume tidak sesuai dosis: ${fmt(mg, 3)} mg pada 0,1 mg/mL = ${fmt(expectedMl, 2)} mL (Anda menarik ${fmt(ml, 2)} mL → ${fmt(delivered, 3)} mg).`, true);
      const range = route === 'ett' ? EPINEPHRINE.ETT_DOSE_MG_PER_KG : EPINEPHRINE.IV_DOSE_MG_PER_KG;
      const perKg = delivered / w;
      let factor = 1;
      let overdose = false;
      if (perKg < range.min - 1e-9) {
        factor = MODEL.EPI_UNDERDOSE_FACTOR;
        c.judge('epi-dose', false, 'obat', `Dosis kurang: ${fmt(perKg, 3)} mg/kg (rentang ${range.min}–${range.max} mg/kg untuk rute ${route.toUpperCase()}).`);
      } else if (perKg > range.max + 1e-9) {
        overdose = perKg >= range.max * EPINEPHRINE.OVERDOSE_FACTOR;
        c.judge('epi-dose', false, 'obat', `Dosis berlebih: ${fmt(perKg, 3)} mg/kg (rentang ${range.min}–${range.max} mg/kg untuk rute ${route.toUpperCase()}).`, overdose);
      } else {
        c.judge('epi-dose', true, 'obat', `Dosis tepat: ${fmt(perKg, 3)} mg/kg ${route.toUpperCase()}.`);
      }
      if (route !== 'ett') {
        const flush = num(p, 'bilasMl') || 0;
        const flushOk = Math.abs(flush - EPINEPHRINE.FLUSH_ML) <= EPINEPHRINE.FLUSH_TOLERANCE_ML;
        if (!flushOk) factor *= flush > 0 ? 0.8 : 0.6;
        c.judge('epi-flush', flushOk, 'obat', flushOk ? 'Dibilas NaCl 0,9%.' : `Bilas dengan NaCl 0,9% ${EPINEPHRINE.FLUSH_ML} mL agar obat mencapai sirkulasi.`);
      } else {
        factor *= MODEL.EPI_ETT_FACTOR;
      }
      s.drugs.push({ t: s.t, drug: 'epinefrin', route, mg: delivered, ml, mgPerKg: round3(perKg) });
      s.pendingEffects.push({ at: s.t + (route === 'ett' ? SIM.EPI_ETT_ONSET_S : SIM.EPI_IV_ONSET_S), kind: 'epi', factor, overdose });
      c.note(`Epinefrin ${fmt(delivered, 3)} mg (${fmt(ml, 2)} mL) ${route.toUpperCase()} diberikan.`);
    },
  },
  {
    id: 'nacl',
    label: 'Bolus NaCl 0,9% (hitung volume)',
    group: 'obat',
    rationale: `Ekspansi volume bila ada riwayat/tanda kehilangan darah (pucat, perfusi buruk, nadi lemah) atau tidak ada respons terhadap langkah lain: ${VOLUME_EXPANDER.DOSE_ML_PER_KG} mL/kg dalam ${VOLUME_EXPANDER.INFUSION_DURATION_S.min / 60}–${VOLUME_EXPANDER.INFUSION_DURATION_S.max / 60} menit.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !accessReady(s) ? 'Butuh akses UVC/IO.' : true),
    params: () => [
      { name: 'volumeMl', label: 'Volume', type: 'number', unit: 'mL', step: 0.5, min: 0, max: 200 },
      { name: 'durasiMenit', label: 'Lama pemberian', type: 'select', options: UI_OPTIONS.BOLUS_DURATION_MIN.map((v) => ({ value: v, label: `${v} menit` })) },
      { name: 'closedLoop', label: 'Instruksi closed-loop', type: 'checkbox' },
    ],
    start: (c) => {
      const { s, sc, p } = c;
      const w = sc.hidden.weightKg;
      const ml = num(p, 'volumeMl');
      const dur = num(p, 'durasiMenit') * 60;
      const perKg = ml / w;
      const r = VOLUME_EXPANDER.DOSE_RANGE_ML_PER_KG;
      const tol = VOLUME_EXPANDER.DOSE_TOLERANCE_ML_PER_KG;
      const ok = perKg >= r.min - tol && perKg <= r.max + tol;
      const excess = perKg > r.max * VOLUME_EXPANDER.EXCESS_FACTOR;
      c.judge('volume-dose', ok, 'obat', ok ? `Volume tepat: ${fmt(perKg, 1)} mL/kg.` : `Volume ${fmt(perKg, 1)} mL/kg; dosis ${r.min}–${r.max} mL/kg (NRP: ${VOLUME_EXPANDER.DOSE_ML_PER_KG} mL/kg = ${fmt(VOLUME_EXPANDER.DOSE_ML_PER_KG * w, 1)} mL).`, excess);
      const durOk = dur >= VOLUME_EXPANDER.INFUSION_DURATION_S.min && dur <= VOLUME_EXPANDER.INFUSION_DURATION_S.max;
      c.judge('volume-rate', durOk, 'obat', durOk ? 'Kecepatan bolus sesuai.' : `Berikan dalam ${VOLUME_EXPANDER.INFUSION_DURATION_S.min / 60}–${VOLUME_EXPANDER.INFUSION_DURATION_S.max / 60} menit (bolus cepat berisiko perdarahan intraventrikular pada prematur).`);
      if (sc.hidden.volumeDeficit === 0) c.judge('volume-indication', false, 'obat', 'Tidak ada tanda/riwayat hipovolemia — cairan bukan prioritas.');
      else c.judge('volume-indication', true, 'obat', 'Indikasi ekspansi volume tepat (riwayat perdarahan, pucat, perfusi buruk).');
      c.judge('closed-loop', p.closedLoop === true, 'komunikasi', p.closedLoop === true ? 'Instruksi cairan closed-loop.' : 'Gunakan komunikasi closed-loop untuk instruksi cairan.');
      s.infusions.push({ start: s.t, end: s.t + Math.max(1, dur), ml, mlPerKg: perKg });
      s.drugs.push({ t: s.t, drug: 'nacl', route: 'iv', ml, mlPerKg: round3(perKg) });
    },
  },
  {
    id: 'naloxone',
    label: 'Nalokson',
    group: 'obat',
    rationale: 'Tidak dianjurkan sebagai bagian resusitasi awal: depresi napas akibat opioid ditangani dengan ventilasi. Pada ibu pengguna opioid kronik dapat memicu kejang pada bayi.',
    available: born,
    start: (c) => {
      c.s.drugs.push({ t: c.s.t, drug: 'nalokson', route: '-', ml: 0 });
      c.judge('naloxone', false, 'obat', 'Nalokson tidak dianjurkan saat resusitasi; prioritas adalah ventilasi efektif.');
    },
  },
  {
    id: 'bicarbonate',
    label: 'Natrium bikarbonat',
    group: 'obat',
    rationale: 'Tidak dianjurkan rutin pada resusitasi neonatus.',
    available: born,
    start: (c) => {
      c.s.drugs.push({ t: c.s.t, drug: 'bikarbonat', route: '-', ml: 0 });
      c.judge('bicarbonate', false, 'obat', 'Natrium bikarbonat tidak dianjurkan rutin (risiko PIV, tidak memperbaiki luaran).');
    },
  },

  // ======================= KOMUNIKASI =======================
  {
    id: 'call-help',
    label: 'Panggil bantuan',
    group: 'komunikasi',
    primary: true,
    rationale: 'Minta tambahan personel terampil sedini mungkin bila ada faktor risiko atau bayi perlu VTP; kompresi + akses + obat butuh ≥3–4 orang.',
    available: (s) => (s.staff + (s.helpArrivesAt !== null ? 1 : 0) >= SIM.MAX_STAFF ? 'Tim sudah maksimal.' : s.helpArrivesAt !== null ? 'Bantuan sedang menuju.' : true),
    start: (c) => {
      const { s } = c;
      if (s.phase === 'prebirth') {
        s.staff += 1;
        c.note('Tambahan personel hadir sebelum bayi lahir.');
      } else {
        s.helpArrivesAt = s.t + SIM.DURATION_S.callHelpArrival;
        c.note(`Bantuan dipanggil, tiba ±${SIM.DURATION_S.callHelpArrival} detik.`);
      }
      c.judge('call-help', true, 'komunikasi', 'Meminta bantuan.');
    },
  },
  {
    id: 'team-summary',
    label: 'Ringkas situasi ke tim (closed-loop)',
    group: 'komunikasi',
    rationale: 'Pemimpin menyuarakan HR, SpO₂, tindakan berjalan, dan rencana berikutnya; anggota mengonfirmasi.',
    available: born,
    start: (c) => {
      c.note(`Ringkasan: HR ±${Math.round(c.s.hr)}, menit ke-${Math.floor(c.s.t / 60)}.`);
      c.judge('team-summary', true, 'komunikasi', 'Ringkasan situasi disampaikan.');
    },
  },
  {
    id: 'inform-family',
    label: 'Informasikan keluarga',
    group: 'komunikasi',
    rationale: 'Komunikasi jujur dan empatik kepada orang tua tentang kondisi bayi, tindakan, dan rencana (termasuk rujukan).',
    available: born,
    start: (c) => {
      c.note(c.sc.familyInfo ?? 'Keluarga diberi penjelasan tentang kondisi dan rencana.');
      c.judge('inform-family', true, 'komunikasi', 'Keluarga diinformasikan.');
    },
  },

  // ======================= PASCARESUSITASI =======================
  {
    id: 'post-monitor',
    label: 'Monitoring pascaresusitasi (HR, napas, SpO₂, suhu)',
    group: 'pasca',
    rationale: 'Bayi yang membutuhkan resusitasi berisiko memburuk lagi: pantau ketat tanda vital, gula darah, dan tanda ensefalopati.',
    available: born,
    start: (c) => {
      c.s.flags.postMonitor = c.s.t;
      c.judge('post-monitor', true, 'pascaresusitasi', 'Monitoring pascaresusitasi dimulai.');
    },
  },
  {
    id: 'glucose-check',
    label: 'Periksa glukosa darah',
    group: 'pasca',
    rationale: `Bayi pascaresusitasi berisiko hipoglikemia. Tata laksana bila <${GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL} mg/dL.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : isBusyWith(s, 'glucose-check') ? 'Sedang diperiksa.' : true),
    duration: () => SIM.DURATION_S.glucose,
    hands: () => 1,
    complete: (c) => {
      c.s.glucoseResult = c.sc.hidden.postGlucoseMgDl;
      c.note(`Glukosa darah ${c.sc.hidden.postGlucoseMgDl} mg/dL.`);
      c.judge('glucose-check', true, 'pascaresusitasi', 'Glukosa darah diperiksa.');
    },
  },
  {
    id: 'd10',
    label: 'Bolus dekstrosa 10% (hitung volume)',
    group: 'pasca',
    rationale: `Hipoglikemia (<${GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL} mg/dL) pada bayi simptomatik/pascaresusitasi: D10% ${GLUCOSE.D10_BOLUS_ML_PER_KG} mL/kg IV lalu infus glukosa.`,
    available: (s) => (s.phase !== 'running' ? 'Tersedia setelah bayi lahir.' : !accessReady(s) ? 'Butuh akses IV/UVC.' : true),
    params: () => [{ name: 'volumeMl', label: 'Volume D10%', type: 'number', unit: 'mL', step: 0.5, min: 0, max: 50 }],
    start: (c) => {
      const { s, sc } = c;
      const ml = num(c.p, 'volumeMl');
      const perKg = ml / sc.hidden.weightKg;
      const low = s.glucoseResult !== null && s.glucoseResult < GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL;
      if (!low) c.judge('d10-indication', false, 'pascaresusitasi', s.glucoseResult === null ? 'Periksa glukosa sebelum memberi dekstrosa.' : 'Glukosa tidak rendah — dekstrosa bolus tidak diindikasikan.');
      const ok = Math.abs(perKg - GLUCOSE.D10_BOLUS_ML_PER_KG) <= GLUCOSE.D10_TOLERANCE_ML_PER_KG;
      c.judge('d10-dose', ok, 'pascaresusitasi', ok ? `D10% ${fmt(perKg, 1)} mL/kg — tepat.` : `Dosis D10% ${GLUCOSE.D10_BOLUS_ML_PER_KG} mL/kg (${fmt(GLUCOSE.D10_BOLUS_ML_PER_KG * sc.hidden.weightKg, 1)} mL); Anda ${fmt(perKg, 1)} mL/kg.`);
      s.drugs.push({ t: s.t, drug: 'd10', route: 'iv', ml, mlPerKg: round3(perKg) });
    },
  },
  {
    id: 'hypothermia-plan',
    label: 'Rencana neuroproteksi (terapi hipotermia)',
    group: 'pasca',
    rationale: `Bayi ≥${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_MIN_GA_WEEKS} minggu dengan resusitasi lama/ensefalopati sedang–berat: rujuk ke fasilitas dengan protokol terapi hipotermia (mulai <${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_WINDOW_H} jam). Hindari hipertermia; jangan mendinginkan aktif tanpa arahan pusat rujukan.`,
    available: born,
    params: () => [
      {
        name: 'rencana',
        label: 'Keputusan',
        type: 'select',
        options: [
          { value: 'rujuk-th', label: 'Diskusikan & rujuk ke pusat dengan terapi hipotermia; hindari hipertermia' },
          { value: 'hangatkan-aktif', label: `Hangatkan aktif sampai >${fmt(TEMPERATURE.TARGET_C.max, 1)} °C` },
          { value: 'tidak-perlu', label: 'Tidak perlu (bukan kandidat)' },
        ],
      },
    ],
    start: (c) => {
      const { sc } = c;
      const choice = str(c.p, 'rencana');
      const candidate = sc.hieCandidate && sc.hidden.gaWeeks >= POST_RESUSCITATION.HYPOTHERMIA_THERAPY_MIN_GA_WEEKS;
      if (choice === 'hangatkan-aktif') c.judge('hypothermia-plan', false, 'pascaresusitasi', 'Hipertermia memperburuk cedera otak hipoksik — hindari.', true);
      else if (choice === 'rujuk-th') c.judge('hypothermia-plan', candidate, 'pascaresusitasi', candidate ? 'Tepat: kandidat terapi hipotermia — rujuk segera.' : 'Bayi ini bukan kandidat terapi hipotermia (usia gestasi/derajat asfiksia).');
      else c.judge('hypothermia-plan', !candidate, 'pascaresusitasi', candidate ? 'Bayi ini kandidat terapi hipotermia — diskusikan dengan pusat rujukan.' : 'Tepat: bukan kandidat.');
    },
  },
  {
    id: 'refer',
    label: 'Keputusan rujukan & stabilisasi transport',
    group: 'pasca',
    rationale: 'Rujuk bila perlu perawatan intensif. Stabilkan dulu (prinsip S.T.A.B.L.E.: gula, suhu, jalan napas, tekanan darah/perfusi, laboratorium, dukungan emosional). Hubungi RS tujuan (mis. SISRUTE) sebelum berangkat. Tanpa inkubator transport: metode kanguru pada bayi yang bernapas stabil.',
    available: born,
    params: () => [
      {
        name: 'tujuan',
        label: 'Keputusan',
        type: 'select',
        options: [
          { value: 'nicu', label: 'Rujuk ke RS dengan NICU/perinatologi level lanjut' },
          { value: 'rawat-gabung', label: 'Rawat gabung dengan ibu (tidak dirujuk)' },
          { value: 'perinatologi', label: 'Rawat di ruang perinatologi RS ini' },
        ],
      },
      {
        name: 'transport',
        label: 'Cara transport (bila dirujuk)',
        type: 'select',
        options: [
          { value: 'inkubator', label: 'Inkubator transport + O₂/ventilasi + monitor' },
          { value: 'kanguru', label: 'Metode kanguru (kontak kulit) + O₂ bila perlu, pendamping terampil' },
          { value: 'gendong', label: 'Digendong biasa dengan selimut' },
          { value: '-', label: 'Tidak dirujuk' },
        ],
      },
      { name: 'komunikasi', label: 'Komunikasi pra-rujukan dengan RS tujuan (mis. SISRUTE/telepon)', type: 'checkbox' },
    ],
    start: (c) => {
      const { s, sc, p } = c;
      const dest = str(p, 'tujuan');
      const tr = str(p, 'transport');
      const referred = dest === 'nicu';
      s.flags.referral = dest;
      if (sc.referralRequired) {
        c.judge('referral-decision', referred, 'pascaresusitasi', referred ? 'Keputusan rujukan tepat.' : 'Bayi ini membutuhkan perawatan di fasilitas dengan NICU/perinatologi lanjut — rujuk.');
      } else if (referred) {
        c.judge('referral-decision', false, 'pascaresusitasi', 'Rujukan tidak diperlukan untuk bayi ini; pertahankan bersama ibu bila stabil.');
      } else c.judge('referral-decision', true, 'pascaresusitasi', 'Keputusan perawatan sesuai.');
      if (referred) {
        const breathingStable = s.drive >= 0.5 && s.vent.mode === 'none';
        const trOk = tr === 'inkubator' ? sc.equipment.transportIncubator || sc.equipment.intubation : tr === 'kanguru' ? breathingStable : false;
        c.judge('transport', trOk, 'pascaresusitasi', trOk ? 'Cara transport aman dan menjaga suhu.' : tr === 'kanguru' ? 'Metode kanguru hanya untuk bayi yang bernapas spontan stabil.' : tr === 'inkubator' ? 'Inkubator transport tidak tersedia di fasilitas ini — gunakan metode kanguru dengan pendamping.' : 'Transport tanpa penghangat berisiko hipotermia — gunakan inkubator transport atau metode kanguru.');
        c.judge('referral-communication', p.komunikasi === true, 'komunikasi', p.komunikasi === true ? 'Komunikasi pra-rujukan dilakukan.' : 'Hubungi RS tujuan sebelum merujuk (kondisi, tindakan, kebutuhan).');
      }
    },
  },
  {
    id: 'stop-resus',
    label: 'Pertimbangkan penghentian resusitasi',
    group: 'pasca',
    rationale: `Bila HR tidak terdeteksi setelah semua langkah resusitasi dilakukan dengan benar (ventilasi efektif lewat jalan napas alternatif, kompresi, epinefrin, cairan bila indikasi), diskusi penghentian bersama tim dan keluarga dapat dilakukan sekitar ${TIMING.DISCONTINUE_CONSIDER_S / 60} menit setelah lahir.`,
    available: born,
    start: (c) => {
      const { s, sc } = c;
      const allSteps = (s.ett.placed || s.lma) && s.compressions.firstStartedAt !== null && s.drugs.some((d) => d.drug === 'epinefrin');
      const timeOk = s.t >= TIMING.DISCONTINUE_CONSIDER_S;
      const ok = sc.discontinuationAppropriate && allSteps && timeOk && s.hr < HEART_RATE.COMPRESSIONS_BELOW_BPM;
      c.judge(
        'stop-resus',
        ok,
        'pascaresusitasi',
        ok
          ? 'Penghentian dipertimbangkan sesuai pedoman setelah semua langkah dilakukan.'
          : !allSteps
            ? 'Penghentian terlalu dini: belum semua langkah resusitasi dilakukan.'
            : !timeOk
              ? `Penghentian sebelum ±${TIMING.DISCONTINUE_CONSIDER_S / 60} menit tanpa alasan kuat.`
              : 'Bayi masih memiliki HR yang dapat dipulihkan.',
        !ok,
      );
      s.phase = 'ended';
      s.endReason = 'dihentikan';
    },
  },
  {
    id: 'end',
    label: 'Selesai & serah terima',
    group: 'pasca',
    primary: true,
    rationale: 'Akhiri skenario dan serahkan bayi (rawat gabung / perawatan lanjut / rujukan) dengan laporan SBAR.',
    available: born,
    start: (c) => {
      c.s.phase = 'ended';
      c.s.endReason = 'selesai';
    },
  },
];

export const ACTION_MAP: Record<string, ActionDef> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export function isVentInterrupted(s: SimState) {
  return ventInterrupted(s);
}
