/**
 * ============================================================================
 *  SUMBER TUNGGAL SEMUA ANGKA KLINIS SIMULATOR RESUSITASI NEONATUS
 * ============================================================================
 *
 *  ATURAN: tidak boleh ada angka klinis yang ditulis langsung di komponen,
 *  engine, atau skenario. Semua angka diambil dari file ini.
 *
 *  Sumber (dicocokkan langsung dengan dokumen primer):
 *   - AHA25  : Lee HC, Strand ML, Finan E, et al. Part 5: Neonatal Resuscitation:
 *              2025 American Heart Association and American Academy of Pediatrics
 *              Guidelines for CPR and ECC. Circulation 2025;152(suppl 2):S385–S423.
 *              doi:10.1161/CIR.0000000000001367. Rujukan ditulis "AHA25 S4xx" =
 *              nomor halaman jurnal, beserta kelas rekomendasi (COR) dan LOE.
 *   - NRP9   : Neonatal Resuscitation Program, 9th Edition — Reference Chart
 *              (AAP/AHA, © 2025, NRP209): pengaturan ventilasi awal, tabel target
 *              SpO2, tabel kedalaman/ukuran ETT, tabel obat kode neonatus.
 *   - IDAI22 : Alur Resusitasi Neonatus — Ikatan Dokter Anak Indonesia 2022 (bagan).
 *   - NRP8   : Textbook of Neonatal Resuscitation, 8th ed. (2021) — hanya untuk
 *              nilai yang tidak dimuat AHA25/NRP9 chart/IDAI22 (ditandai VERIFY).
 *   - SIM    : asumsi pemodelan simulator (BUKAN rekomendasi pedoman).
 *
 *  STATUS:
 *   - "terverifikasi" : dicocokkan langsung dengan teks AHA25, bagan NRP9, atau bagan
 *                       IDAI22 (halaman/bagian dicantumkan).
 *   - "VERIFY"        : tidak dimuat di ketiga dokumen tersebut; berasal dari NRP8/IDAI
 *                       buku/kebiasaan klinis. Wajib dicek manual — lihat
 *                       docs/CLINICAL_REVIEW.md.
 *   - "asumsi-sim"    : parameter simulasi, bukan rekomendasi klinis.
 *
 *  PERBEDAAN AHA25 vs IDAI22 (simulator memakai AHA25 untuk penilaian; nilai IDAI22
 *  ditampilkan di halaman Referensi): target SpO2 per menit, FiO2 awal prematur
 *  <32 minggu, tekanan CPAP. Lihat bagian "Perbedaan" di docs/CLINICAL_REVIEW.md.
 * ============================================================================
 */

export type ReviewStatus = 'terverifikasi' | 'VERIFY' | 'asumsi-sim';

export interface Range {
  min: number;
  max: number;
}

// ---------------------------------------------------------------------------
// 1. Tali pusat
// ---------------------------------------------------------------------------
export const CORD = {
  // AHA25 S395 (COR 2a, B-R): aterm tanpa kebutuhan resusitasi segera — deferred cord
  // clamping ≥60 dtk dapat bermanfaat. AHA25 S396 (COR 1, A): <37 mgg tanpa kebutuhan
  // resusitasi segera — DCC ≥60 dtk direkomendasikan. [terverifikasi]
  DELAYED_CLAMP_MIN_S: 60,
  // AHA25 S396 (COR 3: Harm, B-R): <28+0 mgg — intact cord milking tidak boleh
  // dilakukan. [terverifikasi]
  MILKING_MIN_GA_WEEKS: 28,
  // AHA25 S395 (COR 2b, B-R): bayi tidak bugar aterm & late preterm ≥35 mgg — intact
  // cord milking dapat dipertimbangkan dibanding klem segera (RCT: 35–42 mgg).
  // Batas atas 44 hanya batas skema simulator. [terverifikasi]
  MILKING_NONVIGOROUS_GA: { min: 35, max: 44 } as Range,
  // AHA25 S396 (COR 2b, B-R): 28+0–36+6 mgg tanpa kebutuhan resusitasi segera dan DCC
  // tidak dapat dilakukan — intact cord milking dapat dipertimbangkan. [terverifikasi]
  MILKING_PRETERM_GA: { min: 28, max: 36.86 } as Range,
} as const;

// ---------------------------------------------------------------------------
// 2. Termoregulasi
// ---------------------------------------------------------------------------
export const TEMPERATURE = {
  // AHA25 S398 (COR 1, B-NR): suhu dipantau & dipertahankan 36,5–37,5 °C. [terverifikasi]
  TARGET_C: { min: 36.5, max: 37.5 } as Range,
  // AHA25 S398 (COR 1, B-NR): hipotermia (<36 °C) harus dicegah; S418 (COR 1, C-LD):
  // bila <36 °C setelah resusitasi, hangatkan kembali. [terverifikasi]
  HYPOTHERMIA_MODERATE_BELOW_C: 36.0,
  // AHA25 S398 (COR 1, B-NR): hipertermia (>38 °C) harus dicegah. [terverifikasi]
  HYPERTHERMIA_ABOVE_C: 38.0,
  // IDAI22 (catatan *): UG <32 mgg atau BL <1500 g — langsung dibungkus plastik tanpa
  // dikeringkan kecuali wajah, lalu topi. AHA25 S399 (COR 2a, B-R) menganjurkan plastik
  // untuk prematur tanpa batas usia gestasi. [terverifikasi: IDAI22]
  PLASTIC_WRAP_BELOW_GA_WEEKS: 32,
  PLASTIC_WRAP_BELOW_WEIGHT_KG: 1.5,
  // AHA25 S399: suhu ruang >23 °C ("23 °C and above") untuk prematur. [terverifikasi]
  ROOM_TEMP_PRETERM_MIN_C: 23,
} as const;

// ---------------------------------------------------------------------------
// 3. Ambang frekuensi jantung (HR)
// ---------------------------------------------------------------------------
export const HEART_RATE = {
  // AHA25 S403 (COR 1, B-NR): ventilasi bila apnea/megap-megap atau bradikardia
  // persisten (HR <100) meski langkah awal. Fig. 2 S389. [terverifikasi]
  PPV_BELOW_BPM: 100,
  // AHA25 S411 (COR 1, C-EO): kompresi bila HR <60 meski 30 dtk ventilasi yang
  // mengembangkan paru. [terverifikasi]
  COMPRESSIONS_BELOW_BPM: 60,
  // AHA25 S415 (COR 1, B-NR): epinefrin bila HR belum ≥60 setelah ventilasi & kompresi
  // dioptimalkan. [terverifikasi]
  EPINEPHRINE_BELOW_BPM: 60,
  // Rentang HR normal pascatransisi — tidak dimuat AHA25/NRP9 chart. NRP8. VERIFY.
  NORMAL_RANGE_BPM: { min: 100, max: 160 } as Range,
  // Hitung HR dengan stetoskop 6 dtk × 10 — tidak dimuat AHA25. NRP8. VERIFY.
  AUSCULTATION_WINDOW_S: 6,
  AUSCULTATION_MULTIPLIER: 10,
  // Toleransi penilaian hasil hitung pengguna (asumsi-sim).
  AUSCULTATION_TOLERANCE_BPM: 20,
} as const;

// ---------------------------------------------------------------------------
// 4. Waktu kunci algoritma
// ---------------------------------------------------------------------------
export const TIMING = {
  // AHA25 S403 (COR 1, B-NR): ventilasi diberikan dalam 60 detik setelah lahir;
  // risiko kematian naik 16% tiap 30 dtk penundaan. [terverifikasi]
  PPV_START_DEADLINE_S: 60,
  // IDAI22: "VTP efektif dalam 15 detik"; NRP: nilai gerak dada dalam 15 dtk dan HR
  // setelah ±30 dtk ventilasi. [terverifikasi: IDAI22 untuk 15 dtk]
  PPV_ASSESS_AFTER_S: { min: 15, max: 30 } as Range,
  // AHA25 S411 (COR 1, C-EO): kompresi bila HR <60 meski 30 dtk ventilasi yang
  // mengembangkan paru (dada bergerak). [terverifikasi]
  PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S: 30,
  // AHA25 S393: epinefrin bila HR <60 meski 60 dtk kompresi + ventilasi adekuat. [terverifikasi]
  COMPRESSIONS_REASSESS_S: 60,
  // AHA25 S416 (COR 2b, C-LD) & Fig. 2: epinefrin dapat diulang tiap 3–5 menit.
  // [terverifikasi]
  EPINEPHRINE_REPEAT_S: { min: 180, max: 300 } as Range,
  // Batas satu upaya intubasi ±30 dtk — tidak dimuat AHA25. NRP8. VERIFY.
  INTUBATION_ATTEMPT_MAX_S: 30,
  // AHA25 S419 (COR 1, C-LD): bila tidak ada HR dan semua langkah sudah dilakukan,
  // penghentian didiskusikan dengan tim & keluarga; kerangka waktu ±20 menit setelah
  // lahir. [terverifikasi]
  DISCONTINUE_CONSIDER_S: 20 * 60,
} as const;

// ---------------------------------------------------------------------------
// 5. Ventilasi & CPAP
// ---------------------------------------------------------------------------
export const VENTILATION = {
  // AHA25 S403 (COR 2a, C-LD): PIP awal 20–30 cmH2O, disesuaikan. [terverifikasi]
  PIP_INITIAL_CMH2O: { min: 20, max: 30 } as Range,
  // NRP9 chart: PIP 25 cmH2O; rentang 25–30 (≥32 mgg) dan 20–25 (<32 mgg). [terverifikasi]
  PIP_NRP9_DEFAULT_CMH2O: 25,
  PIP_TERM_NRP9_CMH2O: { min: 25, max: 30 } as Range,
  PIP_PRETERM_CMH2O: { min: 20, max: 25 } as Range,
  // Langkah P (koreksi): naik bertahap; batas maks 40 (aterm) / 30 (prematur) — tidak
  // dimuat AHA25/NRP9 chart (AHA25 S403 COR 3: Harm: PIP berlebihan harus dihindari).
  // NRP8. VERIFY.
  PIP_STEP_CMH2O: 5,
  PIP_MAX_TERM_CMH2O: 40,
  PIP_MAX_PRETERM_CMH2O: 30,
  // NRP9 chart: PEEP 5 cmH2O. AHA25 S403 (COR 2b, C-LD): PEEP mungkin wajar, nilai
  // optimal belum ditentukan. [terverifikasi]
  PEEP_CMH2O: 5,
  // Rentang PEEP yang diterima simulator (asumsi-sim).
  PEEP_ACCEPTABLE_CMH2O: { min: 5, max: 8 } as Range,
  // AHA25 S404 (COR 2a, C-LD) & NRP9 chart: 30–60 inflasi/menit. [terverifikasi]
  RATE_PER_MIN: { min: 30, max: 60 } as Range,
  // Laju contoh di jalur ideal (dalam rentang di atas) — asumsi-sim.
  RATE_TYPICAL_PER_MIN: 40,
  // AHA25 S404 (COR 2a, C-LD): waktu inflasi 0,5–1 detik. [terverifikasi]
  INFLATION_TIME_S: { min: 0.5, max: 1 } as Range,
  // AHA25 S404 (COR 3: Harm, B-R): <28 mgg — sustained inflation rutin (>5 dtk)
  // berpotensi membahayakan. [terverifikasi]
  SUSTAINED_INFLATION_MAX_S: 5,
  SUSTAINED_INFLATION_HARM_BELOW_GA: 28,
  // NRP9 chart: aliran gas 10 L/menit. [terverifikasi]
  GAS_FLOW_L_MIN: 10,
  // IDAI22: CPAP dengan TPAE 7 cmH2O + O2 sesuai target SpO2; gagal CPAP bila TPAE
  // 8 cmH2O masih distres berat / SpO2 tidak tercapai dengan FiO2 >40% → intubasi.
  // AHA25 S407 (COR 2a, A) menganjurkan CPAP untuk prematur bernapas spontan tanpa
  // menyebut tekanan. [terverifikasi: IDAI22]
  CPAP_CMH2O: 7,
  CPAP_ACCEPTABLE_CMH2O: { min: 5, max: 8 } as Range,
  CPAP_FAIL_CMH2O: 8,
  CPAP_FAIL_FIO2: 40,
  // PIP yang dianggap berisiko barotrauma/pneumotoraks (asumsi-sim).
  BAROTRAUMA_PIP_CMH2O: 35,
  BAROTRAUMA_DURATION_S: 45,
} as const;

// ---------------------------------------------------------------------------
// 6. Oksigen
// ---------------------------------------------------------------------------
export const OXYGEN = {
  // AHA25 S409 (COR 2b, C-LD) & NRP9 chart: ≥35 mgg mulai 21%. [terverifikasi]
  FIO2_START_TERM: { min: 21, max: 21 } as Range,
  // AHA25 S409 (COR 2b, C-LD) & NRP9 chart: 32–34+6 mgg mulai 21–30%. [terverifikasi]
  FIO2_START_32_34: { min: 21, max: 30 } as Range,
  // AHA25 S409 (COR 2b, C-LD) & NRP9 chart: <32 mgg mulai 30–100% (≥30%).
  // CATATAN: IDAI22 memakai 21–30% untuk semua <35 mgg (lihat IDAI_FIO2). [terverifikasi]
  FIO2_START_BELOW_32: { min: 30, max: 100 } as Range,
  GA_TERM_THRESHOLD_WEEKS: 35,
  GA_VERY_PRETERM_THRESHOLD_WEEKS: 32,
  // AHA25 S411 (COR 2b, C-EO) & Fig. 2: 100% O2 saat kompresi; setelah tidak perlu
  // kompresi, titrasi ke target. [terverifikasi]
  FIO2_DURING_COMPRESSIONS: 100,
  // Turunkan FiO2 bila SpO2 >95% dengan O2 tambahan — batas atas tabel target 10 menit
  // (AHA25 Fig. 2: 85–95%). [terverifikasi]
  SPO2_HYPEROXIA_ABOVE: 95,
  // Toleransi di bawah target sebelum dinilai "di bawah target" (asumsi-sim).
  SPO2_TOLERANCE_BELOW: 5,
  // Tanpa blender (balon mengembang sendiri): udara 21%; O2 tanpa reservoir ±40%;
  // dengan reservoir ±90–100% — tidak dimuat AHA25/NRP9 chart. NRP8. VERIFY.
  SIB_FIO2_ROOM_AIR: 21,
  SIB_FIO2_NO_RESERVOIR: 40,
  SIB_FIO2_WITH_RESERVOIR: 100,
} as const;

/** IDAI22 — FiO2 awal: ≥35 mgg 21%; <35 mgg 21–30%. Hanya untuk referensi. [terverifikasi] */
export const IDAI_FIO2 = {
  TERM: { min: 21, max: 21 } as Range,
  BELOW_35: { min: 21, max: 30 } as Range,
} as const;

/**
 * Target SpO2 preduktal (tangan/pergelangan kanan) — AHA25 Fig. 2 (S389) dan NRP9
 * chart: tabel dimulai menit ke-2. [terverifikasi]
 * Di antara menit 5 dan 10 simulator melakukan interpolasi linear (asumsi-sim).
 * Sebelum menit ke-2 tidak ada target (simulator tidak menilai SpO2).
 */
export const SPO2_TARGETS: ReadonlyArray<{ minute: number; min: number; max: number }> = [
  { minute: 2, min: 65, max: 70 },
  { minute: 3, min: 70, max: 75 },
  { minute: 4, min: 75, max: 80 },
  { minute: 5, min: 80, max: 85 },
  { minute: 10, min: 85, max: 95 },
];

/** IDAI22 — target SpO2 preduktal (lebih lebar). Hanya untuk halaman Referensi. [terverifikasi] */
export const IDAI_SPO2_TARGETS: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: '1 menit', min: 60, max: 70 },
  { label: '2 menit', min: 65, max: 85 },
  { label: '3 menit', min: 70, max: 90 },
  { label: '4 menit', min: 75, max: 90 },
  { label: '5 menit', min: 80, max: 90 },
  { label: '10 menit', min: 85, max: 90 },
  { label: '>15 menit', min: 90, max: 95 },
];

// ---------------------------------------------------------------------------
// 7. Jalan napas lanjutan
// ---------------------------------------------------------------------------
/**
 * NRP9 chart — "Initial Endotracheal Tube Insertion Depth ('Tip to Gum') for
 * Orotracheal Intubation": kedalaman diukur DI GUSI. [terverifikasi]
 * (2,0 mm opsional untuk <23–24 mgg.)
 */
export const ETT_TABLE: ReadonlyArray<{ minGa: number; maxGa: number; maxWeightKg: number; depthCm: number; sizesMm: number[] }> = [
  { minGa: 0, maxGa: 22, maxWeightKg: 0.5, depthCm: 5.0, sizesMm: [2.0, 2.5] },
  { minGa: 23, maxGa: 24, maxWeightKg: 0.6, depthCm: 5.5, sizesMm: [2.0, 2.5] },
  { minGa: 25, maxGa: 26, maxWeightKg: 0.8, depthCm: 6.0, sizesMm: [2.5] },
  { minGa: 27, maxGa: 29, maxWeightKg: 1.0, depthCm: 6.5, sizesMm: [2.5] },
  { minGa: 30, maxGa: 32, maxWeightKg: 1.4, depthCm: 7.0, sizesMm: [2.5, 3.0] },
  { minGa: 33, maxGa: 34, maxWeightKg: 1.8, depthCm: 7.5, sizesMm: [3.0] },
  { minGa: 35, maxGa: 37, maxWeightKg: 2.4, depthCm: 8.0, sizesMm: [3.0, 3.5] },
  { minGa: 38, maxGa: 40, maxWeightKg: 3.1, depthCm: 8.5, sizesMm: [3.5] },
  { minGa: 41, maxGa: 44, maxWeightKg: Infinity, depthCm: 9.0, sizesMm: [3.5] },
];

export const AIRWAY = {
  // AHA25 S405 (COR 2a, C-LD): laryngeal mask wajar sebagai alternatif intubasi bila
  // ventilasi masker gagal pada ≥34+0 mgg; (COR 2b) dapat dipakai sebagai antarmuka
  // primer pada ≥34+0 mgg. [terverifikasi]
  LMA_MIN_GA_WEEKS: 34,
  // AHA25 S406: banyak produsen menetapkan batas berat bawah 2 kg; efektivitas <2 kg
  // masih kesenjangan pengetahuan (S421). [terverifikasi]
  LMA_MIN_WEIGHT_KG: 2,
  // Ukuran LMA neonatus 1 — tidak dimuat AHA25/NRP9 chart. NRP8. VERIFY.
  LMA_SIZE: 1,
  // Pilihan ukuran ETT di antarmuka (NRP9 chart). [terverifikasi]
  ETT_SIZES_MM: [2.0, 2.5, 3.0, 3.5, 4.0] as ReadonlyArray<number>,
  // Toleransi kedalaman (asumsi-sim): ±0,5 cm benar; ≥+1 cm = bronkus utama kanan;
  // ≤−1 cm = terlalu dangkal.
  ETT_DEPTH_TOLERANCE_CM: 0.5,
  ETT_DEPTH_MALPOSITION_CM: 1,
  // Bilah laringoskop 00/0/1 — tidak dimuat AHA25/NRP9 chart. NRP8. VERIFY.
  BLADE_BY_GA: [
    { maxGa: 27, blade: '00' },
    { maxGa: 36, blade: '0' },
    { maxGa: Infinity, blade: '1' },
  ] as ReadonlyArray<{ maxGa: number; blade: string }>,
  // Pipa orogastrik 8 Fr; 10 Fr dengan isap pada HDK — NRP8. VERIFY.
  OGT_FR: 8,
  OGT_CDH_FR: 10,
  // Pierre Robin: pipa nasofaring (ETT 2,5 mm via hidung) — NRP8. VERIFY.
  NASOPHARYNGEAL_TUBE_MM: 2.5,
  // Masker menutupi dagu, mulut, hidung tanpa menekan mata; simulator memakai masker
  // kecil untuk <2 kg. asumsi-sim.
  MASK_SMALL_BELOW_KG: 2,
} as const;

// ---------------------------------------------------------------------------
// 8. Kompresi dada
// ---------------------------------------------------------------------------
export const COMPRESSIONS = {
  // AHA25 S412 (COR 2b, C-LD): rasio 3:1. [terverifikasi]
  RATIO_COMPRESSIONS: 3,
  RATIO_BREATHS: 1,
  // AHA25 S393: 30 inflasi + 90 kompresi per menit. [terverifikasi]
  EVENTS_PER_MIN: 120,
  COMPRESSIONS_PER_MIN: 90,
  BREATHS_PER_MIN: 30,
  // AHA25 S412 (COR 2b, C-LD): teknik dua ibu jari melingkari dada; kedalaman 1/3
  // diameter AP; sepertiga bawah sternum (di atas prosesus xifoideus). [terverifikasi]
  DEPTH_FRACTION_AP: 1 / 3,
  // AHA25 S412 (COR 2b, C-EO): ganti petugas kompresi tiap 2–5 menit, saat penilaian HR.
  // [terverifikasi]
  ROTATE_COMPRESSOR_S: { min: 120, max: 300 } as Range,
} as const;

// ---------------------------------------------------------------------------
// 9. Akses vaskular
// ---------------------------------------------------------------------------
export const ACCESS = {
  // AHA25 S414 (COR 1, C-LD): kateter vena umbilikal untuk akses darurat; (COR 2a,
  // C-LD) IO bila IV tidak berhasil/tidak memungkinkan. [terverifikasi]
  // Ukuran 3,5–5 Fr dan kedalaman 2–4 cm (low-lying) — tidak dimuat AHA25. NRP8. VERIFY.
  UVC_FR: { min: 3.5, max: 5 } as Range,
  UVC_DEPTH_CM: { min: 2, max: 4 } as Range,
} as const;

// ---------------------------------------------------------------------------
// 10. Obat & cairan
// ---------------------------------------------------------------------------
export const EPINEPHRINE = {
  // NRP9 chart: konsentrasi 0,1 mg/mL (1 mg/10 mL). [terverifikasi]
  CONCENTRATION_MG_PER_ML: 0.1,
  // AHA25 S415 (COR 1, B-NR): intravaskular 0,01–0,03 mg/kg. [terverifikasi]
  IV_DOSE_MG_PER_KG: { min: 0.01, max: 0.03 } as Range,
  // NRP9 chart: dosis yang diajarkan IV/IO 0,02 mg/kg (= 0,2 mL/kg). [terverifikasi]
  IV_DOSE_TYPICAL_MG_PER_KG: 0.02,
  // AHA25 S415 (COR 2a, C-LD): endotrakeal 0,05–0,1 mg/kg sambil menunggu akses.
  // [terverifikasi]
  ETT_DOSE_MG_PER_KG: { min: 0.05, max: 0.1 } as Range,
  // NRP9 chart: dosis ETT yang diajarkan 0,1 mg/kg (= 1 mL/kg); tanpa bilas. [terverifikasi]
  ETT_DOSE_TYPICAL_MG_PER_KG: 0.1,
  // AHA25 S416 & NRP9 chart: bilas NaCl 0,9% 3 mL berapa pun berat lahir. [terverifikasi]
  FLUSH_ML: 3,
  // Toleransi volume bilas (asumsi-sim).
  FLUSH_TOLERANCE_ML: 1,
  // Toleransi pembulatan volume (asumsi-sim): ±0,05 mL atau ±10%.
  VOLUME_TOLERANCE_ML: 0.05,
  VOLUME_TOLERANCE_FRACTION: 0.1,
  // Dosis dianggap overdosis berbahaya bila ≥3× batas atas (asumsi-sim; AHA25 S416:
  // dosis IV tinggi berulang → hipertensi & takikardia).
  OVERDOSE_FACTOR: 3,
} as const;

export const VOLUME_EXPANDER = {
  // AHA25 S417 (COR 2b, C-EO): NaCl 0,9% atau darah 10–20 mL/kg; infus stabil 5–10
  // menit wajar. NRP9 chart: NaCl 0,9% 10 mL/kg dalam 5–10 menit. [terverifikasi]
  DOSE_ML_PER_KG: 10,
  DOSE_RANGE_ML_PER_KG: { min: 10, max: 20 } as Range,
  DOSE_TOLERANCE_ML_PER_KG: 1,
  INFUSION_DURATION_S: { min: 5 * 60, max: 10 * 60 } as Range,
  // Volume >2× batas atas dalam satu bolus dianggap berbahaya (asumsi-sim).
  EXCESS_FACTOR: 2,
} as const;

export const GLUCOSE = {
  // AHA25 S418 (COR 1, B-NR): pantau glukosa sejak dini setelah resusitasi lanjut
  // (tanpa angka ambang). Ambang <45 mg/dL dan bolus D10% 2 mL/kg — IDAI/AAP. VERIFY.
  HYPOGLYCEMIA_BELOW_MG_DL: 45,
  D10_BOLUS_ML_PER_KG: 2,
  D10_TOLERANCE_ML_PER_KG: 0.5,
} as const;

export const NOT_RECOMMENDED = {
  // Tidak dibahas di AHA25. NRP8/AHA 2020: natrium bikarbonat tidak dianjurkan. VERIFY.
  SODIUM_BICARBONATE: true,
  // Tidak dibahas di AHA25. NRP8/AHA 2020: nalokson tidak dianjurkan sebagai bagian
  // resusitasi awal. VERIFY.
  NALOXONE_DURING_RESUSCITATION: true,
  // AHA25 S400 (COR 3: No Benefit, B-R): isap oral/nasal/orofaring/endotrakeal rutin
  // tidak direkomendasikan, jernih maupun bermekonium. (COR 2a, C-EO): intubasi & isap
  // trakea bila ada bukti obstruksi trakea saat ventilasi. [terverifikasi]
  ROUTINE_TRACHEAL_SUCTION_MECONIUM: true,
} as const;

// ---------------------------------------------------------------------------
// 11. Pascaresusitasi & rujukan
// ---------------------------------------------------------------------------
export const POST_RESUSCITATION = {
  // AHA25 S418 (COR 1, A): ≥36 mgg dengan HIE sedang–berat → terapi hipotermia dengan
  // protokol; target 33,5–34,5 °C dimulai dalam 6 jam selama 72 jam. [terverifikasi]
  HYPOTHERMIA_THERAPY_MIN_GA_WEEKS: 36,
  HYPOTHERMIA_THERAPY_WINDOW_H: 6,
  HYPOTHERMIA_THERAPY_TARGET_C: { min: 33.5, max: 34.5 } as Range,
  HYPOTHERMIA_THERAPY_DURATION_H: 72,
  // Laju napas normal 40–60/menit — IDAI. VERIFY.
  RESP_RATE_NORMAL: { min: 40, max: 60 } as Range,
} as const;

export const PNEUMOTHORAX = {
  // Aspirasi jarum 18–20 G, SIC 4 LAA atau SIC 2 LMK — tidak dimuat AHA25 (S417 hanya
  // menyebut torakosentesis). NRP8. VERIFY.
  NEEDLE_GAUGE: { min: 18, max: 20 } as Range,
} as const;

// ---------------------------------------------------------------------------
// 12. Asumsi simulasi (durasi tindakan & dinamika) — BUKAN rekomendasi pedoman
// ---------------------------------------------------------------------------
export const SIM = {
  TICK_S: 1,
  SPEEDS_LEARN: [1, 2, 4] as ReadonlyArray<number>,
  // Durasi tindakan (detik)
  DURATION_S: {
    assess: 0,
    dry: 10,
    position: 3,
    suction: 6,
    stimulate: 5,
    wrap: 10,
    hat: 3,
    pulseOx: 3,
    ecg: 10,
    tempProbe: 3,
    maskAdjust: 3,
    reposition: 3,
    openMouth: 2,
    lma: 15,
    intubation: 25,
    confirmTube: 5,
    ogt: 15,
    oralAirway: 5,
    nasopharyngeal: 15,
    prone: 5,
    uvc: 90,
    io: 60,
    drugPrep: 25,
    drugGive: 5,
    flush: 5,
    needle: 40,
    transillumination: 10,
    glucose: 60,
    callHelpArrival: 60,
  },
  // Waktu oksimeter mendapat sinyal (asumsi-sim). AHA25 S410: median 238 dtk pada bayi
  // yang diresusitasi (video 230 bayi); 260 dtk bayi asfiksia vs 100 dtk kontrol.
  // Simulator memakai 90 dtk sebagai kompromi — EKG lebih cepat (AHA25 S401).
  PULSE_OX_ACQUIRE_S: 90,
  // HR minimal agar oksimeter membaca (perfusi), asumsi-sim.
  PULSE_OX_MIN_HR: 60,
  // Detektor CO2 dapat negatif palsu bila curah jantung sangat rendah (NRP) —
  // asumsi-sim: HR <60 dianggap curah jantung sangat rendah.
  CO2_DETECTOR_MIN_HR: 60,
  // Jeda kerja epinefrin (detik) setelah diberikan (asumsi-sim).
  EPI_IV_ONSET_S: 20,
  EPI_ETT_ONSET_S: 60,
  // HR awal dan basal pascatransisi (asumsi-sim).
  BASELINE_HR: 145,
  // Bayi dianggap stabil bila HR ≥100 dan SpO2 di target selama ini (detik).
  STABLE_HOLD_S: 30,
  // Batas waktu skenario bawaan (detik) bila tidak ditentukan skenario.
  DEFAULT_MAX_S: 15 * 60,
  // Pembobotan skor: kesalahan kritis membatasi skor maksimal.
  CRITICAL_SCORE_CAP: 59,
  // Hiperoksia (SpO2 >95% dengan O2 tambahan) lebih lama dari ini dinilai salah.
  HYPEROXIA_TOLERANCE_S: 60,
  // Kompresi diteruskan padahal HR ≥60 lebih lama dari ini dinilai salah.
  COMPRESSIONS_OVERRUN_S: 30,
  // Isap jalan napas tanpa indikasi pada bayi bugar dapat memicu bradikardia vagal.
  MAX_STAFF: 5,
  PASS_SCORE: 75,
} as const;

// ---------------------------------------------------------------------------
// 13. Pilihan nilai pada antarmuka (bukan rekomendasi; daftar pilihan saja)
// ---------------------------------------------------------------------------
export const UI_OPTIONS = {
  FIO2: [21, 25, 30, 40, 50, 60, 80, 100] as ReadonlyArray<number>,
  PIP: [15, 18, 20, 22, 25, 30, 35, 40] as ReadonlyArray<number>,
  PEEP: [0, 3, 5, 6, 8] as ReadonlyArray<number>,
  RATE: [20, 30, 40, 50, 60, 80] as ReadonlyArray<number>,
  CPAP: [3, 5, 6, 7, 8, 10] as ReadonlyArray<number>,
  ETT_DEPTH_CM: [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as ReadonlyArray<number>,
  BLADES: ['00', '0', '1'] as ReadonlyArray<string>,
  BOLUS_DURATION_MIN: [1, 5, 10] as ReadonlyArray<number>,
  LMA_SIZES: [1, 1.5, 2] as ReadonlyArray<number>,
} as const;

// ---------------------------------------------------------------------------
// Fungsi bantu (hanya hitungan dari angka di atas)
// ---------------------------------------------------------------------------

/** Rentang target SpO2 preduktal pada detik ke-t sejak lahir; null bila < 2 menit. */
export function spo2TargetAt(tSeconds: number): Range | null {
  const minute = tSeconds / 60;
  const table = SPO2_TARGETS;
  if (minute < table[0].minute) return null;
  if (minute >= table[table.length - 1].minute) {
    const last = table[table.length - 1];
    return { min: last.min, max: last.max };
  }
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (minute >= a.minute && minute < b.minute) {
      if (b.minute - a.minute === 1) return { min: a.min, max: a.max };
      // interpolasi linear (asumsi-sim) antara menit 5 dan 10
      const f = (minute - a.minute) / (b.minute - a.minute);
      return {
        min: Math.round(a.min + (b.min - a.min) * f),
        max: Math.round(a.max + (b.max - a.max) * f),
      };
    }
  }
  return null;
}

/** Rentang FiO2 awal (%) yang dianjurkan untuk usia gestasi tertentu. */
export function initialFio2Range(gaWeeks: number): Range {
  if (gaWeeks >= OXYGEN.GA_TERM_THRESHOLD_WEEKS) return OXYGEN.FIO2_START_TERM;
  if (gaWeeks >= OXYGEN.GA_VERY_PRETERM_THRESHOLD_WEEKS) return OXYGEN.FIO2_START_32_34;
  return OXYGEN.FIO2_START_BELOW_32;
}

function ettRowByGa(gaWeeks: number) {
  const ga = Math.floor(gaWeeks);
  return ETT_TABLE.find((r) => ga >= r.minGa && ga <= r.maxGa) ?? (ga < ETT_TABLE[0].minGa ? ETT_TABLE[0] : ETT_TABLE[ETT_TABLE.length - 1]);
}
function ettRowByWeight(weightKg: number) {
  return ETT_TABLE.find((r) => weightKg <= r.maxWeightKg) ?? ETT_TABLE[ETT_TABLE.length - 1];
}

/** Ukuran ETT (mm) yang dianjurkan (NRP9: ukuran terbesar pada baris berat badan). */
export function recommendedEttSize(weightKg: number, _gaWeeks?: number): number {
  const sizes = ettRowByWeight(weightKg).sizesMm;
  return sizes[sizes.length - 1];
}

/** Ukuran ETT yang dapat diterima: sesuai baris berat ATAU baris usia gestasi (NRP9). */
export function acceptableEttSizes(weightKg: number, gaWeeks: number): number[] {
  return Array.from(new Set([...ettRowByWeight(weightKg).sizesMm, ...ettRowByGa(gaWeeks).sizesMm])).sort((a, b) => a - b);
}

/** Kedalaman ETT diukur di GUSI ("tip to gum", cm) berdasarkan usia gestasi (NRP9). */
export function recommendedEttDepth(gaWeeks: number): number {
  return ettRowByGa(gaWeeks).depthCm;
}

export function recommendedBlade(gaWeeks: number): string {
  const row = AIRWAY.BLADE_BY_GA.find((r) => gaWeeks <= r.maxGa);
  return row ? row.blade : '1';
}

export function lmaAppropriate(gaWeeks: number, weightKg: number): boolean {
  return gaWeeks >= AIRWAY.LMA_MIN_GA_WEEKS && weightKg >= AIRWAY.LMA_MIN_WEIGHT_KG;
}

export function isPreterm(gaWeeks: number): boolean {
  return gaWeeks < 37;
}

export function pipRange(gaWeeks: number): Range {
  return gaWeeks < OXYGEN.GA_VERY_PRETERM_THRESHOLD_WEEKS
    ? VENTILATION.PIP_PRETERM_CMH2O
    : VENTILATION.PIP_INITIAL_CMH2O;
}

export function pipMax(gaWeeks: number): number {
  return isPreterm(gaWeeks) ? VENTILATION.PIP_MAX_PRETERM_CMH2O : VENTILATION.PIP_MAX_TERM_CMH2O;
}

/** Dosis epinefrin (mg) dan volume (mL) yang dianjurkan untuk rute tertentu. */
export function epinephrineDose(weightKg: number, route: 'iv' | 'io' | 'ett') {
  const perKg = route === 'ett' ? EPINEPHRINE.ETT_DOSE_MG_PER_KG : EPINEPHRINE.IV_DOSE_MG_PER_KG;
  const typical =
    route === 'ett' ? EPINEPHRINE.ETT_DOSE_TYPICAL_MG_PER_KG : EPINEPHRINE.IV_DOSE_TYPICAL_MG_PER_KG;
  const c = EPINEPHRINE.CONCENTRATION_MG_PER_ML;
  return {
    mg: { min: round3(perKg.min * weightKg), max: round3(perKg.max * weightKg) },
    ml: { min: round3((perKg.min * weightKg) / c), max: round3((perKg.max * weightKg) / c) },
    typicalMg: round3(typical * weightKg),
    typicalMl: round3((typical * weightKg) / c),
  };
}

export function needsPlasticWrap(gaWeeks: number, weightKg: number): boolean {
  return gaWeeks < TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS || weightKg < TEMPERATURE.PLASTIC_WRAP_BELOW_WEIGHT_KG;
}

export function volumeBolusMl(weightKg: number): number {
  return Math.round(VOLUME_EXPANDER.DOSE_ML_PER_KG * weightKg * 10) / 10;
}

export function d10BolusMl(weightKg: number): number {
  return Math.round(GLUCOSE.D10_BOLUS_ML_PER_KG * weightKg * 10) / 10;
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Registri untuk halaman Referensi & docs/CLINICAL_REVIEW.md
// ---------------------------------------------------------------------------
export interface RegistryEntry {
  key: string;
  parameter: string;
  value: string;
  source: string;
  status: ReviewStatus;
}

const A = 'AHA25';
const N9 = 'NRP9 Reference Chart (2025)';
const I22 = 'IDAI 2022 (Alur Resusitasi Neonatus)';
const N8 = 'NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22';

export const GUIDELINE_REGISTRY: ReadonlyArray<RegistryEntry> = [
  { key: 'CORD.DELAYED_CLAMP_MIN_S', parameter: 'Penundaan penjepitan tali pusat (tanpa kebutuhan resusitasi segera)', value: `≥${CORD.DELAYED_CLAMP_MIN_S} detik (aterm: COR 2a; <37 mgg: COR 1)`, source: `${A} S395 (2a, B-R), S396 (1, A)`, status: 'terverifikasi' },
  { key: 'CORD.MILKING_MIN_GA_WEEKS', parameter: 'Intact cord milking dilarang pada', value: `<${CORD.MILKING_MIN_GA_WEEKS}+0 minggu (COR 3: Harm)`, source: `${A} S396 (3: Harm, B-R)`, status: 'terverifikasi' },
  { key: 'CORD.MILKING_NONVIGOROUS_GA', parameter: 'Intact cord milking dapat dipertimbangkan pada bayi tidak bugar', value: `≥${CORD.MILKING_NONVIGOROUS_GA.min} minggu (COR 2b)`, source: `${A} S395 (2b, B-R)`, status: 'terverifikasi' },
  { key: 'CORD.MILKING_PRETERM_GA', parameter: 'Intact cord milking bila DCC tidak bisa (prematur, tanpa resusitasi segera)', value: '28+0–36+6 minggu (COR 2b)', source: `${A} S396 (2b, B-R)`, status: 'terverifikasi' },
  { key: 'TEMPERATURE.TARGET_C', parameter: 'Target suhu', value: `${TEMPERATURE.TARGET_C.min}–${TEMPERATURE.TARGET_C.max} °C`, source: `${A} S398 (1, B-NR)`, status: 'terverifikasi' },
  { key: 'TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C', parameter: 'Hipotermia (cegah; hangatkan kembali)', value: `<${TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C} °C`, source: `${A} S398 (1, B-NR), S418 (1, C-LD)`, status: 'terverifikasi' },
  { key: 'TEMPERATURE.HYPERTHERMIA_ABOVE_C', parameter: 'Hipertermia (cegah)', value: `>${TEMPERATURE.HYPERTHERMIA_ABOVE_C} °C`, source: `${A} S398 (1, B-NR)`, status: 'terverifikasi' },
  { key: 'TEMPERATURE.PLASTIC_WRAP', parameter: 'Plastik tanpa dikeringkan (kecuali wajah) + topi', value: `UG <${TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS} mgg atau BL <1500 g`, source: `${I22} catatan *; ${A} S399 (2a, B-R) tanpa batas UG`, status: 'terverifikasi' },
  { key: 'TEMPERATURE.ROOM_TEMP_PRETERM_MIN_C', parameter: 'Suhu ruang untuk prematur', value: `≥${TEMPERATURE.ROOM_TEMP_PRETERM_MIN_C} °C`, source: `${A} S399`, status: 'terverifikasi' },
  { key: 'HEART_RATE.PPV_BELOW_BPM', parameter: 'Indikasi ventilasi', value: `Apnea/megap-megap atau HR <${HEART_RATE.PPV_BELOW_BPM}/menit`, source: `${A} S403 (1, B-NR), Fig. 2 S389`, status: 'terverifikasi' },
  { key: 'HEART_RATE.COMPRESSIONS_BELOW_BPM', parameter: 'Indikasi kompresi', value: `HR <${HEART_RATE.COMPRESSIONS_BELOW_BPM}/menit meski 30 dtk ventilasi yang mengembangkan paru`, source: `${A} S411 (1, C-EO)`, status: 'terverifikasi' },
  { key: 'HEART_RATE.EPINEPHRINE_BELOW_BPM', parameter: 'Indikasi epinefrin', value: `HR <${HEART_RATE.EPINEPHRINE_BELOW_BPM}/menit setelah ventilasi & kompresi dioptimalkan`, source: `${A} S415 (1, B-NR)`, status: 'terverifikasi' },
  { key: 'HEART_RATE.NORMAL_RANGE_BPM', parameter: 'HR normal pascatransisi', value: `${HEART_RATE.NORMAL_RANGE_BPM.min}–${HEART_RATE.NORMAL_RANGE_BPM.max}/menit`, source: N8, status: 'VERIFY' },
  { key: 'HEART_RATE.AUSCULTATION_WINDOW_S', parameter: 'Hitung HR dengan stetoskop', value: `${HEART_RATE.AUSCULTATION_WINDOW_S} detik × ${HEART_RATE.AUSCULTATION_MULTIPLIER}`, source: N8, status: 'VERIFY' },
  { key: 'HEART_RATE.ECG', parameter: 'EKG untuk HR', value: 'Berguna untuk HR cepat & akurat (2a); WAJIB saat kompresi (1)', source: `${A} S401 (2a, B-NR), S402 (1, C-EO)`, status: 'terverifikasi' },
  { key: 'TIMING.PPV_START_DEADLINE_S', parameter: 'Ventilasi dimulai', value: `≤${TIMING.PPV_START_DEADLINE_S} detik setelah lahir`, source: `${A} S403 (1, B-NR)`, status: 'terverifikasi' },
  { key: 'TIMING.PPV_ASSESS_AFTER_S', parameter: 'Nilai efektivitas VTP', value: `dalam ${TIMING.PPV_ASSESS_AFTER_S.min} detik (gerak dada), HR setelah ±${TIMING.PPV_ASSESS_AFTER_S.max} detik`, source: `${I22} ("VTP efektif dalam 15 detik")`, status: 'terverifikasi' },
  { key: 'TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S', parameter: 'Ventilasi efektif sebelum kompresi', value: `≥${TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S} detik, sebaiknya via ETT/LMA`, source: `${A} S393, S411 (1, C-EO)`, status: 'terverifikasi' },
  { key: 'TIMING.COMPRESSIONS_REASSESS_S', parameter: 'Kompresi sebelum epinefrin', value: `≥${TIMING.COMPRESSIONS_REASSESS_S} detik`, source: `${A} S393`, status: 'terverifikasi' },
  { key: 'TIMING.EPINEPHRINE_REPEAT_S', parameter: 'Ulang epinefrin', value: `setiap ${TIMING.EPINEPHRINE_REPEAT_S.min / 60}–${TIMING.EPINEPHRINE_REPEAT_S.max / 60} menit; dosis IV segera setelah akses siap bila respons ETT tidak adekuat`, source: `${A} S415 (2a, B-NR), S416 (2b, C-LD); ${N9}`, status: 'terverifikasi' },
  { key: 'TIMING.INTUBATION_ATTEMPT_MAX_S', parameter: 'Batas satu upaya intubasi', value: `±${TIMING.INTUBATION_ATTEMPT_MAX_S} detik`, source: N8, status: 'VERIFY' },
  { key: 'TIMING.DISCONTINUE_CONSIDER_S', parameter: 'Diskusi penghentian resusitasi', value: `±${TIMING.DISCONTINUE_CONSIDER_S / 60} menit tanpa HR setelah semua langkah`, source: `${A} S419 (1, C-LD)`, status: 'terverifikasi' },
  { key: 'VENTILATION.PIP_INITIAL_CMH2O', parameter: 'PIP awal (AHA)', value: `${VENTILATION.PIP_INITIAL_CMH2O.min}–${VENTILATION.PIP_INITIAL_CMH2O.max} cmH₂O`, source: `${A} S403 (2a, C-LD)`, status: 'terverifikasi' },
  { key: 'VENTILATION.PIP_NRP9', parameter: 'PIP awal (NRP9)', value: `${VENTILATION.PIP_NRP9_DEFAULT_CMH2O} cmH₂O; ${VENTILATION.PIP_TERM_NRP9_CMH2O.min}–${VENTILATION.PIP_TERM_NRP9_CMH2O.max} (≥32 mgg), ${VENTILATION.PIP_PRETERM_CMH2O.min}–${VENTILATION.PIP_PRETERM_CMH2O.max} (<32 mgg)`, source: N9, status: 'terverifikasi' },
  { key: 'VENTILATION.PIP_MAX', parameter: 'PIP maksimal saat koreksi', value: `${VENTILATION.PIP_MAX_TERM_CMH2O} cmH₂O aterm / ${VENTILATION.PIP_MAX_PRETERM_CMH2O} prematur; naik ${VENTILATION.PIP_STEP_CMH2O} cmH₂O bertahap (AHA25 S403: PIP berlebihan = Harm)`, source: N8, status: 'VERIFY' },
  { key: 'VENTILATION.PEEP_CMH2O', parameter: 'PEEP', value: `${VENTILATION.PEEP_CMH2O} cmH₂O`, source: `${N9}; ${A} S403 (2b, C-LD)`, status: 'terverifikasi' },
  { key: 'VENTILATION.RATE_PER_MIN', parameter: 'Laju ventilasi', value: `${VENTILATION.RATE_PER_MIN.min}–${VENTILATION.RATE_PER_MIN.max}/menit`, source: `${A} S404 (2a, C-LD); ${N9}`, status: 'terverifikasi' },
  { key: 'VENTILATION.INFLATION_TIME_S', parameter: 'Waktu inflasi', value: `${VENTILATION.INFLATION_TIME_S.min}–${VENTILATION.INFLATION_TIME_S.max} detik`, source: `${A} S404 (2a, C-LD)`, status: 'terverifikasi' },
  { key: 'VENTILATION.SUSTAINED_INFLATION', parameter: 'Sustained inflation >5 detik', value: `Berbahaya pada <${VENTILATION.SUSTAINED_INFLATION_HARM_BELOW_GA} minggu (COR 3: Harm)`, source: `${A} S404 (3: Harm, B-R)`, status: 'terverifikasi' },
  { key: 'VENTILATION.GAS_FLOW_L_MIN', parameter: 'Aliran gas', value: `${VENTILATION.GAS_FLOW_L_MIN} L/menit`, source: N9, status: 'terverifikasi' },
  { key: 'VENTILATION.CPAP_CMH2O', parameter: 'CPAP (TPAE)', value: `${VENTILATION.CPAP_CMH2O} cmH₂O; gagal bila ${VENTILATION.CPAP_FAIL_CMH2O} cmH₂O masih distres berat / FiO₂ >${VENTILATION.CPAP_FAIL_FIO2}% → intubasi`, source: `${I22}; ${A} S407 (2a, A) tanpa angka tekanan`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_START_TERM', parameter: 'FiO₂ awal ≥35 minggu', value: '21%', source: `${A} S409 (2b, C-LD); ${N9}; ${I22}`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_START_32_34', parameter: 'FiO₂ awal 32–34+6 minggu', value: `${OXYGEN.FIO2_START_32_34.min}–${OXYGEN.FIO2_START_32_34.max}%`, source: `${A} S409 (2b, C-LD); ${N9}`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_START_BELOW_32', parameter: 'FiO₂ awal <32 minggu', value: `${OXYGEN.FIO2_START_BELOW_32.min}–${OXYGEN.FIO2_START_BELOW_32.max}% (IDAI22: 21–30% untuk <35 mgg)`, source: `${A} S409 (2b, C-LD); ${N9}`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_DURING_COMPRESSIONS', parameter: 'FiO₂ saat kompresi', value: `${OXYGEN.FIO2_DURING_COMPRESSIONS}%, lalu titrasi setelah ROSC`, source: `${A} S411 (2b, C-EO), Fig. 2`, status: 'terverifikasi' },
  { key: 'OXYGEN.SPO2_HYPEROXIA_ABOVE', parameter: 'Turunkan FiO₂ bila SpO₂', value: `>${OXYGEN.SPO2_HYPEROXIA_ABOVE}% (batas atas tabel menit ke-10)`, source: `${A} Fig. 2 S389`, status: 'terverifikasi' },
  { key: 'OXYGEN.SIB_FIO2', parameter: 'FiO₂ balon mengembang sendiri tanpa blender', value: `udara ${OXYGEN.SIB_FIO2_ROOM_AIR}%; O₂ tanpa reservoir ±${OXYGEN.SIB_FIO2_NO_RESERVOIR}%; dengan reservoir ±90–${OXYGEN.SIB_FIO2_WITH_RESERVOIR}%`, source: N8, status: 'VERIFY' },
  { key: 'SPO2_TARGETS', parameter: 'Target SpO₂ preduktal (dipakai penilaian)', value: SPO2_TARGETS.map((r) => `${r.minute}′ ${r.min}–${r.max}%`).join('; '), source: `${A} Fig. 2 S389; ${N9}`, status: 'terverifikasi' },
  { key: 'IDAI_SPO2_TARGETS', parameter: 'Target SpO₂ preduktal IDAI (referensi)', value: IDAI_SPO2_TARGETS.map((r) => `${r.label} ${r.min}–${r.max}%`).join('; '), source: I22, status: 'terverifikasi' },
  { key: 'PULSE_OX.SITE', parameter: 'Lokasi oksimeter', value: 'Tangan/pergelangan kanan (preduktal), dipasang sedini mungkin', source: `${A} S409 (1, C-LD)`, status: 'terverifikasi' },
  { key: 'AIRWAY.LMA_MIN_GA_WEEKS', parameter: 'Laryngeal mask', value: `≥${AIRWAY.LMA_MIN_GA_WEEKS}+0 minggu: alternatif bila masker gagal (2a) / antarmuka primer (2b)`, source: `${A} S405`, status: 'terverifikasi' },
  { key: 'AIRWAY.LMA_MIN_WEIGHT_KG', parameter: 'Batas berat LMA', value: `${AIRWAY.LMA_MIN_WEIGHT_KG} kg (batas produsen; <2 kg = kesenjangan bukti)`, source: `${A} S406, S421`, status: 'terverifikasi' },
  { key: 'AIRWAY.LMA_SIZE', parameter: 'Ukuran LMA', value: `${AIRWAY.LMA_SIZE}`, source: N8, status: 'VERIFY' },
  { key: 'ETT_TABLE', parameter: 'ETT: kedalaman DI GUSI & ukuran', value: ETT_TABLE.map((r) => `${r.minGa ? r.minGa + '–' + r.maxGa : '<23'} mgg: ${r.depthCm} cm, ${r.sizesMm.join('/')} mm`).join('; '), source: N9, status: 'terverifikasi' },
  { key: 'AIRWAY.BLADE_BY_GA', parameter: 'Bilah laringoskop', value: '00 prematur ekstrem; 0 prematur; 1 aterm', source: N8, status: 'VERIFY' },
  { key: 'AIRWAY.OGT_FR', parameter: 'Pipa orogastrik', value: `${AIRWAY.OGT_FR} Fr (${AIRWAY.OGT_CDH_FR} Fr dengan isap pada HDK)`, source: N8, status: 'VERIFY' },
  { key: 'AIRWAY.NASOPHARYNGEAL_TUBE_MM', parameter: 'Pipa nasofaring (Pierre Robin)', value: `ETT ${AIRWAY.NASOPHARYNGEAL_TUBE_MM} mm via hidung`, source: N8, status: 'VERIFY' },
  { key: 'SUCTION', parameter: 'Isap jalan napas', value: 'Rutin TIDAK dianjurkan (jernih/mekonium); mulut-hidung bila perlu ventilasi & tampak tersumbat; isap trakea bila bukti obstruksi trakea saat ventilasi', source: `${A} S400 (3: No Benefit B-R; 2a C-EO)`, status: 'terverifikasi' },
  { key: 'COMPRESSIONS.RATIO', parameter: 'Rasio kompresi : ventilasi', value: `${COMPRESSIONS.RATIO_COMPRESSIONS}:${COMPRESSIONS.RATIO_BREATHS}`, source: `${A} S412 (2b, C-LD)`, status: 'terverifikasi' },
  { key: 'COMPRESSIONS.EVENTS_PER_MIN', parameter: 'Laju kompresi', value: `${COMPRESSIONS.COMPRESSIONS_PER_MIN} kompresi + ${COMPRESSIONS.BREATHS_PER_MIN} inflasi per menit`, source: `${A} S393`, status: 'terverifikasi' },
  { key: 'COMPRESSIONS.TECHNIQUE', parameter: 'Teknik & kedalaman', value: 'Dua ibu jari melingkari dada; sepertiga bawah sternum di atas xifoid; 1/3 diameter AP', source: `${A} S412 (2b, C-LD)`, status: 'terverifikasi' },
  { key: 'COMPRESSIONS.ROTATE', parameter: 'Ganti petugas kompresi', value: 'tiap 2–5 menit, saat penilaian HR', source: `${A} S412 (2b, C-EO)`, status: 'terverifikasi' },
  { key: 'COMPRESSIONS.AIRWAY', parameter: 'Jalan napas saat kompresi', value: 'ETT direkomendasikan (1); LMA bila ETT gagal pada ≥34 mgg (2b)', source: `${A} S411`, status: 'terverifikasi' },
  { key: 'ACCESS.ROUTE', parameter: 'Akses vaskular darurat', value: 'UVC (1); IO bila IV gagal/tidak mungkin (2a)', source: `${A} S414 (C-LD)`, status: 'terverifikasi' },
  { key: 'ACCESS.UVC', parameter: 'Ukuran & kedalaman UVC', value: `${ACCESS.UVC_FR.min}–${ACCESS.UVC_FR.max} Fr, ${ACCESS.UVC_DEPTH_CM.min}–${ACCESS.UVC_DEPTH_CM.max} cm sampai darah mengalir`, source: N8, status: 'VERIFY' },
  { key: 'EPINEPHRINE.CONCENTRATION_MG_PER_ML', parameter: 'Konsentrasi epinefrin', value: `${EPINEPHRINE.CONCENTRATION_MG_PER_ML} mg/mL (1 mg/10 mL)`, source: N9, status: 'terverifikasi' },
  { key: 'EPINEPHRINE.IV_DOSE_MG_PER_KG', parameter: 'Epinefrin IV/IO', value: `${EPINEPHRINE.IV_DOSE_MG_PER_KG.min}–${EPINEPHRINE.IV_DOSE_MG_PER_KG.max} mg/kg; NRP9: ${EPINEPHRINE.IV_DOSE_TYPICAL_MG_PER_KG} mg/kg = 0,2 mL/kg`, source: `${A} S415 (1, B-NR); ${N9}`, status: 'terverifikasi' },
  { key: 'EPINEPHRINE.ETT_DOSE_MG_PER_KG', parameter: 'Epinefrin endotrakeal', value: `${EPINEPHRINE.ETT_DOSE_MG_PER_KG.min}–${EPINEPHRINE.ETT_DOSE_MG_PER_KG.max} mg/kg; NRP9: ${EPINEPHRINE.ETT_DOSE_TYPICAL_MG_PER_KG} mg/kg = 1 mL/kg, tanpa bilas`, source: `${A} S415 (2a, C-LD); ${N9}`, status: 'terverifikasi' },
  { key: 'EPINEPHRINE.FLUSH_ML', parameter: 'Bilas setelah epinefrin IV/IO', value: `NaCl 0,9% ${EPINEPHRINE.FLUSH_ML} mL (berapa pun berat lahir)`, source: `${A} S416; ${N9}`, status: 'terverifikasi' },
  { key: 'VOLUME_EXPANDER.DOSE_ML_PER_KG', parameter: 'Cairan (NaCl 0,9% / darah O-neg)', value: `${VOLUME_EXPANDER.DOSE_RANGE_ML_PER_KG.min}–${VOLUME_EXPANDER.DOSE_RANGE_ML_PER_KG.max} mL/kg (NRP9: ${VOLUME_EXPANDER.DOSE_ML_PER_KG} mL/kg) dalam 5–10 menit; indikasi: bukti hipovolemia dan tetap bradikardia meski ventilasi, kompresi, epinefrin`, source: `${A} S417 (2b, C-EO); ${N9}`, status: 'terverifikasi' },
  { key: 'GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL', parameter: 'Ambang hipoglikemia', value: `<${GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL} mg/dL (AHA25 S418: pantau glukosa dini, tanpa angka)`, source: 'IDAI/AAP', status: 'VERIFY' },
  { key: 'GLUCOSE.D10_BOLUS_ML_PER_KG', parameter: 'Bolus dekstrosa 10%', value: `${GLUCOSE.D10_BOLUS_ML_PER_KG} mL/kg IV`, source: 'IDAI/NRP8', status: 'VERIFY' },
  { key: 'NOT_RECOMMENDED.SODIUM_BICARBONATE', parameter: 'Natrium bikarbonat', value: 'Tidak dianjurkan (tidak dibahas di AHA25)', source: 'NRP8 / AHA 2020', status: 'VERIFY' },
  { key: 'NOT_RECOMMENDED.NALOXONE', parameter: 'Nalokson saat resusitasi', value: 'Tidak dianjurkan; fokus ventilasi (tidak dibahas di AHA25)', source: 'NRP8 / AHA 2020', status: 'VERIFY' },
  { key: 'POST_RESUSCITATION.HYPOTHERMIA_THERAPY', parameter: 'Terapi hipotermia (HIE sedang–berat)', value: `≥${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_MIN_GA_WEEKS} mgg; ${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_TARGET_C.min}–${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_TARGET_C.max} °C, mulai <${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_WINDOW_H} jam, ${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_DURATION_H} jam, dengan protokol`, source: `${A} S418 (1, A)`, status: 'terverifikasi' },
  { key: 'POST_RESUSCITATION.RESP_RATE_NORMAL', parameter: 'Laju napas normal', value: `${POST_RESUSCITATION.RESP_RATE_NORMAL.min}–${POST_RESUSCITATION.RESP_RATE_NORMAL.max}/menit`, source: 'IDAI', status: 'VERIFY' },
  { key: 'PNEUMOTHORAX.NEEDLE_GAUGE', parameter: 'Aspirasi jarum pneumotoraks', value: `Kateter ${PNEUMOTHORAX.NEEDLE_GAUGE.min}–${PNEUMOTHORAX.NEEDLE_GAUGE.max} G, SIC 4 LAA atau SIC 2 LMK`, source: N8, status: 'VERIFY' },
  { key: 'SIM.PULSE_OX_ACQUIRE_S', parameter: 'Waktu oksimeter mendapat sinyal (simulasi)', value: `${SIM.PULSE_OX_ACQUIRE_S} detik (data: median 100–260 dtk)`, source: `Asumsi simulator; ${A} S410`, status: 'asumsi-sim' },
  { key: 'SIM.DURATION_S', parameter: 'Durasi tindakan (simulasi)', value: `intubasi ${SIM.DURATION_S.intubation} dtk; LMA ${SIM.DURATION_S.lma} dtk; UVC ${SIM.DURATION_S.uvc} dtk; IO ${SIM.DURATION_S.io} dtk; siapkan obat ${SIM.DURATION_S.drugPrep} dtk; aspirasi jarum ${SIM.DURATION_S.needle} dtk`, source: 'Asumsi simulator', status: 'asumsi-sim' },
];

export const SOURCES = [
  {
    id: 'AHA25',
    text: 'Lee HC, Strand ML, Finan E, et al. Part 5: Neonatal Resuscitation: 2025 American Heart Association and American Academy of Pediatrics Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. Circulation. 2025;152(suppl 2):S385–S423.',
    url: 'https://doi.org/10.1161/CIR.0000000000001367',
  },
  {
    id: 'NRP9',
    text: 'American Academy of Pediatrics, American Heart Association. Neonatal Resuscitation Program®, 9th Edition — Reference Chart (NRP209). 2025.',
    url: 'https://www.aap.org/en/learning/neonatal-resuscitation-program/',
  },
  {
    id: 'IDAI22',
    text: 'Ikatan Dokter Anak Indonesia. Alur Resusitasi Neonatus — IDAI 2022.',
    url: 'https://www.idai.or.id/',
  },
  {
    id: 'ILCOR25',
    text: 'Liley HG, Weiner GM, Wyckoff MH, et al. Neonatal life support: 2025 International Liaison Committee on Resuscitation Consensus on Science With Treatment Recommendations. Circulation. 2025;152(suppl 1):S165–S204.',
    url: 'https://doi.org/10.1161/CIR.0000000000001363',
  },
  {
    id: 'NRP8',
    text: 'Weiner GM, Zaichkin J, eds. Textbook of Neonatal Resuscitation (NRP), 8th ed. American Academy of Pediatrics; 2021. (Hanya untuk nilai bertanda VERIFY.)',
    url: 'https://www.aap.org/en/learning/neonatal-resuscitation-program/',
  },
  {
    id: 'KEMENKES',
    text: 'Keputusan Menteri Kesehatan RI No. HK.01.07/MENKES/214/2019 tentang PNPK Tata Laksana Asfiksia.',
    url: 'https://yankes.kemkes.go.id/',
  },
] as const;
