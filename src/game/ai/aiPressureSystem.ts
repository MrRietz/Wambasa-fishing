import type { DamageState, GameEntity } from '../entities/components';
import { collectRivalVision, isPointInCollectedRivalVision } from './aiMemory';

export interface AiTerritoryThreat {
  threatId: string;
  attackedAssetId: string;
}

/** First idle rival guard that can take a raid order (workers never raid offensively). */
export function chooseAiRaidAttacker(
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): GameEntity | null {
  for (const entity of entities) {
    if (
      entity.faction === 'enemy' &&
      entity.kind === 'guard' &&
      getDamageState(entity) !== 'destroyed' &&
      entity.movement.speed > 0 &&
      entity.movement.state === 'idle' &&
      !entity.economy?.attack &&
      !entity.economy?.buildJob
    ) {
      return entity;
    }
  }
  return null;
}

/**
 * Closest dangerous player intruder near a protected rival asset. Fog-honest: an intruder only
 * counts when it is inside the vision of some rival unit or building.
 */
export function findAiTerritoryThreat(
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): AiTerritoryThreat | null {
  collectRivalVision(entities, getDamageState);
  let bestScore = Number.POSITIVE_INFINITY;
  let best: AiTerritoryThreat | null = null;
  for (const intruder of entities) {
    if (
      intruder.faction !== 'player' ||
      intruder.renderable.hidden ||
      getDamageState(intruder) === 'destroyed' ||
      (!intruder.movement.speed && !intruder.economy?.construction)
    ) {
      continue;
    }
    if (!isPointInCollectedRivalVision(intruder.x, intruder.y)) {
      continue;
    }
    for (const asset of entities) {
      if (!isProtectedAsset(asset) || getDamageState(asset) === 'destroyed' || asset.renderable.hidden) {
        continue;
      }
      const distance = Math.hypot(intruder.x - asset.x, intruder.y - asset.y);
      if (distance > getAiAssetAlertRange(asset)) {
        continue;
      }
      const score = getAiThreatScore(intruder) * 10000 + distance;
      if (score < bestScore) {
        bestScore = score;
        best = { threatId: intruder.id, attackedAssetId: asset.id };
      }
    }
  }
  return best;
}

function isProtectedAsset(entity: GameEntity): boolean {
  return (
    entity.faction === 'enemy' &&
    (entity.kind === 'enemyFactory' ||
      entity.kind === 'dock' ||
      entity.kind === 'barracks' ||
      entity.kind === 'guardTower' ||
      entity.kind === 'truck' ||
      entity.kind === 'worker')
  );
}

function getAiAssetAlertRange(asset: GameEntity): number {
  if (asset.kind === 'enemyFactory') return 1050;
  if (asset.kind === 'dock' || asset.kind === 'barracks' || asset.kind === 'guardTower') return 760;
  if (asset.kind === 'truck') return 520;
  return 420;
}

function getAiThreatScore(entity: GameEntity): number {
  if (entity.kind === 'guardTower') return 0;
  if (entity.kind === 'guard') return 1;
  if (entity.kind === 'saboteur') return 2;
  if (entity.kind === 'worker') return 3;
  if (entity.kind === 'truck') return 4;
  return 5;
}
