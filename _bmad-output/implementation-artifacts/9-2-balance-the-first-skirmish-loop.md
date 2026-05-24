---
status: done
story_key: 9-2-balance-the-first-skirmish-loop
epic: 9
story: 2
title: Balance The First Skirmish Loop
---

# Story 9.2: Balance the First Skirmish Loop

## Story
As a player,
I want the first skirmish to escalate fairly,
So that I can learn, recover, and still feel pressure.

## Acceptance Criteria

**Given** the first skirmish is played
**When** economy and AI timing are tuned
**Then** player can complete first metal loop quickly, first fishing loop early, and face readable AI pressure without instant failure.

## Tasks/Subtasks

- [x] Make first-skirmish balance values explicit in code/debug state.
- [x] Add an AI raid grace period before first pressure.
- [x] Preserve existing economy loop timings and regression tests.
- [x] Add e2e coverage for balance values and non-instant raid pressure.

## Dev Notes

- Avoid destabilizing the already-covered economy loop.
- The first balance pass should be small and testable.
- AI pressure should remain present, just delayed enough to read.

## Dev Agent Record

### Implementation Plan

- Add a small balance config object.
- Wire AI start/raid delay to config values.
- Publish balance config in debug state.
- Add e2e assertions around the first raid grace window.

### Debug Log

- Started implementation on 2026-05-16.
- Added `FIRST_SKIRMISH_BALANCE` for starter metal, AI start delay, first raid grace, starter cargo, and first boat cash value.
- Published balance values in `window.__wambasaRts.balance`.
- Added a 3.5 second first-raid grace period before AI pressure begins.
- Added e2e assertions that the first raid is not instant and that balance values are exposed.
- Validation passed: `npm run typecheck`, focused balance e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

The first skirmish balance is now explicit and testable. The player keeps the existing economy timing while the rival raider waits through a readable grace window before pressuring exposed economy.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/9-2-balance-the-first-skirmish-loop.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Created Story 9.2 for first-skirmish balance.
- 2026-05-16: Implemented explicit balance config, first-raid grace period, and regression coverage.


## Dev Agent Record

### Completion Notes List

- 2026-05-24: Marked done. Verified explicit balance config, AI economy tick, delayed live raid pressure, and raid warning actionability.
