# Review Klinis — Simulator EKG 12-Lead

Dokumen ini untuk **dokter pemeriksa (Anda)**. Semua kriteria & ambang klinis yang dipakai
simulator tersimpan di **satu berkas saja**: `src/clinical/ecg-criteria.ts`. Tabel di bawah dibuat
otomatis dari berkas tersebut (`npm run docs:clinical`), jadi isinya selalu sama dengan yang
dipakai aplikasi untuk menilai jawaban, menyeleksi EKG nyata, dan menguji EKG sintetis.

## Cara membaca status

| Status | Arti | Yang perlu Anda lakukan |
|---|---|---|
| ✅ terverifikasi | Dicocokkan langsung dengan **teks** sumber primer: ESC 2023 ACS, UDMI-4, **PNPK Tata Laksana SKA 2026** (KMK HK.01.07/MENKES/876/2026), **PERKI 2024 SKA** (foto halaman yang Anda kirim), serta PDF lengkap yang Anda unggah — **AHA/ACCF/HRS 2009 Part III (Surawicz), IV (Rautaharju), V (Hancock), VI (Wagner)** dan **ACC/AHA 2025 SKA (Rao)**. Kutipan dicantumkan di komentar `ecg-criteria.ts`. | Cek cepat. |
| ⚠️ VERIFY | Teks lengkap sumber primer **belum** dicek (Kligfield/Mason 2007 Part I–II, Kusumoto 2018, Sgarbossa 1996, de Winter 2008, de Zwaan 1982, Brugada 1991, Vereckei 2008, Priori 2013, Mattu, Diercks, dll.) atau nilai dari literatur sekunder. | **Wajib dicek manual.** |
| ℹ️ asumsi-sim | Parameter simulator/penilaian (toleransi, model, konvensi pengajaran), **bukan** rekomendasi klinis. | Pastikan wajar. |

## Sumber yang belum dicek langsung (mohon dibantu)

1. **PERKI 2024 SKA — bab lain** (mis. 2.3–2.6 antitrombotik SKA-NEST, 4.x populasi khusus) belum
   dicek; bab yang dipakai simulator sudah (lihat di bawah).
2. **AHA/ACC/HRS 2007 Part I–II** (Kligfield, Mason) — standar kertas/kalibrasi dan voltase rendah.
3. **ACC/AHA/HRS 2018 bradikardia (Kusumoto)** — PR >200 ms, klasifikasi AV blok.
4. Artikel orisinal pola khusus (Sgarbossa, de Winter, de Zwaan/Wellens, Brugada, Vereckei, dll.).

Sudah diterima & dipakai (terima kasih): ACC/AHA 2025 SKA; AHA/ACCF/HRS 2009 Part III, IV, V, VI;
**PERKI 2024 SKA** Bab 1.5.2.1 (Tabel 1.2–1.3, Gambar 1.3–1.4), 1.6–1.7, 2.1 (GRACE, strategi
invasif), 3.2–3.3 (reperfusi, Tabel 3.1–3.2 dosis, Tabel Rekomendasi 9–10), 3.6.2 (aritmia).

## Perbedaan antar-sumber — perlu keputusan Anda

| Topik | Yang dipakai simulator | Sumber lain |
|---|---|---|
| LBBB/irama pacu/RBBB | **Sejalan, tidak ada konflik:** PERKI 2024 Gambar 1.3 (= ESC 2023) — dengan kecurigaan klinis tinggi infark → tangani seperti IMA-EST, reperfusi **mekanik** (IKPP). ACC/AHA 2025 — LBBB baru saja tidak diagnostik dan bukan ekuivalen STEMI pada pasien asimtomatik. Simulator: LBBB tanpa iskemia → evaluasi elektif; Sgarbossa/Smith positif → "Reperfusi mekanik segera". | PNPK 2026 hanya menyebut "LBBB baru" sebagai indikasi reperfusi tanpa syarat klinis; PERKI 2024 hal. 55 menulis "gambaran EKG LBBB" dalam konteks pasien dengan gejala ≤12 jam. |
| **De Winter & pola aVR** | Tata laksana "**Reperfusi mekanik segera**" (angiografi/IKP), **bukan** fibrinolitik | PERKI 2024 menempatkan de Winter & Wellens di Gambar 1.4 (SKA-NEST) dengan interpretasi "stenosis berat/oklusi LAD proksimal"; pola aVR di Gambar 1.3 dengan catatan "reperfusi secara mekanik (IKPP)". ACC/AHA 2025: jangan fibrinolitik bila hanya depresi ST. Jawaban "Aktivasi alur STEMI" diberi nilai parsial (bukan kesalahan kritis). |
| Fibrinolitik | ≤**30 menit sejak kontak medis pertama** (PERKI 2024 Tabel Rek. 9) | ESC 2023: ≤10 menit sejak diagnosis (diagnosis sendiri ≤10 menit sejak KMP). Keduanya ditampilkan. |
| Waktu reperfusi | Ditampilkan keduanya: ≤120 menit **dari diagnosis** (ESC 2023/PNPK) dan ≤90 menit **dari kontak medis pertama** / ≤120 menit bila dirujuk (ACC/AHA 2025) | Titik awal berbeda (diagnosis vs FMC). |
| Elevasi ST V3R/V4R | Penilaian: **≥0,5 mm (≥1 mm pria <30 th)** — UDMI-4 & AHA 2009 Part VI. **Semua kasus sintetis dibuat ≥1 mm** sehingga juga memenuhi PERKI (diuji otomatis). | PERKI 2024 Gambar 1.3 memasukkan V3R/V4R ke ambang "1 mm pada sadapan lainnya"; PNPK 2026 menulis "≥1 mV" (salah ketik mm). |
| Salah ketik di PERKI 2024 | Simulator memakai angka yang benar | Gambar 1.4: "depresi ≥0,05 **mm** pada V2 dan V3" — seharusnya 0,05 mV (0,5 mm), sesuai teks hal. 11 dan Tabel 1.2. |
| Elevasi ST V7–V9 | ≥0,5 mm; **≥1 mm pria <40 th** (UDMI-4) | AHA 2009 Part VI: 0,5 mm untuk semua umur. |
| Depresi ST iskemik | **≥0,5 mm horizontal/downsloping pada 2 sadapan berdekatan** (UDMI-4 = PNPK Tabel 3 = ACC/AHA 2025 Tabel 3) | PNPK 2026 & AHA 2009 Part VI: ≥0,5 mm di V1–V3 (AHA: V2–V3) dan ≥1 mm di sadapan lain. Simulator menyimpan keduanya (`ST_DEPRESSION`); penilaian memakai UDMI-4. |
| Elevasi aVR + depresi difus | Depresi ≥1 mm di **≥6** sadapan + elevasi aVR/V1 (ESC 2023 teks) | AHA 2009 Part VI: ≥8 sadapan. Besar elevasi aVR tidak diberi angka oleh keduanya (simulator: ≥1 mm, asumsi). |
| Sokolow–Lyon | **>35 mm** (AHA 2009 Part V Tabel 1) | Banyak buku ajar menulis ≥35 mm. |
| RVH | AHA 2009 Part V Tabel 2: R V1 >6 mm, R/S V1 >1, S V5 >10 mm, S V6 >3 mm, RV1+SV5/6 >10,5 mm | Versi lama simulator memakai R V1 ≥7 mm (sudah diganti). |
| Istilah | "Abnormalitas atrium", "abnormalitas ST-T sekunder" (bukan "strain"), "RBBB + LAFB" (bukan "bifasikular") — AHA 2009 Part III & V | Istilah lama masih dicantumkan dalam kurung agar mudah dikenali. |
| Batas bradikardia | <60/menit | Sebagian pernyataan AHA mengusulkan <50/menit. |
| QTc | Bazett untuk penilaian (paling dikenal); Fridericia ditampilkan; **tidak dinilai pada FA/MAT** | AHA 2009 Part IV menganjurkan rumus regresi linear dan tidak mengoreksi QT bila RR sangat bervariasi. |
| Aksis ekstrem | −90° s.d. ±180° ("northwest") sebagai kategori pengajaran | AHA 2009 Part III tidak mendefinisikan kuadran ini untuk dewasa (hanya deviasi kiri/kanan sedang & berat). |

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
  + R aVR ≥3 mm; Wellens B: inversi T >5 mm di V2–V4 + QTc memanjang (AHA 2009 Part VI);
  hiperkalemia bertahap; QTc hipo/hiperkalsemia, dst.
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
- [ ] Sampel kasus **nyata** per kategori (terutama STEMI, NSTEMI, aneurisma, LVH dengan ST-T sekunder) dicek
- [ ] Keputusan untuk tabel "Perbedaan antar-sumber"

## Tabel kriteria (dibuat otomatis)

<!-- TABEL-OTOMATIS:MULAI -->
Ringkasan: 41 terverifikasi · 26 VERIFY · 5 asumsi-sim.

| # | Parameter | Nilai di simulator | Sumber | Status | Kunci di `ecg-criteria.ts` | Dicek |
|---|---|---|---|---|---|---|
| 1 | Kertas standar | 25 mm/s, 10 mm/mV; opsi 50 mm/s, 5/20 mm/mV | KLIGFIELD07 | ⚠️ VERIFY | `PAPER.SPEED/GAIN` | ☐ |
| 2 | Bradikardia/takikardia sinus | <60 / >100 per menit | Konvensi; AHA 2007 (Mason) menyebut opsi 50/menit | ⚠️ VERIFY | `RATE.BRADY/TACHY` | ☐ |
| 3 | Laju khas SVT | 150–250/menit | ESC19SVT | ⚠️ VERIFY | `RATE.SVT_TYPICAL` | ☐ |
| 4 | Laju atrium flutter | 240–350/menit | ESC19SVT | ⚠️ VERIFY | `RATE.FLUTTER_ATRIAL` | ☐ |
| 5 | AIVR | <120/menit, akibat reperfusi, biasanya jinak (simulator 50–110) | PERKI24 §3.6.2.2 | ✅ terverifikasi | `RATE.AIVR` | ☐ |
| 6 | Irama lolos junctional | 40–60/menit | Literatur elektrokardiografi | ⚠️ VERIFY | `RATE.JUNCTIONAL_ESCAPE` | ☐ |
| 7 | PR normal | 120–200 ms; >200 = AV blok derajat 1; <120 + delta = pre-eksitasi | KUSUMOTO18 (batas 200 ms); SURAWICZ09 (PR <120 ms pada WPW, terverifikasi) | ⚠️ VERIFY | `INTERVALS.PR` | ☐ |
| 8 | QRS | normal ≤110 ms; >110 IVCD; ≥120 ms BBB komplet; 110–120 inkomplet | SURAWICZ09 | ✅ terverifikasi | `INTERVALS.QRS` | ☐ |
| 9 | QTc memanjang | ≥450 ms (pria), ≥460 ms (wanita); ≤390 ms pendek; jangan koreksi QT bila RR sangat bervariasi (FA) | RAUTAHARJU09 | ✅ terverifikasi | `QT.PROLONGED` | ☐ |
| 10 | QTc pada FA/MAT | Tidak dinilai di simulator (koreksi tidak valid bila RR sangat bervariasi) | RAUTAHARJU09 | ✅ terverifikasi | `QT.NO_CORRECTION_IRREGULAR` | ☐ |
| 11 | QTc risiko tinggi TdP | >500 ms | DREW10 | ⚠️ VERIFY | `QT.HIGH_RISK_MS` | ☐ |
| 12 | Rumus QTc | Bazett QT/√RR; Fridericia QT/∛RR (RR dalam detik) | BAZETT20, FRIDERICIA20 | ✅ terverifikasi | `qtcBazett/qtcFridericia` | ☐ |
| 13 | Aksis | Normal −30° s.d. +90°; LAD sedang −30…−45°, berat −45…−90°; RAD sedang 90…120°, berat 120…180° | SURAWICZ09 | ✅ terverifikasi | `AXIS.NORMAL` | ☐ |
| 14 | Aksis ekstrem ("northwest") | −90° s.d. ±180° (konvensi pengajaran; tidak didefinisikan untuk dewasa di SURAWICZ09) | Konvensi | ℹ️ asumsi-sim | `AXIS.EXTREME` | ☐ |
| 15 | Elevasi ST V2–V3 | Pria ≥40 th ≥2 mm; pria <40 th ≥2,5 mm; wanita ≥1,5 mm | PERKI24 Tabel 1.2, ESC23, PNPK26, UDMI4, WAGNER09, ACCAHA25 | ✅ terverifikasi | `ST_ELEVATION.V2V3` | ☐ |
| 16 | Elevasi ST sadapan lain | ≥1 mm pada ≥2 sadapan berdekatan (tanpa LVH/LBBB) | PERKI24 Tabel 1.2, ESC23, PNPK26, UDMI4, WAGNER09, ACCAHA25 | ✅ terverifikasi | `ST_ELEVATION.OTHER_LEADS_MM` | ☐ |
| 17 | Elevasi ST V7–V9 | ≥0,5 mm; ≥1 mm pada pria <40 th | UDMI4 (teks); WAGNER09 0,5 mm semua umur | ✅ terverifikasi | `ST_ELEVATION.POSTERIOR` | ☐ |
| 18 | Elevasi ST V3R/V4R | ≥0,5 mm; ≥1 mm pada pria <30 th (kasus sintetis dibuat ≥1 mm agar juga memenuhi PERKI) | UDMI4, WAGNER09. PERKI24 Gambar 1.3: V3R/V4R ikut ambang 1 mm; PNPK26 "≥1 mV" (salah ketik) | ✅ terverifikasi | `ST_ELEVATION.RIGHT_V4R` | ☐ |
| 19 | Depresi ST iskemik | Horizontal/downsloping ≥0,5 mm pada 2 sadapan berdekatan; T inversi >1 mm (R prominen/R:S >1); STD terisolasi ≥0,5 mm V1–V3 → rekam V7–V9 | PERKI24 Tabel 1.2, PNPK26, UDMI4, ACCAHA25 Tabel 3 | ✅ terverifikasi | `ST_DEPRESSION.ISCHEMIC_MM` | ☐ |
| 20 | Depresi ST diagnostik | ≥0,5 mm di V1–V3 (AHA: V2–V3), ≥1 mm sadapan lain; inversi T simetris ≥2 mm spesifik; T inversi >1 mm di ≥5 sadapan = prognosis | PERKI24 hal. 11 & Gambar 1.4, PNPK26, WAGNER09 | ✅ terverifikasi | `ST_DEPRESSION.PNPK` | ☐ |
| 21 | Elevasi aVR + depresi ST difus | Depresi ST ≥1 mm pada ≥6 sadapan (WAGNER09: ≥8) + elevasi ST aVR dan/atau V1 → LM/multivessel; reperfusi mekanik (IKPP) segera | PERKI24 Gambar 1.3, ESC23, UDMI4, WAGNER09 | ✅ terverifikasi | `AVR_PATTERN` | ☐ |
| 22 | Besar elevasi aVR yang dipakai | ≥1 mm (tidak diberi angka oleh ESC23/WAGNER09) | Asumsi simulator | ℹ️ asumsi-sim | `AVR_PATTERN.STE_AVR_MM` | ☐ |
| 23 | Infark posterior | Depresi ST V1–V3 dan/atau elevasi ST V7–V9 | ESC23 (teks) | ✅ terverifikasi | `POSTERIOR_MI` | ☐ |
| 24 | T hiperakut | T menonjol & simetris di ≥2 sadapan berdekatan (tanpa ambang angka) | UDMI4 (teks) | ✅ terverifikasi | `HYPERACUTE_T` | ☐ |
| 25 | Ambang operasional T hiperakut (sintetis) | T ≥75% amplitudo QRS | Asumsi simulator | ℹ️ asumsi-sim | `HYPERACUTE_T.SIM_T_TO_QRS_RATIO` | ☐ |
| 26 | Batas atas normal T V2 | Pria 1,0–1,4 mV (≤1,6 mV usia 18–29 th); wanita 0,7–1,0 mV | RAUTAHARJU09 | ✅ terverifikasi | `HYPERACUTE_T.V2_UPPER` | ☐ |
| 27 | Deskriptor gelombang T | Inversi −0,1…−0,5 mV; dalam −0,5…−1,0 mV; raksasa < −1,0 mV; rendah <10% R; datar ±0,1 mV | RAUTAHARJU09 | ✅ terverifikasi | `T_WAVE` | ☐ |
| 28 | Gelombang Q patologis | V2–V3 >20 ms/QS; lain ≥30 ms & ≥1 mm di 2 sadapan sekelompok; R V1–V2 >40 ms + R/S>1 (posterior) | UDMI4 Tabel 3 (gambar) | ⚠️ VERIFY | `Q_WAVE` | ☐ |
| 29 | Lokasi infark per sadapan | V1–V4 anterior; I, aVL, V5–V6 lateral; II, III, aVF inferior; V7–V9 posterior; V3R–V4R ventrikel kanan | PERKI24 Tabel 1.3, PNPK26 Tabel 4 | ✅ terverifikasi | `CONTIGUOUS_GROUPS` | ☐ |
| 30 | Kriteria Sgarbossa | STE konkordan ≥1 mm (5); STD konkordan V1–V3 ≥1 mm (3); STE diskordan ≥5 mm (2); skor ≥3 | Ambang: WAGNER09 (terverifikasi); bobot poin: SGARBOSSA96 | ⚠️ VERIFY | `SGARBOSSA` | ☐ |
| 31 | Modifikasi Smith | Rasio ST/S ≤ −0,25 menggantikan kriteria diskordan | SMITH12 | ⚠️ VERIFY | `SGARBOSSA.SMITH_RATIO` | ☐ |
| 32 | LBBB: STE konkordan | ≥1 mm di sadapan mana pun → iskemia akut | UDMI4 (teks) | ✅ terverifikasi | `SGARBOSSA.UDMI` | ☐ |
| 33 | Pola de Winter | Depresi ST upsloping 1–3 mm di titik J V1–V6 → T tinggi, positif, simetris; stenosis berat/oklusi LAD proksimal | PERKI24 Gambar 1.4 (= ESC23) | ✅ terverifikasi | `DE_WINTER` | ☐ |
| 34 | de Winter: elevasi aVR | 1–2 mm (sebagian besar kasus) | DEWINTER08 (tidak disebut PERKI24) | ⚠️ VERIFY | `DE_WINTER.AVR_STE_MM` | ☐ |
| 35 | Pola Wellens | Titik J <1 mm + A: T bifasik V2–V3; B: T simetris sangat terbalik V2–V3 (kadang V1, V4–V6), AHA: >5 mm V2–V4 + QT memanjang | PERKI24 Gambar 1.4, WAGNER09 | ✅ terverifikasi | `WELLENS` | ☐ |
| 36 | Brugada tipe 1 | STE coved ≥2 mm di ≥1 sadapan V1–V2 + T negatif | PRIORI13, ESC22VA | ⚠️ VERIFY | `BRUGADA.TYPE1_STE_MM` | ☐ |
| 37 | Repolarisasi dini | Jp ≥0,1 mV di ≥2 sadapan inferior/lateral + notch/slur | MACFARLANE15 | ⚠️ VERIFY | `EARLY_REPOL.JP_MV` | ☐ |
| 38 | Perikarditis vs repolarisasi dini | STE cekung luas + depresi PR; rasio ST/T V6 >0,25 | ADLER15; Ginzton & Laks 1982 | ⚠️ VERIFY | `PERICARDITIS.ST_T_RATIO_V6` | ☐ |
| 39 | LVH Sokolow–Lyon | SV1 + RV5/V6 >35 mm | HANCOCK09 Tabel 1 (Sokolow 1949) | ✅ terverifikasi | `LVH.SOKOLOW_MM` | ☐ |
| 40 | LVH Cornell voltage | RaVL + SV3 >28 mm (pria), >20 mm (wanita) | HANCOCK09 Tabel 1 (Casale 1985) | ✅ terverifikasi | `LVH.CORNELL` | ☐ |
| 41 | LVH RaVL | >11 mm | HANCOCK09 Tabel 1 | ✅ terverifikasi | `LVH.RAVL_MM` | ☐ |
| 42 | RVH | R V1 >6 mm; R/S V1 >1; S V5 >10 mm; S V6 >3 mm; RV1 + SV5/6 >10,5 mm; RPT V1 >35 ms; aksis kanan | HANCOCK09 Tabel 2 | ✅ terverifikasi | `RVH` | ☐ |
| 43 | Abnormalitas atrium | Kanan: P II >2,5 mm / P awal V1–V2 ≥1,5 mm; kiri: P ≥120 ms, notch ≥40 ms, PTF V1 (≥1 mm × ≥40 ms = konvensi) | HANCOCK09 (angka PTF tidak tercantum) | ✅ terverifikasi | `ATRIAL` | ☐ |
| 44 | Voltase rendah | QRS <5 mm semua ekstremitas dan/atau <10 mm semua prekordial | HANCOCK09 / Mason 2007 | ⚠️ VERIFY | `LOW_VOLTAGE` | ☐ |
| 45 | RBBB komplet | QRS ≥120; rsR′ V1/V2; S lebar >40 ms di I & V6; RPT V1 >50 ms | SURAWICZ09 | ✅ terverifikasi | `CONDUCTION.RBBB` | ☐ |
| 46 | LBBB komplet | QRS ≥120; R lebar berlekuk I, aVL, V5–V6; tanpa q I/V5/V6; RPT V5–V6 >60 ms | SURAWICZ09 | ✅ terverifikasi | `CONDUCTION.LBBB` | ☐ |
| 47 | LBBB/pacu/RBBB & IMA | Kecurigaan klinis tinggi → tangani seperti IMA-EST dengan IKP primer; LBBB baru saja (asimtomatik) bukan ekuivalen STEMI | PERKI24 Gambar 1.3 (= ESC23), ACCAHA25 Tabel 3, UDMI4 | ✅ terverifikasi | `CONDUCTION.LBBB_NEW` | ☐ |
| 48 | LAFB | Aksis −45° s.d. −90°; qR aVL; RPT aVL ≥45 ms; QRS <120 | SURAWICZ09 | ✅ terverifikasi | `CONDUCTION.LAFB` | ☐ |
| 49 | LPFB | Aksis +90° s.d. +180°; rS I & aVL; qR III & aVF; QRS <120; istilah "bifasikular" tidak dianjurkan | SURAWICZ09 | ✅ terverifikasi | `CONDUCTION.LPFB` | ☐ |
| 50 | AV blok | D1 PR >200; Mobitz I PR progresif; Mobitz II PR konstan + drop; 2:1 tak terklasifikasi; D3 disosiasi AV | KUSUMOTO18 | ⚠️ VERIFY | `AV_BLOCK` | ☐ |
| 51 | Algoritma Brugada (WCT) | Tanpa RS prekordial; RS >100 ms; disosiasi AV; morfologi | BRUGADA91 | ⚠️ VERIFY | `WCT.BRUGADA` | ☐ |
| 52 | Algoritma aVR Vereckei | R inisial; r/q inisial >40 ms; notch sisi turun; vi/vt ≤1 | VERECKEI08 | ⚠️ VERIFY | `WCT.VERECKEI` | ☐ |
| 53 | WCT tak jelas | Perlakukan sebagai VT | ESC22VA, ESC19SVT | ⚠️ VERIFY | `WCT.DEFAULT` | ☐ |
| 54 | Torsades de pointes | VT polimorfik twisting + QT panjang; MgSO4 1–2 g IV | DREW10, AHA25ALS | ⚠️ VERIFY | `TORSADES` | ☐ |
| 55 | Tahapan hiperkalemia | 5,5–6,5 T runcing; 6,5–8 P datar/PR↑/QRS↑; >8 sine wave (korelasi buruk) | MATTU00 | ⚠️ VERIFY | `HYPERKALEMIA.STAGES` | ☐ |
| 56 | Hipokalemia | U >1 mm, T datar, depresi ST | DIERCKS04 | ⚠️ VERIFY | `HYPOKALEMIA.U_WAVE_MM` | ☐ |
| 57 | Hipo/hiperkalsemia | Hipo: ST & QT panjang; hiper: ST & QT pendek | DIERCKS04 | ⚠️ VERIFY | `CALCIUM` | ☐ |
| 58 | Hipotermia | Gelombang Osborn, bradikardia, interval memanjang, artefak menggigil | MATTU02 | ⚠️ VERIFY | `HYPOTHERMIA` | ☐ |
| 59 | Overdosis TCA | QRS ≥100 ms (kejang), ≥160 ms (aritmia); R aVR ≥3 mm; R/S aVR ≥0,7; Na-bikarbonat 1–2 mEq/kg | BOEHNERT85, LIEBELT95 | ⚠️ VERIFY | `TCA` | ☐ |
| 60 | Digoksin | Efek: ST scooped, QT pendek; toksisitas: VT bidireksional, AT dengan blok, AV blok, PVC | MA01 | ⚠️ VERIFY | `DIGOXIN` | ☐ |
| 61 | EKG pertama | ≤10 menit sejak kontak medis pertama/kedatangan; ulang tiap angina berulang | PERKI24 §1.5.2.1, ESC23, PNPK26, ACCAHA25 (COR 1) | ✅ terverifikasi | `ACS_TIMING.ECG_WITHIN_MIN` | ☐ |
| 62 | Diagnosis → IKP primer | ≤120 menit; bila lebih → fibrinolitik | PERKI24 hal. 56 & Tabel Rek. 9, ESC23, PNPK26 | ✅ terverifikasi | `ACS_TIMING.PCI_MAX_DELAY_MIN` | ☐ |
| 63 | FMC → alat (IKP primer) | <90 menit di sentra IKP; ≤120 menit bila dirujuk; >120 menit & gejala <12 jam → fibrinolitik; 12–24 jam → rujuk IKP wajar (2a) | PERKI24 hal. 55, ACCAHA25 §5.2.1, §5.3 | ✅ terverifikasi | `ACS_TIMING.FMC_TO_DEVICE_MIN` | ☐ |
| 64 | Depresi ST saja | Jangan fibrinolitik (kecuali curiga STEMI posterior sejati) | ACCAHA25 §5.3 (3: Harm) | ✅ terverifikasi | `ACS_TIMING.NO_LYSIS_FOR_ISOLATED_STD` | ☐ |
| 65 | Fibrinolitik | ≤30 menit sejak kontak medis pertama (PERKI); ≤10 menit sejak diagnosis (ESC) | PERKI24 Tabel Rek. 9 (I A), ESC23 | ✅ terverifikasi | `ACS_TIMING.LYSIS_WITHIN_MIN` | ☐ |
| 66 | Jendela reperfusi | Gejala ≤12 jam; >12 jam → IKP bila iskemia berlangsung/instabilitas/aritmia; 12–48 jam IKP rutin dipertimbangkan (IIa); >48 jam tanpa gejala tidak (III) | PERKI24 Tabel Rek. 9, ESC23, PNPK26 | ✅ terverifikasi | `ACS_TIMING.REPERFUSION_WINDOW_H` | ☐ |
| 67 | Pasca-fibrinolisis | Rujuk segera ke sentra IKP; angiografi 2–24 jam; rescue PCI bila resolusi ST <50% dalam 60–90 menit; jangan fibrinolitik ulang | PERKI24 Tabel Rek. 10 & §3.2.2.1, ESC23, ACCAHA25 §5.3.2 | ✅ terverifikasi | `ACS_TIMING.POST_LYSIS` | ☐ |
| 68 | Reperfusi mekanik (IKPP) | LBBB/irama pacu/RBBB + kecurigaan klinis tinggi, pola aVR/multivessel; de Winter → angiografi segera (bukan fibrinolitik) | PERKI24 Gambar 1.3–1.4 (= ESC23), ACCAHA25 §5.3 | ✅ terverifikasi | `MECHANICAL_REPERFUSION_PATTERNS` | ☐ |
| 69 | Dosis fibrinolitik & ko-terapi | Streptokinase 1,5 juta U/30–60 mnt; tenekteplase 30–50 mg sesuai BB (½ dosis ≥75 th); alteplase 15 mg + 0,75 mg/kg + 0,5 mg/kg; aspirin 160–320 mg; klopidogrel 300 mg (75 mg bila >75 th); enoksaparin/UFH | PERKI24 Tabel 3.2 | ✅ terverifikasi | `LYSIS_DOSES` | ☐ |
| 70 | Stratifikasi SKA-NEST | GRACE RS ≤108 rendah, 109–140 menengah, >140 tinggi; risiko sangat tinggi → invasif segera; tinggi → invasif dini <24 jam; EKG ulang 10–20 menit bila non-diagnostik | PERKI24 §2.1, Tabel 2.2, Gambar 2.1, §1.5.2.1 | ✅ terverifikasi | `NSTE_RISK` | ☐ |
| 71 | Toleransi penilaian | HR ±10% (min ±8); PR ±30; QRS ±25; QT/QTc ±40 ms; aksis ±30°; lulus 75; kesalahan kritis → skor maks. 59 | Asumsi simulator | ℹ️ asumsi-sim | `SCORING` | ☐ |
| 72 | Model sintetis: proyeksi VCG → 12 sadapan | Matriks Dower (1980); sadapan V3R–V5R/V7–V9 = ekstrapolasi model | Dower GE, et al. 1980; Sameni R, et al. 2007 (model dinamis 3D) | ℹ️ asumsi-sim | `SYNTH.DOWER` | ☐ |
<!-- TABEL-OTOMATIS:SELESAI -->

## Kunci sumber

<!-- SUMBER-OTOMATIS:MULAI -->
- **UDMI4** — Thygesen K, Alpert JS, Jaffe AS, et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237–269. doi:10.1093/eurheartj/ehy462 (juga Circulation 2018;138:e618–e651, doi:10.1161/CIR.0000000000000617).
- **ESC23** — Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720–3826. doi:10.1093/eurheartj/ehad191.
- **ACCAHA25** — Rao SV, O’Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. Circulation 2025;151:e771–e862. doi:10.1161/CIR.0000000000001309 (JACC 2025;85:2135–2237).
- **PNPK26** — Keputusan Menteri Kesehatan RI No. HK.01.07/MENKES/876/2026 tentang Pedoman Nasional Pelayanan Klinis Tata Laksana Sindrom Koroner Akut (bersumber Pedoman Tata Laksana SKA PERKI 2024 dan ESC 2023).
- **PERKI24** — Perhimpunan Dokter Spesialis Kardiovaskular Indonesia (PERKI). Pedoman Tata Laksana Sindrom Koroner Akut, 2024. Dicek langsung dari foto halaman yang dikirim pemilik repo: Bab 1.5.2.1 (EKG, Tabel 1.2–1.3, Gambar 1.3–1.4), 1.6–1.7, 2.1 (GRACE, strategi invasif), 3.2–3.3 (reperfusi, Tabel 3.1–3.2 dosis fibrinolitik, Tabel Rekomendasi 9–10), 3.6.2 (aritmia fase akut).
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
