import { useEffect, useRef, useState } from 'react';
import { DISCLAIMER } from '../config/site';
import { HEART_RATE, TIMING } from '../clinical/guidelines';
import { cx } from '../lib/format';

interface Step {
  title: string;
  body: React.ReactNode;
}

/** Tur interaktif ±60 detik untuk pengguna baru. */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const quiz = [
    { id: 'stim', label: 'Stimulasi terus sampai menangis' },
    { id: 'vtp', label: 'Mulai VTP + pasang oksimeter tangan kanan' },
    { id: 'kompresi', label: 'Mulai kompresi dada' },
  ];
  const steps: Step[] = [
    {
      title: 'Selamat datang 👋',
      body: (
        <>
          <p>Anda memimpin resusitasi bayi baru lahir secara real-time: jam berjalan sejak bayi lahir, dan setiap tindakan memakan waktu seperti di dunia nyata.</p>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-950 dark:bg-amber-950/50 dark:text-amber-50">{DISCLAIMER}</p>
        </>
      ),
    },
    {
      title: 'Dua mode latihan',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Belajar</strong>: kartu “Petunjuk” kuning, tombol yang disarankan ditandai, umpan balik langsung, bisa dijeda & dipercepat 2×/4×.
          </li>
          <li>
            <strong>Ujian</strong>: waktu nyata 1×, tanpa jeda & petunjuk; referensi dikunci; nilai muncul di akhir.
          </li>
        </ul>
      ),
    },
    {
      title: 'Monitor & bayi',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Monitor hanya menampilkan HR/SpO₂ setelah Anda memasang <strong>oksimeter</strong> atau <strong>EKG</strong>. Pita biru = target SpO₂ preduktal menit itu.</li>
          <li>Tanpa monitor, hitung HR dengan <strong>stetoskop</strong>: ketuk setiap denyut selama {HEART_RATE.AUSCULTATION_WINDOW_S} detik.</li>
          <li>Perhatikan ilustrasi bayi: warna, tonus, gerak dada, dan tangis berubah sesuai tindakan Anda.</li>
        </ul>
      ),
    },
    {
      title: 'Coba: apa langkah Anda?',
      body: (
        <>
          <p>Bayi aterm sudah dihangatkan, dikeringkan, dan diposisikan. Ia tetap <strong>apnea</strong> dan HR ±80/menit di detik ke-40.</p>
          <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Pilihan tindakan">
            {quiz.map((q) => (
              <button
                key={q.id}
                type="button"
                role="radio"
                aria-checked={answer === q.id}
                onClick={() => setAnswer(q.id)}
                className={cx('rounded-xl px-3 py-3 text-left font-medium ring-1', answer === q.id ? (q.id === 'vtp' ? 'bg-emerald-100 ring-emerald-500 dark:bg-emerald-900' : 'bg-red-100 ring-red-400 dark:bg-red-900') : 'bg-white ring-slate-300 dark:bg-slate-800 dark:ring-slate-600')}
                data-testid={`onb-${q.id}`}
              >
                {q.label}
              </button>
            ))}
          </div>
          {answer && (
            <p className="mt-2 text-sm" aria-live="polite">
              {answer === 'vtp'
                ? `Tepat! Ventilasi adalah langkah terpenting dan harus dimulai dalam ${TIMING.PPV_START_DEADLINE_S} detik.`
                : answer === 'stim'
                  ? 'Stimulasi berkepanjangan menunda ventilasi — risiko kematian meningkat setiap 30 detik penundaan.'
                  : 'Kompresi hanya bila HR tetap sangat rendah setelah ventilasi yang efektif.'}
            </p>
          )}
        </>
      ),
    },
    {
      title: 'Debriefing & progres',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Di akhir skenario: skor per domain, kesalahan kritis, timeline Anda vs ideal, dan pembelajaran kunci.</li>
          <li>Ekspor PDF debriefing dan sertifikat penyelesaian. Riwayat skor tersimpan hanya di perangkat Anda.</li>
          <li>Bisa dipasang di HP dan berjalan offline setelah kunjungan pertama.</li>
        </ul>
      ),
    },
  ];
  const last = i === steps.length - 1;
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="onb-title"
      className="m-auto w-[min(32rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/60 dark:bg-slate-900 dark:text-slate-100"
      data-testid="onboarding"
    >
      <div className="p-5">
        <div className="mb-3 flex gap-1" aria-hidden="true">
          {steps.map((_, k) => (
            <span key={k} className={cx('h-1.5 flex-1 rounded-full', k <= i ? 'bg-sky-600' : 'bg-slate-200 dark:bg-slate-700')} />
          ))}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Langkah {i + 1} dari {steps.length}
        </p>
        <h2 id="onb-title" className="mt-1 text-xl font-bold">
          {steps[i].title}
        </h2>
        <div className="mt-2 text-[15px] leading-relaxed">{steps[i].body}</div>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} data-testid="onb-skip">
            Lewati
          </button>
          <div className="flex-1" />
          {i > 0 && (
            <button type="button" className="btn-secondary" onClick={() => setI(i - 1)}>
              Kembali
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => (last ? onClose() : setI(i + 1))} data-testid="onb-next">
            {last ? 'Mulai berlatih' : 'Lanjut'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
