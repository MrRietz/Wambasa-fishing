import { FIRST_SKIRMISH_COMBAT_PRESSURE, WORLD_HEIGHT, WORLD_WIDTH } from '../../config/constants';
import { clamp } from '../../core/math';
import type { DamageState, GameEntity } from '../../entities/components';

export type CombatSystemEvent =
  | { kind: 'attacking'; attackerId: string; targetId: string; faction: GameEntity['faction'] }
  | { kind: 'damaged' | 'destroyed'; attackerId: string; targetId: string; targetHealth: number; faction: GameEntity['faction'] }
  | { kind: 'raidEnded'; attackerId: string; message: string }
  | { kind: 'raidDamaging'; attackerId: string; targetId: string; targetName: string };

export interface CombatSystemInput {
  attackers: GameEntity[];
  entities: GameEntity[];
  deltaSeconds: number;
  getCollisionRadius: (entity: GameEntity) => number;
  getApproachPoint: (target: GameEntity, index: number, count: number) => { x: number; y: number };
  findLandPath: (start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
  findEntityLandPath?: (entity: GameEntity, start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
  findWaterPath: (start: { x: number; y: number }, goal: { x: number; y: number }) => Array<{ x: number; y: number }>;
  applyDamage: (target: GameEntity, amount: number) => DamageState | undefined;
}

export interface GuardTowerDefenseInput {
  towers: GameEntity[];
  entities: GameEntity[];
  deltaSeconds: number;
  range: number;
  damagePerSecond: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getCollisionRadius: (entity: GameEntity) => number;
  findTarget: (tower: GameEntity) => GameEntity | undefined;
  applyDamage: (target: GameEntity, amount: number) => DamageState | undefined;
}

export interface CombatSystemOutput {
  changed: boolean;
  events: CombatSystemEvent[];
}

export interface GuardOrderSystemInput {
  guards: GameEntity[];
  entities: GameEntity[];
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getCollisionRadius: (entity: GameEntity) => number;
}

export interface AutoDefenseSystemInput {
  units: GameEntity[];
  entities: GameEntity[];
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getCollisionRadius: (entity: GameEntity) => number;
}

const GUARD_ATTACK_DAMAGE_PER_SECOND = FIRST_SKIRMISH_COMBAT_PRESSURE.guardDamagePerSecond;
const GUARD_LAND_ATTACK_RANGE = FIRST_SKIRMISH_COMBAT_PRESSURE.guardLandAttackRange;
const GUARD_BOAT_ATTACK_RANGE = FIRST_SKIRMISH_COMBAT_PRESSURE.guardBoatAttackRange;
const ATTACK_BOAT_DAMAGE_PER_SECOND = FIRST_SKIRMISH_COMBAT_PRESSURE.attackBoatDamagePerSecond;
const ATTACK_BOAT_RANGE = FIRST_SKIRMISH_COMBAT_PRESSURE.attackBoatRange;
const DEFAULT_GUARD_ENGAGE_RANGE = FIRST_SKIRMISH_COMBAT_PRESSURE.defaultGuardEngageRange;

function getEdgeDistance(attacker: GameEntity, target: GameEntity, getCollisionRadius: (entity: GameEntity) => number): number {
  return Math.max(0, Math.hypot(attacker.x - target.x, attacker.y - target.y) - getCollisionRadius(attacker) - getCollisionRadius(target));
}

export function updateCombatAttackers(input: CombatSystemInput): CombatSystemOutput {
  let changed = false;
  const events: CombatSystemEvent[] = [];

  for (const attacker of input.attackers.filter((entity) => entity.economy?.attack)) {
    const attack = attacker.economy?.attack;
    const target = attack ? input.entities.find((entity) => entity.id === attack.targetId) : undefined;
    if (!attack || !target || (target.economy?.health ?? 0) <= 0) {
      attacker.economy = { ...attacker.economy, attack: undefined };
      events.push({ kind: 'raidEnded', attackerId: attacker.id, message: 'Rival raid ended: target unavailable.' });
      changed = true;
      continue;
    }

    if (
      attack.leash &&
      Math.hypot(attacker.x - attack.leash.x, attacker.y - attack.leash.y) > attack.leash.range
    ) {
      attacker.path = [];
      attacker.moveTarget = undefined;
      attacker.movement.state = 'idle';
      attacker.economy = { ...attacker.economy, attack: undefined };
      changed = true;
      continue;
    }

    const edgeDistance = getEdgeDistance(attacker, target, input.getCollisionRadius);
    if (edgeDistance <= attack.range) {
      if (attack.phase !== 'attacking' || attacker.movement.state !== 'idle' || attacker.moveTarget || attacker.path.length > 0) {
        attacker.path = [];
        attacker.moveTarget = undefined;
        attacker.movement.state = 'idle';
        attacker.economy = { ...attacker.economy, attack: { ...attack, phase: 'attacking' } };
        events.push({ kind: 'attacking', attackerId: attacker.id, targetId: target.id, faction: attacker.faction });
        changed = true;
      }

      const currentHealth = target.economy?.health ?? 0;
      const damageState = input.applyDamage(target, attack.damagePerSecond * input.deltaSeconds);
      const damagedHealth = target.economy?.health ?? 0;
      if (damagedHealth !== currentHealth) {
        events.push({ kind: 'raidDamaging', attackerId: attacker.id, targetId: target.id, targetName: target.name });
        events.push({
          kind: damageState === 'destroyed' ? 'destroyed' : 'damaged',
          attackerId: attacker.id,
          targetId: target.id,
          targetHealth: damagedHealth,
          faction: attacker.faction,
        });
        changed = true;
      }
      continue;
    }

    if (edgeDistance > attack.range) {
      if (attacker.movement.speed <= 0) {
        attacker.economy = { ...attacker.economy, attack: undefined };
        changed = true;
        continue;
      }
      if (attacker.kind === 'boat') {
        const horizontalOffset = attacker.x <= target.x ? -42 : 42;
        const targetPoint = {
          x: clamp(target.x + horizontalOffset, 60, WORLD_WIDTH - 60),
          y: clamp(target.y, 60, WORLD_HEIGHT - 60),
        };
        const path = input.findWaterPath({ x: attacker.x, y: attacker.y }, targetPoint);
        if (path.length > 0) {
          attacker.path = path;
          attacker.moveTarget = path[0];
          attacker.movement.state = 'moving';
          attacker.economy = { ...attacker.economy, attack: { ...attack, phase: 'to-target' } };
        } else {
          attacker.path = [];
          attacker.moveTarget = undefined;
          attacker.movement.state = 'idle';
          attacker.economy = { ...attacker.economy, attack: undefined };
        }
      } else {
        const targetPoint = input.getApproachPoint(target, 0, 1);
        const path = input.findEntityLandPath?.(attacker, { x: attacker.x, y: attacker.y }, targetPoint)
          ?? input.findLandPath({ x: attacker.x, y: attacker.y }, targetPoint);
        if (path.length > 0) {
          attacker.path = path;
          attacker.moveTarget = path[0];
          attacker.movement.state = 'moving';
          attacker.economy = { ...attacker.economy, attack: { ...attack, phase: 'to-target' } };
        } else {
          attacker.path = [];
          attacker.moveTarget = undefined;
          attacker.movement.state = 'idle';
          attacker.economy = { ...attacker.economy, attack: undefined };
        }
      }
      changed = true;
      continue;
    }
  }

  return { changed, events };
}

export function updateGuardTowerDefenseSystem(input: GuardTowerDefenseInput): CombatSystemOutput {
  let changed = false;
  const events: CombatSystemEvent[] = [];

  for (const tower of input.towers.filter((entity) => input.getDamageState(entity) !== 'destroyed')) {
    const currentAttack = tower.economy?.attack;
    const target = resolveTowerTarget(tower, input);
    if (!target) {
      if (currentAttack) {
        tower.economy = { ...tower.economy, attack: undefined };
        changed = true;
      }
      continue;
    }

    if (!currentAttack || currentAttack.targetId !== target.id || currentAttack.phase !== 'attacking') {
      tower.economy = {
        ...tower.economy,
        attack: { targetId: target.id, phase: 'attacking', damagePerSecond: input.damagePerSecond, range: input.range },
      };
      events.push({ kind: 'attacking', attackerId: tower.id, targetId: target.id, faction: tower.faction });
      changed = true;
    }

    const currentHealth = target.economy?.health ?? 0;
    const damageState = input.applyDamage(target, input.damagePerSecond * input.deltaSeconds);
    const damagedHealth = target.economy?.health ?? 0;
    if (damagedHealth !== currentHealth) {
      events.push({
        kind: damageState === 'destroyed' ? 'destroyed' : 'damaged',
        attackerId: tower.id,
        targetId: target.id,
        targetHealth: damagedHealth,
        faction: tower.faction,
      });
      changed = true;
    }
  }

  return { changed, events };
}

export function updateGuardOrderSystem(input: GuardOrderSystemInput): CombatSystemOutput {
  let changed = false;
  const events: CombatSystemEvent[] = [];

  for (const guard of input.guards) {
    const order = guard.economy?.guardOrder;
    if (!order || guard.economy?.attack || input.getDamageState(guard) === 'destroyed') {
      continue;
    }

    const target = input.entities
      .filter((entity) => entity.faction !== guard.faction && entity.faction !== 'neutral' && (entity.economy?.health ?? 0) > 0)
      .filter((entity) => getEdgeDistance(guard, entity, input.getCollisionRadius) <= order.acquireRange)
      .sort((a, b) => getEdgeDistance(guard, a, input.getCollisionRadius) - getEdgeDistance(guard, b, input.getCollisionRadius))[0];

    if (!target) {
      continue;
    }

    const range = target.kind === 'boat' ? GUARD_BOAT_ATTACK_RANGE : GUARD_LAND_ATTACK_RANGE;
    const inWeaponRange = getEdgeDistance(guard, target, input.getCollisionRadius) <= range;
    guard.path = [];
    guard.moveTarget = undefined;
    guard.movement.state = 'idle';
    guard.economy = {
      ...guard.economy,
      attack: {
        targetId: target.id,
        phase: inWeaponRange ? 'attacking' : 'to-target',
        damagePerSecond: GUARD_ATTACK_DAMAGE_PER_SECOND,
        range,
        leash: { x: guard.x, y: guard.y, range: order.acquireRange },
      },
    };
    if (inWeaponRange) {
      events.push({ kind: 'attacking', attackerId: guard.id, targetId: target.id, faction: guard.faction });
    }
    changed = true;
  }

  return { changed, events };
}

export function updateAutoDefenseSystem(input: AutoDefenseSystemInput): CombatSystemOutput {
  let changed = false;
  const events: CombatSystemEvent[] = [];

  for (const unit of input.units) {
    if (unit.economy?.attack || input.getDamageState(unit) === 'destroyed' || unit.movement.state !== 'idle') {
      continue;
    }

    const acquireRange =
      unit.kind === 'guard'
        ? unit.economy?.guardOrder?.acquireRange ?? DEFAULT_GUARD_ENGAGE_RANGE
        : unit.kind === 'boat' && unit.economy?.combatRole === 'attack'
          ? 156
          : 0;
    if (acquireRange <= 0) {
      continue;
    }

    const target = input.entities
      .filter((entity) => entity.faction !== unit.faction && entity.faction !== 'neutral' && (entity.economy?.health ?? 0) > 0)
      .filter((entity) => (unit.kind === 'boat' ? entity.kind === 'boat' : true))
      .filter((entity) => getEdgeDistance(unit, entity, input.getCollisionRadius) <= acquireRange)
      .sort((a, b) => getEdgeDistance(unit, a, input.getCollisionRadius) - getEdgeDistance(unit, b, input.getCollisionRadius))[0];

    if (!target) {
      continue;
    }

    const range = unit.kind === 'boat' ? ATTACK_BOAT_RANGE : target.kind === 'boat' ? GUARD_BOAT_ATTACK_RANGE : GUARD_LAND_ATTACK_RANGE;
    const inWeaponRange = getEdgeDistance(unit, target, input.getCollisionRadius) <= range;
    unit.path = [];
    unit.moveTarget = undefined;
    unit.movement.state = 'idle';
    unit.economy = {
      ...unit.economy,
      attack: {
        targetId: target.id,
        phase: inWeaponRange ? 'attacking' : 'to-target',
        damagePerSecond: unit.kind === 'boat' ? ATTACK_BOAT_DAMAGE_PER_SECOND : GUARD_ATTACK_DAMAGE_PER_SECOND,
        range,
        leash: unit.kind === 'guard' ? { x: unit.x, y: unit.y, range: acquireRange } : undefined,
      },
    };
    if (inWeaponRange) {
      events.push({ kind: 'attacking', attackerId: unit.id, targetId: target.id, faction: unit.faction });
    }
    changed = true;
  }

  return { changed, events };
}

function resolveTowerTarget(tower: GameEntity, input: GuardTowerDefenseInput): GameEntity | undefined {
  const currentAttack = tower.economy?.attack;
  const currentTarget = currentAttack ? input.entities.find((entity) => entity.id === currentAttack.targetId) : undefined;
  if (
    currentTarget &&
    currentAttack &&
    currentTarget.id === currentAttack.targetId &&
    currentTarget.faction !== tower.faction &&
    currentTarget.faction !== 'neutral' &&
    (currentTarget.economy?.health ?? 0) > 0 &&
    getEdgeDistance(tower, currentTarget, input.getCollisionRadius) <= input.range
  ) {
    return currentTarget;
  }
  return input.findTarget(tower);
}
