import { useEffect, useRef } from 'react';
import type { Observation } from '../engine/observe';
import { clock, cx } from '../lib/format';
import { COMPRESSIONS } from '../clinical/guidelines';

interface Props {
  obs: Observation;
  t: number;
  speed: number;
  paused: boolean;
  onBeat?: () => void;
  compact?: boolean;
}

/** Bentuk gelombang EKG satu siklus (fase 0–1). */
function ecgShape(p: number): number {
  const g = (c: number, w: number, a: number) => a * Math.exp(-((p - c) ** 2) / (2 * w * w));
  return g(0.12, 0.025, 0.12) + g(0.245, 0.008, -0.12) + g(0.26, 0.01, 1) + g(0.275, 0.009, -0.25) + g(0.47, 0.045, 0.25);
}
/** Bentuk gelombang pletismografi satu siklus. */
function plethShape(p: number): number {
  const q = (p + 0.75) % 1;
  if (q < 0.25) return Math.sin((q / 0.25) * (Math.PI / 2));
  const d = (q - 0.25) / 0.75;
  return Math.max(0, Math.cos(d * (Math.PI / 2))) * (1 - 0.15 * Math.sin(d * Math.PI * 2));
}

export function Monitor({ obs, t, speed, paused, onBeat, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef(obs);
  live.current = obs;
  const timing = useRef({ speed, paused, onBeat });
  timing.current = { speed, paused, onBeat };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let x = 0;
    let beatPhase = 0;
    let cprPhase = 0;
    let prevEcgY: number | null = null;
    let prevPlY: number | null = null;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#05080d';
      ctx.fillRect(0, 0, r.width, r.height);
      x = 0;
      prevEcgY = prevPlY = null;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const frame = (now: number) => {
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { speed: sp, paused: pz, onBeat: cb } = timing.current;
      const o = live.current;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const dt = pz ? 0 : dtReal * sp;
      const hr = o.trueHr;
      const pxPerS = Math.max(60, w / 5);
      const steps = Math.max(1, Math.round(dtReal * pxPerS));
      for (let i = 0; i < steps; i++) {
        const sub = dt / steps;
        if (hr > 3) {
          const nb = beatPhase + (sub * hr) / 60;
          if (Math.floor(nb) > Math.floor(beatPhase) && cb) cb();
          beatPhase = nb;
        }
        if (o.compressing) cprPhase += (sub * COMPRESSIONS.COMPRESSIONS_PER_MIN) / 60;
        if (!pz) x += 1;
        if (x >= w) x = 0;
        ctx.fillStyle = '#05080d';
        ctx.fillRect(x, 0, 8, h);
        if (pz) continue;
        const half = h / 2;
        // EKG
        let ey: number;
        if (o.ecgOn) {
          let v = hr > 3 ? ecgShape(beatPhase % 1) : 0;
          if (o.compressing) v += 0.35 * Math.sin(cprPhase * Math.PI * 2);
          ey = half * 0.55 - v * half * 0.45;
        } else ey = half * 0.55;
        ctx.strokeStyle = o.ecgOn ? '#3ee07a' : '#1f3a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 1, prevEcgY ?? ey);
        ctx.lineTo(x, ey);
        ctx.stroke();
        prevEcgY = x === 0 ? null : ey;
        // Pleth
        let py: number;
        if (o.spo2Display !== null) {
          const v = plethShape(beatPhase % 1);
          py = half + half * 0.85 - v * half * 0.6;
        } else py = half + half * 0.85;
        ctx.strokeStyle = o.spo2Display !== null ? '#38d6f0' : '#17323a';
        ctx.beginPath();
        ctx.moveTo(x - 1, prevPlY ?? py);
        ctx.lineTo(x, py);
        ctx.stroke();
        prevPlY = x === 0 ? null : py;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const target = obs.target;
  const spo2 = obs.spo2Display;
  const below = spo2 !== null && target && spo2 < target.min;
  const above = spo2 !== null && target && spo2 > target.max;
  const hrAlarm = obs.alarms.some((a) => a.startsWith('HR'));

  return (
    <section aria-label="Monitor tanda vital" className="rounded-2xl bg-[#05080d] p-2 text-white shadow-lg ring-1 ring-black/40 sm:p-3" data-testid="monitor">
      <div className="mb-1 flex items-center justify-between gap-2 px-1 font-mono text-xs text-slate-300">
        <span>
          Sejak lahir <strong className="text-base text-white tabular-nums" data-testid="clock">{clock(t)}</strong>
        </span>
        <span className="rounded bg-white/10 px-2 py-0.5" data-testid="fio2">
          FiO₂ <strong className="text-white">{obs.fio2}%</strong>
        </span>
        <span>
          Suhu <strong className="text-white tabular-nums">{obs.tempDisplay !== null ? `${obs.tempDisplay.toFixed(1)} °C` : '—'}</strong>
        </span>
      </div>
      <div className={cx('grid gap-2', compact ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_auto]')}>
        <canvas ref={canvasRef} className={cx('w-full rounded-lg', compact ? 'h-28' : 'h-36 sm:h-44')} aria-hidden="true" />
        <div className="flex min-w-[7.5rem] flex-col justify-between gap-1">
          <div className={cx('rounded-lg px-2 py-1', hrAlarm && 'animate-pulse bg-red-600/30')}>
            <div className="flex items-baseline justify-between font-mono text-[11px] text-[#3ee07a]">
              <span>HR</span>
              <span className="text-slate-400">{obs.hrSource === 'ekg' ? 'EKG' : obs.hrSource === 'oksimeter' ? 'SpO₂' : ''}</span>
            </div>
            <div className="text-right font-mono text-4xl font-bold leading-none text-[#3ee07a] tabular-nums sm:text-5xl" data-testid="hr">
              {obs.hrDisplay ?? '—'}
            </div>
          </div>
          <div className={cx('rounded-lg px-2 py-1', (below || above) && 'bg-amber-500/20')}>
            <div className="flex items-baseline justify-between font-mono text-[11px] text-[#38d6f0]">
              <span>SpO₂ {obs.spo2Site && obs.spo2Site !== 'tangan-kanan' ? '(postduktal)' : 'preduktal'}</span>
            </div>
            <div className="text-right font-mono text-4xl font-bold leading-none text-[#38d6f0] tabular-nums sm:text-5xl" data-testid="spo2">
              {spo2 ?? (obs.spo2Acquiring ? '…' : '—')}
            </div>
          </div>
        </div>
      </div>
      <Spo2Band target={target} value={spo2} />
      <div className="mt-1 min-h-5 px-1 font-mono text-xs" role="status" aria-live="off">
        {obs.alarms.length ? (
          <span className="font-bold text-amber-300">⚠ {obs.alarms.join(' · ')}</span>
        ) : !obs.monitorAvailable ? (
          <span className="text-slate-400">Tidak ada monitor di fasilitas ini — nilai HR dengan stetoskop.</span>
        ) : obs.spo2Acquiring ? (
          <span className="text-slate-400">Oksimeter mencari sinyal…</span>
        ) : (
          <span className="text-slate-500">{obs.ecgOn ? 'EKG 3 sadapan' : 'EKG belum terpasang'}</span>
        )}
      </div>
    </section>
  );
}

function Spo2Band({ target, value }: { target: { min: number; max: number } | null; value: number | null }) {
  const lo = 40;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (100 - lo)) * 100))}%`;
  return (
    <div className="mt-2 px-1">
      <div className="mb-0.5 flex justify-between font-mono text-[10px] text-slate-400">
        <span>Target SpO₂ preduktal menit ini</span>
        <span className="text-slate-200" data-testid="spo2-target">{target ? `${target.min}–${target.max}%` : 'belum berlaku (<1 menit)'}</span>
      </div>
      <div className="relative h-3 rounded-full bg-white/10" aria-hidden="true">
        {target && <div className="absolute inset-y-0 rounded-full bg-[#38d6f0]/35 ring-1 ring-[#38d6f0]/70" style={{ left: pos(target.min), width: `calc(${pos(target.max)} - ${pos(target.min)})` }} />}
        {value !== null && <div className="absolute -top-0.5 h-4 w-1.5 -translate-x-1/2 rounded bg-white" style={{ left: pos(value) }} />}
      </div>
    </div>
  );
}
