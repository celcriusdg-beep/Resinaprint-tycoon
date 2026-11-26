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
  | 'reactor_epr'
  | 'cooling_mega'
  | 'hvdc'
  | 'datacenter'
  | 'hydrogen'
  | 'desal'
  | 'isotopes'
  | 'visitor'
  | 'rail_terminal'
  | 'reactor_smr_park'
  | 'reactor_sfr'
  | 'turbine_medium'
  | 'turbine_super'
  | 'turbine_sco2'
  | 'turbine_mhd'
  | 'cooling_hybrid'
  | 'cooling_fanassist'
  | 'cooling_seawater'
  | 'cooling_sky'
  | 'mine_underground'
  | 'mine_isr'
  | 'mill_large'
  | 'enrich_centrifuge'
  | 'enrich_laser'
  | 'fab_auto'
  | 'qa_auto'
  | 'fuel_vault'
  | 'spent_vault'
  | 'substation_400'
  | 'grid_sc'
  | 'storage_thermal'
  | 'storage_pumped'
  | 'intake_large'
  | 'treatment_edi'
  | 'reservoir'
  | 'hq'
  | 'research_campus'
  | 'robotics_depot'
  | 'backup_gt'
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
  | 'generator_emergency'
  | 'uranium_mine'
  | 'ore_mill'
  | 'enrichment'
  | 'fuel_fab'
  | 'fuel_qa'
  | 'water_intake'
  | 'water_wells'
  | 'water_treatment'
  | 'water_tank'
  | 'cooling_dry'
  | 'dry_cask';

export type BuildingCategory = 'reactor' | 'power' | 'cooling' | 'water' | 'fuel' | 'grid' | 'industry' | 'support';

export type BuildingStatus = 'constructing' | 'upgrading' | 'active' | 'broken' | 'refueling' | 'destroyed';

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
  /** Fuel assemblies in a full core at level 1. */
  coreSize: number;
  /** Seconds a refuelling outage takes at level 1. */
  refuelTime: number;
  /** Liquid-fuel designs top up continuously without an outage. */
  onlineRefuel?: boolean;
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
  rawWater?: number; // raw water supply, m³/h
  treatedWater?: number; // demineralised water output, m³/h
  waterStorage?: number; // tank capacity, m³
  oreStock?: number; // ore stockpile capacity, t
  ycStock?: number; // yellowcake storage
  enrStock?: number; // enriched uranium storage
  millRate?: number; // ore processed per second
  enrichRate?: number; // yellowcake processed per second
  fabRate?: number; // enriched uranium processed per second
  inspectRate?: number; // assemblies inspected per second
  backupMW?: number; // emergency diesel power, MW
  caskCap?: number; // dry cask storage, assemblies
  loadMW?: number; // electricity consumed on site, MW(e)
  dataMW?: number; // on-site customer load that pays a premium, MW(e)
  h2MW?: number; // flexible electrolyser load fed by unsellable power, MW(e)
  isotopes?: number; // $/s from medical isotopes at full reactor flux
  tourism?: number; // $/s base visitor income
  fuelQuota?: number; // extra share of the daily market fuel quota
  effBonus?: number; // turbines: extra steam-cycle efficiency (points, weighted by steam handled)
  dryMW?: number; // heat rejection that evaporates no water (dry, once-through or radiative)
  oreRate?: number; // ore t/s from a mine that needs no vehicles
  ycRate?: number; // yellowcake/s produced directly (in-situ leaching)
  caskRate?: number; // spent assemblies/s loaded into storage
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
  /** Limit per site. */
  maxPerSite?: number;
  /** Dry cooling: rejects heat without evaporating water. */
  dry?: boolean;
  /** Needs a river, sea or fjord at the site. */
  needsWaterBody?: boolean;
  /** Sub-section of the build menu, e.g. 'mining' inside the Fuel tab. */
  section?: string;
  /** 1 (basic) … 5 (cutting edge). */
  tier?: number;
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
  /** Fraction of a full core of fuel remaining (burnup). */
  coreFuel: number;
  /** Defective assemblies loaded in the core (not yet failed). */
  coreDefects: number;
  /** Fuel rods whose cladding has failed. */
  failedRods: number;
  /** Primary coolant pump speed, 0.6..1.25 of nominal. */
  pumpSpeed: number;
  /** Electricity used by the coolant pumps, MW. */
  houseLoad: number;
  /** Setpoint to restore after an automatic refuelling outage. */
  resumeSetpoint: number | null;
  /** Assemblies queued for loading during the current outage. */
  loading: number;
  loadingDefects: number;
  // ── Reactor physics (simplified point kinetics) ─────────────────────
  /** Control rod bank position: 0 = fully inserted, 1 = fully withdrawn. */
  rods: number;
  /** Soluble boron in the coolant, ppm (PWR/SMR). */
  boron: number;
  /** Automatic rod control holds power at the setpoint. */
  autoRods: boolean;
  /** Manual mode: where the operator has asked the rods to go. */
  rodTarget: number;
  /** Automatic boron (chemical shim) keeps the rods near their target band. */
  autoBoron: boolean;
  /** Delayed-neutron precursor level (normalised so S = n when critical). */
  precursors: number;
  /** I-135 and Xe-135, as fractions of their full-power equilibrium. */
  iodine: number;
  xenon: number;
  /** Fuel (pellet centreline) temperature, °C. */
  fuelTemp: number;
  /** Reactor coolant inventory, 1 = normal level over the core. */
  inventory: number;
  /** Accumulated core damage 0..1; 1 = core damage incident. */
  damage: number;
  /** Two-group decay heat, MW. */
  decay1: number;
  decay2: number;
  /** Reactor period in seconds (positive = rising), Infinity when steady. */
  period: number;
  /** Reactivity breakdown in pcm, for the UI. */
  rho: Reactivity;
  /** Trip latched by the protection system until reset. */
  tripCause: string | null;
  /** Automatic trip failed to insert rods (ATWS). */
  atws: boolean;
  /** Average enrichment of the fuel in the core, %. */
  coreEnr: number;
}

export interface Reactivity {
  fuel: number;
  rods: number;
  boron: number;
  xenon: number;
  doppler: number;
  moderator: number;
  void: number;
  total: number;
}

export interface SpentFuelPool {
  pool: number; // assemblies in the pools at this site
  casks: number; // assemblies moved into dry casks
}

export interface Vehicles {
  excavators: number[]; // count per tier
  trucks: number[];
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
  vehicles?: Vehicles;
  /** Ore remaining in a mine's pit, t. */
  reserve?: number;
  /** Reactors: operating licence. Missing = licensed (older saves, starter plant). */
  licence?: 'pending' | 'operating' | 'suspended';
}

export interface SiteStats {
  thermalMW: number;
  /** On-site industry: power used behind the meter, imported shortfall, electrolysers, $/s earned. */
  industryMW: number;
  importMW: number;
  h2MW: number;
  industryIncome: number;
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
  // Water (m³/h)
  rawSupply: number;
  evaporation: number;
  treatedSupply: number;
  treatedDemand: number;
  rawToTreatment: number;
  tankM3: number;
  tankCapM3: number;
  waterFactor: number; // share of evaporative cooling that has make-up water
  treatedFactor: number; // share of reactor water chemistry demand met
  waterCost: number; // $/s
  houseLoadMW: number;
  // Mining
  oreRate: number; // ore/s
  digRate: number;
  haulRate: number;
  offsitePower: boolean;
  backupMW: number;
  backupNeedMW: number;
  pumpsPowered: boolean;
  batteryLeft: number; // seconds of battery-backed emergency feedwater left
  poolCap: number;
  caskCap: number;
  /** Assemblies per second moving from the pools into dry casks right now. */
  caskMove: number;
  /** Reactor heat with no steam path to a turbine hall, MW(th). */
  strandedHeatMW: number;
  /** Generated power that no cable can carry to the grid tie, MW(e). */
  strandedMW: number;
  /** Resistive losses in on-site cables, MW(e). */
  cableLossMW: number;
}

export type LinkKind = 'steam' | 'cooling' | 'power';

/** A pipe or cable the player built between two buildings (or a building and the grid tie, id -1). */
export interface Link {
  id: number;
  kind: LinkKind;
  a: number;
  b: number;
  /** Index into LINK_CLASSES[kind]. */
  cls: number;
  /** Parallel circuits / pipe runs, 1..4. */
  circuits: number;
  /** Money spent on it (refund basis). */
  paid: number;
  /** Last computed flow, MW (thermal for pipes, electric for cables). */
  flow: number;
  /** Cable conductor heating from overload, 0..1 (1 = breaker trips). */
  heat: number;
  /** Seconds until a tripped breaker recloses (0 = in service). */
  trip: number;
  /** Brought down by a storm: out of service until repaired. */
  broken?: boolean;
}

export interface Site {
  id: string; // location id
  size: number; // grid cells per side (square plot)
  buildings: Building[];
  /** Steam lines, cooling-water pipes and power cables. */
  links: Link[];
  /** Climate, weather fronts and the river/sea state. */
  weather: import('./weather/weather').WeatherState;
  /** People employed at the site, shifts, fatigue, morale and key people. */
  staff: import('./staff/staff').StaffState;
  /** Regulator rating, inspection schedule and incident record. */
  reg: import('./regulator/regulator').SiteRegulator;
  storageMWh: number;
  storageWater: number; // raw water in tanks, m³
  spent: SpentFuelPool;
  /** Seconds since offsite power was lost (0 when connected). */
  blackoutTime: number;
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
  water: number;
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

export interface MaterialOrder {
  id: number;
  buyer: string;
  item: 'ore' | 'yellowcake' | 'enriched';
  qty: number;
  pay: number; // $ total
  xp: number;
}

export interface SupplyState {
  /** Part of each stock that was bought on the market (can't be resold to order buyers). */
  bought: { ore: number; yellowcake: number; enriched: number };
  ore: number;
  yellowcake: number;
  enriched: number;
  defects: number; // defective assemblies hidden in the fuel stock
  qa: number; // fabrication quality-assurance setting 0..1
  enrichment: number; // U-235 % of newly fabricated fuel (3.0–5.0)
  stockEnr: number; // average enrichment of the assemblies in stock
  rates: SupplyRates;
}

export interface SupplyRates {
  mined: number;
  milled: number;
  enriched: number;
  fabricated: number;
  inspected: number;
  rejected: number;
  burn: number; // assemblies/s equivalent burned by reactors
  leached?: number; // yellowcake/s from in-situ recovery
  salt?: number; // enriched uranium/s dissolved into molten-salt fuel
  defectRate: number; // current fabrication defect probability
}

export interface Automation {
  autoFuel: boolean;
  autoRefuel: boolean;
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
  refuels: number;
  coreDamage: number;
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
  fuel: number; // fuel assemblies in stock
  supply: SupplyState;
  /** Buyers asking for uranium materials (ore, yellowcake, enriched uranium). */
  orders: MaterialOrder[];
  nextOrderIn: number;
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
    /** Fuel assemblies bought from suppliers in the current game day. */
    fuelBought: number;
    /** Index of the game day fuelBought refers to. */
    fuelDay: number;
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
  /** Key-person candidates on the job market (refreshed daily). */
  candidates: import('./staff/staff').KeyPerson[];
  candidateDay: number;
  /** Nuclear regulator: permits, findings, public opinion. */
  regulator: import('./regulator/regulator').RegulatorState;
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
  defectRate: number;
  defectHazard: number;
  refuelSpeed: number;
  evaporation: number;
  treatedUse: number;
  mining: number;
  processing: number;
  passiveCooling: number; // absolute, fraction of rated heat removable without pumps
  backupPower: number;
  autoSetback: boolean;
}

export type ModKey = Exclude<keyof Modifiers, 'autoSetback'>;
