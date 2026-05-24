---
status: done
story_key: 10-1-ai-acts-while-under-fog
epic: 10
story: 1
title: AI Acts While Under Fog
baseline_commit: f6b30a62a11a55dc3d00e68c39315f18cbba1c60
---

# Story 10.1: AI Acts While Under Fog

## Story
As a player,
I want the rival company to keep building, harvesting, fishing, and attacking even when I cannot currently see it,
so that fog of war does not make the enemy feel idle or broken.

## Acceptance Criteria

**Given** the enemy base is outside player vision or hidden by fog of war
**When** the match runs for at least two production/AI ticks
**Then** the AI continues its opening plan, production, rebuilding, fishing, defense, and raid timers without depending on render visibility.

**Given** the player scouts the enemy after it was hidden
**When** enemy units/buildings become visible again
**Then** accumulated AI progress is reflected in world state and debug state, including `lastAction`, production events, resource events, and raid events.

**Given** fog/debug overlays are enabled
**When** the AI is offscreen or under fog
**Then** a development debug readout can show AI plan state without revealing hidden enemy positions in normal player UI.

## Tasks / Subtasks

- [x] Audit fog/render filtering and verify AI systems never consume render visibility as gameplay truth. (AC: 1)
- [x] Fix any AI gating that depends on Pixi render visibility, camera viewport, or fog-hidden entities. (AC: 1)
- [x] Add regression coverage that advances the simulation with the enemy hidden and verifies AI harvest, build/produce, fish, and raid state progress. (AC: 1, 2)
- [x] Add or extend debug state for AI plan/tick evidence without leaking hidden positions into normal HUD. (AC: 2, 3)

## Dev Notes

- Start in `src/game/ai/aiCoordinator.ts`; `tickAiCoordinator` already drives harvest, opening plan, production, fishing, repair, defense, and raids from simulation state.
- Check runtime wiring in `src/app/createApp.ts` and `src/app/runtime/*` for any conditions that skip AI updates when entities are hidden or not rendered.
- Fog code exists under `src/game/visibility/fogOfWar.ts`; it should affect rendering/intel presentation, not whether AI entities simulate.
- Preserve the architecture rule: AI issues normal typed commands and must not bypass validation.
- Tests should use existing command tests plus focused Playwright/debug-state checks in `tests/e2e/epic1-rts-foundation.spec.ts`.

### References

- `_bmad-output/game-architecture.md#AI Architecture`
- `_bmad-output/game-architecture.md#Architectural Boundaries`
- `src/game/ai/aiCoordinator.ts`
- `src/game/visibility/fogOfWar.ts`
- `src/game/debug/debugState.ts`

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- Verified AI runtime uses full simulation entity state while render/minimap/picking use fog-filtered visibility.
- Added AI tick telemetry and fog visibility summary to debug state.
- Added regression coverage for AI progress while enemy factory remains hidden by fog.
- Fixed review findings for hidden destination-overlay leakage, brittle float assertions, guarded debug reads, and stronger hidden-AI progress assertions.
- Validation: `npm run test:commands`, `npm run typecheck`, `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "AI rival keeps simulating production and economy while hidden by fog" --reporter=line`.

### Completion Notes List

- AI coordinator now records tick count and last tick delta so debug state can prove the AI continues to run even when no player-visible enemy render changes occur.
- Debug state now reports enemy unit IDs, visible enemy IDs, hidden-by-fog count, opening state, tick count, and raid timer without adding any normal HUD reveal.
- The simulation loop publishes throttled debug snapshots every active skirmish tick, so hidden AI progress is observable in developer tooling.
- Hidden enemy destination overlays no longer render when the command entities are not visible to the player.
- Playwright config now uses Playwright-managed Chromium by default instead of a stale hardcoded local executable path.

### File List

- `../../src/game/ai/aiCoordinator.ts`
- `../../src/game/debug/debugState.ts`
- `../../src/app/createApp.ts`
- `../../src/game/render/overlays.ts`
- `../../tests/e2e/epic1-rts-foundation.spec.ts`
- `../../tests/commands/command-validation.spec.ts`
- `../../playwright.config.ts`
- `10-1-ai-acts-while-under-fog.md`

## Suggested Review Order

**Simulation Truth**

- AI ticks record progress before start delays or visibility presentation can interfere.
  [`aiCoordinator.ts:58`](../../src/game/ai/aiCoordinator.ts#L58)

- Runtime debug state derives visible and hidden enemy summaries from fog visibility.
  [`createApp.ts:758`](../../src/app/createApp.ts#L758)

- Active skirmish ticks publish fresh debug snapshots after fog updates.
  [`createApp.ts:4864`](../../src/app/createApp.ts#L4864)

**Presentation Safety**

- Destination overlays receive only player-visible command entities.
  [`createApp.ts:1027`](../../src/app/createApp.ts#L1027)

- Overlay drawing stops when every commanded entity is hidden.
  [`overlays.ts:120`](../../src/game/render/overlays.ts#L120)

**Debug Contract**

- AI debug schema exposes tick evidence and fog-safe visibility counts.
  [`debugState.ts:151`](../../src/game/debug/debugState.ts#L151)

**Regression Coverage**

- Command test proves hidden render flags do not block AI subsystems.
  [`command-validation.spec.ts:1027`](../../tests/commands/command-validation.spec.ts#L1027)

- E2E test verifies hidden AI progress while enemy factory stays unseen.
  [`epic1-rts-foundation.spec.ts:1869`](../../tests/e2e/epic1-rts-foundation.spec.ts#L1869)

- Browser config now uses installed Playwright Chromium unless explicitly overridden.
  [`playwright.config.ts:3`](../../playwright.config.ts#L3)
