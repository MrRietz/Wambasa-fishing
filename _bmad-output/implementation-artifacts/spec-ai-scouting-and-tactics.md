---
title: 'AI Scouting, Fog-Honest Memory, and Dynamic Tactics'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_commit: '5ba0d07'
context:
  - '_bmad-output/game-architecture.md'
  - '_bmad-output/gdd.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The rival AI stalls: in a 4-minute passive observation the entity count only went 13 -> 18. A baseline probe (2026-10-08, 240 s real time) showed the rival stuck at 0-85 metal with 1 460 unspent cash, one truck, no new workers, one guard trickled at the player, and its opening plan never completing. It is also too easy, has no distinct play styles, and cheats by reading live player positions (`aiPressureSystem`, `aiIntelSystem.chooseScoutTarget`, `createApp.getRaidCandidateTargets`).

**Approach:** Replace the omniscient AI inputs with a fog-honest per-AI memory fed only by the rival's own vision (plus damage reveals), drive all targeting from that memory, and send scouts when it knows nothing. Add four match personalities with different build orders and attack styles, a tactic evaluator that adapts to scouted information, a wave-based army state machine (gather -> attack -> retreat/regroup, defend -> counter-attack), a continuous non-blocking economy planner, and watchdogs for stuck units/sites/economy. Decisions are throttled (difficulty-dependent think interval) and allocation-light.

## Boundaries & Constraints

**Always:** AI uses the same production costs, build times, pathing, and combat rules as the player. Knowledge of player entities comes only from rival vision (`getVisionRadius` per rival unit/building), sightings memory, or being damaged by an attacker. Map geography (start areas, resource fields, fishing zones) counts as public knowledge and may be used for scouting waypoints, never as attack targets. Keep `window.__wambasaRts` debug hooks working and expose AI personality/tactic/sightings/scout/army status. Difficulty constants live in one file (`src/game/ai/aiConfig.ts`).

**Ask First:** Resource income bonuses for the AI, changing unit stats/costs, map changes, or touching rendering/perf-owned files beyond small targeted wiring edits.

**Never:** Read live player entity positions for AI decisions outside current rival vision; per-frame `.filter().sort()` chains over all entities in AI code; committing; rewriting shared files wholesale.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unseen player asset | Player truck outside every rival vision radius | Not in AI memory; never chosen as raid target | AI sends a scout to a public point of interest instead |
| Re-scout empty spot | Remembered truck position comes into rival vision, truck gone | Sighting removed (cleared) | Mobile sightings also decay after TTL |
| Damage reveal | Unseen player guard damages a rival unit/building | Attacker added to memory with source `damage`; defense responds | Unknown attacker id ignored |
| Heavy scouted defense | Memory shows towers/guards near player base exceeding rival army | Tactic switches away from base siege to economy/harbor raids or build-up | Re-evaluated every few seconds |
| Weak scouted defense | Little/no defense remembered, rival army ready | Tactic `allIn`; whole army attacks base targets | Retreats if losses exceed threshold |
| Home attacked | Visible player units near rival base | Tactic `defending`; squad recalled; after clear, `counterAttack` wave | Leash keeps defenders near home |
| Losing fight | Squad strength below retreat ratio or outnumbered by visible hostiles | Squad retreats to rally, regroups, next wave larger | Watchdog regroups stalled squads |
| Stuck unit / site / economy | Unit not moving, site without builder, no spending while rich | Watchdog re-paths/reassigns/unblocks and counts recovery | Recoveries exposed in debug |

</frozen-after-approval>

## Code Map

- `src/game/ai/aiConfig.ts` -- NEW: difficulty profiles, personality profiles, memory/vision tuning (single tuning place).
- `src/game/ai/aiMemory.ts` -- NEW: rival vision, sightings memory (upsert/decay/re-scout clear/damage reveal), summary, target scoring.
- `src/game/ai/aiIntelSystem.ts` -- tactic set + adaptive tactic evaluation from memory summary; scout unit choice; no live player reads.
- `src/game/ai/aiEconomyPlanner.ts` -- NEW: personality build orders turned into a non-blocking prioritized wishlist with metal reservation and skip-on-stall.
- `src/game/ai/aiArmy.ts` -- NEW: army/fleet wave state machine (gather, attack, retreat, defend, counter-attack), engagement from visible targets only.
- `src/game/ai/aiCoordinator.ts` -- personality-aware tick: economy planner, territory defense, wave control; keeps legacy test seams.
- `src/game/ai/aiPressureSystem.ts` -- production choosers use scouted summary; territory threat requires rival vision.
- `src/game/ai/aiDefenseSystem.ts` -- configurable defender count.
- `src/app/runtime/aiRuntime.ts` -- throttled think loop, perception, harvest for every truck, scouting runs, watchdogs, debug snapshot.
- `src/app/runtime/combatRuntime.ts` -- enemy combat no longer gated on raid flag; damage reveal hook; fog-honest tracking.
- `src/game/ai/aiBrain.ts` -- NEW: JSON-safe brain state (memory, army, scout runs, economy watchdog, stats), scouting runs over public points of interest, debug snapshot.
- `src/game/simulation/systems/combatSystem.ts` -- optional `canPursue` so rival attackers drop targets that left their sight instead of re-pathing through fog.
- `src/game/simulation/systems/constructionSystem.ts` -- completed rival buildings stay non-commandable.
- `src/app/createApp.ts` -- personality pick (random, `?aiPersonality=` override), wiring of new runtime options and debug fields.
- `src/game/debug/debugState.ts` -- optional AI debug fields (personality, sightings, scout, army, watchdog).
- `scripts/profiling/ai-observe.mjs` -- NEW: passive-player observation probe printing rival composition, tactic, sightings, waves.
- `tests/commands/command-validation.spec.ts` -- fog-honesty, memory decay/clear, tactic switching, coordinator updates.

## Tasks & Acceptance

**Execution:**
- [x] `aiConfig.ts`, `aiMemory.ts` -- difficulty/personality profiles and fog-honest memory with unit tests.
- [x] `aiIntelSystem.ts`, `aiPressureSystem.ts` -- remove live player reads; tactic evaluation from memory.
- [x] `aiEconomyPlanner.ts`, `aiCoordinator.ts` -- continuous economy, all trucks harvest, factory crew, towers.
- [x] `aiArmy.ts`, `aiRuntime.ts`, `combatRuntime.ts` -- waves, retreat/regroup, defend/counter, scouting, watchdogs, throttling.
- [x] `createApp.ts`, `debugState.ts`, probe script -- personality pick, debug exposure, observation tooling.

**Acceptance Criteria:**
- Given a player entity outside rival vision, when the AI picks raid/siege/harbor targets, then that entity is never targeted unless it is in memory from an earlier sighting or damage reveal.
- Given a remembered sighting, when rival vision covers its last position and it is absent, then the sighting is cleared; mobile sightings expire after their TTL.
- Given scouted heavy defenses vs. weak defenses, when tactics are re-evaluated, then the AI picks different tactics (avoid base vs. all-in).
- Given a passive player for ~5 minutes of simulation, when observed, then the rival grows workers, trucks, boats and guards and launches at least one multi-unit attack.
- Given existing command and AI e2e tests, when run, then they pass (with legitimately updated expectations only).

## Design Notes

Personalities: `harborRaider` (early dock + attack boats, hit-and-run on boats/docks), `turtleSiege` (towers + large guard/saboteur army, late siege on production), `boomer` (more workers/trucks/boats, big late push), `harasser` (forward rally, small fast squads hitting workers/trucks/boats). Tactic set: `scouting`, `probeEconomy`, `harborControl`, `baseSiege`, `counterMilitary`, `allIn`, `defending`, `counterAttack`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: passes.
- `npm run test:commands` -- expected: passes including new AI tests.
- `npm run build` -- expected: passes.
- `node scripts/profiling/ai-observe.mjs 300` -- expected: rival grows and launches >= 1 wave.
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --project=chromium --grep "AI|rival|raid|enemy"` -- expected: passes.

## Root causes of the stall (baseline probe 2026-10-08)

1. Metal starvation: one hauler (55 metal/trip); the opening spent metal on dock + barracks first and never queued more haulers.
2. Only one truck could ever harvest: `harvestIssued` stayed true while any truck harvested, so new trucks idled forever.
3. Strictly sequential, blocking opening plan: an unaffordable step blocked everything else (1 460 cash unspent at 0-85 metal).
4. Rival attack orders were only simulated while a raid flag was set, so defenders froze with `attack` set and could never be picked for raids (deadlock).
5. Raids trickled single guards; scouting needed 3 guards and effectively never ran.
6. Friendly-fire truck crush killed rival workers/guards idling in hauler lanes; the AI parked units there.
7. Measurement: headless software GL runs at ~10 fps, so the simulation advances at ~0.5x real time (delta capped at 0.05 s).

**Observed verification:**
- `npm run typecheck` -- passed.
- `npm run test:commands` -- passed (85 tests, incl. 9 new/updated AI tests: fog-only memory, no targeting of unseen assets, remembered-position marches, TTL decay + re-scout clear, damage reveal, tactic adaptation, vision-gated territory threat, outmatched retreat, economy planner priorities).
- `npm run build` -- passed.
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --project=chromium --grep "AI|rival|raid|enemy"` (run against a stable snapshot build with hardware GL, since parallel agents' HMR reloads broke runs on :5178) -- 32 passed, 2 failed. All AI/rival/raid tests pass. The two failures (`opening objectives ... dock progression`, `workers can repair damaged friendly targets`) are player right-click harvest/repair commands that pass on a HEAD build but fail on the current shared working tree; they do not touch AI code paths (player right-click on the metal field issues no command at all) and are left for the owners of the concurrent input/render changes.
- Updated e2e expectations: tactic regex includes new tactics; live opening raid forces `?aiPersonality=harasser` and allows longer time (AI must scout first) and worker targets; dock/fishing tests force `?aiPersonality=boomer` and wait for a boat (not reel) sale; tower test waits up to 50 s (rival saves up after being raided).
- `node scripts/profiling/heap-probe.mjs 300` (software GL, 10 fps = ~150 s sim) -- entities 13 -> 23 (baseline 13 -> 18), heap stable 11.6-13.8 MB.
- `node scripts/profiling/ai-observe.mjs 300` (hardware GL, 60 fps, passive player):
  - random pick = harborRaider: sim 51 s 5 workers/2 trucks/2 attack boats/barracks; sim 141 s 5 guards + 3 attack boats, tactic `allIn` (scouted weak defenses), wave 1 (5 guards) on player-factory; player base destroyed by sim ~171 s; army grows to 14 guards + 5 attack boats by 291 s; 0 watchdog recoveries needed.
  - turtleSiege: towers at ~80 s and ~140 s, `counterMilitary` (turtling) until scouted weak defense -> wave of 5 at sim 141 s, base destroyed ~172 s.
  - harasser (earlier run): first raid on truck-1 at sim ~78 s, retreat "outmatched by visible defenders", regroup, all-in at ~136 s.
  - boomer (earlier run): 7 workers, 4 trucks, 3 fishing boats by sim 111 s before its push.
