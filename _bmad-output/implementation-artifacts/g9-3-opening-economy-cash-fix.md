# G9.3 Opening Economy Cash Fix

Date: 2026-05-17

## Problem

The live RTS build earned `cash` from fishing but did not spend it anywhere meaningful. In practice, all active production and construction costs were paid only in `metal`, so the dual-economy promise in the GDD was not reflected in the opening loop.

## Fix Shipped

- Added seeded starting cash for player and AI so the early game remains playable while cash becomes a real resource.
- Added mixed `metal + cash` production costs for:
  - Guard
  - Saboteur
  - Fishing Boat
- Updated command validation and UI labels so insufficient cash is surfaced clearly instead of silently failing.
- Preserved metal-only costs for the basic land-economy backbone:
  - Worker
  - Metal Hauler
  - House
  - Dock
  - Guard Tower
- Fixed right-click command routing so saboteur-only selections prefer sabotage on enemy buildings, while guard selections still prefer attack.

## Verification

- `npm run typecheck`
- `npm run test:commands`
- Focused Playwright coverage:
  - guard production
  - saboteur production
  - boat production
  - fish sale cash gain
  - AI fishing cash independence
  - unrecoverable-economy defeat
  - sabotage command routing

## Outcome

`Cash` now functions as a real second resource in the first skirmish instead of a pure victory counter. Fishing income directly feeds additional naval pressure and combat/sabotage production, which better matches the GDD's land-and-sea economy goal.
