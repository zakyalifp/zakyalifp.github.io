# Simulator Resusitasi Neonatus

Latihan resusitasi neonatus **real-time** untuk dokter umum di Indonesia, berbasis
**AHA/AAP 2025 Part 5**, **NRP edisi 9**, dan **alur IDAI 2022**. Disajikan di
`https://zakyalifp.github.io/resusitasi-neonatus/`.

- 16 skenario (Puskesmas sampai RS tipe C), Mode Belajar & Mode Ujian
- Engine fisiologi deterministik (tick 1 detik), monitor EKG/SpO₂ + pita target per menit
- Pengguna menghitung sendiri dosis & volume epinefrin/cairan
- Debriefing per domain, riwayat & grafik progres (localStorage), PDF & sertifikat
- PWA (offline), mode gelap, WCAG AA, tanpa login & tanpa pengumpulan data pribadi (hanya penghitung kunjungan anonim GoatCounter, disisipkan saat deploy)

## Struktur

```
src/clinical/guidelines.ts   ← SATU-SATUNYA tempat angka klinis (dengan sumber & halaman)
src/clinical/algorithm.ts    ← algoritma interaktif halaman Referensi
src/engine/                  ← mesin simulasi (fisiologi, tindakan, penilaian, petunjuk)
src/scenarios/               ← data skenario (lihat docs/MENAMBAH_SKENARIO.md)
src/config/site.ts           ← nama pembuat & tautan Google Form (ubah di sini)
docs/CLINICAL_REVIEW.md      ← tabel review klinis (dibuat otomatis)
e2e/                         ← test Playwright + screenshot
```

## Perintah

```bash
npm ci
npm run dev            # pengembangan
npm test               # unit test engine & nilai klinis
npm run build          # build produksi (dist/)
npm run e2e            # test end-to-end semua skenario (butuh build)
npm run docs:clinical  # perbarui tabel docs/CLINICAL_REVIEW.md
```

Deploy otomatis lewat `.github/workflows/deploy-pages.yml` (test dulu, deploy bila lulus).

**Disclaimer:** alat edukasi, bukan pengganti pelatihan bersertifikat atau protokol institusi.
