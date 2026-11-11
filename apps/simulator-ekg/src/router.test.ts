import { describe, expect, it } from 'vitest';
import { href, parseHash } from './router';
describe('router', () => {
  it('bolak-balik', () => {
    for (const r of [{ name: 'home' }, { name: 'bank' }, { name: 'kasus', id: 'ptbxl-00001' }, { name: 'latihan', mode: 'cepat', level: 'dasar' }, { name: 'klinis', id: 'k1' }, { name: 'monitor' }, { name: 'reviewer' }, { name: 'progres' }] as const) {
      expect(parseHash(href(r as never))).toEqual(r);
    }
    expect(parseHash('#/tidak-ada').name).toBe('notfound');
  });
});
