import type { DamageState, GameEntity } from '../entities/components';
import { getVisionRadius } from '../visibility/fogOfWar';
import { AI_PERSONALITIES, personalityForStrategy, type AiPersonalityProfile, type AiStrategy } from './aiConfig';
import type { AiObservedPlayerState } from './aiMemory';

export type { AiObservedPlayerState } from './aiMemory';

/**
 * Tactics are the AI's current posture, re-evaluated from scouted memory:
 * - scouting: nothing actionable known; scouts out, army gathers.
 * - probeEconomy: raid exposed workers/trucks/boats.
 * - harborControl: hit docks and fishing boats (land squad + attack boats).
 * - baseSiege: assault production buildings.
 * - counterMilitary: heavy defenses scouted; build up, only hit soft targets.
 * - allIn: weak defenses scouted; everything attacks the base.
 * - defending: player units spotted near the rival base.
 * - counterAttack: an attack was just repelled; punish immediately.
 */
export type AiTactic =
  | 'scouting'
  | 'probeEconomy'
  | 'harborControl'
  | 'baseSiege'
  | 'counterMilitary'
  | 'allIn'
  | 'defending'
  | 'counterAttack';

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

export interface AiTacticContext {
  personality: AiPersonalityProfile;
  observed: AiObservedPlayerState;
  /** Combat value of the rival land army. */
  ownArmyStrength: number;
  /** Combat value of player units currently seen near the rival base. */
  threatAtHome: number;
  /** Seconds since the last home defense ended (Infinity when never). */
  secondsSinceRepelled: number;
  /** True after a wave retreated from heavy base defenses. */
  avoidBase: boolean;
  /** Wave size the personality wants right now. */
  desiredWaveSize: number;
}

export interface AiTacticUpdateInput {
  intel: AiIntelState;
  openingStrategy: AiStrategy;
  force?: boolean;
  context?: Omit<AiTacticContext, 'observed' | 'personality'> & { personality?: AiPersonalityProfile };
}

export function createAiIntelState(openingStrategy: AiStrategy): AiIntelState {
  void openingStrategy;
  return {
    tactic: 'scouting',
    tacticReason: 'no intel yet',
    tacticCooldownSeconds: 0,
    observed: createEmptyObservedState(),
    scout: { cooldownSeconds: 0, reportCooldownSeconds: 0 },
  };
}

export function ensureAiIntelState(intel: AiIntelState | undefined, openingStrategy: AiStrategy): AiIntelState {
  if (!intel) {
    return createAiIntelState(openingStrategy);
  }
  if (!intel.observed) {
    intel.observed = createEmptyObservedState();
  }
  if (!intel.scout) {
    intel.scout = { cooldownSeconds: 0, reportCooldownSeconds: 0 };
  }
  return intel;
}

export function getAiTacticLabel(tactic: AiTactic): string {
  switch (tactic) {
    case 'scouting':
      return 'scouting';
    case 'probeEconomy':
      return 'economy raids';
    case 'harborControl':
      return 'harbor control';
    case 'counterMilitary':
      return 'build-up vs defenses';
    case 'allIn':
      return 'all-in assault';
    case 'defending':
      return 'home defense';
    case 'counterAttack':
      return 'counter-attack';
    case 'baseSiege':
    default:
      return 'base siege';
  }
}

export function isOffensiveTactic(tactic: AiTactic): boolean {
  return tactic !== 'scouting' && tactic !== 'defending';
}

/**
 * Legacy scout scan: what a single scout sees with its own vision radius. Kept for focused tests;
 * the runtime uses the shared rival-vision memory in aiMemory.
 */
export function scanPlayerIntel(input: AiScoutScanInput): AiScoutScanOutput | undefined {
  const sight = getVisionRadius(input.scout);
  const observed = createEmptyObservedState();
  let seen = 0;
  for (const entity of input.entities) {
    if (
      entity.faction !== 'player' ||
      input.getDamageState(entity) === 'destroyed' ||
      entity.renderable.hidden ||
      Math.hypot(entity.x - input.scout.x, entity.y - input.scout.y) > sight
    ) {
      continue;
    }
    seen += 1;
    countObservedKind(observed, entity.kind, entity.economy?.combatRole);
  }
  if (seen === 0) {
    return undefined;
  }
  observed.lastSeenSeconds = 0;
  return { observed, report: describeObservedPlayer(observed) };
}

export function describeObservedPlayer(observed: AiObservedPlayerState): string {
  const parts = [
    observed.trucks > 0 ? `${observed.trucks} truck${observed.trucks === 1 ? '' : 's'}` : '',
    observed.docks > 0 || observed.boats > 0 || observed.attackBoats > 0
      ? `${observed.docks} dock / ${observed.boats + observed.attackBoats} boat${observed.boats + observed.attackBoats === 1 ? '' : 's'}`
      : '',
    observed.guards + observed.guardTowers > 0 ? `${observed.guards + observed.guardTowers} defense${observed.guards + observed.guardTowers === 1 ? '' : 's'}` : '',
    observed.barracks > 0 ? 'barracks' : '',
  ].filter(Boolean);
  return parts.length > 0 ? `Rival scout reports ${parts.join(', ')}.` : 'Rival scout found your base.';
}

export function mergeObservedPlayerState(target: AiObservedPlayerState, source: AiObservedPlayerState): void {
  target.workers = Math.max(target.workers, source.workers);
  target.trucks = Math.max(target.trucks, source.trucks);
  target.boats = Math.max(target.boats, source.boats);
  target.attackBoats = Math.max(target.attackBoats, source.attackBoats);
  target.guards = Math.max(target.guards, source.guards);
  target.saboteurs = Math.max(target.saboteurs ?? 0, source.saboteurs ?? 0);
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
  const personality = input.context?.personality ?? AI_PERSONALITIES[personalityForStrategy(input.openingStrategy)];
  const next = evaluateAiTactic({
    personality,
    observed: input.intel.observed,
    ownArmyStrength: input.context?.ownArmyStrength ?? 0,
    threatAtHome: input.context?.threatAtHome ?? 0,
    secondsSinceRepelled: input.context?.secondsSinceRepelled ?? Number.POSITIVE_INFINITY,
    avoidBase: input.context?.avoidBase ?? false,
    desiredWaveSize: input.context?.desiredWaveSize ?? personality.baseWaveSize,
  });
  input.intel.tacticCooldownSeconds = next.tactic === 'defending' ? 1 : 2.5;
  if (next.tactic === input.intel.tactic && next.reason === input.intel.tacticReason) {
    return false;
  }
  input.intel.tactic = next.tactic;
  input.intel.tacticReason = next.reason;
  return true;
}

/** Pure tactic choice from scouted memory and own state. */
export function evaluateAiTactic(context: AiTacticContext): { tactic: AiTactic; reason: string } {
  const { observed, personality } = context;
  if (context.threatAtHome >= 0.5) {
    return { tactic: 'defending', reason: 'player units spotted near our base' };
  }
  if (context.secondsSinceRepelled <= 25 && context.ownArmyStrength >= 2) {
    return { tactic: 'counterAttack', reason: 'attack repelled, punishing' };
  }

  const known = Math.max(observed.knownSightings ?? 0, countKnown(observed));
  if (known === 0) {
    return { tactic: 'scouting', reason: 'no intel yet' };
  }

  const baseKnown = observed.factories + observed.barracks + observed.docks + observed.guardTowers > 0;
  const harborKnown = observed.docks + observed.boats > 0;
  const economyKnown = observed.trucks + observed.workers + observed.boats > 0;
  const baseDefense = observed.baseDefenseScore ?? observed.guards + observed.guardTowers * 2.6;
  const army = context.ownArmyStrength;

  if (baseKnown && baseDefense <= 1 && army >= Math.max(4, context.desiredWaveSize - 1)) {
    return { tactic: 'allIn', reason: 'scouted weak defenses' };
  }

  const heavyDefense = baseKnown && baseDefense >= Math.max(3, army * 1.15);
  if (heavyDefense || context.avoidBase) {
    const why = context.avoidBase ? 'last wave was repelled' : 'scouted heavy defenses';
    if (harborKnown && (personality.navalRaids || observed.attackBoats === 0)) {
      return { tactic: 'harborControl', reason: `${why}, hitting harbor instead` };
    }
    if (economyKnown) {
      return { tactic: 'probeEconomy', reason: `${why}, raiding economy instead` };
    }
    return { tactic: 'counterMilitary', reason: `${why}, building up` };
  }

  const harborScore = observed.docks * 2 + observed.boats + observed.attackBoats;
  if (harborScore >= 3 && observed.attackBoats + observed.guardTowers <= 1 && personality.defaultTactic !== 'baseSiege') {
    return { tactic: 'harborControl', reason: 'scouted exposed harbor' };
  }

  switch (personality.defaultTactic) {
    case 'harborControl':
      if (harborKnown) return { tactic: 'harborControl', reason: 'harbor raider plan' };
      if (economyKnown) return { tactic: 'probeEconomy', reason: 'harbor unknown, raiding economy' };
      break;
    case 'probeEconomy':
      if (economyKnown) return { tactic: 'probeEconomy', reason: 'harassment plan' };
      if (harborKnown) return { tactic: 'harborControl', reason: 'economy unknown, hitting harbor' };
      break;
    case 'counterMilitary':
      if (baseKnown && army >= context.desiredWaveSize) return { tactic: 'baseSiege', reason: 'boom army ready, late push' };
      return { tactic: 'counterMilitary', reason: 'booming before the push' };
    case 'baseSiege':
    default:
      if (baseKnown) {
        return army >= context.desiredWaveSize
          ? { tactic: 'baseSiege', reason: 'siege army ready' }
          : { tactic: 'counterMilitary', reason: 'turtling until the siege army is ready' };
      }
      break;
  }
  if (baseKnown) {
    return { tactic: 'baseSiege', reason: 'base located' };
  }
  if (economyKnown) {
    return { tactic: 'probeEconomy', reason: 'only economy located' };
  }
  return { tactic: 'scouting', reason: 'intel too thin' };
}

/**
 * Scout candidate from the rival's own units. Saboteurs first; guards only while at least
 * three exist so the first two stay with the army.
 */
export function chooseScoutUnit(entities: GameEntity[], getDamageState: (entity: GameEntity) => DamageState | undefined): GameEntity | undefined {
  let totalGuards = 0;
  let saboteur: GameEntity | undefined;
  let guard: GameEntity | undefined;
  for (const entity of entities) {
    if (entity.faction !== 'enemy' || getDamageState(entity) === 'destroyed' || entity.movement.speed <= 0 || entity.renderable.hidden) {
      continue;
    }
    if (entity.kind === 'guard') {
      totalGuards += 1;
    }
    if (
      entity.movement.state !== 'idle' ||
      entity.economy?.attack ||
      entity.economy?.buildJob ||
      entity.economy?.factoryDuty ||
      entity.economy?.harvesting ||
      entity.economy?.shoreFishing
    ) {
      continue;
    }
    if (entity.kind === 'saboteur' && !saboteur) {
      saboteur = entity;
    } else if (entity.kind === 'guard' && !guard) {
      guard = entity;
    }
  }
  if (saboteur) {
    return saboteur;
  }
  return totalGuards >= 3 ? guard : undefined;
}

export function createEmptyObservedState(): AiObservedPlayerState {
  return {
    workers: 0,
    trucks: 0,
    boats: 0,
    attackBoats: 0,
    guards: 0,
    saboteurs: 0,
    guardTowers: 0,
    docks: 0,
    barracks: 0,
    factories: 0,
    lastSeenSeconds: Number.POSITIVE_INFINITY,
    knownSightings: 0,
    baseDefenseScore: 0,
    militaryScore: 0,
  };
}

function countKnown(observed: AiObservedPlayerState): number {
  return observed.workers + observed.trucks + observed.boats + observed.attackBoats + observed.guards + (observed.saboteurs ?? 0)
    + observed.guardTowers + observed.docks + observed.barracks + observed.factories;
}

function countObservedKind(observed: AiObservedPlayerState, kind: GameEntity['kind'], combatRole?: 'fishing' | 'attack'): void {
  if (kind === 'worker') observed.workers += 1;
  if (kind === 'truck') observed.trucks += 1;
  if (kind === 'boat' && combatRole === 'attack') observed.attackBoats += 1;
  if (kind === 'boat' && combatRole !== 'attack') observed.boats += 1;
  if (kind === 'guard') observed.guards += 1;
  if (kind === 'saboteur') observed.saboteurs = (observed.saboteurs ?? 0) + 1;
  if (kind === 'guardTower') observed.guardTowers += 1;
  if (kind === 'dock') observed.docks += 1;
  if (kind === 'barracks') observed.barracks += 1;
  if (kind === 'factory') observed.factories += 1;
}
