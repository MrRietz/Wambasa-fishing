# G8.6 Effects Pass

Date: 2026-05-17

## Goal

Make player and AI actions visibly readable on top of the new bitmap art without adding a new app-level effects system.

## Implemented

- Bitmap unit and vehicle sprites now receive overlay effects instead of skipping procedural action feedback.
- Complete bitmap buildings now receive overlay damage, disabled, attack, production, and smoke feedback.
- Harvesting has stronger ore/spark feedback.
- Fishing has stronger line, splash, and wake feedback.
- Combat has muzzle flash, recoil pulse, and attack-charge feedback.
- Sabotage has pulse, spark, and device-line feedback.
- Build and repair have sparks and progress-like swipe effects.
- Truck and boat sprites expose cargo/load bars while carrying resources.
- `RenderPolishState` now exposes debug-visible effect flags: disabled pulse, attack charge, fishing ripple, and critical glow.

## Constraints

- No `createApp.ts` changes.
- Effects stay in `src/game/render/` and pure render-polish state.
- Simulation behavior, economy, command validation, and AI decisions are unchanged.

## Remaining

- Hand-authored effect atlases for final release polish.
- Better truck unload and boat unload sprite states.
- Damaged/destroyed bitmap variants for buildings and vehicles.
- Manual visual QA at RTS zoom.
