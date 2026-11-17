import { resolveInside } from './safe-path';

export const APP_SCHEME = 'jimothy';
export const APP_HOST = 'local';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export function rendererUrl(name: 'index.html' | 'settings.html'): string {
  return `${APP_ORIGIN}/renderer/${name}`;
}

export function isAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === `${APP_SCHEME}:` && parsed.hostname === APP_HOST;
  } catch {
    return false;
  }
}

export function fileForAppUrl(
  rawUrl: string,
  roots: { renderer: string; assets: string },
): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.hostname !== APP_HOST) return null;

  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  if (pathname.startsWith('/renderer/')) {
    return resolveInside(roots.renderer, pathname.slice('/renderer/'.length));
  }
  if (pathname.startsWith('/assets/')) {
    return resolveInside(roots.assets, pathname.slice('/assets/'.length));
  }
  return null;
}
