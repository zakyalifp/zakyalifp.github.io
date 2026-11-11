# Form Umpan Balik (Google Form)

Form dibuat **otomatis** oleh skrip di bawah — Anda tidak perlu mengetik pertanyaan satu per satu.
Form tersimpan di Google Drive Anda sendiri; jawabannya masuk ke Google Sheet milik Anda.
Simulator tidak menyimpan jawaban apa pun.

## A. Membuat form (±3 menit, sekali saja)

1. Buka **https://script.google.com** (login dengan akun Google Anda) → klik **Proyek baru**.
2. Hapus semua isi editor, lalu **salin seluruh skrip di bagian C** dan tempel.
3. Klik ikon **Simpan** (disket), lalu pilih fungsi `buatFormUmpanBalik` di menu atas dan klik **Jalankan**.
4. Google meminta izin → **Tinjau izin** → pilih akun Anda → bila muncul "Google belum
   memverifikasi aplikasi ini", klik **Lanjutan → Buka (tidak aman)** → **Izinkan**.
   (Ini skrip milik Anda sendiri; izin hanya untuk membuat form & sheet di Drive Anda.)
5. Setelah selesai, buka **Log eksekusi** di bawah editor. Ada 3 tautan:
   - **LINK FORM** — untuk dibagikan ke orang lain.
   - **LINK UNTUK SIMULATOR** — tautan panjang berisi `KASUS_ID`. **Ini yang dipasang di simulator.**
   - **LINK EDIT** — untuk Anda mengubah form.

## B. Memasang ke simulator

Pilih salah satu:

- **Cara termudah:** kirim **LINK UNTUK SIMULATOR** ke pengembang/Claude, nanti dipasangkan lewat PR.
- **Sendiri lewat GitHub:** buka berkas `apps/simulator-ekg/src/config/site.ts` di GitHub → ikon
  pensil (Edit) → ganti baris `FEEDBACK_URL: '',` menjadi
  `FEEDBACK_URL: 'https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123456=KASUS_ID',`
  (tempel tautan Anda di antara tanda kutip) → **Commit changes**. Situs diperbarui ±2 menit.

Setelah terpasang, tombol **Beri umpan balik** muncul di footer, halaman Tentang, dan Debriefing;
setiap kasus mendapat tautan **Laporkan masalah pada kasus ini** yang otomatis mengisi ID kasus
(mis. `syn-wellens-b-19` atau `ptbxl-12345`). Sebelum terpasang, tombol disembunyikan.

Jawaban dapat dilihat di form (tab **Jawaban**) atau di Google Sheet
"Umpan balik Simulator EKG (jawaban)". Aktifkan notifikasi email: tab **Jawaban** → ⋮ →
**Dapatkan notifikasi email untuk jawaban baru**.

## C. Skrip Google Apps Script

```javascript
/**
 * Membuat Google Form "Umpan Balik Simulator EKG 12-Lead" + Google Sheet jawabannya.
 * Jalankan fungsi buatFormUmpanBalik sekali. Hasil (tautan) muncul di Log eksekusi.
 */
function buatFormUmpanBalik() {
  var form = FormApp.create('Umpan Balik — Simulator EKG 12-Lead');
  form.setDescription(
    'Terima kasih telah mencoba Simulator EKG 12-Lead (zakyalifp.github.io/simulator-ekg). ' +
    'Form ini anonim, ±3 menit. Masukan Anda — terutama temuan kesalahan klinis — sangat membantu. ' +
    'Pembuat: dr. Zaky Alif Pradian (Dokter Internsip, RS Tk. II Moh. Ridwan Meuraksa).'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Terima kasih! Masukan Anda sudah tercatat.');

  // --- Bagian 1: Tentang Anda ---
  form.addSectionHeaderItem().setTitle('Tentang Anda');
  form.addMultipleChoiceItem().setTitle('Profesi / jenjang saat ini').setRequired(true)
    .setChoiceValues([
      'Mahasiswa kedokteran / koas', 'Dokter internsip', 'Dokter umum',
      'Residen (PPDS) kardiologi', 'Residen (PPDS) penyakit dalam',
      'Residen (PPDS) anestesi / emergensi / bidang lain', 'Dokter spesialis', 'Perawat / paramedis'
    ]).showOtherOption(true);
  form.addMultipleChoiceItem().setTitle('Tempat kerja utama')
    .setChoiceValues([
      'Puskesmas / klinik pratama', 'RS tipe C/D', 'RS tipe A/B / RS pendidikan',
      'IGD (tipe RS apa pun)', 'Masih pendidikan / belum bekerja'
    ]).showOtherOption(true);
  form.addMultipleChoiceItem().setTitle('Seberapa sering Anda membaca EKG dalam pekerjaan?')
    .setChoiceValues(['Setiap hari', 'Beberapa kali seminggu', 'Beberapa kali sebulan', 'Jarang']);

  // --- Bagian 2: Penggunaan ---
  form.addPageBreakItem().setTitle('Pengalaman memakai simulator');
  form.addCheckboxItem().setTitle('Mode yang sudah Anda coba')
    .setChoiceValues([
      'Interpretasi sistematis', 'Diagnosis cepat', 'Kasus klinis (EKG serial)', 'Monitor dinamis',
      'Kurikulum (Dasar/Menengah/Lanjut)', 'Latihan adaptif', 'Bank kasus', 'Galeri pola sintetis'
    ]);
  form.addCheckboxItem().setTitle('Perangkat yang dipakai').setChoiceValues(['HP', 'Tablet', 'Laptop / komputer']);
  form.addScaleItem().setTitle('Seberapa mudah simulator digunakan?').setBounds(1, 5)
    .setLabels('Sangat sulit', 'Sangat mudah').setRequired(true);
  form.addScaleItem().setTitle('Seberapa jelas kertas EKG terbaca di layar Anda (garis, kaliper, zoom)?')
    .setBounds(1, 5).setLabels('Sulit dibaca', 'Sangat jelas');
  form.addScaleItem().setTitle('Seberapa bermanfaat untuk belajar / pekerjaan Anda?').setBounds(1, 5)
    .setLabels('Tidak bermanfaat', 'Sangat bermanfaat').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Tingkat kesulitan kasus secara umum')
    .setChoiceValues(['Terlalu mudah', 'Pas', 'Terlalu sulit']);

  // --- Bagian 3: Akurasi klinis ---
  form.addPageBreakItem().setTitle('Akurasi klinis')
    .setHelpText('Bila Anda menemukan EKG, kunci jawaban, penjelasan, atau tata laksana yang kurang tepat.');
  form.addMultipleChoiceItem().setTitle('Apakah Anda menemukan kesalahan klinis?')
    .setChoiceValues(['Tidak', 'Ya', 'Ragu-ragu']);
  var kasus = form.addTextItem().setTitle('ID kasus (terisi otomatis bila membuka form dari halaman kasus)')
    .setHelpText('Contoh: syn-wellens-b-19 atau ptbxl-12345. Boleh dikosongkan.');
  form.addParagraphTextItem().setTitle('Jelaskan kesalahannya (dan pedoman/sumber acuan bila ada)');

  // --- Bagian 4: Saran ---
  form.addPageBreakItem().setTitle('Saran');
  form.addParagraphTextItem().setTitle('Fitur yang paling Anda sukai');
  form.addParagraphTextItem().setTitle('Fitur, pola EKG, atau kasus yang ingin ditambahkan');
  form.addScaleItem().setTitle('Seberapa mungkin Anda merekomendasikan simulator ini ke rekan sejawat?')
    .setBounds(0, 10).setLabels('Tidak mungkin', 'Sangat mungkin');
  form.addTextItem().setTitle('Email (opsional — isi hanya bila bersedia dihubungi)')
    .setHelpText('Kosongkan bila ingin tetap anonim.');

  // Jawaban → Google Sheet
  var ss = SpreadsheetApp.create('Umpan balik Simulator EKG (jawaban)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Pastikan form terbit (dapat diisi siapa saja yang punya tautan)
  if (typeof form.setPublished === 'function') form.setPublished(true);
  form.setAcceptingResponses(true);

  // Tautan isian otomatis: ID kasus diisi "KASUS_ID", lalu diganti simulator dengan ID sebenarnya
  var prefill = form.createResponse().withItemResponse(kasus.createResponse('KASUS_ID')).toPrefilledUrl();

  Logger.log('LINK FORM (bagikan): ' + form.getPublishedUrl());
  Logger.log('LINK UNTUK SIMULATOR (pasang di FEEDBACK_URL): ' + prefill);
  Logger.log('LINK EDIT (khusus Anda): ' + form.getEditUrl());
  Logger.log('SHEET JAWABAN: ' + ss.getUrl());
}
```

## D. Daftar pertanyaan (bila ingin membuat manual)

1. Profesi/jenjang (wajib) · 2. Tempat kerja · 3. Frekuensi membaca EKG
4. Mode yang dicoba · 5. Perangkat · 6. Kemudahan (1–5, wajib) · 7. Keterbacaan kertas (1–5)
8. Manfaat (1–5, wajib) · 9. Tingkat kesulitan
10. Menemukan kesalahan klinis? · 11. ID kasus · 12. Uraian kesalahan + sumber
13. Fitur disukai · 14. Usulan tambahan · 15. Rekomendasi ke rekan (0–10) · 16. Email (opsional)

Untuk tautan isian otomatis pada form manual: di editor form → ⋮ → **Dapatkan link isian otomatis**
→ isi kolom "ID kasus" dengan `KASUS_ID` → **Dapatkan link** → salin.
