import { expect, test } from '@playwright/test';
import { fresh, runQuick, runSystematic } from './helpers';

test.beforeEach(async ({ page }) => fresh(page));

test('Interpretasi Sistematis → debriefing', async ({ page }) => {
  await page.goto('#/latihan/sistematis?tingkat=dasar');
  await page.locator('button', { hasText: /^5$/ }).click();
  await page.getByTestId('start-session').click();
  await runSystematic(page, 5);
  await expect(page.getByTestId('score')).toBeVisible();
  await expect(page.getByTestId('competency-bars')).toBeVisible();
  await expect(page.getByTestId('debrief-items').locator(':scope > li')).toHaveCount(5);
});

test('Diagnosis Cepat (berbatas waktu) → debriefing', async ({ page }) => {
  await page.goto('#/latihan/cepat');
  await page.locator('button', { hasText: /^5$/ }).click();
  await page.getByTestId('start-session').click();
  await runQuick(page, 5);
  await expect(page.getByTestId('score')).toBeVisible();
});

test('Latihan Adaptif → debriefing → progres & hapus data', async ({ page }) => {
  await page.goto('#/latihan/adaptif');
  await page.locator('button', { hasText: /^5$/ }).click();
  await page.getByTestId('start-session').click();
  await runQuick(page, 5);
  await page.goto('#/progres');
  await expect(page.getByTestId('competency-total')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByTestId('clear-data').click();
  await page.getByTestId('confirm-clear').click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('Kasus Klinis serial (hiperkalemia sebelum–sesudah) → debriefing', async ({ page }) => {
  await page.goto('#/latihan/klinis');
  await page.getByTestId('clinical-hiperkalemia-ckd').click();
  for (let i = 0; i < 2; i++) {
    await expect(page.getByTestId('copt-0')).toBeEnabled();
    await page.waitForTimeout(300);
    await page.getByTestId('copt-0').click();
    await expect(page.getByTestId('clinical-feedback')).toContainText('✓');
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('debrief')).toBeVisible();
  await expect(page.getByTestId('pass-status')).toHaveText('LULUS');
});

test('Monitor Irama Dinamis → debriefing', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('#/latihan/monitor');
  await page.getByTestId('monitor-palpitasi').click();
  await expect(page.getByTestId('rhythm-monitor')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('monitor-submit')).toBeVisible({ timeout: 20_000 });
    const m = await page.evaluate(() => window.__ekgMonitor!);
    await page.getByTestId(`mr-${m.answer}`).click();
    await page.getByTestId(`ma-${m.action}`).click();
    await page.getByTestId('monitor-submit').click();
    await expect(page.getByTestId('monitor-feedback')).toContainText('✓');
  }
  await expect(page.getByTestId('debrief')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('score')).toHaveText('100');
});

test('Kurikulum menampilkan tiga tingkat', async ({ page }) => {
  await page.goto('#/kurikulum');
  for (const l of ['dasar', 'menengah', 'lanjut']) await expect(page.getByTestId(`level-${l}`)).toBeVisible();
});
