# Batch 6 Human Long-Session Playtest Checklist

Date: 2026-05-18

Purpose:

- close the remaining human-only Batch 6 tail
- find readability, feel, pacing, and final visual issues that automation will not catch

Session length:

- target `15-30` minutes

Test goals:

- confirm the game reads clearly during a real session
- confirm the map feels authored rather than procedural
- confirm enemy pressure is noticeable and fair
- identify the final polish issues worth fixing before declaring the GDD batches complete

Run conditions:

- use the normal local build
- use desktop mouse and keyboard
- preferred first pass in Chromium
- optional second quick pass in Firefox
- recommended viewport: `1920x1080`, then one smaller viewport such as `1366x768`

Checklist:

1. Start a new match and do not use debug hooks.
2. Harvest starter metal and note whether truck orders, return path, and economy feedback are obvious.
3. Select the Dock and produce at least one Fishing Boat and one Attack Boat.
4. Fish, unload, and confirm cash spending feels understandable.
5. Let the rival opening raid happen naturally and judge whether the warning is seen in time.
6. Build at least one Guard Tower and judge whether defensive coverage is readable.
7. Use Guards to attack an enemy target and note whether targeting/readability is clear during motion and combat.
8. Use the minimap repeatedly and judge whether camera movement stays comfortable over a longer session.
9. Spend at least a few minutes looking at the battlefield while moving between player base, center lane, and rival coast.
10. End the session with either victory or defeat and judge whether the result screen explanation feels useful.

What to watch for:

- unreadable text or panels
- alerts that are too easy to miss
- unit/building targets that are hard to identify
- moments where attack, sabotage, repair, or unload intent is unclear
- map areas that still look flat, empty, or “debug-like”
- places where roads, shorelines, or blockers do not help orientation
- long dead-time stretches with nothing meaningful to do
- enemy pressure that feels absent, unfair, or too easy to ignore

Severity labels:

- `P0`: blocks understanding or makes the session feel broken
- `P1`: strongly hurts readability, combat clarity, or map feel
- `P2`: noticeable polish issue but not a release blocker

Output:

- record findings in `g9-5-human-long-session-playtest-notes.md`
- only log concrete issues with repro and fix direction
