---
status: done
story_key: 9-3-add-match-restart-and-results-summary
epic: 9
story: 3
title: Add Match Restart And Results Summary
---

# Story 9.3: Add Match Restart and Results Summary

## Story
As a player,
I want to restart and understand the match result,
So that wins and losses are clear.

## Acceptance Criteria

**Given** a match ends
**When** victory or defeat is reached
**Then** results show reason, cash earned, fish sold, metal harvested, units/buildings lost, and restart option.

## Tasks/Subtasks

- [x] Track match summary stats for resources and losses.
- [x] Render stats in the result panel.
- [x] Add a restart action.
- [x] Expose stats in debug state and add e2e coverage.

## Dev Notes

- Keep restart simple for MVP: reload the browser game.
- Track player-facing summary stats without introducing persistence.

## Dev Agent Record

### Implementation Plan

- Add match stats state and increment from existing resource/combat flows.
- Extend the result panel with a summary and restart button.
- Add debug state and tests for victory summary plus restart.

### Debug Log

- Started implementation on 2026-05-16.
- Added match stats for cash earned, fish sold, metal harvested, player losses, and rival assets destroyed.
- Rendered match summary rows in the result panel.
- Added Restart Skirmish button that reloads the browser game.
- Exposed `window.__wambasaRts.stats`.
- Added e2e coverage for victory summary stats and restart reset.
- Validation passed: `npm run typecheck`, focused result/restart e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

Match results now show the outcome reason, economy/combat summary stats, and a restart option. Restart returns the skirmish to the initial economy state.

## File List

- src/main.ts
- src/styles.css
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/9-3-add-match-restart-and-results-summary.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Created Story 9.3 for match result summary and restart.
- 2026-05-16: Implemented result stats, restart button, debug state, and regression coverage.


## Dev Agent Record

### Completion Notes List

- 2026-05-24: Marked done. Verified match result panels, summary state, defeat/victory display, and restart reload behavior.
