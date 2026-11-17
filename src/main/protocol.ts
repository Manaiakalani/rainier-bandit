import { protocol } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { CONTENT_SECURITY_POLICY } from '../shared/csp';
import { APP_SCHEME, fileForAppUrl } from './app-url';
import { assetsDir, rendererDir } from './paths';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8',
};

export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function installAppProtocol(): void {
  protocol.handle(APP_SCHEME, (request) => {
    try {
      return serveAppUrl(request.url);
    } catch (err) {
      console.error('Failed to serve', request.url, err);
      return new Response('Internal error', { status: 500 });
    }
  });
}

function serveAppUrl(rawUrl: string): Response {
  const file = fileForAppUrl(rawUrl, { renderer: rendererDir(), assets: assetsDir() });
  if (!file) return new Response('Forbidden', { status: 403 });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response('Forbidden', { status: 403 });

  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!stat.isFile()) return new Response('Not found', { status: 404 });

  const data = fs.readFileSync(file);
  const headers = new Headers({
    'Content-Type': type,
    'Content-Length': String(data.byteLength),
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  return new Response(new Uint8Array(data), { status: 200, headers });
}
