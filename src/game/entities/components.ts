import type { TechUpgradeKind } from '../data/upgrades';
import type { BuildingPlanKind } from '../data/buildings';
import type { ProductionKind } from '../data/production';
import type { ResourceKind } from '../map/mapTypes';

export type MatchOutcome = 'running' | 'victory' | 'defeat';
export type DamageState = 'healthy' | 'damaged' | 'critical' | 'destroyed';
export type EntityKind = 'worker' | 'guard' | 'saboteur' | 'truck' | 'boat' | 'factory' | 'dock' | 'enemyFactory' | 'house' | 'guardTower' | 'techLab' | 'barracks';
export type Faction = 'player' | 'enemy' | 'neutral';
export type AnimationAction = 'idle' | 'move' | 'harvest' | 'build' | 'fish' | 'unload' | 'attack' | 'sabotage' | 'repair' | 'damaged' | 'destroyed';
export type CardinalAnimationDirection = 'east' | 'south' | 'west' | 'north';
export type DiagonalAnimationDirection = 'northEast' | 'southEast' | 'southWest' | 'northWest';
export type AnimationDirection = CardinalAnimationDirection | DiagonalAnimationDirection;
export type AnimationProfile = 'humanoid' | 'truck' | 'boat' | 'building';
export type Collider = { kind: 'circle'; radius: number } | { kind: 'rect'; width: number; height: number };
export type RallyPointMode = 'land' | 'water';
export type RallyPointTargetKind = 'metal' | 'fish';

export interface RallyPoint {
  x: number;
  y: number;
  mode: RallyPointMode;
  targetKind?: RallyPointTargetKind;
  targetId?: string;
}

export interface ProductionQueueItem {
  id: string;
  product: ProductionKind;
  remainingSeconds: number;
  totalSeconds: number;
  cost: number;
  cashCost?: number;
}

export interface GameEntity {
  id: string;
  name: string;
  kind: EntityKind;
  faction: Faction;
  x: number;
  y: number;
  rotation: number;
  selectable: true;
  commandable: boolean;
  collider: Collider;
  movement: { speed: number; state: 'idle' | 'moving' | 'building' };
  moveTarget?: { x: number; y: number };
  path: Array<{ x: number; y: number }>;
  economy?: {
    health?: number;
    damageState?: DamageState;
    productionQueue?: ProductionQueueItem[];
    dropOff?: ResourceKind[];
    cargo?: { kind: ResourceKind; amount: number; capacity: number };
    reelEquipped?: boolean;
    combatRole?: 'fishing' | 'attack';
    harvesting?: {
      fieldId?: string;
      phase: 'to-field' | 'loading' | 'returning' | 'manual-returning' | 'return-blocked' | 'field-blocked';
      remainingSeconds?: number;
      retrySeconds?: number;
      lastBlockedReason?: 'factory-route' | 'field-route';
      lastStopReason?: 'manual' | 'field-depleted' | 'invalid-state';
    };
    fishing?: { zoneId: string; phase: 'to-zone' | 'fishing' };
    shoreFishing?: { zoneId: string; phase: 'to-shore' | 'fishing'; catchCooldownSeconds?: number };
    unloadingFish?: { targetId: string; phase: 'to-dock' | 'to-bank' };
    dockRepair?: { dockId: string; phase: 'to-dock' | 'repairing'; repairPerSecond: number; cashPerSecond: number };
    autoFishZoneId?: string;
    rallyPoint?: RallyPoint;
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
    buildQueue?: string[];
  };
  animation: { state: AnimationAction; direction?: AnimationDirection; frame: number; clock?: number };
  renderable: { layer: 'buildings' | 'units'; tint: number; hidden?: boolean };
}

export interface PlacementMode {
  building: BuildingPlanKind;
  x: number;
  y: number;
  valid: boolean;
  reason: string;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface MatchState {
  outcome: MatchOutcome;
  reason: string;
}

export interface MatchStats {
  cashEarned: number;
  fishSold: number;
  metalHarvested: number;
  playerUnitsLost: number;
  playerBuildingsLost: number;
  enemyUnitsDestroyed: number;
  enemyBuildingsDestroyed: number;
}
