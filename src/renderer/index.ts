import {
  DRAG_THRESHOLD_PX,
  MAX_FRAME_DELTA_MS,
  petPx,
  windowPx,
} from '../shared/constants';
import { petBounds, windowCenter } from '../shared/layout';
import { BehaviorController } from './pet/behavior';
import { SpriteEngine } from './pet/sprite-engine';
import { SpeechBubble } from './ui/balloon';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function main() {
  const canvasEl = document.getElementById('pet-canvas');
  if (!(canvasEl instanceof HTMLCanvasElement)) {
    throw new Error('Pet canvas is missing');
  }
  const canvas = canvasEl;

  const reduceMotion = prefersReducedMotion();
  const sprite = new SpriteEngine(canvas);
  sprite.setReducedMotion(reduceMotion);
  const bubble = new SpeechBubble('speech-bubble', reduceMotion);
  const behavior = new BehaviorController(sprite);

  behavior.setSpeechCallback((msg) => bubble.show(msg));
  const spriteBase = new URLSearchParams(window.location.search).get('sprites')
    || '../../src/assets/sprites';

  let isPaused = await window.jimothy.getPauseState();
  behavior.setPaused(isPaused);
  behavior.setNapping(await window.jimothy.getNapState());

  let settings = await window.jimothy.getSettings();
  sprite.setPetSize(petPx(settings.petScale));
  layoutOverlay(settings.petScale);
  sprite.setStyle(settings.spriteStyle);
  await sprite.loadAll(spriteBase);
  sprite.setBreathing(settings.breathing);
  behavior.applySettings(settings);

  function layoutOverlay(scale: typeof settings.petScale): void {
    const pet = petPx(scale);
    const bubbleEl = document.getElementById('speech-bubble');
    if (bubbleEl) bubbleEl.style.bottom = `${Math.max(pet - 10, 80)}px`;
  }

  window.jimothy.onSettingsChanged((s) => {
    const styleChanged = s.spriteStyle !== settings.spriteStyle;
    const scaleChanged = s.petScale !== settings.petScale;
    settings = s;
    sprite.setBreathing(s.breathing);
    behavior.applySettings(s);
    if (scaleChanged) {
      sprite.setPetSize(petPx(s.petScale));
      layoutOverlay(s.petScale);
      void window.jimothy.getWindowPos().then(async (pos) => {
        const wa = await window.jimothy.getWorkArea(windowCenter(pos.x, pos.y, windowPx(s.petScale)));
        updateBounds(wa);
        behavior.setPosition(pos.x, pos.y);
      });
    }
    if (styleChanged) {
      const nextStyle = s.spriteStyle;
      const apply = (): void => {
        sprite.setStyle(nextStyle);
        const pet = behavior.getState();
        const flip = pet.animation === 'walk' || pet.animation === 'run'
          ? pet.facing === -1
          : false;
        sprite.play(pet.animation, flip);
      };
      if (sprite.hasStyle(nextStyle)) {
        apply();
      } else {
        void sprite.ensureStyle(nextStyle).then(apply);
      }
    }
  });

  let workArea = await window.jimothy.getWorkArea();
  const windowPos = await window.jimothy.getWindowPos();
  let bounds = petBounds(workArea, windowPx(settings.petScale));

  function updateBounds(wa: { x: number; y: number; width: number; height: number }): void {
    workArea = wa;
    bounds = petBounds(wa, windowPx(settings.petScale));
  }

  behavior.setPosition(windowPos.x, windowPos.y);

  let isDragging = false;
  let lastIgnoreState: boolean | null = null;
  let lastSentX: number | null = null;
  let lastSentY: number | null = null;
  let pendingDown = false;
  let pendingClientX = 0;
  let pendingClientY = 0;

  function canvasPixelFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    return {
      x: (clientX - rect.left) * (canvas.width / width),
      y: (clientY - rect.top) * (canvas.height / height),
    };
  }

  function setIgnoreMouse(shouldIgnore: boolean): void {
    if (pendingDown || isDragging) shouldIgnore = false;
    if (shouldIgnore === lastIgnoreState) return;
    lastIgnoreState = shouldIgnore;
    window.jimothy.setIgnoreMouse(shouldIgnore);
    document.body.style.cursor = shouldIgnore ? 'default' : 'pointer';
  }

  function beginDrag(): void {
    if (behavior.isNapping()) window.jimothy.setNapping(false);
    pendingDown = false;
    isDragging = true;
    behavior.startDrag();
    lastIgnoreState = false;
    window.jimothy.setIgnoreMouse(false);
    window.jimothy.startDrag();
  }

  async function finishPointer(): Promise<void> {
    if (pendingDown) {
      pendingDown = false;
      if (behavior.isNapping()) window.jimothy.setNapping(false);
      behavior.onClick();
      return;
    }
    if (!isDragging) return;
    isDragging = false;
    const pos = await window.jimothy.endDrag();
    lastSentX = pos.x;
    lastSentY = pos.y;
    behavior.setPosition(pos.x, pos.y);
    const wa = await window.jimothy.getWorkArea(windowCenter(pos.x, pos.y));
    updateBounds(wa);
    behavior.endDrag();
  }

  window.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      window.jimothy.showContextMenu();
      return;
    }
    if (e.button !== 0) return;

    const pixel = canvasPixelFromClient(e.clientX, e.clientY);
    if (!sprite.isPixelOpaque(pixel.x, pixel.y)) return;

    pendingDown = true;
    pendingClientX = e.clientX;
    pendingClientY = e.clientY;
    setIgnoreMouse(false);
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!pendingDown) return;
    const dx = e.clientX - pendingClientX;
    const dy = e.clientY - pendingClientY;
    if (Math.abs(dx) + Math.abs(dy) >= DRAG_THRESHOLD_PX) {
      beginDrag();
    }
  }, true);

  window.addEventListener('mouseup', () => {
    void finishPointer();
  }, true);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.jimothy.showContextMenu();
  });

  window.jimothy.onCursor(({ x, y }) => {
    if (isDragging || pendingDown) {
      setIgnoreMouse(false);
      return;
    }
    const pixel = canvasPixelFromClient(x, y);
    setIgnoreMouse(!sprite.isPixelOpaque(pixel.x, pixel.y));
  });

  window.jimothy.onTogglePause((paused: boolean) => {
    isPaused = paused;
    behavior.setPaused(paused);
  });

  window.jimothy.onToggleNap((napping: boolean) => {
    behavior.setNapping(napping);
  });

  window.jimothy.onPetReaction(() => {
    if (behavior.isNapping()) window.jimothy.setNapping(false);
    behavior.onClick();
  });



  window.jimothy.onResetPosition(({ x, y, workArea: wa }) => {
    behavior.stopMotion();
    updateBounds(wa);
    behavior.setPosition(x, y);
    lastSentX = null;
    lastSentY = null;
  });

  let lastTime = performance.now();

  function gameLoop(now: number) {
    const deltaMs = Math.max(0, Math.min(now - lastTime, MAX_FRAME_DELTA_MS));
    lastTime = now;

    if (!isPaused) {
      behavior.update(deltaMs, bounds.groundY, bounds.minX, bounds.maxX);
      sprite.update(deltaMs);
    }

    const state = behavior.getState();
    sprite.render({ captureHit: !isDragging });

    if (!isPaused && !isDragging) {
      const targetX = state.x;
      const targetY = state.mode === 'falling' ? state.y : bounds.groundY;
      if (targetX !== lastSentX || targetY !== lastSentY) {
        window.jimothy.moveWindow(targetX, targetY);
        lastSentX = targetX;
        lastSentY = targetY;
      }
    }



    requestAnimationFrame(gameLoop);
  }

  sprite.play('idle');
  if (!settings.greeted) {
    bubble.show("Hi! I'm Jimothy.", 3000);
    void window.jimothy.updateSettings({ greeted: true });
  }
  requestAnimationFrame(gameLoop);
}

main().catch((err) => {
  console.error('Jimothy failed to start:', err);
  const div = document.createElement('div');
  div.className = 'boot-error';
  div.textContent = err instanceof Error ? err.message : String(err);
  document.body.replaceChildren(div);
});
