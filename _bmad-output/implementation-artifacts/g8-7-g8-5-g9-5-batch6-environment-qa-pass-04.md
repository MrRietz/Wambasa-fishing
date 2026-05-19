# Batch 6 Environment and QA Pass 04

Date: 2026-05-18

Scope:

- continue `G8.7` with stronger shoreline, harbor, base, and road landmarking
- rerun the desktop readability/viewport matrix after the new environment pass
- confirm the autonomous opening raid still works on the recomposed battlefield

Implemented:

- strengthened backdrop integration and atmospheric layering
- added broader scene masses so player base, center lane, and rival coast read as distinct spaces
- added extra shoreline foam/highlight treatment and stronger road/lane striping
- added harbor pier silhouettes and base-area landmark framing
- improved blocker highlight treatment so choke landmarks read better at play zoom
- slightly strengthened side-panel/readability contrast for the release UI pass

Verification:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "keeps core UI visible and publishes performance diagnostics at 1280x720|keeps core UI visible and publishes performance diagnostics at 1366x768|keeps core UI visible and publishes performance diagnostics at 1440x900|keeps core UI visible and publishes performance diagnostics at 1920x1080|AI rival launches a live opening raid without debug forcing after the grace window|moves canonical camera with minimap drag and mouse wheel zoom|drags the minimap viewport rectangle directly and can focus the player base with keyboard shortcut"`

Result:

- the battlefield now reads more like an authored coastal skirmish scene instead of a flat systems board
- the desktop readability/viewport matrix is still green after the visual pass
- remaining Batch 6 work is mostly the manual/browser tail: Firefox-specific review and a human long-session feel pass
