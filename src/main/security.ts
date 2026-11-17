import { BrowserWindow, session, type WebContents, type WebFrameMain } from 'electron';
import * as path from 'path';
import { isAppUrl } from './app-url';
import { isDev } from './platform';

export function installSessionGuards(): void {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);
}

export function isTrustedSender(sender: WebContents, frame: WebFrameMain | null): boolean {
  const url = frame?.url || sender.getURL();
  if (!isAppUrl(url)) return false;
  if (frame?.parent) return false;
  const main = sender.mainFrame;
  if (frame && main && (frame.processId !== main.processId || frame.routingId !== main.routingId)) {
    return false;
  }
  const win = BrowserWindow.fromWebContents(sender);
  return Boolean(win && !win.isDestroyed());
}

function isAllowedNavigation(url: string): boolean {
  return isAppUrl(url) || url.startsWith('devtools://') || url.startsWith('chrome-devtools://');
}

export function hardenContents(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('devtools://') || url.startsWith('chrome-devtools://')) {
      return { action: 'allow' };
    }
    return { action: 'deny' };
  });

  const guard = (event: { preventDefault: () => void; url: string }): void => {
    if (!isAllowedNavigation(event.url)) event.preventDefault();
  };
  contents.on('will-navigate', guard);
  contents.on('will-redirect', guard);
  contents.on('will-frame-navigate', guard);
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  contents.on('console-message', (event) => {
    if (!isDev() && event.level !== 'warning' && event.level !== 'error') return;
    const line = `[renderer] ${event.message}`;
    if (event.level === 'error' || event.level === 'warning') {
      console.error(line);
      return;
    }
    console.log(line);
  });
}

function baseWebPreferences(): Electron.WebPreferences {
  return {
    preload: path.join(__dirname, '..', 'preload', 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    navigateOnDragDrop: false,
    spellcheck: false,
  };
}

export function petWebPreferences(): Electron.WebPreferences {
  return { ...baseWebPreferences(), backgroundThrottling: false };
}

export function settingsWebPreferences(): Electron.WebPreferences {
  return baseWebPreferences();
}
