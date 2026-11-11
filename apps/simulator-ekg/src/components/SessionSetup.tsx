import { useState } from 'react';
import { CATEGORY_LABEL, LEVEL_LABEL, type Category, type Level } from '../cases/diagnoses';
import { usePrefs } from '../store/prefs';

export interface SetupValue {
  level: Level | '';
  cat: Category | '';
  n: number;
  includeSynthetic: boolean;
}

export function SessionSetup({ title, desc, initial, onStart, counts, nOptions = [5, 10, 15] }: { title: string; desc: string; initial: Partial<SetupValue>; onStart: (v: SetupValue) => void; counts: (v: SetupValue) => number; nOptions?: number[] }) {
  const prefs = usePrefs();
  const [v, setV] = useState<SetupValue>({ level: '', cat: '', n: nOptions[1] ?? nOptions[0], includeSynthetic: prefs.includeSynthetic, ...initial });
  const avail = counts(v);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-slate-700 dark:text-slate-300">{desc}</p>
      <div className="card mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">Tingkat</span>
          <select className="select" value={v.level} onChange={(e) => setV({ ...v, level: e.target.value as Level })} data-testid="setup-level">
            <option value="">Semua tingkat</option>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Kategori</span>
          <select className="select" value={v.cat} onChange={(e) => setV({ ...v, cat: e.target.value as Category })} data-testid="setup-cat">
            <option value="">Semua kategori</option>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="label">Jumlah kasus</legend>
          <div className="flex gap-1">
            {nOptions.map((n) => (
              <button key={n} type="button" className={`ctrl flex-1 ${v.n === n ? 'ctrl-on' : ''}`} aria-pressed={v.n === n} onClick={() => setV({ ...v, n })}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 self-end">
          <input
            type="checkbox"
            checked={v.includeSynthetic}
            onChange={(e) => {
              setV({ ...v, includeSynthetic: e.target.checked });
              prefs.set({ includeSynthetic: e.target.checked });
            }}
          />
          Sertakan kasus sintetis (berlabel ◆)
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={avail === 0} onClick={() => onStart(v)} data-testid="start-session">
          Mulai ({Math.min(v.n, avail)} kasus)
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400">{avail} kasus tersedia</span>
      </div>
    </div>
  );
}
