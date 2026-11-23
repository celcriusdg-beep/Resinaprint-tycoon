// Core data types for ATOMCORE. Everything in src/game is plain TypeScript with
// no React or Three.js dependency, so the whole simulation can run headless
// (unit tests, balance runs, offline progress).

export type BuildingType =
  | 'reactor_pilot'
  | 'reactor_smr'
  | 'reactor_pwr'
  | 'reactor_bwr'
  | 'reactor_msr'
  | 'reactor_fusion'
  | 'cooling_mech'
  | 'cooling_tower'
  | 'turbine'
  | 'turbine_large'
  | 'substation'
  | 'battery'
  | 'lab'
  | 'admin'
  | 'maintenance'
  | 'fuel_depot'
  | 'generator_emergency';

export type BuildingCategory = 'reactor' | 'power' | 'cooling' | 'grid' | 'support';

export type BuildingStatus = 'constructing' | 'upgrading' | 'active' | 'broken';

export interface ReactorSpec {
  /** Thermal output at level 1, MW(th). */
  thermalMW: number;
  /** Fraction of steam heat turned into electricity (before turbine tech). */
  efficiency: number;
  /** Fuel units burned per 10 MWh of fission heat. */
  fuelUse: number;
  /** How fast power follows the setpoint, fraction of full power per second. */
  rampRate: number;
  /** Nominal coolant outlet temperature, °C (display + trip limits). */
  nominalTemp: number;
  /** Research points per second produced at full power (pilot reactor). */
  research?: number;
}

export interface BuildingStats {
  steamMW?: number; // turbine steam capacity, MW(th)
  coolingMW?: number; // heat rejection capacity, MW(th)
  gridMW?: number; // export capacity, MW(e)
  storageMWh?: number; // battery capacity
  storageRateMW?: number; // battery charge/discharge rate
  research?: number; // research points per second
  staffCap?: number; // employees the site can support
  contractSlots?: number;
  fuelCap?: number; // fuel units of storage
  maintenance?: number; // repair crews
  safety?: number; // safety rating points
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  short: string;
  category: BuildingCategory;
  description: string;
  size: [number, number]; // footprint in grid cells [width(x), depth(z)] at rotation 0
  cost: number;
  buildTime: number; // seconds
  upkeep: number; // $ per second
  staff: number; // employees needed to run it
  maxLevel: number;
  /** Stat multiplier per level above 1 (compounding). */
  levelGrowth: number;
  /** Upgrade cost = cost * upgradeBase * upgradeGrowth^(level-1). */
  upgradeBase: number;
  upgradeGrowth: number;
  wear: number; // condition % lost per second at full load
  unlock: { research?: string; level?: number };
  reactor?: ReactorSpec;
  stats: BuildingStats;
  /** Limit per site (e.g. only one admin per site makes sense? no – used for pilot). */
  maxPerSite?: number;
}

export interface ReactorState {
  setpoint: number; // 0..1 requested power
  power: number; // 0..1 actual fission power fraction
  temp: number; // °C
  decayHeat: number; // MW(th)
  scrammed: boolean;
  scramReason: string | null;
  scramTime: number; // gameTime of last scram
  /** Last computed values for UI. */
  thermal: number;
  fission: number;
  noFuel: boolean;
  setback: boolean;
}

export interface Building {
  id: number;
  type: BuildingType;
  x: number; // grid cell of footprint min corner
  z: number;
  rot: number; // 0..3 quarter turns
  level: number;
  status: BuildingStatus;
  progress: number; // 0..1 while constructing/upgrading
  buildTotal: number; // seconds needed for current construction
  condition: number; // 0..100
  enabled: boolean;
  reactor?: ReactorState;
}

export interface SiteStats {
  thermalMW: number;
  steamCapMW: number;
  steamUsedMW: number;
  electricMW: number; // gross electric generated
  exportMW: number; // after transmission loss & grid limit
  gridCapMW: number;
  coolingCapMW: number;
  heatRejectMW: number;
  coolingRatio: number;
  demandMW: number; // regional demand
  soldMW: number; // sold to regional demand
  surplusMW: number;
  curtailedMW: number;
  storageMWh: number;
  storageCapMWh: number;
  storageFlowMW: number; // + charging, - discharging
  staffNeeded: number;
  staffCap: number;
  staffFactor: number;
  efficiency: number;
  researchRate: number;
  upkeep: number;
  salaries: number;
  revenue: number; // $/s (instant)
  price: number; // $/MWh effective regional price
  reactorsOnline: number;
  reactorsTotal: number;
  maxTempFrac: number; // highest reactor temp as fraction of trip limit
}

export interface Site {
  id: string; // location id
  size: number; // grid cells per side (square plot)
  buildings: Building[];
  storageMWh: number;
  stats: SiteStats;
}

export type ContractTier = 'local' | 'regional' | 'national' | 'global';

export interface Contract {
  id: number;
  client: string;
  tier: ContractTier;
  mw: number; // committed delivery
  price: number; // $/MWh
  duration: number; // seconds total
  remaining: number; // seconds left (only when active)
  delivered: number; // MWh delivered
  required: number; // MWh required in total
  penalty: number; // $ if delivery below 90%
  bonus: number; // $ on full completion
}

export interface ActiveEvent {
  id: string; // def id
  remaining: number;
  duration: number;
  siteId: string | null; // null = company-wide
}

export interface LogEntry {
  t: number; // game time
  kind: 'info' | 'good' | 'warn' | 'bad';
  text: string;
}

export interface DailyObjective {
  id: string;
  kind: DailyKind;
  target: number;
  progress: number;
  reward: number;
  rewardXp: number;
  claimed: boolean;
}

export type DailyKind = 'energy' | 'earn' | 'build' | 'upgrade' | 'research' | 'contract' | 'repair';

export interface Ledger {
  // rolling sums for the finance panel ($ over the last window)
  sales: number;
  contracts: number;
  upkeep: number;
  salaries: number;
  fuel: number;
  maintenance: number;
  construction: number;
  research: number;
  other: number;
}

export interface HistoryPoint {
  t: number;
  money: number;
  electric: number;
  demand: number;
  income: number; // net $/s
}

export interface Automation {
  autoFuel: boolean;
  autoRepair: boolean;
  autoRestart: boolean;
  loadFollow: boolean;
  smartStorage: boolean;
}

export interface GameStats {
  energyMWh: number; // lifetime this run
  peakMW: number;
  buildingsBuilt: number;
  upgrades: number;
  researchDone: number;
  scrams: number;
  restarts: number;
  contractsDone: number;
  eventsSeen: number;
  repairs: number;
  dailiesDone: number;
  playTime: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  savedAt: number;
  gameTime: number;
  money: number;
  runEarned: number; // gross revenue this run (prestige basis)
  lifetimeEarned: number; // across all runs
  xp: number; // MWh based experience
  level: number;
  fuel: number;
  research: {
    points: number; // banked RP
    active: string | null;
    progress: number; // RP invested in active
    completed: string[];
  };
  sites: Record<string, Site>;
  activeSite: string;
  unlockedSites: string[];
  market: {
    priceMult: number; // random-walk market factor
    fuelPrice: number;
    trend: number;
  };
  contracts: Contract[];
  offers: Contract[];
  nextOfferIn: number;
  nextContractId: number;
  events: ActiveEvent[];
  nextEventIn: number;
  log: LogEntry[];
  automation: Automation;
  achievements: string[];
  milestone: number; // index of current milestone
  daily: { dateKey: string; objectives: DailyObjective[]; counters: Record<DailyKind, number> };
  prestige: { count: number; shares: number };
  staffTraining: number; // training level
  ledger: Ledger; // current window accumulators
  ledgerPrev: Ledger; // last completed window (60s)
  ledgerTimer: number;
  history: HistoryPoint[];
  historyTimer: number;
  stats: GameStats;
  nextBuildingId: number;
  pendingNotices: Notice[];
}

/** Notices are produced by the simulation and consumed by the UI (toasts, sounds). */
export interface Notice {
  kind: 'info' | 'good' | 'warn' | 'bad' | 'achievement' | 'level' | 'build' | 'research' | 'scram';
  title: string;
  text?: string;
}

export interface Modifiers {
  reactorOutput: number;
  thermalEff: number; // additive efficiency points
  steamCap: number;
  cooling: number;
  grid: number;
  storage: number;
  research: number;
  wear: number;
  fuelUse: number;
  upkeep: number;
  salary: number;
  buildCost: number;
  buildSpeed: number;
  price: number;
  demand: number;
  transmissionLoss: number; // absolute fraction
  safety: number; // additive points
  offlineEff: number; // absolute fraction
  offlineHours: number; // absolute hours
  staffCap: number; // additive staff
  contractSlots: number; // additive
  tripMargin: number; // additive fraction of temperature rise
  rampRate: number;
  autoSetback: boolean;
}

export type ModKey = Exclude<keyof Modifiers, 'autoSetback'>;
