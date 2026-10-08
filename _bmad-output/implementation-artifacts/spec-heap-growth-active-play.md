---
title: 'Heap Growth During Active Play'
type: 'bugfix'
created: '2026-10-08'
status: 'done'
baseline_commit: 'working tree (uncommitted combat/HUD, AI and visual-polish work in progress)'
context:
  - '_bmad-output/implementation-artifacts/spec-serious-optimization.md'
  - '_bmad-output/game-architecture.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The player reports that the heap "keeps growing all the time" while playing. The previous pass (`spec-serious-optimization.md`) fixed render-object churn, and a passive 4-minute probe (nobody plays) shows a flat post-GC heap (~14-19 MB), ~118 Pixi render objects and ~225 DOM nodes. The growth therefore comes from active play or from allocation churn that a forced-GC measurement hides.

**Approach:** Reproduce active play in a scripted, repeatable probe (selection churn, right-click move orders, box drags, hover, attack orders, production, camera pan/zoom, minimap clicks, raids/damage) on a real GPU at ~60 fps. Measure the post-GC heap, the un-collected heap peaks, DOM counters, and the allocation sampling profile including collected objects; diff early/late heap snapshots by constructor. Fix the confirmed sources without changing gameplay rules, and add regression checks.

## Boundaries & Constraints

**Always:** Keep gameplay rules, pathing results, debug hooks and test-visible debug state unchanged. Keep edits in shared files (`createApp.ts`, render files) small and targeted; other agents are editing AI and visual-polish code concurrently.

**Ask First:** Changing path search semantics (different routes), dropping debug fields, or touching AI/visual-polish owned code.

**Never:** Raise heap limits, disable features, or "fix" type errors in files owned by other agents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Busy player, 5 min | Scripted active play on GPU (~60 fps) | Post-GC heap flat; allocation rate low enough that the un-collected heap does not climb in a steep sawtooth | Probe exits 1 if post-GC heap grows > 12 MB or DOM/listeners accumulate |
| Unreachable move order | Right-click a walkable but enclosed spot with several units selected | Same (empty) result as before, without exploring the grid with O(n^2) open-set copies | Formation planner still retries spacings and reports `unreachable` as before |
| Hover across the map | Pointer moves with/without combat units selected | Combat preview cursor/overlay behave as before; debug snapshot is not rebuilt for no-op hovers | Hover over a new enemy target still publishes immediately |
| Camera edge/key scroll | Camera moves every frame | `window.__wambasaRts.camera` stays current synchronously | Full snapshot still published by the simulation tick (5 Hz) |

</frozen-after-approval>

## Code Map

- `scripts/profiling/heap-active-play.mjs` -- new active-play probe: GPU Chromium, scripted busy player, post-GC heap, no-GC peaks, DOM counters, allocation sampling incl. collected objects, early/late snapshots, exit code as regression gate.
- `scripts/profiling/heap-snapshot-diff.mjs` -- new: diff two `.heapsnapshot` files by constructor count/self size.
- `src/game/map/pathfinding.ts` -- A* used by every move/attack/build/AI order; root cause of the churn.
- `src/app/createApp.ts` -- walkability predicates (`isBlockedByStaticEntity`), hover combat preview (`clearCombatPreview`, `updateCombatPreviewAtPoint`), camera debug publishing.
- `src/game/audio/audioManager.ts` -- one-shot oscillator/gain nodes per tone.
- `tests/commands/pathfinding-performance.spec.ts`, `tests/e2e/epic1-rts-foundation.spec.ts` -- regression checks.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/profiling/heap-active-play.mjs` + `heap-snapshot-diff.mjs` -- reproduce and attribute growth/churn.
- [x] `src/game/map/pathfinding.ts` -- binary-heap open set with exact original tie-breaking (lowest f, then first open-set insertion), numeric cell keys, per-search walkability memo; identical paths.
- [x] `src/app/createApp.ts` -- path predicates compute static-blocker rects and the probe circle once per search (`getStaticBlockerRects`, `isLandObjectOverlappingCircle`); skip no-op hover publishes; camera moves update `camera` synchronously and rebuild the full snapshot at most every 200 ms (with a trailing publish).
- [x] `src/game/audio/audioManager.ts` -- disconnect one-shot tone nodes on `ended`.
- [x] Regression: command-level pathfinding check (predicate calls bounded by grid size, unreachable search fast) and a Chromium e2e heap check under active play.

**Acceptance Criteria:**
- Given 5 minutes of scripted active play, when the post-GC heap is sampled every 15 s, then it stays flat (growth < 12 MB) and DOM nodes/listeners do not accumulate.
- Given the same run, when allocation sampling includes collected objects, then the allocation rate is a fraction of the baseline and pathfinding is no longer the dominant allocator.
- Given random start/goal pairs on the real map (land, water, and enclosed goals), when old and new `findGridPath` run, then they return identical paths.
- Given existing command/e2e tests, then they still pass (modulo failures owned by concurrently edited AI/visual code).

## Design Notes

**What the evidence showed (before):**
- Post-GC heap under active play is flat (~10 MB over 5 min on the same build), DOM nodes/listeners flat after GC. There is no retained leak; heap snapshot diff early vs late shows no accumulating constructor.
- The "growing heap" is allocation churn: the sampling profile (incl. collected objects) attributed > 99 % of all allocations to `findGridPath` and its walkability predicates, reached from `executeMoveCommand -> planLandFormationMoves -> findEntityLandPath` (right-click move orders, ~88 %) and `executeAttackCommand` (~11 %). The old A* spread the full open set into a new array on every expansion (`[...open.values()].reduce`) and re-evaluated the walkability predicate (which itself built three filtered copies of the entity list) up to ~8x per cell. One unreachable order: 341k predicate calls vs 44k cells. Formation moves retry three spacings for every selected unit, multiplying this.
- Smaller churn: every pointer move rebuilt the full debug snapshot plus objective DOM via `clearCombatPreview`/`updateCombatPreviewAtPoint`, and every camera-scroll frame did the same through `applyCamera`.

**Equivalence:** the old reduce picked the first minimum in Map insertion order; a key's position is fixed at first insertion even when its f improves. The heap orders by `(f, seq-of-first-insertion)` with lazy deletion of stale entries, which reproduces that order exactly. Verified with 132 random land/water/enclosed cases (99 found paths): 0 mismatches.

## Verification

**Commands:**
- `npm run typecheck`
- `npm run test:commands`
- `npm run build`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --project=chromium --grep "performance|heap|memory"`
- `node scripts/profiling/heap-active-play.mjs 300 <url> <outDir>` before vs after.

**Observed verification (2026-10-08):**
- `npm run typecheck` -- passed.
- `npm run test:commands` -- passed (85 ok + new pathfinding regression check). The new check fails on the old A* (341,438 predicate calls for one unreachable search vs a 44,472-cell bound).
- `npm run build` -- passed.
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --project=chromium --grep "performance|heap|memory"` -- the 4 performance-diagnostics tests and the new active-play heap test pass. `keeps render object counts bounded...` is flaky (passed 2 of 4 runs, 125 vs limit 121); a side-by-side run of the same steps on builds with and without this change gives identical render-object counts, so it is not caused by this change (render/AI code is being edited concurrently).
- Old vs new `findGridPath`: 132 random land/water/enclosed cases, 99 found paths, 0 mismatches; 1448 ms -> 337 ms total.

**Active-play probe, 5 min, GPU Chromium, same source tree built with and without this change** (`node scripts/profiling/heap-active-play.mjs 300 <url> <dir>`):

| Run | Allocation rate (sampled, incl. collected) | Peak un-collected heap per 15 s window | Post-GC heap 60 s -> 300 s | Top allocator |
|-----|------|------|------|------|
| A before (AI idle, all units alive) | 154.6 MB/s | 21-39 MB | 8.9 -> 9.3 MB | `findGridPath` + predicates (> 99 %) |
| A after | 20.2 MB/s (-87 %), 39 % more player actions done | 10-29 MB | 8.9 -> 9.4 MB | still path search, 10x smaller |
| B before (AI active, units dying) | 33.3 MB/s | 15-36 MB | 11.7 -> 11.6 MB | `isBlockedByStaticEntity`, `hypot`, path predicate |
| B after | 11.1 MB/s (-67 %) | 14-25 MB | 12.1 -> 11.5 MB | Pixi Graphics tessellation (`buildLine`, `triangulate`) |

Heap snapshot diff early (45 s) vs late (300 s): self size 15.2 -> 15.4 MB; growth is only V8 code objects and browser performance-timeline entries (capped at 200). No game or Pixi constructor accumulates. DOM elements and listeners flat after GC.

**Conclusion:** there was no retained leak under active play. The "always growing" heap was the GC sawtooth driven by path-search churn on every move/attack order. The next largest churn is Pixi Graphics re-tessellation of overlays/fog (render-owned, left for the visual-polish pass).
