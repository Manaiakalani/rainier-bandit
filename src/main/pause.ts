import { IPC } from '../shared/constants';
import { getIsNapping, getIsPaused, setNapping, setPaused } from './app-state';
import { getPetWindow } from './window';

export function applyPause(next: boolean): boolean {
  const paused = setPaused(next);
  const win = getPetWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC.TOGGLE_PAUSE, paused);
  }
  return paused;
}

export function togglePetPause(): boolean {
  return applyPause(!getIsPaused());
}

export function applyNap(next: boolean): boolean {
  const napping = setNapping(next);
  const win = getPetWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC.TOGGLE_NAP, napping);
  }
  return napping;
}

export function togglePetNap(): boolean {
  return applyNap(!getIsNapping());
}
