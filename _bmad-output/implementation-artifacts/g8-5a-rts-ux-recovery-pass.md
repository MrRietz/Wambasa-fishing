# G8.5A RTS UX Recovery Pass

Date: 2026-05-17

Status: Done first pass.

## Implemented

- Moved settings out of the always-visible command stack into a compact collapsed Options control.
- Reworked the right-side UI into clearer RTS regions: identity/start, tactical map/economy, command console, battlefield intel, and options.
- Converted production, build, and tactical controls into a predictable command-grid layout while preserving existing DOM IDs and accessible labels.
- Kept the minimap in its own panel and moved economy directly under it for faster glance reading.
- Added compact-height rules for laptop resolutions so primary command controls remain visible.
- Added Epic 9 viewport coverage for 1280x720, 1366x768, 1440x900, and 1920x1080.

## Validation

- `npm run build`
- `npm run test:architecture`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "Epic 9 MVP polish" --reporter=line`
- `npm run test:mvp -- --reporter=line`

## Notes

This does not implement the full pause/options modal from G9.2. It only removes options from the normal command stack so the current RTS controls are usable before the pause flow is added.
