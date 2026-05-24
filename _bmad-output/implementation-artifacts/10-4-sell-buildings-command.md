---
status: done
story_key: 10-4-sell-buildings-command
epic: 10
story: 4
title: Sell Buildings Command
---

# Story 10.4: Sell Buildings Command

## Story
As a player,
I want to sell my buildings instead of deleting them,
so that base management feels closer to classic Red Alert and refunds part of my investment.

## Acceptance Criteria

**Given** the player selects a completed friendly building that is eligible to sell
**When** the player clicks Sell
**Then** the building enters a short sell sequence, becomes non-functional, refunds configured metal/cash value, frees its footprint, and emits readable feedback.

**Given** the selected building is under construction, destroyed, enemy-owned, or a protected core building if design marks it unsellable
**When** the player tries to sell it
**Then** the command is rejected with a typed reason and no resource duplication occurs.

**Given** units/queues/capacity depend on the sold building
**When** the building is sold
**Then** production queues, crew capacity, rally points, drop-offs, dock interactions, tower targeting, and win/loss state remain consistent.

**Given** a building is sold
**When** tests inspect state
**Then** resources, footprint blockers, entity damage/destruction state, and match stats are deterministic.

## Tasks / Subtasks

- [x] Add `sellBuilding` command kind/result, command handler, and validation for friendly eligible buildings. (AC: 1, 2)
- [x] Add refund values or refund percentage to `buildingCatalog` and apply metal/cash refunds once only. (AC: 1, 4)
- [x] Add command-panel Sell action for selected friendly buildings and remove any delete-only UX path. (AC: 1, 2)
- [x] Free placement/collision blockers and clean dependent queues/rally/drop-off interactions safely. (AC: 3, 4)
- [x] Add tests for completed sale, rejected sale, refund duplication prevention, and sold Dock/House/Tower side effects. (AC: 1-4)

## Dev Notes

- Building definitions live in `src/game/data/buildings.ts`; keep refund tuning data-driven.
- Command types live in `src/game/commands/commandTypes.ts`; add to the typed command surface rather than mutating state directly from UI.
- The command panel is rendered through `src/game/ui/domShell.ts`, `src/game/ui/panels.ts`, and `src/game/ui/hudPresenter.ts`.
- Construction completion and building state are in `src/game/simulation/systems/constructionSystem.ts`; destruction and render feedback already exist and can inform the sell sequence.
- Carefully handle core Factory sell behavior. If selling the Factory is allowed, win/loss/recovery rules in `src/game/simulation/systems/winConditionSystem.ts` need explicit coverage.

### References

- `_bmad-output/game-architecture.md#Command System`
- `_bmad-output/planning-artifacts/epic-gap-stories.md#G4.2 Construction Cancel and Refund`
- `src/game/data/buildings.ts`
- `src/game/commands/commandTypes.ts`
- `src/game/ui/panels.ts`
- `src/game/simulation/systems/winConditionSystem.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Implemented sell-building command with refund data, UI action, dependency cleanup, and command coverage.

- Added typed `sellBuilding` command results and validation for completed friendly support buildings.
- Added data-driven building refund rates and protected the Factory Command Center from sale to keep core win/loss rules stable.
- Wired a Building Orders panel with a Sell action and redirected Delete/Backspace on selected buildings to Sell instead of destructive delete.
- Sold buildings now refund once, enter a short removal sequence, free blockers through destroyed-state filtering, clear queues/rally/drop-off roles, and clear dependent unit orders targeting the sold building.
- Added command tests for completed sale/refund, duplicate prevention, protected/enemy/under-construction rejection, and dock order cleanup.

### File List

- `src/game/data/buildings.ts`
- `src/game/commands/commandTypes.ts`
- `src/game/commands/commandHandlers.ts`
- `src/game/ui/domShell.ts`
- `src/game/ui/panels.ts`
- `src/game/ui/hudPresenter.ts`
- `src/app/createApp.ts`
- `tests/commands/command-validation.spec.ts`
- `tests/e2e/epic1-rts-foundation.spec.ts`
