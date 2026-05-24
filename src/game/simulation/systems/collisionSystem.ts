import type { DamageState, GameEntity } from '../../entities/components';

export type LandDestinationValidator = (worldX: number, worldY: number, movingEntity?: GameEntity) => boolean;

export type CrushSystemEvent = {
  kind: 'crush';
  truckId: string;
  targetId: string;
  targetHealth: number;
  faction: GameEntity['faction'];
  x: number;
  y: number;
};

export interface TruckCrushSystemInput {
  trucks: GameEntity[];
  entities: GameEntity[];
  truckSpeeds: Map<string, number>;
  minimumCrushSpeed: number;
  applyDamage: (target: GameEntity, amount: number) => DamageState | undefined;
}

export interface TruckCrushSystemOutput {
  changed: boolean;
  events: CrushSystemEvent[];
}

const CRUSH_DAMAGE = 10000;

export function resolveMobileUnitOverlaps(mobileEntities: GameEntity[], isValidLandDestination: LandDestinationValidator): boolean {
  void mobileEntities;
  void isValidLandDestination;
  return false;
}

export function updateTruckCrushSystem(input: TruckCrushSystemInput): TruckCrushSystemOutput {
  let changed = false;
  const events: CrushSystemEvent[] = [];

  for (const truck of input.trucks) {
    const speed = input.truckSpeeds.get(truck.id) ?? 0;
    if (!isCrushCapableTruck(truck) || speed < input.minimumCrushSpeed) {
      continue;
    }

    const target = input.entities.find(
      (entity) =>
        entity.id !== truck.id &&
        isCrushVulnerableHuman(entity) &&
        (entity.economy?.health ?? 0) > 0 &&
        entitiesOverlap(truck, entity),
    );
    if (!target) {
      continue;
    }

    const damageState = input.applyDamage(target, CRUSH_DAMAGE);
    const targetHealth = target.economy?.health ?? 0;
    events.push({
      kind: 'crush',
      truckId: truck.id,
      targetId: target.id,
      targetHealth,
      faction: truck.faction,
      x: target.x,
      y: target.y,
    });
    changed = changed || damageState === 'destroyed' || targetHealth <= 0;
  }

  return { changed, events };
}

export function isCrushCapableTruck(entity: GameEntity): boolean {
  return entity.kind === 'truck' && entity.movement.state === 'moving' && entity.collider.kind === 'rect' && (entity.economy?.health ?? 1) > 0;
}

export function isCrushVulnerableHuman(entity: GameEntity): boolean {
  return (entity.kind === 'worker' || entity.kind === 'guard' || entity.kind === 'saboteur') && entity.collider.kind === 'circle';
}

function entitiesOverlap(a: GameEntity, b: GameEntity): boolean {
  if (a.collider.kind === 'rect' && b.collider.kind === 'circle') {
    return rectCircleOverlap(a, b);
  }
  if (a.collider.kind === 'circle' && b.collider.kind === 'rect') {
    return rectCircleOverlap(b, a);
  }
  const radiusA = a.collider.kind === 'circle' ? a.collider.radius : Math.max(a.collider.width, a.collider.height) / 2;
  const radiusB = b.collider.kind === 'circle' ? b.collider.radius : Math.max(b.collider.width, b.collider.height) / 2;
  return Math.hypot(a.x - b.x, a.y - b.y) < radiusA + radiusB;
}

function rectCircleOverlap(rectEntity: GameEntity, circleEntity: GameEntity): boolean {
  if (rectEntity.collider.kind !== 'rect' || circleEntity.collider.kind !== 'circle') {
    return false;
  }
  const left = rectEntity.x - rectEntity.collider.width / 2;
  const right = rectEntity.x + rectEntity.collider.width / 2;
  const top = rectEntity.y - rectEntity.collider.height / 2;
  const bottom = rectEntity.y + rectEntity.collider.height / 2;
  const closestX = Math.max(left, Math.min(circleEntity.x, right));
  const closestY = Math.max(top, Math.min(circleEntity.y, bottom));
  return Math.hypot(circleEntity.x - closestX, circleEntity.y - closestY) < circleEntity.collider.radius;
}
