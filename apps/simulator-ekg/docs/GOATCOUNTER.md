# Penghitung Kunjungan (GoatCounter)

Seluruh situs zakyalifp.github.io memakai **GoatCounter** — penghitung kunjungan gratis untuk
situs non-komersial, **tanpa cookie dan tanpa data pribadi** (hanya jumlah kunjungan, halaman,
perujuk, negara, jenis perangkat). Tidak perlu banner persetujuan cookie.

## Yang sudah terpasang (lewat PR)

| Halaman | Cara |
|---|---|
| Beranda, Research, CV, Contact | `assets/counter.js`; angka tampil di footer ("This site has been visited … times") |
| Simulator EKG | `src/lib/visits.ts`; angka tampil di Beranda simulator, footer, dan halaman Tentang |
| ACLS, ATLS, kalkulator, resusitasi neonatus | disisipkan otomatis saat deploy (`.github/scripts/inject-counter.sh`); kode sumber tidak diubah |

Penghitung **tidak aktif** di localhost dan saat tes otomatis, sehingga angka hanya berasal dari
pengunjung sungguhan. Angka yang tampil di situs diperbarui GoatCounter paling lambat ±4 jam;
dasbor GoatCounter sendiri real-time.

## Yang perlu Anda lakukan (±3 menit, sekali saja)

1. Buka **https://www.goatcounter.com/signup**.
2. Isi **Code**: `zakyalifp` (harus persis ini — sudah tertulis di kode situs).
   Bila kode itu sudah dipakai orang lain, pilih kode lain lalu beri tahu pengembang, atau ubah
   sendiri `CODE` di `assets/counter.js` dan `GOATCOUNTER_CODE` di
   `apps/simulator-ekg/src/config/site.ts`.
3. Isi email & kata sandi → **Sign up**. Konfirmasi email.
4. Masuk ke dasbor → **Settings** (Pengaturan) → bagian **Site settings** → centang
   **"Allow adding visitor counts on your website"** → **Save**.
   *(Tanpa langkah ini, kunjungan tetap tercatat di dasbor, tetapi angka tidak tampil di situs.)*
5. (Opsional) Centang **"Allow public access to the dashboard"** bila ingin statistik bisa dilihat
   orang lain.

Dasbor Anda: **https://zakyalifp.goatcounter.com** — berisi grafik kunjungan per hari, halaman
terpopuler (mis. `/simulator-ekg/`), asal pengunjung (WhatsApp, Google, dll.), negara, dan perangkat.
