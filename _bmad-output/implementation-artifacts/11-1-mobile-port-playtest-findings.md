---
status: done
story_key: 11-1-mobile-port-playtest-findings
title: Mobile Port Prototype Playtest Findings
---

# Mobile Port Prototype Playtest Findings

## Target Classes

- Phone portrait: 390x844, prototype supported behind `?mobile=1` or responsive gate.
- Phone landscape: 844x390, feasible only as a compact command-tray smoke target.
- Tablet landscape: 1024x768 and wider, expected to use desktop-style layout unless forced with `?mobile=1`.
- Minimum viable size: 390 CSS pixels wide. Smaller widths need a dedicated mobile art/readability pass.

## Prototype Result

- Mobile mode no longer squeezes the desktop right rail into the viewport. It uses a bottom command tray, compact minimap/economy strip, visible pause/menu button, and an explicit command panel drawer.
- Touch users have deliberate paths for select, smart order, move, attack, build buttons, long-press smart orders, and menu access without hover, right-click, or keyboard dependency.
- Desktop mode remains unchanged at normal desktop widths. The mobile tray stays hidden and existing F10/menu regression tests still pass.

## First-Skirmish Friction Notes

- Full first-skirmish completion is technically possible but still slower than desktop because build placement and camera travel need more polish.
- Two-finger pan/zoom is implemented as a prototype, but it needs physical-device validation for browser gesture conflicts.
- Drag-box selection is not a first-class mobile gesture yet. The current model prioritizes tap selection plus command-mode buttons.
- Readability is acceptable at 390x844 for the command path, but production/build panels will need content hierarchy polish before a real mobile port.
- Performance smoke is acceptable in Chromium desktop emulation. Real mobile device GPU and thermal behavior remain unknown.
