import { useEffect, useState } from 'react';
import { feedbackHref } from '../config/site';
import { fetchVisitCount } from '../lib/visits';
import { cx } from '../lib/format';

/** Tombol/tautan ke Google Form umpan balik. Tidak tampil bila FEEDBACK_URL belum diisi. */
export function FeedbackLink({ caseId, variant = 'link', label }: { caseId?: string; variant?: 'link' | 'button'; label?: string }) {
  const url = feedbackHref(caseId);
  const text = label ?? (caseId ? 'Laporkan masalah pada kasus ini' : 'Beri umpan balik');
  if (!url) {
    // Form belum dipasang: tampilkan keterangan singkat hanya pada varian tombol.
    return variant === 'button' ? <span className="text-xs text-slate-600 dark:text-slate-400">Form umpan balik segera tersedia.</span> : null;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(variant === 'button' ? 'btn-secondary inline-flex' : 'underline')}
      data-testid={caseId ? 'feedback-case' : 'feedback-link'}
    >
      {text}
      <span className="sr-only"> (membuka Google Form di tab baru)</span>
    </a>
  );
}

/** Jumlah kunjungan dari GoatCounter; tidak menampilkan apa pun sampai angka tersedia. */
export function VisitCount({ className }: { className?: string }) {
  const [app, setApp] = useState<string | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const path = location.pathname.replace(/[^/]*$/, '');
    void fetchVisitCount(path).then((v) => live && setApp(v));
    void fetchVisitCount('TOTAL').then((v) => live && setTotal(v));
    return () => {
      live = false;
    };
  }, []);
  if (!app && !total) return null;
  return (
    <span className={className} data-testid="visit-count">
      {app && <>Simulator EKG telah dibuka {app} kali</>}
      {app && total && ' · '}
      {total && <>seluruh situs {total} kunjungan</>} (penghitung anonim GoatCounter)
    </span>
  );
}
