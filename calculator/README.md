# Kalkulator Kardiovaskular

Kumpulan 8 kalkulator risiko kardiovaskular untuk membantu praktik klinis sehari-hari — CHA₂DS₂-VASc, CHA₂DS₂-VA, HAS-BLED, GRACE 2.0, TIMI (UA/NSTEMI & STEMI), SCORE2/SCORE2-OP, AHA PREVENT, dan Framingham Risk Score.

Dibangun dengan HTML/CSS/JavaScript murni (tanpa framework, tanpa proses build) sehingga mudah dijalankan dan di-deploy. Semua perhitungan berjalan langsung di browser — **tidak ada data pasien yang dikirim ke server mana pun.**

## Cara membuka secara lokal

Cara termudah: buka file `index.html` di folder `calculator/` langsung dengan cara double-click, lalu pilih "Open with" browser (Chrome/Firefox/Edge).

Jika ingin menjalankan lewat local server (opsional, hanya untuk pengembangan):

```bash
cd calculator
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` di browser.

## Struktur folder

```
calculator/
├── index.html          # Semua halaman (landing + 8 kalkulator) dalam satu file
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
│   ├── score2.js                 # Logic SCORE2 / SCORE2-OP
│   ├── prevent.js                 # Logic AHA PREVENT
│   └── framingham.js               # Logic Framingham Risk Score
└── README.md
```

## Cara deploy ke GitHub Pages

Karena repo ini (`zakyalifp.github.io`) sudah menjadi situs GitHub Pages, folder `calculator/` otomatis ikut ter-publish begitu di-push ke branch `main`. Setelah merge ke `main`, aplikasi bisa diakses di:

```
https://zakyalifp.github.io/calculator/
```

Tidak ada langkah build atau konfigurasi tambahan yang diperlukan.

### Deploy ke Netlify (alternatif)

1. Buat akun di [netlify.com](https://netlify.com).
2. Pilih "Add new site" → "Deploy manually", lalu drag-and-drop folder `calculator/`.
3. Netlify akan memberikan link publik secara instan.

## Catatan akurasi

- **CHA₂DS₂-VASc, CHA₂DS₂-VA, HAS-BLED, GRACE 2.0, TIMI, dan Framingham** menggunakan sistem skor berbasis tabel poin yang baku dan telah divalidasi luas (lihat sumber di bagian bawah setiap kalkulator).
- **SCORE2/SCORE2-OP dan AHA PREVENT** adalah model regresi Cox dengan puluhan koefisien. Implementasi di aplikasi ini mengikuti struktur dan variabel yang dipublikasikan, namun disarankan untuk **verifikasi dengan kalkulator resmi** (U-Prevent.org untuk SCORE2, professional.heart.org/prevent untuk PREVENT) sebelum dipakai untuk keputusan klinis penting — lihat catatan verifikasi yang tertera pada masing-masing kalkulator tersebut.

## Menambah atau mengedit kalkulator

Setiap kalkulator terdiri dari dua bagian yang bisa diedit terpisah:

1. **Form & tampilan hasil** — ada di `index.html`, di dalam `<section class="view" id="view-NAMA">...</section>`.
2. **Logika perhitungan** — ada di file `js/NAMA.js` masing-masing, terpisah dari kode HTML agar mudah di-maintain.

Untuk menambah kalkulator baru: duplikasi salah satu section di `index.html`, buat file JS baru mengikuti pola yang sama, lalu tambahkan link navigasi baru di `<nav class="sidebar-nav">` dan tag `<script>` baru sebelum `js/app.js`.
