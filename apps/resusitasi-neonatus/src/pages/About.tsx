import { DISCLAIMER, SITE } from '../config/site';

export function About() {
  const formReady = /^https?:\/\//.test(SITE.FEEDBACK_URL);
  return (
    <div className="prose-sim mx-auto max-w-3xl px-4 py-6">
      <h1>Tentang simulator</h1>
      <p>
        {SITE.APP_NAME} adalah alat latihan pengambilan keputusan resusitasi neonatus untuk dokter umum di Indonesia, mengacu pada {SITE.GUIDELINE_LABEL} dan disesuaikan
        dengan konteks fasilitas di Indonesia (Puskesmas, RS tipe C/D, keterbatasan blender oksigen dan monitor, sistem rujukan) dengan merujuk alur IDAI 2022.
      </p>
      <h2>Pembuat</h2>
      <p data-testid="author">
        {SITE.AUTHOR_NAME}
        <br />
        {SITE.AUTHOR_AFFILIATION}
      </p>
      <h2>Umpan balik</h2>
      <p>
        {formReady ? (
          <a href={SITE.FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
            Isi formulir umpan balik
          </a>
        ) : (
          <span>Formulir umpan balik: {SITE.FEEDBACK_URL}</span>
        )}
      </p>
      <h2>Privasi</h2>
      <p>Tanpa login dan tanpa pengumpulan data. Riwayat skor, nama untuk sertifikat, dan pengaturan hanya disimpan di perangkat Anda (localStorage) dan dapat dihapus kapan saja dari halaman Riwayat.</p>
      <h2>Bekerja offline</h2>
      <p>Setelah kunjungan pertama, simulator dapat dipasang di layar utama HP (menu browser → “Tambahkan ke layar utama”) dan berjalan tanpa internet.</p>
      <h2>Disclaimer</h2>
      <p>{DISCLAIMER}</p>
      <p className="text-sm">Versi {SITE.VERSION}</p>
    </div>
  );
}
