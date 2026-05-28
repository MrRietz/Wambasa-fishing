# Investigation: Desktop HUD Usability at 1920x1080

## Hand-off Brief

1. **What happened.** The 1920x1080 desktop UI is hard to use because the current right rail consumes 424px by 1056px, covering about 22% of the visible battlefield while the game still renders behind it.
2. **Where the case stands.** Concluded; mission text is compact, but radar/economy/selection/commands/intel are over-concentrated in one overlay rail.
3. **What's needed next.** Implement a desktop HUD zoning pass: keep radar/economy compact on the right, move selection and command controls into a bottom command bar, and compress mission/alerts into small high-signal strips.

## Case Info

| Field            | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Ticket           | N/A                                                                   |
| Date opened      | 2026-05-28                                                            |
| Status           | Concluded                                                             |
| System           | Windows, PowerShell, browser RTS Vite app                             |
| Evidence sources | User report, source code, CSS, GDS/UX planning docs, version control  |

## Problem Statement

User report: "UI is hard to use on 1920x1080 screens mission is in the way radar and info about units take a lot of space, maybe we need some kind of bottom ui also? or something I dont know"

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| User report | Available | Free-text usability report for 1920x1080 desktop play. |
| Source DOM shell | Available | `src/game/ui/domShell.ts:156` through `src/game/ui/domShell.ts:243` defines the right-side Radar, Command, Mission, and alert stack. |
| CSS layout | Available | `src/styles.css:250` fixes the right rail at 424px max width; `src/styles.css:127` leaves the game viewport full-window behind it. |
| Planning docs | Available | GDD and UX docs require UI not to block gameplay and point toward compact RTS command surfaces. |
| Live screenshot/geometry | Available | Playwright measured started, worker-selected, factory-selected, and group-selected states at 1920x1080. Screenshots saved under this investigation folder. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Measure 1920x1080 live HUD geometry and blocked playfield area | High | Done | Right rail is 424x1056, about 22% width and 21.6% screen area. |
| 2 | Trace how selection/unit info grows during common selections | High | Done | Selection/command text reduces command-grid space; mission remains only 72px high. |
| 3 | Compare current implementation to UX spec direction | Medium | Done | UX spec wants battlefield dominance, compact command presentation, and compressed alerts/objectives. |
| 4 | Identify smallest implementable layout change | Medium | Done | Recommended next step is hybrid desktop HUD zoning, not just hiding mission text. |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-05-28 | User reported hard-to-use 1920x1080 UI with mission/radar/unit info taking too much space. | Conversation | Confirmed |
| 2026-05-28 | Investigation opened. | This case file | Confirmed |
| 2026-05-28 | Playwright measured live 1920x1080 HUD geometry across common selection states. | `desktop-hud-1920-started.png`, `desktop-hud-1920-worker.png` | Confirmed |

## Confirmed Findings

### Finding 1: Desktop HUD Is A Fixed Right-Side Rail

**Evidence:** `src/game/ui/domShell.ts:156`, `src/styles.css:250`

**Detail:** The desktop shell renders an `aside.rts-side-panel` containing minimap/radar, command panel, selection readout, command grid, mission objectives, and alert feed. CSS positions it from top-right to bottom-right with width `min(424px, calc(100vw - 24px))`.

### Finding 2: Game Viewport Still Occupies The Full Window Behind The Rail

**Evidence:** `src/styles.css:127`

**Detail:** `.rts-game` is absolutely positioned with `inset: 0`, so the playable render surface and camera canvas occupy the full viewport, including the area visually covered by the right rail.

### Finding 3: Mission/Intel Lives Inside The Command Panel

**Evidence:** `src/game/ui/domShell.ts:237`, `src/styles.css:957`

**Detail:** The Mission objective panel and alert feed are nested as `.rts-intel-panel` inside `.rts-command-panel`, after selection and command grid content.

### Finding 4: Current Objective Renderer Intentionally Shows Only One Objective

**Evidence:** `src/game/ui/panels.ts:86`

**Detail:** `renderObjectiveList` clears the list and appends only the current, next incomplete, or final objective. The mission is compact in item count, so its intrusiveness is likely from placement/zoning rather than a long objective list.

### Finding 5: Live 1920x1080 Right Rail Covers About One Fifth Of The Screen

**Evidence:** Playwright probe on 2026-05-28; screenshots `desktop-hud-1920-started.png` and `desktop-hud-1920-worker.png`

**Detail:** At 1920x1080, `.rts-side-panel` measured `x=1484`, `y=12`, `width=424`, `height=1056`, so it covers 22.08% of screen width and 21.59% of screen area. The game viewport measured `width=1920`, `height=1080`, confirming the panel overlays the battlefield rather than reserving layout space.

### Finding 6: Radar Plus Economy Is Larger Than Mission/Intel

**Evidence:** Playwright probe on 2026-05-28

**Detail:** `.rts-minimap-panel` measured 424x417, with the minimap at 402x231 and economy readout at 402x133. The `.rts-intel-panel` measured 402x109, and the mission objective panel itself measured 402x72.

### Finding 7: Selection And Command Text Compete For The Same Vertical Rail Budget

**Evidence:** Playwright probe on 2026-05-28; `src/game/ui/domShell.ts:170`, `src/game/ui/domShell.ts:175`, `src/game/ui/domShell.ts:176`

**Detail:** Worker selection adds a 402x127 selection readout, shrinking the command grid from 410px high with no selection to 323px. Factory selection keeps the same 402x127 selection readout and a longer 402x97 command header, shrinking the command grid to 251px.

### Finding 8: Existing Automated Viewport Tests Do Not Test Playfield Occlusion

**Evidence:** `tests/e2e/epic1-rts-foundation.spec.ts:797`

**Detail:** The viewport matrix verifies key UI elements are visible and that the command grid fits inside the command panel. It does not assert that the battlefield remains sufficiently unobstructed or that the right rail reserves camera/layout space.

## Deduced Conclusions

### Deduction 1: The Automated "Visible In Viewport" Checks Can Pass While Playfield Usability Still Fails

**Based on:** Findings 1 and 2.

**Reasoning:** A right rail can be entirely inside the browser viewport while still covering a large portion of the rendered game world because the game canvas is not laid out around the rail.

**Conclusion:** The user report is not contradicted by existing viewport smoke tests; this is a usability/layout-zoning issue, not necessarily an overflow bug.

### Deduction 2: Mission Is A Symptom Marker, Not The Primary Space Consumer

**Based on:** Findings 4, 6, and 7.

**Reasoning:** Mission shows only one objective and measured 72px high. Radar/economy consumes 417px, and selected-unit/command content consumes the main vertical budget below it.

**Conclusion:** Hiding mission alone would not solve the complaint; the right rail needs responsibility split or compression.

## Hypothesized Paths

### Hypothesis 1: The Right Rail Takes Too Much Horizontal Gameplay Space At 1920x1080

**Status:** Confirmed

**Theory:** A 424px overlay consumes roughly 22% of a 1920px-wide screen and can hide units, map interactions, or right-edge battlefield context.

**Supporting indicators:** Fixed rail width in CSS and user report naming radar/unit info as space-heavy.

**Would confirm:** Live geometry showing a large overlay area over the game canvas, especially during common selected-unit states.

**Would refute:** Live layout showing the rail is small enough and the real issue is elsewhere, such as top-left HUD or camera framing.

**Resolution:** Confirmed by live measurement: 424px of 1920px width and 21.59% of screen area are occupied by the right rail overlay.

### Hypothesis 2: Moving Commands/Selection To A Bottom Bar Would Improve Desktop Usability

**Status:** Confirmed

**Theory:** A classic RTS-style bottom command/info strip could move unit details and command buttons out of the right rail, leaving the right side for a smaller radar/economy/intel stack.

**Supporting indicators:** User suggested a bottom UI; mobile prototype already has bottom command tray patterns; UX docs call for compact RTS command presentation.

**Would confirm:** Source and live geometry show selection/commands dominate vertical rail height and force mission/radar competition.

**Would refute:** If radar/economy alone is the main blocker or if bottom UI would hide more important vertical playfield.

**Resolution:** Confirmed as the strongest fix direction by evidence that selection/commands compete with radar/economy/mission in one vertical rail, while planning docs call for battlefield-dominant compact command presentation.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Human play sequence notes | Would tune exact dimensions and priority after layout change | 10-minute desktop playtest or recorded screen. |
| Post-redesign regression criteria | Would prevent recurrence of "visible but too obstructive" layout | Add Playwright assertions for maximum overlay share or reserved playfield. |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | N/A; usability issue anchored in `src/game/ui/domShell.ts:156` and `src/styles.css:250`. |
| Trigger | Desktop viewport renders `aside.rts-side-panel` over a full-window `main.rts-game`. |
| Condition | 1920x1080 desktop mode with right rail visible during play. |
| Related files | `src/game/ui/domShell.ts`, `src/game/ui/panels.ts`, `src/game/ui/hudPresenter.ts`, `src/styles.css`, `tests/e2e/epic1-rts-foundation.spec.ts`. |

## Conclusion

**Confidence:** High

The user premise is supported: the current desktop HUD is technically within the viewport but occupies too much battlefield space as a single overlay rail. Mission text is not the main cause by itself; the core issue is that radar, economy, selection, command buttons, mission, and alerts all compete inside one right-side column while the game viewport continues underneath it.

## Recommended Next Steps

### Fix direction

Implement a hybrid desktop RTS HUD:

1. Keep a compact right rail for radar/minimap, economy, alerts, and a one-line mission/objective strip.
2. Move selected-unit info and contextual command buttons into a bottom command bar spanning the lower center/right, with stable height and compact icon-led buttons.
3. Reduce duplicated explanatory text in command hints and selection guidance; keep fuller copy in tooltips or rare onboarding states.
4. Add a layout regression that checks not only viewport visibility, but also maximum overlay area or explicit reserved playfield.

### Diagnostic

After implementing a layout pass, rerun the Playwright geometry probe at 1920x1080 and 1366x768. Compare right-side overlay share, bottom-bar height, command reachability, minimap click behavior, and selected-unit readability.

## Reproduction Plan

1. Start the Vite app.
2. Open the RTS at 1920x1080.
3. Start a skirmish.
4. Measure `.rts-game`, `.rts-side-panel`, `.rts-minimap-panel`, `.rts-command-panel`, `.rts-selection-readout`, `.rts-command-grid`, and `.rts-intel-panel`.
5. Select `worker-1`, `player-factory`, and `worker-1`/`worker-2`/`truck-1`.
6. Confirm the current right rail remains about 424x1056 before the redesign, then rerun after changes to verify the battlefield is less obstructed.

## Side Findings

- The GDS skill activation command `python3 .\_bmad\scripts\resolve_customization.py --skill .agents\skills\gds-investigate --key workflow` failed because `python3` is not on PATH in this Windows environment; rerunning with `python` succeeded.

## Follow-up: 2026-05-28

### New Evidence

- Playwright 1920x1080 measurement confirmed `.rts-side-panel` at 424x1056, starting at x=1484, covering 22.08% of screen width and 21.59% of screen area.
- Started/no-selection state measured `.rts-minimap-panel` at 424x417, `.rts-command-panel` at 424x631, `.rts-command-grid` at 402x410, and `.rts-intel-panel` at 402x109.
- Worker-selected state measured `.rts-selection-readout` at 402x127 and `.rts-command-grid` at 402x323.
- Factory-selected state measured `.rts-command-header` at 402x97, `.rts-selection-readout` at 402x127, and `.rts-command-grid` at 402x251.
- Screenshots saved: `desktop-hud-1920-started.png`, `desktop-hud-1920-worker.png`.

### Additional Findings

- Mission panel measured only 402x72. It is visible at the bottom of the command panel and may feel "in the way," but its size is smaller than the radar/economy block and selection/command block.
- Existing viewport tests confirm visibility, not gameplay occlusion.

### Updated Hypotheses

- Hypothesis 1 confirmed.
- Hypothesis 2 confirmed as fix direction, pending implementation validation.

### Backlog Changes

- Investigation backlog closed except for post-fix regression criteria and human playtest tuning.

### Updated Conclusion

The desktop HUD should be redesigned as a hybrid layout rather than patched by hiding mission text. The right rail should become a compact radar/economy/intel strip, while selection and command controls should move to a stable bottom command bar.
