---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - _bmad-output/game-brief.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'gdd'
lastStep: 14
project_name: 'Wambasa-fishing'
user_name: 'Rietzr'
date: '2026-05-15'
game_type: 'strategy'
game_name: 'Wambåsa Fishing Wars'
---

# Wambåsa Fishing Wars - Game Design Document

**Author:** Rietzr
**Game Type:** Strategy
**Target Platform(s):** Browser-first PC, mouse/keyboard

---

## Executive Summary

### Core Concept

Wambåsa Fishing Wars is a browser-first classic RTS about rival fishing companies fighting for economic dominance on one connected coastal map. Players build a Factory Command Center, harvest metal with trucks, train workers and fishermen, produce fishing gear, launch boats from docks, and compete against AI companies for fish, money, territory, and market control.

The game takes the readable base-building, harvesting, unit control, and skirmish pressure of Red Alert and Command & Conquer, then replaces the usual military fantasy with a funny alternate-world fishing-company war. Victory can come through stronger economy, water control, dirty sabotage, ship sinking, or destroying the rival company’s command center.

### Target Audience

All ages, with strongest appeal to PC players who have nostalgia for classic RTS games. The primary audience is core strategy players who enjoy base building, resource harvesting, production queues, tactical attacks, and economic pressure.

### Unique Selling Points (USPs)

Fishing-company RTS fantasy; dual land/sea economy; profit victory plus sabotage; browser-first classic RTS accessibility.

### Game Name

Wambåsa Fishing Wars

### Game Type

**Type:** Strategy
**Framework:** This GDD uses the strategy template with type-specific sections for resource systems, unit types and stats, technology/progression, map and terrain, AI opponent behavior, and victory conditions.

---

## Target Platform(s)

### Primary Platform

Browser-first PC game.

### Platform Considerations

The game targets desktop browser play first, with enough performance and polish to support a classic RTS experience. The browser version must feel immediate and responsive, not like a constrained web toy. Later desktop packaging can be considered if the core skirmish proves strong.

Performance and UX priorities are stable frame rate, responsive selection and commands, smooth camera movement, readable unit animation, crisp minimap behavior, and clear UI at common desktop resolutions.

### Control Scheme

Mouse/keyboard RTS controls:

- Left-click select unit/building.
- Drag-select groups.
- Right-click move, harvest, attack, fish, or interact.
- Keyboard hotkeys for core commands.
- Mouse wheel zoom.
- Edge scroll, middle/right mouse camera drag, and RTS minimap navigation.

---

## Target Audience

### Demographics

All ages, with strongest appeal to PC players who have nostalgia for classic RTS games.

### Gaming Experience

Core strategy players who enjoy base building, resource harvesting, production queues, tactical attacks, and economic pressure.

### Genre Familiarity

Players are expected to understand classic RTS conventions from games like Red Alert, Command & Conquer, and Age of Empires. The design should still be readable enough that strategy/economy players can learn it.

### Session Length

Longer evening sessions built around complete skirmishes rather than short mobile-style play.

### Player Motivations

Players are drawn by nostalgic RTS control, building an efficient base, out-producing rival companies, controlling fishing waters, defending supply routes, pulling off sabotage, and winning through a stronger business.

---

## Goals and Context

### Project Goals

1. **Prove the RTS Reboot** - Build a playable `src` skirmish that validates the new one-map RTS direction, with the old prototype kept in `src-tmp` as reference/archive.

2. **Nail Classic RTS Feel** - Camera, minimap, selection, pathing, collision, commands, unit animation, and building interactions must feel responsive and readable.

3. **Make Fishing Economy Matter** - Metal harvesting, factory production, dock/boat construction, fishing income, sabotage, and profit must connect into one coherent war economy.

4. **Establish a Repeatable Asset Pipeline** - Generated art can be used, but assets must be consistent in perspective, scale, silhouette, cleanup, and animation quality.

### Background and Rationale

The existing Wambåsa prototype proved that the fishing/factory economy has charm, but its separate factory, ocean, and road modes created a clunky experience that did not satisfy the desired RTS fantasy. The reboot reframes the game as one connected Red Alert-style map where factories, trucks, docks, boats, workers, fishermen, sabotage, and rival companies all interact directly.

This matters because classic RTS players still want readable base building, harvesting, and unit control, but the genre often feels too serious or too familiar. Wambåsa Fishing Wars gives that audience a fresh hook: a funny fishing-company economy war where profit, water control, and dirty business tactics matter.

---

## Unique Selling Points (USPs)

1. **Fishing Company War Fantasy** - A familiar RTS structure with a distinct setting: rival companies fighting over metal, fishing parts, boats, fish, docks, and market dominance.

2. **Dual Land/Sea Economy** - Land production and sea income are both essential. Trucks harvest metal, factories produce parts, docks launch boats, and fishing waters become contested economic territory.

3. **Profit Victory plus Sabotage** - Players can win through money and market control, while also attacking enemy supply lines, sabotaging factories, damaging docks, and sinking boats.

4. **Browser-First Classic RTS Accessibility** - The game aims to deliver immediate mouse/keyboard RTS play in a browser, with readable controls and quick access.

### Competitive Positioning

Wambåsa Fishing Wars sits between classic RTS games and economy/management games. It keeps the RTS clarity of Red Alert and Command & Conquer, but differentiates through a playful fishing-company economy, one-map land/sea pressure, and dirty business rivalry.

---

## Core Gameplay

### Game Pillars

1. **Readable Classic RTS Control** - Every unit, building, command, and animation must be obvious at gameplay zoom. Selection, movement, construction, harvesting, production, and attacks should feel familiar to Red Alert and Command & Conquer players.

2. **Economy Is the War** - Harvesting metal, producing fishing parts, launching boats, catching fish, selling goods, and out-earning rivals are the main conflict. Combat and sabotage matter because they disrupt the economy.

3. **Land and Sea Pressure** - The player manages one connected battlefield where land-based factory/base play and water-based fishing/naval control both matter.

4. **Funny Dirty Competition** - Sabotage, ship sinking, raids, and rival company behavior create memorable chaos without losing RTS readability.

**Pillar Prioritization:** Readable Classic RTS Control -> Economy Is the War -> Land and Sea Pressure -> Funny Dirty Competition

### Core Gameplay Loop

Players start with a Factory Command Center and basic worker/truck capability. They scout nearby resources, harvest metal, build production structures, train workers and fishermen, produce fishing gear, launch boats, fish for income, expand map control, defend against rival companies, and disrupt rival economies through raids or sabotage.

**Loop Diagram:**
Scout map -> Harvest metal -> Build/produce -> Launch boats -> Fish/sell -> Expand/defend -> Sabotage or attack rivals -> Reinvest profits -> Repeat

**Loop Timing:** Small command loops happen every few seconds; economy loops happen over several minutes; full skirmish loops should support longer evening sessions.

**Loop Variation:** Each cycle changes based on metal field position, fishing water control, AI pressure, sabotage opportunities, boat losses, production bottlenecks, and whether the player pursues profit victory or direct destruction.

### Win/Loss Conditions

#### Victory Conditions

- **Profit Victory:** Reach the target company value or cash goal before rivals.
- **Command Center Victory:** Destroy the enemy Factory Command Center.
- **Market Control Victory:** Control enough fishing waters and production capacity to force dominance.

#### Failure Conditions

- Player Factory Command Center is destroyed.
- Rival company reaches profit victory first.
- Player economy collapses beyond recovery because harvesters, dock, or production chain are lost.

#### Failure Recovery

Failure should teach the RTS economy: protect harvest routes, scout earlier, defend docks, rebuild boats, and sabotage rivals before they snowball. During a match, players should be able to recover from partial losses through repairs, replacement trucks, emergency workers, and defensive play.

---

## Game Mechanics

### Primary Mechanics

1. **Select and Command Units**
   Players select workers, trucks, fishermen, boats, and combat/sabotage units, then issue move, harvest, build, repair, fish, attack, sabotage, or dock commands. This must feel instant and readable.

2. **Build and Expand Base**
   Players place buildings such as Factory Command Center, Dock, House, storage, production buildings, defenses, and repair structures. Placement must communicate footprint, blocked tiles, power/range needs if any, and build progress.

3. **Harvest Metal**
   Harvester trucks travel between metal fields and the Factory Command Center or storage. This is the core land economy and must be visible, protectable, and disruptable.

4. **Produce Fishing Economy**
   Workers and factory buildings convert metal into fishing parts, gear, boats, upgrades, or sellable value. Bottlenecks should be visible so players understand why production is slow.

5. **Launch Boats and Fish**
   Docks build boats. Fishermen/boat crews use boats to claim fishing waters, generate fish income, return to dock, and compete with rival fleets.

6. **Scout, Attack, and Sabotage**
   Players reveal the map, find enemy economy, raid trucks, sabotage factories, damage docks, and sink boats. Combat exists to affect economy, not as disconnected spectacle.

7. **Defend and Repair**
   Players protect harvest routes, docks, boats, and key buildings with units, defenses, repair actions, and replacement production.

### Mechanic Interactions

Metal harvesting feeds factory production. Factory production creates gear, boats, workers, upgrades, and defenses. Boats generate fish income. Fish income funds expansion and pressure. Sabotage and combat disrupt enemy production, harvesting, docking, and fishing. Repair and rebuilding recover from disruption.

### Mechanic Progression

The MVP starts with a compact economy: command center, metal, truck, worker, dock, boat, and AI rival. Progression expands through additional buildings, unit roles, upgrades, boat types, sabotage tools, defenses, and enemy AI personalities.

### Controls and Input

### Control Scheme (Browser-first PC)

| Action | Input |
|---|---|
| Select unit/building | Left-click |
| Multi-select | Drag selection box |
| Add/remove from selection | Shift-click |
| Move/interact/harvest/fish/attack | Right-click contextual command |
| Open command/build panel | Select relevant unit/building |
| Build structure | Click build command, place footprint on map |
| Camera pan | Edge scroll, middle/right mouse drag, arrow keys |
| Zoom | Mouse wheel |
| Minimap move | Click/drag viewport rectangle |
| Hotkeys | Number groups and command shortcuts later |

### Input Feel

Controls must feel like classic RTS: immediate selection feedback, clear command confirmation, obvious destination markers, readable rally/route lines, responsive camera, and no fighting with browser scroll behavior.

### Accessibility Controls

Minimum accessibility targets: rebindable hotkeys later, scalable UI, readable contrast, clear selection outlines, no essential color-only information, and support for playing mostly with mouse.

---

## Strategy Specific Design

### Resource Systems

**Primary resources:**

- **Metal:** Main construction and production resource. Harvested by trucks from metal fields and returned to the Factory Command Center or storage.
- **Cash:** Main spendable economy. Generated by fishing, selling catches, market control, and possibly completing production contracts.
- **Fish:** Sea income resource gathered by boats from fishing waters and converted into cash at docks.
- **Population/crew capacity:** Soft cap from Houses or crew buildings, used by workers, fishermen, truck drivers, and sabotage/combat units.
- **Build capacity:** Factory, Dock, and House queues limit how quickly the player can scale.

**Gathering model:**

- Trucks harvest metal on land in visible routes that can be blocked, raided, or defended.
- Boats fish in water zones, then return to dock to sell or unload.
- Fishing zones can become depleted, contested, or temporarily disrupted by enemy activity.
- Cash income should be understandable from the map, not hidden in menus.

**Spending model:**

- Metal funds buildings, trucks, defenses, repairs, and factory production.
- Cash funds units, upgrades, boats, sabotage actions, and faster recovery.
- Fish is converted into cash and can later support market-control scoring.

**Strategic tension:**

The player must balance land economy and sea economy. Ignoring metal slows base growth. Ignoring fishing loses the profit race. Ignoring defense makes trucks, docks, and boats easy sabotage targets.

### Unit Types and Stats

**Core MVP roster:**

| Unit | Role | Key Stats | Built From |
|---|---|---|---|
| Worker | Builds, repairs, basic factory tasks | Low health, medium speed, no/weak attack | House |
| Harvester Truck | Harvests metal | Medium health, slow when loaded, no attack | Factory Command Center |
| Fisherman / Boat Crew | Enables fishing boats and dock work | Low health, medium speed | House |
| Fishing Boat | Generates fish income | Medium health, water-only, weak/none attack | Dock |
| Saboteur | Disrupts buildings, trucks, docks, boats | Low health, fast, high utility | House or special building |
| Guard / Enforcer | Basic defense and anti-saboteur | Medium health, short range | House or security building |

**Building roster:**

| Building | Role |
|---|---|
| Factory Command Center | Base core, truck production, metal drop-off, player defeat target |
| Dock | Boat production, fish drop-off, sea economy hub |
| House | Worker/fisherman population and basic unit production |
| Storage Yard | Extra metal drop-off and economy expansion |
| Workshop | Fishing gear, truck/boat upgrades, repair tech |
| Security Post | Defensive unit production or static defense unlock |
| Repair Crane / Yard | Faster building, truck, and boat repairs |

**Counter logic:**

- Saboteurs threaten economy but lose to guards and detection.
- Guards protect bases and routes but do not generate economy.
- Boats control fishing waters but depend on docks.
- Trucks are valuable economy targets and should require route defense.
- Static defenses help hold territory but cannot win alone.

### Technology and Progression

The tech tree should be compact and readable, closer to classic RTS than a deep 4X tree.

**Tier 1: Starter Company**

- Factory Command Center
- House
- Worker
- Harvester Truck
- Dock
- Basic Fishing Boat

**Tier 2: Working Operation**

- Workshop
- Storage Yard
- Faster harvesting upgrade
- Better fishing gear
- Boat speed/cargo upgrade
- Basic guard or security post

**Tier 3: Dirty Business**

- Saboteur
- Dock disruption tools
- Truck armor upgrade
- Factory efficiency upgrade
- Defensive structures
- Advanced fishing boat or patrol boat

**Progression rule:**

Every unlock must create a visible map effect. If an upgrade cannot be seen or felt through faster harvesting, stronger defense, better fishing income, or clearer sabotage pressure, it should not be in the first release.

### Map and Terrain

**Map structure:**

A single coastal RTS map with land base zones, metal fields, roads/paths, shoreline docks, water fishing zones, and enemy company territory. The first map should be medium-small so the player reaches conflict quickly without constant camera travel.

**Terrain types:**

- **Buildable land:** Base and expansion areas.
- **Road/flat ground:** Faster movement for trucks and workers.
- **Metal fields:** Harvest nodes that create route pressure.
- **Shoreline/dock slots:** Required for docks and boat access.
- **Water:** Boat-only movement and fishing zones.
- **Blocked terrain:** Rocks, cliffs, buildings, deep obstacles.
- **Choke points:** Defensible land and harbor approaches.

**Vision:**

Fog of war should exist once the core loop works. For MVP, start with simple explored/unexplored visibility and add unit/building sight ranges later.

**Strategic points:**

- Nearby starter metal field.
- Contested central metal field.
- Safe starter fishing zone.
- Rich contested fishing zone.
- Enemy harvest route.
- Shoreline attack/sabotage approach.

### AI Opponent

The MVP AI should be simple but active.

**AI priorities:**

1. Build basic economy.
2. Harvest metal.
3. Build dock and fish.
4. Train basic defenders.
5. Attack exposed trucks or boats.
6. Sabotage or raid if the player leaves openings.
7. Rebuild critical economy when damaged.

**Difficulty levels:**

- **Easy:** Slower build timing, fewer attacks, mostly teaches economy.
- **Normal:** Balanced economy, occasional raids, competes for fishing zones.
- **Hard later:** Faster expansion, smarter attacks, better recovery.

**AI fairness:**

The first version should avoid hidden cheating where possible. If resource boosts are needed, they should be small and documented for difficulty tuning.

### Victory Conditions

**Primary MVP victory:**

Destroy the enemy Factory Command Center or reach a defined cash/profit target before the enemy.

**Secondary/expanded victory:**

- Control enough fishing waters for a fixed time.
- Bankrupt the rival by destroying trucks, docks, and income capacity.
- Scenario-specific objectives in future campaign missions.

**Defeat:**

- Player Factory Command Center destroyed.
- Enemy reaches the profit target first.
- Player has no recoverable production/economy path.

**Surrender/restart:**

The game should include fast restart and clear post-match summary: cash earned, fish sold, metal harvested, boats lost, trucks lost, enemy damage, and win condition.

---

## Progression and Balance

### Player Progression

Progression in Wambåsa Fishing Wars is primarily **skill**, **match power**, and **content progression inside a skirmish**. The player gets better at classic RTS execution while each match escalates from a small fishing company base into a larger land-and-sea operation.

#### Progression Types

- **Skill progression:** Players improve at camera control, selection, build order, route protection, dock timing, scouting, sabotage defense, and deciding when to expand or attack.
- **Power progression:** During a match, the player unlocks stronger economy, better boats, faster harvesting, improved repairs, defenses, and sabotage tools.
- **Content progression:** New buildings, unit roles, upgrades, fishing zones, contested metal fields, and enemy behaviors appear as the match develops.
- **Economic progression:** The player moves from survival economy to production scaling, sea income, market pressure, and offensive disruption.
- **Narrative flavor progression:** Later campaign/scenario content can reveal rival company identities, dirty business events, and company story, but MVP remains skirmish-first.

#### Progression Pacing

The first meaningful progress should happen quickly. Within the first few minutes, the player should have harvested metal, built or used a dock, produced a boat, and seen cash income from fishing. The match should then escalate into route defense, fishing-zone competition, upgrades, and enemy raids.

A target first-match pacing:

- **Minute 0-2:** Select units, harvest metal, understand command center and house.
- **Minute 2-5:** Build or activate dock, launch first boat, see fish-to-cash income.
- **Minute 5-10:** Expand economy, scout enemy, defend truck or boat routes.
- **Minute 10-20:** Upgrade, sabotage, fight over contested resources, push toward profit or command-center victory.
- **Minute 20+:** Resolve into victory, defeat, or strong comeback attempt.

### Difficulty Curve

The preferred curve is **sawtooth with player-selected difficulty**. Matches should alternate between building pressure and moments of recovery, rather than becoming constant stress. This fits longer evening RTS sessions where players want room to think, build, and then respond to attacks.

#### Challenge Scaling

Challenge increases through:

- Enemy economy scaling.
- Longer and more exposed harvest routes.
- More contested fishing zones.
- Enemy raids on trucks and boats.
- Saboteurs targeting docks, workshops, or command center.
- Map expansion forcing camera/minimap mastery.
- Resource depletion or richer contested resource nodes.

The game should avoid early frustration. The first attacks should be readable warnings: a truck raid, boat harassment, or visible enemy expansion. Later attacks can become coordinated land/sea pressure.

#### Difficulty Options

- **Easy:** Slower AI, fewer raids, forgiving income targets, visible tutorials/tooltips.
- **Normal:** Balanced AI economy, periodic raids, active fishing competition.
- **Hard:** Faster AI expansion, stronger raid timing, better defense and rebuilding.
- **Custom later:** Profit target, AI aggression, map size, resource abundance, fog of war.

If players are stuck, the game should support recovery through cheaper emergency workers, repair actions, replacement trucks, defensive structures, and clear "you are losing because..." feedback.

### Economy and Resources

Wambåsa Fishing Wars has a central RTS economy. The economy must be readable from the map, because economy is the main war.

#### Resources

| Resource | Earned By | Spent On | Design Purpose |
|---|---|---|---|
| Metal | Harvester trucks mining metal fields | Buildings, trucks, repairs, factory production | Land economy and expansion pressure |
| Fish | Boats fishing water zones | Converted to cash at docks | Sea economy and water control |
| Cash | Selling fish, market income, contracts later | Units, upgrades, boats, sabotage, recovery | Main score and flexible spending |
| Population/Crew | Houses or crew buildings | Unit capacity | Limits unit spam and gives houses purpose |
| Build Queue Capacity | Production buildings | Time-limited production | Creates RTS build-order decisions |

#### Economy Flow

Metal supports base growth. Base growth supports docks, boats, workers, defenses, and upgrades. Boats create fish. Fish becomes cash. Cash funds more production, upgrades, sabotage, and recovery. Enemy disruption can hit any link in the chain, so the player must protect trucks, docks, boats, and key buildings.

#### Economy Balance Principles

- Trucks and boats should feel valuable enough that losing them hurts.
- The player should never be confused about why production is blocked.
- Cash income should pulse clearly when fish is sold.
- Metal income should be visible through truck routes and unload events.
- Fishing zones should be worth fighting over, not decorative.
- Sabotage must delay or disrupt, not instantly end the match unless the player ignored defense.
- Profit victory should create pressure without making base destruction irrelevant.

#### Anti-Clunk Rules

- No hidden economy bottlenecks without UI explanation.
- No tiny unreadable buttons for core production.
- No important alerts in hard-to-read snackbars.
- No unit overlap that makes selection or collision feel broken.
- No minimap covering command buttons.
- No camera/zoom behavior that fights RTS control.

---

## Level Design Framework

### Level Types

#### Skirmish Maps

The main level type. A skirmish map contains:

- Player starting base area.
- Enemy company base area.
- Starter metal field near each base.
- Contested central metal or expansion resource.
- Buildable land around base zones.
- Shoreline dock positions.
- Safe starter fishing waters.
- Rich contested fishing waters.
- Attack paths for trucks, workers, guards, and saboteurs.
- Water paths for fishing boats and future patrol boats.

#### Tutorial Skirmish

A guided first map that teaches through play, not heavy text. It should introduce:

- Selecting units.
- Moving units.
- Harvesting metal.
- Building a House or Dock.
- Producing a boat.
- Fishing and selling fish.
- Defending a truck or dock.
- Winning through profit or destroying the enemy command center.

#### Challenge / Scenario Maps Later

Future maps can modify the core rules:

- Low metal, rich fishing waters.
- Rich metal, dangerous coastline.
- Many small islands and dock pressure.
- Rival starts stronger but has weak truck routes.
- Sabotage-focused map with narrow land access.
- Profit race map with limited combat.
- Dirty business scenario with scripted rival taunts/events.

#### Tutorial Integration

The first skirmish should act as the tutorial. The game should avoid separate boring tutorial levels unless needed. Instead, the first match uses staged prompts and safe pacing:

- Start with only command center, worker, and truck visible.
- Prompt player to select and right-click metal.
- Reveal dock/fishing objective after first metal delivery.
- Introduce enemy pressure with a small, readable raid.
- Show a clear objective panel: "Earn X cash or destroy rival command center."

Tutorial prompts must be small, readable, and near the player's attention area, not hidden in snackbars or blocked by minimap/UI.

#### Special Levels

No boss levels for MVP. The RTS equivalent of a climax is the final push against the rival command center, profit race endgame, or a contested rich fishing zone.

Later campaign missions can introduce special objectives:

- Sink the rival flagship.
- Capture a rich fishing ground.
- Survive a harbor strike.
- Sabotage a factory before the rival reaches profit target.
- Defend a convoy of harvest trucks.

### Level Progression

For MVP, progression is **single-map replayable skirmish**. Players can restart and replay the same map while systems are polished.

For later versions, use **open selection or linear campaign unlocks**:

- Skirmish mode: player chooses map, AI difficulty, and win condition.
- Campaign mode later: missions unlock in sequence and introduce new buildings/units gradually.
- Challenge mode later: special scenario rules unlock after the first skirmish is complete.

#### Unlock System

MVP has no complex unlock system. All required core tools should be available within the match through the tech tree.

Later unlocks can include:

- New maps after winning prior maps.
- New company rivals after campaign missions.
- New boat/upgrade options after scenario completion.
- Cosmetic company identity options.

#### Replayability

Replayability should come from RTS match variation:

- Different build orders.
- Different AI aggression timing.
- Different expansion choices.
- Fighting over fishing zones.
- Choosing profit victory vs. destruction victory.
- Sabotage opportunities.
- Resource route defense.

The first map should remain fun after several runs because the AI pressure and player choices create different outcomes.

#### Level Design Principles

- **One readable map before many maps:** Polish the first skirmish until camera, minimap, pathing, economy, and combat feel right.
- **Economy routes are level design:** Truck and boat routes must be visible, vulnerable, and defensible.
- **Water is not decoration:** Fishing zones must create meaningful income and conflict.
- **Every expansion creates a risk:** Better metal or fish should require more exposure.
- **Teach through pressure:** The map should show why defenses, scouting, and repairs matter by creating fair threats.
- **No UI-blocked gameplay:** Minimap and command panels must not cover essential buttons or map information.
- **Fast recovery beats hard failure:** The map should allow comeback after losing a truck or boat, but repeated ignored attacks should lose the match.
- **Camera travel must be reasonable:** Important areas should be spaced for RTS strategy, not tedious scrolling.

---

## Art and Audio Direction

### Art Style

Wambåsa Fishing Wars should use **semi-realistic 2D painted RTS art** with strong readability at browser-game scale. The look should feel like a Nordic coastal-industrial world: cold water, wet timber, worn metal, brass highlights, mist, dock cranes, factory yards, fishing boats, trucks, and practical buildings.

The art must avoid the old problem of "pretty static background with objects pasted on top." The map should be built as readable RTS terrain with clear functional zones: buildable ground, roads, metal fields, shoreline, docks, water lanes, fishing waters, blocked terrain, and enemy territory.

Generated image assets are allowed, but they must be treated as raw material. Every generated asset needs cleanup, normalized perspective, consistent scale, transparent/background-separated exports, and real animation planning.

#### Visual References

- **Red Alert / Command & Conquer:** RTS readability, clear unit/building silhouettes, base layout clarity, strong command feedback.
- **Age of Empires:** Economy readability, worker/harvester roles, map-resource clarity.
- **Existing Wambasa imagegen art bible:** Nordic coastal-industrial mood, muted natural colors, warm brass, worn metal, cold morning light, mist, wet wood, and workshop surfaces.
- **Semi-realistic generated concept art:** Used for richer buildings, boats, trucks, terrain tiles, and UI panels, but constrained by gameplay readability.

#### Color Palette

The palette should be restrained and functional:

- Muted sea green and blue-gray for water and atmosphere.
- Weathered wood browns for docks, crates, shoreline structures.
- Dark iron, brushed steel, and worn rubber for factory and vehicles.
- Brass/yellow accents for player-owned industrial details and command highlights.
- Off-white labels and UI text where needed.
- Rival company colors should be distinct and readable without overwhelming the natural palette.

Player/team color must be visible on roofs, flags, unit trim, selection rings, boat markings, and UI panels.

#### Camera and Perspective

Use an **elevated top-down or three-quarter RTS perspective**. The camera must prioritize control and readability over cinematic detail.

Rules:

- Buildings should have consistent angle and footprint.
- Units should be readable at normal zoom without needing extreme detail.
- Trucks, workers, boats, and saboteurs need directional animation silhouettes.
- Terrain and building art must not create fake collision or invisible walls.
- Docks must visually connect land and water in a functional way.
- Water zones must look playable, not like background decoration.

#### Animation Direction

Unit animation quality is a core requirement, not polish.

- Workers need clear walk cycles with visible leg/arm motion from gameplay zoom.
- Trucks need wheel/body motion, load state, and unload feedback.
- Boats need wake, bob, turn, fish, and dock/unload states.
- Building construction should show scaffolding/progress or staged build frames.
- Sabotage should show sparks, smoke, warning flashes, or temporary shutdown visuals.
- No "wiggle" placeholder animation should ship as final movement.
- Sprite sheets must be authored or generated with strict frame consistency, not random inconsistent poses.

### Audio and Music

Audio should be **richer industrial/coastal RTS music**, not background noise or white-noise ambience. The music should support longer evening sessions with a strong groove, but stay clear enough that command sounds and warnings are readable.

#### Music Style

The target sound is a hybrid of:

- Industrial harbor percussion.
- Low brass or synth bass for strategy tension.
- Sea-shanty-inspired melodic fragments, but not goofy parody.
- Metallic factory rhythm.
- Coastal atmosphere used lightly underneath, not as the main content.
- Dynamic layers that intensify during raids, sabotage, naval fights, or endgame profit race.

The default music should feel active and fun within the first 10 seconds, not like distant ambience.

#### Sound Design

Sound effects must make the RTS readable:

- Selection clicks and unit acknowledgements.
- Right-click command confirmation.
- Truck engine, harvest drill/clank, loaded-truck weight change, unload cash/metal pulse.
- Worker build/repair hammering and tool sounds.
- Dock bell, boat engine, water wake, fish catch, unload/sell sound.
- Sabotage sparks, alarms, shutdown hum, repair recovery.
- Building complete sting.
- Enemy attack warning.
- Cash gain and spend sounds.
- Victory/defeat music stingers.

Sound priority should favor gameplay-critical feedback over ambience.

#### Voice/Dialogue

MVP can use short non-verbal or lightly voiced acknowledgements instead of full VO.

Examples:

- Worker selected.
- Truck ready.
- Boat launched.
- "Saboteur spotted" style warning later.
- Rival taunts can be text/audio flavor later.

Full campaign voiceover is out of scope for MVP.

#### Aesthetic Goals

Art and audio must support the pillars:

- **Readable Classic RTS Control:** Strong silhouettes, clear team colors, crisp selection/command feedback, punchy UI sounds.
- **Economy Is the War:** Trucks, fish, cash, building queues, unloads, and production should be visually and sonically satisfying.
- **Land and Sea Pressure:** Land/shore/water zones must feel connected and strategically useful.
- **Funny Dirty Competition:** Sabotage, alarms, boat sinking, and rival pressure should create playful chaos without becoming unreadable.

---

## Technical Specifications

### Performance Requirements

Wambåsa Fishing Wars targets a browser-first PC RTS experience. Performance must prioritize responsive controls, stable camera movement, readable animations, and smooth unit updates over excessive visual detail.

#### Frame Rate Target

- **Target:** 60 FPS on common desktop/laptop browsers.
- **Minimum acceptable:** 30 FPS during heavy action on lower-end hardware.
- **Priority:** Input response, camera smoothness, selection feedback, and unit movement must remain stable even if visual effects are reduced.

#### Resolution Support

- Primary target: **1920x1080 desktop browser**.
- Must remain playable at common laptop resolutions such as **1366x768**.
- UI must scale without hiding command buttons, minimap, alerts, or production panels.
- The game should support browser resizing without breaking camera bounds or UI layout.

#### Load Times

- Initial playable load target: under **10 seconds** on a typical broadband connection after caching.
- First MVP build should keep asset size controlled, preferring fewer polished assets over many inconsistent ones.
- Large generated art should be compressed, atlased, and only loaded where needed.

### Platform-Specific Details

#### Browser Requirements

- Primary browsers: Chromium-based browsers first, then Firefox.
- WebGL rendering required.
- Mouse and keyboard are the primary inputs.
- Browser scroll, context menu, text selection, and page zoom behavior must not interfere with RTS controls.
- The game should run from the existing Vite/browser app structure in `src`.

#### Input Requirements

- Left-click selection and drag-select must be reliable.
- Right-click contextual commands must feel immediate.
- Mouse wheel zoom must not scroll the webpage.
- Edge scrolling, drag panning, arrow-key panning, and minimap dragging must coexist without fighting each other.
- Minimap must not block unit/building command UI.

#### Save/Session Requirements

- MVP can start with skirmish restart only.
- Later builds should support local settings persistence: volume, difficulty, UI scale, keybinds, and graphics options.
- Campaign/save progression is not required for MVP.

### Asset Requirements

The asset pipeline must support generated image assets, but only after cleanup and normalization.

#### Art Assets

Core MVP asset categories:

- Terrain tiles or map layers: land, road, shoreline, water, metal fields, obstacles.
- Buildings: Factory Command Center, Dock, House, Storage Yard, Workshop, Security Post, Repair Yard.
- Units: Worker, Harvester Truck, Fisherman/Crew, Fishing Boat, Saboteur, Guard.
- Effects: selection rings, move markers, harvest effects, fish/cash pulses, construction, repair, sabotage sparks, smoke, wake trails, explosions/sinking.
- UI: command panel, minimap frame, resource bar, production queue, alerts, tooltips, buttons, victory/defeat summary.

Art requirements:

- Consistent elevated RTS perspective.
- Strong silhouettes at gameplay zoom.
- Team-color support.
- Transparent or cleanly separated sprites.
- Atlased sprites where practical.
- No raw imagegen backgrounds used as collision maps.
- No licensed logos, brand marks, or real product replicas.

#### Animation Assets

Animation is a hard requirement.

- Workers need directional walk cycles with enough frames to clearly read as walking.
- Trucks need idle, move, loaded, harvest, unload, and damaged states.
- Boats need idle/bob, move, turn, fish, dock/unload, damaged/sink states.
- Buildings need construction, idle, active, damaged, and destroyed states where feasible.
- Sabotage and repair need clear readable effects.
- Placeholder wiggle animation is explicitly not acceptable for final movement.

#### Audio Assets

MVP audio categories:

- Main music loop with richer industrial/coastal theme.
- Optional intensity layers for attack/sabotage/endgame.
- Selection and command sounds.
- Unit acknowledgement sounds.
- Harvest, unload, fish, sell, build, repair, sabotage, warning, victory, defeat, and UI sounds.
- Ambient coastal/factory beds should be low priority and must not replace music.

#### External Assets

- Generated assets may be used if they follow the art bible and cleanup rules.
- Third-party libraries are acceptable for rendering, pathfinding, state machines, audio, or UI if they reduce risk.
- No licensed visual/audio assets should be used unless rights are clear.

#### Technical Constraints

- MVP implementation belongs in `src`; old prototype remains archived in `src-tmp`.
- Detailed engine choice belongs in architecture, but the selected stack must support RTS camera, sprite batching, minimap, pathfinding, collision, animation, AI, and audio layering.
- Unit collision and pathing must prevent units from stacking inside each other or entering buildings/blocked terrain.
- The minimap must behave like an RTS minimap: click to jump, drag viewport rectangle, and avoid blocking command UI.
- The game must support playtesting quickly in-browser with predictable local dev commands.

---

## Development Epics

### Epic Structure

### Epic Overview

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

### Recommended Sequence

Build the RTS foundation first, then movement/commands, then one land economy loop. After that, add building production, sea economy, AI, sabotage/combat, then polish. Art/audio work should start early as pipeline experiments, but final polish should happen after the core systems prove playable.

### Vertical Slice

The first playable milestone is: a player can open the game in browser, pan/zoom a coastal RTS map, select a worker/truck, right-click to move or harvest metal, see resources update, build or use a dock, launch a boat, fish for cash, and win or lose against a simple AI rival.

---

## Success Metrics

### Technical Metrics

Technical success means the game feels like a responsive browser RTS, not a clunky web prototype. Metrics should be checked during local playtests, automated smoke tests where possible, and manual browser compatibility passes.

#### Key Technical KPIs

| Metric | Target | Measurement Method |
|---|---|---|
| Frame rate | 60 FPS target, 30 FPS minimum during heavy action | Browser performance overlay/manual profiling |
| Input latency feel | Selection and right-click command feedback appears immediately | Playtest checklist and input instrumentation later |
| Initial load time | Under 10 seconds after cache on typical broadband | Browser devtools/network timing |
| Camera control | Pan, zoom, edge scroll, drag pan, and minimap drag work without page scroll conflicts | Manual RTS control checklist |
| Minimap usability | Click-to-jump and drag-rectangle behavior works reliably; minimap does not block command UI | Manual playtest checklist |
| Unit collision | Units do not stack, enter buildings, or pass through blocked terrain | Gameplay test scenarios |
| Pathing reliability | Units can reach valid work/resource/building targets without invisible-wall failures | Gameplay test scenarios |
| Animation readability | Workers, trucks, and boats visibly animate at gameplay zoom | Playtest observation |
| Audio functionality | Music and key SFX play at clear volume after browser interaction | Browser audio checklist |
| Resolution support | Playable at 1920x1080 and 1366x768 without hidden core UI | Manual layout tests |
| Crash/blocker rate | No known blocker bugs in MVP playtest build | Bug tracker/playtest logs |

### Gameplay Metrics

Gameplay success means players understand the RTS loop, complete matches, feel the economy matters, and recognize the fishing-company war fantasy.

#### Key Gameplay KPIs

| Metric | Target | Measurement Method |
|---|---|---|
| First objective clarity | New player understands first action within 30 seconds | Observed playtest |
| First economy loop | Player harvests metal and sees resource gain within 2 minutes | Playtest timing |
| First fishing loop | Player launches/uses boat and earns fish/cash within 5 minutes | Playtest timing |
| Match completion | Player can finish a skirmish with clear win/loss state | Playtest completion |
| RTS control confidence | Player can select, command, pan, zoom, and use minimap without repeated confusion | Playtest notes |
| Economy comprehension | Player can explain how metal, fish, cash, dock, and trucks connect | Post-playtest question |
| AI pressure | Player notices enemy activity before the endgame | Playtest observation |
| Comeback readability | Player understands how to recover after losing a truck/boat | Playtest question |
| Sabotage value | Player sees sabotage/raids as economy disruption, not random damage | Playtest observation |
| Replay intent | Player wants to replay or try a different strategy | Post-playtest question |

### Qualitative Success Criteria

The game is working if playtesters describe it with the intended language:

- "It feels like an RTS."
- "The fishing company war idea is funny."
- "I understand what my trucks and boats are doing."
- "The minimap/camera works like I expect."
- "The workers actually look alive."
- "The water/fishing part matters."
- "The music feels like music, not noise."
- "I lost because my economy got disrupted."
- "I want to try another build order."

Negative phrases that indicate failure:

- "I don't know where to click."
- "The units look dead."
- "The minimap is in the way."
- "The ocean feels like a separate minigame."
- "The UI is too small."
- "I cannot tell why this command failed."
- "It feels like placeholders."

### Metric Review Cadence

- **Every implementation batch:** Run a short manual RTS control checklist: camera, minimap, select, command, pathing, collision, UI visibility.
- **After each playable epic:** Run a 10-20 minute internal playtest and write notes.
- **Before adding new content:** Confirm core loop metrics still pass.
- **Before MVP release:** Run at least three fresh-player playtests and compare feedback against the qualitative success criteria.
- **After each art/audio pass:** Verify performance, readability, animation quality, and audio clarity did not regress.

---

## Out of Scope

The following items are explicitly out of scope for v1.0 / first playable MVP:

- Multiplayer, co-op, LAN, or online matchmaking.
- Full campaign mode with authored missions.
- Large faction roster or multiple playable companies.
- Deep naval combat with many ship classes.
- Advanced market simulation beyond fish-to-cash and profit victory pressure.
- Level editor, mod support, or user-generated content tools.
- Mobile, console, VR, or controller-first support.
- Full voice acting or cinematic cutscenes.
- Large orchestral score.
- Heavy narrative/lore system.
- Procedural map generation.
- Complex diplomacy.
- Advanced achievements, account systems, cloud saves, or backend services.
- Paid cosmetics, premium currency, or live-service monetization.

### Deferred to Post-Launch

- Campaign missions with rival company personalities.
- More maps and challenge scenarios.
- More buildings, unit types, upgrades, and sabotage tools.
- Skirmish customization beyond basic difficulty and win condition.
- Expanded narrative document and world lore.
- Desktop packaging if the browser version proves strong.
- Additional accessibility settings and keybinding depth.
- More advanced AI personalities.

---

## Assumptions and Dependencies

### Key Assumptions

- The reboot implementation target is `src`; the old prototype remains archived in `src-tmp`.
- The game remains browser-first for the MVP.
- Single-player against AI is the first playable target.
- Classic RTS controls are mandatory: select, drag-select, right-click command, camera pan/zoom, and minimap navigation.
- A small polished skirmish is more valuable than broad content with weak feel.
- Generated image assets can be used only if they are cleaned, normalized, and made consistent with the art bible.
- Animation quality is a core gameplay requirement because readable units are essential to RTS feel.
- The first playable version can use simple AI as long as it creates economic pressure.
- Profit victory and command-center destruction can coexist as MVP win conditions.
- Detailed engine/framework decisions will be finalized in the architecture workflow.

### External Dependencies

- Browser rendering stack selected during architecture.
- Pathfinding/collision approach selected during architecture.
- Generated art tooling or imagegen workflow for concept and sprite production.
- Audio/music creation pipeline for richer industrial/coastal music and SFX.
- Local playtest process for validating RTS feel.
- Optional third-party libraries for rendering, pathfinding, audio, UI, or state machines if they reduce implementation risk.

### Risk Factors

- RTS control feel can fail if camera, selection, commands, minimap, or collision are not polished early.
- Generated art can become inconsistent unless the pipeline enforces perspective, scale, silhouette, and cleanup.
- Unit animation can regress into unreadable placeholder motion unless sprite standards are strict.
- Browser performance can degrade if asset size, effects, or unit counts grow too early.
- AI can feel dead if it does not visibly harvest, fish, attack, and recover.
- Scope can expand quickly if campaign, extra units, naval combat depth, or more maps are added before the first skirmish works.

---

## Document Information

**Document:** Wambåsa Fishing Wars - Game Design Document  
**Version:** 1.0  
**Created:** 2026-05-15  
**Author:** Rietzr  
**Status:** Complete

### Change Log

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-15 | Initial GDD complete |

---

## Handoff Guidance

### Required Next Steps

1. **Game Architecture:** Define engine choice, rendering stack, pathfinding/collision architecture, animation pipeline, AI architecture, audio layering, and UI/minimap approach.
2. **Sprint Planning:** Convert the GDD and `_bmad-output/epics.md` into an implementation sprint plan.
3. **First Technical Prototype:** Build Epic 1 and Epic 2 as the first proof that camera, minimap, selection, movement, pathing, and collision feel like RTS controls.

### Recommended Actions

- Review the GDD once before architecture to catch scope drift.
- Use `_bmad-output/epics.md` as the source for implementation sequencing.
- Do not start broad content production until the first playable RTS control slice is proven.
- Use the art bible and animation requirements before generating production assets.
