/** PRNG deterministik (mulberry32) + noise berbasis hash agar render per-potongan identik. */
export interface Rng {
  next(): number;
  /** Normal baku (Box–Muller). */
  normal(): number;
  range(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
}

export function hashSeed(s: string | number): number {
  const str = String(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  return {
    next,
    normal() {
      if (spare !== null) {
        const s = spare;
        spare = null;
        return s;
      }
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const m = Math.sqrt(-2 * Math.log(u));
      spare = m * Math.sin(2 * Math.PI * v);
      return m * Math.cos(2 * Math.PI * v);
    },
    range(x, y) {
      return x + (y - x) * next();
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length) % arr.length];
    },
  };
}

/** Bilangan acak [−1, 1) dari (seed, indeks, kanal) tanpa state. */
export function hashNoise(seed: number, i: number, ch: number): number {
  let h = (seed ^ Math.imul(i, 0x9e3779b1) ^ Math.imul(ch + 1, 0x85ebca77)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}
