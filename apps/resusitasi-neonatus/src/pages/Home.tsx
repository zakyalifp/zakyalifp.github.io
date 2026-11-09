import { useMemo, useState } from 'react';
import { SCENARIOS } from '../scenarios';
import { TOPICS, TOPIC_LABEL, type Topic } from '../engine/schema';
import { href } from '../router';
import { useHistory } from '../store/history';
import { usePrefs } from '../store/prefs';
import { DISCLAIMER, SITE } from '../config/site';
import { cx } from '../lib/format';
import { COMPRESSIONS } from '../clinical/guidelines';

const DIFF = { 1: 'Dasar', 2: 'Menengah', 3: 'Lanjut' } as const;

export function Home({ onOnboarding }: { onOnboarding: () => void }) {
  const [diff, setDiff] = useState<0 | 1 | 2 | 3>(0);
  const [topic, setTopic] = useState<Topic | ''>('');
  const [q, setQ] = useState('');
  const entries = useHistory((h) => h.entries);
  const onboarded = usePrefs((p) => p.onboarded);
  const best = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.scenarioId, Math.max(m.get(e.scenarioId) ?? 0, e.score));
    return m;
  }, [entries]);
  const list = SCENARIOS.filter(
    (s) =>
      (!diff || s.difficulty === diff) &&
      (!topic || s.topics.includes(topic)) &&
      (!q || `${s.title} ${s.subtitle} ${s.setting}`.toLowerCase().includes(q.toLowerCase())),
  );
  const usedTopics = TOPICS.filter((t) => SCENARIOS.some((s) => s.topics.includes(t)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-6 grid gap-4 rounded-3xl bg-gradient-to-br from-[#1b2a4a] to-[#24406e] p-6 text-white sm:grid-cols-[1.4fr_1fr] sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-200">{SITE.GUIDELINE_LABEL}</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">Latihan resusitasi neonatus real-time untuk dokter umum</h1>
          <p className="mt-3 text-sm text-slate-200 sm:text-base">
            Pimpin resusitasi dari persiapan sampai rujukan: tali pusat, langkah awal, VTP & MR. SOPA, jalan napas lanjutan, kompresi {COMPRESSIONS.RATIO_COMPRESSIONS}:{COMPRESSIONS.RATIO_BREATHS}, epinefrin dan cairan yang Anda hitung sendiri — di Puskesmas sampai RS tipe C.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#daftar" className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 hover:bg-sky-50">
              Pilih skenario
            </a>
            <button type="button" onClick={onOnboarding} className="rounded-xl px-4 py-3 font-semibold text-white ring-1 ring-white/50 hover:bg-white/10" data-testid="open-onboarding">
              {onboarded ? 'Ulangi tur singkat' : 'Tur 60 detik'}
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 p-4 text-sm text-slate-100">
          <p className="font-semibold">Dua mode</p>
          <ul className="mt-2 space-y-2">
            <li>
              <strong>Belajar</strong> — petunjuk langkah, rasional tiap tindakan, umpan balik langsung, bisa jeda & dipercepat.
            </li>
            <li>
              <strong>Ujian</strong> — waktu nyata 1×, tanpa jeda & petunjuk, referensi dikunci, dinilai di akhir.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-300">{DISCLAIMER}</p>
        </div>
      </section>

      <section id="daftar" aria-labelledby="h-katalog">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="h-katalog" className="text-xl font-bold text-slate-900 dark:text-white">
            Katalog skenario <span className="text-base font-normal text-slate-600 dark:text-slate-400">({list.length})</span>
          </h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari skenario…" aria-label="Cari skenario" className="input max-w-xs" />
        </div>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter kesulitan">
          {([0, 1, 2, 3] as const).map((d) => (
            <button key={d} type="button" aria-pressed={diff === d} onClick={() => setDiff(d)} className={cx('chip', diff === d && 'chip-on')} data-testid={`filter-diff-${d}`}>
              {d === 0 ? 'Semua tingkat' : DIFF[d]}
            </button>
          ))}
          <span className="mx-1 hidden w-px bg-slate-300 sm:block dark:bg-slate-700" />
          <select value={topic} onChange={(e) => setTopic(e.target.value as Topic | '')} aria-label="Filter topik" className="input w-auto py-2" data-testid="filter-topic">
            <option value="">Semua topik</option>
            {usedTopics.map((t) => (
              <option key={t} value={t}>
                {TOPIC_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <a
                href={href({ name: 'briefing', id: s.id })}
                className="group flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-sky-400 dark:bg-slate-900 dark:ring-slate-700"
                data-testid={`scenario-${s.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">#{s.number}</span>
                  <span
                    className={cx(
                      'rounded-md px-2 py-0.5 text-xs font-semibold',
                      s.difficulty === 1 && 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
                      s.difficulty === 2 && 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
                      s.difficulty === 3 && 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100',
                    )}
                  >
                    {DIFF[s.difficulty]}
                  </span>
                </div>
                <h3 className="mt-2 font-bold text-slate-900 group-hover:text-sky-800 dark:text-white dark:group-hover:text-sky-300">{s.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{s.subtitle}</p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">📍 {s.setting}</p>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
                  {s.topics.map((t) => (
                    <span key={t} className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                      {TOPIC_LABEL[t]}
                    </span>
                  ))}
                  {best.has(s.id) && <span className="ml-auto text-xs font-semibold text-emerald-700 dark:text-emerald-400">Terbaik {best.get(s.id)}</span>}
                </div>
              </a>
            </li>
          ))}
        </ul>
        {!list.length && <p className="py-8 text-center text-slate-600 dark:text-slate-400">Tidak ada skenario yang cocok dengan filter.</p>}
      </section>
    </div>
  );
}
