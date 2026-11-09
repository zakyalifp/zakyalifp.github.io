# Cara Menambah Skenario (bahasa awam)

Anda **tidak perlu mengubah mesin simulasi** untuk menambah kasus. Setiap skenario hanyalah
"formulir isian" (data) di file `src/scenarios/cases-a.ts` atau `src/scenarios/cases-b.ts`.
Mesin simulasi membaca formulir itu, dan pemeriksa otomatis menolak formulir yang salah isi.

> Tips paling mudah: **salin skenario yang paling mirip**, lalu ubah isinya.

---

## 1. Bagian-bagian formulir skenario

| Bagian | Artinya | Contoh |
|---|---|---|
| `id` | Kode unik, huruf kecil & tanda minus | `'sepsis-awitan-dini'` |
| `number` | Nomor urut di katalog (tidak boleh sama) | `17` |
| `title`, `subtitle` | Judul dan subjudul kartu | `'Bayi lahir dari ibu demam'` |
| `setting` | Lokasi | `'RS tipe D, kamar bersalin'` |
| `difficulty` | 1 = Dasar, 2 = Menengah, 3 = Lanjut | `2` |
| `topics` | Label filter (pilih dari daftar yang ada) | `['ventilasi', 'rujukan']` |
| `learningObjectives` | Tujuan belajar (daftar kalimat) | |
| `vignette` | Cerita kasus yang dibaca peserta | |
| `prebirth` | Jawaban 4 pertanyaan pra-kelahiran | usia gestasi, air ketuban, faktor risiko, rencana tali pusat |
| `vigorousAtBirth` | Apakah bayi **bugar** saat lahir | `true` / `false` |
| `staffAtBirth` | Jumlah petugas saat lahir (termasuk peserta) | `2` |
| `equipment` | Alat yang **tidak** tersedia (tulis `false`) | `{ pulseOximeter: false }` |
| `hidden` | Kondisi tersembunyi pasien (lihat bagian 2) | |
| `events` | Kejadian tiba-tiba, mis. pneumotoraks | |
| `referralRequired` | Apakah bayi harus dirujuk | `true` |
| `hieCandidate` | Kandidat terapi hipotermia | `true` |
| `idealPath` | Langkah-langkah ideal + detiknya | lihat bagian 3 |
| `wrongPath` | Contoh langkah keliru (untuk pengujian) | |
| `criteria` | Daftar penilaian | lihat bagian 4 |
| `keyLearnings` | Pembelajaran kunci di debriefing | |
| `familyInfo` | Kalimat penjelasan untuk keluarga | |

## 2. Kondisi tersembunyi pasien (`hidden`)

Ini "pengaturan tubuh" pasien virtual. Angka di sini **bukan** dosis atau pedoman — hanya
menggambarkan seberapa sakit bayinya.

| Isian | Arti | Nilai |
|---|---|---|
| `gaWeeks`, `weightKg` | Usia gestasi & berat | `38`, `3.0` |
| `asphyxia` | Beratnya asfiksia saat lahir | 0 (bugar) – 100 (sangat berat) |
| `cardiacDepression` | Seberapa lemah jantung | 0 (normal) – 1 (henti) |
| `compressionCeiling` | Seberapa jauh jantung pulih **hanya** dengan kompresi. Kecil (mis. `0.35`) = **perlu epinefrin** | 0–1 |
| `volumeDeficit` | Kehilangan darah | 0 – 1 (0,4 = perlu cairan) |
| `lungCompliance` | Kelenturan paru | 1 = normal, 0,4 = kaku |
| `requiredPip` | Tekanan yang dibutuhkan agar dada mengembang | `20`–`30` |
| `maskLeak`, `positionIssue`, `secretions`, `mouthClosed` | Masalah yang harus dikoreksi dengan MR. SOPA | `true` |
| `meconium`, `rds`, `cdh` | Mekonium, defisiensi surfaktan, hernia diafragmatika | `true` |
| `obstruction` | `'choanal'` (atresia koana) atau `'robin'` (Pierre Robin) | |
| `baseDrive`, `driveRecoveryS` | Dorongan napas; lama pulihnya (mis. efek opioid) | |
| `respondsToStimulation` | Apnea primer yang membaik dengan stimulasi | `true` |
| `spo2Ceiling` | Batas atas SpO₂ (mis. HDK) | `90` |
| `epiResponse` | Respons jantung terhadap epinefrin (0 = tidak responsif) | `1` |
| `postGlucoseMgDl` | **Hasil** cek gula darah setelah resusitasi | `40` |
| `cause` | Penyebab dasar (tampil di debriefing) | |

## 3. Jalur ideal (`idealPath`)

Daftar tindakan dengan **detik sejak lahir** (`t`). Detik negatif/`-1` = sebelum lahir.

```ts
idealPath: [
  ...prepSteps(true),                                  // persiapan + panggil bantuan + "Bayi lahir"
  { t: 2, action: 'cord', params: { pilihan: 'segera' } },
  { t: 3, action: 'warmer' },
  { t: 20, action: 'ppv-start', params: ppvParams(38, 3.0) }, // pengaturan VTP otomatis sesuai pedoman
  { t: 21, action: 'pulse-ox', params: { lokasi: 'tangan-kanan' } },
  ...postSteps(300, 3.0, { refer: true }),             // langkah pascaresusitasi standar
],
```

Nama-nama tindakan (`action`) ada di file `src/engine/actions.ts` (kolom `id`). Contoh:
`initial-assess`, `dry`, `wrap`, `ppv-start`, `mr-m`, `intubate`, `compressions-start`,
`uvc`, `epinephrine`, `nacl`, `refer`, `end`.

## 4. Penilaian (`criteria`)

Gunakan "paket kriteria" yang sudah jadi, lalu tambah yang khas kasus:

```ts
criteria: [
  ...prepCriteria(),          // persiapan
  ...nonVigorousInitial(),    // langkah awal bayi tidak bugar
  ...ppvCriteria(),           // VTP ≤60 detik, FiO₂, PIP, oksimeter
  ...compressionCriteria(),   // bila kasus butuh kompresi
  ...epiCriteria(),           // bila butuh epinefrin
  ...teamCriteria(0),
  ...postCriteria({ refer: true }),
  // kriteria khusus:
  { id: 'no-naloxone', domain: 'obat', text: 'Tidak memberi nalokson', critical: true,
    check: { kind: 'notDone', action: 'naloxone' } },
],
```

Jenis pemeriksaan: `done` (dilakukan, bisa diberi batas detik `by`), `notDone`, `before`
(urutan), `judgementOk` / `noJudgement` (penilaian otomatis mesin), `metric` (suhu akhir,
stabil, waktu sampai ventilasi efektif). `critical: true` = kesalahan kritis (tidak lulus).

## 5. Mendaftarkan & menguji

1. Tambahkan nama skenario baru ke daftar di bagian bawah file (`CASES_A` atau `CASES_B`).
2. Buka Pull Request di GitHub. **Pemeriksaan otomatis (GitHub Actions)** akan:
   - memeriksa formulir (isian wajib, nilai yang diperbolehkan);
   - menjalankan jalur ideal → **harus** berakhir bayi stabil dan lulus;
   - menjalankan jalur salah → **harus** gagal/turun skor;
   - menjalankan kedua jalur lewat antarmuka sungguhan (Playwright).
3. Bila ada tanda ❌ merah di Pull Request, buka detailnya — pesan galat menyebut skenario dan
   langkah yang bermasalah (mis. "tindakan tidak tersedia" atau "bayi belum stabil").

Bila jalur ideal belum membuat bayi stabil, biasanya: waktu tindakan terlalu cepat/lambat,
FiO₂ belum dititrasi, atau parameter `hidden` terlalu berat. Ubah sedikit lalu coba lagi.

## 6. Aturan penting

- **Jangan menulis dosis atau ambang klinis di skenario.** Semua angka pedoman ada di
  `src/clinical/guidelines.ts`. Skenario hanya memakai fungsi bantu (`ppvParams`, `epiParams`,
  `naclParams`, `ettParams`) yang menghitung dari file tersebut.
- Bila perlu angka klinis baru, tambahkan ke `guidelines.ts` beserta sumber dan halamannya,
  lalu jalankan `npm run docs:clinical` agar `docs/CLINICAL_REVIEW.md` ikut diperbarui.
