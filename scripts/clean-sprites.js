'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'src', 'assets', 'sprites');
const STYLES = ['jacketed', 'non-jacketed'];
const LIVE = new Set([
  'idle.png', 'walk-right.png', 'run-right.png', 'wave.png',
  'sit.png', 'sleep.png', 'celebrate.png', 'jump.png',
]);

function keepLargest(data, width, height) {
  const n = width * height;
  const seen = new Int32Array(n);
  seen.fill(-1);
  const stack = [];
  let best = -1;
  let bestSize = 0;
  for (let start = 0; start < n; start++) {
    if (data[start * 4 + 3] < 24 || seen[start] !== -1) continue;
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
        if (j < 0 || seen[j] !== -1 || data[j * 4 + 3] < 24) continue;
        seen[j] = id;
        stack.push(j);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }
  if (best < 0) return;
  for (let i = 0; i < n; i++) {
    if (seen[i] !== best) data[i * 4 + 3] = 0;
  }
}

function cleanBuffer(data, width, height) {
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
    const a = data[p + 3];
    if (a === 0) continue;
    if (a < 40 || (a < 140 && lum < 28)) data[p + 3] = 0;
  }
  keepLargest(data, width, height);
}

async function cleanFile(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cell = 256;
  if (info.width % cell === 0 && info.height % cell === 0) {
    const cols = info.width / cell;
    const rows = info.height / cell;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = Buffer.alloc(cell * cell * 4);
        for (let y = 0; y < cell; y++) {
          const src = ((row * cell + y) * info.width + col * cell) * 4;
          tile.set(data.subarray(src, src + cell * 4), y * cell * 4);
        }
        cleanBuffer(tile, cell, cell);
        for (let y = 0; y < cell; y++) {
          const dest = ((row * cell + y) * info.width + col * cell) * 4;
          data.set(tile.subarray(y * cell * 4, y * cell * 4 + cell * 4), dest);
        }
      }
    }
  } else {
    cleanBuffer(data, info.width, info.height);
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(filePath);
  console.log('cleaned', path.relative(ROOT, filePath));
}

async function writePortrait() {
  const idle = path.join(ROOT, 'jacketed', 'idle.png');
  const cell = await sharp(idle).extract({ left: 0, top: 0, width: 256, height: 256 }).ensureAlpha().png().toBuffer();
  const { data, info } = await sharp(cell).raw().toBuffer({ resolveWithObject: true });
  let minX = 256, minY = 256, maxX = 0, maxY = 0;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      if (data[(y * 256 + x) * 4 + 3] < 32) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const pad = 12;
  const extract = {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(256, maxX + pad) - Math.max(0, minX - pad),
    height: Math.min(256, maxY + pad) - Math.max(0, minY - pad),
  };
  const cropped = await sharp(cell).extract(extract).png().toBuffer();
  const iconDir = path.join(__dirname, '..', 'src', 'assets', 'icons');
  const square = (size) => sharp(cropped)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png();
  await square(256).toFile(path.join(iconDir, 'jimothy.png'));
  await square(1024).toFile(path.join(iconDir, 'jimothy-1024.png'));
  console.log('portrait', extract);
}

(async () => {
  for (const style of STYLES) {
    const dir = path.join(ROOT, style);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!LIVE.has(name)) continue;
      await cleanFile(path.join(dir, name));
    }
  }
  await writePortrait();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
