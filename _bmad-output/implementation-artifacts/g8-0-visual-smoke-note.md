# G8.0 Visual Smoke Note

Date: 2026-05-17

## Scope

Focused visual smoke verification for the current production-art integration slice under Story `8-0-production-imagegen-art-batch`.

## Verified Runtime Art Usage

- Production building sprites remain active for:
  - Factory Command Center
  - Dock
  - House
  - Guard Tower
- Production unit animation/runtime sprite sets remain active for:
  - Worker
  - Guard
  - Saboteur
  - Truck
  - Boat
- Generated terrain backdrop candidate is now visible as a first-pass background layer.
- Metal fields now render with the production bitmap resource sprite while retaining procedural depletion cues.
- Fishing zones now render with a generated bitmap marker instead of the temporary SVG placeholder.
- The production effect set now has generated bitmap runtime cutouts for construction, repair, harvest, fishing, muzzle flash, sabotage, and smoke instead of SVG placeholders in the manifest/runtime folder.
- Runtime now uses damaged/destroyed production bitmap building variants for the Factory Command Center, Dock, House, and Guard Tower.
- Runtime now uses damaged/destroyed and unload vehicle bitmap states for trucks and fishing boats.

## Validation Executed

- `npm run test:art`
- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "selected fishing boat can harvest fish from a fishing zone|contested fishing zone pays more cash and shows higher-yield zone details"`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "Epic 9 MVP polish"`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "initializes Factory Command Center economy components and metal fields|queues truck harvest command by right-clicking a metal field"`

## Readability Findings

- The terrain backdrop can be layered under the existing painted terrain without breaking command/UI readability.
- Fishing-zone markers remain readable in both safe and contested variants after switching to the generated bitmap.
- Metal-field art improves terrain legibility without hiding the depletion/readability cues that the procedural circles still provide.
- Core effect assets are now represented by production bitmap cutouts in the runtime art set, reducing the remaining placeholder footprint even though effect playback still uses the existing runtime systems.
- Existing gameplay-facing overlays such as selection, attack, and placement feedback remain visible on top of the art changes.
- Damage-state building swaps and unload/damaged vehicle state swaps now happen through the same runtime animation/render path instead of falling back to healthy-state art.

## Remaining Visual Gaps

- Final hand-polish and atlas cleanup still remain for some generated assets.
- Effect assets now exist as first-pass bitmap cutouts, but they still need deeper runtime integration tuning and visual cleanup.
