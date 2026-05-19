# G9.1 Playtest Notes Pass 02

Date: 2026-05-17

## Scope

Second tool-driven opening-pass verification after fixing the top five blockers from pass 01.

## Verification Run

- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "opening objectives match the actual starting base state and explain dock progression|factory and dock selections explain metal-only versus cash-backed production clearly|initializes Factory Command Center economy components and metal fields|factory spends metal, queues a worker, shows progress, and spawns it|factory can train a new guard for base defense|completed Dock spends metal, queues a fishing boat, and shows progress|loaded fishing boat returns to Dock and sells fish for cash|contested fishing zone pays more cash and shows higher-yield zone details|player loses when no recoverable economy path remains"`
- `npm run typecheck`

## Result

The second pass verified that the immediate opening blockers from pass 01 are resolved in the scripted flow:

- The objective flow now matches the actual starting base state.
- Dock progression now teaches the player to use the working dock instead of building a redundant one.
- Defense progression no longer auto-completes from startup state.
- Factory and Dock selections now explain cash usage directly.
- Queue/readout copy now surfaces mixed-resource production more clearly.

## Remaining Risks Before Moving On

- Camera/minimap feel is still unverified by a true human 10-minute play session.
- Group movement/collision comfort is still likely the next biggest felt issue once more units are active.
- Warning/focus UX still needs broader live-pressure validation.
- Production queue management is still shallow compared with a fully comfortable RTS opening.

## Recommendation

Batch 2 is now materially healthier, but it should receive one later human-led play session before being considered fully complete. The next development batch can proceed toward camera/minimap/group feel, with the expectation that a later live pass may still send small fixes back into Batch 2.
