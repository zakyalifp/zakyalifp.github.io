# ACLS Megacode Simulator

Simulator kasus ACLS interaktif untuk latihan dokter — mengacu pada **AHA Guidelines for CPR & ECC 2025**. Anda memimpin resusitasi secara real-time: membaca monitor (EKG, pletismografi, kapnografi), melakukan RJP, defibrilasi/kardioversi/pacing, memberi obat, dan menelusuri penyebab reversibel (H & T). Setiap skenario diakhiri **debrief** berisi skor, metrik kualitas RJP, penilaian per kriteria, kesalahan beserta catatan pembelajaran, dan timeline lengkap.

Dibangun dengan HTML/CSS/JavaScript murni (tanpa framework, tanpa build). Semua berjalan di browser; riwayat skor hanya disimpan di `localStorage` perangkat pengguna.

## Fitur

- **11 skenario**: VF refrakter, torsades de pointes, asistol → VF, PEA hiperkalemia, PEA tension pneumothorax, AV blok total, SVT stabil, VT tidak stabil, AF RVR tidak stabil, STEMI di RS tanpa cath lab (dengan VF), stroke iskemik akut.
- **Dua level**: *Pemula* (nama ritme, petunjuk langkah, umpan balik langsung, bisa jeda) dan *Mahir* (interpretasi ritme dinilai, tanpa petunjuk sampai debrief).
- Monitor real-time dengan artefak kompresi (ritme baru terbaca saat kompresi dihentikan), EtCO₂ naik saat ROSC, pacing dengan capture.
- Suara: beep QRS (nada mengikuti SpO₂), metronom 110/menit, alarm (bisa dimatikan).
- Debrief bisa dicetak / disimpan sebagai PDF. Pintasan keyboard: Spasi (RJP), R (analisis ritme), N (cek nadi), C (charge), S (shock).
- `referensi.html`: ringkasan algoritma & dosis.

## Struktur

```
acls/
├── index.html        # Beranda, layar simulasi, debrief
├── referensi.html    # Ringkasan algoritma (cheat sheet)
├── css/style.css
└── js/
    ├── ecg.js        # Pustaka ritme, generator gelombang, monitor canvas
    ├── audio.js      # Suara (Web Audio API)
    ├── engine.js     # Mesin simulasi: status pasien, RJP, defibrilator, skor
    ├── actions.js    # Katalog tindakan & aturan kesalahan
    ├── scenarios.js  # Skenario, kriteria penilaian, petunjuk
    └── ui.js         # Antarmuka
```

## Menambah skenario

Tambahkan objek baru ke `LIST` di `js/scenarios.js`: `init` (ritme & tanda vital awal), teks kasus, hasil pemeriksaan (`labs`, `pocus`, `ecg12`, `exam`), hook perilaku (`onShock`, `onAction`, `onTick`), dan `criteria` (gunakan helper `arrestCriteria` / `postCriteria`).

## Catatan

Alat bantu belajar, **bukan** pengganti kursus ACLS bersertifikat atau protokol institusi. Fisiologi pasien disederhanakan. Verifikasi dosis dan alur dengan pedoman resmi.
