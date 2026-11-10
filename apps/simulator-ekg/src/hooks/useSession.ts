/** Pemilihan kasus & alur sesi latihan (dipakai semua mode). */
import { useCallback, useRef, useState } from 'react';
import type { CaseMeta } from '../cases/model';
import { createRng } from '../ekg/synth/prng';
import type { ItemResult } from '../scoring/grade';
import { summarize, type SessionResult } from '../scoring/session';
import { useProgress } from '../store/progress';
import { navigate } from '../router';
import type { Level } from '../cases/diagnoses';

/** Ambil n kasus beragam (maks. 1 per diagnosis bila memungkinkan), acak dengan seed. */
export function pickCases(pool: CaseMeta[], n: number, seed: string): CaseMeta[] {
  const rng = createRng(seed);
  const shuffled = pool.map((c) => [rng.next(), c] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const out: CaseMeta[] = [];
  const seen = new Set<string>();
  for (const c of shuffled) {
    if (out.length >= n) break;
    if (!seen.has(c.dx)) {
      out.push(c);
      seen.add(c.dx);
    }
  }
  for (const c of shuffled) {
    if (out.length >= n) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export function useSessionRunner(mode: SessionResult['mode'], title: string, level?: Level) {
  const [items, setItems] = useState<ItemResult[]>([]);
  const t0 = useRef(Date.now());
  const add = useProgress((s) => s.addSession);
  const record = useCallback((it: ItemResult) => setItems((x) => [...x, it]), []);
  const finish = useCallback(
    (final?: ItemResult[]) => {
      const all = final ?? items;
      const s = summarize(mode, title, all, Math.round((Date.now() - t0.current) / 1000), level);
      add(s);
      navigate({ name: 'debriefing' });
      return s;
    },
    [items, mode, title, level, add],
  );
  const reset = useCallback(() => {
    setItems([]);
    t0.current = Date.now();
  }, []);
  return { items, record, finish, reset };
}
