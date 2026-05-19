import type { Application } from 'pixi.js';
import { clamp } from '../../game/core/math';
import type { CameraState } from '../../game/debug/debugState';
import type { GameEntity } from '../../game/entities/components';
import type { CoastalMapData, FishingZoneState, ResourceField } from '../../game/map/mapTypes';
import type { RenderLayers } from '../../game/render/layers';
import { getMinimapViewportRect, minimapPointerToWorld, renderMinimap as renderMinimapForUi } from '../../game/ui/minimap/minimapRenderer';

type BootStatus = 'loading' | 'ready' | 'failed';

export interface MinimapAttackPingState {
  x: number;
  y: number;
  ageSeconds: number;
  durationSeconds: number;
  severity: 'warning' | 'error';
}

export interface CreateCameraRuntimeOptions {
  camera: CameraState;
  gameElement: HTMLElement;
  minimapElement: HTMLCanvasElement;
  minimapContext: CanvasRenderingContext2D;
  mapData: CoastalMapData;
  getResourceFields: () => ResourceField[];
  getFishingZones: () => FishingZoneState[];
  worldWidth: number;
  worldHeight: number;
  minZoom: number;
  maxZoom: number;
  getEntities: () => GameEntity[];
  getAttackPings: () => MinimapAttackPingState[];
  getPlayerFactory: () => GameEntity | undefined;
  setBootStatus: (status: BootStatus, message: string) => void;
  publishDebugState: (layers: RenderLayers) => void;
}

export interface CameraRuntime {
  applyCamera: (app: Application, layers: RenderLayers) => void;
  screenToWorld: (app: Application, screenX: number, screenY: number) => { x: number; y: number };
  screenToWorldFromClient: (screenX: number, screenY: number) => { x: number; y: number };
  centerCameraOn: (app: Application, worldX: number, worldY: number, layers: RenderLayers) => void;
  centerCameraOnViewport: (
    worldX: number,
    worldY: number,
    viewportWidth: number,
    viewportHeight: number,
    layers: RenderLayers,
  ) => void;
  zoomAt: (app: Application, layers: RenderLayers, clientX: number, clientY: number, deltaY: number) => void;
  renderMinimap: (app: Application) => void;
  minimapEventToWorld: (event: PointerEvent) => { x: number; y: number };
  pointInsideMinimapViewport: (event: PointerEvent, app: Application) => boolean;
  focusPlayerBase: (app: Application, layers: RenderLayers) => void;
}

export function createCameraRuntime(options: CreateCameraRuntimeOptions): CameraRuntime {
  function clampCameraToWorld(app: Application): void {
    const visibleWidth = app.screen.width / options.camera.zoom;
    const visibleHeight = app.screen.height / options.camera.zoom;
    options.camera.x = clamp(options.camera.x, 0, Math.max(0, options.worldWidth - visibleWidth));
    options.camera.y = clamp(options.camera.y, 0, Math.max(0, options.worldHeight - visibleHeight));
  }

  function renderMinimap(app: Application): void {
    renderMinimapForUi({
      context: options.minimapContext,
      canvas: options.minimapElement,
      mapData: options.mapData,
      resourceFields: options.getResourceFields(),
      fishingZones: options.getFishingZones(),
      entities: options.getEntities(),
      camera: options.camera,
      viewportWidth: app.screen.width,
      viewportHeight: app.screen.height,
      attackPings: options.getAttackPings(),
    });
  }

  function applyCamera(app: Application, layers: RenderLayers): void {
    clampCameraToWorld(app);
    layers.world.scale.set(options.camera.zoom);
    layers.world.position.set(-options.camera.x * options.camera.zoom, -options.camera.y * options.camera.zoom);
    renderMinimap(app);
    options.publishDebugState(layers);
  }

  function screenToWorld(_: Application, screenX: number, screenY: number): { x: number; y: number } {
    return screenToWorldFromClient(screenX, screenY);
  }

  function screenToWorldFromClient(screenX: number, screenY: number): { x: number; y: number } {
    const bounds = options.gameElement.getBoundingClientRect();
    return {
      x: options.camera.x + (screenX - bounds.left) / options.camera.zoom,
      y: options.camera.y + (screenY - bounds.top) / options.camera.zoom,
    };
  }

  function centerCameraOn(app: Application, worldX: number, worldY: number, layers: RenderLayers): void {
    options.camera.x = worldX - app.screen.width / options.camera.zoom / 2;
    options.camera.y = worldY - app.screen.height / options.camera.zoom / 2;
    applyCamera(app, layers);
  }

  function centerCameraOnViewport(
    worldX: number,
    worldY: number,
    viewportWidth: number,
    viewportHeight: number,
    layers: RenderLayers,
  ): void {
    options.camera.x = worldX - viewportWidth / options.camera.zoom / 2;
    options.camera.y = worldY - viewportHeight / options.camera.zoom / 2;
    const visibleWidth = viewportWidth / options.camera.zoom;
    const visibleHeight = viewportHeight / options.camera.zoom;
    options.camera.x = clamp(options.camera.x, 0, Math.max(0, options.worldWidth - visibleWidth));
    options.camera.y = clamp(options.camera.y, 0, Math.max(0, options.worldHeight - visibleHeight));
    layers.world.scale.set(options.camera.zoom);
    layers.world.position.set(-options.camera.x * options.camera.zoom, -options.camera.y * options.camera.zoom);
    options.publishDebugState(layers);
  }

  function zoomAt(app: Application, layers: RenderLayers, clientX: number, clientY: number, deltaY: number): void {
    const before = screenToWorld(app, clientX, clientY);
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    options.camera.zoom = clamp(options.camera.zoom * zoomFactor, options.minZoom, options.maxZoom);
    const bounds = options.gameElement.getBoundingClientRect();
    options.camera.x = before.x - (clientX - bounds.left) / options.camera.zoom;
    options.camera.y = before.y - (clientY - bounds.top) / options.camera.zoom;
    applyCamera(app, layers);
  }

  function minimapEventToWorld(event: PointerEvent): { x: number; y: number } {
    return minimapPointerToWorld(options.minimapElement, options.mapData, event);
  }

  function pointInsideMinimapViewport(event: PointerEvent, app: Application): boolean {
    const bounds = options.minimapElement.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    const viewportRect = getMinimapViewportRect(options.minimapElement, options.mapData, options.camera, app.screen.width, app.screen.height);
    return localX >= viewportRect.x
      && localX <= viewportRect.x + viewportRect.width
      && localY >= viewportRect.y
      && localY <= viewportRect.y + viewportRect.height;
  }

  function focusPlayerBase(app: Application, layers: RenderLayers): void {
    const factory = options.getPlayerFactory();
    if (!factory) {
      return;
    }
    centerCameraOn(app, factory.x, factory.y, layers);
    options.setBootStatus('ready', 'Camera focused on Factory Command Center.');
    options.publishDebugState(layers);
  }

  return {
    applyCamera,
    screenToWorld,
    screenToWorldFromClient,
    centerCameraOn,
    centerCameraOnViewport,
    zoomAt,
    renderMinimap,
    minimapEventToWorld,
    pointInsideMinimapViewport,
    focusPlayerBase,
  };
}
