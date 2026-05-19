---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: []
documentCounts:
  brainstorming: 0
  research: 0
  notes: 0
workflowType: 'game-brief'
lastStep: 8
project_name: 'Wambasa-fishing'
user_name: 'Rietzr'
date: '2026-05-15'
game_name: 'Wambåsa Fishing Wars'
---

# Game Brief: Wambåsa Fishing Wars

**Date:** 2026-05-15
**Author:** Rietzr
**Status:** Draft for GDD Development

---

## Executive Summary

Wambåsa Fishing Wars is a Red Alert-style fishing-company RTS where players build one coastal base, harvest metal, manufacture fishing gear, launch boats, and defeat rival companies through profit, sabotage, and water control.

**Target Audience:** Core strategy players of all ages who already understand classic RTS language and enjoy longer evening sessions with games like Red Alert, Command & Conquer, and Age of Empires.

**Core Pillars:** Readable Classic RTS Control, Economy Is the War, Land and Sea Pressure, and Funny Dirty Competition.

**Key Differentiators:** A fishing-company war fantasy, dual land/sea economy, profit-based victory pressure, and dirty business sabotage.

**Platform:** Browser-first PC game with mouse/keyboard RTS controls, staged in `src` after moving the old prototype to `src-tmp`.

**Success Vision:** A playable skirmish should feel like a funny, readable classic RTS where players build a working fishing empire, pressure rivals on land and sea, and win because their company runs smarter and meaner.

---

## Game Vision

### Core Concept

Wambåsa Fishing Wars is a Red Alert-style fishing-company RTS where players build one coastal base, harvest metal, manufacture fishing gear, launch boats, and defeat rival companies through profit, sabotage, and water control.

### Elevator Pitch

Wambåsa Fishing Wars turns the fishing business into an RTS battlefield. Build a factory command center, send trucks to harvest metal, train workers and fishermen, produce fishing parts, and launch boats from your dock to claim the richest waters before rival companies do. Win by running the strongest economy, disrupting enemy production, sabotaging factories, and sinking their boats when business gets dirty.

### Vision Statement

The vision for Wambåsa Fishing Wars is to become a readable, funny, polished RTS where fishing-company competition plays like classic Red Alert on one lively coastal map. Every unit and building should have clear purpose and strong animation: harvest trucks rumble between metal fields and factories, workers construct and repair buildings, fishermen board boats, factory lines produce parts, and enemy companies pressure the player’s economy from land and sea. A finished match should feel like building a working fishing empire under pressure, then outsmarting or out-sabotaging rivals until your company controls the market.

---

## Target Market

### Primary Audience

Wambåsa Fishing Wars is primarily for core strategy players of all ages who already understand classic RTS language and enjoy games like Red Alert, Command & Conquer, and Age of Empires. These players want readable units, fast command response, base building, resource harvesting, production queues, rival pressure, and satisfying skirmish flow.

**Demographics:**
All ages, with strongest appeal to PC players who have nostalgia for classic RTS games and still enjoy longer evening strategy sessions.

**Gaming Preferences:**
Classic RTS controls, clear unit roles, one-map battles, base expansion, harvesting, production, defense, attacks, and economy snowballing.

**Motivations:**
Nostalgia, base-building mastery, efficient production, outplaying rival companies, funny sabotage moments, and the satisfaction of winning through a stronger economy.

### Secondary Audience

A secondary audience is strategy and economy players who may not be hardcore RTS veterans but enjoy building production chains, managing resources, and competing against visible rivals. The fishing-company theme, profit race, boats, harvesting trucks, and sabotage should make the RTS format easier to understand and more playful.

### Market Context

The game sits in the classic RTS space, using Red Alert, Command & Conquer, and Age of Empires as key reference points for readability, base building, unit production, harvesting, and match pacing. Its market opportunity is the combination of familiar RTS structure with an unusual fishing-company economy, where land production and water control both matter.

**Similar Successful Games:**
Red Alert, Command & Conquer, Age of Empires.

**Market Opportunity:**
Many players still want readable RTS games with strong base-building fantasy, but the genre often feels either too serious, too complex, or too nostalgic without a fresh hook. Wambåsa Fishing Wars can stand out by keeping the classic RTS clarity while making the economy funny, concrete, and visually distinctive through fishing fleets, metal harvesting, factory production, sabotage, and rival companies.

---

## Game Fundamentals

### Core Gameplay Pillars

1. **Readable Classic RTS Control** - Every unit, building, command, and animation must be obvious at gameplay zoom. Selection, movement, construction, harvesting, production, and attacks should feel familiar to Red Alert and Command & Conquer players.

2. **Economy Is the War** - Harvesting metal, producing fishing parts, launching boats, catching fish, selling goods, and out-earning rivals are the main conflict. Combat and sabotage matter because they disrupt the economy.

3. **Land and Sea Pressure** - The player must manage one connected battlefield where land-based factory/base play and water-based fishing/naval control both matter.

4. **Funny Dirty Competition** - Sabotage, ship sinking, raids, and rival company behavior should create memorable chaos without losing RTS readability.

**Pillar Priority:** When pillars conflict, prioritize:
Readable Classic RTS Control -> Economy Is the War -> Land and Sea Pressure -> Funny Dirty Competition

### Primary Mechanics

Players build factory command centers, docks, houses, defenses, storage, production buildings, and repair yards. They harvest metal with trucks, protect truck routes, train workers and fishermen, produce fishing parts, launch boats, fish and sell catches, scout rivals, attack and sabotage enemy factories/trucks/docks/boats, defend and repair their own operation, and win through profit dominance, HQ destruction, or market-control victory.

**Core Loop:** Build base -> harvest metal -> train units -> produce fishing gear -> launch boats -> fish and sell -> expand or sabotage rivals -> defend economy -> out-earn or defeat enemy companies.

### Player Experience Goals

The game should deliver nostalgic RTS flow, satisfying production chains, constant strategic pressure, readable chaos, and victory through better business.

**Emotional Journey:** A good session starts with familiar RTS setup, grows into a busy land-and-sea economy, escalates into sabotage and naval conflict, and ends with the player feeling they built the smarter, meaner, more profitable fishing company.

---

## Scope and Constraints

### Target Platforms

**Primary:** Browser-first PC game with mouse/keyboard RTS controls.

**Secondary:** Later desktop packaging may be considered if the browser version becomes strong enough.

### Development Timeline

No fixed timeline is defined in the brief. Development should proceed by playable proof points: first a technical RTS slice in `src`, then a vertical skirmish slice, then expanded content only after the core RTS feel is proven. The old prototype is archived in `src-tmp`.

### Budget Considerations

The project is self-funded and should minimize paid dependencies. Visual assets should use generated image assets where practical, supported by cleanup, sprite-sheet preparation, and code-driven effects. Outsourcing is not assumed for MVP.

### Team Resources

The project is built as a solo developer effort with AI assistance for planning, implementation, art prompts, generated assets, testing, and documentation.

**Skill Gaps:** The biggest risks are RTS-scale asset production, animation quality, AI behavior, pathfinding, and producing enough polished feedback without a large art/audio team.

### Technical Constraints

The reboot should be implemented in `src`, while the old prototype remains archived in `src-tmp`. The technology choice should prioritize browser performance, crisp RTS camera/minimap behavior, readable unit animation, sprite batching, pathfinding, and AI skirmish behavior. Phaser 3, PixiJS plus custom systems, or another browser-first stack can be evaluated, but the MVP should choose the stack that best supports classic RTS feel in-browser.

Single-player skirmish against AI companies is the MVP target. Multiplayer is out of scope for the first playable reboot.

### Scope Realities

The first reboot slice must focus on a small but complete RTS loop: one map, one player base, one AI rival, metal harvesting, factory production, dock/boats, fishing income, basic combat/sabotage, and a clear win/loss condition. The game should prove RTS feel before expanding unit rosters, buildings, campaign content, multiplayer, or advanced economy depth.

---

## Reference Framework

### Inspiration Games

**Red Alert**

- Taking: Fast readable skirmish flow, base building, harvesting, production queues, map pressure, and satisfying unit control.
- Not Taking: Heavy lore seriousness, old UI friction, or dated interaction pain.

**Command & Conquer**

- Taking: Clear base fantasy, harvest economy pressure, attack/defense rhythm, iconic unit roles, and readable RTS feedback.
- Not Taking: Overly rigid mission scripting for the MVP or a purely military setting.

**Age of Empires**

- Taking: Economy expansion, worker usefulness, map control, and readable progression.
- Not Taking: Deep historical tech-tree breadth, huge civilization count, or large-scale complexity beyond the first playable scope.

### Competitive Analysis

**Direct Competitors:**
Classic RTS games such as Red Alert, Command & Conquer, and Age of Empires, plus modern RTS and management hybrids that combine economy, production, and combat pressure.

**Competitor Strengths:**
These games prove that players enjoy base building, visible resource loops, production queues, map control, and escalating pressure from rivals.

**Competitor Weaknesses:**
Many RTS games are either very serious, too mechanically dense, too nostalgic without a fresh hook, or difficult to access quickly in a browser. Management games often have strong economy but weaker direct conflict and unit control.

### Key Differentiators

1. **Fishing Company War Fantasy** - The game uses classic RTS structure, but the fantasy is rival fishing companies fighting over metal, production, boats, fishing waters, and profit.

2. **Dual Land/Sea Economy** - Land and sea both matter: trucks harvest metal, factories produce parts, docks launch boats, and fishing waters generate income and conflict.

3. **Profit as Victory Pressure** - Players can win through market dominance and stronger business performance, not only by destroying enemy bases.

4. **Dirty Business Sabotage** - Factory sabotage, truck raids, dock damage, and boat sinking give the game a playful aggressive identity that fits the fishing-company theme.

**Unique Value Proposition:**
A browser-first classic RTS where the familiar joy of base building, harvesting, and unit control is fused with a funny fishing-company economy and dirty business rivalry.

---

## Content Framework

### World and Setting

Wambåsa Fishing Wars takes place in a silly alternate-world coastal industry setting where rival fishing companies behave like RTS factions. The world should feel industrial, salty, competitive, and slightly absurd: factories produce fishing gear like military hardware, trucks harvest metal for reel parts, docks launch company fleets, and fishing waters become contested territory.

### Narrative Approach

The MVP should be skirmish-first and mostly emergent. Story can come later through missions, rival company personalities, campaign objectives, and company flavor.

**Story Delivery:** Light company flavor, unit/building names, rival taunts, environmental detail, and eventual campaign mission text. No heavy cutscene pipeline for the first playable reboot.

### Content Volume

The first playable reboot should keep content deliberately small: one map, one player company, one AI rival, a compact building set, a small unit roster, one or two fish/water zones, one metal resource type, and a few sabotage/combat interactions. Expansion content can add more maps, rivals, factions, mission structure, boats, defenses, upgrades, and story later.

---

## Art and Audio Direction

### Visual Style

The target visual direction is semi-realistic generated RTS art, but with strict readability requirements. Buildings, units, boats, trucks, resources, and effects must have strong silhouettes and clear animation states at gameplay zoom. Generated assets are acceptable, but they must be cleaned, normalized, and prepared as real game assets rather than dropped in raw.

**References:** Classic Red Alert/Command & Conquer readability, modern semi-realistic generated coastal-industrial art, and the existing Wambåsa factory/fishing art direction where it supports RTS clarity.

### Audio Style

Audio should use richer industrial/coastal RTS music rather than ambient noise. Factory rhythms, harbor percussion, metallic hits, boat horns, water movement, engines, harvesting, construction, and sabotage effects should make the economy feel alive and responsive.

### Production Approach

Use generated image assets where practical, but treat asset cleanup and sprite-sheet preparation as part of production. Prioritize fewer polished assets over many inconsistent ones. For animation, use authored or normalized RTS-readable sprite sheets with strong silhouettes before chasing visual detail.

---

## Risk Assessment

### Key Risks

1. **Animation Quality Risk** - Units may look bad or unreadable if generated frames are inconsistent.
2. **RTS Feel Risk** - Camera, selection, pathing, minimap, command UI, and responsiveness must feel right or the game fails.
3. **AI Risk** - Enemy companies need enough behavior to create pressure without becoming too complex.
4. **Asset Consistency Risk** - Generated assets can clash in perspective, scale, color, and silhouette.
5. **Scope Risk** - RTS systems can grow quickly: economy, AI, combat, building, pathfinding, map control, and UI all compete for attention.

### Technical Challenges

Browser performance, sprite batching, pathfinding around buildings/resources/water, unit collision, AI decision-making, construction placement, minimap behavior, and reliable animation pipelines are the main technical challenges.

### Market Risks

Classic RTS fans have high expectations for control feel and readability. A browser RTS also needs to feel immediate and polished enough that players do not dismiss it as a toy prototype.

### Mitigation Strategies

Start with a small `src` RTS vertical slice: one map, one command center, one harvester truck, one metal field, one dock, one boat, one worker, one AI rival, and one win condition. Prove RTS controls, camera, minimap, pathing, harvesting, production, and basic AI before expanding. Use an art bible and asset pipeline rules for generated assets, especially units and animations.

---

## Success Criteria

### MVP Definition

The minimum playable reboot is one complete RTS skirmish slice in `src`: one map, one player company, one AI rival, one Factory Command Center, one Dock, one House, one metal field, one harvester truck, one worker, one fisherman or boat crew unit, one fishing boat, and one clear win/loss condition.

The MVP must include metal harvesting, factory production, boat fishing/selling, basic enemy AI, basic combat/sabotage against trucks/docks/boats/factory, RTS camera, selection, minimap, command UI, pathing, unit collision, readable animations, and a playable match flow.

### Success Metrics

The first playable reboot is successful when:

- A player can understand what to do without explanation.
- A skirmish can complete with a win or loss.
- Units animate clearly at RTS zoom.
- Camera, minimap, selection, and command UI feel like RTS controls rather than web UI.
- Economy decisions matter to the outcome.
- Enemy AI creates pressure through harvesting, building, fishing, attacking, or sabotage.
- Playtesters describe it as a funny RTS fishing war, not a clunky prototype.

### Launch Goals

The launch goal for the first public-ready version is a polished browser skirmish that proves the core fantasy: build a fishing company base, harvest metal, produce fishing gear, launch boats, earn money, and beat a rival company through economy and dirty tactics.

---

## Next Steps

### Immediate Actions

1. Use `src` as the dedicated reboot implementation area, with the old prototype archived in `src-tmp`.
2. Decide the browser RTS technical stack by comparing Phaser 3 against PixiJS plus custom RTS systems for sprite batching, camera, minimap, pathing, animation, and AI.
3. Build a tiny technical prototype with camera, minimap, unit selection, unit movement, collision, and one harvester loop.
4. Create an RTS asset pipeline using generated assets only after defining strict rules for perspective, scale, silhouette, animation frames, and cleanup.
5. Build the first vertical slice: command center, metal field, harvester truck, dock, boat, fishing income, AI rival, and win/loss condition.
6. Playtest the slice against the target feeling: readable Red Alert-style control, funny fishing-company economy, and low UI friction.

### Research Needs

Research is needed for the best browser RTS rendering stack, pathfinding/collision architecture, sprite animation pipeline for generated assets, lightweight AI skirmish behavior, and readable RTS UI/minimap patterns.

### Open Questions

Open questions:

- Should the first `src` slice use Phaser 3, PixiJS, or another browser-first rendering stack?
- What exact camera/minimap behavior should be treated as the reference standard?
- How realistic vs stylized should generated units be to stay readable at RTS zoom?
- What is the simplest enemy AI that creates pressure without overbuilding the simulation?
- Should profit victory be a primary win condition from the first slice, or secondary after command-center destruction?

---

## Appendices

### A. Research Summary

No external research documents were loaded for this brief. The direction is based on the current Wambåsa prototype, playtest pain points, and the user-provided Red Alert / Command & Conquer / Age of Empires references.

### B. Stakeholder Input

The user wants to reboot the project as a browser-first classic RTS about rival fishing companies, with one big map, base building, metal harvesting, fishing boats, sabotage, AI rivals, generated assets where practical, and much stronger animation/readability than the current prototype.

### C. References

Red Alert, Command & Conquer, Age of Empires, current Wambåsa Fishing prototype, and `docs/imagegen-art-bible.md`.

---

_This Game Brief serves as the foundational input for Game Design Document (GDD) creation._

_Next Steps: Use the `workflow gdd` command to create detailed game design documentation._
