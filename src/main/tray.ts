import { Menu, Tray, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { IPC } from '../shared/constants';
import type { PetScale, SpriteStyle, WalkPace } from '../shared/types';
import { getSettings, updateSettings } from './settings';
import { openSettingsWindow } from './settings-window';
import { getIsNapping, getIsPaused, onChromeChange, requestQuit } from './app-state';
import { togglePetNap, togglePetPause } from './pause';
import { iconFile } from './paths';
import { trayIconSize } from './platform';
import { getPetWindow, resetPetPosition, showPetWindow } from './window';

let tray: Tray | null = null;

function statusLine(): string {
  const hidden = isHidden();
  if (hidden) return 'Jimothy is hiding';
  if (getIsPaused()) return 'Jimothy is paused';
  if (getIsNapping()) return 'Jimothy is napping';
  if (getSettings().roaming) return 'Jimothy is roaming';
  return 'Jimothy is hanging out';
}

function isHidden(): boolean {
  const win = getPetWindow();
  return !win || win.isDestroyed() || !win.isVisible();
}

function petHim(): void {
  const win = getPetWindow();
  if (!win || win.isDestroyed()) {
    showPetWindow();
    return;
  }
  if (!win.isVisible()) win.show();
  win.webContents.send(IPC.PET_REACTION);
}

function buildTrayMenu(): Menu {
  const settings = getSettings();
  const hidden = isHidden();
  const roaming = settings.roaming;

  const template: MenuItemConstructorOptions[] = [
    { label: statusLine(), enabled: false },
    { type: 'separator' },
    {
      label: hidden ? 'Show Jimothy' : 'Hide Jimothy',
      click: () => {
        const current = getPetWindow();
        if (current && !current.isDestroyed() && current.isVisible()) {
          current.hide();
        } else {
          showPetWindow();
        }
        refreshTrayMenu();
      },
    },
    {
      label: 'Pet Jimothy',
      click: () => petHim(),
    },
    { type: 'separator' },
    {
      label: 'Outfit',
      submenu: [
        {
          label: 'Jacket',
          type: 'radio',
          checked: settings.spriteStyle === 'jacketed',
          click: () => updateSettings({ spriteStyle: 'jacketed' as SpriteStyle }),
        },
        {
          label: 'No jacket',
          type: 'radio',
          checked: settings.spriteStyle === 'non-jacketed',
          click: () => updateSettings({ spriteStyle: 'non-jacketed' as SpriteStyle }),
        },
      ],
    },
    {
      label: 'Size',
      submenu: [
        {
          label: 'Small',
          type: 'radio',
          checked: settings.petScale === 'small',
          click: () => updateSettings({ petScale: 'small' as PetScale }),
        },
        {
          label: 'Medium',
          type: 'radio',
          checked: settings.petScale === 'medium',
          click: () => updateSettings({ petScale: 'medium' as PetScale }),
        },
        {
          label: 'Large',
          type: 'radio',
          checked: settings.petScale === 'large',
          click: () => updateSettings({ petScale: 'large' as PetScale }),
        },
      ],
    },
    {
      label: 'Roam around',
      type: 'checkbox',
      checked: roaming,
      click: () => {
        updateSettings({ roaming: !getSettings().roaming });
      },
    },
    {
      label: 'Pace',
      enabled: roaming,
      submenu: [
        {
          label: 'Slow',
          type: 'radio',
          checked: settings.pace === 'slow',
          click: () => updateSettings({ pace: 'slow' as WalkPace }),
        },
        {
          label: 'Normal',
          type: 'radio',
          checked: settings.pace === 'normal',
          click: () => updateSettings({ pace: 'normal' as WalkPace }),
        },
        {
          label: 'Brisk',
          type: 'radio',
          checked: settings.pace === 'brisk',
          click: () => updateSettings({ pace: 'brisk' as WalkPace }),
        },
      ],
    },
    {
      label: 'Talk',
      type: 'checkbox',
      checked: settings.speechBubbles,
      click: () => {
        updateSettings({ speechBubbles: !getSettings().speechBubbles });
      },
    },
    { type: 'separator' },
    {
      label: getIsPaused() ? 'Resume' : 'Pause',
      click: () => {
        togglePetPause();
      },
    },
    {
      label: getIsNapping() ? 'Wake up' : 'Take a nap',
      click: () => {
        togglePetNap();
      },
    },
    {
      label: 'Recenter',
      click: () => resetPetPosition(),
    },
    { type: 'separator' },
    {
      label: 'Settings…',
      click: () => openSettingsWindow(),
    },
    {
      label: 'Quit Jimothy',
      click: () => requestQuit(),
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createTrayIcon(): Electron.NativeImage {
  return nativeImage.createFromPath(iconFile()).resize({
    ...trayIconSize(),
    quality: 'best',
  });
}

export function createTray(): void {
  tray = new Tray(createTrayIcon());
  tray.setToolTip(statusLine());
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    if (process.platform === 'darwin') return;
    const win = getPetWindow();
    if (win && !win.isDestroyed() && win.isVisible()) {
      win.hide();
    } else {
      showPetWindow();
    }
    refreshTrayMenu();
  });
  onChromeChange(refreshTrayMenu);
}

export function refreshTrayMenu(): void {
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(buildTrayMenu());
    tray.setToolTip(statusLine());
  }
}
