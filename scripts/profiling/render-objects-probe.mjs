// Render-object probe: runs a live skirmish and samples window.__wambasaRts.performance.renderObjects.
// Usage: node scripts/profiling/render-objects-probe.mjs [seconds=120] [url=http://127.0.0.1:5178/]
import { chromium } from '@playwright/test';

const seconds = Number(process.argv[2] ?? 120);
const url = process.argv[3] ?? 'http://127.0.0.1:5178/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForSelector('.rts-shell[data-boot-status="ready"]', { timeout: 30000 });
await page.click('#start-button');
await page.waitForFunction(() => window.__wambasaRts?.paused === false, null, { timeout: 10000 });

// Keep the player economy busy and provoke combat so FX (labels, sparks, ghosts) are exercised.
await page.evaluate(() => {
  window.__wambasaRtsSelectEntities?.(['worker-1', 'worker-2']);
  window.__wambasaRtsForceRaid?.();
});

const samples = [];
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < seconds) {
  await page.waitForTimeout(10000);
  const sample = await page.evaluate(() => {
    const s = window.__wambasaRts;
    return { entities: s?.entities?.length, fps: s?.performance?.estimatedFps, ...s?.performance?.renderObjects };
  });
  // Re-provoke a raid every sample so damage/death FX keep firing.
  await page.evaluate(() => window.__wambasaRtsForceRaid?.());
  samples.push({ t: Math.round((Date.now() - t0) / 1000), ...sample });
  console.log(JSON.stringify(samples[samples.length - 1]));
}
const totals = samples.map((sample) => sample.total ?? 0);
console.log(JSON.stringify({ minTotal: Math.min(...totals), maxTotal: Math.max(...totals), first: totals[0], last: totals[totals.length - 1] }));
if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
