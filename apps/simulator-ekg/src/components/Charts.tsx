import type { CompetencyScore, SessionResult } from '../scoring/session';
import { SCORING } from '../clinical/ecg-criteria';
import { cx } from '../lib/format';

export function CompetencyBars({ data, testId }: { data: CompetencyScore[]; testId?: string }) {
  return (
    <ul className="space-y-2" data-testid={testId ?? 'competency-bars'} aria-label="Skor per kompetensi">
      {data.map((c) => (
        <li key={c.competency}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{c.label}</span>
            <span className="font-mono tabular-nums">{c.pct === null ? '—' : `${c.pct}%`}</span>
          </div>
          <div className="mt-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700" role="img" aria-label={`${c.label} ${c.pct ?? 0}%`}>
            <div className={cx('h-3 rounded-full', c.pct === null ? '' : c.pct >= SCORING.PASS_SCORE ? 'bg-emerald-600' : c.pct >= 50 ? 'bg-amber-500' : 'bg-red-600')} style={{ width: `${c.pct ?? 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Peta kompetensi (radar heksagon SVG). */
export function CompetencyRadar({ data }: { data: CompetencyScore[] }) {
  const n = data.length;
  const R = 80;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [R * v * Math.cos(a), R * v * Math.sin(a)];
  };
  const poly = data.map((c, i) => pt(i, (c.pct ?? 0) / 100).join(',')).join(' ');
  return (
    <svg viewBox="-120 -110 240 220" className="mx-auto h-64 w-full max-w-sm" role="img" aria-labelledby="radar-t">
      <title id="radar-t">{`Peta kompetensi: ${data.map((c) => `${c.label} ${c.pct ?? 0}%`).join(', ')}`}</title>
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={data.map((_, i) => pt(i, r).join(',')).join(' ')} className="fill-none stroke-slate-300 dark:stroke-slate-600" />
      ))}
      {data.map((c, i) => {
        const [x, y] = pt(i, 1.2);
        return (
          <text key={c.competency} x={x} y={y + 3} textAnchor="middle" className="fill-slate-700 text-[9px] font-semibold dark:fill-slate-200">
            {c.label}
          </text>
        );
      })}
      <polygon points={poly} className="fill-sky-600/30 stroke-sky-700 dark:stroke-sky-300" strokeWidth="2" />
    </svg>
  );
}

export function ProgressChart({ sessions }: { sessions: SessionResult[] }) {
  const data = sessions.slice(-30);
  if (data.length < 2) return <p className="text-sm text-slate-600 dark:text-slate-400">Grafik muncul setelah minimal 2 sesi.</p>;
  const W = 600;
  const H = 200;
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const path = data.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e.score).toFixed(1)}`).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="pc-t">
        <title id="pc-t">{`Grafik skor ${data.length} sesi terakhir`}</title>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-700" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-600 text-[11px] dark:fill-slate-400">
              {v}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(SCORING.PASS_SCORE)} y2={y(SCORING.PASS_SCORE)} className="stroke-emerald-600" strokeDasharray="4 3" />
        <path d={path} fill="none" className="stroke-sky-700 dark:stroke-sky-400" strokeWidth="2.5" />
        {data.map((e, i) => (
          <circle key={e.id} cx={x(i)} cy={y(e.score)} r="4.5" className={e.passed ? 'fill-emerald-600' : 'fill-amber-500'}>
            <title>{`${e.title}: ${e.score}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-600 dark:text-slate-400">● hijau = lulus, ● jingga = belum lulus; garis putus = batas lulus {SCORING.PASS_SCORE}.</figcaption>
    </figure>
  );
}
