import { app } from 'electron';
import * as path from 'path';
import { windowPx } from '../shared/constants';

if (process.platform === 'linux') {
  // X11 only blends a transparent window when it is drawn into the compositor.
  // A GPU overlay with compositor bypass stays invisible on XFCE and similar desktops.
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-gpu');
  app.disableHardwareAcceleration();
}
import { markQuitting } from './app-state';
import { registerIpcHandlers } from './ipc';
import { hideDockIfMac } from './platform';
import { installAppProtocol, registerAppScheme } from './protocol';
import { hardenContents, installSessionGuards } from './security';
import { applyStartupSettings, getSettings } from './settings';
import { createTray } from './tray';
import { createPetWindow, getPetWindow, revealPet } from './window';

registerAppScheme();

if (process.env.JIMOTHY_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.JIMOTHY_USER_DATA));
}

app.setName('Jimothy');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.jimothy.desktop-mascot');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getPetWindow();
    if (win && !win.isDestroyed()) {
      revealPet(win);
    } else {
      createPetWindow(windowPx(getSettings().petScale));
    }
  });

  app.whenReady().then(() => {
    const start = (): void => {
      installAppProtocol();
      installSessionGuards();
      app.on('web-contents-created', (_event, contents) => {
        hardenContents(contents);
      });
      hideDockIfMac();
      registerIpcHandlers();
      createPetWindow(windowPx(getSettings().petScale));
      applyStartupSettings();
      try {
        createTray();
      } catch (err) {
        console.error('Tray is unavailable. Jimothy will stay on the desktop.', err);
      }
    };
    // Linux compositors need a moment to publish an ARGB visual. Creating the
    // transparent window immediately leaves it invisible.
    if (process.platform === 'linux') {
      setTimeout(start, 400);
    } else {
      start();
    }
  });
}

app.on('activate', () => {
  const win = getPetWindow();
  if (win && !win.isDestroyed()) {
    revealPet(win);
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
