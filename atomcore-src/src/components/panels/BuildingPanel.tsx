import { useEffect } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { BUILDINGS, upgradeCost, upkeepAt, staffAt } from '../../game/buildings/defs';
import { getMods } from '../../game/simulation/modifiers';
import { repairCost, safetyRating } from '../../game/simulation/plant';
import { decommissionCost, mineOutput, reserveFor } from '../../game/supply/fuelcycle';
import { canAffordEssential } from '../../game/engine';
import { slotsFor } from '../../game/supply/vehicles';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { fmtMoney, fmtPower, fmtTime, fmtNum } from '../../ui/format';
import { run, confirm, A, beginMove } from '../../ui/actions';
import { Bar, Button, Stat } from '../ui/common';
import { Icon } from '../ui/Icons';
import { ReactorControl } from './ReactorControl';
import { keyStat } from './BuildPanel';
import { buildingCenter } from '../world/sceneRegistry';
import type { Building } from '../../game/types';

export function BuildingPanel({ id }: { id: number }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const b = site.buildings.find((x) => x.id === id);
  useEffect(() => {
    if (!b) useUI.getState().select(null);
  }, [b]);
  if (!b) return null;
  const def = BUILDINGS[b.type];
  const mods = getMods(g, site.id);
  const busy = b.status === 'constructing' || b.status === 'upgrading' || b.status === 'refueling';
  const upCost = upgradeCost(def, b.level, mods.buildCost);
  const maxed = b.level >= def.maxLevel;
  const rCost = repairCost(b);
  const statusLabel: Record<Building['status'], string> = {
    constructing: 'Under construction', upgrading: `Upgrading to L${b.level + 1}`, active: b.enabled ? 'Operational' : 'Switched off',
    broken: 'Broken down', refueling: 'Refuelling outage', destroyed: 'Destroyed',
  };
  const statusTone = b.status === 'broken' || b.status === 'destroyed' ? 'bad' : busy ? 'warn' : b.enabled ? 'good' : 'dim';
  const speed = b.status === 'refueling' ? 1 : mods.buildSpeed;
  const remaining = busy ? ((1 - b.progress) * b.buildTotal) / speed : 0;
  const [cx, cz] = buildingCenter(b, site.size);

  if (b.status === 'destroyed') {
    const cost = decommissionCost(b);
    return (
      <div className="panel-stack">
        <div className="alert-box big-alert">
          <b>Core damage incident.</b> This reactor was destroyed after running above its safe limit with failed fuel rods.
          The ruin must be decommissioned before the land can be reused.
        </div>
        <Button variant="danger" icon="trash" wide disabled={g.money < cost}
          onClick={() => run((s) => A.decommission(s, b.id), { structural: true, sound: 'place' }) && useUI.getState().select(null)}>
          Decommission ruins · {fmtMoney(cost)}
        </Button>
        <p className="edu-note">Lesson: failed fuel cladding should be replaced in a refuelling outage, and power kept below the recommended limit until then.</p>
      </div>
    );
  }

  return (
    <div className="panel-stack">
      <div className="bp-head">
        <div>
          <div className="bp-level">Level {b.level} / {def.maxLevel}</div>
          <div className={`status-chip ${statusTone}`}>{statusLabel[b.status]}</div>
        </div>
        <Button small icon="eye" variant="ghost" onClick={() => useUI.getState().cameraCmd({ kind: 'focus', x: cx, z: cz, distance: 22 + def.size[0] * 5 })}>Inspect</Button>
      </div>
      <p className="muted">{def.description}</p>

      {busy && (
        <div className="progress-card">
          <div className="row-between">
            <span>{b.status === 'constructing' ? 'Construction' : b.status === 'refueling' ? `Refuelling: loading ${b.reactor?.loading ?? 0} assemblies` : 'Upgrade'} progress</span>
            <span className="mono">{fmtTime(remaining)}</span>
          </div>
          <Bar value={b.progress} height={8} />
        </div>
      )}

      {b.reactor && b.status !== 'constructing' && <ReactorControl b={b} />}
      {b.type === 'uranium_mine' && b.status !== 'constructing' && <MineSummary b={b} />}
      {b.type === 'generator_emergency' && <div className="hint-box"><Icon name="info" size={15} /> Site backup power {fmtPower(site.stats.backupMW)} · needed in a blackout {fmtPower(site.stats.backupNeedMW)}. {site.stats.backupMW < site.stats.backupNeedMW ? 'Not enough — build or upgrade more generators.' : 'Enough to keep cooling running.'}</div>}
      {b.type === 'dry_cask' && <div className="hint-box"><Icon name="info" size={15} /> Spent fuel: {fmtNum(site.spent.pool)} in pools, {fmtNum(site.spent.casks)} / {fmtNum(site.stats.caskCap)} in casks. Moving fuel into casks costs $60 per assembly.</div>}

      <div className="stat-grid">
        <Stat label="Output" value={keyStat(def, b.level, mods)} />
        <Stat label="Condition" value={`${Math.round(b.condition)}%`} tone={b.condition < 30 ? 'bad' : b.condition < 60 ? 'warn' : 'good'} sub={<Bar value={b.condition} max={100} warn={b.condition < 40} />} />
        <Stat label="Upkeep" value={`${fmtMoney(upkeepAt(def, b.level) * mods.upkeep)}/s`} />
        <Stat label="Staff" value={staffAt(def, b.level)} />
      </div>

      <div className="action-grid">
        {!maxed && (
          <Button icon="up" variant="primary" disabled={busy || b.status === 'broken' || g.money < upCost}
            onClick={() => run((s) => A.upgradeBuilding(s, b.id), { structural: true, sound: 'place' })}>
            Upgrade {fmtMoney(upCost)}
          </Button>
        )}
        {maxed && <div className="maxed">Maximum level</div>}
        <Button icon="wrench" disabled={busy || (b.condition >= 99.5 && b.status !== 'broken') || !canAffordEssential(g, rCost)}
          variant={b.status === 'broken' ? 'danger' : 'default'}
          onClick={() => run((s) => A.repairBuilding(s, b.id), { sound: 'cash', structural: true })}>
          Repair {b.condition < 99.5 || b.status === 'broken' ? fmtMoney(rCost) : ''}
        </Button>
        {!b.reactor && (
          <Button icon="power" disabled={busy} onClick={() => run((s) => A.toggleBuilding(s, b.id))}>{b.enabled ? 'Switch off' : 'Switch on'}</Button>
        )}
        <Button icon="grid" variant="ghost" disabled={!!A.moveLockReason(g, b.id) && b.status !== 'constructing'} onClick={() => beginMove(b.id)}
          title={A.moveLockReason(g, b.id) ?? 'Move this building (free)'}>
          Move
        </Button>
        <Button icon="trash" variant="ghost" onClick={() =>
          confirm(`Demolish ${def.short}?`, `You will receive ${fmtMoney(A.demolishRefund(g, b.id))} back. This cannot be undone.`, 'Demolish', () => {
            if (run((s) => A.demolishBuilding(s, b.id), { structural: true, sound: 'place' })) useUI.getState().select(null);
          }, true)}>
          Demolish
        </Button>
      </div>
      {!maxed && !busy && (
        <div className="muted small">Next level: {keyStat(def, b.level + 1, mods)} · {fmtTime(def.buildTime * (0.35 + 0.15 * b.level) / mods.buildSpeed)} downtime</div>
      )}
      <div className="muted small">Safety rating at this site: {Math.round(safetyRating(g, site.id, mods))}/100</div>
    </div>
  );
}

function MineSummary({ b }: { b: Building }) {
  const g = useGame();
  const mods = getMods(g, g.activeSite);
  const out = mineOutput(b, g.activeSite, mods);
  const v = b.vehicles!;
  const exc = v.excavators.reduce((a, n) => a + n, 0);
  const tr = v.trucks.reduce((a, n) => a + n, 0);
  const loc = LOCATION_BY_ID[g.activeSite];
  return (
    <div className="flow-card">
      <div className="row-between"><b>Mining fleet</b><span className="status-chip">{loc.oreLabel} ore ×{loc.oreGrade}</span></div>
      <div className="stat-grid">
        <Stat label="Excavators" value={`${exc} / ${slotsFor('excavator', b.level)}`} sub={`dig ${fmtNum(out.dig * 60)} t/min`} />
        <Stat label="Haul trucks" value={`${tr} / ${slotsFor('truck', b.level)}`} sub={`haul ${fmtNum(out.haul * 60)} t/min`} tone={out.haul < out.dig * 0.95 ? 'warn' : undefined} />
      </div>
      <div className="rod-bar"><span>Ore left</span><Bar value={b.reserve ?? 0} max={reserveFor(b.level)} height={6} warn={(b.reserve ?? 0) < reserveFor(b.level) * 0.15} /><span className="mono">{fmtNum(b.reserve ?? 0)} t</span></div>
      {(b.reserve ?? 1) <= 0 && <div className="alert-box">The pit is exhausted. Upgrade the mine to dig deeper.</div>}
      <div className="muted small">Ore delivered: <b>{fmtNum(out.ore * 60)} t/min</b>{out.haul < out.dig * 0.95 ? ' — trucks are the bottleneck' : out.dig < out.haul * 0.95 ? ' — diggers are the bottleneck' : ''}</div>
      <Button variant="primary" icon="hammer" wide onClick={() => { useUI.getState().select(null); useUI.getState().setPanel('supply'); }}>Buy & manage vehicles</Button>
    </div>
  );
}
