# Review Klinis — Simulator EKG 12-Lead

Dokumen ini untuk **dokter pemeriksa (Anda)**. Semua kriteria & ambang klinis yang dipakai
simulator tersimpan di **satu berkas saja**: `src/clinical/ecg-criteria.ts`. Tabel di bawah dibuat
otomatis dari berkas tersebut (`npm run docs:clinical`), jadi isinya selalu sama dengan yang
dipakai aplikasi untuk menilai jawaban, menyeleksi EKG nyata, dan menguji EKG sintetis.

## Cara membaca status

| Status | Arti | Yang perlu Anda lakukan |
|---|---|---|
| ✅ terverifikasi | Dicocokkan langsung dengan **teks** sumber primer saat penyusunan: ESC 2023 ACS (teks lengkap, academic.oup.com), UDMI-4 (teks lengkap EHJ), dan **PNPK Tata Laksana SKA 2026** (KMK HK.01.07/MENKES/876/2026). | Cek cepat. |
| ⚠️ VERIFY | Teks lengkap sumber primer **tidak dapat diakses** saat penyusunan (paywall/403: AHA/ACC/HRS 2009, Sgarbossa 1996, de Winter 2008, dll.) atau nilai dari literatur sekunder. Nilai ditulis dari pengetahuan atas sumber tersebut. | **Wajib dicek manual.** |
| ℹ️ asumsi-sim | Parameter simulator/penilaian (toleransi, model), **bukan** rekomendasi klinis. | Pastikan wajar. |

## Sumber yang TIDAK dapat diakses (mohon dibantu)

1. **Pedoman Tata Laksana SKA PERKI 2024** — situs inaheart.org tidak memuat daftar pedoman
   (halaman kosong/404). Simulator memakai **PNPK SKA 2026** (Kemenkes) yang menyatakan bersumber
   dari PERKI 2024 + ESC 2023.
2. **2025 ACC/AHA/ACEP/NAEMSP/SCAI ACS Guideline** — sitasi terverifikasi di PubMed (PMID 40014670,
   doi:10.1161/CIR.0000000000001309), tetapi teks lengkap di ahajournals.org/jacc.org ditolak (403).
   Ambang EKG yang dipakai identik dengan UDMI-4/ESC 2023; mohon cek bila ACC/AHA 2025 berbeda.
3. **AHA/ACCF/HRS 2009 Part III–VI** (kriteria konduksi, QT, hipertrofi, iskemia) — sitasi
   terverifikasi di PubMed, teks lengkap 403.
4. Pedoman PERKI terkait aritmia/EKG lain — tidak ditemukan versi daring.

## Perbedaan antar-sumber — perlu keputusan Anda

| Topik | Yang dipakai simulator | Sumber lain |
|---|---|---|
| Elevasi ST V3R/V4R | **≥0,5 mm (≥1 mm pria <30 th)** — UDMI-4 (teks) | PNPK 2026 menulis "Elevasi segmen ST ≥1 mV di V1 dan V4R" — tampaknya salah ketik (mV vs mm). |
| Depresi ST iskemik | **≥0,5 mm horizontal/downsloping pada 2 sadapan berdekatan** (UDMI-4 = PNPK Tabel 3) | PNPK 2026 juga menulis "≥0,05 mV di V1–V3 dan ≥0,1 mV di sadapan lainnya". Simulator menyimpan keduanya (`ST_DEPRESSION`); penilaian memakai UDMI-4. |
| Elevasi aVR + depresi difus | Depresi ≥1 mm di **≥6** sadapan + elevasi aVR/V1 (ESC 2023 teks) | AHA 2009 Part VI menyebut ≥8 sadapan. |
| Batas bradikardia | <60/menit | Sebagian pernyataan AHA mengusulkan <50/menit. |
| QTc | Bazett untuk penilaian (paling dikenal); Fridericia ditampilkan | Fridericia lebih akurat pada takikardia. |

## Cara meninjau kasus (Mode Reviewer)

Buka `https://zakyalifp.github.io/simulator-ekg/#/reviewer` (tidak ada di menu). Kasus
**sintetis tampil paling atas**. Untuk setiap kasus klik **Lihat EKG**, nilai gambar + anotasi +
penjelasan + tata laksana yang dianggap benar, lalu tekan **✓ Setuju** / **✗ Tidak setuju** dan
tulis catatan bila perlu. Tekan **Ekspor JSON** dan kirim berkasnya ke pengembang. Galeri semua
pola sintetis juga tersedia di `#/galeri?hal=1`.

## Bagaimana akurasi EKG sintetis dijaga

- Model dipol/vektorkardiogram 3D diproyeksikan ke 12 sadapan dengan matriks Dower; sadapan
  III/aVR/aVL/aVF selalu diturunkan dari I & II (hukum Einthoven terpenuhi persis).
- Arah vektor arus injuri (ST) dan T per teritori koroner dipilih sesuai PNPK Tabel 4
  (V1–V4 anterior; I, aVL, V5–V6 lateral; II, III, aVF inferior; V7–V9 posterior; V3R–V4R RV).
- **Setiap** kasus sintetis diuji otomatis terhadap kriterianya (`src/cases/synthetic.test.ts`):
  mis. STEMI harus memenuhi ambang UDMI-4 pada ≥2 sadapan berdekatan; posterior: elevasi V7–V9
  + depresi V1–V3; aVR: depresi ≥1 mm di ≥6 sadapan; de Winter: depresi titik J 1–3 mm V1–V6
  tanpa elevasi; Brugada: coved ≥2 mm + T negatif; Sgarbossa-Smith positif; TCA: QRS ≥100 ms
  + R aVR ≥3 mm; hiperkalemia bertahap; QTc hipo/hiperkalsemia, dst.
- Komponen non-dipolar lokal hanya dipakai untuk Brugada (medan dekat RVOT di V1–V2).
- Keterbatasan model: tidak ada variasi morfologi antar-denyut selain respirasi/alternans;
  amplitudo sadapan kanan/posterior adalah ekstrapolasi model.

## Bagaimana EKG nyata diseleksi

Lihat `tools/ecg-pipeline/README.md`. Ringkas: PTB-XL dengan label divalidasi manusia,
likelihood 100, tanpa catatan noise/drift/elektroda, pengukuran GE 12SL (PTB-XL+) konsisten
dengan kriteria (STEMI nyata diverifikasi ulang terhadap ambang UDMI-4 oleh
`scripts/validate-cases.ts` di CI), lolos cek kualitas sinyal. Chapman: label dokter + validasi
dokter kedua. Catatan: pada PTB-XL, "STEMI" diturunkan dari label infark (ASMI/IMI/LMI…)
**stadium I** + elevasi ST terukur memenuhi kriteria — mohon dicek di Mode Reviewer.

## Daftar periksa reviewer

- [ ] Ambang elevasi ST, depresi ST, posterior, V4R (bagian ✅) sesuai praktik Anda
- [ ] Semua baris ⚠️ VERIFY di tabel di bawah sudah dicek dengan sumber asli
- [ ] Teks tata laksana awal (`src/cases/diagnoses.ts`, `MGMT_LABEL`) sesuai PNPK/PERKI
- [ ] Dosis di vinyet Kasus Klinis (`src/cases/clinical.ts`) sesuai protokol setempat
- [ ] Semua kasus **sintetis** di Mode Reviewer ditandai Setuju/Tidak setuju
- [ ] Sampel kasus **nyata** per kategori (terutama STEMI, NSTEMI, aneurisma, LVH strain) dicek
- [ ] Keputusan untuk tabel "Perbedaan antar-sumber"

## Tabel kriteria (dibuat otomatis)

<!-- TABEL-OTOMATIS:MULAI -->
Ringkasan: 17 terverifikasi · 41 VERIFY · 3 asumsi-sim.

| # | Parameter | Nilai di simulator | Sumber | Status | Kunci di `ecg-criteria.ts` | Dicek |
|---|---|---|---|---|---|---|
| 1 | Kertas standar | 25 mm/s, 10 mm/mV; opsi 50 mm/s, 5/20 mm/mV | KLIGFIELD07 | ⚠️ VERIFY | `PAPER.SPEED/GAIN` | ☐ |
| 2 | Bradikardia/takikardia sinus | <60 / >100 per menit | Konvensi; AHA 2007 (Mason) menyebut opsi 50/menit | ⚠️ VERIFY | `RATE.BRADY/TACHY` | ☐ |
| 3 | Laju khas SVT | 150–250/menit | ESC19SVT | ⚠️ VERIFY | `RATE.SVT_TYPICAL` | ☐ |
| 4 | Laju atrium flutter | 240–350/menit | ESC19SVT | ⚠️ VERIFY | `RATE.FLUTTER_ATRIAL` | ☐ |
| 5 | AIVR | 50–110/menit | Literatur elektrokardiografi | ⚠️ VERIFY | `RATE.AIVR` | ☐ |
| 6 | Irama lolos junctional | 40–60/menit | Literatur elektrokardiografi | ⚠️ VERIFY | `RATE.JUNCTIONAL_ESCAPE` | ☐ |
| 7 | PR normal | 120–200 ms; >200 = AV blok derajat 1 | SURAWICZ09, KUSUMOTO18 | ⚠️ VERIFY | `INTERVALS.PR` | ☐ |
| 8 | QRS | normal ≤110 ms; ≥120 ms = BBB komplet; 110–119 inkomplet | SURAWICZ09 | ⚠️ VERIFY | `INTERVALS.QRS` | ☐ |
| 9 | QTc memanjang | ≥450 ms (pria), ≥460 ms (wanita); ≤390 ms pendek | RAUTAHARJU09 | ⚠️ VERIFY | `QT.PROLONGED` | ☐ |
| 10 | QTc risiko tinggi TdP | >500 ms | DREW10 | ⚠️ VERIFY | `QT.HIGH_RISK_MS` | ☐ |
| 11 | Rumus QTc | Bazett QT/√RR; Fridericia QT/∛RR (RR dalam detik) | BAZETT20, FRIDERICIA20 | ✅ terverifikasi | `qtcBazett/qtcFridericia` | ☐ |
| 12 | Aksis normal | −30° s.d. +90°; < −30° kiri; > +90° kanan; −90° s.d. ±180° ekstrem | KLIGFIELD07 / Mason 2007 | ⚠️ VERIFY | `AXIS.NORMAL` | ☐ |
| 13 | Elevasi ST V2–V3 | Pria ≥40 th ≥2 mm; pria <40 th ≥2,5 mm; wanita ≥1,5 mm | ESC23 (teks), PNPK26 Tabel 3, UDMI4 | ✅ terverifikasi | `ST_ELEVATION.V2V3` | ☐ |
| 14 | Elevasi ST sadapan lain | ≥1 mm pada ≥2 sadapan berdekatan (tanpa LVH/LBBB) | ESC23, PNPK26, UDMI4 | ✅ terverifikasi | `ST_ELEVATION.OTHER_LEADS_MM` | ☐ |
| 15 | Elevasi ST V7–V9 | ≥0,5 mm; ≥1 mm pada pria <40 th | UDMI4 (teks) | ✅ terverifikasi | `ST_ELEVATION.POSTERIOR` | ☐ |
| 16 | Elevasi ST V3R/V4R | ≥0,5 mm; ≥1 mm pada pria <30 th | UDMI4 (teks). PNPK26 menulis "≥1 mV" (kemungkinan salah ketik) | ✅ terverifikasi | `ST_ELEVATION.RIGHT_V4R` | ☐ |
| 17 | Depresi ST iskemik | Horizontal/downsloping ≥0,5 mm pada 2 sadapan berdekatan; T inversi >1 mm (R prominen/R:S >1) | PNPK26 Tabel 3, UDMI4 | ✅ terverifikasi | `ST_DEPRESSION.ISCHEMIC_MM` | ☐ |
| 18 | Depresi ST diagnostik (PNPK) | ≥0,5 mm di V1–V3, ≥1 mm sadapan lain; inversi T simetris ≥2 mm spesifik | PNPK26 (teks) | ✅ terverifikasi | `ST_DEPRESSION.PNPK` | ☐ |
| 19 | Elevasi aVR + depresi ST difus | Depresi ST ≥1 mm pada ≥6 sadapan + elevasi ST aVR dan/atau V1 → curiga LM/multivessel; triase reperfusi segera | ESC23 (teks), UDMI4 | ✅ terverifikasi | `AVR_PATTERN` | ☐ |
| 20 | Besar elevasi aVR yang dipakai | ≥1 mm | WAGNER09 | ⚠️ VERIFY | `AVR_PATTERN.STE_AVR_MM` | ☐ |
| 21 | Infark posterior | Depresi ST V1–V3 dan/atau elevasi ST V7–V9 | ESC23 (teks) | ✅ terverifikasi | `POSTERIOR_MI` | ☐ |
| 22 | T hiperakut | T menonjol & simetris di ≥2 sadapan berdekatan (tanpa ambang angka) | UDMI4 (teks) | ✅ terverifikasi | `HYPERACUTE_T` | ☐ |
| 23 | Ambang operasional T hiperakut (sintetis) | T ≥75% amplitudo QRS | Asumsi simulator | ℹ️ asumsi-sim | `HYPERACUTE_T.SIM_T_TO_QRS_RATIO` | ☐ |
| 24 | Gelombang Q patologis | V2–V3 >20 ms/QS; lain ≥30 ms & ≥1 mm di 2 sadapan sekelompok; R V1–V2 >40 ms + R/S>1 (posterior) | UDMI4 Tabel 3 (gambar) | ⚠️ VERIFY | `Q_WAVE` | ☐ |
| 25 | Lokasi infark per sadapan | V1–V4 anterior; I, aVL, V5–V6 lateral; II, III, aVF inferior; V7–V9 posterior; V3R–V4R ventrikel kanan | PNPK26 Tabel 4 | ✅ terverifikasi | `CONTIGUOUS_GROUPS` | ☐ |
| 26 | Kriteria Sgarbossa | STE konkordan ≥1 mm (5); STD konkordan V1–V3 ≥1 mm (3); STE diskordan ≥5 mm (2); skor ≥3 | SGARBOSSA96 | ⚠️ VERIFY | `SGARBOSSA` | ☐ |
| 27 | Modifikasi Smith | Rasio ST/S ≤ −0,25 menggantikan kriteria diskordan | SMITH12 | ⚠️ VERIFY | `SGARBOSSA.SMITH_RATIO` | ☐ |
| 28 | LBBB: STE konkordan | ≥1 mm di sadapan mana pun → iskemia akut | UDMI4 (teks) | ✅ terverifikasi | `SGARBOSSA.UDMI` | ☐ |
| 29 | Pola de Winter | Depresi ST upsloping 1–3 mm V1–V6 + T tinggi simetris; STE aVR 1–2 mm | DEWINTER08 | ⚠️ VERIFY | `DE_WINTER` | ☐ |
| 30 | Pola Wellens | A: T bifasik V2–V3; B: T inversi dalam simetris V2–V3; ST <1 mm, tanpa Q | DEZWAAN82 | ⚠️ VERIFY | `WELLENS` | ☐ |
| 31 | Brugada tipe 1 | STE coved ≥2 mm di ≥1 sadapan V1–V2 + T negatif | PRIORI13, ESC22VA | ⚠️ VERIFY | `BRUGADA.TYPE1_STE_MM` | ☐ |
| 32 | Repolarisasi dini | Jp ≥0,1 mV di ≥2 sadapan inferior/lateral + notch/slur | MACFARLANE15 | ⚠️ VERIFY | `EARLY_REPOL.JP_MV` | ☐ |
| 33 | Perikarditis vs repolarisasi dini | STE cekung luas + depresi PR; rasio ST/T V6 >0,25 | ADLER15; Ginzton & Laks 1982 | ⚠️ VERIFY | `PERICARDITIS.ST_T_RATIO_V6` | ☐ |
| 34 | LVH Sokolow–Lyon | SV1 + RV5/V6 ≥35 mm | SOKOLOW49, HANCOCK09 | ⚠️ VERIFY | `LVH.SOKOLOW_MM` | ☐ |
| 35 | LVH Cornell voltage | RaVL + SV3 >28 mm (pria), >20 mm (wanita) | CASALE85, HANCOCK09 | ⚠️ VERIFY | `LVH.CORNELL` | ☐ |
| 36 | LVH RaVL | >11 mm | HANCOCK09 | ⚠️ VERIFY | `LVH.RAVL_MM` | ☐ |
| 37 | RVH | R V1 ≥7 mm; R/S V1 >1; aksis kanan; S V5/V6 ≥7 mm | HANCOCK09 | ⚠️ VERIFY | `RVH` | ☐ |
| 38 | Pembesaran atrium | RAE: P II ≥2,5 mm / P V1 >1,5 mm; LAE: P ≥120 ms, terminal P V1 ≥1 mm × ≥40 ms | HANCOCK09 | ⚠️ VERIFY | `ATRIAL` | ☐ |
| 39 | Voltase rendah | QRS <5 mm semua ekstremitas dan/atau <10 mm semua prekordial | HANCOCK09 / Mason 2007 | ⚠️ VERIFY | `LOW_VOLTAGE` | ☐ |
| 40 | RBBB komplet | QRS ≥120; rsR′ V1/V2; S lebar >40 ms di I & V6; RPT V1 >50 ms | SURAWICZ09 | ⚠️ VERIFY | `CONDUCTION.RBBB` | ☐ |
| 41 | LBBB komplet | QRS ≥120; R lebar berlekuk I, aVL, V5–V6; tanpa q I/V5/V6; RPT V5–V6 >60 ms | SURAWICZ09 | ⚠️ VERIFY | `CONDUCTION.LBBB` | ☐ |
| 42 | LAFB | Aksis −45° s.d. −90°; qR aVL; RPT aVL ≥45 ms; QRS <120 | SURAWICZ09 | ⚠️ VERIFY | `CONDUCTION.LAFB` | ☐ |
| 43 | LPFB | Aksis +90° s.d. +180°; rS I & aVL; qR III & aVF; QRS <120 | SURAWICZ09 | ⚠️ VERIFY | `CONDUCTION.LPFB` | ☐ |
| 44 | AV blok | D1 PR >200; Mobitz I PR progresif; Mobitz II PR konstan + drop; 2:1 tak terklasifikasi; D3 disosiasi AV | KUSUMOTO18 | ⚠️ VERIFY | `AV_BLOCK` | ☐ |
| 45 | Algoritma Brugada (WCT) | Tanpa RS prekordial; RS >100 ms; disosiasi AV; morfologi | BRUGADA91 | ⚠️ VERIFY | `WCT.BRUGADA` | ☐ |
| 46 | Algoritma aVR Vereckei | R inisial; r/q inisial >40 ms; notch sisi turun; vi/vt ≤1 | VERECKEI08 | ⚠️ VERIFY | `WCT.VERECKEI` | ☐ |
| 47 | WCT tak jelas | Perlakukan sebagai VT | ESC22VA, ESC19SVT | ⚠️ VERIFY | `WCT.DEFAULT` | ☐ |
| 48 | Torsades de pointes | VT polimorfik twisting + QT panjang; MgSO4 1–2 g IV | DREW10, AHA25ALS | ⚠️ VERIFY | `TORSADES` | ☐ |
| 49 | Tahapan hiperkalemia | 5,5–6,5 T runcing; 6,5–8 P datar/PR↑/QRS↑; >8 sine wave (korelasi buruk) | MATTU00 | ⚠️ VERIFY | `HYPERKALEMIA.STAGES` | ☐ |
| 50 | Hipokalemia | U >1 mm, T datar, depresi ST | DIERCKS04 | ⚠️ VERIFY | `HYPOKALEMIA.U_WAVE_MM` | ☐ |
| 51 | Hipo/hiperkalsemia | Hipo: ST & QT panjang; hiper: ST & QT pendek | DIERCKS04 | ⚠️ VERIFY | `CALCIUM` | ☐ |
| 52 | Hipotermia | Gelombang Osborn, bradikardia, interval memanjang, artefak menggigil | MATTU02 | ⚠️ VERIFY | `HYPOTHERMIA` | ☐ |
| 53 | Overdosis TCA | QRS ≥100 ms (kejang), ≥160 ms (aritmia); R aVR ≥3 mm; R/S aVR ≥0,7; Na-bikarbonat 1–2 mEq/kg | BOEHNERT85, LIEBELT95 | ⚠️ VERIFY | `TCA` | ☐ |
| 54 | Digoksin | Efek: ST scooped, QT pendek; toksisitas: VT bidireksional, AT dengan blok, AV blok, PVC | MA01 | ⚠️ VERIFY | `DIGOXIN` | ☐ |
| 55 | EKG pertama | ≤10 menit sejak kontak medis pertama/kedatangan | ESC23 (teks), PNPK26 | ✅ terverifikasi | `ACS_TIMING.ECG_WITHIN_MIN` | ☐ |
| 56 | Diagnosis → IKP primer | ≤120 menit; bila lebih → fibrinolitik | ESC23 (teks), PNPK26 | ✅ terverifikasi | `ACS_TIMING.PCI_MAX_DELAY_MIN` | ☐ |
| 57 | Fibrinolitik | Mulai ≤10 menit sejak diagnosis STEMI | ESC23 (teks) | ✅ terverifikasi | `ACS_TIMING.LYSIS_WITHIN_MIN` | ☐ |
| 58 | Jendela reperfusi | Gejala ≤12 jam (atau >12 jam bila iskemia berlangsung) | ESC23, PNPK26 | ✅ terverifikasi | `ACS_TIMING.REPERFUSION_WINDOW_H` | ☐ |
| 59 | Pasca-fibrinolisis | Angiografi 2–24 jam; rescue PCI bila resolusi ST <50% dalam 60–90 menit | ESC23, PNPK26 | ✅ terverifikasi | `ACS_TIMING.POST_LYSIS` | ☐ |
| 60 | Toleransi penilaian | HR ±10% (min ±8); PR ±30; QRS ±25; QT/QTc ±40 ms; aksis ±30°; lulus 75; kesalahan kritis → skor maks. 59 | Asumsi simulator | ℹ️ asumsi-sim | `SCORING` | ☐ |
| 61 | Model sintetis: proyeksi VCG → 12 sadapan | Matriks Dower (1980); sadapan V3R–V5R/V7–V9 = ekstrapolasi model | Dower GE, et al. 1980; Sameni R, et al. 2007 (model dinamis 3D) | ℹ️ asumsi-sim | `SYNTH.DOWER` | ☐ |
<!-- TABEL-OTOMATIS:SELESAI -->

## Kunci sumber

<!-- SUMBER-OTOMATIS:MULAI -->
- **UDMI4** — Thygesen K, Alpert JS, Jaffe AS, et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237–269. doi:10.1093/eurheartj/ehy462 (juga Circulation 2018;138:e618–e651, doi:10.1161/CIR.0000000000000617).
- **ESC23** — Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720–3826. doi:10.1093/eurheartj/ehad191.
- **ACCAHA25** — Rao SV, O’Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. Circulation 2025;151:e771–e862. doi:10.1161/CIR.0000000000001309 (JACC 2025;85:2135–2237).
- **PNPK26** — Keputusan Menteri Kesehatan RI No. HK.01.07/MENKES/876/2026 tentang Pedoman Nasional Pelayanan Klinis Tata Laksana Sindrom Koroner Akut (bersumber Pedoman Tata Laksana SKA PERKI 2024 dan ESC 2023).
- **PERKI24** — Perhimpunan Dokter Spesialis Kardiovaskular Indonesia (PERKI). Pedoman Tata Laksana Sindrom Koroner Akut, 2024 (dokumen asli tidak dapat diakses; dirujuk melalui PNPK26).
- **KLIGFIELD07** — Kligfield P, Gettes LS, Bailey JJ, et al. Recommendations for the standardization and interpretation of the electrocardiogram: Part I. Circulation 2007;115:1306–1324.
- **SURAWICZ09** — Surawicz B, Childers R, Deal BJ, et al. AHA/ACCF/HRS recommendations … Part III: intraventricular conduction disturbances. Circulation 2009;119:e235–e240. doi:10.1161/CIRCULATIONAHA.108.191095.
- **RAUTAHARJU09** — Rautaharju PM, Surawicz B, Gettes LS, et al. AHA/ACCF/HRS recommendations … Part IV: the ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241–e250. doi:10.1161/CIRCULATIONAHA.108.191096.
- **HANCOCK09** — Hancock EW, Deal BJ, Mirvis DM, et al. AHA/ACCF/HRS recommendations … Part V: chamber hypertrophy. Circulation 2009;119:e251–e261. doi:10.1161/CIRCULATIONAHA.108.191097.
- **WAGNER09** — Wagner GS, Macfarlane P, Wellens H, et al. AHA/ACCF/HRS recommendations … Part VI: acute ischemia/infarction. Circulation 2009;119:e262–e270. doi:10.1161/CIRCULATIONAHA.108.191098.
- **KUSUMOTO18** — Kusumoto FM, Schoenfeld MH, Barrett C, et al. 2018 ACC/AHA/HRS Guideline on the Evaluation and Management of Patients With Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382–e482.
- **ESC19SVT** — Brugada J, Katritsis DG, Arbelo E, et al. 2019 ESC Guidelines for the management of patients with supraventricular tachycardia. Eur Heart J 2020;41:655–720.
- **ESC22VA** — Zeppenfeld K, Tfelt-Hansen J, de Riva M, et al. 2022 ESC Guidelines for the management of patients with ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997–4126.
- **ESC24AF** — Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314–3414.
- **AHA25ALS** — AHA Guidelines for CPR & ECC 2025, Part 9: Adult Advanced Life Support (dipakai juga oleh Simulator ACLS di repo ini).
- **SGARBOSSA96** — Sgarbossa EB, Pinski SL, Barbagelata A, et al. Electrocardiographic diagnosis of evolving acute myocardial infarction in the presence of left bundle-branch block. N Engl J Med 1996;334:481–487.
- **SMITH12** — Smith SW, Dodd KW, Henry TD, et al. Diagnosis of ST-elevation myocardial infarction in the presence of left bundle branch block with the ST-elevation to S-wave ratio in a modified Sgarbossa rule. Ann Emerg Med 2012;60:766–776.
- **DEWINTER08** — de Winter RJ, Verouden NJ, Wellens HJ, Wilde AA. A new ECG sign of proximal LAD occlusion. N Engl J Med 2008;359:2071–2073.
- **DEZWAAN82** — de Zwaan C, Bär FW, Wellens HJ. Characteristic electrocardiographic pattern indicating a critical stenosis high in left anterior descending coronary artery in patients admitted because of impending myocardial infarction. Am Heart J 1982;103:730–736.
- **BRUGADA91** — Brugada P, Brugada J, Mont L, et al. A new approach to the differential diagnosis of a regular tachycardia with a wide QRS complex. Circulation 1991;83:1649–1659.
- **VERECKEI08** — Vereckei A, Duray G, Szénási G, et al. New algorithm using only lead aVR for differential diagnosis of wide QRS complex tachycardia. Heart Rhythm 2008;5:89–98.
- **PRIORI13** — Priori SG, Wilde AA, Horie M, et al. HRS/EHRA/APHRS expert consensus statement on the diagnosis and management of patients with inherited primary arrhythmia syndromes. Heart Rhythm 2013;10:1932–1963.
- **MACFARLANE15** — Macfarlane PW, Antzelevitch C, Haissaguerre M, et al. The Early Repolarization Pattern: A Consensus Paper. J Am Coll Cardiol 2015;66:470–477.
- **ADLER15** — Adler Y, Charron P, Imazio M, et al. 2015 ESC Guidelines for the diagnosis and management of pericardial diseases. Eur Heart J 2015;36:2921–2964.
- **MATTU00** — Mattu A, Brady WJ, Robinson DA. Electrocardiographic manifestations of hyperkalemia. Am J Emerg Med 2000;18:721–729.
- **DIERCKS04** — Diercks DB, Shumaik GM, Harrigan RA, et al. Electrocardiographic manifestations: electrolyte abnormalities. J Emerg Med 2004;27:153–160.
- **MATTU02** — Mattu A, Brady WJ, Perron AD. Electrocardiographic manifestations of hypothermia. Am J Emerg Med 2002;20:314–326.
- **BOEHNERT85** — Boehnert MT, Lovejoy FH Jr. Value of the QRS duration versus the serum drug level in predicting seizures and ventricular arrhythmias after an acute overdose of tricyclic antidepressants. N Engl J Med 1985;313:474–479.
- **LIEBELT95** — Liebelt EL, Francis PD, Woolf AD. ECG lead aVR versus QRS interval in predicting seizures and arrhythmias in acute tricyclic antidepressant toxicity. Ann Emerg Med 1995;26:195–201.
- **MA01** — Ma G, Brady WJ, Pollack M, Chan TC. Electrocardiographic manifestations: digitalis toxicity. J Emerg Med 2001;20:145–152.
- **SOKOLOW49** — Sokolow M, Lyon TP. The ventricular complex in left ventricular hypertrophy as obtained by unipolar precordial and limb leads. Am Heart J 1949;37:161–186.
- **CASALE85** — Casale PN, Devereux RB, Kligfield P, et al. Electrocardiographic detection of left ventricular hypertrophy: development and prospective validation of improved criteria. J Am Coll Cardiol 1985;6:572–580.
- **BAZETT20** — Bazett HC. An analysis of the time-relations of electrocardiograms. Heart 1920;7:353–370.
- **FRIDERICIA20** — Fridericia LS. Die Systolendauer im Elektrokardiogramm bei normalen Menschen und bei Herzkranken. Acta Med Scand 1920;53:469–486.
- **DREW10** — Drew BJ, Ackerman MJ, Funk M, et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047–1060.
<!-- SUMBER-OTOMATIS:SELESAI -->
