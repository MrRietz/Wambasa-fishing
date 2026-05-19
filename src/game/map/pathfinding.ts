import { PATH_CELL_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { clamp } from '../core/math';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent?: string;
}

export type WalkableWorldPointPredicate = (worldX: number, worldY: number) => boolean;

export function findGridPath(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  isWalkableWorldPoint: WalkableWorldPointPredicate,
): Array<{ x: number; y: number }> {
  const pathNodeCache = new Map<string, PathNode>();
  const startCell = worldToPathCell(start);
  const goalCell = worldToPathCell(goal);

  if (!isWalkablePathCell(startCell.x, startCell.y, isWalkableWorldPoint) || !isWalkablePathCell(goalCell.x, goalCell.y, isWalkableWorldPoint)) {
    return [];
  }

  const open = new Map<string, PathNode>();
  const closed = new Set<string>();
  const startKey = pathCellKey(startCell.x, startCell.y);
  const startNode = { ...startCell, g: 0, f: pathHeuristic(startCell, goalCell) };
  open.set(startKey, startNode);
  pathNodeCache.set(startKey, startNode);

  while (open.size > 0) {
    const current = [...open.values()].reduce((best, candidate) => (candidate.f < best.f ? candidate : best));
    const currentKey = pathCellKey(current.x, current.y);
    open.delete(currentKey);
    closed.add(currentKey);

    if (current.x === goalCell.x && current.y === goalCell.y) {
      return reconstructPath(current, pathNodeCache).concat(goal);
    }

    for (const neighbor of pathNeighbors(current.x, current.y)) {
      const neighborKey = pathCellKey(neighbor.x, neighbor.y);
      if (
        closed.has(neighborKey) ||
        !isWalkablePathCell(neighbor.x, neighbor.y, isWalkableWorldPoint) ||
        !canTraverseNeighbor(current, neighbor, isWalkableWorldPoint)
      ) {
        continue;
      }

      const movementCost = neighbor.x !== current.x && neighbor.y !== current.y ? Math.SQRT2 : 1;
      const g = current.g + movementCost;
      const existing = open.get(neighborKey);
      if (existing && g >= existing.g) {
        continue;
      }

      const neighborNode = {
        x: neighbor.x,
        y: neighbor.y,
        g,
        f: g + pathHeuristic(neighbor, goalCell),
        parent: currentKey,
      };
      open.set(neighborKey, neighborNode);
      pathNodeCache.set(neighborKey, neighborNode);
    }
  }

  return [];
}

function reconstructPath(endNode: PathNode, pathNodeCache: Map<string, PathNode>): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  let cursor: PathNode | undefined = endNode;
  while (cursor) {
    cells.unshift({ x: cursor.x, y: cursor.y });
    cursor = cursor.parent ? pathNodeCache.get(cursor.parent) : undefined;
  }

  return cells.slice(1).map(pathCellToWorld);
}

function isWalkablePathCell(cellX: number, cellY: number, isWalkableWorldPoint: WalkableWorldPointPredicate): boolean {
  const point = pathCellToWorld({ x: cellX, y: cellY });
  return isWalkableWorldPoint(point.x, point.y);
}

function worldToPathCell(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clamp(Math.floor(point.x / PATH_CELL_SIZE), 0, Math.floor((WORLD_WIDTH - 1) / PATH_CELL_SIZE)),
    y: clamp(Math.floor(point.y / PATH_CELL_SIZE), 0, Math.floor((WORLD_HEIGHT - 1) / PATH_CELL_SIZE)),
  };
}

function pathCellToWorld(cell: { x: number; y: number }): { x: number; y: number } {
  return {
    x: cell.x * PATH_CELL_SIZE + PATH_CELL_SIZE / 2,
    y: cell.y * PATH_CELL_SIZE + PATH_CELL_SIZE / 2,
  };
}

function pathCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function pathHeuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathNeighbors(x: number, y: number): Array<{ x: number; y: number }> {
  return [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
    { x: x - 1, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y + 1 },
    { x: x + 1, y: y + 1 },
  ];
}

function canTraverseNeighbor(
  current: { x: number; y: number },
  neighbor: { x: number; y: number },
  isWalkableWorldPoint: WalkableWorldPointPredicate,
): boolean {
  const diagonal = current.x !== neighbor.x && current.y !== neighbor.y;
  if (!diagonal) {
    return true;
  }

  return (
    isWalkablePathCell(current.x, neighbor.y, isWalkableWorldPoint) &&
    isWalkablePathCell(neighbor.x, current.y, isWalkableWorldPoint)
  );
}
