import type { GameEntity } from '../../entities/components';

export interface DestructionSystemInput {
  deltaSeconds: number;
  entities: GameEntity[];
}

export interface DestructionSystemOutput {
  changed: boolean;
  removedIds: string[];
}

export function updateDestructionSystem(input: DestructionSystemInput): DestructionSystemOutput {
  let changed = false;
  const removedIds: string[] = [];

  for (let index = input.entities.length - 1; index >= 0; index -= 1) {
    const entity = input.entities[index];
    const destruction = entity.economy?.destruction;
    if (!destruction) {
      continue;
    }

    const remainingSeconds = Math.max(0, destruction.remainingSeconds - input.deltaSeconds);
    if (remainingSeconds <= 0) {
      input.entities.splice(index, 1);
      removedIds.push(entity.id);
      changed = true;
      continue;
    }

    entity.economy = {
      ...entity.economy,
      destruction: {
        ...destruction,
        remainingSeconds,
      },
    };
    changed = true;
  }

  return { changed, removedIds };
}
