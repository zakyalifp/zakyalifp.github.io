/**
 * Mode Reviewer (tersembunyi, buka lewat #/reviewer): galeri semua kasus dengan diagnosis,
 * anotasi, dan penjelasan. Dokter menandai setuju / tidak setuju / catatan, lalu mengekspor
 * JSON. Kasus sintetis ditampilkan paling atas.
 */
import { useMemo, useRef, useState } from 'react';
import { useCatalog } from '../store/catalog';
import { useReview, type Verdict } from '../store/review';
import { SERIAL_METAS, type CaseMeta, type LoadedCase } from '../cases/model';
import { loadCase } from '../cases/loader';
import { CATEGORY_LABEL, DIAGNOSES, LEVEL_LABEL, MGMT_LABEL } from '../cases/diagnoses';
import { EcgWorkspace } from '../components/EcgWorkspace';
import { CaseFacts, SourceLine } from '../components/AnswerReveal';
import { DataBadge } from '../components/DataBadge';
import { SITE } from '../config/site';
import { cx } from '../lib/format';

export default function Reviewer() {
  const all = useCatalog((s) => s.cases);
  const status = useCatalog((s) => s.status);
  const { entries, reviewer, setReviewer, importJson, set } = useReview();
  const [kind, setKind] = useState<'' | 'sintetis' | 'nyata'>('');
  const [only, setOnly] = useState<'' | 'belum' | 'tidak-setuju'>('');
  const [q, setQ] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const list = useMemo(() => {
    const base = [...all.filter((c) => c.kind === 'sintetis'), ...SERIAL_METAS, ...all.filter((c) => c.kind === 'nyata')];
    return base.filter(
      (c) =>
        (!kind || c.kind === kind) &&
        (!only || (only === 'belum' ? !entries[c.id]?.verdict : entries[c.id]?.verdict === 'tidak-setuju')) &&
        (!q || `${c.id} ${c.title} ${c.dx}`.toLowerCase().includes(q.toLowerCase())),
    );
  }, [all, kind, only, q, entries]);
  const total = all.length + SERIAL_METAS.length;
  const done = Object.values(entries).filter((e) => e.verdict).length;
  const exportJson = () => {
    const metas = [...all, ...SERIAL_METAS];
    const reviews = Object.entries(entries).map(([id, e]) => {
      const m = metas.find((x) => x.id === id);
      return { id, dx: m?.dx, dxLabel: m ? DIAGNOSES[m.dx].label : undefined, kind: m?.kind, verdict: e.verdict, note: e.note, at: e.at };
    });
    const data = {
      app: SITE.APP_NAME,
      version: SITE.VERSION,
      exportedAt: new Date().toISOString(),
      reviewer,
      summary: { total, reviewed: reviews.filter((r) => r.verdict).length, setuju: reviews.filter((r) => r.verdict === 'setuju').length, tidakSetuju: reviews.filter((r) => r.verdict === 'tidak-setuju').length, catatan: reviews.filter((r) => r.note).length },
      reviews,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `review-ekg-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const doImport = async (f: File) => {
    try {
      const n = importJson(JSON.parse(await f.text()));
      setMsg(`${n} review diimpor.`);
    } catch {
      setMsg('Berkas tidak valid.');
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" data-testid="reviewer">
      <h1 className="text-2xl font-bold">Mode Reviewer</h1>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        Halaman tersembunyi untuk validasi klinis. Kasus <strong>sintetis ditampilkan paling atas</strong> karena paling membutuhkan validasi. Tandai setiap kasus lalu ekspor JSON dan kirim kembali ke pengembang. Review tersimpan otomatis di perangkat ini.
      </p>
      <div className="card mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <label>
          <span className="label">Nama reviewer</span>
          <input className="input" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="dr. ..." data-testid="reviewer-name" />
        </label>
        <button type="button" className="btn-primary" onClick={exportJson} data-testid="export-json">
          Ekspor JSON ({done}/{total})
        </button>
        <button type="button" className="btn-secondary" onClick={() => file.current?.click()}>
          Impor JSON
        </button>
        <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} aria-label="Impor berkas review" />
        {msg && <p className="text-sm md:col-span-4" role="status">{msg}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className="ctrl" value={kind} onChange={(e) => setKind(e.target.value as 'nyata')} aria-label="Jenis data">
          <option value="">Semua jenis</option>
          <option value="sintetis">Sintetis</option>
          <option value="nyata">Nyata</option>
        </select>
        <select className="ctrl" value={only} onChange={(e) => setOnly(e.target.value as 'belum')} aria-label="Status review">
          <option value="">Semua status</option>
          <option value="belum">Belum direview</option>
          <option value="tidak-setuju">Tidak setuju</option>
        </select>
        <input className="ctrl" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari id/diagnosis" aria-label="Cari" />
        <span className="self-center text-sm">
          {list.length} kasus {status !== 'ready' && '(memuat kasus nyata…)'}
        </span>
      </div>
      <ul className="mt-3 space-y-2" data-testid="review-list">
        {list.map((m, i) => (
          <ReviewCard key={m.id} m={m} n={i + 1} verdict={entries[m.id]?.verdict ?? ''} note={entries[m.id]?.note ?? ''} onSet={(e) => set(m.id, e)} />
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({ m, n, verdict, note, onSet }: { m: CaseMeta; n: number; verdict: Verdict; note: string; onSet: (e: { verdict?: Verdict; note?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<LoadedCase | null>(null);
  const dx = DIAGNOSES[m.dx];
  const toggle = () => {
    setOpen((o) => !o);
    if (!c) void loadCase(m).then(setC);
  };
  return (
    <li className={cx('card', verdict === 'setuju' && 'ring-emerald-400', verdict === 'tidak-setuju' && 'ring-red-400')} data-testid="review-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs">{n}.</span>
        <DataBadge kind={m.kind} />
        <strong>{dx.label}</strong>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {m.id} · {CATEGORY_LABEL[m.category]} · {LEVEL_LABEL[m.level].split(' ')[0]} · {m.sex === 'L' ? 'pria' : 'wanita'} {m.age ?? '?'} th
        </span>
        <div className="ml-auto flex gap-1">
          <button type="button" className={cx('ctrl', verdict === 'setuju' && 'bg-emerald-700 text-white')} aria-pressed={verdict === 'setuju'} onClick={() => onSet({ verdict: verdict === 'setuju' ? '' : 'setuju' })} data-testid="agree">
            ✓ Setuju
          </button>
          <button type="button" className={cx('ctrl', verdict === 'tidak-setuju' && 'bg-red-700 text-white')} aria-pressed={verdict === 'tidak-setuju'} onClick={() => onSet({ verdict: verdict === 'tidak-setuju' ? '' : 'tidak-setuju' })} data-testid="disagree">
            ✗ Tidak setuju
          </button>
          <button type="button" className="ctrl" onClick={toggle} aria-expanded={open} data-testid="expand">
            {open ? 'Tutup' : 'Lihat EKG'}
          </button>
        </div>
      </div>
      <textarea className="input mt-2 min-h-11 text-sm" placeholder="Catatan (opsional): mis. amplitudo T terlalu tinggi, label kurang tepat…" value={note} onChange={(e) => onSet({ note: e.target.value })} aria-label={`Catatan untuk ${m.id}`} />
      {open && (
        <div className="mt-2 space-y-2">
          {c ? (
            <>
              <EcgWorkspace signal={c.signal} annotations={c.annotations} showAnnotations testId={`rv-${m.id}`} />
              <p className="text-sm">{dx.explanation}</p>
              <ul className="list-disc pl-5 text-sm">
                {dx.findings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <ol className="list-decimal pl-5 text-sm">
                {c.annotations.map((a, i) => (
                  <li key={i}>
                    <strong>{a.label}</strong> ({a.leads.join(', ')}): {a.text}
                  </li>
                ))}
              </ol>
              <p className="text-sm">
                <strong>Tata laksana yang dinilai benar:</strong> {MGMT_LABEL[dx.mgmt]} · OMI: {dx.occlusion ? 'ya' : 'tidak'} · reperfusi: {dx.reperfusion ? 'ya' : 'tidak'}
              </p>
              <CaseFacts c={c} />
              <SourceLine c={c} />
              {m.synth && (
                <details className="text-xs">
                  <summary className="cursor-pointer">Parameter synthesizer</summary>
                  <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(m.synth.spec, null, 1)}</pre>
                </details>
              )}
              {m.real?.labels12sl && (
                <p className="text-xs">
                  Pernyataan GE 12SL: <code>{m.real.labels12sl.join(', ')}</code>
                  {m.real.infarctionStadium ? ` · stadium infark: ${m.real.infarctionStadium}` : ''}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">Memuat…</p>
          )}
        </div>
      )}
    </li>
  );
}
