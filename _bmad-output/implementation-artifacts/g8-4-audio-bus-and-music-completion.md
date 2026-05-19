# G8.4 Audio Bus and Music Completion

Date: 2026-05-17

## Goal

Make browser-native audio feel more like active RTS music and feedback rather than low-volume ambience.

## Changes

- Added Master, Music, SFX, UI, and Alerts gain buses.
- Added audio debug state for all bus volumes and current music layer.
- Expanded music director behavior with `calm`, `tension`, and `combat` layers.
- Warning and combat cues temporarily push music into tension/combat layers.
- Expanded SFX cues: command confirm/error, produce, harvest, unload, fish, build, repair, sabotage, warning, victory, defeat, resource, and combat.
- Added regression coverage for richer buses and warning/tension behavior.

## Verification

- `npm run build`
- `npm run test:architecture`
- `npm run test:commands`
- `npm run test:art`
- `npm run test:mvp -- --reporter=line` -> 57 passed

## Epic Progress Snapshot

Overall estimate: `[████████████░░░░░░░░] 60%`

- Complete/functionally covered: Epics 3, 6, 7.
- Mostly covered but needs polish: Epics 1, 2, 4, 5, 8.
- Integration/playtest hardening remains: Epic 9.

## Next GDD Step

Continue with `G8.5 UI Readability and Settings Completion`, unless a P0 manual playtest blocker appears first.

