# Jimothy

Jimothy is a desktop companion: a small raccoon who stands on the taskbar (Windows) or desktop edge (macOS), idles, wanders, and talks in short bubbles. He is not a productivity suite and not a chat product. He is a pet.

## Audience

People who want a living thing on their desktop without another always-on-top utility chrome. One person, one machine, local only.

## Purpose

Keep company. Click him, drag him, let him roam, or tell him to nap. Settings exist so he can be quiet, still, or present at login — never so he becomes a control panel.

## Operating context

- Native overlay window, always on top, click-through except on opaque sprite pixels.
- Lives in the tray / menu bar. Closing the settings window must not quit him. Quit is explicit.
- Windows and macOS. No account, no network, no telemetry.
- Ambient light: a real desktop, mixed light and dark OS themes, often sitting on a busy wallpaper. Speech and settings must read against that, not against a designed marketing page.

## Constraints

- Sprite identity is locked to the jacketed production idle: round chibi raccoon, black zip-up, cream muzzle, ringed tail. `non-jacketed` is the same body without the zip-up.
- Live action sheets are 8-pose 512px strips (idle, walk, run, wave, sit, sleep, jump, celebrate) in `src/assets/sprites/jacketed/` and `non-jacketed/`. The engine plays authored `frameMs` timings.
- Must never steal keyboard focus from the foreground app when idle.
- Must remain usable with reduced motion, keyboard-only settings, and OS light/dark.

## Voice

Warm, short, a little mischievous. No corporate UI copy. He rummages. He wants snacks. He has opinions about Seattle weather.

## Evidence

The character model and palette live in `jimothy-sprite-generation-prompt.md`. The live art is `src/assets/sprites/{jacketed,non-jacketed}/` plus `src/assets/icons/jimothy-portrait.png`. Windows and macOS are both first-class: overlay + tray (menu bar on Mac, `LSUIElement`, no dock icon).
