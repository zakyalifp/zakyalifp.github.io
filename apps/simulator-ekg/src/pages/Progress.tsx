import { useState } from 'react';
import { useProgress } from '../store/progress';
import { usePrefs } from '../store/prefs';
import { competencyScores } from '../scoring/session';
import { CompetencyBars, CompetencyRadar, ProgressChart } from '../components/Charts';
import { DIAGNOSES } from '../cases/diagnoses';
import { href } from '../router';
import { dateStr } from '../lib/format';

export default function Progress() {
  const { sessions, cards, clear } = useProgress();
  const userName = usePrefs((p) => p.userName);
  const [confirm, setConfirm] = useState(false);
  const comp = competencyScores(sessions.flatMap((s) => s.items));
  const weak = Object.values(cards)
    .filter((c) => c.seen > 0)
    .sort((a, b) => b.wrong / b.seen - a.wrong / a.seen || new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, 10);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6" data-testid="progress">
      <h1 className="text-2xl font-bold">Progres & portofolio</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Semua data hanya tersimpan di perangkat ini (localStorage). {sessions.length} sesi, {sessions.reduce((a, s) => a + s.items.length, 0)} EKG dinilai.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-bold">Peta kompetensi</h2>
          <CompetencyRadar data={comp} />
          <CompetencyBars data={comp} testId="competency-total" />
        </section>
        <section className="card">
          <h2 className="font-bold">Grafik progres</h2>
          <ProgressChart sessions={sessions} />
          <h3 className="mt-4 font-bold">Perlu diulang (pengulangan berjarak)</h3>
          {weak.length ? (
            <ul className="mt-1 space-y-1 text-sm">
              {weak.map((c) => (
                <li key={c.dx} className="flex justify-between gap-2">
                  <span>{DIAGNOSES[c.dx]?.label ?? c.dx}</span>
                  <span className="font-mono text-xs">
                    salah {c.wrong}/{c.seen} · ulang {new Date(c.due) <= new Date() ? 'sekarang' : new Date(c.due).toLocaleDateString('id-ID')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Belum ada data.</p>
          )}
          <a className="btn-primary mt-3 inline-flex" href={href({ name: 'latihan', mode: 'adaptif' })}>
            Mulai latihan adaptif
          </a>
        </section>
      </div>
      <section className="card mt-3">
        <h2 className="font-bold">Riwayat sesi</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-slate-600 dark:text-slate-400">
                <th className="py-1">Tanggal</th>
                <th>Sesi</th>
                <th>EKG</th>
                <th>Skor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions].reverse().map((s) => (
                <tr key={s.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1.5">{dateStr(s.date)}</td>
                  <td>{s.title}</td>
                  <td>{s.items.length}</td>
                  <td className="font-mono font-bold">{s.score}</td>
                  <td>{s.passed ? 'Lulus' : 'Belum'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={!sessions.length} onClick={async () => (await import('../pdf/export')).exportSummaryPdf(sessions, userName)} data-testid="progress-pdf">
            Unduh PDF ringkasan progres
          </button>
          {!confirm ? (
            <button type="button" className="btn-secondary" onClick={() => setConfirm(true)} data-testid="clear-data">
              Hapus semua data progres
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm">
              Yakin? Tidak dapat dibatalkan.
              <button type="button" className="ctrl bg-red-700 text-white" onClick={() => { clear(); setConfirm(false); }} data-testid="confirm-clear">
                Ya, hapus
              </button>
              <button type="button" className="ctrl" onClick={() => setConfirm(false)}>
                Batal
              </button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
