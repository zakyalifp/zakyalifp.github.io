import { expect, test } from '@playwright/test';
import { SCENARIOS } from '../src/scenarios';
import { runPathUI, startScenario } from './helpers';

for (const sc of SCENARIOS) {
  test.describe(`#${sc.number} ${sc.title}`, () => {
    const errors: string[] = [];
    test.beforeEach(({ page }) => {
      errors.length = 0;
      page.on('pageerror', (e) => errors.push(e.message));
    });
    test.afterEach(() => {
      expect(errors, 'galat JavaScript di halaman').toEqual([]);
    });
    test('jalur ideal berakhir berhasil (lulus)', async ({ page }) => {
      await startScenario(page, sc, 'belajar');
      await runPathUI(page, sc.idealPath);
      await expect(page.getByTestId('pass-status')).toHaveText('LULUS');
      await expect(page.getByTestId('critical-errors')).toHaveCount(0);
      const score = Number(await page.getByTestId('score').textContent());
      expect(score).toBeGreaterThanOrEqual(90);
    });

    test('jalur salah memicu kegagalan / penurunan skor', async ({ page }) => {
      await startScenario(page, sc, 'belajar');
      await runPathUI(page, sc.wrongPath);
      await expect(page.getByTestId('pass-status')).not.toHaveText('LULUS');
      const score = Number(await page.getByTestId('score').textContent());
      expect(score).toBeLessThan(90);
    });
  });
}
