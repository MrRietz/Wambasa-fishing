import type { AnimationAction, CardinalAnimationDirection, EntityKind } from '../entities/components';
import { unitAnimationManifestData } from './unitAnimationManifestData';

export type HumanoidUnitKind = 'worker' | 'guard' | 'saboteur';

export interface UnitAnimationPalette {
  body: string;
  vest: string;
  skin: string;
  tool: string;
}

export interface UnitAnimationActionDefinition {
  frameCount: number;
  fps: number;
}

export interface UnitAnimationDefinition {
  format?: 'svg' | 'png';
  palette: UnitAnimationPalette;
  actions: Partial<Record<AnimationAction, UnitAnimationActionDefinition>>;
}

export interface UnitAnimationFramePose {
  bodyYOffset: number;
  headXOffset: number;
  headYOffset: number;
  leftFoot: number;
  rightFoot: number;
  leftArmReach: number;
  rightArmReach: number;
  toolReach: number;
}

export const unitAnimationManifest = unitAnimationManifestData as unknown as {
  schemaVersion: number;
  frameSize: { width: number; height: number };
  anchor: { x: number; y: number };
  directions: CardinalAnimationDirection[];
  requiredActions: Record<HumanoidUnitKind, AnimationAction[]>;
  units: Record<HumanoidUnitKind, UnitAnimationDefinition>;
};

export function isHumanoidAnimationUnit(kind: EntityKind): kind is HumanoidUnitKind {
  return kind === 'worker' || kind === 'guard' || kind === 'saboteur';
}

export function getUnitAnimationDefinition(kind: EntityKind): UnitAnimationDefinition | undefined {
  return isHumanoidAnimationUnit(kind) ? unitAnimationManifest.units[kind] : undefined;
}

export function getUnitAnimationFrameCount(kind: EntityKind, action: AnimationAction): number | undefined {
  return getUnitAnimationDefinition(kind)?.actions[action]?.frameCount;
}

export function getUnitAnimationFrameRate(kind: EntityKind, action: AnimationAction): number | undefined {
  return getUnitAnimationDefinition(kind)?.actions[action]?.fps;
}

export function resolveUnitAnimationPose(kind: HumanoidUnitKind, action: AnimationAction, direction: CardinalAnimationDirection, frame: number): UnitAnimationFramePose {
  const definition = unitAnimationManifest.units[kind];
  const frameCount = definition.actions[action]?.frameCount ?? definition.actions.idle?.frameCount ?? 1;
  const normalizedFrame = ((frame % frameCount) + frameCount) % frameCount;
  const phase = normalizedFrame / Math.max(1, frameCount - 1);
  const strideWave = Math.sin(phase * Math.PI * 2);
  const actionWave = Math.sin((phase + 0.15) * Math.PI * 2);
  const directionWeight = direction === 'north' ? 0.82 : direction === 'south' ? 1 : 0.92;

  if (action === 'move') {
    return {
      bodyYOffset: Math.abs(strideWave) * -3,
      headXOffset: strideWave * 1.8,
      headYOffset: Math.abs(strideWave) * -1.6,
      leftFoot: strideWave * 9 * directionWeight,
      rightFoot: -strideWave * 9 * directionWeight,
      leftArmReach: -strideWave * 6,
      rightArmReach: strideWave * 6,
      toolReach: 0,
    };
  }

  if (action === 'attack' || action === 'sabotage' || action === 'repair' || action === 'build') {
    return {
      bodyYOffset: Math.max(0, actionWave) * -2,
      headXOffset: 0,
      headYOffset: Math.max(0, actionWave) * -1,
      leftFoot: -3,
      rightFoot: 3,
      leftArmReach: 4 + Math.max(0, actionWave) * 12,
      rightArmReach: 6 + Math.max(0, actionWave) * 14,
      toolReach: 10 + Math.max(0, actionWave) * 14,
    };
  }

  if (action === 'fish') {
    const castReach = 8 + Math.max(0, actionWave) * 7;
    return {
      bodyYOffset: -0.8 - Math.max(0, actionWave) * 1.4,
      headXOffset: direction === 'east' ? 0.6 : direction === 'west' ? -0.6 : 0,
      headYOffset: -0.4 - Math.max(0, actionWave) * 0.8,
      leftFoot: -3.5 + strideWave * 0.9,
      rightFoot: 4.5 - strideWave * 0.7,
      leftArmReach: 4 + castReach * 0.55,
      rightArmReach: 9 + castReach,
      toolReach: 16 + castReach * 1.15,
    };
  }

  return {
    bodyYOffset: normalizedFrame % 2 === 0 ? 0 : -1.2,
    headXOffset: 0,
    headYOffset: normalizedFrame % 2 === 0 ? 0 : -0.8,
    leftFoot: -2,
    rightFoot: 2,
    leftArmReach: 0,
    rightArmReach: 0,
    toolReach: 0,
  };
}
