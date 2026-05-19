# Truck 8-Direction Sprite Spec

This repo now supports an 8-direction truck sprite pipeline with safe fallback to the current 4-direction art.

## Goal

Replace the compromised 4-direction truck movement with dedicated truck sprites for:

- `move`
- `harvest`
- `unload`
- optional later: `damaged`
- optional later: `destroyed`

## Directory Layout

Truck sprite paths must follow:

```text
/assets/runtime/units/truck/<action>/<direction>/<frame>.png
```

Examples:

```text
/assets/runtime/units/truck/move/east/00.png
/assets/runtime/units/truck/move/southEast/00.png
/assets/runtime/units/truck/move/south/00.png
/assets/runtime/units/truck/move/southWest/00.png
/assets/runtime/units/truck/move/west/00.png
/assets/runtime/units/truck/move/northWest/00.png
/assets/runtime/units/truck/move/north/00.png
/assets/runtime/units/truck/move/northEast/00.png
```

## Direction Set

Use exactly these direction folder names:

1. `east`
2. `southEast`
3. `south`
4. `southWest`
5. `west`
6. `northWest`
7. `north`
8. `northEast`

The engine still supports fallback to cardinal directions while diagonal art is missing:

- `northEast` falls back to `east`
- `southEast` falls back to `south`
- `southWest` falls back to `south`
- `northWest` falls back to `north`

## Frame Counts

Recommended production target:

- `move`: `8` frames per direction
- `harvest`: `6` frames per direction
- `unload`: `6` frames per direction
- `damaged`: `2` frames per direction
- `destroyed`: `2` frames per direction

Current code still expects:

- `move`: `4`
- `harvest`: `4`
- `unload`: `4`
- `damaged`: `2`
- `destroyed`: `2`

If art is delivered with higher counts, update `vehicleSpriteDefinitions.truck` in [unitSpriteAssets.ts](/C:/repo_games/Wambasa-fishing/src/game/art/unitSpriteAssets.ts:85).

## Visual Requirements

- Camera angle is top-down RTS, not side-view platformer.
- Truck silhouette must read clearly at small size.
- Each direction should feel intentionally drawn, not rotated from one base render.
- Diagonals must be distinct enough that the truck no longer appears to snap or fake-turn.
- `move` frames should prioritize wheel/body travel readability over excessive bounce.
- `harvest` should communicate mining/loading behavior near a metal field.
- `unload` should communicate dumping cargo at the factory.

## Rendering Notes

- The engine now resolves truck movement to 8 directions.
- Missing diagonal frames do not crash loading; they fall back to older cardinal art.
- Humanoids and boats are still on their existing direction systems.

## Recommended Imagegen Prompt Shape

Use one consistent truck design across all directions and actions:

```text
Stylized RTS resource truck, industrial fishing/coastal frontier setting, readable from a high three-quarter top-down angle, compact silhouette, hand-painted game sprite, transparent background, consistent scale and lighting, designed for frame-by-frame animation.
```

Then vary by:

- action
- direction
- frame index
- cargo state for `unload`
- mining behavior for `harvest`

## Integration Checklist

1. Export all PNGs into the folder layout above.
2. Keep naming zero-padded: `00.png`, `01.png`, `02.png`, etc.
3. Test diagonal motion first.
4. After full asset delivery, increase truck frame counts in code if needed.
5. If the new art supports it, relax the truck direction hysteresis in [animationState.ts](/C:/repo_games/Wambasa-fishing/src/game/render/animationState.ts:59).
