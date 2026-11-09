/** Penilaian & debriefing. */
import { DOMAINS, DOMAIN_LABEL, type Check, type Criterion, type Domain, type Scenario } from './schema';
import type { Judgement, SimState } from './state';
import { ACTION_MAP } from './actions';
import { HEART_RATE, OXYGEN, SIM, TEMPERATURE, spo2TargetAt } from '../clinical/guidelines';

export interface CriterionResult {
  criterion: Criterion;
  passed: boolean;
  detail?: string;
}

export interface DomainScore {
  domain: Domain;
  label: string;
  earned: number;
  possible: number;
  errors: number;
  pct: number | null;
}

export interface TimelineRow {
  action: string;
  label: string;
  idealT: number;
  userT: number | null;
  delta: number | null;
}

export type Outcome = 'stabil' | 'tidak-stabil' | 'dihentikan-tepat' | 'dihentikan-tidak-tepat';

export interface Debrief {
  scenarioId: string;
  score: number;
  passed: boolean;
  outcome: Outcome;
  outcomeLabel: string;
  domains: DomainScore[];
  criteria: CriterionResult[];
  criticalErrors: string[];
  errors: Judgement[];
  doseErrors: Judgement[];
  missedSteps: string[];
  timeToEffectiveVentilation: number | null;
  timeline: TimelineRow[];
  durationS: number;
  finalVitals: { hr: number; spo2: number; temp: number };
  keyLearnings: string[];
}

function firstTime(s: SimState, action: string, match?: { param: string; equals?: unknown; oneOf?: unknown[] }): number | null {
  for (const l of s.log) {
    if (l.action !== action) continue;
    if (match) {
      const v = l.params?.[match.param];
      if (match.equals !== undefined && String(v) !== String(match.equals)) continue;
      if (match.oneOf && !match.oneOf.map(String).includes(String(v))) continue;
    }
    return l.t;
  }
  return null;
}

export function isStabilized(s: SimState): boolean {
  const band = spo2TargetAt(s.t);
  const spo2Ok = band ? s.spo2 >= band.min - OXYGEN.SPO2_TOLERANCE_BELOW : true;
  return s.stabilizedAt !== null && s.hr >= HEART_RATE.PPV_BELOW_BPM && spo2Ok && !s.compressions.active;
}

function evalCheck(s: SimState, sc: Scenario, c: Check): { passed: boolean; detail?: string } {
  switch (c.kind) {
    case 'done': {
      const t = firstTime(s, c.action, c.match);
      if (t === null) return { passed: false, detail: 'Tidak dilakukan' };
      if (c.by !== undefined && t > c.by) return { passed: false, detail: `Dilakukan pada detik ${t} (target ≤${c.by})` };
      return { passed: true, detail: t < 0 ? 'Sebelum lahir' : `Detik ${t}` };
    }
    case 'notDone': {
      const t = firstTime(s, c.action);
      return t === null ? { passed: true } : { passed: false, detail: `Dilakukan pada detik ${t}` };
    }
    case 'before': {
      const a = firstTime(s, c.first);
      const b = firstTime(s, c.second);
      if (a === null) return { passed: false, detail: `${ACTION_MAP[c.first]?.label ?? c.first} tidak dilakukan` };
      if (b === null) return { passed: true };
      return a <= b ? { passed: true } : { passed: false, detail: 'Urutan terbalik' };
    }
    case 'noJudgement': {
      const bad = s.judgements.find((j) => j.code === c.code && !j.ok);
      return bad ? { passed: false, detail: bad.msg } : { passed: true };
    }
    case 'judgementOk': {
      const ok = s.judgements.some((j) => j.code === c.code && j.ok);
      const bad = s.judgements.find((j) => j.code === c.code && !j.ok);
      return { passed: ok && !bad, detail: bad?.msg };
    }
    case 'metric': {
      switch (c.metric) {
        case 'finalTempInRange': {
          const ok = s.temp >= TEMPERATURE.TARGET_C.min && s.temp <= TEMPERATURE.TARGET_C.max;
          return { passed: ok, detail: `Suhu akhir ${s.temp.toFixed(1)} °C` };
        }
        case 'stabilized':
          return { passed: isStabilized(s), detail: s.stabilizedAt !== null ? `Stabil sejak detik ${s.stabilizedAt}` : 'Tidak tercapai' };
        case 'timeToEffectiveVentilationBy': {
          const t = s.flags.firstPpvEffectiveT as number | undefined;
          if (t === undefined) return { passed: false, detail: 'Ventilasi efektif tidak tercapai' };
          return { passed: t <= (c.value ?? Infinity), detail: `Detik ${t}` };
        }
        case 'noHyperoxiaProlonged':
          return { passed: s.hyperoxiaS <= SIM.HYPEROXIA_TOLERANCE_S, detail: `${s.hyperoxiaS} detik SpO₂ >${OXYGEN.SPO2_HYPEROXIA_ABOVE}%` };
      }
    }
  }
  void sc;
  return { passed: false };
}

const DOSE_CODES = ['epi-dose', 'epi-volume', 'epi-flush', 'volume-dose', 'volume-rate', 'd10-dose'];

export function computeDebrief(s: SimState, sc: Scenario): Debrief {
  const criteria = sc.criteria.map((c) => ({ criterion: c, ...evalCheck(s, sc, c.check) }));
  const errors = s.judgements.filter((j) => !j.ok);
  const domains: DomainScore[] = DOMAINS.map((d) => {
    const own = criteria.filter((r) => r.criterion.domain === d);
    const possible = own.reduce((a, r) => a + r.criterion.weight, 0);
    const earnedRaw = own.filter((r) => r.passed).reduce((a, r) => a + r.criterion.weight, 0);
    const errs = errors.filter((e) => e.domain === d).length;
    const earned = Math.max(0, earnedRaw - errs * 0.5);
    return { domain: d, label: DOMAIN_LABEL[d], earned, possible, errors: errs, pct: possible > 0 ? Math.round((earned / possible) * 100) : null };
  });
  const totalPossible = domains.reduce((a, d) => a + d.possible, 0);
  const totalEarned = domains.reduce((a, d) => a + d.earned, 0);
  let score = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  const criticalErrors = [
    ...errors.filter((e) => e.critical).map((e) => e.msg),
    ...criteria.filter((r) => r.criterion.critical && !r.passed).map((r) => r.criterion.text + (r.detail ? ` — ${r.detail}` : '')),
  ];
  const uniqueCritical = Array.from(new Set(criticalErrors));

  let outcome: Outcome;
  if (s.endReason === 'dihentikan') {
    outcome = s.judgements.some((j) => j.code === 'stop-resus' && j.ok) ? 'dihentikan-tepat' : 'dihentikan-tidak-tepat';
  } else outcome = isStabilized(s) ? 'stabil' : 'tidak-stabil';
  const success = outcome === 'stabil' || outcome === 'dihentikan-tepat';
  if (!success) score = Math.min(score, SIM.CRITICAL_SCORE_CAP);
  if (uniqueCritical.length) score = Math.min(score, SIM.CRITICAL_SCORE_CAP);
  const passed = success && uniqueCritical.length === 0 && score >= SIM.PASS_SCORE;

  const seen = new Set<string>();
  const timeline: TimelineRow[] = [];
  for (const step of sc.idealPath) {
    if (seen.has(step.action) || step.action === 'end') continue;
    seen.add(step.action);
    const userT = firstTime(s, step.action);
    timeline.push({
      action: step.action,
      label: ACTION_MAP[step.action]?.label ?? step.action,
      idealT: step.t,
      userT,
      delta: userT === null ? null : userT - step.t,
    });
  }
  const missedSteps = criteria
    .filter((r) => !r.passed && (r.criterion.check.kind === 'done' || r.criterion.check.kind === 'before'))
    .map((r) => r.criterion.text);

  const outcomeLabel: Record<Outcome, string> = {
    stabil: 'Bayi stabil',
    'tidak-stabil': 'Bayi belum stabil',
    'dihentikan-tepat': 'Resusitasi dihentikan sesuai pedoman',
    'dihentikan-tidak-tepat': 'Resusitasi dihentikan tidak sesuai pedoman',
  };

  return {
    scenarioId: sc.id,
    score,
    passed,
    outcome,
    outcomeLabel: outcomeLabel[outcome],
    domains,
    criteria,
    criticalErrors: uniqueCritical,
    errors,
    doseErrors: errors.filter((e) => DOSE_CODES.includes(e.code)),
    missedSteps,
    timeToEffectiveVentilation: (s.flags.firstPpvEffectiveT as number | undefined) ?? null,
    timeline,
    durationS: s.t,
    finalVitals: { hr: Math.round(s.hr), spo2: Math.round(s.spo2), temp: Math.round(s.temp * 10) / 10 },
    keyLearnings: sc.keyLearnings,
  };
}
