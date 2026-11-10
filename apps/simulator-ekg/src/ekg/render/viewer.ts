/**
 * Penampil kertas EKG 12 sadapan berbasis canvas (tanpa framework).
 * - Grid 1 mm & 5 mm, pulsa kalibrasi 1 mV, label sadapan, layout 3×4/6×2/12×1/tunggal
 * - Tajam di layar HiDPI (devicePixelRatio), zoom & geser (cubit, seret, roda, keyboard)
 * - Alat: kaliper interval (+ march-out), kaliper amplitudo, penggaris laju
 * - Overlay anotasi per sadapan & rentang waktu
 */
import type { Annotation, EcgSignal, LeadName } from '../core/types';
import { computeLayout, hitPanel, mmToMs, type Panel, type PaperLayout, type PaperSettings } from './layout';

export type ViewerTool = 'pan' | 'caliper' | 'amp' | 'ruler';

export interface PaperColors {
  bg: string;
  minor: string;
  major: string;
  trace: string;
  label: string;
  annot: string;
  annotFill: string;
  caliper: string;
}

export const PAPER_LIGHT: PaperColors = {
  bg: '#fffaf7',
  minor: 'rgba(232, 120, 120, 0.28)',
  major: 'rgba(214, 72, 72, 0.6)',
  trace: '#111111',
  label: '#1b2a4a',
  annot: '#b45309',
  annotFill: 'rgba(245, 158, 11, 0.18)',
  caliper: '#0369a1',
};
/** Kertas versi redup untuk mode gelap (kontras tetap tinggi). */
export const PAPER_DIM: PaperColors = {
  bg: '#f3ece6',
  minor: 'rgba(214, 100, 100, 0.3)',
  major: 'rgba(190, 60, 60, 0.62)',
  trace: '#0b0b0b',
  label: '#0f1b33',
  annot: '#92400e',
  annotFill: 'rgba(217, 119, 6, 0.2)',
  caliper: '#075985',
};

export interface MeasureResult {
  kind: 'caliper' | 'amp' | 'ruler';
  ms?: number;
  bpm?: number;
  mv?: number;
  mm?: number;
  lead?: LeadName;
}

export interface ViewerOptions {
  settings: PaperSettings;
  colors?: PaperColors;
  onMeasure?: (m: MeasureResult | null) => void;
  onViewChange?: (v: { zoom: number }) => void;
  /** Label aksesibel. */
  label?: string;
}

interface Caliper {
  x1: number;
  x2: number;
  y: number;
  march: boolean;
}
interface AmpCaliper {
  x: number;
  y1: number;
  y2: number;
}

export class EcgViewerCore {
  private ctx: CanvasRenderingContext2D;
  private signal: EcgSignal | null = null;
  private layout: PaperLayout | null = null;
  private settings: PaperSettings;
  private colors: PaperColors;
  private annotations: Annotation[] = [];
  private showAnnot = false;
  private tool: ViewerTool = 'pan';
  private fitScale = 1;
  private zoom = 1;
  private offX = 0;
  private offY = 0;
  private cssW = 0;
  private cssH = 0;
  private raf = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { d: number; zoom: number; mid: { x: number; y: number }; offX: number; offY: number } | null = null;
  private drag: { x: number; y: number; offX: number; offY: number; mode: 'pan' | 'cal-new' | 'cal-1' | 'cal-2' | 'cal-move' | 'amp-new' | 'amp-1' | 'amp-2' } | null = null;
  private caliper: Caliper | null = null;
  private amp: AmpCaliper | null = null;
  private ruler: { x: number; y: number } | null = null;
  private ro: ResizeObserver | null = null;
  private march = false;
  private destroyed = false;
  private extraLeads: LeadName[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: ViewerOptions,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D tidak tersedia');
    this.ctx = ctx;
    this.settings = { ...opts.settings };
    this.colors = opts.colors ?? PAPER_LIGHT;
    canvas.style.touchAction = 'none';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', opts.label ?? 'Rekaman EKG 12 sadapan');
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('keydown', this.onKey);
    canvas.addEventListener('dblclick', this.resetView);
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    this.resize();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('keydown', this.onKey);
    c.removeEventListener('dblclick', this.resetView);
  }

  setSignal(sig: EcgSignal | null, annotations: Annotation[] = []): void {
    this.signal = sig;
    this.annotations = annotations;
    this.extraLeads = sig ? (Object.keys(sig.leads) as LeadName[]).filter((l) => ['V3R', 'V4R', 'V5R', 'V7', 'V8', 'V9'].includes(l)) : [];
    this.caliper = null;
    this.amp = null;
    this.ruler = null;
    this.relayout();
  }
  setSettings(s: Partial<PaperSettings>): void {
    this.settings = { ...this.settings, ...s };
    this.relayout();
  }
  setColors(c: PaperColors): void {
    this.colors = c;
    this.request();
  }
  setTool(t: ViewerTool): void {
    this.tool = t;
    this.canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
    this.request();
  }
  setMarch(on: boolean): void {
    this.march = on;
    if (this.caliper) this.caliper.march = on;
    this.request();
  }
  setAnnotationsVisible(v: boolean): void {
    this.showAnnot = v;
    this.request();
  }
  clearMeasurements(): void {
    this.caliper = null;
    this.amp = null;
    this.ruler = null;
    this.opts.onMeasure?.(null);
    this.request();
  }
  getLayout(): PaperLayout | null {
    return this.layout;
  }
  /** Tinggi CSS ideal canvas untuk lebar tertentu (seluruh kertas terlihat). */
  idealHeight(cssWidth: number): number {
    if (!this.layout) return 300;
    return Math.round((cssWidth / this.layout.width) * this.layout.height);
  }
  /** px CSS per mm saat ini (untuk uji skala). */
  pxPerMm(): number {
    return this.fitScale * this.zoom;
  }
  zoomBy(f: number, cx?: number, cy?: number): void {
    const z = Math.min(8, Math.max(1, this.zoom * f));
    const px = cx ?? this.cssW / 2;
    const py = cy ?? this.cssH / 2;
    const s0 = this.fitScale * this.zoom;
    const s1 = this.fitScale * z;
    // jaga titik (px,py) tetap di tempat
    this.offX = px - ((px - this.offX) / s0) * s1;
    this.offY = py - ((py - this.offY) / s0) * s1;
    this.zoom = z;
    this.clampOffset();
    this.opts.onViewChange?.({ zoom: this.zoom });
    this.request();
  }
  resetView = (): void => {
    this.zoom = 1;
    this.offX = 0;
    this.offY = 0;
    this.opts.onViewChange?.({ zoom: 1 });
    this.request();
  };

  private relayout(): void {
    const dur = this.signal ? this.signal.length / this.signal.fs : 10;
    this.layout = computeLayout(this.settings, dur, this.extraLeads);
    this.resize();
  }

  private resize(): void {
    if (this.destroyed) return;
    const r = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, r.width);
    this.cssH = Math.max(1, r.height);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    if (this.layout) this.fitScale = Math.min(this.cssW / this.layout.width, this.cssH / this.layout.height);
    this.clampOffset();
    this.request();
  }

  private clampOffset(): void {
    if (!this.layout) return;
    const s = this.fitScale * this.zoom;
    const w = this.layout.width * s;
    const h = this.layout.height * s;
    this.offX = w <= this.cssW ? (this.cssW - w) / 2 : Math.min(0, Math.max(this.cssW - w, this.offX));
    this.offY = h <= this.cssH ? (this.cssH - h) / 2 : Math.min(0, Math.max(this.cssH - h, this.offY));
  }

  private request(): void {
    if (this.destroyed) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  }

  /** Konversi px CSS → mm kertas. */
  toMm(px: number, py: number): { x: number; y: number } {
    const s = this.fitScale * this.zoom;
    return { x: (px - this.offX) / s, y: (py - this.offY) / s };
  }

  private draw(): void {
    const ctx = this.ctx;
    const L = this.layout;
    const dpr = this.canvas.width / this.cssW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!L) return;
    const s = this.fitScale * this.zoom;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.offX, dpr * this.offY);
    const c = this.colors;
    // kertas
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, L.width, L.height);
    this.drawGrid(L, s);
    this.drawCalibration(L);
    if (this.signal) for (const p of L.panels) this.drawTrace(p, L, s);
    this.drawLabels(L);
    if (this.showAnnot) this.drawAnnotations(L);
    this.drawTools(L, s);
  }

  private drawGrid(L: PaperLayout, s: number): void {
    const ctx = this.ctx;
    const c = this.colors;
    const view0 = this.toMm(0, 0);
    const view1 = this.toMm(this.cssW, this.cssH);
    const x0 = Math.max(0, Math.floor(view0.x));
    const x1 = Math.min(L.width, Math.ceil(view1.x));
    const y0 = Math.max(0, Math.floor(view0.y));
    const y1 = Math.min(L.height, Math.ceil(view1.y));
    const minorVisible = s >= 2.2;
    if (minorVisible) {
      ctx.strokeStyle = c.minor;
      ctx.lineWidth = Math.max(0.5 / s, 0.06);
      ctx.beginPath();
      for (let x = x0; x <= x1; x++) if (x % 5) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      for (let y = y0; y <= y1; y++) if (y % 5) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = c.major;
    ctx.lineWidth = Math.max(0.9 / s, 0.12);
    ctx.beginPath();
    for (let x = x0 - (x0 % 5); x <= x1; x += 5) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = y0 - (y0 % 5); y <= y1; y += 5) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }

  private drawCalibration(L: PaperLayout): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.colors.trace;
    ctx.lineWidth = 0.28;
    ctx.lineJoin = 'miter';
    const w = 0.2 * L.speed; // 200 ms
    const h = 1 * L.gain; // 1 mV
    for (const cal of L.calibrations) {
      ctx.beginPath();
      ctx.moveTo(cal.x, cal.y);
      ctx.lineTo(cal.x + 1.5, cal.y);
      ctx.lineTo(cal.x + 1.5, cal.y - h);
      ctx.lineTo(cal.x + 1.5 + w, cal.y - h);
      ctx.lineTo(cal.x + 1.5 + w, cal.y);
      ctx.lineTo(cal.x + 3 + w, cal.y);
      ctx.stroke();
    }
  }

  private drawTrace(p: Panel, L: PaperLayout, s: number): void {
    const sig = this.signal!;
    const arr = sig.leads[p.lead];
    if (!arr) return;
    const ctx = this.ctx;
    const fs = sig.fs;
    const i0 = Math.max(0, Math.floor(p.t0 * fs));
    const i1 = Math.min(arr.length - 1, Math.ceil((p.t0 + p.dur) * fs));
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y - p.h * 1.5, p.w, p.h * 3);
    ctx.clip();
    ctx.strokeStyle = this.colors.trace;
    ctx.lineWidth = Math.max(1.1 / s, 0.2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const mmPerSample = L.speed / fs;
    const pxPerSample = mmPerSample * s;
    const dpr = this.canvas.width / this.cssW;
    if (pxPerSample * dpr >= 0.6) {
      for (let i = i0; i <= i1; i++) {
        const x = p.x + (i / fs - p.t0) * L.speed;
        const y = p.y - arr[i] * L.gain;
        if (i === i0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      // Desimasi min/max per piksel perangkat
      const step = Math.max(1, Math.floor(1 / (pxPerSample * dpr)));
      for (let i = i0; i <= i1; i += step) {
        let mn = Infinity;
        let mx = -Infinity;
        for (let k = i; k < Math.min(i1 + 1, i + step); k++) {
          if (arr[k] < mn) mn = arr[k];
          if (arr[k] > mx) mx = arr[k];
        }
        const x = p.x + (i / fs - p.t0) * L.speed;
        if (i === i0) ctx.moveTo(x, p.y - arr[i] * L.gain);
        ctx.lineTo(x, p.y - mx * L.gain);
        ctx.lineTo(x, p.y - mn * L.gain);
      }
    }
    ctx.stroke();
    ctx.restore();
    // penanda pergantian kolom
    if (p.t0 > 0 && !p.isRhythm) {
      ctx.strokeStyle = this.colors.trace;
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 2.5);
      ctx.lineTo(p.x, p.y + 2.5);
      ctx.stroke();
    }
  }

  private drawLabels(L: PaperLayout): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.colors.label;
    ctx.font = `600 3.4px system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    for (const p of L.panels) {
      ctx.fillText(p.lead + (p.isRhythm ? ' (strip irama)' : ''), p.x + 1.2, p.y - p.h * 0.32);
    }
    ctx.font = `500 2.6px system-ui, sans-serif`;
    ctx.fillText(`${L.speed} mm/s · ${L.gain} mm/mV`, L.width - 42, L.height - 1.5);
  }

  private drawAnnotations(L: PaperLayout): void {
    const ctx = this.ctx;
    const c = this.colors;
    const dur = this.signal ? this.signal.length / this.signal.fs : 10;
    ctx.font = '600 2.8px system-ui, sans-serif';
    let tagN = 0;
    for (const a of this.annotations) {
      for (const p of L.panels) {
        if (!a.leads.includes(p.lead)) continue;
        if (p.isRhythm && !a.leads.includes('II') && p.lead !== 'II') continue;
        const spans = a.spans?.length ? a.spans : [{ t0: 0, t1: dur }];
        for (const sp of spans) {
          const t0 = Math.max(sp.t0, p.t0);
          const t1 = Math.min(sp.t1, p.t0 + p.dur);
          if (t1 <= t0) continue;
          const x0 = p.x + (t0 - p.t0) * L.speed;
          const x1 = p.x + (t1 - p.t0) * L.speed;
          ctx.fillStyle = c.annotFill;
          ctx.fillRect(x0, p.y - p.h * 0.48, x1 - x0, p.h * 0.96);
          ctx.strokeStyle = c.annot;
          ctx.lineWidth = 0.35;
          ctx.strokeRect(x0, p.y - p.h * 0.48, x1 - x0, p.h * 0.96);
        }
        // tag nomor anotasi
        const idx = this.annotations.indexOf(a) + 1;
        const tx = p.x + p.w - 5.5;
        const ty = p.y - p.h * 0.44;
        ctx.fillStyle = c.annot;
        ctx.beginPath();
        ctx.arc(tx + 2, ty + 1.6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(String(idx), tx + 1.15, ty + 2.6);
        tagN++;
      }
    }
    void tagN;
  }

  private drawTools(L: PaperLayout, s: number): void {
    const ctx = this.ctx;
    const c = this.colors;
    const lw = Math.max(1.4 / s, 0.2);
    ctx.font = '600 3px system-ui, sans-serif';
    if (this.caliper) {
      const { x1, x2, y } = this.caliper;
      const d = Math.abs(x2 - x1);
      ctx.strokeStyle = c.caliper;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, L.height);
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, L.height);
      ctx.moveTo(Math.min(x1, x2), y);
      ctx.lineTo(Math.max(x1, x2), y);
      ctx.stroke();
      if (this.caliper.march && d > 1) {
        ctx.setLineDash([1.2, 1.2]);
        ctx.beginPath();
        const dir = x2 >= x1 ? 1 : -1;
        for (let k = 2; k < 40; k++) {
          const x = x1 + dir * k * d;
          if (x < 0 || x > L.width) break;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, L.height);
        }
        for (let k = 1; k < 40; k++) {
          const x = x1 - dir * k * d;
          if (x < 0 || x > L.width) break;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, L.height);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const ms = mmToMs(d, L.speed);
      const txt = `${Math.round(ms)} ms · ${ms > 0 ? Math.round(60000 / ms) : 0}/mnt`;
      this.tag(Math.max(x1, x2) + 1, y - 2, txt, c.caliper);
    }
    if (this.amp) {
      const { x, y1, y2 } = this.amp;
      ctx.strokeStyle = c.caliper;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x - 6, y1);
      ctx.lineTo(x + 6, y1);
      ctx.moveTo(x - 6, y2);
      ctx.lineTo(x + 6, y2);
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
      const mm = Math.abs(y2 - y1);
      this.tag(x + 7, (y1 + y2) / 2, `${mm.toFixed(1)} mm · ${(mm / L.gain).toFixed(2)} mV`, c.caliper);
    }
    if (this.ruler) {
      const { x, y } = this.ruler;
      ctx.strokeStyle = '#7c3aed';
      ctx.fillStyle = '#7c3aed';
      ctx.lineWidth = lw;
      const labels = [300, 150, 100, 75, 60, 50, 43, 37];
      const step = 0.2 * L.speed; // satu kotak besar = 200 ms
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
      for (let k = 1; k <= labels.length; k++) {
        const xx = x + k * step;
        if (xx > L.width) break;
        ctx.beginPath();
        ctx.moveTo(xx, y - 6);
        ctx.lineTo(xx, y + 6);
        ctx.stroke();
        ctx.fillText(String(labels[k - 1]), xx - 2, y - 7);
      }
    }
  }

  private tag(x: number, y: number, text: string, color: string): void {
    const ctx = this.ctx;
    const w = ctx.measureText(text).width + 2.4;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(x, y - 3.4, w, 4.6);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.2;
    ctx.strokeRect(x, y - 3.4, w, 4.6);
    ctx.fillStyle = color;
    ctx.fillText(text, x + 1.2, y);
  }

  private emitMeasure(kind: 'caliper' | 'amp'): void {
    const L = this.layout;
    if (!L) return;
    if (kind === 'caliper' && this.caliper) {
      const ms = mmToMs(Math.abs(this.caliper.x2 - this.caliper.x1), L.speed);
      this.opts.onMeasure?.({ kind: 'caliper', ms: Math.round(ms), bpm: ms > 0 ? Math.round(60000 / ms) : undefined });
    } else if (kind === 'amp' && this.amp) {
      const mm = Math.abs(this.amp.y2 - this.amp.y1);
      const hit = hitPanel(L, this.amp.x, (this.amp.y1 + this.amp.y2) / 2);
      this.opts.onMeasure?.({ kind: 'amp', mm: Math.round(mm * 10) / 10, mv: Math.round((mm / L.gain) * 100) / 100, lead: hit?.panel.lead });
    }
  }

  // ------------------------------------------------------------------ input
  private local(e: PointerEvent | WheelEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, offX: this.offX, offY: this.offY };
      this.drag = null;
      return;
    }
    const m = this.toMm(p.x, p.y);
    const tol = 2.5 / Math.max(0.5, this.zoom * this.fitScale / 3);
    if (this.tool === 'caliper') {
      if (this.caliper && Math.abs(m.x - this.caliper.x1) < tol) this.drag = { ...p, offX: 0, offY: 0, mode: 'cal-1' };
      else if (this.caliper && Math.abs(m.x - this.caliper.x2) < tol) this.drag = { ...p, offX: 0, offY: 0, mode: 'cal-2' };
      else {
        this.caliper = { x1: m.x, x2: m.x, y: m.y, march: this.march };
        this.drag = { ...p, offX: 0, offY: 0, mode: 'cal-new' };
      }
    } else if (this.tool === 'amp') {
      if (this.amp && Math.abs(m.y - this.amp.y1) < tol && Math.abs(m.x - this.amp.x) < 8) this.drag = { ...p, offX: 0, offY: 0, mode: 'amp-1' };
      else if (this.amp && Math.abs(m.y - this.amp.y2) < tol && Math.abs(m.x - this.amp.x) < 8) this.drag = { ...p, offX: 0, offY: 0, mode: 'amp-2' };
      else {
        this.amp = { x: m.x, y1: m.y, y2: m.y };
        this.drag = { ...p, offX: 0, offY: 0, mode: 'amp-new' };
      }
    } else if (this.tool === 'ruler') {
      this.ruler = { x: m.x, y: m.y };
      this.opts.onMeasure?.({ kind: 'ruler' });
      this.request();
    } else {
      this.drag = { ...p, offX: this.offX, offY: this.offY, mode: 'pan' };
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const z = Math.min(8, Math.max(1, (this.pinch.zoom * d) / Math.max(10, this.pinch.d)));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s0 = this.fitScale * this.pinch.zoom;
      const s1 = this.fitScale * z;
      this.zoom = z;
      this.offX = mid.x - ((this.pinch.mid.x - this.pinch.offX) / s0) * s1;
      this.offY = mid.y - ((this.pinch.mid.y - this.pinch.offY) / s0) * s1;
      this.clampOffset();
      this.opts.onViewChange?.({ zoom: this.zoom });
      this.request();
      return;
    }
    const d = this.drag;
    if (!d) return;
    const m = this.toMm(p.x, p.y);
    if (d.mode === 'pan') {
      this.offX = d.offX + (p.x - d.x);
      this.offY = d.offY + (p.y - d.y);
      this.clampOffset();
    } else if (this.caliper && (d.mode === 'cal-new' || d.mode === 'cal-2')) this.caliper.x2 = m.x;
    else if (this.caliper && d.mode === 'cal-1') this.caliper.x1 = m.x;
    else if (this.amp && (d.mode === 'amp-new' || d.mode === 'amp-2')) this.amp.y2 = m.y;
    else if (this.amp && d.mode === 'amp-1') this.amp.y1 = m.y;
    this.request();
  };

  private onUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.drag && this.drag.mode !== 'pan') this.emitMeasure(this.drag.mode.startsWith('amp') ? 'amp' : 'caliper');
    this.drag = null;
    if (this.tool === 'pan') this.canvas.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent): void => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 40 && this.zoom === 1) return; // biarkan scroll halaman
    e.preventDefault();
    const p = this.local(e);
    if (e.ctrlKey || this.zoom > 1 || Math.abs(e.deltaY) >= 40) this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
  };

  private onKey = (e: KeyboardEvent): void => {
    const step = 40;
    let handled = true;
    switch (e.key) {
      case '+':
      case '=':
        this.zoomBy(1.25);
        break;
      case '-':
        this.zoomBy(1 / 1.25);
        break;
      case '0':
        this.resetView();
        break;
      case 'ArrowLeft':
        this.offX += step;
        break;
      case 'ArrowRight':
        this.offX -= step;
        break;
      case 'ArrowUp':
        this.offY += step;
        break;
      case 'ArrowDown':
        this.offY -= step;
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      this.clampOffset();
      this.request();
    }
  };
}
