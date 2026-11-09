import { useEffect, useId, useRef, useState } from 'react';
import { HEART_RATE } from '../clinical/guidelines';
import { cx } from '../lib/format';

interface Props {
  hr: number;
  onBeat?: () => void;
  onSubmit: (userHr: number | null) => void;
  onClose: () => void;
  title?: string;
}

/** Hitung HR: ketuk setiap denyut selama 6 detik, lalu × 10. */
export function Stethoscope({ hr, onBeat, onSubmit, onClose, title = 'Hitung HR dengan stetoskop' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<'siap' | 'dengar' | 'selesai'>('siap');
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState<number>(HEART_RATE.AUSCULTATION_WINDOW_S);
  const [pulse, setPulse] = useState(false);
  const [manual, setManual] = useState('');
  const titleId = useId();
  const hrAtStart = useRef(hr);
  const beatCb = useRef(onBeat);
  beatCb.current = onBeat;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  useEffect(() => {
    if (phase !== 'dengar') return;
    const rate = hrAtStart.current;
    const timers: number[] = [];
    if (rate > 3) {
      const iv = 60000 / rate;
      for (let t = iv * 0.4; t < HEART_RATE.AUSCULTATION_WINDOW_S * 1000; t += iv) {
        timers.push(
          window.setTimeout(() => {
            setPulse(true);
            beatCb.current?.();
            window.setTimeout(() => setPulse(false), 140);
          }, t),
        );
      }
    }
    const start = Date.now();
    const tick = window.setInterval(() => {
      const remain = HEART_RATE.AUSCULTATION_WINDOW_S - Math.floor((Date.now() - start) / 1000);
      setLeft(Math.max(0, remain));
      if (remain <= 0) {
        window.clearInterval(tick);
        setPhase('selesai');
      }
    }, 200);
    return () => {
      timers.forEach(clearTimeout);
      window.clearInterval(tick);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'selesai') setManual(String(taps * HEART_RATE.AUSCULTATION_MULTIPLIER));
  }, [phase, taps]);

  const begin = () => {
    hrAtStart.current = hr;
    setTaps(0);
    setLeft(HEART_RATE.AUSCULTATION_WINDOW_S);
    setPhase('dengar');
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(28rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100"
      data-testid="stethoscope"
    >
      <div className="px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Ketuk tombol setiap mendengar/merasakan denyut selama {HEART_RATE.AUSCULTATION_WINDOW_S} detik. Hasil = jumlah × {HEART_RATE.AUSCULTATION_MULTIPLIER}.
        </p>
        <div className="my-4 flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className={cx('flex h-20 w-20 items-center justify-center rounded-full text-4xl transition-transform duration-100', pulse ? 'scale-125 bg-red-500/25' : 'bg-red-500/10')}
          >
            ♥
          </div>
          {phase === 'siap' && (
            <button type="button" className="btn-primary w-full" onClick={begin} data-testid="steth-start">
              Mulai dengarkan ({HEART_RATE.AUSCULTATION_WINDOW_S} detik)
            </button>
          )}
          {phase === 'dengar' && (
            <>
              <p className="font-mono text-sm" aria-live="polite">
                Sisa {left} detik · ketukan: <strong>{taps}</strong>
              </p>
              <button
                type="button"
                className="h-24 w-full rounded-2xl bg-sky-700 text-xl font-bold text-white active:scale-[0.98] active:bg-sky-800"
                onClick={() => setTaps((n) => n + 1)}
                data-testid="steth-tap"
                autoFocus
              >
                Ketuk saat denyut
              </button>
            </>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = manual.trim() === '' ? null : Number(manual.replace(',', '.'));
            onSubmit(v === null || Number.isNaN(v) ? null : v);
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold" htmlFor={`${titleId}-hr`}>
            HR menurut hitungan Anda (/menit)
          </label>
          <input id={`${titleId}-hr`} className="input font-mono" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="mis. hasil hitung × 10" data-testid="param-userHr" />
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary flex-1" data-testid="param-submit">
              Laporkan HR
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
