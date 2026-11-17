import { app, ipcMain, Menu, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { IPC } from '../shared/constants';
import { getIsNapping, getIsPaused, requestQuit } from './app-state';
import { applyNap, applyPause } from './pause';
import { isTrustedSender } from './security';
import { getSettings, updateSettings } from './settings';
import { openSettingsWindow } from './settings-window';
import { endPetDrag, getPetWindow, getWorkArea, movePetWindow, resetPetPosition, startPetDrag } from './window';

function trusted(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  return isTrustedSender(event.sender, event.senderFrame);
}

function on(channel: string, listener: (event: IpcMainEvent, ...args: unknown[]) => void): void {
  ipcMain.on(channel, (event, ...args) => {
    if (!trusted(event)) return;
    listener(event, ...args);
  });
}

function handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(event)) return null;
    return listener(event, ...args);
  });
}

function readPoint(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const point = value as { x?: unknown; y?: unknown };
  if (typeof point.x !== 'number' || typeof point.y !== 'number') return undefined;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return undefined;
  return { x: point.x, y: point.y };
}

export function registerIpcHandlers(): void {
  on(IPC.SET_IGNORE_MOUSE, (_event, ignore: unknown) => {
    const win = getPetWindow();
    if (!win || win.isDestroyed()) return;
    if (ignore === true) {
      win.setIgnoreMouseEvents(true, { forward: true });
    } else if (ignore === false) {
      win.setIgnoreMouseEvents(false);
    }
  });

  on(IPC.MOVE_WINDOW, (_event, x: unknown, y: unknown) => {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    movePetWindow(x, y);
  });

  on(IPC.START_DRAG, () => {
    startPetDrag();
  });

  handle(IPC.END_DRAG, () => endPetDrag());

  handle(IPC.GET_WORK_AREA, (_event, point?: unknown) => {
    const wa = getWorkArea(readPoint(point));
    return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
  });

  handle(IPC.GET_PAUSE_STATE, () => getIsPaused());

  handle(IPC.GET_NAP_STATE, () => getIsNapping());

  on(IPC.TOGGLE_NAP, (_event, napState?: unknown) => {
    const next = typeof napState === 'boolean' ? napState : !getIsNapping();
    applyNap(next);
  });

  handle(IPC.GET_WINDOW_POS, () => {
    const win = getPetWindow();
    if (win && !win.isDestroyed()) {
      const [x, y] = win.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
  });

  handle(IPC.GET_APP_INFO, () => ({
    version: app.getVersion(),
    platform: process.platform,
  }));

  on(IPC.TOGGLE_PAUSE, (_event, pausedState?: unknown) => {
    const nextPaused = typeof pausedState === 'boolean' ? pausedState : !getIsPaused();
    applyPause(nextPaused);
  });

  on(IPC.SHOW_CONTEXT_MENU, () => {
    const win = getPetWindow();
    if (!win || win.isDestroyed()) return;

    const menu = Menu.buildFromTemplate([
      {
        label: 'Pet Jimothy',
        click: () => win.webContents.send(IPC.PET_REACTION),
      },
      { type: 'separator' },
      {
        label: getIsPaused() ? 'Resume' : 'Pause',
        click: () => applyPause(!getIsPaused()),
      },
      {
        label: getIsNapping() ? 'Wake up' : 'Take a nap',
        click: () => applyNap(!getIsNapping()),
      },
      {
        label: 'Settings…',
        click: () => openSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: 'Quit Jimothy',
        click: () => requestQuit(),
      },
    ]);
    const releaseFocus = (): void => {
      if (win.isDestroyed()) return;
      win.setFocusable(false);
      win.blur();
    };
    menu.once('menu-will-close', releaseFocus);
    win.setFocusable(true);
    menu.popup({ window: win });
  });

  handle(IPC.GET_SETTINGS, () => getSettings());

  handle(IPC.UPDATE_SETTINGS, (_event, partial: unknown) => updateSettings(partial));

  on(IPC.OPEN_SETTINGS, () => openSettingsWindow());

  on(IPC.RESET_POSITION, () => {
    resetPetPosition();
  });
}
