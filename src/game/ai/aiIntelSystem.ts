import type { DamageState, GameEntity } from '../entities/components';

export type AiTactic = 'probeEconomy' | 'harborControl' | 'baseSiege' | 'counterMilitary';

export interface AiObservedPlayerState {
  workers: number;
  trucks: number;
  boats: number;
  attackBoats: number;
  guards: number;
  guardTowers: number;
  docks: number;
  barracks: number;
  factories: number;
  lastSeenSeconds: number;
}

export interface AiScoutState {
  scoutId?: string;
  targetId?: string;
  cooldownSeconds: number;
  reportCooldownSeconds: number;
}

export interface AiIntelState {
  tactic: AiTactic;
  tacticReason: string;
  tacticCooldownSeconds: number;
  observed: AiObservedPlayerState;
  scout: AiScoutState;
  lastScoutReport?: string;
}

export interface AiScoutScanInput {
  entities: GameEntity[];
  scout: GameEntity;
  deltaSeconds: number;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
}

export interface AiScoutScanOutput {
  observed: AiObservedPlayerState;
  report?: string;
}

export interface AiTacticUpdateInput {
  intel: AiIntelState;
  openingStrategy: 'economicBoom' | 'harborPressure' | 'siege';
  force?: boolean;
}

export function createAiIntelState(openingStrategy: 'economicBoom' | 'harborPressure' | 'siege'): AiIntelState {
  return {
    tactic: getFallbackTactic(openingStrategy),
    tacticReason: 'opening read',
    tacticCooldownSeconds: 0,
    observed: createEmptyObservedState(),
    scout: {
      cooldownSeconds: 6,
      reportCooldownSeconds: 0,
    },
  };
}

export function ensureAiIntelState(
  intel: AiIntelState | undefined,
  openingStrategy: 'economicBoom' | 'harborPressure' | 'siege',
): AiIntelState {
  if (intel) {
    return intel;
  }
  return createAiIntelState(openingStrategy);
}

export function updateScoutTimers(intel: AiIntelState, deltaSeconds: number): void {
  intel.scout.cooldownSeconds = Math.max(0, intel.scout.cooldownSeconds - deltaSeconds);
  intel.scout.reportCooldownSeconds = Math.max(0, intel.scout.reportCooldownSeconds - deltaSeconds);
  intel.tacticCooldownSeconds = Math.max(0, intel.tacticCooldownSeconds - deltaSeconds);
  if (intel.observed.lastSeenSeconds < Number.POSITIVE_INFINITY) {
    intel.observed.lastSeenSeconds += deltaSeconds;
  }
}

export function scanPlayerIntel(input: AiScoutScanInput): AiScoutScanOutput | undefined {
  const visiblePlayers = input.entities.filter(
    (entity) =>
      entity.faction === 'player' &&
      input.getDamageState(entity) !== 'destroyed' &&
      !entity.renderable.hidden &&
      Math.hypot(entity.x - input.scout.x, entity.y - input.scout.y) <= getScoutSightRange(input.scout),
  );
  if (visiblePlayers.length === 0) {
    return undefined;
  }

  const observed = createEmptyObservedState();
  observed.lastSeenSeconds = 0;
  for (const entity of visiblePlayers) {
    if (entity.kind === 'worker') observed.workers += 1;
    if (entity.kind === 'truck') observed.trucks += 1;
    if (entity.kind === 'boat' && entity.economy?.combatRole === 'attack') observed.attackBoats += 1;
    if (entity.kind === 'boat' && entity.economy?.combatRole !== 'attack') observed.boats += 1;
    if (entity.kind === 'guard' || entity.kind === 'saboteur') observed.guards += 1;
    if (entity.kind === 'guardTower') observed.guardTowers += 1;
    if (entity.kind === 'dock') observed.docks += 1;
    if (entity.kind === 'barracks') observed.barracks += 1;
    if (entity.kind === 'factory') observed.factories += 1;
  }

  const parts = [
    observed.trucks > 0 ? `${observed.trucks} truck${observed.trucks === 1 ? '' : 's'}` : '',
    observed.docks > 0 || observed.boats > 0 || observed.attackBoats > 0
      ? `${observed.docks} dock / ${observed.boats + observed.attackBoats} boat${observed.boats + observed.attackBoats === 1 ? '' : 's'}`
      : '',
    observed.guards + observed.guardTowers > 0 ? `${observed.guards + observed.guardTowers} defense${observed.guards + observed.guardTowers === 1 ? '' : 's'}` : '',
    observed.barracks > 0 ? 'barracks' : '',
  ].filter(Boolean);

  return {
    observed,
    report: parts.length > 0 ? `Rival scout reports ${parts.join(', ')}.` : 'Rival scout found your base.',
  };
}

export function mergeObservedPlayerState(target: AiObservedPlayerState, source: AiObservedPlayerState): void {
  target.workers = Math.max(target.workers, source.workers);
  target.trucks = Math.max(target.trucks, source.trucks);
  target.boats = Math.max(target.boats, source.boats);
  target.attackBoats = Math.max(target.attackBoats, source.attackBoats);
  target.guards = Math.max(target.guards, source.guards);
  target.guardTowers = Math.max(target.guardTowers, source.guardTowers);
  target.docks = Math.max(target.docks, source.docks);
  target.barracks = Math.max(target.barracks, source.barracks);
  target.factories = Math.max(target.factories, source.factories);
  target.lastSeenSeconds = Math.min(target.lastSeenSeconds, source.lastSeenSeconds);
}

export function updateAdaptiveTactic(input: AiTacticUpdateInput): boolean {
  if (!input.force && input.intel.tacticCooldownSeconds > 0) {
    return false;
  }

  const next = chooseAdaptiveTactic(input.intel.observed, input.openingStrategy);
  if (next.tactic === input.intel.tactic && next.reason === input.intel.tacticReason) {
    input.intel.tacticCooldownSeconds = 6;
    return false;
  }

  input.intel.tactic = next.tactic;
  input.intel.tacticReason = next.reason;
  input.intel.tacticCooldownSeconds = 14;
  return true;
}

export function getAiTacticLabel(tactic: AiTactic): string {
  switch (tactic) {
    case 'probeEconomy':
      return 'economy probe';
    case 'harborControl':
      return 'harbor control';
    case 'counterMilitary':
      return 'counter military';
    case 'baseSiege':
    default:
      return 'base siege';
  }
}

export function chooseScoutTarget(entities: GameEntity[], getDamageState: (entity: GameEntity) => DamageState | undefined): GameEntity | undefined {
  const priority: Array<GameEntity['kind']> = ['dock', 'factory', 'truck', 'barracks', 'guardTower', 'boat', 'worker'];
  for (const kind of priority) {
    const target = entities.find((entity) => entity.faction === 'player' && entity.kind === kind && getDamageState(entity) !== 'destroyed');
    if (target) {
      return target;
    }
  }
  return undefined;
}

export function chooseScoutUnit(entities: GameEntity[], getDamageState: (entity: GameEntity) => DamageState | undefined): GameEntity | undefined {
  const candidates = entities.filter(
    (entity) =>
      entity.faction === 'enemy' &&
      getDamageState(entity) !== 'destroyed' &&
      entity.movement.speed > 0 &&
      entity.movement.state === 'idle' &&
      !entity.renderable.hidden &&
      !entity.economy?.attack &&
      !entity.economy?.buildJob &&
      !entity.economy?.factoryDuty &&
      !entity.economy?.harvesting &&
      !entity.economy?.shoreFishing &&
      (entity.kind === 'guard' || entity.kind === 'saboteur'),
  );
  return candidates.sort((a, b) => getScoutPriority(a) - getScoutPriority(b))[0];
}

function chooseAdaptiveTactic(
  observed: AiObservedPlayerState,
  openingStrategy: 'economicBoom' | 'harborPressure' | 'siege',
): { tactic: AiTactic; reason: string } {
  const defenseScore = observed.guards + observed.guardTowers * 2;
  const harborScore = observed.docks * 2 + observed.boats + observed.attackBoats * 2;
  const economyScore = observed.trucks * 2 + observed.workers + observed.factories;

  if (observed.lastSeenSeconds > 75) {
    return { tactic: getFallbackTactic(openingStrategy), reason: 'stale intel' };
  }
  if (harborScore >= 3 && observed.attackBoats + observed.guardTowers <= 1) {
    return { tactic: 'harborControl', reason: 'scouted exposed harbor' };
  }
  if (defenseScore >= 3) {
    return { tactic: 'counterMilitary', reason: 'scouted heavy defenses' };
  }
  if (economyScore >= 4 && defenseScore <= 1) {
    return { tactic: 'probeEconomy', reason: 'scouted exposed economy' };
  }
  if (observed.barracks > 0 || observed.factories > 1) {
    return { tactic: 'baseSiege', reason: 'scouted teching base' };
  }
  return { tactic: getFallbackTactic(openingStrategy), reason: 'opening read' };
}

function getFallbackTactic(openingStrategy: 'economicBoom' | 'harborPressure' | 'siege'): AiTactic {
  if (openingStrategy === 'harborPressure') return 'harborControl';
  if (openingStrategy === 'economicBoom') return 'probeEconomy';
  return 'baseSiege';
}

function createEmptyObservedState(): AiObservedPlayerState {
  return {
    workers: 0,
    trucks: 0,
    boats: 0,
    attackBoats: 0,
    guards: 0,
    guardTowers: 0,
    docks: 0,
    barracks: 0,
    factories: 0,
    lastSeenSeconds: Number.POSITIVE_INFINITY,
  };
}

function getScoutSightRange(scout: GameEntity): number {
  if (scout.kind === 'saboteur') return 620;
  if (scout.kind === 'guard') return 560;
  return 500;
}

function getScoutPriority(entity: GameEntity): number {
  if (entity.kind === 'saboteur') return 0;
  if (entity.kind === 'guard') return 1;
  return 2;
}
