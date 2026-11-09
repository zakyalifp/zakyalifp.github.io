/**
 * Membuat ulang tabel di docs/CLINICAL_REVIEW.md dari GUIDELINE_REGISTRY.
 * Jalankan: npm run docs:clinical
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GUIDELINE_REGISTRY } from '../src/clinical/guidelines';

const file = resolve(__dirname, '../docs/CLINICAL_REVIEW.md');
const start = '<!-- TABEL-OTOMATIS:MULAI -->';
const end = '<!-- TABEL-OTOMATIS:SELESAI -->';
const esc = (s: string) => s.replace(/\|/g, '\\|');
const rows = GUIDELINE_REGISTRY.map(
  (r, i) => `| ${i + 1} | ${esc(r.parameter)} | ${esc(r.value)} | ${esc(r.source)} | ${r.status === 'VERIFY' ? '⚠️ VERIFY' : r.status === 'asumsi-sim' ? 'ℹ️ asumsi-sim' : '✅ terverifikasi'} | \`${r.key}\` | ☐ |`,
);
const table = [
  '| # | Parameter | Nilai di simulator | Sumber (bagian) | Status | Kunci di `guidelines.ts` | Dicek |',
  '|---|---|---|---|---|---|---|',
  ...rows,
].join('\n');
const md = readFileSync(file, 'utf8');
const i = md.indexOf(start);
const j = md.indexOf(end);
if (i < 0 || j < 0) throw new Error('Penanda tabel tidak ditemukan');
writeFileSync(file, md.slice(0, i + start.length) + '\n' + table + '\n' + md.slice(j));
console.log(`Tabel diperbarui: ${rows.length} baris.`);
