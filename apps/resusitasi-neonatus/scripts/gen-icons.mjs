// Membuat ikon PNG PWA dari public/icon.svg (jalankan: node scripts/gen-icons.mjs)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'public/icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of [['pwa-192.png', 192, 0], ['pwa-512.png', 512, 0], ['pwa-maskable-512.png', 512, 0.12], ['apple-touch-icon.png', 180, 0]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - 2 * pad));
  await page.setContent(`<html><body style="margin:0;background:#1b2a4a;display:grid;place-items:center;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: resolve(root, 'public', name), omitBackground: false });
}
await browser.close();
