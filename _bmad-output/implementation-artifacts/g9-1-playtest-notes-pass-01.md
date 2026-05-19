# G9.1 Playtest Notes Pass 01

Date: 2026-05-17

## Scope

Tool-driven opening-pass notes using the first-10-minutes script structure as closely as possible through Playwright and debug-state inspection. This is not a substitute for a later human feel pass, but it is a valid blocker-finding pass for Batch 2.

## Run

- Date: 2026-05-17
- Build: local working tree after cash-sink and combat-routing fixes
- Settings: default
- Method: tool-driven scripted playtest slices plus objective/economy/combat regression checks

## Timing

- First metal unload: verified in opening loop
- First unit queued: verified in opening loop
- First boat queued: verified in opening loop
- First fish sale: verified in opening loop
- First defense/raid action: verified in opening loop
- First enemy pressure: still covered by focused AI/death-path checks rather than a full uninterrupted 10-minute human session

## Top 5 Blockers Found

- `P0` The opening objective told the player to build a Dock even though the match already starts with a working dock.
- `P0` The defense/raid objective could auto-complete before the player did anything, because startup state looked like completed progress.
- `P1` Factory selection did not explain that Workers/Trucks are metal-only while Guards/Saboteurs also cost cash.
- `P1` Dock selection did not explain that Fishing Boats cost cash and that fish sales refill that economy.
- `P1` Production queue readouts hid mixed-resource costs, so queued combat/naval production looked less understandable under pressure.

## Fixes Applied Immediately

- Changed the dock objective from a false “build a dock” instruction to “Review the Working Dock,” and made it complete on actual dock interaction instead of requiring a redundant extra dock.
- Tightened defense objective completion so it only reflects real player defense/pressure actions, not startup guard presence or pre-damaged enemy state.
- Added factory command-hint copy that explains metal-only versus cash-backed production.
- Added dock command-hint copy that explains the fish -> cash -> boat/combat loop.
- Expanded production queue readouts and selection summaries to show mixed metal+cash costs directly.

## Blockers Already Addressed Before This Pass

- `P0` Cash was previously earned but not spent anywhere meaningful.
  - Fix shipped in [_bmad-output/implementation-artifacts/g9-3-opening-economy-cash-fix.md](/abs/c:/repo_games/Wambasa-fishing/_bmad-output/implementation-artifacts/g9-3-opening-economy-cash-fix.md:1)
- `P0` Saboteur right-click routing could be stolen by attack command routing.
  - Fix shipped in [createApp.ts](/abs/c:/repo_games/Wambasa-fishing/src/app/createApp.ts:2531)
- `P0` Attack command usability was too hidden for live play.
  - Fixed earlier with explicit Attack command and targeting mode in [createApp.ts](/abs/c:/repo_games/Wambasa-fishing/src/app/createApp.ts:1166)

## Remaining For Later Human-Led Pass

- `P1` Production queue remains simple and may feel opaque during pressure because cancel/reorder is still missing.
- `P1` Camera/minimap feel may still slow down early multitasking compared with classic RTS expectations.
- `P1` Group spacing and collision polish may still make response play feel clumsy once more than a few units are active.
- `P1` Warning/focus UX may still be too weak during overlapping economy and combat events.
