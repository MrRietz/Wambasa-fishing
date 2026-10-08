import { buildingCatalog } from '../data/buildings';
import { productionCatalog } from '../data/production';
import type { DamageState, GameEntity } from '../entities/components';
import type { AiBuildItem, AiBuildStep, AiDifficultyProfile, AiPersonalityProfile } from './aiConfig';

/**
 * Continuous, non-blocking macro planner.
 *
 * The personality build order is re-read every think: the first unsatisfied steps are executed when
 * affordable. An unaffordable step reserves the resource it needs (lower steps that need the same
 * resource wait) but never blocks cheaper unrelated work. Impossible steps (no producer, no idle
 * builder, full queue) are skipped, and a step that blocks for too long is skipped temporarily so the
 * economy can never deadlock.
 */

export type AiOwnCounts = Record<AiBuildItem, number>;

export interface AiEconomyPlanInput {
  personality: AiPersonalityProfile;
  difficulty: AiDifficultyProfile;
  now: number;
  counts: AiOwnCounts;
  /** Extra desired totals from tactics/threats, e.g. { guard: 6 } when under attack. */
  demand?: Partial<Record<AiBuildItem, number>>;
  /** item -> AI time until which the item is skipped after a stall. */
  skippedUntil?: Partial<Record<AiBuildItem, number>>;
}

export interface AiEconomyExecuteInput extends AiEconomyPlanInput {
  metal: number;
  cash: number;
  canStart: (item: AiBuildItem) => boolean;
  start: (item: AiBuildItem) => boolean;
  maxActions?: number;
}

export interface AiEconomyExecuteOutput {
  started: AiBuildItem[];
  blockedItem?: AiBuildItem;
}

const STRUCTURES: ReadonlySet<AiBuildItem> = new Set<AiBuildItem>(['dock', 'barracks', 'guardTower']);

export function getAiBuildItemCost(item: AiBuildItem): { metal: number; cash: number } {
  if (item === 'dock' || item === 'barracks' || item === 'guardTower') {
    return { metal: buildingCatalog[item].cost, cash: 0 };
  }
  const definition = productionCatalog[item];
  return { metal: definition.cost, cash: definition.cashCost ?? 0 };
}

export function isAiStructureItem(item: AiBuildItem): boolean {
  return STRUCTURES.has(item);
}

/** Ordered list of still-unsatisfied build steps (critical recovery first, then demand, then the build order). */
export function planAiBuildSteps(input: AiEconomyPlanInput): AiBuildStep[] {
  const steps: AiBuildStep[] = [];
  const counts = input.counts;
  const push = (item: AiBuildItem, count: number) => {
    if (counts[item] >= count) return;
    const skipUntil = input.skippedUntil?.[item];
    if (skipUntil !== undefined && skipUntil > input.now) return;
    steps.push({ item, count });
  };

  // Critical economy recovery.
  push('truck', 1);
  push('worker', 2);

  // Threat / tactic demand.
  if (input.demand) {
    for (const item of Object.keys(input.demand) as AiBuildItem[]) {
      const desired = input.demand[item];
      if (desired !== undefined) push(item, desired);
    }
  }

  for (const step of input.personality.buildOrder) {
    if (step.after !== undefined && input.now < step.after) {
      continue;
    }
    let count = step.count;
    if (step.item === 'worker' && count >= 4) count = Math.max(2, count + input.difficulty.workerBonus);
    if (step.item === 'truck' && count >= 3) count = Math.max(1, count + input.difficulty.truckBonus);
    if (step.item === 'guard') count = Math.min(count, input.difficulty.armyCap);
    push(step.item, count);
  }

  // Never idle on resources: keep growing the army (and the fleet for naval personalities).
  push('guard', input.difficulty.armyCap);
  if (input.personality.navalRaids) push('attackBoat', 5);
  return steps;
}

export function executeAiEconomyPlan(input: AiEconomyExecuteInput): AiEconomyExecuteOutput {
  const steps = planAiBuildSteps(input);
  const started: AiBuildItem[] = [];
  const maxActions = input.maxActions ?? 3;
  let metal = input.metal;
  let cash = input.cash;
  let metalReserved = false;
  let cashReserved = false;
  let structureStarted = false;
  let blockedItem: AiBuildItem | undefined;
  const seen = new Set<AiBuildItem>();

  for (const step of steps) {
    if (started.length >= maxActions) break;
    if (seen.has(step.item)) continue;
    seen.add(step.item);
    const cost = getAiBuildItemCost(step.item);
    const structure = isAiStructureItem(step.item);
    if (structure && structureStarted) continue;
    if (!input.canStart(step.item)) continue;
    if ((cost.metal > 0 && metalReserved) || (cost.cash > 0 && cashReserved)) continue;
    if (metal < cost.metal || cash < cost.cash) {
      if (metal < cost.metal) metalReserved = true;
      if (cash < cost.cash) cashReserved = true;
      blockedItem ??= step.item;
      continue;
    }
    if (!input.start(step.item)) {
      continue;
    }
    metal -= cost.metal;
    cash -= cost.cash;
    started.push(step.item);
    if (structure) structureStarted = true;
  }
  return { started, blockedItem };
}

/** Counts rival assets per build item: alive units, queued production and structures incl. construction sites. */
export function countAiOwnAssets(
  entities: GameEntity[],
  getDamageState: (entity: GameEntity) => DamageState | undefined,
): AiOwnCounts {
  const counts: AiOwnCounts = { worker: 0, truck: 0, boat: 0, attackBoat: 0, guard: 0, saboteur: 0, dock: 0, barracks: 0, guardTower: 0 };
  for (const entity of entities) {
    if (entity.faction !== 'enemy' || getDamageState(entity) === 'destroyed') {
      continue;
    }
    switch (entity.kind) {
      case 'worker': counts.worker += 1; break;
      case 'truck': counts.truck += 1; break;
      case 'guard': counts.guard += 1; break;
      case 'saboteur': counts.saboteur += 1; break;
      case 'boat':
        if (entity.economy?.combatRole === 'attack') counts.attackBoat += 1;
        else counts.boat += 1;
        break;
      case 'dock': counts.dock += 1; break;
      case 'barracks': counts.barracks += 1; break;
      case 'guardTower': counts.guardTower += 1; break;
      default: break;
    }
    const queue = entity.economy?.productionQueue;
    if (queue) {
      for (const item of queue) {
        counts[item.product] += 1;
      }
    }
  }
  return counts;
}
