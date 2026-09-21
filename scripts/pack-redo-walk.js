'use strict';

const path = require('node:path');
const sharp = require('sharp');

const SIZE = 256;
const FRAMES = 8;
const SRC_ROOT = path.join(
  'C:/Users/manai/Downloads/Jimothy-Desktop-Sprite-Pack-Redo/jimothy-desktop-pack/animation-sheets',
);
const DST_ROOT = path.join(__dirname, '..', 'src', 'assets', 'sprites');

function matte(data, width, height) {
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
    const a = data[p + 3];
    if (lum < 16 || a < 48 || (a < 160 && lum < 28)) data[p + 3] = 0;
  }
  const n = width * height;
  const seen = new Int32Array(n);
  seen.fill(-1);
  const stack = [];
  let best = -1;
  let bestSize = 0;
  for (let start = 0; start < n; start++) {
    if (data[start * 4 + 3] < 20 || seen[start] !== -1) continue;
    const id = start;
    let size = 0;
    stack.push(start);
    seen[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % width;
      const y = (i - x) / width;
      const nbs = [x > 0 ? i - 1 : -1, x + 1 < width ? i + 1 : -1, y > 0 ? i - width : -1, y + 1 < height ? i + width : -1];
      for (const j of nbs) {
        if (j < 0 || seen[j] !== -1 || data[j * 4 + 3] < 20) continue;
        seen[j] = id;
        stack.push(j);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }
  for (let i = 0; i < n; i++) {
    if (seen[i] !== best) data[i * 4 + 3] = 0;
  }
}

function bboxOf(data, width, height) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
  return { minX, minY, maxX, maxY };
}

async function idleGuide(style) {
  const p = path.join(DST_ROOT, style, 'idle.png');
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const raw = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    raw.set(data.subarray(y * info.width * 4, y * info.width * 4 + SIZE * 4), y * SIZE * 4);
  }
  const box = bboxOf(raw, SIZE, SIZE);
  return { h: box.maxY - box.minY + 1, bottom: box.maxY + 1 };
}

async function fitFrame(raw, width, height, guide) {
  matte(raw, width, height);
  const box = bboxOf(raw, width, height);
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  let scale = guide.h / bh;
  if (bw * scale > SIZE - 8) scale = (SIZE - 8) / bw;
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const cropped = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) {
    const src = ((box.minY + y) * width + box.minX) * 4;
    cropped.set(raw.subarray(src, src + bw * 4), y * bw * 4);
  }
  const resized = await sharp(cropped, { raw: { width: bw, height: bh, channels: 4 } })
    .resize(dw, dh, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const out = Buffer.alloc(SIZE * SIZE * 4);
  const destX = Math.round((SIZE - dw) / 2);
  const destY = guide.bottom - dh;
  for (let y = 0; y < dh; y++) {
    const dy = destY + y;
    if (dy < 0 || dy >= SIZE) continue;
    for (let x = 0; x < dw; x++) {
      const dx = destX + x;
      if (dx < 0 || dx >= SIZE) continue;
      const si = (y * dw + x) * 4;
      if (resized[si + 3] < 16) continue;
      const di = (dy * SIZE + dx) * 4;
      out[di] = resized[si];
      out[di + 1] = resized[si + 1];
      out[di + 2] = resized[si + 2];
      out[di + 3] = resized[si + 3];
    }
  }
  return out;
}

async function packSheet(srcPath, destPath, guide) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    const left = Math.round((i * info.width) / FRAMES);
    const right = Math.round(((i + 1) * info.width) / FRAMES);
    const w = right - left;
    const raw = Buffer.alloc(w * info.height * 4);
    for (let y = 0; y < info.height; y++) {
      raw.set(data.subarray((y * info.width + left) * 4, (y * info.width + right) * 4), y * w * 4);
    }
    frames.push(await fitFrame(raw, w, info.height, guide));
  }
  const pngs = await Promise.all(frames.map((raw) =>
    sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer()));
  await sharp({
    create: {
      width: SIZE * FRAMES,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(pngs.map((input, i) => ({ input, left: i * SIZE, top: 0 }))).png().toFile(destPath);
  console.log('wrote', destPath);
}

(async () => {
  const jobs = [
    ['jacketed/walk-right.png', 'jacketed/walk-right.png'],
    ['jacketed/run-right.png', 'jacketed/run-right.png'],
    ['non-jacketed/walk-right.png', 'non-jacketed/walk-right.png'],
    ['non-jacketed/run-right.png', 'non-jacketed/run-right.png'],
  ];
  const jacketed = await idleGuide('jacketed');
  const natural = await idleGuide('non-jacketed');
  console.log('guides', { jacketed, natural });
  for (const [src, dest] of jobs) {
    const guide = src.startsWith('non-jacketed') ? natural : jacketed;
    await packSheet(path.join(SRC_ROOT, src), path.join(DST_ROOT, dest), guide);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
