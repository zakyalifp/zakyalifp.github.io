import { create } from 'zustand';
import { readJSON, removeKey, writeJSON } from '../lib/storage';
import type { Domain } from '../engine/schema';

export interface HistoryEntry {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  mode: 'belajar' | 'ujian';
  date: string;
  score: number;
  passed: boolean;
  outcome: string;
  durationS: number;
  domains: Partial<Record<Domain, number | null>>;
  criticalCount: number;
}

const KEY = 'rn.history.v1';
const MAX = 200;

interface HistoryStore {
  entries: HistoryEntry[];
  add: (e: HistoryEntry) => void;
  clear: () => void;
}

export const useHistory = create<HistoryStore>((set, get) => ({
  entries: readJSON<HistoryEntry[]>(KEY, []),
  add: (e) => {
    const entries = [...get().entries, e].slice(-MAX);
    writeJSON(KEY, entries);
    set({ entries });
  },
  clear: () => {
    removeKey(KEY);
    set({ entries: [] });
  },
}));
