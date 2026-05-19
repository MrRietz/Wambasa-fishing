# Batch 4 Warning Pass 03

Date: 2026-05-18

Scope:

- `G7.5` attack warning and counterplay loop

Implemented:

- Centralized actionable warning logic for important player assets under enemy attack.
- Added focusable warning coverage for Factory, Dock, trucks, boats, and Guard Towers through a shared important-asset rule.
- Added simulation-time warning rate limiting so repeated hits on the same asset do not spam the alert feed.
- Extended the debug raid hook to target a specific player asset for deterministic regression coverage.

Verification:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "AI rival emits a raid warning and sends a raider at exposed player economy|AI raider reaches the exposed truck and applies damage|dock attack warnings are actionable and rate-limited against repeated forced raids|guard attack mode shows hover targeting and range preview for valid enemy targets|attack boat hover preview distinguishes valid enemy boats from invalid enemy buildings|selected guard can arm Attack, get invalid-target feedback, and left-click an enemy target|Dock can produce a separate attack boat that can sink enemy boats"`

Notes:

- This closes `G7.5` for the current first-pass engineering scope.
- Remaining future work is polish-level tuning of wording, prioritization, and any later live-play adjustments rather than missing actionable warning behavior.
