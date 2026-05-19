# G8.5 UI Readability and Settings Pass

Date: 2026-05-17

## Goal

Make the RTS UI easier to read and less brittle during playtesting by adding persistent player-facing settings without breaking the current architecture boundaries.

## Implemented

- Added persisted player settings for UI scale, edge scrolling, and difficulty selection.
- Added a settings panel section for UI scale, edge scroll toggle, and difficulty.
- Applied UI scale through a CSS variable so the right-side RTS panel can be enlarged without rebuilding layout code.
- Routed edge-scroll behavior through the persisted setting.
- Exposed settings in the RTS debug snapshot for E2E verification.
- Preserved existing audio settings by merging all settings into the same localStorage payload safely.
- Updated the epic gap report with G8.5 status and remaining UI polish work.

## Verification

- `npm run build`
- `npm run test:architecture`
- Focused Playwright settings/layout checks
- `npm run test:commands`
- `npm run test:art`
- `npm run test:mvp -- --reporter=line`

Latest full MVP result: 58 passed.

## Remaining

- Deeper command-panel consolidation.
- 1280x720 readability verification.
- Difficulty setting should affect live AI economy/aggression tuning in a later balance pass.
- Final effects and feedback pass should continue under G8.6.
