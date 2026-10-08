// Active-play heap probe: drives a skirmish like a busy player (selection churn, move/attack
// orders, hover, camera pan/zoom, minimap clicks, production, forced raids/damage) and samples
// the JS heap both with and without forced GC, DOM counters and Pixi render-object counts.
//
// Usage: node scripts/profiling/heap-active-play.mjs [seconds=300] [url=http://127.0.0.1:5178/] [outDir]
//   outDir (optional): writes early/late .heapsnapshot files and an allocation sampling profile.
//   Exit code 1 when the post-GC heap grows more than HEAP_GROWTH_LIMIT_MB (env, default 12)
//   between the first sample after warm-up and the last sample, or DOM nodes/listeners climb.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const seconds = Number(process.argv[2] ?? 300);
const url = process.argv[3] ?? 'http://127.0.0.1:5178/';
const outDir = process.argv[4];
const sampleEvery = Number(process.env.SAMPLE_SECONDS ?? 15);
const growthLimitMb = Number(process.env.HEAP_GROWTH_LIMIT_MB ?? 12);
const headed = process.env.HEADED === '1';

const browser = await chromium.launch({
  headless: !headed,
  // Real GPU (D3D11 via ANGLE) gives ~60 fps like a player sees; SwiftShader runs at ~10 fps and
  // under-reports per-frame churn. Set SOFTWARE_GL=1 to fall back to SwiftShader.
  args: [
    '--enable-precise-memory-info', '--js-flags=--expose-gc',
    ...(process.env.SOFTWARE_GL === '1' ? ['--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']),
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await cdp.send('Memory.getDOMCounters').catch(() => undefined);

async function heapNoGc() {
  const { usedSize, totalSize } = await cdp.send('Runtime.getHeapUsage');
  return { used: usedSize / 1048576, total: totalSize / 1048576 };
}
async function heapAfterGc() {
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  return usedSize / 1048576;
}
async function snapshot(name) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const file = fs.createWriteStream(path.join(outDir, `${name}.heapsnapshot`));
  const onChunk = (e) => file.write(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await new Promise((resolve) => file.end(resolve));
}

await page.goto(url);
await page.waitForSelector('.rts-shell[data-boot-status="ready"]', { timeout: 30000 });
await page.click('#start-button');
await page.waitForFunction(() => window.__wambasaRts?.paused === false, null, { timeout: 10000 });
const canvasBox = await page.locator('canvas').first().boundingBox();
const minimapBox = await page.locator('#rts-minimap').boundingBox().catch(() => null);

let rng = 1234567;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (list) => list[Math.floor(rand() * list.length)];
const inCanvas = () => ({
  x: canvasBox.x + 80 + rand() * (canvasBox.width - 160),
  y: canvasBox.y + 80 + rand() * (canvasBox.height - 260),
});

let actions = 0;
async function clickIfVisible(selector) {
  const el = page.locator(selector);
  if (await el.isVisible().catch(() => false) && await el.isEnabled().catch(() => false)) {
    await el.click({ timeout: 500 }).catch(() => undefined);
    return true;
  }
  return false;
}

async function activeStep(step) {
  const ids = await page.evaluate(() => {
    const s = window.__wambasaRts;
    const alive = (s?.entities ?? []).filter((e) => (e.health ?? e.economy?.health ?? 1) > 0);
    return {
      playerUnits: alive.filter((e) => e.faction === 'player' && !e.isBuilding && !['factory', 'barracks', 'dock', 'guardTower', 'depot'].includes(e.kind)).map((e) => e.id),
      playerBuildings: alive.filter((e) => e.faction === 'player' && ['factory', 'barracks', 'dock'].includes(e.kind)).map((e) => e.id),
      enemies: alive.filter((e) => e.faction === 'enemy').map((e) => e.id),
    };
  });
  // Selection churn: single, multi, box-drag.
  if (ids.playerUnits.length) {
    const many = ids.playerUnits.filter(() => rand() < 0.6);
    await page.evaluate((list) => window.__wambasaRtsSelectEntities?.(list), many.length ? many : [ids.playerUnits[0]]);
    actions++;
  }
  // Hover sweep across the canvas.
  for (let i = 0; i < 6; i++) { const p = inCanvas(); await page.mouse.move(p.x, p.y, { steps: 3 }); }
  // Right-click move orders.
  for (let i = 0; i < 3; i++) { const p = inCanvas(); await page.mouse.click(p.x, p.y, { button: 'right' }); actions++; }
  // Box selection drag.
  if (step % 3 === 0) {
    const a = inCanvas(); const b = inCanvas();
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    actions++;
  }
  // Attack orders against enemies.
  if (step % 2 === 0 && ids.playerUnits.length && ids.enemies.length) {
    await page.evaluate(([a, t]) => window.__wambasaRtsAttackEntity?.(a, t), [pick(ids.playerUnits), pick(ids.enemies)]);
    actions++;
  }
  // Production from buildings (whatever button is enabled).
  if (ids.playerBuildings.length) {
    await page.evaluate((id) => window.__wambasaRtsSelectEntity?.(id), pick(ids.playerBuildings));
    for (const sel of ['#produce-worker-button', '#produce-guard-button', '#produce-truck-button', '#produce-boat-button']) {
      if (await clickIfVisible(sel)) { actions++; break; }
    }
  }
  // Camera: keyboard pan, wheel zoom, minimap jump.
  const key = pick(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  await page.keyboard.down(key); await page.waitForTimeout(250); await page.keyboard.up(key);
  const c = inCanvas(); await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, rand() < 0.5 ? -240 : 240);
  if (minimapBox && step % 4 === 0) {
    await page.mouse.click(minimapBox.x + rand() * minimapBox.width, minimapBox.y + rand() * minimapBox.height);
  }
  // Combat pressure: raids, damage pulses (floating text/alerts/effects).
  if (step % 5 === 0) await page.evaluate(() => window.__wambasaRtsForceRaid?.());
  if (step % 2 === 1 && ids.playerUnits.length) {
    await page.evaluate((id) => window.__wambasaRtsDamageEntity?.(id, 3), pick(ids.playerUnits));
  }
  if (ids.enemies.length) await page.evaluate((id) => window.__wambasaRtsDamageEntity?.(id, 2), pick(ids.enemies));
  // Clear selection sometimes (Escape) and hover the HUD.
  if (step % 7 === 0) await page.keyboard.press('Escape').catch(() => undefined);
}

// Include collected objects so the profile shows allocation churn, not only survivors.
if (outDir) {
  await cdp.send('HeapProfiler.startSampling', {
    samplingInterval: 32768,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
}
const t0 = Date.now();
let nextSample = sampleEvery;
let step = 0;
let snappedEarly = false;
const samples = [];
let lastNoGcPeak = 0;
while ((Date.now() - t0) / 1000 < seconds) {
  await activeStep(step++).catch((e) => errors.push(`step: ${e.message}`));
  const noGc = await heapNoGc();
  lastNoGcPeak = Math.max(lastNoGcPeak, noGc.used);
  const elapsed = (Date.now() - t0) / 1000;
  if (elapsed < nextSample) continue;
  nextSample += sampleEvery;
  const gcMb = await heapAfterGc();
  const dom = await cdp.send('Memory.getDOMCounters').catch(() => ({}));
  const info = await page.evaluate(() => {
    const s = window.__wambasaRts;
    return {
      entities: s?.entities?.length,
      render: s?.performance?.renderObjects?.total,
      fps: Math.round(s?.performance?.estimatedFps ?? 0),
      alerts: s?.alerts?.length,
      match: s?.match?.status ?? s?.matchStatus,
    };
  });
  const row = {
    t: Math.round(elapsed), step, actions,
    heapGcMb: Number(gcMb.toFixed(1)), noGcPeakMb: Number(lastNoGcPeak.toFixed(1)), heapTotalMb: Number(noGc.total.toFixed(1)),
    domNodes: dom.nodes, listeners: dom.jsEventListeners, ...info,
  };
  lastNoGcPeak = 0;
  samples.push(row);
  console.log(JSON.stringify(row));
  if (!snappedEarly && elapsed >= 45) { await snapshot('early'); snappedEarly = true; }
}
if (outDir) {
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  fs.writeFileSync(path.join(outDir, 'allocation-sampling.json'), JSON.stringify(profile));
  // Top allocating functions by self size.
  const totals = new Map();
  const walk = (node) => {
    const f = node.callFrame;
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
    totals.set(key, (totals.get(key) ?? 0) + node.selfSize);
    node.children.forEach(walk);
  };
  walk(profile.head);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  const totalKb = [...totals.values()].reduce((a, b) => a + b, 0) / 1024;
  console.log(`TOP_SAMPLED_ALLOCATIONS incl. collected (KB of ${totalKb.toFixed(0)} KB total, ~${(totalKb / 1024 / ((Date.now() - t0) / 1000)).toFixed(2)} MB/s)`);
  for (const [k, v] of top) console.log(`${(v / 1024).toFixed(0).padStart(8)}  ${k}`);
}
await snapshot('late');

const warm = samples.find((s) => s.t >= 60) ?? samples[0];
const last = samples[samples.length - 1];
const growth = last && warm ? last.heapGcMb - warm.heapGcMb : 0;
const domGrowth = last && warm ? (last.domNodes ?? 0) - (warm.domNodes ?? 0) : 0;
const listenerGrowth = last && warm ? (last.listeners ?? 0) - (warm.listeners ?? 0) : 0;
console.log(JSON.stringify({ summary: { warmT: warm?.t, lastT: last?.t, heapGrowthMb: Number(growth.toFixed(1)), domGrowth, listenerGrowth, actions } }));
if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
const failed = growth > growthLimitMb || domGrowth > 400 || listenerGrowth > 200;
process.exit(failed ? 1 : 0);
