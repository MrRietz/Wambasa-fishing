import type { Faction, GameEntity } from '../../entities/components';
import type { ResourceField } from '../../map/mapTypes';
import { planTruckReturnToField } from '../resourceRouting';

export type HarvestSystemEvent =
  | { kind: 'fieldDepleted'; entityId: string; faction: Faction; message: string }
  | { kind: 'metalLoaded'; entityId: string; faction: Faction; amount: number; message: string }
  | { kind: 'returnPathBlocked'; entityId: string; faction: Faction; message: string }
  | { kind: 'fieldPathBlocked'; entityId: string; faction: Faction; message: string }
  | { kind: 'metalUnloaded'; entityId: string; faction: Faction; amount: number; stockpile: number; message: string };

export interface MetalStockpile {
  metal: number;
}

export interface HarvestSystemInput {
  truck: GameEntity;
  resourceFields: ResourceField[];
  playerStockpile: MetalStockpile;
  enemyStockpile: MetalStockpile;
  deltaSeconds?: number;
  loadSeconds?: number;
  getDropOffPoint: (truck: GameEntity) => { x: number; y: number };
  findLandPath: (start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
}

export interface HarvestSystemOutput {
  changed: boolean;
  events: HarvestSystemEvent[];
  moveCommand?: { x: number; y: number; entityIds: string[]; pathLength: number };
}

const METAL_HARVEST_LOAD_SECONDS = 4.5;
const HARVEST_RETRY_SECONDS = 1.5;

export function resolveHarvestArrival(input: HarvestSystemInput): HarvestSystemOutput {
  const harvesting = input.truck.economy?.harvesting;
  if (!harvesting || input.truck.kind !== 'truck') {
    return { changed: false, events: [] };
  }

  const field = harvesting.fieldId ? input.resourceFields.find((candidate) => candidate.id === harvesting.fieldId) : undefined;
  const cargo = input.truck.economy?.cargo;
  if (!cargo || ((harvesting.phase === 'to-field' || harvesting.phase === 'loading') && !field)) {
    input.truck.economy = { ...input.truck.economy, harvesting: undefined };
    return { changed: true, events: [] };
  }

  if (harvesting.phase === 'return-blocked') {
    const retrySeconds = Math.max(0, (harvesting.retrySeconds ?? 0) - (input.deltaSeconds ?? 0));
    if (retrySeconds > 0) {
      input.truck.economy = { ...input.truck.economy, cargo, harvesting: { ...harvesting, retrySeconds } };
      return { changed: true, events: [] };
    }

    const dropOff = input.getDropOffPoint(input.truck);
    const returnPath = input.findLandPath({ x: input.truck.x, y: input.truck.y }, dropOff);
    if (returnPath.length === 0) {
      input.truck.path = [];
      input.truck.moveTarget = undefined;
      input.truck.movement.state = 'idle';
      input.truck.economy = {
        ...input.truck.economy,
        cargo,
        harvesting: { ...harvesting, retrySeconds: HARVEST_RETRY_SECONDS, lastBlockedReason: 'factory-route' },
      };
      return {
        changed: true,
        events: [{ kind: 'returnPathBlocked', entityId: input.truck.id, faction: input.truck.faction, message: 'Truck is waiting for a route to the Factory drop-off.' }],
      };
    }

    input.truck.path = returnPath;
    input.truck.moveTarget = returnPath[0];
    input.truck.movement.state = 'moving';
    input.truck.economy = { ...input.truck.economy, cargo, harvesting: { fieldId: harvesting.fieldId, phase: 'returning' } };
    return {
      changed: true,
      events: [],
      moveCommand: { x: dropOff.x, y: dropOff.y, entityIds: [input.truck.id], pathLength: returnPath.length },
    };
  }

  if (harvesting.phase === 'field-blocked') {
    const retrySeconds = Math.max(0, (harvesting.retrySeconds ?? 0) - (input.deltaSeconds ?? 0));
    if (retrySeconds > 0) {
      input.truck.economy = { ...input.truck.economy, cargo, harvesting: { ...harvesting, retrySeconds } };
      return { changed: true, events: [] };
    }

    if (!field || field.amount <= 0) {
      input.truck.economy = { ...input.truck.economy, cargo, harvesting: undefined };
      return {
        changed: true,
        events: [{ kind: 'fieldDepleted', entityId: input.truck.id, faction: input.truck.faction, message: 'Metal field is depleted.' }],
      };
    }

    const assignment = planTruckReturnToField(input.truck, field, input.findLandPath);
    if (!assignment) {
      input.truck.path = [];
      input.truck.moveTarget = undefined;
      input.truck.movement.state = 'idle';
      input.truck.economy = {
        ...input.truck.economy,
        cargo,
        harvesting: { ...harvesting, retrySeconds: HARVEST_RETRY_SECONDS, lastBlockedReason: 'field-route' },
      };
      return {
        changed: true,
        events: [{ kind: 'fieldPathBlocked', entityId: input.truck.id, faction: input.truck.faction, message: 'Truck is waiting for a route back to the metal field.' }],
      };
    }

    input.truck.path = assignment.path;
    input.truck.moveTarget = assignment.path[0];
    input.truck.movement.state = 'moving';
    input.truck.economy = { ...input.truck.economy, cargo, harvesting: { fieldId: field.id, phase: 'to-field' } };
    return {
      changed: true,
      events: [],
      moveCommand: { x: assignment.target.x, y: assignment.target.y, entityIds: [input.truck.id], pathLength: assignment.path.length },
    };
  }

  if (harvesting.phase === 'to-field') {
    if (!field) {
      input.truck.economy = { ...input.truck.economy, harvesting: undefined };
      return { changed: true, events: [] };
    }
    input.truck.path = [];
    input.truck.moveTarget = undefined;
    input.truck.movement.state = 'idle';
    input.truck.economy = {
      ...input.truck.economy,
      cargo,
      harvesting: { fieldId: field.id, phase: 'loading', remainingSeconds: input.loadSeconds ?? METAL_HARVEST_LOAD_SECONDS },
    };
    return { changed: true, events: [] };
  }

  if (harvesting.phase === 'loading') {
    if (!field) {
      input.truck.economy = { ...input.truck.economy, harvesting: undefined };
      return { changed: true, events: [] };
    }
    const remainingSeconds = (harvesting.remainingSeconds ?? input.loadSeconds ?? METAL_HARVEST_LOAD_SECONDS) - (input.deltaSeconds ?? 0);
    if (remainingSeconds > 0) {
      input.truck.economy = { ...input.truck.economy, cargo, harvesting: { ...harvesting, remainingSeconds } };
      return { changed: true, events: [] };
    }

    const harvested = Math.min(cargo.capacity - cargo.amount, field.amount);
    if (harvested <= 0) {
      input.truck.economy = { ...input.truck.economy, cargo, harvesting: undefined };
      return {
        changed: true,
        events: [{ kind: 'fieldDepleted', entityId: input.truck.id, faction: input.truck.faction, message: 'Metal field is depleted.' }],
      };
    }

    cargo.amount += harvested;
    field.amount -= harvested;

    const dropOff = input.getDropOffPoint(input.truck);
    const returnPath = input.findLandPath({ x: input.truck.x, y: input.truck.y }, dropOff);
    if (returnPath.length === 0) {
      input.truck.path = [];
      input.truck.moveTarget = undefined;
      input.truck.movement.state = 'idle';
      input.truck.economy = {
        ...input.truck.economy,
        cargo,
        harvesting: { fieldId: field.id, phase: 'return-blocked', retrySeconds: HARVEST_RETRY_SECONDS, lastBlockedReason: 'factory-route' },
      };
      return {
        changed: true,
        events: [
          { kind: 'metalLoaded', entityId: input.truck.id, faction: input.truck.faction, amount: harvested, message: `Metal hauler loaded ${harvested} metal.` },
          {
            kind: 'returnPathBlocked',
            entityId: input.truck.id,
            faction: input.truck.faction,
            message: 'Truck loaded metal, but no route to the Factory drop-off was found.',
          },
        ],
      };
    }

    input.truck.path = returnPath;
    input.truck.moveTarget = returnPath[0];
    input.truck.movement.state = 'moving';
    input.truck.economy = { ...input.truck.economy, cargo, harvesting: { fieldId: field.id, phase: 'returning' } };
    return {
      changed: true,
      events: [
        {
          kind: 'metalLoaded',
          entityId: input.truck.id,
          faction: input.truck.faction,
          amount: harvested,
          message: `Metal hauler loaded ${harvested} metal and is returning to Factory.`,
        },
      ],
      moveCommand: {
        x: dropOff.x,
        y: dropOff.y,
        entityIds: [input.truck.id],
        pathLength: returnPath.length,
      },
    };
  }

  const unloaded = cargo.amount;
  cargo.amount = 0;
  const stockpile = input.truck.faction === 'enemy' ? input.enemyStockpile : input.playerStockpile;
  stockpile.metal += unloaded;
  const shouldReturnToField = harvesting.phase === 'returning';
  const nextField = shouldReturnToField && field && field.amount > 0 ? field : undefined;
  if (nextField) {
    const assignment = planTruckReturnToField(input.truck, nextField, input.findLandPath);
    if (assignment) {
      input.truck.path = assignment.path;
      input.truck.moveTarget = assignment.path[0];
      input.truck.movement.state = 'moving';
      input.truck.economy = { ...input.truck.economy, cargo, harvesting: { fieldId: nextField.id, phase: 'to-field' } };
      return {
        changed: true,
        events: [
          {
            kind: 'metalUnloaded',
            entityId: input.truck.id,
            faction: input.truck.faction,
            amount: unloaded,
            stockpile: stockpile.metal,
            message: `Metal hauler unloaded ${unloaded} metal and is returning to the metal field. Stockpile: ${stockpile.metal}.`,
          },
        ],
        moveCommand: { x: assignment.target.x, y: assignment.target.y, entityIds: [input.truck.id], pathLength: assignment.path.length },
      };
    }

    input.truck.path = [];
    input.truck.moveTarget = undefined;
    input.truck.movement.state = 'idle';
    input.truck.economy = {
      ...input.truck.economy,
      cargo,
      harvesting: { fieldId: nextField.id, phase: 'field-blocked', retrySeconds: HARVEST_RETRY_SECONDS, lastBlockedReason: 'field-route' },
    };
    return {
      changed: true,
      events: [
        {
          kind: 'metalUnloaded',
          entityId: input.truck.id,
          faction: input.truck.faction,
          amount: unloaded,
          stockpile: stockpile.metal,
          message: `Metal hauler unloaded ${unloaded} metal. Stockpile: ${stockpile.metal}.`,
        },
        {
          kind: 'fieldPathBlocked',
          entityId: input.truck.id,
          faction: input.truck.faction,
          message: 'Truck unloaded metal, but no route back to the metal field was found.',
        },
      ],
    };
  }

  input.truck.economy = { ...input.truck.economy, cargo, harvesting: undefined };

  return {
    changed: true,
    events: [
      {
        kind: 'metalUnloaded',
        entityId: input.truck.id,
        faction: input.truck.faction,
        amount: unloaded,
        stockpile: stockpile.metal,
        message: `Metal hauler unloaded ${unloaded} metal. Stockpile: ${stockpile.metal}.`,
      },
    ],
  };
}
