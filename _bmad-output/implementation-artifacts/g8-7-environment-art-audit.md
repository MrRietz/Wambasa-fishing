## G8.7 Environment Art Audit

Status: active

Current runtime-backed environment art in live use:

- `terrain-backdrop-v1.png` via `getTerrainBackdropTexture()` in `src/game/render/terrainRenderer.ts`
- `metal-field-v1.png` via `getMetalFieldTexture()` in `src/game/render/terrainRenderer.ts`
- `fishing-zone-marker-v2.png` via `getFishingZoneMarkerTexture()` in `src/game/render/terrainRenderer.ts`

Current environment surfaces still mostly procedural:

- water fill and wave separation
- shoreline / beach read
- roads
- blocker silhouettes
- terrain landmarking around bases and chokepoints
- map title / debug-style text overlay

Main environment gaps:

- The backdrop exists but has been acting more like a faint plate than a composed scene layer.
- Shoreline readability depends on flat color bands more than authored coastal shapes.
- Roads and blockers are functional but not visually distinctive enough to act as landmarks.
- The default map view still contained immersion-breaking debug banner text.

Planned first-pass implementation slice:

- strengthen backdrop integration
- add layered water / shore / foam treatment
- improve road and blocker contrast
- remove default debug banner text
