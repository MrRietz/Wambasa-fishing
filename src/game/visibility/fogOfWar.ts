import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import type { DamageState, GameEntity } from '../entities/components';

export interface VisibilityState {
  cellSize: number;
  columns: number;
  rows: number;
  visible: Uint8Array;
  explored: Uint8Array;
}

export function createVisibilityState(cellSize = 64): VisibilityState {
  const columns = Math.ceil(WORLD_WIDTH / cellSize);
  const rows = Math.ceil(WORLD_HEIGHT / cellSize);
  return {
    cellSize,
    columns,
    rows,
    visible: new Uint8Array(columns * rows),
    explored: new Uint8Array(columns * rows),
  };
}

export function recomputePlayerVisibility(
  state: VisibilityState,
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): void {
  state.visible.fill(0);
  for (const entity of entities) {
    if (entity.faction !== 'player' || entity.renderable.hidden || getDamageState(entity) === 'destroyed') {
      continue;
    }
    revealCircle(state, entity.x, entity.y, getVisionRadius(entity));
  }
}

export function isWorldVisible(state: VisibilityState, x: number, y: number): boolean {
  return state.visible[worldToIndex(state, x, y)] === 1;
}

export function isWorldExplored(state: VisibilityState, x: number, y: number): boolean {
  return state.explored[worldToIndex(state, x, y)] === 1;
}

export function isEntityVisible(state: VisibilityState, entity: GameEntity): boolean {
  if (entity.faction === 'player') {
    return true;
  }
  return isWorldVisible(state, entity.x, entity.y);
}

function revealCircle(state: VisibilityState, centerX: number, centerY: number, radius: number): void {
  const minColumn = Math.max(0, Math.floor((centerX - radius) / state.cellSize));
  const maxColumn = Math.min(state.columns - 1, Math.floor((centerX + radius) / state.cellSize));
  const minRow = Math.max(0, Math.floor((centerY - radius) / state.cellSize));
  const maxRow = Math.min(state.rows - 1, Math.floor((centerY + radius) / state.cellSize));
  const radiusSquared = radius * radius;

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const x = column * state.cellSize + state.cellSize / 2;
      const y = row * state.cellSize + state.cellSize / 2;
      if ((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY) > radiusSquared) {
        continue;
      }
      const index = row * state.columns + column;
      state.visible[index] = 1;
      state.explored[index] = 1;
    }
  }
}

function worldToIndex(state: VisibilityState, x: number, y: number): number {
  const column = Math.max(0, Math.min(state.columns - 1, Math.floor(x / state.cellSize)));
  const row = Math.max(0, Math.min(state.rows - 1, Math.floor(y / state.cellSize)));
  return row * state.columns + column;
}

function getVisionRadius(entity: GameEntity): number {
  if (entity.kind === 'guardTower') return 560;
  if (entity.kind === 'factory' || entity.kind === 'enemyFactory') return 520;
  if (entity.kind === 'dock' || entity.kind === 'barracks' || entity.kind === 'techLab') return 380;
  if (entity.kind === 'boat') return 400;
  if (entity.kind === 'guard' || entity.kind === 'saboteur') return 340;
  if (entity.kind === 'worker' || entity.kind === 'truck') return 280;
  return 320;
}
