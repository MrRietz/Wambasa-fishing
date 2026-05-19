import type { DamageState, GameEntity } from '../../entities/components';

export type RepairSystemEvent =
  | { kind: 'repairing'; workerId: string; targetId: string; targetHealth: number }
  | { kind: 'repaired'; workerId: string; targetId: string; targetHealth: number; message?: string };

export interface RepairSystemInput {
  entities: GameEntity[];
  deltaSeconds: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
}

export interface RepairSystemOutput {
  changed: boolean;
  events: RepairSystemEvent[];
}

export function updateRepairSystem(input: RepairSystemInput): RepairSystemOutput {
  let changed = false;
  const events: RepairSystemEvent[] = [];

  for (const worker of input.entities.filter((entity) => entity.faction === 'player' && entity.economy?.repair?.phase === 'repairing')) {
    const repair = worker.economy?.repair;
    const target = repair ? input.entities.find((entity) => entity.id === repair.targetId) : undefined;
    if (!repair || !target || input.getDamageState(target) === 'destroyed' || target.economy?.health === undefined) {
      worker.economy = { ...worker.economy, repair: undefined };
      worker.movement.state = 'idle';
      changed = true;
      continue;
    }

    const maxHealth = input.getMaxHealth(target);
    const repairedHealth = Math.min(maxHealth, target.economy.health + repair.repairPerSecond * input.deltaSeconds);
    if (repairedHealth !== target.economy.health) {
      target.economy = {
        ...target.economy,
        health: repairedHealth,
        damageState: input.getDamageState({ ...target, economy: { ...target.economy, health: repairedHealth } }),
      };
      events.push({ kind: repairedHealth >= maxHealth ? 'repaired' : 'repairing', workerId: worker.id, targetId: target.id, targetHealth: repairedHealth });
      changed = true;
    }

    if (repairedHealth >= maxHealth) {
      worker.economy = { ...worker.economy, repair: undefined };
      worker.movement.state = 'idle';
      events.push({ kind: 'repaired', workerId: worker.id, targetId: target.id, targetHealth: repairedHealth, message: `${worker.name} repaired ${target.name}.` });
    }
  }

  return { changed, events };
}
