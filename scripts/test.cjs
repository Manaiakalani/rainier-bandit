'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings, isPartialSettings } = require('../dist/shared/settings-normalize.js');
const { clamp, isSleepTime, wanderTuning } = require('../dist/shared/behavior-utils.js');
const { petBounds, restPosition, windowCenter } = require('../dist/shared/layout.js');
const { DEFAULT_SETTINGS, TASKBAR_TUCK, WINDOW_SIZE } = require('../dist/shared/constants.js');

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
