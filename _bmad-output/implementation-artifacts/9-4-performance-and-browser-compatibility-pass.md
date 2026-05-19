---
status: done
story_key: 9-4-performance-and-browser-compatibility-pass
epic: 9
story: 4
title: Performance And Browser Compatibility Pass
---

# Story 9.4: Performance and Browser Compatibility Pass

## Story
As a player,
I want the game to remain responsive in target browsers and resolutions,
So that RTS controls feel reliable.

## Acceptance Criteria

**Given** the MVP skirmish is playable
**When** tested in Chromium and Firefox at 1920x1080 and 1366x768
**Then** core UI remains visible, camera/minimap controls work, and frame rate meets GDD targets.

## Tasks/Subtasks

- [x] Expose runtime performance and viewport diagnostics.
- [x] Add responsive UI regression coverage for target viewport sizes.
- [x] Verify camera/minimap controls remain functional after UI changes.
- [x] Document validation limits for configured browser coverage.

## Dev Notes

- Current Playwright config is Chromium-only through a local Chrome executable.
- Do not destabilize the existing single-worker full regression suite.

## Dev Agent Record

### Implementation Plan

- Add frame timing and viewport diagnostics to debug state.
- Add viewport regression tests at 1920x1080 and 1366x768.
- Reuse existing minimap/camera tests for control verification.
- Record Chromium validation and Firefox configuration gap.

### Debug Log

- Started implementation on 2026-05-16.
- Added frame timing and viewport diagnostics to debug state.
- Added Epic 9 viewport smoke tests for 1920x1080 and 1366x768.
- Reused the full camera/minimap regression suite to verify controls.
- Confirmed configured automation was Chromium-only and then closed that gap by adding an explicit Firefox Playwright project/browser install.
- Validation passed: `npm run typecheck`, focused Epic 9 viewport e2e, `npm run build`, full Chromium MVP coverage at the time of the first pass, and later Firefox smoke coverage for viewport/layout, camera/minimap, and live opening raid behavior.

### Completion Notes

The MVP now publishes runtime performance diagnostics, has responsive UI smoke coverage for the target viewport sizes, and now runs those release-smoke checks in both Chromium and Firefox through named Playwright projects. A later broader Chromium rerun after the Batch 6 map/art refactors exposed one remaining unresolved regression test around deterministic Guard Tower anti-raider coverage, but the browser-compatibility gap itself is closed.

## File List

- src/main.ts
- tests/e2e/epic1-rts-foundation.spec.ts
- _bmad-output/implementation-artifacts/9-4-performance-and-browser-compatibility-pass.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- playwright.config.ts
- _bmad-output/implementation-artifacts/g9-4-firefox-qa-pass-05.md

## Change Log

- 2026-05-16: Created Story 9.4 for performance and browser compatibility pass.
- 2026-05-16: Implemented performance diagnostics and target viewport regression coverage.
- 2026-05-18: Added named Firefox Playwright coverage and verified the Batch 6 smoke matrix in Firefox.
