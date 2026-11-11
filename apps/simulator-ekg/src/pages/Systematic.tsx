/** Mode 1 — Interpretasi Sistematis: formulir bertahap, pengguna mengukur sendiri. */
import { useEffect, useMemo, useState } from 'react';
import { useCatalog, quizCases } from '../store/catalog';
import { pickCases, useSessionRunner } from '../hooks/useSession';
import { SessionSetup, type SetupValue } from '../components/SessionSetup';
import { loadCase } from '../cases/loader';
import type { CaseMeta, LoadedCase } from '../cases/model';
import { EcgWorkspace } from '../components/EcgWorkspace';
import { AnswerReveal } from '../components/AnswerReveal';
import { DataBadge } from '../components/DataBadge';
import { DIAGNOSES, MGMT_LABEL, PWAVE_LABEL, RHYTHM_LABEL, ST_LABEL, T_LABEL, CATEGORY_LABEL, type Category, type Level } from '../cases/diagnoses';
import { gradeSystematic, makeItem, type StepResult, type SystematicAnswer } from '../scoring/grade';
import { AXIS_LABEL } from '../clinical/ecg-criteria';
import type { MeasureResult } from '../ekg/render/viewer';
import { cx } from '../lib/format';

type NumKey = 'hr' | 'pr' | 'qrs' | 'qtc';

export default function Systematic({ level, cat }: { level?: string; cat?: string }) {
  const all = useCatalog((s) => s.cases);
  const [setup, setSetup] = useState<SetupValue | null>(null);
  const pool = (v: SetupValue) => quizCases(all, { level: v.level || undefined, cat: v.cat || undefined, includeSynthetic: v.includeSynthetic });
  const list = useMemo(() => (setup ? pickCases(pool(setup), setup.n, `sis-${Date.now()}`) : []), [setup]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!setup)
    return (
      <SessionSetup
        title="Interpretasi Sistematis"
        desc="Untuk setiap EKG: ukur sendiri laju, irama, aksis, gelombang P, PR, QRS, ST, T, QT/QTc, lalu tentukan kesimpulan dan tata laksana awal. Nilai dibandingkan dengan ground truth (PTB-XL+ GE 12SL untuk EKG nyata; model untuk sintetis) dengan toleransi."
        initial={{ level: (level as Level) ?? '', cat: (cat as Category) ?? '' }}
        counts={(v) => pool(v).length}
        onStart={setSetup}
      />
    );
  return <Runner list={list} level={setup.level || undefined} />;
}

function Runner({ list, level }: { list: CaseMeta[]; level?: Level }) {
  const [i, setI] = useState(0);
  const runner = useSessionRunner('sistematis', `Interpretasi Sistematis${level ? ` · ${level}` : ''}`, level);
  const meta = list[i];
  const [c, setC] = useState<LoadedCase | null>(null);
  const [ans, setAns] = useState<SystematicAnswer>({});
  const [res, setRes] = useState<StepResult[] | null>(null);
  const [last, setLast] = useState<MeasureResult | null>(null);
  const [t0, setT0] = useState(Date.now());
  useEffect(() => {
    setC(null);
    setAns({});
    setRes(null);
    setT0(Date.now());
    if (meta) void loadCase(meta).then(setC);
  }, [meta]);
  if (!meta) return <p className="p-6">Tidak ada kasus.</p>;
  const set = (p: Partial<SystematicAnswer>) => setAns((a) => ({ ...a, ...p }));
  const submit = () => {
    if (!c) return;
    const steps = gradeSystematic(c.meta, c.truth, ans);
    setRes(steps);
    runner.record(makeItem(c.meta, 'sistematis', steps, Math.round((Date.now() - t0) / 1000)));
  };
  const next = () => {
    if (i + 1 >= list.length) runner.finish();
    else setI(i + 1);
  };
  const sr = (k: string) => res?.find((s) => s.step === k);
  const dxOptions = Object.values(DIAGNOSES).sort((a, b) => a.label.localeCompare(b.label, 'id'));
  const fromCaliper = (k: NumKey) => {
    if (!last || last.kind !== 'caliper' || !last.ms) return;
    if (k === 'hr') set({ hr: last.bpm ?? null });
    else set({ [k]: last.ms } as Partial<SystematicAnswer>);
  };
  const num = ({ k, label, unit, na }: { k: NumKey; label: string; unit: string; na?: 'prNA' | 'qtNA' }) => (
    <Field n={label} r={sr(k)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input !w-28"
          inputMode="numeric"
          aria-label={label}
          value={ans[k] ?? ''}
          disabled={!!res || (na ? !!ans[na] : false)}
          onChange={(e) => set({ [k]: e.target.value === '' ? null : Number(e.target.value) } as Partial<SystematicAnswer>)}
          data-testid={`f-${k}`}
        />
        <span className="text-sm">{unit}</span>
        {!res && (
          <button type="button" className="ctrl" disabled={!last || last.kind !== 'caliper'} onClick={() => fromCaliper(k)} title="Isi dari hasil kaliper terakhir">
            ← kaliper
          </button>
        )}
        {na && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={!!ans[na]} disabled={!!res} onChange={(e) => set({ [na]: e.target.checked } as Partial<SystematicAnswer>)} data-testid={`f-${na}`} /> tidak dapat diukur
          </label>
        )}
      </div>
    </Field>
  );
  const sel = <T extends string>({ k, label, opts }: { k: 'rhythm' | 'p' | 'st' | 't' | 'mgmt' | 'axisCat'; label: string; opts: Record<T, string> }) => (
    <Field n={label} r={sr(k === 'axisCat' ? 'axis' : k)}>
      <select className="select" aria-label={label} value={(ans[k] as string) ?? ''} disabled={!!res} onChange={(e) => set({ [k]: e.target.value } as Partial<SystematicAnswer>)} data-testid={`f-${k}`}>
        <option value="">— pilih —</option>
        {(Object.entries(opts) as Array<[string, string]>).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className="mx-auto max-w-7xl px-4 py-4" data-testid="systematic">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          Kasus {i + 1}/{list.length}
        </span>
        <DataBadge kind={meta.kind} />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {meta.sex === 'L' ? 'Pria' : 'Wanita'} {meta.age ?? '?'} tahun · {CATEGORY_LABEL[meta.category]}
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <EcgWorkspace signal={c?.signal ?? null} annotations={c?.annotations} showAnnotations={!!res} onMeasure={setLast} onAxis={(d) => !res && set({ axis: d })} />
          {res && c && <AnswerReveal c={c} />}
        </div>
        <form
          className="card space-y-2 self-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (res) next();
            else submit();
          }}
          aria-label="Formulir interpretasi"
        >
          {num({ k: 'hr', label: '1. Laju (/menit)', unit: '/menit' })}
          {sel({ k: 'rhythm', label: '2. Irama', opts: RHYTHM_LABEL })}
          <Field n="3. Aksis (°)" r={sr('axis')}>
            <div className="flex gap-2">
              <input className="input !w-24 shrink-0" inputMode="numeric" aria-label="Aksis derajat" value={ans.axis ?? ''} disabled={!!res} onChange={(e) => set({ axis: e.target.value === '' || e.target.value === '-' ? null : Number(e.target.value) })} data-testid="f-axis" />
              <select className="select min-w-0 flex-1" aria-label="Kategori aksis" value={ans.axisCat ?? ''} disabled={!!res} onChange={(e) => set({ axisCat: e.target.value as SystematicAnswer['axisCat'] })}>
                <option value="">atau kategori…</option>
                {Object.entries(AXIS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          {sel({ k: 'p', label: '4. Gelombang P', opts: PWAVE_LABEL })}
          {num({ k: 'pr', label: '5. Interval PR (ms)', unit: 'ms', na: 'prNA' })}
          {num({ k: 'qrs', label: '6. Durasi QRS (ms)', unit: 'ms' })}
          {sel({ k: 'st', label: '7. Segmen ST', opts: ST_LABEL })}
          {sel({ k: 't', label: '8. Gelombang T', opts: T_LABEL })}
          {num({ k: 'qtc', label: '9. QTc Bazett (ms)', unit: 'ms', na: 'qtNA' })}
          <Field n="10. Kesimpulan" r={sr('dx')}>
            <select className="select" aria-label="Kesimpulan" value={ans.dx ?? ''} disabled={!!res} onChange={(e) => set({ dx: e.target.value })} data-testid="f-dx">
              <option value="">— pilih diagnosis —</option>
              {dxOptions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          {sel({ k: 'mgmt', label: '11. Tata laksana awal', opts: MGMT_LABEL })}
          <div className="flex items-center gap-2 pt-2">
            {!res ? (
              <button type="submit" className="btn-primary w-full" disabled={!c} data-testid="submit">
                Periksa jawaban
              </button>
            ) : (
              <button type="submit" className="btn-primary w-full" data-testid="next">
                {i + 1 >= list.length ? 'Selesai → Debriefing' : 'Kasus berikutnya'}
              </button>
            )}
          </div>
          {res && (
            <p className="text-sm font-semibold" data-testid="item-score">
              Skor kasus: {Math.round(runner.items[runner.items.length - 1]?.score * 100)}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ n, r, children }: { n: string; r?: StepResult; children: React.ReactNode }) {
  return (
    <div className={cx('rounded-xl p-2', r && (r.ok ? 'bg-emerald-50 dark:bg-emerald-950/50' : r.credit > 0 ? 'bg-amber-50 dark:bg-amber-950/50' : 'bg-red-50 dark:bg-red-950/50'))}>
      <p className="label">{n}</p>
      {children}
      {r && (
        <p className="mt-1 text-sm" data-testid={`fb-${r.step}`}>
          <span aria-hidden="true">{r.ok ? '✓ ' : r.credit > 0 ? '≈ ' : '✗ '}</span>
          {r.feedback} {!r.ok && <span className="text-slate-700 dark:text-slate-300">(Anda: {r.user}; benar: {r.truth})</span>}
        </p>
      )}
    </div>
  );
}
