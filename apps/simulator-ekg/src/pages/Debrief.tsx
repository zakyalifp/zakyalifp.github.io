import { useState } from 'react';
import { useProgress } from '../store/progress';
import { usePrefs } from '../store/prefs';
import { href } from '../router';
import { CompetencyBars } from '../components/Charts';
import { DIAGNOSES, LEVEL_LABEL } from '../cases/diagnoses';
import { SCORING } from '../clinical/ecg-criteria';
import { cx } from '../lib/format';

export default function Debrief() {
  const last = useProgress((s) => s.last);
  const sessions = useProgress((s) => s.sessions);
  const userName = usePrefs((p) => p.userName);
  const setPrefs = usePrefs((p) => p.set);
  const [busy, setBusy] = useState(false);
  const s = last ?? null;
  if (!s)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Belum ada debriefing</h1>
        <p className="mt-2">Selesaikan satu sesi latihan untuk melihat debriefing.</p>
        <a className="btn-primary mt-4 inline-flex" href={href({ name: 'kurikulum' })}>
          Ke kurikulum
        </a>
      </div>
    );
  const wrong = s.items.filter((i) => i.score < 0.75);
  const pdf = async () => {
    setBusy(true);
    try {
      const m = await import('../pdf/export');
      await m.exportSummaryPdf(sessions, userName, s);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="debrief">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Debriefing · {s.title}
        {s.level ? ` · ${LEVEL_LABEL[s.level]}` : ''} · {s.items.length} EKG · {Math.round(s.durationS / 60)} menit
      </p>
      <section className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr]">
        <div className={cx('rounded-2xl p-5 text-white', s.passed ? 'bg-emerald-700' : 'bg-slate-800')}>
          <div className="text-sm opacity-90">Skor total</div>
          <div className="text-5xl font-bold tabular-nums" data-testid="score">
            {s.score}
          </div>
          <div className="mt-1 font-semibold" data-testid="pass-status">
            {s.passed ? 'LULUS' : `Belum lulus (batas ${SCORING.PASS_SCORE}, tanpa kesalahan kritis)`}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-2 font-bold">Skor per kompetensi</h2>
          <CompetencyBars data={s.competencies} />
        </div>
      </section>
      {s.criticalErrors.length > 0 && (
        <section className="card mt-3 ring-red-300 dark:ring-red-800" data-testid="critical-errors">
          <h2 className="font-bold text-red-800 dark:text-red-300">Kesalahan kritis ({s.criticalErrors.length}) — skor dibatasi {SCORING.CRITICAL_SCORE_CAP}</h2>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {s.criticalErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="card mt-3">
        <h2 className="font-bold">Rincian per EKG</h2>
        <ol className="mt-2 space-y-2" data-testid="debrief-items">
          {s.items.map((it, i) => (
            <li key={i} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {i + 1}. {DIAGNOSES[it.dx]?.label ?? it.dx}
                </span>
                <span className="text-xs">({it.kind})</span>
                <span className={cx('ml-auto rounded px-2 text-sm font-bold', it.score >= 0.75 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black')}>{Math.round(it.score * 100)}</span>
              </div>
              <ul className="mt-1 grid gap-x-4 text-sm sm:grid-cols-2">
                {it.steps
                  .filter((x) => x.ok !== null && x.weight > 0)
                  .map((x) => (
                    <li key={x.step}>
                      {x.ok ? '✓' : x.credit > 0 ? '≈' : '✗'} {x.label}
                      {!x.ok && <span className="text-slate-600 dark:text-slate-400"> — benar: {x.truth}</span>}
                    </li>
                  ))}
              </ul>
              <a className="text-sm text-sky-800 underline dark:text-sky-300" href={href({ name: 'kasus', id: it.caseId })}>
                Buka kasus
              </a>
            </li>
          ))}
        </ol>
      </section>
      {wrong.length > 0 && (
        <section className="card mt-3">
          <h2 className="font-bold">Pembelajaran kunci</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {Array.from(new Set(wrong.map((w) => w.dx))).map((dx) => (
              <li key={dx}>
                <strong>{DIAGNOSES[dx]?.label}:</strong> {DIAGNOSES[dx]?.explanation}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">Diagnosis ini dijadwalkan ulang lebih cepat di Latihan Adaptif.</p>
        </section>
      )}
      <section className="card mt-3 flex flex-wrap items-end gap-2">
        <label className="flex-1">
          <span className="label">Nama untuk PDF</span>
          <input className="input" value={userName} onChange={(e) => setPrefs({ userName: e.target.value })} placeholder="dr. ..." data-testid="name" />
        </label>
        <button type="button" className="btn-secondary" onClick={pdf} disabled={busy} data-testid="pdf">
          {busy ? 'Menyiapkan…' : 'Unduh PDF ringkasan'}
        </button>
        <a className="btn-primary" href={href({ name: 'latihan', mode: 'adaptif' })}>
          Latihan adaptif
        </a>
        <a className="btn-secondary" href={href({ name: 'progres' })}>
          Lihat progres
        </a>
      </section>
    </div>
  );
}
