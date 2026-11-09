import type { HistoryEntry } from '../store/history';
import { SIM } from '../clinical/guidelines';

/** Grafik garis skor (SVG ringan, tanpa pustaka). */
export function ProgressChart({ entries }: { entries: HistoryEntry[] }) {
  const data = entries.slice(-30);
  if (data.length < 2) return <p className="text-sm text-slate-600 dark:text-slate-400">Grafik muncul setelah minimal 2 latihan.</p>;
  const W = 600;
  const H = 200;
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const path = data.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e.score).toFixed(1)}`).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="chart-t chart-d">
        <title id="chart-t">Grafik progres skor</title>
        <desc id="chart-d">{`Skor ${data.length} latihan terakhir, dari ${data[0].score} sampai ${data[data.length - 1].score}.`}</desc>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-700"  />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-500 text-[11px] dark:fill-slate-400">
              {v}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(SIM.PASS_SCORE)} y2={y(SIM.PASS_SCORE)} className="stroke-emerald-600" strokeDasharray="4 3" />
        <text x={W - pad.r} y={y(SIM.PASS_SCORE) - 4} textAnchor="end" className="fill-slate-500 text-[10px]">
          batas lulus
        </text>
        <path d={path} fill="none" className="stroke-sky-700 dark:stroke-sky-400" strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((e, i) => (
          <circle key={e.id} cx={x(i)} cy={y(e.score)} r="4.5" className={e.passed ? 'fill-emerald-600' : 'fill-amber-500'}>
            <title>{`${e.scenarioTitle}: ${e.score}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-600 dark:text-slate-400">● hijau = lulus, ● jingga = belum lulus. Garis putus-putus = batas lulus.</figcaption>
    </figure>
  );
}
