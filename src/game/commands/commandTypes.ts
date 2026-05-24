import type { BuildingPlanKind } from '../data/buildings';
import type { ProductionKind } from '../data/production';

export type CommandFailureReason =
  | 'no-selection'
  | 'invalid-destination'
  | 'unreachable'
  | 'unsupported-target'
  | 'wrong-unit'
  | 'not-factory-selected'
  | 'unaffordable'
  | 'not-worker-selected'
  | 'invalid-placement'
  | 'no-combat-unit'
  | 'protected-core'
  | 'under-construction'
  | 'already-destroyed';

export type CommandKind = 'move' | 'harvestMetal' | 'metalUnload' | 'fish' | 'attack' | 'sabotage' | 'repair' | 'produce' | 'placement' | 'stop' | 'hold' | 'attackMove' | 'sellBuilding';

export type CommandResult =
  | { ok: true; kind: 'move' | 'harvestMetal' | 'metalUnload'; message: string; pathLength: number }
  | { ok: true; kind: 'fish'; message: string; pathLength: number }
  | { ok: true; kind: 'attack'; message: string; pathLength: number; targetId: string }
  | { ok: true; kind: 'sabotage'; message: string; pathLength: number; targetId: string }
  | { ok: true; kind: 'repair'; message: string; pathLength: number; targetId: string }
  | { ok: true; kind: 'stop' | 'hold'; message: string; unitCount: number }
  | { ok: true; kind: 'attackMove'; message: string; pathLength: number; unitCount: number }
  | { ok: true; kind: 'produce'; message: string; product: ProductionKind }
  | { ok: true; kind: 'placement'; message: string; building: BuildingPlanKind }
  | { ok: true; kind: 'sellBuilding'; message: string; building: BuildingPlanKind; refundMetal: number; refundCash: number }
  | {
      ok: false;
      kind: CommandKind;
      reason: CommandFailureReason;
      message: string;
    };
