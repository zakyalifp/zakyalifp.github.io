/** Komponen React monitor irama real-time (pembungkus mountRhythmMonitor). */
import { useEffect, useRef } from 'react';
import type { EcgStream } from '../synth/stream';
import { mountRhythmMonitor, type MonitorHandle, type MonitorOptions } from '../render/monitor';

export interface EcgRhythmMonitorProps extends MonitorOptions {
  stream: EcgStream;
  paused?: boolean;
  className?: string;
  height?: number;
}

export function EcgRhythmMonitor({ stream, paused, className, height = 180, ...opts }: EcgRhythmMonitorProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const h = useRef<MonitorHandle | null>(null);
  const beat = useRef(opts.onBeat);
  beat.current = opts.onBeat;
  useEffect(() => {
    h.current = mountRhythmMonitor(ref.current!, stream, { ...opts, onBeat: (t) => beat.current?.(t) });
    return () => h.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);
  useEffect(() => {
    if (paused) h.current?.pause();
    else h.current?.resume();
  }, [paused]);
  useEffect(() => {
    h.current?.setSpeed(opts.speed ?? 1);
  }, [opts.speed]);
  return <canvas ref={ref} className={className} style={{ width: '100%', height, display: 'block', borderRadius: 12 }} aria-hidden="true" data-testid="rhythm-monitor" />;
}
