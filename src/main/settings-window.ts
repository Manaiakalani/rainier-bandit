import { BrowserWindow, nativeImage, nativeTheme, screen } from 'electron';
import * as path from 'path';
import { iconFile, rendererHtml } from './paths';

let settingsWindow: BrowserWindow | null = null;
let displayFitBound = false;

function settingsContentBox(anchor: { x: number; y: number }): { x: number; y: number; width: number; height: number } {
  const area = screen.getDisplayNearestPoint(anchor).workArea;
  const width = Math.min(440, Math.max(1, area.width - 24));
  const height = Math.min(820, Math.max(1, area.height - 64));
  return {
    width,
    height,
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + Math.max(0, (area.height - height) / 2)),
  };
}

function fitSettingsWindow(win: BrowserWindow): void {
  const bounds = win.getBounds();
  const box = settingsContentBox({
    x: Math.round(bounds.x + bounds.width / 2),
    y: Math.round(bounds.y + bounds.height / 2),
  });
  win.setContentSize(box.width, box.height);
  win.setPosition(box.x, box.y);
}

function bindSettingsDisplayFit(): void {
  if (displayFitBound) return;
  displayFitBound = true;
  const refit = (): void => {
    if (settingsWindow && !settingsWindow.isDestroyed()) fitSettingsWindow(settingsWindow);
  };
  screen.on('display-metrics-changed', refit);
  screen.on('display-removed', refit);
}

export function openSettingsWindow(): void {
  bindSettingsDisplayFit();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    fitSettingsWindow(settingsWindow);
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const box = settingsContentBox(screen.getCursorScreenPoint());
  settingsWindow = new BrowserWindow({
    width: box.width,
    height: box.height,
    x: box.x,
    y: box.y,
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
