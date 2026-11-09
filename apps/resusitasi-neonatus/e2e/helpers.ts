import { expect, type Page } from '@playwright/test';
import { ACTION_MAP } from '../src/engine/actions';
import type { IdealStep, Scenario } from '../src/engine/schema';

declare global {
  interface Window {
    __nrsim?: { advance: (n: number) => void; t: () => number | null };
  }
}

export async function startScenario(page: Page, sc: Scenario, mode: 'belajar' | 'ujian' = 'belajar') {
  await page.goto(`#/skenario/${sc.id}`);
  await page.getByTestId(`start-${mode}`).click();
  await expect(page.getByTestId('mode-badge')).toBeVisible();
}

/** Lakukan satu tindakan lewat antarmuka (klik tab, tombol, isi dialog). */
export async function doAction(page: Page, id: string, params: Record<string, string | number | boolean> = {}) {
  const def = ACTION_MAP[id];
  const tab = page.getByTestId(`tab-${def.group}`);
  if (await tab.count()) await tab.dispatchEvent('click');
  const btn = page.getByTestId(`action-${id}`);
  await expect(btn).toBeVisible();
  await btn.dispatchEvent('click');
  if (id === 'auscultate') {
    await expect(page.getByTestId('stethoscope')).toBeVisible();
    if (params.userHr !== undefined) await page.getByTestId('param-userHr').fill(String(params.userHr));
    await page.getByTestId('param-submit').click();
    return;
  }
  const dialog = page.getByTestId('param-dialog');
  if (await dialog.isVisible().catch(() => false)) {
    for (const [k, v] of Object.entries(params)) {
      const el = dialog.getByTestId(`param-${k}`);
      if (!(await el.count())) continue;
      const tag = await el.evaluate((n) => `${n.tagName}:${(n as HTMLInputElement).type}`);
      if (tag.startsWith('SELECT')) await el.selectOption(String(v));
      else if (tag.endsWith('checkbox')) await el.setChecked(v === true);
      else await el.fill(String(v));
    }
    await dialog.getByTestId('param-submit').click();
    await expect(dialog).toBeHidden();
  }
}

export async function simTime(page: Page): Promise<number> {
  return (await page.evaluate(() => window.__nrsim?.t() ?? 0)) ?? 0;
}

export async function advanceTo(page: Page, t: number) {
  const now = await simTime(page);
  if (t > now) await page.evaluate((n) => window.__nrsim!.advance(n), t - now);
}

/** Jalankan satu jalur (ideal/salah) lewat UI. Waktu digerakkan oleh hook uji, simulasi dijeda. */
export async function runPathUI(page: Page, path: IdealStep[]) {
  let paused = false;
  for (const step of path) {
    if (await page.getByTestId('debrief').isVisible().catch(() => false)) break;
    if (step.t > 0) {
      if (!paused && (await page.getByTestId('pause').count())) {
        await page.getByTestId('pause').click();
        paused = true;
      }
      await advanceTo(page, step.t);
    }
    if (await page.getByTestId('debrief').isVisible().catch(() => false)) break;
    await doAction(page, step.action, step.params ?? {});
    if (step.action === 'birth' && !paused) {
      await page.getByTestId('pause').click();
      paused = true;
    }
  }
  await expect(page.getByTestId('debrief')).toBeVisible({ timeout: 15_000 });
}
