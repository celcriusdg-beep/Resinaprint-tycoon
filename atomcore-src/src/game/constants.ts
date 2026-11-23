// Global tuning constants. Balance lives here and in the definition tables.

export const SAVE_VERSION = 1;

/** Game hours that pass per real second. 1 s = 6 game minutes. */
export const HOURS_PER_SECOND = 0.1;

/** Length of one in-game day (demand + price cycle and day/night), seconds. */
export const DAY_LENGTH = 240;

/** Grid cell size in world units (metres). */
export const CELL = 4;

export const START_MONEY = 12_000;
export const START_FUEL = 400;
export const BASE_FUEL_CAP = 600;
export const BASE_STAFF_CAP = 24;
export const BASE_CONTRACT_SLOTS = 1;
export const BASE_GRID_TIE_MW = 12;
export const BASE_PRICE = 55; // $/MWh
export const BASE_FUEL_PRICE = 18; // $ per fuel unit (1 unit ≈ 10 MWh of fission heat)
export const SALARY_PER_STAFF = 0.09; // $/s
export const TRANSMISSION_LOSS = 0.06;
export const SURPLUS_PRICE_FACTOR = 0.2; // unsold power dumped at 20% of price
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
