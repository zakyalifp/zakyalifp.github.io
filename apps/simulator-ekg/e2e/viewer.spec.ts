import { expect, test } from '@playwright/test';
import { fresh, waitCanvas } from './helpers';

declare global {
  interface Window {
    __ekgViewers?: Array<{ pxPerMm(): number; toMm(x: number, y: number): { x: number; y: number } }>;
  }
}

test.beforeEach(async ({ page }) => fresh(page));

test('skala fisik: kaliper 25 mm = 1000 ms dan amplitudo 10 mm = 1 mV', async ({ page }) => {
  await page.goto('#/kasus/syn-normal-ref-l');
  await waitCanvas(page);
  const canvas = page.getByTestId('ecg-canvas');
  const box = (await canvas.boundingBox())!;
  const ppm = await page.evaluate(() => window.__ekgViewers![0].pxPerMm());
  expect(ppm).toBeGreaterThan(1);
  await page.getByTestId('tool-caliper').click();
  const x0 = box.x + box.width * 0.3;
  const y0 = box.y + box.height * 0.5;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 25 * ppm, y0, { steps: 8 });
  await page.mouse.up();
  const ms = Number((await page.getByTestId('measure-readout').textContent())!.match(/Interval (\d+) ms/)![1]);
  expect(Math.abs(ms - 1000)).toBeLessThanOrEqual(8);
  await expect(page.getByTestId('measure-readout')).toContainText('/menit');
  await page.getByTestId('tool-amp').click();
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0, y0 - 10 * ppm, { steps: 8 });
  await page.mouse.up();
  const txt = (await page.getByTestId('measure-readout').textContent())!;
  const mm = Number(txt.match(/Amplitudo ([\d.]+) mm/)![1]);
  const mv = Number(txt.match(/\(([\d.]+) mV\)/)![1]);
  expect(Math.abs(mm - 10)).toBeLessThanOrEqual(0.3);
  expect(Math.abs(mv - 1)).toBeLessThanOrEqual(0.03);
});

test('layout 6×2, satu sadapan, 50 mm/s, gain 20, zoom & layar penuh tersedia', async ({ page }) => {
  await page.goto('#/kasus/syn-normal-ref-p');
  await waitCanvas(page);
  await page.getByTestId('layout-6x2').click();
  await page.getByTestId('speed').selectOption('50');
  await page.getByTestId('gain').selectOption('20');
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('layout-single').click();
  await page.getByTestId('lead-next').click();
  await expect(page.getByRole('button', { name: 'III', pressed: true })).toBeVisible();
  await expect(page.getByTestId('fullscreen')).toBeVisible();
  await page.getByTestId('open-axis').click();
  await expect(page.getByTestId('axis-wheel')).toBeVisible();
  await page.getByTestId('open-qtc').click();
  await page.getByTestId('qtc-qt').fill('400');
  await page.getByTestId('qtc-rr').fill('640');
  await expect(page.getByTestId('qtc-bazett')).toHaveText('500 ms');
});

test('kasus nyata: dimuat dari biner, jawaban & anotasi, bandingkan normal', async ({ page }) => {
  await page.goto('#/bank');
  await page.getByTestId('filter-kind').selectOption('nyata');
  await page.getByTestId('filter-cat').selectOption('iskemia');
  const first = page.getByTestId('case-card').first();
  await expect(first.getByTestId('data-badge')).toContainText('nyata');
  await first.click();
  await waitCanvas(page);
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('annotation-list').locator('li').first()).toBeVisible();
  await expect(page.getByTestId('source-line')).toContainText('PTB-XL');
  await page.getByTestId('compare-normal').click();
  await expect(page.getByTestId('compare-panel')).toBeVisible();
  await expect(page.getByTestId('cmp-normal-canvas')).toBeVisible({ timeout: 15_000 });
});
