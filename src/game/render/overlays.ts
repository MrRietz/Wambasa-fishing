import { Graphics } from 'pixi.js';
import { GUARD_TOWER_RANGE, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { buildingCatalog } from '../data/buildings';
import type { GameEntity, PlacementMode, RallyPoint } from '../entities/components';
import type { RtsDebugState } from '../debug/debugState';
import type { CoastalMapData, FishingZoneState, ResourceField } from '../map/mapTypes';
import type { RenderLayers } from './layers';

export interface SelectionDragState {
  active: boolean;
  startWorldX: number;
  startWorldY: number;
  currentScreenX: number;
  currentScreenY: number;
}

export interface CombatTargetingPreview {
  active: boolean;
  hoverWorld?: { x: number; y: number };
  hoveredEntityId?: string;
  hoveredTargetValid: boolean;
  selectedAttackerIds: string[];
}

export interface ResourceInspectionTarget {
  kind: 'metal' | 'fish';
  id: string;
}

export function initializeWorldOverlays(layers: RenderLayers, mapData: CoastalMapData): void {
  const buildFootprints = new Graphics({ label: 'build-footprints-overlay' });
  for (const area of mapData.buildable) {
    const color = area.id.includes('player') ? 0x87e0a5 : area.id.includes('enemy') ? 0xe98174 : 0xe8d389;
    buildFootprints.roundRect(area.x, area.y, area.width, area.height, 18).stroke({ color, width: 4, alpha: 0.3 });
  }

  const selectionRings = new Graphics({ label: 'selection-rings-overlay' });
  const rallyPoints = new Graphics({ label: 'rally-points-overlay' });
  const destinationMarkers = new Graphics({ label: 'destination-markers-overlay' });
  const dragBox = new Graphics({ label: 'drag-box-overlay' });
  const placementPreview = new Graphics({ label: 'placement-preview-overlay' });
  const combatTargeting = new Graphics({ label: 'combat-targeting-overlay' });
  const inspectedTarget = new Graphics({ label: 'inspected-target-overlay' });

  const grid = new Graphics({ label: 'debug-grid-overlay' });
  for (let x = 0; x <= WORLD_WIDTH; x += 160) {
    grid.moveTo(x, 0).lineTo(x, WORLD_HEIGHT);
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 160) {
    grid.moveTo(0, y).lineTo(WORLD_WIDTH, y);
  }
  grid.stroke({ color: 0xffffff, width: 1, alpha: 0.08 });

  layers.overlays.addChild(buildFootprints, selectionRings, rallyPoints, destinationMarkers, dragBox, placementPreview, combatTargeting, inspectedTarget, grid);
}

export function drawSelectionOverlay(layers: RenderLayers, entities: GameEntity[], selectedEntityIds: Set<string>): void {
  const overlay = getOverlayGraphic(layers, 'selection-rings-overlay');
  const rallyOverlay = getOverlayGraphic(layers, 'rally-points-overlay');
  if (!overlay || !rallyOverlay) {
    return;
  }

  overlay.clear();
  rallyOverlay.clear();
  for (const entity of entities) {
    if (!selectedEntityIds.has(entity.id)) {
      continue;
    }
    if (entity.collider.kind === 'circle') {
      overlay.ellipse(entity.x, entity.y + entity.collider.radius * 0.62, entity.collider.radius * 1.45, entity.collider.radius * 0.62).stroke({
        color: 0xb8ff9e,
        width: 5,
        alpha: 0.9,
      });
    } else {
      overlay.roundRect(
        entity.x - entity.collider.width / 2 - 8,
        entity.y - entity.collider.height / 2 - 8,
        entity.collider.width + 16,
        entity.collider.height + 16,
        20,
      ).stroke({ color: 0xb8ff9e, width: 5, alpha: 0.88 });
      if (entity.kind === 'guardTower') {
        overlay.circle(entity.x, entity.y, GUARD_TOWER_RANGE).stroke({ color: 0xffd166, width: 4, alpha: 0.28 });
      }
    }

    if (isRallyBuilding(entity) && entity.economy?.rallyPoint) {
      drawRallyPointIndicator(rallyOverlay, entity, entity.economy.rallyPoint);
    }
  }
}

export function drawSelectionDragOverlay(
  layers: RenderLayers,
  selectionDrag: SelectionDragState | null | undefined,
  screenToWorldFromClient: (clientX: number, clientY: number) => { x: number; y: number },
): void {
  const overlay = getOverlayGraphic(layers, 'drag-box-overlay');
  if (!overlay) {
    return;
  }

  overlay.clear();
  if (!selectionDrag?.active) {
    return;
  }

  const currentWorld = screenToWorldFromClient(selectionDrag.currentScreenX, selectionDrag.currentScreenY);
  const left = Math.min(selectionDrag.startWorldX, currentWorld.x);
  const top = Math.min(selectionDrag.startWorldY, currentWorld.y);
  const width = Math.abs(currentWorld.x - selectionDrag.startWorldX);
  const height = Math.abs(currentWorld.y - selectionDrag.startWorldY);

  overlay.roundRect(left, top, width, height, 10).fill({ color: 0x94d7ff, alpha: 0.08 });
  overlay.roundRect(left, top, width, height, 10).stroke({ color: 0x94d7ff, width: 4, alpha: 0.65 });
}

export function drawDestinationOverlay(
  layers: RenderLayers,
  entities: GameEntity[],
  lastMoveCommand: RtsDebugState['lastMoveCommand'],
): void {
  const overlay = getOverlayGraphic(layers, 'destination-markers-overlay');
  if (!overlay) {
    return;
  }

  overlay.clear();
  if (!lastMoveCommand) {
    return;
  }

  const { x, y } = lastMoveCommand;
  for (const entityId of lastMoveCommand.entityIds) {
    const entity = entities.find((candidate) => candidate.id === entityId);
    if (!entity || entity.path.length === 0) {
      continue;
    }
    overlay.moveTo(entity.x, entity.y);
    for (const waypoint of entity.path) {
      overlay.lineTo(waypoint.x, waypoint.y);
    }
    overlay.stroke({ color: 0xf6d48a, width: 3, alpha: 0.42 });
  }

  overlay
    .moveTo(x - 30, y)
    .lineTo(x + 30, y)
    .moveTo(x, y - 30)
    .lineTo(x, y + 30)
    .stroke({ color: 0xf6d48a, width: 5, alpha: 0.86 })
    .circle(x, y, 24)
    .stroke({ color: 0xf6d48a, width: 4, alpha: 0.56 });
}

export function drawPlacementPreview(layers: RenderLayers, placementMode: PlacementMode | null): void {
  const overlay = getOverlayGraphic(layers, 'placement-preview-overlay');
  if (!overlay) {
    return;
  }

  overlay.clear();
  if (!placementMode) {
    return;
  }

  const definition = buildingCatalog[placementMode.building];
  const width = placementMode.width ?? definition.width;
  const height = placementMode.height ?? definition.height;
  const left = placementMode.x - width / 2;
  const top = placementMode.y - height / 2;
  const color = placementMode.valid ? 0x87e0a5 : 0xff6d5c;
  overlay.roundRect(left, top, width, height, 12).fill({ color, alpha: 0.16 });
  overlay.roundRect(left, top, width, height, 12).stroke({ color, width: 5, alpha: 0.86 });
  overlay.rect(left + 18, top + 20, Math.max(18, width - 36), Math.min(16, Math.max(8, height * 0.18))).fill({ color, alpha: 0.62 });
  if (placementMode.building === 'guardTower') {
    overlay.circle(placementMode.x, placementMode.y, GUARD_TOWER_RANGE).stroke({ color: 0xffd166, width: 4, alpha: 0.22 });
  }
}

export function drawCombatTargetingOverlay(
  layers: RenderLayers,
  entities: GameEntity[],
  preview: CombatTargetingPreview,
): void {
  const overlay = getOverlayGraphic(layers, 'combat-targeting-overlay');
  if (!overlay) {
    return;
  }

  overlay.clear();
  if (!preview.active) {
    return;
  }

  const hoveredEntity = preview.hoveredEntityId ? entities.find((entity) => entity.id === preview.hoveredEntityId) : undefined;
  for (const attackerId of preview.selectedAttackerIds) {
    const attacker = entities.find((entity) => entity.id === attackerId);
    if (!attacker) {
      continue;
    }
    const range =
      attacker.kind === 'boat'
        ? 112
        : attacker.kind === 'worker'
          ? 58
        : hoveredEntity?.kind === 'boat'
          ? 132
          : 70;
    overlay.circle(attacker.x, attacker.y, range).stroke({
      color: preview.hoveredTargetValid ? 0x79c4ff : 0xff9b7a,
      width: 3,
      alpha: preview.hoveredTargetValid ? 0.28 : 0.18,
    });
  }

  if (hoveredEntity) {
    const color = preview.hoveredTargetValid ? 0xb8ff9e : 0xff866f;
    if (hoveredEntity.collider.kind === 'circle') {
      overlay.circle(hoveredEntity.x, hoveredEntity.y, hoveredEntity.collider.radius + 10).stroke({ color, width: 4, alpha: 0.92 });
    } else {
      overlay.roundRect(
        hoveredEntity.x - hoveredEntity.collider.width / 2 - 10,
        hoveredEntity.y - hoveredEntity.collider.height / 2 - 10,
        hoveredEntity.collider.width + 20,
        hoveredEntity.collider.height + 20,
        18,
      ).stroke({ color, width: 4, alpha: 0.92 });
    }
    overlay
      .moveTo(hoveredEntity.x - 18, hoveredEntity.y)
      .lineTo(hoveredEntity.x + 18, hoveredEntity.y)
      .moveTo(hoveredEntity.x, hoveredEntity.y - 18)
      .lineTo(hoveredEntity.x, hoveredEntity.y + 18)
      .stroke({ color, width: 3, alpha: 0.84 });
    return;
  }

  if (preview.hoverWorld) {
    const color = preview.hoveredTargetValid ? 0xb8ff9e : 0xff866f;
    overlay
      .moveTo(preview.hoverWorld.x - 14, preview.hoverWorld.y)
      .lineTo(preview.hoverWorld.x + 14, preview.hoverWorld.y)
      .moveTo(preview.hoverWorld.x, preview.hoverWorld.y - 14)
      .lineTo(preview.hoverWorld.x, preview.hoverWorld.y + 14)
      .stroke({ color, width: 3, alpha: 0.7 });
  }
}

export function drawResourceInspectionOverlay(
  layers: RenderLayers,
  resourceFields: ResourceField[],
  fishingZones: FishingZoneState[],
  inspectedTarget: ResourceInspectionTarget | null,
): void {
  const overlay = getOverlayGraphic(layers, 'inspected-target-overlay');
  if (!overlay) {
    return;
  }

  overlay.clear();
  if (!inspectedTarget) {
    return;
  }

  if (inspectedTarget.kind === 'metal') {
    const field = resourceFields.find((candidate) => candidate.id === inspectedTarget.id);
    if (!field) {
      return;
    }
    const color = field.amount > 0 ? 0xf6d48a : 0xb7b5ae;
    overlay.circle(field.x, field.y, field.radius + 16).stroke({ color, width: 5, alpha: 0.88 });
    overlay.circle(field.x, field.y, field.radius + 30).stroke({ color, width: 2, alpha: 0.32 });
    overlay
      .moveTo(field.x - 18, field.y)
      .lineTo(field.x + 18, field.y)
      .moveTo(field.x, field.y - 18)
      .lineTo(field.x, field.y + 18)
      .stroke({ color, width: 3, alpha: 0.72 });
    return;
  }

  const zone = fishingZones.find((candidate) => candidate.id === inspectedTarget.id);
  if (!zone) {
    return;
  }
  const color = zone.amount > 0 && zone.depletedCooldownSeconds <= 0 ? 0x8fe4ff : 0x9aa2a6;
  overlay.circle(zone.x, zone.y, zone.radius + 14).stroke({ color, width: 5, alpha: 0.86 });
  overlay.circle(zone.x, zone.y, Math.max(zone.radius * 0.62, 24)).stroke({ color, width: 2, alpha: 0.34 });
  overlay
    .moveTo(zone.x - 16, zone.y)
    .lineTo(zone.x + 16, zone.y)
    .moveTo(zone.x, zone.y - 16)
    .lineTo(zone.x, zone.y + 16)
    .stroke({ color, width: 3, alpha: 0.7 });
}

function getOverlayGraphic(layers: RenderLayers, label: string): Graphics | null {
  const child = layers.overlays.children.find((candidate) => candidate.label === label);
  return child instanceof Graphics ? child : null;
}

function isRallyBuilding(entity: GameEntity): boolean {
  return entity.kind === 'factory' || entity.kind === 'barracks' || entity.kind === 'dock';
}

function drawRallyPointIndicator(graphic: Graphics, entity: GameEntity, rallyPoint: RallyPoint): void {
  const color = rallyPoint.mode === 'water' ? 0x8fe4ff : 0xffe08a;
  const startY = entity.collider.kind === 'circle'
    ? entity.y
    : entity.y + Math.min(12, entity.collider.height * 0.1);

  graphic.moveTo(entity.x, startY);
  graphic.lineTo(rallyPoint.x, rallyPoint.y);
  graphic.stroke({ color: 0x0f1518, width: 6, alpha: 0.2 });
  graphic.moveTo(entity.x, startY);
  graphic.lineTo(rallyPoint.x, rallyPoint.y);
  graphic.stroke({ color, width: 3, alpha: 0.82 });

  graphic.circle(rallyPoint.x, rallyPoint.y, 24).stroke({ color, width: 3, alpha: 0.34 });
  graphic.circle(rallyPoint.x, rallyPoint.y, 12).stroke({ color, width: 4, alpha: 0.82 });

  const poleTopY = rallyPoint.y - 34;
  const poleBottomY = rallyPoint.y + 12;
  graphic.moveTo(rallyPoint.x, poleBottomY);
  graphic.lineTo(rallyPoint.x, poleTopY);
  graphic.stroke({ color: 0x1f2428, width: 6, alpha: 0.36 });
  graphic.moveTo(rallyPoint.x, poleBottomY);
  graphic.lineTo(rallyPoint.x, poleTopY);
  graphic.stroke({ color: 0xe7e3d4, width: 3, alpha: 0.9 });

  graphic.poly([
    rallyPoint.x + 2, poleTopY + 4,
    rallyPoint.x + 22, poleTopY + 10,
    rallyPoint.x + 4, poleTopY + 20,
  ]).fill({ color, alpha: 0.96 });
  graphic.poly([
    rallyPoint.x + 4, poleTopY + 8,
    rallyPoint.x + 15, poleTopY + 11,
    rallyPoint.x + 5, poleTopY + 16,
  ]).fill({ color: 0xffffff, alpha: 0.24 });
}
