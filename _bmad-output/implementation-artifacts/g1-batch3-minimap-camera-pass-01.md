# G1 Batch 3 Minimap/Camera Pass 01

Date: 2026-05-17

## Scope

First verified Batch 3 slice covering minimap viewport interaction and one direct camera command shortcut.

## Changes

- Minimap pointer behavior now distinguishes between:
  - clicking outside the viewport rectangle to recenter the camera
  - dragging inside the viewport rectangle to move the current camera view directly
- Added base-focus camera shortcut:
  - `Home`
  - `B`
- Camera focus now centers the player Factory Command Center and publishes the updated debug state immediately.

## Verification

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "moves canonical camera with minimap drag and mouse wheel zoom|drags the minimap viewport rectangle directly and can focus the player base with keyboard shortcut"`

## Result

This closes a first-pass implementation of the main `G1.1` interaction gap and part of `G1.2`.

## Remaining Batch 3 Work

- finish broader camera command polish beyond base-focus shortcut
- improve group collision/formation/stuck recovery under `G2.2`
- run a later manual feel pass once more of Batch 3 is complete
