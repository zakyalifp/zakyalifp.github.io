/** Ekspor PDF ringkasan sesi/progres & sertifikat (jsPDF dimuat lazy). */
import type { SessionResult } from '../scoring/session';
import { competencyScores } from '../scoring/session';
import { DIAGNOSES, LEVEL_LABEL, type Level } from '../cases/diagnoses';
import { DISCLAIMER, SITE } from '../config/site';
import { SCORING } from '../clinical/ecg-criteria';

function t(s: string): string {
  return s
    .replace(/[₂]/g, '2')
    .replace(/[⁺]/g, '+')
    .replace(/[²]/g, '2')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[→]/g, '->')
    .replace(/[−]/g, '-')
    .replace(/[√]/g, 'akar')
    .replace(/[∛]/g, 'akar3')
    .replace(/[✓]/g, 'v')
    .replace(/[✗]/g, 'x')
    .replace(/[^\x20-\x7E -ÿ–—•…°×±]/g, '');
}
const today = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const MODE_LABEL: Record<SessionResult['mode'], string> = { sistematis: 'Interpretasi Sistematis', cepat: 'Diagnosis Cepat', klinis: 'Kasus Klinis', monitor: 'Monitor Irama', adaptif: 'Latihan Adaptif' };

async function doc(orientation: 'portrait' | 'landscape' = 'portrait') {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'mm', format: 'a4', orientation });
}

/** Ringkasan: satu sesi (bila diberikan) atau seluruh progres. */
export async function exportSummaryPdf(sessions: SessionResult[], name: string, focus?: SessionResult): Promise<void> {
  const d = await doc();
  const W = 210;
  const M = 15;
  let y = 18;
  const line = (text: string, size = 10, bold = false, gap = 1.5) => {
    d.setFont('helvetica', bold ? 'bold' : 'normal');
    d.setFontSize(size);
    for (const l of d.splitTextToSize(t(text), W - 2 * M) as string[]) {
      if (y > 282) {
        d.addPage();
        y = 18;
      }
      d.text(l, M, y);
      y += size * 0.42 + gap;
    }
  };
  d.setFillColor(27, 42, 74);
  d.rect(0, 0, W, 10, 'F');
  line(`${SITE.APP_NAME} — ${focus ? 'Debriefing sesi' : 'Ringkasan progres'}`, 16, true, 3);
  line(`Peserta: ${name || '-'} · Tanggal: ${today()}`);
  if (focus) {
    line(`${MODE_LABEL[focus.mode]}${focus.level ? ` · ${LEVEL_LABEL[focus.level]}` : ''} · ${focus.items.length} EKG · durasi ${Math.round(focus.durationS / 60)} menit`);
    y += 2;
    line(`Skor: ${focus.score} — ${focus.passed ? 'LULUS' : `BELUM LULUS (batas ${SCORING.PASS_SCORE}, tanpa kesalahan kritis)`}`, 13, true);
  } else line(`${sessions.length} sesi tersimpan · rerata skor ${sessions.length ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0}`);
  y += 2;
  line('Skor per kompetensi', 12, true);
  const comp = focus ? focus.competencies : competencyScores(sessions.flatMap((s) => s.items));
  for (const c of comp) line(`• ${c.label}: ${c.pct === null ? 'belum ada data' : `${c.pct}%`}`);
  if (focus?.criticalErrors.length) {
    y += 2;
    line('Kesalahan kritis', 12, true);
    for (const e of focus.criticalErrors) line(`• ${e}`);
  }
  y += 2;
  if (focus) {
    line('Rincian per EKG', 12, true);
    focus.items.forEach((it, i) => {
      line(`${i + 1}. ${DIAGNOSES[it.dx]?.label ?? it.dx} (${it.kind}) — skor ${Math.round(it.score * 100)}`, 10, true, 0.8);
      for (const s of it.steps.filter((x) => x.ok === false).slice(0, 6)) line(`   x ${s.label}: Anda ${s.user}; benar ${s.truth}`, 9, false, 0.6);
    });
  } else {
    line('Riwayat sesi (terbaru)', 12, true);
    for (const s of sessions.slice(-25).reverse()) line(`• ${new Date(s.date).toLocaleDateString('id-ID')} · ${MODE_LABEL[s.mode]}${s.level ? ` (${s.level})` : ''} · ${s.items.length} EKG · skor ${s.score}${s.passed ? ' · lulus' : ''}`, 9, false, 0.6);
  }
  y += 3;
  line(`Disclaimer: ${DISCLAIMER}`, 8);
  d.save(`ekg-${focus ? 'debriefing' : 'progres'}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportCertificatePdf(level: Level, score: number, nCases: number, name: string): Promise<void> {
  const d = await doc('landscape');
  const W = 297;
  const H = 210;
  d.setDrawColor(27, 42, 74);
  d.setLineWidth(2);
  d.rect(10, 10, W - 20, H - 20);
  d.setLineWidth(0.5);
  d.setDrawColor(166, 135, 76);
  d.rect(14, 14, W - 28, H - 28);
  const c = (text: string, y: number, size: number, bold = false) => {
    d.setFont('helvetica', bold ? 'bold' : 'normal');
    d.setFontSize(size);
    d.text(t(text), W / 2, y, { align: 'center' });
  };
  d.setTextColor(27, 42, 74);
  c('SERTIFIKAT PENYELESAIAN', 45, 26, true);
  d.setTextColor(60, 60, 60);
  c('diberikan kepada', 62, 13);
  d.setTextColor(20, 20, 20);
  c(name || '(nama peserta)', 80, 24, true);
  d.setTextColor(60, 60, 60);
  c('telah menyelesaikan kurikulum interpretasi EKG 12 sadapan tingkat', 96, 13);
  c(LEVEL_LABEL[level], 108, 16, true);
  c(`Skor ${score} · ${nCases} EKG · ${today()}`, 120, 12);
  c(`${SITE.APP_NAME} · ${SITE.GUIDELINE_LABEL}`, 140, 9);
  c(`Pembuat: ${SITE.AUTHOR_NAME} · ${SITE.AUTHOR_AFFILIATION}`, 148, 10);
  d.setFontSize(8);
  const disc = d.splitTextToSize(t(`Sertifikat ini menandakan penyelesaian latihan simulasi mandiri, BUKAN sertifikasi resmi dan tidak dapat dipakai sebagai bukti kompetensi klinis. ${DISCLAIMER}`), W - 70) as string[];
  d.text(disc, W / 2, 168, { align: 'center' });
  d.save(`sertifikat-ekg-${level}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
