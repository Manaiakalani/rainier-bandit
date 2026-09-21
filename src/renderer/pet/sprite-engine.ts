import {
  DEFAULT_SPRITE_STYLE,
  FOOT_BASELINE,
  FOOT_GAP,
  HIT_ALPHA_THRESHOLD,
  PET_SIZE,
} from '../../shared/constants';
import manifest from '../sprite-manifest.json';

interface AnimationEntry {
  name?: string;
  style: string;
  sheet: string;
  frameSize: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  columns?: number;
  frameMs?: number[];
}

interface LoadedAnimation {
  name: string;
  sheet: HTMLImageElement;
  frameCount: number;
  columns: number;
  cellSize: number;
  fps: number;
  loop: boolean;
  heroFrame: number;
  frameMs?: number[];
}

const typedManifest = manifest as Record<string, AnimationEntry>;

const HERO_FRAMES: Record<string, number> = {
  idle: 0,
  paw_wave: 2,
  sit: 3,
  sleep: 3,
  blink: 0,
};
const DEFAULT_HERO_FRAME = 0;

const LOOPING_ANIMS = new Set<string>(['idle', 'walk', 'run', 'sleep']);
const PLAY_ONCE_ANIMS = new Set<string>(['blink', 'paw_wave', 'sit', 'startled', 'happy_bounce']);

export class SpriteEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private byStyle = new Map<string, Map<string, LoadedAnimation>>();
  private currentAnim: LoadedAnimation | null = null;
  private frameIndex = 0;
  private frameTimer = 0;
  private flipX = false;
  private activeStyle = DEFAULT_SPRITE_STYLE;
  private loadBase = '';
  private loading = new Map<string, Promise<void>>();
  private breathePhaseMs = 0;
  private readonly breathePeriodMs = 3200;
  private readonly breatheAmount = 0.015;
  private breathingEnabled = true;
  private reduceMotion = false;
  private playbackRate = 1;
  private hitMask: Uint8ClampedArray | null = null;
  private petSize = PET_SIZE;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('2D canvas context is unavailable');
    }
    this.ctx = ctx;
    this.applyCanvasSize(PET_SIZE);
  }

  setPetSize(size: number): void {
    const next = Math.max(96, Math.round(size));
    if (next === this.petSize) return;
    this.applyCanvasSize(next);
  }

  private applyCanvasSize(size: number): void {
    this.petSize = size;
    this.canvas.width = size;
    this.canvas.height = size;
    this.hitMask = null;
  }

  setStyle(style: string): void {
    this.activeStyle = style;
  }

  setReducedMotion(enabled: boolean): void {
    this.reduceMotion = enabled;
  }

  getAvailableAnimations(): string[] {
    return Array.from(this.activeMap().keys());
  }

  hasStyle(style: string): boolean {
    return this.byStyle.has(style);
  }

  async loadAll(basePath: string): Promise<void> {
    this.loadBase = basePath;
    await this.ensureStyle(this.activeStyle);
    this.preloadOtherStyles();
  }

  async ensureStyle(style: string): Promise<void> {
    if (this.byStyle.has(style)) return;
    const pending = this.loading.get(style);
    if (pending) {
      await pending;
      return;
    }
    const work = this.loadStyle(style);
    this.loading.set(style, work);
    try {
      await work;
    } finally {
      this.loading.delete(style);
    }
  }

  private async loadStyle(style: string): Promise<void> {
    const entries = Object.entries(typedManifest)
      .filter(([, entry]) => entry.style === style);

    const loaded = await Promise.all(entries.map(async ([key, entry]) => {
      const rawImg = await this.loadImage(`${this.loadBase}/${entry.sheet}`);
      const name = entry.name ?? key;
      return [
        name,
        {
          name,
          sheet: rawImg,
          frameCount: entry.frameCount,
          columns: entry.columns ?? entry.frameCount,
          cellSize: entry.frameSize,
          fps: entry.fps,
          loop: entry.loop,
          heroFrame: Math.min(HERO_FRAMES[name] ?? DEFAULT_HERO_FRAME, entry.frameCount - 1),
          frameMs: entry.frameMs && entry.frameMs.length === entry.frameCount
            ? entry.frameMs
            : undefined,
        } satisfies LoadedAnimation,
      ] as const;
    }));

    const map = new Map<string, LoadedAnimation>();
    for (const [name, anim] of loaded) {
      map.set(name, anim);
    }
    this.byStyle.set(style, map);
  }

  private preloadOtherStyles(): void {
    const styles = new Set(Object.values(typedManifest).map((entry) => entry.style));
    for (const style of styles) {
      if (style === this.activeStyle) continue;
      void this.ensureStyle(style);
    }
  }

  private activeMap(): Map<string, LoadedAnimation> {
    return this.byStyle.get(this.activeStyle) ?? new Map();
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }

  play(animName: string, flipX = false, restart = false): void {
    const bank = this.activeMap();
    const anim = bank.get(animName) ?? bank.get('idle');
    if (!anim) return;

    if (!restart && this.currentAnim === anim && this.flipX === flipX) {
      return;
    }

    this.currentAnim = anim;
    this.frameIndex = LOOPING_ANIMS.has(anim.name) || PLAY_ONCE_ANIMS.has(anim.name)
      ? 0
      : anim.heroFrame;
    this.frameTimer = 0;
    this.flipX = flipX;
    if (anim.name !== 'walk' && anim.name !== 'run') {
      this.playbackRate = 1;
    }
  }

  get currentAnimation(): string | null {
    return this.currentAnim?.name ?? null;
  }

  setBreathing(enabled: boolean): void {
    this.breathingEnabled = enabled;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.25, Math.min(2.2, rate));
  }

  update(deltaMs: number): void {
    if (!this.currentAnim) return;

    this.breathePhaseMs = (this.breathePhaseMs + deltaMs) % this.breathePeriodMs;

    const sequenced = LOOPING_ANIMS.has(this.currentAnim.name) || PLAY_ONCE_ANIMS.has(this.currentAnim.name);
    if (sequenced && this.currentAnim.frameCount > 1 && !this.reduceMotion) {
      this.frameTimer += deltaMs * this.playbackRate;
      while (this.frameTimer >= this.currentFrameDuration()) {
        this.frameTimer -= this.currentFrameDuration();
        if (PLAY_ONCE_ANIMS.has(this.currentAnim.name)) {
          this.frameIndex = Math.min(this.frameIndex + 1, this.currentAnim.frameCount - 1);
        } else {
          this.frameIndex = (this.frameIndex + 1) % this.currentAnim.frameCount;
        }
      }
    }
  }

  private currentFrameDuration(): number {
    const anim = this.currentAnim;
    if (!anim) return 1000;
    const timed = anim.frameMs?.[this.frameIndex];
    if (timed && timed > 0) return timed;
    return 1000 / anim.fps;
  }

  private currentBreatheScaleY(): number {
    if (
      this.reduceMotion
      || !this.breathingEnabled
      || (this.currentAnim && LOOPING_ANIMS.has(this.currentAnim.name))
    ) {
      return 1;
    }
    const phase = (this.breathePhaseMs / this.breathePeriodMs) * Math.PI * 2;
    return 1 + this.breatheAmount * Math.sin(phase);
  }

  render(opts?: { captureHit?: boolean }): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.currentAnim) {
      this.hitMask = null;
      return;
    }

    if (this.frameIndex < 0 || this.frameIndex >= this.currentAnim.frameCount) {
      this.hitMask = null;
      return;
    }

    this.drawFrame(this.currentAnim, this.flipX, 1, this.currentBreatheScaleY());
    if (opts?.captureHit !== false) {
      try {
        this.hitMask = this.ctx.getImageData(0, 0, this.petSize, this.petSize).data;
      } catch {
        // Keep the last mask if the canvas is unreadble this frame.
      }
    }
  }

  private drawFrame(anim: LoadedAnimation, flipX: boolean, alpha: number, scaleY = 1): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.globalAlpha = alpha;

    if (scaleY !== 1) {
      this.ctx.translate(0, this.petSize);
      this.ctx.scale(1, scaleY);
      this.ctx.translate(0, -this.petSize);
    }

    if (flipX) {
      this.ctx.translate(this.canvas.width, 0);
      this.ctx.scale(-1, 1);
    }

    const col = this.frameIndex % anim.columns;
    const row = Math.floor(this.frameIndex / anim.columns);
    const sx = col * anim.cellSize;
    const sy = row * anim.cellSize;
    const scale = (this.petSize - FOOT_GAP) / FOOT_BASELINE;
    const dh = Math.round(anim.cellSize * scale);
    const dy = this.petSize - FOOT_GAP - Math.round(FOOT_BASELINE * scale);
    this.ctx.drawImage(
      anim.sheet,
      sx,
      sy,
      anim.cellSize,
      anim.cellSize,
      0,
      dy,
      this.petSize,
      dh,
    );
    this.ctx.restore();
  }

  isPixelOpaque(canvasX: number, canvasY: number): boolean {
    if (canvasX < 0 || canvasX >= this.petSize || canvasY < 0 || canvasY >= this.petSize || !this.hitMask) {
      return false;
    }
    const index = (Math.floor(canvasY) * this.petSize + Math.floor(canvasX)) * 4 + 3;
    return this.hitMask[index] > HIT_ALPHA_THRESHOLD;
  }
}
