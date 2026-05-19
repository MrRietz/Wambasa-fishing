import { SETTINGS_STORAGE_KEY } from '../config/constants';
import { clamp } from '../core/math';

export type DifficultySetting = 'easy' | 'normal' | 'hard';

export interface PlayerSettings {
  uiScale: number;
  scrollSpeed: number;
  edgeScroll: boolean;
  difficulty: DifficultySetting;
}

const DEFAULT_SETTINGS: PlayerSettings = {
  uiScale: 100,
  scrollSpeed: 130,
  edgeScroll: true,
  difficulty: 'normal',
};

export function loadPlayerSettings(browserWindow: Window): PlayerSettings {
  try {
    const raw = browserWindow.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
    return {
      uiScale: typeof parsed.uiScale === 'number' ? clamp(parsed.uiScale, 85, 115) : DEFAULT_SETTINGS.uiScale,
      scrollSpeed: typeof parsed.scrollSpeed === 'number' ? clamp(parsed.scrollSpeed, 80, 180) : DEFAULT_SETTINGS.scrollSpeed,
      edgeScroll: typeof parsed.edgeScroll === 'boolean' ? parsed.edgeScroll : DEFAULT_SETTINGS.edgeScroll,
      difficulty: parsed.difficulty === 'easy' || parsed.difficulty === 'hard' ? parsed.difficulty : DEFAULT_SETTINGS.difficulty,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistPlayerSettings(browserWindow: Window, settings: PlayerSettings): void {
  const existing = readSettingsObject(browserWindow);
  browserWindow.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...existing, ...settings }));
}

export function applyUiScale(root: HTMLElement, uiScale: number): void {
  root.style.setProperty('--rts-ui-scale', `${clamp(uiScale, 85, 115) / 100}`);
}

function readSettingsObject(browserWindow: Window): Record<string, unknown> {
  try {
    const raw = browserWindow.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
