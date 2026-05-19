import type { GameEntity } from '../../entities/components';
import type { FishingZoneData, FishingZoneState } from '../../map/mapTypes';
import { planBoatFishingAssignments, planSingleBoatDockAssignment } from '../resourceRouting';

export interface AutoFishingLoopInput {
  boat: GameEntity;
  docks: GameEntity[];
  zones: FishingZoneState[];
  getDamageState: (entity: GameEntity) => string | undefined;
  findWaterPath: (start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
  getDockUnloadPoint: (dock: GameEntity) => { x: number; y: number };
  getFishingInteractionPoint: (zone: FishingZoneData | FishingZoneState) => { x: number; y: number };
}

export function queueAutoFishUnload(input: AutoFishingLoopInput): boolean {
  const cargo = input.boat.economy?.cargo;
  if (!cargo || cargo.kind !== 'fish' || cargo.amount <= 0 || input.getDamageState(input.boat) === 'destroyed') return false;
  const dock = input.docks.find((entity) => entity.kind === 'dock' && entity.faction === input.boat.faction && input.getDamageState(entity) !== 'destroyed');
  if (!dock) return false;
  const target = input.getDockUnloadPoint(dock);
  const assignment = planSingleBoatDockAssignment(input.boat, target, input.findWaterPath);
  if (!assignment) return false;
  input.boat.path = assignment.path;
  input.boat.moveTarget = input.boat.path[0];
  input.boat.movement.state = 'moving';
  input.boat.economy = { ...input.boat.economy, fishing: undefined, unloadingFish: { targetId: dock.id, phase: 'to-dock' } };
  return true;
}

export function queueAutoFishReturnToZone(input: AutoFishingLoopInput): boolean {
  const cargo = input.boat.economy?.cargo;
  if (!cargo || cargo.kind !== 'fish' || cargo.amount > 0 || input.getDamageState(input.boat) === 'destroyed') return false;

  const preferredZoneId = input.boat.economy?.autoFishZoneId;
  const activeZones = input.zones.filter((zone) => zone.amount > 0 && zone.depletedCooldownSeconds <= 0);
  const prioritizedZones = activeZones.sort((left, right) => {
    if (left.id === preferredZoneId) return -1;
    if (right.id === preferredZoneId) return 1;
    return Math.hypot(input.boat.x - left.x, input.boat.y - left.y) - Math.hypot(input.boat.x - right.x, input.boat.y - right.y);
  });

  for (const zone of prioritizedZones) {
    const assignments = planBoatFishingAssignments([input.boat], zone, input.findWaterPath, input.getFishingInteractionPoint);
    if (!assignments) {
      continue;
    }

    input.boat.path = assignments[0].path;
    input.boat.moveTarget = input.boat.path[0];
    input.boat.movement.state = 'moving';
    input.boat.economy = { ...input.boat.economy, autoFishZoneId: zone.id, unloadingFish: undefined, fishing: { zoneId: zone.id, phase: 'to-zone' } };
    return true;
  }

  return false;
}
