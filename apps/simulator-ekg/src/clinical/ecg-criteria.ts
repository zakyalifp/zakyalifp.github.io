/**
 * ============================================================================
 *  SUMBER TUNGGAL SEMUA KRITERIA & AMBANG KLINIS SIMULATOR EKG
 * ============================================================================
 *
 *  ATURAN: tidak boleh ada ambang klinis yang ditulis langsung di komponen,
 *  synthesizer, penilaian, atau data kasus. Semua diambil dari file ini.
 *  Tabel review (docs/CLINICAL_REVIEW.md) dibuat otomatis dari CRITERIA_REGISTRY
 *  di bagian bawah file (npm run docs:clinical).
 *
 *  Satuan: amplitudo dalam mm pada kalibrasi standar 10 mm/mV (1 mm = 0,1 mV),
 *  durasi dalam milidetik (ms), laju dalam kali/menit, aksis dalam derajat.
 *
 *  STATUS:
 *   - "terverifikasi" : dicocokkan langsung dengan TEKS sumber primer (kutipan/bagian
 *                       dicantumkan). Termasuk PDF lengkap yang diunggah pemilik repo:
 *                       AHA/ACCF/HRS 2009 Part III–VI dan ACC/AHA 2025 (SKA).
 *   - "VERIFY"        : berasal dari sumber primer yang teks lengkapnya tidak dapat
 *                       diakses saat penyusunan (paywall/403) atau dari literatur
 *                       sekunder. WAJIB dicek manual — lihat docs/CLINICAL_REVIEW.md.
 *   - "asumsi-sim"    : parameter simulator/penilaian (toleransi, model), BUKAN
 *                       rekomendasi klinis.
 * ============================================================================
 */

export type ReviewStatus = 'terverifikasi' | 'VERIFY' | 'asumsi-sim';

// ---------------------------------------------------------------------------
// 0. Daftar sumber (dirujuk dengan kunci pendek di komentar)
// ---------------------------------------------------------------------------
export const SOURCES = {
  UDMI4: 'Thygesen K, Alpert JS, Jaffe AS, et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237–269. doi:10.1093/eurheartj/ehy462 (juga Circulation 2018;138:e618–e651, doi:10.1161/CIR.0000000000000617).',
  ESC23: 'Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720–3826. doi:10.1093/eurheartj/ehad191.',
  ACCAHA25: 'Rao SV, O’Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. Circulation 2025;151:e771–e862. doi:10.1161/CIR.0000000000001309 (JACC 2025;85:2135–2237).',
  PNPK26: 'Keputusan Menteri Kesehatan RI No. HK.01.07/MENKES/876/2026 tentang Pedoman Nasional Pelayanan Klinis Tata Laksana Sindrom Koroner Akut (bersumber Pedoman Tata Laksana SKA PERKI 2024 dan ESC 2023).',
  PERKI24: 'Perhimpunan Dokter Spesialis Kardiovaskular Indonesia (PERKI). Pedoman Tata Laksana Sindrom Koroner Akut, 2024. Dicek langsung dari foto halaman yang dikirim pemilik repo: Bab 1.5.2.1 (EKG, Tabel 1.2–1.3, Gambar 1.3–1.4), 1.6–1.7, 2.1 (GRACE, strategi invasif), 3.2–3.3 (reperfusi, Tabel 3.1–3.2 dosis fibrinolitik, Tabel Rekomendasi 9–10), 3.6.2 (aritmia fase akut).',
  KLIGFIELD07: 'Kligfield P, Gettes LS, Bailey JJ, et al. Recommendations for the standardization and interpretation of the electrocardiogram: Part I. Circulation 2007;115:1306–1324.',
  SURAWICZ09: 'Surawicz B, Childers R, Deal BJ, et al. AHA/ACCF/HRS recommendations … Part III: intraventricular conduction disturbances. Circulation 2009;119:e235–e240. doi:10.1161/CIRCULATIONAHA.108.191095.',
  RAUTAHARJU09: 'Rautaharju PM, Surawicz B, Gettes LS, et al. AHA/ACCF/HRS recommendations … Part IV: the ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241–e250. doi:10.1161/CIRCULATIONAHA.108.191096.',
  HANCOCK09: 'Hancock EW, Deal BJ, Mirvis DM, et al. AHA/ACCF/HRS recommendations … Part V: chamber hypertrophy. Circulation 2009;119:e251–e261. doi:10.1161/CIRCULATIONAHA.108.191097.',
  WAGNER09: 'Wagner GS, Macfarlane P, Wellens H, et al. AHA/ACCF/HRS recommendations … Part VI: acute ischemia/infarction. Circulation 2009;119:e262–e270. doi:10.1161/CIRCULATIONAHA.108.191098.',
  KUSUMOTO18: 'Kusumoto FM, Schoenfeld MH, Barrett C, et al. 2018 ACC/AHA/HRS Guideline on the Evaluation and Management of Patients With Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382–e482.',
  ESC19SVT: 'Brugada J, Katritsis DG, Arbelo E, et al. 2019 ESC Guidelines for the management of patients with supraventricular tachycardia. Eur Heart J 2020;41:655–720.',
  ESC22VA: 'Zeppenfeld K, Tfelt-Hansen J, de Riva M, et al. 2022 ESC Guidelines for the management of patients with ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997–4126.',
  ESC24AF: 'Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314–3414.',
  AHA25ALS: 'AHA Guidelines for CPR & ECC 2025, Part 9: Adult Advanced Life Support (dipakai juga oleh Simulator ACLS di repo ini).',
  SGARBOSSA96: 'Sgarbossa EB, Pinski SL, Barbagelata A, et al. Electrocardiographic diagnosis of evolving acute myocardial infarction in the presence of left bundle-branch block. N Engl J Med 1996;334:481–487.',
  SMITH12: 'Smith SW, Dodd KW, Henry TD, et al. Diagnosis of ST-elevation myocardial infarction in the presence of left bundle branch block with the ST-elevation to S-wave ratio in a modified Sgarbossa rule. Ann Emerg Med 2012;60:766–776.',
  DEWINTER08: 'de Winter RJ, Verouden NJ, Wellens HJ, Wilde AA. A new ECG sign of proximal LAD occlusion. N Engl J Med 2008;359:2071–2073.',
  DEZWAAN82: 'de Zwaan C, Bär FW, Wellens HJ. Characteristic electrocardiographic pattern indicating a critical stenosis high in left anterior descending coronary artery in patients admitted because of impending myocardial infarction. Am Heart J 1982;103:730–736.',
  BRUGADA91: 'Brugada P, Brugada J, Mont L, et al. A new approach to the differential diagnosis of a regular tachycardia with a wide QRS complex. Circulation 1991;83:1649–1659.',
  VERECKEI08: 'Vereckei A, Duray G, Szénási G, et al. New algorithm using only lead aVR for differential diagnosis of wide QRS complex tachycardia. Heart Rhythm 2008;5:89–98.',
  PRIORI13: 'Priori SG, Wilde AA, Horie M, et al. HRS/EHRA/APHRS expert consensus statement on the diagnosis and management of patients with inherited primary arrhythmia syndromes. Heart Rhythm 2013;10:1932–1963.',
  MACFARLANE15: 'Macfarlane PW, Antzelevitch C, Haissaguerre M, et al. The Early Repolarization Pattern: A Consensus Paper. J Am Coll Cardiol 2015;66:470–477.',
  ADLER15: 'Adler Y, Charron P, Imazio M, et al. 2015 ESC Guidelines for the diagnosis and management of pericardial diseases. Eur Heart J 2015;36:2921–2964.',
  MATTU00: 'Mattu A, Brady WJ, Robinson DA. Electrocardiographic manifestations of hyperkalemia. Am J Emerg Med 2000;18:721–729.',
  DIERCKS04: 'Diercks DB, Shumaik GM, Harrigan RA, et al. Electrocardiographic manifestations: electrolyte abnormalities. J Emerg Med 2004;27:153–160.',
  MATTU02: 'Mattu A, Brady WJ, Perron AD. Electrocardiographic manifestations of hypothermia. Am J Emerg Med 2002;20:314–326.',
  BOEHNERT85: 'Boehnert MT, Lovejoy FH Jr. Value of the QRS duration versus the serum drug level in predicting seizures and ventricular arrhythmias after an acute overdose of tricyclic antidepressants. N Engl J Med 1985;313:474–479.',
  LIEBELT95: 'Liebelt EL, Francis PD, Woolf AD. ECG lead aVR versus QRS interval in predicting seizures and arrhythmias in acute tricyclic antidepressant toxicity. Ann Emerg Med 1995;26:195–201.',
  MA01: 'Ma G, Brady WJ, Pollack M, Chan TC. Electrocardiographic manifestations: digitalis toxicity. J Emerg Med 2001;20:145–152.',
  SOKOLOW49: 'Sokolow M, Lyon TP. The ventricular complex in left ventricular hypertrophy as obtained by unipolar precordial and limb leads. Am Heart J 1949;37:161–186.',
  CASALE85: 'Casale PN, Devereux RB, Kligfield P, et al. Electrocardiographic detection of left ventricular hypertrophy: development and prospective validation of improved criteria. J Am Coll Cardiol 1985;6:572–580.',
  BAZETT20: 'Bazett HC. An analysis of the time-relations of electrocardiograms. Heart 1920;7:353–370.',
  FRIDERICIA20: 'Fridericia LS. Die Systolendauer im Elektrokardiogramm bei normalen Menschen und bei Herzkranken. Acta Med Scand 1920;53:469–486.',
  DREW10: 'Drew BJ, Ackerman MJ, Funk M, et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047–1060.',
} as const;
export type SourceKey = keyof typeof SOURCES;

// ---------------------------------------------------------------------------
// 1. Kertas & kalibrasi EKG
// ---------------------------------------------------------------------------
export const PAPER = {
  // KLIGFIELD07: kecepatan kertas standar 25 mm/s, kalibrasi 10 mm/mV. [VERIFY]
  SPEED_MM_PER_S: 25,
  GAIN_MM_PER_MV: 10,
  // Opsi tampilan tambahan (umum di mesin EKG). [asumsi-sim]
  SPEED_OPTIONS: [25, 50] as const,
  GAIN_OPTIONS: [5, 10, 20] as const,
  SMALL_BOX_MM: 1,
  LARGE_BOX_MM: 5,
  // Pulsa kalibrasi 1 mV selama 200 ms. [asumsi-sim]
  CAL_PULSE_MV: 1,
  CAL_PULSE_MS: 200,
} as const;

// ---------------------------------------------------------------------------
// 2. Laju & interval normal dewasa
// ---------------------------------------------------------------------------
export const RATE = {
  // Konvensi klinis: bradikardia sinus <60/menit, takikardia sinus >100/menit.
  // Catatan: sebagian pernyataan AHA menyarankan batas bawah 50/menit. [VERIFY]
  BRADY_BELOW: 60,
  TACHY_ABOVE: 100,
  // Takikardia QRS sempit/SVT biasanya 150–250/menit (ESC19SVT). [VERIFY]
  SVT_TYPICAL: { min: 150, max: 250 },
  // Flutter atrium tipikal: laju atrium ~240–350/menit (ESC19SVT). [VERIFY]
  FLUTTER_ATRIAL: { min: 240, max: 350 },
  // PERKI24 §3.6.2.2: AIVR akibat reperfusi, "laju ventrikel <120 detak per menit", biasanya
  // tidak berbahaya dan tidak perlu terapi. Simulator membuat AIVR 50–110/menit (di dalam
  // batas PERKI; rentang umum literatur). [terverifikasi]
  AIVR: { min: 50, max: 110 },
  AIVR_PERKI_MAX: 120,
  // Irama junctional (lolos) 40–60/menit; terakselerasi 60–100. [VERIFY]
  JUNCTIONAL_ESCAPE: { min: 40, max: 60 },
} as const;

export const INTERVALS = {
  // PR normal 120–200 ms; >200 ms = AV blok derajat 1 (SURAWICZ09/KUSUMOTO18). [VERIFY]
  PR_MIN_MS: 120,
  PR_MAX_MS: 200,
  // SURAWICZ09 (WPW): "PR interval … less than 120 ms during sinus rhythm in adults" +
  // delta wave + QRS >120 ms. [terverifikasi]
  PR_SHORT_BELOW_MS: 120,
  // SURAWICZ09: QRS dewasa "may be up to 110 ms"; IVCD non-spesifik "QRS >110 ms";
  // BBB komplet "≥120 ms"; RBBB/LBBB inkomplet 110–120 ms. [terverifikasi]
  QRS_NORMAL_MAX_MS: 110,
  QRS_BBB_MIN_MS: 120,
  // HANCOCK09: "total duration of the P wave of 120 ms or more" → abnormalitas atrium
  // kiri (pemanjangan konduksi intraatrial). [terverifikasi]
  P_MAX_MS: 120,
} as const;

// ---------------------------------------------------------------------------
// 3. QT & QTc
// ---------------------------------------------------------------------------
export const QT = {
  // RAUTAHARJU09 (rekomendasi): "adjusted QT of 460 ms or longer in women and 450 ms or
  // longer in men be considered a prolonged QT interval and that QT 390 ms and shorter
  // be considered a short QT interval". [terverifikasi]
  PROLONGED_MALE_MS: 450,
  PROLONGED_FEMALE_MS: 460,
  SHORT_MS: 390,
  // RAUTAHARJU09: "linear regression functions rather than the Bazett's formula be used
  // for QT-rate correction" dan koreksi QT "should not be attempted when RR interval
  // variability is large, as often occurs with atrial fibrillation". Simulator tetap
  // menampilkan Bazett/Fridericia (paling dikenal di Indonesia) dengan peringatan, dan
  // TIDAK menilai QTc pada irama sangat tidak teratur (FA, MAT). [terverifikasi]
  NO_CORRECTION_IRREGULAR: true,
  // DREW10: QTc >500 ms = risiko tinggi torsades de pointes. [VERIFY]
  HIGH_RISK_MS: 500,
} as const;

/** QTc Bazett (BAZETT20): QT / √RR, RR dalam detik. */
export function qtcBazett(qtMs: number, rrS: number): number {
  return qtMs / Math.sqrt(rrS);
}
/** QTc Fridericia (FRIDERICIA20): QT / ∛RR, RR dalam detik. */
export function qtcFridericia(qtMs: number, rrS: number): number {
  return qtMs / Math.cbrt(rrS);
}
/** QTc Framingham (Sagie 1992): QT + 154 × (1 − RR). Pelengkap. */
export function qtcFramingham(qtMs: number, rrS: number): number {
  return qtMs + 154 * (1 - rrS);
}
/** QTc Hodges (1983): QT + 1,75 × (HR − 60). Pelengkap. */
export function qtcHodges(qtMs: number, hr: number): number {
  return qtMs + 1.75 * (hr - 60);
}
export function rrFromHr(hr: number): number {
  return 60 / hr;
}
export function qtcCategory(qtcMs: number, sex: 'L' | 'P'): 'pendek' | 'normal' | 'memanjang' | 'sangat-memanjang' {
  if (qtcMs > QT.HIGH_RISK_MS) return 'sangat-memanjang';
  if (qtcMs >= (sex === 'P' ? QT.PROLONGED_FEMALE_MS : QT.PROLONGED_MALE_MS)) return 'memanjang';
  if (qtcMs <= QT.SHORT_MS) return 'pendek';
  return 'normal';
}

// ---------------------------------------------------------------------------
// 4. Aksis listrik jantung (bidang frontal)
// ---------------------------------------------------------------------------
export const AXIS = {
  // SURAWICZ09: "In adults, the normal QRS axis is considered to be within −30° and
  // 90°". Deviasi kiri sedang −30°…−45°, berat −45°…−90° (sering LAFB); deviasi kanan
  // sedang 90°…120°, berat 120°…180° (sering LPFB); QRS ekuifasik = "indeterminate".
  // [terverifikasi]
  NORMAL_MIN: -30,
  NORMAL_MAX: 90,
  LAD_MARKED_BELOW: -45,
  RAD_MARKED_ABOVE: 120,
  // Kuadran −90° s.d. ±180° ("northwest"/ekstrem) TIDAK didefinisikan untuk dewasa di
  // SURAWICZ09 (istilah "extreme right axis" hanya untuk neonatus). Dipakai sebagai
  // konvensi pengajaran. [asumsi-sim]
  EXTREME_MIN: -180,
  EXTREME_MAX: -90,
} as const;

/** Normalisasi sudut ke rentang (−180, 180]. */
export function normAngle(a: number): number {
  let x = ((a + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}

/**
 * Aksis dari defleksi netto QRS di sadapan I dan aVF (mm atau mV, satuan sama).
 * aVF = |H|·sin θ·(√3/2) pada model Einthoven, maka θ = atan2(2·aVF/√3, I).
 */
export function axisFromIaVF(netI: number, netAVF: number): number {
  return normAngle((Math.atan2((2 * netAVF) / Math.sqrt(3), netI) * 180) / Math.PI);
}

export type AxisCategory = 'normal' | 'deviasi-kiri' | 'deviasi-kanan' | 'ekstrem';
export function axisCategory(deg: number): AxisCategory {
  const a = normAngle(deg);
  if (a >= AXIS.NORMAL_MIN && a <= AXIS.NORMAL_MAX) return 'normal';
  if (a < AXIS.NORMAL_MIN && a >= AXIS.EXTREME_MAX) return 'deviasi-kiri';
  if (a > AXIS.NORMAL_MAX && a <= 180) return 'deviasi-kanan';
  return 'ekstrem';
}
export const AXIS_LABEL: Record<AxisCategory, string> = {
  normal: 'Normal (−30° s.d. +90°)',
  'deviasi-kiri': 'Deviasi aksis kiri (< −30°; berat < −45°)',
  'deviasi-kanan': 'Deviasi aksis kanan (> +90°; berat > +120°)',
  ekstrem: 'Aksis ekstrem/"northwest" (−90° s.d. ±180°)',
};

// ---------------------------------------------------------------------------
// 5. Iskemia & infark (STEMI/OMI)
// ---------------------------------------------------------------------------
export const ST_ELEVATION = {
  // ESC23 (teks): "New ST elevation at the J-point in at least two contiguous leads:
  // ≥2.5 mm in men <40 years, ≥2 mm in men ≥40 years, or ≥1.5 mm in women regardless of
  // age in leads V2–V3 and/or ≥1 mm in the other leads (in the absence of LVH or LBBB)".
  // Identik dengan PERKI24 Tabel 1.2, PNPK26 Tabel 3, UDMI4, WAGNER09 (rekomendasi 1–3) dan
  // ACCAHA25 Tabel 3. PERKI24 (catatan Tabel 1.2): bila elevasi J di V2–V3 sudah ada di EKG
  // lama, elevasi J baru ≥1 mm dibanding EKG lama dianggap respons iskemik. [terverifikasi]
  V2V3_MEN_GE40_MM: 2.0,
  V2V3_MEN_LT40_MM: 2.5,
  V2V3_WOMEN_MM: 1.5,
  OTHER_LEADS_MM: 1.0,
  AGE_CUTOFF_MEN: 40,
  // UDMI4 (teks bagian sadapan tambahan): "A cut-off point of 0.5 mm ST-elevation is
  // recommended in leads V7–V9"; ≥1 mm pada pria <40 tahun. WAGNER09 memakai 0,5 mm untuk
  // semua umur (tanpa pengecualian pria <40) — simulator mengikuti UDMI4. [terverifikasi]
  POSTERIOR_V7V9_MM: 0.5,
  POSTERIOR_V7V9_MEN_LT40_MM: 1.0,
  // UDMI4 & WAGNER09 (rekomendasi 4): elevasi ST ≥0,5 mm di V3R/V4R; ≥1 mm pada pria
  // <30 tahun. [terverifikasi]
  // Catatan: PNPK26 menulis "≥1 mV di V1 dan V4R" (salah ketik mm). PERKI24 Gambar 1.3
  // memasukkan V3R/V4R ke ambang "1 mm pada sadapan lainnya". Penilaian memakai UDMI4;
  // semua kasus sintetis IMA ventrikel kanan dibuat ≥1 mm di V3R/V4R sehingga memenuhi
  // kedua ambang (diuji di synthetic.test.ts). Lihat docs/CLINICAL_REVIEW.md.
  RIGHT_V4R_PERKI_MM: 1.0,
  RIGHT_V4R_MM: 0.5,
  RIGHT_V4R_MEN_LT30_MM: 1.0,
  // Pengukuran pada titik J dibanding garis dasar PR/TP (UDMI4/PNPK26). [terverifikasi]
  MEASURE_AT: 'J-point' as const,
  MIN_CONTIGUOUS_LEADS: 2,
} as const;

/** Ambang elevasi ST (mm) untuk satu sadapan menurut UDMI4/ESC23/PNPK26. */
export function steThresholdMm(lead: string, sex: 'L' | 'P', age: number): number {
  if (lead === 'V2' || lead === 'V3') {
    if (sex === 'P') return ST_ELEVATION.V2V3_WOMEN_MM;
    return age < ST_ELEVATION.AGE_CUTOFF_MEN ? ST_ELEVATION.V2V3_MEN_LT40_MM : ST_ELEVATION.V2V3_MEN_GE40_MM;
  }
  if (lead === 'V7' || lead === 'V8' || lead === 'V9') {
    return sex === 'L' && age < 40 ? ST_ELEVATION.POSTERIOR_V7V9_MEN_LT40_MM : ST_ELEVATION.POSTERIOR_V7V9_MM;
  }
  if (lead === 'V3R' || lead === 'V4R') {
    return sex === 'L' && age < 30 ? ST_ELEVATION.RIGHT_V4R_MEN_LT30_MM : ST_ELEVATION.RIGHT_V4R_MM;
  }
  return ST_ELEVATION.OTHER_LEADS_MM;
}

export const ST_DEPRESSION = {
  // PNPK26 Tabel 3 / UDMI4: depresi ST horizontal atau downsloping ≥0,5 mm pada 2
  // sadapan berdekatan dan/atau inversi T >1 mm pada 2 sadapan berdekatan dengan R
  // prominen atau rasio R/S >1. [terverifikasi]
  ISCHEMIC_MM: 0.5,
  T_INVERSION_MM: 1.0,
  // PNPK26 (teks): "Depresi segmen ST yang diagnostik untuk iskemia adalah sebesar
  // ≥0,05 mV di sadapan V1–V3 dan ≥0,1 mV di sadapan lainnya." Sejalan dengan WAGNER09
  // (rekomendasi 6): depresi titik J −0,05 mV di V2–V3 dan −0,1 mV di sadapan lain.
  // ACCAHA25 Tabel 3 (SKA-NEST): depresi ST baru ≥0,5 mm horizontal/downsloping di 2
  // sadapan berdekatan dan/atau inversi T >1 mm. [terverifikasi]
  PNPK_V1V3_MM: 0.5,
  PNPK_OTHER_MM: 1.0,
  // PNPK26 & PERKI24 (hal. 11): inversi T simetris ≥0,2 mV spesifisitas tinggi untuk iskemia
  // akut. [terverifikasi]
  DEEP_TWI_MM: 2.0,
  // PERKI24 Gambar 1.4 (SKA-NEST): "inversi gelombang T >1 mm pada ≥5 sadapan (termasuk I,
  // II, aVL, dan V2–V6)" → gangguan prognosis ringan. [terverifikasi]
  ISOLATED_TWI_PROGNOSTIC_MIN_LEADS: 5,
  // ACCAHA25 Tabel 3: bila depresi ST terisolasi ≥0,5 mm di V1–V3 → rekam V7–V9 untuk
  // mencari infark posterior. [terverifikasi]
  RECORD_V7V9_IF_STD_V1V3_MM: 0.5,
} as const;

export const AVR_PATTERN = {
  // ESC23 (teks): "ST depression ≥1 mm in ≥6 surface leads (inferolateral ST
  // depression), coupled with ST-segment elevation in aVR and/or V1" → sugestif
  // obstruksi left main/multivessel; bila ada, "prompt triage for immediate reperfusion
  // therapy is indicated" (konteks iskemia berlangsung/instabilitas). UDMI4 serupa:
  // "ST-segment depression ≥1 mm in six leads". PERKI24 Gambar 1.3 identik ("depresi ST
  // 1 mm pada ≥6 sadapan permukaan … ditambah elevasi ST pada aVR dan/atau V1") dengan
  // catatan: terapi reperfusi dilanjutkan secara mekanik (IKPP). [terverifikasi]
  STD_MM: 1.0,
  MIN_LEADS_WITH_STD: 6,
  // WAGNER09: depresi ST >0,1 mV di ≥8 sadapan + elevasi ST aVR dan/atau V1 → iskemia
  // multivessel/left main. ESC23 (lebih baru) memakai ≥6 sadapan; simulator mengikuti
  // ESC23. [terverifikasi]
  WAGNER09_MIN_LEADS: 8,
  // Besar elevasi aVR TIDAK diberi angka oleh ESC23 maupun WAGNER09; ≥1 mm dipakai
  // sebagai ambang operasional kasus sintetis. [asumsi-sim]
  STE_AVR_MM: 1.0,
} as const;

export const POSTERIOR_MI = {
  // ESC23 (teks): "ST-segment depression in leads V1–V3 … and/or ST-segment elevation
  // in V7–V9 are highly suggestive of posterior coronary artery occlusion". [terverifikasi]
  LEADS_DEPRESSION: ['V1', 'V2', 'V3'] as const,
  LEADS_ELEVATION: ['V7', 'V8', 'V9'] as const,
} as const;

export const HYPERACUTE_T = {
  // UDMI4 (teks): T hiperakut = "prominent symmetrical T waves in at least two
  // contiguous leads", dapat mendahului elevasi ST. Tidak ada ambang angka. [terverifikasi]
  MIN_CONTIGUOUS: 2,
  // Ambang operasional simulator: amplitudo T ≥ 75% amplitudo QRS di sadapan tsb. [asumsi-sim]
  SIM_T_TO_QRS_RATIO: 0.75,
  // RAUTAHARJU09: batas atas normal T di V2 — pria 1,0–1,4 mV (hingga 1,6 mV usia
  // 18–29 th), wanita 0,7–1,0 mV. Dipakai sebagai acuan "T tinggi". [terverifikasi]
  V2_UPPER_MALE_MM: 14,
  V2_UPPER_FEMALE_MM: 10,
} as const;

/** Deskriptor amplitudo gelombang T (RAUTAHARJU09). Satuan mm (10 mm = 1 mV). [terverifikasi] */
export const T_WAVE = {
  // Untuk I, II, aVL, V2–V6: "inverted" −0,1 s.d. −0,5 mV; "deep negative" −0,5 s.d.
  // −1,0 mV; "giant negative" < −1,0 mV; "low" <10% R di sadapan yang sama; "flat"
  // puncak T antara +0,1 dan −0,1 mV.
  INVERTED_MM: -1,
  DEEP_MM: -5,
  GIANT_MM: -10,
  LOW_PCT_OF_R: 10,
  FLAT_MM: 1,
} as const;

export const Q_WAVE = {
  // UDMI4 Tabel 3 (gambar; tidak terbaca di teks yang diakses): Q di V2–V3 >0,02 s atau
  // QS; Q ≥0,03 s dan ≥1 mm atau QS di I, II, aVL, aVF, atau V4–V6 pada 2 sadapan satu
  // kelompok; R >0,04 s di V1–V2 dengan R/S >1 dan T positif konkordan (tanpa gangguan
  // konduksi) = infark posterior lama. WAGNER09 tidak memuat ulang tabel ini. [VERIFY]
  V2V3_MS: 20,
  OTHER_MS: 30,
  OTHER_DEPTH_MM: 1,
  POSTERIOR_R_V1V2_MS: 40,
} as const;

/** Kelompok sadapan berdekatan (PERKI24 Tabel 1.3 = PNPK26 Tabel 4 / UDMI4). [terverifikasi] */
export const CONTIGUOUS_GROUPS: Record<string, readonly string[]> = {
  anterior: ['V1', 'V2', 'V3', 'V4'],
  lateral: ['I', 'aVL', 'V5', 'V6'],
  inferior: ['II', 'III', 'aVF'],
  posterior: ['V7', 'V8', 'V9'],
  ventrikelKanan: ['V3R', 'V4R'],
};
/** Urutan sadapan berdekatan (prekordial berurutan; ekstremitas urutan Cabrera). */
export const CONTIGUITY_ORDER = {
  precordial: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
  limbCabrera: ['aVL', 'I', '-aVR', 'II', 'aVF', 'III'],
} as const;

/**
 * Apakah dua sadapan bersebelahan menurut UDMI4 (prekordial berurutan; ekstremitas
 * berurutan Cabrera; V6 bersebelahan dengan I/aVL tidak dihitung).
 */
export function areContiguous(a: string, b: string): boolean {
  const seqs: string[][] = [
    ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
    ['aVL', 'I', '-aVR', 'II', 'aVF', 'III'],
    ['V7', 'V8', 'V9'],
    ['V3R', 'V4R', 'V5R'],
  ];
  for (const s of seqs) {
    const i = s.indexOf(a);
    const j = s.indexOf(b);
    if (i >= 0 && j >= 0 && Math.abs(i - j) === 1) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 6. Bundle branch block / irama pacu: Sgarbossa & modifikasi Smith
// ---------------------------------------------------------------------------
export const SGARBOSSA = {
  // SGARBOSSA96: (1) elevasi ST konkordan ≥1 mm (5 poin); (2) depresi ST konkordan
  // ≥1 mm di V1, V2, atau V3 (3 poin); (3) elevasi ST diskordan berlebihan ≥5 mm
  // (2 poin). Skor ≥3 → spesifik untuk IMA.
  // Ketiga AMBANG (1 mm konkordan pada QRS positif; depresi 1 mm V1–V3; 5 mm diskordan
  // pada QRS negatif) dikonfirmasi WAGNER09. [terverifikasi]
  CONCORDANT_STE_MM: 1,
  CONCORDANT_STD_V1V3_MM: 1,
  EXCESS_DISCORDANT_STE_MM: 5,
  // Bobot poin hanya ada di SGARBOSSA96 (teks asli tidak diakses). [VERIFY]
  POINTS: { concordantSte: 5, concordantStdV1V3: 3, excessDiscordant: 2 },
  POSITIVE_SCORE: 3,
  // SMITH12: kriteria (3) diganti rasio ST/S ≤ −0,25 (elevasi ST diskordan ≥25% dari
  // kedalaman S) pada sadapan dengan elevasi ST ≥1 mm. Salah satu kriteria = positif. [VERIFY]
  SMITH_RATIO: -0.25,
  SMITH_MIN_STE_MM: 1,
  // UDMI4 (teks): pada LBBB, "ST elevation ≥1 mm concordant with the QRS in any lead"
  // dapat menandakan iskemia akut. [terverifikasi]
  UDMI_CONCORDANT_STE_MM: 1,
} as const;

export interface SgarbossaInput {
  /** Per sadapan: polaritas QRS dominan (+1/−1), deviasi ST di titik J (mm), kedalaman S/tinggi R (mm). */
  leads: Array<{ lead: string; qrsPolarity: 1 | -1; stMm: number; sDepthMm: number; rHeightMm: number }>;
}
export interface SgarbossaResult {
  score: number;
  classicPositive: boolean;
  smithPositive: boolean;
  findings: string[];
}
export function evaluateSgarbossa(inp: SgarbossaInput): SgarbossaResult {
  let a = false;
  let b = false;
  let c = false;
  let smith = false;
  const findings: string[] = [];
  for (const l of inp.leads) {
    if (l.qrsPolarity > 0 && l.stMm >= SGARBOSSA.CONCORDANT_STE_MM) {
      a = true;
      findings.push(`${l.lead}: elevasi ST konkordan ${l.stMm.toFixed(1)} mm`);
    }
    if (['V1', 'V2', 'V3'].includes(l.lead) && l.qrsPolarity < 0 && l.stMm <= -SGARBOSSA.CONCORDANT_STD_V1V3_MM) {
      b = true;
      findings.push(`${l.lead}: depresi ST konkordan ${Math.abs(l.stMm).toFixed(1)} mm`);
    }
    if (l.qrsPolarity < 0 && l.stMm >= SGARBOSSA.EXCESS_DISCORDANT_STE_MM) {
      c = true;
      findings.push(`${l.lead}: elevasi ST diskordan ${l.stMm.toFixed(1)} mm (≥5 mm)`);
    }
    if (l.qrsPolarity < 0 && l.stMm >= SGARBOSSA.SMITH_MIN_STE_MM && l.sDepthMm > 0) {
      const ratio = -l.stMm / l.sDepthMm;
      if (ratio <= SGARBOSSA.SMITH_RATIO) {
        smith = true;
        findings.push(`${l.lead}: rasio ST/S ${ratio.toFixed(2)} (≤ −0,25)`);
      }
    }
  }
  const score = (a ? SGARBOSSA.POINTS.concordantSte : 0) + (b ? SGARBOSSA.POINTS.concordantStdV1V3 : 0) + (c ? SGARBOSSA.POINTS.excessDiscordant : 0);
  return { score, classicPositive: score >= SGARBOSSA.POSITIVE_SCORE, smithPositive: a || b || smith, findings };
}

// ---------------------------------------------------------------------------
// 7. Pola oklusi tanpa elevasi ST klasik
// ---------------------------------------------------------------------------
export const DE_WINTER = {
  // PERKI24 Gambar 1.4 (= ESC23): "depresi segmen ST upsloping 1–3 mm pada poin J, pada
  // V1–V6 yang kemudian menjadi gelombang T yang tinggi, positif, dan simetris" →
  // stenosis berat/oklusi LAD proksimal. [terverifikasi]
  STD_MIN_MM: 1,
  STD_MAX_MM: 3,
  LEADS: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const,
  // DEWINTER08: sebagian besar disertai elevasi ST 1–2 mm di aVR (tidak disebut PERKI24). [VERIFY]
  AVR_STE_MM: { min: 1, max: 2 },
} as const;

export const WELLENS = {
  // DEZWAAN82: tipe A = T bifasik (positif lalu negatif) di V2–V3; tipe B = T terbalik
  // dalam & simetris di V2–V3 (dapat sampai V1–V6); riwayat angina, rekaman saat bebas
  // nyeri, ST isoelektrik/elevasi minimal (<1 mm), tanpa gelombang Q prekordial, progresi
  // R terjaga → stenosis kritis LAD proksimal; hindari uji latih beban.
  // PERKI24 Gambar 1.4: "elevasi poin J isoelektrik atau minimal (<1 mm)" + T bifasik di V2
  // dan V3 (tipe A) atau T simetrik dan sangat terbalik di V2 dan V3, kadang V1, V4, V5, V6
  // (tipe B) → stenosis berat/oklusi LAD proksimal. [terverifikasi]
  LEADS: ['V2', 'V3'] as const,
  MAX_STE_MM: 1,
  // WAGNER09: T inversi dalam ">0.5 mV" di V2, V3, V4 (kadang V5), sering dengan QT
  // memanjang, setelah nyeri dada tanpa evolusi infark → biasanya stenosis berat LAD
  // proksimal (pola serupa pada perdarahan intrakranial/"CVA pattern"). [terverifikasi]
  TYPE_B_DEEP_TWI_MM: 5,
  TYPE_B_LEADS: ['V2', 'V3', 'V4'] as const,
} as const;

// ---------------------------------------------------------------------------
// 8. Peniru STEMI & pola lain
// ---------------------------------------------------------------------------
export const BRUGADA = {
  // PRIORI13 / ESC22VA: tipe 1 = elevasi ST "coved" ≥2 mm pada ≥1 sadapan prekordial
  // kanan (V1–V2) di ICS 2/3/4, diikuti T negatif (spontan atau diinduksi obat). [VERIFY]
  TYPE1_STE_MM: 2,
  LEADS: ['V1', 'V2'] as const,
} as const;

export const EARLY_REPOL = {
  // MACFARLANE15: elevasi titik J (Jp) ≥0,1 mV pada ≥2 sadapan berdekatan inferior
  // dan/atau lateral, dengan notch/slur pada akhir QRS. [VERIFY]
  JP_MV: 0.1,
} as const;

export const PERICARDITIS = {
  // ADLER15: elevasi ST cekung luas + depresi PR (fase awal); aVR: depresi ST & elevasi PR.
  // Rasio ST/T di V6 >0,25 lebih mendukung perikarditis daripada repolarisasi dini
  // (Ginzton & Laks 1982). [VERIFY]
  ST_T_RATIO_V6: 0.25,
  PR_DEPRESSION_MM: 0.8,
} as const;

// ---------------------------------------------------------------------------
// 9. Hipertrofi & pembesaran atrium
// ---------------------------------------------------------------------------
export const LVH = {
  // HANCOCK09 Tabel 1: Sokolow–Lyon "S V1 + R V5 >35 mm" (Sokolow 1949); varian Murphy
  // "S V1,2 + R V5,6 >35 mm". Simulator: SV1 + maks(RV5, RV6) >35 mm. [terverifikasi]
  SOKOLOW_MM: 35,
  // HANCOCK09 Tabel 1 (Casale 1985, Cornell): "R aVL + S V3 >28 mm (men), >20 mm
  // (women)". [terverifikasi]
  CORNELL_MALE_MM: 28,
  CORNELL_FEMALE_MM: 20,
  // HANCOCK09 Tabel 1: "R aVL >11 mm" (Sokolow 1949). [terverifikasi]
  RAVL_MM: 11,
  // HANCOCK09: istilah "strain" tidak dianjurkan; gunakan "abnormalitas ST-T sekunder"
  // (secondary ST-T abnormality). [terverifikasi]
} as const;
export function lvhCriteria(m: { sV1: number; rV5: number; rV6: number; rAVL: number; sV3: number }, sex: 'L' | 'P') {
  const sokolow = m.sV1 + Math.max(m.rV5, m.rV6);
  const cornell = m.rAVL + m.sV3;
  return {
    sokolow,
    cornell,
    sokolowPositive: sokolow > LVH.SOKOLOW_MM,
    cornellPositive: cornell > (sex === 'P' ? LVH.CORNELL_FEMALE_MM : LVH.CORNELL_MALE_MM),
    ravlPositive: m.rAVL > LVH.RAVL_MM,
  };
}

export const RVH = {
  // HANCOCK09 Tabel 2 (kriteria voltase RVH dewasa): R V1 >6 mm; R:S V1 >1,0; S V5
  // >10 mm; S V6 >3 mm; R aVR >4 mm; S V1 <2 mm; R V1 + S V5/V6 >10,5 mm; R peak time
  // V1 >35 ms; ditambah deviasi aksis kanan. Tidak ada satu kriteria yang cukup
  // sendiri; spesifisitas lebih baik bila beberapa terpenuhi. [terverifikasi]
  R_V1_MM: 6,
  RS_RATIO_V1: 1,
  S_V5_MM: 10,
  S_V6_MM: 3,
  R_V1_PLUS_S_V5V6_MM: 10.5,
  RPT_V1_MS: 35,
} as const;

export const ATRIAL = {
  // HANCOCK09 menganjurkan istilah "abnormalitas atrium" (bukan "pembesaran").
  // Abnormalitas atrium kanan: P tinggi di II ">2.5 mm" (sering runcing); positivitas
  // awal P di V1/V2 "1.5 mm (0.15 mV) or more". [terverifikasi]
  RAE_P_II_MM: 2.5,
  RAE_P_V1_MM: 1.5,
  // Abnormalitas atrium kiri: durasi P "120 ms or more", P berlekuk lebar "(40 ms or
  // more)", P terminal force V1 (amplitudo × durasi komponen negatif). [terverifikasi]
  LAE_P_DUR_MS: 120,
  LAE_NOTCH_MS: 40,
  // Batas PTF V1 ≥1 mm × ≥40 ms TIDAK diberi angka di HANCOCK09 (konvensi Morris 1964). [VERIFY]
  LAE_PTF_V1_DEPTH_MM: 1,
  LAE_PTF_V1_DUR_MS: 40,
} as const;

export const LOW_VOLTAGE = {
  // Amplitudo QRS <5 mm di semua sadapan ekstremitas dan/atau <10 mm di semua sadapan
  // prekordial. HANCOCK09 menyebut voltase rendah ekstremitas (PPOK, efusi) tanpa angka;
  // angka dari Mason 2007 (Part II, tidak diakses). [VERIFY]
  LIMB_MM: 5,
  PRECORDIAL_MM: 10,
} as const;

// ---------------------------------------------------------------------------
// 10. Gangguan konduksi
// ---------------------------------------------------------------------------
export const CONDUCTION = {
  // SURAWICZ09 — RBBB komplet: QRS ≥120 ms; rsr'/rsR'/rSR' di V1/V2; S lebih lebar
  // dari R atau >40 ms di I & V6; R-peak time V1 >50 ms. [terverifikasi]
  RBBB_S_WIDTH_I_V6_MS: 40,
  RBBB_RPT_V1_MS: 50,
  // SURAWICZ09 — LBBB komplet: QRS ≥120 ms; R lebar berlekuk/slur di I, aVL, V5, V6;
  // tanpa q di I, V5, V6; R-peak time V5–V6 >60 ms; ST-T berlawanan arah QRS. [terverifikasi]
  LBBB_RPT_V5V6_MS: 60,
  // SURAWICZ09 — LAFB: aksis −45° s.d. −90°; qR di aVL; R-peak time aVL ≥45 ms; QRS <120. [terverifikasi]
  LAFB_AXIS: { min: -90, max: -45 },
  LAFB_RPT_AVL_MS: 45,
  // SURAWICZ09 — LPFB: aksis +90° s.d. +180°; rS di I & aVL; qR di III & aVF; QRS <120;
  // singkirkan penyebab deviasi aksis kanan lain. [terverifikasi]
  LPFB_AXIS: { min: 90, max: 180 },
  // SURAWICZ09: istilah "bifascicular/trifascicular block" TIDAK dianjurkan; sebutkan
  // tiap gangguan konduksi secara terpisah (mis. "RBBB + LAFB"). [terverifikasi]
} as const;

export const AV_BLOCK = {
  // KUSUMOTO18: derajat 1 PR >200 ms; Mobitz I = PR memanjang progresif sebelum P tak
  // dikonduksikan; Mobitz II = PR konstan lalu P tiba-tiba tak dikonduksikan; 2:1 tidak
  // dapat diklasifikasikan dari EKG permukaan; derajat tinggi = ≥2 P berurutan tak
  // dikonduksikan; derajat 3 = disosiasi AV dengan laju atrium > laju ventrikel. [VERIFY]
  FIRST_DEGREE_PR_MS: 200,
} as const;

// ---------------------------------------------------------------------------
// 11. Takikardia kompleks lebar: VT vs SVT aberan
// ---------------------------------------------------------------------------
export const WCT = {
  // BRUGADA91: (1) tidak ada kompleks RS di semua sadapan prekordial → VT; (2) interval
  // RS (awal R s.d. dasar S) >100 ms di satu sadapan prekordial → VT; (3) disosiasi AV
  // → VT; (4) kriteria morfologi V1–V2 & V6. [VERIFY]
  BRUGADA_RS_INTERVAL_MS: 100,
  // VERECKEI08 (aVR): (1) R inisial; (2) r atau q inisial >40 ms; (3) notch pada sisi
  // turun QRS yang negatif di awal; (4) vi/vt ≤1 → VT. [VERIFY]
  VERECKEI_INITIAL_MS: 40,
  // ESC22VA/ESC19SVT: takikardia QRS lebar yang mekanismenya belum jelas ditatalaksana
  // sebagai VT. QRS >140 ms (pola RBBB) atau >160 ms (pola LBBB) dan aksis ekstrem
  // mendukung VT (Wellens 1978). [VERIFY]
  QRS_FAVOR_VT_RBBB_MS: 140,
  QRS_FAVOR_VT_LBBB_MS: 160,
} as const;

export const TORSADES = {
  // DREW10: VT polimorfik dengan "twisting" puncak QRS mengelilingi garis dasar pada
  // QT memanjang; tatalaksana magnesium sulfat IV (1–2 g), koreksi K+/Mg2+, hentikan
  // obat pemanjang QT; tidak stabil/tanpa nadi → defibrilasi. [VERIFY]
  MAG_SULFATE_G: { min: 1, max: 2 },
  TYPICAL_RATE: { min: 160, max: 250 },
} as const;

// ---------------------------------------------------------------------------
// 12. Elektrolit, obat, metabolik
// ---------------------------------------------------------------------------
export const HYPERKALEMIA = {
  // MATTU00 (klasik; korelasi kadar K+ dengan EKG BURUK, EKG normal tidak
  // menyingkirkan hiperkalemia berat):
  //  ~5,5–6,5 mEq/L : T tinggi, runcing, berbasis sempit (terutama prekordial)
  //  ~6,5–8,0 mEq/L : P mendatar/melebar, PR memanjang, QRS mulai melebar
  //  >8,0 mEq/L     : P hilang, QRS sangat lebar menyatu dengan T → pola sinus (sine wave),
  //                   VF/asistol. [VERIFY]
  STAGES: [
    { stage: 1, kRange: '5,5–6,5', label: 'T tinggi & runcing' },
    { stage: 2, kRange: '6,5–8,0', label: 'P mendatar, PR memanjang, QRS mulai melebar' },
    { stage: 3, kRange: '>8,0', label: 'P hilang, QRS sangat lebar, pola sinus (sine wave)' },
  ] as const,
} as const;

export const HYPOKALEMIA = {
  // DIERCKS04: gelombang U menonjol (>1 mm, dapat > T), T mendatar/terbalik, depresi ST,
  // interval QU tampak memanjang. [VERIFY]
  U_WAVE_MM: 1,
} as const;

export const CALCIUM = {
  // DIERCKS04: hipokalsemia → QTc memanjang akibat segmen ST memanjang (T relatif normal);
  // hiperkalsemia → QTc memendek akibat segmen ST memendek. [VERIFY]
  note: 'Hipokalsemia: ST panjang; hiperkalsemia: ST/QT pendek',
} as const;

export const HYPOTHERMIA = {
  // MATTU02: gelombang Osborn (J) di akhir QRS, bradikardia, PR/QRS/QT memanjang,
  // artefak menggigil; ukuran J kurang lebih sebanding derajat hipotermia. [VERIFY]
  OSBORN_NOTE: 'Gelombang J (Osborn) positif di sadapan inferior & lateral',
} as const;

export const TCA = {
  // BOEHNERT85: QRS ≥100 ms memprediksi kejang, ≥160 ms memprediksi aritmia ventrikel.
  // LIEBELT95: R terminal aVR ≥3 mm; rasio R/S aVR ≥0,7. Tatalaksana natrium bikarbonat
  // 1–2 mEq/kg IV bolus (protokol toksikologi). [VERIFY]
  QRS_SEIZURE_MS: 100,
  QRS_ARRHYTHMIA_MS: 160,
  R_AVR_MM: 3,
  RS_AVR: 0.7,
} as const;

export const DIGOXIN = {
  // MA01: efek digoksin = depresi ST "scooped"/sagging, T mendatar, QT pendek, PR sedikit
  // memanjang; toksisitas = PVC/bigemini, VT bidireksional, takikardia atrium dengan blok,
  // AF dengan respons ventrikel teratur/lambat, AV blok. [VERIFY]
  note: 'Efek ≠ toksisitas; toksisitas didiagnosis klinis + aritmia',
} as const;

// ---------------------------------------------------------------------------
// 13. Waktu tata laksana SKA (terverifikasi dari ESC23 dan PNPK26)
// ---------------------------------------------------------------------------
export const ACS_TIMING = {
  // ESC23, PNPK26 & ACCAHA25 (COR 1): EKG direkam dan diinterpretasi dalam 10 menit sejak
  // kontak medis pertama/kedatangan. [terverifikasi]
  ECG_WITHIN_MIN: 10,
  // ESC23, PNPK26 & PERKI24 (hal. 56): waktu absolut diagnosis IMA-EST → reperfusi IKP
  // (wire crossing) 120 menit; bila diperkirakan >120 menit → fibrinolitik. PERKI24 Tabel
  // Rekomendasi 9: IKPP lebih dianjurkan bila interval KMP → IKP <120 menit (I A). [terverifikasi]
  PCI_MAX_DELAY_MIN: 120,
  // ACCAHA25 §5.2.1 (COR 1): IKP primer bila dapat dilakukan ≤90 menit (FMC → aktivasi
  // alat pertama), atau ≤120 menit pada pasien yang dirujuk antar-RS; §5.3: bila
  // diperkirakan >120 menit dari FMC dan gejala <12 jam → fibrinolitik. Dinyatakan
  // dari FMC (ESC23/PNPK26: dari diagnosis). PERKI24 (hal. 55): di RS sentra IKP, "IKP
  // primer harus terlaksana segera dalam waktu <90 menit". [terverifikasi]
  FMC_TO_DEVICE_MIN: 90,
  FMC_TO_DEVICE_TRANSFER_MIN: 120,
  // ACCAHA25 §5.3 (COR 2a): gejala 12–24 jam → rujuk untuk IKP primer masih wajar.
  LATE_PRESENTER_H: 24,
  // PERKI24 Tabel Rekomendasi 9: >12 jam → IKP primer bila gejala iskemia berlangsung,
  // instabilitas hemodinamik, atau aritmia mengancam nyawa (I C); IKP rutin dipertimbangkan
  // pada 12–48 jam (IIa B); IKP rutin IRA tersumbat >48 jam tanpa gejala tidak dianjurkan
  // (III A). [terverifikasi]
  LATE_ROUTINE_PCI_MAX_H: 48,
  // ACCAHA25 §5.3 (3: Harm): depresi ST saja (kecuali curiga STEMI posterior sejati) →
  // fibrinolitik TIDAK boleh diberikan. [terverifikasi]
  NO_LYSIS_FOR_ISOLATED_STD: true,
  // ESC23: "start fibrinolytic therapy within 10 min of the STEMI diagnosis". [terverifikasi]
  LYSIS_WITHIN_MIN: 10,
  // PERKI24 (hal. 56 & Tabel Rekomendasi 9, I A): fibrinolitik dimulai dalam 30 menit dari
  // kontak medis pertama (KMP); diagnosis IMA-EST ditegakkan ≤10 menit dari KMP. [terverifikasi]
  LYSIS_WITHIN_FMC_MIN: 30,
  // ESC23 & PNPK26: reperfusi diindikasikan bila gejala ≤12 jam. [terverifikasi]
  REPERFUSION_WINDOW_H: 12,
  // ESC23 & PNPK26: setelah fibrinolisis berhasil → angiografi 2–24 jam; gagal (resolusi
  // ST <50% dalam 60–90 menit) → IKP penyelamatan (rescue). ACCAHA25 §5.3.2: resolusi
  // <50% diukur di sadapan dengan elevasi maksimal awal atau jumlah deviasi ST. [terverifikasi]
  POST_LYSIS_ANGIO_H: { min: 2, max: 24 },
  RESCUE_ST_RESOLUTION_PCT: 50,
  RESCUE_ASSESS_MIN: { min: 60, max: 90 },
  // PERKI24 §3.2.2.1: fibrinolisis gagal/re-oklusi → angiografi segera & IKP rescue;
  // pemberian ulang fibrinolitik tidak bermanfaat dan tidak dianjurkan. [terverifikasi]
  NO_REPEAT_LYSIS: true,
} as const;

/**
 * Pola yang menurut PERKI24 Gambar 1.3 (= ESC23) ditangani seperti IMA-EST dengan reperfusi
 * MEKANIK (IKP primer): LBBB/irama pacu atau RBBB dengan kecurigaan klinis tinggi infark,
 * dan iskemia multivessel/left main (pola aVR). De Winter (PERKI24 Gambar 1.4: stenosis
 * berat/oklusi LAD proksimal) juga dirujuk untuk angiografi segera karena berupa depresi ST
 * (ACCAHA25: tanpa fibrinolitik untuk depresi ST saja). [terverifikasi]
 */
export const MECHANICAL_REPERFUSION_PATTERNS = ['lbbb-iskemia', 'irama-pacu-iskemia', 'rbbb-iskemia', 'avr-multivessel', 'de-winter'] as const;

/** Dosis fibrinolitik & ko-terapi IMA-EST — PERKI24 Tabel 3.2. [terverifikasi] */
export const LYSIS_DOSES = {
  STREPTOKINASE: '1,5 juta unit IV selama 30–60 menit (kontraindikasi: riwayat streptokinase/anistreplase)',
  ALTEPLASE: 'bolus 15 mg IV, 0,75 mg/kg selama 30 menit (maks. 50 mg), lalu 0,5 mg/kg selama 60 menit (maks. 35 mg)',
  TENECTEPLASE: 'bolus tunggal sesuai BB: <60 kg 30 mg; 60–<70 kg 35 mg; 70–<80 kg 40 mg; 80–<90 kg 45 mg; ≥90 kg 50 mg (setengah dosis pada usia ≥75 tahun)',
  ASPIRIN: '160–320 mg oral, lanjut 80–100 mg/hari',
  CLOPIDOGREL: 'LD 300 mg oral, lanjut 75 mg/hari (usia >75 tahun: LD 75 mg)',
  ENOXAPARIN: 'usia <75 th: 30 mg IV lalu 15 menit kemudian 1 mg/kg SK tiap 12 jam (dua dosis pertama maks. 100 mg); usia ≥75 th: tanpa bolus, 0,75 mg/kg SK (maks. 75 mg); eGFR <30: 1×/hari',
  UFH: 'bolus 60 U/kg IV (maks. 4000 U), infus 12 U/kg/jam (maks. 1000 U/jam) 24–48 jam, target aPTT 50–70 detik',
} as const;

/** Stratifikasi risiko SKA-NEST — PERKI24 §2.1. [terverifikasi] */
export const NSTE_RISK = {
  // Tabel 2.2: kematian di RS — skor GRACE ≤108 rendah (<1%), 109–140 menengah (1–3%),
  // >140 tinggi (>3%).
  GRACE_LOW_MAX: 108,
  GRACE_HIGH_ABOVE: 140,
  // §2.1.2: invasif segera (sesegera mungkin) bila risiko sangat tinggi (syok/instabilitas
  // hemodinamik, nyeri refrakter, gagal jantung akut, aritmia/henti jantung, komplikasi
  // mekanik, perubahan ST/T dinamis berulang); invasif dini <24 jam bila risiko tinggi
  // (Gambar 2.1, IIa); selektif untuk risiko tidak tinggi.
  EARLY_INVASIVE_H: 24,
  // §1.5.2.1: EKG non-diagnostik + angina berlangsung → ulang 10–20 menit (rekam V7–V9);
  // pemantauan 12–24 jam, EKG diulang tiap angina berulang atau minimal 1×/24 jam.
  REPEAT_ECG_MIN: { min: 10, max: 20 },
} as const;

// ---------------------------------------------------------------------------
// 14. Penilaian simulator (toleransi pengukuran) — BUKAN rekomendasi klinis
// ---------------------------------------------------------------------------
export const SCORING = {
  // Toleransi dibanding ground truth. Mempertimbangkan presisi kaliper manual
  // (±1 kotak kecil = 40 ms pada 25 mm/s) dan variasi antar-algoritma. [asumsi-sim]
  HR_TOL_PCT: 10,
  HR_TOL_ABS: 8,
  PR_TOL_MS: 30,
  QRS_TOL_MS: 25,
  QT_TOL_MS: 40,
  QTC_TOL_MS: 40,
  AXIS_TOL_DEG: 30,
  // Batas lulus sesi & tingkat — sama dengan simulator neonatus di repo ini (lulus 75,
  // skor dibatasi 59 bila ada kesalahan kritis, mis. melewatkan oklusi koroner/VF). [asumsi-sim]
  PASS_SCORE: 75,
  CRITICAL_SCORE_CAP: 59,
  LEVEL_PASS_SCORE: 75,
  LEVEL_MIN_CASES: 10,
  // Diagnosis cepat: batas waktu per kasus (detik). [asumsi-sim]
  QUICK_TIME_LIMIT_S: { dasar: 60, menengah: 45, lanjut: 40 },
  // Monitor irama: waktu respons yang dianggap tepat (detik) & minimal kejadian. [asumsi-sim]
  MONITOR_RESPONSE_S: 20,
} as const;

// ---------------------------------------------------------------------------
// 15. Registri untuk docs/CLINICAL_REVIEW.md (dibuat otomatis)
// ---------------------------------------------------------------------------
export interface RegistryRow {
  key: string;
  parameter: string;
  value: string;
  source: string;
  status: ReviewStatus;
}

export const CRITERIA_REGISTRY: RegistryRow[] = [
  { key: 'PAPER.SPEED/GAIN', parameter: 'Kertas standar', value: '25 mm/s, 10 mm/mV; opsi 50 mm/s, 5/20 mm/mV', source: 'KLIGFIELD07', status: 'VERIFY' },
  { key: 'RATE.BRADY/TACHY', parameter: 'Bradikardia/takikardia sinus', value: '<60 / >100 per menit', source: 'Konvensi; AHA 2007 (Mason) menyebut opsi 50/menit', status: 'VERIFY' },
  { key: 'RATE.SVT_TYPICAL', parameter: 'Laju khas SVT', value: '150–250/menit', source: 'ESC19SVT', status: 'VERIFY' },
  { key: 'RATE.FLUTTER_ATRIAL', parameter: 'Laju atrium flutter', value: '240–350/menit', source: 'ESC19SVT', status: 'VERIFY' },
  { key: 'RATE.AIVR', parameter: 'AIVR', value: '<120/menit, akibat reperfusi, biasanya jinak (simulator 50–110)', source: 'PERKI24 §3.6.2.2', status: 'terverifikasi' },
  { key: 'RATE.JUNCTIONAL_ESCAPE', parameter: 'Irama lolos junctional', value: '40–60/menit', source: 'Literatur elektrokardiografi', status: 'VERIFY' },
  { key: 'INTERVALS.PR', parameter: 'PR normal', value: '120–200 ms; >200 = AV blok derajat 1; <120 + delta = pre-eksitasi', source: 'KUSUMOTO18 (batas 200 ms); SURAWICZ09 (PR <120 ms pada WPW, terverifikasi)', status: 'VERIFY' },
  { key: 'INTERVALS.QRS', parameter: 'QRS', value: 'normal ≤110 ms; >110 IVCD; ≥120 ms BBB komplet; 110–120 inkomplet', source: 'SURAWICZ09', status: 'terverifikasi' },
  { key: 'QT.PROLONGED', parameter: 'QTc memanjang', value: '≥450 ms (pria), ≥460 ms (wanita); ≤390 ms pendek; jangan koreksi QT bila RR sangat bervariasi (FA)', source: 'RAUTAHARJU09', status: 'terverifikasi' },
  { key: 'QT.NO_CORRECTION_IRREGULAR', parameter: 'QTc pada FA/MAT', value: 'Tidak dinilai di simulator (koreksi tidak valid bila RR sangat bervariasi)', source: 'RAUTAHARJU09', status: 'terverifikasi' },
  { key: 'QT.HIGH_RISK_MS', parameter: 'QTc risiko tinggi TdP', value: '>500 ms', source: 'DREW10', status: 'VERIFY' },
  { key: 'qtcBazett/qtcFridericia', parameter: 'Rumus QTc', value: 'Bazett QT/√RR; Fridericia QT/∛RR (RR dalam detik)', source: 'BAZETT20, FRIDERICIA20', status: 'terverifikasi' },
  { key: 'AXIS.NORMAL', parameter: 'Aksis', value: 'Normal −30° s.d. +90°; LAD sedang −30…−45°, berat −45…−90°; RAD sedang 90…120°, berat 120…180°', source: 'SURAWICZ09', status: 'terverifikasi' },
  { key: 'AXIS.EXTREME', parameter: 'Aksis ekstrem ("northwest")', value: '−90° s.d. ±180° (konvensi pengajaran; tidak didefinisikan untuk dewasa di SURAWICZ09)', source: 'Konvensi', status: 'asumsi-sim' },
  { key: 'ST_ELEVATION.V2V3', parameter: 'Elevasi ST V2–V3', value: 'Pria ≥40 th ≥2 mm; pria <40 th ≥2,5 mm; wanita ≥1,5 mm', source: 'PERKI24 Tabel 1.2, ESC23, PNPK26, UDMI4, WAGNER09, ACCAHA25', status: 'terverifikasi' },
  { key: 'ST_ELEVATION.OTHER_LEADS_MM', parameter: 'Elevasi ST sadapan lain', value: '≥1 mm pada ≥2 sadapan berdekatan (tanpa LVH/LBBB)', source: 'PERKI24 Tabel 1.2, ESC23, PNPK26, UDMI4, WAGNER09, ACCAHA25', status: 'terverifikasi' },
  { key: 'ST_ELEVATION.POSTERIOR', parameter: 'Elevasi ST V7–V9', value: '≥0,5 mm; ≥1 mm pada pria <40 th', source: 'UDMI4 (teks); WAGNER09 0,5 mm semua umur', status: 'terverifikasi' },
  { key: 'ST_ELEVATION.RIGHT_V4R', parameter: 'Elevasi ST V3R/V4R', value: '≥0,5 mm; ≥1 mm pada pria <30 th (kasus sintetis dibuat ≥1 mm agar juga memenuhi PERKI)', source: 'UDMI4, WAGNER09. PERKI24 Gambar 1.3: V3R/V4R ikut ambang 1 mm; PNPK26 "≥1 mV" (salah ketik)', status: 'terverifikasi' },
  { key: 'ST_DEPRESSION.ISCHEMIC_MM', parameter: 'Depresi ST iskemik', value: 'Horizontal/downsloping ≥0,5 mm pada 2 sadapan berdekatan; T inversi >1 mm (R prominen/R:S >1); STD terisolasi ≥0,5 mm V1–V3 → rekam V7–V9', source: 'PERKI24 Tabel 1.2, PNPK26, UDMI4, ACCAHA25 Tabel 3', status: 'terverifikasi' },
  { key: 'ST_DEPRESSION.PNPK', parameter: 'Depresi ST diagnostik', value: '≥0,5 mm di V1–V3 (AHA: V2–V3), ≥1 mm sadapan lain; inversi T simetris ≥2 mm spesifik; T inversi >1 mm di ≥5 sadapan = prognosis', source: 'PERKI24 hal. 11 & Gambar 1.4, PNPK26, WAGNER09', status: 'terverifikasi' },
  { key: 'AVR_PATTERN', parameter: 'Elevasi aVR + depresi ST difus', value: 'Depresi ST ≥1 mm pada ≥6 sadapan (WAGNER09: ≥8) + elevasi ST aVR dan/atau V1 → LM/multivessel; reperfusi mekanik (IKPP) segera', source: 'PERKI24 Gambar 1.3, ESC23, UDMI4, WAGNER09', status: 'terverifikasi' },
  { key: 'AVR_PATTERN.STE_AVR_MM', parameter: 'Besar elevasi aVR yang dipakai', value: '≥1 mm (tidak diberi angka oleh ESC23/WAGNER09)', source: 'Asumsi simulator', status: 'asumsi-sim' },
  { key: 'POSTERIOR_MI', parameter: 'Infark posterior', value: 'Depresi ST V1–V3 dan/atau elevasi ST V7–V9', source: 'ESC23 (teks)', status: 'terverifikasi' },
  { key: 'HYPERACUTE_T', parameter: 'T hiperakut', value: 'T menonjol & simetris di ≥2 sadapan berdekatan (tanpa ambang angka)', source: 'UDMI4 (teks)', status: 'terverifikasi' },
  { key: 'HYPERACUTE_T.SIM_T_TO_QRS_RATIO', parameter: 'Ambang operasional T hiperakut (sintetis)', value: 'T ≥75% amplitudo QRS', source: 'Asumsi simulator', status: 'asumsi-sim' },
  { key: 'HYPERACUTE_T.V2_UPPER', parameter: 'Batas atas normal T V2', value: 'Pria 1,0–1,4 mV (≤1,6 mV usia 18–29 th); wanita 0,7–1,0 mV', source: 'RAUTAHARJU09', status: 'terverifikasi' },
  { key: 'T_WAVE', parameter: 'Deskriptor gelombang T', value: 'Inversi −0,1…−0,5 mV; dalam −0,5…−1,0 mV; raksasa < −1,0 mV; rendah <10% R; datar ±0,1 mV', source: 'RAUTAHARJU09', status: 'terverifikasi' },
  { key: 'Q_WAVE', parameter: 'Gelombang Q patologis', value: 'V2–V3 >20 ms/QS; lain ≥30 ms & ≥1 mm di 2 sadapan sekelompok; R V1–V2 >40 ms + R/S>1 (posterior)', source: 'UDMI4 Tabel 3 (gambar)', status: 'VERIFY' },
  { key: 'CONTIGUOUS_GROUPS', parameter: 'Lokasi infark per sadapan', value: 'V1–V4 anterior; I, aVL, V5–V6 lateral; II, III, aVF inferior; V7–V9 posterior; V3R–V4R ventrikel kanan', source: 'PERKI24 Tabel 1.3, PNPK26 Tabel 4', status: 'terverifikasi' },
  { key: 'SGARBOSSA', parameter: 'Kriteria Sgarbossa', value: 'STE konkordan ≥1 mm (5); STD konkordan V1–V3 ≥1 mm (3); STE diskordan ≥5 mm (2); skor ≥3', source: 'Ambang: WAGNER09 (terverifikasi); bobot poin: SGARBOSSA96', status: 'VERIFY' },
  { key: 'SGARBOSSA.SMITH_RATIO', parameter: 'Modifikasi Smith', value: 'Rasio ST/S ≤ −0,25 menggantikan kriteria diskordan', source: 'SMITH12', status: 'VERIFY' },
  { key: 'SGARBOSSA.UDMI', parameter: 'LBBB: STE konkordan', value: '≥1 mm di sadapan mana pun → iskemia akut', source: 'UDMI4 (teks)', status: 'terverifikasi' },
  { key: 'DE_WINTER', parameter: 'Pola de Winter', value: 'Depresi ST upsloping 1–3 mm di titik J V1–V6 → T tinggi, positif, simetris; stenosis berat/oklusi LAD proksimal', source: 'PERKI24 Gambar 1.4 (= ESC23)', status: 'terverifikasi' },
  { key: 'DE_WINTER.AVR_STE_MM', parameter: 'de Winter: elevasi aVR', value: '1–2 mm (sebagian besar kasus)', source: 'DEWINTER08 (tidak disebut PERKI24)', status: 'VERIFY' },
  { key: 'WELLENS', parameter: 'Pola Wellens', value: 'Titik J <1 mm + A: T bifasik V2–V3; B: T simetris sangat terbalik V2–V3 (kadang V1, V4–V6), AHA: >5 mm V2–V4 + QT memanjang', source: 'PERKI24 Gambar 1.4, WAGNER09', status: 'terverifikasi' },
  { key: 'BRUGADA.TYPE1_STE_MM', parameter: 'Brugada tipe 1', value: 'STE coved ≥2 mm di ≥1 sadapan V1–V2 + T negatif', source: 'PRIORI13, ESC22VA', status: 'VERIFY' },
  { key: 'EARLY_REPOL.JP_MV', parameter: 'Repolarisasi dini', value: 'Jp ≥0,1 mV di ≥2 sadapan inferior/lateral + notch/slur', source: 'MACFARLANE15', status: 'VERIFY' },
  { key: 'PERICARDITIS.ST_T_RATIO_V6', parameter: 'Perikarditis vs repolarisasi dini', value: 'STE cekung luas + depresi PR; rasio ST/T V6 >0,25', source: 'ADLER15; Ginzton & Laks 1982', status: 'VERIFY' },
  { key: 'LVH.SOKOLOW_MM', parameter: 'LVH Sokolow–Lyon', value: 'SV1 + RV5/V6 >35 mm', source: 'HANCOCK09 Tabel 1 (Sokolow 1949)', status: 'terverifikasi' },
  { key: 'LVH.CORNELL', parameter: 'LVH Cornell voltage', value: 'RaVL + SV3 >28 mm (pria), >20 mm (wanita)', source: 'HANCOCK09 Tabel 1 (Casale 1985)', status: 'terverifikasi' },
  { key: 'LVH.RAVL_MM', parameter: 'LVH RaVL', value: '>11 mm', source: 'HANCOCK09 Tabel 1', status: 'terverifikasi' },
  { key: 'RVH', parameter: 'RVH', value: 'R V1 >6 mm; R/S V1 >1; S V5 >10 mm; S V6 >3 mm; RV1 + SV5/6 >10,5 mm; RPT V1 >35 ms; aksis kanan', source: 'HANCOCK09 Tabel 2', status: 'terverifikasi' },
  { key: 'ATRIAL', parameter: 'Abnormalitas atrium', value: 'Kanan: P II >2,5 mm / P awal V1–V2 ≥1,5 mm; kiri: P ≥120 ms, notch ≥40 ms, PTF V1 (≥1 mm × ≥40 ms = konvensi)', source: 'HANCOCK09 (angka PTF tidak tercantum)', status: 'terverifikasi' },
  { key: 'LOW_VOLTAGE', parameter: 'Voltase rendah', value: 'QRS <5 mm semua ekstremitas dan/atau <10 mm semua prekordial', source: 'HANCOCK09 / Mason 2007', status: 'VERIFY' },
  { key: 'CONDUCTION.RBBB', parameter: 'RBBB komplet', value: 'QRS ≥120; rsR′ V1/V2; S lebar >40 ms di I & V6; RPT V1 >50 ms', source: 'SURAWICZ09', status: 'terverifikasi' },
  { key: 'CONDUCTION.LBBB', parameter: 'LBBB komplet', value: 'QRS ≥120; R lebar berlekuk I, aVL, V5–V6; tanpa q I/V5/V6; RPT V5–V6 >60 ms', source: 'SURAWICZ09', status: 'terverifikasi' },
  { key: 'CONDUCTION.LBBB_NEW', parameter: 'LBBB/pacu/RBBB & IMA', value: 'Kecurigaan klinis tinggi → tangani seperti IMA-EST dengan IKP primer; LBBB baru saja (asimtomatik) bukan ekuivalen STEMI', source: 'PERKI24 Gambar 1.3 (= ESC23), ACCAHA25 Tabel 3, UDMI4', status: 'terverifikasi' },
  { key: 'CONDUCTION.LAFB', parameter: 'LAFB', value: 'Aksis −45° s.d. −90°; qR aVL; RPT aVL ≥45 ms; QRS <120', source: 'SURAWICZ09', status: 'terverifikasi' },
  { key: 'CONDUCTION.LPFB', parameter: 'LPFB', value: 'Aksis +90° s.d. +180°; rS I & aVL; qR III & aVF; QRS <120; istilah "bifasikular" tidak dianjurkan', source: 'SURAWICZ09', status: 'terverifikasi' },
  { key: 'AV_BLOCK', parameter: 'AV blok', value: 'D1 PR >200; Mobitz I PR progresif; Mobitz II PR konstan + drop; 2:1 tak terklasifikasi; D3 disosiasi AV', source: 'KUSUMOTO18', status: 'VERIFY' },
  { key: 'WCT.BRUGADA', parameter: 'Algoritma Brugada (WCT)', value: 'Tanpa RS prekordial; RS >100 ms; disosiasi AV; morfologi', source: 'BRUGADA91', status: 'VERIFY' },
  { key: 'WCT.VERECKEI', parameter: 'Algoritma aVR Vereckei', value: 'R inisial; r/q inisial >40 ms; notch sisi turun; vi/vt ≤1', source: 'VERECKEI08', status: 'VERIFY' },
  { key: 'WCT.DEFAULT', parameter: 'WCT tak jelas', value: 'Perlakukan sebagai VT', source: 'ESC22VA, ESC19SVT', status: 'VERIFY' },
  { key: 'TORSADES', parameter: 'Torsades de pointes', value: 'VT polimorfik twisting + QT panjang; MgSO4 1–2 g IV', source: 'DREW10, AHA25ALS', status: 'VERIFY' },
  { key: 'HYPERKALEMIA.STAGES', parameter: 'Tahapan hiperkalemia', value: '5,5–6,5 T runcing; 6,5–8 P datar/PR↑/QRS↑; >8 sine wave (korelasi buruk)', source: 'MATTU00', status: 'VERIFY' },
  { key: 'HYPOKALEMIA.U_WAVE_MM', parameter: 'Hipokalemia', value: 'U >1 mm, T datar, depresi ST', source: 'DIERCKS04', status: 'VERIFY' },
  { key: 'CALCIUM', parameter: 'Hipo/hiperkalsemia', value: 'Hipo: ST & QT panjang; hiper: ST & QT pendek', source: 'DIERCKS04', status: 'VERIFY' },
  { key: 'HYPOTHERMIA', parameter: 'Hipotermia', value: 'Gelombang Osborn, bradikardia, interval memanjang, artefak menggigil', source: 'MATTU02', status: 'VERIFY' },
  { key: 'TCA', parameter: 'Overdosis TCA', value: 'QRS ≥100 ms (kejang), ≥160 ms (aritmia); R aVR ≥3 mm; R/S aVR ≥0,7; Na-bikarbonat 1–2 mEq/kg', source: 'BOEHNERT85, LIEBELT95', status: 'VERIFY' },
  { key: 'DIGOXIN', parameter: 'Digoksin', value: 'Efek: ST scooped, QT pendek; toksisitas: VT bidireksional, AT dengan blok, AV blok, PVC', source: 'MA01', status: 'VERIFY' },
  { key: 'ACS_TIMING.ECG_WITHIN_MIN', parameter: 'EKG pertama', value: '≤10 menit sejak kontak medis pertama/kedatangan; ulang tiap angina berulang', source: 'PERKI24 §1.5.2.1, ESC23, PNPK26, ACCAHA25 (COR 1)', status: 'terverifikasi' },
  { key: 'ACS_TIMING.PCI_MAX_DELAY_MIN', parameter: 'Diagnosis → IKP primer', value: '≤120 menit; bila lebih → fibrinolitik', source: 'PERKI24 hal. 56 & Tabel Rek. 9, ESC23, PNPK26', status: 'terverifikasi' },
  { key: 'ACS_TIMING.FMC_TO_DEVICE_MIN', parameter: 'FMC → alat (IKP primer)', value: '<90 menit di sentra IKP; ≤120 menit bila dirujuk; >120 menit & gejala <12 jam → fibrinolitik; 12–24 jam → rujuk IKP wajar (2a)', source: 'PERKI24 hal. 55, ACCAHA25 §5.2.1, §5.3', status: 'terverifikasi' },
  { key: 'ACS_TIMING.NO_LYSIS_FOR_ISOLATED_STD', parameter: 'Depresi ST saja', value: 'Jangan fibrinolitik (kecuali curiga STEMI posterior sejati)', source: 'ACCAHA25 §5.3 (3: Harm)', status: 'terverifikasi' },
  { key: 'ACS_TIMING.LYSIS_WITHIN_MIN', parameter: 'Fibrinolitik', value: '≤30 menit sejak kontak medis pertama (PERKI); ≤10 menit sejak diagnosis (ESC)', source: 'PERKI24 Tabel Rek. 9 (I A), ESC23', status: 'terverifikasi' },
  { key: 'ACS_TIMING.REPERFUSION_WINDOW_H', parameter: 'Jendela reperfusi', value: 'Gejala ≤12 jam; >12 jam → IKP bila iskemia berlangsung/instabilitas/aritmia; 12–48 jam IKP rutin dipertimbangkan (IIa); >48 jam tanpa gejala tidak (III)', source: 'PERKI24 Tabel Rek. 9, ESC23, PNPK26', status: 'terverifikasi' },
  { key: 'ACS_TIMING.POST_LYSIS', parameter: 'Pasca-fibrinolisis', value: 'Rujuk segera ke sentra IKP; angiografi 2–24 jam; rescue PCI bila resolusi ST <50% dalam 60–90 menit; jangan fibrinolitik ulang', source: 'PERKI24 Tabel Rek. 10 & §3.2.2.1, ESC23, ACCAHA25 §5.3.2', status: 'terverifikasi' },
  { key: 'MECHANICAL_REPERFUSION_PATTERNS', parameter: 'Reperfusi mekanik (IKPP)', value: 'LBBB/irama pacu/RBBB + kecurigaan klinis tinggi, pola aVR/multivessel; de Winter → angiografi segera (bukan fibrinolitik)', source: 'PERKI24 Gambar 1.3–1.4 (= ESC23), ACCAHA25 §5.3', status: 'terverifikasi' },
  { key: 'LYSIS_DOSES', parameter: 'Dosis fibrinolitik & ko-terapi', value: 'Streptokinase 1,5 juta U/30–60 mnt; tenekteplase 30–50 mg sesuai BB (½ dosis ≥75 th); alteplase 15 mg + 0,75 mg/kg + 0,5 mg/kg; aspirin 160–320 mg; klopidogrel 300 mg (75 mg bila >75 th); enoksaparin/UFH', source: 'PERKI24 Tabel 3.2', status: 'terverifikasi' },
  { key: 'NSTE_RISK', parameter: 'Stratifikasi SKA-NEST', value: 'GRACE RS ≤108 rendah, 109–140 menengah, >140 tinggi; risiko sangat tinggi → invasif segera; tinggi → invasif dini <24 jam; EKG ulang 10–20 menit bila non-diagnostik', source: 'PERKI24 §2.1, Tabel 2.2, Gambar 2.1, §1.5.2.1', status: 'terverifikasi' },
  { key: 'SCORING', parameter: 'Toleransi penilaian', value: 'HR ±10% (min ±8); PR ±30; QRS ±25; QT/QTc ±40 ms; aksis ±30°; lulus 75; kesalahan kritis → skor maks. 59', source: 'Asumsi simulator', status: 'asumsi-sim' },
  { key: 'SYNTH.DOWER', parameter: 'Model sintetis: proyeksi VCG → 12 sadapan', value: 'Matriks Dower (1980); sadapan V3R–V5R/V7–V9 = ekstrapolasi model', source: 'Dower GE, et al. 1980; Sameni R, et al. 2007 (model dinamis 3D)', status: 'asumsi-sim' },
];
