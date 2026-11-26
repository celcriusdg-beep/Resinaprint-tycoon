import type { Building, BuildingType, GameState, Site } from '../types';
import { BUILDINGS, isReactor } from '../buildings/defs';
import { DAY_LENGTH } from '../constants';
import { LOCATION_BY_ID } from '../progression/locations';
import { getMods } from '../simulation/modifiers';
import { safetyRating } from '../simulation/plant';
import { staffEffects } from '../staff/staff';
import { linksOf, GRID_TIE, gridSide } from '../network/network';
import { poolCapacity } from '../supply/fuelcycle';
import { restart } from '../simulation/reactor';

// The nuclear regulator and public opinion.
//  • Construction permit: every new reactor needs one (fee + review time) before it can be built.
//  • Operating licence: a finished reactor stays shut down until a pre-start
//    inspection finds it connected, crewed by licensed operators, backed up and guarded.
//  • Inspections every few game days per site. Findings must be fixed by a
//    deadline: a missed minor finding means a fine and escalation, a missed major
//    finding suspends the site's largest reactor until it is fixed.
//  • Each site has a regulator rating; the company has public opinion, which
//    speeds up or slows down licensing and construction.

export const INSPECTION_INTERVAL = DAY_LENGTH * 3;
/** Test switch: run the game without the regulator (balance comparisons). */
export const REGULATOR_OFF = { on: false };
export const FINDING_DEADLINE = DAY_LENGTH;

export type FindingKind = 'backup' | 'security' | 'condition' | 'pool' | 'fatigue' | 'operators' | 'trips';

export interface Finding {
  id: number;
  siteId: string;
  kind: FindingKind;
  major: boolean;
  deadline: number;
  /** A reactor has already been suspended over this finding. */
  suspended?: boolean;
}

export interface Permit {
  id: number;
  siteId: string;
  type: BuildingType;
  /** Game time when the review finishes. */
  ready: number;
}

export interface SiteRegulator {
  rating: number; // 0..100
  nextInspection: number;
  /** Recent reactor trips, decaying (half-life ≈ 1 game day). */
  trips: number;
  /** Recent serious incidents, decaying slowly. */
  severe: number;
  /** Game time until which all reactors are held after a core damage incident. */
  holdUntil: number;
}

export interface RegulatorState {
  opinion: number; // 0..100
  /** Community programme level 0..5 (costs money every second). */
  community: number;
  permits: Permit[];
  findings: Finding[];
  /** Game time of the last serious incident anywhere (for the "clean record" bonus). */
  lastIncident: number;
}

export function newRegulator(): RegulatorState {
  return { opinion: 60, community: 0, permits: [], findings: [], lastIncident: 0 };
}

export function newSiteRegulator(gameTime: number): SiteRegulator {
  return { rating: 70, nextInspection: gameTime + INSPECTION_INTERVAL, trips: 0, severe: 0, holdUntil: 0 };
}

export const FINDING_INFO: Record<FindingKind, { title: string; fix: string }> = {
  backup: { title: 'Insufficient emergency power', fix: 'Build or upgrade Emergency Generators until backup power covers the pumps.' },
  security: { title: 'Security staffing below requirement', fix: 'Hire security officers (Staff panel).' },
  condition: { title: 'Safety equipment in poor condition', fix: 'Repair every building below 30% condition.' },
  pool: { title: 'Spent fuel pool nearly full', fix: 'Move fuel into dry casks or ship it off-site.' },
  fatigue: { title: 'Excessive crew fatigue', fix: 'Hire operators or switch to 8-hour shifts until fatigue is below 50%.' },
  operators: { title: 'Not enough licensed operators', fix: 'Hire and license reactor operators.' },
  trips: { title: 'Too many unplanned reactor trips', fix: 'Run without trips for a while (fix cooling, staffing and worn equipment).' },
};

// ── Licensing ─────────────────────────────────────────────────────────────

/** Review time and minimum site safety rating per reactor class. */
export function permitSpec(type: BuildingType): { days: number; minSafety: number } {
  const th = BUILDINGS[type].reactor?.thermalMW ?? 0;
  if (th <= 30) return { days: 0.05, minSafety: 0 };
  if (th <= 100) return { days: 0.15, minSafety: 30 };
  if (th <= 1000) return { days: 0.5, minSafety: 45 };
  if (th <= 3000) return { days: 0.75, minSafety: 50 };
  return { days: 1, minSafety: 55 };
}

/** Opinion 60 = normal speed; low opinion slows licensing down, high opinion speeds it up. */
export function opinionFactor(s: GameState): number {
  return Math.max(0.6, Math.min(1.8, 1.6 - s.regulator.opinion / 100));
}

export function permitFee(s: GameState, type: BuildingType): number {
  return Math.round(BUILDINGS[type].cost * 0.03 * (s.regulator.opinion > 75 ? 0.75 : 1));
}

export function permitTime(s: GameState, type: BuildingType): number {
  return permitSpec(type).days * DAY_LENGTH * opinionFactor(s);
}

export function permitsFor(s: GameState, siteId: string, type: BuildingType): Permit[] {
  return s.regulator.permits.filter((p) => p.siteId === siteId && p.type === type);
}

/** A granted (finished review) permit for this reactor type at this site, if any. */
export function grantedPermit(s: GameState, siteId: string, type: BuildingType): Permit | undefined {
  if (REGULATOR_OFF.on) return { id: 0, siteId, type, ready: 0 };
  return permitsFor(s, siteId, type).find((p) => p.ready <= s.gameTime);
}

export function permitProblem(s: GameState, siteId: string, type: BuildingType): string | null {
  const spec = permitSpec(type);
  const site = s.sites[siteId];
  const safety = safetyRating(s, siteId, getMods(s, siteId));
  if (safety < spec.minSafety) return `Site safety rating ${Math.round(safety)} — the regulator wants at least ${spec.minSafety}.`;
  if (spec.minSafety >= 45 && site && staffEffects(site, 1).cover.security < 0.8) return 'Hire more security officers first.';
  if (permitsFor(s, siteId, type).length >= 2) return 'You already hold or await two permits for this design here.';
  const def = BUILDINGS[type];
  if (def.maxPerSite && site && site.buildings.filter((b) => b.type === type).length + permitsFor(s, siteId, type).length >= def.maxPerSite) return `Limit of ${def.maxPerSite} per site.`;
  return null;
}

export function applyPermit(s: GameState, siteId: string, type: BuildingType): string | null {
  if (!isReactor(type)) return 'Only reactors need a construction permit.';
  const problem = permitProblem(s, siteId, type);
  if (problem) return problem;
  const fee = permitFee(s, type);
  if (s.money < fee) return 'Not enough money for the application fee.';
  s.money -= fee;
  s.ledger.other -= fee;
  s.regulator.permits.push({ id: s.nextBuildingId++, siteId, type, ready: s.gameTime + permitTime(s, type) });
  return null;
}

export function usePermit(s: GameState, siteId: string, type: BuildingType): boolean {
  if (REGULATOR_OFF.on) return true;
  const p = grantedPermit(s, siteId, type);
  if (!p) return false;
  s.regulator.permits = s.regulator.permits.filter((x) => x !== p);
  return true;
}

/** Pre-start checklist for an operating licence. */
export function licenceChecklist(s: GameState, site: Site, b: Building): { label: string; ok: boolean }[] {
  const fx = staffEffects(site, 1);
  const big = (BUILDINGS[b.type].reactor?.thermalMW ?? 0) > 100;
  const steam = linksOf(site, b.id, 'steam');
  const cooled = steam.length > 0 && steam.some((l) => {
    const t = l.a === b.id ? l.b : l.a;
    return linksOf(site, t, 'cooling').length > 0 || site.links.some((x) => x.kind === 'cooling' && (x.a === t || x.b === t));
  });
  const side = gridSide(site, () => true);
  const turbines = steam.map((l) => (l.a === b.id ? l.b : l.a));
  const onGrid = turbines.some((t) => linksOf(site, t, 'power').some((l) => {
    const o = l.a === t ? l.b : l.a;
    return o === GRID_TIE || side.busSubs.has(o);
  }));
  const items = [
    { label: 'Steam line to a turbine hall', ok: steam.length > 0 },
    { label: 'Turbine hall has cooling water', ok: cooled },
    { label: 'Power cable path to the grid', ok: onGrid },
    { label: 'Licensed operators for every shift', ok: fx.cover.operator >= 0.999 },
  ];
  if (big) {
    items.push({ label: 'Security staff in place', ok: fx.cover.security >= 0.9 });
    if (s.level >= 4) items.push({ label: 'Emergency power covers the pumps', ok: site.stats.backupMW >= site.stats.backupNeedMW * 0.999 || site.stats.backupNeedMW <= 0 });
  }
  return items;
}

// ── Stepping ──────────────────────────────────────────────────────────────

export interface RegNews {
  kind: 'good' | 'warn' | 'bad' | 'info';
  title: string;
  text: string;
}

function findingOpen(s: GameState, site: Site, kind: FindingKind): boolean {
  const st = site.stats;
  const fx = staffEffects(site, 1);
  switch (kind) {
    case 'backup': return s.level >= 4 && site.buildings.some((b) => (BUILDINGS[b.type].reactor?.thermalMW ?? 0) > 100 && b.status !== 'constructing') && st.backupNeedMW > 0.05 && st.backupMW < st.backupNeedMW;
    case 'security': return fx.needs.security > 0 && fx.cover.security < 0.9;
    case 'condition': return site.buildings.some((b) => b.status !== 'constructing' && b.status !== 'destroyed' && b.condition < 30);
    case 'pool': { const cap = poolCapacity(site); return cap > 0 && site.spent.pool > cap * 0.9; }
    case 'fatigue': return site.staff.fatigue > 0.5;
    case 'operators': return fx.cover.operator < 0.9;
    case 'trips': return site.reg.trips > 3 + 0.5 * site.buildings.filter((b) => b.reactor).length;
  }
}

const KINDS: FindingKind[] = ['backup', 'security', 'condition', 'pool', 'fatigue', 'operators', 'trips'];

/** Record a reactor trip or incident for the regulator and public opinion. */
export function reportIncident(s: GameState, siteId: string, weight: 'trip' | 'error' | 'atws' | 'core' | 'ines', ines = 0): void {
  const site = s.sites[siteId];
  const r = s.regulator;
  if (weight === 'trip') { site.reg.trips += 1; r.opinion -= 0.3; }
  if (weight === 'error') { site.reg.trips += 1.5; r.opinion -= 1; }
  if (weight === 'atws') { site.reg.severe += 1; r.opinion -= 5; r.lastIncident = s.gameTime; }
  if (weight === 'ines') {
    if (ines === 1) { site.reg.trips += 1; r.opinion -= 1; }
    if (ines === 2) { site.reg.severe += 1; r.opinion -= 4; r.lastIncident = s.gameTime; }
    if (ines >= 3) { site.reg.severe += 2; r.opinion -= 10; r.lastIncident = s.gameTime; }
  }
  if (weight === 'core') {
    site.reg.severe += 4;
    r.opinion -= 35;
    r.lastIncident = s.gameTime;
    // Every reactor at the site is held for a regulatory review.
    site.reg.holdUntil = s.gameTime + DAY_LENGTH;
  }
  r.opinion = Math.max(0, r.opinion);
}

export function communityCost(s: GameState): number {
  return s.regulator.community * (2 + s.level * 1.5);
}

export function stepRegulator(s: GameState, dt: number, offline: boolean): RegNews[] {
  if (REGULATOR_OFF.on) return [];
  const news: RegNews[] = [];
  const r = s.regulator;
  // Public opinion drifts towards a level set by the record and outreach.
  let visitors = 0;
  for (const id of s.unlockedSites) visitors += s.sites[id].buildings.filter((b) => b.type === 'visitor' && b.status === 'active').length;
  const clean = Math.min(15, Math.max(0, (s.gameTime - r.lastIncident) / DAY_LENGTH) * 1.5);
  const target = Math.min(95, 52 + clean + 5 * Math.min(3, visitors) + 4 * r.community);
  r.opinion += (target - r.opinion) * Math.min(1, dt / (DAY_LENGTH * 2));
  const cost = communityCost(s) * dt;
  s.money -= cost;
  s.ledger.other -= cost;

  for (const id of s.unlockedSites) {
    const site = s.sites[id];
    const reg = site.reg;
    const loc = LOCATION_BY_ID[id];
    const decay = Math.pow(0.5, dt / DAY_LENGTH);
    reg.trips *= decay;
    reg.severe *= Math.pow(0.5, dt / (DAY_LENGTH * 4));
    const safety = safetyRating(s, id, getMods(s, id));
    const open = r.findings.filter((f) => f.siteId === id);
    const rTarget = Math.max(0, Math.min(100, 45 + safety * 0.5 - reg.trips * 4 - reg.severe * 12 - open.length * 5 - (open.some((f) => f.major) ? 10 : 0)));
    reg.rating += (rTarget - reg.rating) * Math.min(1, dt / DAY_LENGTH);

    // While the player is away the regulator waits: deadlines pause and no new findings are raised.
    if (offline) {
      for (const f of open) f.deadline += dt;
      if (s.gameTime >= reg.nextInspection) reg.nextInspection = s.gameTime + INSPECTION_INTERVAL;
    }
    // Findings close as soon as the problem is fixed; otherwise they escalate at the deadline.
    for (const f of open) {
      const fixed = !findingOpen(s, site, f.kind);
      if (s.gameTime < f.deadline && !fixed) continue;
      if (fixed) {
        r.findings = r.findings.filter((x) => x !== f);
        reg.rating = Math.min(100, reg.rating + 3);
        news.push({ kind: 'good', title: 'Finding closed', text: `${FINDING_INFO[f.kind].title} at ${loc.name} resolved.` });
        continue;
      }
      // A young company only gets fines; suspensions start at company level 5.
      if (!f.major || s.level < 5) {
        const fine = Math.round(Math.max(s.level < 5 ? 500 : 2000, site.stats.revenue * 60));
        s.money -= fine;
        s.ledger.other -= fine;
        f.major = s.level >= 5;
        f.deadline = s.gameTime + FINDING_DEADLINE;
        r.opinion = Math.max(0, r.opinion - 2);
        news.push({ kind: 'bad', title: 'Regulator fine', text: `${FINDING_INFO[f.kind].title} at ${loc.name} not fixed: fined $${fine.toLocaleString('en-US')}.${f.major ? ' It is now a major finding — fix it within a day or a reactor is suspended.' : ''}` });
      } else if (f.suspended) {
        // One suspension per finding; after that, the regulator keeps fining until it is fixed.
        const fine = Math.round(Math.max(2000, site.stats.revenue * 30));
        s.money -= fine;
        s.ledger.other -= fine;
        news.push({ kind: 'bad', title: 'Regulator fine', text: FINDING_INFO[f.kind].title + ' at ' + loc.name + ' is still not fixed: fined $' + fine.toLocaleString('en-US') + '.' });
        f.deadline = s.gameTime + FINDING_DEADLINE;
      } else {
        const target = site.buildings.filter((b) => b.reactor && b.licence !== 'suspended' && b.status !== 'destroyed' && b.status !== 'constructing')
          .sort((a, b) => (BUILDINGS[b.type].reactor!.thermalMW - BUILDINGS[a.type].reactor!.thermalMW))[0];
        f.suspended = true;
        if (target) {
          target.licence = 'suspended';
          r.opinion = Math.max(0, r.opinion - 5);
          news.push({ kind: 'bad', title: 'Licence suspended', text: `The regulator suspended the ${BUILDINGS[target.type].short} at ${loc.name} over: ${FINDING_INFO[f.kind].title.toLowerCase()}. It stays shut down until this is fixed.` });
        }
        f.deadline = s.gameTime + FINDING_DEADLINE;
      }
    }

    // Suspended reactors get their licence back once nothing major is open.
    if (!r.findings.some((f) => f.siteId === id && f.major) && reg.holdUntil <= s.gameTime) {
      for (const b of site.buildings) if (b.licence === 'suspended') {
        b.licence = 'operating';
        release(b);
        news.push({ kind: 'good', title: 'Licence reinstated', text: `${BUILDINGS[b.type].short} at ${loc.name} may restart.` });
      }
    }

    // A regulatory hold after an incident ends after a game day.
    if (reg.holdUntil > 0 && reg.holdUntil <= s.gameTime) {
      reg.holdUntil = 0;
      for (const b of site.buildings) if (b.licence !== 'suspended' && b.licence !== 'pending') release(b);
    }

    // Pre-start inspections for new reactors.
    for (const b of site.buildings) {
      if (b.licence !== 'pending' || b.status !== 'active') continue;
      if (licenceChecklist(s, site, b).every((c) => c.ok)) {
        b.licence = 'operating';
        release(b);
        news.push({ kind: 'good', title: 'Operating licence granted', text: `${BUILDINGS[b.type].short} at ${loc.name} passed its pre-start inspection and may start up.` });
      }
    }

    // Scheduled inspection
    if (s.gameTime >= reg.nextInspection) {
      reg.nextInspection = s.gameTime + INSPECTION_INTERVAL;
      if (!site.buildings.some((b) => b.reactor)) continue;
      const found: FindingKind[] = [];
      for (const k of KINDS) if (findingOpen(s, site, k) && !r.findings.some((f) => f.siteId === id && f.kind === k)) found.push(k);
      for (const k of found) r.findings.push({ id: s.nextBuildingId++, siteId: id, kind: k, major: false, deadline: s.gameTime + FINDING_DEADLINE });
      if (!found.length && !open.length) {
        const bonus = Math.round(Math.max(1000, site.stats.revenue * 40) * (reg.rating >= 75 ? 1 : 0.4));
        s.money += bonus;
        s.ledger.other += bonus;
        r.opinion = Math.min(100, r.opinion + 1.5);
        news.push({ kind: 'good', title: 'Inspection passed', text: `${loc.name}: no findings. Regulator rating ${Math.round(reg.rating)}. Bonus $${bonus.toLocaleString('en-US')}.` });
      } else if (found.length) {
        news.push({ kind: 'warn', title: 'Inspection findings', text: `${loc.name}: ${found.map((k) => FINDING_INFO[k].title.toLowerCase()).join('; ')}. Fix within a game day.` });
      }
    }
  }
  if (offline) return news.filter((n) => n.kind === 'bad');
  return news;
}

const HOLD_CAUSES = ['Awaiting operating licence', 'Licence suspended by the regulator', 'Regulatory hold after an incident at this site'];

/** A reactor held shut by the regulator (not tripped) starts up again once released. */
function release(b: Building): void {
  const r = b.reactor;
  if (r && r.scrammed && r.tripCause && HOLD_CAUSES.includes(r.tripCause) && b.status === 'active') restart(b);
}

/** Why a reactor may not run right now (licence), or null. */
export function licenceBlock(s: GameState, site: Site, b: Building): string | null {
  if (REGULATOR_OFF.on) return null;
  if (!b.reactor) return null;
  if (site.reg && site.reg.holdUntil > s.gameTime) return 'Regulatory hold after an incident at this site';
  if (b.licence === 'pending') return 'Awaiting operating licence';
  if (b.licence === 'suspended') return 'Licence suspended by the regulator';
  return null;
}
