import { executePlacementCommand, type MoveCommandSummary } from '../../game/commands/commandHandlers';
import type { CommandResult } from '../../game/commands/commandTypes';
import { buildingCatalog, type BuildingPlanKind } from '../../game/data/buildings';
import type { GameEntity, PlacementMode } from '../../game/entities/components';
import { createConstructionSite } from '../../game/entities/entityFactory';
import { validateBuildingPlacement } from '../../game/map/buildPlacement';
import type { CoastalMapData, ResourceField } from '../../game/map/mapTypes';
import type { RenderLayers } from '../../game/render/layers';

type BootStatus = 'loading' | 'ready' | 'failed';
type PathPoint = { x: number; y: number };

export interface CreatePlacementRuntimeOptions {
  mapData: CoastalMapData;
  resourceFields: ResourceField[];
  entities: GameEntity[];
  economyState: { metal: number };
  getPlacementMode: () => PlacementMode | null;
  setPlacementMode: (value: PlacementMode | null) => void;
  hasSelectedWorker: () => boolean;
  getSelectedBuilder: () => GameEntity | null;
  getNextBuildingSiteId: () => number;
  setNextBuildingSiteId: (value: number) => void;
  getConstructionWorkPoint: (site: GameEntity) => PathPoint;
  getConstructionWorkPoints?: (site: GameEntity) => PathPoint[];
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  setLastMoveCommand: (value: MoveCommandSummary | undefined) => void;
  reportCommandResult: (result: CommandResult, layers: RenderLayers) => void;
  setBootStatus: (status: BootStatus, message: string) => void;
  drawPlacementPreview: (layers: RenderLayers) => void;
  updateWorkerCommandPanel: () => void;
  updateCommandHint: () => void;
  updateEconomyReadout: () => void;
  renderBuildings: (layers: RenderLayers) => void;
  drawDestinationOverlay: (layers: RenderLayers) => void;
  publishDebugState: (layers: RenderLayers) => void;
}

export interface PlacementRuntime {
  enterPlacementMode: (building: BuildingPlanKind, layers: RenderLayers, camera: { x: number; y: number }) => void;
  updatePlacementMode: (worldX: number, worldY: number, layers: RenderLayers) => void;
  confirmPlacement: (layers: RenderLayers, queueMode?: boolean) => void;
  cancelPlacement: (layers: RenderLayers) => void;
}

export function createPlacementRuntime(options: CreatePlacementRuntimeOptions): PlacementRuntime {
  function validate(building: BuildingPlanKind, x: number, y: number) {
    return validateBuildingPlacement(
      {
        mapData: options.mapData,
        resourceFields: options.resourceFields,
        entities: options.entities,
      },
      building,
      x,
      y,
    );
  }

  function enterPlacementMode(building: BuildingPlanKind, layers: RenderLayers, camera: { x: number; y: number }): void {
    if (!options.hasSelectedWorker()) {
      options.reportCommandResult(
        {
          ok: false,
          kind: 'placement',
          reason: 'not-worker-selected',
          message: 'Select a worker before planning a building.',
        },
        layers,
      );
      return;
    }

    if (options.economyState.metal < buildingCatalog[building].cost) {
      options.reportCommandResult(
        {
          ok: false,
          kind: 'placement',
          reason: 'unaffordable',
          message: `Need ${buildingCatalog[building].cost} metal to plan ${buildingCatalog[building].label}.`,
        },
        layers,
      );
      return;
    }

    options.setPlacementMode({
      building,
      x: camera.x + 480,
      y: camera.y + 360,
      valid: false,
      reason: 'Move cursor over buildable land',
    });
    const placementMode = options.getPlacementMode();
    if (placementMode) {
      updatePlacementMode(placementMode.x, placementMode.y, layers);
    }
    options.updateCommandHint();
    options.setBootStatus('ready', `Planning ${buildingCatalog[building].label}. Move the cursor to preview placement.`);
  }

  function updatePlacementMode(worldX: number, worldY: number, layers: RenderLayers): void {
    const placementMode = options.getPlacementMode();
    if (!placementMode) {
      return;
    }

    const validation = validate(placementMode.building, worldX, worldY);
    options.setPlacementMode({
      ...placementMode,
      x: worldX,
      y: worldY,
      valid: validation.valid,
      reason: validation.reason,
      width: validation.plan?.width,
      height: validation.plan?.height,
      rotation: validation.plan?.rotation,
    });
    options.drawPlacementPreview(layers);
    options.updateWorkerCommandPanel();
    options.publishDebugState(layers);
  }

  function confirmPlacement(layers: RenderLayers, queueMode = false): void {
    const placementMode = options.getPlacementMode();
    if (!placementMode) {
      return;
    }

    const output = executePlacementCommand({
      building: placementMode.building,
      x: placementMode.x,
      y: placementMode.y,
      builder: options.getSelectedBuilder(),
      queueMode,
      stockpile: options.economyState,
      nextBuildingSiteId: options.getNextBuildingSiteId(),
      validatePlacement: validate,
      createConstructionSite: (id, building, x, y, builderId, plan) =>
        createConstructionSite(id, building, x, y, builderId, plan ? { width: plan.width, height: plan.height, rotation: plan.rotation } : undefined),
      getConstructionWorkPoint: options.getConstructionWorkPoint,
      getConstructionWorkPoints: options.getConstructionWorkPoints,
      findLandPath: options.findLandPath,
      findEntityLandPath: options.findEntityLandPath,
    });

    options.setNextBuildingSiteId(output.nextBuildingSiteId);
    if (!output.result?.ok) {
      if (output.result) {
        options.reportCommandResult(output.result, layers);
      }
      if (output.result?.kind === 'placement' && output.result.reason === 'invalid-placement') {
        updatePlacementMode(placementMode.x, placementMode.y, layers);
      }
      return;
    }
    if (!output.result) {
      return;
    }

    if (output.site) {
      options.entities.push(output.site);
    }
    if (output.moveCommand) {
      options.setLastMoveCommand(output.moveCommand);
    }
    options.reportCommandResult(output.result, layers);
    if (!queueMode) {
      options.setPlacementMode(null);
    }
    options.updateEconomyReadout();
    options.renderBuildings(layers);
    options.drawPlacementPreview(layers);
    options.drawDestinationOverlay(layers);
    options.updateWorkerCommandPanel();
    const queuedPlacementMode = options.getPlacementMode();
    if (queueMode && queuedPlacementMode) {
      updatePlacementMode(queuedPlacementMode.x, queuedPlacementMode.y, layers);
      options.updateCommandHint();
    }
    options.publishDebugState(layers);
  }

  function cancelPlacement(layers: RenderLayers): void {
    if (!options.getPlacementMode()) {
      return;
    }
    options.setPlacementMode(null);
    options.drawPlacementPreview(layers);
    options.updateWorkerCommandPanel();
    options.updateCommandHint();
    options.setBootStatus('ready', 'Building placement cancelled.');
    options.publishDebugState(layers);
  }

  return {
    enterPlacementMode,
    updatePlacementMode,
    confirmPlacement,
    cancelPlacement,
  };
}
