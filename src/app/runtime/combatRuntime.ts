import { runAiDefenseController, type AiDefenseState } from '../../game/ai/aiDefenseSystem';
import type { AiControllerState } from '../../game/ai/aiCoordinator';
import type { DamageState, GameEntity } from '../../game/entities/components';
import type { RenderLayers } from '../../game/render/layers';
import {
  updateAutoDefenseSystem,
  updateCombatAttackers,
  updateGuardOrderSystem,
  updateGuardTowerDefenseSystem,
} from '../../game/simulation/systems/combatSystem';

type LastCombatEvent =
  | { kind: 'attacking'; attackerId: string; targetId: string }
  | { kind: 'damaged' | 'destroyed'; attackerId: string; targetId: string; targetHealth: number }
  | undefined;

type PathPoint = { x: number; y: number };

export interface CreateCombatRuntimeOptions {
  entities: GameEntity[];
  aiEconomyState: { metal: number };
  aiController: AiControllerState;
  aiDefenseState: AiDefenseState;
  getNextEnemyGuardTowerId: () => number;
  setNextEnemyGuardTowerId: (value: number) => void;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getCollisionRadius: (entity: GameEntity) => number;
  getAttackApproachPoint: (target: GameEntity, index: number, count: number) => PathPoint;
  getRaidApproachPoint: (target: GameEntity, index: number, count: number) => PathPoint;
  getAiRepeatRaidDelaySeconds: () => number;
  findLandPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  findEntityLandPath?: (entity: GameEntity, start: PathPoint, goal: PathPoint) => PathPoint[];
  findWaterPath: (start: PathPoint, goal: PathPoint) => PathPoint[];
  applyDamage: (target: GameEntity, amount: number) => DamageState | undefined;
  issuePlayerAssetWarning: (target: GameEntity, phase: 'incoming' | 'damaged' | 'destroyed') => void;
  playCombatFireSfx: () => void;
  playCombatHitSfx: () => void;
  setLastCombatEvent: (event: LastCombatEvent) => void;
  renderMap: (layers: RenderLayers) => void;
  renderUnits: (layers: RenderLayers) => void;
  renderBuildings: (layers: RenderLayers) => void;
  drawCombatTargetingOverlay: (layers: RenderLayers) => void;
  drawSelectionOverlay: (layers: RenderLayers) => void;
  drawDestinationOverlay: (layers: RenderLayers) => void;
  updateSelectionReadout: () => void;
  publishDebugState: (layers: RenderLayers) => void;
  guardTowerRange: number;
  guardTowerDamagePerSecond: number;
  findGuardTowerTarget: (tower: GameEntity) => GameEntity | undefined;
  isVisibleToPlayer?: (entity: GameEntity) => boolean;
}

export interface CombatRuntime {
  updateAiRaidActive: (deltaSeconds: number, layers: RenderLayers) => boolean;
  updatePlayerCombat: (deltaSeconds: number, layers: RenderLayers) => boolean;
  updatePlayerGuardOrders: (layers: RenderLayers) => boolean;
  updatePlayerAutoDefense: (layers: RenderLayers) => boolean;
  updateEnemyAutoDefense: (layers: RenderLayers) => boolean;
  issueAiDefenseResponse: (threatId: string, attackedAssetId: string, layers: RenderLayers) => boolean;
  updateGuardTowerDefense: (deltaSeconds: number, layers: RenderLayers) => boolean;
}

export function createCombatRuntime(options: CreateCombatRuntimeOptions): CombatRuntime {
  function updateAiRaidActive(deltaSeconds: number, layers: RenderLayers): boolean {
    const raidAttackers = options.entities.filter(
      (entity) =>
        entity.faction === 'enemy' &&
        entity.economy?.attack &&
        options.entities.some((candidate) => candidate.id === entity.economy?.attack?.targetId && candidate.faction === 'player'),
    );
    const output = updateCombatAttackers({
      attackers: raidAttackers,
      entities: options.entities,
      deltaSeconds,
      getCollisionRadius: options.getCollisionRadius,
      getApproachPoint: options.getRaidApproachPoint,
      findLandPath: options.findLandPath,
      findEntityLandPath: options.findEntityLandPath,
      findWaterPath: options.findWaterPath,
      applyDamage: options.applyDamage,
    });

    for (const event of output.events) {
      if (event.kind === 'raidEnded') {
        options.aiController.lastAction = event.message;
      }
      if (event.kind === 'raidDamaging') {
        options.aiController.lastAction = `Rival raider damaging ${event.targetName}.`;
      }
      if (event.kind === 'attacking' && event.faction === 'player') {
        const target = options.entities.find((entity) => entity.id === event.targetId);
        if (target) {
          options.issuePlayerAssetWarning(target, 'incoming');
        }
      }
      if (event.kind === 'raidDamaging') {
        const target = options.entities.find((entity) => entity.id === event.targetId && entity.faction === 'player');
        if (target) {
          options.issuePlayerAssetWarning(target, 'incoming');
        }
      }
      if ((event.kind === 'damaged' || event.kind === 'destroyed') && event.faction === 'player') {
        const target = options.entities.find((entity) => entity.id === event.targetId);
        if (target) {
          options.issuePlayerAssetWarning(target, event.kind);
        }
      }
      if ((event.kind === 'damaged' || event.kind === 'destroyed') && event.faction === 'enemy') {
        options.aiController.lastRaidEvent = {
          kind: event.kind,
          attackerId: event.attackerId,
          targetId: event.targetId,
          targetHealth: event.targetHealth,
        };
      }
    }

    if (output.changed) {
      options.renderUnits(layers);
      options.updateSelectionReadout();
      options.publishDebugState(layers);
    }
    const hasActiveRaid = options.entities.some(
      (entity) =>
        entity.faction === 'enemy' &&
        Boolean(entity.economy?.attack) &&
        options.entities.some((candidate) => candidate.id === entity.economy?.attack?.targetId && candidate.faction === 'player'),
    );
    if (!hasActiveRaid && options.aiController.raidIssued) {
      options.aiController.raidIssued = false;
      options.aiController.raidDelaySeconds = options.getAiRepeatRaidDelaySeconds();
      options.aiController.lastAction = 'Rival raid regrouping for the next push.';
    }
    return output.changed;
  }

  function updatePlayerCombat(deltaSeconds: number, layers: RenderLayers): boolean {
    const output = updateCombatAttackers({
      attackers: options.entities.filter((entity) => entity.faction === 'player' && entity.economy?.attack),
      entities: options.isVisibleToPlayer ? options.entities.filter((entity) => entity.faction === 'player' || options.isVisibleToPlayer?.(entity)) : options.entities,
      deltaSeconds,
      getCollisionRadius: options.getCollisionRadius,
      getApproachPoint: options.getAttackApproachPoint,
      findLandPath: options.findLandPath,
      findEntityLandPath: options.findEntityLandPath,
      findWaterPath: options.findWaterPath,
      applyDamage: options.applyDamage,
    });
    for (const event of output.events) {
      if (event.kind === 'raidDamaging' || event.kind === 'attacking') {
        if (event.kind === 'attacking') {
          options.playCombatFireSfx();
        } else {
          options.playCombatHitSfx();
        }
      }
      if (event.kind === 'damaged' || event.kind === 'destroyed') {
        options.setLastCombatEvent({
          kind: event.kind,
          attackerId: event.attackerId,
          targetId: event.targetId,
          targetHealth: event.targetHealth,
        });
        issueAiDefenseResponse(event.attackerId, event.targetId, layers);
        options.playCombatHitSfx();
      }
    }

    if (output.changed) {
      options.renderUnits(layers);
      options.renderBuildings(layers);
      options.updateSelectionReadout();
      options.publishDebugState(layers);
    }
    return output.changed;
  }

  function updatePlayerGuardOrders(layers: RenderLayers): boolean {
    const output = updateGuardOrderSystem({
      guards: options.entities.filter((entity) => entity.faction === 'player' && entity.kind === 'guard' && entity.economy?.guardOrder),
      entities: options.entities,
      getDamageState: options.getDamageState,
      getCollisionRadius: options.getCollisionRadius,
    });
    for (const event of output.events) {
      if (event.kind === 'attacking') {
        options.setLastCombatEvent({ kind: 'attacking', attackerId: event.attackerId, targetId: event.targetId });
        options.playCombatFireSfx();
      }
    }
    if (output.changed) {
      options.renderMap(layers);
      options.updateSelectionReadout();
      options.publishDebugState(layers);
    }
    return output.changed;
  }

  function updatePlayerAutoDefense(layers: RenderLayers): boolean {
    const output = updateAutoDefenseSystem({
      units: options.entities.filter(
        (entity) =>
          entity.faction === 'player' &&
          (entity.kind === 'guard' || (entity.kind === 'boat' && entity.economy?.combatRole === 'attack')),
      ),
      entities: options.entities,
      getDamageState: options.getDamageState,
      getCollisionRadius: options.getCollisionRadius,
    });
    for (const event of output.events) {
      if (event.kind === 'attacking') {
        options.setLastCombatEvent({ kind: 'attacking', attackerId: event.attackerId, targetId: event.targetId });
        options.playCombatFireSfx();
      }
    }
    if (output.changed) {
      options.renderUnits(layers);
      options.drawCombatTargetingOverlay(layers);
      options.updateSelectionReadout();
      options.publishDebugState(layers);
    }
    return output.changed;
  }

  function updateEnemyAutoDefense(layers: RenderLayers): boolean {
    const output = updateAutoDefenseSystem({
      units: options.entities.filter(
        (entity) =>
          entity.faction === 'enemy' &&
          (entity.kind === 'guard' || (entity.kind === 'boat' && entity.economy?.combatRole === 'attack')),
      ),
      entities: options.entities,
      getDamageState: options.getDamageState,
      getCollisionRadius: options.getCollisionRadius,
    });
    for (const event of output.events) {
      if (event.kind === 'attacking') {
        options.playCombatFireSfx();
      }
    }
    if (output.changed) {
      options.renderUnits(layers);
      options.publishDebugState(layers);
    }
    return output.changed;
  }

  function issueAiDefenseResponse(threatId: string, attackedAssetId: string, layers: RenderLayers): boolean {
    const output = runAiDefenseController({
      entities: options.entities,
      threatId,
      attackedAssetId,
      availableMetal: options.aiEconomyState.metal,
      state: options.aiDefenseState,
      stockpile: options.aiEconomyState,
      nextTowerId: options.getNextEnemyGuardTowerId(),
      getDamageState: options.getDamageState,
      findLandPath: options.findLandPath,
      findEntityLandPath: options.findEntityLandPath,
      getApproachPoint: options.getRaidApproachPoint,
    });
    options.setNextEnemyGuardTowerId(output.nextTowerId);

    for (const event of output.events) {
      options.aiController.lastDefenseEvent = {
        kind: event.kind,
        defenderId: event.defenderId,
        threatId: event.threatId,
        threatCount: event.threatCount,
      };
      options.aiController.lastAction =
        event.kind === 'towerBuilt' ? 'Rival built a guard tower after repeated raids.' : 'Rival guards responding to attack.';
    }

    if (output.changed) {
      options.renderBuildings(layers);
      options.renderUnits(layers);
      options.drawDestinationOverlay(layers);
      options.publishDebugState(layers);
    }

    return output.changed;
  }

  function updateGuardTowerDefense(deltaSeconds: number, layers: RenderLayers): boolean {
    const towers = options.entities.filter(
      (entity) =>
        entity.kind === 'guardTower' &&
        entity.economy?.construction?.complete &&
        options.getDamageState(entity) !== 'destroyed',
    );

    const output = updateGuardTowerDefenseSystem({
      towers,
      entities: options.entities,
      deltaSeconds,
      range: options.guardTowerRange,
      damagePerSecond: options.guardTowerDamagePerSecond,
      getDamageState: options.getDamageState,
      getCollisionRadius: options.getCollisionRadius,
      findTarget: options.findGuardTowerTarget,
      applyDamage: options.applyDamage,
    });
    for (const event of output.events) {
      if (event.kind === 'attacking') {
        if (event.faction === 'player') {
          options.setLastCombatEvent({ kind: 'attacking', attackerId: event.attackerId, targetId: event.targetId });
        }
        options.playCombatFireSfx();
      }
      if (event.kind === 'damaged' || event.kind === 'destroyed') {
        if (event.faction === 'player') {
          options.setLastCombatEvent({
            kind: event.kind,
            attackerId: event.attackerId,
            targetId: event.targetId,
            targetHealth: event.targetHealth,
          });
          issueAiDefenseResponse(event.attackerId, event.targetId, layers);
        } else {
          const target = options.entities.find((entity) => entity.id === event.targetId && entity.faction === 'player');
          if (target) {
            options.issuePlayerAssetWarning(target, event.kind);
          }
        }
        options.playCombatHitSfx();
      }
    }

    if (output.changed) {
      options.renderBuildings(layers);
      options.renderUnits(layers);
      options.drawSelectionOverlay(layers);
      options.updateSelectionReadout();
      options.publishDebugState(layers);
    }

    return output.changed;
  }

  return {
    updateAiRaidActive,
    updatePlayerCombat,
    updatePlayerGuardOrders,
    updatePlayerAutoDefense,
    updateEnemyAutoDefense,
    issueAiDefenseResponse,
    updateGuardTowerDefense,
  };
}
