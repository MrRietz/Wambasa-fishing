---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/gdd.md
  - _bmad-output/game-architecture.md
  - _bmad-output/epics.md
  - _bmad-output/game-brief.md
---

# Wambasa-fishing - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Wambasa-fishing, decomposing the requirements from the GDD, Architecture, and existing epic outline into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The game must boot the RTS reboot from `src` while keeping the old prototype archived in `src-tmp`.

FR2: The game must render one coastal RTS skirmish map with land, shoreline, docks, water, metal fields, fishing zones, blockers, and enemy territory.

FR3: The player must be able to pan, drag-pan, edge-scroll, keyboard-pan, and zoom the camera without triggering browser scroll or page zoom.

FR4: The minimap must support click-to-jump and direct dragging of the viewport rectangle, and must not block command UI.

FR5: The player must be able to left-click select units/buildings, drag-select multiple units, and shift-adjust selection.

FR6: The player must be able to right-click issue contextual commands: move, harvest, build, repair, fish, dock/unload, attack, and sabotage.

FR7: Player and AI commands must be represented as typed, validated commands with clear failure feedback.

FR8: Units must move through valid terrain using pathfinding and must not stack, enter buildings, pass through blocked terrain, or become unable to reach valid targets.

FR9: Map art must be separate from navigation, water, buildability, collision, dock, resource, and blocker data.

FR10: The game must include a Factory Command Center as the core base structure, metal drop-off, truck producer, and defeat target.

FR11: The game must include metal fields and harvester trucks that harvest, carry, return, and unload metal.

FR12: The game must include resource UI for metal, fish, cash, and crew/population where applicable.

FR13: The game must include building placement with valid/invalid footprint feedback.

FR14: Workers must be able to build and repair structures.

FR15: The game must include at minimum House and Dock buildings in addition to the Factory Command Center.

FR16: Docks must connect land and water gameplay through shoreline placement, boat production, and fish unload.

FR17: Boats must move on water, fish in fishing zones, return to dock, and convert fish to cash.

FR18: Fishing zones must be strategic objectives, with safe starter zones and contested/richer zones.

FR19: The game must include production queues for buildings/units and clear blocked-production feedback.

FR20: The game must include an AI rival that harvests metal, builds economy, creates docks/boats, fishes, defends, raids, and can rebuild.

FR21: The game must support victory by destroying the enemy Factory Command Center or reaching a profit/cash target.

FR22: The game must support defeat when the player command center is destroyed, the AI wins by profit target, or the player has no recoverable economy path.

FR23: The game must include combat and sabotage that disrupts economy without replacing economy as the main conflict.

FR24: The game must include guards/enforcers, saboteurs, building damage states, truck/boat damage, repair responses, warnings, and boat sinking for the conflict slice.

FR25: Workers, trucks, boats, and buildings must have readable animation states tied to simulation state rather than placeholder wiggle.

FR26: The game must include richer industrial/coastal music and gameplay SFX for command feedback, harvesting, fishing, building, repair, sabotage, warnings, victory, and defeat.

FR27: The game must include a readable DOM HUD for resources, command panel, production queues, objective panel, alerts, settings, pause, and results.

FR28: The game must include Pixi world overlays for selection rings, drag selection, move markers, rally lines, build footprints, damage effects, and debug overlays.

FR29: The game must include local settings persistence for volume, UI scale, difficulty, and display/settings options.

FR30: The MVP must include a complete replayable skirmish loop: harvest metal, build/produce, fish for cash, defend, raid/sabotage, and win/lose.

### NonFunctional Requirements

NFR1: The game must target 60 FPS on common desktop/laptop browsers and remain acceptable at 30 FPS under heavier load.

NFR2: The game must be playable at 1920x1080 and 1366x768 without hidden command UI, minimap conflicts, or unreadable core controls.

NFR3: Initial playable load should stay under 10 seconds after caching on typical broadband.

NFR4: The game must run in modern desktop Chromium browsers first and Firefox as a compatibility target.

NFR5: The architecture must separate simulation state from Pixi rendering, DOM UI, and audio.

NFR6: Runtime code must not reference raw generated assets; only cleaned/normalized production assets can be used.

NFR7: Generated assets must preserve consistent perspective, scale, silhouette, cleanup, and animation quality.

NFR8: The game must prevent browser scroll, context menu, text selection, and page zoom from interfering with RTS controls.

NFR9: Gameplay failures must return typed result objects with clear user-facing reasons rather than silently failing.

NFR10: Hot-path systems must avoid unnecessary allocations and use batching/spatial partitioning where appropriate.

NFR11: The game must be testable through simulation unit tests and Playwright browser smoke tests.

NFR12: The implementation must follow the architecture’s project structure, naming conventions, event patterns, command patterns, and import boundaries.

NFR13: The UI must remain readable, scalable, and accessible enough for mouse-first browser RTS play.

NFR14: Audio must unlock from a user gesture and provide clearly audible music/SFX volume.

NFR15: Multiplayer, full campaign, modding, cloud saves, backend services, and procedural map generation are out of MVP scope.

### Additional Requirements

- Use PixiJS 8.18.1 + TypeScript + Vite, replacing the current Phaser runtime for the reboot.
- Keep Pixi display objects as rendering only; never treat them as gameplay truth.
- Use a fixed-step custom TypeScript simulation.
- Use a lightweight ECS/data-oriented entity store.
- Use typed commands for player and AI actions.
- Use data-driven map definitions for terrain, blockers, water, buildability, resources, and dock points.
- Use grid A* for MVP pathfinding, with path smoothing later and flow fields deferred.
- Use spatial hash plus reservation/avoidance for collision and non-overlap.
- Use one canonical camera model shared by world and minimap.
- Use DOM/HTML for resource bar, command panel, production queues, objectives, alerts, settings, pause, and results.
- Use Pixi for world overlays and map/unit rendering.
- Use native browser audio wrapper with Master/Music/SFX/UI/Alerts buses.
- Use LocalStorage for MVP settings only.
- Use Context7 MCP optionally for current documentation lookup; no engine-specific MCP is required for Pixi.
- Use `src/game/...` domain-driven folders for all new runtime code.
- Do not import from `src-tmp` into `src`.
- Add tests for command validation, path reachability, collision/reservation, harvest loop, fishing loop, production queue, win/loss, minimap interaction, audio unlock, and UI layout.

### UX Design Requirements

UX-DR1: The command panel must be readable and never blocked by the minimap.

UX-DR2: The minimap must behave like a classic RTS minimap with click-to-jump and draggable viewport rectangle.

UX-DR3: The player must receive immediate visual feedback for selection, drag-select, right-click commands, rejected commands, and destination targets.

UX-DR4: Build placement must show valid and invalid footprints before confirmation.

UX-DR5: Resource changes must be visible through resource UI and world feedback such as unload/cash pulses.

UX-DR6: Alerts must appear near player attention and be readable during play, not as hard-to-read snackbars.

UX-DR7: The UI must support common desktop and laptop resolutions without hiding core actions.

UX-DR8: Unit/building command buttons must be large enough to read and distinguish.

UX-DR9: Audio settings must expose at least master/music/SFX volume controls.

UX-DR10: Debug overlays must make navigation, collision, camera, selected entities, commands, and AI goals inspectable in development builds.

### FR Coverage Map

FR1: Epic 1 - Reboot boots from `src`
FR2: Epic 1 - Coastal RTS map render
FR3: Epic 1 - Camera controls
FR4: Epic 1 - RTS minimap behavior
FR5: Epic 2 - Unit/building selection
FR6: Epic 2 - Contextual right-click commands
FR7: Epic 2 - Typed validated commands and feedback
FR8: Epic 2 - Pathing, collision, non-overlap
FR9: Epic 1 - Map art separated from gameplay data
FR10: Epic 3 - Factory Command Center
FR11: Epic 3 - Metal fields and harvester trucks
FR12: Epic 3 / Epic 5 - Resource UI for metal/fish/cash
FR13: Epic 4 - Building placement footprint
FR14: Epic 4 / Epic 7 - Worker build/repair
FR15: Epic 4 - House and Dock buildings
FR16: Epic 5 - Dock land/water bridge
FR17: Epic 5 - Boat fishing and dock unload
FR18: Epic 5 - Strategic fishing zones
FR19: Epic 3 / Epic 4 - Production queues and blocked feedback
FR20: Epic 6 - AI rival behavior
FR21: Epic 6 - Victory conditions
FR22: Epic 6 - Defeat conditions
FR23: Epic 7 - Combat/sabotage economy disruption
FR24: Epic 7 - Guards, saboteurs, damage, repair, sinking
FR25: Epic 8 - Readable animation states
FR26: Epic 8 - Music and SFX
FR27: Epic 8 - DOM HUD
FR28: Epic 1 / Epic 2 / Epic 8 - Pixi world overlays
FR29: Epic 8 - Local settings persistence
FR30: Epic 5 / Epic 6 / Epic 7 / Epic 9 - Complete replayable skirmish loop

## Epic List

### Epic 1: RTS Map, Camera, and Minimap Foundation
Players can launch the new RTS reboot, view a coastal skirmish map, move around it with classic RTS camera controls, and use a minimap that behaves correctly.
**FRs covered:** FR1, FR2, FR3, FR4, FR9, FR28.

### Epic 2: Unit Selection, Commands, Movement, and Collision
Players can select units, issue contextual right-click commands, see feedback, and move units through valid terrain without overlap or invisible-wall failures.
**FRs covered:** FR5, FR6, FR7, FR8, FR28.

### Epic 3: Land Economy and Factory Command Center
Players can harvest metal with trucks, unload it at the Factory Command Center, see resource feedback, and produce basic units from the base.
**FRs covered:** FR10, FR11, FR12, FR19.

### Epic 4: Building Placement, Workers, and Base Growth
Players can place buildings, see valid/invalid footprints, use workers to build and repair, and expand with House and Dock foundations.
**FRs covered:** FR13, FR14, FR15, FR19.

### Epic 5: Dock, Boats, and Sea Economy
Players can build/use a dock, produce boats, fish in water zones, return to dock, and convert fish into cash.
**FRs covered:** FR12, FR16, FR17, FR18, FR30.

### Epic 6: AI Rival, Victory, and Match Flow
Players can play a complete skirmish against an AI company that harvests, builds, fishes, raids, recovers, and can win or lose.
**FRs covered:** FR20, FR21, FR22, FR30.

### Epic 7: Combat, Sabotage, Defense, and Repair
Players can defend their economy, raid enemy economy, sabotage buildings, damage/sink boats, and recover through repairs.
**FRs covered:** FR14, FR23, FR24, FR30.

### Epic 8: Presentation, Animation, Audio, and UX Polish
Players see readable unit/building animation, hear real industrial/coastal music and SFX, and interact with a clear HUD that supports RTS play.
**FRs covered:** FR25, FR26, FR27, FR28, FR29.

### Epic 9: MVP Skirmish Integration and Playtest Hardening
Players can complete a polished replayable MVP skirmish with all core loops integrated, tested, balanced, and validated against the success metrics.
**FRs covered:** FR30 plus regression coverage for FR1-FR29.

## Epic 1: RTS Map, Camera, and Minimap Foundation

Players can launch the new RTS reboot, view a coastal skirmish map, move around it with classic RTS camera controls, and use a minimap that behaves correctly.

### Story 1.1: Boot the PixiJS RTS Reboot from `src`

As a player,
I want the game to launch into the new RTS reboot,
So that I am no longer playing the archived prototype.

**Acceptance Criteria:**

**Given** the project is installed
**When** I run the dev server and open the game
**Then** the app initializes a PixiJS-powered RTS shell from `src`
**And** runtime code does not import from `src-tmp`
**And** the app shows a visible loading/start state instead of the old Phaser prototype
**And** `npm run typecheck` passes.

### Story 1.2: Create the RTS App Shell and Render Layers

As a player,
I want a stable game viewport with separate world and UI layers,
So that the RTS can render terrain, units, overlays, and HUD without layout conflicts.

**Acceptance Criteria:**

**Given** the new app boots
**When** the Pixi app initializes
**Then** it creates world, terrain, building, unit, effect, overlay, and debug render layers
**And** Pixi display objects are rendering-only and do not own gameplay truth
**And** the app resizes with the browser window
**And** the game surface prevents browser context menu and accidental text selection.

### Story 1.3: Render the First Coastal Skirmish Map

As a player,
I want to see a readable coastal RTS map,
So that I can understand land, shoreline, water, resources, and blockers.

**Acceptance Criteria:**

**Given** the RTS shell is running
**When** the first map loads
**Then** the map displays land, shoreline, water, metal fields, fishing zones, base areas, and blockers
**And** map art is separate from navigation/build/water/collision data
**And** the map exposes a data model for terrain, blockers, water cells, buildable cells, dock points, metal fields, and fishing zones
**And** the map renders within the Pixi world layer without using raw generated assets.

### Story 1.4: Implement Canonical Camera State

As a player,
I want the camera to pan and zoom predictably,
So that I can navigate the RTS map without fighting the browser.

**Acceptance Criteria:**

**Given** the map is larger than the viewport
**When** I pan using edge scroll, arrow keys, or drag pan
**Then** the camera moves within map bounds
**And** panning remains smooth at 1920x1080 and 1366x768
**And** mouse wheel zoom changes game zoom without scrolling the webpage
**And** camera state has one canonical source used by world rendering and minimap.

### Story 1.5: Implement RTS Minimap Click and Drag

As a player,
I want the minimap to behave like a classic RTS minimap,
So that I can quickly move the camera and drag the viewport rectangle.

**Acceptance Criteria:**

**Given** the map and camera are active
**When** I click a point on the minimap
**Then** the camera centers on the corresponding world location
**And** when I hold and drag the minimap viewport rectangle, the rectangle follows my cursor directly
**And** the minimap reads and writes the canonical camera state
**And** the minimap does not block the selected unit/building command panel.

### Story 1.6: Add World-Space RTS Overlays

As a player,
I want basic world overlays for map interaction feedback,
So that future selection and commands have a consistent visual layer.

**Acceptance Criteria:**

**Given** the render layers exist
**When** overlay debug/demo markers are enabled
**Then** the game can draw selection rings, drag boxes, destination markers, build footprints, and debug grid overlays in world space
**And** overlay drawing is separate from terrain and unit sprites
**And** overlays follow camera pan and zoom correctly.

### Story 1.7: Add Epic 1 Smoke Tests

As a developer,
I want smoke tests for boot, camera, and minimap behavior,
So that RTS navigation regressions are caught early.

**Acceptance Criteria:**

**Given** the test suite is available
**When** I run the relevant tests
**Then** tests verify that the app boots from `src`
**And** tests verify that camera pan/zoom does not scroll the page
**And** tests verify that minimap click and drag move the camera
**And** tests verify that core UI remains visible at 1920x1080 and 1366x768.

## Epic 2: Unit Selection, Commands, Movement, and Collision

Players can select units, issue contextual right-click commands, see feedback, and move units through valid terrain without overlap or invisible-wall failures.

### Story 2.1: Create Entity Store and Basic Units

As a player,
I want units to exist as selectable game entities,
So that the RTS can support unit control.

**Acceptance Criteria:**

**Given** the simulation initializes
**When** the first skirmish state is created
**Then** worker and truck entities exist in the entity store with transform, faction, selectable, collider, movement, commandable, renderable, and animation state components
**And** Pixi sprites mirror entity state without owning gameplay truth.

### Story 2.2: Select Units and Buildings

As a player,
I want to click units and buildings to select them,
So that I know what will receive commands.

**Acceptance Criteria:**

**Given** units and buildings are visible
**When** I left-click a selectable entity
**Then** it becomes selected
**And** selection rings or outlines appear in the world overlay
**And** selection state is stored in game state, not in Pixi sprites.

### Story 2.3: Drag-Select and Shift-Select Units

As a player,
I want drag-select and shift-select,
So that I can control groups like a classic RTS.

**Acceptance Criteria:**

**Given** multiple units are visible
**When** I drag a selection rectangle around units
**Then** all units inside the rectangle are selected
**And** when I shift-click a unit it is added or removed from the current selection
**And** the drag rectangle is drawn in the Pixi overlay layer.

### Story 2.4: Issue Move Commands

As a player,
I want right-click terrain to move selected units,
So that I can command units naturally.

**Acceptance Criteria:**

**Given** one or more units are selected
**When** I right-click valid land terrain
**Then** a typed `move` command is created, validated, and queued
**And** a destination marker appears
**And** selected units begin moving toward the destination.

### Story 2.5: Reject Invalid Commands with Feedback

As a player,
I want invalid commands to explain why they failed,
So that the game never feels like it ignored me.

**Acceptance Criteria:**

**Given** a selected land unit
**When** I right-click invalid water, blocked terrain, or an unsupported target
**Then** the command returns a typed failed `Result`
**And** a readable UI or world feedback message explains the failure
**And** no silent command failure occurs.

### Story 2.6: Implement Land Pathfinding

As a player,
I want units to navigate around blockers,
So that invisible walls do not break movement.

**Acceptance Criteria:**

**Given** a valid reachable target
**When** I command a unit to move
**Then** the pathfinder finds a route around blocked cells and building footprints
**And** units do not path through water unless they are water units
**And** unreachable valid-looking targets are reported clearly.

### Story 2.7: Prevent Unit Overlap with Collision and Reservation

As a player,
I want units to avoid stacking inside each other,
So that selection and movement remain readable.

**Acceptance Criteria:**

**Given** multiple units are moving near each other
**When** they approach the same area
**Then** spatial hash and reservation/avoidance logic prevents exact overlap
**And** units stop at distinct readable positions
**And** collision rules do not block valid resource/building interaction points.

### Story 2.8: Add Movement and Command Tests

As a developer,
I want tests for selection, commands, pathing, and collision,
So that RTS control regressions are caught.

**Acceptance Criteria:**

**Given** test fixtures for the first map
**When** command and movement tests run
**Then** they verify selection, move command validation, invalid command feedback, path reachability, blocked paths, and non-overlap behavior.

## Epic 3: Land Economy and Factory Command Center

Players can harvest metal with trucks, unload it at the Factory Command Center, see resource feedback, and produce basic units from the base.

### Story 3.1: Add Factory Command Center

As a player,
I want a Factory Command Center as my base core,
So that I have a clear home structure and metal drop-off point.

**Acceptance Criteria:**

**Given** the skirmish starts
**When** the map loads
**Then** the player has a Factory Command Center with health, faction, selectable, building, production queue, and drop-off components
**And** selecting it shows relevant base commands in the command panel.

### Story 3.2: Add Metal Fields and Harvest Commands

As a player,
I want to command trucks to harvest metal,
So that I can start the land economy.

**Acceptance Criteria:**

**Given** a harvester truck and metal field exist
**When** I select the truck and right-click the metal field
**Then** a `harvestMetal` command is created and validated
**And** the truck moves to the metal field and enters a harvesting state.

### Story 3.3: Implement Truck Cargo, Return, and Unload

As a player,
I want trucks to visibly carry and unload metal,
So that the economy feels physical.

**Acceptance Criteria:**

**Given** a truck harvests metal
**When** its cargo reaches capacity
**Then** it returns to a valid drop-off
**And** unloads metal into the player economy
**And** emits resource and visual feedback events.

### Story 3.4: Add Resource Bar for Metal

As a player,
I want to see my metal amount update,
So that I understand what I can afford.

**Acceptance Criteria:**

**Given** the player receives or spends metal
**When** the resource value changes
**Then** the DOM resource bar updates from simulation events
**And** resource UI remains visible at supported resolutions.

### Story 3.5: Add Basic Production Queue

As a player,
I want the command center to produce trucks or workers,
So that I can scale the economy.

**Acceptance Criteria:**

**Given** the command center is selected
**When** I click a production command I can afford
**Then** metal/cash is spent, the unit enters a queue, progress is visible, and the unit spawns at a valid point
**And** unaffordable commands return clear blocked-production feedback.

## Epic 4: Building Placement, Workers, and Base Growth

Players can place buildings, see valid/invalid footprints, use workers to build and repair, and expand with House and Dock foundations.

### Story 4.1: Enter Building Placement Mode

As a player,
I want to choose a building and preview its footprint,
So that I can place structures deliberately.

**Acceptance Criteria:**

**Given** a build command is available
**When** I select a building type
**Then** the game shows a footprint preview on the map
**And** valid/invalid placement states are visually distinct.

### Story 4.2: Validate Building Placement

As a player,
I want the game to prevent invalid building placement,
So that I do not fight hidden rules.

**Acceptance Criteria:**

**Given** placement mode is active
**When** the footprint overlaps blockers, water, resources, units, or non-buildable cells
**Then** placement is rejected with a clear reason
**And** no resources are spent.

### Story 4.3: Construct Buildings with Workers

As a player,
I want workers to construct placed buildings,
So that workers have a real RTS role.

**Acceptance Criteria:**

**Given** a valid building site exists
**When** I assign a worker to it
**Then** the worker paths to the worksite, enters a building state, and progresses construction
**And** completed buildings become selectable and functional.

### Story 4.4: Build House and Expand Crew Capacity

As a player,
I want to build Houses,
So that I can expand worker/fisherman capacity.

**Acceptance Criteria:**

**Given** a House is completed
**When** the building becomes active
**Then** player crew capacity increases
**And** the UI reflects the new capacity.

### Story 4.5: Build Dock on Shoreline

As a player,
I want to place a Dock only at valid shoreline,
So that land and sea gameplay connect clearly.

**Acceptance Criteria:**

**Given** dock placement mode is active
**When** I hover valid shoreline dock cells
**Then** placement is allowed
**And** when I hover invalid land or water-only cells placement is rejected
**And** the completed dock exposes boat production and unload interaction points.

### Story 4.6: Repair Buildings

As a player,
I want workers to repair damaged buildings,
So that recovery is possible.

**Acceptance Criteria:**

**Given** a damaged building and available worker
**When** I issue a repair command
**Then** the worker moves to the building, enters repair state, spends resources if required, and restores health over time.

## Epic 5: Dock, Boats, and Sea Economy

Players can build/use a dock, produce boats, fish in water zones, return to dock, and convert fish into cash.

### Story 5.1: Produce Fishing Boats from Dock

As a player,
I want docks to produce fishing boats,
So that I can begin the sea economy.

**Acceptance Criteria:**

**Given** a completed dock is selected
**When** I click produce fishing boat and can afford it
**Then** a boat enters the dock queue and spawns at a valid water point when complete.

### Story 5.2: Move Boats on Water

As a player,
I want boats to move through water only,
So that water navigation is clear.

**Acceptance Criteria:**

**Given** a boat is selected
**When** I right-click water
**Then** the boat creates a valid water path and moves
**And** right-clicking land with a boat returns clear invalid-target feedback.

### Story 5.3: Fish in Fishing Zones

As a player,
I want boats to fish in marked water zones,
So that fishing waters matter strategically.

**Acceptance Criteria:**

**Given** a boat reaches a fishing zone
**When** it receives a fish command
**Then** it enters fishing state and fills fish cargo over time
**And** safe and contested fishing zones are visually distinguishable.

### Story 5.4: Return to Dock and Sell Fish

As a player,
I want boats to return to dock and sell fish for cash,
So that sea economy creates spendable income.

**Acceptance Criteria:**

**Given** a boat has fish cargo
**When** it docks at a valid dock
**Then** fish converts into cash
**And** fish/cash UI updates
**And** the world shows satisfying unload/sell feedback.

### Story 5.5: Test the Land-Sea Economy Bridge

As a developer,
I want tests for metal-to-dock-to-boat-to-cash flow,
So that the sea economy does not become disconnected.

**Acceptance Criteria:**

**Given** simulation test fixtures
**When** the economy bridge tests run
**Then** they verify that metal can fund dock/boat production and boats can create cash through fishing and unload.

## Epic 6: AI Rival, Victory, and Match Flow

Players can play a complete skirmish against an AI company that harvests, builds, fishes, raids, recovers, and can win or lose.

### Story 6.1: Spawn AI Rival Base and Economy

As a player,
I want to see a rival company on the map,
So that the match has opposition.

**Acceptance Criteria:**

**Given** a skirmish starts
**When** AI setup runs
**Then** an enemy command center, workers/trucks, resources, and base area are created
**And** enemy faction colors are distinct from the player.

### Story 6.2: AI Harvests and Produces

As a player,
I want the rival to harvest and produce units,
So that it feels like a real competitor.

**Acceptance Criteria:**

**Given** the AI has a command center and resources
**When** the match runs
**Then** AI issues normal harvest and production commands through the command system
**And** AI does not bypass validation.

### Story 6.3: AI Builds Dock and Fishes

As a player,
I want the rival to compete on water,
So that fishing zones matter.

**Acceptance Criteria:**

**Given** AI has enough resources
**When** its strategy selects sea economy
**Then** it builds/uses a dock, produces boats, fishes, and unloads cash.

### Story 6.4: AI Raids Exposed Economy

As a player,
I want the rival to attack exposed trucks or boats,
So that defense matters.

**Acceptance Criteria:**

**Given** player economy units are exposed
**When** AI tactical scoring chooses a raid
**Then** AI emits attack commands against exposed economy targets
**And** warnings are emitted for the player.

### Story 6.5: Win and Lose a Skirmish

As a player,
I want clear victory and defeat states,
So that a match can complete.

**Acceptance Criteria:**

**Given** the match is running
**When** enemy command center is destroyed or player reaches profit target
**Then** the player wins
**And** when player command center is destroyed or enemy reaches profit target the player loses
**And** results screen shows why the match ended.

## Epic 7: Combat, Sabotage, Defense, and Repair

Players can defend their economy, raid enemy economy, sabotage buildings, damage/sink boats, and recover through repairs.

### Story 7.1: Add Guard Unit and Basic Attacks

As a player,
I want guards to attack enemies,
So that I can defend my base and routes.

**Acceptance Criteria:**

**Given** a guard is selected
**When** I right-click an enemy target in range/pathable area
**Then** an attack command is issued
**And** the guard damages the target over time.

### Story 7.2: Add Damage States for Units and Buildings

As a player,
I want damaged units/buildings to communicate their state,
So that combat is readable.

**Acceptance Criteria:**

**Given** an entity takes damage
**When** health crosses configured thresholds
**Then** render/audio/events reflect damaged or destroyed state
**And** destroyed buildings/units stop functioning.

### Story 7.3: Add Saboteur Disruption

As a player,
I want saboteurs to disrupt enemy buildings,
So that dirty business tactics affect economy.

**Acceptance Criteria:**

**Given** a saboteur reaches a valid enemy building
**When** sabotage completes
**Then** the target building is temporarily disabled or slowed
**And** visible sparks/alarms communicate the sabotage state.

### Story 7.4: Sink Boats and Repair Damage

As a player,
I want boats to be sinkable and repairable systems to matter,
So that sea conflict has stakes and recovery.

**Acceptance Criteria:**

**Given** a boat takes lethal damage
**When** health reaches zero
**Then** it enters sinking/destroyed state and stops generating income
**And** repair commands can restore damaged eligible targets before destruction.

### Story 7.5: Combat and Sabotage Tests

As a developer,
I want tests for damage, sabotage, repair, and sinking,
So that economy disruption remains reliable.

**Acceptance Criteria:**

**Given** combat test fixtures
**When** tests run
**Then** they verify attack damage, sabotage disable/restore, repair recovery, boat sinking, and warning events.

### Story 7.6: Build Defensive Structures

As a player,
I want workers to place and construct defensive buildings,
So that I can protect my base instead of only reacting with mobile guards.

**Acceptance Criteria:**

**Given** a worker is selected and the player has enough metal
**When** I choose a defense building and place it in valid land
**Then** a construction site is created, metal is spent, and the worker builds it
**And** invalid placement gives readable feedback without spending resources.

### Story 7.7: Defensive Buildings Auto-Engage Raiders

As a player,
I want defensive buildings to automatically attack enemy raiders,
So that base layout and defensive investment matter.

**Acceptance Criteria:**

**Given** a completed defensive building has enemy units or boats in range
**When** the enemy enters its range
**Then** the defense automatically attacks the target over time
**And** selected defenses show range, target, health, and attack state.

## Epic 8: Presentation, Animation, Audio, and UX Polish

Players see readable unit/building animation, hear real industrial/coastal music and SFX, and interact with a clear HUD that supports RTS play.

### Story 8.1: Implement Animation State Resolver

As a player,
I want units to visibly animate according to their actions,
So that the game feels alive and readable.

**Acceptance Criteria:**

**Given** an entity has action and direction state
**When** action changes between idle, move, harvest, build, fish, attack, sabotage, damage, or destroyed
**Then** animation resolver selects the matching animation state
**And** no movement uses placeholder wiggle as final behavior.

### Story 8.2: Add Worker, Truck, Boat, and Building Animation Sets

As a player,
I want core entities to have readable animations,
So that movement and work are clear at RTS zoom.

**Acceptance Criteria:**

**Given** production assets or temporary authored placeholders exist
**When** workers, trucks, boats, and buildings act
**Then** their animations communicate walking, driving, harvesting/unloading, bobbing/fishing, construction, active, damaged, and destroyed states.

**Required MVP Animation Matrix:**

- Worker: 4 directions; idle, walk, build, repair, carry/assist, downed.
- Guard: 4 directions; idle, walk, attack, reload/ready, hit reaction, downed.
- Saboteur: 4 directions; idle, walk, sabotage, plant charge, sneak/crouch, downed.
- Harvester Truck: 4 or 8 vehicle directions; drive, harvest, empty cargo, half cargo, full cargo, unload, damaged, destroyed.
- Fishing Boat: 4 or 8 boat directions; cruise, fish, full hold, unload/sell, wake, damaged, sinking.
- Factory Command Center: idle, producing, unload-active, damaged states, destroyed.
- Dock: idle, boat-producing, fish-unload-active, damaged states, destroyed.
- House/Barracks: idle, producing, damaged states, destroyed.
- Guard Tower: idle, aiming/tracking, firing, damaged states, destroyed.
- Effects: construction dust, repair sparks, harvest sparks, fish splash, muzzle flash, sabotage burst, smoke, selection/command feedback.

### Story 8.3: Implement RTS HUD and Command Panel

As a player,
I want a readable HUD and command panel,
So that I know what I selected and what actions are available.

**Acceptance Criteria:**

**Given** units/buildings can be selected
**When** selection changes
**Then** DOM HUD shows resources, selected entity info, command buttons, production queues, objectives, and alerts
**And** command buttons remain readable and unblocked by the minimap.

### Story 8.4: Add Audio Unlock, Music, and SFX Buses

As a player,
I want music and SFX to play clearly after interaction,
So that the game has richer feedback than ambience/noise.

**Acceptance Criteria:**

**Given** the player starts/interacts with the game
**When** audio unlocks
**Then** music starts at audible volume
**And** Master/Music/SFX/UI/Alerts buses can be controlled
**And** command, harvest, fish, build, repair, sabotage, warning, victory, and defeat events can trigger SFX.

### Story 8.5: Persist Settings

As a player,
I want volume, UI scale, and difficulty settings to persist,
So that the game remembers my preferences.

**Acceptance Criteria:**

**Given** settings are changed
**When** the game reloads
**Then** LocalStorage restores master/music/SFX volume, UI scale, difficulty, and display settings.

### Story 8.6: Add UX and Debug Overlay Polish

As a developer and player,
I want clear alerts, scalable UI, and debug overlays,
So that gameplay is readable and implementation issues can be diagnosed.

**Acceptance Criteria:**

**Given** debug mode is enabled
**When** I press debug toggles
**Then** overlays can show FPS, camera bounds, navigation, collision, selected entities, command paths, AI goals, and audio status
**And** player-facing alerts are readable and near the player attention area.

## Epic 9: MVP Skirmish Integration and Playtest Hardening

Players can complete a polished replayable MVP skirmish with all core loops integrated, tested, balanced, and validated against the success metrics.

### Story 9.1: Add First-Skirmish Objective Flow

As a player,
I want clear first objectives,
So that I understand how to start playing without external explanation.

**Acceptance Criteria:**

**Given** a new skirmish starts
**When** the player begins
**Then** objectives guide selection, harvesting, dock/boat/fishing, defense, and win condition discovery
**And** prompts are readable and not intrusive.

### Story 9.2: Balance the First Skirmish Loop

As a player,
I want the first skirmish to escalate fairly,
So that I can learn, recover, and still feel pressure.

**Acceptance Criteria:**

**Given** the first skirmish is played
**When** economy and AI timing are tuned
**Then** player can complete first metal loop quickly, first fishing loop early, and face readable AI pressure without instant failure.

### Story 9.3: Add Match Restart and Results Summary

As a player,
I want to restart and understand the match result,
So that wins and losses are clear.

**Acceptance Criteria:**

**Given** a match ends
**When** victory or defeat is reached
**Then** results show reason, cash earned, fish sold, metal harvested, units/buildings lost, and restart option.

### Story 9.4: Performance and Browser Compatibility Pass

As a player,
I want the game to remain responsive in target browsers and resolutions,
So that RTS controls feel reliable.

**Acceptance Criteria:**

**Given** the MVP skirmish is playable
**When** tested in Chromium and Firefox at 1920x1080 and 1366x768
**Then** core UI remains visible, camera/minimap controls work, and frame rate meets GDD targets.

### Story 9.5: MVP Regression Test Suite

As a developer,
I want the MVP covered by smoke and regression tests,
So that future polish does not break core RTS play.

**Acceptance Criteria:**

**Given** the MVP systems are integrated
**When** tests run
**Then** they cover boot, camera, minimap, selection, commands, movement, pathing, collision, harvesting, building, fishing, AI, win/loss, audio unlock, and UI layout.

## Final Validation

### FR Coverage Validation

All FR1-FR30 are mapped to at least one epic and represented by story acceptance criteria.

### Architecture Implementation Validation

- Architecture specifies a clean Vite + TypeScript + PixiJS reboot rather than a large starter template.
- Epic 1 Story 1 covers booting the new PixiJS RTS shell from `src`.
- Stories introduce entities, commands, map data, UI, audio, and tests only when needed by the relevant player-facing capability.
- Stories follow the architecture boundaries: simulation state remains separate from Pixi rendering, DOM UI, and audio.

### Story Quality Validation

- Stories are sized for focused implementation by a single dev agent.
- Acceptance criteria use testable Given/When/Then format.
- Stories do not depend on future stories inside the same epic.
- Epic order supports incremental playable value.

### Dependency Validation

- Epic 1 creates a navigable RTS map foundation.
- Epic 2 builds unit control on top of Epic 1 without requiring economy.
- Epic 3 adds land economy after unit commands exist.
- Epic 4 adds base growth after land economy exists.
- Epic 5 adds sea economy after dock/building support exists.
- Epic 6 adds AI and match completion after core economy loops exist.
- Epic 7 adds conflict after match flow exists.
- Epic 8 adds presentation polish across existing systems.
- Epic 9 hardens the integrated MVP.

### Workflow Status

Epics and stories are complete and ready for development.
