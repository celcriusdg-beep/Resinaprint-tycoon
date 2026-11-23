import type { GameState } from '../../game/types';
import { createInitialState } from '../../game/state';
import { SAVE_VERSION } from '../../game/constants';
import { emptyStats } from '../../game/simulation/plant';
import { emptyCounters } from '../../game/progression/daily';
import { BUILDINGS } from '../../game/buildings/defs';
import { newReactorState, initEquilibrium } from '../../game/simulation/reactor';
import { reserveFor } from '../../game/supply/fuelcycle';
import { LOCATION_BY_ID } from '../../game/progression/locations';

// Pure (de)serialisation and migration. No storage APIs here so it can be unit tested.

export interface SaveEnvelope {
  format: 'atomcore-save';
  version: number;
  savedAt: number;
  state: GameState;
}

export function toEnvelope(s: GameState): SaveEnvelope {
  const state: GameState = { ...s, pendingNotices: [], savedAt: Date.now() };
  return { format: 'atomcore-save', version: SAVE_VERSION, savedAt: state.savedAt, state };
}

/** Fill in any field missing from an older or partial save using a fresh default. */
function mergeDefaults<T>(value: unknown, def: T): T {
  if (Array.isArray(def)) return (Array.isArray(value) ? value : def) as T;
  if (def && typeof def === 'object') {
    const out: Record<string, unknown> = { ...(def as Record<string, unknown>) };
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const d = (def as Record<string, unknown>)[k];
        out[k] = d !== undefined && d !== null && typeof d === 'object' && !Array.isArray(d) ? mergeDefaults(v, d) : v;
      }
    }
    return out as T;
  }
  return (value === undefined ? def : value) as T;
}

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Save data is empty or corrupted.');
  const env = raw as Partial<SaveEnvelope>;
  const stateRaw = env.format === 'atomcore-save' ? env.state : raw;
  if (!stateRaw || typeof stateRaw !== 'object') throw new Error('Save data has no game state.');
  const version = (stateRaw as GameState).version ?? 0;
  if (version > SAVE_VERSION) throw new Error('This save was made by a newer version of ATOMCORE.');
  const base = createInitialState();
  const s = mergeDefaults(stateRaw, base) as GameState;
  // Sites hold arrays of buildings: sanitise each one.
  for (const [id, site] of Object.entries(s.sites)) {
    site.id = id;
    site.stats = { ...emptyStats(), ...(site.stats ?? {}) };
    site.buildings = (site.buildings ?? []).filter((b) => b && BUILDINGS[b.type]);
    for (const b of site.buildings) {
      if (BUILDINGS[b.type].reactor) b.reactor = { ...newReactorState(), ...(b.reactor ?? {}) };
      b.condition = Number.isFinite(b.condition) ? b.condition : 100;
      b.enabled = b.enabled !== false;
    }
  }
  // v1 → v2: fuel was counted in 10 MWh units, now in 100 MWh assemblies.
  if (version < 2) {
    s.fuel = Math.round((s.fuel ?? 0) / 10);
    s.supply.defects = s.fuel * 0.002;
  }
  for (const site of Object.values(s.sites)) {
    site.storageWater = Number.isFinite(site.storageWater) ? site.storageWater : 0;
    site.spent = site.spent ?? { pool: 0, casks: 0 };
    site.blackoutTime = Number.isFinite(site.blackoutTime) ? site.blackoutTime : 0;
    for (const b of site.buildings) if (b.type === 'uranium_mine' && b.reserve === undefined) b.reserve = reserveFor(b.level);
  }
  // v2 → v3: reactors gain kinetics state; start each one in a consistent steady state.
  if (version < 3) {
    for (const [id, site] of Object.entries(s.sites)) {
      for (const b of site.buildings) {
        if (!b.reactor || b.status === 'destroyed') continue;
        const running = b.status === 'active' && !b.reactor.scrammed;
        initEquilibrium(b, LOCATION_BY_ID[id]?.ambient ?? 18, running ? Math.max(0.05, Math.min(1, b.reactor.power || b.reactor.setpoint)) : 0);
        if (!running) b.reactor.scrammed = b.status === 'active' && b.reactor.scrammed;
      }
    }
  }
  s.unlockedSites = s.unlockedSites.filter((id) => s.sites[id]);
  if (!s.unlockedSites.length) throw new Error('Save data has no plant sites.');
  if (!s.sites[s.activeSite]) s.activeSite = s.unlockedSites[0];
  s.daily.counters = { ...emptyCounters(), ...(s.daily.counters ?? {}) };
  s.pendingNotices = [];
  if (!Number.isFinite(s.money)) throw new Error('Save data is corrupted (money).');
  s.version = SAVE_VERSION;
  return s;
}

// Export codes: compact base64 text you can copy between devices (e.g. iPhone → PC).
export function encodeSave(s: GameState): string {
  const json = JSON.stringify(toEnvelope(s));
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return 'ATOM1:' + btoa(bin);
}

export function decodeSave(code: string): GameState {
  const trimmed = code.trim();
  const body = trimmed.startsWith('ATOM1:') ? trimmed.slice(6) : trimmed;
  let json: string;
  try {
    const bin = atob(body.replace(/\s+/g, ''));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('That does not look like an ATOMCORE save code.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Save code is incomplete or damaged.');
  }
  return migrate(parsed);
}
