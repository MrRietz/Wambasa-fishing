import type { DamageState, GameEntity } from '../entities/components';
import { createAiArmyState, type AiArmyState } from './aiArmy';
import {
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  isAiPersonality,
  type AiBuildItem,
  type AiDifficulty,
  type AiPersonality,
} from './aiConfig';
import { createAiMemoryState, ensureAiMemoryState, type AiMemoryState } from './aiMemory';

/** Public map knowledge the AI may scout (start areas, resource fields, harbors) — never targets by themselves. */
export interface AiPointOfInterest {
  x: number;
  y: number;
  label: string;
  domain: 'land' | 'water';
  priority: number;
}

export interface AiScoutRun {
  unitId?: string;
  domain: 'land' | 'water';
  status: 'idle' | 'outbound' | 'returning';
  poiIndex: number;
  visited: number;
  legStartedAt: number;
  startHealth: number;
  nextAt: number;
}

export interface AiEconomyWatch {
  lastSpendAt: number;
  blockedItem?: AiBuildItem;
  blockedSince: number;
  blockedMetal?: number;
  skippedUntil: Partial<Record<AiBuildItem, number>>;
}

export interface AiBrainStats {
  waves: number;
  retreats: number;
  watchdogRecoveries: number;
  scoutsSent: number;
  scoutsLost: number;
  damageReveals: number;
}

export interface AiHomeThreat {
  strength: number;
  x: number;
  y: number;
  ids: string[];
  lastSeenAt: number;
}

export interface AiBrainState {
  personality: AiPersonality;
  clock: number;
  thinkAccumulator: number;
  memory: AiMemoryState;
  army: AiArmyState;
  landScout: AiScoutRun;
  navalScout: AiScoutRun;
  poiScoutedAt: number[];
  economy: AiEconomyWatch;
  stats: AiBrainStats;
  threat: AiHomeThreat;
  lastArmyReady: number;
  lastArmyStrength: number;
  lastDesiredWave: number;
  lastDecision: string;
}

export interface AiBrainDebugState {
  personality: AiPersonality;
  personalityLabel: string;
  difficulty?: AiDifficulty;
  simSeconds: number;
  knownSightings: number;
  sightingsByKind: string;
  visibleNow: number;
  scoutStatus: string;
  navalScoutStatus: string;
  armyState: {
    mode: string;
    squadSize: number;
    readyCount: number;
    desiredWaveSize: number;
    strength: number;
    waveCount: number;
    retreatCount: number;
    nextWaveInSeconds: number;
    objective?: string;
    lastRetreatReason?: string;
    fleetMode: string;
    fleetSize: number;
  };
  attackWaveCount: number;
  watchdogRecoveries: number;
  lastDecision: string;
}

export function createAiBrainState(personality: AiPersonality, difficulty: AiDifficulty = 'normal'): AiBrainState {
  const profile = AI_PERSONALITIES[personality];
  const firstWaveAt = profile.firstWaveSeconds * AI_DIFFICULTY[difficulty].firstWaveScale;
  return {
    personality,
    clock: 0,
    thinkAccumulator: 0,
    memory: createAiMemoryState(),
    army: createAiArmyState(firstWaveAt),
    landScout: createScoutRun('land', 0),
    // The starting skiff guards home waters first and only goes scouting later.
    navalScout: createScoutRun('water', 40),
    poiScoutedAt: [],
    economy: { lastSpendAt: 0, blockedSince: 0, skippedUntil: {} },
    stats: { waves: 0, retreats: 0, watchdogRecoveries: 0, scoutsSent: 0, scoutsLost: 0, damageReveals: 0 },
    threat: { strength: 0, x: 0, y: 0, ids: [], lastSeenAt: -1e9 },
    lastArmyReady: 0,
    lastArmyStrength: 0,
    lastDesiredWave: profile.baseWaveSize,
    lastDecision: `Rival plays ${profile.label.toLowerCase()}.`,
  };
}

/** Validates a (possibly restored-from-save) brain and rebuilds missing parts. */
export function ensureAiBrainState(brain: AiBrainState | undefined, personality: AiPersonality, difficulty: AiDifficulty = 'normal'): AiBrainState {
  if (!brain || !isAiPersonality(brain.personality) || !brain.army || !Array.isArray(brain.army.squadIds)) {
    return createAiBrainState(personality, difficulty);
  }
  brain.memory = ensureAiMemoryState(brain.memory);
  brain.landScout ??= createScoutRun('land', brain.clock);
  brain.navalScout ??= createScoutRun('water', brain.clock);
  brain.poiScoutedAt ??= [];
  brain.economy ??= { lastSpendAt: brain.clock, blockedSince: brain.clock, skippedUntil: {} };
  brain.economy.skippedUntil ??= {};
  brain.threat ??= { strength: 0, x: 0, y: 0, ids: [], lastSeenAt: -1e9 };
  brain.army.fleetIds ??= [];
  return brain;
}

function createScoutRun(domain: 'land' | 'water', now: number): AiScoutRun {
  return { domain, status: 'idle', poiIndex: -1, visited: 0, legStartedAt: now, startHealth: 0, nextAt: now };
}

export interface AiScoutUpdateInput {
  run: AiScoutRun;
  pois: AiPointOfInterest[];
  poiScoutedAt: number[];
  now: number;
  entityById: Map<string, GameEntity>;
  getDamageState: (entity: GameEntity) => DamageState | undefined;
  chooseUnit: () => GameEntity | undefined;
  move: (unit: GameEntity, point: { x: number; y: number }) => boolean;
  home: { x: number; y: number };
  interval: number;
  urgent: boolean;
  maxLegs: number;
}

export type AiScoutEvent = 'sent' | 'arrived' | 'returned' | 'lost' | 'fled' | undefined;

/** One scouting step: dispatch, waypoint progress, flee when hurt, return and release the unit. */
export function updateAiScoutRun(input: AiScoutUpdateInput): AiScoutEvent {
  const { run, now } = input;
  if (run.unitId) {
    const unit = input.entityById.get(run.unitId);
    if (!unit || input.getDamageState(unit) === 'destroyed' || (unit.economy?.health ?? 1) <= 0) {
      run.unitId = undefined;
      run.status = 'idle';
      run.nextAt = now + (input.urgent ? 6 : input.interval * 0.5);
      return 'lost';
    }
    const health = unit.economy?.health ?? 1;
    if (run.status === 'outbound') {
      if (run.startHealth > 0 && health < run.startHealth * 0.45) {
        run.status = 'returning';
        run.legStartedAt = now;
        input.move(unit, input.home);
        return 'fled';
      }
      const poi = input.pois[run.poiIndex];
      const arrived = poi && Math.hypot(unit.x - poi.x, unit.y - poi.y) <= 190;
      const stopped = unit.movement.state === 'idle' && now - run.legStartedAt > 3;
      if (!poi || arrived || stopped || now - run.legStartedAt > 80) {
        if (poi) input.poiScoutedAt[run.poiIndex] = now;
        run.visited += 1;
        if (run.visited >= input.maxLegs || !sendToNextPoi(input, unit)) {
          run.status = 'returning';
          run.legStartedAt = now;
          input.move(unit, input.home);
        }
        return 'arrived';
      }
      return undefined;
    }
    // returning
    const home = Math.hypot(unit.x - input.home.x, unit.y - input.home.y) <= 380;
    if (home || now - run.legStartedAt > 90) {
      run.unitId = undefined;
      run.status = 'idle';
      run.nextAt = now + (input.urgent ? input.interval * 0.35 : input.interval);
      return 'returned';
    }
    if (unit.movement.state === 'idle' && now - run.legStartedAt > 3) {
      run.legStartedAt = now;
      input.move(unit, input.home);
    }
    return undefined;
  }

  const due = now >= run.nextAt || (input.urgent && now >= run.nextAt - input.interval * 0.65);
  if (!due) {
    return undefined;
  }
  const unit = input.chooseUnit();
  if (!unit) {
    run.nextAt = now + 5;
    return undefined;
  }
  run.visited = 0;
  run.startHealth = unit.economy?.health ?? 0;
  if (!sendToNextPoi(input, unit)) {
    run.nextAt = now + 8;
    return undefined;
  }
  run.unitId = unit.id;
  run.status = 'outbound';
  return 'sent';
}

function sendToNextPoi(input: AiScoutUpdateInput, unit: GameEntity): boolean {
  const { run, now } = input;
  const tried = new Set<number>();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let bestIndex = -1;
    let bestScore = -1e9;
    for (let index = 0; index < input.pois.length; index += 1) {
      const poi = input.pois[index];
      if (poi.domain !== run.domain || tried.has(index) || index === run.poiIndex) continue;
      const scoutedAt = input.poiScoutedAt[index] ?? -1e9;
      if (now - scoutedAt < 25) continue;
      const age = Math.min(now - scoutedAt, 240);
      const distancePenalty = Math.hypot(unit.x - poi.x, unit.y - poi.y) / 400;
      const score = poi.priority * (age + 30) - distancePenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) return false;
    tried.add(bestIndex);
    if (input.move(unit, input.pois[bestIndex])) {
      run.poiIndex = bestIndex;
      run.legStartedAt = now;
      return true;
    }
    input.poiScoutedAt[bestIndex] = now; // unreachable for now; try another
  }
  return false;
}

export function describeScoutRun(run: AiScoutRun, pois: AiPointOfInterest[], now: number): string {
  if (!run.unitId) {
    const wait = Math.max(0, Math.round(run.nextAt - now));
    return wait > 0 ? `idle (next in ${wait}s)` : 'idle (ready)';
  }
  const poi = pois[run.poiIndex];
  return run.status === 'outbound' ? `${run.unitId} -> ${poi?.label ?? 'waypoint'}` : `${run.unitId} returning`;
}

export function buildAiBrainDebugState(
  brain: AiBrainState,
  pois: AiPointOfInterest[],
  difficulty?: AiDifficulty,
): AiBrainDebugState {
  const now = brain.clock;
  const byKind: Record<string, number> = {};
  for (const sighting of brain.memory.sightings) {
    byKind[sighting.kind] = (byKind[sighting.kind] ?? 0) + 1;
  }
  const army = brain.army;
  return {
    personality: brain.personality,
    personalityLabel: AI_PERSONALITIES[brain.personality].label,
    difficulty,
    simSeconds: Math.round(now * 10) / 10,
    knownSightings: brain.memory.sightings.length,
    sightingsByKind: Object.keys(byKind).map((kind) => `${kind}:${byKind[kind]}`).join(' '),
    visibleNow: brain.memory.visibleNow.length,
    scoutStatus: describeScoutRun(brain.landScout, pois, now),
    navalScoutStatus: describeScoutRun(brain.navalScout, pois, now),
    armyState: {
      mode: army.mode,
      squadSize: army.squadIds.length,
      readyCount: brain.lastArmyReady,
      desiredWaveSize: brain.lastDesiredWave,
      strength: Math.round(brain.lastArmyStrength * 10) / 10,
      waveCount: army.waveCount,
      retreatCount: army.retreatCount,
      nextWaveInSeconds: Math.max(0, Math.round(army.nextWaveAt - now)),
      objective: army.objective?.label,
      lastRetreatReason: army.lastRetreatReason,
      fleetMode: army.fleetMode,
      fleetSize: army.fleetIds.length,
    },
    attackWaveCount: army.waveCount,
    watchdogRecoveries: brain.stats.watchdogRecoveries + army.stalledRecoveries,
    lastDecision: brain.lastDecision,
  };
}
