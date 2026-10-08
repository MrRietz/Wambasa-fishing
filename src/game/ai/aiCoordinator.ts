import type { ProductionKind } from '../data/production';
import type { RtsDebugState } from '../debug/debugState';
import type { DamageState, GameEntity } from '../entities/components';
import { ensureAiBrainState, type AiBrainState } from './aiBrain';
import {
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  personalityForStrategy,
  type AiBuildItem,
  type AiDifficulty,
  type AiPersonality,
  type AiStrategy,
} from './aiConfig';
import { countAiOwnAssets, executeAiEconomyPlan } from './aiEconomyPlanner';
import type { AiIntelState, AiTactic } from './aiIntelSystem';
import { findAiTerritoryThreat } from './aiPressureSystem';

export type { AiStrategy } from './aiConfig';

export interface AiControllerState {
  strategy: AiStrategy;
  personality?: AiPersonality;
  difficulty?: AiDifficulty;
  activeTactic?: AiTactic;
  intel?: AiIntelState;
  brain?: AiBrainState;
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

/**
 * One AI decision pass ("think"). The runtime calls this at the difficulty think interval with the
 * accumulated delta; unit-level simulation (production timers, combat) runs every frame elsewhere.
 */
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
  buildGuardTower?: () => boolean;
  updateProduction: () => boolean;
  updateFishing: () => boolean;
  updateBoatRepair: () => boolean;
  respondToThreat: (threatId: string, attackedAssetId: string) => boolean;
  issueRaid: () => boolean;
  updateRaid: () => boolean;
  /** Extra desired totals from tactics/threats (e.g. more guards when attacked). */
  demand?: Partial<Record<AiBuildItem, number>>;
  /** Metal held back (e.g. for an emergency guard tower while the base is attacked). */
  reserveMetal?: number;
}

const OPENING_TIMEOUT_SECONDS = 110;
const ECONOMY_BLOCK_SKIP_SECONDS = 40;

export function getAiPersonality(state: AiControllerState): AiPersonality {
  return state.personality ?? personalityForStrategy(state.strategy);
}

export function tickAiCoordinator(input: AiCoordinatorInput): boolean {
  const state = input.state;
  let changed = false;
  state.tickCount = (state.tickCount ?? 0) + 1;
  state.lastTickDeltaSeconds = input.deltaSeconds;
  if (state.startDelaySeconds > 0) {
    state.startDelaySeconds = Math.max(0, state.startDelaySeconds - input.deltaSeconds);
    return false;
  }

  const personality = getAiPersonality(state);
  const difficultyId = state.difficulty ?? 'normal';
  const brain = ensureAiBrainState(state.brain, personality, difficultyId);
  state.brain = brain;
  brain.clock += input.deltaSeconds;
  const now = brain.clock;

  state.territoryAlertCooldownSeconds = Math.max(0, state.territoryAlertCooldownSeconds - input.deltaSeconds);

  // Every think: idle trucks go harvesting (each truck independently).
  changed = input.tryIssueHarvest() || changed;

  // Continuous economy plan.
  changed = runAiEconomy(input, brain, now) || changed;

  changed = input.updateProduction() || changed;
  changed = input.updateFishing() || changed;
  changed = input.updateBoatRepair() || changed;
  changed = updateAiTerritoryDefense(input) || changed;
  changed = updateAiRaid(input) || changed;
  return changed;
}

function runAiEconomy(input: AiCoordinatorInput, brain: AiBrainState, now: number): boolean {
  const state = input.state;
  const personality = AI_PERSONALITIES[getAiPersonality(state)];
  const difficulty = AI_DIFFICULTY[state.difficulty ?? 'normal'];
  const counts = countAiOwnAssets(input.entities, input.getDamageState);
  const producers = findProducers(input.entities, input.getDamageState);

  if (!state.openingComplete) {
    const openingSteps = personality.buildOrder.slice(0, 6);
    const satisfied = openingSteps.every((step) => counts[step.item] >= step.count);
    if (satisfied || now >= OPENING_TIMEOUT_SECONDS) {
      state.openingComplete = true;
      state.lastAction = `Rival ${personality.label.toLowerCase()} opening complete.`;
    }
  }

  const result = executeAiEconomyPlan({
    personality,
    difficulty,
    now,
    counts,
    demand: input.demand,
    skippedUntil: brain.economy.skippedUntil,
    metal: Math.max(0, input.availableMetal - (input.reserveMetal ?? 0)),
    cash: input.availableCash,
    maxActions: 3,
    canStart: (item) => {
      switch (item) {
        case 'worker':
        case 'truck':
          return hasQueueRoom(producers.factory, difficulty.maxQueuePerProducer);
        case 'guard':
        case 'saboteur':
          return hasQueueRoom(producers.barracks, difficulty.maxQueuePerProducer);
        case 'boat':
        case 'attackBoat':
          return hasQueueRoom(producers.dock, difficulty.maxQueuePerProducer);
        case 'dock':
        case 'barracks':
          return Boolean(producers.factory);
        case 'guardTower':
          return Boolean(input.buildGuardTower) && Boolean(producers.factory);
        default:
          return false;
      }
    },
    start: (item) => {
      switch (item) {
        case 'dock':
          return input.buildDock();
        case 'barracks':
          return input.buildBarracks();
        case 'guardTower':
          return input.buildGuardTower?.() ?? false;
        default:
          return input.queueProduction(item);
      }
    },
  });

  if (result.started.length > 0) {
    brain.economy.lastSpendAt = now;
  }
  // Stall watchdog: a step that keeps blocking spending without any income progress is skipped for a while.
  if (result.blockedItem && result.blockedItem === brain.economy.blockedItem) {
    const noIncome = input.availableMetal <= (brain.economy.blockedMetal ?? 0) + 20;
    if (now - brain.economy.blockedSince > ECONOMY_BLOCK_SKIP_SECONDS && result.started.length === 0 && noIncome) {
      brain.economy.skippedUntil[result.blockedItem] = now + 30;
      brain.stats.watchdogRecoveries += 1;
      brain.lastDecision = `Economy watchdog: skipping ${result.blockedItem} for 30s (blocked ${Math.round(now - brain.economy.blockedSince)}s).`;
      brain.economy.blockedItem = undefined;
      brain.economy.blockedSince = now;
    }
  } else {
    brain.economy.blockedItem = result.blockedItem;
    brain.economy.blockedSince = now;
    brain.economy.blockedMetal = input.availableMetal;
  }
  return result.started.length > 0;
}

interface AiProducers {
  factory?: GameEntity;
  barracks?: GameEntity;
  dock?: GameEntity;
}

function findProducers(entities: GameEntity[], getDamageState: (entity: GameEntity) => DamageState | undefined): AiProducers {
  const producers: AiProducers = {};
  for (const entity of entities) {
    if (entity.faction !== 'enemy' || getDamageState(entity) === 'destroyed') continue;
    if (entity.economy?.construction && !entity.economy.construction.complete) continue;
    if (entity.kind === 'enemyFactory' && !producers.factory) producers.factory = entity;
    if (entity.kind === 'barracks' && !producers.barracks) producers.barracks = entity;
    if (entity.kind === 'dock' && !producers.dock) producers.dock = entity;
  }
  return producers;
}

function hasQueueRoom(producer: GameEntity | undefined, maxQueue: number): boolean {
  if (!producer) return false;
  if ((producer.economy?.disabledSeconds ?? 0) > 0) return false;
  return (producer.economy?.productionQueue?.length ?? 0) < maxQueue;
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
