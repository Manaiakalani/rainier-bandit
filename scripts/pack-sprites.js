'use strict';

const path = require('node:path');
const sharp = require('sharp');

const SIZE = 512;
const IMG = path.join(
  process.env.USERPROFILE || '',
  '.grok',
  'sessions',
  'C%3A%5CUsers%5Cmanai',
  '01a09cdc-dc2b-7843-bd4e-1a5bb4ed52d8',
  'images',
);
const LOCK = path.join(__dirname, '..', 'src', 'assets', 'sprites', '_work', 'lock');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'sprites');

function isGreen(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return false;
  const s = (max - min) / max;
  const v = max / 255;
  let h = 0;
  const d = max - min;
  if (d !== 0) {
    if (max === g) h = 60 * ((b - r) / d + 2);
    else if (max === r) h = 60 * (((g - b) / d) % 6);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return s > 0.32 && v > 0.2 && h > 70 && h < 170;
}

function eatDarkHalo(data, width, height) {
  const drop = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (data[p + 3] < 20) continue;
      const max = Math.max(data[p], data[p + 1], data[p + 2]);
      if (max > 48) continue;
      const nbs = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      const nextToClear = nbs.some(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
        return data[(ny * width + nx) * 4 + 3] < 20;
      });
      if (nextToClear) drop.push(p);
    }
  }
  for (const p of drop) data[p + 3] = 0;
}

function isWhiteHalo(r, g, b) {
  return r > 232 && g > 232 && b > 232 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
}

function keyBuffer(data, width, height) {
  const alpha = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    alpha[i] = isGreen(r, g, b) || isWhiteHalo(r, g, b) ? 0 : 255;
  }

  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (alpha[i] === 0) stack.push(i);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  const seen = new Uint8Array(width * height);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    const x = i % width;
    const y = (i - x) / width;
    const p = i * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (!(isGreen(r, g, b) || isWhiteHalo(r, g, b))) continue;
    alpha[i] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    if (alpha[i] === 0) {
      data[p + 3] = 0;
      continue;
    }
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (g > r && g > b) {
      data[p + 1] = Math.max(r, b);
    }
    data[p + 3] = 255;
  }
}

function keepLargestBlob(data, width, height) {
  const n = width * height;
  const seen = new Int32Array(n);
  seen.fill(-1);
  const sizes = [];
  let best = 0;
  let bestSize = 0;
  const stack = [];
  const idx = (x, y) => y * width + x;
  for (let start = 0; start < n; start++) {
    if (data[start * 4 + 3] < 20 || seen[start] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(start);
    seen[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % width;
      const y = (i - x) / width;
      const nbs = [i - 1, i + 1, i - width, i + width];
      const ok = [x > 0, x + 1 < width, y > 0, y + 1 < height];
      for (let k = 0; k < 4; k++) {
        if (!ok[k]) continue;
        const j = nbs[k];
        if (seen[j] !== -1 || data[j * 4 + 3] < 20) continue;
        seen[j] = id;
        stack.push(j);
      }
    }
    sizes.push(size);
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }
  for (let i = 0; i < n; i++) {
    if (seen[i] !== best) data[i * 4 + 3] = 0;
  }
}

function bboxOf(data, width, height, minLuma = 0) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (data[p + 3] < 20) continue;
      const luma = 0.3 * data[p] + 0.59 * data[p + 1] + 0.11 * data[p + 2];
      if (luma < minLuma) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
  const pad = minLuma > 0 ? 6 : 0;
  return {
    minX: Math.max(0, minX - pad),
    minY: Math.max(0, minY - pad),
    maxX: Math.min(width - 1, maxX + pad),
    maxY: Math.min(height - 1, maxY + pad),
  };
}

async function loadRgba(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), width: info.width, height: info.height };
}

async function keyAndFit(filePath, targetH, opts = {}) {
  const src = await loadRgba(filePath);
  if (opts.chroma !== false) {
    keyBuffer(src.data, src.width, src.height);
    for (let i = 0; i < 4; i++) eatDarkHalo(src.data, src.width, src.height);
  }
  keepLargestBlob(src.data, src.width, src.height);
  const box = bboxOf(src.data, src.width, src.height, 30);
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  let scale = targetH / bh;
  if (bw * scale > SIZE) {
    scale = SIZE / bw;
  }
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const cropped = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) {
    const srcStart = ((box.minY + y) * src.width + box.minX) * 4;
    cropped.set(src.data.subarray(srcStart, srcStart + bw * 4), y * bw * 4);
  }
  const resized = await sharp(cropped, { raw: { width: bw, height: bh, channels: 4 } })
    .resize(dw, dh, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const out = Buffer.alloc(SIZE * SIZE * 4);
  const destX = Math.round((SIZE - dw) / 2);
  const destY = SIZE - 4 - dh;
  for (let y = 0; y < dh; y++) {
    const dy = destY + y;
    if (dy < 0 || dy >= SIZE) continue;
    for (let x = 0; x < dw; x++) {
      const dx = destX + x;
      if (dx < 0 || dx >= SIZE) continue;
      const si = (y * dw + x) * 4;
      const di = (dy * SIZE + dx) * 4;
      if (resized[si + 3] < 20) continue;
      out[di] = resized[si];
      out[di + 1] = resized[si + 1];
      out[di + 2] = resized[si + 2];
      out[di + 3] = resized[si + 3];
    }
  }
  return out;
}

async function pngBuffer(raw) {
  return sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
}

async function guideFrom(filePath, alreadyKeyed) {
  const src = await loadRgba(filePath);
  if (!alreadyKeyed) keyBuffer(src.data, src.width, src.height);
  const box = bboxOf(src.data, src.width, src.height);
  return {
    w: box.maxX - box.minX + 1,
    h: box.maxY - box.minY + 1,
    cx: (box.minX + box.maxX + 1) / 2,
    bottom: box.maxY + 1,
  };
}

async function writeStrip(frames, dest) {
  const canvases = await Promise.all(frames.map((raw) => pngBuffer(raw)));
  const strip = sharp({
    create: {
      width: SIZE * canvases.length,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(canvases.map((input, i) => ({ input, left: i * SIZE, top: 0 })));
  await strip.png().toFile(dest);
  console.log('wrote', dest, canvases.length, 'frames');
}

(async () => {
  const frontGuide = await guideFrom(path.join(LOCK, 'jimothy-front.png'), true);
  const frontH = frontGuide.h;
  const sideH = 470;
  const lockFitted = await keyAndFit(path.join(LOCK, 'jimothy-front.png'), frontH, { chroma: false });

  const front = async (name) => keyAndFit(path.join(IMG, name), frontH);
  const side = async (name) => keyAndFit(path.join(IMG, name), sideH);

  const idle = [lockFitted, lockFitted, lockFitted, lockFitted, lockFitted, lockFitted];
  const blink = [lockFitted, await front('6.jpg'), await front('8.jpg')];
  const wave = [lockFitted, await front('7.jpg'), await front('10.jpg'), await front('7.jpg')];
  const sit = [
    lockFitted,
    await keyAndFit(path.join(IMG, '16.jpg'), frontH * 0.86),
    await keyAndFit(path.join(IMG, '11.jpg'), frontH * 0.74),
    await keyAndFit(path.join(IMG, '11.jpg'), frontH * 0.74),
  ];
  const bounce = [lockFitted, await front('21.jpg'), lockFitted, await front('21.jpg'), lockFitted, lockFitted];
  const startled = [lockFitted, await front('24.jpg'), await front('24.jpg'), lockFitted];

  async function seq(dir, start, end) {
    const frames = [];
    for (let i = start; i <= end; i++) {
      const file = path.join(dir, `f${String(i).padStart(3, '0')}.png`);
      frames.push(await keyAndFit(file, sideH));
    }
    return frames;
  }

  const walkDir = path.join(__dirname, '..', 'src', 'assets', 'sprites', '_work', 'walk-video');
  const runDir = path.join(__dirname, '..', 'src', 'assets', 'sprites', '_work', 'run-video');
  const walk = await seq(walkDir, 13, 20);
  const run = await seq(runDir, 9, 16);

  const jacketed = path.join(OUT, 'jacketed');
  await writeStrip(idle, path.join(jacketed, 'jimothy_idle.png'));
  await writeStrip(blink, path.join(jacketed, 'jimothy_blink.png'));
  await writeStrip(wave, path.join(jacketed, 'jimothy_paw_wave.png'));
  await writeStrip(sit, path.join(jacketed, 'jimothy_sit.png'));
  await writeStrip(bounce, path.join(jacketed, 'jimothy_happy_bounce.png'));
  await writeStrip(startled, path.join(jacketed, 'jimothy_startled.png'));
  await writeStrip(walk, path.join(jacketed, 'jimothy_walk.png'));
  await writeStrip(run, path.join(jacketed, 'jimothy_run.png'));

  const lockMeta = await sharp(path.join(LOCK, 'jimothy-front.png')).metadata();
  const crop = Math.min(412, lockMeta.height - 11);
  const iconSrc = await sharp(path.join(LOCK, 'jimothy-front.png'))
    .extract({ left: 50, top: 11, width: 412, height: crop })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .sharpen({ sigma: 1.1, m1: 0.8, m2: 0.4 })
    .png()
    .toFile(path.join(__dirname, '..', 'src', 'assets', 'icons', 'jimothy-1024.png'));
  console.log('wrote icon', iconSrc);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
