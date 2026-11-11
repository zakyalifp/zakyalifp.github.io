/** Pembahasan setelah menjawab: anotasi bernomor, penjelasan, ukuran, sumber, dan
 * perbandingan berdampingan dengan EKG normal. */
import { useEffect, useState } from 'react';
import type { LoadedCase } from '../cases/model';
import { DIAGNOSES, MGMT_LABEL } from '../cases/diagnoses';
import { loadCase } from '../cases/loader';
import { useCatalog } from '../store/catalog';
import { EcgWorkspace } from './EcgWorkspace';
import { DataBadge } from './DataBadge';
import { FeedbackLink } from './Community';
import { feedbackHref } from '../config/site';

export function CaseFacts({ c }: { c: LoadedCase }) {
  const t = c.truth;
  const f = (v: number | null | undefined, u: string) => (v === null || v === undefined ? '—' : `${Math.round(v)}${u}`);
  return (
    <dl className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-6" data-testid="case-facts">
      {[
        ['Laju', f(t.hr, '/mnt')],
        ['PR', f(t.pr, ' ms')],
        ['QRS', f(t.qrs, ' ms')],
        ['QT', f(t.qt, ' ms')],
        ['QTc (B)', f(t.qtcB, ' ms')],
        ['Aksis', t.axis === null ? '—' : `${Math.round(t.axis)}°`],
      ].map(([k, v]) => (
        <div key={k} className="rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-800">
          <dt className="text-xs text-slate-600 dark:text-slate-400">{k}</dt>
          <dd className="font-mono font-semibold tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceLine({ c }: { c: LoadedCase }) {
  const m = c.meta;
  return (
    <p className="text-xs text-slate-600 dark:text-slate-400" data-testid="source-line">
      <DataBadge kind={m.kind} /> {m.kind === 'nyata' ? `${m.dataset} · rekaman ${m.recordId} · ${m.sex === 'L' ? 'pria' : 'wanita'} ${m.age ?? '?'} th · lisensi ${m.license}` : `Sintetis (model VCG, seed tetap) · ${m.sex === 'L' ? 'pria' : 'wanita'} ${m.age} th`}
      {m.real?.labels && (
        <>
          {' '}
          · label asli: <code>{Object.entries(m.real.labels).map(([k, v]) => (typeof v === 'number' ? `${k}${v ? ` ${v}` : ''}` : `${k}: ${v}`)).join(', ')}</code>
        </>
      )}
      {' '}· ukuran: {c.truth.source} · ID kasus: <code data-testid="case-id">{m.id}</code>
      {feedbackHref(m.id) && (
        <>
          {' '}
          · <FeedbackLink caseId={m.id} />
        </>
      )}
    </p>
  );
}

export function AnswerReveal({ c, showCompare = true }: { c: LoadedCase; showCompare?: boolean }) {
  const dx = DIAGNOSES[c.meta.dx];
  const [cmp, setCmp] = useState<LoadedCase | null>(null);
  const [showCmp, setShowCmp] = useState(false);
  const cases = useCatalog((s) => s.cases);
  useEffect(() => {
    if (!showCmp || cmp) return;
    const ref =
      c.meta.kind === 'nyata'
        ? cases.find((x) => x.kind === 'nyata' && x.dx === 'sinus-normal' && x.sex === c.meta.sex) ?? cases.find((x) => x.id === 'syn-normal-ref-l')
        : cases.find((x) => x.id === (c.meta.sex === 'P' ? 'syn-normal-ref-p' : 'syn-normal-ref-l'));
    if (ref) void loadCase(ref).then(setCmp);
  }, [showCmp, cmp, c.meta, cases]);
  return (
    <section className="space-y-3" data-testid="answer-reveal">
      <div className="card">
        <h3 className="text-lg font-bold">{dx.label}</h3>
        <p className="mt-1 leading-relaxed">{dx.explanation}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {dx.findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          <strong>Tata laksana awal:</strong> {MGMT_LABEL[dx.mgmt]}
        </p>
      </div>
      <div className="card">
        <h4 className="font-bold">Lokasi kelainan (overlay bernomor pada kertas)</h4>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm" data-testid="annotation-list">
          {c.annotations.map((a, i) => (
            <li key={i}>
              <strong>{a.label}</strong> — {a.leads.join(', ')}: {a.text}
            </li>
          ))}
        </ol>
        <div className="mt-2">
          <CaseFacts c={c} />
        </div>
        <div className="mt-2">
          <SourceLine c={c} />
        </div>
      </div>
      {showCompare && (
        <div className="card">
          <button type="button" className="btn-secondary" onClick={() => setShowCmp((v) => !v)} aria-expanded={showCmp} data-testid="compare-normal">
            {showCmp ? 'Tutup perbandingan' : 'Bandingkan dengan EKG normal'}
          </button>
          {showCmp && (
            <div className="mt-3 grid gap-3 xl:grid-cols-2" data-testid="compare-panel">
              <div>
                <p className="mb-1 text-sm font-semibold">Kasus ini</p>
                <EcgWorkspace signal={c.signal} annotations={c.annotations} showAnnotations compactTools testId="cmp-case" />
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold">EKG normal pembanding {cmp && <DataBadge kind={cmp.meta.kind} />}</p>
                {cmp ? <EcgWorkspace signal={cmp.signal} compactTools testId="cmp-normal" /> : <p className="text-sm">Memuat…</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
