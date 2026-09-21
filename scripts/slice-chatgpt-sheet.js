'use strict';

const path = require('node:path');
const sharp = require('sharp');

const SIZE = 512;
const COLS = 8;
const ROWS = 8;
const SRC = process.argv[2]
  || 'C:\\Users\\manai\\Downloads\\ChatGPT Image Sep 19, 2026, 04_00_58 PM (2).png';
const OUT = path.join(__dirname, '..', 'src', 'assets', 'sprites', 'jacketed');

function isChecker(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  return lum > 208 && max - min < 10;
}

function keyChecker(data, width, height) {
  const stack = [];
  const seen = new Uint8Array(width * height);
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    stack.push(y * width + x);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    const p = i * 4;
    if (!isChecker(data[p], data[p + 1], data[p + 2])) continue;
    data[p + 3] = 0;
    const x = i % width;
    const y = (i - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

function keepLargest(data, width, height) {
  const n = width * height;
  const seen = new Int32Array(n);
  seen.fill(-1);
  const sizes = [];
  let best = 0;
  let bestSize = 0;
  const stack = [];
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
      const nbs = [x > 0 ? i - 1 : -1, x + 1 < width ? i + 1 : -1, y > 0 ? i - width : -1, y + 1 < height ? i + width : -1];
      for (const j of nbs) {
        if (j < 0 || seen[j] !== -1 || data[j * 4 + 3] < 20) continue;
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

function bboxOf(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 20) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
  return { minX, minY, maxX, maxY };
}

async function fitCell(raw, width, height, targetH) {
  keyChecker(raw, width, height);
  for (let pass = 0; pass < 3; pass++) {
    const drop = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const p = i * 4;
        if (raw[p + 3] < 20 || !isChecker(raw[p], raw[p + 1], raw[p + 2])) continue;
        const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1
          || raw[((y) * width + x - 1) * 4 + 3] < 20
          || raw[((y) * width + x + 1) * 4 + 3] < 20
          || raw[((y - 1) * width + x) * 4 + 3] < 20
          || raw[((y + 1) * width + x) * 4 + 3] < 20;
        if (edge) drop.push(p);
      }
    }
    for (const p of drop) raw[p + 3] = 0;
  }
  keepLargest(raw, width, height);
  const box = bboxOf(raw, width, height);
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  let scale = targetH / bh;
  if (bw * scale > SIZE) scale = SIZE / bw;
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const cropped = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) {
    const srcStart = ((box.minY + y) * width + box.minX) * 4;
    cropped.set(raw.subarray(srcStart, srcStart + bw * 4), y * bw * 4);
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
      if (resized[si + 3] < 20) continue;
      const di = (dy * SIZE + dx) * 4;
      out[di] = resized[si];
      out[di + 1] = resized[si + 1];
      out[di + 2] = resized[si + 2];
      out[di + 3] = resized[si + 3];
    }
  }
  return out;
}

async function writeStrip(frames, dest) {
  const pngs = await Promise.all(frames.map((raw) =>
    sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer()));
  await sharp({
    create: {
      width: SIZE * pngs.length,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(pngs.map((input, i) => ({ input, left: i * SIZE, top: 0 }))).png().toFile(dest);
  console.log('wrote', dest, pngs.length);
}

(async () => {
  const img = sharp(SRC);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  console.log({ width: meta.width, height: meta.height });

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    cells[r] = [];
    for (let c = 0; c < COLS; c++) {
      const left = Math.round((c * meta.width) / COLS);
      const right = Math.round(((c + 1) * meta.width) / COLS);
      const top = Math.round((r * meta.height) / ROWS);
      const bottom = Math.round(((r + 1) * meta.height) / ROWS);
      const cellW = right - left;
      const cellH = bottom - top;
      const raw = Buffer.alloc(cellW * cellH * 4);
      for (let y = 0; y < cellH; y++) {
        const src = ((top + y) * info.width + left) * 4;
        raw.set(data.subarray(src, src + cellW * 4), y * cellW * 4);
      }
      const targetH = r === 6 ? 260 : r === 5 ? 430 : 490;
      cells[r][c] = await fitCell(raw, cellW, cellH, targetH);
    }
  }

  const idle = [cells[0][0], cells[0][1], cells[0][0], cells[0][1], cells[0][0], cells[0][1]];
  const blink = [cells[0][0], cells[0][2], cells[0][0]];
  const walk = cells[1];
  const run = cells[2];
  const paw = [cells[4][0], cells[4][2], cells[4][4], cells[4][6]];
  const sit = [cells[5][0], cells[5][2], cells[5][4], cells[5][7]];
  const sleep = [cells[6][0], cells[6][2], cells[6][4], cells[6][7]];
  const bounce = [cells[7][0], cells[7][2], cells[7][3], cells[7][4], cells[7][5], cells[7][0]];
  const startled = [cells[0][0], cells[3][4], cells[3][5], cells[0][0]];

  await writeStrip(idle, path.join(OUT, 'jimothy_idle.png'));
  await writeStrip(blink, path.join(OUT, 'jimothy_blink.png'));
  await writeStrip(walk, path.join(OUT, 'jimothy_walk.png'));
  await writeStrip(run, path.join(OUT, 'jimothy_run.png'));
  await writeStrip(paw, path.join(OUT, 'jimothy_paw_wave.png'));
  await writeStrip(sit, path.join(OUT, 'jimothy_sit.png'));
  await writeStrip(sleep, path.join(OUT, 'jimothy_sleep.png'));
  await writeStrip(bounce, path.join(OUT, 'jimothy_happy_bounce.png'));
  await writeStrip(startled, path.join(OUT, 'jimothy_startled.png'));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
