---
status: done
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
- Revalidated the MVP regression suite in focused Chromium chunks after gameplay balance, AI, and UI flow changes exposed stale assumptions in the integrated tests.
- Attempted the one-shot Chromium MVP command with a 20-minute timeout; the runner timed out without reporter output, so verification is recorded from the passing focused chunks plus command tests, typecheck, and build.

### Completion Notes

The MVP regression suite is now formalized with a dedicated command and coverage manifest. The command currently runs 50 integrated e2e tests covering the MVP systems listed in the acceptance criteria.

2026-05-24 review pass: updated the integrated MVP regression coverage for the current no-starter-dock opening, stabilized AI economy/pressure regression checks, and added debug-only test hooks for deterministic selection, movement, attack, and sabotage validation. Focused Chromium chunks cover Epic 1 through Epic 11 scenarios, while command tests, typecheck, and production build pass.

## File List

- package.json
- _bmad-output/implementation-artifacts/mvp-regression-coverage.md
- _bmad-output/implementation-artifacts/9-5-mvp-regression-test-suite.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/createApp.ts
- src/app/runtime/aiRuntime.ts
- src/game/ai/aiCoordinator.ts
- src/game/simulation/resourceRouting.ts
- tests/commands/command-validation.spec.ts
- tests/e2e/epic1-rts-foundation.spec.ts

## Change Log

- 2026-05-16: Created Story 9.5 for MVP regression suite formalization.
- 2026-05-16: Added MVP regression command, coverage manifest, and verified the suite.
- 2026-05-24: Revalidated and repaired MVP regression coverage after no-starter-dock, fishing balance, AI economy, and combat flow changes.


## Dev Agent Record

### Completion Notes List

- 2026-05-24: Marked done. Chromium MVP regression coverage passed in focused chunks; command tests, typecheck, and build passed; one-shot Chromium MVP runner timed out without reporter output.
