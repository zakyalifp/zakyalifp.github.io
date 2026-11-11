/**
 * Ruang kerja EKG: penampil + toolbar (layout, kecepatan, gain, alat ukur, zoom, layar
 * penuh), navigasi sadapan di HP, roda aksis & kalkulator QTc.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ecg12LeadViewer, type Ecg12LeadViewerHandle } from '../ekg/react/Ecg12LeadViewer';
import type { Annotation, EcgSignal, LeadName } from '../ekg/core/types';
import { STANDARD_LEADS } from '../ekg/core/types';
import type { MeasureResult, ViewerTool } from '../ekg/render/viewer';
import type { LayoutKind } from '../ekg/render/layout';
import { usePrefs, isDark } from '../store/prefs';
import { cx } from '../lib/format';
import { AxisWheel } from './AxisWheel';
import { QtcCalculator } from './QtcCalculator';

export interface WorkspaceProps {
  signal: EcgSignal | null;
  annotations?: Annotation[];
  showAnnotations?: boolean;
  onMeasure?: (m: MeasureResult | null) => void;
  onAxis?: (deg: number) => void;
  /** Sembunyikan alat (mis. diagnosis cepat). */
  compactTools?: boolean;
  label?: string;
  testId?: string;
}

const TOOLS: Array<{ id: ViewerTool; label: string; hint: string }> = [
  { id: 'pan', label: '✋ Geser', hint: 'Seret untuk menggeser, cubit/roda untuk zoom' },
  { id: 'caliper', label: '↔ Kaliper', hint: 'Seret dari satu titik ke titik lain untuk mengukur interval (ms) & laju' },
  { id: 'amp', label: '↕ Amplitudo', hint: 'Seret vertikal untuk mengukur amplitudo (mm/mV)' },
  { id: 'ruler', label: '⌇ Penggaris laju', hint: 'Ketuk tepat di puncak R: garis 300-150-100-75-60-50' },
];

export function EcgWorkspace(p: WorkspaceProps) {
  const prefs = usePrefs();
  const [layout, setLayout] = useState<LayoutKind>(prefs.layout);
  const [single, setSingle] = useState<LeadName>('II');
  const [tool, setTool] = useState<ViewerTool>('pan');
  const [march, setMarch] = useState(false);
  const [measure, setMeasure] = useState<MeasureResult | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panel, setPanel] = useState<'' | 'axis' | 'qtc'>('');
  const [full, setFull] = useState(false);
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640 && window.innerHeight > window.innerWidth);
  const vref = useRef<Ecg12LeadViewerHandle>(null);
  const frame = useRef<HTMLDivElement>(null);
  const dark = isDark(prefs.theme);
  const extra = useMemo(() => (p.signal ? (Object.keys(p.signal.leads) as LeadName[]).filter((l) => !STANDARD_LEADS.includes(l as never)) : []), [p.signal]);
  const leadsAll: LeadName[] = [...STANDARD_LEADS, ...extra];

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640 && window.innerHeight > window.innerWidth);
    window.addEventListener('resize', on);
    const fs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);
    return () => {
      window.removeEventListener('resize', on);
      document.removeEventListener('fullscreenchange', fs);
    };
  }, []);

  const settings = useMemo(
    () => ({ speed: prefs.speed, gain: prefs.gain, layout, singleLead: single, extraRow: extra.length > 0 }),
    [prefs.speed, prefs.gain, layout, single, extra.length],
  );

  const goFull = async () => {
    const el = frame.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await el.requestFullscreen?.();
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await o?.lock?.('landscape').catch(() => undefined);
      }
    } catch {
      /* tidak didukung */
    }
  };
  const step = (d: number) => {
    const i = leadsAll.indexOf(single);
    setSingle(leadsAll[(i + d + leadsAll.length) % leadsAll.length]);
  };

  return (
    <div className="space-y-2" data-testid={p.testId ?? 'workspace'}>
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Pengaturan tampilan EKG">
        <div className="flex gap-1" role="group" aria-label="Layout">
          {(
            [
              ['3x4', '3×4'],
              ['6x2', '6×2'],
              ['single', '1 sadapan'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className={cx('ctrl', layout === k && 'ctrl-on')} aria-pressed={layout === k} onClick={() => { setLayout(k); prefs.set({ layout: k }); }} data-testid={`layout-${k}`}>
              {l}
            </button>
          ))}
        </div>
        <select className="ctrl" aria-label="Kecepatan kertas" value={prefs.speed} onChange={(e) => prefs.set({ speed: Number(e.target.value) as 25 | 50 })} data-testid="speed">
          <option value={25}>25 mm/s</option>
          <option value={50}>50 mm/s</option>
        </select>
        <select className="ctrl" aria-label="Gain" value={prefs.gain} onChange={(e) => prefs.set({ gain: Number(e.target.value) as 5 | 10 | 20 })} data-testid="gain">
          <option value={5}>5 mm/mV</option>
          <option value={10}>10 mm/mV</option>
          <option value={20}>20 mm/mV</option>
        </select>
        <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:inline-block dark:bg-slate-600" aria-hidden="true" />
        {!p.compactTools &&
          TOOLS.map((t) => (
            <button key={t.id} type="button" className={cx('ctrl', tool === t.id && 'ctrl-on')} aria-pressed={tool === t.id} title={t.hint} onClick={() => setTool(t.id)} data-testid={`tool-${t.id}`}>
              {t.label}
            </button>
          ))}
        {!p.compactTools && tool === 'caliper' && (
          <label className="ctrl inline-flex items-center gap-1.5">
            <input type="checkbox" checked={march} onChange={(e) => setMarch(e.target.checked)} data-testid="march" /> March-out
          </label>
        )}
        <div className="ml-auto flex gap-1">
          <button type="button" className="ctrl" onClick={() => vref.current?.zoomBy(1 / 1.3)} aria-label="Perkecil">
            −
          </button>
          <span className="ctrl tabular-nums" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" className="ctrl" onClick={() => vref.current?.zoomBy(1.3)} aria-label="Perbesar" data-testid="zoom-in">
            +
          </button>
          <button type="button" className="ctrl" onClick={() => vref.current?.reset()} aria-label="Ukuran awal">
            ⟲
          </button>
          <button type="button" className="ctrl" onClick={goFull} aria-label={full ? 'Keluar layar penuh' : 'Layar penuh (landscape)'} data-testid="fullscreen">
            ⛶
          </button>
        </div>
      </div>
      {narrow && layout !== 'single' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-700" data-testid="landscape-hint">
          <span>Layar sempit: putar HP ke landscape, pakai layar penuh ⛶, atau</span>
          <button type="button" className="ctrl" onClick={() => setLayout('single')}>
            tampilan 1 sadapan
          </button>
        </div>
      )}
      {layout === 'single' && (
        <div className="flex items-center gap-1.5" role="group" aria-label="Navigasi sadapan">
          <button type="button" className="ctrl" onClick={() => step(-1)} aria-label="Sadapan sebelumnya" data-testid="lead-prev">
            ‹
          </button>
          <div className="flex flex-1 gap-1 overflow-x-auto py-0.5">
            {leadsAll.map((l) => (
              <button key={l} type="button" className={cx('chip shrink-0 !min-h-9 !px-2.5 !py-1', single === l && 'chip-on')} aria-pressed={single === l} onClick={() => setSingle(l)}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="ctrl" onClick={() => step(1)} aria-label="Sadapan berikutnya" data-testid="lead-next">
            ›
          </button>
        </div>
      )}
      <div ref={frame} className={cx('paper-frame rounded-xl p-1', full && 'paper-full flex h-full items-center')}>
        <Ecg12LeadViewer
          ref={vref}
          signal={p.signal}
          settings={settings}
          annotations={p.annotations}
          showAnnotations={p.showAnnotations}
          tool={tool}
          march={march}
          dimPaper={dark}
          onMeasure={(m) => {
            setMeasure(m);
            p.onMeasure?.(m);
          }}
          onZoom={setZoom}
          label={p.label}
          testId={p.testId ? `${p.testId}-canvas` : undefined}
        />
      </div>
      {!p.compactTools && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-h-9 rounded-lg bg-slate-100 px-3 py-2 font-mono tabular-nums dark:bg-slate-800" aria-live="polite" data-testid="measure-readout">
            {measure?.kind === 'caliper' ? `Interval ${measure.ms} ms · ${measure.bpm ?? '—'}/menit` : measure?.kind === 'amp' ? `Amplitudo ${measure.mm} mm (${measure.mv} mV)${measure.lead ? ` · ${measure.lead}` : ''}` : TOOLS.find((t) => t.id === tool)!.hint}
          </span>
          {measure && (
            <button type="button" className="ctrl" onClick={() => vref.current?.clearMeasurements()}>
              Hapus ukuran
            </button>
          )}
          <div className="ml-auto flex gap-1">
            <button type="button" className={cx('ctrl', panel === 'axis' && 'ctrl-on')} aria-expanded={panel === 'axis'} onClick={() => setPanel(panel === 'axis' ? '' : 'axis')} data-testid="open-axis">
              Roda aksis
            </button>
            <button type="button" className={cx('ctrl', panel === 'qtc' && 'ctrl-on')} aria-expanded={panel === 'qtc'} onClick={() => setPanel(panel === 'qtc' ? '' : 'qtc')} data-testid="open-qtc">
              Kalkulator QTc
            </button>
          </div>
        </div>
      )}
      {panel === 'axis' && (
        <div className="card">
          <AxisWheel value={null} onChange={p.onAxis} />
        </div>
      )}
      {panel === 'qtc' && (
        <div className="card">
          <QtcCalculator initialRr={measure?.kind === 'caliper' ? measure.ms : undefined} />
        </div>
      )}
    </div>
  );
}
