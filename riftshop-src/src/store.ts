import { create } from 'zustand';
import type { GameState } from './game/types';
import { SAVE_VERSION, advance, catchUp, migrate, newGame } from './game/sim';
import { SECONDS_PER_HOUR } from './game/economy';
import type { Pull } from './game/packs';
import type { SetId } from './data/cards';

const KEY = 'riftshop-save-v1';
const BACKUP_KEY = 'riftshop-backups';
const MAX_BACKUPS = 8;

/** A copy of the save kept on the phone, so a bad load or a stale tab can never lose progress for good. */
export interface Backup {
  at: number;
  label: string;
  level: number;
  cash: number;
  day: number;
  data: string;
}

export function listBackups(): Backup[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]') as Backup[];
  } catch {
    return [];
  }
}

function addBackup(data: string, label: string): void {
  try {
    let info = { level: 0, cash: 0, day: 0 };
    try { const p = JSON.parse(data); info = { level: p.level ?? 1, cash: p.cash ?? 0, day: p.day ?? 1 }; } catch { /* broken save: keep it as is */ }
    const list = listBackups().filter((b) => b.data !== data);
    list.unshift({ at: Date.now(), label, ...info, data });
    // Keep the newest few, and never more than ~1.5 MB.
    while (list.length > MAX_BACKUPS || (list.length > 2 && JSON.stringify(list).length > 1_500_000)) list.pop();
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list));
  } catch {
    /* storage full: backups are best effort */
  }
}

/** savedAt of the save this copy of the game last loaded or wrote. Another tab writing a newer one stops us saving. */
let lastSavedAt = 0;
let suspended = false;
export let loadProblem: string | null = null;

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
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    loadProblem = 'This browser blocked the save. Progress will not be kept.';
    suspended = true;
    return { g: newGame(), away: 0 };
  }
  if (!raw) return { g: newGame(), away: 0 };
  try {
    const parsed = JSON.parse(raw);
    if (!(parsed.version <= SAVE_VERSION)) throw new Error('save from a newer version');
    if (parsed.version < SAVE_VERSION) addBackup(raw, 'Before update');
    else if (!listBackups().some((b) => Date.now() - b.at < 20 * 60_000)) addBackup(raw, 'Auto');
    lastSavedAt = parsed.savedAt ?? 0;
    const g = migrate(parsed);
    const away = (Date.now() - (g.savedAt || Date.now())) / 1000;
    const hours = catchUp(g, away, SECONDS_PER_HOUR);
    return { g, away: hours };
  } catch (e) {
    // Never throw a save away: keep it in the backups and tell the player.
    addBackup(raw, 'Could not load');
    console.error('Save failed to load', e);
    loadProblem = 'Your save could not be loaded, so a new shop was started. The old save is kept under Backups (bottom of the page).';
    return { g: newGame(), away: 0 };
  }
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

/** True if another copy of the game (another tab, or an old copy kept in memory) saved after us. */
function newerSaveElsewhere(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const m = raw.match(/"savedAt":(\d+)/);
    return !!m && Number(m[1]) > lastSavedAt + 1;
  } catch {
    return false;
  }
}

export function save(): void {
  if (suspended) return;
  if (newerSaveElsewhere()) {
    // Don't overwrite newer progress with this stale copy: load the newer save instead.
    suspended = true;
    location.reload();
    return;
  }
  const g = useStore.getState().g;
  g.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
    lastSavedAt = g.savedAt;
  } catch {
    /* storage full or blocked */
  }
}

/** Keep a backup now (called when a shop day closes). */
export function backupNow(label: string): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) addBackup(raw, label);
  } catch {
    /* ignore */
  }
}

/** Replace the current game with a backup or an imported save, then restart the app on it. */
export function restoreSave(data: string): string | null {
  let parsed: { version?: number; cash?: number };
  try {
    parsed = JSON.parse(data);
  } catch {
    return 'That is not a valid save.';
  }
  if (typeof parsed !== 'object' || !parsed || typeof parsed.cash !== 'number' || !(Number(parsed.version) <= SAVE_VERSION)) return 'That is not a valid save.';
  try {
    migrate(JSON.parse(data));
  } catch {
    return 'That save could not be loaded.';
  }
  const cur = localStorage.getItem(KEY);
  if (cur) addBackup(cur, 'Before restore');
  suspended = true;
  (parsed as { savedAt?: number }).savedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(parsed));
  location.reload();
  return null;
}

export function exportSave(): string {
  save();
  return localStorage.getItem(KEY) ?? JSON.stringify(useStore.getState().g);
}

export function resetGame(): void {
  const cur = localStorage.getItem(KEY);
  if (cur) addBackup(cur, 'Before start over');
  localStorage.removeItem(KEY);
  lastSavedAt = 0;
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
    if (saveTimer > 5 && document.visibilityState === 'visible') {
      saveTimer = 0;
      save();
    }
  }, 250);
  let lastDay = useStore.getState().g.day;
  setInterval(() => {
    const d = useStore.getState().g.day;
    if (d !== lastDay) { lastDay = d; save(); backupNow(`Day ${d}`); }
  }, 2000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
    else if (newerSaveElsewhere()) { suspended = true; location.reload(); }
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
