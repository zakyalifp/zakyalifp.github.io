# Review Klinis — Simulator Resusitasi Neonatus

Dokumen ini untuk **dokter pemeriksa (Anda)**. Semua angka klinis yang dipakai simulator
tersimpan di **satu file saja**: `src/clinical/guidelines.ts`. Tabel di bawah dibuat otomatis
dari file tersebut, jadi isinya selalu sama dengan yang dipakai aplikasi.

## Cara membaca status

| Status | Arti | Yang perlu Anda lakukan |
|---|---|---|
| ✅ terverifikasi | Dicocokkan langsung dengan **teks lengkap AHA/AAP 2025** (nomor halaman S3xx–S4xx, kelas rekomendasi & LOE), **bagan NRP edisi 9**, atau **bagan IDAI 2022**. | Cek cepat. |
| ⚠️ VERIFY | **Tidak dimuat** di ketiga dokumen tersebut. Nilai berasal dari NRP edisi 8 / buku IDAI / kebiasaan klinis. | **Wajib dicek manual** (buku NRP 9 lengkap / Buku Panduan Resusitasi Neonatus IDAI). |
| ℹ️ asumsi-sim | Parameter simulasi (mis. lama tindakan), **bukan** rekomendasi klinis. | Pastikan terasa realistis. |

## Sumber yang dipakai

1. **AHA25** — Lee HC, Strand ML, Finan E, et al. *Part 5: Neonatal Resuscitation: 2025 American Heart Association and American Academy of Pediatrics Guidelines for CPR and ECC.* Circulation. 2025;152(suppl 2):S385–S423. doi:[10.1161/CIR.0000000000001367](https://doi.org/10.1161/CIR.0000000000001367). **Teks lengkap dibaca** (PDF dari pemilik proyek); rujukan ditulis sebagai nomor halaman jurnal.
2. **NRP9** — AAP/AHA. *Neonatal Resuscitation Program®, 9th Edition — Reference Chart* (NRP209, © 2025): pengaturan ventilasi awal, tabel target SpO₂, tabel ETT (kedalaman **di gusi**), tabel obat.
3. **IDAI22** — Ikatan Dokter Anak Indonesia. *Alur Resusitasi Neonatus 2022* (bagan).
4. **NRP8** — *Textbook of Neonatal Resuscitation*, edisi 8 (2021) — hanya untuk nilai bertanda VERIFY.
5. **ILCOR25** — Liley HG, et al. *Neonatal life support: 2025 ILCOR CoSTR.* Circulation 2025;152(suppl 1):S165–S204 (rujukan latar).

## Perbedaan AHA 2025 vs IDAI 2022 — perlu keputusan Anda

Simulator saat ini **menilai berdasarkan AHA 2025 / NRP 9** (sesuai brief), dan menampilkan nilai IDAI 2022 di halaman Referensi.

| Topik | AHA 2025 / NRP 9 (dipakai menilai) | IDAI 2022 |
|---|---|---|
| Target SpO₂ preduktal | 2′ 65–70; 3′ 70–75; 4′ 75–80; 5′ 80–85; 10′ 85–95% (tanpa target menit ke-1) | 1′ 60–70; 2′ 65–85; 3′ 70–90; 4′ 75–90; 5′ 80–90; 10′ 85–90; >15′ 90–95% |
| FiO₂ awal prematur | 32–34 mgg 21–30%; **<32 mgg 30–100%** | **<35 mgg 21–30%** |
| Tekanan CPAP | Tidak disebut angka (COR 2a untuk CPAP pada prematur) | TPAE 7 cmH₂O; gagal bila 8 cmH₂O + FiO₂ >40% → simulator **memakai 7** |
| Plastik | Prematur (tanpa batas UG) | UG <32 mgg **atau BL <1500 g** → simulator memakai kriteria IDAI |
| Langkah koreksi | MR. SOPA | SRIBTA → label tombol menampilkan keduanya |

## Perubahan setelah verifikasi teks lengkap (dibanding versi awal)

- Target SpO₂: **target menit ke-1 dihapus**; tabel dimulai menit ke-2 (AHA25 Fig. 2, NRP9).
- ETT: tabel diganti dengan tabel NRP 9 — **kedalaman diukur di gusi (tip-to-gum)**, bukan di bibir; ukuran mengikuti usia gestasi/berat (mis. 30–32 mgg 2,5–3,0 mm; 35–37 mgg 3,0–3,5 mm); baris <23 mgg (5,0–5,5 cm) ditambahkan.
- Cairan: rentang **10–20 mL/kg** diterima (AHA25 S417); NRP 9 mengajarkan 10 mL/kg dalam 5–10 menit.
- Epinefrin: dosis IV setelah dosis ETT kini **boleh langsung diberikan** begitu akses siap, tanpa menunggu interval 3–5 menit (AHA25 S415, COR 2a).
- Suhu ruang prematur: **≥23 °C** (AHA25 S399), bukan 23–25 °C.
- Intact cord milking pada bayi tidak bugar: **≥35 minggu** (AHA25 S395).
- Sustained inflation >5 detik: berbahaya khusus **<28 minggu** (AHA25 S404, COR 3: Harm).
- CPAP: 7 cmH₂O (IDAI 2022).
- Waktu oksimeter mendapat sinyal di simulasi dinaikkan dari 30 menjadi **90 detik** (AHA25 S410: median 100–260 detik) — mendorong pemakaian EKG.
- Natrium bikarbonat & nalokson **tidak dibahas** di AHA 2025 → tetap VERIFY (dasar NRP 8 / AHA 2020).

## Tabel parameter

<!-- TABEL-OTOMATIS:MULAI -->
| # | Parameter | Nilai di simulator | Sumber (bagian) | Status | Kunci di `guidelines.ts` | Dicek |
|---|---|---|---|---|---|---|
| 1 | Penundaan penjepitan tali pusat (tanpa kebutuhan resusitasi segera) | ≥60 detik (aterm: COR 2a; <37 mgg: COR 1) | AHA25 S395 (2a, B-R), S396 (1, A) | ✅ terverifikasi | `CORD.DELAYED_CLAMP_MIN_S` | ☐ |
| 2 | Intact cord milking dilarang pada | <28+0 minggu (COR 3: Harm) | AHA25 S396 (3: Harm, B-R) | ✅ terverifikasi | `CORD.MILKING_MIN_GA_WEEKS` | ☐ |
| 3 | Intact cord milking dapat dipertimbangkan pada bayi tidak bugar | ≥35 minggu (COR 2b) | AHA25 S395 (2b, B-R) | ✅ terverifikasi | `CORD.MILKING_NONVIGOROUS_GA` | ☐ |
| 4 | Intact cord milking bila DCC tidak bisa (prematur, tanpa resusitasi segera) | 28+0–36+6 minggu (COR 2b) | AHA25 S396 (2b, B-R) | ✅ terverifikasi | `CORD.MILKING_PRETERM_GA` | ☐ |
| 5 | Target suhu | 36.5–37.5 °C | AHA25 S398 (1, B-NR) | ✅ terverifikasi | `TEMPERATURE.TARGET_C` | ☐ |
| 6 | Hipotermia (cegah; hangatkan kembali) | <36 °C | AHA25 S398 (1, B-NR), S418 (1, C-LD) | ✅ terverifikasi | `TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C` | ☐ |
| 7 | Hipertermia (cegah) | >38 °C | AHA25 S398 (1, B-NR) | ✅ terverifikasi | `TEMPERATURE.HYPERTHERMIA_ABOVE_C` | ☐ |
| 8 | Plastik tanpa dikeringkan (kecuali wajah) + topi | UG <32 mgg atau BL <1500 g | IDAI 2022 (Alur Resusitasi Neonatus) catatan *; AHA25 S399 (2a, B-R) tanpa batas UG | ✅ terverifikasi | `TEMPERATURE.PLASTIC_WRAP` | ☐ |
| 9 | Suhu ruang untuk prematur | ≥23 °C | AHA25 S399 | ✅ terverifikasi | `TEMPERATURE.ROOM_TEMP_PRETERM_MIN_C` | ☐ |
| 10 | Indikasi ventilasi | Apnea/megap-megap atau HR <100/menit | AHA25 S403 (1, B-NR), Fig. 2 S389 | ✅ terverifikasi | `HEART_RATE.PPV_BELOW_BPM` | ☐ |
| 11 | Indikasi kompresi | HR <60/menit meski 30 dtk ventilasi yang mengembangkan paru | AHA25 S411 (1, C-EO) | ✅ terverifikasi | `HEART_RATE.COMPRESSIONS_BELOW_BPM` | ☐ |
| 12 | Indikasi epinefrin | HR <60/menit setelah ventilasi & kompresi dioptimalkan | AHA25 S415 (1, B-NR) | ✅ terverifikasi | `HEART_RATE.EPINEPHRINE_BELOW_BPM` | ☐ |
| 13 | HR normal pascatransisi | 100–160/menit | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `HEART_RATE.NORMAL_RANGE_BPM` | ☐ |
| 14 | Hitung HR dengan stetoskop | 6 detik × 10 | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `HEART_RATE.AUSCULTATION_WINDOW_S` | ☐ |
| 15 | EKG untuk HR | Berguna untuk HR cepat & akurat (2a); WAJIB saat kompresi (1) | AHA25 S401 (2a, B-NR), S402 (1, C-EO) | ✅ terverifikasi | `HEART_RATE.ECG` | ☐ |
| 16 | Ventilasi dimulai | ≤60 detik setelah lahir | AHA25 S403 (1, B-NR) | ✅ terverifikasi | `TIMING.PPV_START_DEADLINE_S` | ☐ |
| 17 | Nilai efektivitas VTP | dalam 15 detik (gerak dada), HR setelah ±30 detik | IDAI 2022 (Alur Resusitasi Neonatus) ("VTP efektif dalam 15 detik") | ✅ terverifikasi | `TIMING.PPV_ASSESS_AFTER_S` | ☐ |
| 18 | Ventilasi efektif sebelum kompresi | ≥30 detik, sebaiknya via ETT/LMA | AHA25 S393, S411 (1, C-EO) | ✅ terverifikasi | `TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S` | ☐ |
| 19 | Kompresi sebelum epinefrin | ≥60 detik | AHA25 S393 | ✅ terverifikasi | `TIMING.COMPRESSIONS_REASSESS_S` | ☐ |
| 20 | Ulang epinefrin | setiap 3–5 menit; dosis IV segera setelah akses siap bila respons ETT tidak adekuat | AHA25 S415 (2a, B-NR), S416 (2b, C-LD); NRP9 Reference Chart (2025) | ✅ terverifikasi | `TIMING.EPINEPHRINE_REPEAT_S` | ☐ |
| 21 | Batas satu upaya intubasi | ±30 detik | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `TIMING.INTUBATION_ATTEMPT_MAX_S` | ☐ |
| 22 | Diskusi penghentian resusitasi | ±20 menit tanpa HR setelah semua langkah | AHA25 S419 (1, C-LD) | ✅ terverifikasi | `TIMING.DISCONTINUE_CONSIDER_S` | ☐ |
| 23 | PIP awal (AHA) | 20–30 cmH₂O | AHA25 S403 (2a, C-LD) | ✅ terverifikasi | `VENTILATION.PIP_INITIAL_CMH2O` | ☐ |
| 24 | PIP awal (NRP9) | 25 cmH₂O; 25–30 (≥32 mgg), 20–25 (<32 mgg) | NRP9 Reference Chart (2025) | ✅ terverifikasi | `VENTILATION.PIP_NRP9` | ☐ |
| 25 | PIP maksimal saat koreksi | 40 cmH₂O aterm / 30 prematur; naik 5 cmH₂O bertahap (AHA25 S403: PIP berlebihan = Harm) | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `VENTILATION.PIP_MAX` | ☐ |
| 26 | PEEP | 5 cmH₂O | NRP9 Reference Chart (2025); AHA25 S403 (2b, C-LD) | ✅ terverifikasi | `VENTILATION.PEEP_CMH2O` | ☐ |
| 27 | Laju ventilasi | 30–60/menit | AHA25 S404 (2a, C-LD); NRP9 Reference Chart (2025) | ✅ terverifikasi | `VENTILATION.RATE_PER_MIN` | ☐ |
| 28 | Waktu inflasi | 0.5–1 detik | AHA25 S404 (2a, C-LD) | ✅ terverifikasi | `VENTILATION.INFLATION_TIME_S` | ☐ |
| 29 | Sustained inflation >5 detik | Berbahaya pada <28 minggu (COR 3: Harm) | AHA25 S404 (3: Harm, B-R) | ✅ terverifikasi | `VENTILATION.SUSTAINED_INFLATION` | ☐ |
| 30 | Aliran gas | 10 L/menit | NRP9 Reference Chart (2025) | ✅ terverifikasi | `VENTILATION.GAS_FLOW_L_MIN` | ☐ |
| 31 | CPAP (TPAE) | 7 cmH₂O; gagal bila 8 cmH₂O masih distres berat / FiO₂ >40% → intubasi | IDAI 2022 (Alur Resusitasi Neonatus); AHA25 S407 (2a, A) tanpa angka tekanan | ✅ terverifikasi | `VENTILATION.CPAP_CMH2O` | ☐ |
| 32 | FiO₂ awal ≥35 minggu | 21% | AHA25 S409 (2b, C-LD); NRP9 Reference Chart (2025); IDAI 2022 (Alur Resusitasi Neonatus) | ✅ terverifikasi | `OXYGEN.FIO2_START_TERM` | ☐ |
| 33 | FiO₂ awal 32–34+6 minggu | 21–30% | AHA25 S409 (2b, C-LD); NRP9 Reference Chart (2025) | ✅ terverifikasi | `OXYGEN.FIO2_START_32_34` | ☐ |
| 34 | FiO₂ awal <32 minggu | 30–100% (IDAI22: 21–30% untuk <35 mgg) | AHA25 S409 (2b, C-LD); NRP9 Reference Chart (2025) | ✅ terverifikasi | `OXYGEN.FIO2_START_BELOW_32` | ☐ |
| 35 | FiO₂ saat kompresi | 100%, lalu titrasi setelah ROSC | AHA25 S411 (2b, C-EO), Fig. 2 | ✅ terverifikasi | `OXYGEN.FIO2_DURING_COMPRESSIONS` | ☐ |
| 36 | Turunkan FiO₂ bila SpO₂ | >95% (batas atas tabel menit ke-10) | AHA25 Fig. 2 S389 | ✅ terverifikasi | `OXYGEN.SPO2_HYPEROXIA_ABOVE` | ☐ |
| 37 | FiO₂ balon mengembang sendiri tanpa blender | udara 21%; O₂ tanpa reservoir ±40%; dengan reservoir ±90–100% | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `OXYGEN.SIB_FIO2` | ☐ |
| 38 | Target SpO₂ preduktal (dipakai penilaian) | 2′ 65–70%; 3′ 70–75%; 4′ 75–80%; 5′ 80–85%; 10′ 85–95% | AHA25 Fig. 2 S389; NRP9 Reference Chart (2025) | ✅ terverifikasi | `SPO2_TARGETS` | ☐ |
| 39 | Target SpO₂ preduktal IDAI (referensi) | 1 menit 60–70%; 2 menit 65–85%; 3 menit 70–90%; 4 menit 75–90%; 5 menit 80–90%; 10 menit 85–90%; >15 menit 90–95% | IDAI 2022 (Alur Resusitasi Neonatus) | ✅ terverifikasi | `IDAI_SPO2_TARGETS` | ☐ |
| 40 | Lokasi oksimeter | Tangan/pergelangan kanan (preduktal), dipasang sedini mungkin | AHA25 S409 (1, C-LD) | ✅ terverifikasi | `PULSE_OX.SITE` | ☐ |
| 41 | Laryngeal mask | ≥34+0 minggu: alternatif bila masker gagal (2a) / antarmuka primer (2b) | AHA25 S405 | ✅ terverifikasi | `AIRWAY.LMA_MIN_GA_WEEKS` | ☐ |
| 42 | Batas berat LMA | 2 kg (batas produsen; <2 kg = kesenjangan bukti) | AHA25 S406, S421 | ✅ terverifikasi | `AIRWAY.LMA_MIN_WEIGHT_KG` | ☐ |
| 43 | Ukuran LMA | 1 | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `AIRWAY.LMA_SIZE` | ☐ |
| 44 | ETT: kedalaman DI GUSI & ukuran | <23 mgg: 5 cm, 2/2.5 mm; 23–24 mgg: 5.5 cm, 2/2.5 mm; 25–26 mgg: 6 cm, 2.5 mm; 27–29 mgg: 6.5 cm, 2.5 mm; 30–32 mgg: 7 cm, 2.5/3 mm; 33–34 mgg: 7.5 cm, 3 mm; 35–37 mgg: 8 cm, 3/3.5 mm; 38–40 mgg: 8.5 cm, 3.5 mm; 41–44 mgg: 9 cm, 3.5 mm | NRP9 Reference Chart (2025) | ✅ terverifikasi | `ETT_TABLE` | ☐ |
| 45 | Bilah laringoskop | 00 prematur ekstrem; 0 prematur; 1 aterm | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `AIRWAY.BLADE_BY_GA` | ☐ |
| 46 | Pipa orogastrik | 8 Fr (10 Fr dengan isap pada HDK) | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `AIRWAY.OGT_FR` | ☐ |
| 47 | Pipa nasofaring (Pierre Robin) | ETT 2.5 mm via hidung | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `AIRWAY.NASOPHARYNGEAL_TUBE_MM` | ☐ |
| 48 | Isap jalan napas | Rutin TIDAK dianjurkan (jernih/mekonium); mulut-hidung bila perlu ventilasi & tampak tersumbat; isap trakea bila bukti obstruksi trakea saat ventilasi | AHA25 S400 (3: No Benefit B-R; 2a C-EO) | ✅ terverifikasi | `SUCTION` | ☐ |
| 49 | Rasio kompresi : ventilasi | 3:1 | AHA25 S412 (2b, C-LD) | ✅ terverifikasi | `COMPRESSIONS.RATIO` | ☐ |
| 50 | Laju kompresi | 90 kompresi + 30 inflasi per menit | AHA25 S393 | ✅ terverifikasi | `COMPRESSIONS.EVENTS_PER_MIN` | ☐ |
| 51 | Teknik & kedalaman | Dua ibu jari melingkari dada; sepertiga bawah sternum di atas xifoid; 1/3 diameter AP | AHA25 S412 (2b, C-LD) | ✅ terverifikasi | `COMPRESSIONS.TECHNIQUE` | ☐ |
| 52 | Ganti petugas kompresi | tiap 2–5 menit, saat penilaian HR | AHA25 S412 (2b, C-EO) | ✅ terverifikasi | `COMPRESSIONS.ROTATE` | ☐ |
| 53 | Jalan napas saat kompresi | ETT direkomendasikan (1); LMA bila ETT gagal pada ≥34 mgg (2b) | AHA25 S411 | ✅ terverifikasi | `COMPRESSIONS.AIRWAY` | ☐ |
| 54 | Akses vaskular darurat | UVC (1); IO bila IV gagal/tidak mungkin (2a) | AHA25 S414 (C-LD) | ✅ terverifikasi | `ACCESS.ROUTE` | ☐ |
| 55 | Ukuran & kedalaman UVC | 3.5–5 Fr, 2–4 cm sampai darah mengalir | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `ACCESS.UVC` | ☐ |
| 56 | Konsentrasi epinefrin | 0.1 mg/mL (1 mg/10 mL) | NRP9 Reference Chart (2025) | ✅ terverifikasi | `EPINEPHRINE.CONCENTRATION_MG_PER_ML` | ☐ |
| 57 | Epinefrin IV/IO | 0.01–0.03 mg/kg; NRP9: 0.02 mg/kg = 0,2 mL/kg | AHA25 S415 (1, B-NR); NRP9 Reference Chart (2025) | ✅ terverifikasi | `EPINEPHRINE.IV_DOSE_MG_PER_KG` | ☐ |
| 58 | Epinefrin endotrakeal | 0.05–0.1 mg/kg; NRP9: 0.1 mg/kg = 1 mL/kg, tanpa bilas | AHA25 S415 (2a, C-LD); NRP9 Reference Chart (2025) | ✅ terverifikasi | `EPINEPHRINE.ETT_DOSE_MG_PER_KG` | ☐ |
| 59 | Bilas setelah epinefrin IV/IO | NaCl 0,9% 3 mL (berapa pun berat lahir) | AHA25 S416; NRP9 Reference Chart (2025) | ✅ terverifikasi | `EPINEPHRINE.FLUSH_ML` | ☐ |
| 60 | Cairan (NaCl 0,9% / darah O-neg) | 10–20 mL/kg (NRP9: 10 mL/kg) dalam 5–10 menit; indikasi: bukti hipovolemia dan tetap bradikardia meski ventilasi, kompresi, epinefrin | AHA25 S417 (2b, C-EO); NRP9 Reference Chart (2025) | ✅ terverifikasi | `VOLUME_EXPANDER.DOSE_ML_PER_KG` | ☐ |
| 61 | Ambang hipoglikemia | <45 mg/dL (AHA25 S418: pantau glukosa dini, tanpa angka) | IDAI/AAP | ⚠️ VERIFY | `GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL` | ☐ |
| 62 | Bolus dekstrosa 10% | 2 mL/kg IV | IDAI/NRP8 | ⚠️ VERIFY | `GLUCOSE.D10_BOLUS_ML_PER_KG` | ☐ |
| 63 | Natrium bikarbonat | Tidak dianjurkan (tidak dibahas di AHA25) | NRP8 / AHA 2020 | ⚠️ VERIFY | `NOT_RECOMMENDED.SODIUM_BICARBONATE` | ☐ |
| 64 | Nalokson saat resusitasi | Tidak dianjurkan; fokus ventilasi (tidak dibahas di AHA25) | NRP8 / AHA 2020 | ⚠️ VERIFY | `NOT_RECOMMENDED.NALOXONE` | ☐ |
| 65 | Terapi hipotermia (HIE sedang–berat) | ≥36 mgg; 33.5–34.5 °C, mulai <6 jam, 72 jam, dengan protokol | AHA25 S418 (1, A) | ✅ terverifikasi | `POST_RESUSCITATION.HYPOTHERMIA_THERAPY` | ☐ |
| 66 | Laju napas normal | 40–60/menit | IDAI | ⚠️ VERIFY | `POST_RESUSCITATION.RESP_RATE_NORMAL` | ☐ |
| 67 | Aspirasi jarum pneumotoraks | Kateter 18–20 G, SIC 4 LAA atau SIC 2 LMK | NRP8 (2021) — tidak dimuat AHA25/NRP9 chart/IDAI22 | ⚠️ VERIFY | `PNEUMOTHORAX.NEEDLE_GAUGE` | ☐ |
| 68 | Waktu oksimeter mendapat sinyal (simulasi) | 90 detik (data: median 100–260 dtk) | Asumsi simulator; AHA25 S410 | ℹ️ asumsi-sim | `SIM.PULSE_OX_ACQUIRE_S` | ☐ |
| 69 | Durasi tindakan (simulasi) | intubasi 25 dtk; LMA 15 dtk; UVC 90 dtk; IO 60 dtk; siapkan obat 25 dtk; aspirasi jarum 40 dtk | Asumsi simulator | ℹ️ asumsi-sim | `SIM.DURATION_S` | ☐ |
<!-- TABEL-OTOMATIS:SELESAI -->

## Model fisiologi

Koefisien laju (seberapa cepat HR naik, SpO₂ berubah, suhu turun) ada di `src/engine/model.ts`.
Itu **bukan angka klinis**, melainkan bentuk kurva supaya pasien virtual terasa realistis
(mis. HR naik dalam ±15–60 detik setelah ventilasi efektif). Bila ada respons yang terasa
tidak realistis saat Anda mencoba, catat skenario dan menitnya — mudah disetel.

## Cara memperbarui angka

1. Buka `src/clinical/guidelines.ts`, ubah angkanya, perbarui komentar sumber, dan ubah status
   di `GUIDELINE_REGISTRY` dari `'VERIFY'` menjadi `'terverifikasi'` bila sudah dicek.
2. Jalankan `npm run docs:clinical` untuk memperbarui tabel di dokumen ini.
3. Jalankan `npm test` — test akan gagal bila ada nilai yang tidak konsisten.
