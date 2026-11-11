/** Mode 3 — Kasus Klinis (vinyet + EKG serial + keputusan). */
import { useEffect, useState } from 'react';
import { CLINICAL, type CaseRef, type ClinicalScenario } from '../cases/clinical';
import { useCatalog } from '../store/catalog';
import type { CaseMeta, LoadedCase } from '../cases/model';
import { SERIAL_METAS } from '../cases/model';
import { loadCase } from '../cases/loader';
import { EcgWorkspace } from '../components/EcgWorkspace';
import { AnswerReveal } from '../components/AnswerReveal';
import { DataBadge } from '../components/DataBadge';
import { href, navigate } from '../router';
import { LEVEL_LABEL } from '../cases/diagnoses';
import { useSessionRunner } from '../hooks/useSession';
import type { ItemResult, StepResult } from '../scoring/grade';
import { cx } from '../lib/format';

export function resolveRef(ref: CaseRef, cases: CaseMeta[]): CaseMeta | undefined {
  if ('id' in ref) return SERIAL_METAS.find((m) => m.id === ref.id) ?? cases.find((m) => m.id === ref.id);
  const c = cases.filter((m) => m.dx === ref.dx && !m.reference && (!ref.kind || m.kind === ref.kind));
  return c[Math.min(ref.n ?? 0, c.length - 1)] ?? cases.find((m) => m.dx === ref.dx);
}

export default function Clinical({ id }: { id?: string }) {
  const sc = CLINICAL.find((s) => s.id === id);
  if (sc) return <Runner sc={sc} />;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Kasus Klinis</h1>
      <p className="mt-1 text-slate-700 dark:text-slate-300">Vinyet singkat dengan EKG — termasuk EKG serial yang berevolusi — lalu keputusan tata laksana.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="clinical-list">
        {CLINICAL.map((s) => (
          <li key={s.id}>
            <a href={href({ name: 'klinis', id: s.id })} className="card block h-full hover:ring-sky-500" data-testid={`clinical-${s.id}`}>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {LEVEL_LABEL[s.level]} · {s.steps.length} EKG
              </span>
              <h2 className="font-bold">{s.title}</h2>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{s.vignette}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Runner({ sc }: { sc: ClinicalScenario }) {
  const cases = useCatalog((s) => s.cases);
  const runner = useSessionRunner('klinis', `Kasus klinis: ${sc.title}`, sc.level);
  const [k, setK] = useState(0);
  const step = sc.steps[k];
  const meta = resolveRef(step.ecg, cases);
  const [c, setC] = useState<LoadedCase | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [results, setResults] = useState<ItemResult[]>([]);
  useEffect(() => {
    setC(null);
    setPick(null);
    if (meta) void loadCase(meta).then(setC);
  }, [meta]);
  const answer = (i: number) => {
    if (pick !== null || !meta) return;
    setPick(i);
    const o = step.options[i];
    const correct = step.options.find((x) => x.correct)!;
    const s: StepResult = { step: `klinis-${k}`, label: step.question, ok: !!o.correct, credit: o.correct ? 1 : 0, user: o.text, truth: correct.text, feedback: o.feedback, competency: step.competency, weight: 2, critical: !!o.critical };
    const dxStep: StepResult = { step: 'dx', label: 'Interpretasi EKG', ok: !!o.correct, credit: o.correct ? 1 : 0, user: o.text, truth: correct.text, feedback: '', competency: 'irama', weight: 0 };
    const item: ItemResult = { caseId: meta.id, dx: meta.dx, kind: meta.kind, mode: 'klinis', score: o.correct ? 1 : 0, correctDx: !!o.correct, steps: [s, dxStep], criticalErrors: o.critical ? [`${sc.title}: ${o.feedback}`] : [], timeS: 0 };
    setResults((r) => [...r, item]);
    runner.record(item);
  };
  const next = () => {
    if (k + 1 >= sc.steps.length) runner.finish(results);
    else setK(k + 1);
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-4" data-testid="clinical-runner">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className="ctrl" onClick={() => navigate({ name: 'klinis' })}>
          ← Daftar kasus
        </button>
        <h1 className="text-lg font-bold">{sc.title}</h1>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          EKG {k + 1}/{sc.steps.length}
        </span>
        {meta && <DataBadge kind={meta.kind} />}
      </div>
      <div className="card mb-3">
        <p className="leading-relaxed">{sc.vignette}</p>
        <p className="mt-2 font-semibold">{step.prompt}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <EcgWorkspace signal={c?.signal ?? null} annotations={c?.annotations} showAnnotations={pick !== null} />
          {pick !== null && c && <AnswerReveal c={c} showCompare={false} />}
        </div>
        <div className="card space-y-2 self-start">
          <p className="label">{step.question}</p>
          {step.options.map((o, i) => (
            <button key={i} type="button" className={cx('opt', pick !== null && o.correct && 'opt-ok', pick === i && !o.correct && 'opt-bad')} disabled={pick !== null} onClick={() => answer(i)} data-testid={`copt-${i}`}>
              {o.text}
            </button>
          ))}
          {pick !== null && (
            <>
              <p className={cx('rounded-xl p-2 text-sm', step.options[pick].correct ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950')} role="status" data-testid="clinical-feedback">
                {step.options[pick].correct ? '✓ ' : '✗ '}
                {step.options[pick].feedback}
              </p>
              <button type="button" className="btn-primary w-full" onClick={next} data-testid="next">
                {k + 1 >= sc.steps.length ? 'Selesai → Debriefing' : 'Lanjut (EKG berikutnya)'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
