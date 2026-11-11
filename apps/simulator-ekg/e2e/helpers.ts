import { expect, type Page } from '@playwright/test';

/** Lewati onboarding & mulai dengan data bersih. */
export async function fresh(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear();
      localStorage.setItem('ekg.prefs.v1', JSON.stringify({ onboarded: true }));
      sessionStorage.setItem('e2e-init', '1');
    }
  });
}

export async function waitCanvas(page: Page) {
  await expect(page.locator('canvas[data-testid$="canvas"]').first()).toBeVisible();
  await page.waitForTimeout(400);
}

/** Selesaikan sesi Interpretasi Sistematis (jawaban seadanya) sampai debriefing. */
export async function runSystematic(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await expect(page.getByTestId('submit')).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId('f-hr').fill('80');
    await page.getByTestId('f-rhythm').selectOption('sinus');
    await page.getByTestId('f-qrs').fill('90');
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('fb-hr')).toBeVisible();
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('debrief')).toBeVisible({ timeout: 20_000 });
}

export async function runQuick(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const quick = page.getByTestId('quick');
    await expect(quick.getByTestId('q-dx').locator('button').first()).toBeEnabled({ timeout: 20_000 });
    await expect(page.getByTestId('timer')).not.toHaveText('—');
    for (const id of ['dx', 'omi', 'reperfusi', 'kritis']) {
      const fs = quick.getByTestId(`q-${id}`);
      if (await fs.count()) await fs.locator('button').first().click();
    }
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('item-score')).toBeVisible();
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('debrief')).toBeVisible({ timeout: 20_000 });
}
