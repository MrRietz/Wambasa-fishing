# Batch 6 Map and Pressure Pass 03

Date: 2026-05-18

Scope:

- continue `G8.7` with practical level-design changes, not just terrain shading
- make the rival opener create real pressure without debug forcing
- verify that the widened map still supports naval combat and enemy intel coverage

Implemented:

- recomposed `skirmish01` to open a clearer eastern raid lane
- moved the rival staging units so the enemy base stays farther right while the raider can still reach the player economy
- reduced `aiFirstRaidGraceSeconds` to `20` so the first autonomous pressure event happens during a real opening window
- changed autonomous raid planning to choose the first reachable exposed player-economy target instead of failing on one blocked choice
- widened selectable hit padding for world entities to make unit/building picks less brittle
- added a debug selection hook for deterministic enemy-readout regression coverage
- updated brittle enemy/naval e2e checks to use live entity positions on the widened map

Verification:

- `npm run typecheck`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "Dock can produce a separate attack boat that can sink enemy boats|clicking rival units reveals enemy readout without granting player commands|AI rival emits a raid warning and sends a raider at exposed player economy|AI raider reaches the exposed truck and applies damage|AI rival launches a live opening raid without debug forcing after the grace window|guard attack mode shows hover targeting and range preview for valid enemy targets"`

Result:

- the rival now launches a live opening raid on the recomposed map without debug forcing
- the battlefield has more horizontal separation than before, but the enemy is no longer trapped behind its own blockers
- Batch 6 remains open for final environment composition, longer-session readability review, and broader browser/manual QA
