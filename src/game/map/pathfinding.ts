import { PATH_CELL_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { clamp } from '../core/math';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  /** First time this cell entered the open set; breaks f ties exactly like Map insertion order did. */
  seq: number;
  parent?: PathNode;
  open: boolean;
}

interface HeapEntry {
  node: PathNode;
  f: number;
}

export type WalkableWorldPointPredicate = (worldX: number, worldY: number) => boolean;

const MAX_CELL_X = Math.floor((WORLD_WIDTH - 1) / PATH_CELL_SIZE);
const MAX_CELL_Y = Math.floor((WORLD_HEIGHT - 1) / PATH_CELL_SIZE);
// Cells are keyed numerically (no per-lookup strings). One padding cell on each side covers the
// out-of-world neighbours of edge cells; anything further out falls back to an uncached predicate call.
const KEY_STRIDE = MAX_CELL_X + 3;
const KEY_ROWS = MAX_CELL_Y + 3;
const NEIGHBOR_DX = [-1, 1, 0, 0, -1, 1, -1, 1];
const NEIGHBOR_DY = [0, 0, -1, 1, -1, -1, 1, 1];

/**
 * A* over the path grid.
 *
 * Search order is identical to the original Map-based implementation (lowest f first, ties resolved
 * by the order cells first entered the open set), but the open set is a binary heap, cells use numeric
 * keys and walkability is memoised per search. The old version spread the whole open set into a new
 * array on every expansion, which made a single unreachable move order allocate hundreds of MB.
 */
export function findGridPath(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  isWalkableWorldPoint: WalkableWorldPointPredicate,
): Array<{ x: number; y: number }> {
  const startX = worldToPathCellX(start.x);
  const startY = worldToPathCellY(start.y);
  const goalX = worldToPathCellX(goal.x);
  const goalY = worldToPathCellY(goal.y);

  // 0 = unknown, 1 = walkable, 2 = blocked. The predicate is pure for the duration of one search.
  const walkable = new Uint8Array(KEY_STRIDE * KEY_ROWS);
  const isWalkableCell = (cellX: number, cellY: number): boolean => {
    const key = cellKey(cellX, cellY);
    if (key < 0) {
      return isWalkableWorldPoint(cellToWorld(cellX), cellToWorld(cellY));
    }
    const cached = walkable[key];
    if (cached !== 0) {
      return cached === 1;
    }
    const result = isWalkableWorldPoint(cellToWorld(cellX), cellToWorld(cellY));
    walkable[key] = result ? 1 : 2;
    return result;
  };

  if (!isWalkableCell(startX, startY) || !isWalkableCell(goalX, goalY)) {
    return [];
  }

  const nodes = new Map<number, PathNode>();
  const closed = new Set<number>();
  const heap: HeapEntry[] = [];
  let seq = 0;

  const startNode: PathNode = { x: startX, y: startY, g: 0, f: pathHeuristic(startX, startY, goalX, goalY), seq: seq++, open: true };
  nodes.set(packKey(startX, startY), startNode);
  heapPush(heap, { node: startNode, f: startNode.f });
  let openCount = 1;

  while (openCount > 0) {
    const entry = heapPop(heap);
    if (!entry) break;
    const current = entry.node;
    // Lazy deletion: skip stale heap entries left behind when a node's f improved.
    if (!current.open || entry.f !== current.f) continue;
    current.open = false;
    openCount -= 1;
    closed.add(packKey(current.x, current.y));

    if (current.x === goalX && current.y === goalY) {
      return reconstructPath(current).concat(goal);
    }

    for (let direction = 0; direction < 8; direction += 1) {
      const neighborX = current.x + NEIGHBOR_DX[direction];
      const neighborY = current.y + NEIGHBOR_DY[direction];
      const neighborKey = packKey(neighborX, neighborY);
      const diagonal = direction >= 4;
      if (
        closed.has(neighborKey) ||
        !isWalkableCell(neighborX, neighborY) ||
        (diagonal && !(isWalkableCell(current.x, neighborY) && isWalkableCell(neighborX, current.y)))
      ) {
        continue;
      }

      const g = current.g + (diagonal ? Math.SQRT2 : 1);
      const existing = nodes.get(neighborKey);
      if (existing?.open && g >= existing.g) {
        continue;
      }

      const f = g + pathHeuristic(neighborX, neighborY, goalX, goalY);
      if (existing?.open) {
        existing.g = g;
        existing.f = f;
        existing.parent = current;
        heapPush(heap, { node: existing, f });
        continue;
      }
      const neighborNode: PathNode = { x: neighborX, y: neighborY, g, f, seq: seq++, parent: current, open: true };
      nodes.set(neighborKey, neighborNode);
      heapPush(heap, { node: neighborNode, f });
      openCount += 1;
    }
  }

  return [];
}

function reconstructPath(endNode: PathNode): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  let cursor: PathNode | undefined = endNode;
  while (cursor?.parent) {
    cells.push({ x: cellToWorld(cursor.x), y: cellToWorld(cursor.y) });
    cursor = cursor.parent;
  }
  return cells.reverse();
}

function worldToPathCellX(worldX: number): number {
  return clamp(Math.floor(worldX / PATH_CELL_SIZE), 0, MAX_CELL_X);
}

function worldToPathCellY(worldY: number): number {
  return clamp(Math.floor(worldY / PATH_CELL_SIZE), 0, MAX_CELL_Y);
}

function cellToWorld(cell: number): number {
  return cell * PATH_CELL_SIZE + PATH_CELL_SIZE / 2;
}

/** Index into the padded walkability grid, or -1 when the cell lies outside it. */
function cellKey(cellX: number, cellY: number): number {
  if (cellX < -1 || cellY < -1 || cellX > MAX_CELL_X + 1 || cellY > MAX_CELL_Y + 1) {
    return -1;
  }
  return (cellY + 1) * KEY_STRIDE + cellX + 1;
}

/** Collision-free numeric key for any integer cell (searches never stray far outside the grid). */
function packKey(cellX: number, cellY: number): number {
  return (cellY + 0x8000) * 0x10000 + (cellX + 0x8000);
}

function pathHeuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function isBefore(a: HeapEntry, b: HeapEntry): boolean {
  return a.f < b.f || (a.f === b.f && a.node.seq < b.node.seq);
}

function heapPush(heap: HeapEntry[], entry: HeapEntry): void {
  heap.push(entry);
  let index = heap.length - 1;
  while (index > 0) {
    const parentIndex = (index - 1) >> 1;
    if (!isBefore(heap[index], heap[parentIndex])) break;
    const swap = heap[parentIndex];
    heap[parentIndex] = heap[index];
    heap[index] = swap;
    index = parentIndex;
  }
}

function heapPop(heap: HeapEntry[]): HeapEntry | undefined {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length === 0 || !last) {
    return top;
  }
  heap[0] = last;
  let index = 0;
  for (;;) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && isBefore(heap[left], heap[smallest])) smallest = left;
    if (right < heap.length && isBefore(heap[right], heap[smallest])) smallest = right;
    if (smallest === index) break;
    const swap = heap[smallest];
    heap[smallest] = heap[index];
    heap[index] = swap;
    index = smallest;
  }
  return top;
}
