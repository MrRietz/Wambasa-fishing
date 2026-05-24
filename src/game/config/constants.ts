export const WORLD_WIDTH = 7800;
export const WORLD_HEIGHT = 3200;
export const DEFAULT_ZOOM = 0.8;
export const MIN_ZOOM = 0.56;
export const MAX_ZOOM = 1.35;
export const EDGE_SCROLL_SIZE = 28;
export const EDGE_SCROLL_SPEED = 720;
export const KEY_SCROLL_SPEED = 840;
export const PATH_CELL_SIZE = 24;
export const UNIT_BLOCKER_PADDING = 8;
export const PLAYER_PROFIT_TARGET = 3200;
export const AI_PROFIT_TARGET = 3200;
export const ECONOMIC_VICTORY_LEAD_REQUIRED = 900;
export const GUARD_TOWER_RANGE = 250;
export const GUARD_TOWER_DAMAGE_PER_SECOND = 36;
export const SETTINGS_STORAGE_KEY = 'wambasa-rts-settings';

export const FIRST_SKIRMISH_COMBAT_PRESSURE = {
  playerGuardHealth: 170,
  enemyGuardHealth: 160,
  guardDamagePerSecond: 32,
  enemyRaidGuardDamagePerSecond: 30,
  enemyRaidWorkerDamagePerSecond: 18,
  guardLandAttackRange: 64,
  guardBoatAttackRange: 92,
  enemyRaidGuardAttackRange: 90,
  enemyRaidWorkerAttackRange: 72,
  attackBoatDamagePerSecond: 34,
  attackBoatRange: 88,
  defaultGuardEngageRange: 150,
  desiredRaidSquadSize: {
    probeEconomy: 2,
    standard: 2,
    siege: 3,
  },
  difficultyRaidSquadAdjustment: {
    easy: -1,
    normal: 0,
    hard: 1,
  },
  difficultyRepeatRaidDelayAdjustmentSeconds: {
    easy: 6,
    normal: 0,
    hard: -6,
  },
  minimumRepeatRaidDelaySeconds: 10,
  movementSpeeds: {
    worker: 150,
    enemyWorker: 145,
    guard: 145,
    enemyGuard: 140,
    saboteur: 165,
    enemySaboteur: 160,
    truck: 95,
    enemyTruck: 92,
    fishingBoat: 68,
    attackBoat: 78,
  },
};

export const FIRST_SKIRMISH_BALANCE = {
  playerStartingMetal: 320,
  playerStartingCash: 120,
  aiStartingMetal: 320,
  aiStartingCash: 120,
  aiStartDelaySeconds: 8,
  aiFirstRaidGraceSeconds: 36,
  aiRepeatRaidDelaySeconds: 32,
  economicVictoryGraceSeconds: 1800,
  starterMetalCargo: 100,
  firstBoatCashValue: 160,
};
