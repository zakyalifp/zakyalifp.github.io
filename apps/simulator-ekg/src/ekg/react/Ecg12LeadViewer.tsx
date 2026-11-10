/**
 * Komponen React penampil EKG 12 sadapan (pembungkus EcgViewerCore).
 * Dapat diimpor simulator React lain: lihat docs/EKG_MODULE.md.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Annotation, EcgSignal } from '../core/types';
import { EcgViewerCore, PAPER_DIM, PAPER_LIGHT, type MeasureResult, type ViewerTool } from '../render/viewer';
import type { PaperSettings } from '../render/layout';

export interface Ecg12LeadViewerProps {
  signal: EcgSignal | null;
  settings: PaperSettings;
  annotations?: Annotation[];
  showAnnotations?: boolean;
  tool?: ViewerTool;
  march?: boolean;
  dimPaper?: boolean;
  onMeasure?: (m: MeasureResult | null) => void;
  onZoom?: (z: number) => void;
  label?: string;
  className?: string;
  /** Tinggi tetap (px). Default: mengikuti proporsi kertas. */
  height?: number;
  testId?: string;
}

export interface Ecg12LeadViewerHandle {
  zoomBy(f: number): void;
  reset(): void;
  clearMeasurements(): void;
  pxPerMm(): number;
  core(): EcgViewerCore | null;
}

export const Ecg12LeadViewer = forwardRef<Ecg12LeadViewerHandle, Ecg12LeadViewerProps>(function Ecg12LeadViewer(p, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<EcgViewerCore | null>(null);
  const cb = useRef({ onMeasure: p.onMeasure, onZoom: p.onZoom });
  cb.current = { onMeasure: p.onMeasure, onZoom: p.onZoom };
  const [h, setH] = useState(p.height ?? 320);

  useEffect(() => {
    const c = canvasRef.current!;
    const core = new EcgViewerCore(c, {
      settings: p.settings,
      onMeasure: (m) => cb.current.onMeasure?.(m),
      onViewChange: (v) => cb.current.onZoom?.(v.zoom),
      label: p.label,
    });
    coreRef.current = core;
    // Hook uji end-to-end (hanya saat dikendalikan otomatis)
    const w = window as unknown as { __ekgViewers?: EcgViewerCore[] };
    if (navigator.webdriver) (w.__ekgViewers ??= []).push(core);
    return () => {
      core.destroy();
      coreRef.current = null;
      if (w.__ekgViewers) w.__ekgViewers = w.__ekgViewers.filter((x) => x !== core);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    coreRef.current?.setSignal(p.signal, p.annotations ?? []);
  }, [p.signal, p.annotations]);
  useEffect(() => {
    coreRef.current?.setSettings(p.settings);
  }, [p.settings]);
  useEffect(() => {
    coreRef.current?.setAnnotationsVisible(!!p.showAnnotations);
  }, [p.showAnnotations]);
  useEffect(() => {
    coreRef.current?.setTool(p.tool ?? 'pan');
  }, [p.tool]);
  useEffect(() => {
    coreRef.current?.setMarch(!!p.march);
  }, [p.march]);
  useEffect(() => {
    coreRef.current?.setColors(p.dimPaper ? PAPER_DIM : PAPER_LIGHT);
  }, [p.dimPaper]);

  // Tinggi mengikuti lebar (proporsi kertas)
  useEffect(() => {
    if (p.height) return;
    const el = wrapRef.current;
    if (!el) return;
    const upd = () => {
      const core = coreRef.current;
      if (core) setH(Math.max(180, core.idealHeight(el.clientWidth)));
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.height, p.settings, p.signal]);

  useImperativeHandle(ref, () => ({
    zoomBy: (f) => coreRef.current?.zoomBy(f),
    reset: () => coreRef.current?.resetView(),
    clearMeasurements: () => coreRef.current?.clearMeasurements(),
    pxPerMm: () => coreRef.current?.pxPerMm() ?? 0,
    core: () => coreRef.current,
  }));

  return (
    <div ref={wrapRef} className={p.className} style={{ width: '100%' }}>
      <canvas ref={canvasRef} data-testid={p.testId ?? 'ecg-canvas'} style={{ width: '100%', height: p.height ?? h, display: 'block', borderRadius: 8 }} />
    </div>
  );
});
