import { buildingCatalog } from '../data/buildings';
import { productionCatalog, type ProductionKind } from '../data/production';
import type { DamageState, GameEntity } from '../entities/components';

export interface AiRebuildInput {
  entities: GameEntity[];
  availableMetal: number;
  availableCash: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  queueProduction: (product: ProductionKind) => boolean;
  buildDock: () => boolean;
  buildBarracks: () => boolean;
  onRebuildAction: (message: string) => void;
  onResetHarvest: () => void;
  onResetDock: () => void;
  onResetBarracks: () => void;
  onResetBoat: () => void;
}

export function updateAiEconomyRebuildSystem(input: AiRebuildInput): boolean {
  const activeEnemyFactory = input.entities.find((entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy' && input.getDamageState(entity) !== 'destroyed');
  if (!activeEnemyFactory) {
    return false;
  }

  const activeWorkers = countActive(input, 'worker');
  if (activeWorkers < 1 && !hasEnemyQueuedProduct(input.entities, 'worker') && canAffordProduction(input, 'worker')) {
    input.onRebuildAction('Rival rebuilding worker.');
    return input.queueProduction('worker');
  }

  const activeTrucks = countActive(input, 'truck');
  if (activeTrucks < 1 && !hasEnemyQueuedProduct(input.entities, 'truck') && canAffordProduction(input, 'truck')) {
    input.onResetHarvest();
    input.onRebuildAction('Rival rebuilding metal hauler.');
    return input.queueProduction('truck');
  }

  const enemyDocks = input.entities.filter((entity) => entity.kind === 'dock' && entity.faction === 'enemy');
  const activeDocks = enemyDocks.filter((entity) => input.getDamageState(entity) !== 'destroyed').length;
  if (enemyDocks.length > 0 && activeDocks < 1 && input.availableMetal >= buildingCatalog.dock.cost) {
    input.onResetDock();
    input.onRebuildAction('Rival rebuilding dock.');
    return input.buildDock();
  }

  const enemyBarracks = input.entities.filter((entity) => entity.kind === 'barracks' && entity.faction === 'enemy');
  const activeBarracks = enemyBarracks.filter((entity) => input.getDamageState(entity) !== 'destroyed').length;
  if (enemyBarracks.length > 0 && activeBarracks < 1 && input.availableMetal >= buildingCatalog.barracks.cost) {
    input.onResetBarracks();
    input.onRebuildAction('Rival rebuilding barracks.');
    return input.buildBarracks();
  }

  const enemyBoats = input.entities.filter((entity) => entity.kind === 'boat' && entity.faction === 'enemy');
  const activeBoats = enemyBoats.filter((entity) => input.getDamageState(entity) !== 'destroyed').length;
  if (
    activeDocks > 0 &&
    enemyBoats.length > 0 &&
    activeBoats < 1 &&
    !hasEnemyQueuedProduct(input.entities, 'boat') &&
    canAffordProduction(input, 'boat')
  ) {
    input.onResetBoat();
    input.onRebuildAction('Rival rebuilding fishing boat.');
    return input.queueProduction('boat');
  }

  return false;
}

function canAffordProduction(input: Pick<AiRebuildInput, 'availableMetal' | 'availableCash'>, product: ProductionKind): boolean {
  const definition = productionCatalog[product];
  return input.availableMetal >= definition.cost && input.availableCash >= (definition.cashCost ?? 0);
}

function countActive(input: Pick<AiRebuildInput, 'entities' | 'getDamageState'>, kind: GameEntity['kind']): number {
  return input.entities.filter((entity) => entity.kind === kind && entity.faction === 'enemy' && input.getDamageState(entity) !== 'destroyed').length;
}

function hasEnemyQueuedProduct(entities: GameEntity[], product: ProductionKind): boolean {
  return entities.some((entity) => entity.faction === 'enemy' && entity.economy?.productionQueue?.some((item) => item.product === product));
}
