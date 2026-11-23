import type { Building, BuildingType, GameState, Ledger, Site } from './types';
import { BUILDINGS } from './buildings/defs';
import { newReactorState, initEquilibrium } from './simulation/reactor';
import { reserveFor } from './supply/fuelcycle';
import { emptyVehicles } from './supply/vehicles';
import { emptyStats } from './simulation/plant';
import { LOCATION_BY_ID } from './progression/locations';
import { dateKey, emptyCounters, generateDaily } from './progression/daily';
import { BASE_FUEL_PRICE, SAVE_VERSION, START_FUEL, START_MONEY } from './constants';
import { prestigeStartMoney } from './progression/prestige';

export function emptyLedger(): Ledger {
  return { sales: 0, contracts: 0, upkeep: 0, salaries: 0, fuel: 0, water: 0, maintenance: 0, construction: 0, research: 0, other: 0 };
}

export function makeBuilding(s: GameState, type: BuildingType, x: number, z: number, rot: number, built = false): Building {
  const def = BUILDINGS[type];
  const b: Building = {
    id: s.nextBuildingId++,
    type, x, z, rot,
    level: 1,
    status: built ? 'active' : 'constructing',
    progress: built ? 1 : 0,
    buildTotal: def.buildTime,
    condition: 100,
    enabled: true,
  };
  if (def.reactor) b.reactor = newReactorState(built ? 0.6 : 0.5);
  if (type === 'uranium_mine') {
    b.vehicles = emptyVehicles();
    b.reserve = reserveFor(1);
  }
  return b;
}

export function makeSite(id: string): Site {
  const loc = LOCATION_BY_ID[id];
  return { id, size: loc.startSize, buildings: [], storageMWh: 0, storageWater: 0, spent: { pool: 0, casks: 0 }, blackoutTime: 0, stats: emptyStats() };
}

export function createInitialState(opts: { shares?: number; prestigeCount?: number; achievements?: string[]; lifetimeEarned?: number; createdAt?: number } = {}): GameState {
  const now = Date.now();
  const s: GameState = {
    version: SAVE_VERSION,
    createdAt: opts.createdAt ?? now,
    savedAt: now,
    gameTime: 60, // start mid-morning
    money: opts.shares ? prestigeStartMoney(opts.shares) : START_MONEY,
    runEarned: 0,
    lifetimeEarned: opts.lifetimeEarned ?? 0,
    xp: 0,
    level: 1,
    fuel: START_FUEL,
    supply: {
      ore: 0, yellowcake: 0, enriched: 0, defects: START_FUEL * 0.002, qa: 0.5, enrichment: 4, stockEnr: 4.2,
      rates: { mined: 0, milled: 0, enriched: 0, fabricated: 0, inspected: 0, rejected: 0, burn: 0, defectRate: 0 },
    },
    research: { points: 0, active: null, progress: 0, completed: [] },
    sites: {},
    activeSite: 'riverside',
    unlockedSites: ['riverside'],
    market: { priceMult: 1, fuelPrice: BASE_FUEL_PRICE, trend: 0 },
    contracts: [],
    offers: [],
    nextOfferIn: 5,
    nextContractId: 1,
    events: [],
    nextEventIn: 150,
    log: [],
    automation: { autoFuel: false, autoRefuel: false, autoRepair: false, autoRestart: false, loadFollow: false, smartStorage: false },
    achievements: opts.achievements ?? [],
    milestone: 0,
    daily: { dateKey: '', objectives: [], counters: emptyCounters() },
    prestige: { count: opts.prestigeCount ?? 0, shares: opts.shares ?? 0 },
    staffTraining: 0,
    ledger: emptyLedger(),
    ledgerPrev: emptyLedger(),
    ledgerTimer: 0,
    history: [],
    historyTimer: 0,
    stats: {
      energyMWh: 0, peakMW: 0, buildingsBuilt: 0, upgrades: 0, researchDone: 0, scrams: 0, restarts: 0,
      contractsDone: 0, eventsSeen: 0, repairs: 0, dailiesDone: 0, playTime: 0, refuels: 0, coreDamage: 0,
    },
    nextBuildingId: 1,
    pendingNotices: [],
  };
  const site = makeSite('riverside');
  s.sites.riverside = site;
  // Starter facility: pilot reactor feeding a small turbine hall and fan cooling.
  site.buildings.push(makeBuilding(s, 'reactor_pilot', 5, 5, 0, true));
  site.buildings.push(makeBuilding(s, 'turbine', 8, 5, 0, true));
  site.buildings.push(makeBuilding(s, 'cooling_mech', 5, 8, 0, true));
  // Pre-warm the pilot reactor so the plant is alive at the first frame.
  const r = site.buildings[0].reactor!;
  r.setpoint = 0.6;
  r.coreFuel = 0.8; // the first refuelling outage comes after ~15 minutes
  initEquilibrium(site.buildings[0], LOCATION_BY_ID.riverside.ambient, 0.6);
  s.daily = { dateKey: dateKey(), objectives: generateDaily(s, dateKey()), counters: emptyCounters() };
  return s;
}
