# Jimothy Sprite Generation — Master Prompt

## Purpose
Use this prompt as a **single-session generation guide** to produce all Jimothy animations in one consistent art style. Attach the reference sheet (`reference_sheet.png`) and the idle frame (`idle_frame1.png`) to every generation request to anchor the AI on Jimothy's exact design.

---

## 🎨 Character Model Sheet — "Jimothy"

### Identity
- **Species:** Raccoon (North American, Seattle-area)
- **Age/Vibe:** Young adult, friendly, slightly mischievous
- **Name origin:** Jimothy — a playful riff on "Jimmy"

### Body Proportions (CRITICAL — must be identical across ALL animations)
- **Head-to-body ratio:** 1:1.2 (large chibi head, compact body)
- **Total height:** ~4.5 head-widths tall
- **Body shape:** Round, pear-shaped torso — wider at hips, narrower at shoulders
- **Arms:** Short, stubby, end in mitten-like paws (4 implied fingers, no thumb visible)
- **Legs:** Very short and thick, plantigrade stance (flat-footed)
- **Feet:** Wide oval pads, 4 pink toe beans visible from front
- **Tail:** Large bushy ringed tail, approximately 60% of body height, 5 dark rings + light tip
- **Ears:** Rounded triangular, positioned at 10 and 2 o'clock, inner ear pink

### Face (THE most critical consistency element)
- **Shape:** Wide oval, ~1.3× wider than tall
- **Eye mask:** Solid black, connects across nose bridge, pointed at outer edges
- **Eyes:** Large, round, amber/brown iris, positioned within the mask, slight highlight dot at 10 o'clock
- **Eye size:** Each eye is approximately 20% of face width
- **Eye spacing:** One eye-width apart
- **Nose:** Small, black, rounded triangle, positioned at bottom of mask
- **Mouth:** Simple curved line, ~1cm below nose. Neutral = gentle smile. Visible only when emoting.
- **Cheeks/muzzle:** Cream/white fur framing the mask, extends to chin
- **Forehead:** Gray fur, lighter than body, with subtle widow's peak tuft

### Clothing — "The JIMOTHY Jacket"
- **Type:** Black zip-up hoodie/bomber jacket
- **Fit:** Slightly oversized, covers torso and upper arms
- **Zipper:** Silver, center-front, always partially visible
- **Hem:** Ribbed knit band at bottom, sits at hip level
- **Cuffs:** Ribbed knit at wrists (when arms visible below jacket)
- **Details:** Small rectangular patch on left chest (subtle, dark-on-dark)
- **NO hood visible** — ears always exposed above jacket collar
- **Belly gap:** Small amount of gray belly fur visible between jacket hem and legs

### Color Palette (exact values)
| Area | Color | Hex |
|------|-------|-----|
| Body fur (main) | Medium gray | #8A8A8A |
| Body fur (lighter belly/face) | Warm cream | #E8E0D4 |
| Eye mask / markings | Rich black | #1A1A1A |
| Eyes (iris) | Warm amber | #8B5E3C |
| Eye highlight | White | #FFFFFF |
| Nose | Black | #0D0D0D |
| Inner ears | Dusty pink | #C4908A |
| Toe beans | Pink | #D4A0A0 |
| Tail rings (dark) | Charcoal | #2D2D2D |
| Tail rings (light) | Light gray | #B8B8B8 |
| Jacket body | Flat black | #1C1C1C |
| Jacket zipper | Silver | #A0A0A0 |
| Jacket ribbing | Dark charcoal | #2A2A2A |

### Art Style
- **Genre:** Digital illustration, mascot/sticker style
- **Line art:** Clean, consistent 2-3px black outlines at 512px canvas size
- **Shading:** Soft cel-shading with 2-tone shadows (no harsh edges, no gradients)
- **Rendering:** Flat fills with soft shadow pass — NOT painterly, NOT vector-flat
- **Texture:** Very subtle fur texture on edges (soft brush strokes, not individual hairs)
- **Background:** Transparent (alpha channel, NO white background)

---

## 📐 Technical Sprite Requirements

### Canvas & Layout
- **Frame size:** 512 × 512 pixels
- **Output format:** Horizontal sprite strip (all frames side-by-side in one PNG)
- **Anchor point:** Bottom-center (character's feet always touch the bottom of the 512px frame)
- **Horizontal centering:** Character centered at x=256 in every frame
- **Consistent scale:** Character should fill approximately 80-90% of the frame height in ALL animations
- **Transparent background:** RGBA with alpha channel, no background color

### Animation Constraints
- **Character height must remain constant** across all animations (±5% tolerance)
- **Head size must remain constant** — NEVER shrink/grow the head between animations
- **Eye proportions must be identical** in every single frame
- **Jacket fit must be consistent** — same length, same zipper position
- **Feet must always be at frame bottom** (bottom-aligned anchoring)

---

## 🎬 Animations to Generate

Generate each animation as a **horizontal sprite strip** at 512×512 per frame.

### Jacketed Set (Primary — for desktop mascot use)

| # | Animation | Frames | FPS | Loop | Pose Description |
|---|-----------|--------|-----|------|------------------|
| 1 | **idle** | 6 | 8 | ✓ | Standing front-facing. Subtle breathing motion: slight body rise/fall (2px). Tail sways gently side to side. Arms relaxed at sides. |
| 2 | **blink** | 3 | 8 | ✗ | Same idle pose, eyes close (frame 1: open → frame 2: half-closed → frame 3: closed). Return to idle after. |
| 3 | **walk** | 8 | 10 | ✓ | Side-facing (3/4 view, facing right). Standard walk cycle with arm swing. Tail bobs slightly. Head stays at SAME height as idle (critical). |
| 4 | **run** | 8 | 12 | ✓ | Side-facing (same angle as walk). Faster stride, slight forward lean, tail streams behind. Same character height as walk. |
| 5 | **sit** | 4 | 8 | ✗ | Front-facing. Transition from standing to seated (knees fold, body lowers). Final frame: sitting with tail wrapped around. |
| 6 | **paw_wave** | 4 | 8 | ✗ | Front-facing (same as idle). Raises right paw and waves. Body stays still, only arm moves. Same body height as idle. |
| 7 | **happy_bounce** | 6 | 10 | ✗ | Front-facing. Small jump: crouch → lift off (feet leave ground 10-15px) → land. Arms raise on jump. Tail flicks up. |
| 8 | **startled** | 4 | 10 | ✗ | Front-facing. Surprise reaction: fur puffs slightly, eyes widen, body leans back 5°, tail poofs. Returns to neutral. |

### No-Jacket Set (Secondary — for variety/future use)

| # | Animation | Frames | FPS | Loop | Pose Description |
|---|-----------|--------|-----|------|------------------|
| 9 | **ear_scratch** | 6 | 8 | ✗ | Front-facing, back paw reaches up to scratch ear. Head tilts slightly. |
| 10 | **sniff** | 4 | 8 | ✗ | Side-facing (3/4). Nose twitches, head bobs forward. Investigating something. |
| 11 | **happy_dance** | 6 | 10 | ✗ | Front-facing. Side-to-side shimmy, arms move alternately, tail wags. |
| 12 | **smug** | 4 | 8 | ✗ | Front-facing. Half-lidded eyes, slight lean back, arms crossed. Self-satisfied expression. |
| 13 | **victory** | 4 | 8 | ✗ | Front-facing. Both paws raised in triumph. Sparkle effects optional. |
| 14 | **peek** | 4 | 8 | ✗ | Side-facing. Peeks from behind something (implied edge). Half-body visible. |
| 15 | **snack_nibble** | 6 | 8 | ✗ | Front-facing. Both paws holding a small item near mouth, munching motion. |
| 16 | **sleep_curl** | 6 | 6 | ✗ | Transition to curled up sleeping position. Tail wraps around body. Zzz effect optional. |
| 17 | **sneak** | 6 | 8 | ✓ | Side-facing. Tiptoeing exaggeratedly, crouched low, eyes darting. Comedic stealth. |
| 18 | **rain_reaction** | 4 | 8 | ✗ | Front-facing. Looking up annoyed, one paw shielding head from rain. |
| 19 | **trash_investigate** | 6 | 8 | ✗ | Side-facing. Approaching and investigating a trash can (can be implied). |
| 20 | **internet_celebrity** | 4 | 8 | ✗ | Front-facing. Selfie pose with one paw extended (like holding a phone). Wink. |

---

## 🔑 Consistency Rules (Non-Negotiable)

1. **Generate ALL animations in a SINGLE session** — do not split across multiple conversations
2. **Reference the idle frame** before drawing every other animation — it is the character model
3. **HEAD PROPORTIONS NEVER CHANGE** — same head width, same eye size, same ear position in EVERY frame of EVERY animation
4. **BODY HEIGHT IS CONSTANT** — standing animations must all have the same crown-to-toe measurement (±5%)
5. **LINE WEIGHT IS UNIFORM** — 2-3px everywhere, no thicker/thinner outlines between animations
6. **SHADING IS CONSISTENT** — light source is always top-left (10 o'clock), shadow intensity never changes
7. **THE JACKET IS THE SAME JACKET** — same length, same zipper, same ribbing, same patch in every frame
8. **FEET ALWAYS ANCHOR AT Y=512** — the bottom of the frame, regardless of animation

---

## 📋 Generation Workflow (Step by Step)

### Phase 1: Establish the Model
1. Generate a **turnaround sheet** (front, 3/4 right, side right, back) on one canvas
2. This becomes the LOCKED reference — every subsequent frame must match this turnaround
3. Verify: head size, eye spacing, jacket length, body proportions, tail size

### Phase 2: Generate Idle (the anchor)
4. Generate the 6-frame idle animation strip
5. This is the "golden standard" — all other animations must match these proportions

### Phase 3: Generate each animation sequentially
6. For each animation, ALWAYS provide:
   - The turnaround sheet as reference
   - The idle strip as scale/proportion reference
   - The specific pose description from the table above
7. Verify each strip before proceeding to the next

### Phase 4: Validation Pass
8. Place frame 1 of EVERY animation side by side
9. Verify: same head size, same body height, same eye proportions
10. Regenerate any outliers

---

## 🚫 Common AI Art Failures to Avoid

- ❌ Character gets cuter/smaller in action poses (walk, run)
- ❌ Head grows larger in front-facing vs side-facing poses
- ❌ Eye style changes (rounder in some, more anime in others)
- ❌ Jacket length varies (shorter in walk, longer in idle)
- ❌ Different line weights between animations
- ❌ Tail changes size/ring count between frames
- ❌ White/colored background instead of transparent
- ❌ Character positioned at different heights within the frame
- ❌ Fur texture density varies (fluffy in some, smooth in others)

---

## 📎 Attachments to Include with Every Prompt

1. **`idle_frame1.png`** — The primary character reference (front-facing, neutral pose)
2. **`reference_sheet.png`** — Multi-pose reference showing the character in various animations
3. This document (or its key sections)

---

## 💡 Prompt Template (Copy-Paste for Each Animation)

```
[Attach: idle_frame1.png, reference_sheet.png]

Generate a sprite animation strip for "Jimothy" the raccoon mascot.

CHARACTER: See attached reference images. Jimothy is a chibi raccoon wearing a black zip-up jacket. Match the EXACT proportions, face design, eye size, and line weight from the reference.

ANIMATION: [NAME] — [DESCRIPTION FROM TABLE]
FRAMES: [N] frames, horizontal strip
FRAME SIZE: 512×512 pixels each
TOTAL OUTPUT: [N×512] × 512 pixels (one horizontal row)

CRITICAL REQUIREMENTS:
- Character height matches the reference image EXACTLY
- Feet anchored at the bottom of each 512px frame
- Horizontally centered in each frame
- Transparent background (alpha channel)
- Same line weight, shading, and color palette as reference
- Head/face proportions are IDENTICAL to reference

OUTPUT: Single PNG image, [N×512]×512 pixels, transparent background, horizontal sprite strip.
```

---

## 🛠 Post-Generation Processing

After generating all strips, run the validation script:

```bash
cd "C:\GitHub Copilot Projects\Jimothy"
node scripts/generate-sprite-manifest.js
npm run build
npx electron .
```

If any animation appears inconsistent:
1. Compare its frame 1 side-by-side with idle frame 1
2. Check: head size ratio, total character height, eye proportions
3. Regenerate ONLY the failing animation using idle + turnaround as reference
