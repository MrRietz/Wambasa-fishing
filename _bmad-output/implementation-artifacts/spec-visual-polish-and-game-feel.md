---
title: 'Visual Polish and Game Feel Pass'
type: 'feature'
created: '2026-10-08'
status: 'done'
context:
  - '_bmad-output/gdd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/imagegen-art-bible.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The skirmish works but looks unfinished and gives little feedback. Screenshots (`investigations/visual-polish/before-*.png`) show: blocky, pitch-black square fog-of-war; hard rectangular water with no motion cues; pale placeholder rings around every unit; a blue pill plus white dot on buildings that reads like a health bar; thick neon selection outlines; always-on base footprint rectangles that look like UI bugs; a saturated yellow resource block that clashes with the muted art; and a large opaque command bar that hides a quarter of the map even when empty. Harvesting, selling, hits and deaths give almost no feedback.

**Approach:** Polish rendering (fog, water, unit/building readability, selection) and add a small, bounded "juice" layer (floating income numbers, hit flashes, impact sparks, death shockwaves, command pings, light screen shake on building destruction) without touching gameplay rules. Restyle the HUD palette toward the art bible (muted sea green, dark iron, brass accents) while keeping every element ID and behavior.

## Boundaries & Constraints

**Always:** Keep game state in simulation data; FX read state, never write it. Pool or cap every effect: no per-frame Pixi object or texture creation; destroy what is removed. Keep `window.__wambasaRts` hooks, element IDs, layer labels and overlay labels intact. Small targeted edits in shared files (`createApp.ts`).

**Ask First:** New npm dependencies, new bitmap assets, layout changes that move the command bar/side panel, gameplay or balance changes.

**Never:** Edit AI files (`src/game/ai/*`, `aiRuntime.ts`), weaken behavior assertions in tests, or commit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fog update | Visibility grid recomputed every 0.2 s | One low-res canvas texture rewritten in place, upscaled with smooth edges | Grid resize recreates the texture once and destroys the old one |
| Income event | Player `lastResourceEvent` changes | Floating "+N metal" / "+N fish" / "+$N" rises and fades at the source | Pool of 24 labels; oldest recycled when full |
| Damage | Visible entity health drops | Sprite flashes, impact spark spawned (throttled per entity) | Entities that vanish are pruned from tracking maps |
| Death | Visible entity health reaches 0 | Shockwave ring + sparks; building death adds short screen shake | Shake amplitude capped, resets stage offset to 0 |
| Move order | New `lastMoveCommand` | Expanding ping at destination | Max 48 particles; extra spawns drop oldest |
| Long match | 2+ minutes of play | `renderObjects.total` stays flat apart from entity count changes | FX live in one container with fixed children |

</frozen-after-approval>

## Code Map

- `src/game/render/fogRenderer.ts` -- fog drawn as per-cell rects; becomes a smoothed low-res texture sprite.
- `src/game/render/terrainRenderer.ts` -- water shimmer (additive tiling sprite) and animated shoreline foam.
- `src/game/render/entityRenderer.ts` -- unit shadows/team rings, building badges, health and construction bars, sprite lookup for flashes.
- `src/game/render/overlays.ts` -- selection rings/brackets, destination marker, build-footprint visibility tied to placement mode.
- `src/game/render/fxRenderer.ts` (new) -- bounded juice layer: floating text pool, particles, hit flashes, shake.
- `src/app/createApp.ts` -- one ticker call into the FX layer (plus import).
- `src/styles.css` -- HUD palette, resource bar, command bar transparency, status banner, hover states.

## Tasks & Acceptance

**Execution:**
- [x] `fogRenderer.ts` -- soft fog texture with neighbour smoothing, cool blue-black tone.
- [x] `terrainRenderer.ts` -- water shimmer + shoreline foam animated in `updateTerrainAnimation`.
- [x] `entityRenderer.ts` -- readable units (shadow, team ring), clean building badge, framed health/construction bars, `getEntityDisplaySprite`.
- [x] `overlays.ts` -- slimmer selection visuals, building corner brackets, subtle footprints except while placing.
- [x] `fxRenderer.ts` + `createApp.ts` hook -- floating income text, hit flash, impact sparks, death shockwave, command ping, capped screen shake.
- [x] `styles.css` -- calmer resource bar, transparent command bar shell, consistent panels and hover/active states.

**Acceptance Criteria:**
- Given the base overview, when fog is shown, then fog edges are soft gradients rather than square blocks.
- Given units and buildings, when idle and healthy, then no placeholder rings or pseudo health bars are drawn; health bars appear framed above damaged entities.
- Given a truck unload, fish delivery or sale, then a floating income number appears at the source and fades out.
- Given combat, when an entity takes damage or dies, then hit flash/sparks/shockwave are visible and the building death shakes the screen briefly.
- Given a 2-minute run, then `performance.renderObjects.total` stays bounded and existing e2e/command/art tests pass.

## Verification

**Commands:**
- `npm run typecheck`, `npm run test:commands`, `npm run test:art`, `npm run build`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --project=chromium`
- `node scripts/profiling/visual-shots.mjs _bmad-output/implementation-artifacts/investigations/visual-polish after` -- after screenshots.

**Observed verification (2026-10-08, shared working tree with concurrent AI/perf agents):**
- `npm run typecheck` -- passed (after the AI agent finished its in-flight edits).
- `npm run test:commands` -- passed (exit 0).
- `npm run test:art` -- passed (both manifest validators ok).
- `npm run build` -- passed.
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --project=chromium` -- 43 passed, 46 failed. Not caused by this pass: a baseline copy of the same working tree with this pass's render/CSS/hook changes reverted (served on a separate port) failed the same sampled tests with identical errors (11 of 12 sampled, e.g. `:544`, `:801` x4, `:997` command-panel overflow 81px, `:1179`, `:1282`, `:1353` "Worker Build Menu" hidden, `:2386`, `:3068`). The 12th (`:728`) was flaky and passed on rerun. The machine ran at ~10 FPS in headless Chromium for both baseline and current builds because several agents were running suites at once.
- Render-object bound test (`--grep "render object counts bounded"`) -- passed.
- `node scripts/profiling/render-objects-probe.mjs 120` -- 2-minute skirmish with repeated forced raids: `renderObjects.total` stayed between 126 and 132 (first 128, last 126); no page errors.
- Screenshots: `investigations/visual-polish/before-*.png` and `after-*.png` (1600x900 and 1920x1080). The after set adds `08-death-fx`, `09-placement` and `10-income-fx`.

**Implementation notes:**
- Fog first used a 2D-canvas texture. That one was replaced by a raw `BufferImageSource` (premultiplied RGBA) so Chromium never does a canvas readback on upload.
- Render object deltas: fog 2 -> 1, units/buildings +1 each (shared ground-shadow graphic), effects +1 (death-ghost pool container), overlays +1 (FX container). All of them are constant.
- FX pools: 64 particles, 24 BitmapText labels (one dynamic bitmap font), 10 death-ghost sprites. One Graphics is redrawn only while particles are alive. Screen shake moves `app.stage` (max 7 px, 0.42 s) so camera math and debug camera state are unchanged.
