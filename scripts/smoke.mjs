import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jimothy-smoke-'));
const artifacts = process.env.JIMOTHY_SMOKE_DIR || path.join(os.tmpdir(), 'jimothy-smoke-artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const app = await electron.launch({
  args: [root],
  cwd: root,
  env: {
    ...process.env,
    JIMOTHY_USER_DATA: userData,
  },
  timeout: 60000,
});

function petOf(windows) {
  return windows.find((win) => win.url.includes('/renderer/index.html')) ?? null;
}

try {
  const page = await app.firstWindow();
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[page ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.error('[pageerror]', err);
  });

  const waitFor = (fn, timeout = 20000) => page.waitForFunction(fn, undefined, { timeout });

  await waitFor(() => typeof window.jimothy?.getSettings === 'function');
  await waitFor(() => {
    const bubble = document.getElementById('speech-bubble');
    return bubble?.textContent?.includes("Hi! I'm Jimothy.") === true;
  });
  await waitFor(() => {
    const canvas = document.getElementById('pet-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 20) opaque += 1;
    }
    return opaque > 40;
  });

  const firstFrame = await page.evaluate(() => {
    const canvas = document.getElementById('pet-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    let corner = 0;
    const stride = canvas.width * 4;
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const alpha = data[y * stride + x * 4 + 3];
        if (alpha > 20) opaque += 1;
      }
    }
    corner = data[3];
    return {
      opaque,
      corner,
      width: canvas.width,
      focused: document.hasFocus(),
      greeting: document.getElementById('speech-bubble')?.textContent ?? '',
    };
  });
  assert.equal(firstFrame.greeting.includes("Hi! I'm Jimothy."), true);
  assert.ok(firstFrame.opaque > 40, `sprite did not draw (${firstFrame.opaque} opaque samples)`);
  assert.equal(firstFrame.corner, 0, 'top-left pixel should stay click-through');

  const windows = await app.evaluate(async ({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().map((win) => {
      const prefs = win.webContents.getLastWebPreferences();
      return {
        title: win.getTitle(),
        url: win.webContents.getURL(),
        focusable: win.isFocusable(),
        focused: win.isFocused(),
        alwaysOnTop: win.isAlwaysOnTop(),
        visible: win.isVisible(),
        background: win.getBackgroundColor(),
        contextIsolation: prefs.contextIsolation,
        nodeIntegration: prefs.nodeIntegration,
        sandbox: prefs.sandbox,
        webSecurity: prefs.webSecurity,
      };
    });
  });
  const pet = petOf(windows);
  assert.ok(pet, `missing pet window: ${JSON.stringify(windows)}`);
  assert.equal(pet.url.startsWith('jimothy://local/renderer/index.html'), true);
  assert.equal(pet.focusable, false);
  assert.equal(pet.focused, false);
  assert.equal(pet.alwaysOnTop, true);
  assert.equal(pet.visible, true);
  assert.equal(pet.contextIsolation, true);
  assert.equal(pet.nodeIntegration, false);
  assert.equal(pet.sandbox, true);
  assert.equal(pet.webSecurity, true);

  const probe = await app.evaluate(async ({ BrowserWindow }) => {
    const win = new BrowserWindow({
      width: 420,
      height: 220,
      show: true,
      title: 'Focus probe',
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    await win.loadURL('data:text/html,<title>Focus probe</title><input id="field" autofocus>');
    win.focus();
    win.webContents.focus();
    return { focused: win.isFocused(), title: win.getTitle() };
  });
  assert.equal(probe.focused, true, 'a normal window should be able to take focus');

  const petAfterProbe = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((item) => item.webContents.getURL().includes('/renderer/index.html'));
    return win ? { focusable: win.isFocusable(), focused: win.isFocused() } : null;
  });
  assert.deepEqual(petAfterProbe, { focusable: false, focused: false });

  const frameSignature = () => page.evaluate(() => {
    const canvas = document.getElementById('pet-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let i = 0; i < data.length; i += 16) {
      hash ^= data[i];
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  });
  const beforeClick = await frameSignature();
  const canvasBox = await page.locator('#pet-canvas').boundingBox();
  assert.ok(canvasBox);
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height * 0.62);
  await page.waitForTimeout(220);
  const afterClick = await frameSignature();
  assert.notEqual(afterClick, beforeClick, 'clicking Jimothy should play a pose');
  const stillIdleFocus = await app.evaluate(({ BrowserWindow }) => {
    const petWindow = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('/renderer/index.html'));
    return petWindow ? { focusable: petWindow.isFocusable(), focused: petWindow.isFocused() } : null;
  });
  assert.deepEqual(stillIdleFocus, { focusable: false, focused: false });
  await page.screenshot({ path: path.join(artifacts, 'jimothy-pet.png') });

  const saved = await page.evaluate(async () => {
    const next = await window.jimothy.updateSettings({ speechBubbles: false, roaming: true, pace: 'slow' });
    return { speechBubbles: next.speechBubbles, roaming: next.roaming };
  });
  assert.deepEqual(saved, { speechBubbles: false, roaming: true });

  await page.evaluate(() => window.jimothy.openSettings());
  await page.waitForTimeout(500);
  const settingsPage = app.windows().find((win) => win.url().includes('settings.html'));
  assert.ok(settingsPage, 'settings window did not open');
  await settingsPage.waitForSelector('#settings-form');
  const version = await settingsPage.locator('#versionLine').textContent();
  assert.match(version, /Jimothy/);
  await settingsPage.screenshot({ path: path.join(artifacts, 'jimothy-settings.png') });

  const focusWhileSettings = await app.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().map((win) => ({
      url: win.webContents.getURL(),
      focusable: win.isFocusable(),
      focused: win.isFocused(),
    }));
  });
  const petDuringSettings = focusWhileSettings.find((win) => win.url.includes('/renderer/index.html'));
  const settingsDuring = focusWhileSettings.find((win) => win.url.includes('settings.html'));
  assert.equal(petDuringSettings?.focusable, false);
  assert.equal(petDuringSettings?.focused, false);
  assert.equal(settingsDuring?.focused, true);

  await settingsPage.locator('#resetPosition').click();
  await settingsPage.locator('#pauseBtn').click();
  await settingsPage.waitForFunction(
    () => document.getElementById('pauseBtn')?.textContent === 'Resume',
    undefined,
    { timeout: 5000 },
  );

  await app.evaluate(({ BrowserWindow }) => {
    const settings = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('settings.html'));
    settings?.close();
  });
  await page.waitForTimeout(200);
  const afterSettings = await app.evaluate(({ BrowserWindow, app: electronApp }) => {
    const urls = BrowserWindow.getAllWindows().map((win) => win.webContents.getURL());
    return { urls, quitting: electronApp.isQuitting?.() ?? false };
  });
  assert.equal(afterSettings.urls.some((url) => url.includes('settings.html')), false);
  assert.equal(afterSettings.urls.some((url) => url.includes('/renderer/index.html')), true);

  await app.evaluate(({ BrowserWindow }) => {
    const petWindow = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('/renderer/index.html'));
    petWindow?.close();
  });
  const hidden = await app.evaluate(({ BrowserWindow }) => {
    const petWindow = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().includes('/renderer/index.html'));
    return petWindow ? { exists: true, visible: petWindow.isVisible() } : { exists: false, visible: false };
  });
  assert.deepEqual(hidden, { exists: true, visible: false });

  console.log(`smoke ok; screenshots in ${artifacts}`);
} catch (err) {
  try {
    const failed = await app.firstWindow();
    console.error('page url', failed.url());
    console.error(await failed.content());
  } catch (dumpErr) {
    console.error('could not dump page', dumpErr);
  }
  throw err;
} finally {
  await app.close();
  fs.rmSync(userData, { recursive: true, force: true });
}
