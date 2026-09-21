import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { IPC, WINDOW_SIZE } from '../shared/constants';
import { restPosition, windowCenter } from '../shared/layout';
import type { WorkArea } from '../shared/types';
import { isQuitting } from './app-state';
import { iconFile, rendererHtml, spritesDir, toFileUrl } from './paths';
import { applyPetWindowPlatform, isMac } from './platform';

let petWindow: BrowserWindow | null = null;
let dragTimer: ReturnType<typeof setInterval> | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastPlacedX: number | null = null;
let lastPlacedY: number | null = null;
let cursorTimer: ReturnType<typeof setInterval> | null = null;

export function createPetWindow(size = WINDOW_SIZE): BrowserWindow {
  const workArea = screen.getPrimaryDisplay().workArea;
  const start = restPosition(workArea, size);

  petWindow = new BrowserWindow({
    width: size,
    height: size,
    x: start.x,
    y: start.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    roundedCorners: false,
    acceptFirstMouse: true,
    icon: iconFile(),
    ...(isMac ? { type: 'panel' as const, hiddenInMissionControl: true } : {}),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  petWindow.setIgnoreMouseEvents(true, { forward: true });
  applyPetWindowPlatform(petWindow);
  startCursorProbe();
  petWindow.loadFile(rendererHtml('index.html'), {
    query: { sprites: toFileUrl(spritesDir()) },
  });

  petWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log('[renderer]', message);
  });

  if (process.argv.includes('--dev')) {
    petWindow.webContents.openDevTools({ mode: 'detach' });
  }

  petWindow.on('close', (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      petWindow?.hide();
    }
  });

  petWindow.on('closed', () => {
    stopCursorProbe();
    petWindow = null;
  });

  return petWindow;
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow;
}

export function showPetWindow(): void {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.show();
    return;
  }
  createPetWindow();
}

export function resetPetPosition(): void {
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return;
  const [wx, wy] = win.getPosition();
  const size = win.getBounds().width || WINDOW_SIZE;
  const wa = getWorkArea(windowCenter(wx, wy, size));
  const pos = restPosition(wa, size);
  showPetWindow();
  movePetWindow(pos.x, pos.y);
  win.webContents.send(IPC.RESET_POSITION, {
    x: pos.x,
    y: pos.y,
    workArea: { x: wa.x, y: wa.y, width: wa.width, height: wa.height },
  });
}

export function movePetWindow(x: number, y: number): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const nx = Math.round(x);
  const ny = Math.round(y);
  if (nx === lastPlacedX && ny === lastPlacedY) return;
  lastPlacedX = nx;
  lastPlacedY = ny;
  petWindow.setPosition(nx, ny, false);
}

function followCursor(): void {
  const p = screen.getCursorScreenPoint();
  movePetWindow(p.x - dragOffsetX, p.y - dragOffsetY);
}

function startCursorProbe(): void {
  if (cursorTimer) return;
  cursorTimer = setInterval(() => {
    if (dragTimer || !petWindow || petWindow.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    const bounds = petWindow.getContentBounds();
    petWindow.webContents.send(IPC.CURSOR, { x: p.x - bounds.x, y: p.y - bounds.y });
  }, 16);
}

function stopCursorProbe(): void {
  if (!cursorTimer) return;
  clearInterval(cursorTimer);
  cursorTimer = null;
}

export function startPetDrag(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const p = screen.getCursorScreenPoint();
  const [wx, wy] = petWindow.getPosition();
  dragOffsetX = p.x - wx;
  dragOffsetY = p.y - wy;
  petWindow.setIgnoreMouseEvents(false);
  followCursor();
  if (dragTimer) return;
  dragTimer = setInterval(followCursor, 8);
}

export function endPetDrag(): { x: number; y: number } {
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
  followCursor();
  const win = getPetWindow();
  if (win && !win.isDestroyed()) {
    const [x, y] = win.getPosition();
    return { x, y };
  }
  return { x: lastPlacedX ?? 0, y: lastPlacedY ?? 0 };
}

export function setPetOpacity(percent: number): void {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setOpacity(Math.max(0.5, Math.min(1, percent / 100)));
  }
}

export function applyPetWindowSize(nextSize: number): void {
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return;
  const size = Math.round(nextSize);
  const bounds = win.getBounds();
  if (bounds.width === size && bounds.height === size) return;
  const nx = Math.round(bounds.x + bounds.width / 2 - size / 2);
  const ny = Math.round(bounds.y + bounds.height - size);
  win.setBounds({ x: nx, y: ny, width: size, height: size });
  lastPlacedX = nx;
  lastPlacedY = ny;
}

export function getWorkArea(point?: { x: number; y: number }): WorkArea {
  const display = point
    ? screen.getDisplayNearestPoint(point)
    : screen.getPrimaryDisplay();
  return display.workArea;
}
