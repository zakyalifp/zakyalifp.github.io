/** Membuat ulang tabel di docs/CLINICAL_REVIEW.md dari CRITERIA_REGISTRY & SOURCES. Jalankan: npm run docs:clinical */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CRITERIA_REGISTRY, SOURCES } from '../src/clinical/ecg-criteria';

const file = resolve(__dirname, '../docs/CLINICAL_REVIEW.md');
const esc = (s: string) => s.replace(/\|/g, '\\|');
const st = (s: string) => (s === 'VERIFY' ? '⚠️ VERIFY' : s === 'asumsi-sim' ? 'ℹ️ asumsi-sim' : '✅ terverifikasi');
const table = [
  '| # | Parameter | Nilai di simulator | Sumber | Status | Kunci di `ecg-criteria.ts` | Dicek |',
  '|---|---|---|---|---|---|---|',
  ...CRITERIA_REGISTRY.map((r, i) => `| ${i + 1} | ${esc(r.parameter)} | ${esc(r.value)} | ${esc(r.source)} | ${st(r.status)} | \`${r.key}\` | ☐ |`),
].join('\n');
const counts = { t: CRITERIA_REGISTRY.filter((r) => r.status === 'terverifikasi').length, v: CRITERIA_REGISTRY.filter((r) => r.status === 'VERIFY').length, a: CRITERIA_REGISTRY.filter((r) => r.status === 'asumsi-sim').length };
const src = Object.entries(SOURCES).map(([k, v]) => `- **${k}** — ${v}`).join('\n');
function put(md: string, a: string, b: string, body: string) {
  const i = md.indexOf(a);
  const j = md.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`Penanda ${a} tidak ditemukan`);
  return md.slice(0, i + a.length) + '\n' + body + '\n' + md.slice(j);
}
let md = readFileSync(file, 'utf8');
md = put(md, '<!-- TABEL-OTOMATIS:MULAI -->', '<!-- TABEL-OTOMATIS:SELESAI -->', `Ringkasan: ${counts.t} terverifikasi · ${counts.v} VERIFY · ${counts.a} asumsi-sim.\n\n${table}`);
md = put(md, '<!-- SUMBER-OTOMATIS:MULAI -->', '<!-- SUMBER-OTOMATIS:SELESAI -->', src);
writeFileSync(file, md);
console.log(`CLINICAL_REVIEW.md diperbarui: ${CRITERIA_REGISTRY.length} baris (${counts.t}/${counts.v}/${counts.a}).`);
