---
status: review
story_key: 8-6-add-ux-and-debug-overlay-polish
epic: 8
story: 6
title: Add UX And Debug Overlay Polish
---

# Story 8.6: Add UX And Debug Overlay Polish

## Story
As a player,
I want important command feedback and debug state to be readable in a stable RTS-style panel,
So that I can understand what happened without hunting for tiny or transient snackbar text.

## Acceptance Criteria

**Given** the game reports boot, command, warning, or error feedback
**When** I play and issue commands
**Then** recent messages appear in a readable alert feed in the side console.

**Given** automated tests inspect the RTS debug state
**When** alerts are raised
**Then** the latest alert messages and severity are available from `window.__wambasaRts`.

## Tasks/Subtasks

- [x] Add a readable alert feed to the right-side RTS console.
- [x] Route boot/status/command feedback into the alert feed with severity.
- [x] Expose recent alert messages in debug state.
- [x] Add e2e coverage for readable invalid command feedback and debug alerts.

## Dev Notes

- Keep the feed compact so it does not block command buttons.
- Reuse existing command/status messages instead of inventing parallel copy.
- The previous boot/status text should remain for compatibility with existing tests.

## Dev Agent Record

### Implementation Plan

- Add alert feed markup and CSS.
- Add an alert buffer and render/publish functions in `src/main.ts`.
- Push alerts from `setBootStatus` with severity derived from boot status.
- Extend tests and debug state type for alerts.

### Debug Log

- Started implementation on 2026-05-16.
- Added a compact recent alert feed to the command console.
- Routed boot/status/command messages into severity-tagged alerts.
- Exposed recent alerts on `window.__wambasaRts.alerts`.
- Added e2e assertions for boot alerts and invalid command alert feedback.
- Validation passed: `npm run typecheck`, focused alert e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

The RTS side console now keeps recent player-facing messages readable in a stable alert feed while preserving the existing boot/status text for compatibility. Debug state includes recent alerts for test and diagnostic coverage.

## File List

- src/main.ts
- src/styles.css
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/8-6-add-ux-and-debug-overlay-polish.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Created Story 8.6 for UX/debug overlay polish.
- 2026-05-16: Implemented alert feed, debug alert state, and regression coverage.
