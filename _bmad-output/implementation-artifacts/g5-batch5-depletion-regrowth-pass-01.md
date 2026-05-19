## Batch 5 - G5.2 Depletion and Regrowth Pass 01

Status: verified

Scope completed:

- Added mutable fishing-zone stock state with `maxFish` and `regrowthPerSecond`.
- Fishing boats now reduce zone stock while harvesting instead of pulling from an infinite source.
- Depleted zones stop active fishing, trigger a partial-catch return to Dock, and surface a player-facing depletion message.
- Selection readout now exposes poor-yield state for low-stock fishing zones.
- Terrain rendering now reflects zone abundance so depleted zones are visually dimmer than healthy zones.
- Added a debug hook to force zone stock during e2e coverage.

Verification run:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "selected fishing boat can harvest fish from a fishing zone|loaded fishing boat returns to Dock and sells fish for cash|contested fishing zone pays more cash and shows higher-yield zone details|depleted fishing zones return partial catch, warn about poor yield, and regrow over time"`

Result:

- `G5.2` is done first pass for the current GDD batch workflow.
- Remaining Batch 5 work is `G5.3` dock and boat recovery / repair.
