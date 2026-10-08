import type { DamageState, EntityKind, GameEntity } from '../entities/components';
import { getVisionRadius } from '../visibility/fogOfWar';
import { AI_COMBAT_VALUE, AI_MEMORY_TUNING } from './aiConfig';

/**
 * Fog-honest knowledge for the rival AI.
 *
 * The AI only learns about player entities that are inside the vision radius of one of its own
 * units/buildings (same radii as the player's fog of war) or that damage one of its assets.
 * Everything the AI decides about the player (targets, threat, tactic) reads this memory,
 * never the live entity list.
 */

export type AiSightingSource = 'vision' | 'damage';

export interface AiSighting {
  id: string;
  kind: EntityKind;
  combatRole?: 'fishing' | 'attack';
  x: number;
  y: number;
  firstSeenAt: number;
  lastSeenAt: number;
  healthRatio?: number;
  isBuilding: boolean;
  source: AiSightingSource;
}

export interface AiMemoryState {
  sightings: AiSighting[];
  lastScanAt: number;
  /** Ids of player entities inside rival vision during the latest scan. */
  visibleNow: string[];
  clearedCount: number;
  decayedCount: number;
  revealedCount: number;
}

export interface AiObservedPlayerState {
  workers: number;
  trucks: number;
  boats: number;
  attackBoats: number;
  guards: number;
  saboteurs?: number;
  guardTowers: number;
  docks: number;
  barracks: number;
  factories: number;
  /** Seconds since any player entity was last seen (Infinity when never). */
  lastSeenSeconds: number;
  knownSightings?: number;
  /** Remembered combat value near the player's main buildings. */
  baseDefenseScore?: number;
  /** Remembered combat value of all known player military. */
  militaryScore?: number;
}

export interface AiPerceptionInput {
  entities: GameEntity[];
  memory: AiMemoryState;
  now: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth?: (entity: GameEntity) => number;
}

export interface AiPerceptionResult {
  visible: number;
  newSightings: number;
  cleared: number;
  decayed: number;
}

interface VisionSource {
  x: number;
  y: number;
  radius: number;
}

const visionScratch: VisionSource[] = [];
let visionScratchCount = 0;

export function createAiMemoryState(): AiMemoryState {
  return { sightings: [], lastScanAt: -1, visibleNow: [], clearedCount: 0, decayedCount: 0, revealedCount: 0 };
}

export function ensureAiMemoryState(memory: AiMemoryState | undefined): AiMemoryState {
  if (!memory || !Array.isArray(memory.sightings) || !Array.isArray(memory.visibleNow)) {
    return createAiMemoryState();
  }
  return memory;
}

/** Collects rival (enemy faction) vision circles into a module scratch buffer. Returns the count. */
export function collectRivalVision(
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): number {
  visionScratchCount = 0;
  for (const entity of entities) {
    if (entity.faction !== 'enemy' || entity.renderable.hidden || getDamageState(entity) === 'destroyed') {
      continue;
    }
    if ((entity.economy?.health ?? 1) <= 0) {
      continue;
    }
    let source = visionScratch[visionScratchCount];
    if (!source) {
      source = { x: 0, y: 0, radius: 0 };
      visionScratch[visionScratchCount] = source;
    }
    source.x = entity.x;
    source.y = entity.y;
    source.radius = getVisionRadius(entity);
    visionScratchCount += 1;
  }
  return visionScratchCount;
}

/** True when the point lies within `share` of any collected rival vision radius (call collectRivalVision first). */
export function isPointInCollectedRivalVision(x: number, y: number, share = 1, margin = 0): boolean {
  for (let index = 0; index < visionScratchCount; index += 1) {
    const source = visionScratch[index];
    const radius = source.radius * share + margin;
    const dx = source.x - x;
    const dy = source.y - y;
    if (dx * dx + dy * dy <= radius * radius) {
      return true;
    }
  }
  return false;
}

/** Stand-alone visibility check (collects vision itself). Use for tests and infrequent queries. */
export function isEntityVisibleToRival(
  entities: GameEntity[],
  target: GameEntity,
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): boolean {
  collectRivalVision(entities, getDamageState);
  return isPointInCollectedRivalVision(target.x, target.y, 1, getSightMargin(target));
}

export function updateAiPerception(input: AiPerceptionInput): AiPerceptionResult {
  const { memory, now } = input;
  collectRivalVision(input.entities, input.getDamageState);
  memory.visibleNow.length = 0;
  let newSightings = 0;

  for (const entity of input.entities) {
    if (entity.faction !== 'player' || entity.renderable.hidden) {
      continue;
    }
    if (input.getDamageState(entity) === 'destroyed' || (entity.economy?.health ?? 1) <= 0) {
      continue;
    }
    if (!isPointInCollectedRivalVision(entity.x, entity.y, 1, getSightMargin(entity))) {
      continue;
    }
    memory.visibleNow.push(entity.id);
    if (upsertSighting(memory, entity, now, 'vision', input.getMaxHealth)) {
      newSightings += 1;
    }
  }

  let cleared = 0;
  let decayed = 0;
  for (let index = memory.sightings.length - 1; index >= 0; index -= 1) {
    const sighting = memory.sightings[index];
    if (sighting.lastSeenAt >= now) {
      continue;
    }
    // Re-scouted: the remembered spot is clearly inside rival vision but nothing was seen there.
    if (isPointInCollectedRivalVision(sighting.x, sighting.y, AI_MEMORY_TUNING.rescoutVisionShare)) {
      memory.sightings.splice(index, 1);
      cleared += 1;
      continue;
    }
    const ttl = sighting.isBuilding ? AI_MEMORY_TUNING.buildingSightingTtlSeconds : AI_MEMORY_TUNING.mobileSightingTtlSeconds;
    if (now - sighting.lastSeenAt > ttl) {
      memory.sightings.splice(index, 1);
      decayed += 1;
    }
  }

  if (memory.sightings.length > AI_MEMORY_TUNING.maxSightings) {
    memory.sightings.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    memory.sightings.length = AI_MEMORY_TUNING.maxSightings;
  }

  memory.lastScanAt = now;
  memory.clearedCount += cleared;
  memory.decayedCount += decayed;
  return { visible: memory.visibleNow.length, newSightings, cleared, decayed };
}

/** Records an attacker that damaged a rival asset (reasonable reveal: the AI knows where the shots came from). */
export function revealAttacker(memory: AiMemoryState, attacker: GameEntity, now: number, getMaxHealth?: (entity: GameEntity) => number): void {
  if (attacker.faction !== 'player') {
    return;
  }
  upsertSighting(memory, attacker, now, 'damage', getMaxHealth);
  memory.revealedCount += 1;
}

export function findSighting(memory: AiMemoryState, id: string): AiSighting | undefined {
  for (const sighting of memory.sightings) {
    if (sighting.id === id) {
      return sighting;
    }
  }
  return undefined;
}

export function forgetSighting(memory: AiMemoryState, id: string): void {
  const index = memory.sightings.findIndex((sighting) => sighting.id === id);
  if (index >= 0) {
    memory.sightings.splice(index, 1);
  }
}

export function isVisibleNow(memory: AiMemoryState, id: string): boolean {
  return memory.visibleNow.includes(id);
}

export function getSightingCombatValue(sighting: Pick<AiSighting, 'kind' | 'combatRole'>): number {
  if (sighting.kind === 'boat') {
    return sighting.combatRole === 'attack' ? 1 : 0;
  }
  return AI_COMBAT_VALUE[sighting.kind] ?? 0;
}

export function getEntityCombatValue(entity: GameEntity): number {
  return getSightingCombatValue({ kind: entity.kind, combatRole: entity.economy?.combatRole });
}

/** Remembered player combat value within `radius` of a point (towers count heavily, old mobile sightings fade). */
export function estimateDefenseNear(memory: AiMemoryState, x: number, y: number, radius: number, now: number): number {
  let score = 0;
  const radiusSquared = radius * radius;
  for (const sighting of memory.sightings) {
    const value = getSightingCombatValue(sighting);
    if (value <= 0 || sighting.kind === 'worker' || sighting.kind === 'truck') {
      continue;
    }
    const dx = sighting.x - x;
    const dy = sighting.y - y;
    if (dx * dx + dy * dy > radiusSquared) {
      continue;
    }
    const age = now - sighting.lastSeenAt;
    const confidence = sighting.isBuilding ? 1 : age <= AI_MEMORY_TUNING.staleMobileSeconds ? 1 : 0.5;
    score += value * confidence * (sighting.healthRatio ?? 1);
  }
  return score;
}

export function summarizeAiMemory(memory: AiMemoryState, now: number): AiObservedPlayerState {
  const observed: AiObservedPlayerState = {
    workers: 0,
    trucks: 0,
    boats: 0,
    attackBoats: 0,
    guards: 0,
    saboteurs: 0,
    guardTowers: 0,
    docks: 0,
    barracks: 0,
    factories: 0,
    lastSeenSeconds: Number.POSITIVE_INFINITY,
    knownSightings: memory.sightings.length,
    baseDefenseScore: 0,
    militaryScore: 0,
  };
  let baseX = 0;
  let baseY = 0;
  let baseCount = 0;
  for (const sighting of memory.sightings) {
    observed.lastSeenSeconds = Math.min(observed.lastSeenSeconds, now - sighting.lastSeenAt);
    switch (sighting.kind) {
      case 'worker': observed.workers += 1; break;
      case 'truck': observed.trucks += 1; break;
      case 'boat':
        if (sighting.combatRole === 'attack') observed.attackBoats += 1;
        else observed.boats += 1;
        break;
      case 'guard': observed.guards += 1; break;
      case 'saboteur': observed.saboteurs = (observed.saboteurs ?? 0) + 1; break;
      case 'guardTower': observed.guardTowers += 1; break;
      case 'dock': observed.docks += 1; break;
      case 'barracks': observed.barracks += 1; break;
      case 'factory': observed.factories += 1; break;
      default: break;
    }
    if (sighting.kind === 'factory' || sighting.kind === 'barracks') {
      baseX += sighting.x;
      baseY += sighting.y;
      baseCount += 1;
    }
    const value = getSightingCombatValue(sighting);
    if (value > 0 && sighting.kind !== 'worker' && sighting.kind !== 'truck') {
      observed.militaryScore = (observed.militaryScore ?? 0) + value;
    }
  }
  if (baseCount > 0) {
    observed.baseDefenseScore = estimateDefenseNear(memory, baseX / baseCount, baseY / baseCount, AI_MEMORY_TUNING.defenseRadius + 200, now);
  }
  return observed;
}

export interface AiTargetQuery {
  memory: AiMemoryState;
  now: number;
  origin: { x: number; y: number };
  /** Allowed target kinds in preference order (index = rank). */
  preferredKinds: EntityKind[];
  /** Skip targets whose remembered defense exceeds this value. */
  maxDefense?: number;
  /** Optional filter (e.g. reachable over water). */
  accept?: (sighting: AiSighting) => boolean;
}

/** Scores remembered sightings: preference rank, distance, remembered defense and staleness. */
export function chooseAiTargetFromMemory(query: AiTargetQuery): AiSighting | undefined {
  let best: AiSighting | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const sighting of query.memory.sightings) {
    const rank = query.preferredKinds.indexOf(sighting.kind);
    if (rank < 0) {
      continue;
    }
    if (query.accept && !query.accept(sighting)) {
      continue;
    }
    const defense = estimateDefenseNear(query.memory, sighting.x, sighting.y, AI_MEMORY_TUNING.defenseRadius, query.now);
    if (query.maxDefense !== undefined && defense > query.maxDefense) {
      continue;
    }
    const age = query.now - sighting.lastSeenAt;
    const stalePenalty = sighting.isBuilding ? 0 : Math.max(0, age - AI_MEMORY_TUNING.staleMobileSeconds) * 12;
    const distance = Math.hypot(sighting.x - query.origin.x, sighting.y - query.origin.y);
    const score = rank * 700 + distance * 0.25 + defense * 420 + stalePenalty;
    if (score < bestScore) {
      bestScore = score;
      best = sighting;
    }
  }
  return best;
}

function upsertSighting(
  memory: AiMemoryState,
  entity: GameEntity,
  now: number,
  source: AiSightingSource,
  getMaxHealth?: (entity: GameEntity) => number,
): boolean {
  const maxHealth = getMaxHealth?.(entity);
  const health = entity.economy?.health;
  const healthRatio = maxHealth && health !== undefined ? Math.max(0, Math.min(1, health / maxHealth)) : undefined;
  const existing = findSighting(memory, entity.id);
  if (existing) {
    existing.x = entity.x;
    existing.y = entity.y;
    existing.lastSeenAt = now;
    existing.kind = entity.kind;
    existing.combatRole = entity.economy?.combatRole;
    existing.healthRatio = healthRatio;
    existing.source = source;
    return false;
  }
  memory.sightings.push({
    id: entity.id,
    kind: entity.kind,
    combatRole: entity.economy?.combatRole,
    x: entity.x,
    y: entity.y,
    firstSeenAt: now,
    lastSeenAt: now,
    healthRatio,
    isBuilding: entity.renderable.layer === 'buildings' || entity.movement.speed <= 0,
    source,
  });
  return true;
}

function getSightMargin(entity: GameEntity): number {
  if (entity.collider.kind === 'rect') {
    return Math.min(entity.collider.width, entity.collider.height) / 2;
  }
  return entity.collider.radius;
}
