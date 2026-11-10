import { create } from 'zustand';
import { readJSON, writeJSON } from '../lib/storage';
import type { LayoutKind } from '../ekg/render/layout';

export type Theme = 'sistem' | 'terang' | 'gelap';

interface Prefs {
  theme: Theme;
  onboarded: boolean;
  userName: string;
  layout: LayoutKind;
  speed: 25 | 50;
  gain: 5 | 10 | 20;
  /** Sertakan kasus sintetis di latihan. */
  includeSynthetic: boolean;
}
interface PrefsStore extends Prefs {
  set: (p: Partial<Prefs>) => void;
}

const KEY = 'ekg.prefs.v1';
const defaults: Prefs = { theme: 'sistem', onboarded: false, userName: '', layout: '3x4', speed: 25, gain: 10, includeSynthetic: true };

export const usePrefs = create<PrefsStore>((set, get) => ({
  ...defaults,
  ...readJSON<Partial<Prefs>>(KEY, {}),
  set: (p) => {
    set(p);
    const { theme, onboarded, userName, layout, speed, gain, includeSynthetic } = { ...get(), ...p };
    writeJSON(KEY, { theme, onboarded, userName, layout, speed, gain, includeSynthetic });
  },
}));

export function isDark(theme: Theme): boolean {
  return theme === 'gelap' || (theme === 'sistem' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}
export function applyTheme(theme: Theme): void {
  const dark = isDark(theme);
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0b1220' : '#1b2a4a');
}
