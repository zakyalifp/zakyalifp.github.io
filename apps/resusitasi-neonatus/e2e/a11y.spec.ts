import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { getScenario } from '../src/scenarios';
import { doAction, startScenario } from './helpers';

// WCAG 2.x AA: kontras, label, struktur — terang & gelap.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`aksesibilitas (${scheme === 'light' ? 'terang' : 'gelap'})`, () => {
    test.use({ colorScheme: scheme });
    const check = async (page: import('@playwright/test').Page) => {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    };
    test('beranda', async ({ page }) => {
      await page.goto('');
      await check(page);
    });
    test('referensi', async ({ page }) => {
      await page.goto('#/referensi');
      await check(page);
    });
    test('simulasi berjalan', async ({ page }) => {
      await startScenario(page, getScenario('epinefrin')!);
      await doAction(page, 'birth');
      await page.getByTestId('pause').click();
      await page.evaluate(() => window.__nrsim!.advance(30));
      await check(page);
    });
  });
}
