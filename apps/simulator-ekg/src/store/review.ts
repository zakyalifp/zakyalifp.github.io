/** Hasil Mode Reviewer (localStorage), dapat diekspor sebagai JSON. */
import { create } from 'zustand';
import { readJSON, removeKey, writeJSON } from '../lib/storage';

export type Verdict = 'setuju' | 'tidak-setuju' | '';
export interface ReviewEntry {
  verdict: Verdict;
  note: string;
  at: string;
}
const KEY = 'ekg.review.v1';
interface ReviewStore {
  reviewer: string;
  entries: Record<string, ReviewEntry>;
  setReviewer: (n: string) => void;
  set: (id: string, e: Partial<ReviewEntry>) => void;
  importJson: (data: unknown) => number;
  clear: () => void;
}
const save = (s: { reviewer: string; entries: Record<string, ReviewEntry> }) => writeJSON(KEY, s);
export const useReview = create<ReviewStore>((set, get) => ({
  ...readJSON(KEY, { reviewer: '', entries: {} as Record<string, ReviewEntry> }),
  setReviewer: (n) => {
    set({ reviewer: n });
    save({ reviewer: n, entries: get().entries });
  },
  set: (id, e) => {
    const prev = get().entries[id] ?? { verdict: '', note: '', at: '' };
    const entries = { ...get().entries, [id]: { ...prev, ...e, at: new Date().toISOString() } };
    set({ entries });
    save({ reviewer: get().reviewer, entries });
  },
  importJson: (data) => {
    const d = data as { reviews?: Array<{ id: string; verdict: Verdict; note: string; at?: string }> };
    if (!Array.isArray(d?.reviews)) return 0;
    const entries = { ...get().entries };
    for (const r of d.reviews) if (r.id) entries[r.id] = { verdict: r.verdict ?? '', note: r.note ?? '', at: r.at ?? new Date().toISOString() };
    set({ entries });
    save({ reviewer: get().reviewer, entries });
    return d.reviews.length;
  },
  clear: () => {
    removeKey(KEY);
    set({ entries: {} });
  },
}));
