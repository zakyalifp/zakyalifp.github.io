import { expect, test } from '@playwright/test';
import { getScenario } from '../src/scenarios';
import { doAction, runPathUI, startScenario } from './helpers';

test('memuat ulang halaman di rute dalam tidak 404 (hash routing)', async ({ page }) => {
  await page.goto('#/referensi');
  await expect(page.getByTestId('calculator')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('calculator')).toBeVisible();
  const res = await page.goto('#/tentang');
  expect(res?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByTestId('author')).toContainText('[Nama pembuat, gelar]');
});

test('katalog bisa difilter menurut kesulitan dan topik', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('[data-testid^=scenario-]')).toHaveCount(16);
  await page.getByTestId('filter-diff-3').click();
  const n3 = await page.locator('[data-testid^=scenario-]').count();
  expect(n3).toBeGreaterThan(0);
  expect(n3).toBeLessThan(16);
  await page.getByTestId('filter-diff-0').click();
  await page.getByTestId('filter-topic').selectOption('prematur');
  await expect(page.getByTestId('scenario-prematur-ekstrem')).toBeVisible();
  await expect(page.getByTestId('scenario-aterm-bugar')).toHaveCount(0);
});

test('Mode Ujian: tanpa jeda/percepat/petunjuk dan referensi dikunci', async ({ page }) => {
  const sc = getScenario('apnea-vtp')!;
  await startScenario(page, sc, 'ujian');
  await doAction(page, 'birth');
  await expect(page.getByTestId('pause')).toHaveCount(0);
  await expect(page.getByTestId('speed-2')).toHaveCount(0);
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await page.evaluate(() => (location.hash = '#/referensi'));
  await expect(page.getByTestId('reference-locked')).toBeVisible();
});

test('kalkulator dosis menghitung dari berat badan', async ({ page }) => {
  await page.goto('#/referensi');
  await page.getByTestId('calc-weight').fill('3');
  await page.getByTestId('calc-ga').fill('39');
  const r = page.getByTestId('calc-results');
  await expect(r).toContainText('0,06 mg = 0,6 mL');
  await expect(r).toContainText('0,3 mg = 3 mL');
  await expect(r).toContainText('30 mL');
});

test('riwayat tersimpan dan bisa dihapus', async ({ page }) => {
  const sc = getScenario('aterm-bugar')!;
  await startScenario(page, sc);
  await runPathUI(page, sc.idealPath);
  await page.goto('#/riwayat');
  await expect(page.getByTestId('history-table').locator('tbody tr')).toHaveCount(1);
  await page.getByTestId('clear-history').click();
  await page.getByTestId('confirm-clear').click();
  await expect(page.getByTestId('history-table')).toHaveCount(0);
});

test('ekspor PDF debriefing menghasilkan unduhan', async ({ page }) => {
  const sc = getScenario('aterm-bugar')!;
  await startScenario(page, sc);
  await runPathUI(page, sc.idealPath);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-pdf').click()]);
  expect(dl.suggestedFilename()).toMatch(/^debriefing-aterm-bugar-.*\.pdf$/);
  const [cert] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-cert').click()]);
  expect(cert.suggestedFilename()).toMatch(/^sertifikat-/);
});

test('mode gelap dapat diaktifkan', async ({ page }) => {
  await page.goto('');
  await page.getByTestId('theme-toggle').click(); // sistem → terang
  await page.getByTestId('theme-toggle').click(); // terang → gelap
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('stetoskop: hitung ketukan selama 6 detik', async ({ page }) => {
  const sc = getScenario('apnea-vtp')!;
  await startScenario(page, sc);
  await doAction(page, 'birth');
  await page.getByTestId('tab-penilaian').click();
  await page.getByTestId('action-auscultate').click();
  await page.getByTestId('steth-start').click();
  for (let i = 0; i < 7; i++) await page.getByTestId('steth-tap').click();
  await expect(page.getByTestId('param-userHr')).toHaveValue('70', { timeout: 10_000 });
  await page.getByTestId('param-submit').click();
  await expect(page.getByTestId('stethoscope')).toBeHidden();
});

test('PWA: berjalan offline setelah kunjungan pertama', async ({ page, context }) => {
  await page.goto('');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-testid^=scenario-]').first()).toBeVisible();
  await context.setOffline(false);
});

test('kompresi berjalan real-time dengan metronom tanpa galat (regresi)', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const sc = getScenario('epinefrin')!;
  await startScenario(page, sc);
  const { advanceTo } = await import('./helpers');
  for (const st of sc.idealPath.filter((s) => s.t <= 150)) {
    if (st.t > 0) {
      const label = await page.getByTestId('pause').textContent().catch(() => '');
      if (label?.includes('Jeda')) await page.getByTestId('pause').click();
      await advanceTo(page, st.t);
    }
    await doAction(page, st.action, st.params ?? {});
  }
  await page.getByTestId('pause').click(); // lanjutkan waktu nyata selama kompresi
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('metronome')).toBeVisible();
  await expect(page.getByTestId('monitor')).toBeVisible();
  expect(errs).toEqual([]);
});
