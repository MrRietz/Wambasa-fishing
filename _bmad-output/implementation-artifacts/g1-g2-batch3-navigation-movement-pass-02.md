# Batch 3 Navigation and Movement Pass 02

Date: 2026-05-17

Scope:

- `G1.1` minimap viewport drag
- `G1.2` camera focus and navigation feel
- `G2.2` group collision, arrival, and stuck-recovery polish

Implemented:

- Direct minimap viewport-rectangle drag now moves the live camera instead of only recentring.
- `Home` and `B` now focus the player base.
- Land movement now tracks stalled units and requests a fresh nearby land path when they stop making progress.
- Final-leg arrival handling now collapses duplicate/near-duplicate waypoints and settles crowded land arrivals instead of leaving trucks orbiting the last slot.
- Group movement regression now verifies separated arrival slots and settled idle end states in open terrain.

Verification:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "supports shift-select and drag-select for worker groups|routes move commands around central blockers with a waypoint path|reserves distinct destinations and keeps group-moved units separated|drags the minimap viewport rectangle directly and can focus the player base with keyboard shortcut|moves canonical camera with minimap drag and mouse wheel zoom"`

Notes:

- This closes Batch 3 for the current first-pass engineering scope.
- Remaining future camera/movement work is feel-tuning and release-level play validation, not missing baseline RTS controls.
