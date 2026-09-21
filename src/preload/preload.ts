import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/constants';
import type { Settings } from '../shared/types';

contextBridge.exposeInMainWorld('jimothy', {
  setIgnoreMouse: (ignore: boolean) =>
    ipcRenderer.send(IPC.SET_IGNORE_MOUSE, ignore),

  moveWindow: (x: number, y: number) =>
    ipcRenderer.send(IPC.MOVE_WINDOW, x, y),

  startDrag: () =>
    ipcRenderer.send(IPC.START_DRAG),

  endDrag: (): Promise<{ x: number; y: number }> =>
    ipcRenderer.invoke(IPC.END_DRAG),

  getWorkArea: (point?: { x: number; y: number }): Promise<{ x: number; y: number; width: number; height: number }> =>
    ipcRenderer.invoke(IPC.GET_WORK_AREA, point),

  getWindowPos: (): Promise<{ x: number; y: number }> =>
    ipcRenderer.invoke(IPC.GET_WINDOW_POS),

  getPauseState: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC.GET_PAUSE_STATE),

  togglePause: () =>
    ipcRenderer.send(IPC.TOGGLE_PAUSE),

  getNapState: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC.GET_NAP_STATE),

  setNapping: (napping: boolean) =>
    ipcRenderer.send(IPC.TOGGLE_NAP, napping),

  onToggleNap: (cb: (napping: boolean) => void) => {
    const handler = (_event: unknown, napping: boolean) => cb(napping);
    ipcRenderer.on(IPC.TOGGLE_NAP, handler);
    return () => ipcRenderer.removeListener(IPC.TOGGLE_NAP, handler);
  },

  getAppInfo: (): Promise<{ version: string; platform: string }> =>
    ipcRenderer.invoke(IPC.GET_APP_INFO),

  showContextMenu: () =>
    ipcRenderer.send(IPC.SHOW_CONTEXT_MENU),

  onTogglePause: (cb: (paused: boolean) => void) => {
    const handler = (_event: unknown, paused: boolean) => cb(paused);
    ipcRenderer.on(IPC.TOGGLE_PAUSE, handler);
    return () => ipcRenderer.removeListener(IPC.TOGGLE_PAUSE, handler);
  },

  onPetReaction: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on(IPC.PET_REACTION, handler);
    return () => ipcRenderer.removeListener(IPC.PET_REACTION, handler);
  },

  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),

  updateSettings: (partial: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.UPDATE_SETTINGS, partial),

  onSettingsChanged: (cb: (settings: Settings) => void) => {
    const handler = (_event: unknown, settings: Settings) => cb(settings);
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler);
  },

  openSettings: () =>
    ipcRenderer.send(IPC.OPEN_SETTINGS),

  resetPosition: () =>
    ipcRenderer.send(IPC.RESET_POSITION),

  onResetPosition: (cb: (pos: { x: number; y: number; workArea: { x: number; y: number; width: number; height: number } }) => void) => {
    const handler = (_event: unknown, pos: { x: number; y: number; workArea: { x: number; y: number; width: number; height: number } }) => cb(pos);
    ipcRenderer.on(IPC.RESET_POSITION, handler);
    return () => ipcRenderer.removeListener(IPC.RESET_POSITION, handler);
  },

  onCursor: (cb: (pos: { x: number; y: number }) => void) => {
    const handler = (_event: unknown, pos: { x: number; y: number }) => cb(pos);
    ipcRenderer.on(IPC.CURSOR, handler);
    return () => ipcRenderer.removeListener(IPC.CURSOR, handler);
  },
});
