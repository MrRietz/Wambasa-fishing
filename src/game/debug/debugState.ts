import type { CommandResult } from '../commands/commandTypes';
import type { BuildingPlanKind } from '../data/buildings';
import type { TechUpgradeKind } from '../data/upgrades';
import type { ProductionKind } from '../data/production';
import type {
  AnimationAction,
  AnimationDirection,
  AnimationProfile,
  DamageState,
  EntityKind,
  Faction,
  GameEntity,
  MatchState,
  MatchStats,
  PlacementMode,
  ProductionQueueItem,
} from '../entities/components';
import type { CircleData, RectData, ResourceField, ResourceKind } from '../map/mapTypes';
import type { FishingZoneState } from '../map/mapTypes';
import type { RenderPolishState } from '../render/renderPolishState';
import { getRenderPolishState } from '../render/renderPolishState';
import type { PlayerSettings } from '../settings/playerSettings';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';
export type ObjectiveId = 'select' | 'harvest' | 'dock' | 'boat' | 'fish' | 'defense' | 'win';
export type RaidEventKind = 'queued' | 'attacking' | 'damaged' | 'destroyed';

export interface BalanceDebugState {
  playerStartingMetal: number;
  playerStartingCash: number;
  aiStartingMetal: number;
  aiStartingCash: number;
  aiStartDelaySeconds: number;
  aiFirstRaidGraceSeconds: number;
  starterMetalCargo: number;
  firstBoatCashValue: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface RtsDebugState {
  paused: boolean;
  alerts: Array<{ id: number; message: string; severity: AlertSeverity; focusWorld?: { x: number; y: number } }>;
  combatPreview: {
    active: boolean;
    hoveredEntityId?: string;
    hoveredTargetValid: boolean;
    selectedAttackerIds: string[];
    rangeCircleCount: number;
  };
  objectives: {
    currentId?: ObjectiveId;
    items: Array<{ id: ObjectiveId; title: string; description: string; complete: boolean; current: boolean }>;
  };
  camera: CameraState;
  layerLabels: string[];
  overlayLabels: string[];
  selectedEntityIds: string[];
  entities: Array<{
    id: string;
    name: string;
    kind: EntityKind;
    faction: Faction;
    commandable: boolean;
    movementState: string;
    x: number;
    y: number;
    moveTarget?: { x: number; y: number };
    pathLength: number;
    collisionRadius: number;
    animationState: AnimationAction;
    animationDirection: AnimationDirection;
    animationFrame: number;
    animationProfile: AnimationProfile;
    animationFrameCount: number;
    renderPolish: RenderPolishState;
    cargo?: { kind: ResourceKind; amount: number; capacity: number };
    reelEquipped?: boolean;
    combatRole?: 'fishing' | 'attack';
    productionQueue?: ProductionQueueItem[];
    dropOff?: ResourceKind[];
    health?: number;
    damageState?: DamageState;
    harvesting?: { fieldId?: string; phase: 'to-field' | 'loading' | 'returning' | 'manual-returning'; remainingSeconds?: number };
    fishing?: { zoneId: string; phase: 'to-zone' | 'fishing' };
    shoreFishing?: { zoneId: string; phase: 'to-shore' | 'fishing'; catchCooldownSeconds?: number };
    unloadingFish?: { targetId: string; phase: 'to-dock' | 'to-bank' };
    dockRepair?: { dockId: string; phase: 'to-dock' | 'repairing'; repairPerSecond: number; cashPerSecond: number };
    autoFishZoneId?: string;
    factoryDuty?: { factoryId: string; phase: 'to-factory' | 'producing' };
    reelWorkshop?: { reelProgressSeconds: number; reelInventory: number; autoSell: boolean };
    technologyLab?: { levels: Partial<Record<TechUpgradeKind, number>> };
    attack?: {
      targetId: string;
      phase: 'to-target' | 'attacking';
      damagePerSecond: number;
      range: number;
      leash?: { x: number; y: number; range: number };
    };
    guardOrder?: { mode: 'hold' | 'attackMove'; destination?: { x: number; y: number }; acquireRange: number };
    sabotage?: { targetId: string; phase: 'to-target' | 'sabotaging'; disableSeconds: number; range: number };
    repair?: { targetId: string; phase: 'to-target' | 'repairing'; repairPerSecond: number; range: number };
    disabledSeconds?: number;
    destruction?: { phase: 'vanishing' | 'exploding'; remainingSeconds: number; totalSeconds: number };
    construction?: {
      building: BuildingPlanKind;
      progressSeconds: number;
      totalSeconds: number;
      complete: boolean;
      builderId?: string;
      capacityBonus: number;
    };
    buildJob?: { siteId: string; phase: 'to-site' | 'building' };
  }>;
  lastMoveCommand?: { x: number; y: number; entityIds: string[]; pathLength: number };
  lastCommandResult?: CommandResult;
  lastCombatEvent?: {
    attackerId: string;
    targetId: string;
    kind: 'attacking' | 'damaged' | 'destroyed';
    targetHealth?: number;
  };
  lastSabotageEvent?: {
    saboteurId: string;
    targetId: string;
    kind: 'queued' | 'disabled' | 'recovered';
    disabledSeconds?: number;
  };
  lastRepairEvent?: {
    workerId: string;
    targetId: string;
    kind: 'queued' | 'repairing' | 'repaired';
    targetHealth?: number;
  };
  collision: {
    minimumMobileUnitDistance: number;
    mobileUnitCount: number;
  };
  resources: {
    metal: number;
    cash: number;
    fields: Array<{ id: string; amount: number; x: number; y: number; radius: number }>;
  };
  ai: {
    metal: number;
    cash: number;
    baseArea?: RectData & { owner: 'player' | 'enemy' | 'neutral' };
    unitIds: string[];
    commandCenterId?: string;
    lastAction?: string;
    lastProductionEvent?: {
      kind: 'queued' | 'spawned';
      product: ProductionKind;
      entityId?: string;
      stockpile: number;
    };
    lastResourceEvent?: {
      entityId: string;
      kind: 'metalUnloaded' | 'fishSold';
      amount: number;
      metal: number;
      cash: number;
    };
    lastRaidEvent?: {
      kind: RaidEventKind;
      attackerId: string;
      targetId: string;
      targetHealth?: number;
    };
    lastDefenseEvent?: {
      kind: 'responding' | 'towerBuilt';
      defenderId: string;
      threatId: string;
      threatCount: number;
    };
  };
  lastResourceEvent?: {
    entityId: string;
    kind: 'metalLoaded' | 'metalUnloaded' | 'fishLoaded' | 'fishSold';
    amount: number;
    stockpile: number;
    cash?: number;
  };
  lastProductionEvent?: {
    kind: 'queued' | 'spawned';
    product: ProductionKind;
    entityId?: string;
    stockpile: number;
  };
  crew: {
    used: number;
    reserved?: number;
    capacity: number;
  };
  placement?: {
    active: boolean;
    building?: BuildingPlanKind;
    valid?: boolean;
    reason?: string;
    x?: number;
    y?: number;
  };
  match: MatchState & {
    playerProfitTarget: number;
    aiProfitTarget: number;
  };
  stats: MatchStats;
  balance: BalanceDebugState;
  performance: {
    averageFrameMs: number;
    lastFrameMs: number;
    estimatedFps: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  audio: {
    supported: boolean;
    unlocked: boolean;
    musicPlaying: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    uiVolume: number;
    alertsVolume: number;
    musicLayer: 'calm' | 'tension' | 'combat';
    lastCue?: string;
  };
  settings: PlayerSettings;
  map: {
    width: number;
    height: number;
    blockers: number;
    buildable: number;
    metalFields: number;
    fishingZones: number;
    fishingZoneStates: Array<{
      id: string;
      label: string;
      amount: number;
      maxFish: number;
      cashPerFish: number;
      tier: string;
    }>;
  };
}

export interface DebugSnapshotInput {
  paused: boolean;
  alerts: RtsDebugState['alerts'];
  combatPreview: RtsDebugState['combatPreview'];
  objectives: RtsDebugState['objectives'];
  camera: CameraState;
  layerLabels: string[];
  overlayLabels: string[];
  selectedEntityIds: string[];
  entities: GameEntity[];
  lastMoveCommand?: RtsDebugState['lastMoveCommand'];
  lastCommandResult?: CommandResult;
  lastCombatEvent?: RtsDebugState['lastCombatEvent'];
  lastSabotageEvent?: RtsDebugState['lastSabotageEvent'];
  lastRepairEvent?: RtsDebugState['lastRepairEvent'];
  collision: RtsDebugState['collision'];
  metal: number;
  cash: number;
  resourceFields: ResourceField[];
  ai: RtsDebugState['ai'];
  lastResourceEvent?: RtsDebugState['lastResourceEvent'];
  lastProductionEvent?: RtsDebugState['lastProductionEvent'];
  crew: RtsDebugState['crew'];
  placementMode: PlacementMode | null;
  match: RtsDebugState['match'];
  stats: MatchStats;
  balance: BalanceDebugState;
  performance: RtsDebugState['performance'];
  audio: RtsDebugState['audio'];
  settings: PlayerSettings;
  mapData: {
    width: number;
    height: number;
    blockers: unknown[];
    buildable: unknown[];
    metalFields: unknown[];
    fishingZones: FishingZoneState[];
  };
  getCollisionRadius: (entity: GameEntity) => number;
  getAnimationProfile: (entity: GameEntity) => AnimationProfile;
  animationFrameCount: (state: AnimationAction, profile: AnimationProfile, entity: GameEntity) => number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export function createDebugSnapshot(input: DebugSnapshotInput): RtsDebugState {
  return {
    paused: input.paused,
    alerts: input.alerts.map((alert) => ({ ...alert })),
    combatPreview: { ...input.combatPreview, selectedAttackerIds: [...input.combatPreview.selectedAttackerIds] },
    objectives: input.objectives,
    camera: { ...input.camera },
    layerLabels: input.layerLabels,
    overlayLabels: input.overlayLabels,
    selectedEntityIds: [...input.selectedEntityIds],
    entities: input.entities.map((entity) => {
      const animationProfile = input.getAnimationProfile(entity);
      return {
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        faction: entity.faction,
        commandable: entity.commandable,
        movementState: entity.movement.state,
        x: Math.round(entity.x),
        y: Math.round(entity.y),
        moveTarget: entity.moveTarget,
        pathLength: entity.path.length,
        collisionRadius: input.getCollisionRadius(entity),
        animationState: entity.animation.state,
        animationDirection: entity.animation.direction ?? 'south',
        animationFrame: entity.animation.frame,
        animationProfile,
        animationFrameCount: input.animationFrameCount(entity.animation.state, animationProfile, entity),
        renderPolish: getRenderPolishState(entity, input.getDamageState),
        cargo: entity.economy?.cargo,
        reelEquipped: entity.economy?.reelEquipped,
        combatRole: entity.economy?.combatRole,
        productionQueue: entity.economy?.productionQueue,
        dropOff: entity.economy?.dropOff,
        health: entity.economy?.health,
        damageState: input.getDamageState(entity),
        harvesting: entity.economy?.harvesting,
        fishing: entity.economy?.fishing,
        shoreFishing: entity.economy?.shoreFishing,
        unloadingFish: entity.economy?.unloadingFish,
        dockRepair: entity.economy?.dockRepair,
        autoFishZoneId: entity.economy?.autoFishZoneId,
        factoryDuty: entity.economy?.factoryDuty,
        reelWorkshop: entity.economy?.reelWorkshop,
        technologyLab: entity.economy?.technologyLab,
        attack: entity.economy?.attack,
        guardOrder: entity.economy?.guardOrder,
        sabotage: entity.economy?.sabotage,
        repair: entity.economy?.repair,
        disabledSeconds: entity.economy?.disabledSeconds,
        destruction: entity.economy?.destruction,
        construction: entity.economy?.construction,
        buildJob: entity.economy?.buildJob,
      };
    }),
    lastMoveCommand: input.lastMoveCommand,
    lastCommandResult: input.lastCommandResult,
    lastCombatEvent: input.lastCombatEvent,
    lastSabotageEvent: input.lastSabotageEvent,
    lastRepairEvent: input.lastRepairEvent,
    collision: input.collision,
    resources: {
      metal: input.metal,
      cash: input.cash,
      fields: input.resourceFields.map((field) => ({
        id: field.id,
        amount: field.amount,
        x: field.x,
        y: field.y,
        radius: field.radius,
      })),
    },
    ai: input.ai,
    lastResourceEvent: input.lastResourceEvent,
    lastProductionEvent: input.lastProductionEvent,
    crew: input.crew,
    placement: input.placementMode
      ? {
          active: true,
          building: input.placementMode.building,
          valid: input.placementMode.valid,
          reason: input.placementMode.reason,
          x: input.placementMode.x,
          y: input.placementMode.y,
        }
      : { active: false },
    match: input.match,
    stats: { ...input.stats },
    balance: input.balance,
    performance: input.performance,
    audio: { ...input.audio },
    settings: { ...input.settings },
    map: {
      width: input.mapData.width,
      height: input.mapData.height,
      blockers: input.mapData.blockers.length,
      buildable: input.mapData.buildable.length,
      metalFields: input.mapData.metalFields.length,
      fishingZones: input.mapData.fishingZones.length,
      fishingZoneStates: input.mapData.fishingZones.map((zone) => ({
        id: zone.id,
        label: zone.label,
        amount: Math.round(zone.amount),
        maxFish: zone.maxFish,
        cashPerFish: zone.cashPerFish,
        tier: zone.tier,
      })),
    },
  };
}
