import { buildingCatalog, type BuildingPlanKind } from '../data/buildings';
import type { GameEntity } from '../entities/components';
import { getEntityRect, rectCircleOverlap, rectsOverlap } from './geometry';
import type { CoastalMapData, RectData, ResourceField } from './mapTypes';

export interface BuildingPlacementPlan {
  building: BuildingPlanKind;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotation: number;
  footprint: RectData;
}

export interface PlacementValidationContext {
  mapData: CoastalMapData;
  resourceFields: ResourceField[];
  entities: GameEntity[];
}

export interface PlacementValidationResult {
  valid: boolean;
  reason: string;
  plan?: BuildingPlacementPlan;
}

export function describePlacementReason(reason: string): string {
  switch (reason) {
    case 'outside buildable area':
      return 'outside your buildable area';
    case 'water or shoreline':
      return 'wrong terrain';
    case 'requires shoreline':
      return 'wrong terrain (shoreline required)';
    case 'resource field overlap':
      return 'resource field in the way';
    case 'unit or building overlap':
      return 'occupied by a unit or building';
    default:
      return reason;
  }
}

export function validateBuildingPlacement(
  context: PlacementValidationContext,
  building: BuildingPlanKind,
  centerX: number,
  centerY: number,
): PlacementValidationResult {
  const plan = resolveBuildingPlacementPlan(context.mapData, building, centerX, centerY);
  const footprint = plan.footprint;
  if (building === 'dock') {
    return validateDockPlacement(context, plan);
  }
  if (!isFootprintOnLand(context.mapData, footprint)) {
    return { valid: false, reason: 'water or shoreline', plan };
  }
  return validateCommonFootprintBlockers(context, plan);
}

export function getBuildingFootprint(building: BuildingPlanKind, centerX: number, centerY: number): RectData {
  return resolveBuildingPlacementPlan(undefined, building, centerX, centerY).footprint;
}

export function resolveBuildingPlacementPlan(
  mapData: CoastalMapData | undefined,
  building: BuildingPlanKind,
  centerX: number,
  centerY: number,
): BuildingPlacementPlan {
  const definition = buildingCatalog[building];
  if (building === 'dock' && mapData) {
    return resolveDockPlacementPlan(mapData, centerX, centerY, definition.width, definition.height);
  }
  return {
    building,
    centerX,
    centerY,
    width: definition.width,
    height: definition.height,
    rotation: 0,
    footprint: {
      id: `${building}-footprint`,
      x: centerX - definition.width / 2,
      y: centerY - definition.height / 2,
      width: definition.width,
      height: definition.height,
    },
  };
}

function createPlacementPlan(building: BuildingPlanKind, centerX: number, centerY: number, width: number, height: number, rotation: number): BuildingPlacementPlan {
  return {
    building,
    centerX,
    centerY,
    width,
    height,
    rotation,
    footprint: {
      id: `${building}-footprint`,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    },
  };
}

function validateDockPlacement(context: PlacementValidationContext, plan: BuildingPlacementPlan): PlacementValidationResult {
  if (!isDockFootprintOnShoreline(context.mapData, plan)) {
    return { valid: false, reason: 'requires shoreline', plan };
  }
  return validateCommonFootprintBlockers(context, plan);
}

function validateCommonFootprintBlockers(context: PlacementValidationContext, plan: BuildingPlacementPlan): PlacementValidationResult {
  const footprint = plan.footprint;
  if (context.mapData.blockers.some((blocker) => rectsOverlap(footprint, blocker))) {
    return { valid: false, reason: 'blocked terrain', plan };
  }
  if (context.resourceFields.some((field) => field.amount > 0 && rectCircleOverlap(footprint, field))) {
    return { valid: false, reason: 'resource field overlap', plan };
  }
  if (
    context.entities
      .filter((entity) => entity.renderable.layer === 'buildings' || entity.movement.speed <= 0)
      .some((entity) => rectsOverlap(footprint, getEntityRect(entity)))
  ) {
    return { valid: false, reason: 'unit or building overlap', plan };
  }
  return { valid: true, reason: 'valid', plan };
}

function isFootprintOnLand(mapData: CoastalMapData, footprint: RectData): boolean {
  return mapData.terrain.some(
    (tile) =>
      (tile.kind === 'land' || tile.kind === 'road') &&
      footprint.x >= tile.x &&
      footprint.y >= tile.y &&
      footprint.x + footprint.width <= tile.x + tile.width &&
      footprint.y + footprint.height <= tile.y + tile.height,
  );
}

function isDockFootprintOnShoreline(mapData: CoastalMapData, plan: BuildingPlacementPlan): boolean {
  const footprint = plan.footprint;
  const overlapsShore = mapData.terrain.some((tile) => tile.kind === 'shore' && rectsOverlap(footprint, tile));
  if (!overlapsShore) {
    return false;
  }
  const sideSurvey = surveyDockSides(mapData, footprint);
  const waterSide = rotationToWaterSide(plan.rotation);
  const opposite = oppositeSide(waterSide);
  return sideSurvey[waterSide].waterHits > 0 && sideSurvey[opposite].landHits > 0;
}

function resolveDockPlacementPlan(mapData: CoastalMapData, centerX: number, centerY: number, width: number, height: number): BuildingPlacementPlan {
  const candidates: Array<Pick<BuildingPlacementPlan, 'width' | 'height' | 'rotation'>> = [
    { width, height, rotation: 0 },
    { width, height, rotation: Math.PI },
    { width: height, height: width, rotation: Math.PI / 2 },
    { width: height, height: width, rotation: -Math.PI / 2 },
  ];

  let bestPlan = createPlacementPlan('dock', centerX, centerY, width, height, 0);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const plan = createPlacementPlan('dock', centerX, centerY, candidate.width, candidate.height, candidate.rotation);
    const footprint = plan.footprint;
    const overlapsShore = mapData.terrain.some((tile) => tile.kind === 'shore' && rectsOverlap(footprint, tile));
    if (!overlapsShore) {
      continue;
    }
    const survey = surveyDockSides(mapData, footprint);
    const waterSide = rotationToWaterSide(plan.rotation);
    const landSide = oppositeSide(waterSide);
    const lateralSides = perpendicularSides(waterSide);
    const score =
      survey[waterSide].waterHits * 8 +
      survey[landSide].landHits * 8 +
      survey[waterSide].shoreHits * 2 +
      survey[landSide].shoreHits * 2 +
      lateralSides.reduce((sum, side) => sum + survey[side].shoreHits, 0);
    if (score > bestScore) {
      bestScore = score;
      bestPlan = plan;
    }
  }

  return bestPlan;
}

type SideName = 'north' | 'south' | 'east' | 'west';

function surveyDockSides(
  mapData: CoastalMapData,
  footprint: RectData,
): Record<SideName, { waterHits: number; landHits: number; shoreHits: number }> {
  const results: Record<SideName, { waterHits: number; landHits: number; shoreHits: number }> = {
    north: { waterHits: 0, landHits: 0, shoreHits: 0 },
    south: { waterHits: 0, landHits: 0, shoreHits: 0 },
    east: { waterHits: 0, landHits: 0, shoreHits: 0 },
    west: { waterHits: 0, landHits: 0, shoreHits: 0 },
  };
  const sampleGap = 26;
  const sideInset = 20;

  const accumulate = (side: SideName, x: number, y: number): void => {
    const tile = mapData.terrain.find(
      (candidate) =>
        x >= candidate.x &&
        x <= candidate.x + candidate.width &&
        y >= candidate.y &&
        y <= candidate.y + candidate.height,
    );
    if (!tile) {
      return;
    }
    if (tile.kind === 'water') {
      results[side].waterHits += 1;
    } else if (tile.kind === 'land' || tile.kind === 'road') {
      results[side].landHits += 1;
    } else if (tile.kind === 'shore') {
      results[side].shoreHits += 1;
    }
  };

  for (let x = footprint.x + 8; x <= footprint.x + footprint.width - 8; x += sampleGap) {
    accumulate('north', x, footprint.y - sideInset);
    accumulate('south', x, footprint.y + footprint.height + sideInset);
  }
  for (let y = footprint.y + 8; y <= footprint.y + footprint.height - 8; y += sampleGap) {
    accumulate('west', footprint.x - sideInset, y);
    accumulate('east', footprint.x + footprint.width + sideInset, y);
  }

  accumulate('north', footprint.x + footprint.width / 2, footprint.y - sideInset);
  accumulate('south', footprint.x + footprint.width / 2, footprint.y + footprint.height + sideInset);
  accumulate('west', footprint.x - sideInset, footprint.y + footprint.height / 2);
  accumulate('east', footprint.x + footprint.width + sideInset, footprint.y + footprint.height / 2);
  return results;
}

function rotationToWaterSide(rotation: number): SideName {
  if (Math.abs(rotation - Math.PI / 2) < 0.001) return 'east';
  if (Math.abs(rotation + Math.PI / 2) < 0.001) return 'west';
  if (Math.abs(rotation - Math.PI) < 0.001) return 'south';
  return 'north';
}

function oppositeSide(side: SideName): SideName {
  switch (side) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east': return 'west';
    case 'west':
    default: return 'east';
  }
}

function perpendicularSides(side: SideName): SideName[] {
  return side === 'north' || side === 'south' ? ['east', 'west'] : ['north', 'south'];
}
