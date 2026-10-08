import { FIRST_SKIRMISH_COMBAT_PRESSURE } from '../config/constants';
import type { DamageState, EntityKind, GameEntity } from '../entities/components';
import type { AiDifficultyProfile, AiPersonalityProfile } from './aiConfig';
import type { AiTactic } from './aiIntelSystem';
import {
  chooseAiTargetFromMemory,
  estimateDefenseNear,
  findSighting,
  getEntityCombatValue,
  type AiMemoryState,
  type AiSighting,
} from './aiMemory';

/**
 * Wave-based army control for the rival.
 *
 * Land army: gather at a rally point -> launch a wave of N units at a remembered target ->
 * engage only what the squad can see -> retarget from memory or return -> retreat and regroup
 * when losing. Home threats switch to `defend`; once cleared the tactic evaluator can trigger a
 * counter-attack. Attack boats form a fleet that patrols home waters or raids remembered
 * boats/docks for naval personalities.
 */

export type AiArmyMode = 'gather' | 'attack' | 'retreat' | 'defend';

export interface AiArmyObjective {
  x: number;
  y: number;
  targetId?: string;
  kind?: EntityKind;
  label: string;
}

export interface AiArmyState {
  mode: AiArmyMode;
  squadIds: string[];
  objective?: AiArmyObjective;
  launchedAt: number;
  startStrength: number;
  waveCount: number;
  retreatCount: number;
  nextWaveAt: number;
  progressCheckAt: number;
  progressDistance: number;
  lastRetreatReason?: string;
  lastWaveTactic?: AiTactic;
  lastWaveSize: number;
  defendSince: number;
  /** Strongest home threat during the current defense (only real attacks arm a counter-attack). */
  defendPeak?: number;
  defendClearedAt: number;
  /** AI time until which the player base is avoided (wave was repelled there). */
  avoidBaseUntil: number;
  fleetIds: string[];
  fleetMode: 'patrol' | 'raid' | 'return';
  fleetObjective?: AiArmyObjective;
  fleetNextAt: number;
  fleetLaunchedAt: number;
  stalledRecoveries: number;
}

export interface AiArmyEvent {
  kind: 'waveLaunched' | 'retreat' | 'retarget' | 'returned' | 'defend' | 'fleetRaid' | 'fleetReturn';
  message: string;
  targetId?: string;
  attackerId?: string;
}

export interface AiArmyInput {
  state: AiArmyState;
  memory: AiMemoryState;
  now: number;
  entities: GameEntity[];
  entityById: Map<string, GameEntity>;
  personality: AiPersonalityProfile;
  difficulty: AiDifficultyProfile;
  tactic: AiTactic;
  home: { x: number; y: number };
  rally: { x: number; y: number };
  homeThreat?: { strength: number; x: number; y: number; ids: string[] };
  reservedIds: ReadonlySet<string>;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  getMaxHealth: (entity: GameEntity) => number;
  moveLand: (unit: GameEntity, point: { x: number; y: number }) => boolean;
  moveWater: (boat: GameEntity, point: { x: number; y: number }) => boolean;
  waterPointNear: (point: { x: number; y: number }) => { x: number; y: number } | undefined;
  /** True when a land unit can stand within weapon range of the point (e.g. a boat moored at a shore). */
  isLandReachable: (point: { x: number; y: number }) => boolean;
  attack: (unit: GameEntity, target: GameEntity, leash?: { x: number; y: number; range: number }) => boolean;
  /** March on a remembered (not currently visible) target: path to the remembered spot with the attack order set. */
  attackRemembered: (unit: GameEntity, objective: AiArmyObjective) => boolean;
  /** Called when a wave launches against a remembered (possibly not yet visible) target. */
  onWaveLaunched?: (squad: GameEntity[], objective: AiArmyObjective) => void;
}

export interface AiArmyOutput {
  changed: boolean;
  events: AiArmyEvent[];
  readyCount: number;
  armyStrength: number;
  desiredWaveSize: number;
  needsIntel: boolean;
}

const ENGAGE_RANGE = 340;
const ARRIVAL_RADIUS = 260;
const HOME_LEASH = 1150;
const HIT_AND_RUN_WINDOW_SECONDS = 70;
const STALL_SECONDS = 28;

export function createAiArmyState(firstWaveAt: number): AiArmyState {
  return {
    mode: 'gather',
    squadIds: [],
    launchedAt: 0,
    startStrength: 0,
    waveCount: 0,
    retreatCount: 0,
    nextWaveAt: firstWaveAt,
    progressCheckAt: 0,
    progressDistance: Number.POSITIVE_INFINITY,
    lastWaveSize: 0,
    defendSince: -1,
    defendClearedAt: -1e9,
    avoidBaseUntil: 0,
    fleetIds: [],
    fleetMode: 'patrol',
    fleetNextAt: firstWaveAt * 0.6,
    fleetLaunchedAt: 0,
    stalledRecoveries: 0,
  };
}

export function isAiLandMilitary(entity: GameEntity): boolean {
  return entity.faction === 'enemy' && (entity.kind === 'guard' || entity.kind === 'saboteur') && entity.movement.speed > 0;
}

export function isAiAttackBoat(entity: GameEntity): boolean {
  return entity.faction === 'enemy' && entity.kind === 'boat' && entity.economy?.combatRole === 'attack';
}

export function getDesiredWaveSize(personality: AiPersonalityProfile, difficulty: AiDifficultyProfile, waveCount: number, tactic: AiTactic): number {
  const grown = personality.baseWaveSize + personality.waveGrowth * waveCount + difficulty.waveSizeBonus;
  let size = Math.min(personality.maxWaveSize + Math.max(0, difficulty.waveSizeBonus), grown);
  if (tactic === 'probeEconomy' && personality.style === 'hitAndRun') size = Math.min(size, personality.baseWaveSize + 1);
  if (tactic === 'counterAttack') size = Math.min(size, 3);
  return Math.max(2, Math.round(size));
}

/** Target kinds a tactic is allowed to pick from memory, in preference order. */
export function getTacticTargetKinds(tactic: AiTactic, personality: AiPersonalityProfile): EntityKind[] {
  switch (tactic) {
    case 'probeEconomy':
      return ['truck', 'worker', 'boat', 'dock', 'saboteur'];
    case 'harborControl':
      return ['boat', 'dock', 'truck', 'worker'];
    case 'counterMilitary':
      return ['truck', 'worker', 'boat', 'dock', 'guard', 'saboteur'];
    case 'counterAttack':
      return ['guard', 'saboteur', 'truck', 'worker', 'barracks', 'dock', 'factory'];
    case 'allIn':
      return ['factory', 'barracks', 'guardTower', 'dock', 'guard', 'truck', 'worker', 'house', 'techLab', 'boat'];
    case 'baseSiege':
      return mergeKinds(personality.preferredTargets, ['barracks', 'factory', 'guardTower', 'dock', 'house', 'techLab', 'guard', 'truck', 'worker']);
    default:
      return personality.preferredTargets;
  }
}

export function updateAiArmy(input: AiArmyInput): AiArmyOutput {
  const { state, now } = input;
  const events: AiArmyEvent[] = [];
  let changed = false;

  // Prune dead / missing squad members.
  pruneIds(state.squadIds, input);
  pruneIds(state.fleetIds, input);

  const desiredWaveSize = getDesiredWaveSize(input.personality, input.difficulty, state.waveCount, input.tactic);
  let readyCount = 0;
  let armyStrength = 0;
  const homeUnits: GameEntity[] = [];
  for (const entity of input.entities) {
    if (!isAiLandMilitary(entity) || !isAlive(entity, input)) continue;
    armyStrength += unitStrength(entity, input);
    if (input.reservedIds.has(entity.id) || state.squadIds.includes(entity.id)) continue;
    homeUnits.push(entity);
    readyCount += 1;
  }

  // ---- Home defense -------------------------------------------------------------------------
  const threat = input.homeThreat;
  if (threat && threat.strength > 0) {
    if (state.mode !== 'defend') {
      state.defendSince = now;
      state.defendPeak = 0;
      events.push({ kind: 'defend', message: 'Rival pulling units home to defend.' });
    }
    state.defendPeak = Math.max(state.defendPeak ?? 0, threat.strength);
    const recallSquad = state.squadIds.length > 0 && (threat.strength >= 1.5 || distanceToHome(state, input) < 1800);
    if (state.mode === 'attack' && !recallSquad) {
      // Squad keeps pushing; home units defend.
      changed = updateAttackingSquad(input, events) || changed;
    } else {
      state.mode = 'defend';
    }
    const defenders = recallSquad ? homeUnits.concat(resolveIds(state.squadIds, input)) : homeUnits;
    for (const unit of defenders) {
      changed = engageNearestThreat(unit, threat.ids, input, { x: input.home.x, y: input.home.y, range: HOME_LEASH }) || changed;
    }
    if (recallSquad) {
      state.squadIds.length = 0;
      state.objective = undefined;
    }
    changed = updateFleet(input, events) || changed;
    return { changed, events, readyCount, armyStrength, desiredWaveSize, needsIntel: false };
  }
  if (state.mode === 'defend') {
    state.mode = 'gather';
    if ((state.defendPeak ?? 0) >= 1) {
      state.defendClearedAt = now;
    }
    state.defendPeak = 0;
    changed = true;
  }

  // ---- Offensive wave -----------------------------------------------------------------------
  if (state.mode === 'attack') {
    changed = reinforceSquad(input, homeUnits) || changed;
    changed = updateAttackingSquad(input, events) || changed;
  } else if (state.mode === 'retreat') {
    changed = updateRetreatingSquad(input, events) || changed;
  }

  let needsIntel = false;
  if (state.mode === 'gather') {
    // Rally idle units.
    for (const unit of homeUnits) {
      if (unit.economy?.attack) continue;
      if (unit.movement.state === 'idle' && distance(unit, input.rally) > 240) {
        changed = input.moveLand(unit, spreadPoint(input.rally, unit.id, 70)) || changed;
      }
    }
    const offensive = input.tactic !== 'scouting' && input.tactic !== 'defending';
    // Counter-attacks and scouted-weak all-ins ignore the personality wave timer.
    const counterWindow = input.tactic === 'counterAttack' || input.tactic === 'allIn';
    const extraForBuildUp = input.tactic === 'counterMilitary' ? 2 : 0;
    const launchSize = input.tactic === 'allIn' ? Math.max(3, desiredWaveSize - 1) : desiredWaveSize + extraForBuildUp;
    const reserve = input.tactic === 'allIn' || input.tactic === 'counterAttack' ? 0 : input.personality.homeReserve;
    if (offensive && (now >= state.nextWaveAt || counterWindow) && readyCount >= launchSize + reserve) {
      const objective = chooseObjective(input, input.rally);
      if (objective) {
        changed = launchWave(input, homeUnits, objective, events) || changed;
      } else {
        needsIntel = true;
      }
    } else if (readyCount >= launchSize + reserve && !offensive) {
      needsIntel = input.tactic === 'scouting';
    }
  }

  changed = updateFleet(input, events) || changed;
  return { changed, events, readyCount, armyStrength, desiredWaveSize, needsIntel };
}

function launchWave(input: AiArmyInput, homeUnits: GameEntity[], objective: AiArmyObjective, events: AiArmyEvent[]): boolean {
  const { state, now } = input;
  const reserve = input.tactic === 'allIn' || input.tactic === 'counterAttack' ? 0 : input.personality.homeReserve;
  const candidates = homeUnits
    .filter((unit) => !unit.economy?.attack || !isTargetVisible(unit.economy.attack.targetId, input))
    .sort((a, b) => distance(a, objective) - distance(b, objective));
  const squadSize = Math.max(1, candidates.length - reserve);
  const squad = candidates.slice(0, squadSize);
  if (squad.length === 0) {
    return false;
  }
  state.squadIds.length = 0;
  let strength = 0;
  for (const unit of squad) {
    state.squadIds.push(unit.id);
    strength += unitStrength(unit, input);
    const visibleTarget = objective.targetId && isTargetVisible(objective.targetId, input) ? input.entityById.get(objective.targetId) : undefined;
    if (visibleTarget) {
      input.attack(unit, visibleTarget);
    } else if (objective.targetId) {
      input.attackRemembered(unit, { ...objective, ...spreadPoint(objective, unit.id, 60) });
    } else {
      input.moveLand(unit, spreadPoint(objective, unit.id, 60));
    }
  }
  state.mode = 'attack';
  state.objective = objective;
  state.launchedAt = now;
  state.startStrength = strength;
  state.waveCount += 1;
  state.lastWaveSize = squad.length;
  state.lastWaveTactic = input.tactic;
  state.progressCheckAt = now + STALL_SECONDS;
  state.progressDistance = averageDistance(squad, objective);
  input.onWaveLaunched?.(squad, objective);
  events.push({
    kind: 'waveLaunched',
    message: `Rival wave ${state.waveCount} (${squad.length} units, ${input.tactic}) moving on ${objective.label}.`,
    targetId: objective.targetId,
    attackerId: squad[0]?.id,
  });
  return true;
}

/** Assault personalities feed fresh units into a running wave instead of leaving them idle at home. */
function reinforceSquad(input: AiArmyInput, homeUnits: GameEntity[]): boolean {
  const { state } = input;
  if (input.personality.style !== 'assault' && input.tactic !== 'allIn') return false;
  const reserve = input.tactic === 'allIn' ? 0 : input.personality.homeReserve;
  const available = homeUnits.filter((unit) => !unit.economy?.attack);
  const spare = available.length - reserve;
  const cap = Math.round(input.personality.maxWaveSize * 1.5);
  if (spare < 2 || state.squadIds.length >= cap || !state.objective) return false;
  let changed = false;
  for (const unit of available.slice(0, Math.min(spare, cap - state.squadIds.length))) {
    state.squadIds.push(unit.id);
    state.startStrength += unitStrength(unit, input);
    if (state.objective.targetId) {
      changed = input.attackRemembered(unit, { ...state.objective, ...spreadPoint(state.objective, unit.id, 60) }) || changed;
    } else {
      changed = input.moveLand(unit, spreadPoint(state.objective, unit.id, 60)) || changed;
    }
  }
  return changed;
}

function updateAttackingSquad(input: AiArmyInput, events: AiArmyEvent[]): boolean {
  const { state, now } = input;
  const squad = resolveIds(state.squadIds, input);
  if (squad.length === 0) {
    return beginRetreat(input, events, 'squad lost');
  }
  let changed = false;
  let strength = 0;
  let cx = 0;
  let cy = 0;
  for (const unit of squad) {
    strength += unitStrength(unit, input);
    cx += unit.x;
    cy += unit.y;
  }
  cx /= squad.length;
  cy /= squad.length;

  // Retreat checks: heavy losses, visible superior force, hit-and-run window.
  if (strength < state.startStrength * input.difficulty.retreatStrengthRatio) {
    noteAvoidBase(input, cx, cy);
    return beginRetreat(input, events, 'heavy losses');
  }
  const hostile = visibleHostileStrengthNear(input, cx, cy, 620);
  const outmatchedRatio = input.personality.style === 'hitAndRun' ? 0.95 : 1.45;
  if (hostile > 0.5 && hostile > strength * outmatchedRatio) {
    noteAvoidBase(input, cx, cy);
    return beginRetreat(input, events, 'outmatched by visible defenders');
  }
  if (input.personality.style === 'hitAndRun' && now - state.launchedAt > HIT_AND_RUN_WINDOW_SECONDS && hostile > 0) {
    return beginRetreat(input, events, 'hit-and-run window over');
  }

  // Engage what the squad can see; otherwise keep marching on the objective.
  const objective = state.objective;
  let engaged = 0;
  for (const unit of squad) {
    const attack = unit.economy?.attack;
    if (attack && isTargetVisible(attack.targetId, input)) {
      engaged += 1;
      continue;
    }
    if (attack && objective && attack.targetId === objective.targetId && unit.movement.state === 'moving') {
      // Still marching on the remembered objective spot.
      continue;
    }
    if (attack) {
      // Target left vision: drop it instead of tracking live positions through fog.
      clearAttack(unit);
      changed = true;
    }
    const target = findVisibleTargetNear(unit, input, ENGAGE_RANGE);
    if (target) {
      changed = input.attack(unit, target) || changed;
      engaged += 1;
      continue;
    }
    if (objective && unit.movement.state === 'idle' && distance(unit, objective) > 120) {
      changed = input.moveLand(unit, spreadPoint(objective, unit.id, 60)) || changed;
    }
  }

  if (!objective) {
    return beginRetreat(input, events, 'no objective') || changed;
  }

  // Objective handling: once close and the remembered target is gone, retarget or return.
  const objectiveDistance = Math.hypot(cx - objective.x, cy - objective.y);
  const objectiveAlive = objective.targetId ? findSighting(input.memory, objective.targetId) : undefined;
  if (objectiveDistance <= ARRIVAL_RADIUS * 1.6 && engaged === 0 && !objectiveAlive) {
    const next = chooseObjective(input, { x: cx, y: cy }, 1700);
    if (next) {
      state.objective = next;
      state.progressDistance = Math.hypot(cx - next.x, cy - next.y);
      state.progressCheckAt = now + STALL_SECONDS;
      events.push({ kind: 'retarget', message: `Rival wave retargeting ${next.label}.`, targetId: next.targetId });
      for (const unit of squad) {
        if (!unit.economy?.attack) input.moveLand(unit, spreadPoint(next, unit.id, 60));
      }
      return true;
    }
    return beginRetreat(input, events, 'objective cleared', true) || changed;
  }
  if (objective.targetId && !objectiveAlive && engaged === 0) {
    // Remembered target forgotten (decayed/cleared) before arrival: pick another or keep moving to the spot.
    const next = chooseObjective(input, { x: cx, y: cy }, 2400);
    if (next && next.targetId !== objective.targetId) {
      state.objective = next;
      events.push({ kind: 'retarget', message: `Rival wave retargeting ${next.label}.`, targetId: next.targetId });
      changed = true;
    } else {
      objective.targetId = undefined;
    }
  } else if (objectiveAlive && !isTargetVisible(objectiveAlive.id, input)) {
    // Follow the latest remembered position (memory refreshes only when seen).
    objective.x = objectiveAlive.x;
    objective.y = objectiveAlive.y;
  }

  // Progress watchdog: no approach and no fighting for a while -> regroup.
  if (now >= state.progressCheckAt) {
    if (engaged === 0 && objectiveDistance > state.progressDistance - 60) {
      state.stalledRecoveries += 1;
      return beginRetreat(input, events, 'stalled, regrouping') || changed;
    }
    state.progressDistance = objectiveDistance;
    state.progressCheckAt = now + STALL_SECONDS;
  }
  return changed;
}

function updateRetreatingSquad(input: AiArmyInput, events: AiArmyEvent[]): boolean {
  const { state, now } = input;
  const squad = resolveIds(state.squadIds, input);
  let changed = false;
  let home = 0;
  for (const unit of squad) {
    if (unit.economy?.attack) {
      clearAttack(unit);
      changed = true;
    }
    if (distance(unit, input.rally) <= 320) {
      home += 1;
    } else if (unit.movement.state === 'idle') {
      changed = input.moveLand(unit, spreadPoint(input.rally, unit.id, 70)) || changed;
    }
  }
  if (squad.length === 0 || home >= squad.length || now - state.launchedAt > 150) {
    state.squadIds.length = 0;
    state.mode = 'gather';
    state.objective = undefined;
    events.push({ kind: 'returned', message: 'Rival wave regrouped at rally point.' });
    return true;
  }
  return changed;
}

function beginRetreat(input: AiArmyInput, events: AiArmyEvent[], reason: string, success = false): boolean {
  const { state, now } = input;
  state.mode = 'retreat';
  state.lastRetreatReason = reason;
  if (!success) state.retreatCount += 1;
  state.launchedAt = now;
  state.nextWaveAt = now + input.difficulty.waveCooldownSeconds * (success ? 0.6 : 1);
  for (const unit of resolveIds(state.squadIds, input)) {
    clearAttack(unit);
    input.moveLand(unit, spreadPoint(input.rally, unit.id, 70));
  }
  events.push({ kind: 'retreat', message: `Rival wave pulling back: ${reason}.` });
  return true;
}

function noteAvoidBase(input: AiArmyInput, x: number, y: number): void {
  // If the fight happened near remembered player structures, avoid the base for a while.
  if (estimateDefenseNear(input.memory, x, y, 700, input.now) >= 2) {
    input.state.avoidBaseUntil = input.now + 120;
  }
}

function chooseObjective(input: AiArmyInput, origin: { x: number; y: number }, maxDistance?: number): AiArmyObjective | undefined {
  const kinds = getTacticTargetKinds(input.tactic, input.personality);
  const avoidingBase = input.now < input.state.avoidBaseUntil;
  const maxDefense = input.tactic === 'allIn' ? undefined
    : input.tactic === 'counterMilitary' || avoidingBase ? 1.5
      : input.personality.style === 'hitAndRun' ? 2.5 : undefined;
  const sighting = chooseAiTargetFromMemory({
    memory: input.memory,
    now: input.now,
    origin,
    preferredKinds: kinds,
    maxDefense,
    accept: (candidate) =>
      (maxDistance === undefined || Math.hypot(candidate.x - origin.x, candidate.y - origin.y) <= maxDistance) &&
      // Land squads cannot reach boats far out at sea; those are left to the fleet.
      (candidate.kind !== 'boat' || input.isLandReachable(candidate)),
  });
  return sighting ? toObjective(sighting) : undefined;
}

function updateFleet(input: AiArmyInput, events: AiArmyEvent[]): boolean {
  const { state, now } = input;
  let changed = false;
  const fleet: GameEntity[] = [];
  for (const entity of input.entities) {
    if (!isAiAttackBoat(entity) || !isAlive(entity, input) || input.reservedIds.has(entity.id)) continue;
    fleet.push(entity);
  }
  if (fleet.length === 0) {
    state.fleetIds.length = 0;
    return false;
  }

  // Engage visible boats near any fleet boat (auto-defense only covers idle boats in short range).
  for (const boat of fleet) {
    const attack = boat.economy?.attack;
    if (attack && !isTargetVisible(attack.targetId, input)) {
      clearAttack(boat);
      changed = true;
    }
  }

  const raidMinimum = input.personality.navalRaids ? 2 : 3;
  const wantsRaid = input.tactic === 'harborControl' || input.tactic === 'allIn' || (input.personality.navalRaids && input.tactic !== 'defending');
  if (state.fleetMode === 'patrol') {
    if (wantsRaid && now >= state.fleetNextAt && fleet.length >= raidMinimum) {
      const target = chooseAiTargetFromMemory({
        memory: input.memory,
        now,
        origin: fleet[0],
        preferredKinds: ['boat', 'dock'],
        accept: (candidate) => input.waterPointNear(candidate) !== undefined,
      });
      const waterPoint = target ? input.waterPointNear(target) : undefined;
      if (target && waterPoint) {
        state.fleetMode = 'raid';
        state.fleetObjective = { x: waterPoint.x, y: waterPoint.y, targetId: target.id, kind: target.kind, label: describeSighting(target) };
        state.fleetLaunchedAt = now;
        state.fleetIds.length = 0;
        for (const boat of fleet) {
          state.fleetIds.push(boat.id);
          input.moveWater(boat, waterPoint);
        }
        events.push({ kind: 'fleetRaid', message: `Rival attack boats raiding ${state.fleetObjective.label}.`, targetId: target.id, attackerId: fleet[0].id });
        return true;
      }
    }
    // Patrol: stay near home waters; engage boats seen nearby.
    for (const boat of fleet) {
      if (boat.economy?.attack || boat.economy?.dockRepair) continue;
      const target = findVisibleTargetNear(boat, input, 320, (entity) => entity.kind === 'boat' || entity.kind === 'dock');
      if (target) {
        changed = input.attack(boat, target) || changed;
      }
    }
    return changed;
  }

  // Raid / return modes.
  const raiders = resolveIds(state.fleetIds, input);
  if (raiders.length === 0) {
    state.fleetMode = 'patrol';
    state.fleetNextAt = now + input.difficulty.waveCooldownSeconds;
    return true;
  }
  let totalHealth = 0;
  for (const boat of raiders) totalHealth += healthRatio(boat, input);
  const objective = state.fleetObjective;
  const timedOut = now - state.fleetLaunchedAt > 110;
  if (state.fleetMode === 'raid' && (totalHealth / raiders.length < 0.45 || timedOut || !objective)) {
    state.fleetMode = 'return';
    events.push({ kind: 'fleetReturn', message: 'Rival attack boats returning to port.' });
    const homeWater = input.waterPointNear(input.home);
    for (const boat of raiders) {
      clearAttack(boat);
      if (homeWater) input.moveWater(boat, homeWater);
    }
    return true;
  }
  if (state.fleetMode === 'return') {
    let arrived = 0;
    for (const boat of raiders) if (boat.movement.state === 'idle') arrived += 1;
    if (arrived === raiders.length || now - state.fleetLaunchedAt > 200) {
      state.fleetMode = 'patrol';
      state.fleetIds.length = 0;
      state.fleetNextAt = now + input.difficulty.waveCooldownSeconds;
      return true;
    }
    return false;
  }
  if (!objective) return changed;
  let engaged = 0;
  for (const boat of raiders) {
    if (boat.economy?.attack) {
      engaged += 1;
      continue;
    }
    const target = findVisibleTargetNear(boat, input, 380, (entity) => entity.kind === 'boat' || entity.kind === 'dock');
    if (target) {
      changed = input.attack(boat, target) || changed;
      engaged += 1;
    } else if (boat.movement.state === 'idle' && distance(boat, objective) > 160) {
      changed = input.moveWater(boat, objective) || changed;
    }
  }
  if (engaged === 0 && averageDistance(raiders, objective) < 220) {
    const next = chooseAiTargetFromMemory({
      memory: input.memory,
      now,
      origin: objective,
      preferredKinds: ['boat', 'dock'],
      accept: (candidate) => candidate.id !== objective.targetId && input.waterPointNear(candidate) !== undefined,
    });
    const waterPoint = next ? input.waterPointNear(next) : undefined;
    if (next && waterPoint && findSighting(input.memory, objective.targetId ?? '') === undefined) {
      state.fleetObjective = { x: waterPoint.x, y: waterPoint.y, targetId: next.id, kind: next.kind, label: describeSighting(next) };
      for (const boat of raiders) input.moveWater(boat, waterPoint);
      return true;
    }
    if (!findSighting(input.memory, objective.targetId ?? '')) {
      state.fleetLaunchedAt = now - 200; // force return on next pass
    }
  }
  return changed;
}

function engageNearestThreat(
  unit: GameEntity,
  threatIds: string[],
  input: AiArmyInput,
  leash: { x: number; y: number; range: number },
): boolean {
  const attack = unit.economy?.attack;
  if (attack && threatIds.includes(attack.targetId)) {
    return false;
  }
  let best: GameEntity | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const id of threatIds) {
    const target = input.entityById.get(id);
    if (!target || !isAlive(target, input)) continue;
    const d = distance(unit, target);
    if (d < bestDistance) {
      bestDistance = d;
      best = target;
    }
  }
  if (!best || bestDistance > 2200) {
    return false;
  }
  return input.attack(unit, best, leash);
}

function findVisibleTargetNear(
  unit: GameEntity,
  input: AiArmyInput,
  range: number,
  filter?: (entity: GameEntity) => boolean,
): GameEntity | undefined {
  const preferred = getTacticTargetKinds(input.tactic, input.personality);
  let best: GameEntity | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const id of input.memory.visibleNow) {
    const target = input.entityById.get(id);
    if (!target || !isAlive(target, input) || target.faction !== 'player') continue;
    if (filter && !filter(target)) continue;
    if (unit.kind !== 'boat' && target.kind === 'boat' && !input.isLandReachable(target)) continue;
    const d = distance(unit, target);
    if (d > range) continue;
    // Shoot back at nearby military first, then preferred kinds, then nearest.
    const threatBonus = getEntityCombatValue(target) > 0 && target.kind !== 'worker' && target.kind !== 'truck' && d < 260 ? -900 : 0;
    const rank = preferred.indexOf(target.kind);
    const score = threatBonus + (rank < 0 ? 9 : rank) * 120 + d;
    if (score < bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

function visibleHostileStrengthNear(input: AiArmyInput, x: number, y: number, radius: number): number {
  let strength = 0;
  for (const id of input.memory.visibleNow) {
    const target = input.entityById.get(id);
    if (!target || !isAlive(target, input)) continue;
    if (Math.hypot(target.x - x, target.y - y) > radius) continue;
    if (target.kind === 'worker' || target.kind === 'truck') continue;
    strength += getEntityCombatValue(target) * healthRatio(target, input);
  }
  return strength;
}

function isTargetVisible(targetId: string, input: AiArmyInput): boolean {
  return input.memory.visibleNow.includes(targetId);
}

function clearAttack(unit: GameEntity): void {
  unit.path = [];
  unit.moveTarget = undefined;
  unit.movement.state = 'idle';
  unit.economy = { ...unit.economy, attack: undefined };
}

function pruneIds(ids: string[], input: AiArmyInput): void {
  for (let index = ids.length - 1; index >= 0; index -= 1) {
    const entity = input.entityById.get(ids[index]);
    if (!entity || !isAlive(entity, input)) {
      ids.splice(index, 1);
    }
  }
}

function resolveIds(ids: string[], input: AiArmyInput): GameEntity[] {
  const result: GameEntity[] = [];
  for (const id of ids) {
    const entity = input.entityById.get(id);
    if (entity && isAlive(entity, input)) result.push(entity);
  }
  return result;
}

function isAlive(entity: GameEntity, input: Pick<AiArmyInput, 'getDamageState'>): boolean {
  return input.getDamageState(entity) !== 'destroyed' && (entity.economy?.health ?? 1) > 0;
}

function unitStrength(unit: GameEntity, input: AiArmyInput): number {
  return getEntityCombatValue(unit) * healthRatio(unit, input);
}

function healthRatio(unit: GameEntity, input: Pick<AiArmyInput, 'getMaxHealth'>): number {
  const max = input.getMaxHealth(unit);
  return max > 0 ? Math.max(0, Math.min(1, (unit.economy?.health ?? max) / max)) : 1;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function averageDistance(units: GameEntity[], point: { x: number; y: number }): number {
  if (units.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const unit of units) total += distance(unit, point);
  return total / units.length;
}

function distanceToHome(state: AiArmyState, input: AiArmyInput): number {
  const squad = resolveIds(state.squadIds, input);
  return squad.length > 0 ? averageDistance(squad, input.home) : 0;
}

function spreadPoint(center: { x: number; y: number }, id: string, radius: number): { x: number; y: number } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) | 0;
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

function toObjective(sighting: AiSighting): AiArmyObjective {
  return { x: sighting.x, y: sighting.y, targetId: sighting.id, kind: sighting.kind, label: describeSighting(sighting) };
}

function describeSighting(sighting: Pick<AiSighting, 'kind' | 'id'>): string {
  return `${sighting.kind} ${sighting.id}`;
}

function mergeKinds(first: EntityKind[], second: EntityKind[]): EntityKind[] {
  const result = [...first];
  for (const kind of second) if (!result.includes(kind)) result.push(kind);
  return result;
}

export function getAiRaidDamage(unit: GameEntity): { damagePerSecond: number; range: number } {
  if (unit.kind === 'boat') {
    return { damagePerSecond: FIRST_SKIRMISH_COMBAT_PRESSURE.attackBoatDamagePerSecond, range: FIRST_SKIRMISH_COMBAT_PRESSURE.attackBoatRange };
  }
  if (unit.kind === 'guard') {
    return { damagePerSecond: FIRST_SKIRMISH_COMBAT_PRESSURE.enemyRaidGuardDamagePerSecond, range: FIRST_SKIRMISH_COMBAT_PRESSURE.enemyRaidGuardAttackRange };
  }
  return { damagePerSecond: FIRST_SKIRMISH_COMBAT_PRESSURE.enemyRaidWorkerDamagePerSecond, range: FIRST_SKIRMISH_COMBAT_PRESSURE.enemyRaidWorkerAttackRange };
}
