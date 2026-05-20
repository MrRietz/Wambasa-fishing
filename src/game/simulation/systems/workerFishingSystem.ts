import type { GameEntity } from '../../entities/components';
import type { FishingZoneState } from '../../map/mapTypes';

export type WorkerFishingEvent =
  | { kind: 'fishLoaded'; entityId: string; amount: number; cargoAmount: number; message: string }
  | { kind: 'cargoFull'; entityId: string; message: string }
  | { kind: 'shoreZoneDepleted'; entityId: string; zoneId: string; message: string };

export interface WorkerFishingSystemInput {
  workers: GameEntity[];
  zones: FishingZoneState[];
  deltaSeconds: number;
  baseCatchDelaySeconds?: { min: number; max: number };
  reelCatchDelaySeconds?: { min: number; max: number };
  baseCatchChance?: number;
  reelCatchChance?: number;
  baseCatchAmount?: { min: number; max: number };
  reelCatchAmount?: { min: number; max: number };
  random?: () => number;
}

export interface WorkerFishingSystemOutput {
  changed: boolean;
  events: WorkerFishingEvent[];
}

const BASE_WORKER_CATCH_DELAY_SECONDS = { min: 0.95, max: 1.7 };
const REEL_WORKER_CATCH_DELAY_SECONDS = { min: 0.75, max: 1.25 };
const BASE_WORKER_CATCH_CHANCE = 0.78;
const REEL_WORKER_CATCH_CHANCE = 0.86;
const BASE_WORKER_CATCH_AMOUNT = { min: 2, max: 3 };
const REEL_WORKER_CATCH_AMOUNT = { min: 3, max: 4 };

export function updateWorkerFishingSystem(input: WorkerFishingSystemInput): WorkerFishingSystemOutput {
  let changed = false;
  const events: WorkerFishingEvent[] = [];
  const baseCatchDelaySeconds = input.baseCatchDelaySeconds ?? BASE_WORKER_CATCH_DELAY_SECONDS;
  const reelCatchDelaySeconds = input.reelCatchDelaySeconds ?? REEL_WORKER_CATCH_DELAY_SECONDS;
  const baseCatchChance = input.baseCatchChance ?? BASE_WORKER_CATCH_CHANCE;
  const reelCatchChance = input.reelCatchChance ?? REEL_WORKER_CATCH_CHANCE;
  const baseCatchAmount = input.baseCatchAmount ?? BASE_WORKER_CATCH_AMOUNT;
  const reelCatchAmount = input.reelCatchAmount ?? REEL_WORKER_CATCH_AMOUNT;
  const random = input.random ?? Math.random;

  for (const worker of input.workers.filter((entity) => entity.kind === 'worker' && entity.economy?.shoreFishing?.phase === 'fishing')) {
    const shoreFishing = worker.economy?.shoreFishing;
    if (!shoreFishing) {
      continue;
    }

    const zone = input.zones.find((candidate) => candidate.id === shoreFishing.zoneId);
    const cargo = worker.economy?.cargo;
    if (!zone) {
      worker.economy = { ...worker.economy, shoreFishing: undefined, autoFishZoneId: undefined };
      changed = true;
      continue;
    }

    if (!cargo || cargo.kind !== 'fish' || cargo.amount >= cargo.capacity) {
      worker.economy = { ...worker.economy, shoreFishing: undefined };
      changed = true;
      continue;
    }

    if (zone.amount <= 0) {
      worker.economy = { ...worker.economy, shoreFishing: undefined };
      events.push({ kind: 'shoreZoneDepleted', entityId: worker.id, zoneId: zone.id, message: `${zone.label} is depleted.` });
      changed = true;
      continue;
    }

    const hasReel = worker.economy?.reelEquipped ?? false;
    const delayRange = hasReel ? reelCatchDelaySeconds : baseCatchDelaySeconds;
    const catchChance = hasReel ? reelCatchChance : baseCatchChance;
    const catchAmount = hasReel ? reelCatchAmount : baseCatchAmount;
    let remainingCooldown = shoreFishing.catchCooldownSeconds ?? rollCooldown(delayRange, random);
    remainingCooldown -= input.deltaSeconds;

    if (remainingCooldown > 0) {
      if (shoreFishing.catchCooldownSeconds !== remainingCooldown) {
        worker.economy = { ...worker.economy, shoreFishing: { ...shoreFishing, catchCooldownSeconds: remainingCooldown } };
        changed = true;
      }
      continue;
    }

    if (random() <= catchChance) {
      const caught = Math.min(cargo.capacity - cargo.amount, zone.amount, rollCatchAmount(catchAmount, random));
      if (caught > 0) {
        zone.amount = Math.max(0, zone.amount - caught);
        if (zone.amount <= 0) {
          zone.depletedCooldownSeconds = Math.max(zone.depletedCooldownSeconds, zone.regrowthDelaySeconds ?? 0);
        }
        cargo.amount += caught;
        events.push({
          kind: 'fishLoaded',
          entityId: worker.id,
          amount: caught,
          cargoAmount: cargo.amount,
          message: `${worker.name} caught ${caught} fish from ${zone.label}.`,
        });
        changed = true;
      }
    }

    if (cargo.amount >= cargo.capacity) {
      worker.economy = { ...worker.economy, cargo, shoreFishing: undefined };
      events.push({ kind: 'cargoFull', entityId: worker.id, message: `${worker.name} filled its fish haul and is heading for a fish bank.` });
      changed = true;
    } else if (zone.amount <= 0) {
      worker.economy = { ...worker.economy, cargo, shoreFishing: undefined };
      events.push({ kind: 'shoreZoneDepleted', entityId: worker.id, zoneId: zone.id, message: `${zone.label} ran dry.` });
      changed = true;
    } else {
      worker.economy = {
        ...worker.economy,
        cargo,
        shoreFishing: { ...shoreFishing, catchCooldownSeconds: rollCooldown(delayRange, random) },
      };
      changed = true;
    }
  }

  return { changed, events };
}

function rollCooldown(range: { min: number; max: number }, random: () => number): number {
  return range.min + (range.max - range.min) * random();
}

function rollCatchAmount(range: { min: number; max: number }, random: () => number): number {
  const span = Math.max(0, Math.floor(range.max) - Math.ceil(range.min));
  return Math.ceil(range.min) + Math.floor(random() * (span + 1));
}
