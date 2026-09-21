import { SLEEP_HOUR_END, SLEEP_HOUR_START, WANDER_TUNING } from './constants';
import type { WanderFrequency } from './types';

export function pickWeighted<T extends { weight: number }>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pickWeighted requires at least one item');
  }
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[0];
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function isSleepTime(
  hour: number = new Date().getHours(),
  start: number = SLEEP_HOUR_START,
  end: number = SLEEP_HOUR_END,
): boolean {
  if (start > end) {
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

export function wanderTuning(frequency: WanderFrequency): { walkChance: number; restScale: number; speedScale: number } {
  return WANDER_TUNING[frequency] ?? WANDER_TUNING.normal;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
