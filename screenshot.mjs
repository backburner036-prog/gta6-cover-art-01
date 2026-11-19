// Take the four screenshots the bounty requires with Playwright's headless shell
// (chromium_headless_shell-1187). Serves app/ on localhost first, then stages
// each ?shot= scene and waits for window.__shotReady before capturing.
// Usage: node screenshot.mjs [port]   (screenshots land in <repo>/screenshots)
import { chromium } from 'playwright-core';
import { statSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const port = Number(process.argv[2] || 8901);
const outDir = join(repo, 'screenshots');
mkdirSync(outDir, { recursive: true });

const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: repo, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));

const exe = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell`;
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

try {
  for (const s of shots) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(`http://localhost:${port}/index.html${s.query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    const path = join(outDir, s.name);
    await page.screenshot({ path, type: 'jpeg', quality: s.quality ?? 82 });
    const size = statSync(path).size;
    console.log(`${s.name}: ${size} bytes (${(size / 1024).toFixed(0)} KiB)${size > 262144 ? '  OVER 256 KiB!' : ''}`);
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) {
  console.log('CONSOLE ERRORS:');
  for (const e of errors) console.log(' -', e);
  process.exitCode = 1;
} else {
  console.log('no console errors');
}
console.log('done');
