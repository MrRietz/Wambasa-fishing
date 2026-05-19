---
status: done
story_key: 8-0-production-imagegen-art-batch
epic: 8
story: 0
title: Production Imagegen Art Batch
---

# Story 8.0: Production Imagegen Art Batch

## Story
As a player,
I want the world, units, buildings, resources, and UI portraits to share one polished generated art direction,
So that the game no longer feels like a placeholder RTS.

## Acceptance Criteria

**Given** the current runtime art pipeline and art bible already exist  
**When** the first production bitmap batch is generated, cleaned, normalized, and integrated  
**Then** the runtime uses cohesive production-ready assets for the core skirmish roster  
**And** required assets are validated from manifest/data instead of being silently missing.

**And specifically:**

- Imagegen prompts are created from `docs/imagegen-art-bible.md` for one cohesive RTS batch.
- First production batch includes terrain/backdrop, Factory Command Center, Dock, House/Barracks, Guard Tower, Metal Field, Fishing Zone marker, Worker, Guard, Saboteur, Truck, Boat, and core action/effect sprites.
- Generated outputs are saved under `public/assets/generated/`, cleaned/normalized into `public/assets/processed/`, and only runtime-ready assets are referenced from `public/assets/runtime/`.
- Runtime code does not reference raw generated assets directly.
- Worker, guard, saboteur, truck, and boat sprites have readable silhouettes at normal RTS zoom.
- A visual smoke test or asset manifest validation fails if a required production bitmap asset is missing.

## Tasks / Subtasks

- [x] Finalize the first cohesive production batch list and map each required asset to a runtime destination.
- [x] Generate or refresh missing raw imagegen outputs under `public/assets/generated/g8-production/`.
- [x] Normalize/crop/alpha-clean selected outputs into `public/assets/processed/g8-production/`.
- [x] Publish only runtime-ready files and manifests under `public/assets/runtime/`.
- [x] Replace remaining placeholder references in runtime manifests/loaders where production assets now exist.
- [x] Fill the highest-value remaining visual gaps:
  - damaged/destroyed building variants
  - damaged/destroyed vehicle variants
  - vehicle unload/full-cargo state variants
  - core effect atlases or cutouts
- [x] Add or extend manifest validation so missing required production assets fail visibly in dev/test.
- [x] Add a focused visual smoke check or regression note covering readability at normal RTS zoom.

## Dev Notes

### Current Repo State

- The project already has an art bible and first-pass production asset imports.
- Runtime bitmap candidates already exist for core buildings and units.
- Worker, guard, saboteur, truck, and boat directional PNG slices are already wired into runtime folders.
- Complete Factory, Dock, House/Barracks, and Guard Tower entities already render through production bitmap sprites with lightweight procedural overlays for damage/disabled/attack state.

### Existing Inputs

- `_bmad-output/planning-artifacts/epic-gap-stories.md`
- `_bmad-output/implementation-artifacts/g8-0-imagegen-production-art-plan.md`
- `docs/imagegen-art-bible.md`
- `public/assets/generated/g8-production/`
- `public/assets/processed/g8-production/`
- `public/assets/runtime/g8-production/`
- `public/assets/runtime/units/`

### Architecture / Implementation Constraints

- Keep raw imagegen outputs out of runtime references.
- Preserve the existing generated -> processed -> runtime asset flow.
- Prefer data/manifest-driven integration; do not hard-code one-off frame hacks if a manifest path already exists.
- Preserve current runtime fallbacks where production art is still incomplete, but make missing critical assets developer-visible.
- Optimize for RTS readability at normal zoom over decorative detail.

### Suggested Implementation Order

1. Audit current runtime asset coverage against the G8.0 required matrix.
2. Close the biggest visible omissions for buildings, units, and fishing/resource markers.
3. Add damaged/destroyed and state-variant coverage for the most visible gameplay entities.
4. Tighten validation and visual smoke coverage last, once the manifest/runtime set stabilizes.

### Validation

- `npm run typecheck`
- Existing asset validation test/script if present
- Focused visual/runtime smoke for asset presence and manifest integrity
- Targeted Playwright smoke if UI/runtime references change

## Risks / Watchouts

- Avoid mixing inconsistent camera angles or silhouette scales between unit sets.
- Avoid wiring generated source files directly into runtime code.
- Avoid replacing existing readable runtime assets with prettier but less legible art.
- Do not regress current selection, attack, or state overlays while swapping visuals.

## Definition of Done

- Core skirmish entities and markers use cohesive production art in runtime.
- Remaining placeholder/fallback usage is intentional and documented.
- Manifest/runtime validation catches missing required production assets.
- Readability at normal RTS zoom is verified for core units/buildings.

## Change Log

- 2026-05-17: Created Story 8.0 from the GDD gap backlog and existing G8.0 planning memo.
- 2026-05-17: Implemented production art coverage manifest expansion, runtime resource/effect placeholder assets, and dev-visible validation for required production art entries.
- 2026-05-17: Added the first generated terrain backdrop candidate to the repo pipeline and tracked it in the production art manifest.
- 2026-05-17: Integrated the production fishing-zone marker asset into runtime terrain rendering so fishing zones no longer rely on circles alone.
- 2026-05-17: Integrated the generated terrain backdrop candidate into runtime terrain rendering as a first-pass production background layer.
- 2026-05-17: Replaced the temporary fishing-zone marker SVG with a generated bitmap PNG promoted through the full generated -> processed -> runtime pipeline.
- 2026-05-17: Added a focused G8.0 visual smoke note covering runtime art usage and readability checks at current RTS zoom.
- 2026-05-17: Integrated the production metal-field bitmap into runtime terrain rendering while preserving procedural depletion readability overlays.
- 2026-05-17: Replaced the placeholder SVG effect entries in the production art manifest with generated bitmap cutouts extracted from a chroma-keyed production effects sheet.
- 2026-05-17: Wired damaged/destroyed building sprites plus damaged/destroyed and unload vehicle animation variants into the live runtime renderer/state resolver.

## Dev Agent Record

### Debug Log

- 2026-05-17: Started Story 8.0 from the newly created ready-for-dev story artifact.
- 2026-05-17: Audited current generated, processed, and runtime art coverage against the G8.0 required batch.
- 2026-05-17: Expanded `public/assets/runtime/g8-production/production-art-manifest.json` with required production batch groups and explicit runtime coverage entries.
- 2026-05-17: Added runtime-ready fishing-zone marker and core effect placeholder assets under `public/assets/runtime/g8-production/`.
- 2026-05-17: Added `tests/art/validate-production-art-manifest.mjs` and extended `npm run test:art` to fail when required production art entries or files are missing.
- 2026-05-17: Validation passed: `npm run test:art`, `npm run typecheck`.
- 2026-05-17: Generated `terrain-backdrop-v1.png`, imported it into `public/assets/generated/g8-production/`, normalized it into `public/assets/processed/g8-production/`, and tracked it in the production art manifest.
- 2026-05-17: Revalidated `npm run test:art`, `npm run typecheck` after the new backdrop entry.
- 2026-05-17: Wired `fishing-zone-marker-v1.svg` into terrain rendering through the shared sprite loader and revalidated focused sea-economy e2e coverage.
- 2026-05-17: Wired `terrain-backdrop-v1.png` into the shared sprite loader and terrain renderer, then revalidated art checks and Epic 9 UI/performance smoke coverage.
- 2026-05-17: Generated `fishing-zone-marker-v2.png`, removed its chroma background into a processed alpha PNG, promoted it into runtime resources, switched the manifest/loader to the bitmap version, and revalidated sea-economy smoke coverage.
- 2026-05-17: Added `_bmad-output/implementation-artifacts/g8-0-visual-smoke-note.md` to record current runtime art usage, validations, readability findings, and remaining visual gaps.
- 2026-05-17: Wired `metal-field-v1.png` into the shared sprite loader and terrain renderer, then revalidated art checks and focused land-economy smoke coverage.
- 2026-05-17: Generated `effects-sheet-v1.png`, removed its chroma background into a processed alpha sheet, split seven effect cutouts into runtime PNGs, and switched the production art manifest away from SVG effect placeholders.
- 2026-05-17: Promoted damaged/destroyed building variants and damaged/destroyed plus unload vehicle states into the runtime loader/renderer so the production art set now covers the core skirmish state changes.

### Completion Notes

This story is complete for the current GDD batch scope. The repo now has a stronger production-art contract: required runtime asset groups are declared, validation fails visibly when declared required production assets disappear, the terrain backdrop, fishing-zone marker, and metal-field marker are rendered in-game as production bitmap assets, the production effects set uses generated bitmap cutouts instead of SVG placeholders, and runtime now uses damaged/destroyed building sprites plus damaged/destroyed and unload vehicle states. Remaining future polish is hand-cleanup and richer atlases, not missing core runtime production-art coverage.

### File List

- public/assets/runtime/g8-production/production-art-manifest.json
- public/assets/runtime/g8-production/resources/fishing-zone-marker-v1.svg
- public/assets/generated/g8-production/fishing-zone-marker-v2.png
- public/assets/processed/g8-production/fishing-zone-marker-v2.png
- public/assets/runtime/g8-production/resources/fishing-zone-marker-v2.png
- public/assets/runtime/g8-production/resources/metal-field-v1.png
- _bmad-output/implementation-artifacts/g8-0-visual-smoke-note.md
- public/assets/runtime/g8-production/effects/construction-dust-v1.svg
- public/assets/runtime/g8-production/effects/repair-sparks-v1.svg
- public/assets/runtime/g8-production/effects/harvest-sparks-v1.svg
- public/assets/runtime/g8-production/effects/fish-splash-v1.svg
- public/assets/runtime/g8-production/effects/cannon-muzzle-flash-v1.svg
- public/assets/runtime/g8-production/effects/sabotage-burst-v1.svg
- public/assets/runtime/g8-production/effects/smoke-plume-v1.svg
- public/assets/generated/g8-production/terrain-backdrop-v1.png
- public/assets/generated/g8-production/effects-sheet-v1.png
- public/assets/processed/g8-production/terrain-backdrop-v1.png
- public/assets/processed/g8-production/effects-sheet-v1-alpha.png
- tests/art/validate-production-art-manifest.mjs
- package.json
- src/game/art/unitSpriteAssets.ts
- src/game/render/entityRenderer.ts
- src/game/render/animationState.ts
- src/game/render/terrainRenderer.ts
