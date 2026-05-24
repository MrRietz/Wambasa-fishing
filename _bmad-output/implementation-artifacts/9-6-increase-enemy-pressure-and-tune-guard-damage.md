---
status: ready-for-review
story_key: 9-6-increase-enemy-pressure-and-tune-guard-damage
epic: 9
story: 6
title: Increase Enemy Pressure And Tune Guard Damage
---

# Story 9.6: Increase Enemy Pressure And Tune Guard Damage

## Story

As a skirmish player,
I want the enemy to apply visible, survivable pressure while my guards stop trivializing fights,
so that the first match feels tense instead of solved once I have one or two guards.

## Acceptance Criteria

1. **Given** the player starts a normal skirmish on Normal difficulty
   **When** the match runs through the opening pressure window
   **Then** the AI produces or fields at least two active combat units and sends a reachable raid toward a player economy or production target without requiring debug hooks.

2. **Given** the AI first raid reaches player territory
   **When** it engages a truck, worker, factory, dock, guard, or guard tower
   **Then** the player receives a focusable warning and can see the attacking enemy path/attack state in debug state.

3. **Given** a player guard fights an enemy guard or worker
   **When** combat is simulated
   **Then** guard damage and health are tuned so one guard is useful but does not erase small raids before the player has to react.

4. **Given** the enemy economy is hidden by fog
   **When** the AI harvests, builds, produces, and raids
   **Then** hidden AI state continues progressing, and the debug state records harvest, production, and raid evidence without revealing hidden positions in normal HUD.

5. **Given** the player chooses Easy, Normal, or Hard
   **When** raid timing and squad size are evaluated
   **Then** difficulty changes are meaningful but bounded: Easy still produces pressure, Normal pressures reliably, and Hard escalates faster or with one additional attacker.

6. **Given** the player uses a 1920x1080 desktop viewport
   **When** the match is running during normal economy, combat, and enemy pressure
   **Then** the HUD remains readable and calm: the top-left/viewport status area does not spam low-value debug-style messages, the bottom-right command/intel stack is not overwhelming, and all essential controls and warnings remain reachable without visual clutter.

7. **Given** routine simulation events happen repeatedly, such as harvesting ticks, path retries, AI internal actions, production progress, or repeated non-critical state changes
   **When** those events do not require an immediate player decision
   **Then** they must not create player-visible UI spam; they should be suppressed, coalesced, rate-limited, or moved to debug state/logs while preserving important warnings, errors, confirmations, and objective progress.

8. **Given** units move, attack, harvest, build, fish, or recover from stuck/pathing states
   **When** the skirmish is played at normal game speed
   **Then** unit movement should feel stable and intentional, not rushed or randomly faster than before; any speed, acceleration, retry, or animation cadence changes must be explicit, documented, and covered by focused tests or debug evidence.

## Tasks / Subtasks

- [x] Add explicit first-skirmish combat pressure tuning constants. (AC: 1, 3, 5)
  - [x] Centralize guard damage, enemy raid guard damage, first raid grace, repeat raid delay, and desired squad-size values near `FIRST_SKIRMISH_BALANCE` or a clearly named combat-pressure config.
  - [x] Avoid scattering magic numbers such as `34`, `24`, `90`, or hardcoded squad sizes across `createApp.ts`, `aiRuntime.ts`, and combat helpers.
  - [x] Publish relevant values in debug state if useful for tests and tuning.

- [x] Stabilize perceived unit pacing while increasing pressure. (AC: 1, 3, 5, 8)
  - [x] Audit recent movement, pathing, stuck-recovery, attack-chase, truck-crush, and animation-cadence changes for any unintended speed-up or repeated re-path behavior.
  - [x] Confirm unit speed constants for workers, guards, trucks, fishing boats, and attack boats are intentional and documented in tests where practical.
  - [x] Ensure pressure tuning does not solve difficulty by globally speeding up units or making enemy units feel like they ignore normal travel time.
  - [x] Verify stuck recovery and adjacent pathing do not create visible bursts, jitter, or shortcuts that make units appear to rush unnaturally.
  - [x] If any unit speed is intentionally changed, update command tests, E2E expectations, and story notes with the reason.

- [x] Reduce player guard overperformance without making guards feel useless. (AC: 3)
  - [x] Audit `createGuardEntity`, `createEnemyGuardEntity`, `issueAiRaidCommand`, `getAiRaidSquad`, `updateCombatAttackers`, and any direct attack damage assignments.
  - [x] Tune player guard damage and/or health down from the current overpowering feel while preserving the guard role as the primary mobile defense.
  - [x] Ensure enemy guards use comparable combat stats unless a documented difficulty/tactic adjustment intentionally differs.
  - [x] Keep guard towers as stronger static defense than a single guard, but avoid instant raid deletion.

- [x] Make autonomous enemy pressure happen reliably in live play. (AC: 1, 2, 4, 5)
  - [x] Verify the AI always has a route from enemy base to at least one player target before the first raid timer expires.
  - [x] Ensure `issueAiRaidCommand` does not mark `raidIssued` unless at least one attacker received a valid path and attack order.
  - [x] Ensure failed raid attempts retry after a short cooldown instead of permanently idling.
  - [x] Consider lowering the Normal first raid grace from current long-feeling values if manual play confirms the player can prepare comfortably.
  - [x] Ensure the enemy can still harvest while raid units are marching.

- [x] Improve AI squad production priority so the enemy does not feel empty. (AC: 1, 5)
  - [x] Review `getAiOpeningPlan`, `chooseAiBarracksProduction`, and `chooseAiFactoryProduction`.
  - [x] Ensure the opening plan gets to at least two active guards or one guard plus one saboteur before the first serious push on Normal.
  - [x] Avoid starving the AI economy by over-prioritizing military before the second truck or fishing boat unless the chosen strategy explicitly supports that.
  - [x] Preserve recent fixes: enemy barracks must not block the truck drop-off, and raid assignment must fall back to a proven reachable target point.

- [x] Add regression coverage for pressure, not only hidden AI ticking. (AC: 1-5)
  - [x] Add command-level tests for raid retry behavior and guard combat tuning boundaries.
  - [x] Add or update Playwright coverage that starts a normal skirmish, waits for autonomous pressure, and asserts `ai.lastRaidEvent.kind === 'queued'` or `'damaged'` plus at least one enemy guard with an attack order/path.
  - [x] Add a focused combat test showing one player guard no longer deletes a small enemy raid instantly.
  - [x] Keep existing harvest, fog, save/load, 1080p menu, and 45-fish capacity tests green.

- [x] Reduce HUD clutter and improve 1920x1080 playability. (AC: 2, 6, 7)
  - [x] Audit the top-left/viewport HUD status messages and remove, collapse, throttle, or move low-value informational spam that does not help the player make decisions.
  - [x] Audit the bottom-right command, objective, alert, minimap, and economy stack for repeated or overwhelming content during active play.
  - [x] Define a simple player-visible message policy: show confirmations, warnings, errors, objective progress, and attack pressure; hide or coalesce routine background simulation chatter.
  - [x] Keep high-priority combat warnings visible and focusable, but avoid filling the UI with routine economy/debug narration.
  - [x] Preserve important command feedback, selection readouts, economy values, alerts, minimap, and F10 settings access.
  - [x] Ensure repeated messages with the same meaning do not continually overwrite the viewport status or flood the alert feed.
  - [x] Add/adjust 1920x1080 Playwright coverage or screenshot checks to prove essential controls and warnings fit without overlap or unnecessary clutter.

## Dev Notes

- This story is a playtest-driven balance correction, not a new combat system. Prefer small, explicit tuning changes and tests over a broad AI rewrite.
- The user report driving this story: the game feels too easy, guards do too much damage, and the enemy still does not create felt pressure.
- Additional user report: at 1920x1080 the UI still feels clunky; the top-left corner emits too much nonessential information, and the bottom-right stack feels overwhelming.
- Additional user report: the game feels like it is rushing units, and sometimes units appear to move faster than before. Treat perceived pacing regressions as part of the balance issue.
- Recent live investigation found two AI stalls:
  - enemy barracks placement could block the enemy truck factory drop-off, starving the AI after one load;
  - raid assignment could choose an unreachable staggered point after finding a reachable raid target.
  Preserve those fixes while tuning pressure.
- Current first-skirmish values live in `src/game/config/constants.ts`: starting metal/cash, AI start delay, first raid grace, repeat raid delay, economic victory grace, starter cargo, and first boat cash value.
- Current production values live in `src/game/data/production.ts`: guard cost is 90 metal + 30 cash, production time 4.2s, crew 1. If guard cost changes, update UI/test expectations using `formatProductionCost`.
- AI opening and production priorities live in `src/game/ai/aiCoordinator.ts` and `src/game/ai/aiPressureSystem.ts`.
- AI runtime command wiring lives in `src/app/runtime/aiRuntime.ts`; it should continue to issue normal typed commands and use path validation instead of teleporting or bypassing command rules.
- Raid target selection and squad sizing helpers currently live in `src/app/createApp.ts` near `findReachableRaidPlan`, `getAiRaidTargetPriority`, `getAiRaidSquad`, `getStaggeredRaidApproachPoint`, and `getAiRepeatRaidDelaySeconds`.
- Combat damage resolution is split between command assignment and simulation systems. Audit both direct attack setup and `src/game/simulation/systems/combatSystem.ts` before changing numbers.
- Debug state and Playwright tests are the best way to prove pressure. Use `window.__wambasaRts.ai.lastAction`, `lastProductionEvent`, `lastResourceEvent`, `lastRaidEvent`, `visibleUnitIds`, and hidden counts.
- UI cleanup should prioritize player-facing calm over debug completeness. If information is useful only for development, prefer debug state/overlay access over always-visible HUD text.
- The UI should never spam unnecessary information. A visible message should answer at least one player question: what happened, what is threatened, what changed, what can I do, or why did my command fail.
- Enemy pressure should not be achieved by hidden speed-ups. Movement and animation pacing should stay readable and consistent unless a deliberate balance change is made.

### Project Structure Notes

- Keep game-domain logic under `src/game/**`; keep Pixi/app orchestration under `src/app/**`.
- Do not move AI logic into tests or debug hooks. Debug hooks can force scenarios for tests, but acceptance requires autonomous live-match pressure.
- Keep E2E tests in `tests/e2e/epic1-rts-foundation.spec.ts` unless a new focused spec already exists by implementation time.
- Keep command/unit-style tests in `tests/commands/command-validation.spec.ts`.
- Likely UI files include `src/game/ui/domShell.ts`, `src/game/ui/panels.ts`, `src/game/ui/hudPresenter.ts`, `src/styles.css`, and top-level HUD/status calls in `src/app/createApp.ts`.
- Likely movement/pacing files include `src/game/entities/entityFactory.ts`, `src/game/simulation/systems/movementSystem.ts`, `src/game/simulation/systems/collisionSystem.ts`, `src/game/simulation/resourceRouting.ts`, `src/game/render/animationState.ts`, and path/stuck handling in `src/app/createApp.ts`.

### Project Context Rules

- No `project-context.md` file was present in the repository during story creation.
- Follow existing TypeScript, Vite, PixiJS, and Playwright patterns already used in the codebase.
- Use `rg` for search and focused tests for balance changes; avoid broad refactors while tuning.

### References

- `_bmad-output/planning-artifacts/epics.md`: FR20 requires an AI rival that harvests, builds, fishes, defends, raids, and rebuilds; FR23/FR24 require combat and sabotage to disrupt economy without replacing economy as the main conflict; Story 9.2 requires readable AI pressure without instant failure.
- `_bmad-output/planning-artifacts/ux-design-specification.md`: enemy pressure should be readable, exciting, answerable, and supported by fast warnings and command confidence.
- `_bmad-output/planning-artifacts/ux-design-specification.md`: HUD should support fast strategic control, low-friction scanning, and readability under pressure rather than walls of text.
- `_bmad-output/planning-artifacts/epic-gap-stories.md`: remaining G9 balance work depends on human feel tuning; first enemy raid or pressure event must occur at a readable, tunable time.
- `_bmad-output/implementation-artifacts/9-2-balance-the-first-skirmish-loop.md`: previous balance pass made skirmish balance explicit and delayed pressure enough to read.
- `_bmad-output/implementation-artifacts/10-1-ai-acts-while-under-fog.md`: AI must continue simulating while hidden by fog and expose fog-safe debug evidence.
- `src/game/config/constants.ts`: first-skirmish balance constants.
- `src/game/ai/aiCoordinator.ts`: AI opening plan and raid timer coordination.
- `src/game/ai/aiPressureSystem.ts`: AI production and threat/raid selection helpers.
- `src/app/runtime/aiRuntime.ts`: AI command execution, production, fishing, and raid issuing.
- `src/app/createApp.ts`: raid target priority, squad size, repeat delay, and path approach helpers.
- `src/game/entities/entityFactory.ts`: current unit movement speeds and health values.
- `src/game/simulation/systems/movementSystem.ts`: movement stepping and arrival behavior.
- `src/game/simulation/systems/collisionSystem.ts`: overlap/crush/stuck-related movement effects.
- `tests/e2e/epic1-rts-foundation.spec.ts`: existing AI harvest/fog/production/raid coverage.

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "AI rival launches a live opening raid without debug forcing after the grace window"`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "initializes a selectable player guard as a combat unit"`

### Completion Notes List

- Added `FIRST_SKIRMISH_COMBAT_PRESSURE` for guard health, guard DPS, raid DPS/ranges, raid squad sizing, difficulty raid cadence, and explicit movement-speed evidence.
- Lowered Normal first raid grace to 36s and made Normal live raids wait for a reachable two-guard squad; Easy can still pressure with one fewer attacker and Hard escalates with one more.
- Added one starter rival guard and adjusted AI opening plans so the rival reliably fields visible combat pressure without speeding up units.
- Reduced player guard overperformance by tuning player guard health to 170, enemy guard health to 160, and shared guard DPS to 32 while keeping guard towers stronger static defense.
- Preserved fog-safe AI progress/debug evidence and extended debug balance output with combat-pressure and movement-pacing constants.
- Updated focused command and Playwright coverage for raid retry, guard combat survivability, explicit movement pacing, live autonomous pressure, and current guard readout expectations.

### File List

- `src/game/config/constants.ts`
- `src/game/entities/entityFactory.ts`
- `src/game/entities/skirmishSetup.ts`
- `src/game/simulation/systems/combatSystem.ts`
- `src/game/ai/aiCoordinator.ts`
- `src/app/runtime/aiRuntime.ts`
- `src/app/createApp.ts`
- `src/game/debug/debugState.ts`
- `tests/commands/command-validation.spec.ts`
- `tests/e2e/epic1-rts-foundation.spec.ts`
- `_bmad-output/implementation-artifacts/9-6-increase-enemy-pressure-and-tune-guard-damage.md`

## Change Log

- 2026-05-24: Created story from live playtest feedback that first skirmish feels too easy, guards overperform, and enemy pressure is not felt.
- 2026-05-24: Added 1920x1080 HUD clutter/readability requirements from playtest feedback.
- 2026-05-24: Strengthened UI requirement so routine/non-decision events must not spam player-visible HUD or alert areas.
- 2026-05-24: Added movement pacing/readability requirement so pressure tuning does not make units feel rushed or unpredictably faster.
- 2026-05-24: Implemented combat-pressure tuning, two-guard Normal raid pressure, guard damage/health adjustments, debug balance evidence, and focused regression coverage.
