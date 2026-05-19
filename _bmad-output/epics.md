# Wambåsa Fishing Wars - Development Epics

## Epic Overview

| # | Epic Name | Scope | Dependencies | Est. Stories |
|---|---|---|---|---|
| 1 | RTS Foundation & Camera | Browser RTS shell, map viewport, camera, zoom, minimap, input blocking, resize handling | None | 7 |
| 2 | Selection, Commands & Movement | Unit selection, drag-select, right-click commands, pathing, collision, destination feedback | Epic 1 | 8 |
| 3 | Core Economy Loop | Command center, metal field, harvester truck, metal harvesting, resource UI, production queue | Epics 1-2 | 8 |
| 4 | Base Building & Production | Building placement, construction, House, Dock, unit queues, repair basics | Epics 1-3 | 9 |
| 5 | Sea Economy & Fishing | Boat production, dock unload, fishing zones, fish-to-cash loop, water movement | Epics 1-4 | 8 |
| 6 | AI Rival Skirmish | Enemy base, AI economy, AI fishing, raids, rebuild behavior, win/loss pressure | Epics 1-5 | 9 |
| 7 | Combat, Sabotage & Defense | Guards, saboteurs, attacks, building damage, boat sinking, warnings, repair response | Epics 2-6 | 9 |
| 8 | Art, Animation & Audio Pipeline | Generated asset cleanup rules, sprites, directional animation, UI skin, music/SFX integration | Epics 1-7 parallel where possible | 10 |
| 9 | Playable Skirmish Polish | Tutorial pacing, balance, UX clarity, post-match screen, playtest fixes, performance pass | Epics 1-8 | 10 |

---

## Epic 1: RTS Foundation & Camera

### Goal

Create the browser RTS shell that makes the game feel like a real map-based strategy game rather than a web page.

### Scope

**Includes:**

- Game boots from `src`.
- Full-screen/responsive RTS canvas or renderer.
- Coastal skirmish map viewport.
- Camera pan, drag pan, edge scroll, arrow-key pan.
- Mouse wheel zoom without page scroll.
- Camera bounds and resize handling.
- RTS minimap with click and drag viewport rectangle.

**Excludes:**

- Full economy.
- Final art.
- AI.
- Combat.

### Dependencies

None.

### Deliverable

A playable RTS map viewer with working camera, zoom, and minimap behavior.

### Stories

- As a player, I can load the RTS reboot from `src` so that I enter the new game instead of the old prototype.
- As a player, I can pan around the map so that I can inspect my base and resources.
- As a player, I can zoom in and out without scrolling the webpage so that camera control feels native.
- As a player, I can use edge scroll and drag pan so that navigation feels like classic RTS.
- As a player, I can click the minimap to jump the camera so that I can move quickly.
- As a player, I can drag the minimap viewport rectangle so that it behaves like an RTS minimap.
- As a player, I can resize the browser without losing UI or camera control.

---

## Epic 2: Selection, Commands & Movement

### Goal

Make unit interaction feel like classic RTS control.

### Scope

**Includes:**

- Unit entities.
- Left-click select.
- Drag-select.
- Shift-select.
- Selection outlines/rings.
- Right-click contextual commands.
- Destination markers.
- Pathing around blocked terrain/buildings.
- Unit collision and non-overlap.

**Excludes:**

- Advanced formations.
- Group hotkeys beyond basic later support.
- Final animation polish.

### Dependencies

Epic 1.

### Deliverable

Units can be selected and commanded around the map with reliable pathing and collision.

### Stories

- As a player, I can select one unit so that I know who receives commands.
- As a player, I can drag-select multiple units so that I can control groups.
- As a player, I can right-click terrain to move selected units so that commands are fast.
- As a player, I can see a move marker so that I know the command registered.
- As a player, I can send units around buildings so that invisible walls do not break play.
- As a player, my units do not stack inside each other so that selection and movement remain readable.
- As a player, I can issue contextual commands to resources/buildings so that interactions are simple.
- As a player, I can clearly see selected vs unselected units.

---

## Epic 3: Core Economy Loop

### Goal

Implement the first readable land economy loop.

### Scope

**Includes:**

- Factory Command Center.
- Metal fields.
- Harvester truck.
- Harvest, carry, return, unload states.
- Metal resource UI.
- Basic production queue for trucks/workers.
- Economy feedback effects.
- Blocked/invalid command feedback.

**Excludes:**

- Fishing economy.
- Full building roster.
- Enemy AI.

### Dependencies

Epics 1-2.

### Deliverable

The player can harvest metal and spend it on basic production.

### Stories

- As a player, I can see metal fields so that I understand where resources are.
- As a player, I can command a truck to harvest metal so that economy begins.
- As a player, I can see the truck load and return so that harvesting is readable.
- As a player, I receive metal when the truck unloads so that the economy loop has feedback.
- As a player, I can build another truck or worker from the command center so that I can scale.
- As a player, I can see why production is blocked if I lack resources.
- As a player, I can identify loaded vs empty trucks.
- As a player, I can recover if one truck is lost by producing another.

---

## Epic 4: Base Building & Production

### Goal

Allow the player to grow a working fishing company base.

### Scope

**Includes:**

- Building placement.
- Valid/invalid footprint display.
- Construction progress.
- House.
- Dock placement rules.
- Worker build/repair role.
- Production queues.
- Basic repair.
- Command panel UI.

**Excludes:**

- Large tech tree.
- Final campaign.
- Advanced defenses.

### Dependencies

Epics 1-3.

### Deliverable

The player can place and construct key buildings and produce basic units.

### Stories

- As a player, I can place a building footprint so that base expansion is deliberate.
- As a player, I can see invalid placement so that I do not fight hidden rules.
- As a player, I can order workers to construct buildings so that workers have purpose.
- As a player, I can build a House so that I can expand crew capacity.
- As a player, I can build a Dock on shoreline so that land and sea connect.
- As a player, I can repair damaged buildings so that recovery is possible.
- As a player, I can select buildings to see relevant production commands.
- As a player, I can understand production queues at a glance.
- As a player, command UI does not get blocked by the minimap.
- As a player, I can place and construct defensive buildings so that base layout matters.

---

## Epic 5: Sea Economy & Fishing

### Goal

Make fishing the second half of the RTS economy.

### Scope

**Includes:**

- Water movement.
- Dock boat production.
- Fishing boat unit.
- Fishing zones.
- Fish collection.
- Dock unload and fish-to-cash conversion.
- Boat feedback: wake, bob, fish, unload.
- Cash UI and income pulses.

**Excludes:**

- Advanced naval combat.
- Multiple boat classes.
- Deep market simulation.

### Dependencies

Epics 1-4.

### Deliverable

The player can build boats, fish, return to dock, and earn cash.

### Stories

- As a player, I can build a fishing boat from the dock so that sea economy starts.
- As a player, I can command a boat to a fishing zone so that water matters.
- As a player, I can see the boat fishing so that the action is readable.
- As a player, I can see fish converted to cash at the dock so that income feels satisfying.
- As a player, I can distinguish safe and contested fishing zones.
- As a player, I can lose boat income if I ignore water pressure.
- As a player, I can understand why a boat cannot move onto land.
- As a player, fishing zones feel like strategic objectives, not background art.

---

## Epic 6: AI Rival Skirmish

### Goal

Create a simple but active AI company that makes the game a competition.

### Scope

**Includes:**

- Enemy base.
- AI resource income.
- AI truck harvesting.
- AI dock/fishing behavior.
- Basic production decisions.
- Basic defense.
- Raids on exposed trucks/boats.
- AI rebuild logic.
- Win/loss tracking.

**Excludes:**

- Advanced personality system.
- Campaign scripting.
- Multiplayer.

### Dependencies

Epics 1-5.

### Deliverable

A complete skirmish can be won or lost against one AI rival.

### Stories

- As a player, I can see an enemy company base so that there is a clear rival.
- As a player, the enemy harvests resources so that it feels like a real competitor.
- As a player, the enemy launches boats so that fishing waters are contested.
- As a player, the enemy attacks exposed economy so that defense matters.
- As a player, I can damage enemy production so that sabotage/combat has purpose.
- As a player, the enemy can recover from small losses so that the match continues.
- As a player, I can win by destroying the enemy command center.
- As a player, I can win or lose by profit target.
- As a player, difficulty settings change AI pressure.

---

## Epic 7: Combat, Sabotage & Defense

### Goal

Add dirty-business conflict that disrupts economy without overpowering it.

### Scope

**Includes:**

- Guard/enforcer unit.
- Saboteur unit.
- Basic attack command.
- Building damage states.
- Truck/boat damage.
- Boat sinking.
- Sabotage shutdown effect.
- Warning alerts.
- Repair response.

**Excludes:**

- Large military roster.
- Complex tactical combat.
- Multiplayer combat balance.

### Dependencies

Epics 2-6.

### Deliverable

Players can raid, defend, sabotage, repair, and recover.

### Stories

- As a player, I can train guards so that I can protect my economy.
- As a player, I can train saboteurs so that I can disrupt rivals.
- As a player, I can attack enemy trucks so that harvest routes matter.
- As a player, I can sabotage a building so that enemy production is delayed.
- As a player, I receive clear warnings when attacked so that I can respond.
- As a player, damaged buildings and boats look damaged so that state is readable.
- As a player, I can repair damage so that recovery is part of the loop.
- As a player, boats can be sunk so that water conflict has stakes.
- As a player, combat supports economy pressure instead of replacing it.
- As a player, defensive buildings automatically engage enemy raiders so that I can protect my economy.
- As a player, enemy raids pressure my harvesters and docks enough that defenses are worth building.

---

## Epic 8: Art, Animation & Audio Pipeline

### Goal

Establish the production-quality style and feedback pipeline.

### Scope

**Includes:**

- Art pipeline rules.
- Generated asset prompts and cleanup workflow.
- Terrain/building/unit sprite standards.
- Directional worker animation.
- Truck/boat animation states.
- UI skin matching game style.
- Music loop and audio settings.
- Gameplay SFX integration.
- Performance-safe atlasing/compression.

**Excludes:**

- Full campaign art.
- Large number of alternate factions.
- Full voiceover.

### Dependencies

Can start after Epic 1; final polish depends on Epics 2-7.

### Deliverable

The game no longer feels placeholder: units animate clearly, UI matches style, and audio has real music plus readable feedback.

### Stories

- As a player, workers visibly walk so that units feel alive.
- As a player, trucks animate while harvesting and unloading so that economy feels physical.
- As a player, boats wake, bob, fish, unload, and sink so that sea play feels polished.
- As a player, buildings visually communicate idle, active, damaged, and construction states.
- As a player, the UI matches the coastal-industrial RTS style.
- As a player, music feels like an active industrial/coastal RTS track, not ambience.
- As a player, command sounds confirm my actions instantly.
- As a developer, generated assets follow a consistent art bible so that the game looks cohesive.
- As a developer, sprites are atlased/compressed so that browser performance stays stable.
- As a player, visual effects make harvesting, fishing, sabotage, repair, and victory satisfying.

---

## Epic 9: Playable Skirmish Polish

### Goal

Turn the vertical slice into a playable, understandable, replayable MVP.

### Scope

**Includes:**

- Tutorial skirmish flow.
- Objective panel.
- Alerts positioned near player attention.
- Balance tuning.
- Post-match summary.
- Restart flow.
- Settings: audio, UI scale, difficulty.
- Performance pass.
- Playtest fixes.
- Bug fixing for pathing, selection, minimap, UI, and animation.

**Excludes:**

- Full campaign.
- Multiplayer.
- Large content expansion.

### Dependencies

Epics 1-8.

### Deliverable

A complete browser RTS skirmish MVP that can be playtested as Wambåsa Fishing Wars.

### Stories

- As a player, I can understand the first objective without external explanation.
- As a player, tutorial prompts appear where I can read them during play.
- As a player, alerts are readable and not hidden in poor snackbar placement.
- As a player, I can complete a match with win/loss feedback.
- As a player, I can restart quickly after victory or defeat.
- As a player, I can adjust music/SFX volume.
- As a player, the game remains readable at laptop and desktop resolutions.
- As a player, the minimap never blocks command buttons.
- As a player, the game runs smoothly enough that RTS control feels responsive.
- As a developer, playtest issues are tracked and resolved before content expansion.
