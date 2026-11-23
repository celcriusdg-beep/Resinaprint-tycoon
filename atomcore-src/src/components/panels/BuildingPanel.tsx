import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { BUILDINGS, upgradeCost, upkeepAt, staffAt } from '../../game/buildings/defs';
import { getMods } from '../../game/simulation/modifiers';
import { repairCost, safetyRating } from '../../game/simulation/plant';
import { canRestart, tripTemp, warnTemp, reactorMaxThermal, coreSize, powerLimit, advisoryLimit } from '../../game/simulation/reactor';
import { refuelNeed, refuelDuration, decommissionCost, mineOutput } from '../../game/supply/fuelcycle';
import { slotsFor } from '../../game/supply/vehicles';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { fmtMoney, fmtPower, fmtPct, fmtTime, fmtNum } from '../../ui/format';
import { run, confirm, A } from '../../ui/actions';
import { Bar, Button, Stat, Sparkline, Slider } from '../ui/common';
import { Icon } from '../ui/Icons';
import { NeutronView } from './NeutronView';
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
        <Button icon="wrench" disabled={busy || (b.condition >= 99.5 && b.status !== 'broken') || g.money < rCost}
          variant={b.status === 'broken' ? 'danger' : 'default'}
          onClick={() => run((s) => A.repairBuilding(s, b.id), { sound: 'cash', structural: true })}>
          Repair {b.condition < 99.5 || b.status === 'broken' ? fmtMoney(rCost) : ''}
        </Button>
        {!b.reactor && (
          <Button icon="power" disabled={busy} onClick={() => run((s) => A.toggleBuilding(s, b.id))}>{b.enabled ? 'Switch off' : 'Switch on'}</Button>
        )}
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
      <div className="muted small">Ore delivered: <b>{fmtNum(out.ore * 60)} t/min</b>{out.haul < out.dig * 0.95 ? ' — trucks are the bottleneck' : out.dig < out.haul * 0.95 ? ' — diggers are the bottleneck' : ''}</div>
      <Button variant="primary" icon="hammer" wide onClick={() => { useUI.getState().select(null); useUI.getState().setPanel('supply'); }}>Buy & manage vehicles</Button>
    </div>
  );
}

function ReactorControl({ b }: { b: Building }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const r = b.reactor!;
  const mods = getMods(g, site.id);
  const amb = LOCATION_BY_ID[site.id].ambient;
  const trip = tripTemp(b, mods, amb);
  const warn = warnTemp(b, mods, amb);
  const spec = BUILDINGS[b.type].reactor!;
  const maxTh = reactorMaxThermal(b, mods);
  const tempFrac = (r.temp - amb) / Math.max(1, trip - amb);
  const restartOk = canRestart(b, mods, g.gameTime, amb);
  const [showNeutrons, setShowNeutrons] = useState(false);
  const hist = useRef<{ p: number[]; t: number[] }>({ p: [], t: [] });
  const lastT = useRef(0);
  if (g.gameTime - lastT.current >= 1) {
    lastT.current = g.gameTime;
    hist.current.p.push(r.power * 100);
    hist.current.t.push(r.temp);
    if (hist.current.p.length > 60) {
      hist.current.p.shift();
      hist.current.t.shift();
    }
  }
  const electricShare = r.thermal * (spec.efficiency + mods.thermalEff);
  const { limit, reason } = powerLimit(b, site.stats.treatedFactor);
  const advisory = advisoryLimit(r.failedRods);
  const over = r.power > advisory + 0.02 && r.failedRods > 0;
  const need = refuelNeed(b);
  const refueling = b.status === 'refueling';
  const stateLabel = refueling ? 'REFUELLING' : r.scrammed ? 'SCRAM' : r.noFuel ? 'NO FUEL' : r.setback ? 'AUTO SETBACK' : r.power > 0.02 ? 'AT POWER' : 'SHUT DOWN';
  return (
    <div className={`reactor-card${r.scrammed ? ' scrammed' : over || tempFrac > 0.9 ? ' hot' : ''}`}>
      <div className="row-between">
        <h4><Icon name="atom" size={16} /> Reactor control</h4>
        <span className={`status-chip ${r.scrammed || r.noFuel || over ? 'bad' : refueling || r.setback ? 'warn' : r.power > 0.02 ? 'good' : 'dim'}`}>{stateLabel}</span>
      </div>
      {r.scrammed && !refueling && <div className="alert-box">Shut down: {r.scramReason}. Decay heat is still being removed by the cooling system.</div>}
      {over && (
        <div className="alert-box">
          <b>DANGER:</b> {r.failedRods} failed fuel rods. Recommended maximum is <b>{fmtPct(advisory)}</b> — running above it risks core damage and draws heavy regulator fines. Lower the setpoint and refuel.
        </div>
      )}
      {reason && !refueling && <div className="hint-box warn-hint"><Icon name="alert" size={15} /> {reason} (max {fmtPct(limit)})</div>}

      <Slider label="Power setpoint (control rods)" value={r.setpoint}
        onChange={(v) => run((s) => A.setSetpoint(s, b.id, v), { sound: null })}
        format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Coolant pumps" value={r.pumpSpeed} min={0.6} max={1.25} step={0.01}
        onChange={(v) => run((s) => A.setPumpSpeed(s, b.id, v), { sound: null })}
        format={(v) => `${Math.round(v * 100)}% · ${fmtPower(r.houseLoad)} used`} />
      <div className="muted small">Faster pumps cool the core better but use more electricity and wear the reactor faster.{g.automation.loadFollow ? ' Load following adjusts the setpoint automatically.' : ''}</div>

      <div className="stat-grid four">
        <Stat label="Fission power" value={fmtPct(r.power)} sub={fmtPower(r.fission)} />
        <Stat label="Decay heat" value={fmtPower(r.decayHeat)} sub="after-heat" />
        <Stat label="Steam heat" value={fmtPower(r.thermal)} sub={`max ${fmtPower(maxTh)}`} />
        <Stat label="Electric share" value={fmtPower(electricShare)} sub={`${Math.round((spec.efficiency + mods.thermalEff) * 100)}% cycle`} />
      </div>

      <div className="temp-gauge">
        <div className="row-between small">
          <span><Icon name="thermo" size={13} /> Coolant {Math.round(r.temp)}°C</span>
          <span className="muted">warn {Math.round(warn)}° · trip {Math.round(trip)}°</span>
        </div>
        <div className="temp-track">
          <div className="temp-fill" style={{ width: `${Math.min(100, tempFrac * 100)}%` }} />
          <div className="temp-mark warn" style={{ left: `${((warn - amb) / (trip - amb)) * 100}%` }} />
          <div className="temp-mark trip" style={{ left: '100%' }} />
        </div>
      </div>

      {/* Fuel & integrity */}
      <div className="fuel-box">
        <div className="row-between small">
          <span><Icon name="fuel" size={13} /> Core fuel {spec.onlineRefuel ? '(online refuelling)' : ''}</span>
          <span className={`mono ${r.coreFuel < 0.15 ? 'bad' : r.coreFuel < 0.3 ? 'warn' : ''}`}>{fmtPct(r.coreFuel)} of {fmtNum(coreSize(b))} assemblies</span>
        </div>
        <Bar value={r.coreFuel} max={1} warn={r.coreFuel < 0.25} height={8} />
        <div className="integrity">
          <span className={r.failedRods ? 'bad' : 'good'}><Icon name={r.failedRods ? 'alert' : 'check'} size={13} /> {r.failedRods ? `${r.failedRods} failed rod${r.failedRods > 1 ? 's' : ''}` : 'Fuel cladding intact'}</span>
          <span className="muted">{r.coreDefects > 0 ? `~${r.coreDefects} defective assemblies loaded` : 'no known defects'}</span>
        </div>
        {!spec.onlineRefuel && !refueling && (
          <Button wide icon="fuel" variant={r.coreFuel < 0.15 || r.failedRods ? 'primary' : 'default'}
            disabled={r.power > 0.05 || g.fuel < 1 || (r.coreFuel > 0.98 && !r.failedRods)}
            onClick={() => run((s) => A.refuelReactor(s, b.id), { sound: 'place', structural: true })}>
            {r.power > 0.05 ? 'Shut down to refuel' : `Refuel · ${Math.min(need, Math.floor(g.fuel))}/${need} assemblies · ${fmtTime(refuelDuration(g, b))}`}
          </Button>
        )}
        {g.automation.autoRefuel && <div className="muted small">Outage planning is on: the plant shuts down and refuels this reactor automatically.</div>}
      </div>

      <div className="charts">
        <div><div className="chart-label">Power %</div><Sparkline values={hist.current.p} min={0} color="#4fd1ff" height={38} /></div>
        <div><div className="chart-label">Temp °C</div><Sparkline values={hist.current.t} color="#ff9f6b" height={38} /></div>
      </div>

      <div className="action-grid">
        {!r.scrammed ? (
          <Button icon="scram" variant="danger" disabled={refueling} onClick={() => run((s) => A.manualScram(s, b.id), { sound: 'alarm' })}>SCRAM</Button>
        ) : (
          <Button icon="play" variant="good" disabled={!restartOk} onClick={() => run((s) => A.restartReactor(s, b.id), { sound: 'complete' })}>
            {restartOk ? 'Restart reactor' : `Cooling down… ${Math.max(0, Math.ceil(12 - (g.gameTime - r.scramTime)))}s`}
          </Button>
        )}
        <Button icon="eye" variant="ghost" onClick={() => setShowNeutrons((v) => !v)}>{showNeutrons ? 'Hide' : 'Show'} core view</Button>
      </div>
      {showNeutrons && <NeutronView buildingId={b.id} />}
      <p className="edu-note">Simplified educational model, not real operating procedures. Fuel burns down and must be replaced in outages; defective rods can fail; decay heat lingers after shutdown; overheating trips the reactor.</p>
    </div>
  );
}
