import type { ClickAction, OpacityLevel, PetScale, Settings, SpriteStyle, WalkPace, WanderFrequency } from '../shared/types';

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const controls = {
  roaming: $<HTMLInputElement>('roaming'),
  wanderRow: $<HTMLDivElement>('wanderRow'),
  paceRow: $<HTMLDivElement>('paceRow'),
  wanderFrequency: $<HTMLSelectElement>('wanderFrequency'),
  breathing: $<HTMLInputElement>('breathing'),
  speechBubbles: $<HTMLInputElement>('speechBubbles'),
  sleepAtNight: $<HTMLInputElement>('sleepAtNight'),
  launchAtLogin: $<HTMLInputElement>('launchAtLogin'),
  resetPosition: $<HTMLButtonElement>('resetPosition'),
  pauseBtn: $<HTMLButtonElement>('pauseBtn'),
  versionLine: $<HTMLParagraphElement>('versionLine'),
  portrait: $<HTMLImageElement>('portrait'),
};

function setSeg(id: string, value: string): void {
  const group = $(id);
  Array.from(group.querySelectorAll<HTMLButtonElement>('.seg-btn')).forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === value));
  });
}

function bindSeg(id: string, onPick: (value: string) => void): void {
  $(id).addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.seg-btn');
    if (!btn?.dataset.value) return;
    event.preventDefault();
    setSeg(id, btn.dataset.value);
    onPick(btn.dataset.value);
  });
}

function render(s: Settings): void {
  controls.roaming.checked = s.roaming;
  controls.wanderFrequency.value = s.wanderFrequency;
  controls.breathing.checked = s.breathing;
  controls.speechBubbles.checked = s.speechBubbles;
  controls.sleepAtNight.checked = s.sleepAtNight;
  controls.launchAtLogin.checked = s.launchAtLogin;
  controls.wanderRow.hidden = !s.roaming;
  controls.paceRow.hidden = !s.roaming;
  setSeg('spriteStyle', s.spriteStyle);
  setSeg('petScale', s.petScale);
  setSeg('pace', s.pace);
  setSeg('clickAction', s.clickAction);
  setSeg('opacity', String(s.opacity));
  controls.portrait.src = s.spriteStyle === 'non-jacketed'
    ? '../../src/assets/icons/jimothy-portrait-nojacket.png'
    : '../../src/assets/icons/jimothy-portrait.png';
}

function save(partial: Partial<Settings>): void {
  void window.jimothy.updateSettings(partial).catch((err) => {
    console.error('Failed to save settings', err);
  });
}

async function init(): Promise<void> {
  if (!window.jimothy) {
    controls.versionLine.textContent = 'Settings failed to connect.';
    return;
  }

  document.getElementById('settings-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  render(await window.jimothy.getSettings());

  const info = await window.jimothy.getAppInfo();
  const platformLabel = info.platform === 'darwin' ? 'macOS' : info.platform === 'win32' ? 'Windows' : info.platform;
  controls.versionLine.textContent = `Jimothy ${info.version} · ${platformLabel}`;

  let paused = await window.jimothy.getPauseState();
  const paintPause = (): void => {
    controls.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  };
  paintPause();
  window.jimothy.onTogglePause((next) => {
    paused = next;
    paintPause();
  });

  controls.roaming.addEventListener('change', () => {
    controls.wanderRow.hidden = !controls.roaming.checked;
    controls.paceRow.hidden = !controls.roaming.checked;
    save({ roaming: controls.roaming.checked });
  });
  controls.wanderFrequency.addEventListener('change', () =>
    save({ wanderFrequency: controls.wanderFrequency.value as WanderFrequency }));
  controls.breathing.addEventListener('change', () =>
    save({ breathing: controls.breathing.checked }));
  controls.speechBubbles.addEventListener('change', () =>
    save({ speechBubbles: controls.speechBubbles.checked }));
  controls.sleepAtNight.addEventListener('change', () =>
    save({ sleepAtNight: controls.sleepAtNight.checked }));
  controls.launchAtLogin.addEventListener('change', () =>
    save({ launchAtLogin: controls.launchAtLogin.checked }));
  controls.resetPosition.addEventListener('click', () =>
    window.jimothy.resetPosition());
  controls.pauseBtn.addEventListener('click', () =>
    window.jimothy.togglePause());

  bindSeg('spriteStyle', (value) => save({ spriteStyle: value as SpriteStyle }));
  bindSeg('petScale', (value) => save({ petScale: value as PetScale }));
  bindSeg('pace', (value) => save({ pace: value as WalkPace }));
  bindSeg('clickAction', (value) => save({ clickAction: value as ClickAction }));
  bindSeg('opacity', (value) => save({ opacity: Number(value) as OpacityLevel }));

  window.jimothy.onSettingsChanged(render);
}

init().catch((err) => console.error('Settings failed to load:', err));
