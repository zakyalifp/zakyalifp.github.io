/**
 * KONFIGURASI SITUS — ubah teks di sini saja.
 * - AUTHOR_NAME      : nama pembuat & gelar (halaman Tentang & sertifikat)
 * - FEEDBACK_URL     : tautan Google Form umpan balik. Boleh berupa "tautan isian otomatis"
 *                      yang berisi teks KASUS_ID — teks itu diganti ID kasus yang sedang
 *                      dibuka (lihat docs/FEEDBACK_FORM.md). Kosongkan ('') bila belum ada.
 * - GOATCOUNTER_CODE : kode situs GoatCounter (penghitung kunjungan anonim). '' = mati.
 *                      Harus sama dengan CODE di /assets/counter.js (situs utama).
 * - MAIN_SITE_URL    : alamat situs utama
 */
export const SITE = {
  APP_NAME: 'Simulator EKG 12-Lead',
  APP_SHORT: 'Simulator EKG',
  AUTHOR_NAME: 'dr. Zaky Alif Pradian',
  AUTHOR_AFFILIATION: 'Dokter Internsip, RS Tk. II Moh. Ridwan Meuraksa',
  FEEDBACK_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSel-8HG9bdRXFNlZvOdRjk1xquN-f-CSl_4X2YpyPY2fNVxWA/viewform?usp=pp_url&entry.2119513798=KASUS_ID',
  GOATCOUNTER_CODE: 'zakyalifp',
  MAIN_SITE_URL: '../',
  VERSION: '1.1.0',
  GUIDELINE_LABEL: 'UDMI-4 · ESC 2023 · ACC/AHA 2025 · PNPK SKA 2026 · AHA/ACCF/HRS 2009',
} as const;

/** Penanda di FEEDBACK_URL yang diganti ID kasus. */
export const FEEDBACK_CASE_TOKEN = 'KASUS_ID';

/** Tautan form umpan balik (dengan ID kasus bila ada), atau null bila belum dikonfigurasi. */
export function feedbackHref(caseId?: string, url: string = SITE.FEEDBACK_URL): string | null {
  if (!/^https:\/\/\S+$/.test(url)) return null;
  return url.split(FEEDBACK_CASE_TOKEN).join(encodeURIComponent(caseId ?? ''));
}

export const DISCLAIMER =
  'Alat edukasi untuk latihan interpretasi EKG. BUKAN alat diagnosis klinis, BUKAN pengganti supervisi, pelatihan bersertifikat, maupun protokol institusi. EKG sintetis adalah model sederhana; selalu verifikasi dengan pedoman resmi terbaru.';

export const PRIVACY_NOTE =
  'Tanpa login dan tanpa pengumpulan data pribadi: progres latihan hanya disimpan di perangkat Anda. Situs memakai penghitung kunjungan anonim GoatCounter (tanpa cookie; hanya jumlah kunjungan, halaman, negara, dan jenis perangkat).';
