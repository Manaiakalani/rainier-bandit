# Jimothy visual world

Jimothy is a paper raccoon on a real desktop, not a SaaS panel. The overlay is invisible except for him. The settings window is a small companion card in cream and walnut, tinted for dark mode, never cool gray and never product-blue.

## Surfaces

| Surface | Mode | Job |
|---|---|---|
| Pet overlay | Experience | The raccoon *is* the interface. No chrome. Speech is a paper scrap above his head. |
| Settings window | Operate | Scan, toggle, leave. Native window chrome. One column, grouped rows. |
| Tray / menu bar | Operate | Show, hide, pet, outfit, roam, pace, talk, pause, nap, recenter, settings, quit. Native menus, no emoji-as-icons. |

## Palette

Pulled from the character, not from a dashboard kit.

| Token | Light | Dark | Role |
|---|---|---|---|
| Paper | `#f6f0e6` | `#1c1916` | Window ground |
| Cream | `#faf6ee` | `#2a2520` | Grouped rows, speech fill |
| Ink | `#2c2420` | `#f3ead8` | Primary text |
| Ink soft | `#5a4d43` | `#c4b8a8` | Secondary text (tinted, never gray) |
| Rule | `#d8cbb8` | `#3f3830` | Hairline separators |
| Amber | `#8b5e3c` | `#c48a5a` | Eyes, accent, switches, actions |
| Speech border | `#4a3728` | same | Matches the mask, not `#000` |

No purple, no Inter, no nested cards, no bounce easing.

## Type

Native stacks with a slightly friendlier installed face, not a downloaded display font:

`Avenir Next, Segoe UI Variable, Segoe UI, Trebuchet MS, sans-serif`

Settings hierarchy: name (1.25rem / 650) → section labels (11px uppercase, letterspaced) → row labels (15px) → descriptions (12px, ink-soft).

## Motion

Idle, walk, run, and sleep are authored loops. Wave, sit, jump, and celebrate play once (sit holds the last pose). With breathing on, idle and those short poses take a slight vertical scale. Walk, run, and sleep do not, so the authored motion stays clean. Speech eases in 180ms ease-out, no elastic. `prefers-reduced-motion` kills extra motion.

## Sprite contract

- Format: `web_grid_512` horizontal strips, 512×512 cells, standing feet on source row 470, drawn so those feet sit on the canvas floor.
- Live styles: `jacketed` and `non-jacketed` share one body. `no_jacket/` is unused inventory.
- Hit-testing reads the post-render alpha mask so click-through matches what is on screen.

## Anti-references

Generic iOS-settings blue toggles. White speech bubbles with `#333` borders. Segoe-only type on macOS. Emoji as the settings header. Dock icon on macOS (he is an agent / `LSUIElement`).
