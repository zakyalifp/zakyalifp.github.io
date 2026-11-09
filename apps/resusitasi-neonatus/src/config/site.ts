/**
 * KONFIGURASI SITUS — ubah teks di sini saja (tidak perlu menyentuh file lain).
 *
 * - AUTHOR_NAME   : nama pembuat & gelar, tampil di halaman "Tentang" dan sertifikat.
 * - FEEDBACK_URL  : tautan Google Form untuk umpan balik pengguna.
 * - MAIN_SITE_URL : alamat situs utama (tombol "Situs utama").
 */
export const SITE = {
  APP_NAME: 'Simulator Resusitasi Neonatus',
  APP_SHORT: 'Resusitasi Neonatus',
  AUTHOR_NAME: '[Nama pembuat, gelar]',
  AUTHOR_AFFILIATION: '[Institusi / afiliasi]',
  FEEDBACK_URL: '[URL Google Form]',
  MAIN_SITE_URL: '../',
  VERSION: '1.0.0',
  GUIDELINE_LABEL: 'AHA/AAP 2025 · NRP edisi 9',
} as const;

export const DISCLAIMER =
  'Alat edukasi untuk latihan pengambilan keputusan. BUKAN pengganti pelatihan resusitasi neonatus bersertifikat (mis. NRP/Resusitasi Neonatus IDAI), supervisi klinis, maupun protokol institusi Anda. Fisiologi pasien virtual disederhanakan. Selalu verifikasi dosis dan alur dengan pedoman resmi terbaru.';
