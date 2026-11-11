import { create } from 'zustand';
import { readJSON, removeKey, writeJSON } from '../lib/storage';
import { updateCard, type SessionResult, type SrsCard } from '../scoring/session';

const KEY_S = 'ekg.sessions.v1';
const KEY_C = 'ekg.srs.v1';
const MAX = 150;

/** Simpan ringkas (tanpa detail langkah lama) agar localStorage tidak penuh. */
function compact(s: SessionResult): SessionResult {
  return { ...s, items: s.items.map((i) => ({ ...i, steps: i.steps.map((x) => ({ ...x, feedback: '' })) })) };
}

interface ProgressStore {
  sessions: SessionResult[];
  cards: Record<string, SrsCard>;
  last: SessionResult | null;
  addSession: (s: SessionResult) => void;
  clear: () => void;
}

export const useProgress = create<ProgressStore>((set, get) => ({
  sessions: readJSON<SessionResult[]>(KEY_S, []),
  cards: readJSON<Record<string, SrsCard>>(KEY_C, {}),
  last: null,
  addSession: (s) => {
    const sessions = [...get().sessions, compact(s)].slice(-MAX);
    const cards = { ...get().cards };
    for (const it of s.items) cards[it.dx] = updateCard(cards[it.dx], it.dx, it.score);
    writeJSON(KEY_S, sessions);
    writeJSON(KEY_C, cards);
    set({ sessions, cards, last: s });
  },
  clear: () => {
    removeKey(KEY_S);
    removeKey(KEY_C);
    set({ sessions: [], cards: {}, last: null });
  },
}));
