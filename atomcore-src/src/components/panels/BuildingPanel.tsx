import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { BUILDINGS, upgradeCost, upkeepAt, staffAt } from '../../game/buildings/defs';
import { getMods } from '../../game/simulation/modifiers';
import { repairCost, safetyRating } from '../../game/simulation/plant';
import { canRestart, tripTemp, warnTemp, reactorMaxThermal } from '../../game/simulation/reactor';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { fmtMoney, fmtPower, fmtPct, fmtTime } from '../../ui/format';
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
  const busy = b.status === 'constructing' || b.status === 'upgrading';
  const upCost = upgradeCost(def, b.level, mods.buildCost);
  const maxed = b.level >= def.maxLevel;
  const rCost = repairCost(b);
  const statusLabel = { constructing: 'Under construction', upgrading: `Upgrading to L${b.level + 1}`, active: b.enabled ? 'Operational' : 'Switched off', broken: 'Broken down' }[b.status];
  const statusTone = b.status === 'broken' ? 'bad' : busy ? 'warn' : b.enabled ? 'good' : 'dim';
  const remaining = busy ? ((1 - b.progress) * b.buildTotal) / mods.buildSpeed : 0;
  const [cx, cz] = buildingCenter(b, site.size);

  return (
    <div className="panel-stack">
      <div className="bp-head">
        <div>
          <div className="bp-level">Level {b.level} / {def.maxLevel}</div>
          <div className={`status-chip ${statusTone}`}>{statusLabel}</div>
        </div>
        <Button small icon="eye" variant="ghost" onClick={() => useUI.getState().cameraCmd({ kind: 'focus', x: cx, z: cz, distance: 22 + def.size[0] * 5 })}>Inspect</Button>
      </div>
      <p className="muted">{def.description}</p>

      {busy && (
        <div className="progress-card">
          <div className="row-between"><span>{b.status === 'constructing' ? 'Construction' : 'Upgrade'} progress</span><span className="mono">{fmtTime(remaining)}</span></div>
          <Bar value={b.progress} height={8} />
        </div>
      )}

      {b.reactor && b.status !== 'constructing' && <ReactorControl b={b} />}

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
  const [showNeutrons, setShowNeutrons] = useState(true);
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
  return (
    <div className={`reactor-card${r.scrammed ? ' scrammed' : tempFrac > 0.9 ? ' hot' : ''}`}>
      <div className="row-between">
        <h4><Icon name="atom" size={16} /> Reactor control</h4>
        <span className={`status-chip ${r.scrammed ? 'bad' : r.noFuel ? 'bad' : r.setback ? 'warn' : r.power > 0.02 ? 'good' : 'dim'}`}>
          {r.scrammed ? 'SCRAM' : r.noFuel ? 'NO FUEL' : r.setback ? 'AUTO SETBACK' : r.power > 0.02 ? 'AT POWER' : 'SHUT DOWN'}
        </span>
      </div>
      {r.scrammed && <div className="alert-box">Shut down: {r.scramReason}. Decay heat is still being removed by the cooling system.</div>}

      <Slider label="Power setpoint (control rods)" value={r.setpoint}
        onChange={(v) => run((s) => A.setSetpoint(s, b.id, v), { sound: null })}
        format={(v) => `${Math.round(v * 100)}%`} />
      {g.automation.loadFollow && <div className="muted small">Load following is active and will adjust this setpoint automatically.</div>}

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

      <div className="charts">
        <div><div className="chart-label">Power %</div><Sparkline values={hist.current.p} min={0} color="#4fd1ff" height={38} /></div>
        <div><div className="chart-label">Temp °C</div><Sparkline values={hist.current.t} color="#ff9f6b" height={38} /></div>
      </div>

      <div className="action-grid">
        {!r.scrammed ? (
          <Button icon="scram" variant="danger" onClick={() => run((s) => A.manualScram(s, b.id), { sound: 'alarm' })}>SCRAM</Button>
        ) : (
          <Button icon="play" variant="good" disabled={!restartOk} onClick={() => run((s) => A.restartReactor(s, b.id), { sound: 'complete' })}>
            {restartOk ? 'Restart reactor' : `Cooling down… ${Math.max(0, Math.ceil(12 - (g.gameTime - r.scramTime)))}s`}
          </Button>
        )}
        <Button icon="eye" variant="ghost" onClick={() => setShowNeutrons((v) => !v)}>{showNeutrons ? 'Hide' : 'Show'} core view</Button>
      </div>
      {showNeutrons && <NeutronView buildingId={b.id} />}
      <p className="edu-note">Simplified educational model: power follows the setpoint, decay heat lingers after shutdown, and insufficient cooling raises temperature until the protection system trips the reactor. Not real operating procedures.</p>
    </div>
  );
}
