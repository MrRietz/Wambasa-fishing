---
status: done
story_key: 10-3-building-adjacent-pathing-and-stuck-recovery
epic: 10
story: 3
title: Building Adjacent Pathing And Stuck Recovery
---

# Story 10.3: Building Adjacent Pathing And Stuck Recovery

## Story
As a player,
I want trucks and units to reliably navigate around buildings and find valid interaction points,
so that "no land path" errors and building-adjacent stalls do not break the economy.

## Acceptance Criteria

**Given** a truck or worker must reach a target near a building footprint
**When** the direct destination is blocked
**Then** the command tries nearby valid interaction points before failing.

**Given** a unit becomes stuck against a building, friendly unit, or footprint blocker
**When** it has not made useful progress within the configured timeout
**Then** it repaths or settles at a nearby reachable point without spamming alerts.

**Given** no route is truly possible
**When** the command fails
**Then** the existing typed failure result gives one clear player-facing message and does not erase the last valid loop unless necessary.

**Given** economy loops are active
**When** trucks harvest/unload and workers build/repair around dense base layouts
**Then** they recover from common blocker arrangements in tests.

## Tasks / Subtasks

- [x] Reproduce and document the stuck/no-land-path cases with command fixtures around dense building-adjacent Factory routes. (AC: 1, 4)
- [x] Extend interaction-point candidate generation for buildings/resources/drop-offs before failing. (AC: 1)
- [x] Improve stuck detection/repathing for land units near building colliders and reserved unit slots. (AC: 2)
- [x] Ensure failure feedback remains typed, rate-limited, and non-destructive to valid current commands. (AC: 3)
- [x] Add command tests for blocked direct target, alternate side success, true unreachable failure, and unload/repair recovery. (AC: 1-4)

## Dev Notes

- Reuse `src/game/simulation/resourceRouting.ts`; it already has candidate target helpers for truck harvest/return and should be the first place to extend economy routing.
- Existing placement interaction helpers are in `src/game/map/buildPlacement.ts` and `src/game/map/interactionPoints.ts`.
- Command failure types live in `src/game/commands/commandTypes.ts`; keep using `CommandResult` with `reason: 'unreachable'` for true failures.
- Relevant command handlers include `executeHarvestMetalCommand`, `executeMetalUnloadCommand`, `executeRepairCommand`, `executeInstantBuildCommand`, and fish unload variants in `src/game/commands/commandHandlers.ts`.
- Avoid weakening collision by letting units enter building footprints. The fix is better candidate selection and recovery, not ignoring blockers.

### References

- `_bmad-output/game-architecture.md#Map, Pathfinding, and Collision`
- `_bmad-output/planning-artifacts/epic-gap-stories.md#G2.4 Unreachable Command Feedback`
- `src/game/simulation/resourceRouting.ts`
- `src/game/commands/commandTypes.ts`
- `src/game/map/buildPlacement.ts`
- `tests/commands/command-validation.spec.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Verified existing building-adjacent pathing and stuck recovery implementation with command suite, typecheck, and build.

- Building-adjacent land commands now try the requested approach point first, then probe alternate sides and offsets around the interaction entity before returning `reason: 'unreachable'`.
- Metal unload, worker fish unload, attack, sabotage, and repair share the new interaction-target route planner.
- Runtime land movement recovery now adds footprint-aware candidate targets for the current interaction building, improving repaths when units stall near blocked building edges.
- True unreachable metal unload failures keep the truck's existing economy loop/path state untouched.
- Playwright coverage was not expanded in this pass; the focused command suite covers the blocked direct target, alternate side success, true unreachable failure, and repair/unload recovery cases.

### File List

- `src/game/commands/commandHandlers.ts`
- `src/app/createApp.ts`
- `tests/commands/command-validation.spec.ts`
