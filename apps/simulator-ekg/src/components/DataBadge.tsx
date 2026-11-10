import type { DataKind } from '../cases/model';
import { cx } from '../lib/format';

export function DataBadge({ kind, className }: { kind: DataKind; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1',
        kind === 'nyata' ? 'bg-emerald-50 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-700' : 'bg-violet-50 text-violet-900 ring-violet-300 dark:bg-violet-950 dark:text-violet-100 dark:ring-violet-700',
        className,
      )}
      data-testid="data-badge"
      title={kind === 'nyata' ? 'Rekaman pasien nyata dari dataset terbuka (de-identifikasi)' : 'EKG dibangkitkan model komputer — bukan rekaman pasien'}
    >
      {kind === 'nyata' ? '● EKG nyata' : '◆ Sintetis'}
    </span>
  );
}
