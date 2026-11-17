import { BrowserWindow } from 'electron';
import { IPC } from '../shared/constants';
import { getIsNapping, getIsPaused, setNapping, setPaused } from './app-state';

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

export function applyPause(next: boolean): boolean {
  const paused = setPaused(next);
  broadcast(IPC.TOGGLE_PAUSE, paused);
  return paused;
}

export function togglePetPause(): boolean {
  return applyPause(!getIsPaused());
}

export function applyNap(next: boolean): boolean {
  const napping = setNapping(next);
  broadcast(IPC.TOGGLE_NAP, napping);
  return napping;
}

export function togglePetNap(): boolean {
  return applyNap(!getIsNapping());
}
