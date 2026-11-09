import { useState } from 'react';
import { useSim } from '../store/sim';
import { usePrefs } from '../store/prefs';
import { href, navigate } from '../router';
import { clock, cx } from '../lib/format';
import type { VitalSample } from '../engine/state';
import { SIM, HEART_RATE } from '../clinical/guidelines';

export function Debrief() {
  const { debrief: d, debriefScenario: sc, debriefState: s, debriefMode: mode, start } = useSim();
  const userName = usePrefs((p) => p.userName);
  const setPrefs = usePrefs((p) => p.set);
  const [busy, setBusy] = useState<string | null>(null);

  if (!d || !sc || !s) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Belum ada debriefing</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Selesaikan satu skenario untuk melihat debriefing.</p>
        <a className="btn-primary mt-4 inline-flex" href={href({ name: 'home' })}>
          Pilih skenario
        </a>
      </div>
    );
  }

  const exportPdf = async (kind: 'debrief' | 'sertifikat') => {
    setBusy(kind);
    try {
      const m = await import('../pdf/export');
      if (kind === 'debrief') await m.exportDebriefPdf(d, sc, mode, userName);
      else await m.exportCertificatePdf(d, sc, mode, userName);
    } finally {
      setBusy(null);
    }
  };
  const retry = () => {
    if (start(sc.id, mode)) navigate({ name: 'sim', id: sc.id });
  };
  const ok = d.outcome === 'stabil' || d.outcome === 'dihentikan-tepat';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="debrief">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Debriefing · {mode === 'belajar' ? 'Mode Belajar' : 'Mode Ujian'} · durasi {clock(d.durationS)}
      </p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        #{sc.number} {sc.title}
      </h1>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={cx('rounded-2xl p-5 text-white', d.passed ? 'bg-emerald-700' : 'bg-slate-800')}>
          <div className="text-sm opacity-90">Skor total</div>
          <div className="text-5xl font-bold tabular-nums" data-testid="score">
            {d.score}
          </div>
          <div className="mt-1 font-semibold" data-testid="pass-status">
            {d.passed ? 'LULUS' : `Belum lulus (batas ${SIM.PASS_SCORE}, tanpa kesalahan kritis)`}
          </div>
        </div>
        <div className={cx('rounded-2xl p-5 ring-1', ok ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800' : 'bg-red-50 ring-red-200 dark:bg-red-950/40 dark:ring-red-800')}>
          <div className="text-sm text-slate-700 dark:text-slate-300">Luaran bayi</div>
          <div className="text-lg font-bold" data-testid="outcome">
            {d.outcomeLabel}
          </div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Akhir: HR {d.finalVitals.hr} · SpO₂ {d.finalVitals.spo2}% · suhu {d.finalVitals.temp.toFixed(1)} °C
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="text-sm text-slate-700 dark:text-slate-300">Waktu sampai ventilasi efektif</div>
          <div className="text-lg font-bold" data-testid="time-effective">
            {d.timeToEffectiveVentilation !== null ? `${d.timeToEffectiveVentilation} detik setelah lahir` : 'Tidak ada VTP efektif'}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Penyebab dasar: {sc.hidden.cause}</div>
        </div>
      </section>

      {d.criticalErrors.length > 0 && (
        <Card title={`Kesalahan kritis (${d.criticalErrors.length})`} tone="bad" testid="critical-errors">
          <ul className="list-disc space-y-1 pl-5">
            {d.criticalErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Skor per domain">
        <ul className="space-y-2">
          {d.domains.map((x) => (
            <li key={x.domain} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_3rem]">
              <span>{x.label}</span>
              <span className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                {x.pct !== null && <span className={cx('block h-3 rounded-full', x.pct >= SIM.PASS_SCORE ? 'bg-emerald-600' : 'bg-amber-500')} style={{ width: `${x.pct}%` }} />}
              </span>
              <span className="text-right font-mono tabular-nums">{x.pct === null ? 'n/a' : x.pct}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Langkah terlewat / tidak tepat">
          {d.missedSteps.length || d.errors.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {d.missedSteps.map((m) => (
                <li key={m}>{m}</li>
              ))}
              {d.errors
                .filter((e) => !d.doseErrors.includes(e) && !e.critical)
                .map((e, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs text-slate-500">{e.t < 0 ? 'pra' : clock(e.t)}</span> {e.msg}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm">Tidak ada. Bagus!</p>
          )}
        </Card>
        <Card title="Kesalahan dosis & perhitungan">
          {d.doseErrors.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {d.doseErrors.map((e, i) => (
                <li key={i}>{e.msg}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Tidak ada kesalahan dosis.</p>
          )}
        </Card>
      </div>

      <Card title="Grafik tanda vital">
        <VitalsChart data={s.history} />
      </Card>

      <Card title="Timeline: tindakan Anda vs waktu ideal">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="timeline">
            <thead className="text-xs uppercase text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-3">Tindakan</th>
                <th className="py-2 pr-3">Ideal</th>
                <th className="py-2 pr-3">Anda</th>
                <th className="py-2">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {d.timeline.map((r) => (
                <tr key={r.action} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1.5 pr-3">{r.label}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.idealT < 0 ? 'pra' : clock(r.idealT)}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.userT === null ? '—' : r.userT < 0 ? 'pra' : clock(r.userT)}</td>
                  <td className={cx('py-1.5 font-mono', r.delta === null ? 'text-red-700 dark:text-red-400' : r.delta > 30 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400')}>
                    {r.delta === null ? 'tidak dilakukan' : r.delta === 0 ? '0' : `${r.delta > 0 ? '+' : ''}${r.delta} dtk`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Kriteria penilaian">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {d.criteria.map((c) => (
            <li key={c.criterion.id} className="flex gap-2">
              <span aria-label={c.passed ? 'tercapai' : 'tidak tercapai'}>{c.passed ? '✅' : '❌'}</span>
              <span>
                {c.criterion.text}
                {c.criterion.critical && <span className="ml-1 rounded bg-red-100 px-1 text-[10px] font-bold text-red-900 dark:bg-red-900 dark:text-red-100">KRITIS</span>}
                {!c.passed && c.detail && <span className="block text-xs text-slate-600 dark:text-slate-400">{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Pembelajaran kunci">
        <ul className="list-disc space-y-1 pl-5">
          {d.keyLearnings.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </Card>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <label htmlFor="nama" className="block text-sm font-semibold">
          Nama untuk PDF & sertifikat
        </label>
        <input id="nama" className="input mt-1 max-w-md" value={userName} onChange={(e) => setPrefs({ userName: e.target.value })} placeholder="mis. dr. Nama Anda" />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={retry} data-testid="retry">
            Ulangi skenario
          </button>
          <a className="btn-secondary" href={href({ name: 'home' })}>
            Skenario lain
          </a>
          <button type="button" className="btn-secondary" onClick={() => exportPdf('debrief')} disabled={busy !== null} data-testid="export-pdf">
            {busy === 'debrief' ? 'Menyiapkan…' : 'Ekspor PDF debriefing'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => exportPdf('sertifikat')} disabled={busy !== null || !d.passed} title={d.passed ? undefined : 'Sertifikat tersedia bila lulus'} data-testid="export-cert">
            {busy === 'sertifikat' ? 'Menyiapkan…' : 'Sertifikat penyelesaian'}
          </button>
        </div>
        {!d.passed && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Sertifikat penyelesaian tersedia setelah lulus skenario.</p>}
      </section>
    </div>
  );
}

function Card({ title, children, tone, testid }: { title: string; children: React.ReactNode; tone?: 'bad'; testid?: string }) {
  return (
    <section
      data-testid={testid}
      className={cx('mt-4 rounded-2xl p-5 ring-1', tone === 'bad' ? 'bg-red-50 text-red-950 ring-red-300 dark:bg-red-950/40 dark:text-red-50 dark:ring-red-800' : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-700')}
    >
      <h2 className="mb-2 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function VitalsChart({ data }: { data: VitalSample[] }) {
  if (data.length < 2) return <p className="text-sm">Data terlalu singkat.</p>;
  const W = 720;
  const H = 220;
  const pad = { l: 36, r: 40, t: 10, b: 24 };
  const tMax = data[data.length - 1].t;
  const x = (t: number) => pad.l + (t / Math.max(1, tMax)) * (W - pad.l - pad.r);
  const yHr = (v: number) => pad.t + (1 - Math.min(200, v) / 200) * (H - pad.t - pad.b);
  const ySp = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const line = (f: (d: VitalSample) => number, y: (v: number) => number) => data.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)},${y(f(d)).toFixed(1)}`).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik HR dan SpO₂ selama skenario">
        {[HEART_RATE.COMPRESSIONS_BELOW_BPM, HEART_RATE.PPV_BELOW_BPM].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={yHr(v)} y2={yHr(v)} className="stroke-slate-300 dark:stroke-slate-700" strokeDasharray="4 3" />
            <text x={pad.l - 4} y={yHr(v) + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
              {v}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(tMax / 60) + 1 }, (_, m) => (
          <text key={m} x={x(m * 60)} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {m}′
          </text>
        ))}
        {[50, 75, 100].map((v) => (
          <text key={`s${v}`} x={W - pad.r + 4} y={ySp(v) + 4} className="fill-cyan-700 text-[10px] dark:fill-cyan-400">
            {v}%
          </text>
        ))}
        <path d={line((d) => d.hr, yHr)} fill="none" stroke="#16a34a" strokeWidth="2.2" />
        <path d={line((d) => d.spo2, ySp)} fill="none" stroke="#0891b2" strokeWidth="2.2" />
      </svg>
      <figcaption className="text-xs text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-green-700">— HR</span> (sumbu kiri, 0–200; garis putus = 60 & 100) · <span className="font-semibold text-cyan-700">— SpO₂ preduktal</span> (sumbu kanan, 0–100%). Nilai sebenarnya pasien virtual.
      </figcaption>
    </figure>
  );
}
