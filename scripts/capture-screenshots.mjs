/**
 * Capture README screenshots.
 * Playwright: Settings window
 * Puppeteer: desktop companion mock
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const settingsFile = path.join(root, 'dist', 'renderer', 'settings.html');
const petFile = path.join(root, 'docs', 'preview', 'pet-desktop.html');

function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

async function captureSettingsWithPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 460, height: 900 } });
  await page.addInitScript(() => {
    window.jimothy = {
      getSettings: async () => ({
        roaming: true,
        wanderFrequency: 'calm',
        breathing: true,
        speechBubbles: true,
        sleepAtNight: true,
        launchAtLogin: false,
        greeted: true,
        spriteStyle: 'jacketed',
        pace: 'slow',
        clickAction: 'paw_wave',
        opacity: 100,
        petScale: 'medium',
      }),
      getAppInfo: async () => ({ version: '1.0.0', platform: 'win32' }),
      getPauseState: async () => false,
      updateSettings: async (partial) => partial,
      onSettingsChanged() {},
      onTogglePause() {},
      resetPosition() {},
      togglePause() {},
    };
  });
  await page.goto(toFileUrl(settingsFile), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const dest = path.join(outDir, 'settings-playwright.png');
  await page.screenshot({ path: dest, fullPage: true });
  await browser.close();
  console.log('playwright', dest);
}

async function capturePetWithPuppeteer() {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(toFileUrl(petFile), { waitUntil: 'networkidle0' });
  await page.waitForSelector('.jimothy');
  const dest = path.join(outDir, 'desktop-puppeteer.png');
  await page.screenshot({ path: dest, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await browser.close();
  console.log('puppeteer', dest);
}

async function main() {
  if (!fs.existsSync(settingsFile)) {
    throw new Error('dist/renderer/settings.html missing — run npm run build first');
  }
  await captureSettingsWithPlaywright();
  await capturePetWithPuppeteer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
