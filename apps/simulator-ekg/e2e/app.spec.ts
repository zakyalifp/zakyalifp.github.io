import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fresh } from './helpers';

test.beforeEach(async ({ page }) => fresh(page));

test('beranda: ≥150 kasus, onboarding, tema', async ({ page }) => {
  await page.goto('');
  await expect(page.getByTestId('case-count')).not.toHaveText('0');
  const n = Number(await page.getByTestId('case-count').textContent());
  expect(n).toBeGreaterThanOrEqual(150);
  await page.getByTestId('open-onboarding').click();
  await expect(page.getByTestId('onboarding')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-done').click();
  await expect(page.getByTestId('onboarding')).toBeHidden();
  await page.getByTestId('theme-toggle').click();
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('bank kasus: filter jenis data nyata/sintetis', async ({ page }) => {
  await page.goto('#/bank');
  await page.getByTestId('filter-kind').selectOption('sintetis');
  const badges = page.getByTestId('case-card').getByTestId('data-badge');
  await expect(badges.first()).toContainText('Sintetis');
  const texts = await badges.allTextContents();
  expect(texts.every((t) => t.includes('Sintetis'))).toBe(true);
  await page.getByTestId('filter-kind').selectOption('nyata');
  const t2 = await page.getByTestId('case-card').getByTestId('data-badge').allTextContents();
  expect(t2.length).toBeGreaterThan(50);
  expect(t2.every((t) => t.includes('nyata'))).toBe(true);
});

test('tentang: nama pembuat & institusi; ID kasus tampil di pembahasan', async ({ page }) => {
  await page.goto('#/tentang');
  await expect(page.getByTestId('author')).toContainText('dr. Zaky Alif Pradian');
  await expect(page.getByTestId('author')).toContainText('RS Tk. II Moh. Ridwan Meuraksa');
  await page.goto('#/kasus/syn-wellens-b-19');
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('case-id')).toHaveText('syn-wellens-b-19');
});

test('sumber data & lisensi', async ({ page }) => {
  await page.goto('#/sumber');
  for (const d of ['ptbxl', 'ptbxlplus', 'chapman']) await expect(page.getByTestId(`dataset-${d}`)).toContainText('CC BY 4.0');
});

test('Mode Reviewer: sintetis di atas, setuju/catatan, ekspor JSON', async ({ page }) => {
  await page.goto('#/reviewer');
  const first = page.getByTestId('review-card').first();
  await expect(first.getByTestId('data-badge')).toContainText('Sintetis');
  await first.getByTestId('agree').click();
  await first.locator('textarea').fill('Pola sesuai.');
  const second = page.getByTestId('review-card').nth(1);
  await second.getByTestId('disagree').click();
  await page.getByTestId('reviewer-name').fill('dr. Uji');
  const dl = page.waitForEvent('download');
  await page.getByTestId('export-json').click();
  const file = await dl;
  const path = await file.path();
  const json = JSON.parse(readFileSync(path!, 'utf8'));
  expect(json.reviewer).toBe('dr. Uji');
  expect(json.summary.setuju).toBe(1);
  expect(json.summary.tidakSetuju).toBe(1);
  expect(json.reviews.find((r: { verdict: string }) => r.verdict === 'setuju').note).toBe('Pola sesuai.');
});

test('galeri pola sintetis dapat dibuka', async ({ page }) => {
  await page.goto('#/galeri?hal=1');
  await expect(page.getByTestId('gallery-grid')).toHaveAttribute('data-ready', 'ya', { timeout: 20_000 });
});
