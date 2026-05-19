import { UNIT_BLOCKER_PADDING, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import type { CoastalMapData, FishingZoneData, RectData, ResourceField, TerrainKind } from './mapTypes';

export const WATER_MIN_Y = 55;
export const WATER_MAX_Y = 428;

export function isValidLandDestination(mapData: CoastalMapData, worldX: number, worldY: number): boolean {
  if (!isWithinWorld(worldX, worldY)) {
    return false;
  }

  const terrain = getTerrainAt(mapData, worldX, worldY);
  if (!terrain || (terrain.kind !== 'land' && terrain.kind !== 'road')) {
    return false;
  }

  return !isBlocked(mapData, worldX, worldY);
}

export function isValidWaterDestination(mapData: CoastalMapData, worldX: number, worldY: number): boolean {
  if (!isWithinWorld(worldX, worldY)) {
    return false;
  }

  const terrain = getTerrainAt(mapData, worldX, worldY);
  if (!terrain || terrain.kind !== 'water') {
    return false;
  }

  return !isBlocked(mapData, worldX, worldY);
}

export function pickResourceFieldAt(resourceFields: ResourceField[], worldX: number, worldY: number): ResourceField | null {
  return resourceFields.find((field) => field.amount > 0 && Math.hypot(worldX - field.x, worldY - field.y) <= field.radius * 1.18) ?? null;
}

export function pickFishingZoneAt(mapData: CoastalMapData, worldX: number, worldY: number): FishingZoneData | null {
  return mapData.fishingZones.find((zone) => Math.hypot(worldX - zone.x, worldY - zone.y) <= zone.radius) ?? null;
}

function isWithinWorld(worldX: number, worldY: number): boolean {
  return !(worldX < 0 || worldY < 0 || worldX > WORLD_WIDTH || worldY > WORLD_HEIGHT);
}

function getTerrainAt(mapData: CoastalMapData, worldX: number, worldY: number): (RectData & { kind: TerrainKind }) | undefined {
  return mapData.terrain.find(
    (tile) =>
      worldX >= tile.x &&
      worldX <= tile.x + tile.width &&
      worldY >= tile.y &&
      worldY <= tile.y + tile.height,
  );
}

function isBlocked(mapData: CoastalMapData, worldX: number, worldY: number): boolean {
  return mapData.blockers.some(
    (blocker) => {
      const inset = getBlockerCollisionInset(blocker.kind, blocker.width, blocker.height);
      return (
        worldX >= blocker.x - UNIT_BLOCKER_PADDING + inset.x &&
        worldX <= blocker.x + blocker.width + UNIT_BLOCKER_PADDING - inset.x &&
        worldY >= blocker.y - UNIT_BLOCKER_PADDING + inset.y &&
        worldY <= blocker.y + blocker.height + UNIT_BLOCKER_PADDING - inset.y
      );
    },
  );
}

function getBlockerCollisionInset(
  kind: CoastalMapData['blockers'][number]['kind'],
  width: number,
  height: number,
): { x: number; y: number } {
  switch (kind) {
    case 'cliff':
      return { x: Math.min(28, width * 0.12), y: Math.min(20, height * 0.12) };
    case 'ridge':
      return { x: Math.min(24, width * 0.1), y: Math.min(18, height * 0.1) };
    case 'rocks':
      return { x: Math.min(16, width * 0.08), y: Math.min(14, height * 0.08) };
    case 'marsh':
      return { x: Math.min(12, width * 0.06), y: Math.min(12, height * 0.06) };
    case 'forest':
    default:
      return { x: 8, y: 8 };
  }
}
