import { productionCatalog, type ProductionKind } from '../../data/production';
import type { GameEntity } from '../../entities/components';

export interface ProductionSpawnEvent {
  product: ProductionKind;
  entityId: string;
  stockpile: number;
  label: string;
}

export interface ProductionSystemInput {
  producers: GameEntity[];
  deltaSeconds: number;
  stockpileMetal: number;
  isProducerBlocked: (producer: GameEntity) => boolean;
  spawnProducedUnit: (product: ProductionKind, producer: GameEntity) => GameEntity;
}

export interface ProductionSystemOutput {
  changed: boolean;
  spawned: ProductionSpawnEvent[];
}

export function updateProductionQueues(input: ProductionSystemInput): ProductionSystemOutput {
  let changed = false;
  const spawned: ProductionSpawnEvent[] = [];

  for (const producer of input.producers) {
    if (input.isProducerBlocked(producer)) {
      continue;
    }

    const queue = producer.economy?.productionQueue;
    if (!queue || queue.length === 0) {
      continue;
    }

    const active = queue[0];
    active.remainingSeconds = Math.max(0, active.remainingSeconds - input.deltaSeconds);
    changed = true;
    if (active.remainingSeconds > 0) {
      continue;
    }

    queue.shift();
    const entity = input.spawnProducedUnit(active.product, producer);
    spawned.push({
      product: active.product,
      entityId: entity.id,
      stockpile: input.stockpileMetal,
      label: productionCatalog[active.product].label,
    });
  }

  return { changed, spawned };
}
