import { useState } from 'react';
import { useCatalog, quizCases } from '../store/catalog';
import { useProgress } from '../store/progress';
import { usePrefs } from '../store/prefs';
import { CATEGORY_LABEL, DIAGNOSES, LEVEL_LABEL, type Level } from '../cases/diagnoses';
import { href } from '../router';
import { SCORING } from '../clinical/ecg-criteria';

const DESC: Record<Level, string> = {
  dasar: 'Setara UKMPPD: EKG normal, irama dasar, AF/flutter/SVT, PVC, AV blok, BBB, STEMI klasik, hiperkalemia & hipokalemia, salah pasang elektroda.',
  menengah: 'Kasus IGD: STEMI ventrikel kanan & posterior, perikarditis vs repolarisasi dini, LVH dengan ST-T sekunder, Mobitz II, VT, torsades, elektrolit, hipotermia.',
  lanjut: 'Residen: blok fasikular, VT vs SVT aberan, pola oklusi tanpa elevasi ST klasik (de Winter, Wellens, aVR, Sgarbossa), malfungsi pacu jantung, Brugada, TCA.',
};

export default function Curriculum() {
  const cases = useCatalog((s) => s.cases);
  const sessions = useProgress((s) => s.sessions);
  const userName = usePrefs((p) => p.userName);
  const setPrefs = usePrefs((p) => p.set);
  const [busy, setBusy] = useState('');
  return (
    <div className="mx-auto max-w-6xl px-4 py-6" data-testid="curriculum">
      <h1 className="text-2xl font-bold">Kurikulum bertingkat</h1>
      <p className="mt-1 text-slate-700 dark:text-slate-300">
        Selesaikan sesi bertingkat (minimal {SCORING.LEVEL_MIN_CASES} EKG dengan skor ≥{SCORING.LEVEL_PASS_SCORE} tanpa kesalahan kritis) untuk membuka sertifikat penyelesaian tingkat tersebut.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => {
          const pool = quizCases(cases, { level: l });
          const mine = sessions.filter((s) => s.level === l);
          const best = mine.filter((s) => s.items.length >= SCORING.LEVEL_MIN_CASES && s.passed && s.score >= SCORING.LEVEL_PASS_SCORE).sort((a, b) => b.score - a.score)[0];
          const dxs = Array.from(new Set(pool.map((c) => c.dx)));
          const cats = Array.from(new Set(pool.map((c) => c.category)));
          return (
            <section key={l} className="card flex flex-col" data-testid={`level-${l}`}>
              <h2 className="text-lg font-bold">{LEVEL_LABEL[l]}</h2>
              <p className="mt-1 text-sm">{DESC[l]}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {pool.length} EKG · {dxs.length} diagnosis · {cats.map((c) => CATEGORY_LABEL[c]).join(', ')}
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-semibold">Daftar diagnosis</summary>
                <ul className="mt-1 list-disc pl-5">
                  {dxs.map((d) => (
                    <li key={d}>{DIAGNOSES[d].label}</li>
                  ))}
                </ul>
              </details>
              <p className="mt-2 text-sm">
                {mine.length} sesi · terbaik {mine.length ? Math.max(...mine.map((s) => s.score)) : '—'}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <a className="btn-primary" href={href({ name: 'latihan', mode: 'sistematis', level: l })} data-testid={`start-${l}`}>
                  Sesi sistematis
                </a>
                <a className="btn-secondary" href={href({ name: 'latihan', mode: 'cepat', level: l })}>
                  Diagnosis cepat
                </a>
              </div>
              {best ? (
                <div className="mt-3 rounded-xl bg-emerald-50 p-2 text-sm dark:bg-emerald-950">
                  <p className="font-semibold">✓ Tingkat selesai (skor {best.score}).</p>
                  <button
                    type="button"
                    className="ctrl mt-1"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy(l);
                      try {
                        await (await import('../pdf/export')).exportCertificatePdf(l, best.score, best.items.length, userName);
                      } finally {
                        setBusy('');
                      }
                    }}
                    data-testid={`cert-${l}`}
                  >
                    Unduh sertifikat
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Sertifikat terbuka setelah sesi ≥{SCORING.LEVEL_MIN_CASES} EKG lulus.</p>
              )}
            </section>
          );
        })}
      </div>
      <label className="card mt-4 block max-w-md">
        <span className="label">Nama pada sertifikat</span>
        <input className="input" value={userName} onChange={(e) => setPrefs({ userName: e.target.value })} placeholder="dr. Nama Lengkap" />
      </label>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <a className="card hover:ring-sky-500" href={href({ name: 'klinis' })}>
          <h3 className="font-bold">Kasus Klinis</h3>
          <p className="text-sm">Vinyet + EKG serial + keputusan.</p>
        </a>
        <a className="card hover:ring-sky-500" href={href({ name: 'monitor' })}>
          <h3 className="font-bold">Monitor Irama</h3>
          <p className="text-sm">Kenali perubahan irama real-time.</p>
        </a>
        <a className="card hover:ring-sky-500" href={href({ name: 'latihan', mode: 'adaptif' })}>
          <h3 className="font-bold">Latihan Adaptif</h3>
          <p className="text-sm">Ulangi diagnosis yang sering salah.</p>
        </a>
      </div>
    </div>
  );
}
