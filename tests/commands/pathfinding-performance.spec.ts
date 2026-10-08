import assert from 'node:assert/strict';
import { PATH_CELL_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../../src/game/config/constants';
import { findGridPath } from '../../src/game/map/pathfinding';

// Regression guard for heap growth during active play (spec-heap-growth-active-play): a move order to an
// unreachable spot used to explore the whole grid while copying the open set on every expansion and
// re-running the (expensive, entity-scanning) walkability predicate for every neighbour check.

const columns = Math.floor((WORLD_WIDTH - 1) / PATH_CELL_SIZE) + 1;
const rows = Math.floor((WORLD_HEIGHT - 1) / PATH_CELL_SIZE) + 1;
const gridCells = (columns + 2) * (rows + 2);

function walledGoalPredicate(): { predicate: (x: number, y: number) => boolean; calls: () => number } {
  let calls = 0;
  const predicate = (x: number, y: number): boolean => {
    calls += 1;
    if (x < 0 || y < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT) return false;
    // A closed ring around (6000, 2400): the goal inside is walkable but unreachable.
    const ring = Math.abs(Math.hypot(x - 6000, y - 2400) - 260);
    return ring >= 40;
  };
  return { predicate, calls: () => calls };
}

{
  const { predicate, calls } = walledGoalPredicate();
  const started = performance.now();
  const path = findGridPath({ x: 300, y: 300 }, { x: 6000, y: 2400 }, predicate);
  const elapsedMs = performance.now() - started;
  assert.deepEqual(path, [], 'goal inside a closed ring must be unreachable');
  assert.ok(calls() <= gridCells, `walkability must be memoised per search (calls=${calls()}, cells=${gridCells})`);
  assert.ok(elapsedMs < 1500, `unreachable full-grid search must stay fast (took ${elapsedMs.toFixed(0)} ms)`);
}

{
  const { predicate } = walledGoalPredicate();
  const path = findGridPath({ x: 300, y: 300 }, { x: 900, y: 700 }, predicate);
  assert.ok(path.length > 0, 'reachable goal must still produce a path');
  assert.deepEqual(path[path.length - 1], { x: 900, y: 700 }, 'path ends at the exact goal');
  for (let index = 1; index < path.length - 1; index += 1) {
    const step = Math.max(Math.abs(path[index].x - path[index - 1].x), Math.abs(path[index].y - path[index - 1].y));
    assert.ok(step <= PATH_CELL_SIZE, 'path advances one grid cell at a time');
  }
}

console.log('pathfinding performance regression checks passed');
