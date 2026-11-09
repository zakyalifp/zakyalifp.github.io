import { useState } from 'react';
import { ALGORITHM } from '../clinical/algorithm';
import {
  EPINEPHRINE,
  GUIDELINE_REGISTRY,
  IDAI_SPO2_TARGETS,
  SOURCES,
  SPO2_TARGETS,
  VOLUME_EXPANDER,
  acceptableEttSizes,
  d10BolusMl,
  epinephrineDose,
  initialFio2Range,
  lmaAppropriate,
  needsPlasticWrap,
  pipRange,
  recommendedEttDepth,
  volumeBolusMl,
} from '../clinical/guidelines';
import { DISCLAIMER } from '../config/site';
import { useSim } from '../store/sim';
import { num, cx } from '../lib/format';
import { href } from '../router';

export function Reference() {
  const examActive = useSim((s) => !!s.state && s.mode === 'ujian');
  if (examActive) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="reference-locked">
        <h1 className="text-xl font-bold">🔒 Referensi dikunci</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Halaman referensi dan kalkulator tidak tersedia selama Mode Ujian berlangsung.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Referensi cepat</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Tidak tersedia selama Mode Ujian. Semua angka berasal dari satu sumber data simulator (lihat tabel di bawah).</p>
      <nav aria-label="Isi halaman" className="mt-3 flex flex-wrap gap-2 text-sm">
        {[
          ['#algoritma', 'Algoritma'],
          ['#kalkulator', 'Kalkulator dosis'],
          ['#spo2', 'Target SpO₂'],
          ['#nilai', 'Tabel nilai & sumber'],
        ].map(([h, l]) => (
          <a key={h} className="chip" href={h} onClick={(e) => { e.preventDefault(); document.querySelector(h)?.scrollIntoView({ behavior: 'smooth' }); }}>
            {l}
          </a>
        ))}
      </nav>
      <Algorithm />
      <Calculator />
      <Spo2Tables />
      <Registry />
      <section className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-50 dark:ring-amber-800">
        <strong>Disclaimer:</strong> {DISCLAIMER}
      </section>
    </div>
  );
}

function Algorithm() {
  const [path, setPath] = useState<string[]>(['start']);
  const cur = ALGORITHM[path[path.length - 1]];
  const go = (id?: string) => id && setPath((p) => [...p, id]);
  return (
    <section id="algoritma" className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" data-testid="algorithm">
      <h2 className="text-lg font-bold">Algoritma interaktif (AHA/AAP 2025)</h2>
      <ol className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400" aria-label="Jejak keputusan">
        {path.slice(0, -1).map((id, i) => (
          <li key={i}>↳ {ALGORITHM[id].title}</li>
        ))}
      </ol>
      <div className={cx('mt-3 rounded-xl p-4', cur.kind === 'question' ? 'bg-rose-50 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:ring-rose-800' : cur.kind === 'end' ? 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800' : 'bg-sky-50 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-800')} aria-live="polite">
        {cur.minuteOne && <p className="text-xs font-semibold uppercase text-sky-800 dark:text-sky-300">Menit pertama</p>}
        <p className="text-lg font-bold">{cur.title}</p>
        {cur.body && <p className="mt-1">{cur.body}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {cur.kind === 'question' && (
            <>
              <button type="button" className="btn-primary" onClick={() => go(cur.yes)}>
                Ya
              </button>
              <button type="button" className="btn-secondary" onClick={() => go(cur.no)}>
                Tidak
              </button>
            </>
          )}
          {cur.kind === 'step' && (
            <button type="button" className="btn-primary" onClick={() => go(cur.next)}>
              Lanjut
            </button>
          )}
          {path.length > 1 && (
            <button type="button" className="btn-secondary" onClick={() => setPath((p) => p.slice(0, -1))}>
              Kembali
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => setPath(['start'])}>
            Ulang
          </button>
        </div>
      </div>
    </section>
  );
}

function Calculator() {
  const [w, setW] = useState('3');
  const [ga, setGa] = useState('39');
  const kg = Number(w.replace(',', '.'));
  const wk = Number(ga.replace(',', '.'));
  const valid = kg > 0.3 && kg < 7 && wk >= 22 && wk <= 44;
  const iv = valid ? epinephrineDose(kg, 'iv') : null;
  const ett = valid ? epinephrineDose(kg, 'ett') : null;
  const f = valid ? initialFio2Range(wk) : null;
  const p = valid ? pipRange(wk) : null;
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="grid grid-cols-[1fr_1.3fr] gap-3 border-t border-slate-200 py-2 text-sm dark:border-slate-700">
      <dt className="font-medium">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
  return (
    <section id="kalkulator" className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" data-testid="calculator">
      <h2 className="text-lg font-bold">Kalkulator dosis & alat</h2>
      <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
        <label className="text-sm font-semibold">
          Berat badan (kg)
          <input className="input mt-1 font-mono" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} data-testid="calc-weight" />
        </label>
        <label className="text-sm font-semibold">
          Usia gestasi (minggu)
          <input className="input mt-1 font-mono" inputMode="numeric" value={ga} onChange={(e) => setGa(e.target.value)} data-testid="calc-ga" />
        </label>
      </div>
      {!valid ? (
        <p className="mt-3 text-sm text-red-800 dark:text-red-300">Masukkan berat 0,4–6 kg dan usia gestasi 22–44 minggu.</p>
      ) : (
        <dl className="mt-3" data-testid="calc-results">
          <Row k={`Epinefrin IV/IO (${num(EPINEPHRINE.CONCENTRATION_MG_PER_ML)} mg/mL)`} v={<><strong>{num(iv!.typicalMg, 3)} mg = {num(iv!.typicalMl)} mL</strong> (rentang {num(iv!.mg.min, 3)}–{num(iv!.mg.max, 3)} mg = {num(iv!.ml.min)}–{num(iv!.ml.max)} mL) + bilas NaCl 0,9% {EPINEPHRINE.FLUSH_ML} mL</>} />
          <Row k="Epinefrin endotrakeal" v={<><strong>{num(ett!.typicalMg, 3)} mg = {num(ett!.typicalMl)} mL</strong> (rentang {num(ett!.mg.min, 3)}–{num(ett!.mg.max, 3)} mg = {num(ett!.ml.min)}–{num(ett!.ml.max)} mL), tanpa bilas</>} />
          <Row k="NaCl 0,9% / PRC O-neg" v={<><strong>{num(volumeBolusMl(kg), 1)} mL</strong> ({VOLUME_EXPANDER.DOSE_ML_PER_KG} mL/kg; AHA: {VOLUME_EXPANDER.DOSE_RANGE_ML_PER_KG.min}–{VOLUME_EXPANDER.DOSE_RANGE_ML_PER_KG.max} mL/kg) dalam {VOLUME_EXPANDER.INFUSION_DURATION_S.min / 60}–{VOLUME_EXPANDER.INFUSION_DURATION_S.max / 60} menit</>} />
          <Row k="Dekstrosa 10% (bila hipoglikemia)" v={`${num(d10BolusMl(kg), 1)} mL`} />
          <Row k="ETT (NRP 9)" v={`${acceptableEttSizes(kg, wk).map((x) => num(x, 1)).join(' / ')} mm · kedalaman di gusi ${num(recommendedEttDepth(wk), 1)} cm`} />
          <Row k="Laryngeal mask" v={lmaAppropriate(wk, kg) ? 'Sesuai (≥34 minggu, ≥2 kg)' : 'Di luar bukti (<34 minggu atau <2 kg) — pertimbangkan intubasi'} />
          <Row k="FiO₂ awal" v={f!.min === f!.max ? `${f!.min}%` : `${f!.min}–${f!.max}%`} />
          <Row k="PIP awal" v={`${p!.min}–${p!.max} cmH₂O`} />
          <Row k="Termoregulasi" v={needsPlasticWrap(wk, kg) ? 'Plastik tanpa dikeringkan (kecuali wajah) + topi + penghangat' : 'Keringkan, kain hangat, topi; kontak kulit bila bugar'} />
        </dl>
      )}
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Selalu hitung ulang bersama tim (closed-loop) dan cocokkan dengan sediaan di fasilitas Anda.</p>
    </section>
  );
}

function Spo2Tables() {
  return (
    <section id="spo2" className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="text-lg font-bold">Target SpO₂ preduktal — AHA 2025 / NRP 9</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">Dipakai untuk penilaian di simulator.</p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {SPO2_TARGETS.map((r) => (
              <tr key={r.minute} className="border-t border-slate-200 dark:border-slate-700">
                <td className="py-1.5">{r.minute} menit</td>
                <td className="py-1.5 font-mono">
                  {r.min}–{r.max}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="text-lg font-bold">Target SpO₂ preduktal — IDAI 2022</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">Untuk perbandingan dengan alur nasional.</p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {IDAI_SPO2_TARGETS.map((r) => (
              <tr key={r.label} className="border-t border-slate-200 dark:border-slate-700">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 font-mono">
                  {r.min}–{r.max}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Registry() {
  return (
    <section id="nilai" className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <h2 className="text-lg font-bold">Tabel nilai klinis & sumber</h2>
      <p className="text-xs text-slate-600 dark:text-slate-400">“VERIFY” = belum dimuat di AHA 2025 / bagan NRP 9 / bagan IDAI 2022 dan sedang ditinjau.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase text-slate-600 dark:text-slate-400">
            <tr>
              <th className="py-2 pr-3">Parameter</th>
              <th className="py-2 pr-3">Nilai</th>
              <th className="py-2 pr-3">Sumber</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {GUIDELINE_REGISTRY.map((r) => (
              <tr key={r.key} className="border-t border-slate-200 align-top dark:border-slate-700">
                <td className="py-1.5 pr-3">{r.parameter}</td>
                <td className="py-1.5 pr-3">{r.value}</td>
                <td className="py-1.5 pr-3 text-xs">{r.source}</td>
                <td className="py-1.5 text-xs">{r.status === 'terverifikasi' ? '✅' : r.status === 'VERIFY' ? '⚠️ VERIFY' : 'ℹ️ simulasi'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mt-5 font-bold">Daftar pustaka</h3>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
        {SOURCES.map((s) => (
          <li key={s.id}>
            {s.text}{' '}
            <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">
              tautan
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm">
        Kembali ke <a className="underline" href={href({ name: 'home' })}>katalog skenario</a>.
      </p>
    </section>
  );
}
