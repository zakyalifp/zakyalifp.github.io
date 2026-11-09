import { create } from 'zustand';
import type { Scenario } from '../engine/schema';
import type { Judgement, Params, SimState } from '../engine/state';
import { createSim, dispatch as engineDispatch, tick as engineTick } from '../engine/engine';
import { computeDebrief, type Debrief } from '../engine/scoring';
import { getScenario } from '../scenarios';
import { useHistory } from './history';
import { SIM } from '../clinical/guidelines';

export type Mode = 'belajar' | 'ujian';

export interface Toast {
  id: number;
  kind: 'ok' | 'salah' | 'kritis' | 'info';
  text: string;
}

interface SimStore {
  scenario: Scenario | null;
  mode: Mode;
  state: SimState | null;
  speed: number;
  paused: boolean;
  toasts: Toast[];
  debrief: Debrief | null;
  debriefScenario: Scenario | null;
  debriefState: SimState | null;
  debriefMode: Mode;
  start: (id: string, mode: Mode) => boolean;
  act: (actionId: string, params?: Params) => { ok: boolean; message?: string };
  step: (n?: number) => void;
  setSpeed: (n: number) => void;
  setPaused: (p: boolean) => void;
  dismissToast: (id: number) => void;
  finish: () => void;
  abandon: () => void;
}

let toastId = 1;
const judgementToToast = (j: Judgement): Toast => ({
  id: toastId++,
  kind: j.ok ? 'ok' : j.critical ? 'kritis' : 'salah',
  text: j.msg,
});

export const useSim = create<SimStore>((set, get) => ({
  scenario: null,
  mode: 'belajar',
  state: null,
  speed: 1,
  paused: false,
  toasts: [],
  debrief: null,
  debriefScenario: null,
  debriefState: null,
  debriefMode: 'belajar',

  start: (id, mode) => {
    const sc = getScenario(id);
    if (!sc) return false;
    set({ scenario: sc, mode, state: createSim(sc), speed: 1, paused: false, toasts: [] });
    return true;
  },

  act: (actionId, params = {}) => {
    const { state, scenario, mode } = get();
    if (!state || !scenario) return { ok: false, message: 'Tidak ada skenario aktif.' };
    const r = engineDispatch(state, scenario, actionId, params);
    if (!r.ok) {
      if (mode === 'belajar' || r.message) set({ toasts: [...get().toasts, { id: toastId++, kind: 'info', text: r.message ?? 'Tidak dapat dilakukan.' }].slice(-4) });
      return { ok: false, message: r.message };
    }
    const toasts = mode === 'belajar' ? [...get().toasts, ...r.newJudgements.map(judgementToToast)].slice(-4) : get().toasts;
    set({ state: r.state, toasts });
    if (r.state.phase === 'ended') get().finish();
    return { ok: true };
  },

  step: (n = 1) => {
    const { state, scenario, mode } = get();
    if (!state || !scenario || state.phase !== 'running') return;
    let s = state;
    const before = s.judgements.length;
    for (let i = 0; i < n && s.phase === 'running'; i++) s = engineTick(s, scenario);
    const fresh = s.judgements.slice(before);
    const toasts = mode === 'belajar' && fresh.length ? [...get().toasts, ...fresh.map(judgementToToast)].slice(-4) : get().toasts;
    set({ state: s, toasts });
    if (s.phase === 'ended') get().finish();
  },

  setSpeed: (n) => {
    if (get().mode === 'ujian') return;
    if (!SIM.SPEEDS_LEARN.includes(n)) return;
    set({ speed: n });
  },
  setPaused: (p) => {
    if (get().mode === 'ujian') return;
    set({ paused: p });
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  finish: () => {
    const { state, scenario, mode } = get();
    if (!state || !scenario) return;
    let s = state;
    if (s.phase !== 'ended') {
      const r = engineDispatch(s, scenario, 'end');
      s = r.ok ? r.state : { ...s, phase: 'ended', endReason: 'selesai' };
    }
    const d = computeDebrief(s, scenario);
    useHistory.getState().add({
      id: `${Date.now()}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      mode,
      date: new Date().toISOString(),
      score: d.score,
      passed: d.passed,
      outcome: d.outcomeLabel,
      durationS: d.durationS,
      domains: Object.fromEntries(d.domains.map((x) => [x.domain, x.pct])),
      criticalCount: d.criticalErrors.length,
    });
    set({ state: null, debrief: d, debriefScenario: scenario, debriefState: s, debriefMode: mode, toasts: [] });
  },

  abandon: () => set({ state: null, scenario: null, toasts: [] }),
}));

/** True bila sedang ada skenario Mode Ujian yang berjalan (referensi dikunci). */
export const isExamActive = () => {
  const { state, mode } = useSim.getState();
  return !!state && mode === 'ujian' && state.phase !== 'ended';
};
