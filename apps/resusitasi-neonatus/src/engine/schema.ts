/**
 * Skema skenario (divalidasi saat runtime dengan zod).
 * Skenario hanya berisi DATA. Angka klinis pedoman (dosis, ambang) TIDAK ditulis di
 * skenario — engine mengambilnya dari src/clinical/guidelines.ts. Skenario hanya
 * mendeskripsikan pasien (berat, usia gestasi, fisiologi tersembunyi) dan penilaian.
 */
import { z } from 'zod';

export const DOMAINS = [
  'persiapan',
  'langkahAwal',
  'ventilasi',
  'kompresi',
  'obat',
  'komunikasi',
  'pascaresusitasi',
] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABEL: Record<Domain, string> = {
  persiapan: 'Persiapan',
  langkahAwal: 'Langkah awal',
  ventilasi: 'Ventilasi & jalan napas',
  kompresi: 'Kompresi dada',
  obat: 'Akses & obat',
  komunikasi: 'Komunikasi & tim',
  pascaresusitasi: 'Pascaresusitasi',
};

export const TOPICS = [
  'dasar',
  'ventilasi',
  'jalan-napas',
  'kompresi',
  'obat',
  'prematur',
  'termoregulasi',
  'kelainan-kongenital',
  'fasilitas-terbatas',
  'rujukan',
  'etika',
] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<Topic, string> = {
  dasar: 'Dasar',
  ventilasi: 'Ventilasi',
  'jalan-napas': 'Jalan napas',
  kompresi: 'Kompresi',
  obat: 'Obat & cairan',
  prematur: 'Prematur',
  termoregulasi: 'Termoregulasi',
  'kelainan-kongenital': 'Kelainan kongenital',
  'fasilitas-terbatas': 'Fasilitas terbatas',
  rujukan: 'Rujukan',
  etika: 'Etika & keputusan',
};

/** Satu langkah jalur ideal: pada detik ke-t (sejak lahir; negatif = sebelum lahir) lakukan tindakan. */
export const idealStepSchema = z.object({
  t: z.number(),
  action: z.string(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  note: z.string().optional(),
});
export type IdealStep = z.infer<typeof idealStepSchema>;

const paramMatch = z.object({
  param: z.string(),
  equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  oneOf: z.array(z.union([z.string(), z.number()])).optional(),
});

/** Cara memeriksa satu kriteria penilaian. */
export const checkSchema = z.discriminatedUnion('kind', [
  // tindakan dilakukan (opsional: paling lambat detik ke-`by`; `before` = sebelum lahir)
  z.object({ kind: z.literal('done'), action: z.string(), by: z.number().optional(), match: paramMatch.optional() }),
  // tindakan TIDAK dilakukan
  z.object({ kind: z.literal('notDone'), action: z.string() }),
  // tindakan `first` dilakukan sebelum `second` (atau second tidak dilakukan)
  z.object({ kind: z.literal('before'), first: z.string(), second: z.string() }),
  // tidak ada penilaian salah dari engine untuk kode tertentu (mis. 'fio2-start')
  z.object({ kind: z.literal('noJudgement'), code: z.string() }),
  // ada penilaian benar dari engine untuk kode tertentu
  z.object({ kind: z.literal('judgementOk'), code: z.string() }),
  // metrik akhir
  z.object({
    kind: z.literal('metric'),
    metric: z.enum(['finalTempInRange', 'stabilized', 'timeToEffectiveVentilationBy', 'noHyperoxiaProlonged']),
    value: z.number().optional(),
  }),
]);
export type Check = z.infer<typeof checkSchema>;

export const criterionSchema = z.object({
  id: z.string(),
  domain: z.enum(DOMAINS),
  text: z.string(),
  weight: z.number().positive().default(1),
  critical: z.boolean().default(false),
  check: checkSchema,
});
export type Criterion = z.infer<typeof criterionSchema>;

/** Kejadian terjadwal / terpicu dalam skenario. */
export const eventSchema = z.object({
  type: z.enum(['pneumothorax']),
  // muncul pada detik ke-at, atau setelah kondisi terpenuhi
  at: z.number().optional(),
  afterEffectiveVentilationS: z.number().optional(),
  side: z.enum(['kiri', 'kanan']).default('kanan'),
});

export const equipmentSchema = z.object({
  blender: z.boolean().default(true),
  oxygen: z.boolean().default(true),
  reservoir: z.boolean().default(true),
  pulseOximeter: z.boolean().default(true),
  ecgMonitor: z.boolean().default(true),
  tPiece: z.boolean().default(true),
  radiantWarmer: z.boolean().default(true),
  lma: z.boolean().default(true),
  intubation: z.boolean().default(true),
  uvc: z.boolean().default(true),
  io: z.boolean().default(true),
  epinephrine: z.boolean().default(true),
  co2Detector: z.boolean().default(true),
  transportIncubator: z.boolean().default(false),
});
export type Equipment = z.infer<typeof equipmentSchema>;

export const hiddenSchema = z.object({
  gaWeeks: z.number().min(22).max(44),
  weightKg: z.number().min(0.4).max(6),
  // "utang oksigen"/asfiksia awal 0 (bugar) – 100 (sangat berat)
  asphyxia: z.number().min(0).max(100),
  // depresi miokard awal 0 (normal) – 1 (henti); menentukan perlunya kompresi/epinefrin
  cardiacDepression: z.number().min(0).max(1).default(0),
  // batas pemulihan miokard dengan kompresi + ventilasi saja (tanpa epinefrin)
  compressionCeiling: z.number().min(0).max(1).default(1),
  // defisit volume intravaskular 0–1 (0,3 = kehilangan darah bermakna)
  volumeDeficit: z.number().min(0).max(1).default(0),
  // komplians paru 0–1 (1 = normal)
  lungCompliance: z.number().min(0.1).max(1).default(1),
  // PIP (cmH2O) minimal untuk mengembangkan paru pasien ini
  requiredPip: z.number().min(10).max(45).default(20),
  // dorongan napas spontan dasar setelah oksigenasi pulih (0–1)
  baseDrive: z.number().min(0).max(1).default(1),
  // detik oksigenasi baik sebelum dorongan napas pulih (mis. opioid)
  driveRecoveryS: z.number().min(0).default(0),
  // apnea primer: napas pulih dengan stimulasi
  respondsToStimulation: z.boolean().default(false),
  // masalah ventilasi yang perlu langkah koreksi MR. SOPA
  maskLeak: z.boolean().default(false),
  positionIssue: z.boolean().default(false),
  secretions: z.boolean().default(false),
  mouthClosed: z.boolean().default(false),
  meconium: z.boolean().default(false),
  // obstruksi anatomis
  obstruction: z.enum(['none', 'choanal', 'robin']).default('none'),
  cdh: z.boolean().default(false),
  // distres napas prematur (defisiensi surfaktan) — napas spontan tidak cukup tanpa CPAP
  rds: z.boolean().default(false),
  // batas atas SpO2 akibat pirau/hipertensi pulmonal (mis. hernia diafragmatika)
  spo2Ceiling: z.number().min(40).max(100).default(100),
  // pengali respons miokard terhadap epinefrin (0 = tidak responsif)
  epiResponse: z.number().min(0).max(1.5).default(1),
  // glukosa darah pascaresusitasi (mg/dL) — hasil pemeriksaan, bukan ambang klinis
  postGlucoseMgDl: z.number().default(60),
  // nilai awal suhu (°C)
  initialTempC: z.number().default(37),
  // penyebab dasar (ditampilkan saat debriefing)
  cause: z.string(),
});
export type Hidden = z.infer<typeof hiddenSchema>;

export const scenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
  title: z.string(),
  subtitle: z.string(),
  setting: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  topics: z.array(z.enum(TOPICS)).min(1),
  learningObjectives: z.array(z.string()).min(1),
  vignette: z.string(),
  // jawaban 4 pertanyaan pra-kelahiran + faktor risiko
  prebirth: z.object({
    gestation: z.string(),
    amnioticFluid: z.string(),
    riskFactors: z.array(z.string()),
    cordPlan: z.string(),
  }),
  // apakah bayi bugar saat lahir (menentukan pilihan tali pusat yang benar)
  vigorousAtBirth: z.boolean(),
  staffAtBirth: z.number().int().min(1).max(6),
  equipment: equipmentSchema.default({}),
  hidden: hiddenSchema,
  events: z.array(eventSchema).default([]),
  // apakah rujukan diperlukan pada akhir skenario
  referralRequired: z.boolean().default(false),
  // kandidat terapi hipotermia (ensefalopati hipoksik-iskemik sedang–berat)
  hieCandidate: z.boolean().default(false),
  // apakah penghentian resusitasi merupakan keputusan yang tepat di skenario ini
  discontinuationAppropriate: z.boolean().default(false),
  maxDurationS: z.number().positive().optional(),
  idealPath: z.array(idealStepSchema).min(1),
  // jalur salah untuk pengujian: harus menghasilkan kegagalan/penurunan skor
  wrongPath: z.array(idealStepSchema).min(1),
  criteria: z.array(criterionSchema).min(1),
  criticalErrors: z.array(z.string()).default([]),
  keyLearnings: z.array(z.string()).min(1),
  familyInfo: z.string().optional(),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioInput = z.input<typeof scenarioSchema>;

export function parseScenario(input: unknown): Scenario {
  return scenarioSchema.parse(input);
}
