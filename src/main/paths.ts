import * as path from 'path';

export function projectRoot(): string {
  return path.join(__dirname, '..', '..');
}

export function rendererDir(): string {
  return path.join(__dirname, '..', 'renderer');
}

export function assetsDir(): string {
  return path.join(projectRoot(), 'src', 'assets');
}

export function iconFile(): string {
  return path.join(assetsDir(), 'icons', 'jimothy-1024.png');
}
