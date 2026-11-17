'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings, isPartialSettings } = require('../dist/shared/settings-normalize.js');
const { clamp, isSleepTime, wanderTuning } = require('../dist/shared/behavior-utils.js');
const { petBounds, pinToFloor, restPosition, windowCenter } = require('../dist/shared/layout.js');
const { allowsBreathingScale } = require('../dist/shared/breathing.js');
const { CONTENT_SECURITY_POLICY } = require('../dist/shared/csp.js');
const { DEFAULT_SETTINGS, IPC, TASKBAR_TUCK, WINDOW_SIZE } = require('../dist/shared/constants.js');
const { resolveInside } = require('../dist/main/safe-path.js');
const { fileForAppUrl, isAppUrl } = require('../dist/main/app-url.js');

const root = path.join(__dirname, '..');
const REQUIRED_ANIMS = ['idle', 'walk', 'run', 'paw_wave', 'sit', 'sleep', 'happy_bounce', 'startled'];

test('normalizeSettings fills defaults and coerces types', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ roaming: 1, wanderFrequency: 'hyper' }), {
    ...DEFAULT_SETTINGS,
    roaming: true,
    wanderFrequency: 'normal',
  });
  assert.equal(normalizeSettings({ greeted: 1 }).greeted, true);
  assert.equal(normalizeSettings(null).greeted, false);
  assert.equal(normalizeSettings({ spriteStyle: 'cape' }).spriteStyle, 'jacketed');
  assert.equal(normalizeSettings({ pace: 'brisk' }).pace, 'brisk');
  assert.equal(normalizeSettings({ opacity: 80 }).opacity, 80);
  assert.equal(normalizeSettings({ opacity: 12 }).opacity, 100);
  assert.equal(normalizeSettings({ petScale: 'large' }).petScale, 'large');
  assert.equal(normalizeSettings({ petScale: 'tiny' }).petScale, 'medium');
});

test('isPartialSettings rejects arrays and primitives', () => {
  assert.equal(isPartialSettings({ roaming: true }), true);
  assert.equal(isPartialSettings([]), false);
  assert.equal(isPartialSettings('nope'), false);
  assert.equal(isPartialSettings(null), false);
});

test('isSleepTime wraps overnight hours', () => {
  assert.equal(isSleepTime(22, 22, 7), true);
  assert.equal(isSleepTime(3, 22, 7), true);
  assert.equal(isSleepTime(7, 22, 7), false);
  assert.equal(isSleepTime(15, 22, 7), false);
});

test('wanderTuning falls back to normal', () => {
  assert.equal(wanderTuning('calm').walkChance, 0.25);
  assert.equal(wanderTuning('normal').restScale, 1);
});

test('layout helpers pin Jimothy to the work-area floor', () => {
  const wa = { x: 100, y: 50, width: 1000, height: 800 };
  const bounds = petBounds(wa);
  const rest = restPosition(wa);
  assert.equal(bounds.groundY, 50 + 800 - WINDOW_SIZE + TASKBAR_TUCK);
  assert.equal(rest.y, bounds.groundY);
  assert.equal(rest.x, Math.floor(100 + 1000 / 2 - WINDOW_SIZE / 2));
  assert.deepEqual(windowCenter(10, 20, 100), { x: 60, y: 70 });
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-2, 0, 10), 0);
});

test('pinToFloor keeps x on the display and drops y to the taskbar', () => {
  const wa = { x: 100, y: 50, width: 1000, height: 800 };
  const pinned = pinToFloor(1200, wa, WINDOW_SIZE);
  assert.equal(pinned.y, 50 + 800 - WINDOW_SIZE + TASKBAR_TUCK);
  assert.equal(pinned.x, 100 + 1000 - WINDOW_SIZE);
  assert.equal(pinToFloor(40, wa, WINDOW_SIZE).x, 100);
  const narrow = { x: 0, y: 0, width: 100, height: 400 };
  assert.equal(pinToFloor(80, narrow, WINDOW_SIZE).x, 0);
});

test('app urls stay inside the renderer and asset roots', () => {
  const roots = { renderer: '/tmp/renderer', assets: '/tmp/assets' };
  assert.equal(fileForAppUrl('jimothy://local/renderer/index.html', roots), path.normalize('/tmp/renderer/index.html'));
  assert.equal(
    fileForAppUrl('jimothy://local/assets/icons/jimothy-portrait.png', roots),
    path.normalize('/tmp/assets/icons/jimothy-portrait.png'),
  );
  assert.equal(fileForAppUrl('jimothy://local/assets/../../etc/passwd', roots), null);
  assert.equal(fileForAppUrl('jimothy://local/renderer/%2e%2e/%2e%2e/etc/passwd', roots), null);
  assert.equal(fileForAppUrl('jimothy://evil/assets/a.png', roots), null);
  assert.equal(fileForAppUrl('file:///etc/passwd', roots), null);
  assert.equal(fileForAppUrl('not a url', roots), null);
  assert.equal(isAppUrl('jimothy://local/renderer/index.html'), true);
  assert.equal(isAppUrl('https://example.com'), false);
  assert.equal(resolveInside('/tmp/assets', 'sprites/jacketed/idle.png'), path.normalize('/tmp/assets/sprites/jacketed/idle.png'));
  assert.equal(resolveInside('/tmp/assets', '../secrets.txt'), null);
  assert.equal(resolveInside('/tmp/assets', ''), null);
});

test('content security policy does not allow inline scripts or remote images', () => {
  assert.equal(CONTENT_SECURITY_POLICY.includes('unsafe-inline'), false);
  assert.equal(CONTENT_SECURITY_POLICY.includes('unsafe-eval'), false);
  assert.equal(CONTENT_SECURITY_POLICY.includes('file:'), false);
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /style-src 'self'/);
  for (const name of ['index.html', 'settings.html']) {
    const html = fs.readFileSync(path.join(root, 'src', 'renderer', name), 'utf8');
    assert.equal(html.includes('unsafe-inline'), false);
    assert.equal(html.includes('unsafe-eval'), false);
    assert.match(html, /script-src 'self'/);
    assert.match(html, /style-src 'self'/);
  }
});

test('ipc channel names are unique', () => {
  const values = Object.values(IPC);
  assert.equal(new Set(values).size, values.length);
});

test('live sprite strips match the manifest frame counts', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'renderer', 'sprite-manifest.json'), 'utf8'));
  const byStyle = new Map();
  for (const [key, entry] of Object.entries(manifest)) {
    assert.equal(entry.frameSize, 512, key);
    assert.ok(Array.isArray(entry.frameMs), key);
    assert.equal(entry.frameMs.length, entry.frameCount, key);
    assert.equal(entry.columns, entry.frameCount, key);
    const file = path.join(root, 'src', 'assets', 'sprites', entry.sheet);
    const size = pngSize(file);
    assert.equal(size.width, entry.frameSize * entry.frameCount, key);
    assert.equal(size.height, entry.frameSize, key);
    const names = byStyle.get(entry.style) ?? new Set();
    names.add(entry.name || key);
    byStyle.set(entry.style, names);
  }
  for (const style of ['jacketed', 'non-jacketed']) {
    const names = byStyle.get(style);
    assert.ok(names, style);
    for (const anim of REQUIRED_ANIMS) {
      assert.equal(names.has(anim), true, `${style} ${anim}`);
    }
  }
});

test('preload bundle stays on the contextBridge surface', () => {
  const preload = fs.readFileSync(path.join(root, 'dist', 'preload', 'preload.js'), 'utf8');
  assert.match(preload, /contextBridge/);
  assert.match(preload, /require\(["']electron["']\)/);
  assert.equal(preload.includes('child_process'), false);
  assert.equal(preload.includes('require("fs")'), false);
  assert.equal(preload.includes("require('fs')"), false);
  assert.equal(preload.includes('setImmediate'), false);
});

function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(24);
    assert.equal(fs.readSync(fd, buf, 0, 24, 0), 24);
    assert.equal(buf.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

test('breathing scale stays off for authored walk, run, and sleep', () => {
  assert.equal(allowsBreathingScale('idle', true, false), true);
  assert.equal(allowsBreathingScale('sit', true, false), true);
  assert.equal(allowsBreathingScale('paw_wave', true, false), true);
  assert.equal(allowsBreathingScale('walk', true, false), false);
  assert.equal(allowsBreathingScale('run', true, false), false);
  assert.equal(allowsBreathingScale('sleep', true, false), false);
  assert.equal(allowsBreathingScale('idle', false, false), false);
  assert.equal(allowsBreathingScale('idle', true, true), false);
  assert.equal(allowsBreathingScale(null, true, false), false);
});
