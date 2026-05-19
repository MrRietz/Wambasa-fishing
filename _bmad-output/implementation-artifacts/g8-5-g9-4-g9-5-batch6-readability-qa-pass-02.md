## Batch 6 - G8.5 / G9.4 / G9.5 Readability and QA Pass 02

Status: verified

Scope completed:

- Added a short recommendation line to the match result panel, keyed to the current victory/defeat reason.
- Tightened low-height desktop readability in the side panel so command, intel, and result sections compress more cleanly.
- Kept the desktop viewport matrix green at 1280x720, 1366x768, 1440x900, and 1920x1080.

Verification run:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "keeps core UI visible and publishes performance diagnostics|enemy command center destruction ends the match in victory|player command center destruction ends the match in defeat|player loses when no recoverable economy path remains"`

Result:

- `G8.5` advanced with another verified readability pass.
- `G9.4` is done first pass for result/recommendation behavior.
- `G9.5` is done first pass for the current automated desktop viewport matrix.
