import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { clamp } from '../core/math';
import { buildingCatalog, type BuildingPlanKind } from '../data/buildings';
import { formatProductionCost, productionCatalog, type ProductionKind } from '../data/production';
import type { DamageState, EntityKind, GameEntity, ProductionQueueItem } from '../entities/components';
import { describePlacementReason, type BuildingPlacementPlan } from '../map/buildPlacement';
import type { FishingZoneData, ResourceField } from '../map/mapTypes';
import { planBoatDockAssignments, planBoatFishingAssignments, planTruckHarvestAssignments, planWorkerShoreFishingAssignments, type PathPoint } from '../simulation/resourceRouting';
import type { CommandResult } from './commandTypes';
import { validateProductionCommand } from './commandValidation';

export type { PathPoint } from '../simulation/resourceRouting';

export interface MetalStockpile {
  metal: number;
}

export interface EconomyStockpile extends MetalStockpile {
  cash: number;
}

export interface ProductionCommandInput {
  producer: GameEntity | null;
  product: ProductionKind;
  stockpile: EconomyStockpile;
  nextProductionId: number;
  missingProducerMessage: string;
  idPrefix?: string;
  crew?: { used: number; capacity: number; reserved?: number };
}

export interface ProductionCommandOutput {
  result: CommandResult;
  nextProductionId: number;
  queueItem?: ProductionQueueItem;
}

export function executeProductionCommand(input: ProductionCommandInput): ProductionCommandOutput {
  const definition = productionCatalog[input.product];
  const validationFailure = validateProductionCommand(
    input.producer,
    input.stockpile,
    definition,
    input.missingProducerMessage,
    input.crew,
  );

  if (validationFailure) {
    return {
      result: validationFailure,
      nextProductionId: input.nextProductionId,
    };
  }

  const producer = input.producer;
  if (!producer) {
    throw new Error('Production validation passed without a producer.');
  }

  input.stockpile.metal -= definition.cost;
  input.stockpile.cash -= definition.cashCost ?? 0;
  const queueItem: ProductionQueueItem = {
    id: `${input.idPrefix ?? 'production'}-${input.nextProductionId}`,
    product: input.product,
    remainingSeconds: definition.seconds,
    totalSeconds: definition.seconds,
    cost: definition.cost,
    cashCost: definition.cashCost,
  };
  producer.economy = {
    ...producer.economy,
    productionQueue: [...(producer.economy?.productionQueue ?? []), queueItem],
  };

  return {
    result: {
      ok: true,
      kind: 'produce',
      product: input.product,
      message: `${definition.label} queued for ${formatProductionCost(definition)}. Metal: ${input.stockpile.metal}. Cash: ${input.stockpile.cash}.`,
    },
    nextProductionId: input.nextProductionId + 1,
    queueItem,
  };
}

export interface MoveCommandSummary {
  x: number;
  y: number;
  entityIds: string[];
  pathLength: number;
}

export interface TargetCommandOutput {
  handled: boolean;
  result?: CommandResult;
  moveCommand?: MoveCommandSummary;
}

export interface MoveCommandInput {
  worldX: number;
  worldY: number;
  selectedUnits: GameEntity[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findWaterPath?: (start: PathPoint, goal: PathPoint) => PathPoint[];
  isValidLandDestination: (worldX: number, worldY: number) => boolean;
  isValidWaterDestination: (worldX: number, worldY: number) => boolean;
}

export interface HarvestMetalCommandInput {
  field: ResourceField;
  selectedUnits: GameEntity[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findTruckLandPath?: (truck: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  getResourceInteractionPoint: (field: ResourceField) => PathPoint;
  faction?: GameEntity['faction'];
  requireCommandable?: boolean;
}

export interface FishingCommandInput {
  zone: FishingZoneData;
  selectedUnits: GameEntity[];
  findWaterPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  getFishingInteractionPoint: (zone: FishingZoneData) => PathPoint;
}

export interface WorkerFishingCommandInput {
  zone: FishingZoneData;
  selectedUnits: GameEntity[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  getWorkerFishingPoint: (zone: FishingZoneData) => PathPoint;
}

export interface FactoryCrewCommandInput {
  factory: GameEntity | null;
  selectedUnits: GameEntity[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  getFactoryCrewPoint: (factory: GameEntity, worker: GameEntity, index: number, count: number) => PathPoint;
  currentAssignedCount?: number;
  maxAssignedCount?: number;
}

export interface FishUnloadCommandInput {
  dock: GameEntity;
  selectedUnits: GameEntity[];
  findWaterPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  getDockUnloadPoint: (dock: GameEntity) => PathPoint;
}

export interface MetalUnloadCommandInput {
  factory: GameEntity;
  selectedUnits: GameEntity[];
  findEntityLandPath: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  getMetalDropOffPoint: (truck: GameEntity) => PathPoint;
}

export interface WorkerFishUnloadCommandInput {
  bank: GameEntity;
  selectedUnits: GameEntity[];
  findEntityLandPath: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  getWorkerFishDropOffPoint: (bank: GameEntity, worker: GameEntity) => PathPoint;
}

export interface DockRepairCommandInput {
  dock: GameEntity;
  selectedUnits: GameEntity[];
  findWaterPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  getDockRepairPoint: (dock: GameEntity) => PathPoint;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
}

export interface PlacementCommandInput {
  building: BuildingPlanKind;
  x: number;
  y: number;
  builder: GameEntity | null;
  queueMode?: boolean;
  stockpile: MetalStockpile;
  nextBuildingSiteId: number;
  validatePlacement: (building: BuildingPlanKind, x: number, y: number) => { valid: boolean; reason: string; plan?: BuildingPlacementPlan };
  createConstructionSite: (id: string, building: BuildingPlanKind, x: number, y: number, builderId: string, plan?: BuildingPlacementPlan) => GameEntity;
  getConstructionWorkPoint: (site: GameEntity) => PathPoint;
  getConstructionWorkPoints?: (site: GameEntity) => PathPoint[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
}

export interface PlacementCommandOutput extends TargetCommandOutput {
  site?: GameEntity;
  nextBuildingSiteId: number;
}

export interface InstantBuildCommandInput {
  building: BuildingPlanKind;
  stockpile: MetalStockpile;
  createBuilding: () => GameEntity;
}

export interface InstantBuildCommandOutput {
  result: CommandResult;
  building?: GameEntity;
}

export interface AttackCommandInput {
  target: GameEntity;
  selectedUnits: GameEntity[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findWaterPath?: (start: PathPoint, goal: PathPoint) => PathPoint[];
  getApproachPoint: (target: GameEntity, index: number, count: number) => PathPoint;
}

export interface StopCommandInput {
  selectedUnits: GameEntity[];
}

export interface HoldCommandInput {
  selectedUnits: GameEntity[];
}

export interface AttackMoveCommandInput extends MoveCommandInput {}

export interface SabotageCommandInput extends AttackCommandInput {
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export interface RepairCommandInput extends AttackCommandInput {
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
}

const GUARD_ATTACK_DAMAGE_PER_SECOND = 48;
const GUARD_LAND_ATTACK_RANGE = 64;
const GUARD_BOAT_ATTACK_RANGE = 92;
const WORKER_MELEE_DAMAGE_PER_SECOND = 12;
const WORKER_MELEE_ATTACK_RANGE = 34;
const ATTACK_BOAT_DAMAGE_PER_SECOND = 34;
const ATTACK_BOAT_RANGE = 88;
const GUARD_ENGAGE_RANGE = 150;
const GUARD_DIRECT_ATTACK_LEASH_RANGE = 240;

function getStableSpreadOffset(entityId: string, spacing: number): { x: number; y: number } {
  const hash = Array.from(entityId).reduce((total, char) => total + char.charCodeAt(0), 0);
  const laneX = (hash % 3) - 1;
  const laneY = (Math.floor(hash / 3) % 3) - 1;
  return { x: laneX * spacing, y: laneY * spacing * 0.6 };
}

export function executeMoveCommand(input: MoveCommandInput): TargetCommandOutput {
  const selectedMovers = input.selectedUnits.filter((entity) => entity.commandable && entity.movement.speed > 0 && entity.faction === 'player');

  if (selectedMovers.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'no-selection', message: 'Select a worker, truck, or boat before issuing a move command.' },
    };
  }

  const selectedBoats = selectedMovers.filter((entity) => entity.kind === 'boat');
  const selectedLandUnits = selectedMovers.filter((entity) => entity.kind !== 'boat');
  if (selectedBoats.length > 0) {
    if (selectedLandUnits.length > 0) {
      return {
        handled: true,
        result: {
          ok: false,
          kind: 'move',
          reason: 'unsupported-target',
          message: 'Move rejected: boats and land units need separate commands.',
        },
      };
    }
    return executeBoatMoveCommand({
      selectedBoats,
      worldX: input.worldX,
      worldY: input.worldY,
      findWaterPath: input.findWaterPath,
      isValidWaterDestination: input.isValidWaterDestination,
    });
  }

  if (!input.isValidLandDestination(input.worldX, input.worldY)) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'invalid-destination', message: 'Move rejected: that destination is water or blocked terrain.' },
    };
  }

  const plannedMoves = planLandFormationMoves(selectedMovers, input.worldX, input.worldY, input.findLandPath, input.findEntityLandPath);
  if (!plannedMoves) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'unreachable', message: 'Move rejected: no land route reaches that destination.' },
    };
  }

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      shoreFishing: undefined,
      unloadingFish: entity.kind === 'worker' ? undefined : entity.economy?.unloadingFish,
      autoFishZoneId: entity.kind === 'worker' ? undefined : entity.economy?.autoFishZoneId,
      buildJob: undefined,
      buildQueue: entity.kind === 'worker' ? undefined : entity.economy?.buildQueue,
      guardOrder: undefined,
      attack: undefined,
    };
  });

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'move',
      message: `Move command queued for ${selectedMovers.length} unit${selectedMovers.length === 1 ? '' : 's'}.`,
      pathLength: longestPath,
    },
    moveCommand: {
      x: input.worldX,
      y: input.worldY,
      entityIds: selectedMovers.map((entity) => entity.id),
      pathLength: longestPath,
    },
  };
}

export function executeStopCommand(input: StopCommandInput): TargetCommandOutput {
  const units = input.selectedUnits.filter((entity) => entity.faction === 'player' && entity.commandable && entity.movement.speed > 0);
  if (units.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'stop', reason: 'no-selection', message: 'Select a unit before issuing Stop.' },
    };
  }

  for (const unit of units) {
    unit.path = [];
    unit.moveTarget = undefined;
    unit.movement.state = 'idle';
    unit.economy = {
      ...unit.economy,
      harvesting: undefined,
      fishing: undefined,
      shoreFishing: undefined,
      unloadingFish: undefined,
      dockRepair: undefined,
      autoFishZoneId: undefined,
      factoryDuty: undefined,
      attack: undefined,
      guardOrder: undefined,
      sabotage: undefined,
      repair: undefined,
      buildJob: undefined,
      buildQueue: unit.kind === 'worker' ? undefined : unit.economy?.buildQueue,
    };
  }

  return { handled: true, result: { ok: true, kind: 'stop', unitCount: units.length, message: `Stop command issued to ${units.length} unit${units.length === 1 ? '' : 's'}.` } };
}

export function executeHoldCommand(input: HoldCommandInput): TargetCommandOutput {
  const guards = input.selectedUnits.filter((entity) => isSelectedCommandableKind(entity, 'guard'));
  if (guards.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'hold', reason: 'no-combat-unit', message: 'Select a guard before issuing Hold Position.' },
    };
  }

  for (const guard of guards) {
    guard.path = [];
    guard.moveTarget = undefined;
    guard.movement.state = 'idle';
    guard.economy = {
      ...guard.economy,
      attack: undefined,
      guardOrder: { mode: 'hold', acquireRange: GUARD_ENGAGE_RANGE },
    };
  }

  return { handled: true, result: { ok: true, kind: 'hold', unitCount: guards.length, message: `Hold Position issued to ${guards.length} guard${guards.length === 1 ? '' : 's'}.` } };
}

export function executeAttackMoveCommand(input: AttackMoveCommandInput): TargetCommandOutput {
  const guards = input.selectedUnits.filter((entity) => isSelectedCommandableKind(entity, 'guard'));
  if (guards.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'attackMove', reason: 'no-combat-unit', message: 'Select a guard before issuing Attack-Move.' },
    };
  }

  if (!input.isValidLandDestination(input.worldX, input.worldY)) {
    return {
      handled: true,
      result: { ok: false, kind: 'attackMove', reason: 'invalid-destination', message: 'Attack-Move rejected: choose open land.' },
    };
  }

  const plannedMoves = planLandFormationMoves(guards, input.worldX, input.worldY, input.findLandPath, input.findEntityLandPath);
  if (!plannedMoves) {
    return {
      handled: true,
      result: { ok: false, kind: 'attackMove', reason: 'unreachable', message: 'Attack-Move rejected: no land route reaches that destination.' },
    };
  }

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  for (const { entity: guard, path, target } of plannedMoves) {
    guard.path = path;
    guard.moveTarget = path[0];
    guard.movement.state = 'moving';
    guard.economy = {
      ...guard.economy,
      attack: undefined,
      guardOrder: { mode: 'attackMove', destination: target, acquireRange: GUARD_ENGAGE_RANGE },
    };
  }

  return {
    handled: true,
    result: { ok: true, kind: 'attackMove', unitCount: guards.length, message: `Attack-Move queued for ${guards.length} guard${guards.length === 1 ? '' : 's'}.`, pathLength: longestPath },
    moveCommand: { x: input.worldX, y: input.worldY, entityIds: guards.map((guard) => guard.id), pathLength: longestPath },
  };
}

export function executeHarvestMetalCommand(input: HarvestMetalCommandInput): TargetCommandOutput {
  const faction = input.faction ?? 'player';
  const requireCommandable = input.requireCommandable ?? faction === 'player';
  const selectedTrucks = input.selectedUnits.filter(
    (entity) => entity.kind === 'truck' && entity.faction === faction && (!requireCommandable || entity.commandable) && Boolean(entity.economy?.cargo),
  );

  if (selectedTrucks.length === 0) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'harvestMetal',
        reason: 'wrong-unit',
        message: 'Select a metal hauler truck before harvesting metal.',
      },
    };
  }

  if (input.field.amount <= 0) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'harvestMetal',
        reason: 'unsupported-target',
        message: 'That metal field is depleted.',
      },
    };
  }

  const plannedMoves = planTruckHarvestAssignments(
    selectedTrucks,
    input.field,
    (truck, start, goal) => input.findTruckLandPath?.(truck, start, goal) ?? input.findLandPath(start, goal),
    input.getResourceInteractionPoint,
  );

  if (!plannedMoves) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'harvestMetal',
        reason: 'unreachable',
        message: 'Harvest rejected: no land route reaches that metal field.',
      },
    };
  }

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      harvesting: { fieldId: input.field.id, phase: 'to-field' },
    };
  });

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'harvestMetal',
      message: `Harvest command queued for ${selectedTrucks.length} truck${selectedTrucks.length === 1 ? '' : 's'}.`,
      pathLength: longestPath,
    },
    moveCommand: {
      x: plannedMoves[0].target.x,
      y: plannedMoves[0].target.y,
      entityIds: selectedTrucks.map((entity) => entity.id),
      pathLength: longestPath,
    },
  };
}

export function executeFishingCommand(input: FishingCommandInput): TargetCommandOutput {
  const selectedBoats = input.selectedUnits.filter(
    (entity) => entity.kind === 'boat' && entity.faction === 'player' && entity.commandable && Boolean(entity.economy?.cargo),
  );

  if (selectedBoats.length === 0) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'fish',
        reason: 'wrong-unit',
        message: 'Select a fishing boat before harvesting a fishing zone.',
      },
    };
  }

  if ('amount' in input.zone && typeof input.zone.amount === 'number' && input.zone.amount <= 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unsupported-target', message: 'That fishing zone is depleted.' },
    };
  }

  const plannedMoves = planBoatFishingAssignments(selectedBoats, input.zone, input.findWaterPath, input.getFishingInteractionPoint);
  if (!plannedMoves) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unreachable', message: 'Fishing command rejected: no water route reaches that fishing zone.' },
    };
  }

  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      fishing: { zoneId: input.zone.id, phase: 'to-zone' },
      unloadingFish: undefined,
      dockRepair: undefined,
      autoFishZoneId: input.zone.id,
    };
  });

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'fish',
      message: `Fishing command queued for ${selectedBoats.length} boat${selectedBoats.length === 1 ? '' : 's'}.`,
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
    moveCommand: {
      x: plannedMoves[0].target.x,
      y: plannedMoves[0].target.y,
      entityIds: selectedBoats.map((entity) => entity.id),
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
  };
}

export function executeWorkerFishingCommand(input: WorkerFishingCommandInput): TargetCommandOutput {
  const selectedWorkers = input.selectedUnits.filter(
    (entity) => entity.kind === 'worker' && entity.faction === 'player' && entity.commandable,
  );
  if (selectedWorkers.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'wrong-unit', message: 'Select a worker before issuing shoreline fishing.' },
    };
  }

  if (!input.zone.shoreAccess) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unsupported-target', message: 'Workers can only fish shoreline shoals.' },
    };
  }

  if ('amount' in input.zone && typeof input.zone.amount === 'number' && input.zone.amount <= 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unsupported-target', message: 'That shoreline shoal is depleted.' },
    };
  }

  const plannedMoves = planWorkerShoreFishingAssignments(
    selectedWorkers,
    input.zone,
    (worker, start, goal) => input.findEntityLandPath?.(worker, start, goal) ?? input.findLandPath(start, goal),
    input.getWorkerFishingPoint,
  );
  if (!plannedMoves) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unreachable', message: 'Shore fishing rejected: no shoreline route reaches that fishing zone.' },
    };
  }

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      factoryDuty: undefined,
      unloadingFish: undefined,
      autoFishZoneId: input.zone.id,
      shoreFishing: { zoneId: input.zone.id, phase: 'to-shore' },
    };
    entity.renderable = { ...entity.renderable, hidden: false };
    entity.selectable = true;
    entity.commandable = true;
  });

  return {
    handled: true,
    result: { ok: true, kind: 'fish', message: `Shore fishing queued for ${selectedWorkers.length} worker${selectedWorkers.length === 1 ? '' : 's'}.`, pathLength: longestPath },
    moveCommand: { x: plannedMoves[0].target.x, y: plannedMoves[0].target.y, entityIds: selectedWorkers.map((entity) => entity.id), pathLength: longestPath },
  };
}

export function executeFactoryCrewCommand(input: FactoryCrewCommandInput): TargetCommandOutput {
  const selectedWorkers = input.selectedUnits.filter(
    (entity) => entity.kind === 'worker' && entity.faction === 'player' && entity.commandable,
  );
  if (selectedWorkers.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'wrong-unit', message: 'Select at least one worker before assigning factory crew.' },
    };
  }
  const factory = input.factory;
  if (!factory || factory.kind !== 'factory' || factory.faction !== 'player') {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'not-factory-selected', message: 'Select the Factory Command Center before assigning crew.' },
    };
  }

  const currentAssignedCount = input.currentAssignedCount ?? 0;
  const maxAssignedCount = input.maxAssignedCount ?? Number.POSITIVE_INFINITY;
  const availableSlots = Math.max(0, maxAssignedCount - currentAssignedCount);
  if (availableSlots <= 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'unsupported-target', message: 'Factory crew rejected: the factory is already at the 10 worker cap.' },
    };
  }

  const workersToAssign = selectedWorkers.slice(0, availableSlots);
  if (workersToAssign.length < selectedWorkers.length) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'move',
        reason: 'unsupported-target',
        message: `Factory crew rejected: only ${availableSlots} more worker${availableSlots === 1 ? '' : 's'} can fit inside.`,
      },
    };
  }

  const plannedMoves = workersToAssign.map((entity, index) => {
    const target = input.getFactoryCrewPoint(factory, entity, currentAssignedCount + index, currentAssignedCount + workersToAssign.length);
    const path = input.findEntityLandPath?.(entity, { x: entity.x, y: entity.y }, target) ?? input.findLandPath({ x: entity.x, y: entity.y }, target);
    return { entity, path, target };
  });
  if (plannedMoves.some((move) => move.path.length === 0)) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'unreachable', message: 'Crew assignment rejected: a worker cannot reach the Factory Command Center.' },
    };
  }

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      shoreFishing: undefined,
      factoryDuty: { factoryId: factory.id, phase: 'to-factory' },
    };
  });

  return {
    handled: true,
    result: { ok: true, kind: 'move', message: `Factory crew assignment queued for ${workersToAssign.length} worker${workersToAssign.length === 1 ? '' : 's'}.`, pathLength: longestPath },
    moveCommand: { x: plannedMoves[0].target.x, y: plannedMoves[0].target.y, entityIds: workersToAssign.map((entity) => entity.id), pathLength: longestPath },
  };
}

export function executeFishUnloadCommand(input: FishUnloadCommandInput): TargetCommandOutput {
  if (input.dock.kind !== 'dock' || input.dock.faction !== 'player' || !input.dock.commandable) {
    return { handled: false };
  }

  const selectedBoats = input.selectedUnits.filter(
    (entity) => entity.kind === 'boat' && entity.faction === 'player' && entity.commandable && entity.economy?.cargo?.kind === 'fish',
  );

  if (selectedBoats.length === 0) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'fish',
        reason: 'wrong-unit',
        message: 'Select a fishing boat with fish cargo before unloading at a dock.',
      },
    };
  }

  const loadedBoats = selectedBoats.filter((entity) => (entity.economy?.cargo?.amount ?? 0) > 0);
  if (loadedBoats.length === 0) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'fish',
        reason: 'unsupported-target',
        message: 'That fishing boat has no fish to unload.',
      },
    };
  }

  const target = input.getDockUnloadPoint(input.dock);
  const plannedMoves = planBoatDockAssignments(loadedBoats, target, input.findWaterPath);
  if (!plannedMoves) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unreachable', message: 'Fish unload rejected: no water route reaches that dock.' },
    };
  }
  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      fishing: undefined,
      unloadingFish: { targetId: input.dock.id, phase: 'to-dock' },
      dockRepair: undefined,
    };
  });

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'fish',
      message: `Fish unload command queued for ${loadedBoats.length} boat${loadedBoats.length === 1 ? '' : 's'}.`,
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
    moveCommand: {
      x: plannedMoves[0].target.x,
      y: plannedMoves[0].target.y,
      entityIds: loadedBoats.map((entity) => entity.id),
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
  };
}

export function executeMetalUnloadCommand(input: MetalUnloadCommandInput): TargetCommandOutput {
  if ((input.factory.kind !== 'factory' && input.factory.kind !== 'enemyFactory') || input.factory.faction !== 'player' || !input.factory.commandable) {
    return { handled: false };
  }

  const selectedTrucks = input.selectedUnits.filter(
    (entity) => entity.kind === 'truck' && entity.faction === 'player' && entity.commandable && entity.economy?.cargo?.kind === 'metal',
  );
  if (selectedTrucks.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'metalUnload', reason: 'wrong-unit', message: 'Select a metal hauler with cargo before unloading at the Factory.' },
    };
  }

  const loadedTrucks = selectedTrucks.filter((entity) => (entity.economy?.cargo?.amount ?? 0) > 0);
  if (loadedTrucks.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'metalUnload', reason: 'unsupported-target', message: 'That metal hauler has no metal to unload.' },
    };
  }

  const plannedMoves = loadedTrucks.map((entity) => {
    const target = input.getMetalDropOffPoint(entity);
    const path = input.findEntityLandPath(entity, { x: entity.x, y: entity.y }, target);
    return { entity, path, target };
  });
  if (plannedMoves.some((move) => move.path.length === 0)) {
    return {
      handled: true,
      result: { ok: false, kind: 'metalUnload', reason: 'unreachable', message: 'Metal unload rejected: no land route reaches the Factory.' },
    };
  }

  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      harvesting: { fieldId: entity.economy?.harvesting?.fieldId, phase: 'manual-returning' },
    };
  });

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  return {
    handled: true,
    result: { ok: true, kind: 'metalUnload', message: `Metal unload command queued for ${loadedTrucks.length} truck${loadedTrucks.length === 1 ? '' : 's'}.`, pathLength: longestPath },
    moveCommand: { x: plannedMoves[0].target.x, y: plannedMoves[0].target.y, entityIds: loadedTrucks.map((entity) => entity.id), pathLength: longestPath },
  };
}

export function executeWorkerFishUnloadCommand(input: WorkerFishUnloadCommandInput): TargetCommandOutput {
  if (input.bank.faction !== 'player' || !input.bank.commandable || (input.bank.kind !== 'dock' && input.bank.kind !== 'factory')) {
    return { handled: false };
  }

  const selectedWorkers = input.selectedUnits.filter(
    (entity) => entity.kind === 'worker' && entity.faction === 'player' && entity.commandable && entity.economy?.cargo?.kind === 'fish',
  );
  if (selectedWorkers.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'wrong-unit', message: 'Select a worker carrying fish before unloading at a fish bank.' },
    };
  }

  const loadedWorkers = selectedWorkers.filter((entity) => (entity.economy?.cargo?.amount ?? 0) > 0);
  if (loadedWorkers.length === 0) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unsupported-target', message: 'That worker has no fish to unload.' },
    };
  }

  const plannedMoves = loadedWorkers.map((entity) => {
    const target = input.getWorkerFishDropOffPoint(input.bank, entity);
    const path = input.findEntityLandPath(entity, { x: entity.x, y: entity.y }, target);
    return { entity, path, target };
  });
  if (plannedMoves.some((move) => move.path.length === 0)) {
    return {
      handled: true,
      result: { ok: false, kind: 'fish', reason: 'unreachable', message: 'Fish unload rejected: no land route reaches that fish bank.' },
    };
  }

  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      shoreFishing: undefined,
      factoryDuty: undefined,
      unloadingFish: { targetId: input.bank.id, phase: input.bank.kind === 'dock' ? 'to-dock' : 'to-bank' },
    };
  });

  const longestPath = Math.max(...plannedMoves.map((move) => move.path.length));
  return {
    handled: true,
    result: { ok: true, kind: 'fish', message: `Fish unload command queued for ${loadedWorkers.length} worker${loadedWorkers.length === 1 ? '' : 's'}.`, pathLength: longestPath },
    moveCommand: { x: plannedMoves[0].target.x, y: plannedMoves[0].target.y, entityIds: loadedWorkers.map((entity) => entity.id), pathLength: longestPath },
  };
}

export function executeDockRepairCommand(input: DockRepairCommandInput): TargetCommandOutput {
  const selectedBoats = input.selectedUnits.filter(
    (entity) => entity.kind === 'boat' && entity.faction === 'player' && entity.commandable,
  );
  if (selectedBoats.length === 0) {
    return { handled: false };
  }

  const repairableBoats = selectedBoats.filter((entity) => {
    const health = entity.economy?.health;
    const cargoAmount = entity.economy?.cargo?.kind === 'fish' ? entity.economy.cargo.amount : 0;
    return (
      health !== undefined &&
      health < input.getMaxHealth(entity) &&
      input.getDamageState(entity) !== 'destroyed' &&
      cargoAmount <= 0
    );
  });

  if (repairableBoats.length === 0) {
    return { handled: false };
  }

  if (input.dock.kind !== 'dock' || input.dock.faction !== 'player' || !input.dock.commandable || input.getDamageState(input.dock) === 'destroyed') {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'repair',
        reason: 'unsupported-target',
        message: 'Dock repair unavailable: no functioning friendly Dock can receive that boat.',
      },
    };
  }

  const target = input.getDockRepairPoint(input.dock);
  const plannedMoves = planBoatDockAssignments(repairableBoats, target, input.findWaterPath);
  if (!plannedMoves) {
    return {
      handled: true,
      result: { ok: false, kind: 'repair', reason: 'unreachable', message: 'Dock repair rejected: no water route reaches that dock.' },
    };
  }
  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    entity.economy = {
      ...entity.economy,
      fishing: undefined,
      unloadingFish: undefined,
      attack: undefined,
      dockRepair: { dockId: input.dock.id, phase: 'to-dock', repairPerSecond: 28, cashPerSecond: 10 },
    };
  });

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'repair',
      targetId: input.dock.id,
      message: `Dock repair queued for ${repairableBoats.length} boat${repairableBoats.length === 1 ? '' : 's'}. Costs 10 cash/s while repairing.`,
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
    moveCommand: {
      x: plannedMoves[0].target.x,
      y: plannedMoves[0].target.y,
      entityIds: repairableBoats.map((entity) => entity.id),
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
  };
}

export function executePlacementCommand(input: PlacementCommandInput): PlacementCommandOutput {
  const validation = input.validatePlacement(input.building, input.x, input.y);
  if (!validation.valid) {
    return {
      handled: true,
      nextBuildingSiteId: input.nextBuildingSiteId,
      result: {
        ok: false,
        kind: 'placement',
        reason: 'invalid-placement',
        message: `Placement blocked: ${describePlacementReason(validation.reason)}.`,
      },
    };
  }

  if (!input.builder) {
    return {
      handled: true,
      nextBuildingSiteId: input.nextBuildingSiteId,
      result: {
        ok: false,
        kind: 'placement',
        reason: 'not-worker-selected',
        message: 'Select a worker before confirming construction.',
      },
    };
  }

  const definition = buildingCatalog[input.building];
  if (input.stockpile.metal < definition.cost) {
    return {
      handled: true,
      nextBuildingSiteId: input.nextBuildingSiteId,
      result: {
        ok: false,
        kind: 'placement',
        reason: 'unaffordable',
        message: `Need ${definition.cost} metal to build ${definition.label}.`,
      },
    };
  }

  const site = input.createConstructionSite(`${input.building}-site-${input.nextBuildingSiteId}`, input.building, input.x, input.y, input.builder.id, validation.plan);
  const constructionRoute = findReachableConstructionRoute(input.builder, site, input);
  if (!constructionRoute) {
    return {
      handled: true,
      nextBuildingSiteId: input.nextBuildingSiteId,
      result: {
        ok: false,
        kind: 'placement',
        reason: 'unreachable',
        message: 'Construction blocked: selected worker cannot reach the building site.',
      },
    };
  }

  input.stockpile.metal -= definition.cost;
  const currentBuildJob = input.builder.economy?.buildJob;
  const currentBuildQueue = [...(input.builder.economy?.buildQueue ?? [])];
  const queueMode = input.queueMode ?? false;
  if (queueMode && currentBuildJob) {
    input.builder.economy = {
      ...input.builder.economy,
      buildJob: currentBuildJob,
      buildQueue: [...currentBuildQueue, site.id],
    };
  } else {
    input.builder.path = constructionRoute.path;
    input.builder.moveTarget = constructionRoute.path[0];
    input.builder.movement.state = 'moving';
    input.builder.economy = {
      ...input.builder.economy,
      buildJob: { siteId: site.id, phase: 'to-site' },
      buildQueue: currentBuildQueue,
    };
  }

  return {
    handled: true,
    site,
    nextBuildingSiteId: input.nextBuildingSiteId + 1,
    result: {
      ok: true,
      kind: 'placement',
      building: input.building,
      message: queueMode && currentBuildJob
        ? `${definition.label} queued after current construction order.`
        : `${definition.label} started. ${input.builder.name} is moving to build.`,
    },
    moveCommand: queueMode && currentBuildJob ? undefined : { x: constructionRoute.workPoint.x, y: constructionRoute.workPoint.y, entityIds: [input.builder.id], pathLength: constructionRoute.path.length },
  };
}

function findReachableConstructionRoute(
  builder: GameEntity,
  site: GameEntity,
  input: Pick<PlacementCommandInput, 'getConstructionWorkPoint' | 'getConstructionWorkPoints' | 'findLandPath' | 'findEntityLandPath'>,
): { workPoint: PathPoint; path: PathPoint[] } | null {
  const workPoints = input.getConstructionWorkPoints?.(site) ?? [input.getConstructionWorkPoint(site)];
  for (const workPoint of workPoints) {
    const path = input.findEntityLandPath?.(builder, { x: builder.x, y: builder.y }, workPoint)
      ?? input.findLandPath({ x: builder.x, y: builder.y }, workPoint);
    if (path.length > 0) {
      return { workPoint, path };
    }
  }
  return null;
}

export function executeInstantBuildCommand(input: InstantBuildCommandInput): InstantBuildCommandOutput {
  const definition = buildingCatalog[input.building];
  if (input.stockpile.metal < definition.cost) {
    return {
      result: {
        ok: false,
        kind: 'placement',
        reason: 'unaffordable',
        message: `Need ${definition.cost} metal to build ${definition.label}.`,
      },
    };
  }

  input.stockpile.metal -= definition.cost;
  const building = input.createBuilding();
  return {
    building,
    result: {
      ok: true,
      kind: 'placement',
      building: input.building,
      message: `${definition.label} built. Metal: ${input.stockpile.metal}.`,
    },
  };
}

export function executeAttackCommand(input: AttackCommandInput): TargetCommandOutput {
  const targetHealth = input.target.economy?.health ?? 0;
  if (input.target.faction !== 'enemy' || targetHealth <= 0) {
    return { handled: false };
  }
  const landAttackers = input.selectedUnits.filter((entity) =>
    input.target.kind === 'boat' ? isSelectedCommandableKind(entity, 'guard') : isSelectedLandAttacker(entity),
  );
  const boats =
    input.target.kind === 'boat'
      ? input.selectedUnits.filter((entity) => isSelectedCommandableKind(entity, 'boat') && entity.economy?.combatRole === 'attack')
      : [];

  if (landAttackers.length === 0 && boats.length === 0) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'attack',
        reason: 'wrong-unit',
        message: input.target.kind === 'boat' ? 'Select a guard or attack boat before attacking enemy boats.' : 'Select a worker or guard before attacking enemy targets.',
      },
    };
  }

  const landOrders = landAttackers.map((attacker, index) => {
    const targetPoint = input.getApproachPoint(input.target, index, landAttackers.length);
    const path = input.findEntityLandPath?.(attacker, { x: attacker.x, y: attacker.y }, targetPoint) ?? input.findLandPath({ x: attacker.x, y: attacker.y }, targetPoint);
    return { attacker, path };
  });

  if (landAttackers.length > 0 && landOrders.some((order) => order.path.length === 0)) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'attack',
        reason: 'unreachable',
        message: 'Attack rejected: no land route reaches that enemy.',
      },
    };
  }

  const boatOrders = boats.map((boat, index) => {
    const targetPoint = {
      x: clamp(input.target.x + (index - (boats.length - 1) / 2) * 40, 60, WORLD_WIDTH - 60),
      y: clamp(input.target.y + (index % 2) * 12 - 6, 60, WORLD_HEIGHT - 60),
    };
    return {
      boat,
      path: input.findWaterPath ? input.findWaterPath({ x: boat.x, y: boat.y }, targetPoint) : [targetPoint],
    };
  });

  if (boats.length > 0 && boatOrders.some((order) => order.path.length === 0)) {
    return {
      handled: true,
      result: {
        ok: false,
        kind: 'attack',
        reason: 'unreachable',
        message: 'Attack rejected: no water route reaches that enemy boat.',
      },
    };
  }

  for (const { attacker, path } of landOrders) {
    const attackStats = getLandAttackStats(attacker, input.target);
    attacker.path = path;
    attacker.moveTarget = path[0];
    attacker.movement.state = 'moving';
    attacker.economy = {
      ...attacker.economy,
      guardOrder: undefined,
      shoreFishing: attacker.kind === 'worker' ? undefined : attacker.economy?.shoreFishing,
      unloadingFish: attacker.kind === 'worker' ? undefined : attacker.economy?.unloadingFish,
      autoFishZoneId: attacker.kind === 'worker' ? undefined : attacker.economy?.autoFishZoneId,
      buildJob: attacker.kind === 'worker' ? undefined : attacker.economy?.buildJob,
      buildQueue: attacker.kind === 'worker' ? undefined : attacker.economy?.buildQueue,
      repair: attacker.kind === 'worker' ? undefined : attacker.economy?.repair,
      attack: {
        targetId: input.target.id,
        phase: 'to-target',
        damagePerSecond: attackStats.damagePerSecond,
        range: attackStats.range,
        leash:
          attacker.kind === 'guard' && input.target.movement.speed > 0
            ? { x: input.target.x, y: input.target.y, range: GUARD_DIRECT_ATTACK_LEASH_RANGE }
            : undefined,
      },
    };
  }

  for (const { boat, path } of boatOrders) {
    boat.path = path;
    boat.moveTarget = path[0];
    boat.movement.state = 'moving';
    boat.economy = {
      ...boat.economy,
      fishing: undefined,
      unloadingFish: undefined,
      autoFishZoneId: undefined,
      attack: { targetId: input.target.id, phase: 'to-target', damagePerSecond: ATTACK_BOAT_DAMAGE_PER_SECOND, range: ATTACK_BOAT_RANGE },
    };
  }

  const totalAttackers = landAttackers.length + boats.length;
  const longestPath = Math.max(0, ...landOrders.map((order) => order.path.length), ...boatOrders.map((order) => order.path.length));
  const message = `Attack command queued for ${totalAttackers} unit${totalAttackers === 1 ? '' : 's'}.`;

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'attack',
      targetId: input.target.id,
      message,
      pathLength: longestPath,
    },
    moveCommand: {
      x: input.target.x,
      y: input.target.y,
      entityIds: [...landAttackers.map((attacker) => attacker.id), ...boats.map((boat) => boat.id)],
      pathLength: Math.max(longestPath, totalAttackers > 0 ? 1 : 0),
    },
  };
}

export function executeSabotageCommand(input: SabotageCommandInput): TargetCommandOutput {
  if (input.target.faction !== 'enemy' || input.target.renderable.layer !== 'buildings' || input.getDamageState(input.target) === 'destroyed') {
    return { handled: false };
  }

  return executeTargetUnitCommand({
    ...input,
    selectedUnits: input.selectedUnits.filter((entity) => isSelectedCommandableKind(entity, 'saboteur')),
    noUnitMode: 'unhandled',
    unreachableResult: {
      ok: false,
      kind: 'sabotage',
      reason: 'unreachable',
      message: 'Sabotage rejected: no land route reaches that building.',
    },
    applyUnitOrder: (saboteur, path) => {
      saboteur.path = path;
      saboteur.moveTarget = path[0];
      saboteur.movement.state = 'moving';
      saboteur.economy = {
        ...saboteur.economy,
        sabotage: { targetId: input.target.id, phase: 'to-target', disableSeconds: 6, range: 64 },
      };
    },
    successResult: (pathLength, units) => ({
      ok: true,
      kind: 'sabotage',
      targetId: input.target.id,
      message: `Sabotage command queued for ${units.length} saboteur${units.length === 1 ? '' : 's'}.`,
      pathLength,
    }),
  });
}

export function executeRepairCommand(input: RepairCommandInput): TargetCommandOutput {
  if (input.target.faction !== 'player' || input.getDamageState(input.target) === 'destroyed') {
    return { handled: false };
  }

  const health = input.target.economy?.health;
  if (health === undefined || health >= input.getMaxHealth(input.target)) {
    return { handled: false };
  }

  return executeTargetUnitCommand({
    ...input,
    selectedUnits: input.selectedUnits.filter((entity) => isSelectedCommandableKind(entity, 'worker')),
    noUnitMode: 'unhandled',
    unreachableResult: {
      ok: false,
      kind: 'repair',
      reason: 'unreachable',
      message: 'Repair rejected: no route reaches that target.',
    },
    applyUnitOrder: (worker, path) => {
      worker.path = path;
      worker.moveTarget = path[0];
      worker.movement.state = 'moving';
      worker.economy = {
        ...worker.economy,
        repair: { targetId: input.target.id, phase: 'to-target', repairPerSecond: 34, range: 52 },
      };
    },
    successResult: (pathLength, units) => ({
      ok: true,
      kind: 'repair',
      targetId: input.target.id,
      message: `Repair command queued for ${units.length} worker${units.length === 1 ? '' : 's'}.`,
      pathLength,
    }),
  });
}

interface TargetUnitCommandInput {
  target: GameEntity;
  selectedUnits: GameEntity[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  getApproachPoint: (target: GameEntity, index: number, count: number) => PathPoint;
  noUnitMode: 'failure' | 'unhandled';
  noUnitResult?: CommandResult;
  unreachableResult: CommandResult;
  applyUnitOrder: (unit: GameEntity, path: PathPoint[]) => void;
  successResult: (pathLength: number, units: GameEntity[]) => CommandResult;
}

function executeTargetUnitCommand(input: TargetUnitCommandInput): TargetCommandOutput {
  if (input.selectedUnits.length === 0) {
    if (input.noUnitMode === 'failure' && input.noUnitResult) {
      return { handled: true, result: input.noUnitResult };
    }
    return { handled: false };
  }

  const plannedOrders = input.selectedUnits.map((unit, index) => {
    const targetPoint = input.getApproachPoint(input.target, index, input.selectedUnits.length);
    const path = input.findEntityLandPath?.(unit, { x: unit.x, y: unit.y }, targetPoint) ?? input.findLandPath({ x: unit.x, y: unit.y }, targetPoint);
    return { unit, path };
  });

  if (plannedOrders.some((order) => order.path.length === 0)) {
    return { handled: true, result: input.unreachableResult };
  }

  const longestPath = Math.max(...plannedOrders.map((order) => order.path.length));
  plannedOrders.forEach(({ unit, path }) => input.applyUnitOrder(unit, path));

  return {
    handled: true,
    result: input.successResult(longestPath, input.selectedUnits),
    moveCommand: {
      x: input.target.x,
      y: input.target.y,
      entityIds: input.selectedUnits.map((unit) => unit.id),
      pathLength: longestPath,
    },
  };
}

function planLandFormationMoves(
  units: GameEntity[],
  worldX: number,
  worldY: number,
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[],
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[],
): Array<{ entity: GameEntity; path: PathPoint[]; target: PathPoint }> | null {
  const spacingOptions = units.length > 1 ? [34, 16, 0] : [0];
  for (const spacing of spacingOptions) {
    const plannedMoves = units.map((entity) => {
      const offset = getStableSpreadOffset(entity.id, spacing);
      const target = {
        x: worldX + offset.x,
        y: worldY + offset.y,
      };
      const path = findEntityLandPath?.(entity, { x: entity.x, y: entity.y }, target) ?? findLandPath({ x: entity.x, y: entity.y }, target);
      return { entity, path, target };
    });
    if (plannedMoves.every((move) => move.path.length > 0)) {
      return plannedMoves;
    }
  }
  return null;
}

function executeBoatMoveCommand(input: {
  selectedBoats: GameEntity[];
  worldX: number;
  worldY: number;
  findWaterPath?: (start: PathPoint, goal: PathPoint) => PathPoint[];
  isValidWaterDestination: (worldX: number, worldY: number) => boolean;
}): TargetCommandOutput {
  if (!input.isValidWaterDestination(input.worldX, input.worldY)) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'invalid-destination', message: 'Boat move rejected: choose open water.' },
    };
  }

  const plannedMoves = input.selectedBoats.map((entity, index) => {
    const spacing = input.selectedBoats.length > 1 ? 42 : 0;
    const target = {
      x: input.worldX + (index - (input.selectedBoats.length - 1) / 2) * spacing,
      y: clamp(input.worldY + (index % 2) * spacing * 0.35, 60, WORLD_HEIGHT - 60),
    };
    return { entity, path: input.findWaterPath ? input.findWaterPath({ x: entity.x, y: entity.y }, target) : [target] };
  });

  if (plannedMoves.some((move) => move.path.length === 0)) {
    return {
      handled: true,
      result: { ok: false, kind: 'move', reason: 'unreachable', message: 'Boat move rejected: no water route reaches that destination.' },
    };
  }

  plannedMoves.forEach(({ entity, path }) => {
    entity.path = path;
    entity.moveTarget = path[0];
    entity.movement.state = 'moving';
    if (entity.economy?.fishing || entity.economy?.unloadingFish || entity.economy?.dockRepair || entity.economy?.autoFishZoneId || entity.economy?.attack) {
      entity.economy = { ...entity.economy, fishing: undefined, unloadingFish: undefined, dockRepair: undefined, autoFishZoneId: undefined, attack: undefined };
    }
  });

  return {
    handled: true,
    result: {
      ok: true,
      kind: 'move',
      message: `Boat move command queued for ${input.selectedBoats.length} boat${input.selectedBoats.length === 1 ? '' : 's'}.`,
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
    moveCommand: {
      x: input.worldX,
      y: input.worldY,
      entityIds: input.selectedBoats.map((entity) => entity.id),
      pathLength: Math.max(...plannedMoves.map((move) => move.path.length)),
    },
  };
}

function isSelectedCommandableKind(entity: GameEntity, kind: EntityKind): boolean {
  return entity.kind === kind && entity.faction === 'player' && entity.commandable && entity.movement.speed > 0;
}

function isSelectedLandAttacker(entity: GameEntity): boolean {
  return (entity.kind === 'worker' || entity.kind === 'guard') && entity.faction === 'player' && entity.commandable && entity.movement.speed > 0;
}

function getLandAttackStats(attacker: GameEntity, target: GameEntity): { damagePerSecond: number; range: number } {
  if (attacker.kind === 'worker') {
    return { damagePerSecond: WORKER_MELEE_DAMAGE_PER_SECOND, range: WORKER_MELEE_ATTACK_RANGE };
  }
  return {
    damagePerSecond: GUARD_ATTACK_DAMAGE_PER_SECOND,
    range: target.kind === 'boat' ? GUARD_BOAT_ATTACK_RANGE : GUARD_LAND_ATTACK_RANGE,
  };
}
