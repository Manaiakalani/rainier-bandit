import { app } from 'electron';
import { windowPx } from '../shared/constants';
import { createPetWindow, getPetWindow } from './window';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipc';
import { applyStartupSettings, getSettings } from './settings';
import { hideDockIfMac } from './platform';
import { markQuitting } from './app-state';

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getPetWindow();
    if (win && !win.isDestroyed()) {
      win.show();
    } else {
      createPetWindow(windowPx(getSettings().petScale));
    }
  });

  app.whenReady().then(() => {
    app.setName('Jimothy');
    hideDockIfMac();
    registerIpcHandlers();
    createPetWindow(windowPx(getSettings().petScale));
    applyStartupSettings();
    createTray();
  });
}

app.on('activate', () => {
  const win = getPetWindow();
  if (win && !win.isDestroyed()) {
    win.show();
  } else if (app.isReady()) {
    createPetWindow(windowPx(getSettings().petScale));
  }
});

app.on('before-quit', () => {
  markQuitting();
});

app.on('window-all-closed', () => {
  // Stay alive in the tray on every platform.
});
