import { app, ipcMain, Menu } from 'electron';
import { APP_VERSION, IPC } from '../shared/constants';
import { getIsNapping, getIsPaused, requestQuit } from './app-state';
import { applyNap, applyPause } from './pause';
import { getSettings, updateSettings } from './settings';
import { openSettingsWindow } from './settings-window';
import { endPetDrag, getPetWindow, getWorkArea, movePetWindow, resetPetPosition, startPetDrag } from './window';

export function registerIpcHandlers(): void {
  ipcMain.on(IPC.SET_IGNORE_MOUSE, (_event, ignore: unknown) => {
    const win = getPetWindow();
    if (!win || win.isDestroyed()) return;
    if (ignore) {
      win.setIgnoreMouseEvents(true, { forward: true });
    } else {
      win.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.on(IPC.MOVE_WINDOW, (_event, x: unknown, y: unknown) => {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    movePetWindow(x, y);
  });

  ipcMain.on(IPC.START_DRAG, () => {
    startPetDrag();
  });

  ipcMain.handle(IPC.END_DRAG, () => endPetDrag());

  ipcMain.handle(IPC.GET_WORK_AREA, (_event, point?: { x: number; y: number }) => {
    const wa = getWorkArea(point);
    return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
  });

  ipcMain.handle(IPC.GET_PAUSE_STATE, () => getIsPaused());

  ipcMain.handle(IPC.GET_NAP_STATE, () => getIsNapping());

  ipcMain.on(IPC.TOGGLE_NAP, (_event, napState?: unknown) => {
    const next = typeof napState === 'boolean' ? napState : !getIsNapping();
    applyNap(next);
  });

  ipcMain.handle(IPC.GET_WINDOW_POS, () => {
    const win = getPetWindow();
    if (win && !win.isDestroyed()) {
      const [x, y] = win.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
  });

  ipcMain.handle(IPC.GET_APP_INFO, () => ({
    version: app.isPackaged ? app.getVersion() : APP_VERSION,
    platform: process.platform,
  }));

  ipcMain.on(IPC.TOGGLE_PAUSE, (_event, pausedState?: unknown) => {
    const nextPaused = typeof pausedState === 'boolean' ? pausedState : !getIsPaused();
    applyPause(nextPaused);
  });

  ipcMain.on(IPC.SHOW_CONTEXT_MENU, () => {
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
        accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
        click: () => requestQuit(),
      },
    ]);
    win.setFocusable(true);
    menu.popup({
      window: win,
      callback: () => {
        if (!win.isDestroyed()) win.setFocusable(false);
      },
    });
  });

  ipcMain.handle(IPC.GET_SETTINGS, () => getSettings());

  ipcMain.handle(IPC.UPDATE_SETTINGS, (_event, partial: unknown) => {
    return updateSettings(partial);
  });

  ipcMain.on(IPC.OPEN_SETTINGS, () => openSettingsWindow());

  ipcMain.on(IPC.QUIT_APP, () => requestQuit());

  ipcMain.on(IPC.RESET_POSITION, () => {
    resetPetPosition();
  });
}
