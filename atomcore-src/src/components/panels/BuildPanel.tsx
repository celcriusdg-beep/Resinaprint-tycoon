import { useState } from 'react';
import type { BuildingCategory, BuildingDef } from '../../game/types';
import { BUILDING_LIST, CATEGORY_LABEL, CATEGORY_ORDER, SECTIONS, TIER_NAMES, buildingScore, levelMult, staffAt } from '../../game/buildings/defs';
import { buildCost, buildLockReason } from '../../game/actions';
import { getMods } from '../../game/simulation/modifiers';
import { useGame } from '../../stores/gameStore';
import { fmtMoney, fmtPower, fmtTime, fmtNum } from '../../ui/format';
import { beginBuild, expandLand } from '../../ui/actions';
import { plotUsage, hasRoomFor } from '../../game/buildings/grid';
import { LOCATION_BY_ID, expandCost, nextSize } from '../../game/progression/locations';
import { Bar, Button } from '../ui/common';
import { Tabs } from '../ui/common';
import { Icon } from '../ui/Icons';
import { PlantBalance } from './PlantBalance';

export function keyStat(def: BuildingDef, level = 1, mods = { reactorOutput: 1, cooling: 1, steamCap: 1, grid: 1, storage: 1, research: 1, thermalEff: 0 }): string {
  const lm = levelMult(def, level);
  if (def.reactor) return `${fmtPower(def.reactor.thermalMW * lm * mods.reactorOutput)} heat · ${Math.round((def.reactor.efficiency + mods.thermalEff) * 100)}% eff. · core ${fmtNum(Math.round(def.reactor.coreSize * lm))} assemblies`;
  const s = def.stats;
  const eff = s.effBonus ? ` · +${Math.round(s.effBonus * 100)} pts efficiency` : '';
  if (s.steamMW && s.effBonus) return `${fmtPower(s.steamMW * lm * mods.steamCap)} steam capacity${eff}`;
  if (s.dryMW && s.coolingMW) return `${fmtPower((s.coolingMW + s.dryMW) * lm * mods.cooling)} heat rejection · ${fmtPower(s.dryMW * lm * mods.cooling)} of it water-free`;
  if (s.dryMW) return `${fmtPower(s.dryMW * lm * mods.cooling)} heat rejection · evaporates no water`;
  if (s.oreRate) return `Mines ${fmtNum(s.oreRate * lm * 60)} t ore/min · no vehicles needed`;
  if (s.ycRate) return `Makes ${fmtNum(s.ycRate * lm * 60)} yellowcake/min directly · uses ${fmtNum(s.loadMW! * lm)} MW`;
  if (s.caskCap) return `Holds ${fmtNum(s.caskCap * lm)} spent assemblies · loads ${fmtNum(60 * (s.caskRate ?? 1) * (1 + 0.6 * (level - 1)))}/min`;
  if (s.staffCap && s.contractSlots && s.contractSlots > 1) return `+${Math.round(s.staffCap * lm)} staff, +${s.contractSlots} contract slots`;
  if (s.backupMW) return `${fmtNum(s.backupMW * lm)} MW backup power · +${Math.round((s.safety ?? 0) * lm)} safety`;
  if (s.dataMW) return `Buys ${fmtPower(s.dataMW * lm)} at 1.8× price · behind the meter`;
  if (s.h2MW) return `Turns up to ${fmtPower(s.h2MW * lm)} of unsellable power into hydrogen`;
  if (s.isotopes) return `Up to ${fmtMoney(s.isotopes * lm)}/s with 1 GW of reactor heat on site`;
  if (s.tourism) return `${fmtMoney(s.tourism * lm)}/s base, more per reactor & tower`;
  if (s.loadMW) return `+${fmtNum(s.rawWater! * lm)} m³/h raw + ${fmtNum(s.treatedWater! * lm)} demin. water · uses ${fmtNum(s.loadMW * lm)} MW`;
  if (s.fuelQuota) return `+${Math.round(s.fuelQuota * lm * 100)}% daily market fuel · +${fmtNum(s.fuelCap! * lm)} storage`;
  if (s.coolingMW) return `${fmtPower(s.coolingMW * lm * mods.cooling)} heat rejection${def.dry ? ' · no water' : ` · ~${fmtNum(s.coolingMW * lm * 1.6)} m³/h water at full load`}`;
  if (s.steamMW) return `${fmtPower(s.steamMW * lm * mods.steamCap)} steam capacity`;
  if (s.gridMW) return `+${fmtPower(s.gridMW * lm * mods.grid)} grid export`;
  if (s.storageMWh) return `${fmtNum(s.storageMWh * lm * mods.storage)} MWh storage`;
  if (s.research) return `+${(s.research * lm * mods.research).toFixed(2)} RP/s`;
  if (s.staffCap) return `+${Math.round(s.staffCap * lm)} staff, +1 contract slot`;
  if (s.maintenance) return `Repair crew ×${(s.maintenance * lm).toFixed(1)}`;
  if (s.fuelCap) return `+${fmtNum(s.fuelCap * lm)} fuel assemblies storage`;
  if (s.safety) return `+${Math.round(s.safety * lm)} safety rating`;
  if (s.rawWater) return `+${fmtNum(s.rawWater * lm)} m³/h raw water`;
  if (s.treatedWater) return `${fmtNum(s.treatedWater * lm)} m³/h demineralised water`;
  if (s.waterStorage) return `${fmtNum(s.waterStorage * lm)} m³ water storage`;
  if (s.millRate) return `Mills ${fmtNum(s.millRate * lm * 60)} t ore/min`;
  if (s.enrichRate) return `Enriches ${fmtNum(s.enrichRate * lm * 60)} yellowcake/min`;
  if (s.fabRate) return `Makes ${fmtNum(s.fabRate * lm * 60)} assemblies/min`;
  if (s.inspectRate) return `Inspects ${fmtNum(s.inspectRate * lm * 60)} assemblies/min`;
  if (s.oreStock) return `Open pit · ${fmtNum(s.oreStock * lm)} t stockpile · vehicle slots`;
  return '';
}

function valueLine(def: BuildingDef): string | null {
  const c = buildingScore(def);
  if (!c || c[0] <= 0) return null;
  const tiles = def.size[0] * def.size[1];
  const perTile = c[0] / tiles;
  const fmt = (v: number) => (v >= 100 ? fmtNum(v) : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
  return `${fmt(perTile)} ${c[1]} per tile · ${fmt((c[0] / def.cost) * 1000)} per $1k`;
}

export function BuildPanel() {
  const g = useGame();
  const [cat, setCat] = useState<BuildingCategory>('reactor');
  const [tierOf, setTierOf] = useState<Partial<Record<BuildingCategory, number>>>({});
  const mods = getMods(g, g.activeSite);
  const inCat = BUILDING_LIST.filter((d) => d.category === cat);
  const tiers = [...new Set(inCat.map((d) => d.tier ?? 1))].sort((a, b) => a - b);
  const tier = tiers.includes(tierOf[cat] ?? -1) ? tierOf[cat]! : tiers[0];
  const next = tiers[tiers.indexOf(tier) + 1];
  const score = (d: BuildingDef) => buildingScore(d)?.[0] ?? 0;
  // Group by line (what the building does), weakest first inside each group.
  const groups = SECTIONS[cat]
    .map((line) => ({ line, items: inCat.filter((d) => d.tier === tier && d.section === line.id).sort((a, b) => score(a) - score(b)) }))
    .filter((x) => x.items.length > 0);
  const goTier = (t: number) => setTierOf((m) => ({ ...m, [cat]: t }));
  const countIn = (t: number) => inCat.filter((d) => d.tier === t).length;
  const unlockedIn = (t: number) => inCat.filter((d) => d.tier === t && !buildLockReason(g, d.type)).length;
  return (
    <div className="panel-stack">
      <LandBar />
      <PlantBalance compact />
      <Tabs tabs={CATEGORY_ORDER.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))} value={cat} onChange={setCat} />
      <div className="subtabs" role="tablist">
        {tiers.map((t) => (
          <button key={t} role="tab" aria-selected={t === tier} className={`subtab tier-tab t${t}${t === tier ? ' active' : ''}`} onClick={() => goTier(t)}>
            <span className={`tier-badge t${t}`}>T{t}</span>{TIER_NAMES[t]} <span className="muted">{unlockedIn(t)}/{countIn(t)}</span>
          </button>
        ))}
      </div>
      {groups.map(({ line, items }) => {
        const lo = buildingScore(items[0]);
        const hi = buildingScore(items[items.length - 1]);
        const fmtS = (v: number) => (v >= 100 ? fmtNum(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
        return (
        <div key={line.id} className="tier-group">
          {groups.length > 1 || (lo && lo[0] > 0) ? (
            <div className="tier-group-head">
              <b>{line.label}</b>
              {lo && lo[0] > 0 && <span className="muted small">{items.length > 1 ? `${fmtS(lo[0])} → ${fmtS(hi![0])}` : fmtS(lo[0])} {lo[1]}</span>}
            </div>
          ) : null}
      <div className="card-grid">
        {items.map((def) => {
          const lock = buildLockReason(g, def.type);
          const cost = buildCost(g, def.type);
          const afford = g.money >= cost;
          return (
            <button key={def.type} className={`build-card${lock ? ' locked' : ''}${!afford && !lock ? ' poor' : ''}`}
              onClick={() => beginBuild(def.type)}>
              <div className="build-card-head">
                <span className={`cat-dot ${def.category}`} />
                <span className="build-name">{def.name}</span>
                <span className={`tier-badge t${def.tier ?? 1}`}>T{def.tier ?? 1}</span>
              </div>
              <div className="build-stat">{keyStat(def, 1, mods)}</div>
              {valueLine(def) && <div className="build-value small">{valueLine(def)}</div>}
              <div className="build-desc">{def.description}</div>
              <div className="build-meta">
                <span><Icon name="users" size={13} /> {staffAt(def, 1)}</span>
                <span><Icon name="money" size={13} /> {fmtMoney(def.upkeep * mods.upkeep)}/s</span>
                <span><Icon name="hammer" size={13} /> {fmtTime(def.buildTime / mods.buildSpeed)}</span>
                <span>{def.size[0]}×{def.size[1]}</span>
              </div>
              <div className="build-foot">
                {lock ? (
                  <span className="lock"><Icon name="lock" size={13} /> {lock}</span>
                ) : (
                  <span className={`price${afford ? '' : ' bad'}`}>{fmtMoney(cost, 2)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
        </div>
        );
      })}
      <div className="section-end">
        <span className="muted small">✓ End of <b>T{tier} {TIER_NAMES[tier]}</b>{next ? ' — everything in the next tier is better' : ` — the best ${CATEGORY_LABEL[cat]} there is`}</span>
        {next ? (
          <Button small variant="primary" onClick={() => goTier(next)}>Next: T{next} {TIER_NAMES[next]} →</Button>
        ) : (
          <Button small variant="ghost" onClick={() => goTier(tiers[0])}>Back to T{tiers[0]}</Button>
        )}
      </div>
    </div>
  );
}

/** Plot size, how full it is, and the next land purchase. */
function LandBar() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const loc = LOCATION_BY_ID[site.id];
  const usage = plotUsage(site);
  const maxed = site.size >= loc.maxSize;
  const cost = expandCost(loc, site.size);
  const next = nextSize(loc, site.size);
  const tight = !hasRoomFor(site, 'reactor_pwr');
  return (
    <div className={`land-bar${tight ? ' tight' : ''}`}>
      <div className="grow">
        <div className="row-between small">
          <span><b>Land</b> · {site.size}×{site.size} of max {loc.maxSize}×{loc.maxSize}</span>
          <span className="mono">{Math.round(usage * 100)}% used</span>
        </div>
        <Bar value={usage} max={1} warn={usage > 0.7} height={6} />
        {tight && <div className="small warn">No room left for a 3×3 building — expand or move things.</div>}
      </div>
      {maxed ? <span className="muted small">Max size</span> : (
        <Button small variant={tight ? 'primary' : 'default'} disabled={g.money < cost} onClick={expandLand}>
          Expand to {next}×{next} · {fmtMoney(cost)}
        </Button>
      )}
    </div>
  );
}
