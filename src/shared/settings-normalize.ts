import {
  CLICK_VALUES,
  DEFAULT_SETTINGS,
  OPACITY_VALUES,
  PACE_VALUES,
  SCALE_VALUES,
  STYLE_VALUES,
  WANDER_VALUES,
} from './constants';
import type { OpacityLevel, Settings } from './types';

export function isPartialSettings(input: unknown): input is Partial<Settings> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeSettings(input: Partial<Settings> | undefined | null): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(input ?? {}) };
  const opacity = Number(s.opacity);
  return {
    roaming: Boolean(s.roaming),
    wanderFrequency: pick(s.wanderFrequency, WANDER_VALUES, DEFAULT_SETTINGS.wanderFrequency),
    breathing: Boolean(s.breathing),
    speechBubbles: Boolean(s.speechBubbles),
    sleepAtNight: Boolean(s.sleepAtNight),
    launchAtLogin: Boolean(s.launchAtLogin),
    greeted: Boolean(s.greeted),
    spriteStyle: pick(s.spriteStyle, STYLE_VALUES, DEFAULT_SETTINGS.spriteStyle),
    pace: pick(s.pace, PACE_VALUES, DEFAULT_SETTINGS.pace),
    clickAction: pick(s.clickAction, CLICK_VALUES, DEFAULT_SETTINGS.clickAction),
    opacity: pick(opacity as OpacityLevel, OPACITY_VALUES, DEFAULT_SETTINGS.opacity),
    petScale: pick(s.petScale, SCALE_VALUES, DEFAULT_SETTINGS.petScale),
  };
}
