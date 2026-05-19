---
status: review
story_key: 4-6-repair-buildings
epic: 4
story: 6
title: Repair Buildings
---

# Story 4.6: Repair Buildings

## Story
As a player,
I want workers to repair damaged buildings,
So that recovery is possible after attacks.

## Acceptance Criteria

**Given** a friendly building has missing health
**When** I select a worker and right-click the damaged building
**Then** the worker moves to the building and repairs it over time
**And** repaired building health, repair state, and feedback are visible.

## Tasks/Subtasks

- [x] Verify or implement worker repair commands against friendly buildings.
- [x] Ensure building repair uses reachable approach points and does not require the building to move.
- [x] Show repair state in debug/selection feedback.
- [x] Add e2e coverage for a worker repairing a damaged friendly building.

## Dev Notes

- Existing repair command already targets friendly entities with health below max. Confirm that building entities behave correctly.
- If there is no organic way to damage a player building in current tests, add a small deterministic debug/test hook rather than relying on random AI behavior.

## Dev Agent Record

### Implementation Plan

- Add a deterministic debug hook for e2e to damage a friendly building without changing normal player UI.
- Reuse existing repair command mechanics for worker-to-building repair.
- Add regression coverage around player Factory repair.

### Debug Log

- Started implementation on 2026-05-16.
- Existing worker repair commands already support friendly buildings with missing health.
- Added deterministic internal damage hook for e2e setup and covered Factory repair flow.
- Validation passed: `npm run typecheck`, focused building repair e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

Workers can now be regression-tested repairing damaged friendly buildings. The test damages the player Factory through an internal debug hook, issues a normal right-click repair command with a worker, verifies the worker enters repair state, and confirms Factory health recovers.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/4-6-repair-buildings.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Added building repair regression coverage and deterministic test damage hook.
