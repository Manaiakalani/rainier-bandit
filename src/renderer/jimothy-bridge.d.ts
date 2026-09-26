import type { Settings } from '../shared/types';

declare global {
  interface Window {
    jimothy: {
      setIgnoreMouse: (ignore: boolean) => void;
      moveWindow: (x: number, y: number) => void;
      startDrag: () => void;
      endDrag: () => Promise<{ x: number; y: number }>;
      getWorkArea: (point?: { x: number; y: number }) => Promise<{ x: number; y: number; width: number; height: number }>;
      getWindowPos: () => Promise<{ x: number; y: number }>;
      getPauseState: () => Promise<boolean>;
      togglePause: () => void;
      getNapState: () => Promise<boolean>;
      setNapping: (napping: boolean) => void;
      onToggleNap: (cb: (napping: boolean) => void) => () => void;
      getAppInfo: () => Promise<{ version: string; platform: string }>;
      showContextMenu: () => void;
      onTogglePause: (cb: (paused: boolean) => void) => () => void;
      onPetReaction: (cb: () => void) => () => void;
      getSettings: () => Promise<Settings>;
      updateSettings: (partial: Partial<Settings>) => Promise<Settings>;
      onSettingsChanged: (cb: (settings: Settings) => void) => () => void;
      openSettings: () => void;
      resetPosition: () => void;
      onResetPosition: (cb: (pos: { x: number; y: number; workArea: { x: number; y: number; width: number; height: number } }) => void) => () => void;
      onWorkAreaChanged: (cb: (pos: { x: number; y: number; workArea: { x: number; y: number; width: number; height: number } }) => void) => () => void;
      onVisibility: (cb: (visible: boolean) => void) => () => void;
      onCursor: (cb: (pos: { x: number; y: number }) => void) => () => void;
    };
  }
}

export {};
