import type { EntityKind } from '../entities/components';

/**
 * Single tuning place for the rival AI: difficulty profiles, match personalities and memory/vision knobs.
 * The AI never receives resource bonuses; difficulty changes decision speed, wave sizes, timings and macro targets.
 */

export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type AiPersonality = 'harborRaider' | 'turtleSiege' | 'boomer' | 'harasser';
export type AiStrategy = 'economicBoom' | 'harborPressure' | 'siege' | 'harass';

export interface AiDifficultyProfile {
  /** Seconds between AI decision passes (perception, economy, army). */
  thinkIntervalSeconds: number;
  /** Added to every wave size (after personality growth). */
  waveSizeBonus: number;
  /** Multiplies the personality first-wave timing. */
  firstWaveScale: number;
  /** Minimum seconds between waves after a wave returns. */
  waveCooldownSeconds: number;
  /** Seconds between routine scouting runs. */
  scoutIntervalSeconds: number;
  /** Added to personality worker / truck targets. */
  workerBonus: number;
  truckBonus: number;
  /** Items each producer may hold in its queue. */
  maxQueuePerProducer: number;
  /** Squad retreats when its strength falls below this share of launch strength. */
  retreatStrengthRatio: number;
  /** Hard cap for land army size. */
  armyCap: number;
}

export const AI_DIFFICULTY: Record<AiDifficulty, AiDifficultyProfile> = {
  easy: {
    thinkIntervalSeconds: 0.9,
    waveSizeBonus: -1,
    firstWaveScale: 1.45,
    waveCooldownSeconds: 70,
    scoutIntervalSeconds: 80,
    workerBonus: -1,
    truckBonus: -1,
    maxQueuePerProducer: 1,
    retreatStrengthRatio: 0.5,
    armyCap: 8,
  },
  normal: {
    thinkIntervalSeconds: 0.5,
    waveSizeBonus: 0,
    firstWaveScale: 1,
    waveCooldownSeconds: 40,
    scoutIntervalSeconds: 50,
    workerBonus: 0,
    truckBonus: 0,
    maxQueuePerProducer: 2,
    retreatStrengthRatio: 0.4,
    armyCap: 14,
  },
  hard: {
    thinkIntervalSeconds: 0.3,
    waveSizeBonus: 1,
    firstWaveScale: 0.8,
    waveCooldownSeconds: 28,
    scoutIntervalSeconds: 34,
    workerBonus: 1,
    truckBonus: 1,
    maxQueuePerProducer: 2,
    retreatStrengthRatio: 0.3,
    armyCap: 20,
  },
};

export type AiBuildItem = 'worker' | 'truck' | 'boat' | 'attackBoat' | 'guard' | 'saboteur' | 'dock' | 'barracks' | 'guardTower';

export interface AiBuildStep {
  item: AiBuildItem;
  /** Desired total (alive + queued + under construction). */
  count: number;
  /** Do not start before this many seconds of AI time. */
  after?: number;
}

export interface AiPersonalityProfile {
  id: AiPersonality;
  label: string;
  strategy: AiStrategy;
  weight: number;
  /** Ordered build order; later steps run once earlier ones are satisfied or impossible. */
  buildOrder: AiBuildStep[];
  /** Workers assigned to the cannery reel line (cash income). */
  factoryCrew: number;
  firstWaveSeconds: number;
  baseWaveSize: number;
  waveGrowth: number;
  maxWaveSize: number;
  /** Military units that stay home while a wave is out (except all-in). */
  homeReserve: number;
  /** Rally forward (mid-map) instead of at home. */
  forwardRally: boolean;
  /** Preferred target kinds, most wanted first. */
  preferredTargets: EntityKind[];
  style: 'assault' | 'hitAndRun';
  navalRaids: boolean;
  scoutWith: 'worker' | 'guard';
  /** Tactic used when intel does not force anything else. */
  defaultTactic: 'probeEconomy' | 'harborControl' | 'baseSiege' | 'counterMilitary';
}

export const AI_PERSONALITIES: Record<AiPersonality, AiPersonalityProfile> = {
  harborRaider: {
    id: 'harborRaider',
    label: 'Harbor raider',
    strategy: 'harborPressure',
    weight: 1,
    buildOrder: [
      { item: 'truck', count: 2 },
      { item: 'dock', count: 1 },
      { item: 'boat', count: 1 },
      { item: 'worker', count: 4 },
      { item: 'attackBoat', count: 2 },
      { item: 'barracks', count: 1 },
      { item: 'truck', count: 3 },
      { item: 'guard', count: 3 },
      { item: 'attackBoat', count: 3 },
      { item: 'boat', count: 2 },
      { item: 'worker', count: 5 },
      { item: 'guard', count: 6 },
      { item: 'attackBoat', count: 4 },
      { item: 'guard', count: 9 },
    ],
    factoryCrew: 1,
    firstWaveSeconds: 80,
    baseWaveSize: 3,
    waveGrowth: 1,
    maxWaveSize: 7,
    homeReserve: 1,
    forwardRally: false,
    preferredTargets: ['boat', 'dock', 'truck', 'worker', 'barracks', 'factory'],
    style: 'hitAndRun',
    navalRaids: true,
    scoutWith: 'worker',
    defaultTactic: 'harborControl',
  },
  turtleSiege: {
    id: 'turtleSiege',
    label: 'Turtle then siege',
    strategy: 'siege',
    weight: 1,
    buildOrder: [
      { item: 'truck', count: 2 },
      { item: 'dock', count: 1 },
      { item: 'barracks', count: 1 },
      { item: 'boat', count: 1 },
      { item: 'worker', count: 4 },
      { item: 'guard', count: 2 },
      { item: 'truck', count: 3 },
      { item: 'guardTower', count: 1, after: 45 },
      { item: 'guard', count: 5 },
      { item: 'worker', count: 5 },
      { item: 'saboteur', count: 1 },
      { item: 'guardTower', count: 2, after: 120 },
      { item: 'guard', count: 8 },
      { item: 'boat', count: 2 },
      { item: 'saboteur', count: 2 },
      { item: 'guard', count: 12 },
    ],
    factoryCrew: 2,
    firstWaveSeconds: 210,
    baseWaveSize: 6,
    waveGrowth: 2,
    maxWaveSize: 12,
    homeReserve: 2,
    forwardRally: false,
    preferredTargets: ['guardTower', 'barracks', 'factory', 'dock', 'guard'],
    style: 'assault',
    navalRaids: false,
    scoutWith: 'worker',
    defaultTactic: 'baseSiege',
  },
  boomer: {
    id: 'boomer',
    label: 'Economic boom, late push',
    strategy: 'economicBoom',
    weight: 1,
    buildOrder: [
      { item: 'truck', count: 2 },
      { item: 'dock', count: 1 },
      { item: 'boat', count: 1 },
      { item: 'worker', count: 5 },
      { item: 'truck', count: 3 },
      { item: 'boat', count: 2 },
      { item: 'barracks', count: 1 },
      { item: 'worker', count: 6 },
      { item: 'guard', count: 2 },
      { item: 'truck', count: 4 },
      { item: 'boat', count: 3 },
      { item: 'guard', count: 5 },
      { item: 'worker', count: 7 },
      { item: 'guardTower', count: 1, after: 150 },
      { item: 'attackBoat', count: 1 },
      { item: 'saboteur', count: 1 },
      { item: 'guard', count: 10 },
      { item: 'guard', count: 14 },
    ],
    factoryCrew: 3,
    firstWaveSeconds: 260,
    baseWaveSize: 7,
    waveGrowth: 2,
    maxWaveSize: 14,
    homeReserve: 2,
    forwardRally: false,
    preferredTargets: ['factory', 'barracks', 'dock', 'truck', 'boat'],
    style: 'assault',
    navalRaids: false,
    scoutWith: 'worker',
    defaultTactic: 'counterMilitary',
  },
  harasser: {
    id: 'harasser',
    label: 'Worker and truck harasser',
    strategy: 'harass',
    weight: 1,
    buildOrder: [
      { item: 'dock', count: 1 },
      { item: 'barracks', count: 1 },
      { item: 'guard', count: 2 },
      { item: 'truck', count: 2 },
      { item: 'boat', count: 1 },
      { item: 'guard', count: 3 },
      { item: 'worker', count: 4 },
      { item: 'saboteur', count: 1 },
      { item: 'truck', count: 3 },
      { item: 'guard', count: 5 },
      { item: 'worker', count: 5 },
      { item: 'attackBoat', count: 1 },
      { item: 'guard', count: 8 },
      { item: 'boat', count: 2 },
      { item: 'guard', count: 10 },
    ],
    factoryCrew: 1,
    firstWaveSeconds: 55,
    baseWaveSize: 2,
    waveGrowth: 1,
    maxWaveSize: 5,
    homeReserve: 0,
    forwardRally: true,
    preferredTargets: ['worker', 'truck', 'boat', 'dock', 'saboteur'],
    style: 'hitAndRun',
    navalRaids: false,
    scoutWith: 'worker',
    defaultTactic: 'probeEconomy',
  },
};

export const AI_PERSONALITY_IDS: AiPersonality[] = ['harborRaider', 'turtleSiege', 'boomer', 'harasser'];

export function isAiPersonality(value: unknown): value is AiPersonality {
  return typeof value === 'string' && (AI_PERSONALITY_IDS as string[]).includes(value);
}

export function pickAiPersonality(random: () => number = Math.random): AiPersonality {
  const total = AI_PERSONALITY_IDS.reduce((sum, id) => sum + AI_PERSONALITIES[id].weight, 0);
  let roll = random() * total;
  for (const id of AI_PERSONALITY_IDS) {
    roll -= AI_PERSONALITIES[id].weight;
    if (roll <= 0) {
      return id;
    }
  }
  return 'harasser';
}

export function personalityForStrategy(strategy: AiStrategy | string | undefined): AiPersonality {
  if (strategy === 'economicBoom') return 'boomer';
  if (strategy === 'harborPressure') return 'harborRaider';
  if (strategy === 'harass') return 'harasser';
  return 'turtleSiege';
}

export const AI_MEMORY_TUNING = {
  /** Mobile unit sightings expire after this many seconds without a refresh. */
  mobileSightingTtlSeconds: 55,
  /** Buildings never move; they are kept until re-scouted or this long without refresh. */
  buildingSightingTtlSeconds: 600,
  /** A remembered spot counts as re-scouted when it is inside this share of a rival vision radius. */
  rescoutVisionShare: 0.8,
  /** Sightings older than this are considered stale for target choice (mobile units). */
  staleMobileSeconds: 20,
  /** Radius around a target used to count remembered defenders. */
  defenseRadius: 520,
  /** Distance from rival structures that counts as "home" for threat detection. */
  homeThreatRadius: 900,
  /** Maximum sightings kept (oldest dropped first). */
  maxSightings: 96,
} as const;

export const AI_COMBAT_VALUE: Partial<Record<EntityKind, number>> = {
  guard: 1,
  saboteur: 0.6,
  guardTower: 2.6,
  worker: 0.15,
  truck: 0.1,
};
