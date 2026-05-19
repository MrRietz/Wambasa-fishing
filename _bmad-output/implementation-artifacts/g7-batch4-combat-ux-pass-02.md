# Batch 4 Combat UX Pass 02

Date: 2026-05-18

Scope:

- `G7.3` combat command UX

Implemented:

- Added a dedicated combat-targeting overlay layer for hover-driven targeting feedback.
- Selected guards and attack boats now expose attack-range preview circles when combat targeting is active or when hovering valid enemy targets.
- Hovering enemy targets now highlights valid targets in green and invalid targets in red.
- Guard attack mode updates the command hint when a valid target is under the cursor.
- Added debug-state coverage for combat preview state so e2e can verify hover targeting without pixel scraping.

Verification:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "guard attack mode shows hover targeting and range preview for valid enemy targets|attack boat hover preview distinguishes valid enemy boats from invalid enemy buildings|selected guard can arm Attack, get invalid-target feedback, and left-click an enemy target|Dock can produce a separate attack boat that can sink enemy boats|AI rival emits a raid warning and sends a raider at exposed player economy|AI raider reaches the exposed truck and applies damage"`

Notes:

- This closes `G7.3` for the current first-pass engineering scope.
- Remaining Batch 4 work is centered on `G7.5` breadth and polish: more asset types, anti-spam warning rate limiting, and broader counterplay/focus coverage.
