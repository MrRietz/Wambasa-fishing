# MVP Regression Coverage

Command: `npm run test:mvp`

Current suite size: 50 Playwright tests.

Suite: `tests/e2e/epic1-rts-foundation.spec.ts`

## Required Coverage

- Boot/render smoke: PixiJS shell, map data, layers, overlays, debug state.
- Camera/minimap: minimap drag, camera movement, wheel zoom.
- UI layout: target viewport smoke checks at 1920x1080 and 1366x768.
- Selection/commands: click select, shift-select, drag-select, right-click command dispatch.
- Movement/pathing/collision: invalid commands, A* route around blockers, destination reservation, unit separation.
- Land economy: Factory, metal fields, truck harvest, return/unload, resource readout.
- Production/building: Factory queue, worker/truck production, worker placement, House, Dock, Guard Tower, repair.
- Sea economy: boat production, water movement, fishing zones, dock unload, cash victory.
- AI skirmish: rival base, harvest, production, dock, fishing income, raid warning, raid damage.
- Combat/sabotage/defense: guard attacks, damage states, destroyed targets, saboteur disable/recovery, boat sinking, Guard Tower auto-engage.
- Audio/settings: audio unlock, music/SFX buses, persisted volume settings.
- MVP polish: objective flow, alerts, explicit balance values, result summary/restart, performance diagnostics.

## Browser Coverage Note

The current Playwright configuration runs through the local Chromium executable. Firefox compatibility remains a runner configuration task before release-hardening, but the MVP suite itself is browser-portable Playwright coverage.
