import type { AiControllerState } from '../ai/aiCoordinator';
import type { AiDefenseState } from '../ai/aiDefenseSystem';
import type { GameEntity, MatchState, MatchStats } from '../entities/components';
import type { FishingZoneState, ResourceField } from '../map/mapTypes';

export const SAVE_GAME_STORAGE_KEY = 'wambasa-fishing:save-game:v1';
export const SAVE_GAME_SCHEMA_VERSION = 1;

export interface SaveGameSnapshot {
  schemaVersion: 1;
  appVersion: string;
  savedAt: string;
  simulationClockSeconds: number;
  entities: GameEntity[];
  resourceFields: ResourceField[];
  fishingZoneStates: FishingZoneState[];
  economyState: { metal: number; cash: number };
  aiEconomyState: { metal: number; cash: number };
  matchState: MatchState;
  matchStats: MatchStats;
  crewState: { capacity: number };
  aiController: AiControllerState;
  aiDefenseState: AiDefenseState;
}

export type SaveGameLoadResult =
  | { ok: true; snapshot: SaveGameSnapshot }
  | { ok: false; reason: 'missing' | 'invalid-json' | 'incompatible' | 'invalid-schema'; message: string };

export function createSaveGameSnapshot(input: Omit<SaveGameSnapshot, 'schemaVersion' | 'savedAt'>): SaveGameSnapshot {
  return deepClone({
    ...input,
    schemaVersion: SAVE_GAME_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  });
}

export function saveGameToLocalStorage(browserWindow: Window, snapshot: SaveGameSnapshot): void {
  browserWindow.localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadGameFromLocalStorage(browserWindow: Window): SaveGameLoadResult {
  const raw = browserWindow.localStorage.getItem(SAVE_GAME_STORAGE_KEY);
  if (!raw) {
    return { ok: false, reason: 'missing', message: 'No local save exists yet.' };
  }
  return parseSaveGameSnapshot(raw);
}

export function parseSaveGameSnapshot(raw: string): SaveGameLoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid-json', message: 'Save file is not valid JSON.' };
  }
  if (!isRecord(parsed)) {
    return { ok: false, reason: 'invalid-schema', message: 'Save file is missing snapshot data.' };
  }
  if (parsed.schemaVersion !== SAVE_GAME_SCHEMA_VERSION) {
    return { ok: false, reason: 'incompatible', message: 'Save file uses an incompatible schema version.' };
  }
  if (
    !Array.isArray(parsed.entities) ||
    !Array.isArray(parsed.resourceFields) ||
    !Array.isArray(parsed.fishingZoneStates) ||
    !isRecord(parsed.economyState) ||
    !isRecord(parsed.aiEconomyState) ||
    !isRecord(parsed.matchState) ||
    !isRecord(parsed.matchStats) ||
    !isRecord(parsed.crewState) ||
    !isRecord(parsed.aiController) ||
    !isRecord(parsed.aiDefenseState) ||
    typeof parsed.simulationClockSeconds !== 'number'
  ) {
    return { ok: false, reason: 'invalid-schema', message: 'Save file is missing required gameplay state.' };
  }
  return { ok: true, snapshot: deepClone(parsed as unknown as SaveGameSnapshot) };
}

export function serializeSaveGameSnapshot(snapshot: SaveGameSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
