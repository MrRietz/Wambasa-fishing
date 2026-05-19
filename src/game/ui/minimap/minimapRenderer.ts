import { clamp } from '../../core/math';
import type { CameraState } from '../../debug/debugState';
import type { CoastalMapData, FishingZoneState, ResourceField } from '../../map/mapTypes';
import type { GameEntity } from '../../entities/components';
import { terrainFill } from '../../render/terrainRenderer';

export interface MinimapRenderInput {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  mapData: CoastalMapData;
  resourceFields?: ResourceField[];
  fishingZones?: FishingZoneState[];
  entities: GameEntity[];
  camera: CameraState;
  viewportWidth: number;
  viewportHeight: number;
  attackPings?: Array<{
    x: number;
    y: number;
    ageSeconds: number;
    durationSeconds: number;
    severity: 'warning' | 'error';
  }>;
}

export interface MinimapViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function renderMinimap(input: MinimapRenderInput): void {
  const { context: ctx, canvas, mapData, entities, camera, attackPings = [] } = input;
  const width = canvas.width;
  const height = canvas.height;
  const scaleX = width / mapData.width;
  const scaleY = height / mapData.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#102421';
  ctx.fillRect(0, 0, width, height);

  for (const tile of mapData.terrain) {
    ctx.fillStyle = `#${terrainFill(tile.kind).toString(16).padStart(6, '0')}`;
    ctx.fillRect(tile.x * scaleX, tile.y * scaleY, tile.width * scaleX, tile.height * scaleY);
  }

  ctx.strokeStyle = 'rgba(246, 212, 138, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 518 * scaleY);
  ctx.bezierCurveTo(410 * scaleX, 464 * scaleY, 870 * scaleX, 585 * scaleY, 1320 * scaleX, 505 * scaleY);
  ctx.bezierCurveTo(2010 * scaleX, 412 * scaleY, 3020 * scaleX, 560 * scaleY, width, 474 * scaleY);
  ctx.stroke();

  ctx.fillStyle = '#aeb9c2';
  const activeResourceFields = input.resourceFields?.length
    ? input.resourceFields
    : mapData.metalFields;
  for (const field of activeResourceFields) {
    if ('amount' in field && typeof field.amount === 'number' && field.amount <= 0) {
      ctx.fillStyle = 'rgba(111, 114, 108, 0.75)';
      ctx.beginPath();
      ctx.arc(field.x * scaleX, field.y * scaleY, Math.max(2, field.radius * scaleX * 0.55), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = '#aeb9c2';
    ctx.beginPath();
    ctx.arc(field.x * scaleX, field.y * scaleY, Math.max(3, field.radius * scaleX), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(143, 213, 227, 0.8)';
  const activeFishingZones = input.fishingZones?.length
    ? input.fishingZones.filter((zone) => zone.amount > 0 && zone.depletedCooldownSeconds <= 0)
    : mapData.fishingZones;
  for (const zone of activeFishingZones) {
    ctx.fillStyle = zone.tier === 'contested' ? 'rgba(255, 196, 124, 0.88)' : 'rgba(143, 213, 227, 0.8)';
    ctx.beginPath();
    ctx.arc(zone.x * scaleX, zone.y * scaleY, Math.max(3, zone.radius * scaleX), 0, Math.PI * 2);
    ctx.fill();
  }

  for (const area of mapData.baseAreas) {
    ctx.fillStyle = area.owner === 'player' ? 'rgba(103, 194, 255, 0.18)' : area.owner === 'enemy' ? 'rgba(234, 111, 95, 0.18)' : 'rgba(232, 211, 137, 0.14)';
    ctx.fillRect(area.x * scaleX, area.y * scaleY, area.width * scaleX, area.height * scaleY);
  }

  for (const entity of entities) {
    if (entity.renderable.hidden) {
      continue;
    }
    const color = entity.faction === 'enemy' ? '#ea6f5f' : entity.faction === 'player' ? '#67c2ff' : '#d9d5bf';
    ctx.fillStyle = color;
    if (entity.collider.kind === 'rect') {
      const widthPx = Math.max(entity.kind === 'boat' ? 4 : 5, entity.collider.width * scaleX * 0.38);
      const heightPx = Math.max(entity.kind === 'boat' ? 2 : 4, entity.collider.height * scaleY * 0.34);
      ctx.fillRect(entity.x * scaleX - widthPx / 2, entity.y * scaleY - heightPx / 2, widthPx, heightPx);
      continue;
    }
    ctx.beginPath();
    ctx.arc(entity.x * scaleX, entity.y * scaleY, entity.faction === 'enemy' ? 2.8 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ping of attackPings) {
    const progress = clamp(ping.ageSeconds / Math.max(0.001, ping.durationSeconds), 0, 1);
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(ping.ageSeconds * 10));
    const alpha = (1 - progress) * pulse;
    const centerX = ping.x * scaleX;
    const centerY = ping.y * scaleY;
    const radius = 5 + progress * 16;
    const ringColor = ping.severity === 'error' ? `rgba(255, 68, 48, ${alpha.toFixed(3)})` : `rgba(255, 108, 86, ${alpha.toFixed(3)})`;
    const coreColor = ping.severity === 'error' ? `rgba(255, 184, 156, ${(alpha * 0.9).toFixed(3)})` : `rgba(255, 214, 180, ${(alpha * 0.8).toFixed(3)})`;

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(3, radius * 0.58), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const viewportRect = getMinimapViewportRect(canvas, mapData, camera, input.viewportWidth, input.viewportHeight);
  ctx.fillStyle = 'rgba(255, 242, 194, 0.09)';
  ctx.strokeStyle = '#fff2c2';
  ctx.lineWidth = 3;
  ctx.fillRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
  ctx.strokeRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
}

export function minimapPointerToWorld(canvas: HTMLCanvasElement, mapData: CoastalMapData, event: PointerEvent): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  const localX = clamp(event.clientX - bounds.left, 0, bounds.width);
  const localY = clamp(event.clientY - bounds.top, 0, bounds.height);
  return {
    x: (localX / bounds.width) * mapData.width,
    y: (localY / bounds.height) * mapData.height,
  };
}

export function getMinimapViewportRect(
  canvas: HTMLCanvasElement,
  mapData: CoastalMapData,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): MinimapViewportRect {
  const scaleX = canvas.width / mapData.width;
  const scaleY = canvas.height / mapData.height;
  return {
    x: camera.x * scaleX,
    y: camera.y * scaleY,
    width: (viewportWidth / camera.zoom) * scaleX,
    height: (viewportHeight / camera.zoom) * scaleY,
  };
}
