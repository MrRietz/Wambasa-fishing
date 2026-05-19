import type { GameEntity } from './components';

export function getSelectedEntities(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity[] {
  return entities.filter((entity) => selectedIds.has(entity.id));
}

export function getSelectedFactory(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity | null {
  return entities.find((entity) => selectedIds.has(entity.id) && entity.kind === 'factory' && entity.faction === 'player') ?? null;
}

export function getSelectedDock(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity | null {
  return entities.find((entity) => selectedIds.has(entity.id) && entity.kind === 'dock' && entity.faction === 'player' && entity.commandable) ?? null;
}

export function getSelectedTechLab(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity | null {
  return entities.find((entity) => selectedIds.has(entity.id) && entity.kind === 'techLab' && entity.faction === 'player' && entity.commandable) ?? null;
}

export function getSelectedBarracks(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity | null {
  return entities.find((entity) => selectedIds.has(entity.id) && entity.kind === 'barracks' && entity.faction === 'player' && entity.commandable) ?? null;
}

export function getSelectedWorkers(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity[] {
  return entities.filter(
    (entity) =>
      selectedIds.has(entity.id) &&
      entity.kind === 'worker' &&
      entity.faction === 'player' &&
      entity.commandable &&
      !entity.renderable.hidden,
  );
}

export function getSelectedBuilder(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity | null {
  return (
    entities.find(
      (entity) =>
        selectedIds.has(entity.id) &&
        entity.kind === 'worker' &&
        entity.faction === 'player' &&
        entity.commandable &&
        entity.movement.speed > 0,
    ) ?? null
  );
}

export function getSelectedPlayerCommandableUnits(entities: GameEntity[], selectedIds: ReadonlySet<string>): GameEntity[] {
  return entities.filter(
    (entity) =>
      selectedIds.has(entity.id) &&
      entity.faction === 'player' &&
      entity.commandable &&
      entity.movement.speed > 0 &&
      !entity.renderable.hidden,
  );
}

export function countAvailableReels(entities: GameEntity[]): number {
  return entities
    .filter((entity) => entity.kind === 'factory' && entity.faction === 'player')
    .reduce((sum, factory) => sum + (factory.economy?.reelWorkshop?.reelInventory ?? 0), 0);
}
