import type { Observation } from '../engine/observe';
import type { SimState } from '../engine/state';
import { BREATHING_LABEL, CHEST_LABEL, COLOR_LABEL, TONE_LABEL } from '../engine/observe';
import { POST_RESUSCITATION } from '../clinical/guidelines';
import { cx } from '../lib/format';

interface Props {
  obs: Observation;
  s: SimState;
  speed: number;
  paused: boolean;
}

function mix(a: [number, number, number], b: [number, number, number], f: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const CYAN: [number, number, number] = [148, 158, 196];
const PINK: [number, number, number] = [236, 176, 160];
const PALE: [number, number, number] = [226, 220, 210];

/** Ilustrasi SVG bayi (tampak atas, terlentang di meja resusitasi). */
export function Baby({ obs, s, speed, paused }: Props) {
  const bodyBase: [number, number, number] = [
    CYAN[0] + (PINK[0] - CYAN[0]) * obs.colorMix,
    CYAN[1] + (PINK[1] - CYAN[1]) * obs.colorMix,
    CYAN[2] + (PINK[2] - CYAN[2]) * obs.colorMix,
  ];
  const body = mix(bodyBase, PALE, Math.min(0.85, obs.pallor));
  const extremity = mix(bodyBase.map((v, i) => v + (CYAN[i] - v) * 0.45) as [number, number, number], PALE, Math.min(0.85, obs.pallor));
  const toneF = obs.tone === 'baik' ? 1 : obs.tone === 'sedang' ? 0.5 : 0;
  // sudut tungkai: fleksi (tonus baik) ↔ ekstensi (lemas)
  const armUp = -20 - 95 * toneF;
  const legBend = 10 + 55 * toneF;

  // gerak dada
  const ventRate = obs.ventilating && obs.chest !== 'tidak-tampak' ? obs.ventRate : 0;
  const spontRate =
    obs.breathing === 'apnea' ? 0 : obs.breathing === 'megap-megap' ? 8 : (POST_RESUSCITATION.RESP_RATE_NORMAL.min + POST_RESUSCITATION.RESP_RATE_NORMAL.max) / 2;
  const rate = ventRate || (obs.chest !== 'tidak-tampak' ? spontRate : 0);
  const amp = obs.chest === 'baik' ? 1 : obs.chest === 'minimal' ? 0.4 : 0;
  const dur = rate > 0 ? 60 / rate / Math.max(1, speed) : 0;
  const animate = dur > 0 && amp > 0 && !paused;
  const mask = (s.vent.mode === 'ppv' || s.vent.mode === 'cpap') && s.vent.iface === 'mask';

  return (
    <figure className="relative flex flex-col items-center" aria-label="Kondisi bayi">
      <svg viewBox="0 0 240 300" className="h-56 w-auto max-w-full sm:h-64" role="img" aria-labelledby="baby-title">
        <title id="baby-title">
          Bayi: {BREATHING_LABEL[obs.breathing]}, tonus {TONE_LABEL[obs.tone]}, warna {COLOR_LABEL[obs.color]}, gerak dada {CHEST_LABEL[obs.chest]}
        </title>
        <defs>
          <radialGradient id="warm" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={s.warmer ? 0.18 : 0} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="240" height="300" rx="18" className="fill-slate-100 dark:fill-slate-800" />
        <rect x="0" y="0" width="240" height="300" rx="18" fill="url(#warm)" />
        {s.skinToSkin && <path d="M0 230 Q120 190 240 230 L240 300 L0 300Z" className="fill-amber-200/60 dark:fill-amber-900/40" />}

        {/* tungkai bawah */}
        <g stroke="#7a5b52" strokeOpacity="0.35" strokeWidth="1.5" fill={extremity}>
          <g transform={`rotate(${legBend} 100 205)`}>
            <rect x="88" y="200" width="24" height="70" rx="12" />
          </g>
          <g transform={`rotate(${-legBend} 140 205)`}>
            <rect x="128" y="200" width="24" height="70" rx="12" />
          </g>
        </g>
        {/* lengan */}
        <g stroke="#7a5b52" strokeOpacity="0.35" strokeWidth="1.5" fill={extremity}>
          <g transform={`rotate(${-armUp} 86 125)`}>
            <rect x="74" y="120" width="20" height="62" rx="10" />
            <circle cx="84" cy="184" r="10" />
          </g>
          <g transform={`rotate(${armUp} 154 125)`}>
            <rect x="146" y="120" width="20" height="62" rx="10" />
            <circle cx="156" cy="184" r="10" />
          </g>
        </g>
        {/* badan dengan gerak dada */}
        <g
          style={
            animate
              ? ({
                  transformOrigin: '120px 170px',
                  animation: `${obs.chestAsymmetric ? 'breathe-asym' : 'breathe'} ${dur}s ease-in-out infinite`,
                  ['--amp' as string]: String(amp),
                } as React.CSSProperties)
              : undefined
          }
        >
          <ellipse cx="120" cy="165" rx="40" ry="58" fill={body} stroke="#7a5b52" strokeOpacity="0.35" strokeWidth="1.5" />
          <path d="M100 150 Q120 158 140 150" fill="none" stroke="#7a5b52" strokeOpacity="0.25" />
          {/* tali pusat */}
          <circle cx="120" cy="190" r="4" fill="#cbd5b1" stroke="#7a8a5a" />
          {s.access.uvcAt !== null && <path d="M120 190 Q150 215 205 230" fill="none" stroke="#64748b" strokeWidth="2" />}
        </g>
        {/* kepala */}
        <g>
          <ellipse cx="120" cy="78" rx="38" ry="40" fill={body} stroke="#7a5b52" strokeOpacity="0.35" strokeWidth="1.5" />
          {s.hat && <path d="M84 70 Q120 22 156 70 Q120 58 84 70Z" className="fill-sky-300 dark:fill-sky-700" />}
          {/* mata */}
          <path d="M104 78 q5 3 10 0 M126 78 q5 3 10 0" stroke="#5b4636" strokeWidth="1.6" fill="none" />
          {/* mulut */}
          {obs.crying ? <ellipse cx="120" cy="100" rx="7" ry="6" fill="#7c2d2d" /> : <path d="M114 100 q6 3 12 0" stroke="#7c2d2d" strokeWidth="1.6" fill="none" />}
          {obs.crying && <path d="M100 70 l8 3 M140 70 l-8 3" stroke="#5b4636" strokeWidth="1.4" />}
        </g>

        {/* alat */}
        {mask && <ellipse cx="120" cy="95" rx="22" ry="17" fill="#e2e8f0" fillOpacity="0.55" stroke="#475569" strokeWidth="2" />}
        {mask && <rect x="114" y="70" width="12" height="12" rx="2" fill="#475569" transform="translate(0 -8)" />}
        {s.lma && <path d="M120 100 L120 40" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />}
        {s.ett.placed && <path d="M118 102 L112 30" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />}
        {s.ogt && <path d="M124 102 Q140 130 128 160" stroke="#f97316" strokeWidth="1.6" fill="none" strokeDasharray="3 2" />}
        {s.oralAirway && <rect x="114" y="96" width="12" height="8" rx="2" fill="#22c55e" />}
        {s.ecg.placedAt !== null && (
          <g fill="#f8fafc" stroke="#334155">
            <circle cx="100" cy="135" r="4" />
            <circle cx="140" cy="135" r="4" />
            <circle cx="122" cy="200" r="4" />
          </g>
        )}
        {s.pulseOx.site && (
          <g>
            <circle cx={s.pulseOx.site === 'tangan-kiri' ? 156 : s.pulseOx.site === 'kaki' ? 150 : 84} cy={s.pulseOx.site === 'kaki' ? 268 : 184} r="7" fill="#ef4444" opacity="0.85">
              <title>Sensor oksimeter ({s.pulseOx.site.replace('-', ' ')})</title>
            </circle>
          </g>
        )}
        {s.wrapped && <path d="M75 115 Q120 100 165 115 L170 240 Q120 260 70 240Z" fill="#e0f2fe" fillOpacity="0.35" stroke="#7dd3fc" strokeDasharray="4 3" />}
        {s.compressions.active && (
          <g className={paused ? '' : 'animate-cpr'} style={{ transformOrigin: '120px 170px' }}>
            <ellipse cx="110" cy="168" rx="8" ry="11" fill="#fde68a" stroke="#92400e" />
            <ellipse cx="130" cy="168" rx="8" ry="11" fill="#fde68a" stroke="#92400e" />
          </g>
        )}
        {s.prone && <text x="120" y="292" textAnchor="middle" className="fill-slate-500 text-[10px]">posisi tengkurap</text>}
      </svg>
      <figcaption className="sr-only">Ilustrasi bayi</figcaption>
    </figure>
  );
}

export function BabyStatus({ obs }: { obs: Observation }) {
  const chip = (label: string, value: string, tone: 'ok' | 'warn' | 'bad', testid: string) => (
    <div
      data-testid={testid}
      className={cx(
        'rounded-xl px-3 py-2 text-sm ring-1',
        tone === 'ok' && 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800',
        tone === 'warn' && 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800',
        tone === 'bad' && 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/50 dark:text-red-100 dark:ring-red-800',
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
  const b = obs.breathing;
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Pemeriksaan bayi">
      {chip('Napas', BREATHING_LABEL[b], b === 'menangis' || b === 'teratur' ? 'ok' : b === 'lemah' ? 'warn' : 'bad', 'status-napas')}
      {chip('Tonus', TONE_LABEL[obs.tone], obs.tone === 'baik' ? 'ok' : obs.tone === 'sedang' ? 'warn' : 'bad', 'status-tonus')}
      {chip('Warna kulit', COLOR_LABEL[obs.color], obs.color === 'merah-muda' ? 'ok' : obs.color === 'akrosianosis' ? 'warn' : 'bad', 'status-warna')}
      {chip('Gerak dada', CHEST_LABEL[obs.chest] + (obs.chestAsymmetric ? ' (asimetris)' : ''), obs.chest === 'baik' && !obs.chestAsymmetric ? 'ok' : obs.chest === 'minimal' ? 'warn' : 'bad', 'status-dada')}
    </div>
  );
}
