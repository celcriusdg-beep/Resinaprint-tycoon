import { useState } from 'react';
import type { BuildingCategory, BuildingDef } from '../../game/types';
import { BUILDING_LIST, CATEGORY_LABEL, CATEGORY_ORDER, levelMult, staffAt } from '../../game/buildings/defs';
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

export function BuildPanel() {
  const g = useGame();
  const [cat, setCat] = useState<BuildingCategory>('reactor');
  const mods = getMods(g, g.activeSite);
  const list = BUILDING_LIST.filter((d) => d.category === cat);
  return (
    <div className="panel-stack">
      <LandBar />
      <PlantBalance compact />
      <Tabs tabs={CATEGORY_ORDER.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))} value={cat} onChange={setCat} />
      <div className="card-grid">
        {list.map((def) => {
          const lock = buildLockReason(g, def.type);
          const cost = buildCost(g, def.type);
          const afford = g.money >= cost;
          return (
            <button key={def.type} className={`build-card${lock ? ' locked' : ''}${!afford && !lock ? ' poor' : ''}`}
              onClick={() => beginBuild(def.type)}>
              <div className="build-card-head">
                <span className={`cat-dot ${def.category}`} />
                <span className="build-name">{def.name}</span>
              </div>
              <div className="build-stat">{keyStat(def, 1, mods)}</div>
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
