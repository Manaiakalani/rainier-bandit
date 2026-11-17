import { BrowserWindow, screen } from 'electron';
import { IPC, WINDOW_SIZE } from '../shared/constants';
import { pinToFloor, restPosition, windowCenter } from '../shared/layout';
import type { WorkArea } from '../shared/types';
import { rendererUrl } from './app-url';
import { isQuitting } from './app-state';
import { iconFile } from './paths';
import { applyPetWindowPlatform, isDev, isMac } from './platform';
import { petWebPreferences } from './security';

let petWindow: BrowserWindow | null = null;
let petWindowSize = WINDOW_SIZE;
let dragTimer: ReturnType<typeof setInterval> | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastPlacedX: number | null = null;
let lastPlacedY: number | null = null;
let cursorTimer: ReturnType<typeof setInterval> | null = null;
let cursorOverWindow = false;
let displayListenersBound = false;

export function revealPet(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.setFocusable(false);
  if (!win.isVisible()) win.showInactive();
  win.blur();
}

export function createPetWindow(size = petWindowSize): BrowserWindow {
  if (petWindow && !petWindow.isDestroyed()) return petWindow;
  petWindowSize = size;
  const workArea = screen.getPrimaryDisplay().workArea;
  const start = restPosition(workArea, size);
  bindDisplayListeners();

  petWindow = new BrowserWindow({
    width: size,
    height: size,
    x: start.x,
    y: start.y,
    show: false,
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
    webPreferences: petWebPreferences(),
  });

  petWindow.setIgnoreMouseEvents(true, { forward: true });
  applyPetWindowPlatform(petWindow);
  startCursorProbe();
  petWindow.loadURL(rendererUrl('index.html'));

  if (isDev()) {
    petWindow.webContents.openDevTools({ mode: 'detach' });
  }

  petWindow.once('ready-to-show', () => {
    if (petWindow && !petWindow.isDestroyed()) revealPet(petWindow);
  });

  petWindow.webContents.on('did-finish-load', () => {
    const visible = Boolean(petWindow && !petWindow.isDestroyed() && petWindow.isVisible());
    if (!visible) {
      cursorOverWindow = false;
      stopCursorProbe();
    }
    publishVisibility(visible);
    syncPetToWorkArea();
  });

  petWindow.on('show', () => {
    petWindow?.setFocusable(false);
    petWindow?.blur();
    startCursorProbe();
    publishVisibility(true);
  });

  petWindow.on('hide', () => {
    cursorOverWindow = false;
    stopCursorProbe();
    publishCursor(-1, -1);
    publishVisibility(false);
  });

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

  revealPet(petWindow);
  return petWindow;
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow;
}

export function showPetWindow(): void {
  if (petWindow && !petWindow.isDestroyed()) {
    revealPet(petWindow);
    return;
  }
  createPetWindow(petWindowSize);
}

export function resetPetPosition(): void {
  showPetWindow();
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return;
  const size = win.getBounds().width || petWindowSize;
  const [wx, wy] = win.getPosition();
  const wa = getWorkArea(windowCenter(wx, wy, size));
  const pos = restPosition(wa, size);
  movePetWindow(pos.x, pos.y);
  win.webContents.send(IPC.RESET_POSITION, {
    x: pos.x,
    y: pos.y,
    workArea: { x: wa.x, y: wa.y, width: wa.width, height: wa.height },
  });
}

export function movePetWindow(x: number, y: number): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const placed = clampToDisplays(x, y, petWindowSize);
  if (placed.x === lastPlacedX && placed.y === lastPlacedY) return;
  lastPlacedX = placed.x;
  lastPlacedY = placed.y;
  petWindow.setPosition(placed.x, placed.y, false);
}

function clampToDisplays(x: number, y: number, size: number): { x: number; y: number } {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) return { x: Math.round(x), y: Math.round(y) };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const display of displays) {
    const bounds = display.bounds;
    minX = Math.min(minX, bounds.x - size);
    minY = Math.min(minY, bounds.y - size);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, x))),
    y: Math.round(Math.min(maxY, Math.max(minY, y))),
  };
}

function followCursor(): void {
  const p = screen.getCursorScreenPoint();
  movePetWindow(p.x - dragOffsetX, p.y - dragOffsetY);
}

function publishCursor(x: number, y: number): void {
  const win = petWindow;
  if (!win || win.isDestroyed() || win.webContents.isLoading()) return;
  win.webContents.send(IPC.CURSOR, { x, y });
}

function publishVisibility(visible: boolean): void {
  const win = petWindow;
  if (!win || win.isDestroyed() || win.webContents.isLoading()) return;
  win.webContents.send(IPC.PET_VISIBILITY, visible);
}

function probeCursor(): void {
  if (dragTimer || !petWindow || petWindow.isDestroyed() || !petWindow.isVisible()) return;
  const p = screen.getCursorScreenPoint();
  const bounds = petWindow.getContentBounds();
  const x = p.x - bounds.x;
  const y = p.y - bounds.y;
  const inside = x >= 0 && y >= 0 && x < bounds.width && y < bounds.height;
  if (!inside) {
    if (!cursorOverWindow) return;
    cursorOverWindow = false;
    publishCursor(x, y);
    return;
  }
  cursorOverWindow = true;
  publishCursor(x, y);
}

function startCursorProbe(): void {
  if (cursorTimer) return;
  cursorTimer = setInterval(probeCursor, 16);
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
    win.setIgnoreMouseEvents(true, { forward: true });
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
  const size = Math.round(nextSize);
  petWindowSize = size;
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  if (bounds.width === size && bounds.height === size) return;
  const nx = Math.round(bounds.x + bounds.width / 2 - size / 2);
  const ny = Math.round(bounds.y + bounds.height - size);
  win.setBounds({ x: nx, y: ny, width: size, height: size });
  lastPlacedX = nx;
  lastPlacedY = ny;
}

export function syncPetToWorkArea(): void {
  const win = getPetWindow();
  if (!win || win.isDestroyed() || dragTimer) return;
  const size = win.getBounds().width || petWindowSize;
  const [wx, wy] = win.getPosition();
  const wa = getWorkArea(windowCenter(wx, wy, size));
  const pos = pinToFloor(wx, wa, size);
  movePetWindow(pos.x, wy);
  if (win.webContents.isLoading()) return;
  win.webContents.send(IPC.WORK_AREA_CHANGED, {
    x: pos.x,
    y: pos.y,
    workArea: { x: wa.x, y: wa.y, width: wa.width, height: wa.height },
  });
}

function bindDisplayListeners(): void {
  if (displayListenersBound) return;
  displayListenersBound = true;
  screen.on('display-metrics-changed', () => syncPetToWorkArea());
  screen.on('display-added', () => syncPetToWorkArea());
  screen.on('display-removed', () => syncPetToWorkArea());
}

export function getWorkArea(point?: { x: number; y: number }): WorkArea {
  const display = point
    ? screen.getDisplayNearestPoint(point)
    : screen.getPrimaryDisplay();
  return display.workArea;
}
