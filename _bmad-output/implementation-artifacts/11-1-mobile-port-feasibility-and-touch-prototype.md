---
status: done
story_key: 11-1-mobile-port-feasibility-and-touch-prototype
epic: 11
story: 1
title: Mobile Port Feasibility And Touch Prototype
---

# Story 11.1: Mobile Port Feasibility And Touch Prototype

## Story
As a developer and designer,
I want to prototype a mobile control and HUD model for Wambasa Fishing Wars,
so that we can decide whether a mobile port is viable without damaging the desktop RTS experience.

## Acceptance Criteria

**Given** the game is opened on a phone-sized or tablet-sized viewport
**When** mobile mode is enabled
**Then** the game shows a playable touch-first prototype layout instead of the desktop right-rail HUD squeezed onto a small screen.

**Given** the player uses touch input
**When** they select units, pan/zoom, issue move/harvest/build/fish/attack commands, and open the menu
**Then** each action has a deliberate mobile interaction path with readable feedback and no dependency on hover, right-click, or keyboard hotkeys.

**Given** a complete first-skirmish loop is attempted on mobile
**When** the player harvests, builds, fishes, defends, raids, and wins/loses
**Then** the prototype records blockers, mis-taps, unreadable UI, performance issues, and control friction.

**Given** desktop mode is used
**When** the mobile prototype exists
**Then** desktop mouse/keyboard RTS controls, layout, tests, and performance remain unchanged.

## Tasks / Subtasks

- [x] Define mobile target classes: phone portrait, phone landscape, tablet landscape, and minimum viable supported size. (AC: 1)
- [x] Add a mobile input mode behind a feature flag or responsive gate, preserving desktop controls. (AC: 2, 4)
- [x] Prototype touch controls: one-finger select/tap, drag box alternative, two-finger pan/zoom, long-press/context command, and command-mode buttons for move/attack/build. (AC: 2)
- [x] Prototype a mobile HUD: bottom command tray, collapsible minimap/intel, large command buttons, selected unit drawer, and F10/pause equivalent. (AC: 1, 2)
- [x] Run a first-skirmish mobile playtest script and save findings under implementation artifacts. (AC: 3)
- [x] Add Playwright/mobile viewport smoke tests for boot, selection, command issuing, menu, and no desktop regression. (AC: 1-4)

## Dev Notes

- Current GDD and UX explicitly target browser-first desktop PC, mouse/keyboard, and exclude mobile from MVP scope. Treat this as an exploratory port story, not an MVP requirement.
- Rendering can likely stay PixiJS; simulation state should stay unchanged. The main work is `input/`, `camera/`, `ui/`, CSS layout, and test coverage.
- Avoid hover-only UI. Mobile must use visible command modes and large touch targets.
- Avoid right-click assumptions. Context commands need explicit touch equivalents, such as selected unit -> command button -> tap target.
- Camera controls need a clear touch model: two-finger pan/zoom or one-finger map pan with command mode separation.
- Do not compromise desktop UX to make mobile fit. Mobile should be a separate presentation/input mode sharing simulation systems.

### Functional Mobile Model To Prototype

- Tap selectable entity: select.
- Drag on empty terrain: pan camera, unless in selection mode.
- Two-finger pinch: zoom.
- Two-finger drag: pan without issuing commands.
- Command button + tap target: move, harvest, build, repair, fish, attack, sabotage.
- Long-press target: optional context menu, not the only way to command.
- Bottom tray: selected entity, primary commands, production/build queue.
- Collapsible side/top panel: minimap, economy, objectives, alerts.
- Pause/menu button: visible touch button replacing keyboard-only F10.

### References

- `_bmad-output/gdd.md#Target Platform(s)`
- `_bmad-output/gdd.md#Out of Scope`
- `_bmad-output/game-architecture.md#Camera and Minimap`
- `_bmad-output/game-architecture.md#UI Architecture`
- `_bmad-output/planning-artifacts/ux-design-specification.md#Platform Strategy`
- `src/game/input/`
- `src/game/camera/`
- `src/game/ui/`
- `src/styles.css`
- `tests/e2e/epic1-rts-foundation.spec.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Added a responsive/forced mobile prototype mode via `data-mobile-mode` and `?mobile=1`.
- Added a bottom mobile command tray with Select, Order, Move, Attack, and Menu controls.
- Reused the existing desktop command handlers through a shared smart-command path so mobile orders do not fork simulation behavior.
- Added a canvas input guard for UI buttons inside the viewport, fixing tray clicks that were being swallowed by selection/pan handling.
- Added prototype two-finger pinch/pan handling, touch empty-terrain drag panning, and long-press smart orders.
- Added mobile smoke coverage for boot/HUD/menu and explicit command-mode issuing.

### Completion Notes List

- 2026-05-24: Marked done. Mobile prototype gated by responsive/forced mode with touch command tray, long-press smart orders, mobile smoke tests, desktop UI regression, command tests, typecheck, and build passing.

- Mobile target classes, minimum size, prototype findings, and blockers are recorded in `_bmad-output/implementation-artifacts/11-1-mobile-port-playtest-findings.md`.
- Desktop remains gated off at normal widths; the mobile tray is hidden on desktop and existing 1920x1080/menu regression coverage passes.
- Long-press issues a prototype smart order when a unit is already selected; the explicit command-mode tray remains the primary non-right-click command path.

### File List

- _bmad-output/implementation-artifacts/11-1-mobile-port-feasibility-and-touch-prototype.md
- _bmad-output/implementation-artifacts/11-1-mobile-port-playtest-findings.md
- src/app/createApp.ts
- src/game/ui/domShell.ts
- src/styles.css
- tests/e2e/epic1-rts-foundation.spec.ts
