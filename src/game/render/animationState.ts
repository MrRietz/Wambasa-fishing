import type { AnimationAction, AnimationDirection, AnimationProfile, CardinalAnimationDirection, DamageState, GameEntity } from '../entities/components';
import { hasLoadedTruckEightDirectionSprites } from '../art/unitSpriteAssets';
import { getUnitAnimationFrameCount, getUnitAnimationFrameRate } from '../art/unitAnimationManifest';

export type ResolveAnimationTargetPosition = (entity: GameEntity) => { x: number; y: number } | undefined;

export function getAnimationProfile(entity: GameEntity): AnimationProfile {
  if (entity.kind === 'truck') return 'truck';
  if (entity.kind === 'boat') return 'boat';
  if (entity.renderable.layer === 'buildings') return 'building';
  return 'humanoid';
}

export function resolveAnimationAction(entity: GameEntity, getDamageState: (entity: GameEntity) => DamageState | undefined): AnimationAction {
  const damageState = getDamageState(entity);
  if (damageState === 'destroyed') return 'destroyed';
  if (entity.economy?.attack?.phase === 'attacking') return 'attack';
  if (entity.economy?.sabotage) return 'sabotage';
  if (entity.economy?.repair) return 'repair';
  if (entity.kind === 'truck' && entity.movement.state === 'moving') return 'move';
  if (entity.kind === 'worker' && entity.economy?.buildJob?.phase === 'building') return 'build';
  if (entity.economy?.construction && !entity.economy.construction.complete) return 'build';
  if (entity.kind === 'boat' && entity.economy?.unloadingFish) return 'unload';
  if (entity.kind === 'worker' && entity.economy?.shoreFishing?.phase === 'fishing') return 'fish';
  if (entity.economy?.fishing) return 'fish';
  if (entity.kind === 'truck' && entity.economy?.harvesting?.phase === 'returning' && (entity.economy?.cargo?.amount ?? 0) > 0) return 'unload';
  if (entity.economy?.harvesting) return 'harvest';
  if (entity.movement.state === 'moving') return 'move';
  if (damageState === 'damaged' || damageState === 'critical') return 'damaged';
  return 'idle';
}

export function resolveAnimationDirection(entity: GameEntity, getTargetPosition?: ResolveAnimationTargetPosition): AnimationDirection {
  const targetPosition = getTargetPosition?.(entity);
  const moveTarget = entity.moveTarget ?? entity.path[0];
  const dx = (targetPosition?.x ?? moveTarget?.x ?? entity.x + Math.cos(entity.rotation)) - entity.x;
  const dy = (targetPosition?.y ?? moveTarget?.y ?? entity.y + Math.sin(entity.rotation)) - entity.y;
  if (entity.kind === 'truck' || entity.kind === 'boat') {
    return resolveVehicleAnimationDirection(entity.kind, entity.animation.direction, dx, dy, entity.rotation);
  }
  const angle = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 ? Math.atan2(dy, dx) : entity.rotation;
  return angleToCardinalDirection(angle);
}

function resolveVehicleAnimationDirection(
  vehicleKind: 'truck' | 'boat',
  currentDirection: AnimationDirection | undefined,
  dx: number,
  dy: number,
  fallbackRotation: number,
): AnimationDirection {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const distance = Math.hypot(dx, dy);
  if (absDx <= 0.01 && absDy <= 0.01) {
    return currentDirection ?? angleToCardinalDirection(fallbackRotation);
  }

  if (vehicleKind === 'truck') {
    const hasEightDirectionTruckArt = hasLoadedTruckEightDirectionSprites();
    const keepCurrentThreshold = hasEightDirectionTruckArt ? 18 : 36;
    const keepNeighborThreshold = hasEightDirectionTruckArt ? 26 : 52;

    if (currentDirection && distance < keepCurrentThreshold) {
      return currentDirection;
    }
    if (distance < 10) {
      return currentDirection ?? angleToEightDirection(fallbackRotation);
    }
    const nextDirection = angleToEightDirection(Math.atan2(dy, dx));
    if (!hasEightDirectionTruckArt) {
      if (currentDirection && distance < keepNeighborThreshold && areNeighboringDirections(currentDirection, nextDirection)) {
        return currentDirection;
      }
      return nextDirection;
    }

    if (currentDirection && distance < keepNeighborThreshold && currentDirection === nextDirection) {
      return currentDirection;
    }
    return nextDirection;
  }

  const dominantAxisRatio = Math.max(absDx, absDy) / Math.max(0.0001, Math.min(absDx, absDy));
  const sameAxisUpdateThreshold = 0.65;
  const axisSwitchThreshold = 1.35;

  // Vehicles look bad if they thrash between axes on tiny diagonal path corrections.
  // Keep the current axis unless the new axis is clearly dominant.
  if (currentDirection === 'east' || currentDirection === 'west') {
    if (absDx >= absDy * sameAxisUpdateThreshold) {
      return dx >= 0 ? 'east' : 'west';
    }
    if (absDy < absDx * axisSwitchThreshold || dominantAxisRatio < axisSwitchThreshold) {
      return currentDirection;
    }
  }
  if (currentDirection === 'north' || currentDirection === 'south') {
    if (absDy >= absDx * sameAxisUpdateThreshold) {
      return dy >= 0 ? 'south' : 'north';
    }
    if (absDx < absDy * axisSwitchThreshold || dominantAxisRatio < axisSwitchThreshold) {
      return currentDirection;
    }
  }

  if (absDx >= absDy) {
    return dx >= 0 ? 'east' : 'west';
  }
  return dy >= 0 ? 'south' : 'north';
}

function angleToCardinalDirection(angle: number): CardinalAnimationDirection {
  if (angle >= -Math.PI * 0.25 && angle < Math.PI * 0.25) return 'east';
  if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) return 'south';
  if (angle >= -Math.PI * 0.75 && angle < -Math.PI * 0.25) return 'north';
  return 'west';
}

function angleToEightDirection(angle: number): AnimationDirection {
  const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
  const octant = Math.round(normalizedAngle / (Math.PI / 4)) % 8;
  switch (octant) {
    case 0:
      return 'east';
    case 1:
      return 'southEast';
    case 2:
      return 'south';
    case 3:
      return 'southWest';
    case 4:
      return 'west';
    case 5:
      return 'northWest';
    case 6:
      return 'north';
    case 7:
    default:
      return 'northEast';
  }
}

function areNeighboringDirections(currentDirection: AnimationDirection, nextDirection: AnimationDirection): boolean {
  const directionRing: AnimationDirection[] = ['east', 'southEast', 'south', 'southWest', 'west', 'northWest', 'north', 'northEast'];
  const currentIndex = directionRing.indexOf(currentDirection);
  const nextIndex = directionRing.indexOf(nextDirection);
  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }
  const difference = Math.abs(currentIndex - nextIndex);
  return difference === 1 || difference === directionRing.length - 1;
}

export function animationFrameRate(action: AnimationAction, profile: AnimationProfile): number {
  switch (action) {
    case 'move':
      return profile === 'truck' ? 4 : profile === 'boat' ? 7 : 9;
    case 'attack':
    case 'sabotage':
    case 'repair':
    case 'build':
    case 'harvest':
    case 'fish':
    case 'unload':
      return profile === 'building' ? 4 : 6;
    case 'damaged':
    case 'destroyed':
      return 3;
    case 'idle':
    default:
      return 2;
  }
}

export function entityAnimationFrameRate(entity: GameEntity, action: AnimationAction, profile: AnimationProfile): number {
  return getUnitAnimationFrameRate(entity.kind, action) ?? animationFrameRate(action, profile);
}

export function animationFrameCount(action: AnimationAction, profile: AnimationProfile = 'humanoid'): number {
  switch (action) {
    case 'move':
      return profile === 'truck' ? 8 : 4;
    case 'harvest':
      return profile === 'truck' ? 1 : 3;
    case 'fish':
      return profile === 'boat' ? 5 : 3;
    case 'unload':
      return profile === 'truck' ? 1 : profile === 'boat' ? 4 : 3;
    case 'build':
      return profile === 'building' ? 5 : 3;
    case 'attack':
      return profile === 'building' ? 4 : 3;
    case 'idle':
    case 'damaged':
    case 'destroyed':
      return 2;
    default:
      return 3;
  }
}

export function entityAnimationFrameCount(entity: GameEntity, action: AnimationAction, profile: AnimationProfile = 'humanoid'): number {
  return getUnitAnimationFrameCount(entity.kind, action) ?? animationFrameCount(action, profile);
}
