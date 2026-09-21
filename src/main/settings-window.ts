import { BrowserWindow, nativeImage, nativeTheme } from 'electron';
import * as path from 'path';
import { iconFile, rendererHtml } from './paths';

let settingsWindow: BrowserWindow | null = null;

export function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 440,
    height: 820,
    useContentSize: true,
    title: 'Jimothy Settings',
    icon: nativeImage.createFromPath(iconFile()),
    resizable: false,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1916' : '#f6f0e6',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(rendererHtml('settings.html'));

  const themeListener = (): void => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1c1916' : '#f6f0e6');
    }
  };
  nativeTheme.on('updated', themeListener);

  settingsWindow.on('closed', () => {
    nativeTheme.removeListener('updated', themeListener);
    settingsWindow = null;
  });
}
