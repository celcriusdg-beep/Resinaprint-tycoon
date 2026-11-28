import { create } from 'zustand';
import type { GameState } from './game/types';
import { SAVE_VERSION, advance, catchUp, migrate, newGame } from './game/sim';
import { SECONDS_PER_HOUR } from './game/economy';
import type { Pull } from './game/packs';
import type { SetId } from './data/cards';

const KEY = 'riftshop-save-v1';

export type Tab = 'shop' | 'stock' | 'binder' | 'market' | 'grading' | 'goals';

export interface Opening {
  set: SetId;
  packs: Pull[][];
}

interface Store {
  g: GameState;
  rev: number;
  tab: Tab;
  cardId: string | null;
  opening: Opening | null;
  toast: { text: string; bad?: boolean; id: number } | null;
  welcome: { hours: number } | null;
  setTab: (t: Tab) => void;
  showCard: (id: string | null) => void;
  setOpening: (o: Opening | null) => void;
  say: (text: string, bad?: boolean) => void;
  closeWelcome: () => void;
}

function load(): { g: GameState; away: number } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version <= SAVE_VERSION) {
        const g = migrate(parsed);
        const away = (Date.now() - (g.savedAt || Date.now())) / 1000;
        const hours = catchUp(g, away, SECONDS_PER_HOUR);
        return { g, away: hours };
      }
    }
  } catch {
    /* corrupted or blocked storage: start fresh */
  }
  return { g: newGame(), away: 0 };
}

const initial = load();

export const useStore = create<Store>((set) => ({
  g: initial.g,
  rev: 0,
  tab: 'shop',
  cardId: null,
  opening: null,
  toast: null,
  welcome: initial.away > 0.5 ? { hours: initial.away } : null,
  setTab: (tab) => set({ tab }),
  showCard: (cardId) => set({ cardId }),
  setOpening: (opening) => set({ opening }),
  say: (text, bad) => set({ toast: { text, bad, id: Date.now() } }),
  closeWelcome: () => set({ welcome: null }),
}));

/** Run a game action, then refresh the UI. Returns the action's result. */
export function act<T>(fn: (g: GameState) => T): T {
  const s = useStore.getState();
  const r = fn(s.g);
  useStore.setState({ rev: s.rev + 1 });
  return r;
}

/** Run an action that returns an error message or null; shows the error. */
export function tryAct(fn: (g: GameState) => string | null, ok?: string): boolean {
  const err = act(fn);
  if (err) useStore.getState().say(err, true);
  else if (ok) useStore.getState().say(ok);
  return !err;
}

export function save(): void {
  const g = useStore.getState().g;
  g.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    /* storage full or blocked */
  }
}

export function resetGame(): void {
  localStorage.removeItem(KEY);
  useStore.setState({ g: newGame(), rev: 0, tab: 'shop', cardId: null, opening: null });
}

let last = performance.now();
let saveTimer = 0;

export function startLoop(): void {
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(5, (now - last) / 1000);
    last = now;
    const s = useStore.getState();
    advance(s.g, dt / SECONDS_PER_HOUR);
    useStore.setState({ rev: s.rev + 1 });
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      save();
    }
  }, 250);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
    else {
      // Coming back: catch up on the time away, then resume.
      const g = useStore.getState().g;
      const away = (Date.now() - g.savedAt) / 1000;
      if (away > 10) {
        const hours = catchUp(g, away, SECONDS_PER_HOUR);
        if (hours > 0.5) useStore.setState({ welcome: { hours } });
      }
      last = performance.now();
    }
  });
  window.addEventListener('pagehide', save);
}
