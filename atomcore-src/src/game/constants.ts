// Global tuning constants. Balance lives here and in the definition tables.

export const SAVE_VERSION = 3;

/** Game hours that pass per real second. 1 s = 6 game minutes. */
export const HOURS_PER_SECOND = 0.1;

/** Length of one in-game day (demand + price cycle and day/night), seconds. */
export const DAY_LENGTH = 240;

/** Grid cell size in world units (metres). */
export const CELL = 4;

export const START_MONEY = 12_000;
export const START_FUEL = 60; // fuel assemblies
export const BASE_FUEL_CAP = 150; // assemblies
export const BASE_STAFF_CAP = 24;
export const BASE_CONTRACT_SLOTS = 1;
export const BASE_GRID_TIE_MW = 12;
export const BASE_PRICE = 55; // $/MWh
export const BASE_FUEL_PRICE = 160; // $ per fuel assembly bought on the market
export const SALARY_PER_STAFF = 0.09; // $/s
export const TRANSMISSION_LOSS = 0.06;
export const SURPLUS_PRICE_FACTOR = 0.2; // unsold power dumped at 20% of price
export const DATA_PRICE_FACTOR = 1.8; // data centres pay a premium for firm, carbon-free power
export const H2_PRICE_FACTOR = 0.75; // value of power turned into hydrogen
export const IMPORT_PRICE_FACTOR = 2; // shortfalls of on-site load are bought as expensive firming power
export const AMBIENT_TEMP = 25;

export const DECAY_HEAT_FRACTION = 0.065; // steady-state decay heat relative to fission
export const DECAY_HEAT_TAU = 40; // seconds
export const TEMP_TAU = 6; // seconds
export const TRIP_RISE = 1.18; // trip when temperature rise exceeds 118% of nominal rise
export const WARN_RISE = 1.07;
export const RESTART_DELAY = 12; // seconds after a SCRAM before restart is allowed

export const OFFLINE_BASE_HOURS = 4;
export const OFFLINE_BASE_EFF = 0.5;

export const REPAIR_THRESHOLD_AUTO = 45;
export const AUTOFUEL_THRESHOLD = 0.3;

export const LEDGER_WINDOW = 60;
export const HISTORY_INTERVAL = 5;
export const HISTORY_LENGTH = 72;
export const LOG_LENGTH = 40;

export const PRESTIGE_MIN_EARNED = 50_000_000;
export const PRESTIGE_BONUS_PER_SHARE = 0.03;

// ── Fuel cycle ──────────────────────────────────────────────────────────
/** Fission heat one fuel assembly delivers over its life, MWh(th). */
export const ASSEMBLY_MWH = 100;
/** Ore → yellowcake → enriched uranium → assembly conversion ratios. */
export const ORE_PER_YELLOWCAKE = 10;
export const YELLOWCAKE_PER_ENRICHED = 2;
/** Base probability that a fabricated assembly is defective (QA 0, no research). */
export const BASE_DEFECT_RATE = 0.04;
export const MARKET_DEFECT_RATE = 0.002;
export const BASE_ORE_CAP = 300;
export const BASE_YC_CAP = 150;
export const BASE_ENR_CAP = 80;
/** Market prices; selling pays 60%. */
export const ITEM_PRICE = { ore: 4, yellowcake: 45, enriched: 120, assemblies: 160 } as const;
export const SELL_FACTOR = 0.6;

// ── Water ───────────────────────────────────────────────────────────────
/** Evaporation from wet cooling, m³/h per MW of heat rejected. */
export const EVAP_PER_MW = 1.6;
/** Demineralised make-up water for reactors and steam cycle, m³/h per MW(th). */
export const TREATED_PER_MW = 0.04;
/** Raw water used per m³ of treated water produced. */
export const RAW_PER_TREATED = 1.25;
export const MUNICIPAL_RAW_PRICE = 0.25; // $ per m³
export const MUNICIPAL_TREATED_PRICE = 1.5; // $ per m³
