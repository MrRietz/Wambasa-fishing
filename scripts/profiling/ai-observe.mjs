// AI observation probe: runs a live skirmish with a passive player and prints rival state every N seconds.
// Usage: node scripts/profiling/ai-observe.mjs [seconds=300] [url=http://127.0.0.1:5178/] [intervalSeconds=15] [difficulty]
// Optional query: append ?aiPersonality=<id> to the url to force a personality (if supported).
import { chromium } from '@playwright/test';

const seconds = Number(process.argv[2] ?? 300);
const url = process.argv[3] ?? 'http://127.0.0.1:5178/';
const intervalSeconds = Number(process.argv[4] ?? 15);
const difficulty = process.argv[5];

// Hardware GL keeps the simulation near real time (software GL in headless runs at ~10 fps = half-speed sim).
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url);
await page.waitForSelector('.rts-shell[data-boot-status="ready"]', { timeout: 30000 });
if (difficulty) {
  await page.selectOption('#difficulty-select', difficulty).catch(() => undefined);
}
await page.click('#start-button');
await page.waitForFunction(() => window.__wambasaRts?.paused === false, null, { timeout: 10000 });

const seenAttackKeys = new Set();
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < seconds) {
  await page.waitForTimeout(intervalSeconds * 1000);
  const elapsed = Math.round((Date.now() - t0) / 1000);
  const info = await page.evaluate(() => {
    const s = window.__wambasaRts;
    const ai = s?.ai ?? {};
    const counts = {};
    const playerCounts = {};
    let enemyAttacking = 0;
    let playerHpLost = 0;
    for (const e of s?.entities ?? []) {
      if (e.damageState === 'destroyed') continue;
      if (e.faction === 'enemy') {
        const key = e.kind === 'boat' && e.combatRole === 'attack' ? 'attackBoat' : e.kind;
        counts[key] = (counts[key] ?? 0) + 1;
        if (e.attack) enemyAttacking += 1;
      } else if (e.faction === 'player') {
        playerCounts[e.kind] = (playerCounts[e.kind] ?? 0) + 1;
      }
    }
    return {
      sim: ai.simSeconds,
      entities: s?.entities?.length,
      fps: Math.round(s?.performance?.estimatedFps ?? 0),
      rival: counts,
      player: playerCounts,
      metal: ai.metal,
      cash: ai.cash,
      personality: ai.personality,
      tactic: ai.tactic,
      reason: ai.tacticReason,
      sightings: ai.knownSightings,
      seen: ai.sightingsByKind,
      scout: ai.scoutStatus,
      army: ai.armyState,
      attacks: ai.attackWaveCount,
      watchdog: ai.watchdogRecoveries,
      enemyAttacking,
      lastAction: ai.lastAction,
      lastRaid: ai.lastRaidEvent ? `${ai.lastRaidEvent.kind}:${ai.lastRaidEvent.targetId}` : undefined,
      match: s?.match?.outcome,
    };
  });
  const attackKey = info.lastRaid;
  if (attackKey && !seenAttackKeys.has(attackKey)) {
    seenAttackKeys.add(attackKey);
    console.log(`ATTACK-EVENT t=${elapsed} ${attackKey}`);
  }
  console.log(JSON.stringify({ t: elapsed, ...info }));
}
if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
