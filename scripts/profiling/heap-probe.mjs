// Heap probe: runs a live skirmish in Chromium and samples JS heap over time.
// Usage: node scripts/profiling/heap-probe.mjs [seconds=240] [url=http://127.0.0.1:5178/] [snapshotDir]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const seconds = Number(process.argv[2] ?? 240);
const url = process.argv[3] ?? 'http://127.0.0.1:5178/';
const snapshotDir = process.argv[4];

const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');

async function heapMb() {
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  return usedSize / 1048576;
}

async function snapshot(name) {
  if (!snapshotDir) return;
  fs.mkdirSync(snapshotDir, { recursive: true });
  const chunks = [];
  const onChunk = (e) => chunks.push(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  fs.writeFileSync(path.join(snapshotDir, `${name}.heapsnapshot`), chunks.join(''));
}

await page.goto(url);
await page.waitForSelector('.rts-shell[data-boot-status="ready"]', { timeout: 30000 });
await page.click('#start-button');
await page.waitForFunction(() => window.__wambasaRts?.paused === false, null, { timeout: 10000 });

const t0 = Date.now();
let snappedEarly = false;
while ((Date.now() - t0) / 1000 < seconds) {
  await page.waitForTimeout(15000);
  const elapsed = Math.round((Date.now() - t0) / 1000);
  const mb = await heapMb();
  const info = await page.evaluate(() => {
    const s = window.__wambasaRts;
    return {
      entities: s?.entities?.length,
      render: s?.performance?.renderObjects?.total,
      fps: Math.round(s?.performance?.estimatedFps ?? 0),
      alerts: s?.alerts?.length,
      domNodes: document.getElementsByTagName('*').length,
      matchOver: s?.match?.status ?? s?.matchStatus,
    };
  });
  console.log(JSON.stringify({ t: elapsed, heapMb: Number(mb.toFixed(1)), ...info }));
  if (!snappedEarly && elapsed >= 45) { await snapshot('early'); snappedEarly = true; }
}
await snapshot('late');
if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
