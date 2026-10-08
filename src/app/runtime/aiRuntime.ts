import { getAiPersonality, tickAiCoordinator, type AiControllerState } from '../../game/ai/aiCoordinator';
import { getAiRaidDamage, isAiLandMilitary, updateAiArmy, type AiArmyObjective } from '../../game/ai/aiArmy';
import {
  buildAiBrainDebugState,
  ensureAiBrainState,
  updateAiScoutRun,
  type AiBrainDebugState,
  type AiBrainState,
  type AiPointOfInterest,
} from '../../game/ai/aiBrain';
import { AI_DIFFICULTY, AI_MEMORY_TUNING, AI_PERSONALITIES, type AiBuildItem, type AiDifficulty } from '../../game/ai/aiConfig';
import { countAiOwnAssets } from '../../game/ai/aiEconomyPlanner';
import {
  describeObservedPlayer,
  ensureAiIntelState,
  getAiTacticLabel,
  updateAdaptiveTactic,
} from '../../game/ai/aiIntelSystem';
import {
  getSightingCombatValue,
  revealAttacker,
  summarizeAiMemory,
  updateAiPerception,
} from '../../game/ai/aiMemory';
import {
  executeHarvestMetalCommand,
  executeProductionCommand,
  type MoveCommandSummary,
} from '../../game/commands/commandHandlers';
import { buildingCatalog, type BuildingPlanKind } from '../../game/data/buildings';
import type { ProductionKind } from '../../game/data/production';
import { productionCatalog } from '../../game/data/production';
import type { DamageState, GameEntity } from '../../game/entities/components';
import { updateProductionQueues } from '../../game/simulation/systems/productionSystem';
import type { CoastalMapData, FishingZoneState, ResourceField } from '../../game/map/mapTypes';
import type { RenderLayers } from '../../game/render/layers';
import { getVisionRadius } from '../../game/visibility/fogOfWar';

type PathPoint = { x: number; y: number };

export interface CreateAiRuntimeOptions {
  entities: GameEntity[];
  resourceFields: ResourceField[];
  fishingZoneStates: FishingZoneState[];
  mapData: Pick<CoastalMapData, 'baseAreas' | 'dockPoints'>;
  aiController: AiControllerState;
  aiEconomyState: { metal: number; cash: number };
  getDifficulty: () => AiDifficulty;
  mapDockPoint: () => { x: number; y: number } | undefined;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findTruckLandPath?: (truck: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findWaterPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  isValidLandPoint: (x: number, y: number) => boolean;
  isValidWaterPoint: (x: number, y: number) => boolean;
  validateBuildingPlacement: (building: BuildingPlanKind, x: number, y: number) => boolean;
  getResourceInteractionPoint: (field: ResourceField) => PathPoint;
  getDockUnloadPoint: (dock: GameEntity) => PathPoint;
  getFishingInteractionPoint: (zone: FishingZoneState) => PathPoint;
  getAttackApproachPoint: (target: GameEntity, index: number, count: number) => PathPoint;
  spawnAiProducedUnit: (product: ProductionKind, producer: GameEntity) => GameEntity;
  createEnemyConstructionSite: (id: string, building: BuildingPlanKind, x: number, y: number, builderId: string) => GameEntity;
  getConstructionWorkPoint: (site: GameEntity) => PathPoint;
  getConstructionWorkPoints?: (site: GameEntity) => PathPoint[];
  getNextProductionId: () => number;
  setNextProductionId: (value: number) => void;
  getNextEnemyDockId: () => number;
  setNextEnemyDockId: (value: number) => void;
  getNextEnemyBarracksId: () => number;
  setNextEnemyBarracksId: (value: number) => void;
  getNextEnemyGuardTowerId: () => number;
  setNextEnemyGuardTowerId: (value: number) => void;
  setLastMoveCommand: (value: MoveCommandSummary | undefined) => void;
  renderBuildings: (layers: RenderLayers) => void;
  renderUnits: (layers: RenderLayers) => void;
  drawSelectionOverlay: (layers: RenderLayers) => void;
  drawDestinationOverlay: (layers: RenderLayers) => void;
  updateSelectionReadout: () => void;
  publishDebugState: (layers: RenderLayers) => void;
  issueAiDefenseResponse: (threatId: string, attackedAssetId: string, layers: RenderLayers) => boolean;
  updateAiRaidActive: (deltaSeconds: number, layers: RenderLayers) => boolean;
  updateEnemyAutoDefense: (layers: RenderLayers) => boolean;
  issuePlayerAssetWarning: (target: GameEntity, phase: 'incoming' | 'damaged' | 'destroyed') => void;
  announceAiScout: (message: string, focusWorld: PathPoint) => void;
}

export interface AiRuntime {
  updateAiRival: (deltaSeconds: number, layers: RenderLayers) => boolean;
  /** A player entity damaged a rival asset: the attacker's position becomes known. */
  reportRivalAttacked: (attackerId: string, targetId: string) => void;
  /** Fog-honest pursuit check for rival attackers (target visible to the rival or to the attacker itself). */
  canRivalPursue: (attacker: GameEntity, target: GameEntity) => boolean;
  /** True when the attacked rival asset is part of the home base (defense controller should respond). */
  shouldRivalDefend: (attackedAssetId: string) => boolean;
  getDebugInfo: () => AiBrainDebugState | undefined;
}

const STUCK_SECONDS = 7;
const STUCK_EPSILON = 10;
const FORWARD_RALLY_DISTANCE = 1900;

export function createAiRuntime(options: CreateAiRuntimeOptions): AiRuntime {
  const entityById = new Map<string, GameEntity>();
  const progressTrack = new Map<string, { x: number; y: number; stuckSeconds: number }>();
  const reservedIds = new Set<string>();
  const scratchSiteBuilders = new Set<string>();
  let pointsOfInterest: AiPointOfInterest[] | undefined;
  let rallyPoint: PathPoint | undefined;
  let workerParking: PathPoint | undefined;
  let lastScoutAnnounceAt = Number.NEGATIVE_INFINITY;
  const unreachableFieldUntil = new Map<string, number>();

  function getDifficultyId(): AiDifficulty {
    return options.getDifficulty();
  }

  function getBrain(): AiBrainState {
    const controller = options.aiController;
    controller.personality = getAiPersonality(controller);
    controller.brain = ensureAiBrainState(controller.brain, controller.personality, controller.difficulty ?? 'normal');
    return controller.brain;
  }

  function getIntel() {
    options.aiController.intel = ensureAiIntelState(options.aiController.intel, options.aiController.strategy);
    options.aiController.activeTactic = options.aiController.intel.tactic;
    return options.aiController.intel;
  }

  function indexEntities(): void {
    entityById.clear();
    for (const entity of options.entities) {
      entityById.set(entity.id, entity);
    }
  }

  function isAlive(entity: GameEntity): boolean {
    return options.getDamageState(entity) !== 'destroyed' && (entity.economy?.health ?? 1) > 0;
  }

  function getHome(): GameEntity | undefined {
    for (const entity of options.entities) {
      if (entity.kind === 'enemyFactory' && entity.faction === 'enemy' && isAlive(entity)) return entity;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------------------------
  // Movement helpers
  // ---------------------------------------------------------------------------------------------

  function findPathFor(unit: GameEntity, goal: PathPoint): PathPoint[] {
    return options.findEntityLandPath?.(unit, { x: unit.x, y: unit.y }, goal) ?? options.findLandPath({ x: unit.x, y: unit.y }, goal);
  }

  function moveLand(unit: GameEntity, point: PathPoint): boolean {
    const offsets = [0, 70, -70, 140];
    for (const offset of offsets) {
      const goal = { x: point.x + offset, y: point.y + (offset === 0 ? 0 : offset / 2) };
      if (!options.isValidLandPoint(goal.x, goal.y)) continue;
      const path = findPathFor(unit, goal);
      if (path.length > 0) {
        unit.path = path;
        unit.moveTarget = path[0];
        unit.movement.state = 'moving';
        progressTrack.delete(unit.id);
        return true;
      }
    }
    return false;
  }

  function moveWater(boat: GameEntity, point: PathPoint): boolean {
    const goal = options.isValidWaterPoint(point.x, point.y) ? point : waterPointNear(point);
    if (!goal) return false;
    const path = options.findWaterPath({ x: boat.x, y: boat.y }, goal);
    if (path.length === 0) return false;
    boat.path = path;
    boat.moveTarget = path[0];
    boat.movement.state = 'moving';
    boat.economy = { ...boat.economy, fishing: undefined, unloadingFish: undefined };
    progressTrack.delete(boat.id);
    return true;
  }

  function waterPointNear(point: PathPoint): PathPoint | undefined {
    if (options.isValidWaterPoint(point.x, point.y)) return { x: point.x, y: point.y };
    for (const radius of [90, 170, 250]) {
      for (let step = 0; step < 8; step += 1) {
        const angle = (step / 8) * Math.PI * 2 - Math.PI / 2;
        const x = point.x + Math.cos(angle) * radius;
        const y = point.y + Math.sin(angle) * radius;
        if (options.isValidWaterPoint(x, y)) return { x, y };
      }
    }
    return undefined;
  }

  function isLandReachable(point: PathPoint): boolean {
    for (let step = 0; step < 8; step += 1) {
      const angle = (step / 8) * Math.PI * 2;
      if (options.isValidLandPoint(point.x + Math.cos(angle) * 85, point.y + Math.sin(angle) * 85)) return true;
    }
    return false;
  }

  function setAttack(unit: GameEntity, targetId: string, phase: 'to-target' | 'attacking', leash?: { x: number; y: number; range: number }): void {
    const damage = getAiRaidDamage(unit);
    unit.economy = {
      ...unit.economy,
      harvesting: undefined,
      shoreFishing: undefined,
      fishing: undefined,
      attack: { targetId, phase, damagePerSecond: damage.damagePerSecond, range: damage.range, leash },
    };
  }

  /** Attack a target the rival currently sees. */
  function attackVisible(unit: GameEntity, target: GameEntity, leash?: { x: number; y: number; range: number }): boolean {
    if (unit.kind === 'boat') {
      const point = waterPointNear(target) ?? { x: target.x, y: target.y };
      const path = options.findWaterPath({ x: unit.x, y: unit.y }, point);
      unit.path = path;
      unit.moveTarget = path[0];
      unit.movement.state = path.length > 0 ? 'moving' : 'idle';
      setAttack(unit, target.id, path.length > 0 ? 'to-target' : 'attacking', leash);
      return true;
    }
    const approach = options.getAttackApproachPoint(target, 0, 1);
    const path = findPathFor(unit, approach);
    if (path.length === 0 && Math.hypot(unit.x - target.x, unit.y - target.y) > 200) {
      return false;
    }
    unit.path = path;
    unit.moveTarget = path[0];
    unit.movement.state = path.length > 0 ? 'moving' : 'idle';
    setAttack(unit, target.id, path.length > 0 ? 'to-target' : 'attacking', leash);
    progressTrack.delete(unit.id);
    return true;
  }

  /** Wave launch against a remembered target: march to the remembered spot with the attack order set. */
  function attackRemembered(unit: GameEntity, objective: AiArmyObjective): boolean {
    if (!moveLand(unit, objective)) return false;
    if (objective.targetId) setAttack(unit, objective.targetId, 'to-target');
    return true;
  }

  function canRivalPursue(attacker: GameEntity, target: GameEntity): boolean {
    const brain = options.aiController.brain;
    if (brain && brain.memory.visibleNow.includes(target.id)) return true;
    return Math.hypot(attacker.x - target.x, attacker.y - target.y) <= getVisionRadius(attacker);
  }

  // ---------------------------------------------------------------------------------------------
  // Economy actions
  // ---------------------------------------------------------------------------------------------

  function issueAiHarvestCommands(layers: RenderLayers): boolean {
    const home = getHome();
    let changed = false;
    for (const truck of options.entities) {
      if (
        truck.kind !== 'truck' ||
        truck.faction !== 'enemy' ||
        !truck.economy?.cargo ||
        truck.economy.harvesting ||
        truck.movement.state !== 'idle' ||
        reservedIds.has(truck.id) ||
        !isAlive(truck)
      ) {
        continue;
      }
      const field = chooseHarvestField(truck, home);
      if (!field) {
        options.aiController.lastAction = 'Rival harvest blocked: no safe metal field.';
        continue;
      }
      const output = executeHarvestMetalCommand({
        field,
        selectedUnits: [truck],
        findLandPath: options.findLandPath,
        findTruckLandPath: options.findTruckLandPath,
        getResourceInteractionPoint: (resourceField) => options.getResourceInteractionPoint(resourceField),
        faction: 'enemy',
        requireCommandable: false,
      });
      if (!output.result?.ok) {
        // Unreachable for haulers (lakes, blockers): avoid it for a while instead of retrying every think.
        unreachableFieldUntil.set(field.id, getBrain().clock + 90);
        continue;
      }
      if (output.moveCommand) {
        options.setLastMoveCommand(output.moveCommand);
      }
      options.aiController.harvestIssued = true;
      options.aiController.lastAction = `Rival hauler sent to ${field.id}.`;
      changed = true;
    }
    if (changed) options.drawDestinationOverlay(layers);
    return changed;
  }

  function chooseHarvestField(truck: GameEntity, home: GameEntity | undefined): ResourceField | undefined {
    const brain = getBrain();
    const origin = home ?? truck;
    let best: ResourceField | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const field of options.resourceFields) {
      if (field.amount <= 0) continue;
      if ((unreachableFieldUntil.get(field.id) ?? -1) > brain.clock) continue;
      const distance = Math.hypot(field.x - origin.x, field.y - origin.y);
      if (distance > 2600) continue;
      let assigned = 0;
      for (const other of options.entities) {
        if (other.faction === 'enemy' && other.kind === 'truck' && other.economy?.harvesting?.fieldId === field.id) assigned += 1;
      }
      // Remembered player military near the field makes it dangerous.
      let danger = 0;
      for (const sighting of brain.memory.sightings) {
        if (sighting.isBuilding && sighting.kind !== 'guardTower') continue;
        if (getSightingCombatValue(sighting) <= 0.5) continue;
        if (brain.clock - sighting.lastSeenAt > 30 && !sighting.isBuilding) continue;
        if (Math.hypot(sighting.x - field.x, sighting.y - field.y) < 520) danger += 1;
      }
      // Fields west of the cannery send haulers through the barracks/rally lane, where trucks would crush our own infantry.
      const lanePenalty = home && field.x < home.x - 300 ? 1600 : 0;
      const score = distance + assigned * 380 + danger * 2000 + lanePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = field;
      }
    }
    return best;
  }

  function queueAiProduction(product: ProductionKind, layers: RenderLayers): boolean {
    const producer =
      product === 'boat' || product === 'attackBoat'
        ? options.entities.find((entity) => isUsableAiProducer(entity, 'dock'))
        : product === 'guard' || product === 'saboteur'
          ? options.entities.find((entity) => isUsableAiProducer(entity, 'barracks'))
          : options.entities.find((entity) => isUsableAiProducer(entity, 'enemyFactory'));

    const output = executeProductionCommand({
      producer: producer ?? null,
      product,
      stockpile: options.aiEconomyState,
      nextProductionId: options.getNextProductionId(),
      missingProducerMessage: 'Rival producer unavailable.',
      idPrefix: 'ai-production',
    });
    if (!output.result.ok) {
      return false;
    }

    options.setNextProductionId(output.nextProductionId);
    if (product === 'boat' || product === 'attackBoat') {
      options.aiController.boatProductionQueued = true;
    } else if (product === 'guard' || product === 'saboteur') {
      options.aiController.barracksProductionQueued = true;
    } else {
      options.aiController.productionQueued = true;
    }
    options.aiController.lastAction = `Rival queued ${productionCatalog[product].label}.`;
    options.aiController.lastProductionEvent = { kind: 'queued', product, stockpile: options.aiEconomyState.metal };
    options.renderBuildings(layers);
    return true;
  }

  function assignAiFactoryCrew(layers: RenderLayers): boolean {
    const factory = getHome();
    if (!factory?.economy?.reelWorkshop) {
      return false;
    }
    const personality = AI_PERSONALITIES[getAiPersonality(options.aiController)];
    let crew = 0;
    let free = 0;
    let candidate: GameEntity | undefined;
    for (const entity of options.entities) {
      if (entity.kind !== 'worker' || entity.faction !== 'enemy' || !isAlive(entity)) continue;
      if (entity.economy?.factoryDuty?.factoryId === factory.id) {
        crew += 1;
        continue;
      }
      free += 1;
      if (
        !candidate &&
        entity.movement.state === 'idle' &&
        !entity.renderable.hidden &&
        !entity.economy?.buildJob &&
        !entity.economy?.attack &&
        !reservedIds.has(entity.id)
      ) {
        candidate = entity;
      }
    }
    if (crew >= personality.factoryCrew || free <= 2 || !candidate) {
      return false;
    }
    candidate.path = [];
    candidate.moveTarget = undefined;
    candidate.movement.state = 'idle';
    candidate.commandable = false;
    candidate.renderable = { ...candidate.renderable, hidden: true };
    candidate.economy = { ...candidate.economy, factoryDuty: { factoryId: factory.id, phase: 'producing' } };
    options.aiController.lastAction = 'Rival assigned a worker to auto-sell reel production.';
    options.renderUnits(layers);
    return true;
  }

  function findAiBuilder(): GameEntity | undefined {
    for (const entity of options.entities) {
      if (
        entity.kind === 'worker' &&
        entity.faction === 'enemy' &&
        entity.movement.state === 'idle' &&
        !entity.renderable.hidden &&
        !entity.economy?.buildJob &&
        !entity.economy?.factoryDuty &&
        !entity.economy?.attack &&
        !reservedIds.has(entity.id) &&
        isAlive(entity)
      ) {
        return entity;
      }
    }
    return undefined;
  }

  function buildAiStructure(input: {
    building: 'dock' | 'barracks' | 'guardTower';
    id: string;
    x: number;
    y: number;
    onStarted: () => void;
    onIdConsumed: () => void;
    layers: RenderLayers;
  }): boolean {
    if (input.building !== 'guardTower') {
      const existing = options.entities.some(
        (entity) => entity.faction === 'enemy' && entity.kind === input.building && options.getDamageState(entity) !== 'destroyed',
      );
      if (existing) {
        return false;
      }
    }

    const definition = buildingCatalog[input.building];
    if (options.aiEconomyState.metal < definition.cost) {
      return false;
    }

    const builder = findAiBuilder();
    if (!builder) {
      options.aiController.lastAction = `Rival ${definition.label.toLowerCase()} blocked: no idle worker available.`;
      return false;
    }

    const site = options.createEnemyConstructionSite(input.id, input.building, input.x, input.y, builder.id);
    const route = findReachableConstructionRoute(builder, site);
    if (!route) {
      options.aiController.lastAction = `Rival ${definition.label.toLowerCase()} blocked: no land route reaches the construction site.`;
      return false;
    }

    options.aiEconomyState.metal -= definition.cost;
    assignBuilder(builder, site, route.path);
    options.entities.push(site);
    entityById.set(site.id, site);
    input.onIdConsumed();
    input.onStarted();
    options.aiController.lastAction = `Rival started ${definition.label.toLowerCase()} with ${builder.name}. Metal: ${options.aiEconomyState.metal}.`;
    options.renderBuildings(input.layers);
    options.renderUnits(input.layers);
    options.drawDestinationOverlay(input.layers);
    return true;
  }

  function assignBuilder(builder: GameEntity, site: GameEntity, path: PathPoint[]): void {
    builder.path = path;
    builder.moveTarget = path[0];
    builder.movement.state = 'moving';
    builder.economy = {
      ...builder.economy,
      harvesting: undefined,
      shoreFishing: undefined,
      factoryDuty: undefined,
      attack: undefined,
      buildJob: { siteId: site.id, phase: 'to-site' },
    };
    progressTrack.delete(builder.id);
  }

  function findReachableConstructionRoute(builder: GameEntity, site: GameEntity): { workPoint: PathPoint; path: PathPoint[] } | null {
    const workPoints = options.getConstructionWorkPoints?.(site) ?? [options.getConstructionWorkPoint(site)];
    for (const workPoint of workPoints) {
      const path = findPathFor(builder, workPoint);
      if (path.length > 0) {
        return { workPoint, path };
      }
    }
    return null;
  }

  function buildAiDock(layers: RenderLayers): boolean {
    const dockPoint = options.mapDockPoint();
    if (!dockPoint) {
      return false;
    }
    const nextEnemyDockId = options.getNextEnemyDockId();
    return buildAiStructure({
      building: 'dock',
      id: nextEnemyDockId === 1 ? 'enemy-dock' : `enemy-dock-${nextEnemyDockId}`,
      x: dockPoint.x,
      y: dockPoint.y,
      onStarted: () => {
        options.aiController.dockBuilt = true;
      },
      onIdConsumed: () => options.setNextEnemyDockId(nextEnemyDockId + 1),
      layers,
    });
  }

  function buildAiBarracks(layers: RenderLayers): boolean {
    const factory = getHome();
    if (!factory) {
      return false;
    }
    const nextEnemyBarracksId = options.getNextEnemyBarracksId();
    return buildAiStructure({
      building: 'barracks',
      id: nextEnemyBarracksId === 1 ? 'enemy-barracks' : `enemy-barracks-${nextEnemyBarracksId}`,
      x: factory.x - 260,
      y: factory.y + 190,
      onStarted: () => {},
      onIdConsumed: () => options.setNextEnemyBarracksId(nextEnemyBarracksId + 1),
      layers,
    });
  }

  function buildAiGuardTower(layers: RenderLayers): boolean {
    const factory = getHome();
    if (!factory) {
      return false;
    }
    // Towers face the player side (west) of the base and cover the harbor.
    const candidates: PathPoint[] = [
      { x: factory.x - 430, y: factory.y - 60 },
      { x: factory.x - 450, y: factory.y + 170 },
      { x: factory.x - 245, y: factory.y + 5 },
      { x: factory.x - 120, y: factory.y - 230 },
      { x: factory.x + 60, y: factory.y + 260 },
      { x: factory.x - 600, y: factory.y + 40 },
    ];
    const towerCountNear = (point: PathPoint) =>
      options.entities.filter((entity) => entity.faction === 'enemy' && entity.kind === 'guardTower' && Math.hypot(entity.x - point.x, entity.y - point.y) < 160).length;
    const spot = candidates.find((point) => towerCountNear(point) === 0 && options.validateBuildingPlacement('guardTower', point.x, point.y));
    if (!spot) {
      return false;
    }
    const nextTowerId = options.getNextEnemyGuardTowerId();
    return buildAiStructure({
      building: 'guardTower',
      id: nextTowerId === 1 ? 'enemy-guard-tower' : `enemy-guard-tower-${nextTowerId}`,
      x: spot.x,
      y: spot.y,
      onStarted: () => {},
      onIdConsumed: () => options.setNextEnemyGuardTowerId(nextTowerId + 1),
      layers,
    });
  }

  function updateAiProduction(deltaSeconds: number, layers: RenderLayers): boolean {
    let hasQueue = false;
    for (const entity of options.entities) {
      if (entity.faction === 'enemy' && entity.economy?.productionQueue && entity.economy.productionQueue.length > 0) {
        hasQueue = true;
        break;
      }
    }
    if (!hasQueue) {
      return false;
    }
    const result = updateProductionQueues({
      producers: options.entities.filter((entity) => entity.faction === 'enemy' && entity.economy?.productionQueue),
      deltaSeconds,
      stockpileMetal: options.aiEconomyState.metal,
      isProducerBlocked: (producer) => options.getDamageState(producer) === 'destroyed' || (producer.economy?.disabledSeconds ?? 0) > 0,
      spawnProducedUnit: options.spawnAiProducedUnit,
    });

    for (const spawned of result.spawned) {
      options.aiController.lastAction = `Rival produced ${spawned.label}.`;
      options.aiController.lastProductionEvent = {
        kind: 'spawned',
        product: spawned.product,
        entityId: spawned.entityId,
        stockpile: spawned.stockpile,
      };
    }
    if (result.spawned.length > 0) {
      options.renderUnits(layers);
      options.renderBuildings(layers);
      options.drawSelectionOverlay(layers);
    }
    return result.spawned.length > 0;
  }

  function syncProducerFlags(): void {
    let factoryQueue = false;
    let barracksQueue = false;
    let dockQueue = false;
    for (const entity of options.entities) {
      if (entity.faction !== 'enemy' || !entity.economy?.productionQueue?.length) continue;
      if (entity.kind === 'enemyFactory') factoryQueue = true;
      if (entity.kind === 'barracks') barracksQueue = true;
      if (entity.kind === 'dock') dockQueue = true;
    }
    options.aiController.productionQueued = factoryQueue;
    options.aiController.barracksProductionQueued = barracksQueue;
    options.aiController.boatProductionQueued = dockQueue;
  }

  function updateAiFishing(layers: RenderLayers): boolean {
    let dock: GameEntity | undefined;
    for (const entity of options.entities) {
      if (entity.kind === 'dock' && entity.faction === 'enemy' && isAlive(entity) && (!entity.economy?.construction || entity.economy.construction.complete)) {
        dock = entity;
        break;
      }
    }
    if (!dock) {
      return false;
    }

    let changed = false;
    for (const boat of options.entities) {
      if (
        boat.kind !== 'boat' ||
        boat.faction !== 'enemy' ||
        boat.economy?.combatRole === 'attack' ||
        boat.movement.speed <= 0 ||
        boat.movement.state !== 'idle' ||
        !isAlive(boat) ||
        reservedIds.has(boat.id) ||
        boat.economy?.dockRepair
      ) {
        continue;
      }
      const cargo = boat.economy?.cargo;
      if (!cargo) {
        continue;
      }

      if (cargo.amount >= cargo.capacity && !boat.economy?.unloadingFish) {
        const target = options.getDockUnloadPoint(dock);
        const path = options.findWaterPath({ x: boat.x, y: boat.y }, target);
        if (path.length === 0) {
          continue;
        }
        boat.path = path;
        boat.moveTarget = path[0];
        boat.movement.state = 'moving';
        boat.economy = { ...boat.economy, fishing: undefined, unloadingFish: { targetId: dock.id, phase: 'to-dock' } };
        options.aiController.lastAction = 'Rival fishing boat returning to dock.';
        changed = true;
        continue;
      }

      if (!boat.economy?.fishing && !boat.economy?.unloadingFish) {
        const zone = pickAiFishingZone(dock);
        if (!zone) {
          continue;
        }
        const target = options.getFishingInteractionPoint(zone);
        const path = options.findWaterPath({ x: boat.x, y: boat.y }, target);
        if (path.length === 0) {
          continue;
        }
        boat.path = path;
        boat.moveTarget = path[0];
        boat.movement.state = 'moving';
        boat.economy = { ...boat.economy, unloadingFish: undefined, fishing: { zoneId: zone.id, phase: 'to-zone' } };
        options.aiController.fishingIssued = true;
        options.aiController.lastAction = 'Rival fishing command queued.';
        changed = true;
      }
    }
    if (changed) options.drawDestinationOverlay(layers);
    return changed;
  }

  function pickAiFishingZone(origin: { x: number; y: number }): FishingZoneState | undefined {
    const brain = getBrain();
    const personality = AI_PERSONALITIES[brain.personality];
    let best: FishingZoneState | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const zone of options.fishingZoneStates) {
      if (zone.amount <= 0 || zone.depletedCooldownSeconds > 0) continue;
      if (zone.x < origin.x - 1400) continue;
      const distance = Math.hypot(zone.x - origin.x, zone.y - origin.y);
      let danger = 0;
      for (const sighting of brain.memory.sightings) {
        if (sighting.kind === 'boat' && sighting.combatRole === 'attack' && brain.clock - sighting.lastSeenAt < 40 && Math.hypot(sighting.x - zone.x, sighting.y - zone.y) < 500) danger += 1;
      }
      const tierBonus = personality.navalRaids && zone.tier === 'contested' ? 60 : personality.style === 'assault' && zone.tier === 'safe' ? 40 : 0;
      const score = zone.cashPerFish * 120 + Math.min(zone.amount, 180) - distance / 8 + tierBonus - danger * 400;
      if (score > bestScore) {
        bestScore = score;
        best = zone;
      }
    }
    return best ?? options.fishingZoneStates[0];
  }

  function isUsableAiProducer(entity: GameEntity, kind: GameEntity['kind']): boolean {
    return (
      entity.kind === kind &&
      entity.faction === 'enemy' &&
      options.getDamageState(entity) !== 'destroyed' &&
      (!entity.economy?.construction || entity.economy.construction.complete)
    );
  }

  function updateAiBoatRepair(): boolean {
    const dock = options.entities.find((entity) => isUsableAiProducer(entity, 'dock'));
    if (!dock) {
      return false;
    }
    const boat = options.entities.find(
      (entity) =>
        entity.kind === 'boat' &&
        entity.faction === 'enemy' &&
        (entity.economy?.health ?? 0) > 0 &&
        (entity.economy?.health ?? 0) < options.getMaxHealth(entity) * 0.75 &&
        !entity.economy?.dockRepair &&
        !entity.economy?.fishing &&
        !entity.economy?.unloadingFish &&
        !entity.economy?.attack &&
        entity.movement.state === 'idle',
    );
    if (!boat) {
      return false;
    }
    const target = options.getDockUnloadPoint(dock);
    const path = options.findWaterPath({ x: boat.x, y: boat.y }, target);
    if (path.length === 0) {
      return false;
    }
    boat.path = path;
    boat.moveTarget = path[0];
    boat.movement.state = 'moving';
    boat.economy = {
      ...boat.economy,
      fishing: undefined,
      unloadingFish: undefined,
      attack: undefined,
      dockRepair: { dockId: dock.id, phase: 'to-dock', repairPerSecond: 28, cashPerSecond: 10 },
    };
    options.aiController.lastAction = `Rival sent ${boat.name} to Dock for repairs.`;
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // Perception, threat, tactic
  // ---------------------------------------------------------------------------------------------

  function updateHomeThreat(brain: AiBrainState, now: number): void {
    const threat = brain.threat;
    threat.ids.length = 0;
    threat.strength = 0;
    let sumX = 0;
    let sumY = 0;
    for (const sighting of brain.memory.sightings) {
      const visible = brain.memory.visibleNow.includes(sighting.id);
      const freshReveal = sighting.source === 'damage' && now - sighting.lastSeenAt < 4;
      if (!visible && !freshReveal) continue;
      if (sighting.isBuilding && sighting.kind !== 'guardTower') continue;
      if (!isNearRivalAssets(sighting.x, sighting.y)) continue;
      const value = sighting.kind === 'worker' || sighting.kind === 'truck' ? 0.15 : Math.max(0.3, getSightingCombatValue(sighting));
      threat.strength += value;
      threat.ids.push(sighting.id);
      sumX += sighting.x;
      sumY += sighting.y;
    }
    if (threat.ids.length > 0) {
      threat.x = sumX / threat.ids.length;
      threat.y = sumY / threat.ids.length;
      threat.lastSeenAt = now;
    }
  }

  /** Home = rival structures, plus haulers/workers working within the home area (not scouts far away). */
  function isNearRivalAssets(x: number, y: number): boolean {
    const radius = AI_MEMORY_TUNING.homeThreatRadius;
    const home = getHome();
    for (const entity of options.entities) {
      if (entity.faction !== 'enemy' || !isAlive(entity) || entity.renderable.hidden) continue;
      if (entity.renderable.layer === 'buildings') {
        if (Math.hypot(entity.x - x, entity.y - y) <= radius) return true;
        continue;
      }
      if (entity.kind !== 'worker' && entity.kind !== 'truck') continue;
      if (reservedIds.has(entity.id) || !home || Math.hypot(entity.x - home.x, entity.y - home.y) > 1700) continue;
      if (Math.hypot(entity.x - x, entity.y - y) <= 420) return true;
    }
    return false;
  }

  function shouldRivalDefend(attackedAssetId: string): boolean {
    const asset = entityById.get(attackedAssetId) ?? options.entities.find((entity) => entity.id === attackedAssetId);
    if (!asset) return false;
    if (reservedIds.has(asset.id)) return false;
    if (asset.renderable.layer === 'buildings') return true;
    const home = getHome();
    return Boolean(home) && Math.hypot(asset.x - (home?.x ?? 0), asset.y - (home?.y ?? 0)) <= 1700;
  }

  function buildDemand(brain: AiBrainState, counts: ReturnType<typeof countAiOwnAssets>): Partial<Record<AiBuildItem, number>> {
    // Insertion order is priority order for the planner.
    const demand: Partial<Record<AiBuildItem, number>> = {};
    const intel = getIntel();
    const personality = AI_PERSONALITIES[brain.personality];
    const difficulty = AI_DIFFICULTY[getDifficultyId()];
    // Once the base has been raided, every personality saves up for at least one tower (turtles for two).
    const recentlyRaided = brain.clock - brain.threat.lastSeenAt < 180;
    if (recentlyRaided && counts.guardTower === 0) {
      demand.guardTower = 1;
    } else if (brain.threat.strength >= 1 && (personality.id === 'turtleSiege' || brain.threat.strength >= 3)) {
      demand.guardTower = Math.min(3, counts.guardTower + 1);
    }
    if (brain.threat.strength >= 1) {
      demand.guard = Math.min(difficulty.armyCap, counts.guard + 2);
    }
    const observed = intel.observed;
    if (observed.attackBoats >= 2 && counts.dock > 0) {
      demand.attackBoat = Math.min(5, observed.attackBoats);
    }
    if ((observed.militaryScore ?? 0) > brain.lastArmyStrength + 2) {
      demand.guard = Math.min(difficulty.armyCap, Math.max(demand.guard ?? 0, Math.ceil(observed.militaryScore ?? 0) + 1));
    }
    return demand;
  }

  function getRally(home: GameEntity): PathPoint {
    if (rallyPoint) return rallyPoint;
    const personality = AI_PERSONALITIES[getBrain().personality];
    const preferred = personality.forwardRally
      ? { x: home.x - FORWARD_RALLY_DISTANCE, y: home.y + 180 }
      : { x: home.x - 420, y: home.y - 130 };
    for (const radius of [0, 120, 240, 360]) {
      for (let step = 0; step < 8; step += 1) {
        const angle = (step / 8) * Math.PI * 2;
        const x = preferred.x + Math.cos(angle) * radius;
        const y = preferred.y + Math.sin(angle) * radius;
        if (options.isValidLandPoint(x, y) && options.findLandPath({ x: home.x - 200, y: home.y + 140 }, { x, y }).length > 0) {
          rallyPoint = { x, y };
          return rallyPoint;
        }
      }
    }
    rallyPoint = { x: home.x - 420, y: home.y - 130 };
    return rallyPoint;
  }

  /** Idle workers wait north of the cannery, away from hauler lanes (trucks crush anyone they drive over). */
  function getWorkerParking(home: GameEntity): PathPoint {
    if (workerParking) return workerParking;
    const candidates = [
      { x: home.x - 60, y: home.y - 200 },
      { x: home.x + 120, y: home.y - 190 },
      { x: home.x - 240, y: home.y - 170 },
      { x: home.x + 230, y: home.y - 60 },
    ];
    workerParking = candidates.find((point) => options.isValidLandPoint(point.x, point.y)) ?? { x: home.x - 60, y: home.y - 200 };
    return workerParking;
  }

  function parkIdleWorkers(): boolean {
    const home = getHome();
    if (!home) return false;
    const parking = getWorkerParking(home);
    let changed = false;
    for (const worker of options.entities) {
      if (
        worker.kind !== 'worker' ||
        worker.faction !== 'enemy' ||
        worker.movement.state !== 'idle' ||
        worker.renderable.hidden ||
        worker.economy?.buildJob ||
        worker.economy?.factoryDuty ||
        worker.economy?.attack ||
        worker.economy?.repair ||
        reservedIds.has(worker.id) ||
        !isAlive(worker)
      ) {
        continue;
      }
      if (Math.hypot(worker.x - parking.x, worker.y - parking.y) <= 110) continue;
      if (Math.hypot(worker.x - home.x, worker.y - home.y) > 1400) continue;
      changed = moveLand(worker, spreadAround(parking, worker.id, 55)) || changed;
    }
    return changed;
  }

  function spreadAround(center: PathPoint, id: string, radius: number): PathPoint {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) | 0;
    const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  }

  function getPointsOfInterest(): AiPointOfInterest[] {
    if (pointsOfInterest) return pointsOfInterest;
    const pois: AiPointOfInterest[] = [];
    const home = getHome();
    const homeX = home?.x ?? 6000;
    for (const area of options.mapData.baseAreas) {
      if (area.owner === 'enemy') continue;
      pois.push({
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
        label: area.id,
        domain: 'land',
        priority: area.owner === 'player' ? 5 : 1.4,
      });
    }
    for (const field of options.resourceFields) {
      const distanceFromHome = Math.abs(field.x - homeX);
      if (distanceFromHome < 900) continue;
      pois.push({ x: field.x, y: field.y, label: field.id, domain: 'land', priority: field.x < homeX / 2 ? 3 : 1 });
    }
    for (const dockPoint of options.mapData.dockPoints) {
      if (Math.abs(dockPoint.x - homeX) < 900) continue;
      const water = waterPointNear({ x: dockPoint.x, y: dockPoint.y - 90 });
      if (water) pois.push({ x: water.x, y: water.y, label: `${dockPoint.id} waters`, domain: 'water', priority: 4 });
    }
    for (const zone of options.fishingZoneStates) {
      if (Math.abs(zone.x - homeX) < 700) continue;
      const point = waterPointNear(zone);
      if (point) pois.push({ x: point.x, y: point.y, label: zone.label ?? zone.id, domain: 'water', priority: zone.x < homeX / 2 ? 2 : 1 });
    }
    pointsOfInterest = pois;
    return pois;
  }

  function chooseLandScout(brain: AiBrainState): GameEntity | undefined {
    const personality = AI_PERSONALITIES[brain.personality];
    let workers = 0;
    let militaryCount = 0;
    let worker: GameEntity | undefined;
    let military: GameEntity | undefined;
    for (const entity of options.entities) {
      if (entity.faction !== 'enemy' || !isAlive(entity) || entity.renderable.hidden) continue;
      if (entity.kind === 'worker' && !entity.economy?.factoryDuty) {
        workers += 1;
        if (!worker && entity.movement.state === 'idle' && !entity.economy?.buildJob && !entity.economy?.attack) worker = entity;
      }
      if (isAiLandMilitary(entity)) militaryCount += 1;
      if (
        !military &&
        isAiLandMilitary(entity) &&
        !brain.army.squadIds.includes(entity.id) &&
        entity.movement.state === 'idle' &&
        !entity.economy?.attack
      ) {
        military = entity;
      }
    }
    const spareWorker = workers >= 3 ? worker : undefined;
    const spareMilitary = militaryCount >= 3 ? military : undefined;
    return personality.scoutWith === 'worker' ? spareWorker ?? spareMilitary : spareMilitary ?? spareWorker;
  }

  function chooseNavalScout(brain: AiBrainState): GameEntity | undefined {
    if (brain.army.fleetMode !== 'patrol') return undefined;
    for (const entity of options.entities) {
      if (entity.faction === 'enemy' && entity.kind === 'boat' && entity.economy?.combatRole === 'attack' && isAlive(entity) && !entity.economy?.attack && !entity.economy?.dockRepair) {
        return entity;
      }
    }
    return undefined;
  }

  function updateScouting(brain: AiBrainState, layers: RenderLayers): boolean {
    const home = getHome();
    if (!home) return false;
    const pois = getPointsOfInterest();
    const difficulty = AI_DIFFICULTY[getDifficultyId()];
    const intel = getIntel();
    const urgent = brain.memory.sightings.length === 0 || intel.tactic === 'scouting';
    const homePoint = { x: home.x - 220, y: home.y + 150 };
    let changed = false;
    const landEvent = updateAiScoutRun({
      run: brain.landScout,
      pois,
      poiScoutedAt: brain.poiScoutedAt,
      now: brain.clock,
      entityById,
      getDamageState: options.getDamageState,
      chooseUnit: () => chooseLandScout(brain),
      move: (unit, point) => {
        if (!moveLand(unit, point)) return false;
        unit.economy = { ...unit.economy, attack: undefined, shoreFishing: undefined };
        return true;
      },
      home: homePoint,
      interval: difficulty.scoutIntervalSeconds,
      urgent,
      maxLegs: 3,
    });
    if (landEvent) {
      changed = true;
      if (landEvent === 'sent') brain.stats.scoutsSent += 1;
      if (landEvent === 'lost') brain.stats.scoutsLost += 1;
      brain.lastDecision = `Land scout ${landEvent}.`;
      if (landEvent === 'sent') options.aiController.lastAction = 'Rival scout heading out to look for your base.';
    }
    const homeWater = waterPointNear({ x: home.x + 100, y: home.y - 420 }) ?? waterPointNear(options.mapDockPoint() ?? home);
    if (homeWater) {
      const navalEvent = updateAiScoutRun({
        run: brain.navalScout,
        pois,
        poiScoutedAt: brain.poiScoutedAt,
        now: brain.clock,
        entityById,
        getDamageState: options.getDamageState,
        chooseUnit: () => chooseNavalScout(brain),
        move: (unit, point) => moveWater(unit, point),
        home: homeWater,
        interval: difficulty.scoutIntervalSeconds * 1.3,
        urgent: false,
        maxLegs: 2,
      });
      if (navalEvent) {
        changed = true;
        if (navalEvent === 'sent') brain.stats.scoutsSent += 1;
        if (navalEvent === 'lost') brain.stats.scoutsLost += 1;
      }
    }
    if (changed) options.drawDestinationOverlay(layers);
    return changed;
  }

  function refreshReservedIds(brain: AiBrainState): void {
    reservedIds.clear();
    if (brain.landScout.unitId) reservedIds.add(brain.landScout.unitId);
    if (brain.navalScout.unitId) reservedIds.add(brain.navalScout.unitId);
  }

  // ---------------------------------------------------------------------------------------------
  // Watchdogs
  // ---------------------------------------------------------------------------------------------

  function updateStuckWatchdog(brain: AiBrainState, deltaSeconds: number): boolean {
    let changed = false;
    for (const entity of options.entities) {
      if (entity.faction !== 'enemy' || entity.movement.speed <= 0 || entity.renderable.hidden) continue;
      if (entity.movement.state !== 'moving' || !isAlive(entity)) {
        progressTrack.delete(entity.id);
        continue;
      }
      const track = progressTrack.get(entity.id);
      if (!track) {
        progressTrack.set(entity.id, { x: entity.x, y: entity.y, stuckSeconds: 0 });
        continue;
      }
      const moved = Math.hypot(entity.x - track.x, entity.y - track.y);
      track.x = entity.x;
      track.y = entity.y;
      track.stuckSeconds = moved < STUCK_EPSILON ? track.stuckSeconds + deltaSeconds : 0;
      if (track.stuckSeconds < STUCK_SECONDS) continue;
      // Recovery: drop the blocked route; the owning system (harvest, army, scout, builder) re-issues.
      progressTrack.delete(entity.id);
      entity.path = [];
      entity.moveTarget = undefined;
      entity.movement.state = 'idle';
      if (entity.economy?.harvesting) entity.economy = { ...entity.economy, harvesting: undefined };
      if (entity.economy?.attack) entity.economy = { ...entity.economy, attack: undefined };
      if (entity.economy?.buildJob?.phase === 'to-site') entity.economy = { ...entity.economy, buildJob: undefined };
      if (entity.economy?.fishing) entity.economy = { ...entity.economy, fishing: undefined };
      brain.stats.watchdogRecoveries += 1;
      brain.lastDecision = `Watchdog freed stuck ${entity.id}.`;
      changed = true;
    }
    return changed;
  }

  function updateConstructionWatchdog(brain: AiBrainState): boolean {
    scratchSiteBuilders.clear();
    for (const entity of options.entities) {
      if (entity.faction === 'enemy' && entity.kind === 'worker' && isAlive(entity) && entity.economy?.buildJob) {
        scratchSiteBuilders.add(entity.economy.buildJob.siteId);
      }
    }
    for (const site of options.entities) {
      const construction = site.economy?.construction;
      if (site.faction !== 'enemy' || !construction || construction.complete || !isAlive(site)) continue;
      if (scratchSiteBuilders.has(site.id)) continue;
      const builder = findAiBuilder();
      if (!builder) return false;
      const route = findReachableConstructionRoute(builder, site);
      if (!route) continue;
      assignBuilder(builder, site, route.path);
      brain.stats.watchdogRecoveries += 1;
      brain.lastDecision = `Watchdog reassigned ${builder.id} to orphaned ${site.id}.`;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------------------------
  // Think loop
  // ---------------------------------------------------------------------------------------------

  function think(deltaSeconds: number, layers: RenderLayers): boolean {
    const controller = options.aiController;
    controller.difficulty = getDifficultyId();
    indexEntities();
    const brain = getBrain();
    const intel = getIntel();

    if (controller.startDelaySeconds > 0) {
      // Time until the first wave is allowed keeps counting down through the start delay.
      controller.raidDelaySeconds = Math.max(0, brain.army.nextWaveAt - brain.clock) + controller.startDelaySeconds;
      return tickAiCoordinator({
        deltaSeconds,
        state: controller,
        entities: options.entities,
        availableMetal: options.aiEconomyState.metal,
        availableCash: options.aiEconomyState.cash,
        getDamageState: options.getDamageState,
        tryIssueHarvest: () => false,
        queueProduction: () => false,
        buildDock: () => false,
        buildBarracks: () => false,
        updateProduction: () => false,
        updateFishing: () => false,
        updateBoatRepair: () => false,
        respondToThreat: () => false,
        issueRaid: () => false,
        updateRaid: () => false,
      });
    }

    const now = brain.clock + deltaSeconds;
    refreshReservedIds(brain);

    // 1. Perception -> memory -> summary.
    const perception = updateAiPerception({
      entities: options.entities,
      memory: brain.memory,
      now,
      getDamageState: options.getDamageState,
      getMaxHealth: options.getMaxHealth,
    });
    intel.observed = summarizeAiMemory(brain.memory, now);
    let changed = false;
    if (perception.newSightings > 0 && now - lastScoutAnnounceAt > 18) {
      const scout = brain.landScout.unitId ? entityById.get(brain.landScout.unitId) : undefined;
      if (scout && brain.landScout.status === 'outbound') {
        intel.lastScoutReport = describeObservedPlayer(intel.observed);
        lastScoutAnnounceAt = now;
        options.announceAiScout(intel.lastScoutReport, { x: scout.x, y: scout.y });
        changed = true;
      }
    }

    // 2. Home threat + tactic.
    const hadThreat = brain.threat.strength > 0;
    updateHomeThreat(brain, now);
    intel.tacticCooldownSeconds = Math.max(0, intel.tacticCooldownSeconds - deltaSeconds);
    const threatChanged = hadThreat !== brain.threat.strength > 0;
    if (
      updateAdaptiveTactic({
        intel,
        openingStrategy: controller.strategy,
        force: threatChanged,
        context: {
          personality: AI_PERSONALITIES[brain.personality],
          ownArmyStrength: brain.lastArmyStrength,
          threatAtHome: brain.threat.strength,
          secondsSinceRepelled: now - brain.army.defendClearedAt,
          avoidBase: now < brain.army.avoidBaseUntil,
          desiredWaveSize: brain.lastDesiredWave,
        },
      })
    ) {
      controller.activeTactic = intel.tactic;
      controller.lastAction = `Rival switched to ${getAiTacticLabel(intel.tactic)}: ${intel.tacticReason}.`;
      brain.lastDecision = controller.lastAction;
      changed = true;
    }
    controller.activeTactic = intel.tactic;

    // 3. Economy + territory defense (coordinator advances brain.clock).
    const counts = countAiOwnAssets(options.entities, options.getDamageState);
    changed = tickAiCoordinator({
      deltaSeconds,
      state: controller,
      entities: options.entities,
      availableMetal: options.aiEconomyState.metal,
      availableCash: options.aiEconomyState.cash,
      getDamageState: options.getDamageState,
      tryIssueHarvest: () => issueAiHarvestCommands(layers),
      queueProduction: (product) => queueAiProduction(product, layers),
      buildDock: () => buildAiDock(layers),
      buildBarracks: () => buildAiBarracks(layers),
      buildGuardTower: () => buildAiGuardTower(layers),
      updateProduction: () => false,
      updateFishing: () => updateAiFishing(layers),
      updateBoatRepair: () => updateAiBoatRepair(),
      respondToThreat: (threatId, attackedAssetId) => options.issueAiDefenseResponse(threatId, attackedAssetId, layers),
      issueRaid: () => false,
      updateRaid: () => false,
      demand: buildDemand(brain, counts),
    }) || changed;
    syncProducerFlags();

    // 4. Army, fleet, scouting.
    const home = getHome();
    if (home) {
      refreshReservedIds(brain);
      const army = updateAiArmy({
        state: brain.army,
        memory: brain.memory,
        now: brain.clock,
        entities: options.entities,
        entityById,
        personality: AI_PERSONALITIES[brain.personality],
        difficulty: AI_DIFFICULTY[getDifficultyId()],
        tactic: intel.tactic,
        home,
        rally: getRally(home),
        homeThreat: brain.threat.strength > 0 ? brain.threat : undefined,
        reservedIds,
        getDamageState: options.getDamageState,
        getMaxHealth: options.getMaxHealth,
        moveLand,
        moveWater,
        waterPointNear,
        isLandReachable,
        attack: attackVisible,
        attackRemembered,
      });
      brain.lastArmyReady = army.readyCount;
      brain.lastArmyStrength = army.armyStrength;
      brain.lastDesiredWave = army.desiredWaveSize;
      for (const event of army.events) {
        controller.lastAction = event.message;
        brain.lastDecision = event.message;
        if (event.kind === 'waveLaunched') {
          brain.stats.waves += 1;
          controller.raidCount += 1;
          const target = event.targetId ? entityById.get(event.targetId) : undefined;
          if (event.attackerId && event.targetId) {
            controller.lastRaidEvent = { kind: 'queued', attackerId: event.attackerId, targetId: event.targetId };
          }
          if (target) options.issuePlayerAssetWarning(target, 'incoming');
        }
        if (event.kind === 'fleetRaid' && event.attackerId && event.targetId) {
          controller.lastRaidEvent = { kind: 'queued', attackerId: event.attackerId, targetId: event.targetId };
        }
        if (event.kind === 'retreat') brain.stats.retreats += 1;
      }
      controller.raidIssued = brain.army.mode === 'attack';
      controller.raidDelaySeconds = Math.max(0, brain.army.nextWaveAt - brain.clock);
      changed = army.changed || changed;
      changed = updateScouting(brain, layers) || changed;
    }

    // 5. Crew, watchdogs, local auto-defense.
    changed = assignAiFactoryCrew(layers) || changed;
    changed = parkIdleWorkers() || changed;
    changed = updateConstructionWatchdog(brain) || changed;
    changed = updateStuckWatchdog(brain, deltaSeconds) || changed;
    changed = options.updateEnemyAutoDefense(layers) || changed;

    if (changed) {
      options.renderUnits(layers);
    }
    return changed;
  }

  function updateAiRival(deltaSeconds: number, layers: RenderLayers): boolean {
    const controller = options.aiController;
    let changed = false;
    // Per-frame simulation for rival-owned timers and fights (only once the AI is awake).
    if (controller.startDelaySeconds <= 0) {
      changed = updateAiProduction(deltaSeconds, layers) || changed;
      changed = options.updateAiRaidActive(deltaSeconds, layers) || changed;
    }

    const brain = getBrain();
    brain.thinkAccumulator += deltaSeconds;
    const interval = AI_DIFFICULTY[getDifficultyId()].thinkIntervalSeconds;
    if (brain.thinkAccumulator >= interval || controller.tickCount === undefined) {
      const elapsed = brain.thinkAccumulator;
      brain.thinkAccumulator = 0;
      changed = think(elapsed, layers) || changed;
    }

    if (changed) {
      options.publishDebugState(layers);
    }
    return changed;
  }

  function reportRivalAttacked(attackerId: string, targetId: string): void {
    void targetId;
    const brain = options.aiController.brain;
    if (!brain) return;
    const attacker = options.entities.find((entity) => entity.id === attackerId);
    if (!attacker || attacker.faction !== 'player') return;
    revealAttacker(brain.memory, attacker, brain.clock, options.getMaxHealth);
    brain.stats.damageReveals += 1;
  }

  function getDebugInfo(): AiBrainDebugState | undefined {
    const brain = options.aiController.brain;
    if (!brain) return undefined;
    return buildAiBrainDebugState(brain, pointsOfInterest ?? [], options.aiController.difficulty);
  }

  return {
    updateAiRival,
    reportRivalAttacked,
    canRivalPursue,
    shouldRivalDefend,
    getDebugInfo,
  };
}
