import { useEffect, useId, useRef, useState } from 'react';
import type { ActionDef, ParamDef } from '../engine/actions';
import type { Params } from '../engine/state';

interface Props {
  action: ActionDef;
  defs: ParamDef[];
  showRationale: boolean;
  context?: React.ReactNode;
  onSubmit: (p: Params) => void;
  onClose: () => void;
}

/** Dialog parameter tindakan. Nilai TIDAK diisi otomatis — pengguna memilih/menghitung sendiri. */
export function ParamDialog({ action, defs, showRationale, context, onSubmit, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Params>(() => Object.fromEntries(defs.filter((d) => d.type === 'checkbox').map((d) => [d.name, false])));
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const d of defs) {
      if (d.type === 'checkbox') continue;
      const v = values[d.name];
      if (v === undefined || v === '' || (d.type === 'number' && Number.isNaN(Number(v)))) {
        setError(`Lengkapi isian "${d.label}".`);
        return;
      }
    }
    const out: Params = {};
    for (const d of defs) {
      const v = values[d.name];
      if (d.type === 'number') out[d.name] = Number(String(v).replace(',', '.'));
      else if (d.type === 'select') {
        const opt = d.options.find((o) => String(o.value) === String(v));
        out[d.name] = opt ? opt.value : String(v);
      } else out[d.name] = v === true;
    }
    onSubmit(out);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100"
      data-testid="param-dialog"
    >
      <form onSubmit={submit} className="flex max-h-[85vh] flex-col">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id={titleId} className="text-lg font-bold">
            {action.label}
          </h2>
          {showRationale && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{action.rationale}</p>}
          {context && <div className="mt-2 text-sm">{context}</div>}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {defs.map((d) => (
            <Field key={d.name} def={d} value={values[d.name]} onChange={(v) => setValues((x) => ({ ...x, [d.name]: v }))} />
          ))}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Batal
          </button>
          <button type="submit" className="btn-primary flex-1" data-testid="param-submit">
            Lakukan
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Field({ def, value, onChange }: { def: ParamDef; value: unknown; onChange: (v: string | boolean) => void }) {
  const id = useId();
  if (def.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <input id={id} type="checkbox" className="h-5 w-5 accent-sky-700" checked={value === true} onChange={(e) => onChange(e.target.checked)} data-testid={`param-${def.name}`} />
        <span className="text-sm">{def.label}</span>
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {def.label}
        {def.type === 'number' && <span className="font-normal text-slate-600 dark:text-slate-400"> ({def.unit})</span>}
      </label>
      {def.type === 'select' ? (
        <select id={id} value={value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value)} className="input" data-testid={`param-${def.name}`}>
          <option value="" disabled>
            Pilih…
          </option>
          {def.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="input font-mono"
          placeholder={`dalam ${def.unit}`}
          data-testid={`param-${def.name}`}
        />
      )}
      {def.help && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{def.help}</p>}
    </div>
  );
}
