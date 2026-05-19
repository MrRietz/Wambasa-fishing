---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
inputDocuments:
  - _bmad-output/gdd.md
  - _bmad-output/game-architecture.md
  - _bmad-output/planning-artifacts/epic-gap-stories.md
  - _bmad-output/implementation-artifacts/architecture-compliance-audit.md
  - src/game/ui/hudPresenter.ts
  - src/game/ui/panels.ts
  - src/game/ui/domShell.ts
  - src/styles.css
project_name: Wambasa-fishing
user_name: Rietzr
date: 2026-05-18
---

# UX Design Specification Wambasa-fishing

**Author:** Rietzr
**Date:** 2026-05-18

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Wambasa Fishing Wars should deliver a browser-first RTS interface that feels immediately legible to Command & Conquer, Red Alert, and Age of Empires players. The UX goal is not novelty-first UI; it is fast strategic control, low-friction scanning, and strong command confidence during base building, harvesting, fishing, defense, and raids.

The game's differentiator is its fishing-company war economy, but that fantasy only works if the HUD and command surfaces feel as readable and decisive as a classic RTS. The UX direction should therefore move away from descriptive stacked panels and toward a more iconic, compact, right-anchored command layout where minimap, economy, selection, production, and tactical actions can be parsed at a glance.

### Target Players

The primary players are desktop RTS players with medium to high familiarity with classic real-time strategy conventions. They are comfortable with selection, right-click command issuing, minimap navigation, production queues, and battlefield multitasking.

These players do not need tutorial-style wording on every control. They need quick recognition, consistent panel placement, compact command surfaces, and confidence that the HUD will stay out of the way while still exposing the most important information.

### Key Design Challenges

The current HUD architecture is serviceable but still too text-heavy, too panel-dense, and not yet visually prioritized around battlefield control. Important command surfaces compete with status copy, and the UI still explains too much instead of signaling through layout, grouping, and iconography.

Another major challenge is preserving architectural boundaries while improving the UX. The redesign needs to stay inside the existing UI layer surfaces such as `domShell.ts`, `hudPresenter.ts`, `panels.ts`, and `styles.css`, without pushing presentation logic back into `createApp.ts`.

A third challenge is balancing RTS readability with the game's unusual economy loop. The player must understand workers, trucks, boats, factory crew, reels, and fish economy quickly, even though these are less standard than tanks and harvesters in traditional RTS games.

### Design Opportunities

The strongest opportunity is to reshape the HUD into a true RTS overlay patterned after Red Alert-era control logic: battlefield dominant, minimap and intel anchored to the right, production and selected-entity commands clustered together, and alerts/objectives compressed into high-signal surfaces.

There is also a strong opportunity to replace long labels with a generated icon system for production, unit roles, build options, tactical orders, and economy states. This would reduce text burden and make the interface more internationally legible and easier to scan under pressure.

Finally, the project has a good architectural opportunity because the HUD already has separable presenter, panel, shell, and style layers. That means the UX can be substantially improved without coupling design decisions back into simulation and app orchestration.

## Core Player Experience

### Defining Experience

The defining interaction in Wambasa Fishing Wars is selecting units and issuing right-click commands. That interaction needs to feel immediate, readable, and trustworthy because it is the command language through which the player experiences economy, combat, defense, expansion, and recovery. If unit selection and right-click command flow feel good, the rest of the RTS loop inherits that confidence.

The game should therefore optimize for command fluency over explanation density. The UX should help players see what is selected, what can be ordered, what will happen next, and whether the economy and army are responding correctly without making them read large blocks of interface text.

### Platform Strategy

The UX target is desktop browser mouse-and-keyboard RTS play only. The interface should not compromise toward controller, touch, or mobile-first assumptions. Layout, spacing, minimap behavior, hotkey display, hover states, and command grouping should all assume a desktop player using a pointer and keyboard in fullscreen or near-fullscreen play.

This means the UX can lean fully into classic RTS conventions: right-side HUD anchoring, minimap interaction, command-button grouping, persistent battlefield viewport, compact production readouts, and low-friction hotkey association.

### Effortless Interactions

Minimap use should feel effortless. The player should always be able to glance, click, drag, and relocate attention without fighting the interface. Production reading should also feel effortless, with queues, readiness, and bottlenecks legible in one scan rather than hidden in long descriptive text.

Reacting to attacks must also be fast and low-friction. The player should not need to decode the interface to understand where pressure is happening, what is threatened, and what command options are relevant. Alerts, selection state, and tactical actions should all work together to support instant response.

Automatic support should reduce babysitting. Harvest return, fishing unload, and rally or queue flow where appropriate should happen without unnecessary reissuing of obvious commands so the player can focus on decisions rather than maintenance.

### Critical Success Moments

The first major success moment in the first ten minutes is building up and seeing the economy run smoothly. The player should feel that trucks, workers, boats, and production are all participating in one coherent RTS machine rather than separate subsystems.

The second major success moment is surviving and answering the first meaningful enemy pressure. That is the point where the player should feel the game is not only readable but satisfying under stress. If the player can understand the threat, respond quickly, and stabilize, the UX has proven its value.

### Experience Principles

- Command first: selection and right-click ordering are the highest-priority interaction and must always feel immediate.
- Scan, do not read: minimap, production, economy, and threat state should be understandable at a glance.
- Desktop RTS purity: the interface should favor mouse-and-keyboard strategy fluency over cross-platform compromise.
- Automate the obvious: repetitive return, unload, and queue continuation behaviors should reduce babysitting wherever they do not remove strategic choice.
- Reward stable control under pressure: the player should feel the interface supports them best when the battle becomes noisy, not only when the base is calm.

## Desired Emotional Response

### Primary Emotional Goals

The primary emotional goal for Wambasa Fishing Wars is nostalgic excitement. Players should feel the visual and interaction echoes of Red Alert-style RTS play, but expressed through the game's fishing-company war economy. The nostalgia should not come only from theme references; it should come from the feeling of controlling a base, building production, reading the battlefield quickly, and pushing toward enemy defeat with confidence.

A second major emotional goal is eagerness. The player should feel pulled forward by the economy loop and by the desire to pressure and defeat the enemy rather than passively maintain systems.

### Emotional Journey Mapping

On first load, the player should feel immediate nostalgic recognition: this looks and feels like a classic RTS command space, even though the subject matter is fishing, reels, trucks, and boats.

During the core loop, the player should feel excited and increasingly in control as the economy starts working smoothly. When trucks harvest correctly, factories produce, reels accumulate, and boats generate money, the player should feel the satisfaction of a machine coming online.

During enemy pressure, the player should still feel excited rather than overwhelmed. The interface should support quick response so stress becomes energizing instead of confusing.

After a successful defense, build-up, or attack, the player should feel accomplishment and a strong desire to continue pushing. On return sessions, the game should make the player feel eager to get back into the loop and do it again, better and faster.

### Micro-Emotions

The most important micro-emotions for this game are confidence, trust, excitement, accomplishment, and delight.

Confidence means the player believes they understand what is selected, what commands will do, and what is happening in the economy. Trust means the interface behaves consistently and does not fight the player during fast decision-making. Excitement comes from pressure, momentum, and escalation. Accomplishment comes from seeing the economy and army function correctly. Delight comes from the unusual theme and from small moments where the fishing-company RTS fantasy feels unexpectedly right.

### Design Implications

To create confidence and trust, the HUD must become more legible, more stable in layout, and less dependent on long text explanations. Selection state, command availability, minimap use, production, and alerts must all be immediately understandable.

To create excitement, threat signals and tactical response surfaces must be fast to read and act on. Enemy pressure should feel like an opportunity to respond decisively, not like UI confusion.

To create accomplishment, the economy loop needs clear visual feedback. Reel production, fish income, truck harvesting, and queue progress should feel visible and rewarding. To create delight, the Red Alert-inspired visual language should merge with the fishing-industry setting in a way that feels distinctive rather than generic.

### Emotional Design Principles

- Reinforce nostalgic RTS recognition through layout, pacing, and command readability.
- Build confidence by making selection, commands, economy, and alerts predictable.
- Preserve trust by ensuring the UI responds consistently under pressure.
- Drive excitement by making attacks and escalation readable and answerable.
- Reward accomplishment by clearly showing the economy and production machine working.
- Create delight by combining classic RTS presentation with the unexpected fishing-war theme.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

Wambasa Fishing Wars draws its primary UX inspiration from Red Alert, Command & Conquer, and Age of Empires.

Red Alert is the clearest reference for overall HUD structure and emotional tone. It combines immediate battlefield focus with a command surface that feels decisive, compact, and easy to scan. Its UI supports nostalgic excitement by making the player feel in control quickly, especially during attacks and rapid responses.

Command & Conquer reinforces many of the same strengths, especially command readability, minimap anchoring, production interaction, and iconic action presentation. Its interface language is assertive and efficient: the player is rarely asked to read more than necessary, and the structure of the HUD communicates purpose clearly.

Age of Empires contributes most strongly to economy readability and the emotional arc of buildup. It makes growth, production, and expansion feel satisfying and legible. For Wambasa Fishing Wars, this is especially relevant to the reel-production, harvesting, and fishing-income loops, which need to feel rewarding rather than opaque.

### Transferable UX Patterns

**Navigation Patterns**

- Right-anchored minimap and command concentration: supports constant battlefield awareness while keeping the main playfield dominant.
- Stable HUD zoning: minimap, economy, selection, commands, and alerts each have a predictable home, reducing search time.

**Interaction Patterns**

- Selection-first, right-click command flow: should remain the core interaction language for the game.
- Button-led command surfaces: production, tactical orders, and build actions should be exposed as compact action tiles rather than long descriptive controls.
- Queue visibility at a glance: production and economy state should be readable without opening deeper panels or reading dense copy.

**Visual Patterns**

- Strong factional and panel contrast: supports quick parsing during pressure.
- Distinct command-button silhouettes and iconography: helps players recognize actions before reading labels.
- Economy feedback that feels alive: supports accomplishment by showing the production machine working clearly.

### Anti-Patterns to Avoid

- Large walls of instructional text that compete with gameplay focus.
- HUD layouts that feel like a dashboard outside the game instead of a command overlay attached to the battlefield.
- Hidden or ambiguous production state that forces the player to inspect too deeply.
- Weak alerting and unclear response surfaces during attacks.
- Over-designed modern UI styling that loses the directness and clarity of classic RTS interfaces.

### Design Inspiration Strategy

**What to Adopt**

- Red Alert-style right-side command logic and strong battlefield-first layout.
- Command & Conquer-style compact command presentation and minimap-command relationship.
- Age of Empires-style economy readability and satisfying buildup feedback.

**What to Adapt**

- Production and command panels should be adapted to the fishing-company economy, including trucks, boats, reel production, and auto-flow mechanics.
- Classic RTS command readability should be preserved, but the specific verbs and visual language need to fit fishing war rather than tanks and barracks.

**What to Avoid**

- Copying classic RTS visuals too literally without adapting them to the game's economic identity.
- Falling back into text-heavy prototype UI just because the systems are unusual.
- Letting the HUD become a general-purpose management dashboard instead of a tactical control surface.

The design strategy is therefore to use classic RTS structure as the control language, while letting Wambasa Fishing Wars differentiate through theme, economy feedback, and iconography.

## Design System Foundation

### 1.1 Design System Choice

Wambasa Fishing Wars should use a custom RTS design system rather than an app-oriented design library. The game already has a custom DOM, presenter, panel, and CSS architecture, and the UX goals demand a highly specific HUD silhouette that matches classic RTS expectations instead of generic product UI conventions.

The design system should therefore be purpose-built around a right-side command rail, battlefield-first layout, compact action tiles, radar framing, queue chips, alert rows, selection cards, and economy blocks. It should feel like a command interface, not a web dashboard.

### Rationale for Selection

This choice fits the project’s needs for uniqueness, nostalgia, and architectural control. A custom design system is the only approach that can fully support the Red Alert-inspired right-anchored HUD, fishing-war economy signaling, generated icon language, and aggressive text reduction without fighting a component library built for forms and app screens.

It also aligns with the current codebase. The HUD is already implemented through `domShell.ts`, `hudPresenter.ts`, `panels.ts`, and `styles.css`, so extending that custom layer is lower-risk and more architecture-consistent than introducing an external UI system that would not naturally fit the game.

### Implementation Approach

The implementation should keep the existing separation of concerns:

- `domShell.ts` defines the stable HUD structure and named regions.
- `hudPresenter.ts` owns copy, state projection, and panel coordination.
- `panels.ts` renders reusable UI fragments such as selection cards, queues, and command groups.
- `styles.css` owns the visual system, layout, spacing, color tokens, and responsive behavior.

The system should be built from reusable HUD primitives rather than one-off styling. The core primitives should include command tiles, queue chips, radar framing, economy segments, selection summary cards, alert rows, and compact objective rows.

### Customization Strategy

The visual language should borrow classic RTS structure but adapt it to the fishing-company setting. Buttons, panels, and iconography should be customized to express workers, trucks, boats, reels, docks, sabotage, and fishing income clearly while still feeling immediately familiar to Red Alert and Command & Conquer players.

Generated icons should be used where possible to reduce text and create a more scan-friendly command surface. The customization strategy should emphasize faction readability, economy clarity, and tactical response speed while preserving the game’s distinctive theme.

## 2. Core Player Experience

### 2.1 Defining Experience

The defining experience of Wambasa Fishing Wars is: select, command, and grow a fishing-war economy fast enough to survive pressure and defeat the enemy.

At the interaction level, this means the player selects units or structures, reads the command surface instantly, issues right-click orders with confidence, and sees the economy or battlefield respond clearly enough to make the next decision without hesitation. If that loop feels right, the rest of the game inherits clarity and momentum.

### 2.2 Player Mental Model

Players will approach the game with a classic RTS mental model. They expect box select, direct right-click orders, minimap movement, command buttons, production queues, and fast threat feedback. They do not expect to learn a new control language just because the economy is about fish and reels instead of tanks and refineries.

The mental model should therefore remain established and familiar. The novelty belongs in the economy fantasy and the production chain, not in the core control scheme. Where players may become confused is not control input, but understanding the fishing-specific loops if the UI does not make them legible.

### 2.3 Success Criteria

The core interaction succeeds when the player can always answer four questions immediately:

- What is selected?
- What is it doing?
- What can I build or order next?
- Where am I under attack or pressure?

The experience should feel fast, reliable, and self-explanatory. Players should feel that selection and orders happen instantly, visual feedback confirms the command immediately, and the economy or combat state updates clearly enough that the next decision feels obvious.

### 2.4 Novel UX Patterns

This game should mostly rely on established RTS patterns with a fishing-economy twist rather than inventing novel controls. The right approach is to use familiar interaction patterns that players already trust, then express the game’s uniqueness through content, iconography, economy cues, and command labels.

The innovative layer should be thematic and systemic, not input-level. Fishing zones, reel production, worker shoreline fishing, and fish-income loops can all feel fresh without requiring new control metaphors.

### 2.5 Experience Mechanics

**1. Initiation**

The player begins by selecting units or structures directly on the battlefield or through classic RTS grouping behavior. The HUD should immediately update the right-side command rail with relevant information and available actions.

**2. Interaction**

The player issues commands primarily through right-click orders and compact command buttons. Mouse and keyboard remain the primary control scheme, with the minimap, queue panels, and tactical controls supporting rapid flow rather than interrupting it.

**3. Feedback**

The game must provide immediate confirmation through selection state, command-surface updates, production visibility, alert cues, and visible world response. If the player makes a mistake or clicks an invalid target, the feedback should be quick and clear without becoming verbose.

**4. Completion**

The player knows the loop is working when issued orders turn into visible economic or tactical results: trucks return, boats unload, reels accumulate, structures queue production, and defensive responses stabilize the battlefield. The next command should feel like a natural continuation of the previous one.

The core loop remains:

`select -> issue order -> get instant visual feedback -> see the economy/combat respond -> decide the next command`

## Visual Design Foundation

### Color System

The color system should take its emotional cues from classic Red Alert-era RTS interfaces: warm command golds, dark military green-black paneling, cool radar blues, and strong faction signal colors. The base HUD surfaces should feel like equipment and command hardware rather than a soft modern app shell.

Recommended semantic palette direction:

- `HUD base`: deep green-black and oil-charcoal tones for panel backgrounds
- `Command highlight`: warm amber/gold for active headers, emphasis, and primary command energy
- `Player faction cue`: cool steel-blue / radar-cyan accents
- `Enemy faction cue`: burnt red / alert-orange accents
- `Economy positive`: warm brass / cash gold
- `Success`: muted field green
- `Warning`: strong amber
- `Error / attack pressure`: hot red-orange
- `Neutral text`: parchment, sand, and pale metal tones rather than pure white

The color system should prioritize scan hierarchy over decoration. Important commands, attack alerts, and faction ownership must separate immediately even in peripheral vision. Contrast should remain high enough that the HUD stays readable against an active battlefield backdrop.

### Typography System

Typography should feel compact, assertive, and tactical. The system should avoid generic soft web-app typography and instead use a hierarchy that feels like command UI: strong uppercase labels, readable condensed body text, and highly legible numeric and queue values.

Recommended typography strategy:

- `Primary UI display`: a bold condensed or military-industrial style for headers, command labels, and command group titles
- `Body / readable support`: a sturdy sans-serif for selection details, hints, production state, and alerts
- `Micro labels`: uppercase condensed treatment for economy labels, category names, and minimap/radar labels
- `Numerics`: strong, stable figure styling for queue counts, resource values, and timers

Typography should support fast scanning first. The player should rarely need long paragraphs, so hierarchy matters more than expressive prose styling. Short labels, numeric clarity, and command emphasis should dominate the system.

### Spacing & Layout Foundation

The layout foundation should be dense and efficient rather than airy. This is a desktop RTS interface, so spacing should feel intentional and compressed enough to preserve battlefield space while still allowing reliable clicking and scanning.

Recommended spacing strategy:

- `Base spacing unit`: 8px
- `Tight spacing`: 4px for chips, icon gaps, compact labels
- `Standard spacing`: 8px for button rhythm, command grouping, inline panel spacing
- `Large spacing`: 12px to 16px for panel separation and major HUD zones
- `Panel radius`: restrained, hardware-like rounding rather than soft card-like curves
- `Grid structure`: right-side command rail with stable zones for radar, economy, selection, commands, alerts, and objectives

Layout principles:

- Battlefield always remains visually primary.
- The right-side rail should feel like one integrated command stack, not disconnected cards.
- Selection, production, and tactical actions should appear in predictable vertical relationships.
- Alerts and objectives should be compressed into high-signal strips, not long reading areas.
- The minimap/radar should anchor the command rail visually and functionally.

### Accessibility Considerations

The interface must remain readable under pressure, not only in static review. Accessibility here means tactical readability first:

- Maintain strong contrast between text and HUD surfaces.
- Ensure player/enemy signals do not rely on color alone; shape, icon, and placement should also differentiate.
- Use large enough hit targets for command tiles in fullscreen desktop play.
- Keep timers, queue counts, and economy numbers readable at common desktop resolutions.
- Avoid low-contrast decorative overlays behind critical text.
- Preserve readability at smaller desktop heights where the HUD becomes compressed.
- Ensure alert severity can be recognized instantly through multiple cues: color, icon marker, and wording.

## Design Direction Decision

### Design Directions Explored

The chosen direction is Direction A: a classic Red Alert-inspired right-rail command HUD. This direction was selected because it most directly supports the project's emotional goals of nostalgic excitement, confidence, and eager battlefield response while also matching the player's expected RTS control model.

An HTML showcase artifact was created at `_bmad-output/planning-artifacts/ux-design-directions.html` to make the direction concrete and implementation-friendly.

### Chosen Direction

Direction A uses a battlefield-first composition with a single integrated right-side command stack. The radar/minimap sits at the top as the visual anchor, followed by economy, selection state, command tiles, production visibility, and alerts/orders. The layout is dense, stable, and optimized for scan speed rather than explanation.

This direction intentionally favors classic RTS command readability over softer modern UI patterns. It keeps the player's attention on commanding the battlefield while still making the fishing-economy loop readable and satisfying.

### Design Rationale

Direction A best supports the defining interaction of the game: selecting units, issuing right-click commands, and seeing the economy and combat respond with confidence. It also aligns most strongly with the project's chosen inspirations, especially Red Alert and Command & Conquer.

The direction reduces walls of text, reinforces stable HUD zoning, and turns the right-side UI into a clear tactical command surface. This makes it easier to understand selection, production, economy state, and enemy pressure without interrupting player flow.

### Implementation Approach

Implementation should proceed by reshaping the existing custom HUD architecture rather than replacing it.

- `domShell.ts` should define the structural right-rail zones for radar, economy, selection, commands, and alerts.
- `panels.ts` should render compact command tiles, queue chips, alert rows, and denser selection summaries.
- `hudPresenter.ts` should reduce explanatory copy and support more scan-first labeling.
- `styles.css` should establish the Direction A visual system: right-rail density, amber command emphasis, dark military base surfaces, faction accent treatment, and compact hierarchy.

The generated icon strategy should be aligned to this direction so the command rail becomes increasingly visual and less dependent on text.
