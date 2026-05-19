---
status: review
story_key: 7-7-defensive-buildings-auto-engage-raiders
epic: 7
story: 7
title: Defensive Buildings Auto-Engage Raiders
---

# Story 7.7: Defensive Buildings Auto-Engage Raiders

## Story
As a player,
I want defensive buildings to automatically attack enemy raiders,
So that base layout and defensive investment matter.

## Acceptance Criteria

**Given** a completed defensive building has enemy units or boats in range
**When** the enemy enters its range
**Then** the defense automatically attacks the target over time
**And** selected defenses show range, target, health, and attack state.

## Tasks/Subtasks

- [x] Add Guard Tower attack stats and target acquisition for enemy raiders in range.
- [x] Apply tower damage over time without moving the tower or using pathing.
- [x] Show tower range and target/attack state in selection/debug output.
- [x] Render tower attack feedback clearly enough for play and tests.
- [x] Add e2e coverage for completed tower auto-attacking an enemy raider.

## Dev Notes

- Reuse existing `economy.attack`, `lastCombatEvent`, damage state, and animation resolver where practical.
- Guard Towers are immobile buildings; they must not path, move, or receive mobile attack commands.
- Keep this as basic auto-defense. Advanced defense balance and multiple defense types can be later stories.

## Dev Agent Record

### Implementation Plan

- Add attack stats for completed Guard Towers.
- Add a per-tick tower auto-defense update near combat updates.
- Extend selection/debug/range overlays for tower state.
- Add Playwright coverage that builds a tower near the enemy skiff and verifies auto-damage.

### Debug Log

- Started implementation on 2026-05-16.
- Added Guard Tower range/DPS constants, auto-acquisition, immobile combat handling, range overlay, target readout, attack beam rendering, and e2e coverage.
- Fixed test brittleness after towers reacquired a second target following skiff destruction.
- Validation passed: `npm run typecheck`, `npm run build`, focused Guard Tower e2e, full `npm run e2e`.

### Completion Notes

Completed Guard Towers now automatically acquire enemy entities in range, apply damage over time without moving/pathing, expose `attack` in debug state, show range and target in selection readout, draw a range ring when selected, and render a firing line while attacking. The new regression test builds a tower, verifies auto-damage against the enemy skiff, and confirms the skiff is destroyed.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/7-7-defensive-buildings-auto-engage-raiders.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Implemented Story 7.7 Guard Tower auto-defense behavior and tests.
