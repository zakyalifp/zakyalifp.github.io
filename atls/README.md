# ATLS Trauma Simulator

Simulator kasus trauma interaktif untuk latihan dokter, berdasarkan **prinsip ATLS® edisi ke-11 (American College of Surgeons, 2025)**. Anda memimpin resusitasi trauma secara real-time: menjalankan primary survey **xABCDE**, mengatasi ancaman nyawa saat ditemukan, memakai adjuvan (eFAST, foto toraks/pelvis, lab), mengelola syok hemoragik dengan resusitasi hemostatik, lalu memutuskan tata laksana definitif atau rujukan. Pasien memburuk bila tidak ditangani (perdarahan berlanjut, tension pneumothorax bertambah, edema jalan napas, herniasi otak, hipotermia) dan dapat mengalami henti jantung traumatik.

Dibangun dengan HTML/CSS/JavaScript murni (tanpa framework, tanpa build). Semua berjalan di browser; riwayat skor hanya disimpan di `localStorage` perangkat pengguna. Folder ini mandiri — tidak bergantung pada folder `acls/`.

## Fitur

- **14 skenario** dalam 4 kategori:
  - *Trauma toraks*: tension pneumothorax, hemotoraks masif, tamponade jantung, open pneumothorax.
  - *Syok hemoragik*: fraktur pelvis tidak stabil, perdarahan intraabdomen, perdarahan ekstremitas masif di Puskesmas (tanpa darah & dokter bedah).
  - *Jalan napas, neuro & luka bakar*: obstruksi jalan napas maksilofasial (krikotiroidotomi), cedera otak berat dengan herniasi, cedera medula servikal + syok neurogenik, luka bakar luas dengan cedera inhalasi & keracunan CO.
  - *Populasi khusus*: anak (syok terkompensasi, IO, dosis per kg), kehamilan 32 minggu (solusio plasenta), lansia dengan warfarin & β-bloker.
- **Model fisiologi**: kelas syok I–IV dari fraksi volume darah, sumber perdarahan yang dapat dikontrol (tourniquet, binder, OK, angio), efek kristaloid berlebih & hipotermia terhadap koagulopati, TXA, transfusi masif 1:1:1, syok obstruktif, TIK & herniasi, ROSC bila penyebab reversibel diatasi.
- **Monitor real-time** (EKG, pletismografi, kapnografi) + 6 parameter: HR, SpO₂, TD/MAP, RR, suhu, EtCO₂. Monitor harus dipasang dulu.
- **Dua level**: *Pemula* (temuan dengan interpretasi, petunjuk, umpan balik langsung, perkiraan kelas syok, bisa jeda) dan *Mahir* (temuan mentah, tanpa petunjuk sampai debrief).
- **Kerja tim**: briefing & pembagian peran, diagnosis kerja (cedera mengancam nyawa), dan rujukan terstruktur **SBAR** dengan ringkasan **MIST** otomatis.
- **Debrief**: skor, tindakan kritis yang terlewat, metrik (waktu primary survey, kontrol perdarahan, kristaloid total, produk darah, TXA, kelas syok terberat, suhu terendah), penilaian per kriteria, kunci diagnosis, umpan balik briefing/SBAR, kesalahan + catatan pembelajaran, timeline lengkap. Bisa dicetak/disimpan PDF.
- `referensi.html`: ringkasan ATLS (xABCDE, toraks, klasifikasi syok, resusitasi hemostatik, cedera otak, medula spinalis, luka bakar, populasi khusus, adjuvan, rujukan).
- `kalkulator.html`: GCS (dewasa/anak), Shock Index + skor ABC, estimasi kelas syok, luas luka bakar (Rule of Nines) + cairan, Revised Trauma Score, dosis trauma anak.
- Pintasan keyboard di simulasi: `X` `A` `B` `C` `D` `E` (primary survey), `R` (reevaluasi), `M` (monitor).

## Struktur

```
atls/
├── index.html        # Beranda, layar simulasi, debrief
├── referensi.html    # Ringkasan ATLS (cheat sheet)
├── kalkulator.html   # Kalkulator trauma (JS di dalam file)
├── css/style.css
└── js/
    ├── ecg.js        # Generator gelombang & monitor canvas (salinan dari simulator ACLS)
    ├── audio.js      # Suara (Web Audio API)
    ├── engine.js     # Mesin simulasi: fisiologi trauma, perdarahan, henti jantung, skor
    ├── actions.js    # Temuan pemeriksaan (xABCDE, eFAST, radiologi) & katalog tindakan
    ├── scenarios.js  # Skenario, kriteria penilaian, petunjuk, isi briefing/SBAR
    └── ui.js         # Antarmuka
```

## Menambah skenario

Tambahkan objek baru ke `LIST` di `js/scenarios.js`:

- `init` — usia, BB, tanda vital dasar (`hr0`, `sbp0`, `dbp0`, `rr0`, `spo2`), suhu, GCS `[E, V, M]`, kehilangan darah pra-RS (`loss`, mL), `injuryAgo` (detik sejak cedera).
- `problems` — kombinasi masalah: `ext`, `pelvis`, `abdo`, `htx`, `femur`, `tension`, `open`, `tamp`, `flail`, `airway`, `tbi`, `neuro`, `resp`, `burn`, `preg`, serta penanda `urethral`, `basal`, `anticoag`, `betaBlock`.
- `facility` — kemampuan fasilitas (`fac('rsudB')`, `fac('puskesmas')`, dst.), menentukan apakah darah/OK/CT/bedah saraf tersedia atau harus dirujuk.
- `find` — teks temuan khusus kasus (E, AMPLE, survei sekunder, CT, punggung, dll.).
- `injuries` (kunci diagnosis kerja), `definitive` (disposisi yang benar), `dispoBy` (batas waktu), dan `extra(S)` untuk kriteria penilaian khusus.

## Catatan

Alat bantu belajar, **bukan** pengganti kursus ATLS® bersertifikat atau protokol institusi. Fisiologi pasien disederhanakan. Verifikasi dosis dan alur dengan manual resmi. ATLS® adalah merek dagang American College of Surgeons; proyek ini tidak berafiliasi dengan ACS.
