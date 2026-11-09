import { getScenario } from '../scenarios';
import { href, navigate } from '../router';
import { useSim, type Mode } from '../store/sim';
import { EQUIPMENT_ITEMS } from '../engine/actions';
import { TOPIC_LABEL } from '../engine/schema';

export function Briefing({ id }: { id: string }) {
  const sc = getScenario(id);
  const start = useSim((s) => s.start);
  if (!sc) return <NotFound />;
  const go = (mode: Mode) => {
    if (start(sc.id, mode)) navigate({ name: 'sim', id: sc.id });
  };
  const unavailable = EQUIPMENT_ITEMS.filter((it) => !it.avail(sc));
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <a href={href({ name: 'home' })} className="text-sm font-medium text-sky-800 underline dark:text-sky-300">
        ← Kembali ke katalog
      </a>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        #{sc.number} {sc.title}
      </h1>
      <p className="text-slate-600 dark:text-slate-400">{sc.subtitle}</p>
      <div className="mt-4 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <p className="text-sm">
          <strong>Lokasi:</strong> {sc.setting} · <strong>Tim saat lahir:</strong> {sc.staffAtBirth} orang (termasuk Anda) ·{' '}
          <strong>Topik:</strong> {sc.topics.map((t) => TOPIC_LABEL[t]).join(', ')}
        </p>
        <p className="leading-relaxed text-slate-800 dark:text-slate-200">{sc.vignette}</p>
        {unavailable.length > 0 && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            <strong>Tidak tersedia di fasilitas ini:</strong> {unavailable.map((u) => u.label).join('; ')}.
          </div>
        )}
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Tujuan belajar</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {sc.learningObjectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => go('belajar')} className="btn-primary min-h-16 text-left" data-testid="start-belajar">
          <span className="block text-base">Mulai Mode Belajar</span>
          <span className="block text-xs font-normal opacity-90">Petunjuk, rasional, umpan balik langsung, jeda & percepat</span>
        </button>
        <button type="button" onClick={() => go('ujian')} className="btn-dark min-h-16 text-left" data-testid="start-ujian">
          <span className="block text-base">Mulai Mode Ujian</span>
          <span className="block text-xs font-normal opacity-90">Waktu nyata 1×, tanpa jeda & petunjuk, dinilai di akhir</span>
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Jam simulasi mulai saat Anda menekan “Bayi lahir”. Lakukan persiapan lebih dahulu.</p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
      <a href={href({ name: 'home' })} className="mt-3 inline-block text-sky-800 underline dark:text-sky-300">
        Kembali ke katalog skenario
      </a>
    </div>
  );
}
