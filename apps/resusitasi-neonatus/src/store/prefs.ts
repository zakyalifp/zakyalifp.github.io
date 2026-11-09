import { create } from 'zustand';
import { readJSON, writeJSON } from '../lib/storage';

export type Theme = 'sistem' | 'terang' | 'gelap';

interface Prefs {
  theme: Theme;
  soundOn: boolean;
  volume: number; // 0–1
  onboarded: boolean;
  userName: string;
}

interface PrefsStore extends Prefs {
  set: (p: Partial<Prefs>) => void;
}

const KEY = 'rn.prefs.v1';
const defaults: Prefs = { theme: 'sistem', soundOn: true, volume: 0.6, onboarded: false, userName: '' };

export const usePrefs = create<PrefsStore>((set, get) => ({
  ...defaults,
  ...readJSON<Partial<Prefs>>(KEY, {}),
  set: (p) => {
    set(p);
    const { theme, soundOn, volume, onboarded, userName } = { ...get(), ...p };
    writeJSON(KEY, { theme, soundOn, volume, onboarded, userName });
  },
}));

export function applyTheme(theme: Theme): void {
  const dark = theme === 'gelap' || (theme === 'sistem' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', !!dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0b1220' : '#1b2a4a');
}
