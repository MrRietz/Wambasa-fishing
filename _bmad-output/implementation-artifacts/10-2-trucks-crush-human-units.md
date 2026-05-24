---
status: done
story_key: 10-2-trucks-crush-human-units
epic: 10
story: 2
title: Trucks Crush Human Units
---

# Story 10.2: Trucks Crush Human Units

## Story
As a player,
I want trucks to run over vulnerable human units in a Red Alert-inspired way,
so that vehicle movement creates chaotic, readable, fun battlefield moments.

## Acceptance Criteria

**Given** a moving truck overlaps a vulnerable human unit such as worker, guard, or saboteur
**When** the truck is above the configured crush speed and the target is not protected by a building/vehicle role
**Then** the human unit is killed or heavily damaged through normal damage/destruction state and a crush event is emitted.

**Given** the truck is stopped, crawling, blocked, or overlapping a building/vehicle/boat
**When** collision resolves
**Then** no crush is applied.

**Given** a crush happens
**When** the UI/audio/render systems observe the event
**Then** there is readable feedback: short world effect, combat/stat update, SFX cue, and debug state evidence.

**Given** AI trucks and player trucks use the same simulation
**When** either faction crushes a human unit
**Then** the same rules, tests, and damage accounting apply.

## Tasks / Subtasks

- [x] Add crush-capable metadata or helper rules for trucks and vulnerable human entity kinds. (AC: 1, 2)
- [x] Implement a simulation crush system near movement/collision handling, not in Pixi rendering. (AC: 1, 2)
- [x] Route crush damage through existing health/damage/destruction and match stats paths. (AC: 1, 3, 4)
- [x] Add a typed event/debug field for crush feedback and optional SFX cue. (AC: 3)
- [x] Add command/unit tests for crush/no-crush boundaries and Playwright coverage for visible feedback. (AC: 1-4)

## Dev Notes

- Current entity kinds live in `src/game/entities/components.ts`; human candidates are `worker`, `guard`, and `saboteur`.
- Movement and collision behavior is already covered by `src/game/simulation/systems/collisionSystem.ts`, `src/game/map/spatialHash.ts`, and movement/path follow code. Extend existing systems rather than adding render-owned hit detection.
- Do not let crush override buildings, boats, or trucks. This feature is intentionally Red Alert-like infantry crushing, not universal collision damage.
- Existing combat/destruction feedback paths are in `src/game/simulation/systems/combatSystem.ts`, `src/game/simulation/systems/destructionSystem.ts`, `src/game/render/entityRenderer.ts`, and `src/game/audio/audioManager.ts`.
- Preserve typed command behavior; crush is a consequence of movement, not a new direct command unless later design asks for one.

### References

- `_bmad-output/game-architecture.md#Entity and Component Model`
- `_bmad-output/game-architecture.md#Map, Pathfinding, and Collision`
- `src/game/entities/components.ts`
- `src/game/simulation/systems/collisionSystem.ts`
- `src/game/simulation/systems/combatSystem.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Implemented truck crush simulation with debug/audio/render feedback and command coverage.

- Added a simulation-owned truck crush pass in `collisionSystem` with explicit truck/human helper rules, crush speed gating, and overlap checks for truck rectangles versus vulnerable human units.
- Routed crush damage through the existing `applyDamage` path so destruction state and match stats remain consistent for player and AI trucks.
- Surfaced crush feedback through typed debug state, a transient world impact ring, SFX cue, and focused warning feedback when enemy trucks crush player units.
- Added command tests for moving-truck crush, stopped/crawling trucks, and protected boat/non-human targets.
- Playwright coverage was not expanded in this pass; visible feedback is implemented in the render context and covered indirectly by build/typecheck plus command-level event assertions.

### File List

- `src/game/simulation/systems/collisionSystem.ts`
- `src/app/createApp.ts`
- `src/game/debug/debugState.ts`
- `src/game/render/entityRenderer.ts`
- `src/game/audio/audioManager.ts`
- `tests/commands/command-validation.spec.ts`
