import * as path from 'path';

export function projectRoot(): string {
  return path.join(__dirname, '..', '..');
}

export function rendererHtml(name: 'index.html' | 'settings.html'): string {
  return path.join(__dirname, '..', 'renderer', name);
}

export function iconFile(): string {
  return path.join(projectRoot(), 'src', 'assets', 'icons', 'jimothy-1024.png');
}

export function spritesDir(): string {
  return path.join(projectRoot(), 'src', 'assets', 'sprites');
}

export function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  if (normalized.startsWith('/')) {
    return `file://${normalized}`;
  }
  return normalized;
}
