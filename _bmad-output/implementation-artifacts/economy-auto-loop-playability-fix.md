# Economy Auto Loop Playability Fix

Date: 2026-05-17

## Goal

Remove the manual-repeat blocker that made the RTS economy unplayable.

## Changes

- Metal haulers now automatically return to the same metal field after unloading at the Factory.
- Fishing boats now remember their selected fishing zone.
- Fishing boats automatically return to Dock when full, sell fish, then sail back to the fishing zone.
- Manual boat move and Stop clear the auto-fishing loop.
- Debug state exposes `autoFishZoneId` so automated tests can verify the loop.

## Verification

- `npm run build`
- `npm run test:architecture`
- `npm run test:commands`
- `npm run test:art`
- `npm run test:mvp -- --reporter=line` -> 56 passed

## Next GDD Step

Continue with `G8.4 Audio Bus and Music Completion`, unless manual playtest reveals another P0 economy/control blocker.

