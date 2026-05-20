import { clamp } from '../core/math';
import type { DamageState, GameEntity } from '../entities/components';
import { REEL_BUILD_SECONDS } from '../simulation/systems/factoryReelSystem';

export interface RenderPolishState {
  hasWheelMotion: boolean;
  hasCargoLoad: boolean;
  hasWake: boolean;
  hasProductionActivity: boolean;
  hasReelWorkshopActivity: boolean;
  hasConstructionActivity: boolean;
  hasDamageSmoke: boolean;
  hasDisabledPulse: boolean;
  hasAttackCharge: boolean;
  hasFishingRipple: boolean;
  hasCriticalGlow: boolean;
  constructionProgress?: number;
  reelWorkshopProgress?: number;
  wheelPhase: number;
  wakePhase: number;
  activityPhase: number;
  disabledPhase: number;
  attackPhase: number;
}

export function getRenderPolishState(entity: GameEntity, getDamageState: (entity: GameEntity) => DamageState | undefined): RenderPolishState {
  const damageState = getDamageState(entity);
  const construction = entity.economy?.construction;
  const productionQueue = entity.economy?.productionQueue ?? [];
  const reelWorkshop = entity.economy?.reelWorkshop;
  const cargo = entity.economy?.cargo;
  const frame = entity.animation.frame;
  const isMovingVehicle = entity.animation.state === 'move' || entity.animation.state === 'harvest' || entity.animation.state === 'fish';

  return {
    hasWheelMotion: entity.kind === 'truck' && isMovingVehicle && damageState !== 'destroyed',
    hasCargoLoad: entity.kind === 'truck' && Boolean(cargo && cargo.amount > 0) && damageState !== 'destroyed',
    hasWake: entity.kind === 'boat' && isMovingVehicle && damageState !== 'destroyed',
    hasProductionActivity: productionQueue.length > 0 && damageState !== 'destroyed',
    hasReelWorkshopActivity: Boolean(reelWorkshop && reelWorkshop.reelProgressSeconds > 0) && damageState !== 'destroyed',
    hasConstructionActivity: Boolean(construction && !construction.complete) && damageState !== 'destroyed',
    hasDamageSmoke: damageState === 'damaged' || damageState === 'critical' || damageState === 'destroyed',
    hasDisabledPulse: (entity.economy?.disabledSeconds ?? 0) > 0 && damageState !== 'destroyed',
    hasAttackCharge: Boolean(entity.economy?.attack) && damageState !== 'destroyed',
    hasFishingRipple: entity.kind === 'boat' && entity.animation.state === 'fish' && damageState !== 'destroyed',
    hasCriticalGlow: damageState === 'critical' || damageState === 'destroyed',
    constructionProgress: construction ? clamp(construction.progressSeconds / construction.totalSeconds, 0, 1) : undefined,
    reelWorkshopProgress: reelWorkshop ? clamp(reelWorkshop.reelProgressSeconds / REEL_BUILD_SECONDS, 0, 1) : undefined,
    wheelPhase: frame % 6,
    wakePhase: frame % 5,
    activityPhase: frame % 5,
    disabledPhase: frame % 6,
    attackPhase: frame % 4,
  };
}
