import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_SETTINGS, IPC, windowPx } from '../shared/constants';
import { isPartialSettings, normalizeSettings } from '../shared/settings-normalize';
import type { Settings } from '../shared/types';
import { notifyChrome } from './app-state';
import { applyLoginItem } from './platform';
import { applyPetWindowSize, setPetOpacity } from './window';

let cached: Settings | null = null;

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function getSettings(): Settings {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    cached = normalizeSettings(isPartialSettings(parsed) ? parsed : {});
  } catch {
    cached = { ...DEFAULT_SETTINGS };
  }
  return cached;
}

export function updateSettings(partial: unknown): Settings {
  const safePartial = isPartialSettings(partial) ? partial : {};
  const next = normalizeSettings({ ...getSettings(), ...safePartial });
  cached = next;

  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist settings:', err);
  }

  applySideEffects(safePartial);
  broadcast(next);
  notifyChrome();
  return next;
}

export function applyStartupSettings(): void {
  const s = getSettings();
  applyLoginItem(s.launchAtLogin);
  setPetOpacity(s.opacity);
}

function applySideEffects(partial: Partial<Settings>): void {
  if (typeof partial.launchAtLogin === 'boolean') {
    applyLoginItem(partial.launchAtLogin);
  }
  if (typeof partial.opacity === 'number') {
    setPetOpacity(partial.opacity);
  }
  if (partial.petScale) {
    applyPetWindowSize(windowPx(partial.petScale));
  }
}

function broadcast(next: Settings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.SETTINGS_CHANGED, next);
    }
  }
}
