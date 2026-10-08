// Visual polish screenshots: node scripts/profiling/visual-shots.mjs <outDir> [prefix=before] [url]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] ?? '_bmad-output/implementation-artifacts/investigations/visual-polish';
const prefix = process.argv[3] ?? 'before';
const url = process.argv[4] ?? 'http://127.0.0.1:5178/';
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];

async function worldToScreen(page, wx, wy) {
  const cam = await page.evaluate(() => window.__wambasaRts.camera);
  const box = await page.locator('#rts-game').boundingBox();
  return { x: box.x + (wx - cam.x) * cam.zoom, y: box.y + (wy - cam.y) * cam.zoom };
}
async function focus(page, wx, wy) {
  const b = await page.locator('#rts-minimap').boundingBox();
  await page.mouse.click(b.x + b.width * (wx / 7800), b.y + b.height * (wy / 3200));
  await page.waitForTimeout(250);
}

for (const [w, h] of [[1600, 900], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (name) => page.screenshot({ path: path.join(outDir, `${prefix}-${w}-${name}.png`) });
  await page.goto(url);
  await page.waitForSelector('.rts-shell[data-boot-status="ready"]', { timeout: 30000 });
  await page.waitForTimeout(600);
  await shot('01-start-menu');
  await page.click('#start-button');
  await page.waitForFunction(() => window.__wambasaRts?.paused === false, null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot('02-base-overview');
  await page.evaluate(() => window.__wambasaRtsSelectEntities?.(['worker-1', 'worker-2']));
  await page.waitForTimeout(300);
  await shot('03-selected-workers');
  await page.evaluate(() => window.__wambasaRtsSelectEntity?.('player-factory'));
  await page.waitForTimeout(300);
  await shot('04-selected-factory');
  // fishing: find a boat or the shore
  const ents = await page.evaluate(() => window.__wambasaRts.entities.map((e) => ({ id: e.id, kind: e.kind, faction: e.faction, x: e.x, y: e.y })));
  const boat = ents.find((e) => e.faction === 'player' && /boat/i.test(e.kind));
  if (boat) {
    await page.evaluate((id) => window.__wambasaRtsSelectEntity?.(id), boat.id);
    await focus(page, boat.x, boat.y);
  } else {
    await focus(page, 1400, 400);
  }
  await page.waitForTimeout(500);
  await shot('05-fishing');
  // combat: force raid then look at target
  await page.evaluate(() => window.__wambasaRtsForceRaid?.());
  await page.evaluate(() => window.__wambasaRtsDamageEntity?.('worker-1', 30));
  const w1 = await page.evaluate(() => window.__wambasaRts.entities.find((e) => e.id === 'worker-1'));
  const guard = ents.find((e) => e.faction === 'player' && e.kind === 'guard');
  const enemy = ents.find((e) => e.faction !== 'player' && e.faction !== 'neutral' && ['guard', 'worker'].includes(e.kind));
  if (guard && enemy) {
    await page.evaluate(({ g, e, x, y }) => { window.__wambasaRtsMoveEntity?.(e, x + 90, y); window.__wambasaRtsAttackEntity?.(g, e); }, { g: guard.id, e: enemy.id, x: guard.x, y: guard.y });
    await focus(page, guard.x, guard.y);
  } else if (w1) {
    await focus(page, w1.x, w1.y);
  }
  await page.waitForTimeout(900);
  await shot('06-combat');
  await page.waitForTimeout(1200);
  await shot('07-combat-later');
  // Death FX: kill the visible enemy next to the guard and capture mid-animation.
  const raider = await page.evaluate(() => {
    const s = window.__wambasaRts;
    const anchor = s.entities.find((e) => e.id === 'worker-1');
    const enemies = s.entities.filter((e) => e.faction === 'enemy' && (e.health ?? 1) > 0 && e.kind !== 'enemyFactory');
    enemies.sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y));
    return enemies[0]?.id;
  });
  if (raider) {
    await page.evaluate((id) => window.__wambasaRtsDamageEntity?.(id, 9999), raider);
    await page.waitForTimeout(200);
    await shot('08-death-fx');
  }
  // Placement mode highlights build areas.
  await page.evaluate(() => window.__wambasaRtsSelectEntity?.('worker-2'));
  await page.waitForTimeout(200);
  const dockButton = page.locator('#place-dock-button');
  if (await dockButton.isEnabled()) {
    await dockButton.click();
    const center = await worldToScreen(page, 900, 500);
    await page.mouse.move(center.x, center.y);
    await page.waitForTimeout(300);
    await shot('09-placement');
    await page.keyboard.press('Escape');
  }
  // Income feedback: send the truck to harvest, wait for the next resource event, capture the label.
  await page.evaluate(() => window.__wambasaRtsSelectEntity?.('truck-1'));
  await focus(page, 700, 950);
  const field = await worldToScreen(page, 380, 1000);
  await page.mouse.click(field.x, field.y, { button: 'right' });
  const before = await page.evaluate(() => JSON.stringify(window.__wambasaRts.lastResourceEvent ?? null));
  try {
    await page.waitForFunction((prev) => JSON.stringify(window.__wambasaRts.lastResourceEvent ?? null) !== prev, before, { timeout: 40000 });
    const source = await page.evaluate(() => {
      const s = window.__wambasaRts;
      return s.entities.find((e) => e.id === s.lastResourceEvent?.entityId);
    });
    if (source) await focus(page, source.x, source.y);
    await page.waitForTimeout(250);
    await shot('10-income-fx');
  } catch {
    console.log('no resource event within 40s');
  }
  console.log(JSON.stringify({ w, entityKinds: [...new Set(ents.map((e) => `${e.faction}:${e.kind}`))], render: await page.evaluate(() => window.__wambasaRts.performance.renderObjects) }));
  await page.close();
}
if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
