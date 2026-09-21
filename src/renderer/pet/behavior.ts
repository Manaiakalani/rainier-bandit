import {
  BLINK_CHANCE,
  BLINK_MS,
  CLICK_DURATION_MS,
  DEFAULT_SETTINGS,
  GRAVITY,
  IDLE_MAX,
  IDLE_MIN,
  PACE_SPEED,
  PET_SIZE,
  petPx,
  SLEEP_RECHECK_MS,
  RUN_SPEED,
  WALK_MAX,
  WALK_MIN,
  WALK_SPEED,
} from '../../shared/constants';
import { clamp, isSleepTime, pickWeighted, randomBetween, wanderTuning } from '../../shared/behavior-utils';
import type { PetState, Settings, WeightedBehavior } from '../../shared/types';
import { SpriteEngine } from './sprite-engine';

const IDLE_BEHAVIORS: WeightedBehavior[] = [
  { animation: 'idle', mode: 'idle', weight: 90, durationMs: [IDLE_MIN, IDLE_MAX] },
  { animation: 'sit', mode: 'emoting', weight: 8, durationMs: [8000, 18000] },
  { animation: 'paw_wave', mode: 'emoting', weight: 2, durationMs: [1000, 1000] },
];

export class BehaviorController {
  private state: PetState;
  private sprite: SpriteEngine;
  private behaviorDuration = 0;
  private onSpeechBubble: ((msg: string) => void) | null = null;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private walkTargetX = 0;
  private minX = 0;
  private maxX = 0;
  private groundY = 0;

  private napping = false;
  private petStreak = 0;
  private lastPetAt = 0;
  private petTotal = 0;
  private fallStartY = 0;
  private cornerMs = 0;
  private lastCornerQuipAt = 0;
  private lastSeasonalKey = '';
  private quietBeats = 0;

  private readonly QUIPS_SHARED = [
    '*rummages through your desktop*',
    'Got any snacks?',
    'I am speed. Sometimes.',
    '*happy raccoon noises*',
    'Seattle weather, huh?',
    'Trash? Where?',
    'Classic Seattle drizzle.',
    "I'm not fat, I'm fluffy!",
    'Did someone say garbage?',
    'Living my best raccoon life.',
    '*sneaks across your desktop*',
    'This wallpaper is edible. Emotionally.',
    'I live here now. You live here too. Fine.',
    '*pats the taskbar*',
    'Coffee first. Then crimes.',
    'I saw a crumb. It got away.',
    'Do not look in the Recycle Bin.',
    '*tiny hands, big plans*',
    'I paid rent in moral support.',
    'Your cursor tickles.',
    'If I fit, I sit.',
    'That icon looks like a sandwich.',
    'I named your desktop Steve.',
    '*washes a grape that is not here*',
    'Rain again. Perfect stealing weather.',
    'I contain multitudes. And pretzels.',
    'Shh. The tabs are sleeping.',
    'One of us has a job. Hint: not me.',
    'I believe in you. And leftovers.',
    '*investigates the void*',
    'Taskbar is warm. I will not move.',
    'Is this a meeting? I brought chaos.',
    'Your files are safe. Probably.',
    '*boops the screen*',
    'I am a professional. At this.',
    'Pike Place has better trash. Allegedly.',
    'Space Needle? I could climb that.',
    'Ferry? I thought you said pastry.',
    '*counts the pixels*',
    'Don\'t minimize me. I\'ll remember.',
    'I already checked under the dock.',
    'Mmm. Background processes.',
    'Who put a raccoon on a computer. Oh.',
  ];
  private readonly QUIPS_JACKET = [
    '*adjusts tiny jacket*',
    'Zipper stuck. On purpose.',
    'This jacket has pockets. For crumbs.',
    'Formal raccoon. Casual crimes.',
    '*smooths the zipper*',
    'Black goes with garbage.',
  ];
  private readonly QUIPS_FUR = [
    '*fluffs my fur*',
    'Jacket? Never heard of her.',
    'Natural raccoon. Maximum floof.',
    'I shed on your pixels.',
    '*shakes out the rain*',
    'No zipper, no problems.',
  ];

  constructor(sprite: SpriteEngine) {
    this.sprite = sprite;
    this.state = {
      mode: 'idle',
      animation: 'idle',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: true,
      paused: false,
      behaviorTimer: 0,
      lastInteraction: Date.now(),
    };
  }

  getState(): PetState {
    return this.state;
  }

  setSpeechCallback(cb: (msg: string) => void): void {
    this.onSpeechBubble = cb;
  }

  setPosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
  }

  setPaused(paused: boolean): void {
    const wasPaused = this.state.paused;
    this.state.paused = paused;
    if (wasPaused && !paused && this.settings.speechBubbles && this.onSpeechBubble) {
      this.onSpeechBubble('I wasn\'t frozen. I was thinking.');
    }
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    this.sprite.setBreathing(settings.breathing);
    if (!settings.roaming && (this.state.mode === 'walking' || this.state.mode === 'running')) {
      this.applyBehavior(IDLE_BEHAVIORS[0]);
    }
    if (!settings.sleepAtNight && this.state.mode === 'sleeping' && !this.napping) {
      this.applyBehavior(IDLE_BEHAVIORS[0]);
    }
  }

  isNapping(): boolean {
    return this.napping;
  }

  setNapping(napping: boolean): void {
    if (this.napping === napping) return;
    this.napping = napping;
    if (napping) {
      this.state.mode = 'sleeping';
      this.state.animation = 'sleep';
      this.state.vx = 0;
      this.state.behaviorTimer = 0;
      this.behaviorDuration = SLEEP_RECHECK_MS;
      this.sprite.play('sleep', false, true);
      if (this.settings.speechBubbles && this.onSpeechBubble) {
        this.onSpeechBubble('Zzz...');
      }
      return;
    }
    if (this.state.mode === 'sleeping') {
      this.applyBehavior(IDLE_BEHAVIORS[0]);
    }
  }

  stopMotion(): void {
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.grounded = true;
    this.applyBehavior(IDLE_BEHAVIORS[0]);
  }

  startDrag(): void {
    this.napping = false;
    this.state.mode = 'dragging';
    this.state.animation = 'idle';
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.behaviorTimer = 0;
    this.sprite.play('idle', false, true);
  }

  endDrag(): void {
    this.fallStartY = this.state.y;
    this.state.mode = 'falling';
    this.state.grounded = false;
    this.state.lastInteraction = Date.now();
  }

  onClick(): void {
    if (this.state.paused || this.state.mode === 'dragging' || this.state.mode === 'falling') return;
    this.napping = false;
    this.state.lastInteraction = Date.now();

    const now = Date.now();
    this.petStreak = now - this.lastPetAt < 7000 ? this.petStreak + 1 : 1;
    this.lastPetAt = now;
    this.petTotal += 1;

    if (this.petStreak >= 5) {
      this.petStreak = 0;
      this.playSpecial('happy_bounce', CLICK_DURATION_MS.happy_bounce, 'OK OK. Internet famous.');
      return;
    }
    if (this.petTotal === 13) {
      this.playSpecial('startled', CLICK_DURATION_MS.startled, 'Unlucky for trash cans.');
      return;
    }

    this.playSpecial(
      this.settings.clickAction,
      CLICK_DURATION_MS[this.settings.clickAction],
      this.settings.speechBubbles && Math.random() < 0.6 ? this.pickQuip() : null,
    );
  }

  private pickQuip(): string {
    const extra = this.settings.spriteStyle === 'non-jacketed' ? this.QUIPS_FUR : this.QUIPS_JACKET;
    const seasonal = this.seasonalQuips();
    const ghost = this.settings.opacity === 60
      ? ['I\'m not a virus. I\'m a raccoon.', '*phases through your taskbar*']
      : [];
    const pool = [...this.QUIPS_SHARED, ...extra, ...seasonal, ...ghost];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private showRandomQuip(): void {
    if (!this.onSpeechBubble) return;
    this.onSpeechBubble(this.pickQuip());
  }

  private playSpecial(animation: string, durationMs: number, quip: string | null): void {
    this.state.mode = 'emoting';
    this.state.animation = animation;
    this.sprite.play(animation, false, true);
    this.behaviorDuration = durationMs;
    this.state.behaviorTimer = 0;
    if (quip && this.settings.speechBubbles && this.onSpeechBubble) {
      this.onSpeechBubble(quip);
    }
  }

  private seasonalQuips(): string[] {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
    const out: string[] = [];
    if (hour >= 2 && hour < 5) out.push('Why are you still up?', '*midnight snack run*', 'The moon is a snack. Prove me wrong.');
    if (hour >= 6 && hour < 9) out.push('Morning. I already ate the good trash.');
    if (hour >= 11 && hour < 14) out.push('Lunch? I brought an appetite.');
    if (day === 5) out.push('It\'s Friday. Trash night.', 'Friday energy. Raccoon energy.');
    if (day === 1) out.push('Monday. We steal joy back.');
    if (month === 9 && date === 31) out.push('I was a trash can last year.', 'Boo. Also, candy.');
    if (month === 3 && date === 1) out.push('April fools. The zipper is fake.');
    if (month === 11 && date === 25) out.push('I believed in you. And leftovers.');
    if (month === 0 && date === 1) out.push('New year. Same raccoon.');
    if (month === 6 && date === 4) out.push('Happy birthday to this city. Bring cake.');
    return out;
  }

  update(deltaMs: number, groundY: number, minX: number, maxX: number): void {
    if (this.state.paused) return;

    const s = this.state;
    this.minX = minX;
    this.maxX = maxX;
    this.groundY = groundY;

    if (s.mode === 'falling') {
      s.vy += GRAVITY * (deltaMs / 1000);
      s.y += s.vy * (deltaMs / 1000);
      if (s.y >= groundY) {
        s.y = groundY;
        s.vy = 0;
        s.grounded = true;
        const drop = groundY - this.fallStartY;
        if (drop > 140 * (petPx(this.settings.petScale) / PET_SIZE)) {
          this.playSpecial('startled', CLICK_DURATION_MS.startled, 'I can fly. Briefly.');
        } else {
          s.mode = 'idle';
          this.pickNextBehavior();
        }
      }
      return;
    }

    if (s.mode === 'dragging') return;

    if (s.mode === 'walking' || s.mode === 'running') {
      s.behaviorTimer += deltaMs;
      if (s.behaviorTimer >= this.behaviorDuration) {
        s.x = clamp(s.x, minX, maxX);
        this.arriveFromWalk();
        return;
      }
      const step = this.travelPixelsPerSecond() * (deltaMs / 1000);
      const dir = Math.sign(this.walkTargetX - s.x) || 1;
      if (Math.abs(this.walkTargetX - s.x) <= step) {
        s.x = clamp(this.walkTargetX, minX, maxX);
        this.arriveFromWalk();
      } else {
        s.x = clamp(s.x + dir * step, minX, maxX);
        s.facing = dir >= 0 ? 1 : -1;
        const anim = this.locomotionAnim();
        this.sprite.setPlaybackRate(this.locomotionRate());
        this.sprite.play(anim, s.facing === -1);
        if (s.x === minX || s.x === maxX) this.arriveFromWalk();
      }
      return;
    }

    s.x = clamp(s.x, minX, maxX);
    s.y = groundY;

    s.behaviorTimer += deltaMs;
    if (s.behaviorTimer >= this.behaviorDuration) {
      this.pickNextBehavior();
      s.behaviorTimer = 0;
      return;
    }

    this.sprite.play(s.animation, false);

    if (s.mode === 'idle' && Math.random() < BLINK_CHANCE) {
      this.playBlink();
      return;
    }

    if (s.mode === 'idle') {
      this.tickCorner(deltaMs);
      this.maybeSeasonalIdle();
      if (this.settings.speechBubbles && Math.random() < 0.0003) {
        this.showRandomQuip();
      }
    }
  }

  private tickCorner(deltaMs: number): void {
    const edge = 12;
    const atEdge = this.state.x <= this.minX + edge || this.state.x >= this.maxX - edge;
    if (!atEdge || this.state.mode !== 'idle') {
      this.cornerMs = 0;
      return;
    }
    this.cornerMs += deltaMs;
    if (this.cornerMs < 10000 || Date.now() - this.lastCornerQuipAt < 120000) return;
    this.lastCornerQuipAt = Date.now();
    this.cornerMs = 0;
    if (this.settings.speechBubbles && this.onSpeechBubble) {
      this.onSpeechBubble('This corner is mine now.');
    }
  }

  private maybeSeasonalIdle(): void {
    if (Date.now() - this.state.lastInteraction < 20000) return;
    if (!this.settings.speechBubbles || !this.onSpeechBubble) return;
    const lines = this.seasonalQuips();
    if (lines.length === 0) return;
    const key = lines.join('|');
    if (key === this.lastSeasonalKey) return;
    this.lastSeasonalKey = key;
    if (Math.random() < 0.35) {
      this.onSpeechBubble(lines[Math.floor(Math.random() * lines.length)]);
    }
  }

  private playBlink(): void {
    this.state.mode = 'emoting';
    this.state.animation = 'blink';
    this.sprite.play('blink');
    this.behaviorDuration = BLINK_MS;
    this.state.behaviorTimer = 0;
  }

  private arriveFromWalk(): void {
    const rest = wanderTuning(this.settings.wanderFrequency).restScale;
    this.state.mode = 'idle';
    this.state.animation = 'idle';
    this.behaviorDuration = randomBetween(IDLE_MIN, IDLE_MAX) * rest;
    this.state.behaviorTimer = 0;
    this.sprite.play('idle', false);
  }

  private pickNextBehavior(): void {
    if (this.napping) {
      this.state.mode = 'sleeping';
      this.state.animation = 'sleep';
      this.state.vx = 0;
      this.sprite.play('sleep', false);
      this.behaviorDuration = SLEEP_RECHECK_MS;
      return;
    }

    if (this.settings.sleepAtNight && isSleepTime()) {
      const wasSleeping = this.state.mode === 'sleeping';
      this.state.mode = 'sleeping';
      this.state.animation = 'sleep';
      this.state.vx = 0;
      this.sprite.play('sleep', false);
      this.behaviorDuration = SLEEP_RECHECK_MS;
      if (!wasSleeping && this.settings.speechBubbles && this.onSpeechBubble) {
        this.onSpeechBubble('Zzz...');
      }
      return;
    }

    if (this.settings.roaming && Math.random() < wanderTuning(this.settings.wanderFrequency).walkChance) {
      this.startWalk();
      return;
    }

    if (this.quietBeats > 0) {
      this.quietBeats -= 1;
      this.applyBehavior(IDLE_BEHAVIORS[0]);
      return;
    }

    const next = pickWeighted(IDLE_BEHAVIORS);
    if (next.animation !== 'idle') this.quietBeats = 2;
    this.applyBehavior(next);
  }

  private startWalk(): void {
    const span = Math.max(0, this.maxX - this.minX);
    if (span < 1) {
      this.applyBehavior(IDLE_BEHAVIORS[0]);
      return;
    }
    const walkMs = randomBetween(WALK_MIN, WALK_MAX);
    const maxDist = Math.min(span, this.travelPixelsPerSecond() * (walkMs / 1000));
    const dist = maxDist * randomBetween(0.5, 1);

    let dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    if (this.state.x + dir * dist > this.maxX) dir = -1;
    else if (this.state.x + dir * dist < this.minX) dir = 1;

    const target = clamp(this.state.x + dir * dist, this.minX, this.maxX);
    this.walkTargetX = target;
    const anim = this.locomotionAnim();
    this.state.mode = anim === 'run' ? 'running' : 'walking';
    this.state.animation = anim;
    this.state.behaviorTimer = 0;
    const speed = this.travelPixelsPerSecond();
    this.behaviorDuration = speed > 0 ? (Math.abs(target - this.state.x) / speed) * 1000 + 80 : walkMs;
    this.state.facing = target >= this.state.x ? 1 : -1;
    this.sprite.setPlaybackRate(this.locomotionRate());
    this.sprite.play(anim, this.state.facing === -1, true);
  }

  private locomotionAnim(): 'walk' | 'run' {
    return this.settings.pace === 'brisk' ? 'run' : 'walk';
  }

  private travelPixelsPerSecond(): number {
    const mood = wanderTuning(this.settings.wanderFrequency).speedScale;
    const size = petPx(this.settings.petScale) / PET_SIZE;
    if (this.settings.pace === 'brisk') {
      return RUN_SPEED * mood * size;
    }
    const pace = PACE_SPEED[this.settings.pace] ?? 1;
    return WALK_SPEED * pace * mood * size;
  }

  private locomotionRate(): number {
    const mood = wanderTuning(this.settings.wanderFrequency).speedScale;
    if (this.settings.pace === 'brisk') return mood;
    return (PACE_SPEED[this.settings.pace] ?? 1) * mood;
  }

  private applyBehavior(behavior: WeightedBehavior): void {
    this.state.mode = behavior.mode;
    this.state.animation = behavior.animation;
    this.behaviorDuration = randomBetween(behavior.durationMs[0], behavior.durationMs[1]);
    this.state.behaviorTimer = 0;
    this.sprite.play(behavior.animation, false, true);
  }
}
