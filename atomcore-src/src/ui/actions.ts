import * as A from '../game/actions';
import { useGameStore, getGame } from '../stores/gameStore';
import { useUI } from '../stores/uiStore';
import { useSettings } from '../stores/settingsStore';
import { audio } from '../systems/audio/audio';
import { persist } from '../systems/loop';
import { BUILDINGS } from '../game/buildings/defs';
import type { GameState } from '../game/types';

// UI-facing wrappers: run a game action, then give feedback (sound, haptics,
// error toast) and refresh the views.

export function haptic(ms = 10) {
  if (!useSettings.getState().haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported (iOS Safari) */
  }
}

export function run(fn: (g: GameState) => string | null, opts: { structural?: boolean; sound?: Parameters<typeof audio.sfx>[0] | null; okText?: string } = {}): boolean {
  const err = fn(getGame());
  if (err) {
    audio.sfx('error');
    useUI.getState().pushToast({ kind: 'warn', title: err });
    return false;
  }
  if (opts.sound !== null) audio.sfx(opts.sound ?? 'click');
  haptic();
  useGameStore.getState().bump(opts.structural ?? false);
  if (opts.okText) useUI.getState().pushToast({ kind: 'good', title: opts.okText });
  return true;
}

export function placeAt(x: number, z: number, keepPlacing = false): boolean {
  const pl = useUI.getState().placement;
  if (!pl) return false;
  const ok = run((g) => A.placeBuilding(g, pl.type, x, z, pl.rot), { structural: true, sound: 'place' });
  if (ok) {
    haptic(25);
    const g = getGame();
    // Keep placing only if the player asked to and can afford another.
    if (!keepPlacing || g.money < A.buildCost(g, pl.type)) useUI.getState().cancelPlacement();
    else useUI.getState().updatePlacement({ x: null, z: null });
    void persist();
  }
  return ok;
}

export function confirmPlacement(): boolean {
  const pl = useUI.getState().placement;
  if (!pl || pl.x === null || pl.z === null) {
    useUI.getState().pushToast({ kind: 'info', title: 'Tap the ground to choose a spot' });
    return false;
  }
  return placeAt(pl.x, pl.z);
}

export function rotatePlacement() {
  const pl = useUI.getState().placement;
  if (!pl) return;
  audio.sfx('click');
  useUI.getState().updatePlacement({ rot: (pl.rot + 1) % 4 });
}

export function beginBuild(type: Parameters<typeof A.buildLockReason>[1]) {
  const g = getGame();
  const lock = A.buildLockReason(g, type);
  if (lock) {
    audio.sfx('error');
    useUI.getState().pushToast({ kind: 'warn', title: lock });
    return;
  }
  if (g.money < A.buildCost(g, type)) {
    audio.sfx('error');
    useUI.getState().pushToast({ kind: 'warn', title: `Not enough money for ${BUILDINGS[type].short}` });
    return;
  }
  audio.sfx('open');
  const ui = useUI.getState();
  ui.startPlacement(type);
  ui.setPanel(null);
}

export function confirm(title: string, text: string, confirmLabel: string, onConfirm: () => void, danger = false) {
  useUI.getState().setModal({ kind: 'confirm', title, text, confirmLabel, onConfirm, danger });
}

export { A };
