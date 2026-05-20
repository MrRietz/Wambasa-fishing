import { tickAiCoordinator, type AiControllerState } from '../../game/ai/aiCoordinator';
import { chooseAiRaidAttacker } from '../../game/ai/aiPressureSystem';
import {
  executeHarvestMetalCommand,
  executeProductionCommand,
  type MoveCommandSummary,
} from '../../game/commands/commandHandlers';
import { buildingCatalog, type BuildingPlanKind } from '../../game/data/buildings';
import type { ProductionKind } from '../../game/data/production';
import { productionCatalog } from '../../game/data/production';
import type { DamageState, GameEntity } from '../../game/entities/components';
import {
  chooseScoutTarget,
  chooseScoutUnit,
  ensureAiIntelState,
  getAiTacticLabel,
  mergeObservedPlayerState,
  scanPlayerIntel,
  updateAdaptiveTactic,
  updateScoutTimers,
} from '../../game/ai/aiIntelSystem';
import { updateProductionQueues } from '../../game/simulation/systems/productionSystem';
import type { FishingZoneState, ResourceField } from '../../game/map/mapTypes';
import type { RenderLayers } from '../../game/render/layers';

type PathPoint = { x: number; y: number };

export interface CreateAiRuntimeOptions {
  entities: GameEntity[];
  resourceFields: ResourceField[];
  fishingZoneStates: FishingZoneState[];
  aiController: AiControllerState;
  aiEconomyState: { metal: number; cash: number };
  mapDockPoint: () => { x: number; y: number } | undefined;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findTruckLandPath?: (truck: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findWaterPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  getResourceInteractionPoint: (field: ResourceField) => PathPoint;
  getDockUnloadPoint: (dock: GameEntity) => PathPoint;
  getFishingInteractionPoint: (zone: FishingZoneState) => PathPoint;
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
  findReachableRaidPlan: (attacker: GameEntity, priority?: Array<GameEntity['kind']>) => { target: GameEntity; targetPoint: PathPoint; path: PathPoint[] } | undefined;
  getAiRaidTargetPriority: () => Array<GameEntity['kind']>;
  getAiRaidSquad: (leadAttacker: GameEntity, target: GameEntity) => GameEntity[];
  getStaggeredRaidApproachPoint: (target: GameEntity, index: number, count: number) => PathPoint;
  describeAiRaidTactic: () => string;
}

export interface AiRuntime {
  updateAiRival: (deltaSeconds: number, layers: RenderLayers) => boolean;
}

export function createAiRuntime(options: CreateAiRuntimeOptions): AiRuntime {
  function getAiIntel() {
    options.aiController.intel = ensureAiIntelState(options.aiController.intel, options.aiController.strategy);
    options.aiController.activeTactic = options.aiController.intel.tactic;
    return options.aiController.intel;
  }

  function issueAiHarvestCommand(layers: RenderLayers): boolean {
    const truck = options.entities.find(
      (entity) =>
        entity.kind === 'truck' &&
        entity.faction === 'enemy' &&
        entity.economy?.cargo &&
        entity.movement.state === 'idle' &&
        options.getDamageState(entity) !== 'destroyed',
    );
    const field = options.resourceFields.find((candidate) => candidate.id === 'enemy-metal');
    if (
      !truck ||
      !field ||
      truck.kind !== 'truck' ||
      truck.faction !== 'enemy' ||
      !truck.economy?.cargo ||
      truck.movement.state !== 'idle' ||
      truck.economy.harvesting ||
      field.amount <= 0
    ) {
      return false;
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
      options.aiController.lastAction = 'Rival harvest blocked: no route to enemy metal.';
      return false;
    }

    if (output.moveCommand) {
      options.setLastMoveCommand(output.moveCommand);
    }
    options.aiController.harvestIssued = true;
    options.aiController.lastAction = 'Rival harvest command queued.';
    options.drawDestinationOverlay(layers);
    return true;
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
    options.publishDebugState(layers);
    return true;
  }

  function assignAiFactoryCrew(layers: RenderLayers): boolean {
    const factory = options.entities.find(
      (entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy' && options.getDamageState(entity) !== 'destroyed' && entity.economy?.reelWorkshop,
    );
    if (!factory) {
      return false;
    }

    const assignedCount = options.entities.filter(
      (entity) => entity.kind === 'worker' && entity.faction === 'enemy' && entity.economy?.factoryDuty?.factoryId === factory.id,
    ).length;
    if (assignedCount >= 2) {
      return false;
    }

    const availableWorkers = options.entities.filter(
      (entity) =>
        entity.kind === 'worker' &&
        entity.faction === 'enemy' &&
        entity.movement.state === 'idle' &&
        !entity.renderable.hidden &&
        !entity.economy?.factoryDuty &&
        !entity.economy?.attack &&
        options.getDamageState(entity) !== 'destroyed',
    );
    const worker = availableWorkers.length > 3 ? availableWorkers[0] : undefined;
    if (!worker) {
      return false;
    }

    worker.path = [];
    worker.moveTarget = undefined;
    worker.movement.state = 'idle';
    worker.commandable = false;
    worker.renderable = { ...worker.renderable, hidden: true };
    worker.economy = { ...worker.economy, factoryDuty: { factoryId: factory.id, phase: 'producing' } };
    options.aiController.lastAction = 'Rival assigned a worker to auto-sell reel production.';
    options.renderUnits(layers);
    return true;
  }

  function findAiBuilder(): GameEntity | undefined {
    return options.entities.find(
      (entity) =>
        entity.kind === 'worker' &&
        entity.faction === 'enemy' &&
        entity.movement.state === 'idle' &&
        !entity.renderable.hidden &&
        !entity.economy?.buildJob &&
        !entity.economy?.factoryDuty &&
        !entity.economy?.attack &&
        options.getDamageState(entity) !== 'destroyed',
    );
  }

  function buildAiStructure(input: {
    building: 'dock' | 'barracks';
    id: string;
    x: number;
    y: number;
    onStarted: () => void;
    onIdConsumed: () => void;
    layers: RenderLayers;
  }): boolean {
    const existing = options.entities.some(
      (entity) =>
        entity.faction === 'enemy' &&
        entity.kind === input.building &&
        options.getDamageState(entity) !== 'destroyed',
    );
    if (existing) {
      return false;
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
    builder.path = route.path;
    builder.moveTarget = route.path[0];
    builder.movement.state = 'moving';
    builder.economy = {
      ...builder.economy,
      harvesting: undefined,
      shoreFishing: undefined,
      factoryDuty: undefined,
      attack: undefined,
      buildJob: { siteId: site.id, phase: 'to-site' },
    };
    options.entities.push(site);
    input.onIdConsumed();
    input.onStarted();
    options.aiController.lastAction = `Rival started ${definition.label.toLowerCase()} with ${builder.name}. Metal: ${options.aiEconomyState.metal}.`;
    options.renderBuildings(input.layers);
    options.renderUnits(input.layers);
    options.drawDestinationOverlay(input.layers);
    options.publishDebugState(input.layers);
    return true;
  }

  function findReachableConstructionRoute(builder: GameEntity, site: GameEntity): { workPoint: PathPoint; path: PathPoint[] } | null {
    const workPoints = options.getConstructionWorkPoints?.(site) ?? [options.getConstructionWorkPoint(site)];
    for (const workPoint of workPoints) {
      const path = options.findEntityLandPath?.(builder, { x: builder.x, y: builder.y }, workPoint)
        ?? options.findLandPath({ x: builder.x, y: builder.y }, workPoint);
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
    const factory = options.entities.find((entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy');
    if (!factory || options.getDamageState(factory) === 'destroyed') {
      return false;
    }

    const nextEnemyBarracksId = options.getNextEnemyBarracksId();
    return buildAiStructure({
      building: 'barracks',
      id: nextEnemyBarracksId === 1 ? 'enemy-barracks' : `enemy-barracks-${nextEnemyBarracksId}`,
      x: factory.x + 220,
      y: factory.y + 190,
      onStarted: () => {},
      onIdConsumed: () => options.setNextEnemyBarracksId(nextEnemyBarracksId + 1),
      layers,
    });
  }

  function updateAiProduction(deltaSeconds: number, layers: RenderLayers): boolean {
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

    const enemyFactory = options.entities.find((entity) => isUsableAiProducer(entity, 'enemyFactory'));
    const enemyBarracks = options.entities.find((entity) => isUsableAiProducer(entity, 'barracks'));
    const enemyDock = options.entities.find((entity) => isUsableAiProducer(entity, 'dock'));
    options.aiController.productionQueued = Boolean(enemyFactory?.economy?.productionQueue?.length);
    options.aiController.barracksProductionQueued = Boolean(enemyBarracks?.economy?.productionQueue?.length);
    options.aiController.boatProductionQueued = Boolean(enemyDock?.economy?.productionQueue?.length);

    if (result.changed) {
      options.renderUnits(layers);
      options.renderBuildings(layers);
      options.drawSelectionOverlay(layers);
      options.publishDebugState(layers);
    }

    return result.changed;
  }

  function updateAiFishing(layers: RenderLayers): boolean {
    const dock = options.entities.find(
      (entity) => entity.kind === 'dock' && entity.faction === 'enemy' && options.getDamageState(entity) !== 'destroyed',
    );
    if (!dock || options.getDamageState(dock) === 'destroyed') {
      return false;
    }

    const boats = options.entities.filter(
      (entity) =>
        entity.kind === 'boat' &&
        entity.faction === 'enemy' &&
        entity.id.startsWith('enemy-boat-') &&
        entity.movement.speed > 0 &&
        entity.movement.state === 'idle' &&
        options.getDamageState(entity) !== 'destroyed' &&
        Boolean(entity.economy?.cargo),
    );

    for (const boat of boats) {
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
        options.drawDestinationOverlay(layers);
        return true;
      }

      if (cargo.amount === 0 && !boat.economy?.fishing) {
        const zone = pickAiFishingZone();
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
        options.drawDestinationOverlay(layers);
        return true;
      }
    }

    return false;
  }

  function pickAiFishingZone(): FishingZoneState | undefined {
    const viableZones = options.fishingZoneStates.filter((zone) => zone.amount > 0 && zone.depletedCooldownSeconds <= 0);
    if (viableZones.length === 0) {
      return options.fishingZoneStates[0];
    }

    if (options.aiController.strategy === 'economicBoom') {
      return [...viableZones].sort((a, b) => (b.cashPerFish * b.amount) - (a.cashPerFish * a.amount))[0];
    }
    if (options.aiController.strategy === 'harborPressure') {
      return viableZones.find((zone) => zone.tier === 'contested') ?? [...viableZones].sort((a, b) => b.cashPerFish - a.cashPerFish)[0];
    }
    return viableZones.find((zone) => zone.id === 'herring-bank')
      ?? viableZones.find((zone) => zone.tier === 'safe')
      ?? viableZones[0];
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
    const dock = options.entities.find(
      (entity) =>
        entity.kind === 'dock' &&
        entity.faction === 'enemy' &&
        options.getDamageState(entity) !== 'destroyed' &&
        (!entity.economy?.construction || entity.economy.construction.complete),
    );
    if (!dock) {
      return false;
    }

    const boat = options.entities.find(
      (entity) =>
        entity.kind === 'boat' &&
        entity.faction === 'enemy' &&
        (entity.economy?.health ?? 0) > 0 &&
        (entity.economy?.health ?? 0) < options.getMaxHealth(entity) &&
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

  function issueAiRaidCommand(layers: RenderLayers): boolean {
    const leadAttacker = chooseAiRaidAttacker(options.entities, options.getDamageState);
    if (!leadAttacker) {
      return false;
    }

    const raidPlan = options.findReachableRaidPlan(leadAttacker, options.getAiRaidTargetPriority());
    if (!raidPlan) {
      options.aiController.lastAction = 'Rival raid blocked: no land route to exposed economy.';
      return false;
    }

    const squad = options.getAiRaidSquad(leadAttacker, raidPlan.target);
    if (squad.length === 0) {
      return false;
    }

    const { target } = raidPlan;
    let assignedAttackers = 0;
    for (const [index, attacker] of squad.entries()) {
      const targetPoint = options.getStaggeredRaidApproachPoint(target, index, squad.length);
      const path = options.findEntityLandPath?.(attacker, { x: attacker.x, y: attacker.y }, targetPoint)
        ?? options.findLandPath({ x: attacker.x, y: attacker.y }, targetPoint);
      if (path.length === 0) {
        continue;
      }
      attacker.path = path;
      attacker.moveTarget = path[0];
      attacker.movement.state = 'moving';
      attacker.economy = {
        ...attacker.economy,
        attack: {
          targetId: target.id,
          phase: 'to-target',
          damagePerSecond: attacker.kind === 'guard' ? 34 : 18,
          range: attacker.kind === 'guard' ? 90 : 72,
        },
      };
      assignedAttackers += 1;
    }
    if (assignedAttackers === 0) {
      options.aiController.lastAction = 'Rival raid blocked: no attackers could reach the target.';
      return false;
    }
    options.aiController.raidIssued = true;
    options.aiController.raidCount += 1;
    options.aiController.lastAction = `Rival ${options.describeAiRaidTactic()} raid warning: ${target.name} is exposed.`;
    options.aiController.lastRaidEvent = {
      kind: 'queued',
      attackerId: squad[0].id,
      targetId: target.id,
      targetHealth: target.economy?.health,
    };
    options.issuePlayerAssetWarning(target, 'incoming');
    options.drawDestinationOverlay(layers);
    return true;
  }

  function updateAiScouting(deltaSeconds: number, layers: RenderLayers): boolean {
    const intel = getAiIntel();
    updateScoutTimers(intel, deltaSeconds);

    let changed = false;
    const activeScout = intel.scout.scoutId
      ? options.entities.find((entity) => entity.id === intel.scout.scoutId && options.getDamageState(entity) !== 'destroyed')
      : undefined;
    if (activeScout) {
      const scan = scanPlayerIntel({
        entities: options.entities,
        scout: activeScout,
        deltaSeconds,
        getDamageState: options.getDamageState,
      });
      if (scan) {
        mergeObservedPlayerState(intel.observed, scan.observed);
        if (scan.report && intel.scout.reportCooldownSeconds <= 0) {
          intel.lastScoutReport = scan.report;
          intel.scout.reportCooldownSeconds = 18;
          options.announceAiScout(scan.report, { x: activeScout.x, y: activeScout.y });
          changed = true;
        }
        if (updateAdaptiveTactic({ intel, openingStrategy: options.aiController.strategy })) {
          options.aiController.activeTactic = intel.tactic;
          options.aiController.lastAction = `Rival switched to ${getAiTacticLabel(intel.tactic)} after scouting: ${intel.tacticReason}.`;
          changed = true;
        }
      }

      const target = intel.scout.targetId ? options.entities.find((entity) => entity.id === intel.scout.targetId) : undefined;
      const reachedTarget = target ? Math.hypot(activeScout.x - target.x, activeScout.y - target.y) <= 260 : activeScout.movement.state === 'idle';
      if (reachedTarget || activeScout.economy?.attack || activeScout.economy?.buildJob || activeScout.economy?.harvesting || activeScout.economy?.factoryDuty) {
        if (reachedTarget) {
          const home = options.entities.find((entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy' && options.getDamageState(entity) !== 'destroyed');
          if (home) {
            const returnPoint = { x: home.x - 140, y: home.y + 120 };
            const returnPath = options.findEntityLandPath?.(activeScout, { x: activeScout.x, y: activeScout.y }, returnPoint)
              ?? options.findLandPath({ x: activeScout.x, y: activeScout.y }, returnPoint);
            if (returnPath.length > 0) {
              activeScout.path = returnPath;
              activeScout.moveTarget = returnPath[0];
              activeScout.movement.state = 'moving';
            }
          }
        }
        intel.scout.scoutId = undefined;
        intel.scout.targetId = undefined;
        intel.scout.cooldownSeconds = Math.max(intel.scout.cooldownSeconds, 22);
        changed = true;
      }
      return changed;
    }

    if (intel.scout.cooldownSeconds > 0 || options.aiController.startDelaySeconds > 0 || !options.aiController.openingComplete) {
      return changed;
    }

    const scout = chooseScoutUnit(options.entities, options.getDamageState);
    const target = chooseScoutTarget(options.entities, options.getDamageState);
    if (!scout || !target) {
      intel.scout.cooldownSeconds = 8;
      return changed;
    }

    const scoutPoint = options.getStaggeredRaidApproachPoint(target, 0, 1);
    const path = options.findEntityLandPath?.(scout, { x: scout.x, y: scout.y }, scoutPoint)
      ?? options.findLandPath({ x: scout.x, y: scout.y }, scoutPoint);
    if (path.length === 0) {
      intel.scout.cooldownSeconds = 10;
      return changed;
    }

    scout.path = path;
    scout.moveTarget = path[0];
    scout.movement.state = 'moving';
    scout.economy = {
      ...scout.economy,
      attack: undefined,
      shoreFishing: undefined,
      factoryDuty: undefined,
    };
    intel.scout.scoutId = scout.id;
    intel.scout.targetId = target.id;
    intel.scout.cooldownSeconds = 34;
    options.aiController.lastAction = `Rival scout probing toward ${target.name}.`;
    options.renderUnits(layers);
    options.drawDestinationOverlay(layers);
    return true;
  }

  function updateAiRival(deltaSeconds: number, layers: RenderLayers): boolean {
    refreshStaleEconomyOrders();
    const scoutChanged = updateAiScouting(deltaSeconds, layers);
    const crewChanged = assignAiFactoryCrew(layers);
    let changed = tickAiCoordinator({
      deltaSeconds,
      state: options.aiController,
      entities: options.entities,
      availableMetal: options.aiEconomyState.metal,
      availableCash: options.aiEconomyState.cash,
      getDamageState: options.getDamageState,
      tryIssueHarvest: () => issueAiHarvestCommand(layers),
      queueProduction: (product) => queueAiProduction(product, layers),
      buildDock: () => buildAiDock(layers),
      buildBarracks: () => buildAiBarracks(layers),
      updateProduction: () => updateAiProduction(deltaSeconds, layers),
      updateFishing: () => updateAiFishing(layers),
      updateBoatRepair: () => updateAiBoatRepair(),
      respondToThreat: (threatId, attackedAssetId) => options.issueAiDefenseResponse(threatId, attackedAssetId, layers),
      issueRaid: () => issueAiRaidCommand(layers),
      updateRaid: () => options.updateAiRaidActive(deltaSeconds, layers),
    });
    changed = scoutChanged || crewChanged || changed;

    changed = options.updateEnemyAutoDefense(layers) || changed;

    if (changed) {
      options.publishDebugState(layers);
    }
    return changed;
  }

  function refreshStaleEconomyOrders(): void {
    const hasActiveHarvest = options.entities.some(
      (entity) =>
        entity.kind === 'truck' &&
        entity.faction === 'enemy' &&
        options.getDamageState(entity) !== 'destroyed' &&
        Boolean(entity.economy?.harvesting),
    );
    if (!hasActiveHarvest) {
      options.aiController.harvestIssued = false;
    }

    const hasActiveFishing = options.entities.some(
      (entity) =>
        entity.kind === 'boat' &&
        entity.faction === 'enemy' &&
        options.getDamageState(entity) !== 'destroyed' &&
        Boolean(entity.economy?.fishing || entity.economy?.unloadingFish),
    );
    if (!hasActiveFishing) {
      options.aiController.fishingIssued = false;
    }
  }

  return {
    updateAiRival,
  };
}
