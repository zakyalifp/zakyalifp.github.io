import { useState } from 'react';
import { useHistory } from '../store/history';
import { ProgressChart } from '../components/ProgressChart';
import { DOMAINS, DOMAIN_LABEL } from '../engine/schema';
import { clock, dateStr } from '../lib/format';
import { href } from '../router';

export function History() {
  const { entries, clear } = useHistory();
  const [confirm, setConfirm] = useState(false);
  const avg = (d: (typeof DOMAINS)[number]) => {
    const v = entries.map((e) => e.domains[d]).filter((x): x is number => typeof x === 'number');
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat & progres</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Disimpan hanya di perangkat ini (localStorage). Tidak dikirim ke mana pun.</p>
      {entries.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <p>Belum ada latihan.</p>
          <a className="btn-primary mt-3 inline-flex" href={href({ name: 'home' })}>
            Mulai skenario pertama
          </a>
        </div>
      ) : (
        <>
          <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <h2 className="mb-2 font-bold">Grafik skor</h2>
            <ProgressChart entries={entries} />
          </section>
          <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <h2 className="mb-2 font-bold">Rata-rata per domain</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {DOMAINS.map((d) => (
                <li key={d} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                  <span>{DOMAIN_LABEL[d]}</span>
                  <strong className="tabular-nums">{avg(d) ?? '—'}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-4 overflow-x-auto rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <h2 className="mb-2 font-bold">Semua latihan ({entries.length})</h2>
            <table className="w-full text-left text-sm" data-testid="history-table">
              <thead className="text-xs uppercase text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Skenario</th>
                  <th className="py-2 pr-3">Mode</th>
                  <th className="py-2 pr-3">Durasi</th>
                  <th className="py-2 pr-3">Skor</th>
                  <th className="py-2">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((e) => (
                  <tr key={e.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-1.5 pr-3">{dateStr(e.date)}</td>
                    <td className="py-1.5 pr-3">{e.scenarioTitle}</td>
                    <td className="py-1.5 pr-3">{e.mode === 'ujian' ? 'Ujian' : 'Belajar'}</td>
                    <td className="py-1.5 pr-3 font-mono">{clock(e.durationS)}</td>
                    <td className="py-1.5 pr-3 font-bold tabular-nums">{e.score}</td>
                    <td className="py-1.5">{e.passed ? '✅ Lulus' : e.criticalCount ? `⛔ ${e.criticalCount} kritis` : 'Belum lulus'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="mt-4">
            {!confirm ? (
              <button type="button" className="btn-secondary text-red-800 dark:text-red-300" onClick={() => setConfirm(true)} data-testid="clear-history">
                Hapus semua data riwayat
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3 text-sm dark:bg-red-950/40" role="alertdialog" aria-label="Konfirmasi hapus">
                <span>Hapus {entries.length} catatan secara permanen?</span>
                <button type="button" className="btn-primary bg-red-700 hover:bg-red-800" onClick={() => { clear(); setConfirm(false); }} data-testid="confirm-clear">
                  Ya, hapus
                </button>
                <button type="button" className="btn-secondary" onClick={() => setConfirm(false)}>
                  Batal
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
