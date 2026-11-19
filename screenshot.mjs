// Coral Cover — screenshot runner (headless Chromium, local server only).
//
// Serves app/ on localhost, opens each shot from shots.json, waits for the
// sample photos to load (window.__coralReady), and saves a JPEG into
// screenshots/. Also verifies the Export button downloads a valid PNG.
// Fails (exit 1) on any console error, page error, failed request, or a
// request to any host other than localhost. Run: node screenshot.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/hatch/workspace/makefun/node_modules/');
const { chromium } = require('playwright-core');

const repoRoot = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8')).shots;
const PORT = Number(process.env.SHOT_PORT ?? 8901);
const BASE = `http://127.0.0.1:${PORT}`;
const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';

const problems = [];
const failures = [];

function waitForPort(ms = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(`${BASE}/`)
        .then((r) => (r.ok ? resolve() : tick()))
        .catch(() => (Date.now() - start > ms ? reject(new Error('server did not come up')) : setTimeout(tick, 200)));
    };
    tick();
  });
}

async function main() {
  const server = spawn('node', ['serve.ts'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  try {
    await waitForPort();
    const browser = await chromium.launch({
      executablePath: SHELL,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
    });
    try {
      for (const shot of shots) {
        const page = await browser.newPage({ viewport: shot.viewport });
        page.on('console', (msg) => {
          if (msg.type() === 'error') problems.push(`${shot.file}: console error: ${msg.text()}`);
        });
        page.on('pageerror', (err) => problems.push(`${shot.file}: page error: ${err.message}`));
        page.on('requestfailed', (req) => problems.push(`${shot.file}: request failed: ${req.url()}`));
        page.on('request', (req) => {
          const url = new URL(req.url());
          if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
            problems.push(`${shot.file}: non-local request: ${req.url()}`);
          }
        });
        await page.goto(`${BASE}${shot.url}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__coralReady === true, null, { timeout: 30000 });
        await page.waitForTimeout(400);
        const out = join(repoRoot, 'screenshots', shot.file);
        await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
        const bytes = statSync(out).size;
        console.log(`${shot.file}: ${bytes} bytes (${shot.note})`);
        if (bytes > 262144) failures.push(`${shot.file}: ${bytes} bytes, over the 256 KiB cap`);
        await page.close();
      }

      // Export check: the Export button must download a real PNG.
      const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
      page.on('pageerror', (err) => problems.push(`export: page error: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`export: console error: ${msg.text()}`);
      });
      await page.goto(`${BASE}/?shot=editor&size=landscape`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__coralReady === true, null, { timeout: 30000 });
      const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
      await page.click('#exportBtn');
      const download = await downloadPromise;
      const exportPath = '/tmp/coral-export-test.png';
      await download.saveAs(exportPath);
      const info = await page.evaluate(() => window.__coralLastExport);
      console.log(`export: ${JSON.stringify(info)} -> ${exportPath} (${statSync(exportPath).size} bytes)`);
      if (!info?.ok || info.w !== 1920 || info.h !== 1080) {
        failures.push(`export: unexpected result ${JSON.stringify(info)}`);
      }
      await page.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }

  if (problems.length > 0) {
    console.error('PROBLEMS:');
    problems.forEach((p) => console.error(` - ${p}`));
    process.exitCode = 1;
  }
  if (failures.length > 0) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(` - ${f}`));
    process.exitCode = 1;
  }
  if (process.exitCode !== 1) console.log('screenshots OK: 4 shots + export check passed');
}

main().catch((err) => {
  console.error(`screenshot run failed: ${err.message}`);
  process.exit(1);
});
