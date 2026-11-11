import { useId, useState } from 'react';
import { QT, qtcBazett, qtcCategory, qtcFramingham, qtcFridericia, qtcHodges } from '../clinical/ecg-criteria';

const CAT_LABEL = { pendek: 'Pendek', normal: 'Normal', memanjang: 'Memanjang', 'sangat-memanjang': 'Sangat memanjang (>500 ms)' } as const;

export function QtcCalculator({ initialQt, initialRr }: { initialQt?: number; initialRr?: number }) {
  const [qt, setQt] = useState(initialQt ? String(initialQt) : '');
  const [rr, setRr] = useState(initialRr ? String(initialRr) : '');
  const [hr, setHr] = useState('');
  const [sex, setSex] = useState<'L' | 'P'>('L');
  const id = useId();
  const q = parseFloat(qt);
  let r = parseFloat(rr) / 1000;
  const h = parseFloat(hr);
  if (!Number.isFinite(r) && Number.isFinite(h) && h > 0) r = 60 / h;
  const ok = Number.isFinite(q) && q > 100 && Number.isFinite(r) && r > 0.2;
  const rows = ok
    ? [
        ['Bazett (QT/√RR)', qtcBazett(q, r)],
        ['Fridericia (QT/∛RR)', qtcFridericia(q, r)],
        ['Framingham', qtcFramingham(q, r)],
        ['Hodges', qtcHodges(q, 60 / r)],
      ]
    : [];
  return (
    <div className="space-y-3 text-sm" data-testid="qtc-calc">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label>
          <span className="label">QT (ms)</span>
          <input className="input" inputMode="numeric" value={qt} onChange={(e) => setQt(e.target.value)} data-testid="qtc-qt" />
        </label>
        <label>
          <span className="label">RR (ms)</span>
          <input className="input" inputMode="numeric" value={rr} onChange={(e) => setRr(e.target.value)} data-testid="qtc-rr" />
        </label>
        <label>
          <span className="label">atau laju (/menit)</span>
          <input className="input" inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} />
        </label>
        <fieldset>
          <legend className="label">Jenis kelamin</legend>
          <div className="flex gap-1">
            {(['L', 'P'] as const).map((s) => (
              <button key={s} type="button" className={`ctrl flex-1 ${sex === s ? 'ctrl-on' : ''}`} aria-pressed={sex === s} onClick={() => setSex(s)} id={`${id}-${s}`}>
                {s === 'L' ? 'Pria' : 'Wanita'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {ok ? (
        <table className="w-full text-left">
          <tbody>
            {rows.map(([n, v]) => (
              <tr key={n as string} className="border-t border-slate-200 dark:border-slate-700">
                <td className="py-1.5">{n}</td>
                <td className="py-1.5 font-mono font-bold tabular-nums" data-testid={`qtc-${(n as string).split(' ')[0].toLowerCase()}`}>
                  {Math.round(v as number)} ms
                </td>
                <td className="py-1.5">{CAT_LABEL[qtcCategory(v as number, sex)]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-600 dark:text-slate-400">Isi QT dan RR (atau laju). Ukur QT dari awal QRS sampai akhir T di sadapan dengan QT terpanjang (biasanya II atau V2–V3).</p>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Batas: memanjang ≥{QT.PROLONGED_MALE_MS} ms (pria) / ≥{QT.PROLONGED_FEMALE_MS} ms (wanita); risiko tinggi &gt;{QT.HIGH_RISK_MS} ms; pendek ≤{QT.SHORT_MS} ms. Bazett berlebihan pada laju tinggi — Fridericia lebih akurat pada takikardia. AHA 2009 menganjurkan regresi linear dan tidak melakukan koreksi QT bila RR sangat bervariasi (fibrilasi atrium).
      </p>
    </div>
  );
}
