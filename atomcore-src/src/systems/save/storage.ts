import { get, set, del, createStore, type UseStore } from 'idb-keyval';
import type { GameState } from '../../game/types';
import { toEnvelope, migrate } from './serialize';

// Local persistence: IndexedDB (via idb-keyval) with a localStorage fallback
// for browsers where IndexedDB is unavailable (some private modes).

const SAVE_KEY = 'atomcore-save';
const BACKUP_KEY = 'atomcore-backup';
const SETTINGS_KEY = 'atomcore-settings';

let store: UseStore | null = null;
let idbOk = true;

function getStore(): UseStore | null {
  if (!idbOk) return null;
  if (!store) {
    try {
      store = createStore('atomcore', 'kv');
    } catch {
      idbOk = false;
      return null;
    }
  }
  return store;
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const st = getStore();
  if (st) {
    try {
      return await get<T>(key, st);
    } catch {
      idbOk = false;
    }
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const st = getStore();
  if (st) {
    try {
      await set(key, value, st);
      return;
    } catch {
      idbOk = false;
    }
  }
  localStorage.setItem(key, JSON.stringify(value));
}

let lastBackup = 0;

export async function saveGame(s: GameState): Promise<number> {
  const env = toEnvelope(s);
  await idbSet(SAVE_KEY, env);
  // Rolling backup every 5 minutes, so a bad save never destroys progress.
  if (Date.now() - lastBackup > 5 * 60_000) {
    lastBackup = Date.now();
    await idbSet(BACKUP_KEY, env);
  }
  return env.savedAt;
}

export interface LoadResult {
  state: GameState | null;
  savedAt: number;
  error?: string;
  fromBackup?: boolean;
}

export async function loadGame(): Promise<LoadResult> {
  const raw = await idbGet<{ savedAt?: number }>(SAVE_KEY);
  if (!raw) return { state: null, savedAt: 0 };
  try {
    const state = migrate(raw);
    return { state, savedAt: raw.savedAt ?? state.savedAt };
  } catch (e) {
    // Try the backup before giving up.
    const backup = await idbGet<{ savedAt?: number }>(BACKUP_KEY);
    if (backup) {
      try {
        const state = migrate(backup);
        return { state, savedAt: backup.savedAt ?? state.savedAt, fromBackup: true, error: (e as Error).message };
      } catch {
        /* fall through */
      }
    }
    return { state: null, savedAt: 0, error: (e as Error).message };
  }
}

export async function wipeSave(): Promise<void> {
  const st = getStore();
  if (st) {
    try {
      await del(SAVE_KEY, st);
      await del(BACKUP_KEY, st);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadSettingsRaw<T>(): Promise<T | undefined> {
  return idbGet<T>(SETTINGS_KEY);
}

export async function saveSettingsRaw(v: unknown): Promise<void> {
  await idbSet(SETTINGS_KEY, v);
}

/** Ask the browser to keep our storage (helps on iOS home-screen apps). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
