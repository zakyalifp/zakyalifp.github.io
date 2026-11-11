import { useMemo, useState } from 'react';
import { useCatalog, quizCases } from '../store/catalog';
import { CATEGORY_LABEL, DIAGNOSES, LEVEL_LABEL, type Category, type Level } from '../cases/diagnoses';
import { href } from '../router';
import { DataBadge } from '../components/DataBadge';
import { downloadOfflinePack } from '../cases/loader';
import { cx } from '../lib/format';

export default function Bank() {
  const cases = useCatalog((s) => s.cases);
  const [cat, setCat] = useState<Category | ''>('');
  const [lvl, setLvl] = useState<Level | ''>('');
  const [kind, setKind] = useState<'' | 'nyata' | 'sintetis'>('');
  const [q, setQ] = useState('');
  const [hide, setHide] = useState(false);
  const [pack, setPack] = useState<string>('');
  const list = useMemo(
    () => quizCases(cases).filter((c) => (!cat || c.category === cat) && (!lvl || c.level === lvl) && (!kind || c.kind === kind) && (!q || `${c.title} ${DIAGNOSES[c.dx].findings.join(' ')}`.toLowerCase().includes(q.toLowerCase()))),
    [cases, cat, lvl, kind, q],
  );
  const offline = async () => {
    setPack('Mengunduh…');
    const n = await downloadOfflinePack(list, (d, t) => setPack(`Mengunduh ${d}/${t}…`));
    setPack(`${n} rekaman nyata tersimpan untuk offline (kasus sintetis selalu tersedia offline).`);
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold">Bank Kasus</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{list.length} kasus sesuai filter. Data dimuat per kasus saat dibuka.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <label>
          <span className="label">Kategori</span>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value as Category)} data-testid="filter-cat">
            <option value="">Semua</option>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Tingkat</span>
          <select className="select" value={lvl} onChange={(e) => setLvl(e.target.value as Level)} data-testid="filter-level">
            <option value="">Semua</option>
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Jenis data</span>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as 'nyata')} data-testid="filter-kind">
            <option value="">Nyata & sintetis</option>
            <option value="nyata">Hanya EKG nyata</option>
            <option value="sintetis">Hanya sintetis</option>
          </select>
        </label>
        <label>
          <span className="label">Cari</span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="mis. STEMI, Wellens" />
        </label>
        <div className="flex flex-col justify-end gap-1">
          <label className="ctrl inline-flex items-center gap-2">
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Sembunyikan diagnosis
          </label>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary" onClick={offline} data-testid="offline-pack">
          Unduh paket offline ({cat ? CATEGORY_LABEL[cat] : 'filter ini'})
        </button>
        {pack && <span className="text-sm" role="status">{pack}</span>}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="case-list">
        {list.map((c, i) => (
          <li key={c.id}>
            <a href={href({ name: 'kasus', id: c.id })} className="card flex h-full flex-col gap-1 hover:ring-sky-500" data-testid="case-card">
              <div className="flex items-center gap-2">
                <DataBadge kind={c.kind} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{LEVEL_LABEL[c.level].split(' ')[0]}</span>
              </div>
              <span className={cx('font-semibold', hide && 'text-slate-500')}>{hide ? `Kasus #${i + 1}` : c.title}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {CATEGORY_LABEL[c.category]} · {c.sex === 'L' ? 'pria' : 'wanita'} {c.age ?? '?'} th
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
