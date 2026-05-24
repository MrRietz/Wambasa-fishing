import { buildingCatalog } from '../data/buildings';
import { productionCatalog, type ProductionKind } from '../data/production';
import type { RtsDebugState } from '../debug/debugState';
import type { DamageState, GameEntity } from '../entities/components';
import type { AiIntelState, AiTactic } from './aiIntelSystem';
import { updateAiEconomyRebuildSystem } from './aiRebuildSystem';
import { chooseAiBarracksProduction, chooseAiDockProduction, chooseAiFactoryProduction, findAiTerritoryThreat } from './aiPressureSystem';

export type AiStrategy = 'economicBoom' | 'harborPressure' | 'siege';

export interface AiControllerState {
  strategy: AiStrategy;
  activeTactic?: AiTactic;
  intel?: AiIntelState;
  startDelaySeconds: number;
  raidDelaySeconds: number;
  territoryAlertCooldownSeconds: number;
  harvestIssued: boolean;
  openingComplete: boolean;
  productionQueued: boolean;
  barracksProductionQueued: boolean;
  dockBuilt: boolean;
  boatProductionQueued: boolean;
  fishingIssued: boolean;
  raidIssued: boolean;
  activeTerritoryThreatId?: string;
  lastAction: string;
  raidCount: number;
  tickCount?: number;
  lastTickDeltaSeconds?: number;
  lastProductionEvent?: RtsDebugState['ai']['lastProductionEvent'];
  lastResourceEvent?: RtsDebugState['ai']['lastResourceEvent'];
  lastRaidEvent?: RtsDebugState['ai']['lastRaidEvent'];
  lastDefenseEvent?: RtsDebugState['ai']['lastDefenseEvent'];
}

export interface AiCoordinatorInput {
  deltaSeconds: number;
  state: AiControllerState;
  entities: GameEntity[];
  availableMetal: number;
  availableCash: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  tryIssueHarvest: () => boolean;
  queueProduction: (product: ProductionKind) => boolean;
  buildDock: () => boolean;
  buildBarracks: () => boolean;
  updateProduction: () => boolean;
  updateFishing: () => boolean;
  updateBoatRepair: () => boolean;
  respondToThreat: (threatId: string, attackedAssetId: string) => boolean;
  issueRaid: () => boolean;
  updateRaid: () => boolean;
}

export function tickAiCoordinator(input: AiCoordinatorInput): boolean {
  let changed = false;
  input.state.tickCount = (input.state.tickCount ?? 0) + 1;
  input.state.lastTickDeltaSeconds = input.deltaSeconds;
  if (input.state.startDelaySeconds > 0) {
    input.state.startDelaySeconds = Math.max(0, input.state.startDelaySeconds - input.deltaSeconds);
    return false;
  }

  input.state.territoryAlertCooldownSeconds = Math.max(0, input.state.territoryAlertCooldownSeconds - input.deltaSeconds);

  if (!input.state.harvestIssued) {
    changed = input.tryIssueHarvest() || changed;
  }

  const rebuildChanged = updateAiEconomyRebuildSystem({
    entities: input.entities,
    availableMetal: input.availableMetal,
    availableCash: input.availableCash,
    getDamageState: input.getDamageState,
    queueProduction: (product) => input.queueProduction(product),
    buildDock: () => input.buildDock(),
    buildBarracks: () => input.buildBarracks(),
    onRebuildAction: (message) => {
      input.state.lastAction = message;
    },
    onResetHarvest: () => {
      input.state.harvestIssued = false;
    },
    onResetDock: () => {
      input.state.dockBuilt = false;
      input.state.boatProductionQueued = false;
      input.state.fishingIssued = false;
    },
    onResetBarracks: () => {
      input.state.barracksProductionQueued = false;
    },
    onResetBoat: () => {
      input.state.boatProductionQueued = false;
      input.state.fishingIssued = false;
    },
  });
  changed = rebuildChanged || changed;

  if (!rebuildChanged && input.state.openingComplete && !input.state.dockBuilt && input.state.harvestIssued && input.availableMetal >= buildingCatalog.dock.cost) {
    changed = input.buildDock() || changed;
  }

  if (!rebuildChanged && !input.state.openingComplete) {
    changed = runAiOpeningPlan(input) || changed;
  }

  if (!rebuildChanged && input.state.openingComplete && !changed) {
    const hasBarracks = input.entities.some((entity) => entity.faction === 'enemy' && entity.kind === 'barracks' && input.getDamageState(entity) !== 'destroyed');
    const barracksProduct = hasBarracks && !input.state.barracksProductionQueued
      ? chooseAiBarracksProduction({
          strategy: input.state.strategy,
          tactic: input.state.activeTactic,
          entities: input.entities,
          availableMetal: input.availableMetal,
          availableCash: input.availableCash,
          getDamageState: input.getDamageState,
        })
      : null;
    const factoryProduct = !barracksProduct && !input.state.productionQueued
      ? chooseAiFactoryProduction({
          strategy: input.state.strategy,
          tactic: input.state.activeTactic,
          entities: input.entities,
          availableMetal: input.availableMetal,
          availableCash: input.availableCash,
          getDamageState: input.getDamageState,
        })
      : null;

    if (barracksProduct) {
      changed = input.queueProduction(barracksProduct) || changed;
    } else if (factoryProduct) {
      changed = input.queueProduction(factoryProduct) || changed;
    }
    if (!factoryProduct && !barracksProduct && !hasBarracks && input.availableMetal >= buildingCatalog.barracks.cost) {
      changed = input.buildBarracks() || changed;
    } else if (!factoryProduct && !barracksProduct && !input.state.dockBuilt && input.availableMetal >= buildingCatalog.dock.cost) {
      changed = input.buildDock() || changed;
    } else if (!factoryProduct && !barracksProduct && input.state.dockBuilt && !input.state.boatProductionQueued) {
      const dockProduct = chooseAiDockProduction({
        strategy: input.state.strategy,
        tactic: input.state.activeTactic,
        entities: input.entities,
        availableMetal: input.availableMetal,
        availableCash: input.availableCash,
        getDamageState: input.getDamageState,
      });
      if (dockProduct) {
        changed = input.queueProduction(dockProduct) || changed;
      } else if (input.availableMetal >= productionCatalog.boat.cost) {
        changed = input.queueProduction('boat') || changed;
      }
    }
  }

  changed = input.updateProduction() || changed;
  changed = input.updateFishing() || changed;
  changed = input.updateBoatRepair() || changed;
  changed = updateAiTerritoryDefense(input) || changed;
  changed = updateAiRaid(input) || changed;
  return changed;
}

function updateAiTerritoryDefense(input: AiCoordinatorInput): boolean {
  const threat = findAiTerritoryThreat(input.entities, input.getDamageState);
  if (!threat) {
    input.state.activeTerritoryThreatId = undefined;
    return false;
  }
  if (input.state.activeTerritoryThreatId === threat.threatId && input.state.territoryAlertCooldownSeconds > 0) {
    return false;
  }

  input.state.activeTerritoryThreatId = threat.threatId;
  input.state.territoryAlertCooldownSeconds = 8;
  const changed = input.respondToThreat(threat.threatId, threat.attackedAssetId);
  if (changed) {
    input.state.lastAction = 'Rival defenders responding to an intrusion near their base.';
  }
  return changed;
}

function updateAiRaid(input: AiCoordinatorInput): boolean {
  if (input.state.raidDelaySeconds > 0) {
    input.state.raidDelaySeconds = Math.max(0, input.state.raidDelaySeconds - input.deltaSeconds);
    return false;
  }
  if (!input.state.raidIssued) {
    return input.issueRaid();
  }
  return input.updateRaid();
}

type AiOpeningItem = 'worker' | 'truck' | 'dock' | 'boat' | 'attackBoat' | 'barracks' | 'guard' | 'saboteur';
type AiOpeningStep = { item: AiOpeningItem; targetCount: number };

function runAiOpeningPlan(input: AiCoordinatorInput): boolean {
  if (input.state.openingComplete) {
    return false;
  }

  const plan = getAiOpeningPlan(input.state.strategy);
  let allSatisfied = true;
  for (const step of plan) {
    const item = step.item;
    if (isOpeningStepSatisfied(input.entities, step, input.getDamageState)) {
      continue;
    }

    allSatisfied = false;
    if (item === 'dock') {
      if (input.availableMetal >= buildingCatalog.dock.cost) {
        const built = input.buildDock();
        if (built) {
          input.state.lastAction = `Rival opening: dock established for ${describeAiStrategy(input.state.strategy)} plan.`;
        }
        return built;
      }
      return false;
    }
    if (item === 'barracks') {
      if (input.availableMetal >= buildingCatalog.barracks.cost) {
        const built = input.buildBarracks();
        if (built) {
          input.state.lastAction = `Rival opening: barracks established for ${describeAiStrategy(input.state.strategy)} plan.`;
        }
        return built;
      }
      return false;
    }

    const definition = productionCatalog[item];
    if (input.availableMetal >= definition.cost && input.availableCash >= (definition.cashCost ?? 0)) {
      const queued = input.queueProduction(item);
      if (queued) {
        input.state.lastAction = `Rival opening: queued ${definition.label.toLowerCase()} for ${describeAiStrategy(input.state.strategy)} plan.`;
      }
      return queued;
    }
    return false;
  }

  if (allSatisfied) {
    input.state.openingComplete = true;
    input.state.lastAction = `Rival ${describeAiStrategy(input.state.strategy)} opening complete.`;
  }
  return false;
}

function getAiOpeningPlan(strategy: AiStrategy): AiOpeningStep[] {
  switch (strategy) {
    case 'economicBoom':
      return [
        { item: 'worker', targetCount: 3 },
        { item: 'truck', targetCount: 1 },
        { item: 'barracks', targetCount: 1 },
        { item: 'guard', targetCount: 1 },
        { item: 'dock', targetCount: 1 },
        { item: 'boat', targetCount: 1 },
        { item: 'truck', targetCount: 2 },
        { item: 'boat', targetCount: 2 },
        { item: 'guard', targetCount: 2 },
      ];
    case 'harborPressure':
      return [
        { item: 'worker', targetCount: 3 },
        { item: 'truck', targetCount: 1 },
        { item: 'dock', targetCount: 1 },
        { item: 'barracks', targetCount: 1 },
        { item: 'guard', targetCount: 1 },
        { item: 'boat', targetCount: 1 },
        { item: 'attackBoat', targetCount: 1 },
        { item: 'guard', targetCount: 2 },
      ];
    case 'siege':
    default:
      return [
        { item: 'worker', targetCount: 3 },
        { item: 'truck', targetCount: 1 },
        { item: 'barracks', targetCount: 1 },
        { item: 'guard', targetCount: 2 },
        { item: 'dock', targetCount: 1 },
        { item: 'boat', targetCount: 1 },
        { item: 'saboteur', targetCount: 1 },
        { item: 'guard', targetCount: 3 },
      ];
  }
}

function isOpeningStepSatisfied(
  entities: GameEntity[],
  step: AiOpeningStep,
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): boolean {
  const item = step.item;
  if (item === 'dock') {
    return entities.filter((entity) => entity.faction === 'enemy' && entity.kind === 'dock' && getDamageState(entity) !== 'destroyed').length >= step.targetCount;
  }
  if (item === 'barracks') {
    return entities.filter((entity) => entity.faction === 'enemy' && entity.kind === 'barracks' && getDamageState(entity) !== 'destroyed').length >= step.targetCount;
  }

  const activeCount = entities.filter((entity) => isEnemyOpeningAsset(entity, item, getDamageState)).length;
  const queuedCount = entities.reduce((total, entity) => {
    if (entity.faction !== 'enemy') return total;
    return total + (entity.economy?.productionQueue?.filter((queueItem) => queueItem.product === item).length ?? 0);
  }, 0);
  return activeCount + queuedCount >= step.targetCount;
}

function isEnemyOpeningAsset(
  entity: GameEntity,
  item: Exclude<AiOpeningItem, 'dock'>,
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): boolean {
  if (entity.faction !== 'enemy' || getDamageState(entity) === 'destroyed') {
    return false;
  }
  switch (item) {
    case 'attackBoat':
      return entity.kind === 'boat' && entity.economy?.combatRole === 'attack';
    case 'boat':
      return entity.kind === 'boat' && entity.economy?.combatRole !== 'attack';
    default:
      return entity.kind === item;
  }
}

function describeAiStrategy(strategy: AiStrategy): string {
  switch (strategy) {
    case 'economicBoom':
      return 'economic boom';
    case 'harborPressure':
      return 'harbor pressure';
    case 'siege':
    default:
      return 'siege';
  }
}
