# Kalkulator Kardiovaskular

Kumpulan 7 kalkulator risiko kardiovaskular untuk membantu praktik klinis sehari-hari — CHA₂DS₂-VASc, CHA₂DS₂-VA, HAS-BLED, GRACE 2.0, TIMI (UA/NSTEMI & STEMI), AHA PREVENT, dan Framingham Risk Score.

Dibangun dengan HTML/CSS/JavaScript murni (tanpa framework, tanpa proses build) sehingga mudah dijalankan dan di-deploy. Semua perhitungan berjalan langsung di browser — **tidak ada data pasien yang dikirim ke server mana pun.**

## Cara membuka secara lokal

Cara termudah: buka file `index.html` di folder `kalkulator/` langsung dengan cara double-click, lalu pilih "Open with" browser (Chrome/Firefox/Edge).

Jika ingin menjalankan lewat local server (opsional, hanya untuk pengembangan):

```bash
cd kalkulator
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` di browser.

## Struktur folder

```
kalkulator/
├── index.html          # Semua halaman (landing + 7 kalkulator) dalam satu file
├── css/
│   └── style.css        # Semua styling
├── js/
│   ├── utils.js          # Fungsi bantu bersama (validasi, format, dsb.)
│   ├── app.js             # Navigasi antar kalkulator (tanpa reload halaman)
│   ├── chadsvasc.js        # Logic CHA2DS2-VASc
│   ├── chadsva.js           # Logic CHA2DS2-VA
│   ├── hasbled.js            # Logic HAS-BLED
│   ├── grace.js                # Logic GRACE 2.0
│   ├── timi.js                  # Logic TIMI (UA/NSTEMI + STEMI)
│   ├── prevent.js                 # Logic AHA PREVENT
│   └── framingham.js               # Logic Framingham Risk Score
└── README.md
```

## Cara deploy ke GitHub Pages

Karena repo ini (`zakyalifp.github.io`) sudah menjadi situs GitHub Pages, folder `kalkulator/` otomatis ikut ter-publish begitu di-push ke branch `main`. Setelah merge ke `main`, aplikasi bisa diakses di:

```
https://zakyalifp.github.io/kalkulator/
```

Tidak ada langkah build atau konfigurasi tambahan yang diperlukan.

### Deploy ke Netlify (alternatif)

1. Buat akun di [netlify.com](https://netlify.com).
2. Pilih "Add new site" → "Deploy manually", lalu drag-and-drop folder `kalkulator/`.
3. Netlify akan memberikan link publik secara instan.

## Catatan akurasi

- **CHA₂DS₂-VASc, CHA₂DS₂-VA, HAS-BLED, GRACE 2.0, TIMI, dan Framingham** menggunakan sistem skor berbasis tabel poin yang baku dan telah divalidasi luas (lihat sumber di bagian bawah setiap kalkulator).
- **AHA PREVENT** memakai koefisien regresi resmi model dasar (base model), diekstrak dari paket R `PooledCohort` (open-source, MIT license, oleh Byron Jaeger) dan diverifikasi cocok hingga dua desimal dengan contoh kasus resmi pada Khan et al. 2024 (Circulation;149:430–449), Supplemental Table S12.
- **SCORE2/SCORE2-OP tidak disertakan** — dihapus karena memerlukan tabel baseline hazard spesifik per negara yang tidak dipublikasikan secara bebas (implementasi mandiri hanya bisa berupa aproksimasi dari chart ESC), dan model ini dikalibrasi khusus untuk populasi Eropa sehingga tidak berlaku untuk pasien Indonesia.
- **Framingham Risk Score** adalah skor legacy — kalkulator ini menampilkan banner yang mengarahkan pengguna ke AHA PREVENT sebagai tool yang direkomendasikan guideline terkini.

## Menambah atau mengedit kalkulator

Setiap kalkulator terdiri dari dua bagian yang bisa diedit terpisah:

1. **Form & tampilan hasil** — ada di `index.html`, di dalam `<section class="view" id="view-NAMA">...</section>`.
2. **Logika perhitungan** — ada di file `js/NAMA.js` masing-masing, terpisah dari kode HTML agar mudah di-maintain.

Untuk menambah kalkulator baru: duplikasi salah satu section di `index.html`, buat file JS baru mengikuti pola yang sama, lalu tambahkan link navigasi baru di `<nav class="sidebar-nav">` dan tag `<script>` baru sebelum `js/app.js`.
