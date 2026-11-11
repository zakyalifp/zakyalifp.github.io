import { href } from '../router';
import { useCatalog, quizCases } from '../store/catalog';
import { useProgress } from '../store/progress';
import { LEVEL_LABEL, type Level } from '../cases/diagnoses';
import { DISCLAIMER, SITE } from '../config/site';
import { FeedbackLink, VisitCount } from '../components/Community';

const MODES = [
  { r: href({ name: 'latihan', mode: 'sistematis' }), t: 'Interpretasi Sistematis', d: 'Ukur sendiri laju, irama, aksis, P, PR, QRS, ST, T, QTc, lalu simpulkan & pilih tata laksana awal.', id: 'mode-sistematis' },
  { r: href({ name: 'latihan', mode: 'cepat' }), t: 'Diagnosis Cepat', d: 'Berbatas waktu, termasuk keputusan kritis: oklusi koroner akut atau bukan, perlu reperfusi segera atau tidak.', id: 'mode-cepat' },
  { r: href({ name: 'klinis' }), t: 'Kasus Klinis', d: 'Vinyet singkat + EKG serial (hiperkalemia sebelum–sesudah terapi, evolusi STEMI) dan keputusan tata laksana.', id: 'mode-klinis' },
  { r: href({ name: 'monitor' }), t: 'Monitor Irama Dinamis', d: 'Strip irama real-time yang berubah: kenali irama baru dan respons dengan cepat.', id: 'mode-monitor' },
  { r: href({ name: 'latihan', mode: 'adaptif' }), t: 'Latihan Adaptif', d: 'Pengulangan berjarak: diagnosis yang sering Anda salah jawab muncul lebih sering.', id: 'mode-adaptif' },
  { r: href({ name: 'bank' }), t: 'Bank Kasus', d: 'Jelajahi semua EKG (nyata & sintetis) per kategori, tingkat, dan jenis data.', id: 'mode-bank' },
];

export function Home({ onOnboarding }: { onOnboarding: () => void }) {
  const cases = useCatalog((s) => s.cases);
  const status = useCatalog((s) => s.status);
  const err = useCatalog((s) => s.error);
  const sessions = useProgress((s) => s.sessions);
  const quiz = quizCases(cases);
  const real = quiz.filter((c) => c.kind === 'nyata').length;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="mb-6 grid gap-4 rounded-3xl bg-gradient-to-br from-[#1b2a4a] to-[#24406e] p-6 text-white md:grid-cols-[1.5fr_1fr] md:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-200">Untuk dokter umum & residen</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">Simulator EKG 12-Lead</h1>
          <p className="mt-3 text-slate-100">
            Latihan membaca EKG pada kertas standar 25 mm/s · 10 mm/mV dengan kaliper, roda aksis, dan kalkulator QTc. Kasus dari rekaman pasien nyata (PTB-XL, Chapman) dan pola langka sintetis — dinilai dengan kriteria UDMI-4, ESC 2023, ACC/AHA 2025, dan PNPK SKA 2026.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={href({ name: 'kurikulum' })} className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 hover:bg-sky-50" data-testid="cta-kurikulum">
              Mulai kurikulum
            </a>
            <button type="button" onClick={onOnboarding} className="rounded-xl px-4 py-3 font-semibold text-white ring-1 ring-white/60 hover:bg-white/10" data-testid="open-onboarding">
              Cara membaca kertas & kaliper
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 p-4 text-sm">
          <p className="text-3xl font-bold tabular-nums" data-testid="case-count">
            {quiz.length}
          </p>
          <p>kasus · {real} EKG nyata · {quiz.length - real} sintetis</p>
          {status === 'loading' && <p className="mt-2 text-sky-100">Memuat katalog EKG nyata…</p>}
          {err && <p className="mt-2 text-amber-200">{err}</p>}
          <p className="mt-3">{sessions.length} sesi latihan tersimpan di perangkat ini.</p>
          <p className="mt-3 text-xs text-slate-200">{DISCLAIMER}</p>
          <p className="mt-3 text-xs text-slate-200">
            Dibuat oleh {SITE.AUTHOR_NAME} · {SITE.AUTHOR_AFFILIATION}
          </p>
          <p className="mt-1 text-xs text-slate-200 [&_a]:text-white">
            <VisitCount />{' '}
            <FeedbackLink label="Beri umpan balik" />
          </p>
        </div>
      </section>
      <h2 className="mb-3 text-lg font-bold">Mode belajar</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <a key={m.t} href={m.r} className="card block hover:ring-sky-500" data-testid={m.id}>
            <h3 className="font-bold text-slate-900 dark:text-white">{m.t}</h3>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{m.d}</p>
          </a>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Langsung per tingkat</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
          <div key={l} className="card">
            <h3 className="font-bold">{LEVEL_LABEL[l]}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{quizCases(cases, { level: l }).length} kasus</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="ctrl" href={href({ name: 'latihan', mode: 'sistematis', level: l })}>
                Sistematis
              </a>
              <a className="ctrl" href={href({ name: 'latihan', mode: 'cepat', level: l })}>
                Cepat
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
