import { create } from 'zustand';
import type { GameState } from '../game/types';
import { createInitialState } from '../game/state';
import { clearModCache } from '../game/simulation/modifiers';

// The game state object is mutated in place by the engine (fast, no garbage).
// Components subscribe to revision counters instead of deep values:
//  • rev       — bumps every simulation tick (HUD, panels)
//  • structure — bumps when buildings are added/removed/changed (3D scene)

interface GameStore {
  game: GameState;
  rev: number;
  structure: number;
  lastSavedAt: number;
  setGame: (g: GameState) => void;
  bump: (structural?: boolean) => void;
  setSavedAt: (t: number) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: createInitialState(),
  rev: 0,
  structure: 0,
  lastSavedAt: 0,
  setGame: (g) => {
    clearModCache();
    set((s) => ({ game: g, rev: s.rev + 1, structure: s.structure + 1 }));
  },
  bump: (structural = false) => set((s) => ({ rev: s.rev + 1, structure: structural ? s.structure + 1 : s.structure })),
  setSavedAt: (t) => set({ lastSavedAt: t }),
}));

/** Re-render on every tick and return the live game state. */
export function useGame(): GameState {
  useGameStore((s) => s.rev);
  return useGameStore.getState().game;
}

export function getGame(): GameState {
  return useGameStore.getState().game;
}

/** Signature of everything that changes the 3D layout of a site. */
export function structureSignature(g: GameState): string {
  const site = g.sites[g.activeSite];
  let sig = `${g.activeSite}:${site.size}:`;
  for (const b of site.buildings) {
    sig += `${b.id},${b.type},${b.x},${b.z},${b.rot},${b.level},${b.status[0]}${b.status === 'destroyed' ? 'x' : ''}`;
    if (b.vehicles) sig += `|${b.vehicles.excavators.join('.')}|${b.vehicles.trucks.join('.')}`;
    sig += ';';
  }
  return sig;
}
