---
status: done
story_key: 9-1-add-first-skirmish-objective-flow
epic: 9
story: 1
title: Add First Skirmish Objective Flow
---

# Story 9.1: Add First-Skirmish Objective Flow

## Story
As a player,
I want clear first objectives,
So that I understand how to start playing without external explanation.

## Acceptance Criteria

**Given** a new skirmish starts
**When** the player begins
**Then** objectives guide selection, harvesting, dock/boat/fishing, defense, and win condition discovery
**And** prompts are readable and not intrusive.

## Tasks/Subtasks

- [x] Add a readable objective panel to the RTS HUD.
- [x] Drive objective completion from real selection/economy/building/combat state.
- [x] Expose objective progression in debug state.
- [x] Add e2e coverage for initial objectives and progression.

## Dev Notes

- Keep objectives concise and visible in the side panel.
- Use objective completion as guidance, not blocking tutorial gates.
- Win condition should remain visible from match start.

## Dev Agent Record

### Implementation Plan

- Add DOM objective panel markup and styling.
- Add derived objective state from entities, resources, selection, and match state.
- Render current/completed objective state during UI updates.
- Add Playwright assertions for initial guidance and progression.

### Debug Log

- Started implementation on 2026-05-16.
- Added a Current Orders objective panel inside the command console.
- Derived objective completion from selection, metal unloads, Dock construction, boat production, fishing cash, defense/combat, and match outcome.
- Exposed `window.__wambasaRts.objectives` for regression tests.
- Fixed a minimap layout regression by keeping objectives inside the scrollable command panel.
- Validation passed: `npm run typecheck`, focused objective/minimap e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

First-skirmish objectives now guide selection, metal harvesting, Dock construction, boat production, fishing income, defense/raiding, and the win condition without blocking the player. The minimap remains in the same reliable side-panel slot.

## File List

- src/main.ts
- src/styles.css
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/9-1-add-first-skirmish-objective-flow.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Created Story 9.1 for first-skirmish objectives.
- 2026-05-16: Implemented state-derived first-skirmish objective flow and tests.


## Dev Agent Record

### Completion Notes List

- 2026-05-24: Marked done. Verified and aligned first-skirmish objective order with no-starter-dock flow.
