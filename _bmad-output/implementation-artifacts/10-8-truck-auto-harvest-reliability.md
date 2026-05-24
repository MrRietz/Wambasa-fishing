---
status: done
story_key: 10-8-truck-auto-harvest-reliability
epic: 10
story: 8
title: Truck Auto Harvest Reliability
---

# Story 10.8: Truck Auto Harvest Reliability

## Story
As a player,
I want metal trucks to keep auto-harvesting after I send them to a metal field,
so that the core economy does not silently stall during normal play.

## Acceptance Criteria

**Given** a truck has been ordered to harvest a metal field with available metal
**When** it loads, returns to Factory, unloads, and can still reach at least one valid field interaction point
**Then** it automatically resumes the same harvest loop without requiring another player command.

**Given** a truck cannot return to the Factory or cannot return to the field because the route is temporarily blocked
**When** the harvest system detects the blocked route
**Then** it preserves enough harvest intent to retry or recover instead of silently clearing `economy.harvesting` after one failed path attempt.

**Given** the loop should legitimately stop because the player issued Stop/manual move/manual unload, the truck was destroyed, the Factory was destroyed, or the field is depleted
**When** that stop condition happens
**Then** the truck exits auto-harvest deliberately and emits clear feedback or debug state explaining why.

**Given** multiple player and AI trucks are harvesting through ordinary base traffic
**When** the simulation runs for several harvest cycles
**Then** trucks do not idle with empty cargo and a valid field/factory route unless the loop has an explicit stop reason.

## Tasks / Subtasks

- [x] Reproduce the intermittent stop with a focused command test and, if possible, a Playwright opening-economy scenario. (AC: 1, 4)
- [x] Audit every place `economy.harvesting` is cleared for trucks and classify it as intentional stop, recoverable route failure, or stale invalid state. (AC: 2, 3)
- [x] Add a durable auto-harvest intent/retry path for recoverable return-to-Factory and return-to-field failures. (AC: 2)
- [x] Keep manual Stop, manual Move, manual Unload, destroyed truck/Factory, and depleted field behavior explicitly terminating the loop. (AC: 3)
- [x] Add debug/test evidence for auto-harvest phase, field id, cargo, retry/blocked reason, and last intentional stop reason. (AC: 2-4)
- [x] Add regression coverage for full multi-cycle harvest, temporary blocked return path, depleted field stop, manual stop/move stop, and AI truck harvest continuity. (AC: 1-4)

## Dev Notes

- Start in `src/game/simulation/systems/harvestSystem.ts`. `resolveHarvestArrival` owns truck phase transitions: `to-field`, `loading`, `returning`, and `manual-returning`.
- The current high-risk branches are:
  - Missing cargo/field while traveling/loading clears `economy.harvesting`.
  - Field depletion clears `economy.harvesting`.
  - A blocked Factory return path after loading clears `economy.harvesting` and emits `returnPathBlocked`.
  - After unloading, failed `planTruckReturnToField(...)` clears `economy.harvesting` with only the generic unload event.
- Reuse `src/game/simulation/resourceRouting.ts` for field interaction candidates. Do not create a second pathing helper for metal trucks unless it clearly replaces duplication there.
- Command handlers in `src/game/commands/commandHandlers.ts` deliberately set `manual-returning` for manual unload. Preserve the current design: manual unload should not auto-return to the field.
- Stop/manual move behavior is handled by command code that clears tactical/economy orders. Preserve the player's ability to cancel automation.
- Pathing fixes may overlap Story 10.3. Keep this story focused on auto-harvest state durability and retry semantics; only change candidate pathing here when needed to prevent the loop from dropping valid intent.
- AI harvest uses the same truck/economy simulation. Do not add AI-only harvest behavior.

### Project Structure Notes

- Simulation changes belong under `src/game/simulation/systems/` and shared routing helpers under `src/game/simulation/`.
- Command behavior belongs under `src/game/commands/`; do not put harvest state transitions in Pixi render, HUD, or audio code.
- Debug evidence should extend existing debug state structures rather than creating a parallel global.

### Project Context Rules

- Canonical gameplay state must live in TypeScript simulation/entity data, not Pixi display objects.
- Player and AI actions should use the same typed command/simulation paths.
- Expected gameplay failures should return typed results or explicit events, not silent state loss.
- Hot-path systems should avoid unnecessary allocation churn during normal simulation ticks.

### References

- `_bmad-output/game-architecture.md#Simulation State Ownership`
- `_bmad-output/game-architecture.md#Map, Pathfinding, and Collision`
- `_bmad-output/game-architecture.md#Resource and Economy Systems`
- `_bmad-output/planning-artifacts/epics.md#Story 3.2: Add Metal Fields and Harvest Commands`
- `_bmad-output/planning-artifacts/epics.md#Story 3.3: Implement Truck Cargo, Return, and Unload`
- `_bmad-output/implementation-artifacts/economy-auto-loop-playability-fix.md`
- `_bmad-output/implementation-artifacts/10-3-building-adjacent-pathing-and-stuck-recovery.md`
- `src/game/simulation/systems/harvestSystem.ts`
- `src/game/simulation/resourceRouting.ts`
- `src/game/commands/commandHandlers.ts`
- `tests/commands/command-validation.spec.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npm run test:art`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --grep "truck loads metal|AI rival issues harvest"`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Implemented durable truck auto-harvest retry phases, manual cancellation coverage, route normalization, and player/AI regression tests.

- Added durable `return-blocked` and `field-blocked` harvest phases with retry timers and debug-visible blocked reasons.
- Recoverable Factory-return and field-return route failures now keep cargo/field intent instead of clearing `economy.harvesting`.
- Manual move now deliberately cancels truck harvest automation, matching Stop/manual unload cancellation semantics.
- Harvest arrival now normalizes trucks onto the chosen field interaction point before loading, avoiding grid-path failures from "near enough" collision edges.
- Added command regressions for multi-cycle auto-harvest, blocked Factory route retry, blocked field route retry, and manual move cancellation.
- Extended E2E coverage for player second-cycle harvest continuity and AI truck harvest intent preservation.

### File List

- `src/app/createApp.ts`
- `src/game/commands/commandHandlers.ts`
- `src/game/debug/debugState.ts`
- `src/game/entities/components.ts`
- `src/game/simulation/systems/harvestSystem.ts`
- `tests/commands/command-validation.spec.ts`
- `tests/e2e/epic1-rts-foundation.spec.ts`
