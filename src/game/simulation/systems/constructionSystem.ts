import { buildingCatalog, type BuildingPlanKind } from '../../data/buildings';
import type { GameEntity } from '../../entities/components';

export interface CrewCapacityState {
  capacity: number;
}

export interface ConstructionCompletionEvent {
  siteId: string;
  siteName: string;
  building: BuildingPlanKind;
  workerId: string;
  capacityBonus: number;
  crewCapacity: number;
}

export interface ConstructionSystemInput {
  workers: GameEntity[];
  deltaSeconds: number;
  crewState: CrewCapacityState;
  findEntityById: (id: string) => GameEntity | undefined;
}

export interface ConstructionSystemOutput {
  changed: boolean;
  completed: ConstructionCompletionEvent[];
}

export function updateConstructionJobs(input: ConstructionSystemInput): ConstructionSystemOutput {
  let changed = false;
  const completed: ConstructionCompletionEvent[] = [];

  for (const worker of input.workers) {
    const buildJob = worker.economy?.buildJob;
    const site = buildJob ? input.findEntityById(buildJob.siteId) : undefined;
    const construction = site?.economy?.construction;
    if (!buildJob || !site || !construction || construction.complete) {
      worker.economy = { ...worker.economy, buildJob: undefined };
      worker.movement.state = 'idle';
      changed = true;
      continue;
    }

    construction.progressSeconds = Math.min(construction.totalSeconds, construction.progressSeconds + input.deltaSeconds);
    site.economy = {
      ...site.economy,
      health: Math.max(site.economy?.health ?? 0, Math.ceil((construction.progressSeconds / construction.totalSeconds) * buildingCatalog[construction.building].health)),
      construction,
    };
    changed = true;

    if (construction.progressSeconds < construction.totalSeconds) {
      continue;
    }

    construction.complete = true;
    construction.progressSeconds = construction.totalSeconds;
    site.name = getCompletedBuildingName(construction.building, site.faction);
    site.commandable = true;
    site.economy = {
      ...site.economy,
      health: buildingCatalog[construction.building].health,
      construction,
    };
    input.crewState.capacity += construction.capacityBonus;
    worker.economy = { ...worker.economy, buildJob: undefined };
    worker.movement.state = 'idle';
    completed.push({
      siteId: site.id,
      siteName: site.name,
      building: construction.building,
      workerId: worker.id,
      capacityBonus: construction.capacityBonus,
      crewCapacity: input.crewState.capacity,
    });
  }

  return { changed, completed };
}

function getCompletedBuildingName(building: BuildingPlanKind, faction: GameEntity['faction']): string {
  if (faction === 'enemy') {
    if (building === 'dock') {
      return 'Rival Dock';
    }
    if (building === 'barracks') {
      return 'Rival Barracks';
    }
    if (building === 'guardTower') {
      return 'Rival Guard Tower';
    }
    if (building === 'factory') {
      return 'Rival Cannery';
    }
    if (building === 'techLab') {
      return 'Rival Tech Lab';
    }
    return 'Rival Crew House';
  }
  if (building === 'house') {
    return 'Crew House';
  }
  if (building === 'dock') {
    return 'Working Dock';
  }
  if (building === 'techLab') {
    return 'Tech Lab';
  }
  if (building === 'barracks') {
    return 'Barracks';
  }
  if (building === 'factory') {
    return 'Factory Command Center';
  }
  return 'Guard Tower';
}
