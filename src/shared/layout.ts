import { TASKBAR_TUCK, WINDOW_SIZE } from './constants';
import type { WorkArea } from './types';

export function groundYFor(workArea: WorkArea, windowSize = WINDOW_SIZE): number {
  return workArea.y + workArea.height - windowSize + TASKBAR_TUCK;
}

export function centerPetX(workArea: WorkArea, windowSize = WINDOW_SIZE): number {
  return Math.floor(workArea.x + workArea.width / 2 - windowSize / 2);
}

export function petBounds(workArea: WorkArea, windowSize = WINDOW_SIZE): {
  minX: number;
  maxX: number;
  groundY: number;
} {
  return {
    minX: workArea.x,
    maxX: workArea.x + workArea.width - windowSize,
    groundY: groundYFor(workArea, windowSize),
  };
}

export function restPosition(workArea: WorkArea, windowSize = WINDOW_SIZE): { x: number; y: number } {
  return {
    x: centerPetX(workArea, windowSize),
    y: groundYFor(workArea, windowSize),
  };
}

export function windowCenter(x: number, y: number, windowSize = WINDOW_SIZE): { x: number; y: number } {
  return {
    x: x + windowSize / 2,
    y: y + windowSize / 2,
  };
}

/** Clamp a window origin into the work area, including when the window is wider than that area. */
export function clampWindowX(x: number, workArea: WorkArea, windowSize = WINDOW_SIZE): number {
  const bounds = petBounds(workArea, windowSize);
  const lo = Math.min(bounds.minX, bounds.maxX);
  const hi = Math.max(bounds.minX, bounds.maxX);
  return Math.min(hi, Math.max(lo, Math.round(x)));
}

/** Keep the window on the display that holds `x`, with feet on that work-area floor. */
export function pinToFloor(x: number, workArea: WorkArea, windowSize = WINDOW_SIZE): { x: number; y: number } {
  return {
    x: clampWindowX(x, workArea, windowSize),
    y: groundYFor(workArea, windowSize),
  };
}
