# Level Designer Sprint Plan

## Goal
Ship an internal level designer that lets us build, validate, and iterate RTS maps without hand-editing `skirmish01.ts`.

## Sprint 1
- Map data editor shell inside the existing app with load/save for `terrain`, `blockers`, `metalFields`, `fishingZones`, `baseAreas`, `dockPoints`, and `buildable`.
- Brush tools for `land`, `water`, `shore`, and `road` rectangles.
- Blocker placement/edit tools for `forest`, `rocks`, `ridge`, `cliff`, and `marsh`.
- Selection, move, resize, duplicate, and delete for all map objects.
- Export back to typed map JSON/TS format used by the runtime.

## Sprint 2
- Validation overlay for walkable chokepoints, unreachable resources, blocked dock access, overlapping blockers, and invalid spawn/base layouts.
- Heatmap or route preview using the same land/water path queries as gameplay.
- Quick playtest launch from the editor into skirmish runtime with the edited map.
- Minimap preview and biome/readability pass for terrain and blockers.

## Sprint 3
- Entity/spawn authoring for player base, enemy base, starting workers, trucks, boats, and encounter setups.
- Economy tuning panel for fish values, metal amounts, regrowth, and crew capacity.
- Objective markers and mission scripting anchors.
- Multi-map support plus versioned map files.

## Technical Notes
- Keep collision data separate from art.
- Do not use pixel collision as the first step.
- First add authorable blocker footprints/insets so visuals and walkability are editable in data.
- If we later need richer shapes, move from rectangle blockers to polygon or mask-backed blocker metadata per map object.

## Acceptance
- A designer can build a new map without touching code.
- The editor can warn about unwalkable chokepoints before playtest.
- Saved maps load directly in runtime with the same pathing and collision rules.
