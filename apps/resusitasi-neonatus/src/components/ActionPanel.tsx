import { useEffect, useMemo, useState } from 'react';
import { ACTIONS, GROUP_LABEL, freeHands, type ActionDef, type ActionGroup } from '../engine/actions';
import type { Scenario } from '../engine/schema';
import type { SimState } from '../engine/state';
import { cx } from '../lib/format';

interface Props {
  s: SimState;
  sc: Scenario;
  suggested: string[];
  showHints: boolean;
  onAction: (a: ActionDef) => void;
}

const GROUPS_AFTER_BIRTH: ActionGroup[] = ['langkah-awal', 'penilaian', 'ventilasi', 'jalan-napas', 'sirkulasi', 'obat', 'komunikasi', 'pasca'];

/** Panel tindakan dikelompokkan per fase; tombol besar untuk situasi tegang. */
export function ActionPanel({ s, sc, suggested, showHints, onAction }: Props) {
  const groups: ActionGroup[] = s.phase === 'prebirth' ? ['persiapan', 'komunikasi'] : GROUPS_AFTER_BIRTH;
  const [group, setGroup] = useState<ActionGroup>(groups[0]);
  useEffect(() => {
    if (!groups.includes(group)) setGroup(groups[0]);
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const byGroup = useMemo(() => {
    const m = new Map<ActionGroup, ActionDef[]>();
    for (const a of ACTIONS) {
      if (s.phase === 'prebirth' ? !(a.prebirthOnly || a.id === 'call-help') : a.prebirthOnly) continue;
      const g = a.group;
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(a);
    }
    return m;
  }, [s.phase]);

  const suggestedGroups = new Set(ACTIONS.filter((a) => suggested.includes(a.id)).map((a) => a.group));
  const list = byGroup.get(group) ?? [];
  const busyIds = new Set(s.busy.map((b) => b.action));

  return (
    <section aria-label="Panel tindakan" className="flex min-h-0 flex-col">
      <div role="tablist" aria-label="Kelompok tindakan" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {groups.map((g) => (
          <button
            key={g}
            role="tab"
            type="button"
            aria-selected={g === group}
            onClick={() => setGroup(g)}
            data-testid={`tab-${g}`}
            className={cx(
              'relative shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition',
              g === group
                ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white'
                : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600',
            )}
          >
            {GROUP_LABEL[g]}
            {showHints && suggestedGroups.has(g) && g !== group && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" aria-label="ada saran" />}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={GROUP_LABEL[group]} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((a) => {
          const avail = a.available(s, sc);
          const isSuggested = showHints && suggested.includes(a.id);
          const busy = busyIds.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              data-testid={`action-${a.id}`}
              aria-disabled={avail !== true}
              title={avail === true ? a.rationale : avail}
              onClick={() => onAction(a)}
              className={cx(
                'relative min-h-14 rounded-xl px-4 py-3 text-left text-[15px] font-semibold leading-snug ring-1 transition active:scale-[0.99]',
                avail === true
                  ? a.primary
                    ? 'bg-sky-700 text-white ring-sky-800 hover:bg-sky-800'
                    : 'bg-white text-slate-900 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-700',
                isSuggested && 'outline outline-3 outline-offset-2 outline-amber-400',
              )}
            >
              {a.label}
              {busy && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs text-amber-900">berjalan…</span>}
              {isSuggested && <span className="ml-2 rounded bg-amber-300 px-1.5 py-0.5 text-xs font-bold text-amber-950">disarankan</span>}
              {avail !== true && <span className="mt-0.5 block text-xs font-normal">{avail}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function BusyTasks({ s }: { s: SimState }) {
  const free = freeHands(s);
  return (
    <div className="space-y-1.5 text-sm" aria-live="polite">
      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
        <span>
          Tim: <strong>{s.staff}</strong> orang · tangan bebas: <strong data-testid="free-hands">{Math.max(0, free)}</strong>
        </span>
        {s.helpArrivesAt !== null && <span className="text-xs text-amber-700 dark:text-amber-300">bantuan tiba {Math.max(0, s.helpArrivesAt - s.t)} dtk</span>}
      </div>
      {s.busy.map((b) => {
        const total = b.endsAt - b.startedAt;
        const done = Math.min(1, (s.t - b.startedAt) / Math.max(1, total));
        return (
          <div key={b.action + b.startedAt} className="rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-950/40">
            <div className="flex justify-between text-xs font-medium text-amber-900 dark:text-amber-100">
              <span>{b.label}</span>
              <span>{Math.max(0, b.endsAt - s.t)} dtk</span>
            </div>
            <div className="mt-1 h-1.5 rounded bg-amber-200 dark:bg-amber-900">
              <div className="h-1.5 rounded bg-amber-500" style={{ width: `${done * 100}%` }} />
            </div>
          </div>
        );
      })}
      {s.vent.mode === 'ppv' && (
        <p className="text-xs text-slate-600 dark:text-slate-400" data-testid="vent-settings">
          VTP via {s.vent.iface === 'mask' ? 'masker' : s.vent.iface.toUpperCase()}: PIP {s.vent.pip} · PEEP {s.vent.peep} · FiO₂ {s.vent.fio2}% · {s.compressions.active ? 'terkoordinasi dengan kompresi' : `${s.vent.rate}/mnt`}
        </p>
      )}
      {s.vent.mode === 'cpap' && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          CPAP {s.vent.peep} cmH₂O · FiO₂ {s.vent.fio2}%
        </p>
      )}
    </div>
  );
}
