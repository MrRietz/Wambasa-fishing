import type { DamageState, GameEntity } from '../../game/entities/components';
import type { ResourceField, CoastalMapData, FishingZoneState } from '../../game/map/mapTypes';
import type { RenderLayers } from '../../game/render/layers';
import {
  renderBuildings as renderBuildingLayer,
  renderEffects as renderEffectLayer,
  renderEntityLayers,
  renderUnits as renderUnitLayer,
  type EntityRenderContext,
} from '../../game/render/entityRenderer';
import { renderTerrainMap } from '../../game/render/terrainRenderer';

export interface CreateRenderRuntimeOptions {
  mapData: CoastalMapData;
  fishingZones: FishingZoneState[];
  resourceFields: ResourceField[];
  elapsedSeconds: () => number;
  getEntityRenderContext: () => EntityRenderContext;
  drawSelectionOverlay: (layers: RenderLayers) => void;
  drawDestinationOverlay: (layers: RenderLayers) => void;
  drawPlacementPreview: (layers: RenderLayers) => void;
  drawCombatTargetingOverlay: (layers: RenderLayers) => void;
}

export interface RenderRuntime {
  renderMap: (layers: RenderLayers) => void;
  renderWorldOverlays: (layers: RenderLayers) => void;
  renderEntities: (layers: RenderLayers) => void;
  renderBuildings: (layers: RenderLayers) => void;
  renderUnits: (layers: RenderLayers) => void;
}

export function createRenderRuntime(options: CreateRenderRuntimeOptions): RenderRuntime {
  function renderMap(layers: RenderLayers): void {
    renderTerrainMap({
      layers,
      mapData: options.mapData,
      fishingZones: options.fishingZones,
      resourceFields: options.resourceFields,
      elapsedSeconds: options.elapsedSeconds(),
      renderEntities: () => renderEntities(layers),
      renderWorldOverlays: () => renderWorldOverlays(layers),
    });
  }

  function renderWorldOverlays(layers: RenderLayers): void {
    options.drawSelectionOverlay(layers);
    options.drawDestinationOverlay(layers);
    options.drawPlacementPreview(layers);
  }

  function renderEntities(layers: RenderLayers): void {
    renderEntityLayers(layers, options.getEntityRenderContext());
  }

  function renderBuildings(layers: RenderLayers): void {
    const context = options.getEntityRenderContext();
    renderBuildingLayer(layers, context);
    renderEffectLayer(layers, context);
    options.drawCombatTargetingOverlay(layers);
  }

  function renderUnits(layers: RenderLayers): void {
    const context = options.getEntityRenderContext();
    renderUnitLayer(layers, context);
    renderEffectLayer(layers, context);
    options.drawCombatTargetingOverlay(layers);
  }

  return {
    renderMap,
    renderWorldOverlays,
    renderEntities,
    renderBuildings,
    renderUnits,
  };
}
