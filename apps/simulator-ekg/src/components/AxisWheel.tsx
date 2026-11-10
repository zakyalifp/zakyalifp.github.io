/**
 * Roda aksis heksaksial interaktif: seret jarum, atau isi defleksi netto I & aVF.
 */
import { useId, useRef, useState } from 'react';
import { AXIS_LABEL, axisCategory, axisFromIaVF, normAngle } from '../clinical/ecg-criteria';

const LEADS = [
  { n: 'I', a: 0 },
  { n: 'II', a: 60 },
  { n: 'III', a: 120 },
  { n: 'aVF', a: 90 },
  { n: 'aVL', a: -30 },
  { n: 'aVR', a: -150 },
];

export function AxisWheel({ value, onChange }: { value: number | null; onChange?: (deg: number) => void }) {
  const [deg, setDeg] = useState<number>(value ?? 60);
  const [netI, setNetI] = useState('');
  const [netF, setNetF] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const id = useId();
  const set = (d: number) => {
    const v = Math.round(normAngle(d));
    setDeg(v);
    onChange?.(v);
  };
  const fromEvent = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    set((Math.atan2(y, x) * 180) / Math.PI);
  };
  const R = 80;
  const rad = (a: number) => (a * Math.PI) / 180;
  const cat = axisCategory(deg);
  const calc = () => {
    const i = parseFloat(netI.replace(',', '.'));
    const f = parseFloat(netF.replace(',', '.'));
    if (Number.isFinite(i) && Number.isFinite(f) && (i !== 0 || f !== 0)) set(axisFromIaVF(i, f));
  };
  return (
    <div className="grid gap-3 sm:grid-cols-[200px_1fr]" data-testid="axis-wheel">
      <svg
        ref={svg}
        viewBox="-100 -100 200 200"
        className="h-48 w-48 touch-none select-none"
        role="slider"
        aria-label="Roda aksis heksaksial"
        aria-valuemin={-180}
        aria-valuemax={180}
        aria-valuenow={deg}
        aria-valuetext={`${deg} derajat, ${AXIS_LABEL[cat]}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') set(deg + 5);
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') set(deg - 5);
        }}
        onPointerDown={(e) => {
          drag.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          fromEvent(e);
        }}
        onPointerMove={(e) => drag.current && fromEvent(e)}
        onPointerUp={() => (drag.current = false)}
      >
        {/* sektor */}
        <path d={`M0 0 L${R} 0 A${R} ${R} 0 0 1 0 ${R} Z`} className="fill-emerald-100 dark:fill-emerald-900/60" />
        <path d={`M0 0 L${R * Math.cos(rad(-30))} ${R * Math.sin(rad(-30))} A${R} ${R} 0 0 1 ${R} 0 Z`} className="fill-emerald-100 dark:fill-emerald-900/60" />
        <path d={`M0 0 L0 ${-R} A${R} ${R} 0 0 1 ${R * Math.cos(rad(-30))} ${R * Math.sin(rad(-30))} Z`} className="fill-amber-100 dark:fill-amber-900/50" />
        <path d={`M0 0 L0 ${R} A${R} ${R} 0 0 1 ${-R} 0 Z`} className="fill-sky-100 dark:fill-sky-900/50" />
        <path d={`M0 0 L${-R} 0 A${R} ${R} 0 0 1 0 ${-R} Z`} className="fill-rose-100 dark:fill-rose-900/50" />
        {LEADS.map((l) => (
          <g key={l.n}>
            <line x1={-R * Math.cos(rad(l.a))} y1={-R * Math.sin(rad(l.a))} x2={R * Math.cos(rad(l.a))} y2={R * Math.sin(rad(l.a))} className="stroke-slate-400" strokeWidth="0.8" strokeDasharray="2 2" />
            <text x={(R + 11) * Math.cos(rad(l.a))} y={(R + 11) * Math.sin(rad(l.a)) + 3} textAnchor="middle" className="fill-slate-700 text-[9px] font-semibold dark:fill-slate-200">
              {l.n}
            </text>
          </g>
        ))}
        <line x1="0" y1="0" x2={R * Math.cos(rad(deg))} y2={R * Math.sin(rad(deg))} className="stroke-sky-800 dark:stroke-sky-300" strokeWidth="4" strokeLinecap="round" />
        <circle cx={R * Math.cos(rad(deg))} cy={R * Math.sin(rad(deg))} r="7" className="fill-sky-800 dark:fill-sky-300" />
        <circle r="3" className="fill-slate-700" />
      </svg>
      <div className="space-y-2 text-sm">
        <p className="text-2xl font-bold tabular-nums" data-testid="axis-value">
          {deg > 0 ? '+' : ''}
          {deg}°
        </p>
        <p className="font-semibold">{AXIS_LABEL[cat]}</p>
        <p className="text-slate-600 dark:text-slate-400">Seret jarum (atau tombol panah). Hijau = normal, kuning = deviasi kiri, biru = deviasi kanan, merah = ekstrem.</p>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label className="block">
            <span className="label" id={`${id}-i`}>
              Netto I (mm)
            </span>
            <input className="input" inputMode="decimal" value={netI} onChange={(e) => setNetI(e.target.value)} aria-labelledby={`${id}-i`} placeholder="mis. 6" />
          </label>
          <label className="block">
            <span className="label" id={`${id}-f`}>
              Netto aVF (mm)
            </span>
            <input className="input" inputMode="decimal" value={netF} onChange={(e) => setNetF(e.target.value)} aria-labelledby={`${id}-f`} placeholder="mis. −3" />
          </label>
          <button type="button" className="ctrl" onClick={calc}>
            Hitung
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Netto = tinggi R − kedalaman Q/S. Rumus: θ = atan2(2·aVF/√3, I).</p>
      </div>
    </div>
  );
}
