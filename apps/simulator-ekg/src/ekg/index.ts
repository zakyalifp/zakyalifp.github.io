/**
 * Modul EKG bersama (tanpa framework) untuk simulator lain di repo ini.
 * Dokumentasi: docs/EKG_MODULE.md. Komponen React ada di src/ekg/react/.
 */
export { synthesize, DEFAULT_FS } from './synth/synth';
export type { SynthSpec, SynthResult, SynthTruth, SynthSegment } from './synth/synth';
export { createEcgStream } from './synth/stream';
export type { EcgStream, EcgStreamOptions } from './synth/stream';
export type { RhythmSpec, EctopySpec } from './synth/rhythm';
export type { MorphSpec, Conduction, StSpec, TSpec } from './synth/morph';
export type { NoiseSpec, ElectrodeFault } from './synth/render';
export { EcgViewerCore, PAPER_LIGHT, PAPER_DIM } from './render/viewer';
export type { ViewerTool, MeasureResult, ViewerOptions } from './render/viewer';
export { computeLayout, mvToMm, secToMm, mmToMs, mmToMv } from './render/layout';
export type { PaperSettings, LayoutKind, Panel, PaperLayout } from './render/layout';
export { mountRhythmMonitor } from './render/monitor';
export type { MonitorOptions, MonitorHandle } from './render/monitor';
export { completeLeads, deriveIII, deriveAVR, deriveAVL, deriveAVF } from './core/leads';
export { decodeEkg1, encodeEkg1 } from './core/binary';
export { STANDARD_LEADS, STORED_LEADS, EXTRA_LEADS } from './core/types';
export type { EcgSignal, LeadName, Annotation, BeatMark } from './core/types';

import { EcgViewerCore } from './render/viewer';
import type { PaperSettings } from './render/layout';
import type { EcgSignal, Annotation } from './core/types';
/** Pintasan vanilla: pasang penampil 12 sadapan pada <canvas>. */
export function mount12LeadViewer(canvas: HTMLCanvasElement, signal: EcgSignal, settings: Partial<PaperSettings> = {}, annotations: Annotation[] = []) {
  const v = new EcgViewerCore(canvas, { settings: { speed: 25, gain: 10, layout: '3x4', ...settings } });
  v.setSignal(signal, annotations);
  return v;
}
