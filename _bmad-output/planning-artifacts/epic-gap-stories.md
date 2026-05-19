# Wambasa Fishing Wars - Remaining Epic Gap Stories

Generated: 2026-05-17

Source documents:

- `_bmad-output/epics.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Current `src/main.ts` implementation and Playwright regression suite

## Executive Summary

The current build is a playable browser RTS MVP with broad automated coverage, but it is not yet a fully finished skirmish game. The largest remaining gaps have shifted away from missing core loop mechanics and toward art completion, manual playtest-driven tuning, release-level readability polish, and final browser/UX validation. Several earlier blockers in recovery rules, defensive clarity, strategic fishing differentiation, pause flow, and combat command discoverability are now implemented in first-pass form.

This backlog converts the remaining work into implementation-ready stories. Priority uses:

- `P0`: required before the game can be called playable.
- `P1`: required before the game feels complete and polished.
- `P2`: expansion or quality improvement after the core loop works.

## Recommended Next Sprint

1. `G8.0` Generate and integrate the final production bitmap art batch. Status: still the largest visible gap.
2. `G9.1` Run a manual first-10-minutes playtest loop and convert the top blockers into fixes.
3. `G9.3` Finish first-10-minutes balance tuning from live play rather than only debug/test pacing.
4. `G5.2` and `G5.3` deepen the sea economy with depletion/regrowth and naval recovery.
5. `G8.5` plus `G9.4` and `G9.5` close release-level readability, browser, and result polish.
6. `G8.7` adds a final level-design and backdrop polish pass so the battlefield reads like an authored place instead of a mostly systemic test map.

## Batch Plan

Use the remaining GDD work in this order so each batch closes a coherent slice and can be verified before moving on.

### Batch 1 - Production Art Integration

Status: done for current first-pass GDD scope.

Primary stories:

- `G8.0`

Goals:

- Promote generated and processed art into real runtime usage.
- Replace the most obvious placeholder visuals first.
- Keep art validation green while runtime references shift to production assets.

Verify after batch:

- `npm run test:art`
- `npm run typecheck`
- focused gameplay smoke for any touched visuals

### Batch 2 - First-10-Minutes Playability

Status: done for current engineering blocker/tuning scope; later human-only feel validation remains part of release polish.

Primary stories:

- `G9.1`
- `G9.3`

Goals:

- Run structured manual playtests.
- Capture confusion points, blockers, dead time, and pacing failures.
- Fix the highest-value opening-loop issues before chasing more polish.

Verify after batch:

- repeat manual playtest
- focused regression on touched systems

### Batch 3 - Camera, Minimap, and Group Feel

Status: done for current first-pass engineering scope. Core minimap drag, base focus, grouped arrival spacing, and stuck-recovery behavior are now implemented and verified. Remaining future work is feel-tuning during broader release playtests rather than missing baseline RTS controls.

Primary stories:

- `G1.1`
- `G1.2`
- `G2.2`

Goals:

- Make navigation and group movement feel more like a classic RTS.
- Reduce friction in minimap drag, camera control, spacing, and stuck recovery.

Verify after batch:

- input-focused e2e coverage
- manual feel pass

### Batch 4 - Combat Clarity and Warning UX

Status: done for current first-pass engineering scope. Combat hover/range affordances and actionable warnings are now implemented and verified, including focusable alerts and anti-spam rate limiting for important attacked player assets. Remaining future work is live-play wording/tuning rather than missing baseline combat UX.

Primary stories:

- `G7.3`
- `G7.5`

Goals:

- Make combat affordances obvious without external explanation.
- Improve warning/focus behavior during raids and attacks.

Verify after batch:

- focused combat e2e
- readability pass during live play

### Batch 5 - Sea Economy Depth

Status: done for current first-pass engineering scope. `G5.2` and `G5.3` are both verified: fishing zones now deplete and regrow, and damaged boats can return to a functioning Dock for paid repair while destroyed docks correctly block recovery.

Primary stories:

- `G5.2`
- `G5.3`

Goals:

- Add depletion/regrowth and better naval recovery rules.
- Turn fishing from a solved loop into a more strategic route decision.

Verify after batch:

- economy-loop tests
- longer manual fishing/return/recovery playtest

### Batch 6 - Release Polish and QA

Status: in progress. Release readability and QA remain open, but Batch 6 now has verified first-pass progress in five key areas: the environment-composition pass is substantially advanced, runtime bitmap effects plus stronger attack-warning readability are live, the recomposed skirmish map supports an autonomous opening raid without debug forcing, the desktop viewport matrix is still green after the latest visual pass, and the Firefox smoke gap is now closed with a named Playwright Firefox project. The earlier deterministic Guard Tower anti-raider regression is now fixed. Remaining work is now the human tail only: longer-session readability/feel review and any final environment-art tuning after human play. The final manual closeout artifacts now exist as `g9-5-human-long-session-playtest-checklist.md` and `g9-5-human-long-session-playtest-notes.md` under `_bmad-output/implementation-artifacts/`.

Primary stories:

- `G8.5`
- `G8.7`
- `G9.4`
- `G9.5`

Goals:

- Finish readability cleanup, result/rematch polish, and browser/resolution QA.
- Add one authored environment-art and level-composition pass for the skirmish battlefield.
- End with a broad release-style regression pass instead of isolated feature checks.

Verify after batch:

- full regression suite
- desktop viewport/browser matrix

## Epic 1 - RTS Foundation & Camera

Status: implemented in first-pass playable form. The map, camera, minimap, overlays, and navigation shortcuts exist and now cover the main RTS interactions needed for play.

Remaining work:

- Browser and resolution support still needs release-level verification beyond smoke tests.
- Camera feel should still be revisited during later live playtests, but no major missing control remains.

### G1.1 Minimap Feel Pass

Priority: `P1`

Status: done first pass. The minimap now supports direct viewport-rectangle dragging instead of only generic recenter interaction, and focused e2e coverage verifies both drag movement and continued camera updates. Remaining future polish is mainly feel-tuning rather than missing core interaction.

As a player, I want to drag the minimap viewport rectangle directly so the map follows my hand like a classic RTS.

Acceptance criteria:

- Pressing inside the minimap viewport starts rectangle dragging, not a separate crosshair interaction.
- While dragging, the rectangle remains under the pointer and the main camera updates continuously.
- Clicking outside the rectangle recenters the viewport without breaking subsequent drag behavior.
- The minimap does not block selected unit, building, or production actions.
- Playwright covers drag start, drag move, release, and camera position update.

### G1.2 Camera Command Polish

Priority: `P1`

Status: done first pass. Mouse wheel zoom preserves cursor-relative world position, edge-scroll toggle/settings exist, keyboard pan remains available, and the player base can now be focused via `Home` or `B`. Remaining future work is feel-tuning during later live play validation rather than missing controls.

As a player, I want predictable camera controls so navigation never fights unit control.

Acceptance criteria:

- Mouse wheel zoom keeps the world position under the cursor stable.
- Edge scroll can be enabled, disabled, and tuned from settings.
- Keyboard pan works with arrow keys and WASD.
- A focus-base shortcut centers the player Command Center.
- Camera movement is clamped to world bounds at every zoom level.

### G1.3 Browser and Resolution Verification

Priority: `P1`

As a player, I want the game to remain readable on common desktop browser sizes.

Acceptance criteria:

- The game passes Chromium and Firefox smoke runs.
- HUD, minimap, command panel, and snackbar layout do not overlap at 1280x720, 1440x900, and 1920x1080.
- Zoom limits keep at least the immediate base area readable.
- Test artifacts include screenshots for the three target resolutions.

## Epic 2 - Unit Selection, Commands, Pathing & Collision

Status: functionally covered for basic selection, move commands, invalid feedback, pathing, collision, and standard tactical commands. It still lacks formation polish and control groups.

Remaining work:

- Improve group spacing, formation arrival, and collision recovery.
- Add control groups and clearer command feedback.

### G2.1 Stop, Hold, and Attack-Move Commands

Priority: `P0`

Status: done in current implementation.

As a player, I want standard RTS commands so units can be controlled during combat and raids.

Acceptance criteria:

- Selected commandable units can receive `Stop`, `Hold Position`, and `Attack-Move`.
- Attack-move sends units to a destination and engages enemies encountered on the route.
- Hold-position units attack in range but do not chase beyond their guard radius.
- The command panel exposes these actions with readable buttons and keyboard shortcuts.
- Tests cover command state changes and one attack-move engagement.

### G2.2 Group Collision and Formation Polish

Priority: `P0`

Status: done first pass. Group moves already reserve separate arrival slots, and the current pass adds stalled-unit land-path recovery plus crowded final-waypoint settling so trucks and workers do not hang forever near their last slots. Focused e2e now verifies separated group arrival in open terrain and continued blocked-route pathing coverage.

As a player, I want selected groups to move without stacking into each other or blocking forever.

Acceptance criteria:

- Multi-unit move commands assign separated arrival slots.
- Units do not overlap at rest.
- Moving units slide or repath around nearby friendly units.
- If a unit is stuck for more than a short timeout, it requests a new nearby reachable destination.
- Tests cover grouped move, separated final positions, and blocked route recovery.

### G2.3 Control Groups and Selection UX

Priority: `P1`

As a player, I want to save and recall unit groups quickly.

Acceptance criteria:

- `Ctrl+1` through `Ctrl+5` saves selected units.
- `1` through `5` recalls the group.
- Double-tapping a group key focuses the camera on the group.
- Dead units are removed from saved groups.
- The HUD shows the active control group when selected.

### G2.4 Unreachable Command Feedback

Priority: `P1`

As a player, I want clear feedback when a command cannot be completed.

Acceptance criteria:

- Invalid destinations show a short world-space marker and readable snackbar.
- A unit that cannot reach a target reports the issue once, not every frame.
- Blocked commands do not silently clear the previous valid command unless required.
- Tests cover invalid terrain, blocked building target, and unreachable resource.

## Epic 3 - Land Economy, Metal Harvesting & Production

Status: basic metal fields, truck harvest cycle, factory unload, metal spending, and worker/truck/guard production exist. The economy lacks production management, rally points, and recovery rules.

Remaining work:

- Add rally points.
- Add production queue cancel/reorder/multiple queued items.
- Clarify resource recovery if the player loses key economy units.
- Improve resource feedback and pacing.

### G3.1 Factory Rally Points

Priority: `P1`

As a player, I want new units to move to a rally point after production.

Acceptance criteria:

- Selecting the Factory allows setting a rally point with right-click or command mode.
- Newly produced workers, guards, and trucks spawn safely and move to the rally point.
- Rally points cannot be placed on invalid terrain.
- A world-space rally flag is visible while the Factory is selected.
- Tests cover setting, updating, and using a rally point.

### G3.2 Production Queue Management

Priority: `P1`

As a player, I want to manage production instead of waiting on one opaque item.

Acceptance criteria:

- The Factory supports multiple queued units.
- Queued items show cost, progress, and order.
- The player can cancel queued or active items.
- Cancelling refunds an agreed percentage of metal.
- Tests cover queueing worker/truck/guard, progress, completion, and cancel refund.

### G3.3 Economy Recovery Rules

Priority: `P0`

Status: done first pass. Match-end logic now treats truck/boat replacement paths as recoverable when the Factory or Dock can still rebuild them, including queued replacement production, and it applies the same recoverability rule to AI defeat/victory checks. Current remaining polish is explanatory UI copy and broader live-balance validation rather than missing logic.

As a player, I want the match to remain recoverable unless I truly lose my base economy.

Acceptance criteria:

- If all trucks are lost but the Factory remains, the player can build a replacement truck.
- If the player has insufficient metal for a replacement truck, the game offers a documented emergency recovery rule or defeat condition.
- The same rule is applied to AI.
- UI explains the recovery or defeat state clearly.
- Tests cover no-truck recovery and no-recovery defeat.

### G3.4 Resource Feedback Pass

Priority: `P1`

As a player, I want to understand when resources are gained, spent, and blocked.

Acceptance criteria:

- Harvested metal has visible cargo state on the truck.
- Unloading creates a floating `+metal` feedback marker.
- Spending creates a subtle `-metal` feedback marker in the HUD.
- Insufficient metal buttons explain the missing amount.
- Tests cover HUD amount changes after harvest, unload, spend, and failed spend.

## Epic 4 - Base Building, Construction & Defense

Status: placement, building construction, Dock, House, Guard Tower, and repair are implemented and tested. The biggest remaining gaps are cancellation/refund rules, repair economy tuning, and richer worker task clarity rather than basic defensive construction.

Remaining work:

- Add construction cancellation and refund rules.
- Decide and document the repair economy model.
- Improve worker task assignment clarity beyond the current readout.

### G4.1 Defensive Build Menu Completion

Priority: `P0`

Status: done first pass. The worker build menu now exposes Guard Tower clearly, the placement readout shows cost/build-time/range/target-role before confirmation, completed towers auto-engage enemy raiders, and regression tests cover both construction and actual tower damage against enemy attackers.

As a player, I want clear defensive options so I can protect my economy and base.

Acceptance criteria:

- Worker build menu exposes Guard Tower and any required prerequisite clearly.
- Guard Tower cost, range, target type, and build time are visible before placement.
- A completed Guard Tower automatically attacks enemy raiders in range.
- The player can build at least one viable defensive layout around the base and metal route.
- Tests cover building a Guard Tower and damaging an enemy raider.

### G4.2 Construction Cancel and Refund

Priority: `P1`

As a player, I want to cancel mistaken building placements.

Acceptance criteria:

- Buildings under construction can be cancelled.
- Cancelling removes the footprint blocker.
- A configured refund is applied.
- Cancelling cannot duplicate resources or leave invisible blockers.
- Tests cover cancel during placement preview and cancel during construction.

### G4.3 Repair Economy Rules

Priority: `P1`

As a player, I want repair to be understandable and balanced.

Acceptance criteria:

- Repair either costs metal or is explicitly documented as free but time-limited.
- Repair has a visible worker action, progress, and completion feedback.
- Repair cannot exceed max health.
- Repair fails with clear feedback if requirements are not met.
- Tests cover damaged building repair, max-health clamp, and insufficient-resource case if repair costs metal.

### G4.4 Building Placement UX Polish

Priority: `P1`

Status: done first pass. Placement previews now keep readable valid/blocked states, reasons are normalized into clearer player-facing language, and placement mode can be cancelled with both Escape and right-click. Remaining future polish is broader reason coverage such as explicit insufficient-resource preview copy.

As a player, I want placement previews to explain why a building cannot be placed.

Acceptance criteria:

- Valid placement uses a readable green footprint.
- Invalid placement uses red footprint plus reason text: blocked, too far, wrong terrain, or insufficient resources.
- Footprint checks match actual final blockers.
- Placement mode can be cancelled with Escape and right-click.
- Tests cover each invalid reason.

### G4.5 Worker Task Assignment Feedback

Priority: `P1`

As a player, I want to see what each worker is doing.tgrf14'
C

Acceptance criteria:

- Selected workers show current task: idle, moving, building, repairing, harvesting support, or combat command.
- Worker task changes are shown in the command panel.
- Idle workers are easy to find from a HUD button or hotkey.
- Tests cover task label updates for move, build, repair, and idle.

## Epic 5 - Ocean, Docks, Boats & Fishing Economy

Status: Dock, boat production, boat movement, fishing, unload, and cash gain exist, and fishing zones now expose first-pass strategic differentiation through distinct names, safe vs contested tiers, minimap/world rendering, and different cash-per-fish yields. Fish zones also now deplete, warn on poor yield, and regrow over time, and damaged boats can recover at a functioning Dock for cash. Remaining expansion is strategic depth and presentation polish rather than missing baseline sea-economy systems.

Remaining work:

- Deepen contested-water risk/reward and longer-route decision pressure.
- Improve dock placement and water visuals.

### G5.1 Strategic Fishing Zones

Priority: `P0`

Status: done first pass. The map now exposes differentiated safe and contested fishing banks with distinct labels, world/minimap visuals, and different yields, and the selection readout explains the currently assigned zone and cash-per-fish. Remaining expansion is adding a medium tier and stronger danger/exposure loops.

As a player, I want fishing spots to create meaningful map decisions.

Acceptance criteria:

- The map has safe, medium, and contested fishing zones.
- Richer zones pay more but expose boats to enemy attacks.
- Fishing zones are visible on the world map and minimap.
- The HUD explains expected yield for the selected fishing zone.
- Tests cover yield differences between at least two zone types.

### G5.2 Fish Depletion and Regrowth

Priority: `P1`

Status: done first pass. Fishing zones now lose stock as boats harvest them, selected boats warn when assigned to poor-yield waters, depleted zones force partial returns to Dock, and zone stock regrows over time. Verified with focused sea-economy e2e coverage and live debug-state inspection.

As a player, I want fishing to require route decisions instead of one permanent best spot.

Acceptance criteria:

- Fish zones deplete as boats harvest them.
- Depleted zones recover over time or after a documented refresh event.
- Boats can be reassigned to another zone.
- The UI warns when a selected boat is harvesting a poor zone.
- Tests cover depletion, reduced payout, and recovery.

### G5.3 Dock and Boat Repair

Priority: `P1`

Status: done first pass. Damaged boats can now right-click a friendly Dock to queue paid repairs, repair progress consumes cash over time, destroyed docks block repair and boat production, and the rival can use the same dock-recovery rule when eligible. Verified with focused e2e coverage for successful repair and destroyed-dock rejection.

As a player, I want damaged boats to recover if I protect my dock.

Acceptance criteria:

- Boats can return to a Dock for repair.
- Repair has visible progress and cost/time rules.
- Destroyed Dock prevents repair and boat production.
- AI can use the same repair rule if enabled.
- Tests cover damaged boat repair and repair blocked by missing Dock.

### G5.4 Naval Threat and Counterplay

Priority: `P1`

As a player, I want water conflict to be readable and fun.

Acceptance criteria:

- Enemy boats or raiders can threaten fishing routes.
- Player defenses or guards can respond using documented target rules.
- Boat sinking has clear visual and audio feedback.
- The game warns the player when a fishing boat is attacked.
- Tests cover boat taking damage, sinking, and warning display.

### G5.5 Dock Visual Placement Pass

Priority: `P1`

As a player, I want docks to look physically connected to shore and water.

Acceptance criteria:

- Dock placement snaps to shoreline-compatible locations.
- Invalid dock placement explains terrain mismatch.
- The Dock sprite and footprint align with shore, water, and boat spawn point.
- Boats spawn from water-side exits, not land or building centers.
- Tests cover dock placement validity and boat spawn terrain.

## Epic 6 - Enemy AI, Competition & Win/Loss

Status: basic scripted AI economy, fishing, raiding, rebuilds, defense response, and paced win/loss exist. It still needs difficulty settings, recovery-aware defeat logic, and strategic readability.

Remaining work:

- Add difficulty settings.
- Add better defeat/recovery logic.

### G6.1 AI Economy Rebuild

Priority: `P0`

Status: done in current implementation.

As a player, I want the enemy company to recover from harassment so the match does not collapse after one raid.

Acceptance criteria:

- AI detects lost trucks, workers, docks, and boats.
- AI queues replacements if it has resources and production buildings.
- AI prioritizes at least one truck and one worker before expansion.
- AI uses the same economy constraints as the player.
- Tests cover AI truck loss and successful replacement production.

### G6.2 AI Defense Response

Priority: `P0`

Status: done in current implementation.

As a player, I want enemies to defend themselves when attacked.

Acceptance criteria:

- AI detects attacks on its Command Center, harvest route, Dock, and boats.
- Nearby guards respond to threats.
- AI can build at least one defensive structure when repeatedly raided.
- AI stops overcommitting all units away from its economy.
- Tests cover AI response to a player raid and defensive structure production.

### G6.3 AI Difficulty Settings

Priority: `P1`

As a player, I want difficulty levels that change pressure without cheating invisibly.

Acceptance criteria:

- Easy, Normal, and Hard settings exist.
- Difficulty changes AI build speed, aggression timing, or economy multiplier using documented values.
- The selected difficulty is shown before match start and in settings.
- Tests cover that difficulty changes at least one AI timing or budget value.

### G6.4 AI Strategic State Debugging

Priority: `P1`

As a developer, I want AI state to be inspectable so tuning is practical.

Acceptance criteria:

- Debug mode can show AI state: harvesting, expanding, defending, raiding, rebuilding.
- Debug mode is disabled by default for players.
- State changes are logged in a compact developer-readable format.
- Tests or unit checks verify state labels for major AI modes.

### G6.5 No-Recoverable-Economy Defeat Logic

Priority: `P1`

As a player, I want matches to end clearly when a company has no path to recovery.

Acceptance criteria:

- Player and AI defeat checks consider Command Center, production ability, workers, trucks, docks, boats, and resources.
- A company is not defeated if it can still recover through documented production.
- Defeat reason is shown in the result screen.
- Tests cover recoverable and unrecoverable states.

## Epic 7 - Combat, Sabotage & Defenses

Status: guards, guard towers, damage, saboteur entity behavior, boat sinking, and repair exist in pieces. The major missing player-facing feature is saboteur production and a complete combat command loop.

Remaining work:

- Train saboteurs.
- Make sabotage and defense readable.
- Add combat commands and targeting rules.
- Balance defenses so they matter.

### G7.1 Saboteur Production and Commanding

Priority: `P0`

Status: done in current implementation.

As a player, I want to build saboteurs and send them to disrupt enemy factories.

Acceptance criteria:

- A player-owned building can produce saboteurs with visible cost and build time.
- Produced saboteurs are selectable and commandable.
- Saboteurs can target enemy buildings or economy assets.
- Saboteur actions produce visible sabotage feedback and enemy warning behavior.
- Tests cover producing a saboteur and executing one sabotage action.

### G7.2 Economy Harassment Targets

Priority: `P0`

Status: done for current implementation. Guards can now deliberately target enemy economy assets on land and water, mixed-selection right-click behavior no longer lets sabotage steal obvious guard attack orders on enemy buildings, and tests cover truck, dock/boat, and general economy-target combat outcomes.

As a player, I want combat units to attack enemy trucks, boats, docks, and factories deliberately.

Acceptance criteria:

- Guards can target enemy trucks and saboteurs on land.
- Eligible units can attack enemy boats or naval targets according to documented rules.
- Attack target priority is deterministic and understandable.
- Destroyed economy units affect the opponent's economy loop.
- Tests cover attacking an enemy truck and an enemy boat or dock.

### G7.3 Combat Command UX

Priority: `P1`

Status: done first pass. Combat now has an explicit `Attack` command in the tactical panel with `T` hotkey support, armed target selection, invalid-target feedback, hover-valid-target affordances, and attack-range preview for selected guards and attack boats. Remaining future work is feel-tuning and any richer art polish of the indicators rather than missing command UX.

As a player, I want combat commands to be obvious and reliable.

Acceptance criteria:

- Hovering enemy targets shows an attack cursor or target marker.
- Selected combat units show attack range and valid targets when appropriate.
- Stop, hold, and attack-move integrate with combat targeting.
- Invalid targets show feedback instead of doing nothing.
- Tests cover valid target command, invalid target command, and range display toggle.

### G7.4 Defensive Balance Pass

Priority: `P1`

As a player, I want guards and towers to be useful without making raids impossible.

Acceptance criteria:

- Guard, saboteur, truck, boat, building, and tower health/damage values are documented.
- A small undefended raid can hurt economy.
- A defended base can repel a small raid.
- Towers cannot cover the whole map from one placement.
- Balance scenarios are captured in repeatable tests or scripted playtest checks.

### G7.5 Attack Warning and Counterplay Loop

Priority: `P1`

Status: done first pass. Important attacked player assets now emit readable focusable alerts, clicking the alert recenters the camera on the event, and repeated hits are rate-limited so the alert feed does not spam. Remaining future work is wording/tuning polish from broader live play rather than missing counterplay behavior.

As a player, I want clear warnings when enemies attack important assets.

Acceptance criteria:

- Attacks on Command Center, Dock, Factory, trucks, boats, and towers trigger readable alerts.
- Alerts are placed near player eye focus and do not overlap command UI.
- Clicking or pressing the alert focuses the camera on the event.
- Repeated attacks are rate-limited to avoid spam.
- Tests cover alert visibility and focus behavior.

## Epic 8 - Art, Animation, Audio & UI Polish

Status: first-pass bitmap runtime art, HUD, settings shell, audio hooks, and animation/state pipelines exist. The game still needs the final production art batch, deeper visual cleanup, and last-mile readability/browser QA rather than foundational HUD or audio systems.

Remaining work:

- Finish the final production bitmap art batch and cleanup.
- Hand-polish generated assets and enforce one consistent art direction.
- Add a dedicated environment composition pass so the battlefield background, shoreline, and terrain dressing feel authored instead of mostly procedural.
- Complete last-mile UI readability/browser validation and richer settings effects.

### G8.0 Production Imagegen Art Batch

Priority: `P0`

Status: done first pass. The art bible exists and a cohesive production bitmap set is now generated, cleaned, normalized, and integrated for the core skirmish runtime. Terrain backdrop, buildings, units, fishing/resource markers, effects, damaged/destroyed building variants, and damaged/destroyed plus unload vehicle states are all wired into live rendering. Remaining future work is hand-polish and atlas cleanup rather than missing core production-art runtime coverage.

As a player, I want the world, units, buildings, resources, and UI portraits to share one polished generated art direction.

Acceptance criteria:

- Imagegen prompts are created from `docs/imagegen-art-bible.md` for one cohesive RTS batch.
- First production batch includes terrain tiles/backdrop, Factory Command Center, Dock, House/Barracks, Guard Tower, Metal Field, Fishing Zone marker, Worker, Guard, Saboteur, Truck, Boat, and core action/effect sprites.
- Generated outputs are saved under `public/assets/generated/`, cleaned/normalized into `public/assets/processed/`, and only runtime-ready assets are referenced from `public/assets/runtime/`.
- Runtime code does not reference raw generated assets directly.
- Worker, guard, saboteur, truck, and boat sprites have readable silhouettes at normal RTS zoom.
- A visual smoke test or asset manifest validation fails if a required production bitmap asset is missing.

Required production animation/assets matrix:

- `worker`: 4 directions; idle 2 frames, walk 8 frames, build 6 frames, repair 6 frames, carry/assist 4 frames, death/downed 3 frames.
- `guard`: 4 directions; idle 2 frames, walk 8 frames, attack 6 frames, reload/ready 4 frames, hit reaction 2 frames, death/downed 3 frames.
- `saboteur`: 4 directions; idle 2 frames, walk 8 frames, sabotage 8 frames, plant charge 4 frames, sneak/crouch 4 frames, death/downed 3 frames.
- `harvester-truck`: 4 directions or 8-direction vehicle angles; drive 4 frames with wheel motion, harvest 4 frames, empty cargo, half cargo, full cargo, unload 4 frames, damaged smoke 3 frames, destroyed husk.
- `fishing-boat`: 4 directions or 8-direction boat angles; cruise 4 frames, fish 6 frames, full hold variant, unload/sell 4 frames, wake overlay, damaged smoke, sinking 6 frames.
- `factory-command-center`: idle, producing, unload-active, damaged 50 percent, damaged 20 percent, destroyed.
- `dock`: idle, boat-producing, fish-unload-active, damaged, destroyed, shoreline-aligned footprint.
- `house/barracks`: idle, producing worker/fisherman/guard/saboteur, damaged, destroyed.
- `guard-tower`: idle, tracking/aiming, firing, damaged, destroyed.
- `resources/effects`: metal field full/half/depleted, fishing zone calm/active/depleted, construction dust, repair sparks, harvest sparks, fish splash, cannon muzzle flash, sabotage burst, smoke plume, selection portrait crops.

### G8.1 Sprite Sheet Asset Pipeline

Priority: `P0`

Status: runtime folder structure, manifest validation, frame generation, and Pixi texture loading are done in current implementation; true imagegen/bitmap sprite sheets remain.

As a developer, I want a clean pipeline for generated sprites so unit animation can stop being patched procedurally.

Acceptance criteria:

- Asset folders separate source, generated, processed, and runtime-ready sprites.
- Runtime sprites have consistent frame size, anchor point, direction naming, and metadata.
- The game loads animation definitions from data, not hard-coded frame hacks.
- Broken or missing animation frames fail in a developer-visible way.
- A small validation script checks frame counts and naming.

### G8.2 Directional Unit Animations

Priority: `P0`

Status: mostly done for first-pass runtime bitmap animation. Worker, guard, saboteur, truck, and boat now use imagegen bitmap PNG sheets for their current runtime actions in four directions. Remaining polish: damaged/destroyed variants, better vehicle unload states, hand-cleaned atlases, and final visual QA at RTS zoom.

As a player, I want workers, guards, and saboteurs to clearly look like they are walking and working.

Acceptance criteria:

- Worker, guard, and saboteur each have idle and walk animations for at least 4 directions.
- Walk animation includes visible leg movement, body weight shift, and no floating.
- Work/build/repair/sabotage animations exist for relevant units.
- Animation switches are based on actual velocity and task state.
- Playwright or visual smoke tests confirm non-static frame changes during movement.

### G8.3 Vehicle and Building Animation Polish

Priority: `P1`

Status: done for current procedural runtime. Trucks expose wheel/cargo motion state, boats expose wake state, buildings expose production/construction activity, and damaged structures expose smoke state through debug/test metadata. True final art can still replace the procedural visuals later.

As a player, I want trucks, boats, factories, docks, and towers to feel alive.

Acceptance criteria:

- Trucks show moving wheels or cargo state.
- Boats show wake or bobbing without breaking readability.
- Production buildings show activity while building units.
- Damaged buildings show visual damage states.
- Tests or snapshot checks verify key state changes.

### G8.4 Audio Bus and Music Completion

Priority: `P1`

Status: done for current browser-native implementation. Master, music, SFX, UI, and alert buses exist in debug/audio state; music has calm, tension, and combat layers; action cues now cover harvest, unload, fish, build, produce, repair, sabotage, warning, victory, defeat, command confirm/error, resource, and combat. Persisted UI still exposes music/SFX sliders only; broader settings are tracked under G8.5/G9.2.

As a player, I want richer industrial-coastal music instead of low-volume ambience or noise.

Acceptance criteria:

- Master, music, SFX, and UI volume buses exist.
- Music has at least calm base, tension, and combat/raid layers or tracks.
- Important actions have SFX: harvest, unload, build, produce, attack, sabotage, boat launch, warning, victory, defeat.
- Volume defaults are audible and not dominated by white noise.
- Settings persist volume choices.

### G8.5 UI Readability and Settings Completion

Priority: `P1`

Status: partially done. The command panel remains unified on the right side, minimap stays in a dedicated region, buttons and readouts have received another readability pass, settings now include persisted audio, UI scale, edge-scroll toggle, and difficulty selection, combat guidance explicitly teaches attack vs attack-move, alert readability is stronger during attacks through higher-contrast warning styling, low-height desktop layouts compress the intel/result stack more cleanly, and the desktop viewport matrix stayed green after the latest environment-art pass. Remaining work: human long-session readability review and richer settings effects such as fully tuned difficulty behavior.

As a player, I want readable RTS UI that does not duplicate commands or hide buttons.

Acceptance criteria:

- Selected unit/building actions appear in one consistent command panel.
- Buttons are readable at 1280x720.
- Minimap has a dedicated region and never covers action buttons.
- Snackbar/alerts appear near player eye focus and remain readable long enough.
- Settings include UI scale, audio, camera scroll, and difficulty.

### G8.5A RTS UX Recovery Pass

Priority: `P0`

Status: done first pass. The side panel now separates identity/start, minimap/economy, command console, battlefield intel, and collapsed options. Context command buttons use a grid, settings no longer consume the normal command stack, and combat now exposes direct Attack alongside Hold and Attack-Move instead of hiding combat behind contextual right-click alone. Viewport smoke coverage now includes 1280x720, 1366x768, 1440x900, and 1920x1080.

As a player, I want the interface to behave like a clear classic RTS command console instead of a long web form.

Acceptance criteria:

- Settings are moved out of the always-visible command stack into a compact options/pause/settings panel.
- The visible command area shows only context-relevant groups for the current selection: selection summary, primary commands, production/build queue, tactical orders.
- Minimap, command buttons, alerts, and objectives each have a dedicated visual region and do not compete for the same vertical space.
- Command buttons are larger, grouped into a predictable grid, and have short readable labels with cost/status where applicable.
- Alerts are readable near player eye focus and do not push command buttons down.
- At 1280x720, 1366x768, 1440x900, and 1920x1080, core actions remain visible without scrolling the command panel during normal play.
- Playwright layout tests cover the command panel after selecting Factory, Worker, Dock, Guard, Truck, Boat, and Saboteur.

### G8.6 Effects Pass

Priority: `P1`

Status: done for first-pass runtime. Bitmap effect assets are now actually rendered from the dedicated effect layer for construction, repairs, harvesting, fishing, attacks, sabotage/disable states, and smoke/damage, and render polish state still exposes disabled pulse, attack charge, fishing ripple, and critical glow flags for debug/test visibility. Remaining release polish is hand-authored effect atlases and visual QA tuning.

As a player, I want actions to produce satisfying feedback.

Acceptance criteria:

- Build completion, resource delivery, attacks, repairs, sabotage, and sinking all have visual effects.
- Effects are readable at normal zoom and do not obscure command targets.
- Effects are pooled or otherwise performance-safe.
- Visual feedback is consistent between player and AI events.

### G8.7 Level Design and Backdrop Polish

Priority: `P1`

Status: in progress. The runtime currently uses a generated terrain backdrop, a production metal-field sprite, and a production fishing marker, and the practical level-design pass has now widened the skirmish, opened a clearer eastern raid lane, moved rival staging farther right, strengthened shoreline/foam layering, added harbor pier silhouettes, improved road/lane striping, and framed player/enemy base spaces with clearer landmark masses. Remaining work is final hand-tuning after human play rather than a missing baseline authored scene.

As a player, I want the skirmish map to feel like a believable coastal battlefield instead of a debug-friendly board.

Acceptance criteria:

- The battlefield background uses the generated backdrop as part of a coherent layered scene, not as a faint underlay only.
- Shoreline, shallows, and beaches have visible authored separation and are readable at gameplay zoom.
- Roads, blockers, and key spaces have enough dressing or contrast to act as landmarks.
- Debug-like banner text or other immersion-breaking map overlays are removed from the default play view.
- A written audit identifies which environment assets are truly bitmap/runtime-backed and which surfaces still rely on procedural rendering.

## Epic 9 - Playable Skirmish, Objectives, QA & Release Readiness

Status: objectives, pause, results, restart, and automated regression tests exist. Opening win/defeat pacing is now in a more active first-pass state: player target 1600 cash, AI target 2000 cash, equal starting metal, 8s AI start delay, and 20s first raid grace. The game still needs manual playtest-driven tuning and release-level validation.

Remaining work:

- Run structured playtests and address blockers.
- Tune the first 10 minutes from live play.
- Expand release validation beyond the current automated suite.

### G9.1 Manual First-10-Minutes Playtest Loop

Priority: `P0`

Status: done for the current engineering batch. The playtest script and two pass notes artifacts exist under `_bmad-output/implementation-artifacts/`. A tool-driven blocker-finding pass was executed twice: pass 01 found and immediately fixed five opening issues in objective flow and economy readability, and pass 02 verified those fixes through focused opening-economy/dock/fishing regression coverage. Remaining later work is a human-led feel pass, not unresolved opening blockers from this batch.

As a developer, I want a structured playtest loop so we fix what makes the game feel unplayable.

Acceptance criteria:

- A playtest script defines the first 10 minutes: harvest, produce, build dock, fish, build defense, raid, defend, win/loss progress.
- Each playtest records blockers, confusion points, dead titgme, and missing feedback.
- The top five blockers are converted into fixes before adding more features.
- A second playtest verifies the fixes.
- Notes are saved under `_bmad-output/implementation-artifacts/`.

### G9.2 Pause, Options, and Restart Flow

Priority: `P0`

Status: done. Escape now opens a pause/options menu, gameplay simulation and AI pause correctly, settings can be changed without leaving the match, restart returns to a clean match state, and regression tests cover pause, resume, settings change, and restart.

As a player, I want to pause, change settings, restart, and return to play without breaking the match.

Acceptance criteria:

- Escape opens a pause/options menu.
- Pause stops gameplay simulation and AI decisions.
- Options can change audio, UI scale, camera scroll, and difficulty where applicable.
- Restart starts a clean match state.
- Tests cover pause, resume, settings change, and restart.

### G9.3 First-10-Minutes Balance Pass

Priority: `P0`

Status: done for the current engineering batch. AI no longer starts ahead or wins immediately in the opening; forced-raid debug tests cover warning, damage, and repair; the live opener now also launches an autonomous early raid on the widened map with a 20s grace period and a reachable-target fallback; metal haulers and fishing boats now continue their basic economy loops after one command; and cash now functions as a real spendable resource with explicit command/UI feedback. Remaining future work is broader human feel-tuning and release polish, not missing opening-loop economy logic.

As a player, I want the opening match flow to produce decisions quickly.

Acceptance criteria:

- The player can harvest, produce, build, fish, defend, and raid within the first 10 minutes.
- There is no long idle wait where the best action is doing nothing.
- The first enemy raid or pressure event occurs at a readable, tunable time.
- Cash/metal pacing supports at least two strategic choices: economy expansion or defense/raid.
- Balance values are documented in a tuning table.

### G9.4 Result Screen and Rematch Polish

Priority: `P1`

Status: done first pass. The result screen already showed victory/defeat state and summary stats, and now also includes a short recommendation keyed off the loss/win reason. Restart remains an in-match reset flow, and focused result-screen coverage verifies victory, defeat, no-economy defeat, and rematch behavior. Remaining future work is copy tuning and any richer post-match breakdown, not a missing baseline result flow.

As a player, I want the match ending to explain what happened and let me try again.

Acceptance criteria:

- Win/loss screen shows reason, cash earned, fish delivered, metal harvested, units produced, buildings lost, and enemy pressure.
- Restart/rematch button starts a new match without page reload.
- Result screen includes one short recommendation based on loss reason.
- Tests cover victory, defeat, and rematch reset.

### G9.5 Release QA Matrix

Priority: `P1`

Status: done first pass for the current desktop-and-Firefox smoke matrix. Automated viewport QA is green at 1280x720, 1366x768, 1440x900, and 1920x1080, and focused regression now also covers the widened-map naval combat path, rival enemy intel selection, forced raid alerts, the new autonomous opening raid, the post-environment-pass layout/camera matrix, and deterministic Guard Tower anti-raider coverage. Firefox now has a named Playwright project and passing smoke coverage for viewport/layout, camera/minimap, and live opening raid behavior. Remaining future work is manual matrix expansion rather than a known automated browser gap.

As a developer, I want a release checklist that catches browser, performance, and UX regressions.

Acceptance criteria:

- QA matrix covers Chromium and Firefox.
- QA matrix covers 1280x720, 1440x900, and 1920x1080.
- Performance budget defines target FPS or frame time under normal skirmish load.
- Automated suite includes core smoke, economy, build, combat, AI, UI layout, and restart tests.
- Manual checklist covers camera, minimap, unit animation, audio, first 10 minutes, and final result flow.
