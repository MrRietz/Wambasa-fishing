# Batch 6 Firefox QA Pass 05

Date: 2026-05-18

Scope:

- close the explicit Firefox validation gap in `G9.4` / `G9.5`
- keep the existing Chromium runner intact while adding named browser projects

Implemented:

- installed Playwright Firefox locally
- updated `playwright.config.ts` to define explicit `chromium` and `firefox` projects
- preserved the repo's Chromium executable-path override
- ran the Batch 6 smoke matrix in Firefox

Verification:

- `npm run typecheck`
- `npx playwright test --project=firefox tests/e2e/epic1-rts-foundation.spec.ts -g "keeps core UI visible and publishes performance diagnostics at 1280x720|keeps core UI visible and publishes performance diagnostics at 1366x768|keeps core UI visible and publishes performance diagnostics at 1440x900|keeps core UI visible and publishes performance diagnostics at 1920x1080|moves canonical camera with minimap drag and mouse wheel zoom|drags the minimap viewport rectangle directly and can focus the player base with keyboard shortcut|AI rival launches a live opening raid without debug forcing after the grace window"`

Result:

- Firefox smoke coverage is now real, not just documented as a gap
- viewport/layout, camera/minimap, and live opening raid behavior all passed in Firefox
- a later broad Chromium rerun still exposed one remaining unresolved regression test around deterministic Guard Tower anti-raider coverage after the map/raid refactor
