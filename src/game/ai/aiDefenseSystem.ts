import { buildingCatalog } from '../data/buildings';
import type { GameEntity } from '../entities/components';
import { executeInstantBuildCommand, type MetalStockpile } from '../commands/commandHandlers';
import { createEnemyGuardTowerEntity } from '../entities/entityFactory';

export interface AiDefenseState {
  threatCount: number;
  defensiveStructureBuilt: boolean;
}

export interface AiDefenseInput {
  entities: GameEntity[];
  threatId: string;
  attackedAssetId: string;
  availableMetal: number;
  state: AiDefenseState;
  getDamageState: (entity: GameEntity) => string | undefined;
  findLandPath: (start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
  findEntityLandPath?: (entity: GameEntity, start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
  getApproachPoint: (target: GameEntity, index: number, count: number) => { x: number; y: number };
  buildDefense: () => GameEntity | undefined;
}

export type AiDefenseEvent =
  | { kind: 'responding'; defenderId: string; threatId: string; attackedAssetId: string; threatCount: number }
  | { kind: 'towerBuilt'; defenderId: string; threatId: string; attackedAssetId: string; threatCount: number };

export interface AiDefenseOutput {
  changed: boolean;
  events: AiDefenseEvent[];
}

export interface AiDefenseControllerInput extends Omit<AiDefenseInput, 'buildDefense'> {
  stockpile: MetalStockpile;
  nextTowerId: number;
}

export interface AiDefenseControllerOutput extends AiDefenseOutput {
  nextTowerId: number;
}

export function runAiDefenseController(input: AiDefenseControllerInput): AiDefenseControllerOutput {
  let nextTowerId = input.nextTowerId;
  const output = updateAiDefenseResponse({
    ...input,
    buildDefense: () => {
      const factory = input.entities.find((entity) => entity.kind === 'enemyFactory' && entity.faction === 'enemy');
      if (!factory || input.getDamageState(factory) === 'destroyed') return undefined;
      const result = executeInstantBuildCommand({
        building: 'guardTower',
        stockpile: input.stockpile,
        createBuilding: () =>
          createEnemyGuardTowerEntity(
            nextTowerId === 1 ? 'enemy-guard-tower' : `enemy-guard-tower-${nextTowerId}`,
            'Rival Guard Tower',
            factory.x - 245,
            factory.y + 5,
          ),
      });
      if (!result.result.ok || !result.building) return undefined;
      nextTowerId += 1;
      input.entities.push(result.building);
      return result.building;
    },
  });
  return { ...output, nextTowerId };
}

export function updateAiDefenseResponse(input: AiDefenseInput): AiDefenseOutput {
  const threat = input.entities.find((entity) => entity.id === input.threatId && input.getDamageState(entity) !== 'destroyed');
  const defendedAsset = input.entities.find((entity) => entity.id === input.attackedAssetId);
  if (!threat) {
    return { changed: false, events: [] };
  }

  input.state.threatCount += 1;
  let changed = false;
  const events: AiDefenseEvent[] = [];
  const defenders = input.entities.filter(
    (entity) =>
      entity.faction === 'enemy' &&
      entity.movement.speed > 0 &&
      !entity.renderable.hidden &&
      !entity.economy?.buildJob &&
      !entity.economy?.factoryDuty &&
      !entity.economy?.harvesting &&
      !entity.economy?.shoreFishing &&
      (entity.kind === 'guard' || entity.kind === 'worker') &&
      input.getDamageState(entity) !== 'destroyed',
  ).sort((a, b) => getDefenderPriority(a) - getDefenderPriority(b));

  for (const guard of defenders.slice(0, 2)) {
    const targetPoint = input.getApproachPoint(threat, 0, 1);
    const path = input.findEntityLandPath?.(guard, { x: guard.x, y: guard.y }, targetPoint)
      ?? input.findLandPath({ x: guard.x, y: guard.y }, targetPoint);
    const fallbackPath = path.length > 0
      ? path
      : input.findEntityLandPath?.(guard, { x: guard.x, y: guard.y }, { x: threat.x, y: threat.y })
        ?? input.findLandPath({ x: guard.x, y: guard.y }, { x: threat.x, y: threat.y });
    if (fallbackPath.length === 0 && Math.hypot(guard.x - threat.x, guard.y - threat.y) > 180) {
      continue;
    }
    guard.path = fallbackPath;
    guard.moveTarget = fallbackPath[0];
    guard.movement.state = fallbackPath.length > 0 ? 'moving' : 'idle';
    guard.economy = {
      ...guard.economy,
      attack: {
        targetId: threat.id,
        phase: fallbackPath.length > 0 ? 'to-target' : 'attacking',
        damagePerSecond: guard.kind === 'guard' ? 24 : 14,
        range: guard.kind === 'guard' ? 110 : 64,
        leash: defendedAsset ? { x: defendedAsset.x, y: defendedAsset.y, range: 220 } : undefined,
      },
    };
    events.push({ kind: 'responding', defenderId: guard.id, threatId: threat.id, attackedAssetId: input.attackedAssetId, threatCount: input.state.threatCount });
    changed = true;
  }

  if (!input.state.defensiveStructureBuilt && input.state.threatCount >= 1 && input.availableMetal >= buildingCatalog.guardTower.cost) {
    const tower = input.buildDefense();
    if (tower) {
      input.state.defensiveStructureBuilt = true;
      events.push({ kind: 'towerBuilt', defenderId: tower.id, threatId: threat.id, attackedAssetId: input.attackedAssetId, threatCount: input.state.threatCount });
      changed = true;
    }
  }

  return { changed, events };
}

function getDefenderPriority(entity: GameEntity): number {
  if (entity.kind === 'guard') return 0;
  return 1;
}
