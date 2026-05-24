---
status: done
story_key: 10-7-fishermen-and-boat-animation-polish
epic: 10
story: 7
title: Fishermen And Boat Animation Polish
---

# Story 10.7: Fishermen And Boat Animation Polish

## Story
As a player,
I want fishermen to visibly fish with rods and boats to have polished fishing/movement animations,
so that the fishing economy feels alive instead of placeholder or procedural.

## Acceptance Criteria

**Given** a worker is shore-fishing
**When** the fishing action is active
**Then** the worker uses a readable fishing-with-rod animation at RTS zoom, distinct from idle, move, build, and repair.

**Given** a fishing boat moves, fishes, unloads, is full, damaged, or sinking
**When** those states occur
**Then** the boat uses polished state-specific frames/effects with readable wake, bobbing, fishing action, cargo/full state, unload/sell, damage smoke, and sinking.

**Given** runtime art loads
**When** asset validation runs
**Then** the manifest includes required worker fishing and boat polish frames, with no runtime references to raw generated assets.

**Given** automated visual/debug smoke runs
**When** worker fishing and boat fishing loops execute
**Then** animation frame changes are observable from debug state and visually non-static in Playwright.

## Tasks / Subtasks

- [x] Extend animation data/types to include worker shore-fishing/rod action without breaking existing `AnimationAction` expectations. (AC: 1)
- [x] Add processed runtime frames/manifest entries for worker fishing and boat movement/fish/unload/full/damaged/sinking polish. (AC: 1-3)
- [x] Update `animationState` and sprite asset resolution so fishing workers and boats select the correct state from simulation data. (AC: 1, 2)
- [x] Update art validation tests for required frames and runtime-only asset paths. (AC: 3)
- [x] Add Playwright/debug checks for non-static worker fishing and boat fishing/unload/sinking animation frames. (AC: 4)

## Dev Notes

- Current animation action union is in `src/game/entities/components.ts`; worker fishing may require adding a new action such as `shoreFish` or mapping to `fish` with a humanoid-specific animation.
- `src/game/render/animationState.ts` resolves animation state from entity simulation data.
- Runtime asset loading and manifests are handled by `src/game/art/unitSpriteAssets.ts` and `public/assets/runtime/units/unit-animation-manifest.json`.
- Existing art tests are `tests/art/validate-unit-animation-manifest.mjs` and `tests/art/validate-production-art-manifest.mjs`.
- Do not point runtime code at `public/assets/generated/`; use processed/runtime-ready assets only.
- This story can use image generation for bitmap frames if no source frames exist, but final runtime references must use cleaned/normalized assets.

### References

- `_bmad-output/planning-artifacts/epics.md#Story 8.2: Add Worker, Truck, Boat, and Building Animation Sets`
- `_bmad-output/planning-artifacts/epic-gap-stories.md#G8.0 Production Imagegen Art Batch`
- `src/game/entities/components.ts`
- `src/game/render/animationState.ts`
- `src/game/art/unitSpriteAssets.ts`
- `tests/art/validate-unit-animation-manifest.mjs`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:art`
- `npm run test:commands`
- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --grep "worker can fish from shoreline|selected fishing boat can harvest fish"`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Implemented worker fishing animation manifest/runtime frames, boat polish state coverage, reachable shoreline smoke checks, and validation coverage.

- Added worker `fish` animation manifest coverage with runtime processed frames and a command-level frame-count assertion.
- Extended boat polish state detection so cargo and fishing ripples also reflect fish unload/full states.
- Hardened fishing command routing so worker-only shoreline failures are not overwritten by boat-only errors.
- Updated the worker shoreline smoke to use a reachable starter shore shoal and assert non-static worker fishing frames; boat fishing smoke also asserts animated fish frames.
- Expanded worker fishing land interaction probing for shoreline-adjacent shoals.

### File List

- `public/assets/runtime/units/unit-animation-manifest.json`
- `public/assets/runtime/units/worker/fish/east/00.png`
- `public/assets/runtime/units/worker/fish/east/01.png`
- `public/assets/runtime/units/worker/fish/east/02.png`
- `public/assets/runtime/units/worker/fish/east/03.png`
- `public/assets/runtime/units/worker/fish/north/00.png`
- `public/assets/runtime/units/worker/fish/north/01.png`
- `public/assets/runtime/units/worker/fish/north/02.png`
- `public/assets/runtime/units/worker/fish/north/03.png`
- `public/assets/runtime/units/worker/fish/south/00.png`
- `public/assets/runtime/units/worker/fish/south/01.png`
- `public/assets/runtime/units/worker/fish/south/02.png`
- `public/assets/runtime/units/worker/fish/south/03.png`
- `public/assets/runtime/units/worker/fish/west/00.png`
- `public/assets/runtime/units/worker/fish/west/01.png`
- `public/assets/runtime/units/worker/fish/west/02.png`
- `public/assets/runtime/units/worker/fish/west/03.png`
- `src/app/createApp.ts`
- `src/game/art/unitAnimationManifestData.ts`
- `src/game/map/interactionPoints.ts`
- `src/game/render/renderPolishState.ts`
- `tests/art/validate-unit-animation-manifest.mjs`
- `tests/commands/command-validation.spec.ts`
- `tests/e2e/epic1-rts-foundation.spec.ts`
