import type { DamageState, GameEntity } from '../../entities/components';

export const FACTORY_WORKER_CAP = 10;

export interface ReleaseFactoryCrewInput {
  factory: GameEntity | null;
  entities: GameEntity[];
  getReleasePoint: (factory: GameEntity, index: number, count: number) => { x: number; y: number };
  releaseCount?: number;
}

export interface ReleaseFactoryCrewOutput {
  changed: boolean;
  releasedWorkers: GameEntity[];
}

export interface DestroyAssignedFactoryCrewInput {
  factory: GameEntity;
  entities: GameEntity[];
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  destroyCrew: (worker: GameEntity) => void;
}

export function countAssignedFactoryCrew(entities: GameEntity[], factoryId: string | undefined): number {
  if (!factoryId) {
    return 0;
  }

  return entities.filter(
    (entity) =>
      entity.kind === 'worker' &&
      entity.faction === 'player' &&
      entity.economy?.factoryDuty?.factoryId === factoryId &&
      (entity.economy.factoryDuty.phase === 'producing' || entity.economy.factoryDuty.phase === 'to-factory'),
  ).length;
}

export function releaseFactoryCrew(input: ReleaseFactoryCrewInput): ReleaseFactoryCrewOutput {
  const factory = input.factory;
  if (!factory || factory.kind !== 'factory' || factory.faction !== 'player') {
    return { changed: false, releasedWorkers: [] };
  }

  const assignedWorkers = input.entities.filter(
    (entity) =>
      entity.kind === 'worker' &&
      entity.faction === 'player' &&
      entity.economy?.factoryDuty?.factoryId === factory.id &&
      (entity.economy.factoryDuty.phase === 'producing' || entity.economy.factoryDuty.phase === 'to-factory'),
  );
  if (assignedWorkers.length === 0) {
    return { changed: false, releasedWorkers: [] };
  }

  const releaseCount = Math.max(1, Math.min(input.releaseCount ?? assignedWorkers.length, assignedWorkers.length));
  const workersToRelease = assignedWorkers
    .slice()
    .sort((a, b) => {
      const aProducing = a.economy?.factoryDuty?.phase === 'producing' ? 0 : 1;
      const bProducing = b.economy?.factoryDuty?.phase === 'producing' ? 0 : 1;
      return aProducing - bProducing || a.id.localeCompare(b.id);
    })
    .slice(0, releaseCount);

  workersToRelease.forEach((worker, index) => {
    const releasePoint = input.getReleasePoint(factory, index, workersToRelease.length);
    worker.x = releasePoint.x;
    worker.y = releasePoint.y;
    worker.path = [];
    worker.moveTarget = undefined;
    worker.movement.state = 'idle';
    worker.commandable = true;
    worker.economy = {
      ...worker.economy,
      factoryDuty: undefined,
    };
    worker.renderable = {
      ...worker.renderable,
      hidden: false,
    };
  });

  return {
    changed: true,
    releasedWorkers: workersToRelease,
  };
}

export function destroyAssignedFactoryCrew(input: DestroyAssignedFactoryCrewInput): GameEntity[] {
  if (input.factory.kind !== 'factory' && input.factory.kind !== 'enemyFactory') {
    return [];
  }

  const assignedWorkers = input.entities.filter(
    (entity) =>
      entity.kind === 'worker' &&
      entity.economy?.factoryDuty?.factoryId === input.factory.id &&
      input.getDamageState(entity) !== 'destroyed',
  );

  assignedWorkers.forEach(input.destroyCrew);
  return assignedWorkers;
}
