---
status: review
story_key: 8-5-persist-settings
epic: 8
story: 5
title: Persist Settings
---

# Story 8.5: Persist Settings

## Story
As a player,
I want audio/settings choices to persist,
So that the browser game remembers my preferences between sessions.

## Acceptance Criteria

**Given** I adjust music or SFX volume
**When** I reload the game
**Then** the saved settings are restored and applied to the audio buses.

## Tasks/Subtasks

- [x] Add settings UI for music and SFX volume.
- [x] Persist settings to `localStorage`.
- [x] Apply persisted settings to audio buses and debug state.
- [x] Add e2e coverage for saved setting restoration.

## Dev Notes

- Keep settings minimal for this story: music volume and SFX volume.
- Future settings can add difficulty, UI scale, and accessibility options.

## Dev Agent Record

### Implementation Plan

- Add range sliders to the right-side panel.
- Load settings before boot debug state is published.
- Save and apply slider changes immediately.
- Add e2e coverage using localStorage across reload.

### Debug Log

- Started implementation on 2026-05-16.
- Added Music and SFX volume sliders to the command panel.
- Added `localStorage` persistence under `wambasa-rts-settings`.
- Applied persisted values to audio gain buses and debug state.
- Validation passed: `npm run typecheck`, focused settings e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

Music and SFX volume settings now persist across reloads and apply immediately to the audio buses. Debug state exposes restored values for regression tests and future settings UI work.

## File List

- src/main.ts
- src/styles.css
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/8-5-persist-settings.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Implemented Story 8.5 persisted music/SFX volume settings and tests.
