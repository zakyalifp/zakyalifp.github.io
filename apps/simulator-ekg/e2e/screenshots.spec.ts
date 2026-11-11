import { expect, test } from '@playwright/test';
import { fresh, runQuick, waitCanvas } from './helpers';

// Screenshot otomatis untuk deskripsi Pull Request (folder screenshots/).
test.describe.configure({ mode: 'serial' });
test.use({ deviceScaleFactor: 2, viewport: { width: 1280, height: 820 } });
test.beforeEach(async ({ page }) => fresh(page));

test('screenshot utama', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('');
  await expect(page.getByTestId('case-count')).not.toHaveText('0');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/01-beranda.png' });

  // EKG nyata STEMI dengan anotasi
  await page.goto('#/bank');
  await page.getByTestId('filter-kind').selectOption('nyata');
  await page.getByTestId('filter-cat').selectOption('iskemia');
  await page.getByTestId('case-card').filter({ hasText: 'STEMI anterior' }).first().click();
  await waitCanvas(page);
  await page.getByTestId('reveal').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/02-ekg-nyata-stemi-anotasi.png' });
  await page.getByTestId('answer-reveal').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'screenshots/03-pembahasan-sumber.png' });

  // Sintetis: de Winter + kaliper
  await page.goto('#/kasus/syn-de-winter-14');
  await waitCanvas(page);
  await page.getByTestId('reveal').click();
  await page.getByTestId('tool-caliper').click();
  const box = (await page.getByTestId('ecg-canvas').boundingBox())!;
  const ppm = await page.evaluate(() => (window as unknown as { __ekgViewers: Array<{ pxPerMm(): number }> }).__ekgViewers[0].pxPerMm());
  await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.82);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.18 + 16.7 * ppm, box.y + box.height * 0.82, { steps: 6 });
  await page.mouse.up();
  await page.getByTestId('march').check();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/04-sintetis-de-winter-kaliper.png' });

  // Perbandingan normal
  await page.getByTestId('compare-normal').click();
  await expect(page.getByTestId('cmp-normal-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.getByTestId('compare-panel').screenshot({ path: 'screenshots/05-banding-normal.png' });

  // Interpretasi sistematis dengan umpan balik
  await page.goto('#/latihan/sistematis?tingkat=menengah');
  await page.getByTestId('start-session').click();
  await expect(page.getByTestId('submit')).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId('f-hr').fill('80');
  await page.getByTestId('f-rhythm').selectOption('sinus');
  await page.getByTestId('f-qrs').fill('100');
  await page.getByTestId('open-axis').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/06-sistematis-roda-aksis.png' });
  await page.getByTestId('submit').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/07-sistematis-umpan-balik.png' });

  // Diagnosis cepat → debriefing
  await page.goto('#/latihan/cepat?tingkat=lanjut');
  await page.locator('button', { hasText: /^5$/ }).click();
  await page.getByTestId('start-session').click();
  await expect(page.getByTestId('timer')).not.toHaveText('—', { timeout: 20_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/08-diagnosis-cepat.png' });
  await runQuick(page, 5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/09-debriefing.png', fullPage: true });

  // Kasus klinis serial
  await page.goto('#/latihan/klinis?id=nyeri-dada-evolusi');
  await expect(page.getByTestId('copt-0')).toBeEnabled();
  await page.waitForTimeout(500);
  await page.getByTestId('copt-0').click();
  await page.screenshot({ path: 'screenshots/10-kasus-klinis.png' });

  // Monitor irama
  await page.goto('#/latihan/monitor');
  await page.getByTestId('monitor-igd-nyeri-dada').click();
  await expect(page.getByTestId('monitor-submit')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/11-monitor-irama.png' });

  await page.goto('#/progres');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/12-progres.png' });

  await page.goto('#/reviewer');
  await page.getByTestId('review-card').first().getByTestId('expand').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/13-mode-reviewer.png' });

  await page.goto('#/sumber');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/14-sumber-data.png' });
});

test('screenshot HP & mode gelap', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await fresh(page);
  await page.goto('#/kasus/syn-stemi-posterior-8');
  await waitCanvas(page);
  await page.screenshot({ path: 'screenshots/15-hp-3x4.png' });
  await page.getByTestId('layout-single').click();
  await page.getByRole('button', { name: 'V2', exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/16-hp-satu-sadapan.png' });
  await ctx.close();
  const land = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const lp = await land.newPage();
  await fresh(lp);
  await lp.goto('#/kasus/syn-brugada-34');
  await waitCanvas(lp);
  await lp.getByTestId('ecg-canvas').scrollIntoViewIfNeeded();
  await lp.screenshot({ path: 'screenshots/17-hp-landscape.png' });
  await land.close();
  const dark = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const dp = await dark.newPage();
  await fresh(dp);
  await dp.goto('#/kasus/syn-sgarbossa-lbbb-25');
  await waitCanvas(dp);
  await dp.getByTestId('reveal').click();
  await dp.waitForTimeout(400);
  await dp.screenshot({ path: 'screenshots/18-mode-gelap.png' });
  await dark.close();
});

test('galeri semua pola sintetis (satu contoh per diagnosis)', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await fresh(page);
  await page.goto('#/galeri?hal=1&unik=1&per=12');
  const title = await page.locator('h1').textContent();
  const pages = Number(title!.match(/\/(\d+)/)![1]);
  for (let i = 1; i <= pages; i++) {
    await page.goto(`#/galeri?hal=${i}&unik=1&per=12`);
    await expect(page.getByTestId('gallery-grid')).toHaveAttribute('data-ready', 'ya', { timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.getByTestId('gallery').screenshot({ path: `screenshots/galeri-sintetis-${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 82 });
  }
  await ctx.close();
});
