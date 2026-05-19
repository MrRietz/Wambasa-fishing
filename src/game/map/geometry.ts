import { clamp } from '../core/math';
import type { GameEntity } from '../entities/components';
import type { CircleData, RectData } from './mapTypes';

export function getEntityRect(entity: GameEntity): RectData {
  if (entity.collider.kind === 'rect') {
    return {
      id: entity.id,
      x: entity.x - entity.collider.width / 2,
      y: entity.y - entity.collider.height / 2,
      width: entity.collider.width,
      height: entity.collider.height,
    };
  }
  return {
    id: entity.id,
    x: entity.x - entity.collider.radius,
    y: entity.y - entity.collider.radius,
    width: entity.collider.radius * 2,
    height: entity.collider.radius * 2,
  };
}

export function getCollisionRadius(entity: GameEntity): number {
  if (entity.collider.kind === 'circle') {
    return entity.collider.radius;
  }
  return Math.max(entity.collider.width, entity.collider.height) / 2;
}

export function rectsOverlap(a: RectData, b: RectData): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectCircleOverlap(rect: RectData, circle: CircleData): boolean {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}
