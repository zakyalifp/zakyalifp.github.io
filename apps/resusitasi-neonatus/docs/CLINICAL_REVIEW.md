# Review Klinis — Simulator Resusitasi Neonatus

Dokumen ini untuk **dokter pemeriksa (Anda)**. Semua angka klinis yang dipakai simulator
tersimpan di **satu file saja**: `src/clinical/guidelines.ts`. Tabel di bawah dibuat otomatis
dari file tersebut, jadi isinya selalu sama dengan yang dipakai aplikasi.

## Cara membaca status

| Status | Arti | Yang perlu Anda lakukan |
|---|---|---|
| ✅ terverifikasi | Angka cocok dengan pedoman AHA/AAP 2025 lewat abstrak PubMed atau tinjauan sekunder yang mengutip teks pedoman secara langsung. | Cek cepat saja. |
| ⚠️ VERIFY | Angka standar NRP/IDAI yang **belum bisa saya cocokkan kata per kata** dengan teks lengkap AHA 2025 / NRP edisi 9 (teks lengkap terkunci saat pembuatan). | **Wajib dicek manual** dengan buku NRP edisi 9 / teks lengkap Circulation 2025 / pedoman IDAI. |
| ℹ️ asumsi-sim | Parameter simulasi (mis. lama tindakan), **bukan** rekomendasi klinis. | Pastikan terasa realistis. |

> **Catatan halaman:** teks lengkap AHA 2025 Part 5 (Circulation 2025;152 suppl 2:S385–S423)
> tidak dapat diakses saat pembuatan, sehingga nomor halaman spesifik belum dicantumkan —
> setiap entri menyebut **nama bagian (section)**. Mohon tambahkan nomor halaman saat review.

## Sumber yang dipakai

1. **AHA25** — Lee HC, Strand ML, Finan E, et al. *Part 5: Neonatal Resuscitation: 2025 American Heart Association and American Academy of Pediatrics Guidelines for CPR and ECC.* Circulation. 2025;152(16 suppl 2):S385–S423. doi:[10.1161/CIR.0000000000001367](https://doi.org/10.1161/CIR.0000000000001367) (PMID 41122887). Versi simultan: Pediatrics 2026;157(1):e2025074352.
2. **NRP9 / NRP8** — AAP/AHA. *Textbook of Neonatal Resuscitation*, edisi 9 (dan edisi 8, 2021, bila nilai belum dapat dicocokkan dengan edisi 9).
3. **KARGER** — *2025 American and European Guidelines on Neonatal Resuscitation: Concordance and Differences.* Neonatology 2025. doi:[10.1159/000552450](https://doi.org/10.1159/000552450) — sumber sekunder utama yang mengutip angka AHA25 (PIP, PEEP, laju, FiO₂ per usia gestasi, 20 menit).
4. **TROPDOCT** — Tripathy SK, Das S. *AHA/AAP 2025 neonatal resuscitation guideline update.* Trop Doct 2026. doi:[10.1177/00494755261476394](https://doi.org/10.1177/00494755261476394).
5. **IDAI / KEMENKES** — UKK Neonatologi IDAI, *Buku Panduan Resusitasi Neonatus*; KMK HK.01.07/MENKES/214/2019 *PNPK Tata Laksana Asfiksia*.

## Tabel parameter

<!-- TABEL-OTOMATIS:MULAI -->
| # | Parameter | Nilai di simulator | Sumber (bagian) | Status | Kunci di `guidelines.ts` | Dicek |
|---|---|---|---|---|---|---|
| 1 | Penundaan penjepitan tali pusat (bayi tidak perlu resusitasi segera) | ≥60 detik | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Umbilical Cord Management; abstrak PubMed 41122887 | ✅ terverifikasi | `CORD.DELAYED_CLAMP_MIN_S` | ☐ |
| 2 | Intact cord milking tidak untuk usia gestasi | <28 minggu | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Umbilical Cord Management; KARGER | ✅ terverifikasi | `CORD.MILKING_MIN_GA_WEEKS` | ☐ |
| 3 | Intact cord milking dapat dipertimbangkan pada bayi tidak bugar | 35–42 minggu | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Umbilical Cord Management | ⚠️ VERIFY | `CORD.MILKING_NONVIGOROUS_GA` | ☐ |
| 4 | Target suhu aksila | 36.5–37.5 °C | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Temperature Management | ⚠️ VERIFY | `TEMPERATURE.TARGET_C` | ☐ |
| 5 | Hipotermia (perlu tindakan) | <36 °C | WHO/IDAI | ⚠️ VERIFY | `TEMPERATURE.HYPOTHERMIA_MODERATE_BELOW_C` | ☐ |
| 6 | Hipertermia (hindari) | >38 °C | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Temperature Management | ⚠️ VERIFY | `TEMPERATURE.HYPERTHERMIA_ABOVE_C` | ☐ |
| 7 | Plastik tanpa dikeringkan + topi | <32 minggu | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Temperature Management | ⚠️ VERIFY | `TEMPERATURE.PLASTIC_WRAP_BELOW_GA_WEEKS` | ☐ |
| 8 | Suhu ruang bersalin untuk prematur | 23–25 °C | AHA 2020 / NRP | ⚠️ VERIFY | `TEMPERATURE.ROOM_TEMP_PRETERM_C` | ☐ |
| 9 | Indikasi VTP | Apnea/megap-megap atau HR <100/menit | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Positive-Pressure Ventilation; KARGER | ✅ terverifikasi | `HEART_RATE.PPV_BELOW_BPM` | ☐ |
| 10 | Indikasi kompresi dada | HR <60/menit setelah ventilasi efektif | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Chest Compressions; KARGER | ✅ terverifikasi | `HEART_RATE.COMPRESSIONS_BELOW_BPM` | ☐ |
| 11 | Indikasi epinefrin | HR tetap <60/menit setelah kompresi + ventilasi adekuat | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Medications | ✅ terverifikasi | `HEART_RATE.EPINEPHRINE_BELOW_BPM` | ☐ |
| 12 | HR normal pascatransisi | 100–160/menit | NRP | ⚠️ VERIFY | `HEART_RATE.NORMAL_RANGE_BPM` | ☐ |
| 13 | Hitung HR dengan stetoskop | 6 detik × 10 | NRP | ⚠️ VERIFY | `HEART_RATE.AUSCULTATION_WINDOW_S` | ☐ |
| 14 | VTP dimulai (menit emas) | ≤60 detik setelah lahir | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Positive-Pressure Ventilation | ⚠️ VERIFY | `TIMING.PPV_START_DEADLINE_S` | ☐ |
| 15 | Nilai efektivitas ventilasi | setelah 15–30 detik VTP | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §PPV; KARGER | ✅ terverifikasi | `TIMING.PPV_ASSESS_AFTER_S` | ☐ |
| 16 | Lama VTP efektif sebelum kompresi | ≥30 detik | NRP | ⚠️ VERIFY | `TIMING.PPV_EFFECTIVE_BEFORE_COMPRESSIONS_S` | ☐ |
| 17 | Nilai ulang HR saat kompresi | setiap 60 detik | NRP | ⚠️ VERIFY | `TIMING.COMPRESSIONS_REASSESS_S` | ☐ |
| 18 | Ulang epinefrin | setiap 3–5 menit | NRP | ⚠️ VERIFY | `TIMING.EPINEPHRINE_REPEAT_S` | ☐ |
| 19 | Batas satu upaya intubasi | ±30 detik | NRP | ⚠️ VERIFY | `TIMING.INTUBATION_ATTEMPT_MAX_S` | ☐ |
| 20 | Pertimbangan penghentian resusitasi | ±20 menit tanpa HR setelah semua langkah | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Withholding and Discontinuing; KARGER | ✅ terverifikasi | `TIMING.DISCONTINUE_CONSIDER_S` | ☐ |
| 21 | PIP awal | 20–30 cmH₂O | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §PPV; KARGER | ✅ terverifikasi | `VENTILATION.PIP_INITIAL_CMH2O` | ☐ |
| 22 | PIP awal prematur <32 minggu | 20–25 cmH₂O | NRP (Tabel 1 KARGER) | ✅ terverifikasi | `VENTILATION.PIP_PRETERM_CMH2O` | ☐ |
| 23 | PIP maksimal (langkah P MR. SOPA) | 40 cmH₂O aterm / 30 cmH₂O prematur; naik 5 cmH₂O bertahap | NRP | ⚠️ VERIFY | `VENTILATION.PIP_MAX` | ☐ |
| 24 | PEEP | 5 cmH₂O | NRP (Tabel 1 KARGER) | ✅ terverifikasi | `VENTILATION.PEEP_CMH2O` | ☐ |
| 25 | Laju VTP | 30–60/menit | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §PPV; KARGER; PubMed 42599690 | ✅ terverifikasi | `VENTILATION.RATE_PER_MIN` | ☐ |
| 26 | Waktu inflasi | 0.5–1 detik | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §PPV; KARGER | ✅ terverifikasi | `VENTILATION.INFLATION_TIME_S` | ☐ |
| 27 | Inflasi berkepanjangan tidak dianjurkan | >5 detik (prematur) | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §PPV / ILCOR | ⚠️ VERIFY | `VENTILATION.SUSTAINED_INFLATION_MAX_S` | ☐ |
| 28 | CPAP prematur bernapas spontan dengan distres | 5 cmH₂O (diterima 5–8) | NRP | ⚠️ VERIFY | `VENTILATION.CPAP_CMH2O` | ☐ |
| 29 | FiO2 awal ≥35 minggu | 21% | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Oxygen Administration; KARGER | ✅ terverifikasi | `OXYGEN.FIO2_START_TERM` | ☐ |
| 30 | FiO2 awal 32–34 minggu | 21–30% | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Oxygen Administration; KARGER | ✅ terverifikasi | `OXYGEN.FIO2_START_32_34` | ☐ |
| 31 | FiO2 awal <32 minggu | 30–100% | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Oxygen Administration; KARGER; PubMed 42599690 | ✅ terverifikasi | `OXYGEN.FIO2_START_BELOW_32` | ☐ |
| 32 | FiO2 saat kompresi dada | 100% | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Chest Compressions | ✅ terverifikasi | `OXYGEN.FIO2_DURING_COMPRESSIONS` | ☐ |
| 33 | Turunkan FiO2 bila SpO2 | >95% | NRP | ⚠️ VERIFY | `OXYGEN.SPO2_HYPEROXIA_ABOVE` | ☐ |
| 34 | FiO2 balon mengembang sendiri tanpa blender | udara 21%; O₂ tanpa reservoir ±40%; dengan reservoir ±90–100% | NRP | ⚠️ VERIFY | `OXYGEN.SIB_FIO2` | ☐ |
| 35 | Target SpO2 preduktal | 1′ 60–65%; 2′ 65–70%; 3′ 70–75%; 4′ 75–80%; 5′ 80–85%; 10′ 85–95% | NRP 8/9; AHA25 (tabel AHA25 dimulai menit ke-2 menurut KARGER) | ⚠️ VERIFY | `SPO2_TARGETS` | ☐ |
| 36 | Sungkup laring (LMA) | ≥34 minggu | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Ventilation Interface | ✅ terverifikasi | `AIRWAY.LMA_MIN_GA_WEEKS` | ☐ |
| 37 | Ukuran LMA | Ukuran 1 untuk >2 kg | NRP | ⚠️ VERIFY | `AIRWAY.LMA_SIZE` | ☐ |
| 38 | Ukuran ETT | <1 kg/<28 mgg: 2,5; 1–2 kg/28–34 mgg: 3,0; >2 kg/>34 mgg: 3,5 mm | NRP | ⚠️ VERIFY | `AIRWAY.ETT_SIZE_BY_WEIGHT` | ☐ |
| 39 | Kedalaman ETT di bibir | 23–24 mgg: 5.5 cm; 25–26 mgg: 6 cm; 27–29 mgg: 6.5 cm; 30–32 mgg: 7 cm; 33–34 mgg: 7.5 cm; 35–37 mgg: 8 cm; 38–40 mgg: 8.5 cm; 41–43 mgg: 9 cm | NRP | ⚠️ VERIFY | `AIRWAY.ETT_DEPTH_BY_GA` | ☐ |
| 40 | Bilah laringoskop | 00 prematur ekstrem; 0 prematur; 1 aterm | NRP | ⚠️ VERIFY | `AIRWAY.BLADE_BY_GA` | ☐ |
| 41 | Pipa orogastrik | 8 Fr (10 Fr dengan isap pada hernia diafragmatika) | NRP | ⚠️ VERIFY | `AIRWAY.OGT_FR` | ☐ |
| 42 | Pipa nasofaring (Pierre Robin) | ETT 2.5 mm via hidung | NRP | ⚠️ VERIFY | `AIRWAY.NASOPHARYNGEAL_TUBE_MM` | ☐ |
| 43 | Rasio kompresi : ventilasi | 3:1 | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Chest Compressions | ✅ terverifikasi | `COMPRESSIONS.RATIO` | ☐ |
| 44 | Laju kompresi | 90 kompresi + 30 napas = 120 kejadian/menit | NRP | ⚠️ VERIFY | `COMPRESSIONS.EVENTS_PER_MIN` | ☐ |
| 45 | Teknik & kedalaman | Dua ibu jari melingkari dada, sepertiga bawah sternum, ±1/3 diameter AP | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Chest Compressions | ✅ terverifikasi | `COMPRESSIONS.TECHNIQUE` | ☐ |
| 46 | UVC darurat | 3.5–5 Fr, masuk 2–4 cm sampai darah mengalir | NRP | ⚠️ VERIFY | `ACCESS.UVC` | ☐ |
| 47 | Konsentrasi epinefrin | 0.1 mg/mL (1 mg/10 mL) | NRP | ⚠️ VERIFY | `EPINEPHRINE.CONCENTRATION_MG_PER_ML` | ☐ |
| 48 | Epinefrin IV/IO | 0.01–0.03 mg/kg (0,1–0,3 mL/kg) | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Medications | ✅ terverifikasi | `EPINEPHRINE.IV_DOSE_MG_PER_KG` | ☐ |
| 49 | Epinefrin endotrakeal | 0.05–0.1 mg/kg (0,5–1 mL/kg) | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Medications | ✅ terverifikasi | `EPINEPHRINE.ETT_DOSE_MG_PER_KG` | ☐ |
| 50 | Bilas setelah epinefrin IV/IO | NaCl 0,9% 3 mL | NRP 8 | ⚠️ VERIFY | `EPINEPHRINE.FLUSH_ML` | ☐ |
| 51 | Cairan (NaCl 0,9%/PRC O-neg) | 10 mL/kg dalam 5–10 menit, dapat diulang | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Volume Expansion / NRP | ⚠️ VERIFY | `VOLUME_EXPANDER.DOSE_ML_PER_KG` | ☐ |
| 52 | Hipoglikemia (perlu tata laksana) | <45 mg/dL | IDAI/AAP | ⚠️ VERIFY | `GLUCOSE.HYPOGLYCEMIA_BELOW_MG_DL` | ☐ |
| 53 | Bolus dekstrosa 10% | 2 mL/kg IV | IDAI/NRP | ⚠️ VERIFY | `GLUCOSE.D10_BOLUS_ML_PER_KG` | ☐ |
| 54 | Natrium bikarbonat | Tidak dianjurkan rutin | AHA25 (Circulation 2025;152 suppl 2:S385–S423); KARGER | ✅ terverifikasi | `NOT_RECOMMENDED.SODIUM_BICARBONATE` | ☐ |
| 55 | Nalokson saat resusitasi | Tidak dianjurkan; fokus ventilasi | NRP / AHA | ⚠️ VERIFY | `NOT_RECOMMENDED.NALOXONE` | ☐ |
| 56 | Isap trakea rutin (mekonium, tidak bugar) | Tidak dianjurkan; mulai VTP | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Meconium | ⚠️ VERIFY | `NOT_RECOMMENDED.ROUTINE_TRACHEAL_SUCTION_MECONIUM` | ☐ |
| 57 | Terapi hipotermia (HIE sedang–berat) | ≥36 mgg, mulai <6 jam di fasilitas berprotokol | AHA25 (Circulation 2025;152 suppl 2:S385–S423) §Postresuscitation Care | ⚠️ VERIFY | `POST_RESUSCITATION.HYPOTHERMIA_THERAPY` | ☐ |
| 58 | Aspirasi jarum pneumotoraks | Kateter 18–20 G, SIC 4 LAA atau SIC 2 LMK | NRP | ⚠️ VERIFY | `PNEUMOTHORAX.NEEDLE_GAUGE` | ☐ |
| 59 | Waktu oksimeter mendapat sinyal (simulasi) | 30 detik | Asumsi simulator (NRP: dapat 1–2 menit) | ℹ️ asumsi-sim | `SIM.PULSE_OX_ACQUIRE_S` | ☐ |
| 60 | Durasi tindakan (simulasi) | intubasi 25 dtk; LMA 15 dtk; UVC 90 dtk; IO 60 dtk; siapkan obat 25 dtk; aspirasi jarum 40 dtk | Asumsi simulator | ℹ️ asumsi-sim | `SIM.DURATION_S` | ☐ |
<!-- TABEL-OTOMATIS:SELESAI -->

## Hal-hal yang paling penting dicek

1. **Tabel target SpO₂ preduktal per menit.** Simulator memakai tabel NRP (1′ 60–65% … 10′ 85–95%). Menurut tinjauan KARGER, tabel AHA 2025 **dimulai dari menit ke-2**. Bila tabel 2025 berbeda, ubah `SPO2_TARGETS` di `guidelines.ts`.
2. **FiO₂ awal prematur.** Simulator: ≥35 mgg 21%; 32–34 mgg 21–30%; <32 mgg 30–100% (≥30%). Nilai ini terverifikasi dari dua sumber sekunder, tetapi mohon cocokkan dengan teks lengkap.
3. **Dosis epinefrin.** IV/IO 0,01–0,03 mg/kg; ETT 0,05–0,1 mg/kg; konsentrasi 0,1 mg/mL; bilas 3 mL NaCl 0,9%; ulang 3–5 menit.
4. **Ukuran & kedalaman ETT, ukuran LMA, UVC.** Diambil dari tabel NRP — mohon cocokkan dengan NRP edisi 9 dan pedoman IDAI.
5. **Konteks Indonesia.** FiO₂ balon tanpa blender (21% / ±40% / ±90–100%), metode kanguru untuk transport, komunikasi SISRUTE, dan ambang hipoglikemia (<45 mg/dL) — mohon cocokkan dengan pedoman IDAI/Kemenkes yang berlaku.

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
