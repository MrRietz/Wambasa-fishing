import { productionCatalog, type ProductionKind } from '../data/production';
import type { DamageState, GameEntity } from '../entities/components';
import type { AiStrategy } from './aiCoordinator';
import type { AiTactic } from './aiIntelSystem';

export interface AiFactoryPressureInput {
  strategy: AiStrategy;
  tactic?: AiTactic;
  entities: GameEntity[];
  availableMetal: number;
  availableCash: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export interface AiTerritoryThreat {
  threatId: string;
  attackedAssetId: string;
}

export function chooseAiFactoryProduction(input: AiFactoryPressureInput): Exclude<ProductionKind, 'boat' | 'attackBoat' | 'guard' | 'saboteur'> | null {
  const aliveEnemyUnits = input.entities.filter(
    (entity) => entity.faction === 'enemy' && entity.movement.speed > 0 && input.getDamageState(entity) !== 'destroyed',
  );
  const enemyWorkers = aliveEnemyUnits.filter((entity) => entity.kind === 'worker').length;
  const enemyTrucks = aliveEnemyUnits.filter((entity) => entity.kind === 'truck').length;
  const priorities: Array<Exclude<ProductionKind, 'boat' | 'attackBoat' | 'guard' | 'saboteur'>> = [];
  if (input.tactic === 'probeEconomy') {
    if (enemyWorkers < 4) priorities.push('worker');
    if (enemyTrucks < 3) priorities.push('truck');
    if (enemyWorkers < 5) priorities.push('worker');
  } else if (input.tactic === 'baseSiege') {
    if (enemyTrucks < 2) priorities.push('truck');
    if (enemyWorkers < 3) priorities.push('worker');
  } else if (input.strategy === 'economicBoom') {
    if (enemyWorkers < 3) priorities.push('worker');
    if (enemyTrucks < 2) priorities.push('truck');
    if (enemyWorkers < 4) priorities.push('worker');
    if (enemyTrucks < 3) priorities.push('truck');
  } else if (input.strategy === 'harborPressure') {
    if (enemyTrucks < 2) priorities.push('truck');
    if (enemyWorkers < 3) priorities.push('worker');
    if (enemyTrucks < 3) priorities.push('truck');
  } else {
    if (enemyTrucks < 1) priorities.push('truck');
    if (enemyWorkers < 2) priorities.push('worker');
    if (enemyWorkers < 3) priorities.push('worker');
    if (enemyTrucks < 2) priorities.push('truck');
  }

  for (const product of priorities) {
    const definition = productionCatalog[product];
    if (input.availableMetal >= definition.cost && input.availableCash >= (definition.cashCost ?? 0)) {
      return product;
    }
  }

  return null;
}

export function chooseAiBarracksProduction(input: AiFactoryPressureInput): Extract<ProductionKind, 'guard' | 'saboteur'> | null {
  const aliveEnemyUnits = input.entities.filter(
    (entity) => entity.faction === 'enemy' && entity.movement.speed > 0 && input.getDamageState(entity) !== 'destroyed',
  );
  const enemyWorkers = aliveEnemyUnits.filter((entity) => entity.kind === 'worker').length;
  const enemyGuards = aliveEnemyUnits.filter((entity) => entity.kind === 'guard').length;
  const enemySaboteurs = aliveEnemyUnits.filter((entity) => entity.kind === 'saboteur').length;
  const playerEconomyTargets = input.entities.filter(
    (entity) =>
      entity.faction === 'player' &&
      input.getDamageState(entity) !== 'destroyed' &&
      (entity.kind === 'truck' || entity.kind === 'dock' || entity.kind === 'factory' || entity.kind === 'boat' || entity.kind === 'barracks'),
  ).length;
  const playerCombatPressure = input.entities.filter(
    (entity) =>
      entity.faction === 'player' &&
      input.getDamageState(entity) !== 'destroyed' &&
      (entity.kind === 'guard' || entity.kind === 'saboteur' || entity.kind === 'guardTower'),
  ).length;

  const priorities: Array<Extract<ProductionKind, 'guard' | 'saboteur'>> = [];
  if (input.tactic === 'counterMilitary') {
    if (enemyGuards < 5) priorities.push('guard', 'guard');
    if (enemySaboteurs < 1 && enemyGuards >= 3) priorities.push('saboteur');
    if (enemyGuards < 7) priorities.push('guard');
  } else if (input.tactic === 'baseSiege') {
    if (enemyGuards < 4) priorities.push('guard', 'guard');
    if (enemyGuards >= 2 && enemySaboteurs < 2) priorities.push('saboteur');
    if (enemyGuards < 7) priorities.push('guard');
  } else if (input.tactic === 'harborControl') {
    if (enemyGuards < 3) priorities.push('guard');
    if (playerEconomyTargets >= 2 && enemySaboteurs < 1) priorities.push('saboteur');
    if (enemyGuards < 5) priorities.push('guard');
  } else if (input.strategy === 'economicBoom') {
    if (enemyGuards < 2) priorities.push('guard');
    if (playerCombatPressure >= 2 && enemyGuards < 4) priorities.push('guard');
    if (enemyWorkers >= 3 && enemyGuards >= 3 && enemySaboteurs < 1) priorities.push('saboteur');
    if (enemyGuards < 5) priorities.push('guard');
  } else if (input.strategy === 'harborPressure') {
    if (enemyGuards < 3) priorities.push('guard', 'guard');
    if (playerEconomyTargets >= 3 && enemyGuards < 5) priorities.push('guard');
    if (enemyGuards >= 3 && enemySaboteurs < 1) priorities.push('saboteur');
    if (enemyGuards < 6) priorities.push('guard');
  } else {
    if (enemyGuards < 3) priorities.push('guard', 'guard');
    if (playerCombatPressure >= 1 && enemyGuards < 5) priorities.push('guard');
    if (enemyWorkers >= 2 && enemyGuards >= 2 && enemySaboteurs < 1) priorities.push('saboteur');
    if (enemyGuards < 7) priorities.push('guard');
    if (enemyGuards >= 4 && enemySaboteurs < 2 && playerEconomyTargets >= 2) priorities.push('saboteur');
  }

  for (const product of priorities) {
    const definition = productionCatalog[product];
    if (input.availableMetal >= definition.cost && input.availableCash >= (definition.cashCost ?? 0)) {
      return product;
    }
  }

  return null;
}

export function chooseAiDockProduction(input: AiFactoryPressureInput): Extract<ProductionKind, 'boat' | 'attackBoat'> | null {
  const enemyBoats = input.entities.filter(
    (entity) => entity.faction === 'enemy' && entity.kind === 'boat' && input.getDamageState(entity) !== 'destroyed',
  );
  const enemyAttackBoats = enemyBoats.filter((entity) => entity.economy?.combatRole === 'attack').length;
  const enemyFishingBoats = enemyBoats.filter((entity) => entity.economy?.combatRole !== 'attack').length;
  const playerBoats = input.entities.filter(
    (entity) => entity.faction === 'player' && entity.kind === 'boat' && input.getDamageState(entity) !== 'destroyed',
  ).length;
  const playerDockOrFactory = input.entities.filter(
    (entity) =>
      entity.faction === 'player' &&
      input.getDamageState(entity) !== 'destroyed' &&
      (entity.kind === 'dock' || entity.kind === 'factory'),
  ).length;

  const priorities: Array<Extract<ProductionKind, 'boat' | 'attackBoat'>> = [];
  if (input.tactic === 'harborControl') {
    if (enemyFishingBoats < 1) priorities.push('boat');
    if (enemyAttackBoats < Math.max(1, playerBoats)) priorities.push('attackBoat');
    if (enemyFishingBoats < 2) priorities.push('boat');
    if (playerDockOrFactory > 0 && enemyAttackBoats < 2) priorities.push('attackBoat');
  } else if (input.tactic === 'counterMilitary') {
    if (playerBoats > 0 && enemyAttackBoats < Math.max(1, Math.ceil(playerBoats / 2))) priorities.push('attackBoat');
    if (enemyFishingBoats < 1) priorities.push('boat');
  } else if (input.strategy === 'economicBoom') {
    if (enemyFishingBoats < 2) priorities.push('boat', 'boat');
    if (enemyFishingBoats < 3) priorities.push('boat');
    if (playerBoats > 1 && enemyAttackBoats < 1) priorities.push('attackBoat');
  } else if (input.strategy === 'harborPressure') {
    if (enemyFishingBoats < 1) priorities.push('boat');
    if (enemyAttackBoats < 1) priorities.push('attackBoat');
    if (playerBoats > 0 && enemyAttackBoats < Math.max(2, Math.ceil(playerBoats))) priorities.push('attackBoat');
    if (enemyFishingBoats < 2) priorities.push('boat');
  } else {
    if (enemyFishingBoats < 1) priorities.push('boat');
    if (playerDockOrFactory > 1 && enemyAttackBoats < 1) priorities.push('attackBoat');
    if (playerBoats > 0 && enemyAttackBoats < Math.max(1, Math.ceil(playerBoats / 2))) priorities.push('attackBoat');
    if (enemyFishingBoats < 2) priorities.push('boat');
  }

  for (const product of priorities) {
    const definition = productionCatalog[product];
    if (input.availableMetal >= definition.cost && input.availableCash >= (definition.cashCost ?? 0)) {
      return product;
    }
  }

  return null;
}

export function chooseAiRaidAttacker(
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): GameEntity | null {
  const candidates = entities.filter(
    (entity) =>
      entity.faction === 'enemy' &&
      getDamageState(entity) !== 'destroyed' &&
      entity.movement.speed > 0 &&
      entity.movement.state === 'idle' &&
      !entity.economy?.attack &&
      !entity.economy?.buildJob &&
      entity.kind === 'guard',
  );

  return candidates[0] ?? null;
}

export function findAiTerritoryThreat(
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): AiTerritoryThreat | null {
  const protectedAssets = entities.filter(
    (entity) =>
      entity.faction === 'enemy' &&
      getDamageState(entity) !== 'destroyed' &&
      !entity.renderable.hidden &&
      (
        entity.kind === 'enemyFactory' ||
        entity.kind === 'dock' ||
        entity.kind === 'barracks' ||
        entity.kind === 'guardTower' ||
        entity.kind === 'truck' ||
        entity.kind === 'worker'
      ),
  );
  if (protectedAssets.length === 0) {
    return null;
  }

  const intruders = entities.flatMap((entity) => {
    if (
      entity.faction !== 'player' ||
      getDamageState(entity) === 'destroyed' ||
      (!entity.movement.speed && !entity.economy?.construction)
    ) {
      return [];
    }

    return protectedAssets
      .map((asset) => {
        const distance = Math.hypot(entity.x - asset.x, entity.y - asset.y);
        const alertRange = getAiAssetAlertRange(asset);
        if (distance > alertRange) {
          return null;
        }
        return {
          entity,
          asset,
          distance,
          score: getAiThreatScore(entity) * 10000 + distance,
        };
      })
      .filter((entry): entry is { entity: GameEntity; asset: GameEntity; distance: number; score: number } => Boolean(entry));
  }).sort((a, b) => a.score - b.score);

  const topThreat = intruders[0];
  return topThreat ? { threatId: topThreat.entity.id, attackedAssetId: topThreat.asset.id } : null;
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
