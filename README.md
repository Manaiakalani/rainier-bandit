# Jimothy, the Seattle Desktop Pet Raccoon for Windows and macOS

**Rainier Bandit.** The Emerald City's friendliest taskbar trash panda.

Jimothy is a free, open source Seattle desktop pet and raccoon companion for **Windows** and **macOS**. He is a desktop mascot and virtual pet who lives on your taskbar. He breathes, sits, naps, talks, and, if you let him, wanders the bottom of the screen. No dock takeover. No accounts. Just a raccoon on the desktop.

This repo is named Rainier Bandit, for the mountain, the beer, and the masked raccoon on the taskbar. Empty pixels are click-through, and the pet window stays unfocused, so the app you were using keeps the keyboard.

![Jimothy, a Seattle desktop pet raccoon companion, standing on a rainy desktop](docs/screenshots/desktop-puppeteer.png)

Made with &lt;3 in Seattle.

## How this taskbar pet stays put

![How Jimothy, a Seattle desktop pet raccoon, stays on the desktop: the menu bar and settings talk to the main process, the isolated jimothy bridge reaches the pet overlay, and the overlay draws 512px strips and a speech scrap on the taskbar](docs/diagrams/how-jimothy-stays.png)

You click him, or you use the menu bar. The menu and the settings card both talk to the main process, which keeps the always-on-top window and his settings file. Closing the card leaves him running. The overlay can reach the main process only through the isolated `jimothy` bridge. From there he plays the 512px strips, pins a paper scrap of speech over his head, and plants his feet on the taskbar. Empty pixels let the click fall through to the desktop. The pet window stays unfocused, so the app you were using keeps the keyboard.

The editable drawing is [`docs/diagrams/how-jimothy-stays.excalidraw`](docs/diagrams/how-jimothy-stays.excalidraw).

## Windows and macOS desktop pet features

- Desktop overlay raccoon (jacket or fur) with small, medium, or large size
- Idle fidgets, roam, nap from the tray, click to pet (wave, cheer, or jump)
- Speech bubbles, easter eggs, drag and drop, always-on-top click-through
- Native tray and menu bar controls (outfit, size, roam, pace, talk, pause, nap)
- Settings for look, movement, personality, and launch at login
- Windows NSIS installer and macOS DMG (build on each platform)

![Jimothy settings for the Seattle desktop raccoon companion on Windows and macOS](docs/screenshots/settings-playwright.png)

## Questions

### What is Jimothy?

Jimothy is a Seattle desktop pet raccoon for Windows and macOS. Rainier Bandit is this repository: a taskbar trash panda, desktop mascot, and virtual pet. He sits on the taskbar instead of climbing other windows.

### Is there a raccoon desktop pet for Windows?

Yes. Jimothy is an always-on-top Windows desktop pet. On Windows, `npm run dist:win` builds an NSIS installer. The tray icon controls outfit, size, roam, pace, talk, pause, nap, and quit.

### Is there a raccoon desktop pet for Mac?

Yes. Jimothy is a macOS desktop pet that lives in the menu bar. On a Mac, `npm run dist:mac` builds a DMG and a zip. The packaged app is an agent (`LSUIElement`): no Dock icon. A Developer ID signature and notarization keep Gatekeeper happy. Without those credentials the DMG still builds, and Gatekeeper blocks it until it is signed.

### Is this desktop pet free?

Yes. Jimothy is MIT licensed open source. The app has no accounts.

### Will the pet steal clicks or the keyboard?

No. Empty sprite pixels are click-through. The pet window stays unfocused, so your other app keeps the keyboard.

### Can the raccoon start at login?

Yes. Launch at login is in settings.

## Develop

Jimothy is a TypeScript Electron desktop pet. From a clone:

```bash
npm install
npm test
npm start
```

`npm run dev` is the same build with detached DevTools (`--dev`).

## Package

```bash
npm run dist:win    # NSIS installer, from Windows
npm run dist:mac    # DMG + zip, from macOS
```

macOS builds must be produced on a Mac. The packaged Mac app is an agent (`LSUIElement`): no dock icon, menu bar tray only. Packaging uses the Electron and electron-builder versions in `package.json`. The renderer is sandboxed, with context isolation on and Node integration off.

To sign and notarize a Mac build, set these before `npm run dist:mac`:

```
APPLE_ID
APPLE_APP_SPECIFIC_PASSWORD
APPLE_TEAM_ID
CSC_LINK                 # Developer ID .p12
CSC_KEY_PASSWORD
```

Without those credentials the DMG still builds. Gatekeeper will block it until a Developer ID signs it.

## Layout

```
src/main/          Electron main process
src/preload/       Isolated bridge
src/renderer/      Pet overlay + settings UI
src/shared/        Types, settings, layout math
src/assets/sprites Live jacketed + non-jacketed 512px sheets
```

Live action sheets are 512×512 cells (idle, walk, run, wave, sit, sleep, jump, celebrate). Walk and run play one gait cycle. `no_jacket/` is unused inventory.

## License

MIT. Jimothy does not ship game assets, CD keys, or anything that is not his own raccoon.
