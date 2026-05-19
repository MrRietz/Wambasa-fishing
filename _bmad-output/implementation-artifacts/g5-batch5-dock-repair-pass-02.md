## Batch 5 - G5.3 Dock Repair Pass 02

Status: verified

Scope completed:

- Added explicit dock-repair orders for damaged player boats.
- Boat repairs now happen over time at a functioning Dock and consume cash while repairing.
- Destroyed or unavailable docks now reject boat repair cleanly.
- Fishing and attack boats both use the same dock-repair path.
- Enemy boats can also route back to their Dock for repair when eligible.
- Selection readout now exposes dock-repair state and repair cost rate.

Verification run:

- `npm run typecheck`
- `npm run test:commands`
- `npx playwright test tests/e2e/epic1-rts-foundation.spec.ts -g "Dock can produce a separate attack boat that can sink enemy boats|damaged boats can return to Dock for paid repair|boat repair is blocked when the friendly Dock is destroyed|selected fishing boat can harvest fish from a fishing zone|loaded fishing boat returns to Dock and sells fish for cash|contested fishing zone pays more cash and shows higher-yield zone details|depleted fishing zones return partial catch, warn about poor yield, and regrow over time"`

Result:

- `G5.3` is done first pass for the current GDD batch workflow.
- Batch 5 is now closed.
- Next unfinished batch is Batch 6: readability cleanup, result/rematch polish, and broader release QA.
