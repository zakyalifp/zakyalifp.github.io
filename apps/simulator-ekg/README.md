# Simulator EKG 12-Lead

Latihan interpretasi EKG 12 sadapan untuk dokter umum dan residen di Indonesia. Disajikan di
`https://zakyalifp.github.io/simulator-ekg/`.

- 245 kasus: 115 EKG nyata (PTB-XL/PTB-XL+, Chapman — CC BY 4.0) + 130 sintetis (berlabel)
- Kertas 25/50 mm/s, 5/10/20 mm/mV, layout 3×4/6×2/1 sadapan, zoom & geser, kaliper + march-out,
  amplitudo, penggaris laju, roda aksis, kalkulator QTc, overlay anotasi, pembanding EKG normal
- Mode: Interpretasi Sistematis, Diagnosis Cepat, Kasus Klinis (EKG serial), Monitor Irama
  Dinamis, Kurikulum bertingkat, Latihan Adaptif (pengulangan berjarak)
- Skor per kompetensi, debriefing, progres, PDF ringkasan & sertifikat, Mode Reviewer (`#/reviewer`)
- PWA (offline + paket offline per kategori), mode gelap, WCAG AA, tanpa login & tanpa data pribadi
  (hanya penghitung kunjungan anonim GoatCounter — `docs/GOATCOUNTER.md`)
- Tombol umpan balik ke Google Form, dengan ID kasus terisi otomatis — `docs/FEEDBACK_FORM.md`
- Pembuat: dr. Zaky Alif Pradian (Dokter Internsip, RS Tk. II Moh. Ridwan Meuraksa)

## Struktur

```
src/clinical/ecg-criteria.ts   ← SATU-SATUNYA tempat ambang klinis (dengan sumber & status)
src/ekg/                       ← modul EKG bersama (synthesizer, penampil, monitor) — docs/EKG_MODULE.md
src/cases/                     ← taksonomi diagnosis, kasus sintetis, kasus klinis, skenario monitor
src/scoring/                   ← penilaian, sesi, pengulangan berjarak
tools/ecg-pipeline/            ← pipeline Python (wfdb) PTB-XL/Chapman → public/cases/real/
docs/CLINICAL_REVIEW.md        ← tabel review klinis (dibuat otomatis)
docs/FEEDBACK_FORM.md          ← membuat Google Form umpan balik (skrip otomatis)
docs/GOATCOUNTER.md            ← penghitung kunjungan: cara daftar & aktivasi
src/config/site.ts             ← nama pembuat, URL form, kode GoatCounter
DATA_LICENSES.md               ← lisensi & sitasi data
```

## Perintah

```bash
npm ci
npm run dev              # pengembangan
npm test                 # unit test (rumus, synthesizer, skala, kepatuhan kasus sintetis)
npm run validate:cases   # validasi manifest/bank kasus
npm run build            # build produksi (dist/ + dist/lib/ekg-module.js)
npm run e2e              # end-to-end semua mode + aksesibilitas (butuh build)
npm run docs:clinical    # perbarui tabel docs/CLINICAL_REVIEW.md
```

**Disclaimer:** alat edukasi, bukan alat diagnosis maupun pengganti supervisi/protokol institusi.
