/** Agregasi sesi, skor per kompetensi, pengulangan berjarak (SM-2 sederhana). */
import { SCORING } from '../clinical/ecg-criteria';
import { COMPETENCY_LABEL, type Competency, type Level } from '../cases/diagnoses';
import type { ItemResult } from './grade';

export const COMPETENCIES: Competency[] = ['irama', 'konduksi', 'iskemia', 'elektrolit', 'pengukuran', 'tatalaksana'];

export interface CompetencyScore {
  competency: Competency;
  label: string;
  earned: number;
  possible: number;
  pct: number | null;
}

export interface SessionResult {
  id: string;
  mode: 'sistematis' | 'cepat' | 'klinis' | 'monitor' | 'adaptif';
  level?: Level;
  title: string;
  date: string;
  items: ItemResult[];
  score: number;
  passed: boolean;
  competencies: CompetencyScore[];
  criticalErrors: string[];
  durationS: number;
}

export function competencyScores(items: ItemResult[]): CompetencyScore[] {
  return COMPETENCIES.map((c) => {
    let earned = 0;
    let possible = 0;
    for (const it of items)
      for (const s of it.steps) {
        if (s.ok === null || s.competency !== c) continue;
        possible += s.weight;
        earned += s.weight * s.credit;
      }
    return { competency: c, label: COMPETENCY_LABEL[c], earned, possible, pct: possible ? Math.round((earned / possible) * 100) : null };
  });
}

export function summarize(mode: SessionResult['mode'], title: string, items: ItemResult[], durationS: number, level?: Level): SessionResult {
  const raw = items.length ? Math.round((items.reduce((a, i) => a + i.score, 0) / items.length) * 100) : 0;
  const criticalErrors = Array.from(new Set(items.flatMap((i) => i.criticalErrors)));
  const score = criticalErrors.length ? Math.min(raw, SCORING.CRITICAL_SCORE_CAP) : raw;
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    mode,
    level,
    title,
    date: new Date().toISOString(),
    items,
    score,
    passed: score >= SCORING.PASS_SCORE && criticalErrors.length === 0,
    competencies: competencyScores(items),
    criticalErrors,
    durationS,
  };
}

// ---------------------------------------------------------------- Pengulangan berjarak
export interface SrsCard {
  dx: string;
  ease: number;
  /** Interval dalam hari. */
  interval: number;
  reps: number;
  lapses: number;
  due: string;
  seen: number;
  wrong: number;
  last: string;
}

/** SM-2 (Woźniak) disederhanakan; kualitas q 0–5 dari skor item. */
export function qualityFromScore(score: number): number {
  return score >= 0.9 ? 5 : score >= 0.75 ? 4 : score >= 0.6 ? 3 : score >= 0.4 ? 2 : score >= 0.2 ? 1 : 0;
}

export function updateCard(card: SrsCard | undefined, dx: string, score: number, now = new Date()): SrsCard {
  const c: SrsCard = card ?? { dx, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now.toISOString(), seen: 0, wrong: 0, last: now.toISOString() };
  const q = qualityFromScore(score);
  const next = { ...c, seen: c.seen + 1, last: now.toISOString() };
  if (q < 3) {
    next.reps = 0;
    next.lapses = c.lapses + 1;
    next.wrong = c.wrong + 1;
    next.interval = 0; // ulang di sesi yang sama/berikutnya
  } else {
    next.reps = c.reps + 1;
    next.interval = next.reps === 1 ? 1 : next.reps === 2 ? 3 : Math.round(c.interval * c.ease);
  }
  next.ease = Math.max(1.3, c.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  next.due = new Date(now.getTime() + next.interval * 86400000).toISOString();
  return next;
}

/**
 * Prioritas latihan adaptif: jatuh tempo dulu, lalu yang paling sering salah, lalu yang
 * belum pernah dilihat. Mengembalikan daftar diagnosis berurutan.
 */
export function adaptivePriority(cards: Record<string, SrsCard>, pool: string[], now = new Date()): string[] {
  const t = now.getTime();
  const score = (dx: string) => {
    const c = cards[dx];
    if (!c) return 1.5; // baru
    const overdue = (t - new Date(c.due).getTime()) / 86400000;
    const errRate = c.seen ? c.wrong / c.seen : 0;
    return (overdue >= 0 ? 2 + Math.min(3, overdue / 3) : -1 + overdue / 30) + 3 * errRate + (c.lapses > 0 ? 0.5 : 0);
  };
  return [...pool].sort((a, b) => score(b) - score(a));
}
