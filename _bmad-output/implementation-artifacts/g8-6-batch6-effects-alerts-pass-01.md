## Batch 6 - G8.5 / G8.6 Effects and Attack Readability Pass 01

Status: verified

Scope completed:

- Wired the production bitmap effect assets into the live Pixi render path through the dedicated effects layer.
- Added runtime effect sprites for construction, repair, harvesting, fishing, attack fire, sabotage/disabled states, and damage smoke.
- Improved attack readability by strengthening warning-alert styling during combat without destabilizing existing status-text coverage.
- Kept focused combat, repair, fishing, and alert flows green after the render-layer change.

Verification run:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "AI rival emits a raid warning and sends a raider at exposed player economy|dock attack warnings are actionable and rate-limited against repeated forced raids|guard attack mode shows hover targeting and range preview for valid enemy targets|selected fishing boat can harvest fish from a fishing zone|damaged boats can return to Dock for paid repair|worker repairs a damaged friendly building|Dock can produce a separate attack boat that can sink enemy boats"`

Result:

- `G8.6` first-pass runtime effect usage is now real, not only manifest-tracked.
- `G8.5` attack-warning readability improved, but broader long-session UI cleanup and browser review remain open.
