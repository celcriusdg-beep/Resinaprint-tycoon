import type { GameState, LinkKind, Site } from '../types';
import { DAY_LENGTH } from '../constants';
import { LOCATION_BY_ID, type LocationDef } from '../progression/locations';
import { random } from '../rng';

// Weather and seasons. Every site has a climate (annual mean, seasonal and daily
// swing, humidity, wind) and weather fronts — heatwaves, cold snaps, storms,
// rain and droughts — planned a few days ahead, so the forecast is real.
// Weather feeds the plant: wet cooling suffers at high wet-bulb temperature,
// dry/air cooling at high air temperature, once-through cooling when the
// river or sea is warm; rivers run low in droughts, intakes ice up in frost,
// demand rises in cold and hot spells, and storms can damage overhead lines.

export const DAYS_PER_SEASON = 7;
export const YEAR_DAYS = DAYS_PER_SEASON * 4;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export type Season = 0 | 1 | 2 | 3;

export type FrontKind = 'heatwave' | 'coldsnap' | 'storm' | 'rain' | 'drought';

export interface Front {
  kind: FrontKind;
  start: number;
  end: number;
  /** 0.6..1 */
  strength: number;
}

/** Multipliers the weather applies to the plant right now (1 = design conditions). */
export interface WeatherFactors {
  wet: number;
  dry: number;
  once: number;
  intake: number;
  municipal: number;
  evaporation: number;
  demand: number;
  price: number;
  grid: number;
}

export interface WeatherState {
  fronts: Front[];
  /** Fronts are planned up to this game time. */
  planned: number;
  /** River/groundwater flow relative to normal (sea = 1). */
  riverFlow: number;
  /** River, lake or sea temperature, °C. */
  waterTemp: number;
  /** Ground snow cover 0..1. */
  snow: number;
  // Current conditions (derived each tick)
  air: number;
  humidity: number;
  wind: number;
  /** Precipitation, mm/h (snow when below freezing). */
  rain: number;
  f: WeatherFactors;
  /** Player setting: heat the water intakes in frost (costs power). */
  deice: boolean;
}

interface Climate {
  mean: number;
  season: number;
  daily: number;
  humidity: number;
  wind: number;
  /** How fast the water body follows the air (days). */
  waterTau: number;
  water: 'river' | 'sea' | 'ground';
  flow: [number, number, number, number];
  prob: Partial<Record<FrontKind, number>>;
}

const CLIMATE: Record<LocationDef['theme'], (loc: LocationDef) => Climate> = {
  river: (l) => ({ mean: l.ambient - 4, season: 9, daily: 5, humidity: 0.7, wind: 4, waterTau: 1.2, water: 'river', flow: [1.25, 0.85, 1, 0.9], prob: {} }),
  coast: (l) => ({ mean: l.ambient - 1, season: 6, daily: 3, humidity: 0.8, wind: 6, waterTau: 4, water: 'sea', flow: [1, 1, 1, 1], prob: { storm: 1.5, heatwave: 0.6 } }),
  desert: (l) => ({ mean: l.ambient - 6, season: 7, daily: 7, humidity: 0.22, wind: 5, waterTau: 6, water: 'ground', flow: [1, 0.85, 0.95, 1.05], prob: { rain: 0.2, storm: 0.5, drought: 1.5, coldsnap: 0.3 } }),
  arctic: (l) => ({ mean: l.ambient - 2, season: 12, daily: 3, humidity: 0.75, wind: 6, waterTau: 3, water: 'sea', flow: [1.4, 1, 1, 0.7], prob: { heatwave: 0.3, coldsnap: 1.3, storm: 1.2 } }),
};

export function climateOf(siteId: string): Climate {
  const loc = LOCATION_BY_ID[siteId];
  return CLIMATE[loc.theme](loc);
}

// Chance per day [spring, summer, autumn, winter] and duration range in days.
const FRONTS: Record<FrontKind, { p: [number, number, number, number]; days: [number, number] }> = {
  heatwave: { p: [0.04, 0.22, 0.04, 0], days: [1.5, 3] },
  coldsnap: { p: [0.03, 0, 0.05, 0.22], days: [1.2, 2.5] },
  storm: { p: [0.08, 0.07, 0.16, 0.13], days: [0.25, 0.5] },
  rain: { p: [0.35, 0.22, 0.38, 0.3], days: [0.2, 0.8] },
  drought: { p: [0.01, 0.07, 0.02, 0], days: [3, 6] },
};

export const FRONT_LABEL: Record<FrontKind, string> = { heatwave: 'Heatwave', coldsnap: 'Cold snap', storm: 'Storm', rain: 'Rain', drought: 'Drought' };

// ── Calendar ──────────────────────────────────────────────────────────────

export function calendar(gameTime: number) {
  const day = Math.floor(gameTime / DAY_LENGTH);
  const yearDay = ((day % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
  const season = Math.floor(yearDay / DAYS_PER_SEASON) as Season;
  return { day, year: Math.floor(day / YEAR_DAYS) + 1, season, dayOfSeason: (yearDay % DAYS_PER_SEASON) + 1, yearPhase: (gameTime / DAY_LENGTH / YEAR_DAYS) % 1 };
}

export function seasonOf(gameTime: number): Season {
  return calendar(gameTime).season;
}

// ── Deterministic noise (so forecasts match what happens) ─────────────────

function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

function seedOf(siteId: string): number {
  let h = 7;
  for (const c of siteId) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

/** Smooth value noise in [-1, 1]. */
function noise(seed: number, t: number, period: number): number {
  const x = t / period;
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(seed, i) * (1 - u) + hash(seed, i + 1) * u) * 2 - 1;
}

// ── Fronts ────────────────────────────────────────────────────────────────

function envelope(fr: Front, t: number): number {
  if (t <= fr.start || t >= fr.end) return 0;
  const ramp = Math.min(DAY_LENGTH * 0.25, (fr.end - fr.start) * 0.25);
  const a = Math.min(1, (t - fr.start) / ramp, (fr.end - t) / ramp);
  return fr.strength * a * a * (3 - 2 * a);
}

function planFronts(site: Site, upTo: number): void {
  const w = site.weather;
  const clim = climateOf(site.id);
  const seed = seedOf(site.id);
  let day = Math.floor(w.planned / DAY_LENGTH);
  while (day * DAY_LENGTH < upTo) {
    const season = calendar(day * DAY_LENGTH + 1).season;
    (Object.keys(FRONTS) as FrontKind[]).forEach((kind, k) => {
      const def = FRONTS[kind];
      const p = def.p[season] * (clim.prob[kind] ?? 1);
      if (hash(seed, day, k, 1) >= p) return;
      const start = (day + hash(seed, day, k, 2)) * DAY_LENGTH;
      const end = start + (def.days[0] + hash(seed, day, k, 3) * (def.days[1] - def.days[0])) * DAY_LENGTH;
      if (w.fronts.some((f) => f.kind === kind && f.end > start - DAY_LENGTH * 0.3 && f.start < end)) return;
      if ((kind === 'heatwave' && w.fronts.some((f) => f.kind === 'coldsnap' && f.end > start && f.start < end))
        || (kind === 'coldsnap' && w.fronts.some((f) => f.kind === 'heatwave' && f.end > start && f.start < end))) return;
      w.fronts.push({ kind, start, end, strength: 0.6 + 0.4 * hash(seed, day, k, 4) });
    });
    day++;
    w.planned = day * DAY_LENGTH;
  }
  w.fronts.sort((a, b) => a.start - b.start);
}

// ── Conditions ────────────────────────────────────────────────────────────

export interface Conditions {
  air: number;
  humidity: number;
  wind: number;
  rain: number;
  active: { kind: FrontKind; level: number }[];
}

/** Weather at time t (fronts must be planned that far). */
export function conditionsAt(site: Site, t: number): Conditions {
  const clim = climateOf(site.id);
  const seed = seedOf(site.id);
  const yp = (t / DAY_LENGTH / YEAR_DAYS) % 1;
  // Warmest at mid-summer (year phase 0.375), coldest at mid-winter.
  const seasonal = Math.cos(2 * Math.PI * (yp - 0.375)) * clim.season;
  const dp = (t % DAY_LENGTH) / DAY_LENGTH;
  const diurnal = Math.cos(2 * Math.PI * (dp - 0.6)); // warmest around 14:30
  let air = clim.mean + seasonal + diurnal * clim.daily + noise(seed, t, DAY_LENGTH * 0.9) * 2.5;
  let humidity = clim.humidity - diurnal * 0.12 + noise(seed + 1, t, DAY_LENGTH * 0.7) * 0.06;
  let wind = clim.wind * (1 + 0.5 * noise(seed + 2, t, DAY_LENGTH * 0.3));
  let rain = 0;
  const active: Conditions['active'] = [];
  for (const fr of site.weather.fronts) {
    if (fr.start > t) break;
    const e = envelope(fr, t);
    if (e <= 0) continue;
    active.push({ kind: fr.kind, level: e });
    switch (fr.kind) {
      case 'heatwave': air += 10 * e; humidity -= clim.water === 'sea' ? 0 : 0.1 * e; break;
      case 'coldsnap': air -= 12 * e; break;
      case 'drought': air += 2 * e; humidity -= 0.15 * e; break;
      case 'rain': rain += 3.5 * e * (0.6 + 0.4 * (1 + noise(seed + 3, t, 20)) / 2); air -= 2 * e; humidity += 0.2 * e; break;
      case 'storm': rain += 12 * e; wind += 24 * e * (0.8 + 0.2 * noise(seed + 4, t, 15)); air -= 3 * e; humidity += 0.2 * e; break;
    }
  }
  humidity = Math.max(0.05, Math.min(0.99, humidity));
  return { air, humidity, wind: Math.max(0, wind), rain, active };
}

/** Wet-bulb temperature (Stull 2011), °C. */
export function wetBulb(t: number, rh: number): number {
  const h = rh * 100;
  return t * Math.atan(0.151977 * Math.sqrt(h + 8.313659)) + Math.atan(t + h) - Math.atan(h - 1.676331)
    + 0.00391838 * Math.pow(h, 1.5) * Math.atan(0.023101 * h) - 4.686035;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function designWater(siteId: string): number {
  const c = climateOf(siteId);
  return c.water === 'sea' ? c.mean + 1 : c.mean + 4;
}

export function waterLabel(siteId: string): string {
  const w = climateOf(siteId).water;
  return w === 'river' ? 'River' : w === 'sea' ? 'Sea' : 'Groundwater';
}

function computeFactors(site: Site): WeatherFactors {
  const loc = LOCATION_BY_ID[site.id];
  const clim = climateOf(site.id);
  const w = site.weather;
  const wb = wetBulb(w.air, w.humidity);
  const wbDesign = wetBulb(loc.ambient, clim.humidity);
  const frost = w.air < -3;
  const degree = (t: number) => 1 + 0.01 * Math.max(0, 15 - t) + 0.015 * Math.max(0, t - 24);
  const demand = degree(w.air) / degree(clim.mean);
  const ground = clim.water === 'ground';
  return {
    wet: clamp(1 - 0.02 * (wb - wbDesign), 0.6, 1.15),
    dry: clamp(1 - 0.012 * (w.air - loc.ambient), 0.6, 1.2),
    once: clamp(1 - 0.035 * (w.waterTemp - designWater(site.id)), 0.5, 1.2),
    intake: (ground ? 0.7 + 0.3 * w.riverFlow : Math.min(1.3, w.riverFlow)) * (frost && !w.deice && !ground ? 0.6 : 1),
    municipal: 0.75 + 0.25 * Math.min(1, w.riverFlow),
    evaporation: clamp(1 + 0.012 * (w.air - loc.ambient) * (1.2 - w.humidity), 0.7, 1.4),
    demand,
    price: 1 + 0.7 * (demand - 1),
    grid: w.wind > 20 ? 1 - Math.min(0.35, (w.wind - 20) * 0.025) : 1,
  };
}

export function newWeather(siteId: string, gameTime = 0): WeatherState {
  const w: WeatherState = {
    fronts: [], planned: Math.floor(gameTime / DAY_LENGTH) * DAY_LENGTH, riverFlow: 1, waterTemp: designWater(siteId) - 4, snow: 0,
    air: 15, humidity: 0.6, wind: 4, rain: 0, deice: false,
    f: { wet: 1, dry: 1, once: 1, intake: 1, municipal: 1, evaporation: 1, demand: 1, price: 1, grid: 1 },
  };
  return w;
}

/** Bring a site's weather up to the current time (also used after loading a save). */
export function initWeather(site: Site, gameTime: number): void {
  if (!site.weather || !Array.isArray(site.weather.fronts)) site.weather = newWeather(site.id, gameTime);
  const def = newWeather(site.id, gameTime);
  site.weather = { ...def, ...site.weather, f: { ...def.f, ...(site.weather.f ?? {}) } };
  planFronts(site, gameTime + DAY_LENGTH * 4);
  const c = conditionsAt(site, gameTime);
  Object.assign(site.weather, { air: c.air, humidity: c.humidity, wind: c.wind, rain: c.rain });
  if (!Number.isFinite(site.weather.waterTemp)) site.weather.waterTemp = designWater(site.id);
  site.weather.f = computeFactors(site);
}

export interface WeatherNews {
  siteId: string;
  kind: 'front' | 'damage' | 'lightning' | 'gridloss' | 'ice';
  title: string;
  text: string;
  linkId?: number;
}

const iceNoted = new Map<string, number>();

/** Robustness of overhead lines by class (MV poles … HVDC towers). */
const LINE_RISK = [1.3, 1, 0.8, 0.7, 0.6, 0];

export function stepWeather(s: GameState, site: Site, dt: number, offline: boolean): WeatherNews[] {
  const news: WeatherNews[] = [];
  const w = site.weather;
  const t = s.gameTime;
  const clim = climateOf(site.id);
  if (w.planned < t - DAY_LENGTH) w.planned = Math.floor(t / DAY_LENGTH) * DAY_LENGTH;
  planFronts(site, t + DAY_LENGTH * 4);
  w.fronts = w.fronts.filter((f) => f.end > t - DAY_LENGTH);
  const before = new Set(conditionsAt(site, t - dt).active.filter((a) => a.level > 0).map((a) => a.kind));
  const c = conditionsAt(site, t);
  w.air = c.air;
  w.humidity = c.humidity;
  w.wind = c.wind;
  w.rain = c.rain;
  if (!offline) {
    for (const a of c.active) {
      if (before.has(a.kind) || a.kind === 'rain') continue;
      news.push({ siteId: site.id, kind: 'front', title: `${FRONT_LABEL[a.kind]} at ${LOCATION_BY_ID[site.id].name}`, text: FRONT_TIP[a.kind] });
    }
  }

  // River flow and water temperature follow the weather over about a day.
  const season = calendar(t).season;
  let target = clim.flow[season] * (1 + 0.035 * c.rain);
  for (const a of c.active) if (a.kind === 'drought') target *= 1 - 0.55 * a.level;
  if (clim.water === 'sea') target = 1;
  w.riverFlow += (target - w.riverFlow) * Math.min(1, dt / DAY_LENGTH);
  const dailyMean = c.air - Math.cos(2 * Math.PI * (((t % DAY_LENGTH) / DAY_LENGTH) - 0.6)) * clim.daily;
  const waterTarget = clim.water === 'sea' ? Math.max(-1, clim.mean + 1 + (dailyMean - clim.mean) * 0.6) : Math.max(0.5, dailyMean * 0.9 + 2);
  w.waterTemp += (waterTarget - w.waterTemp) * Math.min(1, dt / (DAY_LENGTH * clim.waterTau));
  // Snow builds up in sub-zero precipitation and melts in the warmth.
  if (c.air < 0.5 && c.rain > 0) w.snow = Math.min(1, w.snow + c.rain * 0.004 * dt);
  else if (c.air > 1.5) w.snow = Math.max(0, w.snow - (c.air - 1.5) * 0.0015 * dt);
  w.f = computeFactors(site);
  if (w.air < -3 && !w.deice && !offline && w.f.intake < 1 && site.buildings.some((b) => b.type === 'water_intake' || b.type === 'intake_large')) {
    const key = Math.floor(t / DAY_LENGTH);
    if (iceNoted.get(site.id) !== key) {
      iceNoted.set(site.id, key);
      news.push({ siteId: site.id, kind: 'ice', title: 'Intakes icing up', text: 'Frazil ice is blocking the water intakes. Turn on intake de-icing (Weather panel).' });
    }
  }

  // Storms: wind and lightning damage overhead power lines; a big storm can cut the grid.
  if (!offline && w.wind > 20) {
    const gust = (w.wind - 20) / 10;
    for (const l of site.links) {
      if (l.kind !== ('power' satisfies LinkKind) || l.broken) continue;
      const risk = LINE_RISK[l.cls] ?? 0;
      if (!risk) continue;
      if (random() < 0.002 * gust * risk * dt) {
        l.broken = true;
        l.flow = 0;
        news.push({ siteId: site.id, kind: 'damage', title: 'Storm damage', text: 'A power line was brought down by the storm. Repair it to restore the connection.', linkId: l.id });
      } else if (l.trip <= 0 && random() < 0.003 * gust * risk * dt) {
        l.trip = 15;
        news.push({ siteId: site.id, kind: 'lightning', title: 'Lightning strike', text: 'A line tripped on a lightning strike; it recloses in 15 s.', linkId: l.id });
      }
    }
    if (w.wind > 28 && s.level >= 5 && !s.events.some((e) => e.id === 'blackout' && e.siteId === site.id) && random() < 0.0015 * dt) {
      news.push({ siteId: site.id, kind: 'gridloss', title: 'Storm cut the grid', text: 'The storm brought down the transmission line to the grid. Running on emergency power.' });
    }
  }
  return news;
}

export const FRONT_TIP: Record<FrontKind, string> = {
  heatwave: 'Hot, muggy air weakens cooling towers and warms the river: keep a cooling margin or lower power. Demand and prices rise.',
  coldsnap: 'Freezing weather: heating demand and prices rise, cooling works better. Watch for icing intakes.',
  storm: 'High winds can trip or bring down overhead power lines and reduce grid export.',
  rain: 'Rain refills rivers and cools the air.',
  drought: 'Rivers run low: less make-up water from intakes and wells, and once-through cooling water warms up.',
};

// ── Forecast ──────────────────────────────────────────────────────────────

export interface ForecastDay {
  day: number;
  season: Season;
  dayOfSeason: number;
  min: number;
  max: number;
  maxWind: number;
  rain: number;
  fronts: FrontKind[];
}

export function forecast(site: Site, gameTime: number, days = 3): ForecastDay[] {
  const out: ForecastDay[] = [];
  const first = Math.floor(gameTime / DAY_LENGTH);
  for (let d = 0; d < days; d++) {
    const day = first + d;
    let min = Infinity, max = -Infinity, maxWind = 0, rain = 0;
    const kinds = new Set<FrontKind>();
    for (let i = 0; i < 24; i++) {
      const t = (day + (i + 0.5) / 24) * DAY_LENGTH;
      if (d === 0 && t < gameTime) continue;
      const c = conditionsAt(site, t);
      min = Math.min(min, c.air);
      max = Math.max(max, c.air);
      maxWind = Math.max(maxWind, c.wind);
      rain += c.rain;
      for (const a of c.active) if (a.level > 0.15) kinds.add(a.kind);
    }
    if (!Number.isFinite(min)) continue;
    const cal = calendar(day * DAY_LENGTH + 1);
    out.push({ day, season: cal.season, dayOfSeason: cal.dayOfSeason, min, max, maxWind, rain: rain / 24, fronts: [...kinds] });
  }
  return out;
}

/** Short label of the current sky. */
export function skyLabel(site: Site, gameTime: number): { label: string; icon: 'sun' | 'moon' | 'rain' | 'snow' | 'wind' | 'cloud' | 'thermo' } {
  const w = site.weather;
  const on = (k: FrontKind) => w.fronts.some((f) => f.kind === k && envelope(f, gameTime) > 0.3);
  if (w.wind > 20) return { label: 'Storm', icon: 'wind' };
  if (w.rain > 0.3) return w.air < 0.5 ? { label: 'Snow', icon: 'snow' } : { label: w.rain > 5 ? 'Heavy rain' : 'Rain', icon: 'rain' };
  if (on('heatwave')) return { label: 'Heatwave', icon: 'thermo' };
  if (on('coldsnap')) return { label: 'Cold snap', icon: 'snow' };
  if (on('drought')) return { label: 'Drought', icon: 'sun' };
  const dp = (gameTime % DAY_LENGTH) / DAY_LENGTH;
  const night = dp < 0.22 || dp > 0.78;
  return { label: w.humidity > 0.85 ? 'Overcast' : 'Clear', icon: w.humidity > 0.85 ? 'cloud' : night ? 'moon' : 'sun' };
}
