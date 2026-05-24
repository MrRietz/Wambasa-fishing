---
status: done
story_key: 8-4-add-audio-unlock-music-and-sfx-buses
epic: 8
story: 4
title: Add Audio Unlock, Music, and SFX Buses
---

# Story 8.4: Add Audio Unlock, Music, and SFX Buses

## Story
As a player,
I want music and command sounds to work reliably in the browser,
So that the game has energy instead of silent or white-noise ambience.

## Acceptance Criteria

**Given** browser audio requires user gesture unlock
**When** I press Start Skirmish Shell or interact with the game
**Then** audio unlocks, an industrial/coastal music loop starts, and command SFX play through separate music/SFX buses.

## Tasks/Subtasks

- [x] Add Web Audio unlock flow and debug state.
- [x] Add separate music and SFX bus volumes.
- [x] Add a richer synthesized industrial/coastal music loop without white noise ambience.
- [x] Trigger command/production/combat SFX from existing game events.
- [x] Add e2e/debug coverage for unlock and bus state.

## Dev Notes

- Use browser-native Web Audio; do not add external dependencies.
- Keep generated tones deterministic and lightweight until authored audio assets exist.

## Dev Agent Record

### Implementation Plan

- Add audio engine state, unlock function, music scheduler, and SFX helpers in `src/main.ts`.
- Add Start button text/status behavior and debug state for tests.
- Trigger SFX from `reportCommandResult`, production/resource/combat events where safe.

### Debug Log

- Started implementation on 2026-05-16.
- Added Web Audio unlock from Start Skirmish Shell.
- Added separate music and SFX gain buses with debug state.
- Added deterministic industrial/coastal synthesized tone loop using bass and lead notes, with no white-noise ambience.
- Added command, error, production, resource, and combat SFX cues.
- Validation passed: `npm run typecheck`, focused audio e2e, `npm run build`, full `npm run e2e`.

### Completion Notes

Audio now unlocks from a user gesture, starts a music loop when supported, exposes bus/debug state, and plays deterministic command/SFX cues through a separate SFX bus. The implementation uses browser-native Web Audio only and avoids ambience/noise-based background audio.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/8-4-add-audio-unlock-music-and-sfx-buses.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-05-16: Implemented Story 8.4 Web Audio unlock, music loop, SFX buses, and tests.


## Dev Agent Record

### Completion Notes List

- 2026-05-24: Marked done. Verified Web Audio unlock and bus debug state with focused audio e2e plus typecheck.
