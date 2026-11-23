import { tick } from '../game/engine';
import { useGameStore, structureSignature } from '../stores/gameStore';
import { useUI } from '../stores/uiStore';
import { saveGame } from './save/storage';
import { simulateOffline } from './offline/offline';
import { audio } from './audio/audio';
import type { Notice } from '../game/types';

// Fixed-step simulation loop, independent of rendering. Runs at 10 Hz in the
// foreground; when the page is hidden (or iOS suspends the app) the elapsed
// time is handled by the offline simulation when it comes back.

const STEP = 0.1;
const AUTOSAVE_MS = 15_000;
let timer: number | null = null;
let last = 0;
let acc = 0;
let lastSave = 0;
let lastSig = '';
let hiddenAt = 0;
let saveEnabled = true;

/** Debug sandboxes disable saving so they never overwrite a real save. */
export function setSaveEnabled(on: boolean): void {
  saveEnabled = on;
}

function drainNotices() {
  const g = useGameStore.getState().game;
  if (!g.pendingNotices.length) return;
  const list = g.pendingNotices.splice(0);
  const ui = useUI.getState();
  for (const n of list) {
    ui.pushToast(n);
    playNoticeSound(n);
  }
}

function playNoticeSound(n: Notice) {
  switch (n.kind) {
    case 'achievement':
    case 'level':
      audio.sfx('achievement');
      break;
    case 'build':
      audio.sfx('complete');
      break;
    case 'research':
      audio.sfx('research');
      break;
    case 'scram':
      audio.sfx('alarm');
      break;
    case 'bad':
    case 'warn':
      audio.sfx('warn');
      break;
    default:
      audio.sfx('notify');
  }
}

function frame() {
  // Wall-clock time is used so suspended apps (iOS) are measured correctly.
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  // Timer throttling or a suspended tab: hand long gaps to the offline simulator.
  if (dt > 30) {
    hiddenAt = 0; // the visibility handler must not count this gap again
    runCatchUp(dt);
    return;
  }
  acc += Math.min(dt, 2);
  const store = useGameStore.getState();
  const g = store.game;
  let steps = 0;
  while (acc >= STEP && steps < 40) {
    tick(g, STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === 0) return;
  const sig = structureSignature(g);
  const structural = sig !== lastSig;
  lastSig = sig;
  store.bump(structural);
  drainNotices();
  audio.updatePlant(g);
  if (Date.now() - lastSave > AUTOSAVE_MS) void persist();
}

function runCatchUp(seconds: number) {
  const store = useGameStore.getState();
  const report = simulateOffline(store.game, seconds);
  store.bump(true);
  if (report && report.simulated > 120) useUI.getState().setModal({ kind: 'offline', report });
  void persist();
}

export async function persist(): Promise<void> {
  lastSave = Date.now();
  if (!saveEnabled) return;
  try {
    const t = await saveGame(useGameStore.getState().game);
    useGameStore.getState().setSavedAt(t);
  } catch (e) {
    console.warn('Save failed', e);
  }
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
    void persist();
    audio.suspend();
  } else {
    audio.resume();
    if (hiddenAt) {
      const away = (Date.now() - hiddenAt) / 1000;
      hiddenAt = 0;
      last = Date.now();
      if (away > 30) runCatchUp(away);
    }
  }
}

export function startLoop(): void {
  if (timer !== null) return;
  last = Date.now();
  lastSave = Date.now();
  timer = window.setInterval(frame, 100);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => void persist());
}

export function stopLoop(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onVisibility);
}
