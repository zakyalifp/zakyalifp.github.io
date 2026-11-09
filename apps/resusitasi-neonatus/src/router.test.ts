import { describe, expect, it } from 'vitest';
import { href, parseHash } from './router';

describe('router hash', () => {
  it('mengurai rute', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/skenario/apnea-vtp')).toEqual({ name: 'briefing', id: 'apnea-vtp' });
    expect(parseHash('#/sim/mr-sopa')).toEqual({ name: 'sim', id: 'mr-sopa' });
    expect(parseHash('#/referensi')).toEqual({ name: 'referensi' });
    expect(parseHash('#/xyz')).toEqual({ name: 'notfound' });
  });
  it('membentuk href', () => {
    expect(href({ name: 'sim', id: 'a' })).toBe('#/sim/a');
    expect(parseHash(href({ name: 'briefing', id: 'x-y' }))).toEqual({ name: 'briefing', id: 'x-y' });
  });
});
