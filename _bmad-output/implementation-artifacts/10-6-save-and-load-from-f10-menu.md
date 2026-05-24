---
status: done
story_key: 10-6-save-and-load-from-f10-menu
epic: 10
story: 6
title: Save And Load From F10 Menu
---

# Story 10.6: Save And Load From F10 Menu

## Story
As a player,
I want to save and load my skirmish from local storage or a file through the F10 menu,
so that I can pause a match and continue it later.

## Acceptance Criteria

**Given** a skirmish is running or paused
**When** the player opens the F10 menu
**Then** Save, Load, Export Save File, and Import Save File controls are available without breaking existing pause/settings/restart flow.

**Given** the player saves locally
**When** the page reloads and Load is chosen
**Then** match state, entities, economy, map/fishing state, AI state, objectives, settings-compatible metadata, and stats are restored deterministically.

**Given** the player exports a save file
**When** the file is imported in the same app version or compatible schema version
**Then** the same restore path is used as local load.

**Given** a save is missing, corrupt, or incompatible
**When** Load/Import is attempted
**Then** the UI shows a clear error and the active match remains unchanged.

## Tasks / Subtasks

- [x] Define a versioned `SaveGameSnapshot` schema for simulation, entities, economy, map/fishing zone state, AI controller state, objectives, match stats, and random/deterministic fields needed to resume. (AC: 2, 3)
- [x] Implement save/load persistence under `src/game/persistence/` using localStorage plus JSON blob import/export. (AC: 1-4)
- [x] Add F10 menu controls and status feedback in the existing DOM HUD/pause menu. (AC: 1, 4)
- [x] Add restore plumbing in app/runtime without bypassing simulation boundaries. (AC: 2, 3)
- [x] Add unit tests for schema validation and Playwright tests for local save/load, export/import, corrupt import, and reload restore. (AC: 1-4)

## Dev Notes

- Settings persistence already uses `SETTINGS_STORAGE_KEY` and localStorage in `src/game/settings/playerSettings.ts`; save-game persistence should use a separate key and not mix with settings/audio preferences.
- Existing pause/F10 menu code is in `src/game/ui/domShell.ts`, `src/game/ui/hudPresenter.ts`, and `src/app/createApp.ts`.
- Avoid serializing Pixi objects, DOM nodes, audio objects, or functions. Save only data-owned gameplay truth.
- The save system must respect architecture boundaries: simulation/data state is canonical; rendering resyncs after load.
- Include schema version and app/build compatibility fields so future changes can reject or migrate safely.

### References

- `_bmad-output/game-architecture.md#Persistence`
- `_bmad-output/game-architecture.md#State Management`
- `src/game/settings/playerSettings.ts`
- `src/game/debug/debugState.ts`
- `src/game/entities/components.ts`
- `src/app/createApp.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --grep "saves, loads, exports"`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Implemented versioned save/load/import/export flow with F10 controls, restore plumbing, and focused tests.

- Added versioned `SaveGameSnapshot` persistence under `src/game/persistence/saveGame.ts` with schema validation and localStorage helpers.
- Added F10 menu Save, Load, Export, and Import controls with clear success/error status feedback.
- Restore now replaces canonical gameplay arrays/state objects and re-syncs render, fog, HUD, pause state, and debug state.
- Added command tests for snapshot round-trip, corrupt JSON, incompatible schema, and invalid schema rejection.
- Added Playwright coverage for visible F10 controls, local save/load after state mutation, export download, corrupt import rejection, and valid import restore. Reload restore is covered through the localStorage load path rather than an automatic boot load.

### File List

- `src/game/persistence/saveGame.ts`
- `src/game/ui/domShell.ts`
- `src/styles.css`
- `src/app/createApp.ts`
- `tests/commands/command-validation.spec.ts`
- `tests/e2e/epic1-rts-foundation.spec.ts`
