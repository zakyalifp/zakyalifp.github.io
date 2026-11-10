/**
 * Taksonomi diagnosis: label, kategori, tingkat, kompetensi, temuan kunci, penjelasan,
 * dan tata laksana awal. Ambang angka diambil dari src/clinical/ecg-criteria.ts.
 */
import { ACS_TIMING, AVR_PATTERN, BRUGADA, DE_WINTER, HYPERKALEMIA, LVH, QT, SGARBOSSA, ST_ELEVATION, TCA, TORSADES } from '../clinical/ecg-criteria';

export type Category = 'dasar' | 'aritmia' | 'konduksi' | 'iskemia' | 'peniru' | 'elektrolit' | 'lain';
export type Level = 'dasar' | 'menengah' | 'lanjut';
export type Competency = 'irama' | 'konduksi' | 'iskemia' | 'elektrolit' | 'pengukuran' | 'tatalaksana';

export const CATEGORY_LABEL: Record<Category, string> = {
  dasar: 'Dasar & varian normal',
  aritmia: 'Aritmia',
  konduksi: 'Gangguan konduksi',
  iskemia: 'Iskemia & infark',
  peniru: 'Peniru STEMI',
  elektrolit: 'Elektrolit, obat & metabolik',
  lain: 'Hipertrofi & lain-lain',
};
export const LEVEL_LABEL: Record<Level, string> = {
  dasar: 'Dasar (setara UKMPPD)',
  menengah: 'Menengah (IGD)',
  lanjut: 'Lanjut (residen)',
};
export const COMPETENCY_LABEL: Record<Competency, string> = {
  irama: 'Irama',
  konduksi: 'Konduksi & morfologi',
  iskemia: 'Iskemia',
  elektrolit: 'Elektrolit & obat',
  pengukuran: 'Pengukuran & teknik',
  tatalaksana: 'Tata laksana',
};

export type RhythmKey =
  | 'sinus'
  | 'sinus-brady'
  | 'sinus-tachy'
  | 'sinus-arrhythmia'
  | 'af'
  | 'flutter'
  | 'svt'
  | 'at'
  | 'mat'
  | 'junctional'
  | 'aivr'
  | 'vt'
  | 'torsades'
  | 'vf'
  | 'asistol'
  | 'pacu'
  | 'disosiasi-av';

export const RHYTHM_LABEL: Record<RhythmKey, string> = {
  sinus: 'Sinus (60–100/menit)',
  'sinus-brady': 'Sinus bradikardia',
  'sinus-tachy': 'Sinus takikardia',
  'sinus-arrhythmia': 'Sinus aritmia',
  af: 'Fibrilasi atrium',
  flutter: 'Flutter atrium',
  svt: 'Takikardia supraventrikular (re-entri)',
  at: 'Takikardia atrium / atrium ektopik',
  mat: 'Takikardia atrium multifokal',
  junctional: 'Irama junctional',
  aivr: 'Irama idioventrikular terakselerasi',
  vt: 'Takikardia ventrikel',
  torsades: 'Torsades de pointes',
  vf: 'Fibrilasi ventrikel',
  asistol: 'Asistol',
  pacu: 'Irama pacu',
  'disosiasi-av': 'Disosiasi AV (AV blok total)',
};

export type PWave = 'normal' | 'tidak-ada' | 'pulmonal' | 'mitral' | 'retrograd' | 'flutter-fibrilasi' | 'tak-dikonduksikan' | 'bervariasi';
export const PWAVE_LABEL: Record<PWave, string> = {
  normal: 'Normal, tiap P diikuti QRS',
  'tidak-ada': 'Tidak tampak',
  pulmonal: 'Tinggi/runcing (P pulmonal)',
  mitral: 'Lebar/berlekuk (P mitral)',
  retrograd: 'Retrograd/terbalik di inferior',
  'flutter-fibrilasi': 'Gelombang flutter/fibrilasi',
  'tak-dikonduksikan': 'Sebagian P tidak diikuti QRS',
  bervariasi: 'Morfologi bervariasi (≥3 bentuk)',
};
export type StFinding = 'normal' | 'elevasi' | 'depresi' | 'elevasi-difus' | 'sekunder' | 'tidak-dinilai';
export const ST_LABEL: Record<StFinding, string> = {
  normal: 'Normal/isoelektrik',
  elevasi: 'Elevasi regional (± resiprokal)',
  depresi: 'Depresi',
  'elevasi-difus': 'Elevasi difus tanpa resiprokal',
  sekunder: 'Perubahan sekunder (BBB/LVH/pacu)',
  'tidak-dinilai': 'Tidak dapat dinilai',
};
export type TFinding = 'normal' | 'inversi' | 'tinggi-runcing' | 'hiperakut' | 'mendatar-u' | 'bifasik' | 'sekunder' | 'tidak-dinilai';
export const T_LABEL: Record<TFinding, string> = {
  normal: 'Normal',
  inversi: 'Inversi',
  'tinggi-runcing': 'Tinggi, runcing, basis sempit',
  hiperakut: 'Hiperakut (besar, lebar, simetris)',
  'mendatar-u': 'Mendatar ± gelombang U',
  bifasik: 'Bifasik',
  sekunder: 'Diskordan sekunder',
  'tidak-dinilai': 'Tidak dapat dinilai',
};

export type MgmtKey =
  | 'observasi'
  | 'reperfusi'
  | 'nste-acs'
  | 'wellens'
  | 'kardioversi'
  | 'defibrilasi'
  | 'rjp-epinefrin'
  | 'vagal-adenosin'
  | 'rate-control'
  | 'atropin-pacing'
  | 'magnesium'
  | 'kalsium-hiperk'
  | 'koreksi-elektrolit'
  | 'bikarbonat'
  | 'digoksin'
  | 'hangatkan'
  | 'ulang-ekg'
  | 'rujuk-elektif'
  | 'perikarditis'
  | 'emboli-paru'
  | 'brugada'
  | 'pacemaker'
  | 'tamponade';

export const MGMT_LABEL: Record<MgmtKey, string> = {
  observasi: 'Tidak perlu tindakan khusus; evaluasi klinis rutin',
  reperfusi: `Aktivasi alur STEMI: reperfusi segera (IKP primer ≤${ACS_TIMING.PCI_MAX_DELAY_MIN} menit sejak diagnosis; bila tidak mungkin, fibrinolitik ≤${ACS_TIMING.LYSIS_WITHIN_MIN} menit)`,
  'nste-acs': 'SKA tanpa elevasi ST: antitrombotik, troponin serial, stratifikasi risiko → invasif dini (<24 jam) atau segera bila risiko sangat tinggi',
  wellens: 'Rawat sebagai SKA risiko tinggi: angiografi koroner dini; hindari uji latih beban',
  kardioversi: 'Takikardia dengan nadi: bila tidak stabil → kardioversi tersinkron; bila stabil → antiaritmia & konsul',
  defibrilasi: 'Henti jantung irama shockable: RJP berkualitas + defibrilasi segera',
  'rjp-epinefrin': 'Henti jantung non-shockable: RJP + epinefrin 1 mg tiap 3–5 menit, cari penyebab (H & T)',
  'vagal-adenosin': 'SVT stabil: manuver vagal → adenosin 6 mg IV cepat → 12 mg',
  'rate-control': 'AF/flutter stabil: kendali laju, nilai risiko stroke untuk antikoagulasi, cari pencetus',
  'atropin-pacing': 'Bradikardia simtomatik: atropin 1 mg IV (maks. 3 mg); bila gagal/AV blok tinggi → pacing transkutan & konsul',
  magnesium: `Torsades: MgSO₄ ${TORSADES.MAG_SULFATE_G.min}–${TORSADES.MAG_SULFATE_G.max} g IV, koreksi K⁺, hentikan obat pemanjang QT; tanpa nadi → defibrilasi`,
  'kalsium-hiperk': 'Hiperkalemia: kalsium glukonas IV (stabilisasi membran), insulin + dekstrosa, agonis β2 inhalasi, monitor; dialisis bila refrakter',
  'koreksi-elektrolit': 'Koreksi elektrolit (K⁺/Mg²⁺/Ca²⁺) dan pemantauan EKG',
  bikarbonat: 'Overdosis TCA: natrium bikarbonat IV bolus, amankan jalan napas, monitor',
  digoksin: 'Toksisitas digoksin: hentikan digoksin, periksa K⁺ & kadar digoksin, pertimbangkan antibodi spesifik (Fab)',
  hangatkan: 'Hipotermia: penghangatan aktif, penanganan hati-hati (risiko VF), monitor',
  'ulang-ekg': 'Perbaiki pemasangan elektroda/kurangi artefak lalu rekam ulang EKG',
  'rujuk-elektif': 'Tidak gawat: evaluasi penyebab dan rujuk/konsul kardiologi terjadwal',
  perikarditis: 'Perikarditis: OAINS + kolkisin, ekokardiografi untuk efusi, cari penyebab',
  'emboli-paru': 'Curiga emboli paru: stratifikasi (Wells/D-dimer/CTPA), antikoagulasi bila tidak ada kontraindikasi',
  brugada: 'Pola Brugada: rujuk elektrofisiologi, hindari obat pencetus, atasi demam agresif',
  pacemaker: 'Evaluasi/interogasi pacu jantung; bila bradikardia simtomatik → pacing transkutan sementara',
  tamponade: 'Curiga efusi besar/tamponade: ekokardiografi segera, perikardiosentesis bila tamponade',
};

export interface DxInfo {
  key: string;
  label: string;
  category: Category;
  level: Level;
  competency: Competency;
  /** Temuan EKG kunci (untuk anotasi & debriefing). */
  findings: string[];
  explanation: string;
  mgmt: MgmtKey;
  /** Oklusi koroner akut (OMI) — untuk keputusan kritis. */
  occlusion?: boolean;
  /** Butuh reperfusi/angiografi segera. */
  reperfusion?: boolean;
  /** Kondisi yang mengancam nyawa/kritis. */
  critical?: boolean;
  /** Jawaban default formulir sistematis. */
  rhythm: RhythmKey;
  p: PWave;
  st: StFinding;
  t: TFinding;
  /** Diagnosis yang sering tertukar (untuk pengecoh). */
  confusers?: string[];
}

const d = (x: DxInfo) => x;

export const DIAGNOSES: Record<string, DxInfo> = Object.fromEntries(
  [
    // ------------------------------------------------------------------ Dasar
    d({ key: 'sinus-normal', label: 'EKG normal (irama sinus)', category: 'dasar', level: 'dasar', competency: 'irama', findings: ['P positif di I, II, aVF; tiap P diikuti QRS', 'Laju 60–100/menit, PR 120–200 ms, QRS <110 ms', 'Aksis −30° s.d. +90°, ST isoelektrik, T searah QRS'], explanation: 'Irama sinus normal dengan interval dan morfologi dalam batas normal. Dipakai sebagai pembanding untuk semua kasus lain.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['sinus-arrhythmia', 'early-repol'] }),
    d({ key: 'sinus-arrhythmia', label: 'Sinus aritmia (varian normal)', category: 'dasar', level: 'dasar', competency: 'irama', findings: ['P sinus normal dengan PR konstan', 'Interval RR bervariasi mengikuti napas'], explanation: 'Variasi laju sinus yang mengikuti respirasi; varian normal yang sering pada usia muda. Morfologi P tetap sama sehingga bukan aritmia atrium.', mgmt: 'observasi', rhythm: 'sinus-arrhythmia', p: 'normal', st: 'normal', t: 'normal', confusers: ['af', 'pac', 'mat'] }),
    d({ key: 'early-repol', label: 'Repolarisasi dini jinak', category: 'peniru', level: 'menengah', competency: 'iskemia', findings: ['Elevasi titik J dengan notch/slur di akhir QRS', 'ST cekung, T tinggi searah QRS', 'Tanpa resiprokal, stabil pada EKG serial'], explanation: 'Pola repolarisasi dini (J-point elevation ≥0,1 mV dengan notch/slur di sadapan inferior/lateral). Umumnya jinak pada usia muda; bedakan dari STEMI dengan klinis, tidak adanya resiprokal, dan EKG serial.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'elevasi-difus', t: 'normal', confusers: ['pericarditis', 'stemi-anterior'] }),
    d({ key: 'misplacement-lara', label: 'Salah pasang elektroda lengan (LA↔RA)', category: 'dasar', level: 'dasar', competency: 'pengukuran', findings: ['P, QRS, dan T terbalik di sadapan I', 'aVR tampak "normal" (positif), aVL bertukar dengan aVR', 'Sadapan prekordial normal (membedakan dari dekstrokardia)'], explanation: 'Elektroda lengan kiri dan kanan tertukar: sadapan I terbalik, II↔III dan aVL↔aVR bertukar, aVF tetap. Progresi R prekordial normal, berbeda dengan dekstrokardia.', mgmt: 'ulang-ekg', rhythm: 'sinus', p: 'retrograd', st: 'normal', t: 'normal', confusers: ['dextrocardia'] }),
    d({ key: 'misplacement-rlra', label: 'Salah pasang elektroda RA↔RL (ground)', category: 'dasar', level: 'menengah', competency: 'pengukuran', findings: ['Sadapan II hampir datar (garis lurus)', 'Morfologi ekstremitas lain berubah tak lazim'], explanation: 'Elektroda lengan kanan terpasang di kaki: potensial "RA" hampir sama dengan kaki kiri sehingga sadapan II mendekati nol (flat line). Tanda khas salah pasang elektroda ground.', mgmt: 'ulang-ekg', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['misplacement-lara', 'low-voltage'] }),
    d({ key: 'misplacement-prec', label: 'Salah pasang elektroda prekordial', category: 'dasar', level: 'dasar', competency: 'pengukuran', findings: ['Progresi R prekordial tidak berurutan (melonjak lalu turun)', 'Sadapan ekstremitas normal'], explanation: 'Dua elektroda prekordial tertukar sehingga progresi R/S menjadi tidak berurutan dan dapat meniru infark atau gangguan konduksi. Periksa ulang posisi V1–V6.', mgmt: 'ulang-ekg', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['old-mi-anterior'] }),
    d({ key: 'artifact', label: 'Artefak (tremor/gerak) — bukan aritmia', category: 'dasar', level: 'menengah', competency: 'pengukuran', findings: ['Defleksi cepat tidak beraturan pada sebagian sadapan saja', 'Kompleks QRS normal tetap terlihat "menembus" artefak pada laju sebelumnya'], explanation: 'Artefak gerak/tremor dapat meniru flutter, AF, atau VT ("pseudo-VT"). Kuncinya: QRS asli tetap berbaris dengan interval semula, artefak tidak tampak di semua sadapan, dan pasien stabil.', mgmt: 'ulang-ekg', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['vt-mono', 'flutter', 'vf'] }),
    d({ key: 'dextrocardia', label: 'Dekstrokardia', category: 'dasar', level: 'menengah', competency: 'pengukuran', findings: ['P, QRS, T negatif di I; aVR positif', 'Progresi R terbalik: R mengecil dari V1 ke V6'], explanation: 'Jantung di hemitoraks kanan: sadapan I terbalik seperti salah pasang lengan, NAMUN progresi R prekordial juga menurun (V1→V6). Konfirmasi dengan sadapan prekordial kanan.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'retrograd', st: 'normal', t: 'normal', confusers: ['misplacement-lara'] }),
    // ------------------------------------------------------------------ Aritmia
    d({ key: 'sinus-brady', label: 'Sinus bradikardia', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['Irama sinus dengan laju <60/menit', 'PR dan QRS normal'], explanation: 'Irama sinus <60/menit. Fisiologis pada atlet/tidur; patologis bila simtomatik atau akibat obat, hipotiroid, hipotermia, peningkatan TIK.', mgmt: 'observasi', rhythm: 'sinus-brady', p: 'normal', st: 'normal', t: 'normal', confusers: ['junctional', 'av-2to1'] }),
    d({ key: 'sinus-tachy', label: 'Sinus takikardia', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['P sinus mendahului tiap QRS', 'Laju >100/menit, biasanya <150/menit'], explanation: 'Respons fisiologis terhadap demam, nyeri, hipovolemia, anemia, hipoksia, emboli paru, tirotoksikosis. Obati penyebabnya, bukan iramanya.', mgmt: 'observasi', rhythm: 'sinus-tachy', p: 'normal', st: 'normal', t: 'normal', confusers: ['svt', 'flutter'] }),
    d({ key: 'af', label: 'Fibrilasi atrium', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['RR tidak teratur sama sekali (irregularly irregular)', 'Tidak ada gelombang P; garis dasar bergelombang halus (f)'], explanation: 'Aktivitas atrium kacau tanpa P yang jelas dengan respons ventrikel tidak teratur. Nilai stabilitas, kendalikan laju/irama, dan nilai risiko stroke untuk antikoagulasi.', mgmt: 'rate-control', rhythm: 'af', p: 'flutter-fibrilasi', st: 'normal', t: 'normal', confusers: ['mat', 'flutter', 'sinus-arrhythmia'] }),
    d({ key: 'flutter', label: 'Flutter atrium', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['Gelombang flutter "gigi gergaji" ~300/menit di II, III, aVF', 'Konduksi tetap (2:1 → ~150/menit) atau bervariasi'], explanation: 'Makro-re-entri atrium dengan gelombang F teratur. Laju ventrikel ~150/menit yang sangat teratur harus memicu kecurigaan flutter 2:1.', mgmt: 'rate-control', rhythm: 'flutter', p: 'flutter-fibrilasi', st: 'normal', t: 'normal', confusers: ['svt', 'sinus-tachy', 'af'] }),
    d({ key: 'svt', label: 'Takikardia supraventrikular (AVNRT/AVRT)', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['Takikardia QRS sempit sangat teratur 150–250/menit', 'P tidak tampak atau retrograd (pseudo-r′ V1 / di segmen ST)'], explanation: 'Takikardia re-entri melibatkan nodus AV. Bila stabil: manuver vagal lalu adenosin; bila tidak stabil: kardioversi tersinkron.', mgmt: 'vagal-adenosin', rhythm: 'svt', p: 'retrograd', st: 'normal', t: 'normal', confusers: ['sinus-tachy', 'flutter', 'atrial-tachy'] }),
    d({ key: 'atrial-tachy', label: 'Takikardia atrium fokal', category: 'aritmia', level: 'menengah', competency: 'irama', findings: ['P berbeda dari sinus mendahului tiap QRS', 'RP panjang (P lebih dekat ke QRS berikutnya)'], explanation: 'Fokus ektopik atrium dengan morfologi P tidak lazim. Dapat disertai blok AV (pikirkan toksisitas digoksin).', mgmt: 'kardioversi', rhythm: 'at', p: 'retrograd', st: 'normal', t: 'normal', confusers: ['svt', 'sinus-tachy'] }),
    d({ key: 'mat', label: 'Takikardia atrium multifokal (MAT)', category: 'aritmia', level: 'menengah', competency: 'irama', findings: ['≥3 morfologi P berbeda', 'PR dan RR bervariasi, laju >100/menit'], explanation: 'Sering pada PPOK eksaserbasi, hipoksia, hipomagnesemia. Terapi ditujukan pada penyakit dasar; bedakan dari AF karena P jelas terlihat.', mgmt: 'koreksi-elektrolit', rhythm: 'mat', p: 'bervariasi', st: 'normal', t: 'normal', confusers: ['af', 'sinus-arrhythmia'] }),
    d({ key: 'pac', label: 'Kontraksi atrium prematur (PAC)', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['Denyut prematur dengan P berbeda morfologi', 'QRS sempit, jeda tidak kompensatoris'], explanation: 'Denyut ektopik atrium; umumnya jinak. Bila sering, cari pencetus (kafein, alkohol, stres, gangguan elektrolit).', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['pvc', 'sinus-arrhythmia'] }),
    d({ key: 'pvc', label: 'Kontraksi ventrikel prematur (PVC)', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['Kompleks prematur lebar ≥120 ms tanpa P sebelumnya', 'ST-T berlawanan arah QRS, jeda kompensatoris penuh'], explanation: 'Denyut ektopik ventrikel. Nilai frekuensi, gejala, dan penyakit jantung struktural; koreksi elektrolit.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['pac', 'bigeminy'] }),
    d({ key: 'bigeminy', label: 'Bigemini ventrikel', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['PVC setiap denyut kedua (sinus–PVC–sinus–PVC)'], explanation: 'Pola PVC berselang-seling dengan denyut sinus. Hitung laju nadi efektif; pertimbangkan toksisitas digoksin, iskemia, elektrolit.', mgmt: 'koreksi-elektrolit', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['trigeminy', 'pvc'] }),
    d({ key: 'trigeminy', label: 'Trigemini ventrikel', category: 'aritmia', level: 'dasar', competency: 'irama', findings: ['PVC setiap denyut ketiga (sinus–sinus–PVC)'], explanation: 'Pola ektopi ventrikel berulang setiap tiga denyut. Pendekatan sama dengan PVC.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['bigeminy', 'pvc'] }),
    d({ key: 'junctional', label: 'Irama junctional', category: 'aritmia', level: 'menengah', competency: 'irama', findings: ['QRS sempit teratur 40–60/menit (lolos) atau 60–100 (terakselerasi)', 'P tidak ada atau retrograd dengan PR <120 ms'], explanation: 'Pemacu dari nodus AV/His. Sering akibat disfungsi sinus, obat (β-bloker, digoksin), atau iskemia inferior.', mgmt: 'atropin-pacing', rhythm: 'junctional', p: 'retrograd', st: 'normal', t: 'normal', confusers: ['sinus-brady', 'chb'] }),
    d({ key: 'aivr', label: 'Irama idioventrikular terakselerasi (AIVR)', category: 'aritmia', level: 'lanjut', competency: 'irama', findings: ['QRS lebar teratur 50–110/menit', 'Disosiasi AV/fusi di awal-akhir episode'], explanation: 'Fokus ventrikel yang sedikit lebih cepat dari sinus; khas setelah reperfusi. Umumnya jinak dan tidak perlu antiaritmia.', mgmt: 'observasi', rhythm: 'aivr', p: 'tak-dikonduksikan', st: 'sekunder', t: 'sekunder', confusers: ['vt-mono', 'chb'] }),
    d({ key: 'vt-mono', label: 'Takikardia ventrikel monomorfik', category: 'aritmia', level: 'menengah', competency: 'irama', critical: true, findings: ['QRS lebar (≥120 ms) teratur, laju >100/menit', 'Disosiasi AV, capture/fusion beat', 'Aksis ekstrem, tanpa kompleks RS prekordial / R/S <1 di V6'], explanation: 'Takikardia kompleks lebar yang belum jelas mekanismenya harus diperlakukan sebagai VT. Tidak stabil → kardioversi tersinkron; tanpa nadi → defibrilasi.', mgmt: 'kardioversi', rhythm: 'vt', p: 'tak-dikonduksikan', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['svt-aberrant', 'pre-excited-af', 'artifact'] }),
    d({ key: 'svt-aberrant', label: 'SVT dengan konduksi aberan', category: 'aritmia', level: 'lanjut', competency: 'irama', findings: ['Takikardia QRS lebar dengan morfologi BBB tipikal (rsR′ V1)', 'Ada RS prekordial dengan interval RS <100 ms, tanpa disosiasi AV'], explanation: 'Takikardia supraventrikular dengan pola blok berkas cabang tipikal. Bedakan dari VT dengan algoritma Brugada/Vereckei; bila ragu → tatalaksana sebagai VT.', mgmt: 'kardioversi', rhythm: 'svt', p: 'tidak-ada', st: 'sekunder', t: 'sekunder', confusers: ['vt-mono'] }),
    d({ key: 'torsades', label: 'Torsades de pointes', category: 'aritmia', level: 'menengah', competency: 'irama', critical: true, findings: ['VT polimorfik dengan amplitudo "berputar" di sekitar garis dasar', 'Didahului QT panjang'], explanation: 'VT polimorfik terkait QT panjang. Magnesium sulfat IV, koreksi kalium, hentikan obat pemanjang QT; tanpa nadi → defibrilasi.', mgmt: 'magnesium', rhythm: 'torsades', p: 'tidak-ada', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['vf', 'vt-mono'] }),
    d({ key: 'vf', label: 'Fibrilasi ventrikel', category: 'aritmia', level: 'dasar', competency: 'irama', critical: true, findings: ['Gelombang kacau tanpa QRS yang dapat dikenali'], explanation: 'Henti jantung. RJP dan defibrilasi segera; konfirmasi pasien tidak responsif dan tanpa nadi (singkirkan artefak).', mgmt: 'defibrilasi', rhythm: 'vf', p: 'tidak-ada', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['torsades', 'artifact', 'asystole'] }),
    d({ key: 'asystole', label: 'Asistol', category: 'aritmia', level: 'dasar', competency: 'irama', critical: true, findings: ['Garis datar tanpa aktivitas ventrikel', 'Periksa kabel, gain, dan sadapan lain (singkirkan VF halus)'], explanation: 'Henti jantung non-shockable. RJP + epinefrin dan cari penyebab reversibel. Konfirmasi di >1 sadapan dan gain dinaikkan.', mgmt: 'rjp-epinefrin', rhythm: 'asistol', p: 'tidak-ada', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['vf'] }),
    d({ key: 'pre-excited-af', label: 'AF dengan pre-eksitasi (WPW)', category: 'aritmia', level: 'lanjut', competency: 'irama', critical: true, findings: ['Takikardia QRS lebar SANGAT tidak teratur dengan morfologi bervariasi', 'Laju dapat >250/menit'], explanation: 'AF yang dikonduksikan lewat jalur aksesori; berisiko menjadi VF. HINDARI penyekat nodus AV (adenosin, CCB, β-bloker, digoksin). Tidak stabil → kardioversi; stabil → prokainamid/ibutilid atau kardioversi elektif.', mgmt: 'kardioversi', rhythm: 'af', p: 'flutter-fibrilasi', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['vt-mono', 'af'] }),
    d({ key: 'dig-toxicity', label: 'Toksisitas digoksin (VT bidireksional)', category: 'elektrolit', level: 'lanjut', competency: 'elektrolit', critical: true, findings: ['QRS lebar dengan aksis berganti-ganti tiap denyut', 'Riwayat digoksin'], explanation: 'VT bidireksional sangat sugestif toksisitas digoksin (atau CPVT). Hentikan digoksin, periksa kalium, pertimbangkan antibodi Fab digoksin.', mgmt: 'digoksin', rhythm: 'vt', p: 'tidak-ada', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['vt-mono', 'torsades'] }),
    // ------------------------------------------------------------------ Konduksi
    d({ key: 'av1', label: 'AV blok derajat 1', category: 'konduksi', level: 'dasar', competency: 'konduksi', findings: ['PR >200 ms konstan', 'Setiap P diikuti QRS'], explanation: 'Perlambatan konduksi AV tanpa P yang terblokir. Umumnya tidak perlu terapi; perhatikan obat penekan nodus AV.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['mobitz1'] }),
    d({ key: 'mobitz1', label: 'AV blok derajat 2 Mobitz I (Wenckebach)', category: 'konduksi', level: 'dasar', competency: 'konduksi', findings: ['PR memanjang progresif sampai satu P tidak dikonduksikan', 'Pengelompokan QRS (group beating); PR setelah jeda paling pendek'], explanation: 'Blok umumnya di nodus AV, sering jinak (vagal, iskemia inferior). Tatalaksana bila simtomatik.', mgmt: 'observasi', rhythm: 'sinus', p: 'tak-dikonduksikan', st: 'normal', t: 'normal', confusers: ['mobitz2', 'av-2to1', 'pac'] }),
    d({ key: 'mobitz2', label: 'AV blok derajat 2 Mobitz II', category: 'konduksi', level: 'menengah', competency: 'konduksi', critical: true, findings: ['PR konstan pada denyut yang dikonduksikan', 'P tiba-tiba tidak diikuti QRS', 'Sering disertai QRS lebar (BBB)'], explanation: 'Blok infranodal dengan risiko progresi ke AV blok total. Siapkan pacing; atropin sering tidak efektif.', mgmt: 'atropin-pacing', rhythm: 'sinus', p: 'tak-dikonduksikan', st: 'normal', t: 'normal', confusers: ['mobitz1', 'av-2to1'] }),
    d({ key: 'av-2to1', label: 'AV blok 2:1', category: 'konduksi', level: 'menengah', competency: 'konduksi', findings: ['Setiap P kedua tidak dikonduksikan', 'Tidak dapat dibedakan Mobitz I/II dari EKG permukaan'], explanation: 'Dengan rasio 2:1 tipe blok tidak dapat ditentukan. QRS lebar mengarah infranodal. Laju ventrikel = setengah laju atrium.', mgmt: 'atropin-pacing', rhythm: 'sinus', p: 'tak-dikonduksikan', st: 'normal', t: 'normal', confusers: ['sinus-brady', 'mobitz2'] }),
    d({ key: 'chb', label: 'AV blok total (derajat 3)', category: 'konduksi', level: 'dasar', competency: 'konduksi', critical: true, findings: ['P dan QRS berjalan sendiri-sendiri (disosiasi AV)', 'Laju atrium > laju ventrikel; irama lolos junctional/ventrikel teratur'], explanation: 'Tidak ada konduksi AV. Bila simtomatik: atropin (sering gagal pada lolos ventrikel), pacing transkutan, rujuk untuk pacu jantung permanen.', mgmt: 'atropin-pacing', rhythm: 'disosiasi-av', p: 'tak-dikonduksikan', st: 'normal', t: 'normal', confusers: ['av-2to1', 'aivr', 'junctional'] }),
    d({ key: 'wpw', label: 'Pre-eksitasi (pola WPW)', category: 'konduksi', level: 'menengah', competency: 'konduksi', findings: ['PR pendek <120 ms', 'Gelombang delta (awal QRS melandai)', 'QRS melebar dengan ST-T sekunder'], explanation: 'Jalur aksesori mendepolarisasi ventrikel lebih awal. Asimtomatik → rujuk evaluasi elektrofisiologi; waspadai AF pre-eksitasi.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'sekunder', t: 'sekunder', confusers: ['lbbb', 'old-mi-inferior', 'rvh'] }),
    d({ key: 'paced', label: 'Irama pacu ventrikel (normal)', category: 'konduksi', level: 'dasar', competency: 'konduksi', findings: ['Spike pacu diikuti QRS lebar (pola LBBB, aksis superior pada pacu RV)', 'ST-T diskordan sekunder'], explanation: 'Irama pacu dengan capture baik. Iskemia pada irama pacu dinilai dengan kriteria Sgarbossa (modifikasi Smith).', mgmt: 'observasi', rhythm: 'pacu', p: 'tidak-ada', st: 'sekunder', t: 'sekunder', confusers: ['lbbb', 'vt-mono'] }),
    d({ key: 'pacing-noncapture', label: 'Malfungsi pacu: gagal capture', category: 'konduksi', level: 'lanjut', competency: 'konduksi', critical: true, findings: ['Spike pacu tidak diikuti QRS', 'Jeda/bradikardia'], explanation: 'Output pacu tidak mendepolarisasi miokard (lead lepas, ambang naik, elektrolit, iskemia). Pacing transkutan bila simtomatik dan interogasi segera.', mgmt: 'pacemaker', rhythm: 'pacu', p: 'tidak-ada', st: 'sekunder', t: 'sekunder', confusers: ['pacing-undersensing', 'paced'] }),
    d({ key: 'pacing-undersensing', label: 'Malfungsi pacu: undersensing', category: 'konduksi', level: 'lanjut', competency: 'konduksi', findings: ['Spike pacu muncul walau ada QRS intrinsik (asinkron)', 'Spike dapat jatuh pada T (risiko R-on-T)'], explanation: 'Pacu tidak mendeteksi aktivitas intrinsik sehingga menembak terlalu dini. Perlu interogasi/penyetelan sensitivitas.', mgmt: 'pacemaker', rhythm: 'pacu', p: 'normal', st: 'sekunder', t: 'sekunder', confusers: ['pacing-noncapture'] }),
    d({ key: 'rbbb', label: 'Right bundle branch block (RBBB) komplet', category: 'konduksi', level: 'dasar', competency: 'konduksi', findings: ['QRS ≥120 ms', 'rsR′ ("telinga kelinci") di V1–V2', 'S lebar di I dan V6'], explanation: 'Keterlambatan aktivasi ventrikel kanan. Dapat normal; bila baru dengan nyeri dada pertimbangkan iskemia/emboli paru.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'sekunder', t: 'sekunder', confusers: ['lbbb', 'brugada', 'bifascicular'] }),
    d({ key: 'lbbb', label: 'Left bundle branch block (LBBB) komplet', category: 'konduksi', level: 'dasar', competency: 'konduksi', findings: ['QRS ≥120 ms', 'R lebar berlekuk di I, aVL, V5–V6 tanpa q', 'QS/rS dalam di V1; ST-T diskordan'], explanation: 'Mengaburkan diagnosis iskemia; gunakan kriteria Sgarbossa/Smith. LBBB baru + gejala iskemia/instabilitas → tatalaksana sebagai kemungkinan oklusi.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'sekunder', t: 'sekunder', confusers: ['paced', 'lvh-strain', 'sgarbossa-lbbb'] }),
    d({ key: 'lafb', label: 'Left anterior fascicular block (LAFB)', category: 'konduksi', level: 'menengah', competency: 'konduksi', findings: ['Aksis −45° s.d. −90°', 'qR di aVL, rS di II, III, aVF', 'QRS <120 ms'], explanation: 'Hemiblok anterior kiri — penyebab tersering deviasi aksis kiri. Tidak perlu terapi khusus.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['old-mi-inferior', 'lpfb'] }),
    d({ key: 'lpfb', label: 'Left posterior fascicular block (LPFB)', category: 'konduksi', level: 'lanjut', competency: 'konduksi', findings: ['Aksis +90° s.d. +180°', 'rS di I & aVL, qR di III & aVF', 'Singkirkan RVH/emboli paru/tubuh ramping'], explanation: 'Jarang dan diagnosis eksklusi penyebab deviasi aksis kanan lain.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['rvh', 'pe', 'lafb'] }),
    d({ key: 'bifascicular', label: 'Blok bifasikular (RBBB + LAFB)', category: 'konduksi', level: 'menengah', competency: 'konduksi', findings: ['Pola RBBB (QRS ≥120, rsR′ V1)', 'Aksis kiri −45° s.d. −90°'], explanation: 'Dua dari tiga fasikel terganggu. Bila disertai sinkop, evaluasi untuk blok tingkat tinggi intermiten.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'sekunder', t: 'sekunder', confusers: ['rbbb', 'lafb'] }),
    // ------------------------------------------------------------------ Iskemia
    d({ key: 'stemi-anterior', label: 'STEMI anterior (oklusi LAD)', category: 'iskemia', level: 'dasar', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: [`Elevasi ST di V1–V4 (V2–V3 ≥${ST_ELEVATION.V2V3_MEN_GE40_MM} mm pria ≥40 th / ≥${ST_ELEVATION.V2V3_WOMEN_MM} mm wanita; lain ≥${ST_ELEVATION.OTHER_LEADS_MM} mm)`, 'Depresi resiprokal di inferior (II, III, aVF) bila proksimal'], explanation: 'Oklusi arteri desendens anterior kiri. Reperfusi segera bila gejala ≤12 jam.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'hiperakut', confusers: ['early-repol', 'pericarditis', 'lvh-strain', 'aneurysm'] }),
    d({ key: 'stemi-inferior', label: 'STEMI inferior', category: 'iskemia', level: 'dasar', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: ['Elevasi ST di II, III, aVF (III > II → RCA)', 'Depresi resiprokal di aVL/I', 'Rekam V3R/V4R & V7–V9'], explanation: 'Oklusi RCA atau LCx. Rekam sadapan kanan (V4R) untuk keterlibatan ventrikel kanan sebelum memberi nitrat.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'normal', confusers: ['pericarditis', 'early-repol'] }),
    d({ key: 'stemi-rv', label: 'STEMI inferior dengan infark ventrikel kanan', category: 'iskemia', level: 'menengah', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: ['Elevasi ST inferior, III > II', 'Elevasi ST V1 dan V4R ≥0,5 mm (≥1 mm pria <30 th)'], explanation: 'Oklusi RCA proksimal. Pasien bergantung preload: hindari nitrat/diuretik, beri cairan bila hipotensi; reperfusi segera.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'normal', confusers: ['stemi-inferior'] }),
    d({ key: 'stemi-lateral', label: 'STEMI lateral', category: 'iskemia', level: 'menengah', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: ['Elevasi ST di I, aVL ± V5–V6', 'Depresi resiprokal di III/aVF'], explanation: 'Oklusi cabang diagonal/LCx. Elevasi di aVL dapat kecil; depresi resiprokal inferior membantu.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'normal', confusers: ['lvh-strain', 'pericarditis'] }),
    d({ key: 'stemi-posterior', label: 'Infark posterior (oklusi LCx/RCA)', category: 'iskemia', level: 'menengah', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: ['Depresi ST horizontal V1–V3 dengan R tinggi dan T tegak', 'Elevasi ST V7–V9 ≥0,5 mm (≥1 mm pria <40 th)'], explanation: 'Ekuivalen STEMI yang sering terlewat. Depresi ST V1–V3 harus memicu perekaman V7–V9 dan reperfusi segera (ESC 2023).', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'depresi', t: 'normal', confusers: ['nstemi-std', 'rbbb', 'rvh'] }),
    d({ key: 'hyperacute-t', label: 'T hiperakut (oklusi dini)', category: 'iskemia', level: 'lanjut', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: ['T besar, lebar, simetris di ≥2 sadapan berdekatan', 'Elevasi ST minimal; ulangi EKG tiap 15–30 menit'], explanation: 'Tanda paling awal oklusi koroner, mendahului elevasi ST. Pada klinis SKA, tangani sebagai oklusi dan ulangi EKG serial.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'hiperakut', confusers: ['hyperk-1', 'early-repol'] }),
    d({ key: 'de-winter', label: 'Pola de Winter (oklusi LAD proksimal)', category: 'iskemia', level: 'lanjut', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: [`Depresi ST upsloping ${DE_WINTER.STD_MIN_MM}–${DE_WINTER.STD_MAX_MM} mm di titik J V1–V6`, 'Berlanjut ke T tinggi, simetris', `Elevasi ST aVR ${DE_WINTER.AVR_STE_MM.min}–${DE_WINTER.AVR_STE_MM.max} mm`], explanation: 'Ekuivalen STEMI tanpa elevasi ST klasik. Tangani sebagai oklusi LAD akut: reperfusi segera.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'depresi', t: 'hiperakut', confusers: ['nstemi-std', 'hyperk-1', 'hyperacute-t'] }),
    d({ key: 'wellens-a', label: 'Sindrom Wellens tipe A', category: 'iskemia', level: 'lanjut', competency: 'iskemia', critical: true, findings: ['T bifasik (positif lalu negatif) di V2–V3', 'ST isoelektrik/elevasi <1 mm, tanpa Q, R terjaga', 'Direkam saat bebas nyeri'], explanation: 'Stenosis kritis LAD proksimal dengan reperfusi spontan. Risiko tinggi infark anterior luas: angiografi dini; hindari uji latih beban.', mgmt: 'wellens', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'bifasik', confusers: ['wellens-b', 'hypok'] }),
    d({ key: 'wellens-b', label: 'Sindrom Wellens tipe B', category: 'iskemia', level: 'lanjut', competency: 'iskemia', critical: true, findings: ['T inversi dalam dan simetris di V2–V3 (dapat V1–V6)', 'Tanpa Q, progresi R terjaga, ST <1 mm'], explanation: 'Seperti tipe A, menandakan stenosis kritis LAD proksimal. Angiografi dini.', mgmt: 'wellens', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'inversi', confusers: ['wellens-a', 'ischemic-twi', 'takotsubo'] }),
    d({ key: 'avr-std', label: 'Elevasi aVR + depresi ST difus (LM/multivessel)', category: 'iskemia', level: 'lanjut', competency: 'iskemia', critical: true, reperfusion: true, findings: [`Depresi ST ≥${AVR_PATTERN.STD_MM} mm di ≥${AVR_PATTERN.MIN_LEADS_WITH_STD} sadapan (inferolateral)`, 'Elevasi ST di aVR dan/atau V1'], explanation: 'Iskemia subendokardial difus akibat obstruksi left main/tiga pembuluh (atau penyebab non-koroner seperti takikardia, anemia berat). Pada iskemia berlangsung: triase reperfusi/angiografi segera (ESC 2023).', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'depresi', t: 'normal', confusers: ['nstemi-std', 'digoxin'] }),
    d({ key: 'nstemi-std', label: 'Iskemia subendokardial (depresi ST) / NSTE-ACS', category: 'iskemia', level: 'dasar', competency: 'iskemia', findings: ['Depresi ST horizontal/downsloping ≥0,5 mm di ≥2 sadapan berdekatan', 'Tanpa elevasi ST memenuhi kriteria'], explanation: 'Iskemia tanpa oklusi transmural yang jelas. Troponin serial dan stratifikasi risiko. Depresi maksimal di V1–V4 harus dipikirkan sebagai infark posterior.', mgmt: 'nste-acs', rhythm: 'sinus', p: 'normal', st: 'depresi', t: 'normal', confusers: ['stemi-posterior', 'lvh-strain', 'digoxin'] }),
    d({ key: 'ischemic-twi', label: 'Inversi T iskemik', category: 'iskemia', level: 'menengah', competency: 'iskemia', findings: ['Inversi T >1 mm di ≥2 sadapan berdekatan dengan R prominen', 'Simetris, tanpa elevasi ST'], explanation: 'Dapat menandakan iskemia/infark tanpa elevasi ST. Nilai dalam konteks klinis dan troponin; bandingkan dengan EKG lama.', mgmt: 'nste-acs', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'inversi', confusers: ['wellens-b', 'lvh-strain', 'pe'] }),
    d({ key: 'old-mi-inferior', label: 'Infark lama inferior (gelombang Q)', category: 'iskemia', level: 'dasar', competency: 'iskemia', findings: ['Q patologis (≥30 ms, ≥1 mm) di II, III, aVF', 'Tanpa elevasi ST akut'], explanation: 'Sekuel infark inferior. Tidak gawat bila tanpa gejala akut; optimalkan pencegahan sekunder.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['lafb', 'wpw', 'stemi-inferior'] }),
    d({ key: 'old-mi-anterior', label: 'Infark lama anterior/anteroseptal', category: 'iskemia', level: 'dasar', competency: 'iskemia', findings: ['QS/Q di V1–V3, progresi R buruk', 'Tanpa elevasi ST akut'], explanation: 'Sekuel infark anterior. Bandingkan dengan EKG lama; elevasi ST menetap mengarah aneurisma.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['misplacement-prec', 'lvh', 'aneurysm'] }),
    d({ key: 'aneurysm', label: 'Pola aneurisma ventrikel kiri', category: 'iskemia', level: 'lanjut', competency: 'iskemia', findings: ['Q/QS di sadapan anterior dengan elevasi ST menetap', 'T relatif kecil dibanding QRS'], explanation: 'Elevasi ST persisten pascainfark lama. Bandingkan EKG lama dan klinis; rasio amplitudo T/QRS kecil mendukung aneurisma dibanding STEMI akut.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'normal', confusers: ['stemi-anterior'] }),
    d({ key: 'sgarbossa-lbbb', label: 'Infark akut pada LBBB (Sgarbossa/Smith positif)', category: 'iskemia', level: 'lanjut', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: [`Elevasi ST konkordan ≥${SGARBOSSA.CONCORDANT_STE_MM} mm pada sadapan dengan QRS positif`, `Atau rasio ST/S ≤ ${SGARBOSSA.SMITH_RATIO} (modifikasi Smith)`], explanation: 'LBBB dengan tanda oklusi akut. Kriteria Sgarbossa (modifikasi Smith) positif → reperfusi segera.', mgmt: 'reperfusi', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'sekunder', confusers: ['lbbb', 'paced'] }),
    d({ key: 'sgarbossa-paced', label: 'Infark akut pada irama pacu (Sgarbossa positif)', category: 'iskemia', level: 'lanjut', competency: 'iskemia', occlusion: true, reperfusion: true, critical: true, findings: ['Irama pacu ventrikel dengan elevasi ST konkordan atau diskordan berlebihan'], explanation: 'Kriteria Sgarbossa/Smith juga dipakai pada irama pacu ventrikel kanan. Positif → tangani sebagai oklusi.', mgmt: 'reperfusi', rhythm: 'pacu', p: 'tidak-ada', st: 'elevasi', t: 'sekunder', confusers: ['paced', 'sgarbossa-lbbb'] }),
    // ------------------------------------------------------------------ Peniru
    d({ key: 'pericarditis', label: 'Perikarditis akut', category: 'peniru', level: 'menengah', competency: 'iskemia', findings: ['Elevasi ST cekung difus (I, II, aVF, V2–V6)', 'Depresi PR; elevasi PR & depresi ST di aVR', 'Tanpa resiprokal (kecuali aVR/V1)'], explanation: 'Peradangan perikard; elevasi ST difus tidak mengikuti satu teritori koroner. Ekokardiografi untuk efusi.', mgmt: 'perikarditis', rhythm: 'sinus-tachy', p: 'normal', st: 'elevasi-difus', t: 'normal', confusers: ['stemi-inferior', 'early-repol', 'stemi-anterior'] }),
    d({ key: 'lvh-strain', label: 'LVH dengan pola strain', category: 'peniru', level: 'menengah', competency: 'konduksi', findings: [`Voltase LVH (Sokolow–Lyon ≥${LVH.SOKOLOW_MM} mm atau Cornell)`, 'Depresi ST & T inversi asimetris di I, aVL, V5–V6', 'Elevasi ST diskordan di V1–V3'], explanation: 'Repolarisasi sekunder akibat hipertrofi dapat meniru iskemia/STEMI anterior. Bandingkan dengan EKG lama.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'mitral', st: 'sekunder', t: 'sekunder', confusers: ['nstemi-std', 'stemi-anterior', 'lbbb'] }),
    d({ key: 'brugada', label: 'Pola Brugada tipe 1', category: 'peniru', level: 'lanjut', competency: 'konduksi', critical: true, findings: [`Elevasi ST "coved" ≥${BRUGADA.TYPE1_STE_MM} mm di V1–V2`, 'Diikuti T negatif; sering pola mirip RBBB inkomplet'], explanation: 'Kanalopati natrium dengan risiko VF/kematian mendadak, sering muncul saat demam. Rujuk elektrofisiologi.', mgmt: 'brugada', rhythm: 'sinus', p: 'normal', st: 'elevasi', t: 'inversi', confusers: ['rbbb', 'stemi-anterior'] }),
    d({ key: 'takotsubo', label: 'Kardiomiopati Takotsubo', category: 'peniru', level: 'lanjut', competency: 'iskemia', reperfusion: true, findings: ['Inversi T dalam difus (prekordial & ekstremitas) dengan QT memanjang', 'atau elevasi ST anterior tanpa resiprokal (fase awal)'], explanation: 'Tidak dapat dibedakan dari SKA hanya dengan EKG — angiografi koroner tetap diperlukan.', mgmt: 'nste-acs', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'inversi', confusers: ['wellens-b', 'ischemic-twi'] }),
    // ------------------------------------------------------------------ Elektrolit/obat
    d({ key: 'hyperk-1', label: `Hiperkalemia ringan (${HYPERKALEMIA.STAGES[0].kRange} mEq/L)`, category: 'elektrolit', level: 'dasar', competency: 'elektrolit', findings: ['T tinggi, runcing, berbasis sempit (tenting)', 'QRS & P masih normal'], explanation: 'Perubahan paling awal hiperkalemia. Korelasi kadar K⁺ dengan EKG buruk — periksa K⁺ segera.', mgmt: 'kalsium-hiperk', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'tinggi-runcing', confusers: ['hyperacute-t', 'early-repol'] }),
    d({ key: 'hyperk-2', label: `Hiperkalemia sedang (${HYPERKALEMIA.STAGES[1].kRange} mEq/L)`, category: 'elektrolit', level: 'menengah', competency: 'elektrolit', critical: true, findings: ['P mendatar/melebar, PR memanjang', 'QRS mulai melebar', 'T runcing'], explanation: 'Gangguan konduksi mulai muncul: risiko bradiaritmia dan henti jantung. Kalsium IV segera untuk stabilisasi membran.', mgmt: 'kalsium-hiperk', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'tinggi-runcing', confusers: ['hyperk-1', 'ivcd'] }),
    d({ key: 'hyperk-3', label: `Hiperkalemia berat (${HYPERKALEMIA.STAGES[2].kRange} mEq/L)`, category: 'elektrolit', level: 'menengah', competency: 'elektrolit', critical: true, findings: ['P hilang', 'QRS sangat lebar menyatu dengan T (pola sinus/sine wave)'], explanation: 'Pra-henti jantung. P tidak tampak (irama "sinoventrikular" — impuls sinus tetap dikonduksikan tanpa P yang terlihat; di formulir dinilai sebagai irama junctional/tanpa P). Kalsium IV segera dan berulang, insulin + dekstrosa, persiapan dialisis.', mgmt: 'kalsium-hiperk', rhythm: 'junctional', p: 'tidak-ada', st: 'tidak-dinilai', t: 'tidak-dinilai', confusers: ['vt-mono', 'tca'] }),
    d({ key: 'hypok', label: 'Hipokalemia', category: 'elektrolit', level: 'dasar', competency: 'elektrolit', findings: ['T mendatar, gelombang U menonjol (>1 mm, dapat > T)', 'Depresi ST ringan, QU tampak panjang'], explanation: 'Risiko aritmia ventrikel (termasuk torsades). Koreksi kalium (dan magnesium).', mgmt: 'koreksi-elektrolit', rhythm: 'sinus', p: 'normal', st: 'depresi', t: 'mendatar-u', confusers: ['long-qt', 'digoxin'] }),
    d({ key: 'hypocalcemia', label: 'Hipokalsemia', category: 'elektrolit', level: 'menengah', competency: 'elektrolit', findings: ['QTc memanjang akibat segmen ST panjang', 'Gelombang T relatif normal'], explanation: 'Perpanjangan fase plateau. Cari penyebab (pascatiroidektomi, CKD, pankreatitis); koreksi kalsium.', mgmt: 'koreksi-elektrolit', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['long-qt', 'hypok'] }),
    d({ key: 'hypercalcemia', label: 'Hiperkalsemia', category: 'elektrolit', level: 'menengah', competency: 'elektrolit', findings: ['QTc memendek; segmen ST pendek/hampir tidak ada', 'T segera setelah QRS'], explanation: 'Pemendekan repolarisasi. Cari keganasan/hiperparatiroid; hidrasi dan terapi penurun kalsium.', mgmt: 'koreksi-elektrolit', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['digoxin'] }),
    d({ key: 'long-qt', label: 'QT memanjang', category: 'elektrolit', level: 'menengah', competency: 'pengukuran', findings: [`QTc ≥${QT.PROLONGED_MALE_MS} ms (pria) / ≥${QT.PROLONGED_FEMALE_MS} ms (wanita); >${QT.HIGH_RISK_MS} ms risiko tinggi`], explanation: 'Didapat (obat, elektrolit, bradikardia) atau kongenital. Hentikan obat pemanjang QT, koreksi K⁺/Mg²⁺.', mgmt: 'koreksi-elektrolit', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['hypocalcemia', 'hypok'] }),
    d({ key: 'digoxin', label: 'Efek digoksin', category: 'elektrolit', level: 'menengah', competency: 'elektrolit', findings: ['Depresi ST "scooped" (Salvador Dali)', 'QT pendek, T mendatar'], explanation: 'Efek terapeutik, BUKAN toksisitas. Toksisitas ditandai aritmia (PVC, AT dengan blok, VT bidireksional) + gejala.', mgmt: 'observasi', rhythm: 'sinus', p: 'normal', st: 'depresi', t: 'mendatar-u', confusers: ['nstemi-std', 'lvh-strain', 'hypok'] }),
    d({ key: 'tca', label: 'Toksisitas antidepresan trisiklik (blokade kanal Na)', category: 'elektrolit', level: 'lanjut', competency: 'elektrolit', critical: true, findings: [`Sinus takikardia, QRS ≥${TCA.QRS_SEIZURE_MS} ms`, `R terminal di aVR ≥${TCA.R_AVR_MM} mm, S dalam di I/aVL`], explanation: 'Blokade kanal natrium; QRS ≥100 ms memprediksi kejang, ≥160 ms memprediksi aritmia ventrikel. Natrium bikarbonat IV.', mgmt: 'bikarbonat', rhythm: 'sinus-tachy', p: 'normal', st: 'normal', t: 'normal', confusers: ['rbbb', 'hyperk-3', 'vt-mono'] }),
    d({ key: 'hypothermia', label: 'Hipotermia (gelombang Osborn)', category: 'elektrolit', level: 'menengah', competency: 'elektrolit', findings: ['Gelombang J/Osborn di akhir QRS', 'Bradikardia, interval memanjang, artefak menggigil'], explanation: 'Gelombang Osborn makin besar seiring turunnya suhu. Penghangatan; tangani hati-hati karena mudah VF.', mgmt: 'hangatkan', rhythm: 'sinus-brady', p: 'normal', st: 'elevasi-difus', t: 'normal', confusers: ['early-repol', 'brugada'] }),
    // ------------------------------------------------------------------ Lain-lain
    d({ key: 'lvh', label: 'Hipertrofi ventrikel kiri (voltase)', category: 'lain', level: 'dasar', competency: 'konduksi', findings: [`SV1 + RV5/V6 ≥${LVH.SOKOLOW_MM} mm (Sokolow–Lyon) atau Cornell`, 'Tanpa perubahan repolarisasi bermakna'], explanation: 'Kriteria voltase spesifik tetapi kurang sensitif. Konfirmasi dengan ekokardiografi; cari hipertensi/stenosis aorta.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['lvh-strain', 'sinus-normal'] }),
    d({ key: 'rvh', label: 'Hipertrofi ventrikel kanan', category: 'lain', level: 'menengah', competency: 'konduksi', findings: ['R dominan di V1 (R/S >1), deviasi aksis kanan', 'S dalam di V5–V6, ± strain RV (T inversi V1–V3)'], explanation: 'Hipertensi pulmonal, stenosis mitral, PPOK, penyakit jantung bawaan. Konfirmasi ekokardiografi.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'pulmonal', st: 'normal', t: 'inversi', confusers: ['stemi-posterior', 'rbbb', 'wpw'] }),
    d({ key: 'lae', label: 'Pembesaran atrium kiri (P mitral)', category: 'lain', level: 'dasar', competency: 'konduksi', findings: ['P lebar ≥120 ms berlekuk di II', 'Komponen terminal negatif P di V1 ≥1 mm × ≥40 ms'], explanation: 'Sering pada stenosis/regurgitasi mitral, hipertensi, disfungsi diastolik.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'mitral', st: 'normal', t: 'normal', confusers: ['rae'] }),
    d({ key: 'rae', label: 'Pembesaran atrium kanan (P pulmonal)', category: 'lain', level: 'dasar', competency: 'konduksi', findings: ['P tinggi ≥2,5 mm di II/III/aVF', 'P positif tinggi di V1 >1,5 mm'], explanation: 'Hipertensi pulmonal, PPOK, penyakit jantung bawaan, stenosis trikuspid.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'pulmonal', st: 'normal', t: 'normal', confusers: ['lae'] }),
    d({ key: 'low-voltage', label: 'Voltase rendah', category: 'lain', level: 'menengah', competency: 'pengukuran', findings: ['QRS <5 mm di semua sadapan ekstremitas (± <10 mm prekordial)'], explanation: 'Efusi perikard, obesitas, PPOK, hipotiroid, amiloidosis, edema anasarka. Pastikan kalibrasi benar.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'normal', confusers: ['electrical-alternans'] }),
    d({ key: 'electrical-alternans', label: 'Voltase rendah + alternans listrik (efusi perikard besar)', category: 'lain', level: 'lanjut', competency: 'konduksi', critical: true, findings: ['Amplitudo QRS berganti besar-kecil tiap denyut', 'Sinus takikardia dan voltase rendah'], explanation: 'Jantung "berayun" dalam efusi besar — curigai tamponade bila hipotensi. Ekokardiografi segera.', mgmt: 'tamponade', rhythm: 'sinus-tachy', p: 'normal', st: 'normal', t: 'normal', confusers: ['low-voltage', 'pericarditis'] }),
    d({ key: 'pe', label: 'Pola emboli paru (strain ventrikel kanan)', category: 'lain', level: 'menengah', competency: 'iskemia', findings: ['Sinus takikardia', 'S1Q3T3, T inversi V1–V3/III', '± RBBB inkomplet, deviasi aksis kanan'], explanation: 'Temuan EKG tidak sensitif maupun spesifik; sinus takikardia paling sering. Inversi T V1–V3 + III mendukung strain RV akut.', mgmt: 'emboli-paru', rhythm: 'sinus-tachy', p: 'normal', st: 'normal', t: 'inversi', confusers: ['ischemic-twi', 'wellens-b', 'rvh'] }),
    d({ key: 'hcm', label: 'Kardiomiopati hipertrofik', category: 'lain', level: 'lanjut', competency: 'konduksi', findings: ['Gelombang Q dalam & sempit ("dagger") di lateral/inferior', 'Voltase LVH, T inversi'], explanation: 'Penyebab kematian mendadak pada usia muda/atlet. Ekokardiografi dan skrining keluarga.', mgmt: 'rujuk-elektif', rhythm: 'sinus', p: 'normal', st: 'normal', t: 'inversi', confusers: ['old-mi-inferior', 'lvh-strain'] }),
  ].map((x) => [x.key, x]),
);

export function dxInfo(key: string): DxInfo {
  const x = DIAGNOSES[key];
  if (!x) throw new Error(`Diagnosis tidak dikenal: ${key}`);
  return x;
}
