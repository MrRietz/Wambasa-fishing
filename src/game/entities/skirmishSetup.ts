import { FIRST_SKIRMISH_BALANCE } from '../config/constants';
import { buildingCatalog } from '../data/buildings';
import { skirmish01MapData } from '../data/maps/skirmish01';
import type { MatchState, MatchStats, GameEntity } from './components';
import type { CoastalMapData, FishingZoneState, ResourceField } from '../map/mapTypes';
import {
  createEnemyAttackBoatEntity,
  createEnemyGuardEntity,
  createEnemyTruckEntity,
  createEnemyWorkerEntity,
  createGuardEntity,
  createTruckEntity,
  createWorkerEntity,
} from './entityFactory';

export interface SkirmishBootstrap {
  mapData: CoastalMapData;
  fishingZoneStates: FishingZoneState[];
  resourceFields: ResourceField[];
  economyState: { metal: number; cash: number };
  aiEconomyState: { metal: number; cash: number };
  matchState: MatchState;
  matchStats: MatchStats;
  crewState: { capacity: number };
  entities: GameEntity[];
}

const metalFieldCapacities: Record<string, number> = {
  'player-metal-a': 2600,
  'player-metal-b': 2100,
  'midline-scrap': 2800,
  'midline-vein': 3200,
  'upland-cache': 3000,
  'enemy-approach': 2400,
  'enemy-metal': 3600,
  'enemy-backline': 3000,
};

export function createSkirmishBootstrap(): SkirmishBootstrap {
  const mapData = skirmish01MapData;
  const fishingZoneStates: FishingZoneState[] = mapData.fishingZones.map((zone) => {
    const maxFish = zone.maxFish ?? (zone.shoreAccess ? 200 : 500);
    return {
      ...zone,
      amount: maxFish,
      maxFish,
      regrowthPerSecond: zone.regrowthPerSecond ?? (zone.shoreAccess ? 12 : 20),
      depletedCooldownSeconds: 0,
    };
  });

  const resourceFields: ResourceField[] = mapData.metalFields.map((field) => ({
    ...field,
    kind: 'metal',
    amount: metalFieldCapacities[field.id] ?? 2600,
    maxAmount: metalFieldCapacities[field.id] ?? 2600,
  }));

  return {
    mapData,
    fishingZoneStates,
    resourceFields,
    economyState: {
      metal: FIRST_SKIRMISH_BALANCE.playerStartingMetal,
      cash: FIRST_SKIRMISH_BALANCE.playerStartingCash,
    },
    aiEconomyState: {
      metal: FIRST_SKIRMISH_BALANCE.aiStartingMetal,
      cash: FIRST_SKIRMISH_BALANCE.aiStartingCash,
    },
    matchState: {
      outcome: 'running',
      reason: 'Skirmish in progress.',
    },
    matchStats: {
      cashEarned: 0,
      fishSold: 0,
      metalHarvested: 0,
      playerUnitsLost: 0,
      playerBuildingsLost: 0,
      enemyUnitsDestroyed: 0,
      enemyBuildingsDestroyed: 0,
    },
    crewState: {
      capacity: 10,
    },
    entities: [
      {
        id: 'player-factory',
        name: 'Factory Command Center',
        kind: 'factory',
        faction: 'player',
        x: 767,
        y: 825,
        rotation: 0,
        selectable: true,
        commandable: true,
        collider: { kind: 'rect', width: 315, height: 210 },
        movement: { speed: 0, state: 'idle' },
        path: [],
        economy: { health: buildingCatalog.factory.health, productionQueue: [], dropOff: ['metal'], reelWorkshop: { reelProgressSeconds: 0, reelInventory: 0, autoSell: false } },
        animation: { state: 'idle', frame: 0 },
        renderable: { layer: 'buildings', tint: 0x4f8fc5 },
      },
      {
        id: 'enemy-factory',
        name: 'Rival Cannery',
        kind: 'enemyFactory',
        faction: 'enemy',
        x: 6280,
        y: 850,
        rotation: 0,
        selectable: true,
        commandable: false,
        collider: { kind: 'rect', width: 315, height: 210 },
        movement: { speed: 0, state: 'idle' },
        path: [],
        economy: { health: buildingCatalog.factory.health, productionQueue: [], dropOff: ['metal'], reelWorkshop: { reelProgressSeconds: 0, reelInventory: 0, autoSell: true } },
        animation: { state: 'idle', frame: 0 },
        renderable: { layer: 'buildings', tint: 0x98524b },
      },
      createEnemyWorkerEntity('enemy-worker-1', 'Worker', 6080, 970),
      createEnemyWorkerEntity('enemy-worker-2', 'Worker', 6160, 1010),
      createEnemyWorkerEntity('enemy-worker-3', 'Worker', 6240, 970),
      createEnemyTruckEntity('enemy-truck-1', 'Hauler', 6500, 1110),
      createEnemyGuardEntity('enemy-guard-1', 'Guard', 6040, 760),
      createEnemyAttackBoatEntity('enemy-skiff', 'Skiff', 2705, 438),
      createWorkerEntity('worker-1', 'Dockyard Worker', 760, 1000),
      createWorkerEntity('worker-2', 'Factory Worker', 850, 695),
      createWorkerEntity('worker-3', 'Harbor Worker', 920, 1000),
      createTruckEntity('truck-1', 'Metal Hauler', 480, 917),
      createGuardEntity('guard-1', 'Harbor Guard', 1480, 705),
    ],
  };
}
