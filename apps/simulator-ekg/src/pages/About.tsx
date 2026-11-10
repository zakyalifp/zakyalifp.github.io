import { DISCLAIMER, SITE } from '../config/site';
import { href } from '../router';

export default function About({ onOnboarding }: { onOnboarding: () => void }) {
  return (
    <div className="prose-sim mx-auto max-w-3xl px-4 py-6">
      <h1>Tentang {SITE.APP_NAME}</h1>
      <p>Simulator latihan interpretasi EKG 12 sadapan untuk dokter umum dan residen di Indonesia. Tanpa login, tanpa server, tanpa pengumpulan data — progres disimpan di perangkat Anda dan dapat dihapus kapan saja di halaman Progres.</p>
      <h2>Cara pakai</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Mulai dari <a href={href({ name: 'kurikulum' })}>Kurikulum</a> (Dasar → Menengah → Lanjut).
        </li>
        <li>Gunakan kaliper, penggaris laju, roda aksis, dan kalkulator QTc untuk mengukur sendiri.</li>
        <li>Setelah menjawab, lihat overlay anotasi bernomor dan bandingkan dengan EKG normal.</li>
        <li>Debriefing menampilkan skor per kompetensi; diagnosis yang salah dijadwalkan ulang di Latihan Adaptif.</li>
      </ol>
      <button type="button" className="btn-secondary mt-3" onClick={onOnboarding} data-testid="about-onboarding">
        Buka panduan membaca kertas & kaliper
      </button>
      <h2>Acuan klinis</h2>
      <p>{SITE.GUIDELINE_LABEL}. Semua ambang ada di satu berkas (<code>src/clinical/ecg-criteria.ts</code>) dengan status verifikasi; nilai yang belum dapat dipastikan ditandai VERIFY untuk ditinjau dokter.</p>
      <h2>Disclaimer</h2>
      <p>{DISCLAIMER}</p>
      <h2>Pembuat</h2>
      <p>
        {SITE.AUTHOR_NAME} · {SITE.AUTHOR_AFFILIATION} · umpan balik: {SITE.FEEDBACK_URL}
      </p>
      <p className="text-sm">Versi {SITE.VERSION}</p>
    </div>
  );
}
