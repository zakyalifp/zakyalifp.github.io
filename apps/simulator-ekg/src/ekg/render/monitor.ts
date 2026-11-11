/**
 * Monitor irama real-time bergaya monitor bedside (sapuan kiri→kanan, latar gelap).
 * Vanilla: `mountRhythmMonitor(canvas, stream, opts)` → { destroy, pause, resume }.
 */
import type { LeadName } from '../core/types';
import type { EcgStream } from '../synth/stream';

export interface MonitorOptions {
  lead?: LeadName;
  /** Lebar jendela sapuan (detik). */
  windowS?: number;
  /** Skala tampilan (mm/mV pada layar; 10 = standar). */
  gain?: number;
  color?: string;
  background?: string;
  /** Dipanggil pada setiap QRS (untuk "beep" dan laju). */
  onBeat?: (t: number) => void;
  /** Kecepatan simulasi (1 = real-time). */
  speed?: number;
}

export interface MonitorHandle {
  destroy(): void;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  setSpeed(s: number): void;
}

export function mountRhythmMonitor(canvas: HTMLCanvasElement, stream: EcgStream, o: MonitorOptions = {}): MonitorHandle {
  const ctx = canvas.getContext('2d')!;
  const lead = o.lead ?? 'II';
  const win = o.windowS ?? 6;
  const color = o.color ?? '#3ee07a';
  const bg = o.background ?? '#05080d';
  let speed = o.speed ?? 1;
  let paused = false;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let dpr = 1;
  let W = 0;
  let H = 0;
  let buf = new Float32Array(1);
  let writeIdx = 0;
  const fs = stream.fs;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const n = Math.round(win * fs);
    if (buf.length !== n) {
      buf = new Float32Array(n).fill(NaN);
      writeIdx = 0;
    }
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // grid redup
    ctx.strokeStyle = 'rgba(62,224,122,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const pxPerS = W / win;
    for (let s = 0; s <= win; s += 0.2) {
      const x = s * pxPerS;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    ctx.stroke();
    const mid = H * 0.55;
    const gainPx = (H / 4) * ((o.gain ?? 10) / 10); // 1 mV ≈ 1/4 tinggi
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pen = false;
    const n = buf.length;
    for (let i = 0; i < n; i++) {
      const v = buf[i];
      // celah sapuan di depan kursor tulis
      const gap = (i - writeIdx + n) % n;
      if (Number.isNaN(v) || gap < Math.round(0.12 * fs)) {
        pen = false;
        continue;
      }
      const x = (i / n) * W;
      const y = mid - v * gainPx;
      if (!pen) {
        ctx.moveTo(x, y);
        pen = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(lead, 8, 16);
  };

  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) {
      acc += dt * speed * fs;
      const n = Math.floor(acc);
      if (n > 0) {
        acc -= n;
        const t0 = stream.time;
        const chunk = stream.read(n)[lead];
        if (chunk) {
          for (let i = 0; i < n; i++) {
            buf[writeIdx] = chunk[i];
            writeIdx = (writeIdx + 1) % buf.length;
          }
        }
        if (o.onBeat) for (const v of stream.qrsBetween(t0, stream.time)) o.onBeat(v.t);
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      last = performance.now();
    },
    get paused() {
      return paused;
    },
    setSpeed(s: number) {
      speed = s;
    },
  };
}
