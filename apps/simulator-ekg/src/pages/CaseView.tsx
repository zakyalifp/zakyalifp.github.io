import { useEffect, useState } from 'react';
import { useCatalog } from '../store/catalog';
import { loadCase } from '../cases/loader';
import type { LoadedCase } from '../cases/model';
import { EcgWorkspace } from '../components/EcgWorkspace';
import { AnswerReveal } from '../components/AnswerReveal';
import { DataBadge } from '../components/DataBadge';
import { href } from '../router';
import { SERIAL_METAS } from '../cases/model';

export default function CaseView({ id }: { id: string }) {
  const cases = useCatalog((s) => s.cases);
  const status = useCatalog((s) => s.status);
  const meta = cases.find((c) => c.id === id) ?? SERIAL_METAS.find((c) => c.id === id);
  const [c, setC] = useState<LoadedCase | null>(null);
  const [err, setErr] = useState('');
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setC(null);
    setReveal(false);
    if (meta) loadCase(meta).then(setC).catch((e) => setErr(String(e)));
  }, [meta]);
  if (!meta) return <p className="px-4 py-10 text-center">{status === 'ready' ? 'Kasus tidak ditemukan.' : 'Memuat katalog…'}</p>;
  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href={href({ name: 'bank' })} className="ctrl">
          ← Bank kasus
        </a>
        <DataBadge kind={meta.kind} />
        <h1 className="text-lg font-bold" data-testid="case-title">
          {reveal ? meta.title : `Kasus: ${meta.sex === 'L' ? 'pria' : 'wanita'} ${meta.age ?? '?'} tahun`}
        </h1>
        <button type="button" className="btn-primary ml-auto" onClick={() => setReveal((v) => !v)} data-testid="reveal">
          {reveal ? 'Sembunyikan jawaban' : 'Tampilkan jawaban & anotasi'}
        </button>
      </div>
      {err && <p role="alert" className="text-red-700">{err}</p>}
      <EcgWorkspace signal={c?.signal ?? null} annotations={c?.annotations} showAnnotations={reveal} label={`EKG 12 sadapan, ${meta.kind}`} />
      {reveal && c && <AnswerReveal c={c} />}
    </div>
  );
}
