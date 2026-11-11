import { describe, expect, it } from 'vitest';
import { validateAll } from './validate-lib';
describe('Validasi manifest kasus', () => {
  it('setiap kasus lengkap; diagnosis inti ≥3 contoh; total ≥150', () => {
    const r = validateAll();
    expect(r.errors).toEqual([]);
    expect(r.total).toBeGreaterThanOrEqual(150);
  });
});
