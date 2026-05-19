import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { clamp } from '../core/math';
import type { GameEntity } from '../entities/components';
import type { FishingZoneData } from './mapTypes';

type Point = { x: number; y: number };
type DestinationValidator = (worldX: number, worldY: number) => boolean;

export function getDockSpawnPoint(dock: GameEntity, isValidWaterDestination: DestinationValidator): Point {
  return findNearestWaterPoint(dock.x, dock.y, getDockProbeRadii(dock), isValidWaterDestination, {
    x: clamp(dock.x, 60, WORLD_WIDTH - 60),
    y: clamp(dock.y - 128, 60, WORLD_HEIGHT - 60),
  });
}

export function getFishingInteractionPoint(zone: FishingZoneData, isValidWaterDestination: DestinationValidator): Point {
  return findNearestWaterPoint(zone.x, zone.y, [0, zone.radius * 0.12, zone.radius * 0.24], isValidWaterDestination, {
    x: zone.x,
    y: zone.y,
  });
}

export function getWorkerFishingPoint(zone: FishingZoneData, isValidLandDestination: DestinationValidator): Point {
  return findNearestLandPoint(zone.x, zone.y, [zone.radius + 18, zone.radius + 42, zone.radius + 74], isValidLandDestination, {
    x: clamp(zone.x, 120, WORLD_WIDTH - 120),
    y: clamp(zone.y + zone.radius + 32, 120, WORLD_HEIGHT - 120),
  });
}

export function getDockLandDropOffPoint(dock: GameEntity, isValidLandDestination: DestinationValidator): Point {
  const defaultOffset = dock.collider.kind === 'rect' ? dock.collider.height + 24 : 72;
  return findNearestLandPoint(dock.x, dock.y, getDockProbeRadii(dock), isValidLandDestination, {
    x: clamp(dock.x, 80, WORLD_WIDTH - 80),
    y: clamp(dock.y + defaultOffset, 80, WORLD_HEIGHT - 80),
  });
}

export function getDockUnloadPoint(dock: GameEntity, isValidWaterDestination: DestinationValidator): Point {
  return findNearestWaterPoint(dock.x, dock.y, getDockProbeRadii(dock), isValidWaterDestination, {
    x: dock.x,
    y: clamp(dock.y - 104, 60, WORLD_HEIGHT - 60),
  });
}

export function getConstructionWorkPoint(site: GameEntity, isValidLandDestination: DestinationValidator): Point {
  return getConstructionWorkPoints(site, isValidLandDestination)[0];
}

export function getConstructionWorkPoints(site: GameEntity, isValidLandDestination: DestinationValidator): Point[] {
  if (site.collider.kind !== 'rect') {
    return [{ x: site.x, y: site.y + 52 }];
  }

  const halfWidth = site.collider.width / 2;
  const halfHeight = site.collider.height / 2;
  const edgeOffset = 56;
  const primaryLandSide = getPrimaryLandSide(site.rotation);
  const orderedSides = [primaryLandSide, ...(['north', 'south', 'east', 'west'] as const).filter((side) => side !== primaryLandSide)];
  const distanceOptions = [edgeOffset, edgeOffset + 24, edgeOffset + 52];
  const candidates: Point[] = [];

  for (const distance of distanceOptions) {
    for (const side of orderedSides) {
      for (const candidate of getConstructionSideCandidates(site.x, site.y, halfWidth, halfHeight, side, distance)) {
        if (isValidLandDestination(candidate.x, candidate.y)) {
          candidates.push(candidate);
        }
      }
    }
  }

  const fallback = findNearestLandPoint(site.x, site.y, [Math.max(halfWidth, halfHeight) + 18, Math.max(halfWidth, halfHeight) + 48, Math.max(halfWidth, halfHeight) + 84], isValidLandDestination, {
    x: site.x,
    y: site.y + halfHeight + edgeOffset,
  });
  candidates.push(fallback);

  const unique = new Map<string, Point>();
  for (const candidate of candidates) {
    unique.set(`${Math.round(candidate.x)}:${Math.round(candidate.y)}`, candidate);
  }
  return [...unique.values()];
}

export function getDockProbeRadii(dock: GameEntity): number[] {
  if (dock.collider.kind === 'rect') {
    const halfExtent = Math.max(dock.collider.width, dock.collider.height) * 0.55;
    return [halfExtent + 18, halfExtent + 42, halfExtent + 78];
  }
  return [72, 112, 156];
}

function findNearestWaterPoint(
  originX: number,
  originY: number,
  radii: number[],
  isValidWaterDestination: DestinationValidator,
  fallback: Point,
): Point {
  return findNearestValidPoint(originX, originY, radii, isValidWaterDestination, fallback);
}

function findNearestLandPoint(
  originX: number,
  originY: number,
  radii: number[],
  isValidLandDestination: DestinationValidator,
  fallback: Point,
): Point {
  return findNearestValidPoint(originX, originY, radii, isValidLandDestination, fallback);
}

function getPrimaryLandSide(rotation: number): 'north' | 'south' | 'east' | 'west' {
  if (Math.abs(rotation - Math.PI / 2) < 0.001) return 'west';
  if (Math.abs(rotation + Math.PI / 2) < 0.001) return 'east';
  if (Math.abs(rotation - Math.PI) < 0.001) return 'north';
  return 'south';
}

function getConstructionSideCandidates(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  side: 'north' | 'south' | 'east' | 'west',
  distance: number,
): Point[] {
  const lateralOffsets = [0, -0.36, 0.36, -0.72, 0.72];
  if (side === 'north' || side === 'south') {
    const sideY = side === 'north' ? y - halfHeight - distance : y + halfHeight + distance;
    return lateralOffsets.map((offset) => ({ x: x + halfWidth * offset, y: sideY }));
  }
  const sideX = side === 'east' ? x + halfWidth + distance : x - halfWidth - distance;
  return lateralOffsets.map((offset) => ({ x: sideX, y: y + halfHeight * offset }));
}

function findNearestValidPoint(
  originX: number,
  originY: number,
  radii: number[],
  predicate: DestinationValidator,
  fallback: Point,
): Point {
  const safeFallback = {
    x: clamp(fallback.x, 40, WORLD_WIDTH - 40),
    y: clamp(fallback.y, 40, WORLD_HEIGHT - 40),
  };
  if (predicate(safeFallback.x, safeFallback.y)) {
    return safeFallback;
  }

  let best: { x: number; y: number; distance: number } | null = null;
  const angleStep = Math.PI / 8;
  for (const radius of radii) {
    for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
      const candidateX = clamp(originX + Math.cos(angle) * radius, 40, WORLD_WIDTH - 40);
      const candidateY = clamp(originY + Math.sin(angle) * radius, 40, WORLD_HEIGHT - 40);
      if (!predicate(candidateX, candidateY)) {
        continue;
      }
      const distance = Math.hypot(candidateX - originX, candidateY - originY);
      if (!best || distance < best.distance) {
        best = { x: candidateX, y: candidateY, distance };
      }
    }
  }

  return best ? { x: best.x, y: best.y } : safeFallback;
}
