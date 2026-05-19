---
status: review
story_key: 9-5-mvp-regression-test-suite
epic: 9
story: 5
title: MVP Regression Test Suite
---

# Story 9.5: MVP Regression Test Suite

## Story
As a developer,
I want the MVP covered by smoke and regression tests,
So that future polish does not break core RTS play.

## Acceptance Criteria

**Given** the MVP systems are integrated
**When** tests run
**Then** they cover boot, camera, minimap, selection, commands, movement, pathing, collision, harvesting, building, fishing, AI, win/loss, audio unlock, and UI layout.

## Tasks/Subtasks

- [x] Add a dedicated MVP regression test command.
- [x] Document system coverage for the MVP regression suite.
- [x] Verify the suite runs successfully.
- [x] Update sprint status and story record.

## Dev Notes

- The existing Playwright spec is intentionally broad and already exercises the integrated MVP loop.
- This story formalizes the suite and coverage manifest so future work knows what must stay green.

## Dev Agent Record

### Implementation Plan

- Add `test:mvp` script pointing at the integrated Playwright spec.
- Add a concise coverage manifest mapping story acceptance categories to tests.
- Run the dedicated script.

### Debug Log

- Started implementation on 2026-05-16.
- Added `npm run test:mvp` for the integrated MVP Playwright regression suite.
- Added `_bmad-output/implementation-artifacts/mvp-regression-coverage.md`.
- Verified `npm run typecheck` and `npm run test:mvp`.

### Completion Notes

The MVP regression suite is now formalized with a dedicated command and coverage manifest. The command currently runs 50 integrated e2e tests covering the MVP systems listed in the acceptance criteria.

## File List

- package.json
- _bmad-output/implementation-artifacts/mvp-regression-coverage.md
- _bmad-output/implementation-artifacts/9-5-mvp-regression-test-suite.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Created Story 9.5 for MVP regression suite formalization.
- 2026-05-16: Added MVP regression command, coverage manifest, and verified the suite.
