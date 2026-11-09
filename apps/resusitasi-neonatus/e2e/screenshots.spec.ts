import { test } from '@playwright/test';
import { getScenario } from '../src/scenarios';
import { advanceTo, doAction, runPathUI, startScenario } from './helpers';

// Screenshot otomatis untuk deskripsi Pull Request (folder screenshots/).
test.use({ deviceScaleFactor: 2 });

test('screenshot: beranda, monitor saat skenario, debriefing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto('');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/01-beranda.png' });

  const sc = getScenario('epinefrin')!;
  await startScenario(page, sc);
  const until = sc.idealPath.filter((s) => s.t <= 150);
  for (const st of until) {
    if (st.t > 0) {
      if (await page.getByTestId('pause').count()) {
        const label = await page.getByTestId('pause').textContent();
        if (label?.includes('Jeda')) await page.getByTestId('pause').click();
      }
      await advanceTo(page, st.t);
    }
    await doAction(page, st.action, st.params ?? {});
  }
  await advanceTo(page, 150);
  await page.getByTestId('pause').click(); // lanjutkan agar monitor bergerak
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/02-monitor-kompresi.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/03-monitor-hp.png' });
  await page.setViewportSize({ width: 1280, height: 860 });

  const sc2 = getScenario('mr-sopa')!;
  await startScenario(page, sc2);
  await runPathUI(page, sc2.idealPath);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/04-debriefing.png', fullPage: true });

  await page.goto('#/referensi');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/05-referensi.png' });
});
