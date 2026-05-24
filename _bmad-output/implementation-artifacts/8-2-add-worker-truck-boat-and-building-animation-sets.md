---
status: done
story_key: 8-2-add-worker-truck-boat-and-building-animation-sets
epic: 8
story: 2
title: Add Worker, Truck, Boat, and Building Animation Sets
---

# Story 8.2: Add Worker, Truck, Boat, and Building Animation Sets

## Story
As a player,
I want core entities to have readable animations,
So that movement and work are clear at RTS zoom.

## Acceptance Criteria

**Given** production assets or temporary authored placeholders exist
**When** workers, trucks, boats, and buildings act
**Then** their animations communicate walking, driving, harvesting/unloading, bobbing/fishing, construction, active, damaged, and destroyed states.

## Tasks/Subtasks

- [x] Add explicit animation profiles for humanoids, trucks, boats, and buildings.
- [x] Enrich worker/guard/saboteur walking and work poses without whole-unit hover/wiggle.
- [x] Enrich truck driving/harvest cargo and wheel animation.
- [x] Enrich boat wake/fishing/sinking animation feedback.
- [x] Enrich building construction/active/damaged/destroyed feedback.
- [x] Add e2e assertions proving representative animation profiles/states advance.

## Dev Notes

- Build on Story 8.1 animation resolver. Do not replace the resolver.
- Current visuals are Pixi vector-drawn placeholders; this story should make them intentionally readable until sprite atlases exist.
- Keep debug state useful for tests and future asset replacement.

## Dev Agent Record

### Implementation Plan

- Add `animationProfile`/frame metadata to debug state.
- Add profile-specific render helpers for humanoid, truck, boat, and building animation sets.
- Extend e2e coverage for move, harvest, fish, build, attack, and destroyed representative states.

### Debug Log

- Started implementation on 2026-05-16.
- Added `AnimationProfile` metadata and profile-specific frame counts/rates for humanoids, trucks, boats, and buildings.
- Extended debug state with `animationProfile` and `animationFrameCount`.
- Added richer profile-specific vector animation feedback for truck harvest, boat fishing, tower/building action, construction, damaged, and destroyed states.
- Validation passed: `npm run typecheck`, focused animation-profile e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

Core entities now expose and render distinct animation profiles. Workers/guards/saboteurs keep stable-ground humanoid limb animation, trucks have longer driving/harvest frame loops, boats have fishing/wake loops, and buildings have construction/active/damaged/attack feedback. Tests now assert representative profile/frame metadata for truck harvest, building construction, boat fishing, guard attack, humanoid movement, and Guard Tower buildings.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/8-2-add-worker-truck-boat-and-building-animation-sets.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Implemented Story 8.2 profile-based animation sets and regression coverage.


## Dev Agent Record

### Completion Notes List

- 2026-05-24: Marked done. Verified animation profile coverage with focused Guard Tower and fishing-boat e2e slice plus production build.
