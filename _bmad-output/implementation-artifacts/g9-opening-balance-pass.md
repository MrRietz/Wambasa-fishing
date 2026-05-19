# G9 Opening Balance Pass

Date: 2026-05-17

## Goal

Make manual playtesting possible before continuing deeper GDD gameplay gaps.

## Changes

- Player profit target increased to `1600`.
- AI profit target increased to `2000`.
- Player and AI now both start with `280` metal.
- AI opening logic now waits `8s` before starting.
- First AI raid grace period is now `90s`.
- Debug-only forced raid now creates deterministic warning/damage state for tests without making live raids immediate.

## Verification

- `npm run test:architecture`
- `npm run build`
- `npm run test:art`
- `npm run test:commands`
- `npm run test:mvp -- --reporter=line` -> 56 passed

## Next GDD Step

Continue Epic 8 polish before more feature breadth:

1. `G8.3` vehicle and building animation polish.
2. `G8.4` richer music and action SFX.
3. `G8.5` UI readability/settings pass.

