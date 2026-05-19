import { Application } from 'pixi.js';
import { tickAiCoordinator, type AiControllerState, type AiStrategy } from '../game/ai/aiCoordinator';
import type { AiDefenseState } from '../game/ai/aiDefenseSystem';
import { chooseAiRaidAttacker } from '../game/ai/aiPressureSystem';
import { AudioManager, syncAudioControls, type SfxCue } from '../game/audio/audioManager';
import { loadUnitSpriteTextures } from '../game/art/unitSpriteAssets';
import type { CommandResult } from '../game/commands/commandTypes';
import { executeAttackCommand, executeAttackMoveCommand, executeDockRepairCommand, executeFactoryCrewCommand, executeFishingCommand, executeFishUnloadCommand, executeHarvestMetalCommand, executeHoldCommand, executeInstantBuildCommand, executeMetalUnloadCommand, executeMoveCommand, executeProductionCommand, executeRepairCommand, executeSabotageCommand, executeStopCommand, executeWorkerFishingCommand, executeWorkerFishUnloadCommand } from '../game/commands/commandHandlers';
import { AI_PROFIT_TARGET, DEFAULT_ZOOM, ECONOMIC_VICTORY_LEAD_REQUIRED, EDGE_SCROLL_SIZE, EDGE_SCROLL_SPEED, FIRST_SKIRMISH_BALANCE, GUARD_TOWER_DAMAGE_PER_SECOND, GUARD_TOWER_RANGE, KEY_SCROLL_SPEED, MAX_ZOOM, MIN_ZOOM, PLAYER_PROFIT_TARGET, UNIT_BLOCKER_PADDING, WORLD_HEIGHT, WORLD_WIDTH } from '../game/config/constants';
import { clamp } from '../game/core/math';
import { buildingCatalog } from '../game/data/buildings';
import { getEntityCrewCost, productionCatalog } from '../game/data/production';
import { formatTechUpgradeCost, getTechUpgradeCost, techUpgradeCatalog, type TechUpgradeKind } from '../game/data/upgrades';
import { skirmish01MapData } from '../game/data/maps/skirmish01';
import type { BuildingPlanKind } from '../game/data/buildings';
import type { ProductionKind } from '../game/data/production';
import { createDebugSnapshot, type AlertSeverity, type CameraState, type ObjectiveId, type RaidEventKind, type RtsDebugState } from '../game/debug/debugState';
import type { AnimationAction, DamageState, Faction, GameEntity, MatchOutcome, MatchState, MatchStats, PlacementMode } from '../game/entities/components';
import { createAttackBoatEntity, createBoatEntity, createConstructionSite, createEnemyAttackBoatEntity, createEnemyBoatEntity, createEnemyGuardEntity, createEnemySaboteurEntity, createEnemyTruckEntity, createEnemyWorkerEntity, createGuardEntity, createSaboteurEntity, createTruckEntity, createWorkerEntity } from '../game/entities/entityFactory';
import { countAvailableReels, getSelectedBarracks as querySelectedBarracks, getSelectedBuilder as querySelectedBuilder, getSelectedDock as querySelectedDock, getSelectedEntities, getSelectedFactory as querySelectedFactory, getSelectedPlayerCommandableUnits as querySelectedPlayerCommandableUnits, getSelectedTechLab as querySelectedTechLab, getSelectedWorkers as querySelectedWorkers } from '../game/entities/queries';
import { createSkirmishBootstrap } from '../game/entities/skirmishSetup';
import { getCollisionRadius, getEntityRect, rectCircleOverlap, rectsOverlap } from '../game/map/geometry';
import {
  getConstructionWorkPoint as getConstructionWorkPointForMap,
  getConstructionWorkPoints as getConstructionWorkPointsForMap,
  getDockLandDropOffPoint as getDockLandDropOffPointForMap,
  getDockSpawnPoint as getDockSpawnPointForMap,
  getDockUnloadPoint as getDockUnloadPointForMap,
  getFishingInteractionPoint as getFishingInteractionPointForMap,
  getWorkerFishingPoint as getWorkerFishingPointForMap,
} from '../game/map/interactionPoints';
import {
  isValidLandDestination as isValidLandDestinationForMap,
  isValidWaterDestination as isValidWaterDestinationForMap,
  pickResourceFieldAt as pickResourceFieldAtForMap,
} from '../game/map/navigationQueries';
import { findGridPath } from '../game/map/pathfinding';
import { animationFrameCount, entityAnimationFrameCount, entityAnimationFrameRate, getAnimationProfile, resolveAnimationAction, resolveAnimationDirection } from '../game/render/animationState';
import { renderFogOfWar } from '../game/render/fogRenderer';
import { queueAutoFishReturnToZone, queueAutoFishUnload } from '../game/simulation/systems/autoFishingLoopSystem';
import type { EntityRenderContext } from '../game/render/entityRenderer';
import { createRenderLayers, type RenderLayers } from '../game/render/layers';
import {
  drawCombatTargetingOverlay as drawCombatTargetingOverlayForRender,
  drawDestinationOverlay as drawDestinationOverlayForRender,
  drawPlacementPreview as drawPlacementPreviewForRender,
  drawResourceInspectionOverlay as drawResourceInspectionOverlayForRender,
  drawSelectionDragOverlay as drawSelectionDragOverlayForRender,
  drawSelectionOverlay as drawSelectionOverlayForRender,
  initializeWorldOverlays,
} from '../game/render/overlays';
import { updateTerrainAnimation } from '../game/render/terrainRenderer';
import { resolveMobileUnitOverlaps as resolveMobileUnitOverlapsForSystem } from '../game/simulation/systems/collisionSystem';
import { updateConstructionJobs } from '../game/simulation/systems/constructionSystem';
import { updateFishingSystem } from '../game/simulation/systems/fishingSystem';
import { countAssignedFactoryCrew, destroyAssignedFactoryCrew, FACTORY_WORKER_CAP, releaseFactoryCrew } from '../game/simulation/systems/factoryCrewSystem';
import { resolveHarvestArrival } from '../game/simulation/systems/harvestSystem';
import { sellFactoryReels, updateFactoryReelSystem } from '../game/simulation/systems/factoryReelSystem';
import { updateProductionQueues } from '../game/simulation/systems/productionSystem';
import { updateRepairSystem } from '../game/simulation/systems/repairSystem';
import { updateSabotageSystem } from '../game/simulation/systems/sabotageSystem';
import { updateDestructionSystem } from '../game/simulation/systems/destructionSystem';
import { updateWorkerFishingSystem } from '../game/simulation/systems/workerFishingSystem';
import { evaluateWinCondition } from '../game/simulation/systems/winConditionSystem';
import { applyUiScale, loadPlayerSettings, persistPlayerSettings } from '../game/settings/playerSettings';
import { mountRtsDomShell } from '../game/ui/domShell';
import { createHudPresenter } from '../game/ui/hudPresenter';
import { getMinimapViewportRect } from '../game/ui/minimap/minimapRenderer';
import type { CircleData, FishingZoneData, FishingZoneState, RectData, ResourceField } from '../game/map/mapTypes';
import { createVisibilityState, isEntityVisible, isWorldExplored, recomputePlayerVisibility } from '../game/visibility/fogOfWar';
import { createAiRuntime } from './runtime/aiRuntime';
import { createCameraRuntime } from './runtime/cameraRuntime';
import { createCombatRuntime } from './runtime/combatRuntime';
import { createPlacementRuntime } from './runtime/placementRuntime';
import { createRenderRuntime } from './runtime/renderRuntime';

type BootStatus = 'loading' | 'ready' | 'failed';

declare global {
  interface Window {
    __wambasaRts?: RtsDebugState;
    __wambasaRtsDamageEntity?: (entityId: string, amount: number) => boolean;
    __wambasaRtsForceRaid?: () => boolean;
    __wambasaRtsForceRaidTarget?: (targetId?: string) => boolean;
    __wambasaRtsSetFishingZoneAmount?: (zoneId: string, amount: number) => boolean;
    __wambasaRtsSelectEntity?: (entityId: string) => boolean;
    webkitAudioContext?: typeof AudioContext;
  }
}

const { mapData, fishingZoneStates, resourceFields, economyState, aiEconomyState, matchState, matchStats, crewState, entities } = createSkirmishBootstrap();
const visibilityState = createVisibilityState();

let nextWorkerId = 4;
let nextTruckId = 2;
let nextBoatId = 1;
let nextAttackBoatId = 1;
let nextGuardId = 1;
let nextSaboteurId = 1;
let nextProductionId = 1;
let nextBuildingSiteId = 1;
let nextEnemyWorkerId = 4;
let nextEnemyTruckId = 2;
let nextEnemyBoatId = 1;
let nextEnemyAttackBoatId = 1;
let nextEnemyGuardId = 1;
let nextEnemySaboteurId = 1;
let nextEnemyDockId = 1;
let nextEnemyBarracksId = 1;
let nextEnemyGuardTowerId = 1;

function pickInitialAiStrategy(): AiStrategy {
  const strategies: AiStrategy[] = ['economicBoom', 'harborPressure', 'siege'];
  return strategies[Math.floor(Math.random() * strategies.length)] ?? 'siege';
}

const aiController: AiControllerState = {
  strategy: pickInitialAiStrategy(),
  startDelaySeconds: FIRST_SKIRMISH_BALANCE.aiStartDelaySeconds,
  raidDelaySeconds: FIRST_SKIRMISH_BALANCE.aiFirstRaidGraceSeconds,
  territoryAlertCooldownSeconds: 0,
  harvestIssued: false,
  openingComplete: false,
  productionQueued: false,
  barracksProductionQueued: false,
  dockBuilt: false,
  boatProductionQueued: false,
  fishingIssued: false,
  raidIssued: false,
  activeTerritoryThreatId: undefined as string | undefined,
  lastAction: 'Rival initialized.',
  lastProductionEvent: undefined as RtsDebugState['ai']['lastProductionEvent'],
  lastResourceEvent: undefined as RtsDebugState['ai']['lastResourceEvent'],
  lastRaidEvent: undefined as RtsDebugState['ai']['lastRaidEvent'],
  lastDefenseEvent: undefined as RtsDebugState['ai']['lastDefenseEvent'],
  raidCount: 0,
};
aiController.lastAction =
  aiController.strategy === 'economicBoom'
    ? 'Rival initialized with economic boom plan.'
    : aiController.strategy === 'harborPressure'
      ? 'Rival initialized with harbor pressure plan.'
      : 'Rival initialized with siege plan.';
const aiDefenseState: AiDefenseState = {
  threatCount: 0,
  defensiveStructureBuilt: false,
};

const { rootElement, gameElement, statusElement, skirmishButton, pauseToggleButtonElement, minimapElement, minimapContext, commandHintElement, alertFeedElement, selectionElement, viewportHudElement, viewportModeElement, viewportSelectionElement, viewportHotkeyElement, economyElement, musicSliderElement, sfxSliderElement, musicReadoutElement, sfxReadoutElement, uiScaleSliderElement, uiScaleReadoutElement, scrollSpeedSliderElement, scrollSpeedReadoutElement, edgeScrollToggleElement, difficultySelectElement, factoryCommandsElement, workerButtonElement, truckButtonElement, sellReelsButtonElement, toggleAutoSellButtonElement, releaseFactoryCrewDecreaseButtonElement, releaseFactoryCrewCountElement, releaseFactoryCrewButtonElement, releaseFactoryCrewIncreaseButtonElement, productionElement, factoryReelReadoutElement, barracksCommandsElement, guardButtonElement, saboteurButtonElement, barracksProductionElement, dockCommandsElement, boatButtonElement, attackBoatButtonElement, dockProductionElement, techLabCommandsElement, cncUpgradeButtonElement, militaryUpgradeButtonElement, boatsUpgradeButtonElement, reelsUpgradeButtonElement, techLabReadoutElement, workerCommandsElement, placeHouseButtonElement, placeDockButtonElement, placeGuardTowerButtonElement, placeTechLabButtonElement, placeBarracksButtonElement, placeFactoryButtonElement, assignFactoryCrewButtonElement, equipReelButtonElement, workerBuildDetailsElement, placementElement, tacticalCommandsElement, stopButtonElement, attackButtonElement, holdButtonElement, attackMoveButtonElement, resultPanelElement, resultTitleElement, resultReasonElement, resultAdviceElement, resultSummaryElement, restartButtonElement, pausePanelElement, resumeButtonElement, pauseRestartButtonElement, objectiveListElement } = mountRtsDomShell();
const root = rootElement;
const hudPresenter = createHudPresenter(root, {
  commandHintElement,
  alertFeedElement,
  selectionElement,
  viewportHudElement,
  viewportModeElement,
  viewportSelectionElement,
  viewportHotkeyElement,
  economyElement,
  factoryCommandsElement,
  workerButtonElement,
  truckButtonElement,
  sellReelsButtonElement,
  toggleAutoSellButtonElement,
  releaseFactoryCrewDecreaseButtonElement,
  releaseFactoryCrewCountElement,
  releaseFactoryCrewButtonElement,
  releaseFactoryCrewIncreaseButtonElement,
  productionElement,
  factoryReelReadoutElement,
  barracksCommandsElement,
  guardButtonElement,
  saboteurButtonElement,
  barracksProductionElement,
  dockCommandsElement,
  boatButtonElement,
  attackBoatButtonElement,
  dockProductionElement,
  techLabCommandsElement,
  cncUpgradeButtonElement,
  militaryUpgradeButtonElement,
  boatsUpgradeButtonElement,
  reelsUpgradeButtonElement,
  techLabReadoutElement,
  workerCommandsElement,
  placeHouseButtonElement,
  placeDockButtonElement,
  placeGuardTowerButtonElement,
  placeTechLabButtonElement,
  placeBarracksButtonElement,
  placeFactoryButtonElement,
  assignFactoryCrewButtonElement,
  equipReelButtonElement,
  workerBuildDetailsElement,
  placementElement,
  tacticalCommandsElement,
  stopButtonElement,
  attackButtonElement,
  holdButtonElement,
  attackMoveButtonElement,
  resultPanelElement,
  resultTitleElement,
  resultReasonElement,
  resultAdviceElement,
  resultSummaryElement,
  pausePanelElement,
  skirmishButton,
  pauseToggleButtonElement,
  resumeButtonElement,
  objectiveListElement,
});

const minimapDrawingContext = minimapContext;

const camera: CameraState = {
  x: 180,
  y: 300,
  zoom: DEFAULT_ZOOM,
};

const pressedKeys = new Set<string>();
let pointerInViewport = false;
let edgeScrollX = 0;
let edgeScrollY = 0;
let dragPan: { pointerId: number; lastX: number; lastY: number } | null = null;
let minimapDragActive = false;
let minimapViewportDragOffset: { x: number; y: number } | null = null;
let debugState: RtsDebugState | null = null;
const selectedEntityIds = new Set<string>();
let factoryCrewReleaseCount = 1;
let lastSelectionClick:
  | {
      entityId: string;
      kind: GameEntity['kind'];
      faction: GameEntity['faction'];
      atMs: number;
    }
  | null = null;
let selectionDrag:
  | {
      pointerId: number;
      startScreenX: number;
      startScreenY: number;
      currentScreenX: number;
      currentScreenY: number;
      startWorldX: number;
      startWorldY: number;
      shiftKey: boolean;
      active: boolean;
    }
  | null = null;
let attackMovePlacement = false;
let attackTargetPlacement = false;
let lastMoveCommand: { x: number; y: number; entityIds: string[]; pathLength: number } | undefined;
const movementRecoveryState = new Map<string, { x: number; y: number; stagnantSeconds: number }>();
let combatPreviewWorld: { x: number; y: number } | undefined;
let combatPreviewTargetId: string | undefined;
let combatPreviewTargetValid = false;
let lastCommandResult: CommandResult | undefined;
let lastCombatEvent: RtsDebugState['lastCombatEvent'];
let lastSabotageEvent: RtsDebugState['lastSabotageEvent'];
let lastRepairEvent: RtsDebugState['lastRepairEvent'];
let lastResourceEvent: RtsDebugState['lastResourceEvent'];
let lastProductionEvent: RtsDebugState['lastProductionEvent'];
let inspectedResourceTarget: { kind: 'metal' | 'fish'; id: string } | null = null;
let debugHookLayers: RenderLayers | null = null;
let placementMode: PlacementMode | null = null;
let alertId = 0;
const recentAlerts: RtsDebugState['alerts'] = [];
let lastFrameMs = 0;
const frameSamples: number[] = [];
let simulationClockSeconds = 0;
let fogRefreshSeconds = 0;
let lastCombatFireSfxAtSeconds = -1;
let lastCombatHitSfxAtSeconds = -1;
const warningCooldownUntil = new Map<string, number>();
const minimapAttackPings: Array<{
  x: number;
  y: number;
  startedAtSeconds: number;
  durationSeconds: number;
  severity: 'warning' | 'error';
}> = [];
const audioManager = new AudioManager(window);
const audioState = audioManager.state;
const playerSettings = loadPlayerSettings(window);
let pauseMenuOpen = false;
let skirmishStarted = false;

audioManager.loadPersistedSettings();
applyPlayerSettings();

function setBootStatus(status: BootStatus, message: string): void {
  root.dataset.bootStatus = status;
  statusElement.textContent = message;
  pushAlert(statusToAlertSeverity(status, message), message);
}

function setBootStatusWithFocus(status: BootStatus, message: string, focusWorld: { x: number; y: number }): void {
  root.dataset.bootStatus = status;
  statusElement.textContent = message;
  pushAlert(statusToAlertSeverity(status, message), message, focusWorld);
}

function statusToAlertSeverity(status: BootStatus, message: string): AlertSeverity {
  if (status === 'failed') {
    return 'error';
  }
  if (/rejected|invalid|warning|depleted|no route|failed/i.test(message)) {
    return 'warning';
  }
  if (status === 'loading') {
    return 'info';
  }
  return 'success';
}

function pushAlert(severity: AlertSeverity, message: string, focusWorld?: { x: number; y: number }): void {
  if (!shouldSurfaceAlert(severity, focusWorld)) {
    return;
  }
  const latest = recentAlerts[0];
  if (
    latest?.message === message
    && latest.severity === severity
    && latest.focusWorld?.x === focusWorld?.x
    && latest.focusWorld?.y === focusWorld?.y
  ) {
    return;
  }
  recentAlerts.unshift({ id: ++alertId, message, severity, focusWorld });
  recentAlerts.splice(5);
  renderAlertFeed();
}

function shouldSurfaceAlert(severity: AlertSeverity, focusWorld?: { x: number; y: number }): boolean {
  return severity === 'warning' || severity === 'error' || Boolean(focusWorld);
}

function isImportantPlayerWarningTarget(entity: GameEntity): boolean {
  return entity.faction === 'player' && (
    entity.kind === 'factory'
    || entity.kind === 'dock'
    || entity.kind === 'truck'
    || entity.kind === 'boat'
    || entity.kind === 'guardTower'
    || entity.kind === 'techLab'
    || entity.kind === 'barracks'
  );
}

function shouldEmitRateLimitedWarning(key: string, cooldownSeconds: number): boolean {
  const nextAllowedAt = warningCooldownUntil.get(key) ?? 0;
  if (simulationClockSeconds < nextAllowedAt) {
    return false;
  }
  warningCooldownUntil.set(key, simulationClockSeconds + cooldownSeconds);
  return true;
}

function issuePlayerAssetWarning(target: GameEntity, phase: 'incoming' | 'damaged' | 'destroyed'): void {
  if (!isImportantPlayerWarningTarget(target)) {
    return;
  }

  const cooldownSeconds = phase === 'destroyed' ? 0 : phase === 'incoming' ? 5 : 4;
  const key = `${phase}:${target.id}`;
  if (!shouldEmitRateLimitedWarning(key, cooldownSeconds)) {
    return;
  }

  const message =
    phase === 'incoming'
      ? `Warning: ${target.name} is under attack.`
      : phase === 'destroyed'
        ? `Warning: ${target.name} was destroyed.`
        : `Warning: ${target.name} is taking damage.`;
  pushMinimapAttackPing(target.x, target.y, phase === 'destroyed' ? 'error' : 'warning');
  setBootStatusWithFocus('ready', message, { x: target.x, y: target.y });
  playSfx('warning');
}

function pushMinimapAttackPing(x: number, y: number, severity: 'warning' | 'error'): void {
  const existingPing = minimapAttackPings.find(
    (ping) =>
      Math.abs(ping.x - x) <= 56
      && Math.abs(ping.y - y) <= 56
      && simulationClockSeconds - ping.startedAtSeconds <= 0.9,
  );
  if (existingPing) {
    existingPing.startedAtSeconds = simulationClockSeconds;
    existingPing.durationSeconds = Math.max(existingPing.durationSeconds, severity === 'error' ? 2.3 : 1.8);
    existingPing.severity = severity === 'error' ? 'error' : existingPing.severity;
    return;
  }

  minimapAttackPings.push({
    x,
    y,
    startedAtSeconds: simulationClockSeconds,
    durationSeconds: severity === 'error' ? 2.3 : 1.8,
    severity,
  });
}

function pruneMinimapAttackPings(): void {
  for (let index = minimapAttackPings.length - 1; index >= 0; index -= 1) {
    const ping = minimapAttackPings[index];
    if (simulationClockSeconds - ping.startedAtSeconds > ping.durationSeconds) {
      minimapAttackPings.splice(index, 1);
    }
  }
}

function renderAlertFeed(): void {
  hudPresenter.renderAlerts(recentAlerts, focusAlert);
}

function focusAlert(alertId: number): void {
  const alert = recentAlerts.find((entry) => entry.id === alertId);
  if (!alert?.focusWorld || !debugHookLayers) {
    return;
  }
  centerCameraOnViewport(alert.focusWorld.x, alert.focusWorld.y, gameElement.clientWidth, gameElement.clientHeight, debugHookLayers);
  setBootStatus('ready', `Camera focused on alert: ${alert.message}`);
}

function applyAudioSettings(): void {
  audioManager.applyGainSettings();
  syncAudioControls(audioState, {
    musicSlider: musicSliderElement,
    sfxSlider: sfxSliderElement,
    musicReadout: musicReadoutElement,
    sfxReadout: sfxReadoutElement,
  });
}

function updateAudioSetting(kind: 'music' | 'sfx', value: number): void {
  audioManager.updateSetting(kind, value);
  applyAudioSettings();
  if (debugState) {
    window.__wambasaRts = { ...debugState, audio: { ...audioState } };
  }
}

async function unlockAudio(): Promise<void> {
  await audioManager.unlock();
  applyAudioSettings();
}

function focusGameViewport(): void {
  gameElement.focus({ preventScroll: true });
}

async function requestPlayFullscreen(): Promise<void> {
  if (document.fullscreenElement || typeof root.requestFullscreen !== 'function') {
    return;
  }
  try {
    await root.requestFullscreen();
  } catch {
    // Ignore fullscreen failures caused by browser policy or unsupported environments.
  }
}

function playSfx(cue: SfxCue): void {
  audioManager.playSfx(cue);
}

function playCombatFireSfx(): void {
  if (simulationClockSeconds - lastCombatFireSfxAtSeconds < 0.11) {
    return;
  }
  lastCombatFireSfxAtSeconds = simulationClockSeconds;
  playSfx('combatFire');
}

function playCombatHitSfx(): void {
  if (simulationClockSeconds - lastCombatHitSfxAtSeconds < 0.09) {
    return;
  }
  lastCombatHitSfxAtSeconds = simulationClockSeconds;
  playSfx('combatHit');
}

function updateMatchResultPanel(): void {
  hudPresenter.renderMatchResult(matchState, matchStats);
  hudPresenter.syncPause({ outcome: matchState.outcome, pauseMenuOpen, skirmishStarted });
}

function syncPauseUi(): void {
  hudPresenter.syncPause({ outcome: matchState.outcome, pauseMenuOpen, skirmishStarted });
}

function setPauseMenuOpen(open: boolean, layers: RenderLayers): void {
  if (!skirmishStarted && !open) {
    syncPauseUi();
    publishDebugState(layers);
    return;
  }
  const nextOpen = open && matchState.outcome === 'running';
  if (pauseMenuOpen === nextOpen) {
    syncPauseUi();
    publishDebugState(layers);
    return;
  }

  pauseMenuOpen = nextOpen;
  if (pauseMenuOpen) {
    cancelActiveCommandMode(layers);
    setBootStatus('ready', 'Skirmish paused. Press F10 to return to the menu anytime.');
  } else {
    setBootStatus('ready', 'Skirmish resumed.');
  }
  syncPauseUi();
  updateCommandHint();
  publishDebugState(layers);
}

function applyPlayerSettings(): void {
  applyUiScale(root, playerSettings.uiScale); uiScaleSliderElement.value = String(playerSettings.uiScale); uiScaleReadoutElement.textContent = `${playerSettings.uiScale}%`;
  scrollSpeedSliderElement.value = String(playerSettings.scrollSpeed); scrollSpeedReadoutElement.textContent = `${playerSettings.scrollSpeed}%`;
  edgeScrollToggleElement.checked = playerSettings.edgeScroll; difficultySelectElement.value = playerSettings.difficulty; root.dataset.difficulty = playerSettings.difficulty;
}
function updatePlayerSetting(key: 'uiScale' | 'scrollSpeed' | 'edgeScroll' | 'difficulty', value: number | boolean | string): void {
  Object.assign(playerSettings, { [key]: value }); applyPlayerSettings(); persistPlayerSettings(window, playerSettings); if (debugState) window.__wambasaRts = { ...debugState, settings: { ...playerSettings } };
}

function getObjectiveDebugState(): RtsDebugState['objectives'] {
  const selectedPlayerCommandable = [...selectedEntityIds].some((id) => {
    const entity = entities.find((candidate) => candidate.id === id);
    return Boolean(entity?.commandable && entity.faction === 'player');
  });
  const selectedDock = [...selectedEntityIds].some((id) => {
    const entity = entities.find((candidate) => candidate.id === id);
    return Boolean(entity?.kind === 'dock' && entity.faction === 'player' && entity.commandable && getDamageState(entity) !== 'destroyed');
  });
  const playerBoat = entities.some((entity) => entity.kind === 'boat' && entity.faction === 'player');
  const completedGuardTower = entities.some(
    (entity) => entity.kind === 'guardTower' && entity.faction === 'player' && entity.economy?.construction?.complete === true,
  );
  const playerGuardCount = entities.filter((entity) => entity.kind === 'guard' && entity.faction === 'player').length;
  const playerSaboteurCount = entities.filter((entity) => entity.kind === 'saboteur' && entity.faction === 'player').length;
  const hasDefenseResponse = completedGuardTower || playerGuardCount > 1 || playerSaboteurCount > 1 || Boolean(lastCombatEvent) || Boolean(lastSabotageEvent);

  const items: RtsDebugState['objectives']['items'] = [
    {
      id: 'select',
      title: 'Select your crew',
      description: 'Left-click a worker, guard, truck, or building to reveal orders.',
      complete: selectedPlayerCommandable || Boolean(lastCommandResult),
      current: false,
    },
    {
      id: 'harvest',
      title: 'Harvest starter metal',
      description: 'Select the Metal Hauler, then right-click a metal field and return cargo to Factory.',
      complete: lastResourceEvent?.kind === 'metalUnloaded' || economyState.metal > FIRST_SKIRMISH_BALANCE.playerStartingMetal,
      current: false,
    },
    {
      id: 'fish',
      title: 'Sell fish for cash',
      description: 'Workers can fish shoreline shoals and sell the catch at Factory until you build a Dock.',
      complete: economyState.cash > FIRST_SKIRMISH_BALANCE.playerStartingCash,
      current: false,
    },
    {
      id: 'dock',
      title: 'Build your first Dock',
      description: 'A Dock unlocks boats and offshore fishing routes.',
      complete: Boolean(entities.find((entity) => entity.kind === 'dock' && entity.faction === 'player' && entity.economy?.construction?.complete === true)),
      current: false,
    },
    {
      id: 'boat',
      title: 'Produce a Fishing Boat',
      description: 'Select the Dock and launch a boat once your shoreline economy is running.',
      complete: playerBoat,
      current: false,
    },
    {
      id: 'defense',
      title: 'Defend or raid',
      description: 'Use guards or Guard Towers to protect haulers and pressure rival assets.',
      complete: hasDefenseResponse,
      current: false,
    },
    {
      id: 'win',
      title: 'Win the skirmish',
      description: `Crush the rival base and field army, or after ${Math.round(FIRST_SKIRMISH_BALANCE.economicVictoryGraceSeconds / 60)} minutes reach ${PLAYER_PROFIT_TARGET} cash with a ${ECONOMIC_VICTORY_LEAD_REQUIRED} cash lead.`,
      complete: matchState.outcome !== 'running',
      current: false,
    },
  ];
  const current = items.find((item) => !item.complete);
  return {
    currentId: current?.id,
    items: items.map((item) => ({ ...item, current: item.id === current?.id })),
  };
}

function renderObjectives(objectives: RtsDebugState['objectives']): void {
  hudPresenter.renderObjectives(objectives);
}

function completeMatch(outcome: Exclude<MatchOutcome, 'running'>, reason: string, layers: RenderLayers): void {
  if (matchState.outcome !== 'running') {
    return;
  }

  matchState.outcome = outcome;
  matchState.reason = reason;
  playSfx(outcome === 'victory' ? 'victory' : 'defeat');
  updateMatchResultPanel();
  publishDebugState(layers);
}

function evaluateMatchEnd(layers: RenderLayers): void {
  normalizeEconomyValues();
  const result = evaluateWinCondition({
    entities,
    playerCash: economyState.cash,
    aiCash: aiEconomyState.cash,
    playerMetal: economyState.metal,
    aiMetal: aiEconomyState.metal,
    elapsedSeconds: simulationClockSeconds,
    playerProfitTarget: PLAYER_PROFIT_TARGET,
    aiProfitTarget: AI_PROFIT_TARGET,
    economicVictoryLeadRequired: ECONOMIC_VICTORY_LEAD_REQUIRED,
    economicVictoryGraceSeconds: FIRST_SKIRMISH_BALANCE.economicVictoryGraceSeconds,
    getDamageState,
  });
  if (matchState.outcome === 'running' && result) {
    completeMatch(result.outcome, result.reason, layers);
  }
}

function normalizeEconomyValues(): void {
  economyState.metal = Math.max(0, Math.round(economyState.metal));
  economyState.cash = Math.max(0, Math.round(economyState.cash));
  aiEconomyState.metal = Math.max(0, Math.round(aiEconomyState.metal));
  aiEconomyState.cash = Math.max(0, Math.round(aiEconomyState.cash));
  matchStats.cashEarned = Math.max(0, Math.round(matchStats.cashEarned));
  matchStats.fishSold = Math.max(0, Math.round(matchStats.fishSold));
  matchStats.metalHarvested = Math.max(0, Math.round(matchStats.metalHarvested));
}

function publishDebugState(layers: RenderLayers): void {
  syncAnimationIdentities();
  const objectives = getObjectiveDebugState();
  renderObjectives(objectives);
  debugState = createDebugSnapshot({
    paused: pauseMenuOpen,
    alerts: recentAlerts,
    combatPreview: {
      active: shouldShowCombatPreview(),
      hoveredEntityId: combatPreviewTargetId,
      hoveredTargetValid: combatPreviewTargetValid,
      selectedAttackerIds: getSelectedCombatPreviewUnits().map((entity) => entity.id),
      rangeCircleCount: shouldShowCombatPreview() ? getSelectedCombatPreviewUnits().length : 0,
    },
    objectives,
    camera,
    layerLabels: [layers.terrain, layers.buildings, layers.units, layers.effects, layers.fog, layers.overlays, layers.debug].map((layer) => layer.label),
    overlayLabels: layers.overlays.children.map((child) => child.label ?? 'unlabeled-overlay'),
    selectedEntityIds: [...selectedEntityIds],
    entities,
    lastMoveCommand,
    lastCommandResult,
    lastCombatEvent,
    lastSabotageEvent,
    lastRepairEvent,
    collision: getCollisionDebugState(),
    metal: economyState.metal,
    cash: economyState.cash,
    resourceFields,
    ai: getAiDebugState(),
    lastResourceEvent,
    lastProductionEvent,
    crew: getCrewDebugState(),
    placementMode,
    match: {
      outcome: matchState.outcome,
      reason: matchState.reason,
      playerProfitTarget: PLAYER_PROFIT_TARGET,
      aiProfitTarget: AI_PROFIT_TARGET,
    },
    stats: { ...matchStats },
    balance: FIRST_SKIRMISH_BALANCE,
    performance: getPerformanceDebugState(),
    audio: { ...audioState },
    settings: { ...playerSettings },
    mapData: { ...mapData, fishingZones: fishingZoneStates },
    getCollisionRadius,
    getAnimationProfile,
    animationFrameCount: (state, profile, entity) => entityAnimationFrameCount(entity, state, profile),
    getDamageState,
  });
  window.__wambasaRts = debugState;
}

function updateFogOfWar(layers: RenderLayers): void {
  recomputePlayerVisibility(visibilityState, entities, getDamageState);
  renderFogOfWar(layers, visibilityState);
}

function updateFogOfWarThrottled(deltaSeconds: number, layers: RenderLayers): void {
  fogRefreshSeconds -= deltaSeconds;
  if (fogRefreshSeconds > 0) {
    return;
  }
  fogRefreshSeconds = 0.2;
  updateFogOfWar(layers);
}

function syncAnimationIdentities(): void {
  for (const entity of entities) {
    const nextState = resolveAnimationAction(entity, getDamageState);
    const nextDirection = resolveAnimationDirection(entity, getAnimationTargetPosition);
    const profile = getAnimationProfile(entity);
    if (entity.animation.state !== nextState) {
      entity.animation = { state: nextState, direction: nextDirection, frame: 0, clock: 0 };
    } else if (entity.animation.direction !== nextDirection) {
      entity.animation = { ...entity.animation, direction: nextDirection };
    }
  }
}

function getAiDebugState(): RtsDebugState['ai'] {
  const enemyUnits = entities.filter((entity) => entity.faction === 'enemy');
  return {
    metal: aiEconomyState.metal,
    cash: aiEconomyState.cash,
    baseArea: mapData.baseAreas.find((area) => area.owner === 'enemy'),
    unitIds: enemyUnits.map((entity) => entity.id),
    commandCenterId: enemyUnits.find((entity) => entity.kind === 'enemyFactory')?.id,
    lastAction: aiController.lastAction,
    lastProductionEvent: aiController.lastProductionEvent,
    lastResourceEvent: aiController.lastResourceEvent,
    lastRaidEvent: aiController.lastRaidEvent,
    lastDefenseEvent: aiController.lastDefenseEvent,
  };
}

function getPerformanceDebugState(): RtsDebugState['performance'] {
  const averageFrameMs =
    frameSamples.length > 0 ? frameSamples.reduce((total, sample) => total + sample, 0) / frameSamples.length : lastFrameMs;
  return {
    averageFrameMs: Math.round(averageFrameMs * 10) / 10,
    lastFrameMs: Math.round(lastFrameMs * 10) / 10,
    estimatedFps: averageFrameMs > 0 ? Math.round(1000 / averageFrameMs) : 0,
    viewportWidth: Math.round(gameElement.clientWidth),
    viewportHeight: Math.round(gameElement.clientHeight),
  };
}

const {
  renderMap,
  renderWorldOverlays,
  renderEntities,
  renderBuildings,
  renderUnits,
} = createRenderRuntime({
  mapData,
  fishingZones: fishingZoneStates,
  resourceFields,
  elapsedSeconds: () => simulationClockSeconds,
  getEntityRenderContext,
  drawSelectionOverlay,
  drawDestinationOverlay,
  drawPlacementPreview,
  drawCombatTargetingOverlay,
});

function getEntityRenderContext(): EntityRenderContext {
  return { entities: entities.filter((entity) => isEntityVisible(visibilityState, entity)), getDamageState, getMaxHealth };
}

function getMobileEntities(): GameEntity[] {
  return entities.filter((entity) => entity.movement.speed > 0 && getDamageState(entity) !== 'destroyed' && !entity.renderable.hidden);
}

function getLandMobileEntities(): GameEntity[] {
  return getMobileEntities().filter((entity) => entity.kind !== 'boat');
}

function getMaxHealth(entity: GameEntity): number {
  if (entity.kind === 'factory') return 1200;
  if (entity.kind === 'enemyFactory') return 900;
  if (entity.kind === 'dock') return entity.faction === 'player' ? 800 : buildingCatalog.dock.health;
  if (entity.kind === 'house') return entity.faction === 'enemy' ? 90 : buildingCatalog.house.health;
  if (entity.kind === 'guardTower') return buildingCatalog.guardTower.health;
  if (entity.kind === 'techLab') return buildingCatalog.techLab.health;
  if (entity.kind === 'barracks') return buildingCatalog.barracks.health;
  if (entity.kind === 'guard') return 110 + getFactionUpgradeLevel(entity.faction, 'military') * 18;
  if (entity.kind === 'saboteur') return 75;
  if (entity.kind === 'worker') return 85;
  if (entity.kind === 'truck') return 140;
  if (entity.kind === 'boat') {
    const boatLevel = getFactionUpgradeLevel(entity.faction, 'boats');
    const militaryLevel = getFactionUpgradeLevel(entity.faction, 'military');
    const baseHealth = entity.economy?.combatRole === 'attack' ? 155 + militaryLevel * 14 : 125;
    return baseHealth + boatLevel * 15;
  }
  return entity.economy?.health ?? 1;
}

function getDamageState(entity: GameEntity): DamageState | undefined {
  const health = entity.economy?.health;
  if (health === undefined) {
    return undefined;
  }
  if (health <= 0) {
    return 'destroyed';
  }
  const ratio = health / getMaxHealth(entity);
  if (ratio <= 0.25) {
    return 'critical';
  }
  if (ratio <= 0.65) {
    return 'damaged';
  }
  return 'healthy';
}

function applyDamage(target: GameEntity, amount: number): DamageState | undefined {
  const currentHealth = target.economy?.health;
  if (currentHealth === undefined || currentHealth <= 0) {
    return getDamageState(target);
  }

  const nextHealth = Math.max(0, currentHealth - amount);
  target.economy = { ...target.economy, health: nextHealth, damageState: getDamageState({ ...target, economy: { ...target.economy, health: nextHealth } }) };
  if (nextHealth <= 0) {
    recordDestroyedEntity(target);
    disableDestroyedEntity(target);
  }
  return target.economy.damageState;
}

function recordDestroyedEntity(entity: GameEntity): void {
  if (entity.faction === 'player') {
    if (entity.renderable.layer === 'buildings') {
      matchStats.playerBuildingsLost += 1;
    } else {
      matchStats.playerUnitsLost += 1;
    }
    return;
  }
  if (entity.faction === 'enemy') {
    if (entity.renderable.layer === 'buildings') {
      matchStats.enemyBuildingsDestroyed += 1;
    } else {
      matchStats.enemyUnitsDestroyed += 1;
    }
  }
}

function disableDestroyedEntity(entity: GameEntity): void {
  destroyAssignedFactoryCrew({
    factory: entity,
    entities,
    getDamageState,
    destroyCrew: (crew) => {
      recordDestroyedEntity(crew);
      crew.economy = { ...crew.economy, health: 0, damageState: 'destroyed' };
      disableDestroyedEntity(crew);
    },
  });

  selectedEntityIds.delete(entity.id);
  entity.commandable = false;
  entity.movement.state = 'idle';
  entity.moveTarget = undefined;
  entity.path = [];
  entity.economy = {
    ...entity.economy,
    productionQueue: undefined,
    harvesting: undefined,
    fishing: undefined,
    shoreFishing: undefined,
    unloadingFish: undefined,
    factoryDuty: undefined,
    attack: undefined,
    sabotage: undefined,
    repair: undefined,
    buildJob: undefined,
    destruction: {
      phase: entity.renderable.layer === 'buildings' ? 'exploding' : 'vanishing',
      remainingSeconds: entity.renderable.layer === 'buildings' ? 1.1 : 0.18,
      totalSeconds: entity.renderable.layer === 'buildings' ? 1.1 : 0.18,
    },
  };
}

function issueDeleteSelectedCommand(layers: RenderLayers): void {
  const selected = getSelectedEntities(entities, selectedEntityIds);
  const deletable = selected.filter(
    (entity) =>
      entity.faction === 'player' &&
      !entity.renderable.hidden &&
      entity.economy?.health !== undefined &&
      getDamageState(entity) !== 'destroyed',
  );

  if (deletable.length === 0) {
    setBootStatus('ready', selected.length > 0 ? 'Delete rejected: only your own units and buildings can be deleted.' : 'Select a unit or building before pressing Delete.');
    playSfx('error');
    publishDebugState(layers);
    return;
  }

  const entity = deletable[0];
  if (!entity) {
    return;
  }
  applyDamage(entity, entity.economy?.health ?? getMaxHealth(entity));

  playSfx('warning');
  renderBuildings(layers);
  renderUnits(layers);
  drawSelectionOverlay(layers);
  updateEconomyReadout();
  updateSelectionReadout();
  evaluateMatchEnd(layers);
  setBootStatus('ready', `Deleted ${entity.name}.`);
  publishDebugState(layers);
}

function updateDestroyedEntities(deltaSeconds: number, layers: RenderLayers): boolean {
  const output = updateDestructionSystem({ entities, deltaSeconds });
  if (output.removedIds.length > 0) {
    for (const id of output.removedIds) {
      selectedEntityIds.delete(id);
    }
  }
  if (!output.changed) {
    return false;
  }
  renderUnits(layers);
  renderBuildings(layers);
  drawSelectionOverlay(layers);
  updateSelectionReadout();
  publishDebugState(layers);
  return true;
}

function getCollisionDebugState(): RtsDebugState['collision'] {
  const mobileEntities = getMobileEntities();
  let minimumMobileUnitDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < mobileEntities.length; i += 1) {
    for (let j = i + 1; j < mobileEntities.length; j += 1) {
      const a = mobileEntities[i];
      const b = mobileEntities[j];
      minimumMobileUnitDistance = Math.min(minimumMobileUnitDistance, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }

  return {
    minimumMobileUnitDistance: Number.isFinite(minimumMobileUnitDistance) ? Math.round(minimumMobileUnitDistance) : 0,
    mobileUnitCount: mobileEntities.length,
  };
}

function drawSelectionOverlay(layers: RenderLayers): void {
  drawSelectionOverlayForRender(layers, entities, selectedEntityIds);
  drawResourceInspectionOverlayForRender(layers, resourceFields, fishingZoneStates, inspectedResourceTarget);
  drawCombatTargetingOverlay(layers);
}

function drawSelectionDragOverlay(layers: RenderLayers): void {
  drawSelectionDragOverlayForRender(layers, selectionDrag, screenToWorldFromClient);
}

function drawCombatTargetingOverlay(layers: RenderLayers): void {
  drawCombatTargetingOverlayForRender(layers, entities, {
    active: shouldShowCombatPreview(),
    hoverWorld: combatPreviewWorld,
    hoveredEntityId: combatPreviewTargetId,
    hoveredTargetValid: combatPreviewTargetValid,
    selectedAttackerIds: getSelectedCombatPreviewUnits().map((entity) => entity.id),
  });
}

function drawDestinationOverlay(layers: RenderLayers): void {
  drawDestinationOverlayForRender(layers, entities, lastMoveCommand);
}

function drawPlacementPreview(layers: RenderLayers): void {
  drawPlacementPreviewForRender(layers, placementMode);
}

const {
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
} = createCameraRuntime({
  camera,
  gameElement,
  minimapElement,
  minimapContext: minimapDrawingContext,
  mapData,
  getResourceFields: () => resourceFields.filter((field) => isWorldExplored(visibilityState, field.x, field.y)),
  getFishingZones: () => fishingZoneStates.filter((zone) => isWorldExplored(visibilityState, zone.x, zone.y)),
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  getEntities: () => entities.filter((entity) => entity.faction === 'player' || isEntityVisible(visibilityState, entity)),
  getAttackPings: () =>
    minimapAttackPings.map((ping) => ({
      x: ping.x,
      y: ping.y,
      ageSeconds: simulationClockSeconds - ping.startedAtSeconds,
      durationSeconds: ping.durationSeconds,
      severity: ping.severity,
    })),
  getPlayerFactory: () => entities.find((entity) => entity.kind === 'factory' && entity.faction === 'player'),
  setBootStatus,
  publishDebugState,
});

function pickEntityAt(worldX: number, worldY: number): GameEntity | null {
  for (const entity of [...entities].reverse()) {
    if (entity.renderable.hidden || !isEntityVisible(visibilityState, entity)) {
      continue;
    }
    if (isPointInsideEntity(worldX, worldY, entity)) {
      return entity;
    }
  }
  return null;
}

function isPointInsideEntity(worldX: number, worldY: number, entity: GameEntity): boolean {
  if (entity.collider.kind === 'circle') {
  const selectionPadding = entity.selectable ? 12 : 0;
  return Math.hypot(worldX - entity.x, worldY - entity.y) <= entity.collider.radius + selectionPadding;
  }

  const selectionPadding = entity.selectable ? 12 : 0;
  return (
    worldX >= entity.x - entity.collider.width / 2 - selectionPadding &&
    worldX <= entity.x + entity.collider.width / 2 + selectionPadding &&
    worldY >= entity.y - entity.collider.height / 2 - selectionPadding &&
    worldY <= entity.y + entity.collider.height / 2 + selectionPadding
  );
}

function selectEntity(entity: GameEntity | null, layers: RenderLayers, additive = false): void {
  if (!additive) {
    selectedEntityIds.clear();
  }
  inspectedResourceTarget = null;
  if (entity && additive && selectedEntityIds.has(entity.id)) {
    selectedEntityIds.delete(entity.id);
  } else if (entity) {
    selectedEntityIds.add(entity.id);
  }
  drawSelectionOverlay(layers);
  updateSelectionReadout();
  publishDebugState(layers);
}

function selectEntitiesInRect(rect: RectData, layers: RenderLayers, additive: boolean): void {
  if (!additive) {
    selectedEntityIds.clear();
  }
  inspectedResourceTarget = null;

  for (const entity of entities) {
    if (entity.faction !== 'player' || !entity.commandable || entity.movement.speed <= 0) {
      continue;
    }
    if (entity.x >= rect.x && entity.x <= rect.x + rect.width && entity.y >= rect.y && entity.y <= rect.y + rect.height) {
      selectedEntityIds.add(entity.id);
    }
  }

  drawSelectionOverlay(layers);
  updateSelectionReadout();
  publishDebugState(layers);
}

function getResourceInspectionText(): string | null {
  const target = inspectedResourceTarget;
  if (!target) {
    return null;
  }
  if (target.kind === 'metal') {
    const field = resourceFields.find((candidate) => candidate.id === target.id);
    if (!field) {
      return null;
    }
    const percent = Math.round((field.amount / Math.max(1, field.maxAmount)) * 100);
    if (field.amount <= 0) {
      return 'Depleted Metal Field: exhausted ore deposit.';
    }
    return `Metal Field: ${Math.max(0, Math.round(field.amount))} metal left | ${percent}% stock | Right-click with trucks to harvest`;
  }
  const zone = fishingZoneStates.find((candidate) => candidate.id === target.id);
  if (!zone) {
    return null;
  }
  const species = zone.species?.length ? zone.species.map((entry) => entry[0].toUpperCase() + entry.slice(1)).join('/') : 'Mixed fish';
  const access = zone.shoreAccess ? 'shore + boat' : 'boat only';
  return `${zone.label}: ${Math.max(0, Math.round(zone.amount))}/${zone.maxFish} fish | ${zone.cashPerFish} cash/fish | ${species} | ${access} | ${zone.tier === 'contested' ? 'Contested waters' : 'Safe waters'}`;
}

function inspectWorldTargetAt(worldX: number, worldY: number, layers: RenderLayers): boolean {
  const resourceField = pickResourceFieldAt(worldX, worldY);
  if (resourceField) {
    selectedEntityIds.clear();
    inspectedResourceTarget = { kind: 'metal', id: resourceField.id };
    drawSelectionOverlay(layers);
    updateSelectionReadout();
    publishDebugState(layers);
    return true;
  }
  const fishingZone = pickFishingZoneAt(worldX, worldY);
  if (fishingZone) {
    selectedEntityIds.clear();
    inspectedResourceTarget = { kind: 'fish', id: fishingZone.id };
    drawSelectionOverlay(layers);
    updateSelectionReadout();
    publishDebugState(layers);
    return true;
  }
  return false;
}

function updateSelectionReadout(): void {
  const selected = getSelectedEntities(entities, selectedEntityIds);
  const crew = getCrewDebugState();
  hudPresenter.renderSelection({
    pauseMenuOpen,
    placementMode,
    attackTargetPlacement,
    attackMovePlacement,
    combatPreviewTargetId,
    combatPreviewTargetValid,
    selected,
    allEntities: entities,
    getDamageState,
    getFishingZone: (zoneId) => fishingZoneStates.find((zone) => zone.id === zoneId),
    resourceInspection:
      selected.length === 0
        ? (inspectedResourceTarget ? { kind: inspectedResourceTarget.kind, text: getResourceInspectionText() ?? 'No unit selected' } : null)
        : null,
    economy: economyState,
    crew,
    selectedFactory: getSelectedFactory(),
    factoryCrewTarget: getFactoryCrewTarget(),
    selectedDock: getSelectedDock(),
    selectedBarracks: getSelectedBarracks(),
    selectedTechLab: getSelectedTechLab(),
    selectedWorkerCount: getSelectedWorkers().length,
    selectedFactoryCrewCount: getSelectedFactoryCrewCount(),
    selectedFactoryReleaseCount: getRequestedFactoryCrewReleaseCount(),
    availableReels: getAvailableReelInventory(),
  });
  if (!shouldShowCombatPreview()) {
    combatPreviewWorld = undefined;
    combatPreviewTargetId = undefined;
    combatPreviewTargetValid = false;
    gameElement.dataset.combatCursor = 'none';
  }
}

function updateCommandHint(selected = getSelectedEntities(entities, selectedEntityIds)): void {
  hudPresenter.renderCommandPresentation({
    pauseMenuOpen,
    placementMode,
    attackTargetPlacement,
    attackMovePlacement,
    combatPreviewTargetId,
    combatPreviewTargetValid,
    selected,
  });
}

function updateEconomyReadout(): void {
  normalizeEconomyValues();
  const crew = getCrewDebugState();
  hudPresenter.renderEconomy({
    economy: economyState,
    crew,
    selectedFactory: getSelectedFactory(),
    factoryCrewTarget: getFactoryCrewTarget(),
    selectedDock: getSelectedDock(),
    selectedBarracks: getSelectedBarracks(),
    selectedTechLab: getSelectedTechLab(),
    selectedWorkerCount: getSelectedWorkers().length,
    selectedFactoryCrewCount: getSelectedFactoryCrewCount(),
    selectedFactoryReleaseCount: getRequestedFactoryCrewReleaseCount(),
    availableReels: getAvailableReelInventory(),
    placementMode,
  });
}

function getCrewDebugState(): RtsDebugState['crew'] {
  return {
    used: getPlayerCrewUsage(),
    reserved: getQueuedPlayerCrewUsage(),
    capacity: crewState.capacity,
  };
}

function getPlayerCrewUsage(): number {
  return entities.reduce((sum, entity) => {
    if (entity.faction !== 'player' || getDamageState(entity) === 'destroyed') {
      return sum;
    }
    return sum + getEntityCrewCost(entity);
  }, 0);
}

function getQueuedPlayerCrewUsage(): number {
  return entities
    .filter((entity) => entity.faction === 'player')
    .reduce(
      (sum, entity) => sum + (entity.economy?.productionQueue ?? []).reduce((queueSum, item) => queueSum + (productionCatalog[item.product].crewCost ?? 0), 0),
      0,
    );
}

function updateFactoryCommandPanel(): void {
  updateEconomyReadout();
}

function updateDockCommandPanel(): void {
  updateEconomyReadout();
}

function getSelectedFactory(): GameEntity | null {
  return querySelectedFactory(entities, selectedEntityIds);
}

function getAvailablePlayerFactories(): GameEntity[] {
  return entities.filter(
    (entity) => entity.kind === 'factory' && entity.faction === 'player' && entity.commandable && (entity.economy?.health ?? 0) > 0,
  );
}

function getFactoryCrewTarget(preferredFactory?: GameEntity | null): GameEntity | null {
  if (preferredFactory?.kind === 'factory' && preferredFactory.faction === 'player' && preferredFactory.commandable) {
    return preferredFactory;
  }

  const selectedFactory = getSelectedFactory();
  if (selectedFactory) {
    return selectedFactory;
  }

  const playerFactories = getAvailablePlayerFactories();
  return playerFactories.length === 1 ? playerFactories[0] : null;
}

function getSelectedWorkers(): GameEntity[] {
  return querySelectedWorkers(entities, selectedEntityIds);
}

function getSelectedFactoryCrewCount(): number {
  return countAssignedFactoryCrew(entities, getSelectedFactory()?.id);
}

function getRequestedFactoryCrewReleaseCount(): number {
  const assignedCrewCount = getSelectedFactoryCrewCount();
  if (assignedCrewCount <= 0) {
    factoryCrewReleaseCount = 1;
    return 1;
  }
  factoryCrewReleaseCount = Math.max(1, Math.min(factoryCrewReleaseCount, assignedCrewCount));
  return factoryCrewReleaseCount;
}

function adjustFactoryCrewReleaseCount(delta: number): void {
  const assignedCrewCount = getSelectedFactoryCrewCount();
  if (assignedCrewCount <= 0) {
    factoryCrewReleaseCount = 1;
  } else {
    factoryCrewReleaseCount = Math.max(1, Math.min(factoryCrewReleaseCount + delta, assignedCrewCount));
  }
  updateSelectionReadout();
  updateEconomyReadout();
}

function getCompletedFriendlyDocks(faction: Faction): GameEntity[] {
  return entities.filter(
    (entity) =>
      entity.kind === 'dock'
      && entity.faction === faction
      && getDamageState(entity) !== 'destroyed'
      && (entity.economy?.construction?.complete ?? true),
  );
}

function getFriendlyFishBanks(faction: Faction): GameEntity[] {
  const docks = getCompletedFriendlyDocks(faction);
  const factory = entities.find(
    (entity) =>
      entity.faction === faction
      && (entity.kind === 'factory' || entity.kind === 'enemyFactory')
      && getDamageState(entity) !== 'destroyed'
      && (!entity.economy?.construction || entity.economy.construction.complete),
  );
  return factory ? [...docks, factory] : docks;
}

function getDockLandDropOffPoint(dock: GameEntity, from?: { x: number; y: number }, clearance = 0): { x: number; y: number } {
  if (from && dock.collider.kind === 'rect') {
    const margin = Math.max(30, clearance + 16);
    const inset = 18;
    const centerX = dock.x;
    const centerY = dock.y;
    const left = dock.x - dock.collider.width / 2;
    const right = dock.x + dock.collider.width / 2;
    const top = dock.y - dock.collider.height / 2;
    const bottom = dock.y + dock.collider.height / 2;
    const dx = from.x - centerX;
    const dy = from.y - centerY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        x: dx >= 0 ? right + margin : left - margin,
        y: clamp(from.y, top + inset, bottom - inset),
      };
    }
    return {
      x: clamp(from.x, left + inset, right - inset),
      y: dy >= 0 ? bottom + margin : top - margin,
    };
  }
  return getDockLandDropOffPointForMap(dock, isValidLandDestination);
}

function getFishBankDropOffPoint(bank: GameEntity, from?: { x: number; y: number }): { x: number; y: number } {
  if (bank.kind === 'dock') {
    return getDockLandDropOffPoint(bank, from);
  }
  if (bank.faction === 'enemy') {
    const approachBank = from ? { ...bank, x: from.x, y: from.y } : bank;
    return getMetalDropOffPoint(approachBank);
  }
  return getFactoryDropOffPoint(from);
}

function getSelectedDock(): GameEntity | null {
  return querySelectedDock(entities, selectedEntityIds);
}

function getSelectedBarracks(): GameEntity | null {
  return querySelectedBarracks(entities, selectedEntityIds);
}

function getSelectedTechLab(): GameEntity | null {
  return querySelectedTechLab(entities, selectedEntityIds);
}

function getJumpableProductionBuildings(kind: 'factory' | 'barracks' | 'dock'): GameEntity[] {
  return entities
    .filter(
      (entity) =>
        entity.kind === kind
        && entity.faction === 'player'
        && entity.commandable
        && getDamageState(entity) !== 'destroyed'
        && (entity.economy?.construction?.complete ?? true),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

function focusProductionBuilding(kind: 'factory' | 'barracks' | 'dock', label: string, app: Application, layers: RenderLayers): void {
  const buildings = getJumpableProductionBuildings(kind);
  if (buildings.length === 0) {
    setBootStatus('ready', `No ${label.toLowerCase()} available.`);
    return;
  }

  const selected = getSelectedEntities(entities, selectedEntityIds);
  const currentIndex =
    selected.length === 1
      ? buildings.findIndex((entity) => entity.id === selected[0]?.id)
      : -1;
  const nextBuilding = buildings[(currentIndex + 1) % buildings.length];
  selectEntity(nextBuilding, layers, false);
  centerCameraOn(app, nextBuilding.x, nextBuilding.y, layers);
  setBootStatus('ready', `Camera focused on ${nextBuilding.name}. ${buildings.length > 1 ? `Press again to cycle ${label.toLowerCase()}.` : ''}`);
}

function updateWorkerCommandPanel(): void {
  updateEconomyReadout();
}

function hasSelectedWorker(): boolean {
  return getSelectedWorkers().length > 0;
}

function getAvailableReelInventory(): number {
  return countAvailableReels(entities);
}

function getFactionTechLab(faction: Faction): GameEntity | null {
  return (
    entities.find(
      (entity) =>
        entity.kind === 'techLab' &&
        entity.faction === faction &&
        entity.commandable &&
        getDamageState(entity) !== 'destroyed' &&
        (entity.economy?.construction?.complete ?? true),
    ) ?? null
  );
}

function getFactionUpgradeLevel(faction: Faction, kind: TechUpgradeKind): number {
  return getFactionTechLab(faction)?.economy?.technologyLab?.levels?.[kind] ?? 0;
}

function getReelSellValueForFaction(faction: Faction): number {
  return 18 + getFactionUpgradeLevel(faction, 'reels') * 5;
}

function getWorkerFishingCadence(): {
  baseCatchDelaySeconds: { min: number; max: number };
  reelCatchDelaySeconds: { min: number; max: number };
  baseCatchChance: number;
  reelCatchChance: number;
  baseCatchAmount: { min: number; max: number };
  reelCatchAmount: { min: number; max: number };
} {
  const reelLevel = getFactionUpgradeLevel('player', 'reels');
  const reelDelayReduction = Math.min(0.28, reelLevel * 0.08);
  return {
    baseCatchDelaySeconds: { min: 0.95, max: 1.7 },
    reelCatchDelaySeconds: {
      min: Math.max(0.42, 0.6 - reelDelayReduction),
      max: Math.max(0.8, 1.1 - reelDelayReduction),
    },
    baseCatchChance: 0.78,
    reelCatchChance: Math.min(0.95, 0.9 + reelLevel * 0.02),
    baseCatchAmount: { min: 2, max: 3 },
    reelCatchAmount: {
      min: 3,
      max: Math.min(5, 4 + Math.floor(reelLevel / 2)),
    },
  };
}

function getFactoryReelBuildSeconds(): number {
  return 7.5;
}

function getBoatSpeed(entity: GameEntity): number {
  const level = getFactionUpgradeLevel(entity.faction, 'boats');
  const baseSpeed = entity.economy?.combatRole === 'attack' ? 78 : 68;
  return baseSpeed + level * 3;
}

function refreshFactionBoatUpgrades(faction: Faction): void {
  for (const entity of entities) {
    if (entity.kind !== 'boat' || entity.faction !== faction) {
      continue;
    }
    entity.movement.speed = getBoatSpeed(entity);
  }
}

function updateTacticalCommandPanel(): void {
  updateSelectionReadout();
}

function getSelectedBuilder(): GameEntity | null {
  return querySelectedBuilder(entities, selectedEntityIds);
}

function getSelectedCombatPreviewUnits(): GameEntity[] {
  return getSelectedPlayerCommandableUnits().filter(
    (entity) => entity.kind === 'worker' || entity.kind === 'guard' || (entity.kind === 'boat' && entity.economy?.combatRole === 'attack'),
  );
}

function canSelectedCombatUnitsAttackTarget(target: GameEntity): boolean {
  if (target.faction !== 'enemy' || getDamageState(target) === 'destroyed') {
    return false;
  }
  const selectedCombatUnits = getSelectedCombatPreviewUnits();
  const hasWorker = selectedCombatUnits.some((entity) => entity.kind === 'worker');
  const hasGuard = selectedCombatUnits.some((entity) => entity.kind === 'guard');
  const hasAttackBoat = selectedCombatUnits.some((entity) => entity.kind === 'boat' && entity.economy?.combatRole === 'attack');
  return hasGuard || (hasWorker && target.kind !== 'boat') || (hasAttackBoat && target.kind === 'boat');
}

function shouldShowCombatPreview(): boolean {
  return getSelectedCombatPreviewUnits().length > 0 && (attackTargetPlacement || combatPreviewTargetId !== undefined);
}

function clearCombatPreview(layers?: RenderLayers): void {
  combatPreviewWorld = undefined;
  combatPreviewTargetId = undefined;
  combatPreviewTargetValid = false;
  gameElement.dataset.combatCursor = 'none';
  updateCommandHint();
  if (layers) {
    drawCombatTargetingOverlay(layers);
    publishDebugState(layers);
  }
}

function updateCombatPreviewAtPoint(worldX: number, worldY: number, layers: RenderLayers): void {
  const selectedCombatUnits = getSelectedCombatPreviewUnits();
  if (selectedCombatUnits.length === 0 || pauseMenuOpen || placementMode || attackMovePlacement) {
    clearCombatPreview(layers);
    return;
  }

  const targetEntity = pickEntityAt(worldX, worldY);
  const enemyTarget = targetEntity?.faction === 'enemy' ? targetEntity : undefined;
  if (!attackTargetPlacement && !enemyTarget) {
    clearCombatPreview(layers);
    return;
  }

  combatPreviewWorld = { x: worldX, y: worldY };
  combatPreviewTargetId = enemyTarget?.id;
  combatPreviewTargetValid = enemyTarget ? canSelectedCombatUnitsAttackTarget(enemyTarget) : false;
  gameElement.dataset.combatCursor = combatPreviewTargetValid ? 'attack-valid' : attackTargetPlacement ? 'attack-invalid' : 'none';
  updateCommandHint();
  drawCombatTargetingOverlay(layers);
  publishDebugState(layers);
}

function selectVisibleEntitiesByKind(target: GameEntity, layers: RenderLayers, additive = false): void {
  if (!additive) {
    selectedEntityIds.clear();
  }
  inspectedResourceTarget = null;
  for (const entity of entities) {
    if (
      entity.kind === target.kind &&
      entity.faction === target.faction &&
      entity.selectable &&
      !entity.renderable.hidden &&
      getDamageState(entity) !== 'destroyed'
    ) {
      selectedEntityIds.add(entity.id);
    }
  }
  drawSelectionOverlay(layers);
  updateSelectionReadout();
  publishDebugState(layers);
}

function issueMoveCommand(worldX: number, worldY: number, layers: RenderLayers): void {
  finishCommandWithMoveOverlay(
    executeMoveCommand({
      worldX,
      worldY,
      selectedUnits: getSelectedPlayerCommandableUnits(),
      findLandPath,
      findEntityLandPath,
      findWaterPath,
      isValidLandDestination,
      isValidWaterDestination,
    }),
    layers,
  );
}

function issueStopCommand(layers: RenderLayers): void {
  finishCommandWithMoveOverlay(executeStopCommand({ selectedUnits: getSelectedPlayerCommandableUnits() }), layers);
  renderUnits(layers);
  updateSelectionReadout();
}

function issueHoldCommand(layers: RenderLayers): void {
  finishCommandWithMoveOverlay(executeHoldCommand({ selectedUnits: getSelectedPlayerCommandableUnits() }), layers);
  renderUnits(layers);
  updateSelectionReadout();
}

function beginAttackTarget(layers: RenderLayers): void {
  const attackers = getSelectedCombatPreviewUnits();
  if (attackers.length === 0) {
    setBootStatus('ready', 'Select a worker, guard, or attack boat before issuing direct attack orders.');
    playSfx('error');
    publishDebugState(layers);
    return;
  }
  attackMovePlacement = false;
  attackTargetPlacement = true;
  combatPreviewTargetId = undefined;
  combatPreviewTargetValid = false;
  updateCommandHint();
  drawCombatTargetingOverlay(layers);
  setBootStatus('ready', 'Attack armed: left-click an enemy target.');
  publishDebugState(layers);
}

function beginAttackMove(layers: RenderLayers): void {
  const guards = getSelectedPlayerCommandableUnits().filter((entity) => entity.kind === 'guard');
  if (guards.length === 0) {
    finishCommandWithMoveOverlay(executeAttackMoveCommand({ worldX: 0, worldY: 0, selectedUnits: [], findLandPath, findEntityLandPath, findWaterPath, isValidLandDestination, isValidWaterDestination }), layers);
    return;
  }
  attackTargetPlacement = false;
  attackMovePlacement = true;
  clearCombatPreview();
  updateCommandHint();
  drawCombatTargetingOverlay(layers);
  setBootStatus('ready', 'Attack-Move armed: left-click a land destination.');
  publishDebugState(layers);
}

function issueAttackMoveCommand(worldX: number, worldY: number, layers: RenderLayers): void {
  attackMovePlacement = false;
  finishCommandWithMoveOverlay(
    executeAttackMoveCommand({ worldX, worldY, selectedUnits: getSelectedPlayerCommandableUnits(), findLandPath, findEntityLandPath, findWaterPath, isValidLandDestination, isValidWaterDestination }),
    layers,
  );
  renderUnits(layers);
  updateSelectionReadout();
}

function cancelTargetingModes(layers: RenderLayers, message: string): void {
  if (!attackMovePlacement && !attackTargetPlacement) {
    return;
  }
  attackMovePlacement = false;
  attackTargetPlacement = false;
  clearCombatPreview();
  updateCommandHint();
  drawCombatTargetingOverlay(layers);
  setBootStatus('ready', message);
  publishDebugState(layers);
}

function issueAttackCommand(target: GameEntity, layers: RenderLayers): boolean {
  const output = executeAttackCommand({
    target,
    selectedUnits: getSelectedPlayerCommandableUnits(),
    findLandPath,
    findEntityLandPath,
    findWaterPath,
    getApproachPoint: getAttackApproachPoint,
  });
  const handled = finishCommandWithMoveOverlay(output, layers);
  if (handled) {
    attackTargetPlacement = false;
    clearCombatPreview();
    updateCommandHint();
  }
  return handled;
}

function issueSabotageCommand(target: GameEntity, layers: RenderLayers): boolean {
  const output = executeSabotageCommand({
    target,
    selectedUnits: getSelectedPlayerCommandableUnits(),
    findLandPath,
    getApproachPoint: getAttackApproachPoint,
    getDamageState,
  });
  if (output.handled && output.result?.ok && output.result.kind === 'sabotage') {
    lastSabotageEvent = { kind: 'queued', saboteurId: output.moveCommand?.entityIds[0] ?? 'unknown', targetId: target.id };
    playSfx('sabotage');
  }
  return finishCommandWithMoveOverlay(output, layers);
}

function issueRepairCommand(target: GameEntity, layers: RenderLayers): boolean {
  const output = executeRepairCommand({
    target,
    selectedUnits: getSelectedPlayerCommandableUnits(),
    findLandPath,
    getApproachPoint: getRepairApproachPoint,
    getDamageState,
    getMaxHealth,
  });
  if (output.handled && output.result?.ok && output.result.kind === 'repair') {
    lastRepairEvent = { kind: 'queued', workerId: output.moveCommand?.entityIds[0] ?? 'unknown', targetId: target.id, targetHealth: target.economy?.health };
    playSfx('repair');
  }
  return finishCommandWithMoveOverlay(output, layers);
}

function issueResumeConstructionCommand(target: GameEntity, layers: RenderLayers): boolean {
  const construction = target.economy?.construction;
  if (target.faction !== 'player' || !construction || construction.complete) {
    return false;
  }

  const workers = getSelectedPlayerCommandableUnits().filter((entity) => entity.kind === 'worker');
  if (workers.length === 0) {
    reportCommandResult(
      { ok: false, kind: 'placement', reason: 'not-worker-selected', message: 'Select a worker before continuing construction.' },
      layers,
    );
    return true;
  }

  const assignments = workers.map((worker, index) => {
    const assignment = findReachableConstructionRoute(worker, target, (index - (workers.length - 1) / 2) * 24);
    return assignment ? { worker, ...assignment } : { worker, workPoint: undefined, path: [] };
  });

  if (assignments.some((assignment) => assignment.path.length === 0)) {
    reportCommandResult(
      { ok: false, kind: 'placement', reason: 'unreachable', message: 'Construction blocked: selected worker cannot reach that building site.' },
      layers,
    );
    return true;
  }

  for (const { worker, path } of assignments) {
    worker.path = path;
    worker.moveTarget = path[0];
    worker.movement.state = 'moving';
    worker.economy = {
      ...worker.economy,
      harvesting: undefined,
      shoreFishing: undefined,
      factoryDuty: undefined,
      repair: undefined,
      buildJob: { siteId: target.id, phase: 'to-site' },
    };
  }

  lastMoveCommand = {
    x: assignments[0].workPoint?.x ?? target.x,
    y: assignments[0].workPoint?.y ?? target.y,
    entityIds: workers.map((worker) => worker.id),
    pathLength: Math.max(...assignments.map((assignment) => assignment.path.length)),
  };
  drawDestinationOverlay(layers);
  reportCommandResult(
    {
      ok: true,
      kind: 'placement',
      building: construction.building,
      message: `Construction resumed on ${target.name}. ${workers.length} worker${workers.length === 1 ? '' : 's'} reassigned.`,
    },
    layers,
  );
  renderUnits(layers);
  updateSelectionReadout();
  return true;
}

function getSelectedPlayerCommandableUnits(): GameEntity[] {
  return querySelectedPlayerCommandableUnits(entities, selectedEntityIds);
}

function getSelectedRallyBuilding(): GameEntity | null {
  const selected = getSelectedEntities(entities, selectedEntityIds);
  if (selected.length !== 1) {
    return null;
  }
  const [entity] = selected;
  if (entity.faction !== 'player') {
    return null;
  }
  return entity.kind === 'factory' || entity.kind === 'barracks' || entity.kind === 'dock' ? entity : null;
}

function getBuildingRallyMode(building: GameEntity): 'land' | 'water' | null {
  if (building.kind === 'dock') {
    return 'water';
  }
  if (building.kind === 'factory' || building.kind === 'barracks') {
    return 'land';
  }
  return null;
}

function queueTruckToRallyHarvest(entity: GameEntity, rallyPoint: NonNullable<GameEntity['economy']>['rallyPoint']): boolean {
  if (entity.kind !== 'truck' || rallyPoint?.targetKind !== 'metal' || !rallyPoint.targetId) {
    return false;
  }
  const field = resourceFields.find((candidate) => candidate.id === rallyPoint.targetId && candidate.amount > 0);
  if (!field) {
    return false;
  }
  const target = getResourceInteractionPoint(field, entity.x <= field.x ? 'left' : 'right');
  const path = findEntityLandPath(entity, { x: entity.x, y: entity.y }, target);
  if (path.length === 0) {
    return false;
  }
  entity.path = path;
  entity.moveTarget = path[0];
  entity.movement.state = 'moving';
  entity.economy = {
    ...entity.economy,
    harvesting: { fieldId: field.id, phase: 'to-field' },
  };
  return true;
}

function queueBoatToRallyFishing(entity: GameEntity, rallyPoint: NonNullable<GameEntity['economy']>['rallyPoint']): boolean {
  if (entity.kind !== 'boat' || entity.economy?.combatRole === 'attack' || rallyPoint?.targetKind !== 'fish' || !rallyPoint.targetId) {
    return false;
  }
  const zone = fishingZoneStates.find((candidate) => candidate.id === rallyPoint.targetId && candidate.amount > 0);
  if (!zone) {
    return false;
  }
  const target = getFishingInteractionPoint(zone);
  const path = findWaterPath({ x: entity.x, y: entity.y }, target);
  if (path.length === 0) {
    return false;
  }
  entity.path = path;
  entity.moveTarget = path[0];
  entity.movement.state = 'moving';
  entity.economy = {
    ...entity.economy,
    fishing: { zoneId: zone.id, phase: 'to-zone' },
    unloadingFish: undefined,
    dockRepair: undefined,
    autoFishZoneId: zone.id,
  };
  return true;
}

function applyBuildingRallyToEntity(entity: GameEntity, producer: GameEntity, spreadIndex = 0, spreadCount = 1): boolean {
  const rallyPoint = producer.economy?.rallyPoint;
  if (!rallyPoint) {
    return false;
  }
  if (queueTruckToRallyHarvest(entity, rallyPoint) || queueBoatToRallyFishing(entity, rallyPoint)) {
    return true;
  }
  const spreadOffset = (spreadIndex - (spreadCount - 1) / 2) * 28;
  const target = { x: rallyPoint.x, y: rallyPoint.y + spreadOffset };
  const path =
    rallyPoint.mode === 'water'
      ? findWaterPath({ x: entity.x, y: entity.y }, target)
      : findEntityLandPath(entity, { x: entity.x, y: entity.y }, target);
  const fallbackPath =
    path.length > 0
      ? path
      : rallyPoint.mode === 'water'
        ? findWaterPath({ x: entity.x, y: entity.y }, rallyPoint)
        : findEntityLandPath(entity, { x: entity.x, y: entity.y }, rallyPoint);
  if (fallbackPath.length === 0) {
    return false;
  }
  entity.path = fallbackPath;
  entity.moveTarget = fallbackPath[0];
  entity.movement.state = 'moving';
  return true;
}

function issueSetBuildingRallyPoint(building: GameEntity, worldX: number, worldY: number, layers: RenderLayers): boolean {
  const mode = getBuildingRallyMode(building);
  if (!mode) {
    return false;
  }
  const metalField = building.kind === 'factory' ? pickResourceFieldAt(worldX, worldY) : null;
  const fishingZone = building.kind === 'dock' ? pickFishingZoneAt(worldX, worldY) : null;
  const targetKind = metalField ? 'metal' : fishingZone ? 'fish' : undefined;
  const targetId = metalField?.id ?? fishingZone?.id;
  const isValid = mode === 'water' ? isValidWaterDestination(worldX, worldY) : isValidLandDestination(worldX, worldY);
  if (!isValid) {
    reportCommandResult(
      {
        ok: false,
        kind: 'move',
        reason: 'invalid-destination',
        message: mode === 'water' ? 'Dock rally point must be set on reachable water.' : 'Rally point must be set on reachable land.',
      },
      layers,
    );
    return true;
  }

  building.economy = {
    ...building.economy,
    rallyPoint: { x: worldX, y: worldY, mode, targetKind, targetId },
  };
  updateSelectionReadout();
  reportCommandResult(
    {
      ok: true,
      kind: 'move',
      message:
        targetKind === 'metal'
          ? `${building.name} truck rally set to metal field ${Math.round(worldX)}, ${Math.round(worldY)}.`
          : targetKind === 'fish'
            ? `${building.name} boat rally set to fishing zone ${Math.round(worldX)}, ${Math.round(worldY)}.`
            : `${building.name} rally point set to ${Math.round(worldX)}, ${Math.round(worldY)}.`,
      pathLength: 0,
    },
    layers,
  );
  return true;
}

function finishCommandWithMoveOverlay(output: { handled: boolean; result?: CommandResult; moveCommand?: typeof lastMoveCommand }, layers: RenderLayers): boolean {
  if (!output.handled) {
    return false;
  }
  if (output.moveCommand) {
    lastMoveCommand = output.moveCommand;
    drawDestinationOverlay(layers);
  }
  if (output.result) {
    reportCommandResult(output.result, layers);
  }
  return true;
}

function issueHarvestMetalCommand(field: ResourceField, layers: RenderLayers): boolean {
  return finishCommandWithMoveOverlay(
    executeHarvestMetalCommand({
      field,
      selectedUnits: getSelectedPlayerCommandableUnits(),
      findLandPath,
      findTruckLandPath,
      getResourceInteractionPoint,
    }),
    layers,
  );
}

function issueFishingCommand(zone: FishingZoneData, layers: RenderLayers): boolean {
  const workerOutput = executeWorkerFishingCommand({
    zone,
    selectedUnits: getSelectedPlayerCommandableUnits(),
    findLandPath,
    findEntityLandPath,
    getWorkerFishingPoint,
  });
  if (workerOutput.handled && workerOutput.result?.ok) {
    return finishCommandWithMoveOverlay(workerOutput, layers);
  }
  return finishCommandWithMoveOverlay(
    executeFishingCommand({
      zone,
      selectedUnits: getSelectedPlayerCommandableUnits(),
      findWaterPath,
      getFishingInteractionPoint,
    }),
    layers,
  );
}

function issueFishUnloadCommand(dock: GameEntity, layers: RenderLayers): boolean {
  return finishCommandWithMoveOverlay(
    executeFishUnloadCommand({
      dock,
      selectedUnits: getSelectedPlayerCommandableUnits(),
      findWaterPath,
      getDockUnloadPoint,
    }),
    layers,
  );
}

function issueMetalUnloadCommand(factory: GameEntity, layers: RenderLayers): boolean {
  return finishCommandWithMoveOverlay(
    executeMetalUnloadCommand({
      factory,
      selectedUnits: getSelectedPlayerCommandableUnits(),
      findEntityLandPath,
      getMetalDropOffPoint,
    }),
    layers,
  );
}

function issueWorkerFishUnloadCommand(bank: GameEntity, layers: RenderLayers): boolean {
  return finishCommandWithMoveOverlay(
    executeWorkerFishUnloadCommand({
      bank,
      selectedUnits: getSelectedPlayerCommandableUnits(),
      findEntityLandPath: (entity, start, goal) => findWorkerFishUnloadPath(entity, bank, start, goal),
      getWorkerFishDropOffPoint,
    }),
    layers,
  );
}

function issueAssignFactoryCrewCommand(layers: RenderLayers, factory = getSelectedFactory()): void {
  const factoryTarget = getFactoryCrewTarget(factory);
  const output = executeFactoryCrewCommand({
    factory: factoryTarget,
    selectedUnits: getSelectedPlayerCommandableUnits(),
    findLandPath,
    findEntityLandPath,
    getFactoryCrewPoint,
    currentAssignedCount: countAssignedFactoryCrew(entities, factoryTarget?.id),
    maxAssignedCount: FACTORY_WORKER_CAP,
  });
  finishCommandWithMoveOverlay(output, layers);
}

function issueSellReelsCommand(layers: RenderLayers): void {
  const factory = getSelectedFactory();
  if (!factory) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'not-factory-selected', message: 'Select the Factory Command Center before selling reels.' }, layers);
    return;
  }
  const event = sellFactoryReels(factory, economyState, getReelSellValueForFaction('player'));
  if (!event) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'unsupported-target', message: 'No stored reels are ready to sell.' }, layers);
    return;
  }
  updateEconomyReadout();
  updateSelectionReadout();
  const reelCount = event.kind === 'reelsSold' ? event.reelCount : 1;
  reportCommandResult({ ok: true, kind: 'produce', product: 'worker', message: `Sold ${reelCount} reel${reelCount === 1 ? '' : 's'} for ${event.cashGained} cash.` }, layers);
}

function issueToggleAutoSellReels(layers: RenderLayers): void {
  const factory = getSelectedFactory();
  const workshop = factory?.economy?.reelWorkshop;
  if (!factory || !workshop) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'not-factory-selected', message: 'Select the Factory Command Center before toggling reel autosell.' }, layers);
    return;
  }
  factory.economy = { ...factory.economy, reelWorkshop: { ...workshop, autoSell: !workshop.autoSell } };
  updateSelectionReadout();
  reportCommandResult({ ok: true, kind: 'produce', product: 'worker', message: `Factory reel autosell ${workshop.autoSell ? 'disabled' : 'enabled'}.` }, layers);
}

function issueTechUpgradeCommand(kind: TechUpgradeKind, layers: RenderLayers): void {
  const techLab = getSelectedTechLab();
  const definition = techUpgradeCatalog[kind];
  const currentLevel = techLab?.economy?.technologyLab?.levels?.[kind] ?? 0;
  if (!techLab || !techLab.economy?.technologyLab) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'unsupported-target', message: 'Select a completed Tech Lab before researching upgrades.' }, layers);
    return;
  }
  if (currentLevel >= definition.maxLevel) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'unsupported-target', message: `${definition.label} is already at max level.` }, layers);
    return;
  }

  const cost = getTechUpgradeCost(kind, currentLevel);
  if (economyState.metal < cost.metal || economyState.cash < cost.cash) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'unaffordable', message: `Need ${formatTechUpgradeCost(cost)} to research ${definition.label}.` }, layers);
    return;
  }

  economyState.metal -= cost.metal;
  economyState.cash -= cost.cash;
  techLab.economy = {
    ...techLab.economy,
    technologyLab: {
      levels: {
        ...techLab.economy.technologyLab.levels,
        [kind]: currentLevel + 1,
      },
    },
  };

  if (kind === 'boats') {
    for (const entity of entities) {
      if (entity.faction === 'player' && entity.kind === 'boat' && entity.economy?.health !== undefined) {
        entity.economy.health = Math.min(getMaxHealth(entity), entity.economy.health + 16);
      }
    }
    refreshFactionBoatUpgrades('player');
  }
  if (kind === 'military') {
    for (const entity of entities) {
      if (entity.faction !== 'player' || entity.economy?.health === undefined) {
        continue;
      }
      if (entity.kind === 'guard') {
        entity.economy.health = Math.min(getMaxHealth(entity), entity.economy.health + 20);
      }
      if (entity.kind === 'boat' && entity.economy?.combatRole === 'attack') {
        entity.economy.health = Math.min(getMaxHealth(entity), entity.economy.health + 14);
      }
    }
  }

  updateEconomyReadout();
  updateSelectionReadout();
  reportCommandResult(
    {
      ok: true,
      kind: 'produce',
      product: 'worker',
      message: `${definition.label} upgraded to level ${currentLevel + 1}. ${definition.description}`,
    },
    layers,
  );
}

function issueReleaseFactoryCrewCommand(layers: RenderLayers): void {
  const factory = getSelectedFactory();
  if (!factory) {
    reportCommandResult({ ok: false, kind: 'move', reason: 'not-factory-selected', message: 'Select the Factory Command Center before releasing crew.' }, layers);
    return;
  }

  const output = releaseFactoryCrew({
    factory,
    entities,
    getReleasePoint: getFactoryCrewReleasePoint,
    releaseCount: getRequestedFactoryCrewReleaseCount(),
  });
  if (!output.changed) {
    reportCommandResult({ ok: false, kind: 'move', reason: 'wrong-unit', message: 'No workers are currently assigned inside that factory.' }, layers);
    return;
  }

  selectedEntityIds.clear();
  output.releasedWorkers.forEach((worker) => selectedEntityIds.add(worker.id));
  output.releasedWorkers.forEach((worker, index) => {
    applyBuildingRallyToEntity(worker, factory, index, output.releasedWorkers.length);
  });
  factoryCrewReleaseCount = 1;
  renderUnits(layers);
  drawSelectionOverlay(layers);
  updateSelectionReadout();
  updateEconomyReadout();
  reportCommandResult(
    {
      ok: true,
      kind: 'move',
      message: `Returned ${output.releasedWorkers.length} worker${output.releasedWorkers.length === 1 ? '' : 's'} from factory crew. They will exit outside and follow the factory rally point.`,
      pathLength: 0,
    },
    layers,
  );
}

function issueEquipReelCommand(layers: RenderLayers): void {
  let remaining = getAvailableReelInventory();
  const workers = getSelectedWorkers().filter((worker) => !worker.economy?.reelEquipped);
  if (workers.length === 0) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'wrong-unit', message: 'Select a worker without a reel equipped.' }, layers);
    return;
  }
  if (remaining <= 0) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'unsupported-target', message: 'No spare reels are stored in any Factory Command Center.' }, layers);
    return;
  }
  let equipped = 0;
  const factories = entities.filter((entity) => entity.kind === 'factory' && entity.faction === 'player' && (entity.economy?.reelWorkshop?.reelInventory ?? 0) > 0);
  for (const worker of workers) {
    const sourceFactory = factories.find((factory) => (factory.economy?.reelWorkshop?.reelInventory ?? 0) > 0);
    if (!sourceFactory || remaining <= 0) {
      break;
    }
    const sourceWorkshop = sourceFactory.economy?.reelWorkshop;
    if (!sourceWorkshop) {
      continue;
    }
    sourceFactory.economy = {
      ...sourceFactory.economy,
      reelWorkshop: {
        ...sourceWorkshop,
        reelInventory: sourceWorkshop.reelInventory - 1,
      },
    };
    worker.economy = { ...worker.economy, reelEquipped: true };
    remaining -= 1;
    equipped += 1;
  }
  if (equipped <= 0) {
    reportCommandResult({ ok: false, kind: 'produce', reason: 'unsupported-target', message: 'No reels could be equipped.' }, layers);
    return;
  }
  updateSelectionReadout();
  reportCommandResult({ ok: true, kind: 'produce', product: 'worker', message: `Equipped ${equipped} worker${equipped === 1 ? '' : 's'} with upgraded reels.` }, layers);
}

function issueDockRepairCommand(dock: GameEntity, layers: RenderLayers): boolean {
  const output = executeDockRepairCommand({
    dock,
    selectedUnits: getSelectedPlayerCommandableUnits(),
    findWaterPath,
    getDockRepairPoint: getDockUnloadPoint,
    getDamageState,
    getMaxHealth,
  });
  return finishCommandWithMoveOverlay(output, layers);
}

function issueProduceCommand(product: ProductionKind, layers: RenderLayers): void {
  if (product === 'boat' || product === 'attackBoat') {
    issueDockProduceCommand(product, layers);
    return;
  }

  if (product === 'guard' || product === 'saboteur') {
    issueBarracksProduceCommand(product, layers);
    return;
  }

  const output = executeProductionCommand({
    producer: getSelectedFactory(),
    product,
    stockpile: economyState,
    crew: getCrewDebugState(),
    nextProductionId,
    missingProducerMessage: 'Select the Factory Command Center before producing units.',
  });
  nextProductionId = output.nextProductionId;
  if (output.result.ok) {
    lastProductionEvent = { kind: 'queued', product, stockpile: economyState.metal };
    updateEconomyReadout();
    updateSelectionReadout();
  }
  reportCommandResult(output.result, layers);
}

function issueBarracksProduceCommand(product: 'guard' | 'saboteur', layers: RenderLayers): void {
  const output = executeProductionCommand({
    producer: getSelectedBarracks(),
    product,
    stockpile: economyState,
    crew: getCrewDebugState(),
    nextProductionId,
    missingProducerMessage: `Select a completed Barracks before producing ${product === 'guard' ? 'guards' : 'saboteurs'}.`,
  });
  nextProductionId = output.nextProductionId;
  if (output.result.ok) {
    lastProductionEvent = { kind: 'queued', product, stockpile: economyState.metal };
    updateEconomyReadout();
    updateSelectionReadout();
  }
  reportCommandResult(output.result, layers);
}

function issueDockProduceCommand(product: 'boat' | 'attackBoat', layers: RenderLayers): void {
  const output = executeProductionCommand({
    producer: getSelectedDock(),
    product,
    stockpile: economyState,
    crew: getCrewDebugState(),
    nextProductionId,
    missingProducerMessage: `Select a completed Dock before producing ${product === 'boat' ? 'fishing boats' : 'attack boats'}.`,
  });
  nextProductionId = output.nextProductionId;
  if (output.result.ok) {
    lastProductionEvent = { kind: 'queued', product, stockpile: economyState.metal };
    updateEconomyReadout();
    updateSelectionReadout();
  }
  reportCommandResult(output.result, layers);
}

function enterPlacementMode(building: BuildingPlanKind, layers: RenderLayers): void {
  placementRuntime.enterPlacementMode(building, layers, camera);
}

function updatePlacementMode(worldX: number, worldY: number, layers: RenderLayers): void {
  placementRuntime.updatePlacementMode(worldX, worldY, layers);
}

function confirmPlacement(layers: RenderLayers, queueMode = false): void {
  placementRuntime.confirmPlacement(layers, queueMode);
}

function cancelPlacement(layers: RenderLayers): void {
  placementRuntime.cancelPlacement(layers);
}

function cancelActiveCommandMode(layers: RenderLayers): boolean {
  let cancelled = false;
  if (placementMode) {
    cancelPlacement(layers);
    cancelled = true;
  }
  if (attackMovePlacement || attackTargetPlacement) {
    cancelTargetingModes(layers, attackTargetPlacement ? 'Attack targeting cancelled.' : 'Attack-Move cancelled.');
    cancelled = true;
  }
  if (selectionDrag) {
    selectionDrag = null;
    drawSelectionDragOverlay(layers);
    cancelled = true;
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  return cancelled;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function updateProduction(deltaSeconds: number, layers: RenderLayers): boolean {
  const result = updateProductionQueues({
    producers: entities.filter((entity) => entity.faction === 'player' && entity.economy?.productionQueue),
    deltaSeconds,
    stockpileMetal: economyState.metal,
    isProducerBlocked: (producer) => getDamageState(producer) === 'destroyed' || (producer.economy?.disabledSeconds ?? 0) > 0,
    spawnProducedUnit,
  });

  for (const spawned of result.spawned) {
    lastProductionEvent = { kind: 'spawned', product: spawned.product, entityId: spawned.entityId, stockpile: spawned.stockpile };
    playSfx('produce');
    setBootStatus('ready', `${spawned.label} produced.`);
  }

  if (result.changed) {
    renderUnits(layers);
    drawSelectionOverlay(layers);
    updateSelectionReadout();
    updateFactoryCommandPanel();
    updateDockCommandPanel();
    publishDebugState(layers);
  }

  return result.changed;
}

function updateConstruction(deltaSeconds: number, layers: RenderLayers): boolean {
  const result = updateConstructionJobs({
    workers: entities.filter((entity) => entity.kind === 'worker' && entity.economy?.buildJob?.phase === 'building'),
    deltaSeconds,
    crewState,
    findEntityById: (id) => entities.find((entity) => entity.id === id),
  });

  for (const construction of result.completed) {
    const worker = entities.find((entity) => entity.id === construction.workerId);
    const site = entities.find((entity) => entity.id === construction.siteId);
    if (worker?.kind === 'worker' && site) {
      moveWorkerToConstructionExit(worker, site);
    }
    if (worker?.faction === 'enemy') {
      aiController.lastAction =
        construction.building === 'dock'
          ? 'Rival Dock complete. Boat production and unload point ready.'
          : `${construction.siteName} complete.`;
      if (construction.building === 'dock') {
        aiController.dockBuilt = true;
      }
      continue;
    }

    playSfx('build');
    setBootStatus(
      'ready',
      construction.capacityBonus > 0
        ? `${construction.siteName} complete. Crew capacity increased to ${construction.crewCapacity}.`
        : construction.building === 'dock'
          ? `${construction.siteName} complete. Boat production and unload point ready.`
          : `${construction.siteName} complete. Defensive position ready.`,
    );
    if (worker?.kind === 'worker' && worker.faction === 'player' && !worker.economy?.buildJob) {
      queueWorkerToNearbyConstruction(worker, construction.siteId);
    }
  }

  if (result.changed) {
    renderBuildings(layers);
    renderUnits(layers);
    drawSelectionOverlay(layers);
    drawDestinationOverlay(layers);
    updateEconomyReadout();
    updateSelectionReadout();
    publishDebugState(layers);
  }

  return result.changed;
}

function queueWorkerToNearbyConstruction(worker: GameEntity, completedSiteId?: string): boolean {
  if (worker.kind !== 'worker' || worker.faction !== 'player' || getDamageState(worker) === 'destroyed' || worker.economy?.buildJob) {
    return false;
  }

  const site = entities
    .filter(
      (entity) =>
        entity.id !== completedSiteId &&
        entity.faction === 'player' &&
        entity.economy?.construction &&
        !entity.economy.construction.complete &&
        Math.hypot(entity.x - worker.x, entity.y - worker.y) <= 520,
    )
    .sort((a, b) => Math.hypot(a.x - worker.x, a.y - worker.y) - Math.hypot(b.x - worker.x, b.y - worker.y))[0];
  if (!site) {
    return false;
  }

  const assignment = findReachableConstructionRoute(worker, site);
  if (!assignment) {
    return false;
  }

  worker.path = assignment.path;
  worker.moveTarget = assignment.path[0];
  worker.movement.state = 'moving';
  worker.economy = {
    ...worker.economy,
    harvesting: undefined,
    shoreFishing: undefined,
    factoryDuty: undefined,
    repair: undefined,
    buildJob: { siteId: site.id, phase: 'to-site' },
  };
  lastMoveCommand = {
    x: assignment.workPoint.x,
    y: assignment.workPoint.y,
    entityIds: [worker.id],
    pathLength: assignment.path.length,
  };
  return true;
}

function findReachableConstructionRoute(worker: GameEntity, site: GameEntity, lateralOffset = 0): { workPoint: { x: number; y: number }; path: Array<{ x: number; y: number }> } | null {
  for (const workPoint of getConstructionWorkPoints(site)) {
    const target = lateralOffset === 0 ? workPoint : { x: workPoint.x + lateralOffset, y: workPoint.y };
    if (isBlockedForLandMobile(worker, target.x, target.y)) {
      continue;
    }
    const path = findEntityLandPath(worker, { x: worker.x, y: worker.y }, target);
    if (path.length > 0) {
      return { workPoint: target, path };
    }
  }
  return null;
}

function moveWorkerToConstructionExit(worker: GameEntity, site: GameEntity): boolean {
  if (worker.kind !== 'worker' || worker.movement.speed <= 0 || getDamageState(worker) === 'destroyed') {
    return false;
  }

  if (!isBlockedForLandMobile(worker, worker.x, worker.y)) {
    return false;
  }

  const exitPoint = getConstructionWorkPoints(site)
    .filter((point) => !isBlockedForLandMobile(worker, point.x, point.y))
    .map((point) => ({ ...point, distance: Math.hypot(point.x - worker.x, point.y - worker.y) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!exitPoint) {
    return nudgeLandMobileOutOfBlockers(worker);
  }

  worker.x = exitPoint.x;
  worker.y = exitPoint.y;
  worker.path = [];
  worker.moveTarget = undefined;
  worker.movement.state = 'idle';
  movementRecoveryState.delete(worker.id);
  return true;
}

function updateFishing(deltaSeconds: number, layers: RenderLayers): boolean {
  const output = updateFishingSystem({ boats: entities, zones: fishingZoneStates, deltaSeconds, getDamageState });
  for (const event of output.events) {
    if (event.kind === 'fishLoaded') {
      if (event.faction === 'enemy') {
        aiController.lastAction = `Rival boat loaded ${event.amount} fish.`;
      } else {
        lastResourceEvent = { entityId: event.entityId, kind: 'fishLoaded', amount: event.amount, stockpile: economyState.metal };
        playSfx('fish');
      }
      continue;
    }

    if (event.kind === 'cargoFull') {
      const boat = entities.find((entity) => entity.id === event.entityId);
      if (boat) queueAutoFishUnload({ boat, docks: entities, zones: fishingZoneStates, getDamageState, findWaterPath, getDockUnloadPoint, getFishingInteractionPoint });
      if (event.faction === 'enemy') {
        aiController.lastAction = 'Rival fishing boat filled cargo and is returning to dock.';
      } else {
        setBootStatus('ready', `${event.message} Returning to Dock automatically.`);
      }
      continue;
    }

    if (event.kind === 'zoneDepleted') {
      const boat = entities.find((entity) => entity.id === event.entityId);
      if (boat) queueAutoFishUnload({ boat, docks: entities, zones: fishingZoneStates, getDamageState, findWaterPath, getDockUnloadPoint, getFishingInteractionPoint });
      const zone = fishingZoneStates.find((candidate) => candidate.id === event.zoneId);
      if (event.faction === 'enemy') {
        aiController.lastAction = `${zone?.label ?? 'Fishing zone'} depleted; rival boat is returning to dock.`;
      } else {
        setBootStatus('ready', `${zone?.label ?? 'Fishing zone'} is depleted. Returning partial catch to Dock.`);
      }
    }
  }

  if (output.changed) {
    renderUnits(layers);
    updateSelectionReadout();
    publishDebugState(layers);
  }

  return output.changed;
}

function queueWorkerFishUnload(worker: GameEntity): { ok: true; bank: GameEntity } | { ok: false } {
  const cargo = worker.economy?.cargo;
  if (worker.kind !== 'worker' || !cargo || cargo.kind !== 'fish' || cargo.amount <= 0) {
    return { ok: false };
  }

  const candidateBanks = getFriendlyFishBanks(worker.faction)
    .map((bank) => {
      const target = getFishBankDropOffPoint(bank, worker);
      const path = findWorkerFishUnloadPath(worker, bank, { x: worker.x, y: worker.y }, target);
      return { bank, path, target };
    })
    .filter((assignment) => assignment.path.length > 0)
    .sort((left, right) => left.path.length - right.path.length);

  const assignment = candidateBanks[0];
  if (!assignment) {
    return { ok: false };
  }

  worker.path = assignment.path;
  worker.moveTarget = assignment.path[0];
  worker.movement.state = 'moving';
  worker.economy = {
    ...worker.economy,
    shoreFishing: undefined,
    unloadingFish: { targetId: assignment.bank.id, phase: assignment.bank.kind === 'dock' ? 'to-dock' : 'to-bank' },
  };
  lastMoveCommand = {
    x: assignment.target.x,
    y: assignment.target.y,
    entityIds: [worker.id],
    pathLength: assignment.path.length,
  };
  return { ok: true, bank: assignment.bank };
}

function queueWorkerFishReturnToZone(worker: GameEntity): boolean {
  const zoneId = worker.economy?.autoFishZoneId;
  const cargo = worker.economy?.cargo;
  const zone = fishingZoneStates.find((candidate) => candidate.id === zoneId);
  if (worker.kind !== 'worker' || !zone || !cargo || cargo.kind !== 'fish' || cargo.amount > 0) {
    return false;
  }

  const output = executeWorkerFishingCommand({
    zone,
    selectedUnits: [worker],
    findLandPath,
    getWorkerFishingPoint,
  });

  if (output.moveCommand) {
    lastMoveCommand = output.moveCommand;
  }

  return output.handled && output.result?.ok === true;
}

function queueTruckHarvestAtBestField(truck: GameEntity, excludeFieldId?: string): boolean {
  const candidateFields = [...resourceFields]
    .filter((field) => field.amount > 0 && field.id !== excludeFieldId)
    .sort((a, b) => Math.hypot(a.x - truck.x, a.y - truck.y) - Math.hypot(b.x - truck.x, b.y - truck.y));

  for (const field of candidateFields) {
    const output = executeHarvestMetalCommand({
      field,
      selectedUnits: [truck],
      findLandPath,
      findTruckLandPath,
      getResourceInteractionPoint: (resourceField) => getResourceInteractionPoint(resourceField, truck.faction === 'enemy' ? 'left' : 'right'),
      faction: truck.faction,
      requireCommandable: false,
    });
    if (output.result?.ok) {
      if (output.moveCommand) {
        lastMoveCommand = output.moveCommand;
      }
      return true;
    }
  }

  return false;
}

function updateAiRival(deltaSeconds: number, layers: RenderLayers): boolean {
  return aiRuntime.updateAiRival(deltaSeconds, layers);
}

function updateAiRaidActive(deltaSeconds: number, layers: RenderLayers): boolean {
  return combatRuntime.updateAiRaidActive(deltaSeconds, layers);
}

function updatePlayerCombat(deltaSeconds: number, layers: RenderLayers): boolean {
  return combatRuntime.updatePlayerCombat(deltaSeconds, layers);
}

function updateWorkerShoreFishing(deltaSeconds: number, layers: RenderLayers): boolean {
  const output = updateWorkerFishingSystem({
    workers: entities,
    zones: fishingZoneStates,
    deltaSeconds,
    ...getWorkerFishingCadence(),
  });

  for (const event of output.events) {
    if (event.kind === 'fishLoaded') {
      lastResourceEvent = { entityId: event.entityId, kind: 'fishLoaded', amount: event.amount, stockpile: economyState.metal };
      playSfx('fish');
      continue;
    }

    if (event.kind === 'cargoFull' || event.kind === 'shoreZoneDepleted') {
      const worker = entities.find((entity) => entity.id === event.entityId);
      if (worker?.kind === 'worker') {
        const unload = queueWorkerFishUnload(worker);
        if (unload.ok) {
          setBootStatus('ready', `${event.message} Returning to ${unload.bank.name}.`);
          drawDestinationOverlay(layers);
          continue;
        }
      }
    }

    const worker = entities.find((entity) => entity.id === event.entityId);
    if (worker) {
      setBootStatus('ready', `${worker.name}: ${event.message}`);
    }
  }

  if (output.changed) {
    renderUnits(layers);
    updateSelectionReadout();
    publishDebugState(layers);
  }

  return output.changed;
}

function updateFactoryReels(deltaSeconds: number, layers: RenderLayers): boolean {
  const playerOutput = updateFactoryReelSystem({
    entities,
    deltaSeconds,
    playerCash: economyState,
    faction: 'player',
    reelBuildSeconds: getFactoryReelBuildSeconds(),
    reelSellValue: getReelSellValueForFaction('player'),
    cncLevel: getFactionUpgradeLevel('player', 'cnc'),
  });
  for (const event of playerOutput.events) {
    const factory = entities.find((entity) => entity.id === event.factoryId);
    if (!factory) {
      continue;
    }
    if (event.kind === 'reelProduced') {
      setBootStatus('ready', event.autoSold ? `${factory.name} produced and auto-sold a reel for ${event.cashGained} cash.` : `${factory.name} produced a reel for workshop storage.`);
    }
  }
  const aiOutput = updateFactoryReelSystem({
    entities,
    deltaSeconds,
    playerCash: aiEconomyState,
    faction: 'enemy',
    reelBuildSeconds: getFactoryReelBuildSeconds(),
    reelSellValue: getReelSellValueForFaction('enemy'),
    cncLevel: getFactionUpgradeLevel('enemy', 'cnc'),
  });
  for (const event of aiOutput.events) {
    if (event.kind === 'reelProduced' && event.autoSold) {
      aiController.lastAction = `Rival Cannery auto-sold reels for ${event.cashGained} cash.`;
      aiController.lastResourceEvent = { entityId: event.factoryId, kind: 'fishSold', amount: event.cashGained, metal: aiEconomyState.metal, cash: aiEconomyState.cash };
    }
  }
  if (playerOutput.changed || aiOutput.changed) {
    updateEconomyReadout();
    updateSelectionReadout();
    publishDebugState(layers);
  }
  return playerOutput.changed || aiOutput.changed;
}

function updatePlayerGuardOrders(layers: RenderLayers): boolean {
  return combatRuntime.updatePlayerGuardOrders(layers);
}

function updatePlayerAutoDefense(layers: RenderLayers): boolean {
  return combatRuntime.updatePlayerAutoDefense(layers);
}

function updateEnemyAutoDefense(layers: RenderLayers): boolean {
  return combatRuntime.updateEnemyAutoDefense(layers);
}

function issueAiDefenseResponse(threatId: string, attackedAssetId: string, layers: RenderLayers): boolean {
  return combatRuntime.issueAiDefenseResponse(threatId, attackedAssetId, layers);
}

function updateGuardTowerDefense(deltaSeconds: number, layers: RenderLayers): boolean {
  return combatRuntime.updateGuardTowerDefense(deltaSeconds, layers);
}

function findGuardTowerTarget(tower: GameEntity): GameEntity | undefined {
  return entities
    .filter(
      (entity) =>
        entity.faction !== tower.faction &&
        entity.faction !== 'neutral' &&
        (tower.faction !== 'player' || isEntityVisible(visibilityState, entity)) &&
        (entity.economy?.health ?? 0) > 0 &&
        Math.max(0, Math.hypot(tower.x - entity.x, tower.y - entity.y) - getCollisionRadius(tower) - getCollisionRadius(entity)) <= GUARD_TOWER_RANGE,
    )
    .sort(
      (a, b) =>
        Math.max(0, Math.hypot(tower.x - a.x, tower.y - a.y) - getCollisionRadius(tower) - getCollisionRadius(a))
        - Math.max(0, Math.hypot(tower.x - b.x, tower.y - b.y) - getCollisionRadius(tower) - getCollisionRadius(b)),
    )[0];
}

const combatRuntime = createCombatRuntime({
  entities,
  aiEconomyState,
  aiController,
  aiDefenseState,
  getNextEnemyGuardTowerId: () => nextEnemyGuardTowerId,
  setNextEnemyGuardTowerId: (value) => {
    nextEnemyGuardTowerId = value;
  },
  getDamageState,
  getCollisionRadius,
  getAttackApproachPoint,
  getRaidApproachPoint,
  getAiRepeatRaidDelaySeconds,
  findLandPath,
  findEntityLandPath,
  findWaterPath,
  applyDamage,
  issuePlayerAssetWarning,
  playCombatFireSfx,
  playCombatHitSfx,
  setLastCombatEvent: (event) => {
    lastCombatEvent = event;
  },
  renderMap,
  renderUnits,
  renderBuildings,
  drawCombatTargetingOverlay,
  drawSelectionOverlay,
  drawDestinationOverlay,
  updateSelectionReadout,
  publishDebugState,
  guardTowerRange: GUARD_TOWER_RANGE,
  guardTowerDamagePerSecond: GUARD_TOWER_DAMAGE_PER_SECOND,
  findGuardTowerTarget,
  isVisibleToPlayer: (entity) => isEntityVisible(visibilityState, entity),
});

const aiRuntime = createAiRuntime({
  entities,
  resourceFields,
  fishingZoneStates,
  aiController,
  aiEconomyState,
  mapDockPoint: () => mapData.dockPoints.find((point) => point.id === 'enemy-dock'),
  getDamageState,
  getMaxHealth,
  findLandPath,
  findEntityLandPath,
  findTruckLandPath,
  findWaterPath,
  getResourceInteractionPoint: (field) => getResourceInteractionPoint(field, 'left'),
  getDockUnloadPoint,
  getFishingInteractionPoint,
  spawnAiProducedUnit,
  createEnemyConstructionSite: (id, building, x, y, builderId) =>
    createConstructionSite(id, building, x, y, builderId, {
      faction: 'enemy',
      name: building === 'dock' ? 'Rival Dock foundation' : 'Rival Barracks foundation',
      tint: building === 'dock' ? 0x8f5449 : 0x92564d,
      autoSellReels: true,
    }),
  getConstructionWorkPoint: (site) =>
    site.kind === 'dock' && site.faction === 'enemy'
      ? { x: site.x, y: site.y + 145 }
      : site.kind === 'dock'
        ? getDockLandDropOffPoint(site)
        : getConstructionWorkPoint(site),
  getConstructionWorkPoints: (site) =>
    site.kind === 'dock' && site.faction === 'enemy'
      ? [{ x: site.x, y: site.y + 145 }, ...getConstructionWorkPoints(site)]
      : site.kind === 'dock'
        ? [getDockLandDropOffPoint(site), ...getConstructionWorkPoints(site)]
        : getConstructionWorkPoints(site),
  getNextProductionId: () => nextProductionId,
  setNextProductionId: (value) => {
    nextProductionId = value;
  },
  getNextEnemyDockId: () => nextEnemyDockId,
  setNextEnemyDockId: (value) => {
    nextEnemyDockId = value;
  },
  getNextEnemyBarracksId: () => nextEnemyBarracksId,
  setNextEnemyBarracksId: (value) => {
    nextEnemyBarracksId = value;
  },
  setLastMoveCommand: (value) => {
    lastMoveCommand = value;
  },
  renderBuildings,
  renderUnits,
  drawSelectionOverlay,
  drawDestinationOverlay,
  updateSelectionReadout,
  publishDebugState,
  issueAiDefenseResponse: (threatId, attackedAssetId, layers) => combatRuntime.issueAiDefenseResponse(threatId, attackedAssetId, layers),
  updateAiRaidActive: (deltaSeconds, layers) => combatRuntime.updateAiRaidActive(deltaSeconds, layers),
  updateEnemyAutoDefense: (layers) => combatRuntime.updateEnemyAutoDefense(layers),
  issuePlayerAssetWarning,
  findReachableRaidPlan,
  getAiRaidTargetPriority,
  getAiRaidSquad,
  getStaggeredRaidApproachPoint,
  describeAiRaidTactic,
});

function installDebugTestHooks(layers?: RenderLayers): void {
  if (layers) debugHookLayers = layers;
  window.__wambasaRtsDamageEntity = (entityId: string, amount: number): boolean => {
    const entity = entities.find((candidate) => candidate.id === entityId);
    if (!entity || entity.economy?.health === undefined || amount <= 0) return false;
    applyDamage(entity, amount);
    if (debugHookLayers) {
      renderBuildings(debugHookLayers);
      renderUnits(debugHookLayers);
      drawSelectionOverlay(debugHookLayers);
      updateSelectionReadout();
      publishDebugState(debugHookLayers);
    }
    return true;
  };
  const forceRaidTarget = (targetId?: string): boolean => {
    if (!debugHookLayers) return false;
    aiController.raidIssued = false;
    aiController.raidDelaySeconds = 0;
    const raider = chooseAiRaidAttacker(entities, getDamageState);
    if (raider) {
      raider.path = []; raider.moveTarget = undefined; raider.movement.state = 'idle'; raider.economy = { ...raider.economy, attack: undefined, buildJob: undefined };
    }
    const target =
      (targetId ? entities.find((entity) => entity.id === targetId && entity.faction === 'player' && (entity.economy?.health ?? 0) > 0) : undefined)
      ?? findExposedPlayerEconomyUnit();
    if (!raider || !target) return false;
    raider.x = target.x + getCollisionRadius(target) + 32; raider.y = target.y; raider.path = []; raider.moveTarget = undefined; raider.movement.state = 'idle';
    raider.economy = { ...raider.economy, attack: { targetId: target.id, phase: 'attacking', damagePerSecond: raider.kind === 'guard' ? 24 : 18, range: raider.kind === 'guard' ? 90 : 72 } };
    aiController.raidIssued = true; aiController.lastAction = `Rival raid warning: ${target.name} is exposed.`;
    aiController.lastRaidEvent = { kind: 'queued', attackerId: raider.id, targetId: target.id, targetHealth: target.economy?.health };
    issuePlayerAssetWarning(target, 'incoming');
    renderUnits(debugHookLayers); drawDestinationOverlay(debugHookLayers);
    publishDebugState(debugHookLayers);
    return true;
  };
  window.__wambasaRtsForceRaid = (): boolean => forceRaidTarget();
  window.__wambasaRtsForceRaidTarget = (targetId?: string): boolean => forceRaidTarget(targetId);
  window.__wambasaRtsSelectEntity = (entityId: string): boolean => {
    if (!debugHookLayers) {
      return false;
    }
    const entity = entities.find((candidate) => candidate.id === entityId) ?? null;
    selectEntity(entity, debugHookLayers, false);
    return Boolean(entity);
  };
  window.__wambasaRtsSetFishingZoneAmount = (zoneId: string, amount: number): boolean => {
    const zone = fishingZoneStates.find((candidate) => candidate.id === zoneId);
    if (!zone || amount < 0) {
      return false;
    }
    zone.amount = clamp(amount, 0, zone.maxFish);
    zone.depletedCooldownSeconds = zone.amount <= 0 ? Math.max(zone.regrowthDelaySeconds ?? 0, 0) : 0;
    if (debugHookLayers) {
      renderMap(debugHookLayers);
      publishDebugState(debugHookLayers);
    }
    return true;
  };
}

function updateSabotage(deltaSeconds: number, layers: RenderLayers): boolean {
  const output = updateSabotageSystem({ entities, deltaSeconds, getDamageState });
  for (const event of output.events) {
    if (event.kind === 'recovered') {
      lastSabotageEvent = { kind: 'recovered', saboteurId: lastSabotageEvent?.saboteurId ?? 'unknown', targetId: event.targetId, disabledSeconds: event.disabledSeconds };
      setBootStatus('ready', `${event.targetName} recovered from sabotage.`);
    }
    if (event.kind === 'disabled') {
      lastSabotageEvent = { kind: 'disabled', saboteurId: event.saboteurId, targetId: event.targetId, disabledSeconds: event.disabledSeconds };
      setBootStatus('ready', `${event.saboteurName} disabled ${event.targetName} for ${event.disabledSeconds}s.`);
    }
  }

  if (output.changed) {
    renderBuildings(layers);
    renderUnits(layers);
    updateSelectionReadout();
    publishDebugState(layers);
  }
  return output.changed;
}

function updateRepair(deltaSeconds: number, layers: RenderLayers): boolean {
  const output = updateRepairSystem({ entities, deltaSeconds, getDamageState, getMaxHealth });
  for (const event of output.events) {
    lastRepairEvent = { kind: event.kind, workerId: event.workerId, targetId: event.targetId, targetHealth: event.targetHealth };
    if (event.kind === 'repaired' && event.message) {
      setBootStatus('ready', event.message);
    }
  }

  if (output.changed) {
    renderBuildings(layers);
    renderUnits(layers);
    updateSelectionReadout();
    publishDebugState(layers);
  }
  return output.changed;
}

function updateDockBoatRepair(deltaSeconds: number, layers: RenderLayers): boolean {
  let changed = false;
  let playerEconomyChanged = false;

  for (const boat of entities.filter((entity) => entity.kind === 'boat' && entity.economy?.dockRepair)) {
    const dockRepair = boat.economy?.dockRepair;
    const health = boat.economy?.health;
    if (!dockRepair || health === undefined) {
      continue;
    }

    const dock = entities.find((entity) => entity.id === dockRepair.dockId);
    if (!dock || dock.kind !== 'dock' || getDamageState(dock) === 'destroyed' || (dock.economy?.construction && !dock.economy.construction.complete)) {
      boat.economy = { ...boat.economy, dockRepair: undefined };
      boat.movement.state = 'idle';
      if (boat.faction === 'player') {
        setBootStatus('ready', `${boat.name} could not repair because the Dock is unavailable.`);
      }
      changed = true;
      continue;
    }

    if (dockRepair.phase !== 'repairing') {
      continue;
    }

    const maxHealth = getMaxHealth(boat);
    if (health >= maxHealth) {
      boat.economy = { ...boat.economy, dockRepair: undefined };
      boat.movement.state = 'idle';
      if (boat.faction === 'player' && boat.economy?.combatRole === 'fishing' && boat.economy?.autoFishZoneId) {
        queueAutoFishReturnToZone({ boat, docks: entities, zones: fishingZoneStates, getDamageState, findWaterPath, getDockUnloadPoint, getFishingInteractionPoint });
      }
      changed = true;
      continue;
    }

    const stockpile = boat.faction === 'player' ? economyState : aiEconomyState;
    const affordableSeconds = dockRepair.cashPerSecond > 0 ? stockpile.cash / dockRepair.cashPerSecond : deltaSeconds;
    const activeSeconds = Math.min(deltaSeconds, affordableSeconds);
    if (activeSeconds <= 0) {
      boat.economy = { ...boat.economy, dockRepair: undefined };
      boat.movement.state = 'idle';
      if (boat.faction === 'player') {
        setBootStatus('ready', `${boat.name} repair paused: not enough cash at the Dock.`);
      }
      changed = true;
      continue;
    }

    const repairedHealth = Math.min(maxHealth, health + dockRepair.repairPerSecond * activeSeconds);
    const spentCash = dockRepair.cashPerSecond * activeSeconds;
    boat.economy = {
      ...boat.economy,
      health: repairedHealth,
      damageState: getDamageState({ ...boat, economy: { ...boat.economy, health: repairedHealth } }),
      dockRepair: repairedHealth >= maxHealth ? undefined : dockRepair,
    };
    stockpile.cash = Math.max(0, stockpile.cash - spentCash);
    changed = true;

    if (boat.faction === 'player') {
      playerEconomyChanged = true;
      if (repairedHealth >= maxHealth) {
        setBootStatus('ready', `${boat.name} repaired at Dock for ${Math.ceil(spentCash)} cash.`);
      }
    }

    if (repairedHealth >= maxHealth) {
      boat.movement.state = 'idle';
      if (boat.faction === 'player' && boat.economy?.combatRole === 'fishing' && boat.economy?.autoFishZoneId) {
        queueAutoFishReturnToZone({ boat, docks: entities, zones: fishingZoneStates, getDamageState, findWaterPath, getDockUnloadPoint, getFishingInteractionPoint });
      }
    }
  }

  if (changed) {
    if (playerEconomyChanged) {
      updateEconomyReadout();
    }
    renderUnits(layers);
    updateSelectionReadout();
    publishDebugState(layers);
  }

  return changed;
}

function findExposedPlayerEconomyUnit(): GameEntity | undefined {
  const candidates = entities.filter(
    (entity) =>
      entity.faction === 'player' &&
      (entity.economy?.health ?? 0) > 0 &&
      (
        (entity.kind === 'truck') ||
        (entity.kind === 'boat') ||
        (entity.kind === 'dock') ||
        (entity.kind === 'barracks') ||
        (entity.kind === 'factory')
      ),
  );
  const scored = candidates
    .map((entity) => ({
      entity,
      score:
        entity.kind === 'truck'
          ? 0
          : entity.kind === 'boat'
            ? 1
            : entity.kind === 'dock'
              ? 2
              : entity.kind === 'barracks'
                ? 3
                : 4,
    }))
    .sort((a, b) => a.score - b.score);
  return scored[0]?.entity;
}

function getRaidCandidateTargets(priority?: Array<GameEntity['kind']>): GameEntity[] {
  return entities
    .filter(
      (entity) =>
        entity.faction === 'player' &&
        (entity.economy?.health ?? 0) > 0 &&
        (
          entity.kind === 'truck' ||
          entity.kind === 'boat' ||
          entity.kind === 'dock' ||
          entity.kind === 'barracks' ||
          entity.kind === 'factory'
        ),
    )
    .map((entity) => ({
      entity,
      score: priority ? Math.max(0, priority.indexOf(entity.kind)) : entity.kind === 'truck' ? 0 : entity.kind === 'boat' ? 1 : entity.kind === 'dock' ? 2 : entity.kind === 'barracks' ? 3 : 4,
    }))
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.entity);
}

function getRaidApproachPoint(target: GameEntity): { x: number; y: number } {
  const radius = getCollisionRadius(target);
  const candidates = [
    { x: target.x + radius + 44, y: target.y },
    { x: target.x - radius - 44, y: target.y },
    { x: target.x, y: target.y + radius + 44 },
    { x: target.x, y: target.y - radius - 44 },
  ];
  for (const point of candidates) {
    if (isValidLandDestination(point.x, point.y)) {
      return point;
    }
  }
  return { x: target.x, y: target.y };
}

function getReachableRaidApproachPoint(attacker: GameEntity, target: GameEntity): { x: number; y: number } | undefined {
  const radius = getCollisionRadius(target);
  const candidates = [
    { x: target.x + radius + 44, y: target.y },
    { x: target.x - radius - 44, y: target.y },
    { x: target.x, y: target.y + radius + 44 },
    { x: target.x, y: target.y - radius - 44 },
  ].filter((point) => isValidLandDestination(point.x, point.y));

  for (const point of candidates) {
    const path = findEntityLandPath(attacker, { x: attacker.x, y: attacker.y }, point);
    if (path.length > 0) {
      return point;
    }
  }
  return undefined;
}

function findReachableRaidPlan(attacker: GameEntity, priority?: Array<GameEntity['kind']>): { target: GameEntity; targetPoint: { x: number; y: number }; path: { x: number; y: number }[] } | undefined {
  for (const target of getRaidCandidateTargets(priority)) {
    const targetPoint = getReachableRaidApproachPoint(attacker, target);
    if (!targetPoint) {
      continue;
    }
    const path = findEntityLandPath(attacker, { x: attacker.x, y: attacker.y }, targetPoint);
    if (path.length > 0) {
      return { target, targetPoint, path };
    }
  }
  return undefined;
}

function getAiRaidTargetPriority(): Array<GameEntity['kind']> {
  const cycle = aiController.raidCount % 2;
  if (aiController.strategy === 'economicBoom') {
    return cycle === 0 ? ['truck', 'factory', 'dock', 'boat', 'barracks'] : ['factory', 'truck', 'dock', 'boat', 'barracks'];
  }
  if (aiController.strategy === 'harborPressure') {
    return cycle === 0 ? ['dock', 'boat', 'truck', 'factory', 'barracks'] : ['boat', 'dock', 'factory', 'truck', 'barracks'];
  }
  return cycle === 0 ? ['factory', 'barracks', 'dock', 'truck', 'boat'] : ['barracks', 'factory', 'truck', 'dock', 'boat'];
}

function describeAiRaidTactic(): string {
  if (aiController.strategy === 'economicBoom') {
    return aiController.raidCount % 2 === 0 ? 'economic harassment' : 'timing push';
  }
  if (aiController.strategy === 'harborPressure') {
    return aiController.raidCount % 2 === 0 ? 'harbor strike' : 'coastal pressure';
  }
  return aiController.raidCount % 2 === 0 ? 'siege' : 'base crack';
}

function getAiRaidSquad(leadAttacker: GameEntity, target: GameEntity): GameEntity[] {
  const baseSize =
    aiController.strategy === 'siege'
      ? 3
      : aiController.strategy === 'economicBoom'
        ? 1
        : 2;
  const desiredSize =
    playerSettings.difficulty === 'hard'
      ? baseSize + 1
      : playerSettings.difficulty === 'easy'
        ? Math.max(1, baseSize - 1)
        : baseSize;
  const candidates = entities.filter(
    (entity) =>
      entity.faction === 'enemy' &&
      getDamageState(entity) !== 'destroyed' &&
      entity.movement.speed > 0 &&
      entity.movement.state === 'idle' &&
      !entity.economy?.attack &&
      !entity.economy?.buildJob &&
      entity.kind === 'guard',
  );
  const prioritized = candidates.sort((a, b) => {
    const scoreA = a.id === leadAttacker.id ? -2 : a.kind === 'guard' ? 0 : 2;
    const scoreB = b.id === leadAttacker.id ? -2 : b.kind === 'guard' ? 0 : 2;
    return scoreA - scoreB || Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y);
  });
  return prioritized.slice(0, desiredSize);
}

function getStaggeredRaidApproachPoint(target: GameEntity, index: number, count: number): { x: number; y: number } {
  const spacing = count > 1 ? 34 : 0;
  const preferred = {
    x: target.x - getCollisionRadius(target) - 56,
    y: target.y + (index - (count - 1) / 2) * spacing,
  };
  if (isValidLandDestination(preferred.x, preferred.y)) {
    return preferred;
  }
  return getRaidApproachPoint(target);
}

function getAiRepeatRaidDelaySeconds(): number {
  const strategyAdjustment =
    aiController.strategy === 'harborPressure'
      ? -4
      : aiController.strategy === 'economicBoom'
        ? 4
        : 0;
  if (playerSettings.difficulty === 'hard') {
    return Math.max(10, FIRST_SKIRMISH_BALANCE.aiRepeatRaidDelaySeconds - 6 + strategyAdjustment);
  }
  if (playerSettings.difficulty === 'easy') {
    return FIRST_SKIRMISH_BALANCE.aiRepeatRaidDelaySeconds + 6 + strategyAdjustment;
  }
  return FIRST_SKIRMISH_BALANCE.aiRepeatRaidDelaySeconds + strategyAdjustment;
}

function getAttackApproachPoint(target: GameEntity, index: number, count: number): { x: number; y: number } {
  const spacing = count > 1 ? 34 : 0;
  if (target.kind === 'boat') {
    const candidateXs = [
      clamp(target.x + (index - (count - 1) / 2) * spacing, 60, WORLD_WIDTH - 60),
      clamp(target.x - 48 + (index - (count - 1) / 2) * spacing, 60, WORLD_WIDTH - 60),
      clamp(target.x + 48 + (index - (count - 1) / 2) * spacing, 60, WORLD_WIDTH - 60),
    ];
    for (const x of candidateXs) {
      const point = { x, y: 560 };
      if (isValidLandDestination(point.x, point.y)) {
        return point;
      }
    }
    return { x: clamp(target.x, 60, WORLD_WIDTH - 60), y: 560 };
  }
  const radius = getCollisionRadius(target);
  const candidates = [
    {
      x: target.x - radius - 52,
      y: target.y + (index - (count - 1) / 2) * spacing,
    },
    {
      x: target.x + radius + 52,
      y: target.y + (index - (count - 1) / 2) * spacing,
    },
    {
      x: target.x + (index - (count - 1) / 2) * spacing,
      y: target.y + radius + 52,
    },
    {
      x: target.x + (index - (count - 1) / 2) * spacing,
      y: target.y - radius - 52,
    },
  ];
  for (const point of candidates) {
    if (isValidLandDestination(point.x, point.y)) {
      return point;
    }
  }
  return getRaidApproachPoint(target);
}

function getRepairApproachPoint(target: GameEntity, index: number, count: number): { x: number; y: number } {
  const spacing = count > 1 ? 32 : 0;
  return {
    x: clamp(target.x + getCollisionRadius(target) + 48, 60, WORLD_WIDTH - 60),
    y: clamp(target.y + (index - (count - 1) / 2) * spacing, 545, WORLD_HEIGHT - 60),
  };
}

function spawnProducedUnit(product: ProductionKind, producer: GameEntity): GameEntity {
  const spawnPoint =
    product === 'boat' || product === 'attackBoat'
      ? getDockSpawnPoint(producer)
      : product === 'guard' || product === 'saboteur'
        ? getBarracksSpawnPoint(producer, product)
        : getFactorySpawnPoint(producer, product);
  const entity =
    product === 'worker'
      ? createWorkerEntity(`worker-${nextWorkerId++}`, productionCatalog.worker.label, spawnPoint.x, spawnPoint.y)
      : product === 'guard'
        ? createGuardEntity(`guard-${nextGuardId++}`, productionCatalog.guard.label, spawnPoint.x, spawnPoint.y)
      : product === 'saboteur'
        ? createSaboteurEntity(`saboteur-${nextSaboteurId++}`, productionCatalog.saboteur.label, spawnPoint.x, spawnPoint.y)
      : product === 'truck'
        ? createTruckEntity(`truck-${nextTruckId++}`, productionCatalog.truck.label, spawnPoint.x, spawnPoint.y)
        : product === 'boat'
          ? createBoatEntity(`boat-${nextBoatId++}`, productionCatalog.boat.label, spawnPoint.x, spawnPoint.y)
          : createAttackBoatEntity(`attack-boat-${nextAttackBoatId++}`, productionCatalog.attackBoat.label, spawnPoint.x, spawnPoint.y);
  if (entity.kind === 'boat') {
    entity.movement.speed = getBoatSpeed(entity);
  }
  entities.push(entity);
  applyBuildingRallyToEntity(entity, producer);
  return entity;
}

function spawnAiProducedUnit(product: ProductionKind, producer: GameEntity): GameEntity {
  const spawnPoint =
    product === 'boat' || product === 'attackBoat'
      ? getDockSpawnPoint(producer)
      : product === 'guard' || product === 'saboteur'
        ? getBarracksSpawnPoint(producer, product)
        : getFactorySpawnPoint(producer, product);
  const entity =
    product === 'boat'
      ? createEnemyBoatEntity(`enemy-boat-${nextEnemyBoatId++}`, productionCatalog.boat.label, spawnPoint.x, spawnPoint.y)
      : product === 'attackBoat'
        ? createEnemyAttackBoatEntity(`enemy-attack-boat-${nextEnemyAttackBoatId++}`, productionCatalog.attackBoat.label, spawnPoint.x, spawnPoint.y)
        : product === 'truck'
          ? createEnemyTruckEntity(`enemy-truck-${nextEnemyTruckId++}`, productionCatalog.truck.label, spawnPoint.x, spawnPoint.y)
          : product === 'saboteur'
            ? createEnemySaboteurEntity(`enemy-saboteur-${nextEnemySaboteurId++}`, productionCatalog.saboteur.label, spawnPoint.x, spawnPoint.y)
          : product === 'guard'
            ? createEnemyGuardEntity(`enemy-guard-${nextEnemyGuardId++}`, productionCatalog.guard.label, spawnPoint.x, spawnPoint.y)
            : createEnemyWorkerEntity(`enemy-worker-${nextEnemyWorkerId++}`, productionCatalog.worker.label, spawnPoint.x, spawnPoint.y);
  if (entity.kind === 'boat') {
    entity.movement.speed = getBoatSpeed(entity);
  }
  entities.push(entity);
  return entity;
}

function getFactorySpawnPoint(factory: GameEntity, product: 'worker' | 'truck'): { x: number; y: number } {
  const baseX = factory.faction === 'enemy' ? factory.x - 180 : factory.x + 230;
  const baseY = factory.faction === 'enemy' ? factory.y + 100 : factory.y + 125;
  const offset = product === 'truck' ? 55 : 0;
  return { x: baseX, y: baseY + offset };
}

function getBarracksSpawnPoint(barracks: GameEntity, product: 'guard' | 'saboteur'): { x: number; y: number } {
  const baseX = barracks.faction === 'enemy' ? barracks.x - 145 : barracks.x + 150;
  const baseY = barracks.faction === 'enemy' ? barracks.y + 94 : barracks.y + 82;
  const offset = product === 'guard' ? -24 : 28;
  return { x: baseX, y: baseY + offset };
}

function getDockSpawnPoint(dock: GameEntity): { x: number; y: number } {
  return getDockSpawnPointForMap(dock, isValidWaterDestination);
}

function getConstructionWorkPoint(site: GameEntity): { x: number; y: number } {
  return getConstructionWorkPoints(site)[0] ?? getConstructionWorkPointForMap(site, isValidLandDestination);
}

function getConstructionWorkPoints(site: GameEntity): Array<{ x: number; y: number }> {
  return getConstructionWorkPointsForMap(site, isValidLandDestination)
    .filter((point) => isValidLandDestination(point.x, point.y));
}

function isValidLandDestination(worldX: number, worldY: number): boolean {
  return isValidLandDestinationForMap(mapData, worldX, worldY);
}

function getMovementProbeCircle(worldX: number, worldY: number, movingEntity?: GameEntity): CircleData {
  if (movingEntity?.collider.kind === 'circle') {
    return {
      id: movingEntity.id,
      x: worldX,
      y: worldY,
      radius: movingEntity.collider.radius,
    };
  }
  return {
    id: movingEntity?.id ?? 'land-movement-probe',
    x: worldX,
    y: worldY,
    radius: Math.max(18, (movingEntity ? getCollisionRadius(movingEntity) : UNIT_BLOCKER_PADDING) * 0.72),
  };
}

function isBlockedByStaticEntity(worldX: number, worldY: number, movingEntity?: GameEntity): boolean {
  const ignoredTargetId = getMovementBlockerIgnoredTargetId(movingEntity);
  const movingCircle = getMovementProbeCircle(worldX, worldY, movingEntity);

  return entities
    .filter((entity) => entity.id !== movingEntity?.id && entity.id !== ignoredTargetId)
    .filter((entity) => getDamageState(entity) !== 'destroyed' && !entity.renderable.hidden)
    .filter((entity) => entity.renderable.layer === 'buildings' || entity.movement.speed <= 0)
    .some((entity) => rectCircleOverlap(getEntityRect(entity), movingCircle));
}

function isBlockedByLandObject(worldX: number, worldY: number, movingEntity?: GameEntity): boolean {
  const movingCircle = getMovementProbeCircle(worldX, worldY, movingEntity);
  return (
    resourceFields.some(
      (field) =>
        Math.hypot(worldX - field.x, worldY - field.y) < movingCircle.radius + field.radius * 0.82,
    ) ||
    mapData.blockers.some((blocker) => rectCircleOverlap(blocker, movingCircle)) ||
    mapData.terrainDecorations.some((decoration) => rectCircleOverlap(decoration, movingCircle))
  );
}

function isValidLandSeparationDestination(worldX: number, worldY: number, movingEntity?: GameEntity): boolean {
  if (movingEntity) {
    return !isBlockedForLandMobile(movingEntity, worldX, worldY);
  }
  return isValidLandDestination(worldX, worldY) && !isBlockedByLandObject(worldX, worldY) && !isBlockedByStaticEntity(worldX, worldY);
}

function isBlockedForLandMobile(entity: GameEntity, worldX = entity.x, worldY = entity.y): boolean {
  return (
    !isValidLandDestination(worldX, worldY) ||
    isBlockedByLandObject(worldX, worldY, entity) ||
    isBlockedByStaticEntity(worldX, worldY, entity)
  );
}

function nudgeLandMobileOutOfBlockers(entity: GameEntity): boolean {
  if (entity.kind === 'boat' || entity.movement.speed <= 0 || !isBlockedForLandMobile(entity)) {
    return false;
  }

  const radii = [32, 56, 88, 124, 168, 220];
  const candidates: Array<{ x: number; y: number; distance: number }> = [];
  for (const radius of radii) {
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      const x = clamp(entity.x + Math.cos(angle) * radius, 40, WORLD_WIDTH - 40);
      const y = clamp(entity.y + Math.sin(angle) * radius, 545, WORLD_HEIGHT - 40);
      if (!isBlockedForLandMobile(entity, x, y)) {
        candidates.push({ x, y, distance: Math.hypot(x - entity.x, y - entity.y) });
      }
    }
  }

  const best = candidates.sort((a, b) => a.distance - b.distance)[0];
  if (!best) {
    return false;
  }

  entity.x = best.x;
  entity.y = best.y;
  return true;
}

function getMovementBlockerIgnoredTargetId(entity?: GameEntity): string | undefined {
  if (!entity) {
    return undefined;
  }
  if (entity.kind === 'worker') {
    return entity.economy?.buildJob?.siteId
      ?? entity.economy?.repair?.targetId
      ?? entity.economy?.factoryDuty?.factoryId
      ?? entity.economy?.unloadingFish?.targetId;
  }
  if (entity.kind === 'truck' && entity.economy?.harvesting?.phase === 'returning') {
    return entities.find(
      (candidate) =>
        candidate.faction === entity.faction &&
        (candidate.kind === 'factory' || candidate.kind === 'enemyFactory'),
    )?.id;
  }
  if (entity.kind === 'boat') {
    return entity.economy?.unloadingFish?.targetId ?? entity.economy?.dockRepair?.dockId;
  }
  return undefined;
}

function isValidWaterDestination(worldX: number, worldY: number): boolean {
  return isValidWaterDestinationForMap(mapData, worldX, worldY);
}

function pickResourceFieldAt(worldX: number, worldY: number): ResourceField | null {
  return pickResourceFieldAtForMap(resourceFields, worldX, worldY);
}

function pickFishingZoneAt(worldX: number, worldY: number): FishingZoneState | null {
  return (
    fishingZoneStates.find(
      (zone) =>
        zone.amount > 0 &&
        zone.depletedCooldownSeconds <= 0 &&
        Math.hypot(worldX - zone.x, worldY - zone.y) <= zone.radius,
    ) ?? null
  );
}

function getResourceInteractionPoint(field: ResourceField, side: 'left' | 'right' = 'right'): { x: number; y: number } {
  const preferred = { x: field.x + field.radius + 42, y: field.y };
  const sidePreferred = side === 'right' ? preferred : { x: field.x - field.radius - 42, y: field.y };
  if (isValidLandDestination(sidePreferred.x, sidePreferred.y)) {
    return sidePreferred;
  }
  if (isValidLandDestination(preferred.x, preferred.y)) {
    return preferred;
  }
  return { x: field.x, y: field.y + field.radius + 42 };
}

function getFishingInteractionPoint(zone: FishingZoneData): { x: number; y: number } {
  return getFishingInteractionPointForMap(zone, isValidWaterDestination);
}

function getWorkerFishingPoint(zone: FishingZoneData): { x: number; y: number } {
  return getWorkerFishingPointForMap(zone, isValidLandDestination);
}

function getFactoryCrewPoint(factory: GameEntity, worker: GameEntity, index: number, count: number): { x: number; y: number } {
  const spread = (index - (count - 1) / 2) * 30;
  if (factory.collider.kind === 'rect') {
    const margin = Math.max(44, getCollisionRadius(worker) + 24);
    const inset = 18;
    const centerX = factory.x;
    const centerY = factory.y;
    const left = factory.x - factory.collider.width / 2;
    const right = factory.x + factory.collider.width / 2;
    const top = factory.y - factory.collider.height / 2;
    const bottom = factory.y + factory.collider.height / 2;
    const dx = worker.x - centerX;
    const dy = worker.y - centerY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        x: dx >= 0 ? right + margin : left - margin,
        y: clamp(centerY + spread, top + inset, bottom - inset),
      };
    }
    return {
      x: clamp(centerX + spread, left + inset, right - inset),
      y: dy >= 0 ? bottom + margin : top - margin,
    };
  }
  const angle = Math.atan2(worker.y - factory.y, worker.x - factory.x);
  const tangentAngle = angle + Math.PI / 2;
  return {
    x: factory.x + Math.cos(angle) * 84 + Math.cos(tangentAngle) * spread,
    y: factory.y + Math.sin(angle) * 84 + Math.sin(tangentAngle) * spread,
  };
}

function getFactoryCrewReleasePoint(factory: GameEntity, index: number, count: number): { x: number; y: number } {
  const baseX = factory.collider.kind === 'rect' ? factory.x + factory.collider.width / 2 + 44 : factory.x + 116;
  return {
    x: baseX + (index - (count - 1) / 2) * 38,
    y: factory.collider.kind === 'rect' ? factory.y + factory.collider.height * 0.22 : factory.y + 70,
  };
}

function getDockUnloadPoint(dock: GameEntity): { x: number; y: number } {
  return getDockUnloadPointForMap(dock, isValidWaterDestination);
}

function getWorkerFishDropOffPoint(bank: GameEntity, worker: GameEntity): { x: number; y: number } {
  if (bank.kind === 'dock') {
    return getDockLandDropOffPoint(bank);
  }
  return getFactoryPerimeterDropOffPoint(bank, { x: worker.x, y: worker.y }, getCollisionRadius(worker));
}

function getFactoryPerimeterDropOffPoint(factory: GameEntity, from?: { x: number; y: number }, clearance = 0): { x: number; y: number } {
  if (factory.collider.kind === 'rect') {
    const margin = Math.max(28, clearance + 18);
    const inset = 18;
    const centerX = factory.x;
    const centerY = factory.y;
    const left = factory.x - factory.collider.width / 2;
    const right = factory.x + factory.collider.width / 2;
    const top = factory.y - factory.collider.height / 2;
    const bottom = factory.y + factory.collider.height / 2;
    const approachX = from?.x ?? centerX + 1;
    const approachY = from?.y ?? centerY;
    const dx = approachX - centerX;
    const dy = approachY - centerY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        x: dx >= 0 ? right + margin : left - margin,
        y: clamp(approachY, top + inset, bottom - inset),
      };
    }
    return {
      x: clamp(approachX, left + inset, right - inset),
      y: dy >= 0 ? bottom + margin : top - margin,
    };
  }
  const angle = from ? Math.atan2(from.y - factory.y, from.x - factory.x) : 0;
  const distance = 120;
  return {
    x: factory.x + Math.cos(angle) * distance,
    y: factory.y + Math.sin(angle) * distance,
  };
}

function getFactoryDropOffPoint(from?: { x: number; y: number }): { x: number; y: number } {
  const factory = entities.find((entity) => entity.kind === 'factory' && entity.faction === 'player');
  if (!factory) {
    return { x: 925, y: 850 };
  }
  return getFactoryPerimeterDropOffPoint(factory, from);
}

function getMetalDropOffPoint(target: Faction | GameEntity): { x: number; y: number } {
  const faction = typeof target === 'string' ? target : target.faction;
  const from = typeof target === 'string' ? undefined : { x: target.x, y: target.y };
  const clearance = typeof target === 'string' ? 0 : getCollisionRadius(target);
  if (faction === 'enemy') {
    const enemyFactory = entities.find((entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy');
    if (!enemyFactory) {
      return { x: 1600, y: 780 };
    }
    return getFactoryPerimeterDropOffPoint(enemyFactory, from, clearance);
  }
  const factory = entities.find((entity) => entity.kind === 'factory' && entity.faction === 'player');
  if (!factory) {
    return { x: 925, y: 850 };
  }
  return getFactoryPerimeterDropOffPoint(factory, from, clearance);
}

function reportCommandResult(result: CommandResult, layers: RenderLayers): void {
  lastCommandResult = result;
  playSfx(result.ok ? 'confirm' : 'error');
  setBootStatus('ready', result.message);
  publishDebugState(layers);
}

function findLandPath(start: { x: number; y: number }, goal: { x: number; y: number }): Array<{ x: number; y: number }> {
  return findGridPath(start, goal, (worldX, worldY) => isValidLandDestination(worldX, worldY) && !isBlockedByLandObject(worldX, worldY));
}

function findEntityLandPath(
  entity: GameEntity,
  start: { x: number; y: number },
  goal: { x: number; y: number },
): Array<{ x: number; y: number }> {
  return findGridPath(
    start,
    goal,
    (worldX, worldY) =>
      isValidLandDestination(worldX, worldY) &&
      !isBlockedByLandObject(worldX, worldY, entity) &&
      !isBlockedByStaticEntity(worldX, worldY, entity),
  );
}

function findWorkerFishUnloadPath(
  worker: GameEntity,
  bank: GameEntity,
  start: { x: number; y: number },
  goal: { x: number; y: number },
): Array<{ x: number; y: number }> {
  const previousEconomy = worker.economy;
  worker.economy = {
    ...worker.economy,
    unloadingFish: { targetId: bank.id, phase: bank.kind === 'dock' ? 'to-dock' : 'to-bank' },
  };
  const path = findEntityLandPath(worker, start, goal);
  worker.economy = previousEconomy;
  return path;
}

function findTruckLandPath(
  truck: GameEntity,
  start: { x: number; y: number },
  goal: { x: number; y: number },
): Array<{ x: number; y: number }> {
  return findEntityLandPath(truck, start, goal);
}

const placementRuntime = createPlacementRuntime({
  mapData,
  resourceFields,
  entities,
  economyState,
  getPlacementMode: () => placementMode,
  setPlacementMode: (value) => {
    placementMode = value;
  },
  hasSelectedWorker,
  getSelectedBuilder,
  getNextBuildingSiteId: () => nextBuildingSiteId,
  setNextBuildingSiteId: (value) => {
    nextBuildingSiteId = value;
  },
  getConstructionWorkPoint,
  getConstructionWorkPoints,
  findLandPath,
  findEntityLandPath,
  setLastMoveCommand: (value) => {
    lastMoveCommand = value;
  },
  reportCommandResult,
  setBootStatus,
  drawPlacementPreview,
  updateWorkerCommandPanel,
  updateCommandHint,
  updateEconomyReadout,
  renderBuildings,
  drawDestinationOverlay,
  publishDebugState,
});

function findWaterPath(start: { x: number; y: number }, goal: { x: number; y: number }): Array<{ x: number; y: number }> {
  return findGridPath(start, goal, isValidWaterDestination);
}

function recoverLandMovement(entity: GameEntity): boolean {
  const finalTarget = entity.path[entity.path.length - 1] ?? entity.moveTarget;
  if (!finalTarget) {
    return false;
  }

  const candidateTargets = [
    finalTarget,
    { x: finalTarget.x + 36, y: finalTarget.y },
    { x: finalTarget.x - 36, y: finalTarget.y },
    { x: finalTarget.x, y: finalTarget.y + 36 },
    { x: finalTarget.x, y: finalTarget.y - 36 },
    { x: finalTarget.x + 28, y: finalTarget.y + 28 },
    { x: finalTarget.x - 28, y: finalTarget.y + 28 },
    { x: finalTarget.x + 28, y: finalTarget.y - 28 },
    { x: finalTarget.x - 28, y: finalTarget.y - 28 },
  ];

  for (const target of candidateTargets) {
    const path = findEntityLandPath(entity, { x: entity.x, y: entity.y }, target);
    if (path.length > 0) {
      entity.path = path;
      entity.moveTarget = path[0];
      entity.movement.state = 'moving';
      return true;
    }
  }

  return false;
}

function tryAdvanceMobileEntity(entity: GameEntity, targetX: number, targetY: number): boolean {
  const validator = entity.kind === 'boat' ? isValidWaterDestination : isValidLandDestination;
  const attempts: Array<{ x: number; y: number }> = [
    { x: targetX, y: targetY },
    { x: targetX, y: entity.y },
    { x: entity.x, y: targetY },
    { x: entity.x + (targetX - entity.x) * 0.7, y: entity.y + (targetY - entity.y) * 0.7 },
    { x: entity.x + (targetX - entity.x) * 0.45, y: entity.y + (targetY - entity.y) * 0.45 },
  ];

  for (const attempt of attempts) {
    if (!validator(attempt.x, attempt.y)) {
      continue;
    }
    if (entity.kind !== 'boat' && isBlockedByLandObject(attempt.x, attempt.y, entity)) {
      continue;
    }
    const finalApproach =
      entity.kind !== 'boat' &&
      entity.moveTarget &&
      entity.path.length <= 1 &&
      Math.hypot(entity.moveTarget.x - attempt.x, entity.moveTarget.y - attempt.y) <= Math.max(10, getCollisionRadius(entity) * 0.8);
    if (entity.kind !== 'boat' && !finalApproach && isBlockedByStaticEntity(attempt.x, attempt.y, entity)) {
      continue;
    }
    entity.x = attempt.x;
    entity.y = attempt.y;
    return true;
  }

  return false;
}

function cancelBlockedMobileOrder(entity: GameEntity): void {
  const buildJob = entity.economy?.buildJob;
  entity.path = [];
  entity.moveTarget = undefined;
  entity.movement.state = 'idle';

  if (entity.kind !== 'worker' || buildJob?.phase !== 'to-site') {
    return;
  }

  entity.economy = { ...entity.economy, buildJob: undefined, buildQueue: undefined };
  if (entity.faction === 'player') {
    setBootStatus('ready', `${entity.name} could not reach the construction site. Reissue the build order from a clear approach.`);
  } else {
    aiController.lastAction = `${entity.name} could not reach the construction site.`;
  }
}

function settleCrowdedArrival(entity: GameEntity, layers: RenderLayers): boolean {
  if (entity.kind === 'boat' || !entity.moveTarget || entity.path.length > 2) {
    return false;
  }

  const settleRadius = Math.max(24, getCollisionRadius(entity) * 0.8);
  if (Math.hypot(entity.moveTarget.x - entity.x, entity.moveTarget.y - entity.y) > settleRadius) {
    return false;
  }

  entity.x = entity.moveTarget.x;
  entity.y = entity.moveTarget.y;
  entity.path.shift();
  while (entity.path[0] && Math.hypot(entity.path[0].x - entity.x, entity.path[0].y - entity.y) <= settleRadius) {
    entity.path.shift();
  }
  entity.moveTarget = entity.path[0];
  entity.movement.state = entity.moveTarget ? 'moving' : 'idle';
  if (!entity.moveTarget) {
    movementRecoveryState.delete(entity.id);
    completeArrival(entity, layers);
  }
  return true;
}

function completeNearbyHarvestArrival(entity: GameEntity, layers: RenderLayers): boolean {
  const harvesting = entity.economy?.harvesting;
  if (entity.kind !== 'truck' || !harvesting) {
    return false;
  }

  if (harvesting.phase === 'to-field' || harvesting.phase === 'loading') {
    const field = resourceFields.find((candidate) => candidate.id === harvesting.fieldId && candidate.amount > 0);
    if (!field) {
      return false;
    }
    const harvestReach = field.radius + getCollisionRadius(entity) + 46;
    if (Math.hypot(entity.x - field.x, entity.y - field.y) > harvestReach) {
      return false;
    }
  } else {
    const dropOff = getMetalDropOffPoint(entity);
    const unloadReach = getCollisionRadius(entity) + 58;
    if (Math.hypot(entity.x - dropOff.x, entity.y - dropOff.y) > unloadReach) {
      return false;
    }
  }

  entity.path = [];
  entity.moveTarget = undefined;
  entity.movement.state = 'idle';
  movementRecoveryState.delete(entity.id);
  completeArrival(entity, layers);
  return true;
}

function completeNearbyWorkerFishUnloadArrival(entity: GameEntity, layers: RenderLayers): boolean {
  const unloadingFish = entity.economy?.unloadingFish;
  const cargo = entity.economy?.cargo;
  if (entity.kind !== 'worker' || !unloadingFish || !cargo || cargo.kind !== 'fish' || cargo.amount <= 0) {
    return false;
  }

  const bank = entities.find((candidate) => candidate.id === unloadingFish.targetId);
  if (!bank || getDamageState(bank) === 'destroyed') {
    return false;
  }

  const dropOff = getFishBankDropOffPoint(bank, entity);
  const dropOffReach = getCollisionRadius(entity) + 44;
  const bankReach = bank.collider.kind === 'rect'
    ? Math.max(bank.collider.width, bank.collider.height) * 0.48 + getCollisionRadius(entity) + 28
    : getCollisionRadius(entity) + getCollisionRadius(bank) + 36;
  const nearDropOff = Math.hypot(entity.x - dropOff.x, entity.y - dropOff.y) <= dropOffReach;
  const nearBank = Math.hypot(entity.x - bank.x, entity.y - bank.y) <= bankReach;
  if (!nearDropOff && !nearBank) {
    return false;
  }

  entity.path = [];
  entity.moveTarget = undefined;
  entity.movement.state = 'idle';
  movementRecoveryState.delete(entity.id);
  completeArrival(entity, layers);
  return true;
}

function completeNearbyBuildArrival(entity: GameEntity, layers: RenderLayers): boolean {
  const buildJob = entity.economy?.buildJob;
  if (entity.kind !== 'worker' || buildJob?.phase !== 'to-site') {
    return false;
  }

  const site = entities.find((candidate) => candidate.id === buildJob.siteId);
  const construction = site?.economy?.construction;
  if (!site || !construction || construction.complete) {
    return false;
  }

  const siteReach = site.collider.kind === 'rect'
    ? Math.max(site.collider.width, site.collider.height) * 0.45 + getCollisionRadius(entity)
    : getCollisionRadius(entity) + 58;
  if (Math.hypot(entity.x - site.x, entity.y - site.y) > siteReach) {
    return false;
  }

  entity.path = [];
  entity.moveTarget = undefined;
  entity.movement.state = 'idle';
  movementRecoveryState.delete(entity.id);
  completeArrival(entity, layers);
  return true;
}

function updateAnimationStates(deltaSeconds: number, layers: RenderLayers): boolean {
  let changed = false;

  for (const entity of entities) {
    const nextState = resolveAnimationAction(entity, getDamageState);
    const nextDirection = resolveAnimationDirection(entity, getAnimationTargetPosition);
    const profile = getAnimationProfile(entity);
    let clock = entity.animation.clock ?? 0;
    let frame = entity.animation.frame;

    if (entity.animation.state !== nextState) {
      entity.animation = { state: nextState, direction: nextDirection, frame: 0, clock: 0 };
      changed = true;
      continue;
    }

    clock += deltaSeconds;
    const secondsPerFrame = 1 / entityAnimationFrameRate(entity, nextState, profile);
    if (clock >= secondsPerFrame) {
      const steps = Math.floor(clock / secondsPerFrame);
      clock -= steps * secondsPerFrame;
      frame = (frame + steps) % entityAnimationFrameCount(entity, nextState, profile);
      entity.animation = { state: nextState, direction: nextDirection, frame, clock };
      changed = true;
    } else if (entity.animation.direction !== nextDirection || entity.animation.clock === undefined) {
      entity.animation = { state: nextState, direction: nextDirection, frame, clock };
      changed = true;
    } else {
      entity.animation = { ...entity.animation, clock };
    }
  }

  if (changed) {
    renderEntities(layers);
    drawSelectionOverlay(layers);
    publishDebugState(layers);
  }

  return changed;
}

function updateEntityMovement(deltaSeconds: number, layers: RenderLayers): boolean {
  let moved = false;
  for (const entity of entities) {
    if (!entity.moveTarget || entity.movement.speed <= 0) {
      movementRecoveryState.delete(entity.id);
      continue;
    }

    const previousX = entity.x;
    const previousY = entity.y;
    const dx = entity.moveTarget.x - entity.x;
    const dy = entity.moveTarget.y - entity.y;
    const distance = Math.hypot(dx, dy);
    const step = entity.movement.speed * deltaSeconds;
    const nextWaypoint = entity.path[1];
    const finalLegCollapsed = Boolean(
      nextWaypoint
      && Math.hypot(nextWaypoint.x - entity.moveTarget.x, nextWaypoint.y - entity.moveTarget.y) <= (entity.kind === 'truck' ? 12 : 24),
    );
    const arrivalThreshold = entity.path.length <= 1 || finalLegCollapsed
      ? Math.max(5, getCollisionRadius(entity) * (entity.kind === 'truck' ? 0.28 : 0.45))
      : 2;

    if (distance <= step || distance <= arrivalThreshold) {
      if (!tryAdvanceMobileEntity(entity, entity.moveTarget.x, entity.moveTarget.y)) {
        if (completeNearbyBuildArrival(entity, layers)) {
          moved = true;
          continue;
        }
        if (completeNearbyHarvestArrival(entity, layers)) {
          moved = true;
          continue;
        }
        if (completeNearbyWorkerFishUnloadArrival(entity, layers)) {
          moved = true;
          continue;
        }
        if (nudgeLandMobileOutOfBlockers(entity)) {
          recoverLandMovement(entity);
          movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds: 0 });
          moved = true;
          continue;
        }
        if (entity.kind !== 'boat' && recoverLandMovement(entity)) {
          movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds: 0 });
          moved = true;
          continue;
        }
        cancelBlockedMobileOrder(entity);
        movementRecoveryState.delete(entity.id);
        continue;
      }
      entity.path.shift();
      while (entity.path[0] && Math.hypot(entity.path[0].x - entity.x, entity.path[0].y - entity.y) <= arrivalThreshold) {
        entity.path.shift();
      }
      entity.moveTarget = entity.path[0];
      entity.movement.state = entity.moveTarget ? 'moving' : 'idle';
      if (!entity.moveTarget) {
        movementRecoveryState.delete(entity.id);
        completeArrival(entity, layers);
      } else {
        movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds: 0 });
      }
      moved = true;
      continue;
    }

    const nextX = entity.x + (dx / distance) * step;
    const nextY = entity.y + (dy / distance) * step;
    if (!tryAdvanceMobileEntity(entity, nextX, nextY)) {
      if (completeNearbyBuildArrival(entity, layers)) {
        moved = true;
        continue;
      }
      if (completeNearbyHarvestArrival(entity, layers)) {
        moved = true;
        continue;
      }
      if (completeNearbyWorkerFishUnloadArrival(entity, layers)) {
        moved = true;
        continue;
      }
      if (nudgeLandMobileOutOfBlockers(entity)) {
        recoverLandMovement(entity);
        movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds: 0 });
        moved = true;
        continue;
      }
      if (entity.kind !== 'boat' && recoverLandMovement(entity)) {
        movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds: 0 });
        moved = true;
        continue;
      }
      cancelBlockedMobileOrder(entity);
      movementRecoveryState.delete(entity.id);
      continue;
    }
    entity.rotation = Math.atan2(dy, dx);
    moved = true;

    if (entity.kind !== 'boat' && entity.moveTarget) {
      const previousRecovery = movementRecoveryState.get(entity.id);
      const drift = Math.hypot(entity.x - previousX, entity.y - previousY);
      const stagnantSeconds = drift < 1.5 ? (previousRecovery?.stagnantSeconds ?? 0) + deltaSeconds : 0;
      movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds });
      if (stagnantSeconds >= 0.85 && recoverLandMovement(entity)) {
        movementRecoveryState.set(entity.id, { x: entity.x, y: entity.y, stagnantSeconds: 0 });
      }
    }
  }

  if (resolveMobileUnitOverlapsForSystem(getLandMobileEntities(), isValidLandSeparationDestination)) {
    moved = true;
  }

  for (const entity of getLandMobileEntities()) {
    if (nudgeLandMobileOutOfBlockers(entity)) {
      moved = true;
    }
  }

  for (const entity of entities) {
    if (settleCrowdedArrival(entity, layers)) {
      moved = true;
    }
  }

  if (moved) {
    renderUnits(layers);
    drawSelectionOverlay(layers);
    publishDebugState(layers);
  }

  return moved;
}

function completeArrival(entity: GameEntity, layers: RenderLayers, deltaSeconds = 0): void {
  const guardOrder = entity.economy?.guardOrder;
  if (guardOrder?.mode === 'attackMove' && entity.kind === 'guard') {
    entity.economy = { ...entity.economy, guardOrder: { mode: 'hold', acquireRange: guardOrder.acquireRange } };
    updateSelectionReadout();
    publishDebugState(layers);
    return;
  }

  const buildJob = entity.economy?.buildJob;
  if (buildJob && entity.kind === 'worker') {
    const site = entities.find((candidate) => candidate.id === buildJob.siteId);
    const construction = site?.economy?.construction;
    if (!site || !construction || construction.complete) {
      const previousSiteId = buildJob.siteId;
      entity.economy = { ...entity.economy, buildJob: undefined, buildQueue: undefined };
      entity.path = [];
      entity.moveTarget = undefined;
      entity.movement.state = 'idle';
      queueWorkerToNearbyConstruction(entity, previousSiteId);
      return;
    }
    entity.movement.state = 'building';
    entity.economy = { ...entity.economy, buildJob: { siteId: site.id, phase: 'building' } };
    if (entity.faction === 'enemy') {
      aiController.lastAction = `${entity.name} is constructing ${buildingCatalog[construction.building].label}.`;
    } else {
      setBootStatus('ready', `${entity.name} is constructing ${buildingCatalog[construction.building].label}.`);
    }
    updateSelectionReadout();
    publishDebugState(layers);
    return;
  }

  const factoryDuty = entity.economy?.factoryDuty;
  if (factoryDuty && entity.kind === 'worker') {
    entity.movement.state = 'idle';
    entity.path = [];
    entity.moveTarget = undefined;
    entity.commandable = false;
    entity.renderable = { ...entity.renderable, hidden: true };
    entity.economy = { ...entity.economy, shoreFishing: undefined, factoryDuty: { factoryId: factoryDuty.factoryId, phase: 'producing' } };
    selectedEntityIds.delete(entity.id);
    setBootStatus('ready', `${entity.name} joined the factory reel workshop crew.`);
    updateSelectionReadout();
    publishDebugState(layers);
    return;
  }

  const fishing = entity.economy?.fishing;
  if (fishing && entity.kind === 'boat') {
    const cargo = entity.economy?.cargo;
    if (!cargo) {
      entity.economy = { ...entity.economy, fishing: undefined };
      return;
    }
    entity.economy = { ...entity.economy, cargo, fishing: { zoneId: fishing.zoneId, phase: 'fishing' } };
    setBootStatus('ready', `${entity.name} is fishing.`);
    updateSelectionReadout();
    publishDebugState(layers);
    return;
  }

  const attack = entity.economy?.attack;
  if (attack) {
    entity.movement.state = 'idle';
    publishDebugState(layers);
    return;
  }

  const sabotage = entity.economy?.sabotage;
  if (sabotage) {
    entity.economy = { ...entity.economy, sabotage: { ...sabotage, phase: 'sabotaging' } };
    entity.movement.state = 'idle';
    lastSabotageEvent = { kind: 'queued', saboteurId: entity.id, targetId: sabotage.targetId };
    publishDebugState(layers);
    return;
  }

  const repair = entity.economy?.repair;
  if (repair) {
    entity.economy = { ...entity.economy, repair: { ...repair, phase: 'repairing' } };
    entity.movement.state = 'idle';
    lastRepairEvent = { kind: 'repairing', workerId: entity.id, targetId: repair.targetId };
    publishDebugState(layers);
    return;
  }

  const shoreFishing = entity.economy?.shoreFishing;
  if (shoreFishing && entity.kind === 'worker') {
    entity.movement.state = 'idle';
    entity.economy = { ...entity.economy, shoreFishing: { zoneId: shoreFishing.zoneId, phase: 'fishing' } };
    setBootStatus('ready', `${entity.name} started shoreline fishing.`);
    updateSelectionReadout();
    publishDebugState(layers);
    return;
  }

  const dockRepair = entity.economy?.dockRepair;
  if (dockRepair && entity.kind === 'boat') {
    entity.economy = { ...entity.economy, dockRepair: { ...dockRepair, phase: 'repairing' } };
    entity.movement.state = 'idle';
    publishDebugState(layers);
    return;
  }

  const unloadingFish = entity.economy?.unloadingFish;
  if (unloadingFish && entity.kind === 'worker') {
    const cargo = entity.economy?.cargo;
    if (!cargo || cargo.kind !== 'fish' || cargo.amount <= 0) {
      entity.economy = { ...entity.economy, unloadingFish: undefined };
      return;
    }

    const soldFish = cargo.amount;
    const sourceZone = fishingZoneStates.find((zone) => zone.id === entity.economy?.autoFishZoneId);
    const cashPerFish = sourceZone?.cashPerFish ?? 2;
    const cashGained = soldFish * cashPerFish;
    cargo.amount = 0;
    entity.economy = { ...entity.economy, cargo, unloadingFish: undefined };
    const autoFishingQueued = queueWorkerFishReturnToZone(entity);
    economyState.cash += cashGained;
    matchStats.cashEarned += cashGained;
    matchStats.fishSold += soldFish;
    lastResourceEvent = { entityId: entity.id, kind: 'fishSold', amount: soldFish, stockpile: economyState.metal, cash: economyState.cash };
    updateEconomyReadout();
    updateSelectionReadout();
    drawDestinationOverlay(layers);
    setBootStatus(
      'ready',
      autoFishingQueued
        ? `${entity.name} unloaded ${soldFish} shoreline fish for ${cashGained} cash and is returning to the bank.`
        : `${entity.name} unloaded ${soldFish} shoreline fish for ${cashGained} cash.`,
    );
    publishDebugState(layers);
    return;
  }

  if (unloadingFish && entity.kind === 'boat') {
    const cargo = entity.economy?.cargo;
    if (!cargo || cargo.kind !== 'fish' || cargo.amount <= 0) {
      entity.economy = { ...entity.economy, unloadingFish: undefined };
      return;
    }

    const soldFish = cargo.amount;
    const sourceZone = fishingZoneStates.find((zone) => zone.id === entity.economy?.autoFishZoneId);
    const cashPerFish = sourceZone?.cashPerFish ?? 2;
    const cashGained = soldFish * cashPerFish;
    cargo.amount = 0;
    entity.economy = { ...entity.economy, cargo, unloadingFish: undefined };
    const autoFishingQueued = queueAutoFishReturnToZone({ boat: entity, docks: entities, zones: fishingZoneStates, getDamageState, findWaterPath, getDockUnloadPoint, getFishingInteractionPoint });
    if (entity.faction === 'enemy') {
      aiEconomyState.cash += cashGained;
      aiController.fishingIssued = autoFishingQueued;
      aiController.lastAction = autoFishingQueued ? `Rival fishing boat sold ${soldFish} fish from ${sourceZone?.label ?? 'open water'} and returned to fishing.` : `Rival fishing boat sold ${soldFish} fish for ${cashGained} cash.`;
      aiController.lastResourceEvent = { entityId: entity.id, kind: 'fishSold', amount: soldFish, metal: aiEconomyState.metal, cash: aiEconomyState.cash };
      publishDebugState(layers);
      return;
    }
    economyState.cash += cashGained;
    matchStats.cashEarned += cashGained;
    matchStats.fishSold += soldFish;
    lastResourceEvent = { entityId: entity.id, kind: 'fishSold', amount: soldFish, stockpile: economyState.metal, cash: economyState.cash };
    updateEconomyReadout();
    updateSelectionReadout();
    drawDestinationOverlay(layers);
    setBootStatus(
      'ready',
      autoFishingQueued
        ? `${entity.name} sold ${soldFish} fish from ${sourceZone?.label ?? 'open water'} and is returning to fish. Cash: ${economyState.cash}.`
        : `${entity.name} sold ${soldFish} fish for ${cashGained} cash. Cash: ${economyState.cash}.`,
    );
    publishDebugState(layers);
    return;
  }

  const harvesting = entity.economy?.harvesting;
  if (!harvesting || entity.kind !== 'truck') {
    return;
  }

  const output = resolveHarvestArrival({
    truck: entity,
    resourceFields,
    playerStockpile: economyState,
    enemyStockpile: aiEconomyState,
    deltaSeconds,
    getDropOffPoint: getMetalDropOffPoint,
    findLandPath: (start, goal) => findTruckLandPath(entity, start, goal),
  });
  if (!output.changed) {
    return;
  }

  if (output.moveCommand) {
    lastMoveCommand = output.moveCommand;
    drawDestinationOverlay(layers);
  }

  for (const event of output.events) {
    if (event.kind === 'fieldDepleted' || event.kind === 'returnPathBlocked') {
      const replacementQueued = queueTruckHarvestAtBestField(entity, harvesting.fieldId);
      setBootStatus('ready', replacementQueued ? `${event.message} Redirecting truck to a new metal field.` : event.message);
      continue;
    }
    if (event.kind === 'metalLoaded') {
      if (event.faction === 'enemy') {
        aiController.lastAction = `Rival hauler loaded ${event.amount} metal.`;
      } else {
        lastResourceEvent = { entityId: event.entityId, kind: 'metalLoaded', amount: event.amount, stockpile: economyState.metal };
        playSfx('harvest');
        setBootStatus('ready', event.message);
      }
      continue;
    }
    if (event.kind === 'metalUnloaded') {
      if (event.faction === 'enemy') {
        aiController.lastAction = `Rival hauler unloaded ${event.amount} metal.`;
        aiController.lastResourceEvent = { entityId: event.entityId, kind: 'metalUnloaded', amount: event.amount, metal: aiEconomyState.metal, cash: aiEconomyState.cash };
        aiController.harvestIssued = false;
        if (!output.moveCommand && harvesting.phase !== 'manual-returning') {
          queueTruckHarvestAtBestField(entity, harvesting.fieldId);
        }
      } else {
        matchStats.metalHarvested += event.amount;
        lastResourceEvent = { entityId: event.entityId, kind: 'metalUnloaded', amount: event.amount, stockpile: economyState.metal };
        playSfx('unload');
        updateEconomyReadout();
        const replacementQueued = harvesting.phase !== 'manual-returning' && !output.moveCommand && queueTruckHarvestAtBestField(entity, harvesting.fieldId);
        setBootStatus('ready', replacementQueued ? `${event.message} Redirecting truck to a new metal field.` : event.message);
      }
    }
  }
  updateSelectionReadout();
  publishDebugState(layers);
}

function updateMetalHarvesting(deltaSeconds: number, layers: RenderLayers): boolean {
  let changed = false;
  for (const entity of entities) {
    if (entity.kind !== 'truck' || entity.economy?.harvesting?.phase !== 'loading') {
      continue;
    }

    completeArrival(entity, layers, deltaSeconds);
    changed = true;
  }
  return changed;
}

function getAnimationTargetPosition(entity: GameEntity): { x: number; y: number } | undefined {
  const targetId = entity.economy?.attack?.targetId ?? entity.economy?.sabotage?.targetId ?? entity.economy?.repair?.targetId;
  if (!targetId) {
    return undefined;
  }
  const target = entities.find((candidate) => candidate.id === targetId);
  return target ? { x: target.x, y: target.y } : undefined;
}

function installCameraControls(app: Application, layers: RenderLayers): void {
  gameElement.addEventListener('contextmenu', (event) => event.preventDefault());
  gameElement.addEventListener('selectstart', (event) => event.preventDefault());

  gameElement.addEventListener('pointerenter', () => {
    pointerInViewport = true;
    focusGameViewport();
  });
  gameElement.addEventListener('pointerleave', () => {
    pointerInViewport = false;
    edgeScrollX = 0;
    edgeScrollY = 0;
    clearCombatPreview(layers);
  });
  gameElement.addEventListener('pointermove', (event) => {
    if (pauseMenuOpen) {
      edgeScrollX = 0;
      edgeScrollY = 0;
      return;
    }
    const bounds = gameElement.getBoundingClientRect();

    if (dragPan && event.pointerId === dragPan.pointerId) {
      camera.x -= (event.clientX - dragPan.lastX) / camera.zoom;
      camera.y -= (event.clientY - dragPan.lastY) / camera.zoom;
      dragPan = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
      applyCamera(app, layers);
      return;
    }

    if (placementMode) {
      const point = screenToWorld(app, event.clientX, event.clientY);
      updatePlacementMode(point.x, point.y, layers);
    }

    const point = screenToWorld(app, event.clientX, event.clientY);
    updateCombatPreviewAtPoint(point.x, point.y, layers);

    if (selectionDrag && event.pointerId === selectionDrag.pointerId) {
      const distance = Math.hypot(event.clientX - selectionDrag.startScreenX, event.clientY - selectionDrag.startScreenY);
      selectionDrag.currentScreenX = event.clientX;
      selectionDrag.currentScreenY = event.clientY;
      selectionDrag.active = distance > 8;
      drawSelectionDragOverlay(layers);
      return;
    }

    edgeScrollX = event.clientX - bounds.left < EDGE_SCROLL_SIZE ? -1 : event.clientX > bounds.right - EDGE_SCROLL_SIZE ? 1 : 0;
    edgeScrollY = event.clientY - bounds.top < EDGE_SCROLL_SIZE ? -1 : event.clientY > bounds.bottom - EDGE_SCROLL_SIZE ? 1 : 0;
  });
  gameElement.addEventListener('pointerdown', (event) => {
    focusGameViewport();
    if (pauseMenuOpen) {
      event.preventDefault();
      return;
    }
    if (placementMode && event.button === 0) {
      event.preventDefault();
      const point = screenToWorld(app, event.clientX, event.clientY);
      updatePlacementMode(point.x, point.y, layers);
      confirmPlacement(layers, event.shiftKey);
      return;
    }

    if (attackMovePlacement && event.button === 0) {
      event.preventDefault();
      const point = screenToWorld(app, event.clientX, event.clientY);
      issueAttackMoveCommand(point.x, point.y, layers);
      return;
    }

    if (attackTargetPlacement && event.button === 0) {
      event.preventDefault();
      const point = screenToWorld(app, event.clientX, event.clientY);
      const targetEntity = pickEntityAt(point.x, point.y);
      if (targetEntity?.faction === 'enemy' && issueAttackCommand(targetEntity, layers)) {
        renderUnits(layers);
        updateSelectionReadout();
        return;
      }
      setBootStatus('ready', 'Attack target invalid: left-click an enemy unit or structure.');
      playSfx('error');
      publishDebugState(layers);
      return;
    }

    if (placementMode && event.button === 2) {
      event.preventDefault();
      cancelPlacement(layers);
      return;
    }

    if (attackTargetPlacement && event.button === 2) {
      event.preventDefault();
      cancelTargetingModes(layers, 'Attack targeting cancelled.');
      return;
    }

    if (attackMovePlacement && event.button === 2) {
      event.preventDefault();
      cancelTargetingModes(layers, 'Attack-Move cancelled.');
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      const point = screenToWorld(app, event.clientX, event.clientY);
      const targetEntity = pickEntityAt(point.x, point.y);
      const selectedRallyBuilding = getSelectedRallyBuilding();
      const selectedUnits = getSelectedPlayerCommandableUnits();
      if (selectedRallyBuilding && selectedUnits.length === 0 && issueSetBuildingRallyPoint(selectedRallyBuilding, point.x, point.y, layers)) {
        return;
      }
      const hasSelectedWorker = selectedUnits.some((entity) => entity.kind === 'worker');
      const hasSelectedLoadedMetalTruck = selectedUnits.some((entity) => entity.kind === 'truck' && entity.economy?.cargo?.kind === 'metal' && (entity.economy.cargo.amount ?? 0) > 0);
      const hasSelectedLoadedFishWorker = selectedUnits.some((entity) => entity.kind === 'worker' && entity.economy?.cargo?.kind === 'fish' && (entity.economy.cargo.amount ?? 0) > 0);
      const hasSelectedGuard = selectedUnits.some((entity) => entity.kind === 'guard');
      const hasSelectedAttackBoat = selectedUnits.some((entity) => entity.kind === 'boat' && entity.economy?.combatRole === 'attack');
      const hasSelectedSaboteur = selectedUnits.some((entity) => entity.kind === 'saboteur');
      if (targetEntity && issueResumeConstructionCommand(targetEntity, layers)) {
        return;
      }
      if (targetEntity?.faction === 'player' && issueRepairCommand(targetEntity, layers)) {
        return;
      }
      if (hasSelectedLoadedMetalTruck && targetEntity?.kind === 'factory' && targetEntity.faction === 'player' && issueMetalUnloadCommand(targetEntity, layers)) {
        return;
      }
      if (
        hasSelectedLoadedFishWorker &&
        (targetEntity?.kind === 'factory' || targetEntity?.kind === 'dock') &&
        targetEntity.faction === 'player' &&
        issueWorkerFishUnloadCommand(targetEntity, layers)
      ) {
        return;
      }
      if (targetEntity?.kind === 'factory' && targetEntity.faction === 'player' && hasSelectedWorker) {
        issueAssignFactoryCrewCommand(layers, targetEntity);
        return;
      }
      if (targetEntity?.faction === 'enemy' && (hasSelectedWorker || hasSelectedGuard || hasSelectedAttackBoat) && issueAttackCommand(targetEntity, layers)) {
        renderUnits(layers);
        updateSelectionReadout();
        return;
      }
      if (targetEntity?.faction === 'enemy' && hasSelectedSaboteur && issueSabotageCommand(targetEntity, layers)) {
        return;
      }
      if (targetEntity?.faction === 'enemy' && hasSelectedSaboteur && !hasSelectedGuard && !hasSelectedWorker) {
        setBootStatus(
          'ready',
          targetEntity.renderable.layer === 'buildings'
            ? 'Selected saboteurs could not reach that enemy building.'
            : 'Saboteurs can only target enemy buildings. Select workers or guards to attack enemy land units.',
        );
        playSfx('error');
        publishDebugState(layers);
        return;
      }
      if (targetEntity?.faction === 'enemy' && hasSelectedAttackBoat && !hasSelectedGuard) {
        setBootStatus(
          'ready',
          targetEntity.kind === 'boat'
            ? 'Selected attack boats could not reach that enemy boat.'
            : 'Attack boats can only attack enemy boats on water. Select guards to attack land assets.',
        );
        playSfx('error');
        publishDebugState(layers);
        return;
      }
      if (targetEntity?.faction === 'enemy' && selectedUnits.length > 0) {
        setBootStatus('ready', 'Selected units cannot attack that target. Select workers or guards for land targets, or attack boats for naval targets.');
        playSfx('error');
        publishDebugState(layers);
        return;
      }
      if (targetEntity?.kind === 'dock' && issueDockRepairCommand(targetEntity, layers)) {
        return;
      }
      if (targetEntity?.kind === 'dock' && issueFishUnloadCommand(targetEntity, layers)) {
        return;
      }
      const resourceField = pickResourceFieldAt(point.x, point.y);
      if (resourceField && isWorldExplored(visibilityState, resourceField.x, resourceField.y) && issueHarvestMetalCommand(resourceField, layers)) {
        return;
      }
      const fishingZone = pickFishingZoneAt(point.x, point.y);
      if (fishingZone && isWorldExplored(visibilityState, fishingZone.x, fishingZone.y) && issueFishingCommand(fishingZone, layers)) {
        return;
      }
      issueMoveCommand(point.x, point.y, layers);
      return;
    }

    if (event.button === 1 || pressedKeys.has('Space')) {
      event.preventDefault();
      gameElement.setPointerCapture(event.pointerId);
      dragPan = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
      return;
    }

    if (event.button === 0) {
      const point = screenToWorld(app, event.clientX, event.clientY);
      gameElement.setPointerCapture(event.pointerId);
      selectionDrag = {
        pointerId: event.pointerId,
        startScreenX: event.clientX,
        startScreenY: event.clientY,
        currentScreenX: event.clientX,
        currentScreenY: event.clientY,
        startWorldX: point.x,
        startWorldY: point.y,
        shiftKey: event.shiftKey,
        active: false,
      };
    }
  });
  gameElement.addEventListener('pointerup', (event) => {
    if (pauseMenuOpen) {
      return;
    }
    if (dragPan?.pointerId === event.pointerId) {
      dragPan = null;
      gameElement.releasePointerCapture(event.pointerId);
    }
    if (selectionDrag?.pointerId === event.pointerId) {
      const endWorld = screenToWorld(app, event.clientX, event.clientY);
      if (selectionDrag.active) {
        const rect = {
          id: 'selection-drag',
          x: Math.min(selectionDrag.startWorldX, endWorld.x),
          y: Math.min(selectionDrag.startWorldY, endWorld.y),
          width: Math.abs(endWorld.x - selectionDrag.startWorldX),
          height: Math.abs(endWorld.y - selectionDrag.startWorldY),
        };
        selectEntitiesInRect(rect, layers, selectionDrag.shiftKey);
      } else {
        const clickedEntity = pickEntityAt(endWorld.x, endWorld.y);
        if (clickedEntity) {
          const now = performance.now();
          const isDoubleSelect =
            !selectionDrag.shiftKey &&
            lastSelectionClick !== null &&
            lastSelectionClick.entityId === clickedEntity.id &&
            lastSelectionClick.kind === clickedEntity.kind &&
            lastSelectionClick.faction === clickedEntity.faction &&
            now - lastSelectionClick.atMs <= 350;
          if (isDoubleSelect) {
            selectVisibleEntitiesByKind(clickedEntity, layers, false);
            lastSelectionClick = null;
          } else {
            selectEntity(clickedEntity, layers, selectionDrag.shiftKey);
            lastSelectionClick = {
              entityId: clickedEntity.id,
              kind: clickedEntity.kind,
              faction: clickedEntity.faction,
              atMs: now,
            };
          }
        } else if (!selectionDrag.shiftKey) {
          if (!inspectWorldTargetAt(endWorld.x, endWorld.y, layers)) {
            selectEntity(null, layers, false);
          }
          lastSelectionClick = null;
        } else {
          selectEntity(null, layers, selectionDrag.shiftKey);
          lastSelectionClick = null;
        }
      }
      selectionDrag = null;
      drawSelectionDragOverlay(layers);
      gameElement.releasePointerCapture(event.pointerId);
    }
  });
  gameElement.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoomAt(app, layers, event.clientX, event.clientY, event.deltaY);
    },
    { passive: false },
  );

  window.addEventListener('keydown', (event) => {
    pressedKeys.add(event.code);
    if (event.code === 'F10') {
      event.preventDefault();
      if (!skirmishStarted) {
        syncPauseUi();
        return;
      }
      setPauseMenuOpen(!pauseMenuOpen, layers);
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      if (!skirmishStarted) {
        syncPauseUi();
        return;
      }
      if (pauseMenuOpen) {
        setPauseMenuOpen(false, layers);
        return;
      }
      if (cancelActiveCommandMode(layers)) {
        return;
      }
      setPauseMenuOpen(true, layers);
      return;
    }
    if (pauseMenuOpen) {
      return;
    }
    if ((event.code === 'Delete' || event.code === 'Backspace') && selectedEntityIds.size > 0 && !isEditableKeyboardTarget(event.target)) {
      event.preventDefault();
      issueDeleteSelectedCommand(layers);
      return;
    }
    if (event.code === 'KeyS' && selectedEntityIds.size > 0) {
      event.preventDefault();
      issueStopCommand(layers);
      return;
    }
    if (event.code === 'KeyH') {
      event.preventDefault();
      issueHoldCommand(layers);
      return;
    }
    if (event.code === 'KeyA' && selectedEntityIds.size > 0) {
      event.preventDefault();
      beginAttackMove(layers);
      return;
    }
    if (event.code === 'KeyT' && selectedEntityIds.size > 0) {
      event.preventDefault();
      beginAttackTarget(layers);
      return;
    }
    if (event.code === 'KeyB' || event.code === 'Home') {
      event.preventDefault();
      focusPlayerBase(app, layers);
      return;
    }
    if (event.code === 'KeyF') {
      event.preventDefault();
      focusProductionBuilding('factory', 'factories', app, layers);
      return;
    }
    if (event.code === 'KeyR') {
      event.preventDefault();
      focusProductionBuilding('barracks', 'barracks', app, layers);
      return;
    }
    if (event.code === 'KeyV') {
      event.preventDefault();
      focusProductionBuilding('dock', 'docks', app, layers);
      return;
    }
    if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.code);
  });

  minimapElement.addEventListener('pointerdown', (event) => {
    if (pauseMenuOpen) {
      event.preventDefault();
      return;
    }
    focusGameViewport();
    event.preventDefault();
    if (event.button === 2) {
      const point = minimapEventToWorld(event);
      issueMoveCommand(point.x, point.y, layers);
      renderUnits(layers);
      updateSelectionReadout();
      return;
    }

    minimapDragActive = true;
    minimapElement.setPointerCapture(event.pointerId);
    if (pointInsideMinimapViewport(event, app)) {
      const bounds = minimapElement.getBoundingClientRect();
      const viewportRect = getMinimapViewportRect(minimapElement, mapData, camera, app.screen.width, app.screen.height);
      minimapViewportDragOffset = {
        x: event.clientX - bounds.left - viewportRect.x,
        y: event.clientY - bounds.top - viewportRect.y,
      };
      return;
    }
    minimapViewportDragOffset = null;
    const point = minimapEventToWorld(event);
    centerCameraOn(app, point.x, point.y, layers);
  });
  minimapElement.addEventListener('pointermove', (event) => {
    if (pauseMenuOpen || !minimapDragActive) {
      return;
    }
    if (minimapViewportDragOffset) {
      const bounds = minimapElement.getBoundingClientRect();
      const viewWidth = app.screen.width / camera.zoom;
      const viewHeight = app.screen.height / camera.zoom;
      const localX = event.clientX - bounds.left - minimapViewportDragOffset.x;
      const localY = event.clientY - bounds.top - minimapViewportDragOffset.y;
      camera.x = clamp((localX / bounds.width) * WORLD_WIDTH, 0, Math.max(0, WORLD_WIDTH - viewWidth));
      camera.y = clamp((localY / bounds.height) * WORLD_HEIGHT, 0, Math.max(0, WORLD_HEIGHT - viewHeight));
      applyCamera(app, layers);
      return;
    }
    const point = minimapEventToWorld(event);
    centerCameraOn(app, point.x, point.y, layers);
  });
  minimapElement.addEventListener('pointerup', (event) => {
    minimapDragActive = false;
    minimapViewportDragOffset = null;
    if (minimapElement.hasPointerCapture(event.pointerId)) {
      minimapElement.releasePointerCapture(event.pointerId);
    }
  });
  minimapElement.addEventListener('pointercancel', () => {
    minimapDragActive = false;
    minimapViewportDragOffset = null;
  });
  minimapElement.addEventListener('contextmenu', (event) => event.preventDefault());

  app.ticker.add((ticker) => {
    const deltaSeconds = Math.min(ticker.deltaMS / 1000, 0.05);
    lastFrameMs = ticker.deltaMS;
    frameSamples.push(lastFrameMs);
    if (frameSamples.length > 90) {
      frameSamples.shift();
    }
    let moveX = 0;
    let moveY = 0;

    if (skirmishStarted && !pauseMenuOpen) {
      simulationClockSeconds += deltaSeconds;
      pruneMinimapAttackPings();
      updateTerrainAnimation(layers, simulationClockSeconds);
      updateEntityMovement(deltaSeconds, layers);
      updateMetalHarvesting(deltaSeconds, layers);
      updateProduction(deltaSeconds, layers);
      updateConstruction(deltaSeconds, layers);
      updateFishing(deltaSeconds, layers);
      updateWorkerShoreFishing(deltaSeconds, layers);
      updateFactoryReels(deltaSeconds, layers);
      updateDockBoatRepair(deltaSeconds, layers);
      updateAiRival(deltaSeconds, layers);
      updatePlayerGuardOrders(layers);
      updatePlayerAutoDefense(layers);
      updateGuardTowerDefense(deltaSeconds, layers);
      updatePlayerCombat(deltaSeconds, layers);
      updateSabotage(deltaSeconds, layers);
      updateRepair(deltaSeconds, layers);
      updateDestroyedEntities(deltaSeconds, layers);
      evaluateMatchEnd(layers);
      updateAnimationStates(deltaSeconds, layers);
      updateFogOfWarThrottled(deltaSeconds, layers);
    }

    const scrollSpeedMultiplier = playerSettings.scrollSpeed / 100;
    const keyScrollSpeed = KEY_SCROLL_SPEED * scrollSpeedMultiplier;
    const edgeScrollSpeed = EDGE_SCROLL_SPEED * scrollSpeedMultiplier;

    if (pressedKeys.has('ArrowLeft')) moveX -= keyScrollSpeed;
    if (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD')) moveX += keyScrollSpeed;
    if (pressedKeys.has('ArrowUp') || pressedKeys.has('KeyW')) moveY -= keyScrollSpeed;
    if (pressedKeys.has('ArrowDown')) moveY += keyScrollSpeed;

    if (pointerInViewport && !dragPan && playerSettings.edgeScroll) {
      moveX += edgeScrollX * edgeScrollSpeed;
      moveY += edgeScrollY * edgeScrollSpeed;
    }

    if (moveX !== 0 || moveY !== 0) {
      camera.x += (moveX * deltaSeconds) / camera.zoom;
      camera.y += (moveY * deltaSeconds) / camera.zoom;
      applyCamera(app, layers);
      return;
    }

    renderMinimap(app);
  });
}

export async function createWambasaRtsApp(): Promise<void> {
  try {
    setBootStatus('loading', 'Creating PixiJS renderer...');

    const app = new Application();
    await app.init({ resizeTo: gameElement, backgroundColor: 0x122626, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });

    app.canvas.setAttribute('aria-label', 'Wambåsa Fishing Wars PixiJS game canvas');
    gameElement.appendChild(app.canvas);
    focusGameViewport();

    setBootStatus('loading', 'Loading runtime unit sprite frames...');
    await loadUnitSpriteTextures();
    const layers = createRenderLayers();
    initializeWorldOverlays(layers, mapData);
    renderMap(layers);
    updateFogOfWar(layers);
    app.stage.addChild(layers.world);
    installDebugTestHooks(layers);
    installCameraControls(app, layers);
    workerButtonElement.addEventListener('click', () => issueProduceCommand('worker', layers));
    guardButtonElement.addEventListener('click', () => issueProduceCommand('guard', layers));
    saboteurButtonElement.addEventListener('click', () => issueProduceCommand('saboteur', layers));
    truckButtonElement.addEventListener('click', () => issueProduceCommand('truck', layers));
    boatButtonElement.addEventListener('click', () => issueProduceCommand('boat', layers));
    attackBoatButtonElement.addEventListener('click', () => issueProduceCommand('attackBoat', layers));
    placeHouseButtonElement.addEventListener('click', () => enterPlacementMode('house', layers));
    placeDockButtonElement.addEventListener('click', () => enterPlacementMode('dock', layers));
    placeGuardTowerButtonElement.addEventListener('click', () => enterPlacementMode('guardTower', layers));
    placeTechLabButtonElement.addEventListener('click', () => enterPlacementMode('techLab', layers));
    placeBarracksButtonElement.addEventListener('click', () => enterPlacementMode('barracks', layers));
    placeFactoryButtonElement.addEventListener('click', () => enterPlacementMode('factory', layers));
    assignFactoryCrewButtonElement.addEventListener('click', () => issueAssignFactoryCrewCommand(layers));
    releaseFactoryCrewDecreaseButtonElement.addEventListener('click', () => adjustFactoryCrewReleaseCount(-1));
    releaseFactoryCrewButtonElement.addEventListener('click', () => issueReleaseFactoryCrewCommand(layers));
    releaseFactoryCrewIncreaseButtonElement.addEventListener('click', () => adjustFactoryCrewReleaseCount(1));
    equipReelButtonElement.addEventListener('click', () => issueEquipReelCommand(layers));
    cncUpgradeButtonElement.addEventListener('click', () => issueTechUpgradeCommand('cnc', layers));
    militaryUpgradeButtonElement.addEventListener('click', () => issueTechUpgradeCommand('military', layers));
    boatsUpgradeButtonElement.addEventListener('click', () => issueTechUpgradeCommand('boats', layers));
    reelsUpgradeButtonElement.addEventListener('click', () => issueTechUpgradeCommand('reels', layers));
    stopButtonElement.addEventListener('click', () => issueStopCommand(layers));
    attackButtonElement.addEventListener('click', () => beginAttackTarget(layers));
    holdButtonElement.addEventListener('click', () => issueHoldCommand(layers));
    attackMoveButtonElement.addEventListener('click', () => beginAttackMove(layers));
    sellReelsButtonElement.addEventListener('click', () => issueSellReelsCommand(layers));
    toggleAutoSellButtonElement.addEventListener('click', () => issueToggleAutoSellReels(layers));
    pauseToggleButtonElement.addEventListener('click', () => setPauseMenuOpen(!pauseMenuOpen, layers));
    resumeButtonElement.addEventListener('click', () => setPauseMenuOpen(false, layers));
    musicSliderElement.addEventListener('input', () => updateAudioSetting('music', Number(musicSliderElement.value)));
    sfxSliderElement.addEventListener('input', () => updateAudioSetting('sfx', Number(sfxSliderElement.value)));
    uiScaleSliderElement.addEventListener('input', () => updatePlayerSetting('uiScale', Number(uiScaleSliderElement.value)));
    scrollSpeedSliderElement.addEventListener('input', () => updatePlayerSetting('scrollSpeed', Number(scrollSpeedSliderElement.value)));
    edgeScrollToggleElement.addEventListener('change', () => updatePlayerSetting('edgeScroll', edgeScrollToggleElement.checked));
    difficultySelectElement.addEventListener('change', () => updatePlayerSetting('difficulty', difficultySelectElement.value));
    restartButtonElement.addEventListener('click', () => window.location.reload());
    pauseRestartButtonElement.addEventListener('click', () => window.location.reload());
    pauseMenuOpen = true;
    applyAudioSettings();
    syncPauseUi();

    const resizeObserver = new ResizeObserver(() => applyCamera(app, layers));
    resizeObserver.observe(gameElement);
    document.addEventListener('fullscreenchange', focusGameViewport);
    updateMatchResultPanel();
    updateEconomyReadout();
    applyCamera(app, layers);

    skirmishButton.disabled = false;
    skirmishButton.addEventListener('click', () => {
      void Promise.all([unlockAudio(), requestPlayFullscreen()]).then(() => {
        skirmishStarted = true;
        pauseMenuOpen = false;
        syncPauseUi();
        focusGameViewport();
        setBootStatus(
          'ready',
          audioState.unlocked
            ? 'Skirmish started. Use arrows/WASD, edge scroll, right/middle drag, wheel zoom, minimap drag, and F10 for the menu.'
            : 'Skirmish started. Audio unavailable in this browser; controls and F10 menu are ready.',
        );
        publishDebugState(layers);
      });
    });

    setBootStatus('ready', 'PixiJS RTS foundation ready.');
  } catch (error) {
    console.error('Failed to boot RTS shell.', error);
    setBootStatus('failed', 'Failed to boot RTS shell. Check the console.');
  }
}
