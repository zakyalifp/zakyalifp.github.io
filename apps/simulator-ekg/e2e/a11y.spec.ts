import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fresh, waitCanvas } from './helpers';

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`aksesibilitas WCAG AA (${scheme === 'light' ? 'terang' : 'gelap'})`, () => {
    test.use({ colorScheme: scheme });
    test.beforeEach(async ({ page }) => fresh(page));
    const check = async (page: import('@playwright/test').Page) => {
      const r = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    };
    for (const [name, url] of [
      ['beranda', ''],
      ['bank', '#/bank'],
      ['sumber', '#/sumber'],
      ['kurikulum', '#/kurikulum'],
      ['progres', '#/progres'],
    ] as const)
      test(name, async ({ page }) => {
        await page.goto(url);
        await page.waitForTimeout(500);
        await check(page);
      });
    test('kasus + jawaban', async ({ page }) => {
      await page.goto('#/kasus/syn-normal-ref-l');
      await waitCanvas(page);
      await page.getByTestId('reveal').click();
      await check(page);
    });
    test('interpretasi sistematis', async ({ page }) => {
      await page.goto('#/latihan/sistematis');
      await page.getByTestId('start-session').click();
      await waitCanvas(page);
      await check(page);
    });
  });
}
