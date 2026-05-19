import type { DamageState, GameEntity } from '../../entities/components';
import type { FishingZoneState } from '../../map/mapTypes';

export type FishingSystemEvent =
  | { kind: 'fishLoaded'; faction: GameEntity['faction']; entityId: string; amount: number }
  | { kind: 'cargoFull'; faction: GameEntity['faction']; entityId: string; message: string }
  | { kind: 'zoneDepleted'; faction: GameEntity['faction']; entityId: string; zoneId: string; message: string };

export interface FishingSystemInput {
  boats: GameEntity[];
  zones: FishingZoneState[];
  deltaSeconds: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export interface FishingSystemOutput {
  changed: boolean;
  events: FishingSystemEvent[];
}

export function updateFishingSystem(input: FishingSystemInput): FishingSystemOutput {
  let changed = false;
  const events: FishingSystemEvent[] = [];

  for (const boat of input.boats.filter((entity) => entity.kind === 'boat' && entity.economy?.fishing?.phase === 'fishing')) {
    if (input.getDamageState(boat) === 'destroyed') {
      boat.economy = { ...boat.economy, fishing: undefined };
      changed = true;
      continue;
    }

    const cargo = boat.economy?.cargo;
    const fishing = boat.economy?.fishing;
    if (!cargo || !fishing || cargo.amount >= cargo.capacity) {
      continue;
    }

    const zone = input.zones.find((candidate) => candidate.id === fishing.zoneId);
    if (!zone) {
      boat.economy = { ...boat.economy, fishing: undefined };
      changed = true;
      continue;
    }

    if (zone.amount <= 0) {
      boat.economy = { ...boat.economy, fishing: undefined };
      events.push({ kind: 'zoneDepleted', faction: boat.faction, entityId: boat.id, zoneId: zone.id, message: `${zone.label} is depleted.` });
      changed = true;
      continue;
    }

    const loaded = Math.min(cargo.capacity - cargo.amount, zone.amount, Math.max(1, Math.round(16 * input.deltaSeconds)));
    cargo.amount += loaded;
    zone.amount = Math.max(0, zone.amount - loaded);
    if (zone.amount <= 0) {
      zone.depletedCooldownSeconds = Math.max(zone.depletedCooldownSeconds, zone.regrowthDelaySeconds ?? 0);
    }
    events.push({ kind: 'fishLoaded', faction: boat.faction, entityId: boat.id, amount: loaded });
    changed = true;

    if (cargo.amount >= cargo.capacity) {
      boat.economy = { ...boat.economy, cargo, fishing: undefined };
      events.push({ kind: 'cargoFull', faction: boat.faction, entityId: boat.id, message: `${boat.name} filled fish cargo.` });
    } else if (zone.amount <= 0) {
      boat.economy = { ...boat.economy, cargo, fishing: undefined };
      events.push({ kind: 'zoneDepleted', faction: boat.faction, entityId: boat.id, zoneId: zone.id, message: `${zone.label} ran dry.` });
    } else {
      boat.economy = { ...boat.economy, cargo, fishing };
    }
  }

  for (const zone of input.zones) {
    if (zone.depletedCooldownSeconds > 0) {
      zone.depletedCooldownSeconds = Math.max(0, zone.depletedCooldownSeconds - input.deltaSeconds);
      changed = true;
      continue;
    }
    if (zone.amount >= zone.maxFish) {
      continue;
    }
    zone.amount = Math.min(zone.maxFish, zone.amount + zone.regrowthPerSecond * input.deltaSeconds);
    changed = true;
  }

  return { changed, events };
}
