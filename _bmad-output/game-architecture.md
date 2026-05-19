---
title: 'Game Architecture'
project: 'Wambasa-fishing'
date: '2026-05-16'
author: 'Rietzr'
version: '1.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'PixiJS 8.18.1 + TypeScript + Vite'
platform: 'Browser-first PC'

# Source Documents
gdd: '_bmad-output/gdd.md'
epics: '_bmad-output/epics.md'
brief: '_bmad-output/game-brief.md'
---

# Game Architecture

## Executive Summary

**Wambåsa Fishing Wars** architecture is designed for **PixiJS 8.18.1 + custom TypeScript RTS simulation + Vite**, targeting browser-first PC play.

Key architectural decisions:

- PixiJS is used strictly as the renderer; gameplay truth lives in fixed-step TypeScript simulation state.
- Player input and AI both issue validated typed commands, so unit behavior is consistent regardless of who created the command.
- Map art is separate from navigation/build/water/collision data, preventing invisible-wall and unreachable-target failures.
- DOM owns readable RTS HUD/command UI while Pixi owns world overlays such as selection rings, markers, build footprints, and debug visualization.
- A domain-driven hybrid source tree keeps simulation, rendering, input, map, AI, UI, audio, and assets isolated for parallel AI-agent implementation.

The architecture defines 16 major decisions, 8 standard implementation patterns, 3 novel RTS patterns, and a complete project structure ready for Epic implementation.

## Document Status

This architecture document is being created through the GDS Architecture Workflow.

**Steps Completed:** 9 of 9 (Complete)

---

## Project Context

### Game Overview

**Wambåsa Fishing Wars** is a browser-first classic RTS where rival fishing companies compete on one coastal map. The player builds a Factory Command Center, harvests metal with trucks, builds docks and boats, fishes for cash, defends economy routes, sabotages rivals, and wins through profit pressure or command-center destruction.

### Technical Scope

**Platform:** Browser-first PC, mouse/keyboard  
**Genre:** Strategy / classic RTS  
**Project Level:** High for a browser game, because RTS feel depends on many tightly connected systems working together: camera, minimap, selection, pathing, collision, economy, AI, animation, UI, and audio.

### Core Systems

| System | Complexity | GDD Reference |
|---|---|---|
| Renderer / map viewport | High | Technical Specs, Art Direction, Epic 1 |
| Camera and minimap | High | Controls, Technical Specs, Epic 1 |
| Input and command routing | High | Game Mechanics, Technical Specs, Epic 2 |
| Entity/unit model | High | Unit Types, Epics 2-7 |
| Pathfinding and collision | High | Technical Constraints, Epic 2 |
| Building placement/construction | Medium-high | Base Building, Epic 4 |
| Economy simulation | High | Resource Systems, Epics 3 and 5 |
| Water movement/fishing | Medium-high | Sea Economy, Epic 5 |
| AI opponent | High | AI Opponent, Epic 6 |
| Combat/sabotage/damage | Medium-high | Combat/Sabotage, Epic 7 |
| Animation pipeline | High | Art/Audio Direction, Epic 8 |
| Audio/music layering | Medium | Art/Audio Direction, Epic 8 |
| RTS UI/HUD | High | Technical Specs, Epics 1, 4, 9 |
| Save/settings/local persistence | Low-medium | Technical Specs, Epic 9 |

### Technical Requirements

- Run from `src`; old prototype remains in `src-tmp`.
- Browser-first desktop PC target.
- 60 FPS target, 30 FPS minimum under load.
- Playable at 1920x1080 and 1366x768.
- Initial playable load target under 10 seconds after caching.
- WebGL required.
- Mouse/keyboard primary input.
- Browser scroll, page zoom, context menu, and text selection must not interfere with RTS controls.
- No multiplayer for MVP.
- AI opponent required for MVP.
- Generated assets allowed only through cleanup, normalization, and consistent sprite/animation rules.

### Complexity Drivers

**High Complexity**

- RTS control feel: selection, right-click commands, camera, minimap, and UI must feel cohesive.
- Pathfinding/collision: units must not overlap, enter buildings, or fail to reach valid targets.
- Map rules: land, shoreline, dock placement, water, fishing zones, buildings, and blockers need consistent data.
- Economy simulation: land metal economy and sea fishing economy must be visible and interruptible.
- AI: rival must harvest, build, fish, raid, rebuild, and create pressure without becoming overbuilt.
- Animation: unit readability at RTS zoom is mandatory, not cosmetic.

**Novel / Project-Specific Elements**

- Fishing-company RTS economy with land metal harvesting plus water fishing income.
- Profit victory and command-center victory both supported.
- Dirty-business sabotage as economic disruption rather than pure combat.
- Generated image asset pipeline constrained by RTS readability and animation consistency.

### Technical Risks

- Choosing an engine/rendering stack that makes RTS camera/minimap/UI awkward.
- Overusing Phaser scene/object patterns if they fight deterministic RTS simulation.
- Treating generated images as final assets instead of processed sprite/game data.
- Building content before core RTS control and pathing are proven.
- Letting UI/minimap live in the wrong layer and block command interaction.
- Under-specifying map/collision data, causing invisible walls and unreachable workstations/resources.
- AI becoming either too passive or too complex too early.

### Architecture Implications

The architecture should separate:

- **Simulation state** from rendering.
- **Input commands** from unit behavior execution.
- **Map/navigation data** from painted art.
- **UI/HUD state** from game-world state.
- **Asset pipeline rules** from runtime systems.
- **AI decisions** from low-level unit movement.

This points toward a custom RTS architecture on top of a browser rendering layer, not a purely scene-scripted prototype.

---

## Engine & Framework

### Selected Engine

**PixiJS v8.18.1 + custom TypeScript RTS simulation + Vite**

**Rationale:** Wambåsa Fishing Wars needs a custom RTS architecture rather than a scene-scripted arcade-game architecture. PixiJS provides a fast browser 2D renderer while simulation, pathfinding, AI, commands, UI state, and map data remain under project control.

Current-version checks:

- PixiJS documentation lists **8.18.1** as current stable.
- Phaser has **v4.1.0** current, while this repo currently uses Phaser **3.90.0**.
- Vite documentation lists **v8.0.10** as current, while this repo currently uses Vite **6.3.5**.

### Engine Option Comparison

| Option | Fit | Strengths | Concerns |
|---|---:|---|---|
| **PixiJS v8 + custom RTS systems** | Best | Excellent 2D rendering, flexible scene graph, strong for sprites/atlases/effects, does not force game-object lifecycle | More architecture work required, but that is good for RTS correctness |
| **Phaser 4** | Medium | Full game framework, input/audio/scene support, current Phaser line | Newer line, more framework assumptions; RTS simulation may fight Phaser scene/object patterns |
| **Phaser 3.90** | Medium-low | Already in repo, mature, familiar | Old prototype pain came from Phaser-style coupling; less ideal for a clean RTS reboot |
| **Godot Web** | Low-medium | Great editor, strong 2D tooling | Browser export/runtime size and AI-agent web workflow less direct for this project |
| **Unity WebGL** | Low | Mature editor/tooling | Too heavy for this browser-first 2D RTS MVP |

### Project Initialization

Use the existing Vite/TypeScript app shape, but replace Phaser runtime with PixiJS and custom architecture.

```bash
npm uninstall phaser
npm install pixi.js
```

Optional after architecture validation:

```bash
npm install @pixi/sound
```

Keep `src` as the reboot implementation target. Keep `src-tmp` as archived reference only.

### Engine-Provided Architecture

| Component | Solution | Provided By |
|---|---|---|
| Rendering | WebGL/WebGPU-capable 2D renderer, sprites, containers, graphics, filters | PixiJS |
| Asset loading | Texture/spritesheet asset loading | PixiJS Assets |
| Render loop | Ticker/render loop | PixiJS |
| Scene graph | Containers/layers/display objects | PixiJS |
| Build/dev server | Local dev server, bundling, TypeScript pipeline | Vite |
| Language/tooling | Static typing, modular code | TypeScript |

### Remaining Architectural Decisions

These must be explicitly designed by this architecture:

- Fixed-step simulation loop.
- Entity/component/data model.
- Command system: select, move, harvest, build, fish, attack, sabotage.
- Pathfinding and collision.
- Map/tile/navigation data.
- Camera and minimap behavior.
- UI/HUD layering and DOM-vs-canvas split.
- Animation state machines and sprite-sheet conventions.
- Economy simulation.
- AI decision loop.
- Audio layering and browser unlock handling.
- Save/settings persistence.
- Test strategy and playtest automation.

### Starter Template Decision

Do **not** use a large game starter template. The right starter is a clean Vite + TypeScript + PixiJS app because RTS architecture needs project-specific systems.

Recommended structure:

```text
src/
  app/
  game/
    core/
    render/
    simulation/
    input/
    map/
    entities/
    systems/
    ai/
    ui/
    audio/
    assets/
  styles.css
```

### AI Development Tools

No Pixi-specific MCP is listed in the local architecture MCP catalog. Recommended:

- **Context7 MCP:** Include as optional documentation MCP so agents can check current PixiJS, Vite, and TypeScript APIs during implementation.
- Engine-specific MCP: Not applicable for PixiJS because there is no editor scene graph like Unity/Godot/Unreal.

### Architecture Decision

**Selected:** PixiJS v8.18.1 + TypeScript + Vite, with a custom RTS simulation architecture.

**Rationale:** This gives the best chance of fixing the old prototype's biggest failures: animation coupling, minimap/UI clunk, invisible collision issues, poor pathing, and scene-level complexity. Pixi handles rendering; project systems handle RTS correctness.

### Version Verification Sources

- PixiJS versions: https://pixijs.com/versions
- Phaser v4.1.0 release: https://editor.phaser.io/download/release/v4.1.0
- Vite releases: https://vite.dev/releases

---

## Architectural Decisions

### Decision Priority

**Critical**

- Simulation architecture
- Entity/model structure
- Command/input architecture
- Map/navigation/collision model
- Camera/minimap architecture
- UI layering
- Asset/animation pipeline

**Important**

- Economy system architecture
- AI architecture
- Audio architecture
- Persistence/settings
- Testing/playtest architecture

**Deferred**

- Multiplayer/networking
- Campaign save system
- Modding/content tools
- Cloud services

### Decision Summary

| Category | Decision | Version | Rationale |
|---|---|---|---|
| Rendering | PixiJS renderer only, no game logic in Pixi display objects | PixiJS 8.18.1 | Keeps simulation testable and avoids scene-object coupling |
| Simulation | Fixed-step custom TypeScript simulation | Project-defined | RTS commands, AI, economy, and pathing need predictable updates |
| Entity Model | Lightweight ECS/data-oriented model | Project-defined | Supports many units/buildings and separates data from rendering |
| Commands | Command pattern with validated intents | Project-defined | Right-click RTS actions need consistent routing and feedback |
| Pathfinding | Grid A* for MVP, path smoothing later, flow fields deferred | Project-defined | Best balance for first RTS slice; flow fields only needed for large unit counts |
| Collision | Spatial hash + reservation/avoidance layer | Project-defined | Prevents unit overlap and invisible-wall failures |
| Map Data | Data-driven map model separate from painted art | JSON/TS data | Collision/nav/build/water/resource rules cannot depend on background image |
| Camera/Minimap | Single camera state source shared by world and minimap | Project-defined | Prevents clunky minimap behavior and desync |
| UI | DOM/HTML shell for HUD + canvas world overlays for selection/markers | Browser/Vite | Keeps RTS panels readable and prevents minimap from blocking commands |
| Animation | State-machine-driven sprite animations | Pixi spritesheets | Workers/trucks/boats need clear action-specific animation |
| AI | Hierarchical finite-state/utility hybrid | Project-defined | Simple rival can harvest/build/fish/raid without overbuilding AI |
| Economy | Deterministic resource systems updated in simulation | Project-defined | Metal, fish, cash, queues, and win conditions need clear state flow |
| Audio | Native Web Audio / HTMLAudio wrapper with project audio buses | Browser API | Browser unlock and music/SFX mixing need explicit handling without adding middleware early |
| Persistence | LocalStorage for settings only in MVP | Browser API | No campaign/progression save needed yet |
| Networking | None for MVP | N/A | Single-player AI is explicit scope |
| Testing | Unit tests for simulation + Playwright smoke/playtests | Current repo has Playwright | RTS correctness needs automated checks outside visual playtesting |

### State Management

**Approach:** Fixed-step simulation with lightweight ECS-style stores.

The game should maintain canonical state in TypeScript data structures, not in Pixi display objects. Pixi renders snapshots of state. This keeps unit commands, economy, AI, pathing, and win/loss logic testable.

Core state groups:

- `GameState`: match time, win/loss, resources, selected ids.
- `EntityStore`: units, buildings, resources, projectiles/effects.
- `MapState`: terrain, blockers, water, buildable cells, resources.
- `CommandQueue`: player/AI commands waiting for validation/execution.
- `SystemContext`: read/write access scoped per simulation tick.

### Rendering Architecture

**Approach:** Pixi display tree mirrors simulation state.

Pixi should own:

- World layers: terrain, buildings, units, effects, overlays.
- Camera transform.
- Sprite atlases and texture lookup.
- Selection rings, destination markers, and world-space feedback.
- Minimap render layer or minimap data projection.

Pixi should not own:

- Unit position truth.
- Resource amounts.
- Command validity.
- AI decisions.
- Collision truth.
- Win/loss logic.

### Entity and Component Model

**Approach:** Lightweight ECS/data-oriented model, not a full external ECS package unless needed later.

Suggested components:

- `TransformComponent`
- `RenderableComponent`
- `SelectableComponent`
- `MovementComponent`
- `PathComponent`
- `ColliderComponent`
- `HealthComponent`
- `WorkerComponent`
- `HarvesterComponent`
- `BoatComponent`
- `BuildingComponent`
- `ProductionQueueComponent`
- `ResourceNodeComponent`
- `FactionComponent`
- `AnimationStateComponent`
- `CommandableComponent`

This gives enough ECS structure without adding dependency complexity too early.

### Command System

**Approach:** Command pattern.

Every player or AI action becomes a typed command:

- `MoveCommand`
- `HarvestMetalCommand`
- `BuildStructureCommand`
- `RepairCommand`
- `ProduceUnitCommand`
- `FishCommand`
- `DockUnloadCommand`
- `AttackCommand`
- `SabotageCommand`

Each command has:

- Source entity ids.
- Target position/entity/resource.
- Validation result.
- User-facing failure reason.
- Optional queued/active status.

This prevents "nothing happened" behavior and makes command feedback consistent.

### Map, Pathfinding, and Collision

**Approach:** Data-driven grid navigation with A* for MVP.

Map data must define:

- Terrain type.
- Buildable cells.
- Blocked cells.
- Water cells.
- Dockable shoreline cells.
- Resource cells.
- Spawn/base areas.
- Fishing zones.

Pathing decisions:

- Land units use land nav grid.
- Boats use water nav grid.
- Docks connect land and water through explicit dock interaction points.
- Buildings reserve footprint cells.
- Units reserve local cells/space through spatial hash.

Collision decisions:

- Units have collision radius.
- Buildings have footprint blockers.
- Units cannot occupy the same final position.
- Movement uses simple local separation for nearby units.
- Invalid target commands return clear feedback.

### Camera and Minimap

**Approach:** One canonical camera model.

Camera state:

- World center or top-left.
- Zoom level.
- Viewport size.
- Bounds.
- Input mode: none, edge pan, drag pan, minimap drag.

Minimap behavior:

- Click minimap to move camera.
- Drag viewport rectangle directly.
- View rectangle must follow cursor like classic RTS.
- Minimap should be outside or beside command UI, not over it.
- Minimap reads camera state and writes camera commands; it does not maintain a separate truth.

### UI Architecture

**Approach:** Hybrid DOM HUD + Pixi world overlays.

DOM/HTML should own:

- Resource bar.
- Selected unit/building command panel.
- Production queues.
- Tooltips.
- Objective panel.
- Alerts.
- Settings/pause/results screens.

Pixi world overlays should own:

- Selection rings.
- Drag-select rectangle.
- Destination markers.
- Rally lines.
- Build placement footprint.
- Damage/sabotage world effects.

Rationale: DOM is better for readable buttons/text/layout; Pixi is better for world-space markers.

### AI Architecture

**Approach:** Hierarchical state machine plus utility scoring.

AI layers:

- **Strategic:** economy, build, fish, defend, raid, recover.
- **Tactical:** choose target truck/boat/building/resource.
- **Unit command:** emit the same command types as the player.

AI must use the same simulation rules as the player. Difficulty can tune delay, aggression, and resource pressure, but MVP should avoid hidden cheating unless explicitly marked.

### Economy Architecture

**Approach:** Deterministic simulation systems.

Systems:

- `ResourceSystem`: metal/fish/cash changes.
- `HarvestSystem`: truck harvest/load/return/unload.
- `FishingSystem`: boat fish/load/return/unload.
- `ProductionSystem`: queues, costs, build times.
- `ConstructionSystem`: building placement/progress.
- `WinConditionSystem`: profit and command-center victory.

Every economy change should create an event for UI/audio/VFX.

### Animation Architecture

**Approach:** Animation state derived from simulation state.

Examples:

- Worker: idle, walk, build, repair, sabotage.
- Truck: idle, drive-empty, harvest, drive-loaded, unload, damaged.
- Boat: idle-bob, move, fish, return, unload, sink.
- Building: ghost, constructing, idle, active, damaged, destroyed.

Animation selection must be deterministic from state and direction. No generic wiggle fallback for real movement.

### Asset Management

**Approach:** Manifest-driven asset loading.

Use asset manifests for:

- Texture atlases.
- Spritesheets.
- Audio files.
- UI images.
- Map data.
- Animation definitions.

MVP can preload a single skirmish asset set. Lazy/streaming loading is deferred.

### Audio Architecture

**Approach:** Explicit music/SFX bus wrapper over native browser audio APIs.

Audio buses:

- Master
- Music
- SFX
- UI
- Alerts

Required handling:

- Browser audio unlock on first user interaction.
- Volume persistence.
- Music loop starts clearly after unlock.
- Gameplay events trigger SFX through event bus.
- Ambience must not replace music.

Middleware such as `@pixi/sound`, Howler, FMOD, or Wwise is deferred until a concrete need appears. The MVP audio layer should stay small and browser-native.

### Persistence

**Approach:** LocalStorage settings only for MVP.

Persist:

- Master/music/SFX volume.
- UI scale.
- Difficulty.
- Last selected display/settings options.

Do not persist full match state for MVP.

### Networking

**Approach:** None.

Multiplayer is explicitly out of scope. Architecture should not add netcode complexity now. However, the command/simulation separation keeps the door open for future deterministic or server-driven approaches.

### Testing Architecture

**Approach:** Simulation unit tests + Playwright browser smoke tests.

Test targets:

- Command validation.
- Path target reachability.
- Unit collision/reservation.
- Harvest loop.
- Fishing loop.
- Production queue.
- Win/loss conditions.
- Camera/minimap interactions.
- Audio unlock smoke test.
- UI not blocked at 1920x1080 and 1366x768.

### Architecture Decision Records

#### ADR-001: Use PixiJS as renderer, not gameplay engine

Pixi handles rendering, assets, and display layers. Gameplay rules live in project systems.

#### ADR-002: Use custom fixed-step RTS simulation

RTS feel depends on stable command execution, pathing, AI, economy, and win conditions. These should not depend on frame-rate or Pixi object lifecycle.

#### ADR-003: Use data-driven map/navigation model

Map art must not define collision. Navigation, buildability, water, dock points, resources, and blockers are explicit data.

#### ADR-004: Use command pattern for player and AI actions

Player and AI issue the same commands, improving consistency, testing, and feedback.

#### ADR-005: Use DOM for command UI and Pixi for world overlays

RTS UI needs readable layout and accessible text. World-space feedback belongs in Pixi.

#### ADR-006: Defer multiplayer and full match persistence

Single-player AI is MVP scope. Avoid architecture bloat until the first skirmish works.

---

## Cross-Cutting Concerns

These patterns apply to all systems and should be treated as implementation rules for every agent touching the codebase.

### Error Handling

**Strategy:** Result objects for expected failures, thrown errors for programmer errors, global boundary for unrecoverable runtime failures.

Expected gameplay failures are not exceptions. Examples: invalid build location, unreachable command target, insufficient resources, invalid water/land target. These return typed results that the UI can display.

Unexpected programmer/system failures can throw and should be caught at app boundaries.

#### Error Levels

- **Recoverable gameplay failure:** Return `Result<T>` with a user-facing reason.
- **Recoverable system warning:** Log warning, continue.
- **Fatal system failure:** Log error, show fail-safe overlay or return to menu.
- **Developer assertion failure:** Throw in development, log in production.

#### Example

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function validateBuildCommand(state: GameState, command: BuildStructureCommand): Result<BuildPlan> {
  if (!canAfford(state, command.structureType)) {
    return { ok: false, code: "insufficient_resources", message: "Not enough metal." };
  }

  if (!isBuildableFootprint(state.map, command.footprint)) {
    return { ok: false, code: "invalid_build_location", message: "Cannot build there." };
  }

  return { ok: true, value: createBuildPlan(command) };
}
```

### Logging

**Format:** Structured text objects through a small logger wrapper.  
**Destination:** Browser console in development; in-memory ring buffer for debug overlay; no external logging in MVP.

#### Log Levels

- `error`: broken invariant, failed asset load, fatal app issue.
- `warn`: invalid state recovered, command rejected unexpectedly, missing optional asset.
- `info`: boot, asset load complete, match start/end, major system milestones.
- `debug`: command traces, AI decisions, pathfinding diagnostics.
- `trace`: disabled by default; only for very noisy per-tick diagnostics.

Performance-critical systems must not log every frame unless a debug flag is enabled.

#### Example

```ts
logger.warn("command.rejected", {
  commandType: command.type,
  reason: result.code,
  entityIds: command.entityIds,
});

logger.debug("ai.decision", {
  factionId,
  goal: selectedGoal,
  score,
});
```

### Configuration

**Approach:** Split configuration into static constants, data definitions, balance tables, and player settings.

#### Configuration Structure

```text
src/game/config/
  constants.ts
  balance.ts
  inputBindings.ts
  debugFlags.ts

src/game/data/
  units.ts
  buildings.ts
  resources.ts
  maps/
    skirmish01.ts
```

Rules:

- Hardcode only true constants.
- Balance values live in data tables, not inside systems.
- Player settings persist through LocalStorage.
- Systems receive config through context/imports, not random globals.
- Map data defines navigation, buildability, water, resources, and blockers separately from art.

#### Example

```ts
export const UNIT_DEFS = {
  worker: {
    radius: 10,
    speed: 72,
    maxHealth: 60,
    commands: ["move", "build", "repair"],
  },
  harvesterTruck: {
    radius: 18,
    speed: 58,
    loadedSpeed: 44,
    maxHealth: 180,
    cargoCapacity: 100,
    commands: ["move", "harvestMetal"],
  },
} as const;
```

### Event System

**Pattern:** Typed synchronous event bus for simulation-to-presentation notifications.

Simulation systems should mutate state directly through system context, then emit typed events for renderer/UI/audio. Events are not the source of truth.

#### Event Naming

Use `domain.eventName` strings and typed payloads:

- `resources.changed`
- `command.rejected`
- `unit.selected`
- `unit.damaged`
- `building.completed`
- `harvest.unloaded`
- `fishing.sold`
- `audio.musicRequested`
- `match.ended`

#### Example

```ts
type GameEvent =
  | { type: "command.rejected"; code: string; message: string }
  | { type: "resources.changed"; factionId: string; metal: number; fish: number; cash: number }
  | { type: "building.completed"; buildingId: EntityId }
  | { type: "match.ended"; winnerFactionId: string; reason: "profit" | "command_center_destroyed" };

eventBus.emit({
  type: "resources.changed",
  factionId,
  metal: economy.metal,
  fish: economy.fish,
  cash: economy.cash,
});
```

### Debug Tools

**Available Tools**

- Debug overlay toggle.
- FPS/frame time display.
- Camera bounds display.
- Navigation grid overlay.
- Collision radius/footprint overlay.
- Entity id and selected entity inspector.
- Current command/path display.
- AI goal/debug panel.
- Resource/economy debug panel.
- Audio unlock/bus status display.
- Quick reset/restart match command.

**Activation**

- Development builds: enabled with a debug flag and keyboard toggle.
- Production builds: disabled by default; can keep a hidden safe diagnostics mode if needed.
- Suggested toggle: `F2` for debug overlay, `F3` for nav/collision overlay.

#### Example

```ts
if (debugFlags.showNavigation) {
  debugRenderer.drawNavigationGrid(state.map.navigation);
}

if (debugFlags.showEntityIds) {
  debugRenderer.drawEntityLabels(state.entities);
}
```

### Browser Integration Rules

- Disable browser context menu on the game surface.
- Prevent page scroll during wheel zoom over the game.
- Keep focus handling explicit so keyboard panning works after clicking the game.
- Audio must unlock from a user gesture before starting music.
- DOM UI must never cover critical world input unless a modal is open.

### Performance Rules

- Do not allocate temporary objects inside hot per-frame loops when avoidable.
- Batch rendering through atlases.
- Keep simulation updates fixed-step.
- Use spatial hash for nearby-unit and selection queries.
- Keep pathfinding requests bounded and cache/reuse paths where safe.
- Prefer event-driven UI updates over re-rendering all UI every tick.

---

## Project Structure

### Organization Pattern

**Pattern:** Domain-driven hybrid.

Top-level code is organized by RTS architecture domains, not by Pixi object type. This prevents agents from dumping logic into render files and makes parallel work safer.

**Rationale:** Wambåsa Fishing Wars needs strict separation between simulation, rendering, input, map/nav data, AI, UI, audio, and assets. A domain-driven structure makes system boundaries explicit.

### Directory Structure

```text
Wambasa-fishing/
  src/
    main.ts
    styles.css

    app/
      createApp.ts
      lifecycle.ts
      resize.ts

    game/
      core/
        ids.ts
        result.ts
        logger.ts
        events.ts
        time.ts
        math.ts

      config/
        constants.ts
        balance.ts
        debugFlags.ts
        inputBindings.ts

      data/
        units.ts
        buildings.ts
        resources.ts
        factions.ts
        animations.ts
        maps/
          skirmish01.ts

      simulation/
        GameState.ts
        Simulation.ts
        SystemContext.ts
        commandQueue.ts
        systems/
          selectionSystem.ts
          movementSystem.ts
          pathFollowSystem.ts
          collisionSystem.ts
          harvestSystem.ts
          fishingSystem.ts
          productionSystem.ts
          constructionSystem.ts
          combatSystem.ts
          sabotageSystem.ts
          economySystem.ts
          winConditionSystem.ts

      entities/
        components.ts
        entityStore.ts
        entityFactory.ts
        queries.ts

      commands/
        commandTypes.ts
        commandBus.ts
        commandValidation.ts
        commandHandlers.ts

      map/
        mapTypes.ts
        navigationGrid.ts
        buildGrid.ts
        waterGrid.ts
        spatialHash.ts
        pathfinding.ts
        mapQueries.ts

      input/
        pointerInput.ts
        keyboardInput.ts
        cameraInput.ts
        selectionInput.ts
        commandInput.ts
        inputState.ts

      camera/
        cameraState.ts
        cameraController.ts
        minimapController.ts
        viewportMath.ts

      render/
        PixiGame.ts
        layers.ts
        renderLoop.ts
        renderSync.ts
        sprites/
          spriteRegistry.ts
          unitSprites.ts
          buildingSprites.ts
          effectSprites.ts
        overlays/
          selectionOverlay.ts
          commandOverlay.ts
          buildPlacementOverlay.ts
          debugOverlay.ts

      animation/
        animationTypes.ts
        animationStateMachine.ts
        animationResolver.ts
        directionResolver.ts

      ai/
        aiController.ts
        aiState.ts
        strategicAi.ts
        tacticalAi.ts
        aiGoals.ts

      ui/
        hud/
          resourceBar.ts
          commandPanel.ts
          productionQueue.ts
          objectivePanel.ts
          alertPanel.ts
        screens/
          startScreen.ts
          pauseScreen.ts
          resultsScreen.ts
        minimap/
          minimapView.ts
          minimapInteractions.ts
        settings/
          settingsPanel.ts

      audio/
        audioManager.ts
        audioBuses.ts
        audioEvents.ts
        musicDirector.ts

      persistence/
        settingsStorage.ts

      debug/
        debugState.ts
        debugCommands.ts
        debugPanels.ts

      assets/
        assetManifest.ts
        assetLoader.ts
        atlasRegistry.ts

  public/
    assets/
      rts/
        atlases/
        sprites/
          units/
          buildings/
          effects/
        audio/
          music/
          sfx/
          ui/
        ui/
        maps/
        generated/
          raw/
          cleaned/

  tests/
    unit/
      simulation/
      commands/
      map/
      ai/
    e2e/
      rts-smoke.spec.ts
      minimap.spec.ts
      command-ui.spec.ts

  docs/
    imagegen-art-bible.md

  _bmad-output/
    gdd.md
    epics.md
    game-architecture.md

  src-tmp/
    # Archived old prototype reference only
```

### System Location Mapping

| System | Location | Responsibility |
|---|---|---|
| App boot/lifecycle | `src/app/` | Create renderer/app shell, attach canvas, handle resize |
| Core utilities | `src/game/core/` | IDs, Result type, logger, event bus, math/time helpers |
| Balance/config | `src/game/config/` | Constants, debug flags, input bindings, tweakable values |
| Static game data | `src/game/data/` | Unit/building/resource/faction/map definitions |
| Simulation | `src/game/simulation/` | Fixed-step game state and gameplay systems |
| Entities/components | `src/game/entities/` | Entity store, components, factories, queries |
| Commands | `src/game/commands/` | Typed player/AI command validation and dispatch |
| Map/navigation | `src/game/map/` | Nav grids, water grids, build grids, pathfinding, spatial hash |
| Input | `src/game/input/` | Pointer/keyboard handling and conversion into camera/selection/command intents |
| Camera/minimap state | `src/game/camera/` | Canonical camera model, viewport math, minimap camera commands |
| Pixi rendering | `src/game/render/` | Display layers, sprite sync, overlays, debug drawing |
| Animation | `src/game/animation/` | Animation state selection, directions, spritesheet metadata |
| AI | `src/game/ai/` | Strategic/tactical AI issuing normal commands |
| UI/HUD | `src/game/ui/` | DOM HUD, command panel, minimap view, screens/settings |
| Audio | `src/game/audio/` | Browser unlock, buses, music director, event-driven SFX |
| Persistence | `src/game/persistence/` | LocalStorage settings only |
| Debug tools | `src/game/debug/` | Debug state, commands, panels |
| Runtime assets | `src/game/assets/` | Manifest and asset loading code |
| Static assets | `public/assets/rts/` | Images, atlases, audio, maps, generated assets |
| Tests | `tests/` | Unit and Playwright smoke tests |

### Naming Conventions

#### Files

- TypeScript modules: `camelCase.ts` for functions/systems, `PascalCase.ts` only for class-like primary exports.
- Components/types: `components.ts`, `commandTypes.ts`, `mapTypes.ts`.
- Systems: `movementSystem.ts`, `harvestSystem.ts`, `winConditionSystem.ts`.
- Data files: plural domain names, e.g. `units.ts`, `buildings.ts`.
- Tests: `*.test.ts` for unit tests, `*.spec.ts` for Playwright.

#### Code Elements

| Element | Convention | Example |
|---|---|---|
| Types/interfaces | PascalCase | `GameState`, `MoveCommand` |
| Classes | PascalCase | `Simulation`, `PixiGame` |
| Functions | camelCase | `validateCommand`, `findPath` |
| Variables | camelCase | `selectedEntityIds` |
| Constants | UPPER_SNAKE_CASE | `FIXED_STEP_MS` |
| Event names | domain.eventName | `resources.changed` |
| Command type strings | verbNoun | `move`, `harvestMetal`, `buildStructure` |
| Entity ids | branded string/number type | `EntityId` |

#### Game Assets

- Asset filenames: `kebab-case`.
- Unit sprites: `unit-worker-walk.png`, `unit-truck-loaded.png`.
- Building sprites: `building-command-center.png`.
- Atlases: `atlas-units.json`, `atlas-buildings.json`.
- Audio: `sfx-command-ack.ogg`, `music-industrial-coast-loop.ogg`.
- Generated raw assets go in `public/assets/rts/generated/raw/`.
- Cleaned production assets go in their final category, not raw.

### Architectural Boundaries

- `simulation/` must not import from `render/`, `ui/`, or `audio/`.
- `render/` reads simulation snapshots and events; it does not mutate gameplay truth.
- `ui/` dispatches commands or settings changes; it does not directly change entity state.
- `ai/` issues normal commands through `commands/`; it does not bypass command validation.
- `map/` owns navigation/build/water/collision queries; systems should not duplicate map logic.
- `data/` and `config/` contain values; systems contain behavior.
- `public/assets/rts/generated/raw/` is never referenced by runtime code.
- `src-tmp/` is archive/reference only and must not be imported by `src`.
- Tests should target simulation and command behavior first, visual rendering second.

---

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents.

### Novel Patterns

#### Land-Sea Economy Bridge Pattern

**Purpose:** Connect land production and water fishing without creating separate minigames.

**Problem it solves:** The old prototype split factory/ocean/road into disconnected modes. The reboot needs one simulation where trucks, docks, boats, resources, and cash all affect the same match.

**Components:**

- `HarvestSystem`: creates metal income from land.
- `ProductionSystem`: spends metal/cash to produce buildings/units.
- `FishingSystem`: creates fish from water zones.
- `EconomySystem`: converts fish to cash at dock unload.
- `DockComponent`: bridges land building logic and water boat logic.
- `WinConditionSystem`: reads cash/company value and command-center status.

**Data Flow:**

```text
Truck harvests metal
  -> metal added at command center/storage
  -> player builds dock/boat/worker/upgrade
  -> boat fishes water zone
  -> boat unloads at dock
  -> fish converted to cash
  -> cash funds expansion/sabotage/defense
  -> win condition updates
```

**Implementation Guide:**

```ts
function updateFishingSystem(ctx: SystemContext): void {
  for (const boat of ctx.entities.withComponents("boat", "cargo", "command")) {
    if (boat.command.type !== "fish") continue;

    const zone = ctx.map.getFishingZoneAt(boat.transform.position);
    if (!zone) {
      ctx.commands.reject(boat.id, "invalid_fishing_zone", "No fish here.");
      continue;
    }

    boat.cargo.fish = Math.min(boat.cargo.capacity, boat.cargo.fish + zone.fishRate * ctx.dtSeconds);

    if (boat.cargo.fish >= boat.cargo.capacity) {
      ctx.commands.enqueue({ type: "dockUnload", entityIds: [boat.id], targetId: boat.homeDockId });
    }
  }
}
```

**Usage:** Use whenever a mechanic crosses land/water/economy boundaries. Do not create separate "ocean mode" state.

#### RTS Command Intent Pattern

**Purpose:** Convert player and AI choices into the same validated command format.

**Problem it solves:** Multiple ways to assign workers/trucks/boats must behave consistently. Selecting a worker then clicking a station, or selecting a station then assigning a worker, should route through the same command system.

**Components:**

- `InputState`
- `SelectionSystem`
- `CommandInput`
- `CommandValidation`
- `CommandQueue`
- `CommandHandlers`
- `UI command panel`

**Data Flow:**

```text
Pointer/UI/AI intent
  -> build typed command
  -> validate against state/map/resources
  -> queue or reject with reason
  -> command handler mutates simulation state
  -> event bus emits feedback
```

**Implementation Guide:**

```ts
function issueContextCommand(ctx: CommandContext, target: CommandTarget): Result<GameCommand> {
  const selected = ctx.selection.selectedEntityIds;

  if (target.kind === "metalField") {
    return createCommand({ type: "harvestMetal", entityIds: selected, targetId: target.entityId });
  }

  if (target.kind === "worksite") {
    return createCommand({ type: "buildStructure", entityIds: selected, targetId: target.entityId });
  }

  if (target.kind === "terrain") {
    return createCommand({ type: "move", entityIds: selected, targetPosition: target.position });
  }

  return { ok: false, code: "unsupported_target", message: "Cannot do that." };
}
```

**Usage:** All player input, command-panel actions, and AI decisions must create normal commands.

#### Camera-Minimap Single Source Pattern

**Purpose:** Make minimap behavior feel like classic RTS.

**Problem it solves:** The rectangle must follow the cursor and represent the actual camera. The minimap must not maintain separate state or block command UI.

**Components:**

- `CameraState`
- `CameraController`
- `MinimapView`
- `MinimapInteractions`
- `ViewportMath`

**Implementation Guide:**

```ts
function dragMinimapViewport(camera: CameraState, minimapPoint: Vec2, mapSize: Size): CameraState {
  const worldCenter = minimapToWorld(minimapPoint, mapSize);
  return clampCameraToBounds({
    ...camera,
    center: worldCenter,
    inputMode: "minimapDrag",
  });
}
```

**Usage:** Minimap reads/writes only canonical camera state. Never duplicate viewport rectangle state.

### Communication Patterns

**Pattern:** Direct calls inside one system; typed events between systems and presentation.

Rules:

- Simulation systems can call helpers and mutate state through `SystemContext`.
- Cross-layer updates use typed events.
- UI and renderer listen to events or sync from state.
- AI emits commands, not direct state changes.

**Example:**

```ts
const result = commandBus.dispatch(command);

if (!result.ok) {
  eventBus.emit({
    type: "command.rejected",
    code: result.code,
    message: result.message,
  });
}
```

### Entity Patterns

**Creation:** Entity factory creates data-only entities with components.

Rules:

- Do not instantiate Pixi sprites in entity factories.
- Render sync creates/updates sprites from `RenderableComponent`.
- Entity factories live in `entities/entityFactory.ts`.
- Unit/building defaults come from `data/`.

**Example:**

```ts
function createWorker(store: EntityStore, factionId: FactionId, position: Vec2): EntityId {
  return store.create({
    transform: { position, rotation: 0 },
    faction: { factionId },
    selectable: { radius: 14 },
    movement: { speed: UNIT_DEFS.worker.speed },
    collider: { radius: UNIT_DEFS.worker.radius },
    health: { current: UNIT_DEFS.worker.maxHealth, max: UNIT_DEFS.worker.maxHealth },
    commandable: { commands: UNIT_DEFS.worker.commands },
    animationState: { state: "idle", direction: "south" },
    renderable: { spriteKey: "unit-worker" },
  });
}
```

### State Patterns

**Pattern:** State machines for entity action state; utility scoring for AI strategic choices.

Entity action states should be explicit:

- `idle`
- `moving`
- `harvesting`
- `returning`
- `unloading`
- `building`
- `repairing`
- `fishing`
- `attacking`
- `sabotaging`
- `destroyed`

**Example:**

```ts
function setUnitAction(entity: UnitEntity, next: UnitActionState): void {
  if (!canTransition(entity.action.state, next)) {
    logger.warn("state.invalidTransition", {
      entityId: entity.id,
      from: entity.action.state,
      to: next,
    });
    return;
  }

  entity.action.state = next;
  entity.animationState.state = resolveAnimationForAction(next);
}
```

### Data Patterns

**Access:** Static imports for definitions, `SystemContext` for runtime state.

Rules:

- Systems import definitions from `data/` or `config/`.
- Runtime entity/map state comes from `SystemContext`.
- No system should read DOM, Pixi objects, or raw assets for gameplay truth.

**Example:**

```ts
import { BUILDING_DEFS } from "../data/buildings";

function canAffordBuilding(ctx: SystemContext, factionId: FactionId, buildingType: BuildingType): boolean {
  const def = BUILDING_DEFS[buildingType];
  const economy = ctx.state.factions[factionId].economy;

  return economy.metal >= def.cost.metal && economy.cash >= def.cost.cash;
}
```

### Render Sync Pattern

**Purpose:** Keep rendering deterministic and separate from simulation.

**Pattern:** Renderer syncs Pixi display objects from state after simulation ticks.

**Example:**

```ts
function syncUnitSprites(state: GameState, registry: SpriteRegistry): void {
  for (const entity of state.entities.withComponents("transform", "renderable")) {
    const sprite = registry.getOrCreate(entity.id, entity.renderable.spriteKey);
    sprite.position.set(entity.transform.position.x, entity.transform.position.y);
    sprite.zIndex = entity.transform.position.y;
    sprite.visible = !entity.hidden;
  }
}
```

### Consistency Rules

| Pattern | Convention | Enforcement |
|---|---|---|
| Simulation/render split | Simulation never imports Pixi/render/UI/audio | Code review and import boundaries |
| Commands | All player/AI actions go through typed commands | Command tests |
| Gameplay failures | Return `Result<T>`, do not throw | TypeScript types and tests |
| Entity creation | Use `entityFactory`, not ad-hoc object literals in systems | Code review |
| Map rules | Use `map/` queries for nav/build/water/collision | Tests for path/build validation |
| Economy changes | Economy systems emit events after mutation | UI/audio integration tests |
| Animation | Derived from action state and direction | Animation resolver tests |
| UI | DOM panels dispatch commands/settings only | UI tests |
| Assets | Runtime never references generated/raw assets | Build/code review |
| Tests | New systems include unit tests for command/state behavior | PR/story acceptance |

---

## Architecture Validation

### Validation Summary

| Check | Result | Notes |
|---|---|---|
| Decision Compatibility | PASS | PixiJS renderer, custom simulation, DOM UI, typed events, and data-driven map rules are compatible. |
| GDD Coverage | PASS | All core GDD systems have architecture support: camera, minimap, commands, pathing, collision, economy, AI, sea/land play, animation, audio, UI, and tests. |
| Pattern Completeness | PASS | Entity creation, communication, state, data access, render sync, error handling, logging, events, and debug patterns are defined with examples. |
| Epic Mapping | PASS | Epics 1-9 map cleanly to architecture domains and directories. |
| Document Completeness | PASS | Required sections exist and placeholder scan is clean. One ambiguous audio placeholder was resolved to native browser audio wrapper. |

### Coverage Report

**Systems Covered:** 14/14  
**Patterns Defined:** 8 standard patterns + 3 novel patterns  
**Major Decisions Made:** 16

### Issues Resolved

- Replaced ambiguous audio decision with a concrete MVP choice: native Web Audio / HTMLAudio wrapper with project-defined audio buses.
- Confirmed no remaining placeholders, `TODO`, or `TBD` markers in the architecture document.
- Confirmed `src-tmp` is archive-only and `src` is the reboot target.

### Validation Date

2026-05-16

---

## Development Environment

### Prerequisites

- Node.js compatible with the current Vite/PixiJS toolchain.
- npm.
- Modern Chromium browser for primary development and profiling.
- Firefox for compatibility passes.
- Playwright browsers installed for E2E smoke tests.

### AI Tooling (MCP Servers)

No engine-specific MCP server was selected because PixiJS has no editor scene graph like Unity, Godot, or Unreal.

Recommended optional documentation MCP:

| MCP Server | Purpose | Install Type |
|---|---|---|
| Context7 | Current library/API documentation for PixiJS, Vite, TypeScript, and related browser APIs | `npx` or Docker |

Context7 can be added later if implementation agents need current API lookup. It is not required to begin development.

### Setup Commands

```bash
npm uninstall phaser
npm install pixi.js
npm install
npm run typecheck
npm run build
```

Optional after audio implementation proves it needs a helper library:

```bash
npm install @pixi/sound
```

### First Implementation Steps

1. Replace the `src` runtime with the PixiJS app shell and leave `src-tmp` untouched as archive.
2. Create the domain-driven source folders defined in this architecture.
3. Implement Epic 1 first: app boot, renderer, map viewport, camera, resize, minimap click/drag.
4. Implement Epic 2 next: selection, drag-select, command intent, movement, pathing, collision/reservation.
5. Add simulation unit tests and Playwright smoke tests immediately for camera/minimap/selection behavior.

### Handoff Guidance

Implementation agents should read this architecture before editing code. The highest-risk rule is the simulation/render split: Pixi display objects are never gameplay truth.
