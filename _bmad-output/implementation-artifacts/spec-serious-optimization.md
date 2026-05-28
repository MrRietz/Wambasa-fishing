---
title: 'Serious Heap Optimization Pass'
type: 'bugfix'
created: '2026-05-28'
status: 'done'
baseline_commit: 'dcaa9cc2e6f55b169a3919b43ec5294f5d25cfa9'
context:
  - '_bmad-output/game-architecture.md'
  - '_bmad-output/gdd.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The game has reached roughly 3 GB heap usage during play, which makes long skirmishes unreliable and makes balance or AI testing untrustworthy. The most suspicious current hot path is rendering churn: entity rendering repeatedly clears Pixi containers, destroys display objects, then recreates sprites and graphics during normal simulation updates.

**Approach:** Reproduce or approximate the heap spike with a repeatable local playtest/profiling scenario, then reduce the largest confirmed allocation/retention source without changing gameplay rules. Prefer object reuse, bounded debug state, and render throttling where evidence shows they matter.

## Boundaries & Constraints

**Always:** Keep canonical game state in TypeScript entity/simulation data, not Pixi display objects. Preserve existing RTS behavior, visuals, fog, commands, animation state, and debug hooks unless a visual-only change is directly required to reduce memory churn. Add profiling or regression evidence that can be rerun from the repo, even if the final heap target must be measured manually in a browser.

**Ask First:** Stop and ask before replacing Pixi, changing the map size/art direction, removing debug tooling outright, deleting production assets, or changing gameplay balance/AI behavior to hide a performance problem.

**Never:** Do not solve this by raising Node/browser heap limits, disabling enemies, cutting core RTS features, or merging the deferred balance/AI goals into this pass.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Long skirmish memory check | Browser skirmish runs with player and AI economy active for a fixed automated window | Heap and Pixi child counts remain bounded enough to show no runaway growth trend | If exact browser heap APIs are unavailable, record fallback evidence such as object counts, frame stability, and manual profiling steps |
| Render update churn | Moving/animating entities trigger repeated render refreshes | Existing display objects are reused or updates are throttled so object creation does not scale with every frame/tick | Missing textures or destroyed entities must be removed cleanly without retaining stale sprites |
| Debug visibility | `window.__wambasaRts` remains available during playtests | Debug snapshots remain useful while avoiding avoidable deep copies or unbounded arrays | If a field is too expensive, replace it with bounded/summarized data rather than silently removing all debug state |

</frozen-after-approval>

## Code Map

- `src/app/createApp.ts` -- main ticker, debug publishing cadence, render calls, alert/effect arrays, and Playwright debug hooks.
- `src/game/render/entityRenderer.ts` -- highest-risk allocation path; clears/destroys and recreates Pixi sprites/graphics for entity layers.
- `src/game/render/terrainRenderer.ts` -- terrain object creation is less frequent but can be expensive after texture loading, map refresh, or resource/fishing updates.
- `src/game/debug/debugState.ts` -- creates deep-ish debug snapshots from all entities and resource state.
- `src/game/art/unitSpriteAssets.ts` -- texture loading/cache ownership and startup/deferred asset behavior.
- `src/game/map/pathfinding.ts` -- allocates maps, sets, arrays, and node objects per path request; inspect if render churn is not enough to explain growth.
- `tests/e2e/epic1-rts-foundation.spec.ts` -- existing Playwright harness and debug helpers; extend with a focused memory/performance scenario if feasible.

## Tasks & Acceptance

**Execution:**
- [x] `tests/e2e/epic1-rts-foundation.spec.ts` -- add or extend a reproducible skirmish performance scenario that runs long enough to catch runaway heap/object growth and records usable diagnostics.
- [x] `src/game/render/entityRenderer.ts` -- profile and refactor confirmed entity-layer churn using stable display-object reuse, keyed cleanup, or targeted redraws for buildings/units/effects.
- [x] `src/app/createApp.ts` -- reduce unnecessary render/debug publication frequency only where behavior stays identical; keep arrays such as alerts, pings, effects, and frame samples bounded.
- [x] `src/game/debug/debugState.ts` -- trim avoidable per-tick snapshot allocation if profiling shows it contributes materially, while preserving test-critical fields.
- [x] `src/game/render/terrainRenderer.ts` and `src/game/art/unitSpriteAssets.ts` -- verify terrain and texture caches are not repeatedly rebuilt or retained after obsolete children are removed.
- [x] `src/game/map/pathfinding.ts` -- investigate allocation pressure from pathfinding only after render/debug hot paths are measured; apply a small optimization if it is a confirmed contributor.

**Acceptance Criteria:**
- Given a repeatable automated or documented long-skirmish scenario, when the game runs with active player and AI economy, then heap/object diagnostics show bounded growth instead of a runaway trend toward the reported 3 GB heap.
- Given normal movement, harvesting, fishing, construction, combat, and damage animations, when entity rendering updates repeatedly, then Pixi display object counts remain stable except for legitimate entity/effect creation and removal.
- Given existing Playwright and command tests, when the optimization is complete, then gameplay behavior, debug hooks, and core RTS smoke tests still pass.
- Given manual browser profiling is required for final confidence, when the work is handed off, then the exact profiling steps and observed before/after signal are recorded in the story completion notes.

## Design Notes

The expected first fix is not a broad rewrite. A keyed renderer can keep one sprite/overlay pair per visible entity, update position/texture/tint/visibility in place, and destroy only objects whose entity ids disappear or move to another layer. Effects may still be transient, but they should be pooled or bounded if they are recreated every frame.

Implementation followed the keyed renderer route: building/unit sprites and overlays are cached per entity id, effect sprites are synced from lightweight specs, and stale display objects are destroyed only when the owning entity/effect disappears. Terrain and texture caches were inspected and left unchanged because the confirmed hot churn was entity/effect redraw. Pathfinding was inspected and left unchanged because the focused diagnostic passed after the renderer fix.

## Verification

**Commands:**
- `npm run typecheck` -- expected: TypeScript passes.
- `npm run test:commands` -- expected: command and simulation regressions pass.
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --grep "performance|heap|memory"` -- expected: focused memory/performance scenario passes or records diagnostics without runaway object growth.
- `npm run build` -- expected: production build completes.

**Manual checks (if browser heap APIs are limited):**
- Open Chromium DevTools Performance/Memory, run the scripted long-skirmish scenario, and confirm JS heap/Pixi object counts stabilize after initial texture loading rather than climbing continuously.

**Observed verification:**
- `npm run typecheck` -- passed.
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --grep "performance|heap|memory"` -- passed 10 tests in Chromium and Firefox.
- `npm run test:commands` -- passed.
- `npm run build` -- passed; Vite retained the existing unresolved runtime UI sprite warning.

## Suggested Review Order

**Renderer Cache**

- Start with keyed render reuse for the allocation fix.
  [`entityRenderer.ts:23`](../../src/game/render/entityRenderer.ts#L23)

- Confirm units reuse sprites while resetting stale visual state.
  [`entityRenderer.ts:43`](../../src/game/render/entityRenderer.ts#L43)

- Check effect pooling and overlay reuse stay bounded.
  [`entityRenderer.ts:63`](../../src/game/render/entityRenderer.ts#L63)

- Inspect cache ownership and stale entry cleanup.
  [`entityRenderer.ts:119`](../../src/game/render/entityRenderer.ts#L119)

- Verify cached sprites fully reset flip, size, tint, and position.
  [`entityRenderer.ts:261`](../../src/game/render/entityRenderer.ts#L261)

**Diagnostics**

- See runtime render-object telemetry exposed in debug state.
  [`createApp.ts:950`](../../src/app/createApp.ts#L950)

- Check debug schema extension for layer object counts.
  [`debugState.ts:241`](../../src/game/debug/debugState.ts#L241)

**Regression Coverage**

- Review the heap/memory diagnostic skirmish scenario.
  [`epic1-rts-foundation.spec.ts:827`](../../tests/e2e/epic1-rts-foundation.spec.ts#L827)
