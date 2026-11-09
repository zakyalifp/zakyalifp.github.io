/**
 * ============================================================================
 *  SUMBER TUNGGAL SEMUA ANGKA KLINIS SIMULATOR RESUSITASI NEONATUS
 * ============================================================================
 *
 *  ATURAN: tidak boleh ada angka klinis yang ditulis langsung di komponen,
 *  engine, atau skenario. Semua angka diambil dari file ini.
 *
 *  Singkatan sumber (lihat juga `SOURCES` di bawah):
 *   - AHA25  : Lee HC, Strand ML, Finan E, et al. Part 5: Neonatal Resuscitation:
 *              2025 American Heart Association and American Academy of Pediatrics
 *              Guidelines for CPR and ECC. Circulation 2025;152(16 suppl 2):S385–S423.
 *              doi:10.1161/CIR.0000000000001367 (PMID 41122887)
 *   - NRP9   : Textbook of Neonatal Resuscitation (NRP), 9th ed. AAP/AHA.
 *   - NRP8   : Textbook of Neonatal Resuscitation (NRP), 8th ed. AAP/AHA, 2021.
 *              (dipakai bila nilai belum dapat dicocokkan dengan edisi 9)
 *   - KARGER : 2025 American and European Guidelines on Neonatal Resuscitation:
 *              Concordance and Differences. Neonatology 2025. doi:10.1159/000552450
 *              (tinjauan sekunder yang mengutip angka AHA25 dan Tabel 1 NRP)
 *   - IDAI   : UKK Neonatologi IDAI — Buku Panduan Resusitasi Neonatus /
 *              Kemenkes RI PNPK Tata Laksana Asfiksia (KMK HK.01.07/MENKES/214/2019).
 *   - SIM    : asumsi pemodelan simulator (BUKAN rekomendasi pedoman), dipakai untuk
 *              durasi tindakan dan dinamika fisiologi agar realistis.
 *
 *  STATUS:
 *   - "terverifikasi" : angka cocok dengan AHA25 melalui abstrak PubMed atau tinjauan
 *                       sekunder yang mengutip teks AHA25 secara langsung.
 *   - "VERIFY"        : angka standar NRP/IDAI yang belum dapat dicocokkan kata per
 *                       kata dengan teks lengkap AHA25/NRP9 (teks lengkap tidak dapat
 *                       diakses saat pembuatan). Wajib dicek manual — lihat
 *                       docs/CLINICAL_REVIEW.md.
 *   - "asumsi-sim"    : parameter simulasi, bukan rekomendasi klinis.
 *
 *  Nomor halaman spesifik di dalam rentang S385–S423 belum dapat dipastikan; setiap
 *  entri menyebut nama bagian (section) pedoman. Mohon lengkapi halaman saat review.
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
  // AHA25 §Umbilical Cord Management — DCC ≥60 dtk untuk bayi aterm & prematur yang
  // tidak memerlukan resusitasi segera. [terverifikasi: abstrak PubMed 41122887]
  DELAYED_CLAMP_MIN_S: 60,
  // AHA25 §Umbilical Cord Management — intact cord milking tidak direkomendasikan
  // pada usia gestasi <28 minggu (risiko PIV berat). [terverifikasi: KARGER]
  MILKING_MIN_GA_WEEKS: 28,
  // AHA25 §Umbilical Cord Management — intact cord milking dapat dipertimbangkan pada
  // bayi aterm/late-preterm yang TIDAK bugar (35–42 mgg) dibanding klem segera.
  // VERIFY: rentang usia gestasi 35–42 minggu.
  MILKING_NONVIGOROUS_GA: { min: 35, max: 42 } as Range,
} as const;

// ---------------------------------------------------------------------------
// 2. Termoregulasi
// ---------------------------------------------------------------------------
export const TEMPERATURE = {
  // AHA25 §Temperature Management — suhu aksila bayi dijaga 36,5–37,5 °C.
  // VERIFY: konfirmasi rentang di teks AHA25 (nilai sama dengan AHA 2020).
  TARGET_C: { min: 36.5, max: 37.5 } as Range,
  // Hipotermia sedang (WHO/IDAI): <36,0 °C. VERIFY.
  HYPOTHERMIA_MODERATE_BELOW_C: 36.0,
  // Hipertermia >38,0 °C harus dihindari (berbahaya pada bayi asfiksia). VERIFY.
  HYPERTHERMIA_ABOVE_C: 38.0,
  // AHA25 §Temperature Management — bayi <32 minggu: bungkus plastik tanpa
  // dikeringkan + topi + penghangat. VERIFY: batas 32 minggu.
  PLASTIC_WRAP_BELOW_GA_WEEKS: 32,
  // Suhu ruang bersalin untuk bayi prematur 23–25 °C (AHA 2020/NRP). VERIFY untuk 2025.
  ROOM_TEMP_PRETERM_C: { min: 23, max: 25 } as Range,
} as const;

// ---------------------------------------------------------------------------
// 3. Ambang frekuensi jantung (HR)
// ---------------------------------------------------------------------------
export const HEART_RATE = {
  // AHA25 §Positive-Pressure Ventilation — VTP bila apnea/megap-megap ATAU HR <100.
  // [terverifikasi: KARGER — "effective ventilation HR ≥100"]
  PPV_BELOW_BPM: 100,
  // AHA25 §Chest Compressions — kompresi bila HR <60 setelah ventilasi efektif.
  // [terverifikasi: KARGER]
  COMPRESSIONS_BELOW_BPM: 60,
  // AHA25 §Medications — epinefrin bila HR tetap <60 setelah kompresi + ventilasi
  // adekuat. [terverifikasi: ringkasan AHA25]
  EPINEPHRINE_BELOW_BPM: 60,
  // Rentang HR normal bayi baru lahir pasca-transisi (NRP). VERIFY.
  NORMAL_RANGE_BPM: { min: 100, max: 160 } as Range,
  // Metode hitung HR dengan stetoskop: hitung 6 detik × 10. (NRP) VERIFY.
  AUSCULTATION_WINDOW_S: 6,
  AUSCULTATION_MULTIPLIER: 10,
  // Toleransi penilaian hasil hitung pengguna (asumsi-sim): ±20 kali/menit.
  AUSCULTATION_TOLERANCE_BPM: 20,
} as const;

// ---------------------------------------------------------------------------
// 4. Waktu kunci algoritma
// ---------------------------------------------------------------------------
export const TIMING = {
  // "Menit emas": VTP dimulai dalam 60 detik pertama bila diindikasikan.
  // AHA25 §Positive-Pressure Ventilation. VERIFY: frasa "within 60 s" di AHA25.
  PPV_START_DEADLINE_S: 60,
  // Nilai efektivitas ventilasi (gerak dada/HR) setelah 15–30 dtk VTP.
  // [terverifikasi: KARGER — "after 15–30 s"]
  PPV_ASSESS_AFTER_S: { min: 15, max: 30 } as Range,
  // Kompresi dimulai bila HR <60 setelah ≥30 dtk VTP yang mengembangkan paru
  // (sebaiknya melalui jalan napas alternatif). NRP. VERIFY.
  PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S: 30,
  // Nilai ulang HR setelah 60 dtk kompresi terkoordinasi. NRP. VERIFY.
  COMPRESSIONS_REASSESS_S: 60,
  // Ulangi epinefrin setiap 3–5 menit bila HR tetap <60. NRP. VERIFY.
  EPINEPHRINE_REPEAT_S: { min: 180, max: 300 } as Range,
  // Batas satu upaya intubasi ±30 detik. NRP. VERIFY.
  INTUBATION_ATTEMPT_MAX_S: 30,
  // AHA25 §Withholding and Discontinuing — bila tidak ada HR terdeteksi setelah
  // semua langkah dilakukan, diskusi penghentian sekitar 20 menit setelah lahir.
  // [terverifikasi: KARGER — "20 min without improvement"]
  DISCONTINUE_CONSIDER_S: 20 * 60,
} as const;

// ---------------------------------------------------------------------------
// 5. Ventilasi tekanan positif (VTP) & CPAP
// ---------------------------------------------------------------------------
export const VENTILATION = {
  // AHA25 §PPV — tekanan inflasi awal 20–30 cmH2O. [terverifikasi: KARGER]
  PIP_INITIAL_CMH2O: { min: 20, max: 30 } as Range,
  // NRP (Tabel 1 KARGER) — prematur <32 mgg: PIP 20–25 cmH2O.
  PIP_PRETERM_CMH2O: { min: 20, max: 25 } as Range,
  // NRP — langkah P (MR. SOPA): naikkan 5–10 cmH2O bertahap; batas maksimum
  // 40 cmH2O (aterm) / 30 cmH2O (prematur) dengan balon/T-piece. VERIFY.
  PIP_STEP_CMH2O: 5,
  PIP_MAX_TERM_CMH2O: 40,
  PIP_MAX_PRETERM_CMH2O: 30,
  // NRP/AHA25 — PEEP 5 cmH2O. [terverifikasi: KARGER (nilai buku NRP)]
  PEEP_CMH2O: 5,
  // Rentang PEEP yang diterima simulator (asumsi-sim berdasar NRP 5–8). VERIFY.
  PEEP_ACCEPTABLE_CMH2O: { min: 5, max: 8 } as Range,
  // AHA25 §PPV — laju 30–60 napas/menit. [terverifikasi: KARGER, PubMed 42599690]
  RATE_PER_MIN: { min: 30, max: 60 } as Range,
  // Laju yang lazim diajarkan NRP ("napas–dua–tiga") 40–60/menit; contoh jalur ideal
  // memakai 40/menit. VERIFY.
  RATE_TYPICAL_PER_MIN: 40,
  // AHA25 §PPV — waktu inspirasi 0,5–1 detik. [terverifikasi: KARGER]
  INFLATION_TIME_S: { min: 0.5, max: 1 } as Range,
  // Inflasi berkepanjangan (sustained inflation) >5 dtk tidak direkomendasikan
  // untuk bayi prematur. VERIFY (AHA25 §PPV / ILCOR).
  SUSTAINED_INFLATION_MAX_S: 5,
  // CPAP untuk bayi prematur bernapas spontan dengan distres: 5 cmH2O (NRP). VERIFY.
  CPAP_CMH2O: 5,
  // Rentang CPAP yang diterima simulator (NRP 5–8 cmH2O). VERIFY.
  CPAP_ACCEPTABLE_CMH2O: { min: 5, max: 8 } as Range,
  // PIP yang dianggap berisiko barotrauma/pneumotoraks (asumsi-sim).
  BAROTRAUMA_PIP_CMH2O: 35,
  // Durasi PIP berlebih sebelum pneumotoraks iatrogenik muncul (asumsi-sim).
  BAROTRAUMA_DURATION_S: 45,
} as const;

// ---------------------------------------------------------------------------
// 6. Oksigen
// ---------------------------------------------------------------------------
export const OXYGEN = {
  // AHA25 §Oxygen Administration — ≥35 mgg mulai dengan udara ruang (21%).
  // [terverifikasi: KARGER, ringkasan AHA25]
  FIO2_START_TERM: { min: 21, max: 21 } as Range,
  // AHA25 — 32–34 mgg: 21–30%. [terverifikasi: KARGER]
  FIO2_START_32_34: { min: 21, max: 30 } as Range,
  // AHA25 — <32 mgg: mulai 30–100% (≥30%), titrasi dengan oksimetri.
  // [terverifikasi: KARGER, PubMed 42599690 "≥30% oxygen for very preterm"]
  FIO2_START_BELOW_32: { min: 30, max: 100 } as Range,
  // Batas usia gestasi kelompok FiO2 awal (minggu).
  GA_TERM_THRESHOLD_WEEKS: 35,
  GA_VERY_PRETERM_THRESHOLD_WEEKS: 32,
  // AHA25 §Chest Compressions — naikkan FiO2 ke 100% saat kompresi.
  // [terverifikasi: ringkasan AHA25 "reasonable to use 100% oxygen during compressions"]
  FIO2_DURING_COMPRESSIONS: 100,
  // Turunkan FiO2 bila SpO2 >95% saat menerima O2 tambahan (NRP). VERIFY.
  SPO2_HYPEROXIA_ABOVE: 95,
  // Toleransi di bawah target sebelum dinilai "di bawah target" (asumsi-sim).
  SPO2_TOLERANCE_BELOW: 5,
  // Fasilitas tanpa blender (balon mengembang sendiri). NRP. VERIFY.
  //  - tanpa sumber O2 = 21%; dengan O2 tanpa reservoir ≈ 40%; dengan reservoir ≈ 90–100%.
  SIB_FIO2_ROOM_AIR: 21,
  SIB_FIO2_NO_RESERVOIR: 40,
  SIB_FIO2_WITH_RESERVOIR: 100,
} as const;

/**
 * Target SpO2 preduktal (tangan kanan) per menit setelah lahir.
 * NRP 8/9 (tabel algoritma). VERIFY: KARGER menyebut tabel AHA25 dimulai pada
 * menit ke-2; nilai 1 menit dipertahankan dari NRP 8 sampai dikonfirmasi.
 * Di antara menit 5 dan 10, simulator melakukan interpolasi linear (asumsi-sim).
 */
export const SPO2_TARGETS: ReadonlyArray<{ minute: number; min: number; max: number }> = [
  { minute: 1, min: 60, max: 65 },
  { minute: 2, min: 65, max: 70 },
  { minute: 3, min: 70, max: 75 },
  { minute: 4, min: 75, max: 80 },
  { minute: 5, min: 80, max: 85 },
  { minute: 10, min: 85, max: 95 },
];

// ---------------------------------------------------------------------------
// 7. Jalan napas lanjutan
// ---------------------------------------------------------------------------
export const AIRWAY = {
  // AHA25 §Ventilation Interface — sungkup laring (LMA) untuk ≥34 mgg.
  // [terverifikasi: ringkasan AHA25 "above 34 weeks"]
  LMA_MIN_GA_WEEKS: 34,
  // NRP — LMA ukuran 1 untuk bayi >2 kg. VERIFY.
  LMA_MIN_WEIGHT_KG: 2,
  LMA_SIZE: 1,
  // NRP — ukuran ETT (diameter dalam, mm) berdasarkan berat/usia gestasi. VERIFY.
  ETT_SIZE_BY_WEIGHT: [
    { maxWeightKg: 1, maxGaWeeks: 27, sizeMm: 2.5 },
    { maxWeightKg: 2, maxGaWeeks: 34, sizeMm: 3.0 },
    { maxWeightKg: Infinity, maxGaWeeks: Infinity, sizeMm: 3.5 },
  ] as ReadonlyArray<{ maxWeightKg: number; maxGaWeeks: number; sizeMm: number }>,
  ETT_SIZES_MM: [2.5, 3.0, 3.5, 4.0] as ReadonlyArray<number>,
  // NRP — kedalaman ETT (cm di bibir) berdasarkan usia gestasi. VERIFY.
  ETT_DEPTH_BY_GA: [
    { minGa: 23, maxGa: 24, depthCm: 5.5 },
    { minGa: 25, maxGa: 26, depthCm: 6.0 },
    { minGa: 27, maxGa: 29, depthCm: 6.5 },
    { minGa: 30, maxGa: 32, depthCm: 7.0 },
    { minGa: 33, maxGa: 34, depthCm: 7.5 },
    { minGa: 35, maxGa: 37, depthCm: 8.0 },
    { minGa: 38, maxGa: 40, depthCm: 8.5 },
    { minGa: 41, maxGa: 43, depthCm: 9.0 },
  ] as ReadonlyArray<{ minGa: number; maxGa: number; depthCm: number }>,
  // Alternatif rumus kedalaman: berat (kg) + 6 cm (NRP). VERIFY.
  ETT_DEPTH_WEIGHT_PLUS_CM: 6,
  // Toleransi kedalaman yang diterima (asumsi-sim): ±0,5 cm benar; >+1 cm = bronkus
  // utama kanan; <−1 cm = terlalu dangkal.
  ETT_DEPTH_TOLERANCE_CM: 0.5,
  ETT_DEPTH_MALPOSITION_CM: 1,
  // Bilah laringoskop: 00 (prematur ekstrem), 0 (prematur), 1 (aterm). NRP. VERIFY.
  BLADE_BY_GA: [
    { maxGa: 27, blade: '00' },
    { maxGa: 36, blade: '0' },
    { maxGa: Infinity, blade: '1' },
  ] as ReadonlyArray<{ maxGa: number; blade: string }>,
  // Pipa orogastrik 8 Fr untuk VTP lama / jalan napas alternatif; 10 Fr dengan
  // isap kontinu pada hernia diafragmatika. NRP. VERIFY.
  OGT_FR: 8,
  OGT_CDH_FR: 10,
  // Pierre Robin: pipa nasofaring (ETT 2,5 mm via hidung). NRP. VERIFY.
  NASOPHARYNGEAL_TUBE_MM: 2.5,
  // Masker harus menutupi dagu, mulut, dan hidung tanpa menekan mata. Simulator
  // memakai masker kecil (prematur) untuk bayi <2 kg. asumsi-sim/VERIFY.
  MASK_SMALL_BELOW_KG: 2,
} as const;

// ---------------------------------------------------------------------------
// 8. Kompresi dada
// ---------------------------------------------------------------------------
export const COMPRESSIONS = {
  // AHA25/NRP — rasio 3 kompresi : 1 ventilasi. [terverifikasi: ringkasan AHA25]
  RATIO_COMPRESSIONS: 3,
  RATIO_BREATHS: 1,
  // NRP — 90 kompresi + 30 napas = 120 kejadian/menit (siklus 2 detik). VERIFY.
  EVENTS_PER_MIN: 120,
  COMPRESSIONS_PER_MIN: 90,
  BREATHS_PER_MIN: 30,
  // Kedalaman ±1/3 diameter anteroposterior dada; teknik dua ibu jari melingkari
  // dada di sepertiga bawah sternum. [terverifikasi: ringkasan AHA25]
  DEPTH_FRACTION_AP: 1 / 3,
} as const;

// ---------------------------------------------------------------------------
// 9. Akses vaskular
// ---------------------------------------------------------------------------
export const ACCESS = {
  // Kateter vena umbilikal (UVC) darurat 3,5–5 Fr, dimasukkan 2–4 cm sampai darah
  // mengalir (posisi "low-lying"). NRP. VERIFY.
  UVC_FR: { min: 3.5, max: 5 } as Range,
  UVC_DEPTH_CM: { min: 2, max: 4 } as Range,
  // AHA25 — akses intraoseus (IO) sebagai alternatif bila UVC tidak memungkinkan.
  // VERIFY: kekuatan rekomendasi.
} as const;

// ---------------------------------------------------------------------------
// 10. Obat & cairan
// ---------------------------------------------------------------------------
export const EPINEPHRINE = {
  // Konsentrasi epinefrin neonatus: 0,1 mg/mL (1 mg/10 mL). NRP. VERIFY.
  CONCENTRATION_MG_PER_ML: 0.1,
  // AHA25 §Medications — IV/IO 0,01–0,03 mg/kg. [terverifikasi: ringkasan AHA25]
  IV_DOSE_MG_PER_KG: { min: 0.01, max: 0.03 } as Range,
  // Dosis IV/IO yang lazim diajarkan NRP: 0,02 mg/kg. VERIFY.
  IV_DOSE_TYPICAL_MG_PER_KG: 0.02,
  // AHA25 §Medications — endotrakeal 0,05–0,1 mg/kg sambil menunggu akses.
  // [terverifikasi: ringkasan AHA25]
  ETT_DOSE_MG_PER_KG: { min: 0.05, max: 0.1 } as Range,
  ETT_DOSE_TYPICAL_MG_PER_KG: 0.1,
  // Bilas NaCl 0,9% 3 mL setelah epinefrin IV/IO (NRP 8). VERIFY.
  FLUSH_ML: 3,
  // Toleransi volume bilas yang diterima simulator (asumsi-sim).
  FLUSH_TOLERANCE_ML: 1,
  // Toleransi pembulatan volume yang diterima (asumsi-sim): ±0,05 mL atau ±10%.
  VOLUME_TOLERANCE_ML: 0.05,
  VOLUME_TOLERANCE_FRACTION: 0.1,
  // Dosis yang dianggap overdosis berbahaya (≥ 3× batas atas) (asumsi-sim).
  OVERDOSE_FACTOR: 3,
} as const;

export const VOLUME_EXPANDER = {
  // NaCl 0,9% (atau PRC golongan O Rh-negatif) 10 mL/kg IV/IO selama 5–10 menit;
  // dapat diulang. NRP/AHA25 §Volume Expansion. VERIFY.
  DOSE_ML_PER_KG: 10,
  DOSE_TOLERANCE_ML_PER_KG: 1,
  INFUSION_DURATION_S: { min: 5 * 60, max: 10 * 60 } as Range,
  // Volume > 2× dosis tunggal dalam satu bolus dianggap berlebihan (asumsi-sim).
  EXCESS_FACTOR: 2,
} as const;

export const GLUCOSE = {
  // Cek glukosa darah setelah resusitasi. Ambang tata laksana hipoglikemia
  // <45 mg/dL (2,5 mmol/L) pada jam-jam pertama (IDAI/AAP). VERIFY.
  HYPOGLYCEMIA_BELOW_MG_DL: 45,
  // Bolus dekstrosa 10% 2 mL/kg IV, lanjut infus glukosa (IDAI/NRP). VERIFY.
  D10_BOLUS_ML_PER_KG: 2,
  D10_TOLERANCE_ML_PER_KG: 0.5,
} as const;

export const NOT_RECOMMENDED = {
  // AHA25 — natrium bikarbonat tidak dianjurkan rutin. [terverifikasi: KARGER]
  SODIUM_BICARBONATE: true,
  // Nalokson tidak dianjurkan sebagai bagian resusitasi awal; fokus ventilasi.
  // NRP/AHA. VERIFY untuk teks 2025.
  NALOXONE_DURING_RESUSCITATION: true,
  // Laringoskopi/isap trakea rutin pada bayi tidak bugar dengan air ketuban
  // bermekonium tidak dianjurkan. AHA25 §Meconium. VERIFY.
  ROUTINE_TRACHEAL_SUCTION_MECONIUM: true,
} as const;

// ---------------------------------------------------------------------------
// 11. Pascaresusitasi & rujukan
// ---------------------------------------------------------------------------
export const POST_RESUSCITATION = {
  // Terapi hipotermia: bayi ≥36 mgg dengan ensefalopati hipoksik-iskemik sedang–berat,
  // dimulai <6 jam di fasilitas dengan protokol. AHA25 §Postresuscitation Care. VERIFY.
  HYPOTHERMIA_THERAPY_MIN_GA_WEEKS: 36,
  HYPOTHERMIA_THERAPY_WINDOW_H: 6,
  // Laju napas normal bayi baru lahir 40–60/menit (IDAI). VERIFY.
  RESP_RATE_NORMAL: { min: 40, max: 60 } as Range,
} as const;

export const PNEUMOTHORAX = {
  // Aspirasi jarum: kateter IV 18–20 G, sela iga ke-4 linea aksilaris anterior atau
  // sela iga ke-2 linea midklavikula. NRP. VERIFY.
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
  // Waktu oksimeter mendapatkan sinyal stabil (asumsi-sim). VERIFY: NRP menyebut
  // pembacaan dapat memerlukan 1–2 menit; simulator memakai 30 dtk.
  PULSE_OX_ACQUIRE_S: 30,
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
  CPAP: [3, 5, 6, 8] as ReadonlyArray<number>,
  ETT_DEPTH_CM: [5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as ReadonlyArray<number>,
  BLADES: ['00', '0', '1'] as ReadonlyArray<string>,
  BOLUS_DURATION_MIN: [1, 5, 10] as ReadonlyArray<number>,
  LMA_SIZES: [1, 1.5, 2] as ReadonlyArray<number>,
} as const;

// ---------------------------------------------------------------------------
// Fungsi bantu (hanya hitungan dari angka di atas)
// ---------------------------------------------------------------------------

/** Rentang target SpO2 preduktal pada detik ke-t sejak lahir; null bila < 1 menit. */
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

/** Ukuran ETT (mm) yang dianjurkan berdasarkan berat dan usia gestasi. */
export function recommendedEttSize(weightKg: number, _gaWeeks?: number): number {
  // Berat badan diutamakan (tabel NRP: <1 kg, 1–2 kg, >2 kg).
  const row = AIRWAY.ETT_SIZE_BY_WEIGHT.find((r) =>
    r.maxWeightKg === Infinity ? true : weightKg < r.maxWeightKg || (r.maxWeightKg === 2 && weightKg <= 2),
  );
  return row ? row.sizeMm : AIRWAY.ETT_SIZE_BY_WEIGHT[AIRWAY.ETT_SIZE_BY_WEIGHT.length - 1].sizeMm;
}

/** Ukuran ETT yang dapat diterima: sesuai berat ATAU sesuai usia gestasi. */
export function acceptableEttSizes(weightKg: number, gaWeeks: number): number[] {
  const byWeight = recommendedEttSize(weightKg);
  const gaRow = AIRWAY.ETT_SIZE_BY_WEIGHT.find((r) => gaWeeks <= r.maxGaWeeks);
  const byGa = gaRow ? gaRow.sizeMm : byWeight;
  return Array.from(new Set([byWeight, byGa]));
}

/** Kedalaman ETT di bibir (cm) berdasarkan usia gestasi (tabel NRP). */
export function recommendedEttDepth(gaWeeks: number): number {
  const ga = Math.floor(gaWeeks);
  const row = AIRWAY.ETT_DEPTH_BY_GA.find((r) => ga >= r.minGa && ga <= r.maxGa);
  if (row) return row.depthCm;
  return ga < AIRWAY.ETT_DEPTH_BY_GA[0].minGa
    ? AIRWAY.ETT_DEPTH_BY_GA[0].depthCm
    : AIRWAY.ETT_DEPTH_BY_GA[AIRWAY.ETT_DEPTH_BY_GA.length - 1].depthCm;
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

const AHA = 'AHA25 (Circulation 2025;152 suppl 2:S385–S423)';

export const GUIDELINE_REGISTRY: ReadonlyArray<RegistryEntry> = [
  { key: 'CORD.DELAYED_CLAMP_MIN_S', parameter: 'Penundaan penjepitan tali pusat (bayi tidak perlu resusitasi segera)', value: `≥${CORD.DELAYED_CLAMP_MIN_S} detik`, source: `${AHA} §Umbilical Cord Management; abstrak PubMed 41122887`, status: 'terverifikasi' },
  { key: 'CORD.MILKING_MIN_GA_WEEKS', parameter: 'Intact cord milking tidak untuk usia gestasi', value: `<${CORD.MILKING_MIN_GA_WEEKS} minggu`, source: `${AHA} §Umbilical Cord Management; KARGER`, status: 'terverifikasi' },
  { key: 'CORD.MILKING_NONVIGOROUS_GA', parameter: 'Intact cord milking dapat dipertimbangkan pada bayi tidak bugar', value: `${CORD.MILKING_NONVIGOROUS_GA.min}–${CORD.MILKING_NONVIGOROUS_GA.max} minggu`, source: `${AHA} §Umbilical Cord Management`, status: 'VERIFY' },
  { key: 'TEMPERATURE.TARGET_C', parameter: 'Target suhu aksila', value: `${TEMPERATURE.TARGET_C.min}–${TEMPERATURE.TARGET_C.max} °C`, source: `${AHA} §Temperature Management`, status: 'VERIFY' },
  { key: 'TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C', parameter: 'Hipotermia (perlu tindakan)', value: `<${TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C} °C`, source: 'WHO/IDAI', status: 'VERIFY' },
  { key: 'TEMPERATURE.HYPERTHERMIA_ABOVE_C', parameter: 'Hipertermia (hindari)', value: `>${TEMPERATURE.HYPERTHERMIA_ABOVE_C} °C`, source: `${AHA} §Temperature Management`, status: 'VERIFY' },
  { key: 'TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS', parameter: 'Plastik tanpa dikeringkan + topi', value: `<${TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS} minggu`, source: `${AHA} §Temperature Management`, status: 'VERIFY' },
  { key: 'TEMPERATURE.ROOM_TEMP_PRETERM_C', parameter: 'Suhu ruang bersalin untuk prematur', value: `${TEMPERATURE.ROOM_TEMP_PRETERM_C.min}–${TEMPERATURE.ROOM_TEMP_PRETERM_C.max} °C`, source: 'AHA 2020 / NRP', status: 'VERIFY' },
  { key: 'HEART_RATE.PPV_BELOW_BPM', parameter: 'Indikasi VTP', value: `Apnea/megap-megap atau HR <${HEART_RATE.PPV_BELOW_BPM}/menit`, source: `${AHA} §Positive-Pressure Ventilation; KARGER`, status: 'terverifikasi' },
  { key: 'HEART_RATE.COMPRESSIONS_BELOW_BPM', parameter: 'Indikasi kompresi dada', value: `HR <${HEART_RATE.COMPRESSIONS_BELOW_BPM}/menit setelah ventilasi efektif`, source: `${AHA} §Chest Compressions; KARGER`, status: 'terverifikasi' },
  { key: 'HEART_RATE.EPINEPHRINE_BELOW_BPM', parameter: 'Indikasi epinefrin', value: `HR tetap <${HEART_RATE.EPINEPHRINE_BELOW_BPM}/menit setelah kompresi + ventilasi adekuat`, source: `${AHA} §Medications`, status: 'terverifikasi' },
  { key: 'HEART_RATE.NORMAL_RANGE_BPM', parameter: 'HR normal pascatransisi', value: `${HEART_RATE.NORMAL_RANGE_BPM.min}–${HEART_RATE.NORMAL_RANGE_BPM.max}/menit`, source: 'NRP', status: 'VERIFY' },
  { key: 'HEART_RATE.AUSCULTATION_WINDOW_S', parameter: 'Hitung HR dengan stetoskop', value: `${HEART_RATE.AUSCULTATION_WINDOW_S} detik × ${HEART_RATE.AUSCULTATION_MULTIPLIER}`, source: 'NRP', status: 'VERIFY' },
  { key: 'TIMING.PPV_START_DEADLINE_S', parameter: 'VTP dimulai (menit emas)', value: `≤${TIMING.PPV_START_DEADLINE_S} detik setelah lahir`, source: `${AHA} §Positive-Pressure Ventilation`, status: 'VERIFY' },
  { key: 'TIMING.PPV_ASSESS_AFTER_S', parameter: 'Nilai efektivitas ventilasi', value: `setelah ${TIMING.PPV_ASSESS_AFTER_S.min}–${TIMING.PPV_ASSESS_AFTER_S.max} detik VTP`, source: `${AHA} §PPV; KARGER`, status: 'terverifikasi' },
  { key: 'TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S', parameter: 'Lama VTP efektif sebelum kompresi', value: `≥${TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S} detik`, source: 'NRP', status: 'VERIFY' },
  { key: 'TIMING.COMPRESSIONS_REASSESS_S', parameter: 'Nilai ulang HR saat kompresi', value: `setiap ${TIMING.COMPRESSIONS_REASSESS_S} detik`, source: 'NRP', status: 'VERIFY' },
  { key: 'TIMING.EPINEPHRINE_REPEAT_S', parameter: 'Ulang epinefrin', value: `setiap ${TIMING.EPINEPHRINE_REPEAT_S.min / 60}–${TIMING.EPINEPHRINE_REPEAT_S.max / 60} menit`, source: 'NRP', status: 'VERIFY' },
  { key: 'TIMING.INTUBATION_ATTEMPT_MAX_S', parameter: 'Batas satu upaya intubasi', value: `±${TIMING.INTUBATION_ATTEMPT_MAX_S} detik`, source: 'NRP', status: 'VERIFY' },
  { key: 'TIMING.DISCONTINUE_CONSIDER_S', parameter: 'Pertimbangan penghentian resusitasi', value: `±${TIMING.DISCONTINUE_CONSIDER_S / 60} menit tanpa HR setelah semua langkah`, source: `${AHA} §Withholding and Discontinuing; KARGER`, status: 'terverifikasi' },
  { key: 'VENTILATION.PIP_INITIAL_CMH2O', parameter: 'PIP awal', value: `${VENTILATION.PIP_INITIAL_CMH2O.min}–${VENTILATION.PIP_INITIAL_CMH2O.max} cmH₂O`, source: `${AHA} §PPV; KARGER`, status: 'terverifikasi' },
  { key: 'VENTILATION.PIP_PRETERM_CMH2O', parameter: 'PIP awal prematur <32 minggu', value: `${VENTILATION.PIP_PRETERM_CMH2O.min}–${VENTILATION.PIP_PRETERM_CMH2O.max} cmH₂O`, source: 'NRP (Tabel 1 KARGER)', status: 'terverifikasi' },
  { key: 'VENTILATION.PIP_MAX', parameter: 'PIP maksimal (langkah P MR. SOPA)', value: `${VENTILATION.PIP_MAX_TERM_CMH2O} cmH₂O aterm / ${VENTILATION.PIP_MAX_PRETERM_CMH2O} cmH₂O prematur; naik ${VENTILATION.PIP_STEP_CMH2O} cmH₂O bertahap`, source: 'NRP', status: 'VERIFY' },
  { key: 'VENTILATION.PEEP_CMH2O', parameter: 'PEEP', value: `${VENTILATION.PEEP_CMH2O} cmH₂O`, source: 'NRP (Tabel 1 KARGER)', status: 'terverifikasi' },
  { key: 'VENTILATION.RATE_PER_MIN', parameter: 'Laju VTP', value: `${VENTILATION.RATE_PER_MIN.min}–${VENTILATION.RATE_PER_MIN.max}/menit`, source: `${AHA} §PPV; KARGER; PubMed 42599690`, status: 'terverifikasi' },
  { key: 'VENTILATION.INFLATION_TIME_S', parameter: 'Waktu inflasi', value: `${VENTILATION.INFLATION_TIME_S.min}–${VENTILATION.INFLATION_TIME_S.max} detik`, source: `${AHA} §PPV; KARGER`, status: 'terverifikasi' },
  { key: 'VENTILATION.SUSTAINED_INFLATION_MAX_S', parameter: 'Inflasi berkepanjangan tidak dianjurkan', value: `>${VENTILATION.SUSTAINED_INFLATION_MAX_S} detik (prematur)`, source: `${AHA} §PPV / ILCOR`, status: 'VERIFY' },
  { key: 'VENTILATION.CPAP_CMH2O', parameter: 'CPAP prematur bernapas spontan dengan distres', value: `${VENTILATION.CPAP_CMH2O} cmH₂O (diterima ${VENTILATION.CPAP_ACCEPTABLE_CMH2O.min}–${VENTILATION.CPAP_ACCEPTABLE_CMH2O.max})`, source: 'NRP', status: 'VERIFY' },
  { key: 'OXYGEN.FIO2_START_TERM', parameter: 'FiO2 awal ≥35 minggu', value: '21%', source: `${AHA} §Oxygen Administration; KARGER`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_START_32_34', parameter: 'FiO2 awal 32–34 minggu', value: `${OXYGEN.FIO2_START_32_34.min}–${OXYGEN.FIO2_START_32_34.max}%`, source: `${AHA} §Oxygen Administration; KARGER`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_START_BELOW_32', parameter: 'FiO2 awal <32 minggu', value: `${OXYGEN.FIO2_START_BELOW_32.min}–${OXYGEN.FIO2_START_BELOW_32.max}%`, source: `${AHA} §Oxygen Administration; KARGER; PubMed 42599690`, status: 'terverifikasi' },
  { key: 'OXYGEN.FIO2_DURING_COMPRESSIONS', parameter: 'FiO2 saat kompresi dada', value: `${OXYGEN.FIO2_DURING_COMPRESSIONS}%`, source: `${AHA} §Chest Compressions`, status: 'terverifikasi' },
  { key: 'OXYGEN.SPO2_HYPEROXIA_ABOVE', parameter: 'Turunkan FiO2 bila SpO2', value: `>${OXYGEN.SPO2_HYPEROXIA_ABOVE}%`, source: 'NRP', status: 'VERIFY' },
  { key: 'OXYGEN.SIB_FIO2', parameter: 'FiO2 balon mengembang sendiri tanpa blender', value: `udara ${OXYGEN.SIB_FIO2_ROOM_AIR}%; O₂ tanpa reservoir ±${OXYGEN.SIB_FIO2_NO_RESERVOIR}%; dengan reservoir ±90–${OXYGEN.SIB_FIO2_WITH_RESERVOIR}%`, source: 'NRP', status: 'VERIFY' },
  { key: 'SPO2_TARGETS', parameter: 'Target SpO2 preduktal', value: SPO2_TARGETS.map((r) => `${r.minute}′ ${r.min}–${r.max}%`).join('; '), source: 'NRP 8/9; AHA25 (tabel AHA25 dimulai menit ke-2 menurut KARGER)', status: 'VERIFY' },
  { key: 'AIRWAY.LMA_MIN_GA_WEEKS', parameter: 'Sungkup laring (LMA)', value: `≥${AIRWAY.LMA_MIN_GA_WEEKS} minggu`, source: `${AHA} §Ventilation Interface`, status: 'terverifikasi' },
  { key: 'AIRWAY.LMA_SIZE', parameter: 'Ukuran LMA', value: `Ukuran ${AIRWAY.LMA_SIZE} untuk >${AIRWAY.LMA_MIN_WEIGHT_KG} kg`, source: 'NRP', status: 'VERIFY' },
  { key: 'AIRWAY.ETT_SIZE_BY_WEIGHT', parameter: 'Ukuran ETT', value: '<1 kg/<28 mgg: 2,5; 1–2 kg/28–34 mgg: 3,0; >2 kg/>34 mgg: 3,5 mm', source: 'NRP', status: 'VERIFY' },
  { key: 'AIRWAY.ETT_DEPTH_BY_GA', parameter: 'Kedalaman ETT di bibir', value: AIRWAY.ETT_DEPTH_BY_GA.map((r) => `${r.minGa}–${r.maxGa} mgg: ${r.depthCm} cm`).join('; '), source: 'NRP', status: 'VERIFY' },
  { key: 'AIRWAY.BLADE_BY_GA', parameter: 'Bilah laringoskop', value: '00 prematur ekstrem; 0 prematur; 1 aterm', source: 'NRP', status: 'VERIFY' },
  { key: 'AIRWAY.OGT_FR', parameter: 'Pipa orogastrik', value: `${AIRWAY.OGT_FR} Fr (${AIRWAY.OGT_CDH_FR} Fr dengan isap pada hernia diafragmatika)`, source: 'NRP', status: 'VERIFY' },
  { key: 'AIRWAY.NASOPHARYNGEAL_TUBE_MM', parameter: 'Pipa nasofaring (Pierre Robin)', value: `ETT ${AIRWAY.NASOPHARYNGEAL_TUBE_MM} mm via hidung`, source: 'NRP', status: 'VERIFY' },
  { key: 'COMPRESSIONS.RATIO', parameter: 'Rasio kompresi : ventilasi', value: `${COMPRESSIONS.RATIO_COMPRESSIONS}:${COMPRESSIONS.RATIO_BREATHS}`, source: `${AHA} §Chest Compressions`, status: 'terverifikasi' },
  { key: 'COMPRESSIONS.EVENTS_PER_MIN', parameter: 'Laju kompresi', value: `${COMPRESSIONS.COMPRESSIONS_PER_MIN} kompresi + ${COMPRESSIONS.BREATHS_PER_MIN} napas = ${COMPRESSIONS.EVENTS_PER_MIN} kejadian/menit`, source: 'NRP', status: 'VERIFY' },
  { key: 'COMPRESSIONS.TECHNIQUE', parameter: 'Teknik & kedalaman', value: 'Dua ibu jari melingkari dada, sepertiga bawah sternum, ±1/3 diameter AP', source: `${AHA} §Chest Compressions`, status: 'terverifikasi' },
  { key: 'ACCESS.UVC', parameter: 'UVC darurat', value: `${ACCESS.UVC_FR.min}–${ACCESS.UVC_FR.max} Fr, masuk ${ACCESS.UVC_DEPTH_CM.min}–${ACCESS.UVC_DEPTH_CM.max} cm sampai darah mengalir`, source: 'NRP', status: 'VERIFY' },
  { key: 'EPINEPHRINE.CONCENTRATION_MG_PER_ML', parameter: 'Konsentrasi epinefrin', value: `${EPINEPHRINE.CONCENTRATION_MG_PER_ML} mg/mL (1 mg/10 mL)`, source: 'NRP', status: 'VERIFY' },
  { key: 'EPINEPHRINE.IV_DOSE_MG_PER_KG', parameter: 'Epinefrin IV/IO', value: `${EPINEPHRINE.IV_DOSE_MG_PER_KG.min}–${EPINEPHRINE.IV_DOSE_MG_PER_KG.max} mg/kg (0,1–0,3 mL/kg)`, source: `${AHA} §Medications`, status: 'terverifikasi' },
  { key: 'EPINEPHRINE.ETT_DOSE_MG_PER_KG', parameter: 'Epinefrin endotrakeal', value: `${EPINEPHRINE.ETT_DOSE_MG_PER_KG.min}–${EPINEPHRINE.ETT_DOSE_MG_PER_KG.max} mg/kg (0,5–1 mL/kg)`, source: `${AHA} §Medications`, status: 'terverifikasi' },
  { key: 'EPINEPHRINE.FLUSH_ML', parameter: 'Bilas setelah epinefrin IV/IO', value: `NaCl 0,9% ${EPINEPHRINE.FLUSH_ML} mL`, source: 'NRP 8', status: 'VERIFY' },
  { key: 'VOLUME_EXPANDER.DOSE_ML_PER_KG', parameter: 'Cairan (NaCl 0,9%/PRC O-neg)', value: `${VOLUME_EXPANDER.DOSE_ML_PER_KG} mL/kg dalam 5–10 menit, dapat diulang`, source: `${AHA} §Volume Expansion / NRP`, status: 'VERIFY' },
  { key: 'GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL', parameter: 'Hipoglikemia (perlu tata laksana)', value: `<${GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL} mg/dL`, source: 'IDAI/AAP', status: 'VERIFY' },
  { key: 'GLUCOSE.D10_BOLUS_ML_PER_KG', parameter: 'Bolus dekstrosa 10%', value: `${GLUCOSE.D10_BOLUS_ML_PER_KG} mL/kg IV`, source: 'IDAI/NRP', status: 'VERIFY' },
  { key: 'NOT_RECOMMENDED.SODIUM_BICARBONATE', parameter: 'Natrium bikarbonat', value: 'Tidak dianjurkan rutin', source: `${AHA}; KARGER`, status: 'terverifikasi' },
  { key: 'NOT_RECOMMENDED.NALOXONE', parameter: 'Nalokson saat resusitasi', value: 'Tidak dianjurkan; fokus ventilasi', source: 'NRP / AHA', status: 'VERIFY' },
  { key: 'NOT_RECOMMENDED.ROUTINE_TRACHEAL_SUCTION_MECONIUM', parameter: 'Isap trakea rutin (mekonium, tidak bugar)', value: 'Tidak dianjurkan; mulai VTP', source: `${AHA} §Meconium`, status: 'VERIFY' },
  { key: 'POST_RESUSCITATION.HYPOTHERMIA_THERAPY', parameter: 'Terapi hipotermia (HIE sedang–berat)', value: `≥${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_MIN_GA_WEEKS} mgg, mulai <${POST_RESUSCITATION.HYPOTHERMIA_THERAPY_WINDOW_H} jam di fasilitas berprotokol`, source: `${AHA} §Postresuscitation Care`, status: 'VERIFY' },
  { key: 'PNEUMOTHORAX.NEEDLE_GAUGE', parameter: 'Aspirasi jarum pneumotoraks', value: `Kateter ${PNEUMOTHORAX.NEEDLE_GAUGE.min}–${PNEUMOTHORAX.NEEDLE_GAUGE.max} G, SIC 4 LAA atau SIC 2 LMK`, source: 'NRP', status: 'VERIFY' },
  { key: 'SIM.PULSE_OX_ACQUIRE_S', parameter: 'Waktu oksimeter mendapat sinyal (simulasi)', value: `${SIM.PULSE_OX_ACQUIRE_S} detik`, source: 'Asumsi simulator (NRP: dapat 1–2 menit)', status: 'asumsi-sim' },
  { key: 'SIM.DURATION_S', parameter: 'Durasi tindakan (simulasi)', value: `intubasi ${SIM.DURATION_S.intubation} dtk; LMA ${SIM.DURATION_S.lma} dtk; UVC ${SIM.DURATION_S.uvc} dtk; IO ${SIM.DURATION_S.io} dtk; siapkan obat ${SIM.DURATION_S.drugPrep} dtk; aspirasi jarum ${SIM.DURATION_S.needle} dtk`, source: 'Asumsi simulator', status: 'asumsi-sim' },
];

export const SOURCES = [
  {
    id: 'AHA25',
    text: 'Lee HC, Strand ML, Finan E, et al. Part 5: Neonatal Resuscitation: 2025 American Heart Association and American Academy of Pediatrics Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. Circulation. 2025;152(16 suppl 2):S385–S423.',
    url: 'https://doi.org/10.1161/CIR.0000000000001367',
  },
  {
    id: 'AHA25-PED',
    text: 'Versi simultan di Pediatrics. 2026;157(1):e2025074352.',
    url: 'https://publications.aap.org/pediatrics/article/157/1/e2025074352/205237',
  },
  {
    id: 'ILCOR25',
    text: 'Neonatal Life Support: 2025 International Liaison Committee on Resuscitation Consensus on Science With Treatment Recommendations. Pediatrics. 2026;157(1):e2025074766.',
    url: 'https://publications.aap.org/pediatrics/article/157/1/e2025074766/205238',
  },
  {
    id: 'NRP9',
    text: 'American Academy of Pediatrics, American Heart Association. Textbook of Neonatal Resuscitation (NRP), 9th ed.',
    url: 'https://www.aap.org/en/learning/neonatal-resuscitation-program/',
  },
  {
    id: 'KARGER',
    text: '2025 American and European Guidelines on Neonatal Resuscitation: Concordance and Differences. Neonatology. 2025. doi:10.1159/000552450.',
    url: 'https://doi.org/10.1159/000552450',
  },
  {
    id: 'TROPDOCT',
    text: 'Tripathy SK, Das S. AHA/AAP 2025 neonatal resuscitation guideline update: Key changes and practice implications for pediatricians. Trop Doct. 2026. doi:10.1177/00494755261476394.',
    url: 'https://doi.org/10.1177/00494755261476394',
  },
  {
    id: 'IDAI',
    text: 'UKK Neonatologi Ikatan Dokter Anak Indonesia. Buku Panduan Resusitasi Neonatus (edisi terbaru) — mohon cocokkan edisi yang berlaku.',
    url: 'https://www.idai.or.id/',
  },
  {
    id: 'KEMENKES',
    text: 'Keputusan Menteri Kesehatan RI No. HK.01.07/MENKES/214/2019 tentang Pedoman Nasional Pelayanan Kedokteran Tata Laksana Asfiksia.',
    url: 'https://yankes.kemkes.go.id/',
  },
] as const;
