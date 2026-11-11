/** Mode 2 — Diagnosis Cepat (berbatas waktu) & Mode 6 — Latihan Adaptif (pengulangan berjarak). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog, quizCases } from '../store/catalog';
import { pickCases, useSessionRunner } from '../hooks/useSession';
import { SessionSetup, type SetupValue } from '../components/SessionSetup';
import { loadCase } from '../cases/loader';
import type { CaseMeta, LoadedCase } from '../cases/model';
import { EcgWorkspace } from '../components/EcgWorkspace';
import { AnswerReveal } from '../components/AnswerReveal';
import { DataBadge } from '../components/DataBadge';
import { DIAGNOSES, type Category, type Level } from '../cases/diagnoses';
import { gradeQuick, makeItem, pickDistractors, quickQuestions, type QuickQuestion, type StepResult } from '../scoring/grade';
import { adaptivePriority } from '../scoring/session';
import { useProgress } from '../store/progress';
import { SCORING } from '../clinical/ecg-criteria';
import { createRng } from '../ekg/synth/prng';
import { cx } from '../lib/format';

export default function Quick({ adaptive, level, cat }: { adaptive?: boolean; level?: string; cat?: string }) {
  const all = useCatalog((s) => s.cases);
  const cards = useProgress((s) => s.cards);
  const [setup, setSetup] = useState<SetupValue | null>(null);
  const pool = (v: SetupValue) => quizCases(all, { level: v.level || undefined, cat: v.cat || undefined, includeSynthetic: v.includeSynthetic });
  const list = useMemo(() => {
    if (!setup) return [];
    const p = pool(setup);
    if (!adaptive) return pickCases(p, setup.n, `cepat-${Date.now()}`);
    // Adaptif: urutkan diagnosis menurut prioritas SRS lalu ambil satu kasus per diagnosis
    const dxs = adaptivePriority(cards, Array.from(new Set(p.map((c) => c.dx))));
    const rng = createRng(`adaptif-${Date.now()}`);
    return dxs.slice(0, setup.n).map((dx) => {
      const cands = p.filter((c) => c.dx === dx);
      return cands[Math.floor(rng.next() * cands.length)];
    });
  }, [setup]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!setup)
    return (
      <SessionSetup
        title={adaptive ? 'Latihan Adaptif' : 'Diagnosis Cepat'}
        desc={
          adaptive
            ? 'Pengulangan berjarak (SM-2): diagnosis yang jatuh tempo atau sering Anda salah jawab diprioritaskan. Format sama dengan Diagnosis Cepat.'
            : `Waktu terbatas per EKG (Dasar ${SCORING.QUICK_TIME_LIMIT_S.dasar} dtk, Menengah ${SCORING.QUICK_TIME_LIMIT_S.menengah} dtk, Lanjut ${SCORING.QUICK_TIME_LIMIT_S.lanjut} dtk). Tentukan diagnosis dan keputusan kritis: oklusi koroner akut atau bukan, perlu reperfusi segera atau tidak.`
        }
        initial={{ level: (level as Level) ?? '', cat: (cat as Category) ?? '' }}
        counts={(v) => pool(v).length}
        onStart={setSetup}
        nOptions={[5, 10, 20]}
      />
    );
  return <Runner list={list} level={setup.level || undefined} adaptive={adaptive} poolDx={Array.from(new Set(all.filter((c) => !c.reference).map((c) => c.dx)))} />;
}

function Runner({ list, level, adaptive, poolDx }: { list: CaseMeta[]; level?: Level; adaptive?: boolean; poolDx: string[] }) {
  const [i, setI] = useState(0);
  const runner = useSessionRunner(adaptive ? 'adaptif' : 'cepat', adaptive ? 'Latihan Adaptif' : 'Diagnosis Cepat', level);
  const meta = list[i];
  const [c, setC] = useState<LoadedCase | null>(null);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [res, setRes] = useState<StepResult[] | null>(null);
  const limit = SCORING.QUICK_TIME_LIMIT_S[meta?.level ?? 'menengah'];
  const [left, setLeft] = useState<number>(limit);
  const t0 = useRef(Date.now());
  const qs: QuickQuestion[] = useMemo(() => {
    if (!meta) return [];
    const rng = createRng(meta.id);
    const qq = quickQuestions(meta, pickDistractors(meta.dx, poolDx, 3, () => rng.next()));
    qq[0].options = qq[0].options.map((o) => [rng.next(), o] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    return qq;
  }, [meta, poolDx]);

  useEffect(() => {
    setC(null);
    setAns({});
    setRes(null);
    if (meta) void loadCase(meta).then((x) => {
      setC(x);
      t0.current = Date.now();
      setLeft(SCORING.QUICK_TIME_LIMIT_S[meta.level]);
    });
  }, [meta]);
  const submit = (timedOut = false) => {
    if (!c || res) return;
    const steps = gradeQuick(c.meta, qs, ans, timedOut);
    setRes(steps);
    runner.record(makeItem(c.meta, adaptive ? 'adaptif' : 'cepat', steps, Math.round((Date.now() - t0.current) / 1000)));
  };
  useEffect(() => {
    if (!c || res) return;
    const id = window.setInterval(() => {
      const l = limit - Math.floor((Date.now() - t0.current) / 1000);
      setLeft(l);
      if (l <= 0) submit(true);
    }, 250);
    return () => clearInterval(id);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!meta) return <p className="p-6">Tidak ada kasus.</p>;
  const next = () => (i + 1 >= list.length ? runner.finish() : setI(i + 1));
  const complete = qs.every((q) => ans[q.id]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-4" data-testid="quick">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          EKG {i + 1}/{list.length}
        </span>
        <DataBadge kind={meta.kind} />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {meta.sex === 'L' ? 'Pria' : 'Wanita'} {meta.age ?? '?'} tahun
        </span>
        <span className={cx('ml-auto rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums', left <= 10 && !res ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800')} role="timer" aria-live="off" data-testid="timer">
          {res ? '—' : `${Math.max(0, left)} dtk`}
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <EcgWorkspace signal={c?.signal ?? null} annotations={c?.annotations} showAnnotations={!!res} compactTools={!res} />
          {res && c && <AnswerReveal c={c} />}
        </div>
        <div className="card space-y-3 self-start">
          {qs.map((q) => {
            const r = res?.find((x) => x.step === q.id);
            return (
              <fieldset key={q.id} data-testid={`q-${q.id}`}>
                <legend className="label">{q.text}</legend>
                <div className={cx('grid gap-1.5', q.options.length === 2 && 'grid-cols-2')}>
                  {q.options.map((o) => {
                    const on = ans[q.id] === o.value;
                    const isAns = res && o.value === q.answer;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        className={cx('opt', on && !res && 'opt-on', isAns && 'opt-ok', res && on && !isAns && 'opt-bad')}
                        aria-pressed={on}
                        disabled={!!res}
                        onClick={() => setAns((a) => ({ ...a, [q.id]: o.value }))}
                        data-testid={`opt-${q.id}-${o.value}`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                {r && !r.ok && r.critical && <p className="mt-1 text-sm font-semibold text-red-800 dark:text-red-300">Kesalahan kritis.</p>}
              </fieldset>
            );
          })}
          {!res ? (
            <button type="button" className="btn-primary w-full" disabled={!complete || !c} onClick={() => submit(false)} data-testid="submit">
              Kunci jawaban
            </button>
          ) : (
            <>
              <p className="text-sm font-semibold" data-testid="item-score">
                {res.find((x) => x.step === 'dx')?.ok ? '✓ Diagnosis tepat' : `✗ Jawaban: ${DIAGNOSES[meta.dx].label}`} · skor {Math.round((runner.items[runner.items.length - 1]?.score ?? 0) * 100)}
              </p>
              <button type="button" className="btn-primary w-full" onClick={next} data-testid="next">
                {i + 1 >= list.length ? 'Selesai → Debriefing' : 'EKG berikutnya'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
