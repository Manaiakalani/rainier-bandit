# Jimothy Production Sprites

Live runtime sheets are `jacketed/` and `non-jacketed/` (Master Package, 512px cells).
`no_jacket/` is unused inventory. Walk/run currently play 4 poses (one gait cycle).
The installer ships the live strips only. `no_jacket/` and the jacketed `jimothy_*.png` masters stay in the repo and are left out of the electron-builder package.

Character design: Jimothy — a compact, round, short-spined Seattle raccoon mascot.

## Folder structure

```
src/assets/sprites/
jacketed/          Jimothy wearing the black JIMOTHY zip-up jacket
no_jacket/         Natural raccoon — no clothing
```

## Sprite format: web_grid_512

Every file is a **horizontal sprite strip** — one row of equally-sized frames left to right.
All frames are **exactly 512 × 512 px**, with Jimothy pre-composited in the same relative
position in every frame (feet at the bottom, centered horizontally). Strip width = frameCount × 512.

Because every frame occupies the full 512×512 cell with no trimming and no per-frame
placement offset, there is **no offset math to get wrong** when slicing frames or scaling
them to the on-screen pet size — frame 1 of `idle` and frame 1 of `walk` line up
pixel-for-pixel. This replaced an earlier packed/trimmed atlas format (variable-size
trimmed frames placed via a `spriteSourceSize` offset) that was prone to subtle
misalignment between animations.

| Animation | File | Frames | Strip size | FPS | Loop |
|---|---|---|---|---|---|
| Idle | jacketed/jimothy_idle.png | 6 | 3072 × 512 | 8 | ✓ |
| Blink | jacketed/jimothy_blink.png | 3 | 1536 × 512 | 8 | |
| Walk / Waddle | jacketed/jimothy_walk.png | 8 | 4096 × 512 | 10 | ✓ |
| Run / Scamper | jacketed/jimothy_run.png | 8 | 4096 × 512 | 12 | ✓ |
| Sit | jacketed/jimothy_sit.png | 4 | 2048 × 512 | 8 | |
| Paw Wave | jacketed/jimothy_paw_wave.png | 4 | 2048 × 512 | 8 | |
| Happy Bounce | jacketed/jimothy_happy_bounce.png | 6 | 3072 × 512 | 10 | |
| Startled | jacketed/jimothy_startled.png | 4 | 2048 × 512 | 10 | |
| Sniff | no_jacket/jimothy_sniff.png | 4 | 2048 × 512 | 8 | |
| Happy Dance | no_jacket/jimothy_happy_dance.png | 6 | 3072 × 512 | 10 | |
| Smug | no_jacket/jimothy_smug.png | 4 | 2048 × 512 | 8 | |
| Tiny Victory | no_jacket/jimothy_victory.png | 4 | 2048 × 512 | 8 | |
| Investigate Trash Can | no_jacket/jimothy_trash_investigate.png | 6 | 3072 × 512 | 8 | |
| Seattle Rain Reaction | no_jacket/jimothy_rain_reaction.png | 4 | 2048 × 512 | 8 | |
| Ear Scratch | no_jacket/jimothy_ear_scratch.png | 6 | 3072 × 512 | 8 | |
| Peek | no_jacket/jimothy_peek.png | 4 | 2048 × 512 | 8 | |
| Snack Nibble | no_jacket/jimothy_snack_nibble.png | 6 | 3072 × 512 | 8 | |
| Sleep Curl | no_jacket/jimothy_sleep_curl.png | 6 | 3072 × 512 | 6 | |
| Sneak Creep | no_jacket/jimothy_sneak.png | 6 | 3072 × 512 | 8 | ✓ |
| Internet Celebrity | no_jacket/jimothy_internet_celebrity.png | 4 | 2048 × 512 | 8 | |

## Source of truth

`sprite-manifest.json` (in `src/renderer/`) is generated from the upstream
`web_grid_512/{style}/atlas/*.json` files by `scripts/generate-sprite-manifest.js`
(`npm run generate:sprite-manifest`). Each manifest entry only needs `style`, `sheet`,
`frameSize` (512), `frameCount`, `fps`, and `loop` — there are no per-frame rects to
maintain by hand, which is what keeps animations visually consistent with each other.

## Using in game engines

**Unity:** Import PNG → Sprite Mode: Multiple → Slice by cell size 512×512 → Assign to Animator.

**Godot:** SpriteFrames → Add Frames From Sprite Sheet → set H frames = strip frame count, V frames = 1.

**Phaser 3:**
```js
this.load.spritesheet('idle', 'jimothy_idle.png', { frameWidth: 512, frameHeight: 512 });
this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('idle'), frameRate: 8, repeat: -1 });
```

---
web_grid_512 format · 20 animations · 512 × 512 px per frame, uniform grid
