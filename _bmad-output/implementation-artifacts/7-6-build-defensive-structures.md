---
status: review
story_key: 7-6-build-defensive-structures
epic: 7
story: 6
title: Build Defensive Structures
---

# Story 7.6: Build Defensive Structures

## Story
As a player,
I want workers to place and construct defensive buildings,
So that I can protect my base instead of only reacting with mobile guards.

## Acceptance Criteria

**Given** a worker is selected and the player has enough metal
**When** I choose a defense building and place it in valid land
**Then** a construction site is created, metal is spent, and the worker builds it
**And** invalid placement gives readable feedback without spending resources.

## Tasks/Subtasks

- [x] Add Guard Tower as a buildable defensive building definition.
- [x] Add worker command UI entry for Guard Tower placement.
- [x] Support Guard Tower placement validation, construction site creation, and worker build assignment.
- [x] Render Guard Tower construction and completed building state clearly enough for tests/debug.
- [x] Add e2e coverage for valid Guard Tower placement, invalid placement, construction completion, and resource spend.

## Dev Notes

- Follow existing House/Dock placement, construction, and worker build-job patterns in `src/main.ts`.
- Keep this story scoped to constructing the defensive building. Auto-attack behavior belongs to Story 7.7.
- Preserve existing resource/collision/pathing behavior and current e2e suite.
- Story should update `sprint-status.yaml` from ready-for-dev to in-progress, then review when complete.

## Dev Agent Record

### Implementation Plan

- Reuse the existing worker placement flow and extend `BuildingPlanKind`/`buildingCatalog` with a land-only `guardTower`.
- Add worker command UI controls and debug/test assertions for resource spend, construction site state, and completed tower.
- Keep combat behavior out of scope until Story 7.7.

### Debug Log

- Started implementation on 2026-05-16.
- Added Guard Tower placement, construction, rendering, UI command, and e2e coverage.
- Validation passed: `npm run typecheck`, focused Guard Tower e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

Guard Tower can now be planned by a selected worker, rejects invalid blocker placement without spending metal, spends 150 metal on valid placement, creates a construction site, assigns the worker build job, completes into a commandable defensive structure, and appears in selection readout as a defensive structure. Auto-attack remains intentionally scoped to Story 7.7.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/7-6-build-defensive-structures.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Implemented Story 7.6 Guard Tower construction flow and tests.
