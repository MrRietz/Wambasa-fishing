---
status: done
story_key: 10-5-1080p-menu-and-ui-scale-pass
epic: 10
story: 5
title: 1080p Menu And UI Scale Pass
---

# Story 10.5: 1080p Menu And UI Scale Pass

## Story
As a player on a 1920x1080 screen,
I want the F10 menu, HUD, minimap, command panel, and settings to scale cleanly,
so that core controls are readable without overlap or clipped panels.

## Acceptance Criteria

**Given** the viewport is 1920x1080
**When** the game is at the start/F10 menu, paused, and in active play with common selections
**Then** no menu, HUD, minimap, command, result, alert, or settings text overlaps or clips.

**Given** the player changes UI scale
**When** scale is set to min/default/max supported values
**Then** the HUD remains usable at 1920x1080 and existing smaller desktop targets.

**Given** the command panel is populated by Factory, Worker, Dock, Guard, Truck, Boat, Saboteur, Barracks, and Tech Lab selections
**When** each state renders at 1920x1080
**Then** primary actions remain visible without awkward internal scrolling during normal play.

## Tasks / Subtasks

- [x] Audit `src/styles.css` at 1920x1080 for pause/F10 menu, command rail, minimap, alert feed, results, and settings. (AC: 1)
- [x] Tighten responsive rules using stable dimensions/constraints instead of viewport-scaled font sizes. (AC: 1, 2)
- [x] Verify UI scale bounds in `src/game/settings/playerSettings.ts` still make sense for 1080p and laptop targets. (AC: 2)
- [x] Add Playwright screenshots/assertions for F10 menu and selected-command states at 1920x1080. (AC: 1, 3)
- [x] Preserve existing coverage for 1280x720, 1366x768, and 1440x900. (AC: 2)

## Dev Notes

- The F10/pause panel markup is in `src/game/ui/domShell.ts`; sync behavior is in `src/game/ui/hudPresenter.ts`; CSS is in `src/styles.css`.
- Existing settings persist UI scale via `src/game/settings/playerSettings.ts` with `--rts-ui-scale`.
- Do not solve this by hiding required controls. The player should keep access to core RTS actions in normal selected states.
- Follow the UX spec: dense classic RTS right rail, battlefield dominant, scan-first labels, compact action tiles.
- Tests already include viewport matrix coverage in `tests/e2e/epic1-rts-foundation.spec.ts`; extend rather than duplicate.

### References

- `_bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision`
- `_bmad-output/planning-artifacts/epic-gap-stories.md#G8.5A RTS UX Recovery Pass`
- `src/game/ui/domShell.ts`
- `src/game/ui/hudPresenter.ts`
- `src/styles.css`
- `src/game/settings/playerSettings.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run test:commands`
- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts --grep "keeps F10 menu|keeps core UI visible"`
- `npm run build`

### Completion Notes List

- 2026-05-24: Marked done. Added 1920x1080 F10/UI-scale layout assertions and kept viewport matrix coverage green.

- Included the new Building Orders Sell action in the command icon/layout coverage.
- Verified the existing 85/100/115 UI scale bounds and kept them unchanged.
- Added 1920x1080 F10/pause menu and common selected-command-state layout assertions across Chromium and Firefox.
- Updated the existing viewport matrix test to assert visible command-panel structure when no selection readout is expected.

### File List

- `src/styles.css`
- `tests/e2e/epic1-rts-foundation.spec.ts`
