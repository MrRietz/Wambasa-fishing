# Architecture Compliance Audit

Generated: 2026-05-16
Last updated: 2026-05-16

Architecture source: `_bmad-output/game-architecture.md`

## Verdict

The current `src` implementation is still not fully architecture-compliant, but architecture recovery has started. It is no longer only `src/main.ts`: app boot, config constants, map data/types, production/building data, and entity creation helpers have been split into architecture folders.

This does not mean the work is worthless: it proves mechanics and gives regression tests. But the remaining `src/app/createApp.ts` monolith should be treated as a prototype module that must continue being split by architecture boundary before more gameplay features are added.

## Current Implementation Shape

Current `src` contains:

- `src/main.ts`
- `src/styles.css`
- `src/app/createApp.ts`
- `src/game/config/constants.ts`
- `src/game/data/buildings.ts`
- `src/game/data/production.ts`
- `src/game/data/maps/skirmish01.ts`
- `src/game/commands/commandTypes.ts`
- `src/game/commands/commandValidation.ts`
- `src/game/commands/commandHandlers.ts`
- `src/game/audio/audioManager.ts`
- `src/game/core/math.ts`
- `src/game/debug/debugState.ts`
- `src/game/entities/components.ts`
- `src/game/entities/entityFactory.ts`
- `src/game/map/buildPlacement.ts`
- `src/game/map/geometry.ts`
- `src/game/map/mapTypes.ts`
- `src/game/map/navigationQueries.ts`
- `src/game/map/pathfinding.ts`
- `src/game/render/entityRenderer.ts`
- `src/game/render/layers.ts`
- `src/game/render/overlays.ts`
- `src/game/render/terrainRenderer.ts`
- `src/game/simulation/systems/collisionSystem.ts`
- `src/game/simulation/systems/combatSystem.ts`
- `src/game/simulation/systems/constructionSystem.ts`
- `src/game/simulation/systems/fishingSystem.ts`
- `src/game/simulation/systems/harvestSystem.ts`
- `src/game/simulation/systems/productionSystem.ts`
- `src/game/simulation/systems/repairSystem.ts`
- `src/game/simulation/systems/sabotageSystem.ts`
- `src/game/ui/domShell.ts`
- `src/game/ui/minimap/minimapRenderer.ts`
- `src/game/ui/panels.ts`
- `tests/architecture/import-boundaries.mjs`
- Architecture folder skeletons for the remaining domains

Observed in `src/main.ts`:

- `src/main.ts` is now a thin entry point that imports styles and starts the app.

Observed in `src/app/createApp.ts`:

- Pixi app boot, DOM shell, UI handlers, economy state, AI state, pathfinding, some rendering, and event handling still live together.
- Player and AI do not consistently issue commands through a dedicated command bus.
- Initial entities are still inline object literals, but reusable entity creation helpers now live in `entities/entityFactory.ts`.
- Static map data, geometry helpers, placement validation, destination/resource/fishing-zone queries, and A* pathfinding now live in `game/map/`.
- Movement collision resolution now lives in `game/simulation/systems/collisionSystem.ts`.
- UI mutates or calls gameplay logic directly instead of dispatching commands/settings only.
- Simulation logic depends on render-layer arguments in several paths, which breaks the simulation/render boundary.

## Architecture Rules Not Followed

### Directory Structure

Required by architecture:

- `src/app/`
- `src/game/core/`
- `src/game/config/`
- `src/game/data/`
- `src/game/simulation/`
- `src/game/entities/`
- `src/game/commands/`
- `src/game/map/`
- `src/game/input/`
- `src/game/camera/`
- `src/game/render/`
- `src/game/animation/`
- `src/game/ai/`
- `src/game/ui/`
- `src/game/audio/`
- `src/game/persistence/`
- `src/game/debug/`
- `src/game/assets/`

Current state:

- The architecture folders now exist.
- Some config/data/entity modules are implemented.
- Most runtime domains are still merged into `src/app/createApp.ts`.

### Simulation / Render Split

Required:

- Simulation must not import or depend on Pixi/render/UI/audio.
- Render reads simulation snapshots and events.
- Pixi display objects are never gameplay truth.

Current state:

- Simulation update functions receive `RenderLayers`.
- Gameplay systems call render feedback and UI status functions directly.
- State, rendering, effects, UI feedback, and command execution are interleaved.

### RTS Command Intent Pattern

Required:

- Player input and AI both emit typed commands.
- Commands validate centrally.
- Command handlers mutate simulation state.
- Failures return typed results and user-facing reasons.

Current state:

- Commands exist as direct functions like `issueMoveCommand`, `issueHarvestMetalCommand`, `issueAttackCommand`, and `issueProduceCommand`.
- Validation is scattered in those functions.
- AI sometimes mutates unit state directly instead of issuing the same command path as the player.

### Entity and Data Patterns

Required:

- Entity factories create data-only entities.
- Unit/building/resource defaults live in `game/data/`.
- Systems use definitions from data/config.

Current state:

- Entity/component types live in `src/game/entities/components.ts`.
- Runtime entity factory helpers live in `src/game/entities/entityFactory.ts`.
- Production and building definitions live in `src/game/data/`.
- Map data lives in `src/game/data/maps/skirmish01.ts`.
- Initial entity instances still live inline in `src/app/createApp.ts`.
- There is no separate entity store or typed query layer yet.

### Map / Pathfinding / Collision

Required:

- `game/map/` owns terrain, build, water, navigation, pathfinding, and spatial hash queries.
- Systems should not duplicate map logic.

Current state:

- Map data is extracted.
- Build placement, terrain destination checks, geometry helpers, resource/fishing-zone picking, and A* pathfinding are isolated.
- Movement collision resolution is isolated.

### UI Architecture

Required:

- DOM UI owns panels and dispatches commands/settings.
- UI does not directly change entity state.

Current state:

- DOM event handlers call gameplay issue functions directly.
- UI update functions read gameplay data and trigger command panel changes in the same module as simulation.

## Why This Happened

The implementation followed a vertical-slice path to get a playable RTS loop working quickly. That produced working test coverage and visible features, but it skipped architecture step 2: creating the domain-driven source folders and enforcing boundaries before implementing Epics 1-9.

The result is feature progress without architectural compliance. Continuing to add features into `src/main.ts` will make the game harder to fix and will keep creating the same issues: clunky controls, difficult animation repair, duplicated UI behavior, fragile AI, and hard-to-debug collision/pathing.

## Corrective Decision

Feature work should pause until the architecture foundation exists.

The next sprint should not be `G7.1 Saboteur Production`. The next sprint should be an architecture recovery sprint:

1. Scaffold architecture folders and move pure data/types out of `src/main.ts`. Status: partial complete.
2. Extract entity factory/store and static unit/building definitions. Status: partial complete; entity store still missing.
3. Extract command types, validation, and handlers. Status: partial; production, move, harvest, fish/unload, build-confirm, attack/sabotage/repair, AI harvest, and AI instant dock build handlers extracted.
4. Extract map/pathfinding/collision queries. Status: mostly complete for MVP; placement/navigation/geometry/A*/collision separation extracted.
5. Extract simulation systems so they no longer depend on Pixi render layers. Status: partial; production, construction, harvest, fishing, combat, sabotage, repair, and collision extracted.
6. Extract render sync and UI command dispatch. Status: mostly complete for current MVP; debug snapshot, audio manager, DOM shell mounting, panel rendering, selection readout formatting, Pixi layer creation, terrain drawing, minimap drawing, world overlays, and entity layer/sprite drawing extracted. Runtime app orchestration still remains in `src/app/createApp.ts`.
7. Add architecture guard tests. Status: mostly complete for current MVP; import-boundary tests, thin `src/main.ts` check, no direct DOM panel creation in app, no direct Pixi layer/terrain/entity drawing in app, no direct minimap canvas drawing in app, and max-size fail guard are enforced.
8. Keep existing e2e tests passing after every slice. Status: build passing; full Epic 1 MVP e2e suite passed 50/50 after AR7/AR8 slice.

## Recovery Stories

### AR1 - Scaffold Architecture Folders

Priority: `P0`

As a developer, I want the source tree to match the architecture so future stories have correct homes.

Acceptance criteria:

- All architecture folders exist under `src/app` and `src/game`. Status: done.
- `src/main.ts` becomes a thin boot entry or imports a boot function. Status: done.
- No gameplay behavior changes.
- `npm run build` passes. Status: done.
- Existing e2e smoke tests still pass. Status: focused MVP suite passed, 50/50.

### AR2 - Extract Static Data and Types

Priority: `P0`

As a developer, I want map, unit, building, production, and balance definitions outside the runtime monolith.

Acceptance criteria:

- Map data moves to `src/game/data/maps/skirmish01.ts`. Status: done.
- Production/building/unit definitions move to `src/game/data/`. Status: partial; unit definitions still need a dedicated data file.
- Shared types move to domain type files. Status: partial.
- `src/main.ts` no longer owns static RTS data. Status: done.
- Existing tests pass without behavior changes. Status: focused MVP suite passed, 50/50.

### AR3 - Extract Entity Store and Entity Factory

Priority: `P0`

As a developer, I want entity creation and queries to follow the architecture.

Acceptance criteria:

- Entity types/components live in `src/game/entities/components.ts`. Status: done.
- Entity creation helpers live in `src/game/entities/entityFactory.ts`. Status: partial; initial entity setup still inline.
- Entity lookup helpers live in `src/game/entities/queries.ts`.
- Runtime code no longer creates ad-hoc entity object literals outside boot/setup/factory modules.
- Existing tests pass.

### AR4 - Extract Command Types, Validation, and Handlers

Priority: `P0`

As a developer, I want player and AI actions to use one typed command path.

Acceptance criteria:

- Command types live in `src/game/commands/commandTypes.ts`. Status: partial complete; result types exist, full command intent types still needed.
- Command validation lives in `src/game/commands/commandValidation.ts`. Status: partial; production validation extracted, remaining command validation currently lives with extracted handlers pending finer split.
- Command handlers live in `src/game/commands/commandHandlers.ts`. Status: partial; production, move, harvest, fish/unload, build-confirm, and attack/sabotage/repair handlers extracted.
- UI and AI dispatch commands instead of mutating gameplay state directly. Status: partial; player command paths mostly use extracted handlers, AI production/harvest/dock build use handlers.
- Existing command-related e2e tests pass. Status: targeted movement/harvest/build/fishing tests passed; full MVP suite passed 50/50 after this extraction slice.

### AR5 - Extract Map, Pathfinding, Build, Water, and Collision Queries

Priority: `P0`

As a developer, I want terrain and movement rules isolated so invisible blockers and unreachable targets can be fixed reliably.

Acceptance criteria:

- Navigation/build/water/pathfinding helpers move to `src/game/map/`. Status: mostly complete for MVP.
- Gameplay systems call map query functions instead of local terrain logic. Status: partial.
- Building footprint validation and pathfinding use the same blocker source. Status: mostly complete; both read map data via map-query wrappers.
- Existing pathing, placement, dock, and movement tests pass.

### AR6 - Extract Simulation Systems

Priority: `P0`

As a developer, I want gameplay updates to run without depending on Pixi or DOM.

Acceptance criteria:

- Production, construction, movement, harvest, fishing, combat, sabotage, repair, AI, and win condition updates move under `src/game/simulation/systems/`. Status: partial; production, construction, harvest, fishing, combat, sabotage, repair, and collision extracted.
- Systems operate on game state and emit events/results. Status: partial.
- Systems do not accept Pixi render layers as parameters. Status: true for extracted production/construction/harvest/fishing/combat/sabotage/repair/collision systems.
- Existing e2e tests pass. Status: full MVP suite passed 50/50 after harvest system and AI harvest/build dispatch cleanup.

### AR7 - Extract Render Sync, UI, Audio, and Debug Boundaries

Priority: `P1`

As a developer, I want presentation code to read game state and events without owning gameplay truth.

Acceptance criteria:

- Pixi layer creation and sync move to `src/game/render/`.
- DOM command panel and HUD move to `src/game/ui/`.
- Audio manager moves to `src/game/audio/`. Status: done for WebAudio/music/SFX/settings state.
- Debug snapshot generation moves to `src/game/debug/`. Status: done for debug type and snapshot projection.
- UI dispatches commands/settings instead of directly mutating state.
- Existing UI/audio/debug tests pass. Status: full MVP suite passed 50/50 after DOM shell, render layer creation, debug snapshot, and audio manager extraction.

Current AR7 status:

- `src/game/render/layers.ts` now owns Pixi layer container creation.
- `src/game/render/entityRenderer.ts` now owns entity layer synchronization and building/unit/damage/action-effect drawing helpers.
- `src/game/render/overlays.ts` now owns world overlay setup, selection rings, drag box, destination path markers, and placement preview drawing.
- `src/game/render/terrainRenderer.ts` now owns Pixi terrain/resource/blocker/debug-label drawing.
- `src/game/ui/domShell.ts` now owns the RTS DOM shell template and element binding.
- `src/game/ui/minimap/minimapRenderer.ts` now owns minimap canvas drawing and pointer-to-world conversion.
- `src/game/ui/panels.ts` now owns alert feed, economy readout, match result, objective list, factory, dock, and worker command panel rendering.
- `src/game/ui/panels.ts` now owns selected-entity readout formatting.
- `src/game/audio/audioManager.ts` owns WebAudio/music/SFX/settings behavior.
- `src/game/debug/debugState.ts` owns debug snapshot projection.
- Remaining gap: app-level orchestration still owns when render/UI functions are called, which is acceptable until a dedicated game loop/app controller extraction is scheduled.

### AR8 - Architecture Guard Tests

Priority: `P1`

As a developer, I want tests that stop the codebase from sliding back into a monolith.

Acceptance criteria:

- Add an import-boundary test or script that prevents `simulation/` importing `render/`, `ui/`, or `audio/`.
- Add a file-size or domain-boundary check for `src/main.ts`.
- Add command validation unit tests for at least move, produce, build, attack, and sabotage.
- CI/test command runs these checks.

Current AR8 status:

- `tests/architecture/import-boundaries.mjs` blocks `simulation/` imports from Pixi, UI, render, and audio.
- `tests/architecture/import-boundaries.mjs` blocks `commands/` importing Pixi.
- `tests/architecture/import-boundaries.mjs` verifies `src/main.ts` stays thin.
- `tests/architecture/import-boundaries.mjs` prevents `src/app/createApp.ts` from directly creating DOM panel elements.
- `tests/architecture/import-boundaries.mjs` prevents `src/app/createApp.ts` from directly constructing Pixi render containers.
- `tests/architecture/import-boundaries.mjs` prevents `src/app/createApp.ts` from owning entity sprite/damage drawing helper functions.
- `tests/architecture/import-boundaries.mjs` prevents `src/app/createApp.ts` from directly drawing Pixi terrain/debug graphics.
- `tests/architecture/import-boundaries.mjs` prevents `src/app/createApp.ts` from directly drawing minimap canvas primitives.
- `package.json` exposes `npm run test:architecture`.
- `src/app/createApp.ts` max-size is now a failing guard at 2600 lines.
- `package.json` exposes `npm run test:commands`.
- Command validation tests cover move, produce, build placement, attack, and sabotage failure paths.

## Updated Next Step

Finish the remaining AR7 extraction before new gameplay features:

1. Optional hardening: extract app/game-loop orchestration if `src/app/createApp.ts` grows again.
2. Resume `epic-gap-stories.md` with saboteur production, AI rebuild/defense, defensive structures, and combat command polish.
