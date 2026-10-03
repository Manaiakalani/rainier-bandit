/**
 * Capture a short README gif of Jimothy on a rainy desktop.
 * Puppeteer steps the preview page. ffmpeg packs the frames.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const preview = path.join(root, 'docs', 'preview', 'pet-gif.html');
const dest = path.join(root, 'docs', 'screenshots', 'jimothy-drizzle.gif');
const fps = 10;
const durationMs = 4200;
const frameCount = Math.round((durationMs / 1000) * fps);
const width = 800;
const height = 450;

function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} exited ${result.status}`);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jimothy-gif-'));
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(toFileUrl(preview), { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.spritesReady === true);
    for (let i = 0; i < frameCount; i++) {
      const t = Math.round((i * 1000) / fps);
      await page.evaluate((ms) => window.renderAt(ms), t);
      const file = path.join(tmp, `frame-${String(i).padStart(3, '0')}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
    }
  } finally {
    await browser.close();
  }

  const palette = path.join(tmp, 'palette.png');
  run('ffmpeg', [
    '-y',
    '-framerate', String(fps),
    '-i', path.join(tmp, 'frame-%03d.png'),
    '-vf', 'palettegen=stats_mode=diff:max_colors=80',
    '-update', '1',
    palette,
  ]);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run('ffmpeg', [
    '-y',
    '-framerate', String(fps),
    '-i', path.join(tmp, 'frame-%03d.png'),
    '-i', palette,
    '-lavfi', 'paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
    '-loop', '0',
    dest,
  ]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const bytes = fs.statSync(dest).size;
  console.log('gif', dest, bytes);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
