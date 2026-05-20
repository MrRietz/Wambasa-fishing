import assert from 'node:assert/strict';
import {
  executeAttackCommand,
  executeAttackMoveCommand,
  executeHarvestMetalCommand,
  executeHoldCommand,
  executeMetalUnloadCommand,
  executeMoveCommand,
  executePlacementCommand,
  executeProductionCommand,
  executeSabotageCommand,
  executeStopCommand,
  executeWorkerFishUnloadCommand,
  type PathPoint,
} from '../../src/game/commands/commandHandlers';
import { tickAiCoordinator, type AiControllerState } from '../../src/game/ai/aiCoordinator';
import { updateAiDefenseResponse } from '../../src/game/ai/aiDefenseSystem';
import { createCombatRuntime } from '../../src/app/runtime/combatRuntime';
import { createAiIntelState, mergeObservedPlayerState, scanPlayerIntel, updateAdaptiveTactic } from '../../src/game/ai/aiIntelSystem';
import { chooseAiRaidAttacker, findAiTerritoryThreat } from '../../src/game/ai/aiPressureSystem';
import { buildingCatalog, type BuildingPlanKind } from '../../src/game/data/buildings';
import { productionCatalog } from '../../src/game/data/production';
import type { EntityKind, Faction, GameEntity } from '../../src/game/entities/components';
import { createAttackBoatEntity, createBoatEntity, createEnemyAttackBoatEntity, createEnemyBoatEntity } from '../../src/game/entities/entityFactory';
import { createSkirmishBootstrap } from '../../src/game/entities/skirmishSetup';
import { resolveAnimationAction } from '../../src/game/render/animationState';
import { updateAutoDefenseSystem, updateCombatAttackers } from '../../src/game/simulation/systems/combatSystem';
import { resolveMobileUnitOverlaps } from '../../src/game/simulation/systems/collisionSystem';
import { destroyAssignedFactoryCrew } from '../../src/game/simulation/systems/factoryCrewSystem';
import { resolveHarvestArrival } from '../../src/game/simulation/systems/harvestSystem';
import { updateWorkerFishingSystem } from '../../src/game/simulation/systems/workerFishingSystem';
import { evaluateWinCondition } from '../../src/game/simulation/systems/winConditionSystem';

type TestCase = { name: string; run: () => void };

const tests: TestCase[] = [
  {
    name: 'worker moving to construction site uses move animation until building starts',
    run: () => {
      const worker = makeEntity({
        id: 'worker-1',
        kind: 'worker',
        economy: { buildJob: { siteId: 'house-site-1', phase: 'to-site' } },
      });
      worker.movement.state = 'moving';
      worker.moveTarget = { x: 180, y: 100 };
      worker.path = [{ x: 180, y: 100 }];

      assert.equal(resolveAnimationAction(worker, () => 'healthy'), 'move');
    },
  },
  {
    name: 'idle worker with stale construction travel job does not play build animation',
    run: () => {
      const worker = makeEntity({
        id: 'worker-1',
        kind: 'worker',
        economy: { buildJob: { siteId: 'house-site-1', phase: 'to-site' } },
      });

      assert.equal(resolveAnimationAction(worker, () => 'healthy'), 'idle');
    },
  },
  {
    name: 'worker actively constructing uses build animation',
    run: () => {
      const worker = makeEntity({
        id: 'worker-1',
        kind: 'worker',
        economy: { buildJob: { siteId: 'house-site-1', phase: 'building' } },
      });
      worker.movement.state = 'building';

      assert.equal(resolveAnimationAction(worker, () => 'healthy'), 'build');
    },
  },
  {
    name: 'worker shoreline fishing seeds cooldown and waits before loading fish',
    run: () => {
      const worker = makeEntity({
        id: 'worker-1',
        kind: 'worker',
        economy: {
          cargo: { kind: 'fish', amount: 0, capacity: 30 },
          shoreFishing: { zoneId: 'cod-bank', phase: 'fishing' },
        },
      });
      const zone = makeFishingZone({ id: 'cod-bank', amount: 20 });

      const seeded = updateWorkerFishingSystem({
        workers: [worker],
        zones: [zone],
        deltaSeconds: 0.5,
        baseCatchDelaySeconds: { min: 1.5, max: 1.5 },
        baseCatchChance: 1,
        baseCatchAmount: { min: 2, max: 2 },
        random: () => 0,
      });

      assert.equal(seeded.events.length, 0);
      assert.equal(worker.economy?.cargo?.amount, 0);
      assert.equal(worker.economy?.shoreFishing?.catchCooldownSeconds, 1);

      const caught = updateWorkerFishingSystem({
        workers: [worker],
        zones: [zone],
        deltaSeconds: 1.1,
        baseCatchDelaySeconds: { min: 1.5, max: 1.5 },
        baseCatchChance: 1,
        baseCatchAmount: { min: 2, max: 2 },
        random: () => 0,
      });

      assert.deepEqual(caught.events[0], {
        kind: 'fishLoaded',
        entityId: 'worker-1',
        amount: 2,
        cargoAmount: 2,
        message: 'worker-1 caught 2 fish from Sunlit Cod Bank.',
      });
      assert.equal(worker.economy?.cargo?.amount, 2);
      assert.equal(zone.amount, 18);
      assert.equal(worker.economy?.shoreFishing?.catchCooldownSeconds, 1.5);
    },
  },
  {
    name: 'worker shoreline fishing misses without loading fish and reel cadence is faster',
    run: () => {
      const plainWorker = makeEntity({
        id: 'worker-plain',
        kind: 'worker',
        economy: {
          cargo: { kind: 'fish', amount: 0, capacity: 30 },
          shoreFishing: { zoneId: 'cod-bank', phase: 'fishing', catchCooldownSeconds: 0.05 },
        },
      });
      const reelWorker = makeEntity({
        id: 'worker-reel',
        kind: 'worker',
        economy: {
          cargo: { kind: 'fish', amount: 0, capacity: 30 },
          reelEquipped: true,
          shoreFishing: { zoneId: 'cod-bank', phase: 'fishing', catchCooldownSeconds: 0.05 },
        },
      });
      const zone = makeFishingZone({ id: 'cod-bank', amount: 40 });
      const randomValues = [0.99, 0.25, 0.99, 0.75];
      const random = () => randomValues.shift() ?? 0;

      const output = updateWorkerFishingSystem({
        workers: [plainWorker, reelWorker],
        zones: [zone],
        deltaSeconds: 0.1,
        baseCatchDelaySeconds: { min: 3, max: 3 },
        reelCatchDelaySeconds: { min: 1.2, max: 1.2 },
        baseCatchChance: 0.5,
        reelCatchChance: 0.9,
        baseCatchAmount: { min: 2, max: 2 },
        reelCatchAmount: { min: 3, max: 3 },
        random,
      });

      assert.deepEqual(output.events, []);
      assert.equal(plainWorker.economy?.cargo?.amount, 0);
      assert.equal(reelWorker.economy?.cargo?.amount, 0);
      assert.equal(plainWorker.economy?.shoreFishing?.catchCooldownSeconds, 3);
      assert.equal(reelWorker.economy?.shoreFishing?.catchCooldownSeconds, 1.2);
    },
  },
  {
    name: 'worker shoreline fishing clears order when cargo fills or zone runs dry',
    run: () => {
      const fullCargoWorker = makeEntity({
        id: 'worker-full',
        kind: 'worker',
        economy: {
          cargo: { kind: 'fish', amount: 29, capacity: 30 },
          shoreFishing: { zoneId: 'cod-bank', phase: 'fishing', catchCooldownSeconds: 0 },
        },
      });
      const depletedZoneWorker = makeEntity({
        id: 'worker-zone',
        kind: 'worker',
        economy: {
          cargo: { kind: 'fish', amount: 0, capacity: 30 },
          shoreFishing: { zoneId: 'tiny-bank', phase: 'fishing', catchCooldownSeconds: 0 },
        },
      });
      const codBank = makeFishingZone({ id: 'cod-bank', amount: 10 });
      const tinyBank = makeFishingZone({ id: 'tiny-bank', label: 'Tight Bank', amount: 1 });

      const output = updateWorkerFishingSystem({
        workers: [fullCargoWorker, depletedZoneWorker],
        zones: [codBank, tinyBank],
        deltaSeconds: 0.1,
        baseCatchDelaySeconds: { min: 1, max: 1 },
        baseCatchChance: 1,
        baseCatchAmount: { min: 2, max: 2 },
        random: () => 0,
      });

      assert.deepEqual(output.events, [
        {
          kind: 'fishLoaded',
          entityId: 'worker-full',
          amount: 1,
          cargoAmount: 30,
          message: 'worker-full caught 1 fish from Sunlit Cod Bank.',
        },
        {
          kind: 'cargoFull',
          entityId: 'worker-full',
          message: 'worker-full filled its fish haul and is heading for a fish bank.',
        },
        {
          kind: 'fishLoaded',
          entityId: 'worker-zone',
          amount: 1,
          cargoAmount: 1,
          message: 'worker-zone caught 1 fish from Tight Bank.',
        },
        {
          kind: 'shoreZoneDepleted',
          entityId: 'worker-zone',
          zoneId: 'tiny-bank',
          message: 'Tight Bank ran dry.',
        },
      ]);
      assert.equal(fullCargoWorker.economy?.shoreFishing, undefined);
      assert.equal(depletedZoneWorker.economy?.shoreFishing, undefined);
    },
  },
  {
    name: 'move rejects missing selection',
    run: () => {
      const output = executeMoveCommand({
        worldX: 100,
        worldY: 100,
        selectedUnits: [],
        findLandPath: straightPath,
        isValidLandDestination: () => true,
        isValidWaterDestination: () => true,
      });
      assert.equal(output.handled, true);
      assert.deepEqual(output.result, {
        ok: false,
        kind: 'move',
        reason: 'no-selection',
        message: 'Select a worker, truck, or boat before issuing a move command.',
      });
    },
  },
  {
    name: 'move rejects invalid land destination before mutating unit',
    run: () => {
      const worker = makeEntity({ id: 'worker-1', kind: 'worker' });
      const output = executeMoveCommand({
        worldX: 100,
        worldY: 100,
        selectedUnits: [worker],
        findLandPath: straightPath,
        isValidLandDestination: () => false,
        isValidWaterDestination: () => true,
      });
      assert.equal(output.result?.ok, false);
      assert.equal(output.result?.kind, 'move');
      assert.equal(output.result?.reason, 'invalid-destination');
      assert.equal(worker.movement.state, 'idle');
      assert.deepEqual(worker.path, []);
    },
  },
  {
    name: 'move clears active attack orders on land units',
    run: () => {
      const guard = makeEntity({
        id: 'guard-1',
        kind: 'guard',
        economy: { attack: { targetId: 'enemy-1', phase: 'attacking', damagePerSecond: 48, range: 64 } },
      });
      const output = executeMoveCommand({
        worldX: 180,
        worldY: 120,
        selectedUnits: [guard],
        findLandPath: straightPath,
        isValidLandDestination: () => true,
        isValidWaterDestination: () => true,
      });

      assert.equal(output.result?.ok, true);
      assert.equal(guard.movement.state, 'moving');
      assert.equal(guard.economy?.attack, undefined);
    },
  },
  {
    name: 'mobile units do not push each other out of overlaps',
    run: () => {
      const workerA = makeEntity({ id: 'worker-a', kind: 'worker' });
      const workerB = makeEntity({ id: 'worker-b', kind: 'worker' });
      workerA.x = 100;
      workerA.y = 100;
      workerB.x = 100;
      workerB.y = 100;
      let validationCalls = 0;

      const changed = resolveMobileUnitOverlaps([workerA, workerB], () => {
        validationCalls += 1;
        return true;
      });

      assert.equal(changed, false);
      assert.equal(validationCalls, 0);
      assert.deepEqual({ x: workerA.x, y: workerA.y }, { x: 100, y: 100 });
      assert.deepEqual({ x: workerB.x, y: workerB.y }, { x: 100, y: 100 });
    },
  },
  {
    name: 'boat move clears active attack orders on attack boats',
    run: () => {
      const boat = makeEntity({
        id: 'boat-1',
        kind: 'boat',
        economy: {
          combatRole: 'attack',
          attack: { targetId: 'enemy-boat-1', phase: 'attacking', damagePerSecond: 34, range: 88 },
        },
      });
      const output = executeMoveCommand({
        worldX: 240,
        worldY: 80,
        selectedUnits: [boat],
        findLandPath: straightPath,
        findWaterPath: straightPath,
        isValidLandDestination: () => true,
        isValidWaterDestination: () => true,
      });

      assert.equal(output.result?.ok, true);
      assert.equal(boat.movement.state, 'moving');
      assert.equal(boat.economy?.attack, undefined);
    },
  },
  {
    name: 'harvest metal uses truck-aware pathing before accepting a route',
    run: () => {
      const truck = makeEntity({ id: 'truck-1', kind: 'truck', economy: { cargo: { kind: 'metal', amount: 0, capacity: 55 } } });
      const field = { id: 'field-1', kind: 'metal' as const, x: 200, y: 200, radius: 80, amount: 500, maxAmount: 500 };
      let genericPathCalls = 0;
      let truckPathCalls = 0;

      const output = executeHarvestMetalCommand({
        field,
        selectedUnits: [truck],
        findLandPath: () => {
          genericPathCalls += 1;
          return [];
        },
        findTruckLandPath: (_truck, _start, goal) => {
          truckPathCalls += 1;
          return goal.x > field.x ? [goal] : [];
        },
        getResourceInteractionPoint: () => ({ x: 322, y: 200 }),
      });

      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'harvestMetal');
      assert.equal(genericPathCalls, 0);
      assert.equal(truckPathCalls, 1);
      assert.equal(truck.economy?.harvesting?.phase, 'to-field');
      assert.equal(truck.movement.state, 'moving');
    },
  },
  {
    name: 'metal hauler waits at the field before loading ore',
    run: () => {
      const truck = makeEntity({
        id: 'truck-1',
        kind: 'truck',
        economy: {
          cargo: { kind: 'metal', amount: 0, capacity: 55 },
          harvesting: { fieldId: 'field-1', phase: 'to-field' },
        },
      });
      const field = { id: 'field-1', kind: 'metal' as const, x: 200, y: 200, radius: 80, amount: 500, maxAmount: 500 };
      const stockpile = { metal: 0 };

      const arrived = resolveHarvestArrival({
        truck,
        resourceFields: [field],
        playerStockpile: stockpile,
        enemyStockpile: { metal: 0 },
        loadSeconds: 3,
        getDropOffPoint: () => ({ x: 100, y: 100 }),
        findLandPath: straightPath,
      });

      assert.equal(arrived.changed, true);
      assert.deepEqual(arrived.events, []);
      assert.equal(truck.economy?.cargo?.amount, 0);
      assert.equal(field.amount, 500);
      assert.deepEqual(truck.economy?.harvesting, { fieldId: 'field-1', phase: 'loading', remainingSeconds: 3 });

      const waiting = resolveHarvestArrival({
        truck,
        resourceFields: [field],
        playerStockpile: stockpile,
        enemyStockpile: { metal: 0 },
        deltaSeconds: 1.25,
        loadSeconds: 3,
        getDropOffPoint: () => ({ x: 100, y: 100 }),
        findLandPath: straightPath,
      });

      assert.equal(waiting.changed, true);
      assert.deepEqual(waiting.events, []);
      assert.equal(truck.economy?.cargo?.amount, 0);
      assert.equal(field.amount, 500);
      assert.equal(truck.economy?.harvesting?.phase, 'loading');
      assert.equal(truck.economy?.harvesting?.remainingSeconds, 1.75);

      const loaded = resolveHarvestArrival({
        truck,
        resourceFields: [field],
        playerStockpile: stockpile,
        enemyStockpile: { metal: 0 },
        deltaSeconds: 2,
        loadSeconds: 3,
        getDropOffPoint: () => ({ x: 100, y: 100 }),
        findLandPath: straightPath,
      });

      assert.equal(loaded.changed, true);
      assert.deepEqual(loaded.events, [
        {
          kind: 'metalLoaded',
          entityId: 'truck-1',
          faction: 'player',
          amount: 55,
          message: 'Metal hauler loaded 55 metal and is returning to Factory.',
        },
      ]);
      assert.equal(truck.economy?.cargo?.amount, 55);
      assert.equal(field.amount, 445);
      assert.equal(truck.economy?.harvesting?.phase, 'returning');
      assert.equal(truck.movement.state, 'moving');
    },
  },
  {
    name: 'manual metal unload sends loaded trucks to the factory without auto-returning',
    run: () => {
      const truck = makeEntity({
        id: 'truck-1',
        kind: 'truck',
        economy: { cargo: { kind: 'metal', amount: 30, capacity: 55 }, harvesting: { fieldId: 'field-1', phase: 'to-field' } },
      });
      const factory = makeEntity({ id: 'factory-1', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } });
      const output = executeMetalUnloadCommand({
        factory,
        selectedUnits: [truck],
        findEntityLandPath: (_entity, _start, goal) => [goal],
        getMetalDropOffPoint: () => ({ x: 140, y: 100 }),
      });

      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'metalUnload');
      assert.equal(truck.economy?.harvesting?.phase, 'manual-returning');
      assert.equal(truck.movement.state, 'moving');

      const stockpile = { metal: 100 };
      const arrived = resolveHarvestArrival({
        truck,
        resourceFields: [{ id: 'field-1', kind: 'metal' as const, x: 200, y: 200, radius: 80, amount: 500, maxAmount: 500 }],
        playerStockpile: stockpile,
        enemyStockpile: { metal: 0 },
        getDropOffPoint: () => ({ x: 140, y: 100 }),
        findLandPath: straightPath,
      });

      assert.equal(arrived.changed, true);
      assert.equal(stockpile.metal, 130);
      assert.equal(truck.economy?.cargo?.amount, 0);
      assert.equal(truck.economy?.harvesting, undefined);
    },
  },
  {
    name: 'manual worker fish unload sends loaded workers to a friendly fish bank',
    run: () => {
      const worker = makeEntity({
        id: 'worker-1',
        kind: 'worker',
        economy: { cargo: { kind: 'fish', amount: 6, capacity: 30 }, shoreFishing: { zoneId: 'cod-bank', phase: 'fishing' } },
      });
      const factory = makeEntity({ id: 'factory-1', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } });

      const output = executeWorkerFishUnloadCommand({
        bank: factory,
        selectedUnits: [worker],
        findEntityLandPath: (_entity, _start, goal) => [goal],
        getWorkerFishDropOffPoint: () => ({ x: 140, y: 100 }),
      });

      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'fish');
      assert.equal(worker.economy?.shoreFishing, undefined);
      assert.deepEqual(worker.economy?.unloadingFish, { targetId: 'factory-1', phase: 'to-bank' });
      assert.equal(worker.movement.state, 'moving');
    },
  },
  {
    name: 'produce rejects missing producer',
    run: () => {
      const stockpile = { metal: 500, cash: 100 };
      const output = executeProductionCommand({
        producer: null,
        product: 'worker',
        stockpile,
        nextProductionId: 1,
        missingProducerMessage: 'Select a Factory Command Center before producing units.',
      });
      assert.equal(output.result.ok, false);
      assert.equal(output.result.kind, 'produce');
      assert.equal(output.result.reason, 'not-factory-selected');
      assert.equal(stockpile.metal, 500);
    },
  },
  {
    name: 'produce rejects unaffordable command without spending resources',
    run: () => {
      const factory = makeEntity({ id: 'factory-1', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200, productionQueue: [] } });
      const stockpile = { metal: 0, cash: 0 };
      const output = executeProductionCommand({
        producer: factory,
        product: 'guard',
        stockpile,
        nextProductionId: 1,
        missingProducerMessage: 'Select a Factory Command Center before producing units.',
      });
      assert.equal(output.result.ok, false);
      assert.equal(output.result.kind, 'produce');
      assert.equal(output.result.reason, 'unaffordable');
      assert.equal(stockpile.metal, 0);
      assert.equal(stockpile.cash, 0);
      assert.deepEqual(factory.economy?.productionQueue, []);
    },
  },
  {
    name: 'produce rejects missing cash even when metal is available',
    run: () => {
      const factory = makeEntity({ id: 'factory-1', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200, productionQueue: [] } });
      const stockpile = { metal: 500, cash: 0 };
      const output = executeProductionCommand({
        producer: factory,
        product: 'boat',
        stockpile,
        nextProductionId: 1,
        missingProducerMessage: 'Select a Dock before building boats.',
      });
      assert.equal(output.result.ok, false);
      assert.equal(output.result.kind, 'produce');
      assert.equal(output.result.reason, 'unaffordable');
      assert.equal(output.result.message, 'Need 25 cash to build Fishing Boat.');
      assert.equal(stockpile.metal, 500);
      assert.equal(stockpile.cash, 0);
      assert.deepEqual(factory.economy?.productionQueue, []);
    },
  },
  {
    name: 'production and construction timings are readable instead of instant',
    run: () => {
      assert.deepEqual(
        Object.fromEntries(Object.entries(productionCatalog).map(([key, value]) => [key, value.seconds])),
        {
          worker: 3.6,
          guard: 4.2,
          saboteur: 4.8,
          truck: 5.2,
          boat: 5.8,
          attackBoat: 6.6,
        },
      );
      assert.deepEqual(
        Object.fromEntries(Object.entries(buildingCatalog).map(([key, value]) => [key, value.seconds])),
        {
          house: 4.5,
          dock: 6.5,
          guardTower: 7.5,
          techLab: 9.5,
          barracks: 8.5,
          factory: 22,
        },
      );
    },
  },
  {
    name: 'fishing boats are slower than combat boats',
    run: () => {
      assert.equal(createBoatEntity('boat-1', 'Fishing Boat', 0, 0).movement.speed, 68);
      assert.equal(createEnemyBoatEntity('enemy-boat-1', 'Fishing Boat', 0, 0).movement.speed, 68);
      assert.equal(createAttackBoatEntity('attack-boat-1', 'Attack Boat', 0, 0).movement.speed, 78);
      assert.equal(createEnemyAttackBoatEntity('enemy-attack-boat-1', 'Attack Boat', 0, 0).movement.speed, 78);
    },
  },
  {
    name: 'build placement rejects invalid footprint before creating site',
    run: () => {
      const builder = makeEntity({ id: 'worker-1', kind: 'worker' });
      let createCalled = false;
      const output = executePlacementCommand({
        building: 'house',
        x: 100,
        y: 100,
        builder,
        stockpile: { metal: 500 },
        nextBuildingSiteId: 1,
        validatePlacement: () => ({ valid: false, reason: 'blocked terrain' }),
        createConstructionSite: () => {
          createCalled = true;
          return makeConstructionSite('site-1', 'house', builder.id);
        },
        getConstructionWorkPoint: () => ({ x: 120, y: 100 }),
        findLandPath: straightPath,
      });
      assert.equal(output.result?.ok, false);
      assert.equal(output.result?.kind, 'placement');
      assert.equal(output.result?.reason, 'invalid-placement');
      assert.equal(createCalled, false);
    },
  },
  {
    name: 'build placement rejects missing worker before spending metal',
    run: () => {
      const stockpile = { metal: 500 };
      const output = executePlacementCommand({
        building: 'dock',
        x: 100,
        y: 100,
        builder: null,
        stockpile,
        nextBuildingSiteId: 1,
        validatePlacement: () => ({ valid: true, reason: 'valid' }),
        createConstructionSite: () => makeConstructionSite('site-1', 'dock', 'missing'),
        getConstructionWorkPoint: () => ({ x: 120, y: 100 }),
        findLandPath: straightPath,
      });
      assert.equal(output.result?.ok, false);
      assert.equal(output.result?.kind, 'placement');
      assert.equal(output.result?.reason, 'not-worker-selected');
      assert.equal(stockpile.metal, 500);
    },
  },
  {
    name: 'build placement uses builder-aware pathing before assigning construction',
    run: () => {
      const builder = makeEntity({ id: 'worker-1', kind: 'worker' });
      const stockpile = { metal: 500 };
      let genericPathCalls = 0;
      let entityPathCalls = 0;
      const output = executePlacementCommand({
        building: 'dock',
        x: 100,
        y: 100,
        builder,
        stockpile,
        nextBuildingSiteId: 1,
        validatePlacement: () => ({ valid: true, reason: 'valid' }),
        createConstructionSite: (id, building, _x, _y, builderId) => makeConstructionSite(id, building, builderId),
        getConstructionWorkPoint: () => ({ x: 120, y: 100 }),
        findLandPath: () => {
          genericPathCalls += 1;
          return [];
        },
        findEntityLandPath: (_entity, _start, goal) => {
          entityPathCalls += 1;
          return [goal];
        },
      });

      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'placement');
      assert.equal(builder.economy?.buildJob?.siteId, 'dock-site-1');
      assert.equal(builder.movement.state, 'moving');
      assert.equal(genericPathCalls, 0);
      assert.equal(entityPathCalls, 1);
      assert.equal(stockpile.metal, 380);
    },
  },
  {
    name: 'build placement tries alternate construction sides when the first side is unreachable',
    run: () => {
      const builder = makeEntity({ id: 'worker-1', kind: 'worker' });
      const stockpile = { metal: 500 };
      const attemptedGoals: PathPoint[] = [];
      const output = executePlacementCommand({
        building: 'house',
        x: 100,
        y: 100,
        builder,
        stockpile,
        nextBuildingSiteId: 1,
        validatePlacement: () => ({ valid: true, reason: 'valid' }),
        createConstructionSite: (id, building, _x, _y, builderId) => makeConstructionSite(id, building, builderId),
        getConstructionWorkPoint: () => ({ x: 110, y: 100 }),
        getConstructionWorkPoints: () => [{ x: 110, y: 100 }, { x: 70, y: 100 }, { x: 100, y: 150 }],
        findLandPath: () => [],
        findEntityLandPath: (_entity, _start, goal) => {
          attemptedGoals.push(goal);
          return goal.y > 120 ? [goal] : [];
        },
      });

      assert.equal(output.result?.ok, true);
      assert.equal(output.moveCommand?.x, 100);
      assert.equal(output.moveCommand?.y, 150);
      assert.deepEqual(attemptedGoals, [{ x: 110, y: 100 }, { x: 70, y: 100 }, { x: 100, y: 150 }]);
      assert.deepEqual(builder.moveTarget, { x: 100, y: 150 });
      assert.equal(stockpile.metal, 410);
    },
  },
  {
    name: 'worker can queue a melee attack against enemy land targets',
    run: () => {
      const worker = makeEntity({
        id: 'worker-1',
        kind: 'worker',
        economy: {
          cargo: { kind: 'fish', amount: 4, capacity: 30 },
          shoreFishing: { zoneId: 'cod-bank', phase: 'fishing' },
        },
      });
      const target = makeEntity({ id: 'enemy-1', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } });
      const output = executeAttackCommand({
        target,
        selectedUnits: [worker],
        findLandPath: straightPath,
        getApproachPoint: targetPoint,
      });
      assert.equal(output.handled, true);
      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'attack');
      assert.equal(worker.economy?.attack?.targetId, 'enemy-1');
      assert.equal(worker.economy?.attack?.damagePerSecond, 12);
      assert.equal(worker.economy?.attack?.range, 34);
      assert.equal(worker.economy?.shoreFishing, undefined);
      assert.equal(worker.movement.state, 'moving');
    },
  },
  {
    name: 'worker-only attack rejects enemy boats',
    run: () => {
      const worker = makeEntity({ id: 'worker-1', kind: 'worker' });
      const target = makeEntity({ id: 'enemy-boat-1', kind: 'boat', faction: 'enemy', economy: { health: 125 } });
      const output = executeAttackCommand({
        target,
        selectedUnits: [worker],
        findLandPath: straightPath,
        getApproachPoint: targetPoint,
      });
      assert.equal(output.handled, true);
      assert.equal(output.result?.ok, false);
      assert.equal(output.result?.kind, 'attack');
      assert.equal(output.result?.reason, 'wrong-unit');
      assert.equal(worker.economy?.attack, undefined);
    },
  },
  {
    name: 'attack rejects unreachable target before assigning attack order',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard' });
      const target = makeEntity({ id: 'enemy-1', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } });
      const output = executeAttackCommand({
        target,
        selectedUnits: [guard],
        findLandPath: () => [],
        getApproachPoint: targetPoint,
      });
      assert.equal(output.result?.ok, false);
      assert.equal(output.result?.kind, 'attack');
      assert.equal(output.result?.reason, 'unreachable');
      assert.equal(guard.economy?.attack, undefined);
    },
  },
  {
    name: 'stop clears movement and active tactical orders',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard', economy: { attack: { targetId: 'enemy-1', phase: 'attacking', damagePerSecond: 26, range: 70 }, guardOrder: { mode: 'hold', acquireRange: 200 } } });
      guard.movement.state = 'moving';
      guard.path = [{ x: 200, y: 200 }];
      guard.moveTarget = guard.path[0];
      const output = executeStopCommand({ selectedUnits: [guard] });
      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'stop');
      assert.equal(guard.movement.state, 'idle');
      assert.equal(guard.moveTarget, undefined);
      assert.deepEqual(guard.path, []);
      assert.equal(guard.economy?.attack, undefined);
      assert.equal(guard.economy?.guardOrder, undefined);
    },
  },
  {
    name: 'hold assigns guard stance and rejects non-combat units',
    run: () => {
      const worker = makeEntity({ id: 'worker-1', kind: 'worker' });
      const rejected = executeHoldCommand({ selectedUnits: [worker] });
      assert.equal(rejected.result?.ok, false);
      assert.equal(rejected.result?.kind, 'hold');
      assert.equal(rejected.result?.reason, 'no-combat-unit');

      const guard = makeEntity({ id: 'guard-1', kind: 'guard' });
      const accepted = executeHoldCommand({ selectedUnits: [guard] });
      assert.equal(accepted.result?.ok, true);
      assert.deepEqual(guard.economy?.guardOrder, { mode: 'hold', acquireRange: 150 });
    },
  },
  {
    name: 'attack-move assigns destination and guard acquisition stance',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard' });
      const output = executeAttackMoveCommand({
        worldX: 260,
        worldY: 280,
        selectedUnits: [guard],
        findLandPath: straightPath,
        isValidLandDestination: () => true,
        isValidWaterDestination: () => true,
      });
      assert.equal(output.result?.ok, true);
      assert.equal(output.result?.kind, 'attackMove');
      assert.equal(guard.movement.state, 'moving');
      assert.equal(guard.economy?.guardOrder?.mode, 'attackMove');
      assert.deepEqual(guard.economy?.guardOrder?.destination, { x: 260, y: 280 });
    },
  },
  {
    name: 'idle player guard auto-acquires a nearby enemy without hold order',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard' });
      const enemy = makeEntity({ id: 'enemy-1', kind: 'worker', faction: 'enemy', economy: { health: 85 } });
      enemy.x = guard.x + 70;

      const output = updateAutoDefenseSystem({
        units: [guard],
        entities: [guard, enemy],
        getDamageState: () => 'healthy',
        getCollisionRadius: (entity) => entity.collider.kind === 'circle' ? entity.collider.radius : 40,
      });

      assert.equal(output.changed, true);
      assert.equal(guard.economy?.attack?.targetId, 'enemy-1');
      assert.equal(guard.economy?.attack?.phase, 'attacking');
      assert.equal(guard.movement.state, 'idle');
      assert.deepEqual(output.events[0], { kind: 'attacking', attackerId: 'guard-1', targetId: 'enemy-1', faction: 'player' });
    },
  },
  {
    name: 'auto-acquired guard target outside weapon range moves before attacking',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard' });
      const enemy = makeEntity({ id: 'enemy-1', kind: 'worker', faction: 'enemy', economy: { health: 85 } });
      enemy.x = guard.x + 130;

      const acquired = updateAutoDefenseSystem({
        units: [guard],
        entities: [guard, enemy],
        getDamageState: () => 'healthy',
        getCollisionRadius: (entity) => entity.collider.kind === 'circle' ? entity.collider.radius : 40,
      });

      assert.equal(acquired.changed, true);
      assert.equal(guard.economy?.attack?.phase, 'to-target');
      assert.deepEqual(acquired.events, []);

      const combat = updateCombatAttackers({
        attackers: [guard],
        entities: [guard, enemy],
        deltaSeconds: 1,
        getCollisionRadius: (entity) => entity.collider.kind === 'circle' ? entity.collider.radius : 40,
        getApproachPoint: () => ({ x: enemy.x - 40, y: enemy.y }),
        findLandPath: (_start, goal) => [goal],
        findWaterPath: (_start, goal) => [goal],
        applyDamage: (target, amount) => {
          target.economy = { ...target.economy, health: (target.economy?.health ?? 0) - amount };
          return 'damaged';
        },
      });

      assert.equal(combat.changed, true);
      assert.equal(guard.movement.state, 'moving');
      assert.equal(guard.economy?.attack?.phase, 'to-target');
      assert.equal(enemy.economy?.health, 85);
    },
  },
  {
    name: 'enemy raid combat damages player target and raises player warning',
    run: () => {
      const guard = makeEntity({ id: 'enemy-guard-1', kind: 'guard', faction: 'enemy', economy: { health: 110 } });
      const truck = makeEntity({ id: 'truck-1', kind: 'truck', faction: 'player', economy: { health: 140 } });
      guard.x = truck.x + 60;
      guard.y = truck.y;
      guard.economy = {
        ...guard.economy,
        attack: { targetId: truck.id, phase: 'attacking', damagePerSecond: 24, range: 90 },
      };
      const entities = [guard, truck];
      const warnings: Array<{ targetId: string; phase: 'incoming' | 'damaged' | 'destroyed' }> = [];
      const aiController = makeAiControllerState();
      aiController.raidIssued = true;

      const runtime = createCombatRuntime({
        entities,
        aiEconomyState: { metal: 0 },
        aiController,
        aiDefenseState: { threatCount: 0, defensiveStructureBuilt: false },
        getNextEnemyGuardTowerId: () => 1,
        setNextEnemyGuardTowerId: () => {},
        getDamageState: (entity) => entity.economy?.damageState ?? 'healthy',
        getCollisionRadius: (entity) => entity.collider.kind === 'circle' ? entity.collider.radius : 40,
        getAttackApproachPoint: targetPoint,
        getRaidApproachPoint: targetPoint,
        getAiRepeatRaidDelaySeconds: () => 20,
        findLandPath: straightPath,
        findEntityLandPath: (_entity, _start, goal) => [goal],
        findWaterPath: straightPath,
        applyDamage: (target, amount) => {
          const health = Math.max(0, (target.economy?.health ?? 0) - amount);
          target.economy = { ...target.economy, health };
          return health <= 0 ? 'destroyed' : 'damaged';
        },
        issuePlayerAssetWarning: (target, phase) => warnings.push({ targetId: target.id, phase }),
        playCombatFireSfx: () => {},
        playCombatHitSfx: () => {},
        setLastCombatEvent: () => {},
        renderMap: () => {},
        renderUnits: () => {},
        renderBuildings: () => {},
        drawCombatTargetingOverlay: () => {},
        drawSelectionOverlay: () => {},
        drawDestinationOverlay: () => {},
        updateSelectionReadout: () => {},
        publishDebugState: () => {},
        guardTowerRange: 300,
        guardTowerDamagePerSecond: 20,
        findGuardTowerTarget: () => undefined,
      });

      const changed = runtime.updateAiRaidActive(1, {} as never);

      assert.equal(changed, true);
      assert.equal(truck.economy?.health, 116);
      assert.equal(aiController.lastRaidEvent?.kind, 'damaged');
      assert.equal(aiController.lastRaidEvent?.attackerId, 'enemy-guard-1');
      assert.deepEqual(warnings, [
        { targetId: 'truck-1', phase: 'incoming' },
        { targetId: 'truck-1', phase: 'damaged' },
      ]);
    },
  },
  {
    name: 'enemy territory threat detects player guard near rival dock',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard', faction: 'player' });
      const dock = makeEntity({ id: 'enemy-dock', kind: 'dock', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 760 } });
      const factory = makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 1200 } });
      dock.x = 600;
      dock.y = 600;
      factory.x = 1500;
      factory.y = 600;
      guard.x = 760;
      guard.y = 620;

      const threat = findAiTerritoryThreat([guard, dock, factory], () => 'healthy');

      assert.deepEqual(threat, { threatId: 'guard-1', attackedAssetId: 'enemy-dock' });
    },
  },
  {
    name: 'skirmish starts both sides with command center, three workers, and one truck',
    run: () => {
      const bootstrap = createSkirmishBootstrap();
      const playerUnits = bootstrap.entities.filter((entity) => entity.faction === 'player');
      const enemyUnits = bootstrap.entities.filter((entity) => entity.faction === 'enemy');

      assert.equal(playerUnits.filter((entity) => entity.kind === 'factory').length, 1);
      assert.equal(enemyUnits.filter((entity) => entity.kind === 'enemyFactory').length, 1);
      assert.equal(playerUnits.filter((entity) => entity.kind === 'worker').length, 3);
      assert.equal(enemyUnits.filter((entity) => entity.kind === 'worker').length, 3);
      assert.equal(playerUnits.filter((entity) => entity.kind === 'truck').length, 1);
      assert.equal(enemyUnits.filter((entity) => entity.kind === 'truck').length, 1);
      assert.equal(playerUnits.some((entity) => entity.kind === 'guard' || entity.kind === 'saboteur'), false);
      assert.deepEqual(bootstrap.economyState, { metal: 320, cash: 120 });
      assert.deepEqual(bootstrap.aiEconomyState, { metal: 320, cash: 120 });
    },
  },
  {
    name: 'AI builds barracks fallback when no barracks exists',
    run: () => {
      const state = makeAiControllerState({
        openingComplete: true,
        productionQueued: true,
        dockBuilt: true,
        boatProductionQueued: true,
      });
      let builtBarracks = false;
      const changed = tickAiCoordinator({
        deltaSeconds: 0.1,
        state,
        entities: [
          makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
          makeEntity({ id: 'enemy-worker-1', kind: 'worker', faction: 'enemy' }),
          makeEntity({ id: 'enemy-worker-2', kind: 'worker', faction: 'enemy' }),
          makeEntity({ id: 'enemy-worker-3', kind: 'worker', faction: 'enemy' }),
          makeEntity({ id: 'enemy-truck-1', kind: 'truck', faction: 'enemy' }),
        ],
        availableMetal: 240,
        availableCash: 100,
        getDamageState: () => 'healthy',
        tryIssueHarvest: () => false,
        queueProduction: () => false,
        buildDock: () => false,
        buildBarracks: () => {
          builtBarracks = true;
          return true;
        },
        updateProduction: () => false,
        updateFishing: () => false,
        updateBoatRepair: () => false,
        respondToThreat: () => false,
        issueRaid: () => false,
        updateRaid: () => false,
      });

      assert.equal(changed, true);
      assert.equal(builtBarracks, true);
    },
  },
  {
    name: 'AI offensive raids wait for guards instead of sending workers',
    run: () => {
      const worker = makeEntity({ id: 'enemy-worker-1', kind: 'worker', faction: 'enemy' });
      const guard = makeEntity({ id: 'enemy-guard-1', kind: 'guard', faction: 'enemy' });

      assert.equal(chooseAiRaidAttacker([worker], () => 'healthy'), null);
      assert.equal(chooseAiRaidAttacker([worker, guard], () => 'healthy')?.id, 'enemy-guard-1');
    },
  },
  {
    name: 'AI scout intel switches tactics toward exposed harbor pressure',
    run: () => {
      const intel = createAiIntelState('economicBoom');
      const scout = makeEntity({ id: 'enemy-scout', kind: 'guard', faction: 'enemy' });
      scout.x = 100;
      scout.y = 100;
      const dock = makeEntity({ id: 'player-dock', kind: 'dock', speed: 0, layer: 'buildings', economy: { health: 240 } });
      dock.x = 150;
      dock.y = 100;
      const boat = makeEntity({ id: 'player-boat', kind: 'boat', economy: { health: 125, combatRole: 'fishing' } });
      boat.x = 170;
      boat.y = 125;
      const scan = scanPlayerIntel({
        entities: [scout, dock, boat],
        scout,
        deltaSeconds: 0.1,
        getDamageState: () => 'healthy',
      });

      assert.ok(scan);
      mergeObservedPlayerState(intel.observed, scan.observed);
      assert.equal(updateAdaptiveTactic({ intel, openingStrategy: 'economicBoom', force: true }), true);
      assert.equal(intel.tactic, 'harborControl');
      assert.match(scan.report ?? '', /dock/);
    },
  },
  {
    name: 'enemy defense uses idle workers when no guards exist',
    run: () => {
      const guard = makeEntity({ id: 'guard-1', kind: 'guard', faction: 'player' });
      const worker = makeEntity({ id: 'enemy-worker-1', kind: 'worker', faction: 'enemy' });
      const factory = makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 1200 } });
      guard.x = 350;
      guard.y = 100;
      worker.x = 100;
      worker.y = 100;
      factory.x = 120;
      factory.y = 120;

      const output = updateAiDefenseResponse({
        entities: [guard, worker, factory],
        threatId: guard.id,
        attackedAssetId: factory.id,
        availableMetal: 0,
        state: { threatCount: 0, defensiveStructureBuilt: false },
        getDamageState: () => 'healthy',
        findLandPath: (_start, goal) => [goal],
        getApproachPoint: () => ({ x: guard.x - 40, y: guard.y }),
        buildDefense: () => undefined,
      });

      assert.equal(output.changed, true);
      assert.equal(worker.economy?.attack?.targetId, 'guard-1');
      assert.equal(worker.economy?.attack?.damagePerSecond, 14);
      assert.equal(worker.movement.state, 'moving');
      assert.deepEqual(output.events[0], {
        kind: 'responding',
        defenderId: 'enemy-worker-1',
        threatId: 'guard-1',
        attackedAssetId: 'enemy-factory',
        threatCount: 1,
      });
    },
  },
  {
    name: 'sabotage ignores non-building enemy targets',
    run: () => {
      const saboteur = makeEntity({ id: 'saboteur-1', kind: 'saboteur' });
      const target = makeEntity({ id: 'enemy-worker-1', kind: 'worker', faction: 'enemy' });
      const output = executeSabotageCommand({
        target,
        selectedUnits: [saboteur],
        findLandPath: straightPath,
        getApproachPoint: targetPoint,
        getDamageState: () => 'healthy',
      });
      assert.equal(output.handled, false);
      assert.equal(saboteur.economy?.sabotage, undefined);
    },
  },
  {
    name: 'sabotage rejects unreachable building before assigning sabotage order',
    run: () => {
      const saboteur = makeEntity({ id: 'saboteur-1', kind: 'saboteur' });
      const target = makeEntity({ id: 'enemy-1', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } });
      const output = executeSabotageCommand({
        target,
        selectedUnits: [saboteur],
        findLandPath: () => [],
        getApproachPoint: targetPoint,
        getDamageState: () => 'healthy',
      });
      assert.equal(output.handled, true);
      assert.equal(output.result?.ok, false);
      assert.equal(output.result?.kind, 'sabotage');
      assert.equal(output.result?.reason, 'unreachable');
      assert.equal(saboteur.economy?.sabotage, undefined);
    },
  },
  {
    name: 'win condition keeps first fishing sale playable below profit target',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      const result = evaluateWinCondition({
        entities,
        playerCash: 160,
        aiCash: 160,
        playerMetal: 280,
        aiMetal: 280,
        playerProfitTarget: 1600,
        aiProfitTarget: 2000,
        getDamageState: () => 'healthy',
      });
      assert.equal(result, undefined);
    },
  },
  {
    name: 'win condition supports profit victory and command-center defeat',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      assert.deepEqual(
        evaluateWinCondition({
          entities,
          playerCash: 1600,
          aiCash: 0,
          playerMetal: 280,
          aiMetal: 280,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: () => 'healthy',
        }),
        { outcome: 'victory', reason: 'Economic victory secured: 1600/1600 cash with a 1600 cash lead after the long market race.' },
      );
      assert.deepEqual(
        evaluateWinCondition({
          entities,
          playerCash: 0,
          aiCash: 0,
          playerMetal: 280,
          aiMetal: 280,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: (entity) => (entity.kind === 'enemyFactory' ? 'destroyed' : 'healthy'),
        }),
        { outcome: 'victory', reason: 'Enemy command center destroyed.' },
      );
    },
  },
  {
    name: 'win condition supports AI profit defeat and player command-center defeat',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      assert.deepEqual(
        evaluateWinCondition({
          entities,
          playerCash: 0,
          aiCash: 2000,
          playerMetal: 280,
          aiMetal: 280,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: () => 'healthy',
        }),
        { outcome: 'defeat', reason: 'Rival economic victory: enemy reached 2000/2000 cash with a 2000 cash lead in the market race.' },
      );
      assert.deepEqual(
        evaluateWinCondition({
          entities,
          playerCash: 0,
          aiCash: 0,
          playerMetal: 280,
          aiMetal: 280,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: (entity) => (entity.kind === 'factory' ? 'destroyed' : 'healthy'),
        }),
        { outcome: 'defeat', reason: 'Factory Command Center destroyed.' },
      );
    },
  },
  {
    name: 'win condition ignores hidden rival factory crew after visible rival assets are destroyed',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({
          id: 'enemy-hidden-worker',
          kind: 'worker',
          faction: 'enemy',
          speed: 120,
          layer: 'units',
          economy: { health: 85, factoryDuty: { factoryId: 'enemy-factory', phase: 'producing' } },
          hidden: true,
        }),
      ];

      assert.deepEqual(
        evaluateWinCondition({
          entities,
          playerCash: 0,
          aiCash: 0,
          playerMetal: 280,
          aiMetal: 0,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: () => 'healthy',
        }),
        { outcome: 'victory', reason: 'All rival units and buildings destroyed.' },
      );
    },
  },
  {
    name: 'destroying a command center destroys all assigned factory crew',
    run: () => {
      const factory = makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 0 } });
      const producingWorker = makeEntity({
        id: 'worker-producing',
        kind: 'worker',
        economy: { health: 85, factoryDuty: { factoryId: 'player-factory', phase: 'producing' } },
        hidden: true,
      });
      const reportingWorker = makeEntity({
        id: 'worker-reporting',
        kind: 'worker',
        economy: { health: 85, factoryDuty: { factoryId: 'player-factory', phase: 'to-factory' } },
      });
      const idleWorker = makeEntity({ id: 'worker-idle', kind: 'worker', economy: { health: 85 } });
      const destroyedWorker = makeEntity({
        id: 'worker-destroyed',
        kind: 'worker',
        economy: { health: 0, factoryDuty: { factoryId: 'player-factory', phase: 'producing' } },
      });
      const destroyedIds: string[] = [];

      const destroyedCrew = destroyAssignedFactoryCrew({
        factory,
        entities: [factory, producingWorker, reportingWorker, idleWorker, destroyedWorker],
        getDamageState: (entity) => ((entity.economy?.health ?? 1) <= 0 ? 'destroyed' : 'healthy'),
        destroyCrew: (worker) => {
          destroyedIds.push(worker.id);
          worker.economy = { ...worker.economy, health: 0, damageState: 'destroyed', factoryDuty: undefined };
        },
      });

      assert.deepEqual(destroyedCrew.map((worker) => worker.id).sort(), ['worker-producing', 'worker-reporting']);
      assert.deepEqual(destroyedIds.sort(), ['worker-producing', 'worker-reporting']);
      assert.equal(producingWorker.economy?.health, 0);
      assert.equal(reportingWorker.economy?.health, 0);
      assert.equal(idleWorker.economy?.health, 85);
      assert.equal(destroyedWorker.economy?.factoryDuty?.factoryId, 'player-factory');
    },
  },
  {
    name: 'win condition keeps the player alive when dock and boat still provide a recovery path',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({ id: 'player-dock', kind: 'dock', speed: 0, layer: 'buildings', economy: { health: 800 } }),
        makeEntity({ id: 'player-boat', kind: 'boat', speed: 0, economy: { health: 220, cargo: { kind: 'fish', amount: 0, capacity: 80 } } }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      const result = evaluateWinCondition({
        entities,
        playerCash: 0,
        aiCash: 0,
        playerMetal: 0,
        aiMetal: 280,
        playerProfitTarget: 1600,
        aiProfitTarget: 2000,
        getDamageState: () => 'healthy',
      });
      assert.equal(result, undefined);
    },
  },
  {
    name: 'win condition detects unrecoverable player economy without truck, dock, boat, or replacement metal',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      assert.equal(
        evaluateWinCondition({
          entities,
          playerCash: 0,
          aiCash: 0,
          playerMetal: 0,
          aiMetal: 0,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: () => 'healthy',
        }),
        undefined,
      );
    },
  },
  {
    name: 'win condition detects unrecoverable rival economy for player victory',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      assert.equal(
        evaluateWinCondition({
          entities,
          playerCash: 0,
          aiCash: 0,
          playerMetal: 280,
          aiMetal: 0,
          playerProfitTarget: 1600,
          aiProfitTarget: 2000,
          getDamageState: () => 'healthy',
        }),
        undefined,
      );
    },
  },
  {
    name: 'win condition keeps the player alive when a replacement truck is already queued',
    run: () => {
      const entities = [
        makeEntity({
          id: 'player-factory',
          kind: 'factory',
          speed: 0,
          layer: 'buildings',
          economy: {
            health: 1200,
            productionQueue: [{ id: 'truck-queue-1', product: 'truck', remainingSeconds: 5, totalSeconds: 12, cost: 140 }],
          },
        }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      const result = evaluateWinCondition({
        entities,
        playerCash: 0,
        aiCash: 0,
        playerMetal: 0,
        aiMetal: 280,
        playerProfitTarget: 1600,
        aiProfitTarget: 2000,
        getDamageState: () => 'healthy',
      });
      assert.equal(result, undefined);
    },
  },
  {
    name: 'win condition keeps the player alive when a replacement boat is already queued at a dock',
    run: () => {
      const entities = [
        makeEntity({ id: 'player-factory', kind: 'factory', speed: 0, layer: 'buildings', economy: { health: 1200 } }),
        makeEntity({
          id: 'player-dock',
          kind: 'dock',
          speed: 0,
          layer: 'buildings',
          economy: {
            health: 800,
            productionQueue: [{ id: 'boat-queue-1', product: 'boat', remainingSeconds: 4, totalSeconds: 10, cost: 100 }],
          },
        }),
        makeEntity({ id: 'enemy-factory', kind: 'enemyFactory', faction: 'enemy', speed: 0, layer: 'buildings', economy: { health: 900 } }),
      ];
      const result = evaluateWinCondition({
        entities,
        playerCash: 0,
        aiCash: 0,
        playerMetal: 0,
        aiMetal: 280,
        playerProfitTarget: 1600,
        aiProfitTarget: 2000,
        getDamageState: () => 'healthy',
      });
      assert.equal(result, undefined);
    },
  },
];

for (const test of tests) {
  test.run();
  console.log(`ok - ${test.name}`);
}

function straightPath(_start: PathPoint, goal: PathPoint): PathPoint[] {
  return [goal];
}

function targetPoint(target: GameEntity): PathPoint {
  return { x: target.x - 30, y: target.y };
}

function makeEntity(input: {
  id: string;
  kind: EntityKind;
  faction?: Faction;
  speed?: number;
  layer?: 'buildings' | 'units';
  economy?: GameEntity['economy'];
  hidden?: boolean;
}): GameEntity {
  const layer = input.layer ?? (input.speed === 0 ? 'buildings' : 'units');
  return {
    id: input.id,
    name: input.id,
    kind: input.kind,
    faction: input.faction ?? 'player',
    x: 100,
    y: 100,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: layer === 'buildings' ? { kind: 'rect', width: 80, height: 80 } : { kind: 'circle', radius: 18 },
    movement: { speed: input.speed ?? 120, state: 'idle' },
    path: [],
    economy: input.economy ?? {},
    animation: { state: 'idle', frame: 0 },
    renderable: { layer, tint: 0xffffff, hidden: input.hidden },
  };
}

function makeConstructionSite(id: string, building: BuildingPlanKind, builderId: string): GameEntity {
  return makeEntity({
    id,
    kind: building === 'guardTower' ? 'guardTower' : building,
    speed: 0,
    layer: 'buildings',
    economy: {
      health: 100,
      construction: {
        building,
        progressSeconds: 0,
        totalSeconds: 1,
        complete: false,
        builderId,
        capacityBonus: 0,
      },
    },
  });
}

function makeFishingZone(input: { id: string; label?: string; amount: number }) {
  return {
    id: input.id,
    label: input.label ?? 'Sunlit Cod Bank',
    x: 0,
    y: 0,
    radius: 80,
    amount: input.amount,
    maxFish: input.amount,
    regrowthPerSecond: 0,
    depletedCooldownSeconds: 0,
    cashPerFish: 2,
    tier: 'safe' as const,
  };
}

function makeAiControllerState(overrides: Partial<AiControllerState> = {}): AiControllerState {
  return {
    strategy: 'siege',
    startDelaySeconds: 0,
    raidDelaySeconds: 0,
    territoryAlertCooldownSeconds: 0,
    harvestIssued: true,
    openingComplete: false,
    productionQueued: false,
    barracksProductionQueued: false,
    dockBuilt: false,
    boatProductionQueued: false,
    fishingIssued: false,
    raidIssued: false,
    lastAction: 'test',
    raidCount: 0,
    ...overrides,
  };
}
