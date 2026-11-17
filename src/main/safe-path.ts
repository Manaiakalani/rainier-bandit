import * as path from 'path';

/** Resolve `rel` inside `root`, or return null when it would escape. */
export function resolveInside(root: string, rel: string): string | null {
  if (!rel || rel.includes('\0')) return null;
  const segments = rel.split(/[/\\]+/).filter((part) => part.length > 0);
  if (segments.length === 0) return null;
  if (segments.some((part) => part === '.' || part === '..')) return null;
  const rootNorm = path.resolve(root);
  const file = path.resolve(rootNorm, ...segments);
  const relToRoot = path.relative(rootNorm, file);
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) return null;
  return file;
}
