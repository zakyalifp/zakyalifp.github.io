import { parseScenario, type Scenario } from '../engine/schema';
import { CASES_A } from './cases-a';
import { CASES_B } from './cases-b';

/** Semua skenario, divalidasi dengan skema saat dimuat. */
export const SCENARIOS: Scenario[] = [...CASES_A, ...CASES_B].map((raw) => {
  try {
    return parseScenario(raw);
  } catch (e) {
    throw new Error(`Skenario "${(raw as { id?: string }).id}" tidak valid: ${(e as Error).message}`);
  }
});

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
