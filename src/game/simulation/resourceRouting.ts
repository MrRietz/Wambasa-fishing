import { WORLD_WIDTH } from '../config/constants';
import { clamp } from '../core/math';
import type { GameEntity } from '../entities/components';
import type { FishingZoneData, FishingZoneState, ResourceField } from '../map/mapTypes';

export interface PathPoint {
  x: number;
  y: number;
}

export interface RoutedAssignment<T extends GameEntity = GameEntity> {
  entity: T;
  path: PathPoint[];
  target: PathPoint;
}

export type LandPathfinder = (start: PathPoint, goal: PathPoint) => PathPoint[];
export type WaterPathfinder = (start: PathPoint, goal: PathPoint) => PathPoint[];
export type EntityLandPathfinder = (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];

const TRUCK_FORMATION_SPACING = 88;
const TRUCK_LANE_Y_OFFSET = 22;
const WORKER_SHORE_SPACING = 52;
const BOAT_ZONE_SPACING = 104;
const BOAT_DOCK_SPACING = 112;

export function planTruckHarvestAssignments(
  trucks: GameEntity[],
  field: ResourceField,
  findLandPath: EntityLandPathfinder,
  getResourceInteractionPoint: (field: ResourceField) => PathPoint,
): RoutedAssignment[] | null {
  const candidateTargets = getResourceInteractionCandidates(field, getResourceInteractionPoint);
  const plannedMoves = trucks.map((entity) => {
    const spread = getStableSpreadOffset(entity.id, trucks.length > 1 ? TRUCK_FORMATION_SPACING : 0, TRUCK_LANE_Y_OFFSET);
    for (const candidateTarget of candidateTargets) {
      const truckTarget = { x: candidateTarget.x + spread.x, y: candidateTarget.y + spread.y };
      const path = findLandPath(entity, { x: entity.x, y: entity.y }, truckTarget);
      if (path.length > 0) {
        return { entity, path, target: truckTarget };
      }
    }
    return { entity, path: [] as PathPoint[], target: candidateTargets[0] };
  });

  const reachableMoves = plannedMoves.filter((move) => move.path.length > 0);
  return reachableMoves.length > 0 ? reachableMoves : null;
}

export function planTruckReturnToField(
  truck: GameEntity,
  field: ResourceField,
  findLandPath: LandPathfinder,
): Omit<RoutedAssignment, 'entity'> | null {
  for (const target of getTruckFieldReturnTargets(truck, field)) {
    const path = findLandPath({ x: truck.x, y: truck.y }, target);
    if (path.length > 0) {
      return { path, target };
    }
  }
  return null;
}

export function planWorkerShoreFishingAssignments(
  workers: GameEntity[],
  zone: FishingZoneData | FishingZoneState,
  findLandPath: EntityLandPathfinder,
  getWorkerFishingPoint: (zone: FishingZoneData | FishingZoneState) => PathPoint,
): RoutedAssignment[] | null {
  const basePoint = getWorkerFishingPoint(zone);
  const candidateTargets: PathPoint[] = [
    basePoint,
    { x: basePoint.x - 72, y: basePoint.y },
    { x: basePoint.x + 72, y: basePoint.y },
    { x: basePoint.x - 132, y: basePoint.y + 8 },
    { x: basePoint.x + 132, y: basePoint.y + 8 },
  ];
  const plannedMoves = workers.map((entity, index) => {
    const spread = getStableSpreadOffset(entity.id, workers.length > 1 ? WORKER_SHORE_SPACING : 0, 14);
    for (const candidateTarget of candidateTargets) {
      const target = { x: candidateTarget.x + spread.x + (index - (workers.length - 1) / 2) * 22, y: candidateTarget.y + spread.y };
      const path = findLandPath(entity, { x: entity.x, y: entity.y }, target);
      if (path.length > 0) {
        return { entity, path, target };
      }
    }
    return { entity, path: [] as PathPoint[], target: basePoint };
  });

  const reachableMoves = plannedMoves.filter((move) => move.path.length > 0);
  return reachableMoves.length > 0 ? reachableMoves : null;
}

export function planBoatFishingAssignments(
  boats: GameEntity[],
  zone: FishingZoneData | FishingZoneState,
  findWaterPath: WaterPathfinder,
  getFishingInteractionPoint: (zone: FishingZoneData | FishingZoneState) => PathPoint,
): RoutedAssignment[] | null {
  const interactionPoint = getFishingInteractionPoint(zone);
  const target = {
    x: clamp(interactionPoint.x, 60, WORLD_WIDTH - 60),
    y: interactionPoint.y,
  };
  const plannedMoves = boats.map((entity, index) => {
    const spread = getStableSpreadOffset(entity.id, boats.length > 1 ? BOAT_ZONE_SPACING : 0, 18);
    const candidateTargets: PathPoint[] = [
      {
        x: clamp(target.x + (index - (boats.length - 1) / 2) * BOAT_ZONE_SPACING + spread.x * 0.22, 60, WORLD_WIDTH - 60),
        y: target.y + (index % 2) * 14 + spread.y * 0.28,
      },
      { x: clamp(target.x + spread.x * 0.16, 60, WORLD_WIDTH - 60), y: target.y + spread.y * 0.22 },
      { x: target.x, y: target.y },
    ];
    for (const candidateTarget of candidateTargets) {
      const path = findWaterPath({ x: entity.x, y: entity.y }, candidateTarget);
      if (path.length > 0) {
        return { entity, path, target: candidateTarget };
      }
    }
    return { entity, path: [] as PathPoint[], target };
  });

  return plannedMoves.some((move) => move.path.length === 0) ? null : plannedMoves;
}

export function planBoatDockAssignments(boats: GameEntity[], target: PathPoint, findWaterPath: WaterPathfinder): RoutedAssignment[] | null {
  const plannedMoves = boats.map((entity, index) => {
    const spread = getStableSpreadOffset(entity.id, boats.length > 1 ? BOAT_DOCK_SPACING : 0, 14);
    const candidateTargets: PathPoint[] = [
      {
        x: clamp(target.x + (index - (boats.length - 1) / 2) * BOAT_DOCK_SPACING + spread.x * 0.2, 60, WORLD_WIDTH - 60),
        y: target.y + spread.y * 0.26,
      },
      {
        x: clamp(target.x + spread.x * 0.12, 60, WORLD_WIDTH - 60),
        y: target.y + spread.y * 0.18,
      },
      target,
    ];
    for (const candidateTarget of candidateTargets) {
      const path = findWaterPath({ x: entity.x, y: entity.y }, candidateTarget);
      if (path.length > 0) {
        return { entity, path, target: candidateTarget };
      }
    }
    return { entity, path: [] as PathPoint[], target };
  });

  return plannedMoves.some((move) => move.path.length === 0) ? null : plannedMoves;
}

export function planSingleBoatDockAssignment(
  boat: GameEntity,
  target: PathPoint,
  findWaterPath: WaterPathfinder,
): Omit<RoutedAssignment, 'entity'> | null {
  const spread = getStableSpreadOffset(boat.id, BOAT_DOCK_SPACING * 0.28, 12);
  const candidateTargets: PathPoint[] = [
    {
      x: clamp(target.x + spread.x, 60, WORLD_WIDTH - 60),
      y: target.y + spread.y,
    },
    target,
  ];
  for (const candidateTarget of candidateTargets) {
    const path = findWaterPath({ x: boat.x, y: boat.y }, candidateTarget);
    if (path.length > 0) {
      return { path, target: candidateTarget };
    }
  }
  return null;
}

function getResourceInteractionCandidates(
  field: ResourceField,
  getResourceInteractionPoint: (field: ResourceField) => PathPoint,
): PathPoint[] {
  const nearOffset = field.radius + 42;
  const farOffset = field.radius + 74;
  const candidates: PathPoint[] = [
    getResourceInteractionPoint(field),
    { x: field.x + nearOffset, y: field.y },
    { x: field.x - nearOffset, y: field.y },
    { x: field.x, y: field.y + nearOffset },
    { x: field.x, y: field.y - nearOffset },
    { x: field.x + farOffset, y: field.y },
    { x: field.x - farOffset, y: field.y },
    { x: field.x, y: field.y + farOffset },
    { x: field.x, y: field.y - farOffset },
    { x: field.x + nearOffset * 0.82, y: field.y + nearOffset * 0.62 },
    { x: field.x - nearOffset * 0.82, y: field.y + nearOffset * 0.62 },
    { x: field.x + nearOffset * 0.82, y: field.y - nearOffset * 0.62 },
    { x: field.x - nearOffset * 0.82, y: field.y - nearOffset * 0.62 },
    { x: field.x + farOffset * 0.8, y: field.y + farOffset * 0.58 },
    { x: field.x - farOffset * 0.8, y: field.y + farOffset * 0.58 },
    { x: field.x + farOffset * 0.8, y: field.y - farOffset * 0.58 },
    { x: field.x - farOffset * 0.8, y: field.y - farOffset * 0.58 },
  ];
  const unique = new Map<string, PathPoint>();
  for (const candidate of candidates) {
    unique.set(`${Math.round(candidate.x)}:${Math.round(candidate.y)}`, candidate);
  }
  return [...unique.values()];
}

function getTruckFieldReturnTargets(truck: GameEntity, field: ResourceField): PathPoint[] {
  const hash = Array.from(truck.id).reduce((total, char) => total + char.charCodeAt(0), 0);
  const side = truck.faction === 'enemy' ? -1 : 1;
  const laneY = ((hash % 3) - 1) * TRUCK_LANE_Y_OFFSET;
  const nearOffset = field.radius + 42;
  const farOffset = field.radius + 76;
  return [
    { x: field.x + side * nearOffset, y: field.y + laneY },
    { x: field.x + nearOffset, y: field.y + laneY },
    { x: field.x - nearOffset, y: field.y + laneY },
    { x: field.x, y: field.y + nearOffset + laneY * 0.35 },
    { x: field.x, y: field.y - nearOffset + laneY * 0.35 },
    { x: field.x + side * farOffset, y: field.y + laneY * 0.8 },
    { x: field.x + farOffset, y: field.y + laneY * 0.8 },
    { x: field.x - farOffset, y: field.y + laneY * 0.8 },
    { x: field.x + farOffset * 0.78, y: field.y + farOffset * 0.54 + laneY * 0.25 },
    { x: field.x - farOffset * 0.78, y: field.y + farOffset * 0.54 + laneY * 0.25 },
    { x: field.x + farOffset * 0.78, y: field.y - farOffset * 0.54 + laneY * 0.25 },
    { x: field.x - farOffset * 0.78, y: field.y - farOffset * 0.54 + laneY * 0.25 },
  ];
}

function getStableSpreadOffset(entityId: string, spacing: number, verticalSpacing: number): { x: number; y: number } {
  const hash = Array.from(entityId).reduce((total, char) => total + char.charCodeAt(0), 0);
  const laneX = (hash % 3) - 1;
  const laneY = (Math.floor(hash / 3) % 3) - 1;
  return { x: laneX * spacing, y: laneY * verticalSpacing };
}
