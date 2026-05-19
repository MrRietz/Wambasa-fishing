# G9.1 First-10-Minutes Playtest Script

Date: 2026-05-17

## Purpose

Run a consistent first-10-minutes skirmish pass focused on whether the opening RTS economy is understandable, active, and recoverable without outside explanation.

## Preconditions

- Start a fresh skirmish on the default map.
- Use default settings unless the pass is explicitly for readability or difficulty.
- Do not use debug damage hooks or forced-raid helpers during the baseline pass.

## Pass Structure

### Minute 0 to 1

- Confirm the starting HUD communicates:
  - current metal
  - current cash
  - crew usage
  - immediate objective
- Select the truck and harvest the nearest metal field.
- Confirm the truck auto-cycles field -> Factory -> field after one command.

Success criteria:

- The player can identify the first useful action without guessing.
- The truck harvest loop requires one clear command, not babysitting.

### Minute 1 to 3

- Select the Factory and review available production.
- Produce one Worker or Guard.
- Confirm the cost text and queue readout are understandable.
- Spend one worker action on either House, Dock, or Guard Tower planning.

Success criteria:

- The player can tell which actions cost metal only and which cost metal plus cash.
- Command feedback clearly explains any blocked action.

### Minute 3 to 5

- Select the Dock and produce one Fishing Boat.
- Send the boat to a fishing zone and let it complete one full fish -> dock sale cycle.
- Confirm the cash gain is visible and legible.

Success criteria:

- Fishing feels like a real second economy, not a side animation.
- The player can tell that cash is now useful for later production.

### Minute 5 to 7

- Build or queue one defensive response:
  - Guard
  - Guard Tower
  - Saboteur for counter-pressure
- Watch whether the tactical panel makes attack vs hold vs attack-move readable.

Success criteria:

- The player can form one basic defense or pressure plan without hidden commands.
- The command panel stays readable while switching between economy and combat.

### Minute 7 to 10

- Scout or pressure one enemy asset.
- Observe the first meaningful AI reaction or raid pressure.
- Check whether the player can interpret:
  - what is being attacked
  - what resource is at risk
  - what recovery option still exists

Success criteria:

- There is no long idle stretch where waiting is the best move.
- The player can recover from one small mistake without feeling hard-locked.

## What To Log

For each pass, record:

- Build/version/date
- Settings used
- Time of first metal unload
- Time of first unit queued
- Time of first boat queued
- Time of first fish sale
- Time of first defensive or raid action
- Time of first enemy pressure event
- Top confusion points
- Top dead-time moments
- Top readability issues
- Any economy soft-lock or fake-choice moment

## Severity Guide

- `P0`: blocks understanding or progression in the first 10 minutes
- `P1`: confusing or frustrating but still playable
- `P2`: polish/readability issue without progression risk

## Current Known Focus Areas

Based on current implementation status, pay extra attention to:

- whether mixed metal+cash production costs are now understandable in live play
- whether the first fish sale makes cash feel meaningful
- whether camera/minimap feel slows down the opening loop
- whether group movement/collision creates avoidable friction while defending
- whether combat targeting and warnings remain readable under pressure

## Notes Template

```md
Run:
- Date:
- Build:
- Settings:

Timing:
- First metal unload:
- First unit queued:
- First boat queued:
- First fish sale:
- First defense/raid action:
- First enemy pressure:

Findings:
- [P0]
- [P1]
- [P2]

Follow-up fixes:
- 
```
