import type { ClickAction, OpacityLevel, PetScale, Settings, SpriteStyle, WalkPace, WanderFrequency } from './types';

export const APP_VERSION = '1.0.0';

export const IPC = {
  SET_IGNORE_MOUSE: 'set-ignore-mouse',
  MOVE_WINDOW: 'move-window',
  START_DRAG: 'start-drag',
  END_DRAG: 'end-drag',
  GET_WORK_AREA: 'get-work-area',
  GET_WINDOW_POS: 'get-window-pos',
  SHOW_CONTEXT_MENU: 'show-context-menu',
  TOGGLE_PAUSE: 'toggle-pause',
  GET_PAUSE_STATE: 'get-pause-state',
  PET_REACTION: 'pet-reaction',
  TOGGLE_NAP: 'toggle-nap',
  GET_NAP_STATE: 'get-nap-state',
  QUIT_APP: 'quit-app',
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',
  SETTINGS_CHANGED: 'settings-changed',
  OPEN_SETTINGS: 'open-settings',
  RESET_POSITION: 'reset-position',
  GET_APP_INFO: 'get-app-info',
  CURSOR: 'cursor',
} as const;

export const PET_SIZE = 200;
export const WINDOW_SIZE = 300;
export const WINDOW_EXTRA = 100;
export const PET_PX: Record<PetScale, number> = {
  small: 144,
  medium: 200,
  large: 280,
};

export function petPx(scale: PetScale = 'medium'): number {
  return PET_PX[scale] ?? PET_SIZE;
}

export function windowPx(scale: PetScale = 'medium'): number {
  return petPx(scale) + WINDOW_EXTRA;
}
/** Source-cell row (in 512px masters) where standing feet sit. */
export const FOOT_BASELINE = 470;
/** Pixels of canvas left under the feet. */
export const FOOT_GAP = 2;
/** Drop the overlay this many pixels onto the taskbar. */
export const TASKBAR_TUCK = 8;

export const GRAVITY = 800;
export const WALK_SPEED = 88;
export const RUN_SPEED = 120;
export const SNEAK_SPEED = 30;

export const IDLE_MIN = 10000;
export const IDLE_MAX = 22000;
export const WALK_MIN = 2000;
export const WALK_MAX = 6000;
export const SLEEP_HOUR_START = 22;
export const SLEEP_HOUR_END = 7;
export const SLEEP_RECHECK_MS = 30_000;
export const CLICK_EMOTE_MS = 1500;
export const BLINK_MS = 480;
export const BLINK_CHANCE = 0;
export const DRAG_THRESHOLD_PX = 5;
export const HIT_ALPHA_THRESHOLD = 20;
export const MAX_FRAME_DELTA_MS = 100;

export const DEFAULT_SETTINGS: Settings = {
  roaming: false,
  wanderFrequency: 'normal',
  breathing: true,
  speechBubbles: true,
  sleepAtNight: true,
  launchAtLogin: false,
  greeted: false,
  spriteStyle: 'jacketed',
  pace: 'normal',
  clickAction: 'paw_wave',
  opacity: 100,
  petScale: 'medium',
};

export const WANDER_VALUES: readonly WanderFrequency[] = ['calm', 'normal', 'active'];
export const STYLE_VALUES: readonly SpriteStyle[] = ['jacketed', 'non-jacketed'];
export const PACE_VALUES: readonly WalkPace[] = ['slow', 'normal', 'brisk'];
export const CLICK_VALUES: readonly ClickAction[] = ['paw_wave', 'happy_bounce', 'startled'];
export const OPACITY_VALUES: readonly OpacityLevel[] = [60, 80, 100];
export const SCALE_VALUES: readonly PetScale[] = ['small', 'medium', 'large'];
export const PACE_SPEED: Record<WalkPace, number> = {
  slow: 0.45,
  normal: 1,
  brisk: 1.55,
};
export const CLICK_DURATION_MS: Record<ClickAction, number> = {
  paw_wave: 1000,
  happy_bounce: 1000,
  startled: 840,
};

export const WANDER_TUNING: Record<WanderFrequency, { walkChance: number; restScale: number; speedScale: number }> = {
  calm: { walkChance: 0.25, restScale: 1.8, speedScale: 0.7 },
  normal: { walkChance: 0.5, restScale: 1.0, speedScale: 1 },
  active: { walkChance: 0.75, restScale: 0.6, speedScale: 1.15 },
};

export const DEFAULT_SPRITE_STYLE = 'jacketed';
