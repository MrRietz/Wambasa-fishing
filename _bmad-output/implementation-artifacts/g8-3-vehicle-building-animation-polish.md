# G8.3 Vehicle and Building Animation Polish

Date: 2026-05-17

## Goal

Make non-humanoid RTS objects feel active and make the polish state testable.

## Changes

- Added `src/game/render/renderPolishState.ts` as a reusable render-state helper.
- Trucks now expose and render wheel motion plus cargo-load indication.
- Boats now expose and render stronger wake activity while moving/fishing.
- Buildings now expose and render production activity, construction activity, and damage smoke.
- Debug state now includes `renderPolish` per entity so acceptance tests can validate visual state without screenshots.
- E2E tests now cover truck cargo/wheel motion, boat wake, building production activity, construction activity, and damage smoke.

## Verification

- `npm run build`
- `npm run test:architecture`
- `npm run test:art`
- `npm run test:commands`
- `npm run test:mvp -- --reporter=line` -> 56 passed

## Next GDD Step

Continue with `G8.4 Audio Bus and Music Completion`: richer industrial-coastal music layers and action SFX.

