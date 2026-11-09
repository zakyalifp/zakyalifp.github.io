import { useEffect } from 'react';
import type { Toast } from '../store/sim';
import { cx } from '../lib/format';

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => window.setTimeout(() => onDismiss(t.id), t.kind === 'kritis' ? 9000 : t.kind === 'salah' ? 7000 : 4500));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 mx-auto flex max-w-xl flex-col gap-2 px-3" aria-live="polite" aria-atomic="false" data-testid="toasts">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'kritis' ? 'alert' : 'status'}
          className={cx(
            'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1',
            t.kind === 'ok' && 'bg-emerald-50 text-emerald-950 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-50 dark:ring-emerald-700',
            t.kind === 'salah' && 'bg-amber-50 text-amber-950 ring-amber-300 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-700',
            t.kind === 'kritis' && 'bg-red-50 text-red-950 ring-red-400 dark:bg-red-950 dark:text-red-50 dark:ring-red-700',
            t.kind === 'info' && 'bg-slate-50 text-slate-900 ring-slate-300 dark:bg-slate-800 dark:text-slate-50 dark:ring-slate-600',
          )}
        >
          <span aria-hidden="true">{t.kind === 'ok' ? '✓' : t.kind === 'kritis' ? '⛔' : t.kind === 'salah' ? '!' : 'ℹ'}</span>
          <span className="flex-1">{t.kind === 'kritis' && <strong>Kesalahan kritis: </strong>}{t.text}</span>
          <button type="button" onClick={() => onDismiss(t.id)} className="-m-1 rounded p-1 opacity-70 hover:opacity-100" aria-label="Tutup notifikasi">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
