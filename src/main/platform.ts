import { app, BrowserWindow } from 'electron';
import * as path from 'path';

export const isMac = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';

export function hideDockIfMac(): void {
  if (isMac && app.dock) {
    app.dock.hide();
  }
}

export function applyPetWindowPlatform(win: BrowserWindow): void {
  if (isMac) {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setAlwaysOnTop(true, 'floating', 1);
    win.setWindowButtonVisibility(false);
    return;
  }
  win.setAlwaysOnTop(true, 'screen-saver');
}

export function applyLoginItem(openAtLogin: boolean): void {
  try {
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin,
        openAsHidden: true,
      });
      return;
    }

    const appPath = path.resolve(process.argv[1] || app.getAppPath());
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: true,
      path: process.execPath,
      args: [appPath],
    });
  } catch (err) {
    console.error('Failed to set login item:', err);
  }
}

export function trayIconSize(): { width: number; height: number } {
  return isMac ? { width: 22, height: 22 } : { width: 16, height: 16 };
}
