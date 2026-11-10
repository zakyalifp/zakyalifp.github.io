/** Onboarding singkat: membaca kertas EKG & memakai kaliper. */
import { useEffect, useRef, useState } from 'react';
import { PAPER } from '../clinical/ecg-criteria';

const STEPS = [
  { t: 'Kertas EKG', b: `Standar: ${PAPER.SPEED_MM_PER_S} mm/detik dan ${PAPER.GAIN_MM_PER_MV} mm/mV. Satu kotak kecil (1 mm) = 40 ms dan 0,1 mV; satu kotak besar (5 mm) = 200 ms dan 0,5 mV. Pulsa kalibrasi di kiri tiap baris = 1 mV (tinggi 10 mm). Selalu cek kalibrasi sebelum menilai voltase.` },
  { t: 'Tata letak 3×4', b: 'Empat kolom × 2,5 detik: I–II–III, aVR–aVL–aVF, V1–V3, V4–V6, ditambah strip irama sadapan II selama 10 detik di bawah. Di HP pakai "1 sadapan" atau layar penuh landscape.' },
  { t: 'Zoom & geser', b: 'Cubit atau Ctrl+roda untuk zoom, seret untuk menggeser, ketuk dua kali untuk kembali. Keyboard: + / − / 0 dan tombol panah.' },
  { t: 'Kaliper', b: 'Pilih "↔ Kaliper" lalu seret dari puncak R ke puncak R berikutnya: interval (ms) dan laju (/menit) tampil. Aktifkan "March-out" untuk melihat apakah P/QRS berbaris teratur (berguna untuk AV blok dan disosiasi AV).' },
  { t: 'Amplitudo, penggaris & aksis', b: '"↕ Amplitudo" untuk elevasi/depresi ST dan voltase (mm). "⌇ Penggaris laju" menampilkan 300-150-100-75-60-50. "Roda aksis" menghitung aksis dari defleksi netto I & aVF; "Kalkulator QTc" memberi Bazett & Fridericia.' },
  { t: 'Nyata vs sintetis', b: 'Label ● EKG nyata = rekaman pasien dari dataset terbuka PTB-XL/Chapman. Label ◆ Sintetis = dibangkitkan model komputer untuk pola langka (mis. de Winter, hiperkalemia bertahap). Keduanya tidak pernah dicampur diam-diam.' },
];

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const s = STEPS[i];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ob-title" data-testid="onboarding">
      <div ref={ref} tabIndex={-1} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Panduan singkat {i + 1}/{STEPS.length}
        </p>
        <h2 id="ob-title" className="mt-1 text-xl font-bold">
          {s.t}
        </h2>
        <p className="mt-2 leading-relaxed">{s.b}</p>
        {i === 0 && (
          <svg viewBox="0 0 200 60" className="mt-3 w-full rounded bg-[#fffaf7]" aria-label="Contoh grid kertas EKG">
            {Array.from({ length: 41 }, (_, k) => (
              <line key={`v${k}`} x1={k * 5} y1={0} x2={k * 5} y2={60} stroke={k % 5 ? 'rgba(232,120,120,0.35)' : 'rgba(214,72,72,0.7)'} strokeWidth={k % 5 ? 0.4 : 0.8} />
            ))}
            {Array.from({ length: 13 }, (_, k) => (
              <line key={`h${k}`} x1={0} y1={k * 5} x2={200} y2={k * 5} stroke={k % 5 ? 'rgba(232,120,120,0.35)' : 'rgba(214,72,72,0.7)'} strokeWidth={k % 5 ? 0.4 : 0.8} />
            ))}
            <path d="M5 45h5v-50h0v0" fill="none" />
            <path d="M5 45h5v-25h10v25h5" fill="none" stroke="#111" strokeWidth="1" />
            <text x="30" y="20" fontSize="6" fill="#1b2a4a">1 mV = 10 mm (2 kotak besar)</text>
            <text x="30" y="30" fontSize="6" fill="#1b2a4a">5 mm = 200 ms</text>
          </svg>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} data-testid="onboarding-skip">
            Lewati
          </button>
          <div className="ml-auto flex gap-2">
            {i > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setI(i - 1)}>
                Kembali
              </button>
            )}
            {i < STEPS.length - 1 ? (
              <button type="button" className="btn-primary" onClick={() => setI(i + 1)} data-testid="onboarding-next">
                Lanjut
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onClose} data-testid="onboarding-done">
                Mulai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
