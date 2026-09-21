// --- Behavior types ---

export type BehaviorMode =
  | 'idle'
  | 'walking'
  | 'running'
  | 'sneaking'
  | 'sleeping'
  | 'dragging'
  | 'falling'
  | 'emoting';

export interface PetState {
  mode: BehaviorMode;
  animation: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1; // 1 = right, -1 = left
  grounded: boolean;
  paused: boolean;
  behaviorTimer: number;
  lastInteraction: number;
}

export interface WeightedBehavior {
  animation: string;
  mode: BehaviorMode;
  weight: number;
  durationMs: [number, number]; // [min, max]
}

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- User settings (persisted to userData/settings.json) ---

export type WanderFrequency = 'calm' | 'normal' | 'active';
export type SpriteStyle = 'jacketed' | 'non-jacketed';
export type WalkPace = 'slow' | 'normal' | 'brisk';
export type ClickAction = 'paw_wave' | 'happy_bounce' | 'startled';
export type OpacityLevel = 60 | 80 | 100;
export type PetScale = 'small' | 'medium' | 'large';

export interface Settings {
  /** Let Jimothy walk around the bottom of the screen. */
  roaming: boolean;
  /** How often he wanders when roaming is on. */
  wanderFrequency: WanderFrequency;
  /** Subtle feet-planted breathing motion. */
  breathing: boolean;
  /** Random speech-bubble quips. */
  speechBubbles: boolean;
  /** Sit and doze between SLEEP_HOUR_START and SLEEP_HOUR_END. */
  sleepAtNight: boolean;
  /** Launch Jimothy automatically at login. */
  launchAtLogin: boolean;
  /** True after the first-run greeting has been shown. */
  greeted: boolean;
  /** Jacketed or natural fur. */
  spriteStyle: SpriteStyle;
  /** How fast he covers ground while roaming. */
  pace: WalkPace;
  /** What a click does. */
  clickAction: ClickAction;
  /** Window opacity percent. */
  opacity: OpacityLevel;
  /** How big he is on the desktop. */
  petScale: PetScale;
}
