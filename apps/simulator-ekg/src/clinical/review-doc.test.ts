import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CRITERIA_REGISTRY } from './ecg-criteria';
describe('docs/CLINICAL_REVIEW.md sinkron dengan ecg-criteria.ts', () => {
  it('setiap kunci registri ada di tabel (jalankan npm run docs:clinical bila gagal)', () => {
    const md = readFileSync(resolve(__dirname, '../../docs/CLINICAL_REVIEW.md'), 'utf8');
    for (const r of CRITERIA_REGISTRY) expect(md).toContain(`\`${r.key}\``);
  });
});
