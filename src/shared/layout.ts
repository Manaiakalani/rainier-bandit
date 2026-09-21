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
