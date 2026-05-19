import { buildingCatalog, type BuildingPlanKind } from '../data/buildings';
import type { GameEntity } from './components';

export function createWorkerEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'worker',
    faction: 'player',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: { kind: 'circle', radius: 27 },
    movement: { speed: 150, state: 'idle' },
    path: [],
    economy: { health: 85, cargo: { kind: 'fish', amount: 0, capacity: 30 } },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xa9dfff },
  };
}

export function createGuardEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'guard',
    faction: 'player',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: { kind: 'circle', radius: 28 },
    movement: { speed: 145, state: 'idle' },
    path: [],
    economy: { health: 110 },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0x7fc7ff },
  };
}

export function createSaboteurEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'saboteur',
    faction: 'player',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: { kind: 'circle', radius: 24 },
    movement: { speed: 165, state: 'idle' },
    path: [],
    economy: { health: 75 },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xffd166 },
  };
}

export function createTruckEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'truck',
    faction: 'player',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: { kind: 'rect', width: 74, height: 48 },
    movement: { speed: 95, state: 'idle' },
    path: [],
    economy: { health: 140, cargo: { kind: 'metal', amount: 0, capacity: 55 } },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0x5ca7ef },
  };
}

export function createEnemyWorkerEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name: `Rival ${name}`,
    kind: 'worker',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'circle', radius: 26 },
    movement: { speed: 145, state: 'idle' },
    path: [],
    economy: { health: 85, cargo: { kind: 'fish', amount: 0, capacity: 30 } },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xd87572 },
  };
}

export function createEnemyGuardEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name: `Rival ${name}`,
    kind: 'guard',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'circle', radius: 27 },
    movement: { speed: 140, state: 'idle' },
    path: [],
    economy: { health: 110 },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xcf6b61 },
  };
}

export function createEnemySaboteurEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name: `Rival ${name}`,
    kind: 'saboteur',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'circle', radius: 24 },
    movement: { speed: 160, state: 'idle' },
    path: [],
    economy: { health: 75 },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xd78c62 },
  };
}

export function createEnemyTruckEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name: `Rival ${name}`,
    kind: 'truck',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width: 74, height: 48 },
    movement: { speed: 92, state: 'idle' },
    path: [],
    economy: { health: 140, cargo: { kind: 'metal', amount: 0, capacity: 55 } },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xbc655d },
  };
}

export function createEnemyBoatEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name: `Rival ${name}`,
    kind: 'boat',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width: 86, height: 46 },
    movement: { speed: 68, state: 'idle' },
    path: [],
    economy: { cargo: { kind: 'fish', amount: 0, capacity: 45 }, combatRole: 'fishing' },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xc05e5b },
  };
}

export function createEnemyGuardTowerEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'guardTower',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width: buildingCatalog.guardTower.width, height: buildingCatalog.guardTower.height },
    movement: { speed: 0, state: 'idle' },
    path: [],
    economy: {
      health: buildingCatalog.guardTower.health,
      construction: {
        building: 'guardTower',
        progressSeconds: buildingCatalog.guardTower.seconds,
        totalSeconds: buildingCatalog.guardTower.seconds,
        complete: true,
        capacityBonus: 0,
      },
    },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'buildings', tint: 0x98524b },
  };
}

export function createEnemyAttackBoatEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name: `Rival ${name}`,
    kind: 'boat',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width: 92, height: 48 },
    movement: { speed: 78, state: 'idle' },
    path: [],
    economy: { health: 155, combatRole: 'attack' },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0xbd655d },
  };
}

export function createBoatEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'boat',
    faction: 'player',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: { kind: 'rect', width: 86, height: 46 },
    movement: { speed: 68, state: 'idle' },
    path: [],
    economy: { health: 125, cargo: { kind: 'fish', amount: 0, capacity: 45 }, combatRole: 'fishing' },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0x54b7c8 },
  };
}

export function createAttackBoatEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'boat',
    faction: 'player',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: true,
    collider: { kind: 'rect', width: 92, height: 48 },
    movement: { speed: 78, state: 'idle' },
    path: [],
    economy: { health: 155, combatRole: 'attack' },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'units', tint: 0x7fc7ff },
  };
}

export function createEnemyDockEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'dock',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width: 260, height: 86 },
    movement: { speed: 0, state: 'idle' },
    path: [],
    economy: {
      health: buildingCatalog.dock.health,
      productionQueue: [],
      construction: {
        building: 'dock',
        progressSeconds: buildingCatalog.dock.seconds,
        totalSeconds: buildingCatalog.dock.seconds,
        complete: true,
        capacityBonus: 0,
      },
    },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'buildings', tint: 0x8f5449 },
  };
}

export function createEnemyBarracksEntity(id: string, name: string, x: number, y: number): GameEntity {
  return {
    id,
    name,
    kind: 'barracks',
    faction: 'enemy',
    x,
    y,
    rotation: 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width: buildingCatalog.barracks.width, height: buildingCatalog.barracks.height },
    movement: { speed: 0, state: 'idle' },
    path: [],
    economy: {
      health: buildingCatalog.barracks.health,
      productionQueue: [],
      construction: {
        building: 'barracks',
        progressSeconds: buildingCatalog.barracks.seconds,
        totalSeconds: buildingCatalog.barracks.seconds,
        complete: true,
        capacityBonus: 0,
      },
    },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'buildings', tint: 0x92564d },
  };
}

export function createConstructionSite(
  id: string,
  building: BuildingPlanKind,
  x: number,
  y: number,
  builderId: string,
  options?: { width?: number; height?: number; rotation?: number; faction?: GameEntity['faction']; name?: string; tint?: number; autoSellReels?: boolean },
): GameEntity {
  const definition = buildingCatalog[building];
  const faction = options?.faction ?? 'player';
  const productionQueue =
    building === 'dock' || building === 'barracks' || building === 'factory'
      ? []
      : undefined;
  const width = options?.width ?? definition.width;
  const height = options?.height ?? definition.height;
  return {
    id,
    name: options?.name ?? definition.label,
    kind: building,
    faction,
    x,
    y,
    rotation: options?.rotation ?? 0,
    selectable: true,
    commandable: false,
    collider: { kind: 'rect', width, height },
    movement: { speed: 0, state: 'idle' },
    path: [],
    economy: {
      health: Math.ceil(definition.health * 0.35),
      construction: {
        building,
        progressSeconds: 0,
        totalSeconds: definition.seconds,
        complete: false,
        builderId,
        capacityBonus: definition.capacityBonus,
      },
      productionQueue,
      dropOff: building === 'factory' ? ['metal'] : undefined,
      reelWorkshop: building === 'factory' ? { reelProgressSeconds: 0, reelInventory: 0, autoSell: options?.autoSellReels ?? false } : undefined,
      technologyLab: building === 'techLab' ? { levels: {} } : undefined,
    },
    animation: { state: 'idle', frame: 0 },
    renderable: { layer: 'buildings', tint: options?.tint ?? definition.tint },
  };
}
