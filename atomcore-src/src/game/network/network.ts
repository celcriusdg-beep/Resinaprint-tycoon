import type { Building, BuildingType, BuildingCategory, GameState, Link, LinkKind, Site } from '../types';
import { BUILDINGS, levelMult } from '../buildings/defs';
import { buildingRect } from '../buildings/grid';
import { CELL } from '../constants';
import { isUnlockedByResearch } from '../research/tree';
import { FlowNet } from './flow';

// Plant networks. Nothing connects by itself: heat leaves a reactor only through
// steam lines to turbine halls, turbine condensers reject heat only through
// circulating-water pipes to cooling units, and electricity reaches the grid
// only through cables to a switchyard or the grid connection at the plot edge.
// Each link has a size class (pipe diameter / voltage level), a rating, and up
// to four parallel runs. Cables lose a little power (I²R) and can be overloaded
// for a short while before their breaker trips.

/** Pseudo building id of the site's grid connection point. */
export const GRID_TIE = -1;
export const MAX_CIRCUITS = 4;
/** Cables carry up to this multiple of their rating while heating up. */
export const OVERLOAD_LIMIT = 1.25;
export const BREAKER_RECLOSE = 30;

export interface LinkClass {
  name: string;
  short: string;
  /** MW(th) for pipes, MW(e) for cables, per circuit. */
  rating: number;
  /** $ per circuit: fixed (valves, terminations, transformer bays) + per metre. */
  base: number;
  perM: number;
  tier: number;
  /** Cables: % of the carried power lost per 100 m at full load. */
  loss?: number;
  /** Cables: kV for display. */
  kv?: string;
  /** Visual: pipe radius / overhead line height. */
  size: number;
}

export const LINK_CLASSES: Record<LinkKind, LinkClass[]> = {
  steam: [
    { name: 'Steam line DN300', short: 'DN300', rating: 160, base: 250, perM: 20, tier: 1, size: 0.16 },
    { name: 'Main steam line DN700', short: 'DN700', rating: 1400, base: 3000, perM: 150, tier: 2, size: 0.24 },
    { name: 'Twin main steam header', short: 'Twin header', rating: 6000, base: 20_000, perM: 800, tier: 3, size: 0.32 },
    { name: 'Supercritical steam header', short: 'SC header', rating: 24_000, base: 120_000, perM: 4000, tier: 4, size: 0.4 },
    { name: 'Advanced heat-transport loop', short: 'Adv. loop', rating: 100_000, base: 700_000, perM: 20_000, tier: 5, size: 0.5 },
  ],
  cooling: [
    { name: 'Circulating-water pipe DN900', short: 'DN900', rating: 200, base: 150, perM: 15, tier: 1, size: 0.2 },
    { name: 'Circulating-water pipe DN2200', short: 'DN2200', rating: 1600, base: 2000, perM: 120, tier: 2, size: 0.3 },
    { name: 'Circulating-water tunnel', short: 'CW tunnel', rating: 6500, base: 15_000, perM: 600, tier: 3, size: 0.4 },
    { name: 'Circulating-water culvert', short: 'CW culvert', rating: 26_000, base: 100_000, perM: 3500, tier: 4, size: 0.5 },
    { name: 'Mega circulating-water culvert', short: 'Mega culvert', rating: 110_000, base: 600_000, perM: 18_000, tier: 5, size: 0.6 },
  ],
  power: [
    { name: 'Medium-voltage cable', short: 'MV', kv: '11 kV', rating: 40, base: 150, perM: 10, tier: 1, loss: 1.2, size: 4.5 },
    { name: 'High-voltage line', short: 'HV', kv: '132 kV', rating: 350, base: 2500, perM: 80, tier: 1, loss: 0.35, size: 6.5 },
    { name: 'Extra-high-voltage line', short: 'EHV', kv: '400 kV', rating: 2200, base: 12_000, perM: 400, tier: 2, loss: 0.12, size: 8.5 },
    { name: 'Ultra-high-voltage line', short: 'UHV', kv: '765 kV', rating: 9000, base: 60_000, perM: 1500, tier: 3, loss: 0.06, size: 10.5 },
    { name: 'HVDC link', short: 'HVDC', kv: '±800 kV', rating: 30_000, base: 300_000, perM: 6000, tier: 3, loss: 0.03, size: 12 },
    { name: 'Superconducting cable', short: 'SC', kv: '—', rating: 120_000, base: 1_500_000, perM: 25_000, tier: 4, loss: 0.002, size: 0 },
  ],
};

export const KIND_LABEL: Record<LinkKind, string> = { steam: 'Steam line', cooling: 'Cooling-water pipe', power: 'Power cable' };

// ── Endpoint roles ─────────────────────────────────────────────────────────

export type Role = 'reactor' | 'turbine' | 'cooler' | 'sub' | 'store' | 'load' | 'tie';

export function roleOf(type: BuildingType): Role | null {
  const def = BUILDINGS[type];
  if (def.reactor) return 'reactor';
  if (def.stats.steamMW) return 'turbine';
  if (def.category === 'cooling') return 'cooler';
  if (def.stats.gridMW) return 'sub';
  if (def.stats.storageRateMW) return 'store';
  if (def.stats.dataMW || def.stats.h2MW) return 'load';
  return null;
}

function roleById(site: Site, id: number): Role | null {
  if (id === GRID_TIE) return 'tie';
  const b = site.buildings.find((x) => x.id === id);
  return b ? roleOf(b.type) : null;
}

export function kindsForRole(role: Role | null): LinkKind[] {
  switch (role) {
    case 'reactor': return ['steam'];
    case 'turbine': return ['steam', 'cooling', 'power'];
    case 'cooler': return ['cooling'];
    case 'sub': case 'store': case 'load': case 'tie': return ['power'];
    default: return [];
  }
}

const POWER_ROLES: Role[] = ['turbine', 'sub', 'store', 'load', 'tie'];

/** Which pairs of endpoints a link of this kind may join. */
export function pairAllowed(kind: LinkKind, ra: Role | null, rb: Role | null): boolean {
  if (!ra || !rb) return false;
  // Turbine halls may be cross-tied (shared steam header / circulating-water header).
  if (kind === 'steam') return (ra === 'reactor' && rb === 'turbine') || (ra === 'turbine' && (rb === 'reactor' || rb === 'turbine'));
  if (kind === 'cooling') return (ra === 'turbine' && rb === 'cooler') || (ra === 'cooler' && rb === 'turbine') || (ra === 'turbine' && rb === 'turbine');
  if (!POWER_ROLES.includes(ra) || !POWER_ROLES.includes(rb)) return false;
  // Every cable ends at a switchyard/substation or at the grid connection.
  return ra === 'sub' || rb === 'sub' || ra === 'tie' || rb === 'tie';
}

/** What the other end of a link from this role must be, for UI hints. */
export function targetHint(kind: LinkKind, role: Role | null): string {
  if (kind === 'steam') return role === 'reactor' ? 'a turbine hall' : 'a reactor or another turbine hall (cross-tie)';
  if (kind === 'cooling') return role === 'cooler' ? 'a turbine hall' : 'a cooling unit or another turbine hall (cross-tie)';
  return role === 'sub' || role === 'tie' ? 'a turbine hall, switchyard, storage or industrial load' : 'a switchyard / substation or the grid connection';
}

const VOLTAGE: Partial<Record<BuildingType, number>> = {
  substation: 1, substation_400: 2, hvdc: 4, grid_sc: 5,
  battery: 1, storage_thermal: 2, storage_pumped: 3,
  datacenter: 2, hydrogen: 3,
};

/** Highest cable class (voltage level) an endpoint can terminate. */
export function maxVoltage(site: Site, id: number): number {
  if (id === GRID_TIE) return 5;
  const b = site.buildings.find((x) => x.id === id);
  if (!b) return 0;
  const v = VOLTAGE[b.type];
  if (v !== undefined) return v;
  return Math.min(5, BUILDINGS[b.type].tier ?? 1);
}

const CLASS_GROUPS: Record<LinkKind, BuildingCategory[]> = { steam: ['reactor', 'power'], cooling: ['cooling', 'power'], power: ['power', 'grid'] };

export function classUnlocked(s: GameState, kind: LinkKind, cls: number): boolean {
  const c = LINK_CLASSES[kind][cls];
  if (!c) return false;
  if (c.tier <= 1) return true;
  for (const def of Object.values(BUILDINGS)) {
    if (!CLASS_GROUPS[kind].includes(def.category) || (def.tier ?? 1) < c.tier) continue;
    if (def.unlock.level && s.level < def.unlock.level) continue;
    if (!isUnlockedByResearch(def.type, s.research.completed)) continue;
    return true;
  }
  return false;
}

export function classLockReason(s: GameState, site: Site, kind: LinkKind, cls: number, a: number, b: number): string | null {
  const c = LINK_CLASSES[kind][cls];
  if (!c) return 'Unknown size.';
  if (kind === 'power') {
    const v = Math.min(maxVoltage(site, a), maxVoltage(site, b));
    if (cls > v) return `Needs equipment rated for ${c.kv} at both ends`;
  }
  if (!classUnlocked(s, kind, cls)) return `Unlocks with tier ${c.tier} buildings`;
  return null;
}

// ── Geometry ──────────────────────────────────────────────────────────────

/** x position (world metres) of the access road along the plot's east side. */
export function roadWorldX(size: number): number {
  return (size * CELL) / 2 - CELL * 2;
}

/** World position of the grid connection pylon, just outside the plot by the road. */
export function tieWorld(size: number): [number, number] {
  return [roadWorldX(size) + 4.5, (size * CELL) / 2 + 4];
}

/** Endpoint centre in world metres. */
export function endpointWorld(site: Site, id: number): [number, number] | null {
  if (id === GRID_TIE) return tieWorld(site.size);
  const b = site.buildings.find((x) => x.id === id);
  if (!b) return null;
  const r = buildingRect(b);
  return [(r.x + r.w / 2 - site.size / 2) * CELL, (r.z + r.d / 2 - site.size / 2) * CELL];
}

/** Route length in metres (runs along the plot grid, so Manhattan distance). */
export function routeLength(site: Site, a: number, b: number): number {
  const p = endpointWorld(site, a);
  const q = endpointWorld(site, b);
  if (!p || !q) return 0;
  return Math.max(CELL, Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]));
}

export function linkLength(site: Site, l: Link): number {
  return routeLength(site, l.a, l.b);
}

export function linkRating(l: Pick<Link, 'kind' | 'cls' | 'circuits'>): number {
  return LINK_CLASSES[l.kind][l.cls].rating * l.circuits;
}

export function linkCost(kind: LinkKind, cls: number, circuits: number, length: number, costMod = 1): number {
  const c = LINK_CLASSES[kind][cls];
  return Math.round((c.base + c.perM * length) * circuits * costMod);
}

/** % of carried power lost in a cable right now. */
export function lossPct(site: Site, l: Link): number {
  const c = LINK_CLASSES[l.kind][l.cls];
  if (!c.loss) return 0;
  const load = l.flow / Math.max(1e-6, linkRating(l));
  return c.loss * (linkLength(site, l) / 100) * load;
}

export function endpointName(site: Site, id: number): string {
  if (id === GRID_TIE) return 'Grid connection';
  const b = site.buildings.find((x) => x.id === id);
  if (!b) return 'Removed';
  const same = site.buildings.filter((x) => x.type === b.type);
  const def = BUILDINGS[b.type];
  return same.length > 1 ? `${def.short} ${same.indexOf(b) + 1}` : def.short;
}

export function linksOf(site: Site, id: number, kind?: LinkKind): Link[] {
  return site.links.filter((l) => (l.a === id || l.b === id) && (!kind || l.kind === kind));
}

export function otherEnd(l: Link, id: number): number {
  return l.a === id ? l.b : l.a;
}

export function findLink(site: Site, kind: LinkKind, a: number, b: number): Link | undefined {
  return site.links.find((l) => l.kind === kind && ((l.a === a && l.b === b) || (l.a === b && l.b === a)));
}

/** Can a new link of this kind join these endpoints? Returns a reason or null. */
export function linkProblem(site: Site, kind: LinkKind, a: number, b: number): string | null {
  if (a === b) return 'Pick a different building.';
  const ra = roleById(site, a);
  const rb = roleById(site, b);
  if (!ra || !rb) return 'That building cannot be connected.';
  for (const id of [a, b]) {
    if (id === GRID_TIE) continue;
    const bd = site.buildings.find((x) => x.id === id);
    if (bd?.status === 'destroyed') return 'The reactor is destroyed.';
  }
  if (!pairAllowed(kind, ra, rb)) return `A ${KIND_LABEL[kind].toLowerCase()} from here must go to ${targetHint(kind, ra)}.`;
  if (findLink(site, kind, a, b)) return 'Already connected — upgrade the existing link instead.';
  return null;
}

/** Valid targets for a new link of this kind starting at `from`. */
export function validTargets(site: Site, kind: LinkKind, from: number): number[] {
  const ids = [GRID_TIE, ...site.buildings.map((b) => b.id)];
  return ids.filter((id) => !linkProblem(site, kind, from, id));
}

// ── Sizing helpers ────────────────────────────────────────────────────────

function capOf(b: Building, key: 'steamMW' | 'coolingMW' | 'dryMW' | 'gridMW' | 'storageRateMW' | 'dataMW' | 'h2MW'): number {
  const def = BUILDINGS[b.type];
  return (def.stats[key] ?? 0) * levelMult(def, b.level);
}

/** Typical flow a link from this building has to carry at full output. */
export function designNeed(site: Site, kind: LinkKind, id: number): number {
  if (id === GRID_TIE) return 0;
  const b = site.buildings.find((x) => x.id === id);
  if (!b) return 0;
  const def = BUILDINGS[b.type];
  if (def.reactor) return def.reactor.thermalMW * levelMult(def, b.level);
  if (kind === 'steam') return capOf(b, 'steamMW');
  if (kind === 'cooling') return def.category === 'cooling' ? capOf(b, 'coolingMW') + capOf(b, 'dryMW') : capOf(b, 'steamMW') * 0.68;
  if (def.stats.steamMW) return capOf(b, 'steamMW') * 0.4;
  return capOf(b, 'gridMW') + capOf(b, 'storageRateMW') + capOf(b, 'dataMW') + capOf(b, 'h2MW');
}

/** Smallest allowed size (and number of runs) that carries `need`. */
export function suggestClass(s: GameState, site: Site, kind: LinkKind, a: number, b: number, need: number, ignoreUnlock = false): { cls: number; circuits: number } {
  const list = LINK_CLASSES[kind];
  const volt = kind === 'power' ? Math.min(maxVoltage(site, a), maxVoltage(site, b)) : list.length;
  let best: { cls: number; circuits: number } | null = null;
  for (let i = 0; i < list.length; i++) {
    if (i > volt) continue;
    if (!ignoreUnlock && !classUnlocked(s, kind, i)) continue;
    best = { cls: i, circuits: MAX_CIRCUITS };
    if (list[i].rating * MAX_CIRCUITS >= need) {
      best.circuits = Math.max(1, Math.min(MAX_CIRCUITS, Math.ceil(need / list[i].rating)));
      return best;
    }
  }
  return best ?? { cls: 0, circuits: 1 };
}

// ── Building and removing links ───────────────────────────────────────────

export function makeLink(s: GameState, site: Site, kind: LinkKind, a: number, b: number, cls: number, circuits: number, paid: number): Link {
  const l: Link = { id: s.nextBuildingId++, kind, a, b, cls, circuits, paid, flow: 0, heat: 0, trip: 0 };
  site.links.push(l);
  return l;
}

export function removeLinksFor(site: Site, buildingId: number): number {
  const before = site.links.length;
  site.links = site.links.filter((l) => l.a !== buildingId && l.b !== buildingId);
  return before - site.links.length;
}

/** Drop links whose endpoints no longer exist (save repair). */
export function pruneLinks(site: Site): void {
  const ids = new Set(site.buildings.map((b) => b.id));
  ids.add(GRID_TIE);
  site.links = site.links.filter((l) => ids.has(l.a) && ids.has(l.b) && LINK_CLASSES[l.kind]?.[l.cls]
    && pairAllowed(l.kind, roleById(site, l.a), roleById(site, l.b)));
  for (const l of site.links) {
    l.circuits = Math.max(1, Math.min(MAX_CIRCUITS, Math.round(l.circuits || 1)));
    l.flow = Number.isFinite(l.flow) ? l.flow : 0;
    l.heat = Number.isFinite(l.heat) ? l.heat : 0;
    l.trip = Number.isFinite(l.trip) ? l.trip : 0;
    l.paid = Number.isFinite(l.paid) ? l.paid : 0;
  }
}

function distance(site: Site, a: number, b: number): number {
  return routeLength(site, a, b);
}

/**
 * Connect a site's buildings to their nearest partners, sized for full output.
 * Used to wire up saves from before networks existed, the starter plant and the
 * showcase. With `pay`, links cost money and only unlocked sizes are used.
 * Returns the number of links added.
 */
export function autoWire(s: GameState, site: Site, opts: { pay?: boolean; costMod?: number } = {}): number {
  const pay = !!opts.pay;
  let added = 0;
  const built = site.buildings.filter((b) => b.status !== 'destroyed');
  const ofRole = (r: Role) => built.filter((b) => roleOf(b.type) === r);
  const reactors = ofRole('reactor');
  const turbines = ofRole('turbine');
  const coolers = ofRole('cooler');
  const subs = ofRole('sub');
  const stores = ofRole('store');
  const loads = ofRole('load');

  const connect = (kind: LinkKind, a: number, b: number, need: number): boolean => {
    if (findLink(site, kind, a, b)) return true;
    const { cls, circuits } = suggestClass(s, site, kind, a, b, need * 1.1, !pay);
    const cost = pay ? linkCost(kind, cls, circuits, routeLength(site, a, b), opts.costMod ?? 1) : 0;
    if (pay && s.money < cost) return false;
    s.money -= cost;
    if (pay) s.ledger.construction += cost;
    makeLink(s, site, kind, a, b, cls, circuits, cost);
    added++;
    return true;
  };
  /** Join every turbine hall into one tree of cross-ties (nearest first). */
  function crossTie(kind: LinkKind, need: (t: Building) => number) {
    if (turbines.length < 2) return;
    const tied = (t: Building) => linksOf(site, t.id, kind).some((l) => roleById(site, otherEnd(l, t.id)) === 'turbine');
    const inTree = new Set<number>();
    const seed = turbines.find(tied) ?? turbines[0];
    // Grow from halls already tied together.
    const stack = [seed.id];
    while (stack.length) {
      const u = stack.pop()!;
      if (inTree.has(u)) continue;
      inTree.add(u);
      for (const l of linksOf(site, u, kind)) if (roleById(site, otherEnd(l, u)) === 'turbine') stack.push(otherEnd(l, u));
    }
    for (;;) {
      let best: [Building, Building, number] | null = null;
      for (const t of turbines) {
        if (inTree.has(t.id)) continue;
        for (const id of inTree) {
          const d = distance(site, t.id, id);
          if (!best || d < best[2]) best = [t, site.buildings.find((x) => x.id === id)!, d];
        }
      }
      if (!best) return;
      if (!connect(kind, best[0].id, best[1].id, Math.max(need(best[0]), need(best[1])))) return;
      inTree.add(best[0].id);
    }
  }
  const byDist = (from: number, list: Building[]) => [...list].sort((x, y) => distance(site, from, x.id) - distance(site, from, y.id));
  const linked = (id: number, kind: LinkKind) => linksOf(site, id, kind).length > 0;

  // Steam: each reactor gets enough turbine capacity, nearest halls first.
  const turbLeft = new Map(turbines.map((t) => [t.id, capOf(t, 'steamMW') - linksOf(site, t.id, 'steam').reduce((a, l) => a + designNeed(site, 'steam', otherEnd(l, t.id)), 0)]));
  for (const r of [...reactors].sort((x, y) => designNeed(site, 'steam', y.id) - designNeed(site, 'steam', x.id))) {
    let need = designNeed(site, 'steam', r.id) - linksOf(site, r.id, 'steam').reduce((a, l) => a + linkRating(l), 0);
    for (const t of byDist(r.id, turbines)) {
      if (need <= 0.5) break;
      const left = turbLeft.get(t.id) ?? 0;
      if (left <= 0.5 || findLink(site, 'steam', r.id, t.id)) continue;
      const take = Math.min(left, need);
      if (!connect('steam', r.id, t.id, take)) break;
      turbLeft.set(t.id, left - take);
      need -= take;
    }
    if (!linked(r.id, 'steam') && turbines.length) connect('steam', r.id, byDist(r.id, turbines)[0].id, designNeed(site, 'steam', r.id));
  }
  // Spare turbine halls go to the reactor that is shortest of turbine capacity.
  const steamDeficit = (r: Building) => designNeed(site, 'steam', r.id) - linksOf(site, r.id, 'steam').reduce((a, l) => {
    const t = site.buildings.find((x) => x.id === otherEnd(l, r.id));
    return a + (t ? capOf(t, 'steamMW') : 0);
  }, 0);
  for (const t of turbines) {
    if (linksOf(site, t.id, 'steam').some((l) => roleById(site, otherEnd(l, t.id)) === 'reactor') || !reactors.length) continue;
    const short = [...reactors].sort((x, y) => steamDeficit(y) - steamDeficit(x))[0];
    const target = steamDeficit(short) > 1 ? short : byDist(t.id, reactors)[0];
    connect('steam', t.id, target.id, Math.max(capOf(t, 'steamMW'), steamDeficit(target)));
  }
  // Cross-tie the turbine halls so they share steam (and condenser cooling).
  crossTie('steam', (t) => capOf(t, 'steamMW') * 0.5);

  // Cooling water: every turbine condenser gets enough cooling, nearest first.
  const coolLeft = new Map(coolers.map((c) => [c.id, designNeed(site, 'cooling', c.id)]));
  for (const t of turbines) {
    let need = designNeed(site, 'cooling', t.id) - linksOf(site, t.id, 'cooling').reduce((a, l) => a + linkRating(l), 0);
    for (const c of byDist(t.id, coolers)) {
      if (need <= 0.5) break;
      const left = coolLeft.get(c.id) ?? 0;
      if (left <= 0.5 || findLink(site, 'cooling', t.id, c.id)) continue;
      const take = Math.min(left, need);
      if (!connect('cooling', t.id, c.id, take)) break;
      coolLeft.set(c.id, left - take);
      need -= take;
    }
    if (!linked(t.id, 'cooling') && coolers.length) connect('cooling', t.id, byDist(t.id, coolers)[0].id, designNeed(site, 'cooling', t.id));
  }
  const coolDeficit = (t: Building) => designNeed(site, 'cooling', t.id) - linksOf(site, t.id, 'cooling').reduce((a, l) => {
    const c = site.buildings.find((x) => x.id === otherEnd(l, t.id));
    return a + (c && roleOf(c.type) === 'cooler' ? designNeed(site, 'cooling', c.id) : 0);
  }, 0);
  for (const c of coolers) {
    if (linked(c.id, 'cooling') || !turbines.length) continue;
    const short = [...turbines].sort((x, y) => coolDeficit(y) - coolDeficit(x))[0];
    const target = coolDeficit(short) > 1 ? short : byDist(c.id, turbines)[0];
    connect('cooling', c.id, target.id, designNeed(site, 'cooling', c.id));
  }
  crossTie('cooling', (t) => designNeed(site, 'cooling', t.id) * 0.5);

  // Power: switchyards to the grid connection, generators to switchyards with
  // room left (or straight to the grid connection), storage and loads to the nearest.
  for (const sub of subs) if (!linked(sub.id, 'power')) connect('power', sub.id, GRID_TIE, designNeed(site, 'power', sub.id) + 12);
  const subLeft = new Map(subs.map((x) => [x.id, designNeed(site, 'power', x.id)]));
  for (const t of turbines) {
    if (linked(t.id, 'power')) continue;
    const need = designNeed(site, 'power', t.id);
    const sub = byDist(t.id, subs).find((x) => (subLeft.get(x.id) ?? 0) >= need * 0.5);
    if (sub) {
      subLeft.set(sub.id, (subLeft.get(sub.id) ?? 0) - need);
      connect('power', t.id, sub.id, need);
    } else connect('power', t.id, GRID_TIE, need);
  }
  for (const x of [...stores, ...loads]) {
    if (linked(x.id, 'power')) continue;
    const sub = byDist(x.id, subs)[0];
    connect('power', x.id, sub ? sub.id : GRID_TIE, designNeed(site, 'power', x.id));
  }
  return added;
}

// ── Solving the plant networks each tick ──────────────────────────────────

export interface PlantNetInput {
  /** Reactor id → heat produced now, MW(th). */
  thermal: Map<number, number>;
  /** Turbine id → steam the turbine can turn into power now (0 if not running). */
  steamCap: Map<number, number>;
  effBonus: Map<number, number>;
  /** Turbine halls whose condensers accept steam (bypass) even when not generating. */
  condensers: Set<number>;
  /** Cooling unit id → heat it can reject now, MW. */
  coolCap: Map<number, number>;
  /** Buildings that can pass power on (running switchyards, storage, loads). */
  powerUp: Set<number>;
  /** Reactor-weighted steam-cycle efficiency before turbine bonuses. */
  baseEff: number;
  staffFactor: number;
  houseLoad: number;
  /** Allow cables to run above their rating (they heat up). */
  overload: boolean;
}

export interface ReactorNet {
  /** Heat-sink capability relative to the reactor's heat (≥1 = fully cooled, with margin). */
  ratio: number;
  /** Fraction of the reactor's heat actually removed. */
  removed: number;
  /** Has a steam line to a turbine hall with a working condenser. */
  connected: boolean;
  /** Its turbine halls have cooling water. */
  cooled: boolean;
}

export interface PlantNetResult extends GridSide {
  reactors: Map<number, ReactorNet>;
  steamUsed: number;
  heatToTurbines: number;
  strandedHeat: number;
  cycleEff: number;
  gross: number;
  heatReject: number;
  heatRejected: number;
  coolingMargin: number;
  electric: number;
  delivered: number;
  cableLoss: number;
  stranded: number;
  steamCapConnected: number;
  coolCapConnected: number;
  /** Turbine halls and cooling units: share of their capacity in use (0..1). */
  load: Map<number, number>;
  /** Power passing through each building's cable connections, MW(e). */
  through: Map<number, number>;
}

function findRoot(p: Map<number, number>, x: number): number {
  let r = x;
  while (p.get(r) !== undefined && p.get(r) !== r) r = p.get(r)!;
  p.set(x, r);
  return r;
}

export function solvePlant(site: Site, inp: PlantNetInput): PlantNetResult {
  const steamLinks = site.links.filter((l) => l.kind === 'steam');
  const coolLinks = site.links.filter((l) => l.kind === 'cooling');
  const powerLinks = site.links.filter((l) => l.kind === 'power');
  const isReactor = (id: number) => inp.thermal.has(id);

  // Union-find over steam + cooling links: plant "units" for cooling margins.
  const parent = new Map<number, number>();
  for (const l of [...steamLinks, ...coolLinks]) {
    if (!parent.has(l.a)) parent.set(l.a, l.a);
    if (!parent.has(l.b)) parent.set(l.b, l.b);
    const ra = findRoot(parent, l.a), rb = findRoot(parent, l.b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const turbIds = new Set<number>([...inp.steamCap.keys(), ...inp.condensers]);
  let thermalTotal = 0;
  for (const th of inp.thermal.values()) thermalTotal += th;

  // ── Cooling water: turbine condensers → cooling units ──
  const coolNet = (Qm: Map<number, number>, unbounded: boolean) => {
    const f = new FlowNet();
    const s = f.node(), t = f.node();
    const tn = new Map<number, number>();
    const cn = new Map<number, number>();
    const src = new Map<number, number>();
    const sink = new Map<number, number>();
    for (const id of turbIds) {
      const n = f.node();
      tn.set(id, n);
      const q = Qm.get(id) ?? 0;
      if (q > 0 || unbounded) src.set(id, f.edge(s, n, unbounded ? (q > 0 ? 1e12 : 0) : q));
    }
    for (const [id, cap] of inp.coolCap) {
      const n = f.node();
      cn.set(id, n);
      if (cap > 0) sink.set(id, f.edge(n, t, cap));
    }
    const edges = new Map<Link, number>();
    for (const l of coolLinks) {
      if (tn.has(l.a) && tn.has(l.b)) {
        const c = linkRating(l);
        edges.set(l, f.edge(tn.get(l.a)!, tn.get(l.b)!, c, c));
        continue;
      }
      const tb = tn.has(l.a) ? l.a : l.b;
      const c = tb === l.a ? l.b : l.a;
      if (!tn.has(tb) || !cn.has(c)) continue;
      edges.set(l, f.edge(tn.get(tb)!, cn.get(c)!, linkRating(l)));
    }
    f.maxflow(s, t);
    return { f, src, edges, sink };
  };

  // ── Steam: reactors → turbine halls ──
  // Steam only goes where it can be condensed: a turbine hall takes no more
  // than it can turn into work plus reject through its cooling water. Solved by
  // re-routing a few times, limiting halls whose condensers fall short.
  const accept = new Map<number, number>();
  const G = new Map<number, number>();
  const H = new Map<number, number>();
  const grossT = new Map<number, number>();
  const Q = new Map<number, number>();
  const cooledT = new Map<number, number>();
  const pipeEdge = new Map<Link, { r: number | null; t: number; e: number }>();
  let steamUsed = 0, heatToTurbines = 0, cycleEff = 0, gross = 0, heatReject = 0, heatRejected = 0;
  let actual = coolNet(Q, false);
  for (let iter = 0; iter < 5; iter++) {
    const fs = new FlowNet();
    const S = fs.node(), T = fs.node();
    const rNode = new Map<number, number>();
    const tNode = new Map<number, number>();
    const tOut = new Map<number, number>();
    for (const [id, th] of inp.thermal) {
      const n = fs.node();
      rNode.set(id, n);
      if (th > 0) fs.edge(S, n, th);
    }
    for (const id of turbIds) {
      const n = fs.node();
      const o = fs.node();
      tNode.set(id, n);
      tOut.set(id, o);
      fs.edge(n, o, accept.get(id) ?? 1e12);
    }
    pipeEdge.clear();
    for (const l of steamLinks) {
      l.flow = 0;
      if (isReactor(l.a) || isReactor(l.b)) {
        const r = isReactor(l.a) ? l.a : l.b;
        const t = r === l.a ? l.b : l.a;
        if (!rNode.has(r) || !tNode.has(t) || !inp.condensers.has(t)) continue;
        pipeEdge.set(l, { r, t, e: fs.edge(rNode.get(r)!, tNode.get(t)!, linkRating(l)) });
      } else if (inp.condensers.has(l.a) && inp.condensers.has(l.b)) {
        // Cross-tie between two turbine halls: steam can flow either way.
        const c = linkRating(l);
        pipeEdge.set(l, { r: null, t: l.b, e: fs.edge(tNode.get(l.a)!, tNode.get(l.b)!, c, c) });
      }
    }
    const genEdge = new Map<number, number>();
    for (const id of turbIds) {
      const cap = inp.steamCap.get(id) ?? 0;
      if (cap > 0) genEdge.set(id, fs.edge(tOut.get(id)!, T, cap));
    }
    fs.maxflow(S, T);
    const bypassEdge = new Map<number, number>();
    for (const id of inp.condensers) bypassEdge.set(id, fs.edge(tOut.get(id)!, T, 1e12));
    fs.maxflow(S, T);

    steamUsed = 0;
    heatToTurbines = 0;
    let effSum = 0;
    for (const id of turbIds) {
      const g = genEdge.has(id) ? fs.flow(genEdge.get(id)!) : 0;
      const by = bypassEdge.has(id) ? fs.flow(bypassEdge.get(id)!) : 0;
      G.set(id, g);
      H.set(id, g + by);
      steamUsed += g;
      heatToTurbines += g + by;
      effSum += g * (inp.effBonus.get(id) ?? 0);
    }
    for (const [l, p] of pipeEdge) l.flow = Math.abs(fs.flow(p.e));
    cycleEff = steamUsed > 0 ? Math.min(0.6, inp.baseEff + effSum / steamUsed) : 0;
    gross = 0;
    heatReject = 0;
    for (const id of turbIds) {
      const gr = (G.get(id) ?? 0) * cycleEff * inp.staffFactor;
      grossT.set(id, gr);
      gross += gr;
      const q = Math.max(0, (H.get(id) ?? 0) - gr);
      Q.set(id, q);
      heatReject += q;
    }
    actual = coolNet(Q, false);
    heatRejected = 0;
    cooledT.clear();
    for (const [id, e] of actual.src) {
      const v = actual.f.flow(e);
      cooledT.set(id, v);
      heatRejected += v;
    }
    let changed = false;
    for (const id of turbIds) {
      const short = (Q.get(id) ?? 0) - (cooledT.get(id) ?? 0);
      if (short <= Math.max(1e-3, (Q.get(id) ?? 0) * 1e-3)) continue;
      const lim = Math.max(0, (H.get(id) ?? 0) - short);
      if (lim < (accept.get(id) ?? Infinity) - 1e-6) {
        accept.set(id, lim);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const l of coolLinks) l.flow = actual.edges.has(l) ? Math.abs(actual.f.flow(actual.edges.get(l)!)) : 0;
  const margin = coolNet(Q, true);
  const unitReject = new Map<number, number>();
  const unitCoolable = new Map<number, number>();
  for (const id of turbIds) {
    const root = parent.has(id) ? findRoot(parent, id) : id;
    unitReject.set(root, (unitReject.get(root) ?? 0) + (Q.get(id) ?? 0));
    const e = margin.src.get(id);
    if (e !== undefined) unitCoolable.set(root, (unitCoolable.get(root) ?? 0) + margin.f.flow(e));
  }
  let coolingMargin = 10;
  for (const [root, q] of unitReject) {
    if (q <= 0.01) continue;
    coolingMargin = Math.min(coolingMargin, (unitCoolable.get(root) ?? 0) / q);
  }

  // Per-reactor heat sink: steam that enters a plant unit is removed in the
  // same proportion as the unit's total (turbine work + cooling).
  const unitIn = new Map<number, number>();
  const unitOut = new Map<number, number>();
  const unitCooled = new Map<number, boolean>();
  const rootOf = (id: number) => (parent.has(id) ? findRoot(parent, id) : id);
  for (const id of turbIds) {
    const root = rootOf(id);
    unitIn.set(root, (unitIn.get(root) ?? 0) + (H.get(id) ?? 0));
    unitOut.set(root, (unitOut.get(root) ?? 0) + (grossT.get(id) ?? 0) + (cooledT.get(id) ?? 0));
  }
  for (const [id, c] of inp.coolCap) if (c > 0 && parent.has(id)) unitCooled.set(rootOf(id), true);
  const phiOf = (id: number) => {
    const root = rootOf(id);
    const h = unitIn.get(root) ?? 0;
    return h > 1e-6 ? Math.min(1, (unitOut.get(root) ?? 0) / h) : 1;
  };
  const reactors = new Map<number, ReactorNet>();
  for (const [id, th] of inp.thermal) {
    let removed = 0, pipeCap = 0, connected = false, cooled = false;
    for (const [l, p] of pipeEdge) {
      if (p.r !== id) continue;
      connected = true;
      pipeCap += linkRating(l);
      removed += l.flow * phiOf(p.t);
      if (unitCooled.get(rootOf(p.t))) cooled = true;
    }
    const frac = th > 0.01 ? removed / th : connected ? 1 : 0;
    let ratio: number;
    if (th <= 0.01) ratio = connected && cooled ? 10 : 0;
    else if (frac >= 0.99) {
      const root = parent.has(id) ? findRoot(parent, id) : id;
      const q = unitReject.get(root) ?? 0;
      const unitMargin = q > 0.01 ? (unitCoolable.get(root) ?? 0) / q : 10;
      ratio = Math.max(1, Math.min(unitMargin, pipeCap / th));
    } else ratio = frac;
    reactors.set(id, { ratio, removed: Math.min(1, frac), connected, cooled });
  }

  // ── Electricity: generators → cables → switchyards → grid connection ──
  const electric = Math.max(0, gross - inp.houseLoad);
  const share = gross > 0 ? electric / gross : 0;
  const fp = new FlowNet();
  const PS = fp.node(), PT = fp.node();
  const pn = new Map<number, number>();
  const nodeFor = (id: number) => {
    let n = pn.get(id);
    if (n === undefined) {
      n = fp.node();
      pn.set(id, n);
    }
    return n;
  };
  const tie = nodeFor(GRID_TIE);
  fp.edge(tie, PT, 1e12);
  let genTotal = 0;
  for (const id of turbIds) {
    const e = (grossT.get(id) ?? 0) * share;
    if (e <= 0) continue;
    genTotal += e;
    fp.edge(PS, nodeFor(id), e);
  }
  const live = (l: Link) => l.trip <= 0 && !l.broken && [l.a, l.b].every((id) => id === GRID_TIE || turbIds.has(id) || inp.powerUp.has(id));
  const cableEdge = new Map<Link, number>();
  for (const l of powerLinks) {
    l.flow = 0;
    if (!live(l)) continue;
    const r = linkRating(l);
    cableEdge.set(l, fp.edge(nodeFor(l.a), nodeFor(l.b), r, r));
  }
  let delivered = fp.maxflow(PS, PT);
  if (inp.overload) {
    for (const [l, e] of cableEdge) {
      const extra = linkRating(l) * (OVERLOAD_LIMIT - 1);
      fp.widen(e, extra, extra);
    }
    delivered += fp.maxflow(PS, PT);
  }
  let cableLoss = 0;
  for (const [l, e] of cableEdge) {
    l.flow = Math.abs(fp.flow(e));
    cableLoss += l.flow * (lossPct(site, l) / 100);
  }
  cableLoss = Math.min(cableLoss, delivered);

  const side = gridSide(site, (id) => id === GRID_TIE || turbIds.has(id) || inp.powerUp.has(id));

  const load = new Map<number, number>();
  for (const id of turbIds) {
    const cap = inp.steamCap.get(id) ?? 0;
    load.set(id, cap > 0 ? (G.get(id) ?? 0) / cap : (H.get(id) ?? 0) > 0 ? 1 : 0);
  }
  for (const [id, cap] of inp.coolCap) {
    const e = actual.sink.get(id);
    load.set(id, cap > 0 && e !== undefined ? actual.f.flow(e) / cap : 0);
  }
  const through = new Map<number, number>();
  for (const l of powerLinks) {
    if (!l.flow) continue;
    through.set(l.a, (through.get(l.a) ?? 0) + l.flow / 2);
    through.set(l.b, (through.get(l.b) ?? 0) + l.flow / 2);
  }

  let steamCapConnected = 0;
  for (const [id, cap] of inp.steamCap) if (steamLinks.some((l) => (l.a === id || l.b === id) && inp.thermal.has(otherEnd(l, id)))) steamCapConnected += cap;
  let coolCapConnected = 0;
  for (const [id, cap] of inp.coolCap) if (coolLinks.some((l) => (l.a === id || l.b === id) && turbIds.has(otherEnd(l, id)))) coolCapConnected += cap;

  return {
    reactors, steamUsed, heatToTurbines, strandedHeat: Math.max(0, thermalTotal - heatToTurbines), cycleEff, gross,
    heatReject, heatRejected, coolingMargin, electric, delivered: delivered - cableLoss, cableLoss,
    stranded: Math.max(0, genTotal - delivered), ...side,
    steamCapConnected, coolCapConnected, load, through,
  };
}

export interface GridSide {
  /** Switchyards connected to the grid connection. */
  busSubs: Set<number>;
  /** Storage / load id → cable capacity to the grid side. */
  busStores: Map<number, number>;
  busLoads: Map<number, number>;
  tieConnected: boolean;
}

/** Everything reachable from the grid connection through live cables and running switchyards. */
export function gridSide(site: Site, up: (id: number) => boolean): GridSide {
  const powerLinks = site.links.filter((l) => l.kind === 'power' && l.trip <= 0 && !l.broken && up(l.a) && up(l.b));
  const busSubs = new Set<number>();
  const busStores = new Map<number, number>();
  const busLoads = new Map<number, number>();
  const seen = new Set<number>([GRID_TIE]);
  const queue = [GRID_TIE];
  while (queue.length) {
    const u = queue.shift()!;
    for (const l of powerLinks) {
      if (l.a !== u && l.b !== u) continue;
      const v = otherEnd(l, u);
      if (seen.has(v)) continue;
      seen.add(v);
      if (roleById(site, v) === 'sub') {
        busSubs.add(v);
        queue.push(v);
      }
    }
  }
  for (const id of seen) {
    const role = roleById(site, id);
    if (role !== 'store' && role !== 'load') continue;
    const cap = powerLinks.filter((l) => (l.a === id || l.b === id) && seen.has(otherEnd(l, id)) && roleById(site, otherEnd(l, id)) !== role).reduce((a, l) => a + linkRating(l), 0);
    (role === 'store' ? busStores : busLoads).set(id, cap);
  }
  return { busSubs, busStores, busLoads, tieConnected: powerLinks.some((l) => l.a === GRID_TIE || l.b === GRID_TIE) };
}

/** Repairing a storm-damaged line: crews, a crane and new conductors. */
export function linkRepairCost(l: Link): number {
  return Math.round(Math.max(300, l.paid * 0.25));
}

/** Cable heating from overload; breakers trip and reclose. Returns links that tripped. */
export function stepCables(site: Site, dt: number): Link[] {
  const tripped: Link[] = [];
  for (const l of site.links) {
    if (l.kind !== 'power' || l.broken) continue;
    if (l.trip > 0) {
      l.trip = Math.max(0, l.trip - dt);
      l.heat = Math.max(0, l.heat - 0.05 * dt);
      continue;
    }
    const load = l.flow / Math.max(1e-6, linkRating(l));
    if (load > 1.001) l.heat += (load - 1) * 0.2 * dt;
    else l.heat = Math.max(0, l.heat - 0.04 * dt);
    if (l.heat >= 1) {
      l.heat = 0.6;
      l.trip = BREAKER_RECLOSE;
      l.flow = 0;
      tripped.push(l);
    }
  }
  return tripped;
}
