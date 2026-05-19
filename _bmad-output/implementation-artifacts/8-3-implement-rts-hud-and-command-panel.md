---
status: review
story_key: 8-3-implement-rts-hud-and-command-panel
epic: 8
story: 3
title: Implement RTS HUD and Command Panel
---

# Story 8.3: Implement RTS HUD and Command Panel

## Story
As a player,
I want the HUD and command panel to feel like a readable RTS interface,
So that I know what is selected, what I can do, and what is happening.

## Acceptance Criteria

**Given** I select units or buildings
**When** commands are available
**Then** commands are grouped by selection context, readable, and not blocked by the minimap
**And** core match, economy, selection, and alert information is visible at a glance.

## Tasks/Subtasks

- [x] Add clearer HUD grouping for status, economy, selection, and commands.
- [x] Add visible context labels for Factory, Dock, Worker, and Defense command groups.
- [x] Ensure command buttons remain readable and not blocked by minimap.
- [x] Add/adjust tests for HUD readability and context-specific command visibility.

## Dev Notes

- Existing UI is generated in `src/main.ts` and styled in `src/styles.css`.
- Preserve the right-side minimap/command panel structure; improve readability without a large UI rewrite.

## Dev Agent Record

### Implementation Plan

- Add command group headers and clearer button labels/help text.
- Add defensive structure readout text when Guard Tower selected.
- Update e2e UI consistency assertions around command visibility/readability.

### Debug Log

- Started implementation on 2026-05-16.
- Added command hint and contextual group headers for Factory, Dock, and Worker build menus.
- Strengthened command panel CSS with grouped frames, readable left-aligned buttons, and hover/disabled states.
- Added e2e assertions for Factory Orders, Dock Orders, and Worker Build Menu visibility.
- Validation passed: `npm run typecheck`, focused HUD command-panel e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

The command panel now reads more like an RTS console: status/economy/selection remain at the top, command groups are labelled, buttons are larger and left-aligned, and contextual command groups stay in the right-side panel under the minimap instead of overlapping it.

## File List

- src/main.ts
- src/styles.css
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/8-3-implement-rts-hud-and-command-panel.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Implemented Story 8.3 RTS HUD command panel grouping and readability polish.
