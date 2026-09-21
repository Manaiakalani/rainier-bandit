import { app } from 'electron';

let paused = false;
let napping = false;
let quitting = false;
const chromeListeners = new Set<() => void>();

export function getIsPaused(): boolean {
  return paused;
}

export function setPaused(next: boolean): boolean {
  paused = next;
  notifyChrome();
  return paused;
}

export function togglePause(): boolean {
  return setPaused(!paused);
}

export function getIsNapping(): boolean {
  return napping;
}

export function setNapping(next: boolean): boolean {
  napping = next;
  notifyChrome();
  return napping;
}

export function toggleNap(): boolean {
  return setNapping(!napping);
}

export function isQuitting(): boolean {
  return quitting;
}

export function markQuitting(): void {
  quitting = true;
}

export function requestQuit(): void {
  markQuitting();
  app.quit();
}

export function onChromeChange(listener: () => void): () => void {
  chromeListeners.add(listener);
  return () => {
    chromeListeners.delete(listener);
  };
}

export function notifyChrome(): void {
  for (const listener of chromeListeners) {
    listener();
  }
}
