import type { GameEntity } from '../../entities/components';

export type LandDestinationValidator = (worldX: number, worldY: number, movingEntity?: GameEntity) => boolean;

export function resolveMobileUnitOverlaps(mobileEntities: GameEntity[], isValidLandDestination: LandDestinationValidator): boolean {
  void mobileEntities;
  void isValidLandDestination;
  return false;
}
