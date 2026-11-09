/** Ekspor PDF debriefing & sertifikat (jsPDF dimuat lazy hanya saat dibutuhkan). */
import type { Debrief } from '../engine/scoring';
import type { Scenario } from '../engine/schema';
import { DISCLAIMER, SITE } from '../config/site';
import { clock } from '../lib/format';

/** Font standar PDF hanya mendukung WinAnsi: ganti karakter yang tidak didukung. */
function t(s: string): string {
  return s
    .replace(/₂/g, '2')
    .replace(/[′]/g, "'")
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[→]/g, '->')
    .replace(/[✓✅]/g, 'v')
    .replace(/[❌⛔]/g, 'x')
    .replace(/[^\x20-\x7E -ÿ–—•…°×±]/g, '');
}

const today = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const fileSafe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function exportDebriefPdf(d: Debrief, sc: Scenario, mode: string, name: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15;
  let y = 18;
  const line = (text: string, size = 10, bold = false, gap = 1.5) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(t(text), W - 2 * M) as string[];
    for (const l of lines) {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(l, M, y);
      y += size * 0.42 + gap;
    }
  };
  doc.setFillColor(27, 42, 74);
  doc.rect(0, 0, W, 10, 'F');
  line(`${SITE.APP_NAME} — Debriefing`, 16, true, 3);
  line(`Skenario #${sc.number}: ${sc.title} (${sc.subtitle})`, 11, true);
  line(`Peserta: ${name || '-'} · Mode: ${mode === 'ujian' ? 'Ujian' : 'Belajar'} · Tanggal: ${today()} · Durasi: ${clock(d.durationS)}`);
  line(`Acuan: ${SITE.GUIDELINE_LABEL}`, 9);
  y += 2;
  line(`Skor total: ${d.score} — ${d.passed ? 'LULUS' : 'BELUM LULUS'}`, 13, true);
  line(`Luaran: ${d.outcomeLabel}. Akhir: HR ${d.finalVitals.hr}/menit, SpO2 ${d.finalVitals.spo2}%, suhu ${d.finalVitals.temp.toFixed(1)} °C.`);
  line(`Waktu sampai ventilasi efektif: ${d.timeToEffectiveVentilation !== null ? `${d.timeToEffectiveVentilation} detik` : 'tidak tercapai'}. Penyebab dasar: ${sc.hidden.cause}.`);
  y += 2;
  line('Skor per domain', 12, true);
  for (const x of d.domains) line(`• ${x.label}: ${x.pct === null ? 'n/a' : x.pct}${x.errors ? ` (${x.errors} catatan kesalahan)` : ''}`);
  if (d.criticalErrors.length) {
    y += 2;
    line('Kesalahan kritis', 12, true);
    for (const e of d.criticalErrors) line(`• ${e}`);
  }
  if (d.doseErrors.length) {
    y += 2;
    line('Kesalahan dosis', 12, true);
    for (const e of d.doseErrors) line(`• ${e.msg}`);
  }
  if (d.missedSteps.length) {
    y += 2;
    line('Langkah terlewat', 12, true);
    for (const m of d.missedSteps) line(`• ${m}`);
  }
  y += 2;
  line('Timeline (Anda vs ideal)', 12, true);
  for (const r of d.timeline) {
    const u = r.userT === null ? 'tidak dilakukan' : r.userT < 0 ? 'pra-lahir' : clock(r.userT);
    const i = r.idealT < 0 ? 'pra-lahir' : clock(r.idealT);
    line(`• ${r.label}: Anda ${u} · ideal ${i}${r.delta !== null && r.delta !== 0 ? ` (${r.delta > 0 ? '+' : ''}${r.delta} dtk)` : ''}`, 9, false, 0.8);
  }
  y += 2;
  line('Pembelajaran kunci', 12, true);
  for (const k of d.keyLearnings) line(`• ${k}`);
  y += 3;
  line(`Disclaimer: ${DISCLAIMER}`, 8);
  doc.save(`debriefing-${fileSafe(sc.id)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportCertificatePdf(d: Debrief, sc: Scenario, mode: string, name: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const W = 297;
  const H = 210;
  doc.setDrawColor(27, 42, 74);
  doc.setLineWidth(2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.5);
  doc.setDrawColor(166, 135, 76);
  doc.rect(14, 14, W - 28, H - 28);
  const c = (text: string, y: number, size: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(t(text), W / 2, y, { align: 'center' });
  };
  doc.setTextColor(27, 42, 74);
  c('SERTIFIKAT PENYELESAIAN', 45, 26, true);
  doc.setTextColor(60, 60, 60);
  c('diberikan kepada', 62, 13);
  doc.setTextColor(20, 20, 20);
  c(name || '(nama peserta)', 80, 24, true);
  doc.setTextColor(60, 60, 60);
  c(`telah menyelesaikan skenario simulasi resusitasi neonatus`, 96, 13);
  c(`#${sc.number} — ${sc.title}`, 108, 15, true);
  c(`Mode ${mode === 'ujian' ? 'Ujian' : 'Belajar'} · Skor ${d.score} · ${today()}`, 120, 12);
  c(`${SITE.APP_NAME} · ${SITE.GUIDELINE_LABEL}`, 140, 10);
  c(`Pembuat: ${SITE.AUTHOR_NAME}`, 148, 10);
  doc.setFontSize(8);
  const disc = doc.splitTextToSize(
    t(`Sertifikat ini menandakan penyelesaian latihan simulasi mandiri, BUKAN sertifikasi resmi NRP/Resusitasi Neonatus IDAI dan tidak dapat dipakai sebagai bukti kompetensi. ${DISCLAIMER}`),
    W - 70,
  ) as string[];
  doc.text(disc, W / 2, 168, { align: 'center' });
  doc.save(`sertifikat-${fileSafe(sc.id)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
