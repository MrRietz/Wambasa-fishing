# G8.0 Imagegen Production Art Plan

Date: 2026-05-17

## Finding

The graphics epic did not miss the concept, but implementation stopped too early. The current game has an art bible, runtime asset folders, metadata validation, and SVG placeholder animation frames. It does not yet have a cohesive imagegen-produced bitmap art set integrated into runtime.

This means G8.1/G8.2 should not be considered visually complete until G8.0 production bitmap art is generated, cleaned, normalized, and wired into the renderer.

## First Production Batch

Generate these as one cohesive batch using `docs/imagegen-art-bible.md` as the style source:

- Terrain/backdrop: Nordic coastal RTS land/water/shore visual set.
- Buildings: Factory Command Center, Dock, House/Barracks, Guard Tower.
- Resources: Metal Field, Fishing Zone marker.
- Units: Worker, Guard, Saboteur, Harvester Truck, Fishing Boat.
- Effects: harvest spark/dust, unload glow, fishing splash, construction dust, repair spark, sabotage burst, cannon muzzle flash, smoke/damage.
- UI: selected unit/building portrait panels for the same units/buildings.

## Current Repo Art Imported

- `public/assets/generated/g8-production/style-board-v1.png`
- `public/assets/generated/g8-production/core-asset-sheet-v1.png`
- `public/assets/processed/g8-production/core-asset-sheet-v1-alpha.png`
- `public/assets/runtime/g8-production/production-art-manifest.json`
- `public/assets/runtime/g8-production/buildings/factory-command-center-v1.png`
- `public/assets/runtime/g8-production/buildings/dock-v1.png`
- `public/assets/runtime/g8-production/units/worker-v1.png`
- `public/assets/runtime/g8-production/units/harvester-truck-v1.png`
- `public/assets/runtime/g8-production/units/fishing-boat-v1.png`
- `public/assets/runtime/g8-production/resources/metal-field-v1.png`
- `public/assets/generated/g8-production/units/worker-directional-sheet-v1.png`
- `public/assets/processed/g8-production/units/worker-directional-sheet-v1-alpha.png`
- `public/assets/processed/g8-production/units/worker-slice-contact-v2.png`
- `public/assets/runtime/units/worker/{idle,move,build,repair}/{east,south,west,north}/*.png`
- `public/assets/generated/g8-production/units/guard-directional-sheet-v1.png`
- `public/assets/processed/g8-production/units/guard-directional-sheet-v1-alpha.png`
- `public/assets/processed/g8-production/units/guard-slice-contact-v2.png`
- `public/assets/runtime/units/guard/{idle,move,attack}/{east,south,west,north}/*.png`
- `public/assets/generated/g8-production/units/saboteur-directional-sheet-v1.png`
- `public/assets/processed/g8-production/units/saboteur-directional-sheet-v1-alpha.png`
- `public/assets/processed/g8-production/units/saboteur-slice-contact-v2.png`
- `public/assets/runtime/units/saboteur/{idle,move,sabotage}/{east,south,west,north}/*.png`
- `public/assets/generated/g8-production/units/truck-directional-sheet-v1.png`
- `public/assets/processed/g8-production/units/truck-directional-sheet-v1-alpha.png`
- `public/assets/processed/g8-production/units/truck-slice-contact-v2.png`
- `public/assets/runtime/units/truck/{move,harvest}/{east,south,west,north}/*.png`
- `public/assets/generated/g8-production/units/boat-directional-sheet-v1.png`
- `public/assets/processed/g8-production/units/boat-directional-sheet-v1-alpha.png`
- `public/assets/processed/g8-production/units/boat-slice-contact-v2.png`
- `public/assets/runtime/units/boat/{move,fish}/{east,south,west,north}/*.png`
- `public/assets/generated/g8-production/buildings/house-tower-sheet-v1.png`
- `public/assets/processed/g8-production/buildings/house-tower-sheet-v1-alpha.png`
- `public/assets/runtime/g8-production/buildings/house-v1.png`
- `public/assets/runtime/g8-production/buildings/guard-tower-v1.png`

The static cutouts are first-pass style/runtime candidates. Worker, guard, saboteur, truck, and boat directional sheets are now runtime bitmap animation sources. Complete Factory, Dock, House/Barracks, and Guard Tower entities now render through production bitmap sprites with procedural overlays for damage, disabled state, and tower attack lines.

## Required Animation Sheets

- Worker: 4 directions; idle 2 frames, walk 8 frames, build 6 frames, repair 6 frames, carry/assist 4 frames, downed 3 frames.
- Guard: 4 directions; idle 2 frames, walk 8 frames, attack 6 frames, reload/ready 4 frames, hit reaction 2 frames, downed 3 frames.
- Saboteur: 4 directions; idle 2 frames, walk 8 frames, sabotage 8 frames, plant charge 4 frames, sneak/crouch 4 frames, downed 3 frames.
- Harvester Truck: 4 or 8 vehicle directions; drive 4 frames, harvest 4 frames, empty/half/full cargo variants, unload 4 frames, damaged smoke, destroyed husk.
- Fishing Boat: 4 or 8 boat directions; cruise 4 frames, fish 6 frames, full hold variant, unload/sell 4 frames, wake overlay, damaged smoke, sinking 6 frames.
- Buildings: idle, active/producing, damaged 50 percent, damaged 20 percent, destroyed for Factory, Dock, House/Barracks, and Guard Tower.
- Effects: construction dust, repair sparks, harvest sparks, fish splash, muzzle flash, sabotage burst, smoke, selection/command feedback.

## Asset Rules

- Save raw imagegen outputs under `public/assets/generated/`.
- Normalize/crop/resize under `public/assets/processed/`.
- Reference only runtime-ready assets under `public/assets/runtime/`.
- Keep consistent camera angle: elevated RTS three-quarter/top-down, readable at normal zoom.
- Avoid logos, exact real product replicas, readable brand names, and licensed style imitation.
- Prefer atlas/sheet-ready PNG/WebP outputs with fixed frame sizes.

## Suggested Prompt Base

```text
Use case: stylized-concept
Asset type: browser RTS game bitmap asset
Primary request: <specific unit/building/resource/effect>
Scene/backdrop: alternate-world Nordic coastal fishing war, industrial harbor, wet timber, brushed metal, cold sea air
Style/medium: cohesive semi-realistic 2D painted RTS game art, practical grounded machinery, no photorealism
Camera: elevated three-quarter RTS view, readable silhouette at small scale
Lighting/mood: cold morning coastal light, light mist, restrained but adventurous
Color palette: muted sea green, weathered wood, dark iron, brass highlights, off-white markings
Constraints: no logos, no readable brand names, no exact real product replicas, no watermark
Output requirements: isolated subject, generous padding, consistent scale, sprite/atlas friendly
```

## Recommended Next Implementation Slice

1. Generate one concept board for the full style direction.
2. Generate the first runtime batch: Factory, Dock, Worker, Truck, Boat, Metal Field.
3. Add a runtime art manifest for bitmap assets.
4. Update the renderer to prefer bitmap runtime assets and fall back to procedural/SVG placeholders only when a bitmap is missing.
5. Add manifest validation for required production art.

## Progress Impact

Epic 8 should remain visually incomplete until this batch is integrated. Current progress should be treated as systems-ready but art-incomplete.
