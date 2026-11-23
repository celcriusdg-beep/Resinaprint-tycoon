import { useRef, useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { BUILDINGS } from '../../game/buildings/defs';
import { getMods } from '../../game/simulation/modifiers';
import {
  canRestart, tripTemp, warnTemp, saturationTemp, reactorMaxThermal, coreSize, powerLimit, advisoryLimit, reactivityHeadroom,
} from '../../game/simulation/reactor';
import { physicsFor } from '../../game/simulation/physics';
import { refuelNeed, refuelDuration, poolCapacity } from '../../game/supply/fuelcycle';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { RESTART_DELAY } from '../../game/constants';
import { fmtPower, fmtPct, fmtTime, fmtNum } from '../../ui/format';
import { run, A } from '../../ui/actions';
import { Bar, Button, Stat, Sparkline, Slider, Toggle } from '../ui/common';
import { Icon } from '../ui/Icons';
import { NeutronView } from './NeutronView';
import type { Building } from '../../game/types';

const fmtPcm = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v) >= 1000 ? fmtNum(Math.abs(v)) : Math.round(Math.abs(v))}`;

function fmtPeriod(p: number): string {
  if (!Number.isFinite(p) || Math.abs(p) > 5000) return '∞ (steady)';
  if (p > 0 && p < 1) return `${p.toFixed(1)} s ⚠ PROMPT`;
  return `${p > 0 ? '+' : '−'}${Math.round(Math.abs(p))} s`;
}

/** Reactor control room: power/rod control, boron, reactivity balance, instruments, fuel and protection. */
export function ReactorControl({ b }: { b: Building }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const st = site.stats;
  const r = b.reactor!;
  const mods = getMods(g, site.id);
  const amb = LOCATION_BY_ID[site.id].ambient;
  const p = physicsFor(b.type);
  const spec = BUILDINGS[b.type].reactor!;
  const trip = tripTemp(b, mods, amb);
  const warn = warnTemp(b, mods, amb);
  const sat = saturationTemp(b, amb);
  const tempFrac = (r.temp - amb) / Math.max(1, trip - amb);
  const restartOk = canRestart(b, mods, g.gameTime, amb);
  const [showNeutrons, setShowNeutrons] = useState(false);
  const [mode, setMode] = useState<'batch' | 'full'>('batch');
  const hist = useRef<{ p: number[]; t: number[]; x: number[] }>({ p: [], t: [], x: [] });
  const lastT = useRef(0);
  if (g.gameTime - lastT.current >= 1) {
    lastT.current = g.gameTime;
    const h = hist.current;
    h.p.push(Math.min(150, r.power * 100));
    h.t.push(r.temp);
    h.x.push(r.xenon * 100);
    if (h.p.length > 90) { h.p.shift(); h.t.shift(); h.x.shift(); }
  }
  const refueling = b.status === 'refueling';
  const headroom = p.fission ? reactivityHeadroom(b) : 1;
  const xenonBlocked = p.fission && headroom < 0 && r.coreFuel > 0.05;
  const advisory = advisoryLimit(r.failedRods);
  const over = r.power > advisory + 0.02 && r.failedRods > 0;
  const { limit, reason } = powerLimit(b, st.treatedFactor);
  const need = refuelNeed(b, mode);
  const poolRoom = poolCapacity(site) - site.spent.pool;
  const stateLabel = refueling ? 'REFUELLING' : r.atws ? 'ATWS!' : r.scrammed ? 'TRIPPED' : r.power > 0.02 ? 'AT POWER' : r.power > 1e-4 ? 'LOW POWER' : 'SHUT DOWN';
  const tone = r.atws || over || r.inventory < 0.85 ? 'bad' : r.scrammed || refueling ? 'warn' : r.power > 0.02 ? 'good' : 'dim';

  // Reactivity breakdown rows
  const rows: [string, number, string][] = p.fission ? [
    ['Fuel excess', r.rho.fuel, 'Fresh fuel adds reactivity; it falls as the fuel burns up.'],
    ['Control rods', r.rho.rods, 'Absorber rods; fully inserted = shut down.'],
    ...(p.boron ? [['Boron', r.rho.boron, 'Soluble neutron absorber in the coolant.'] as [string, number, string]] : []),
    ['Xenon-135', r.rho.xenon, 'Fission-product poison; peaks hours after a power reduction.'],
    ['Doppler (fuel)', r.rho.doppler, 'Hotter fuel absorbs more neutrons: instant negative feedback.'],
    ['Moderator', r.rho.moderator, 'Hotter, less dense water moderates less.'],
    ...(p.voidCoeff ? [['Recirc. flow', r.rho.void, 'BWR: faster pumps collapse steam voids → more power.'] as [string, number, string]] : []),
  ] : [];
  const maxAbs = Math.max(1, ...rows.map((x) => Math.abs(x[1])));

  return (
    <div className={`reactor-card${r.scrammed || r.atws ? ' scrammed' : over || tempFrac > 0.9 ? ' hot' : ''}`}>
      <div className="row-between">
        <h4><Icon name="atom" size={16} /> Control room</h4>
        <span className={`status-chip ${tone}`}>{stateLabel}</span>
      </div>

      {/* Alarms */}
      {r.atws && (
        <div className="alert-box big-alert">
          <b>FAILURE TO SCRAM (ATWS).</b> The automatic trip ({r.tripCause}) did not insert the rods. Press <b>SCRAM</b> now.
        </div>
      )}
      {r.scrammed && !refueling && <div className="alert-box">Tripped: <b>{r.tripCause ?? r.scramReason}</b>. Decay heat ({fmtPower(r.decayHeat)}) must still be removed.</div>}
      {!st.pumpsPowered && <div className="alert-box"><b>STATION BLACKOUT:</b> no power for coolant pumps or emergency cooling. Only natural circulation ({fmtPct(p.passive + mods.passiveCooling, 1)} of rated heat) is removing decay heat. Build Emergency Generators!</div>}
      {!st.offsitePower && st.pumpsPowered && <div className="hint-box warn-hint"><Icon name="alert" size={15} /> Offsite power lost — emergency diesel generators are running the pumps ({fmtPower(st.backupMW)} available, {fmtPower(st.backupNeedMW)} needed).</div>}
      {r.inventory < 0.97 && p.fission && !p.drainable && (
        <div className={r.inventory < 0.6 ? 'alert-box big-alert' : 'alert-box'}>
          Coolant level {fmtPct(r.inventory)}{r.inventory < 0.6 ? ' — CORE UNCOVERED, fuel is overheating!' : ' — coolant is boiling off.'} Core damage {fmtPct(r.damage)}.
        </div>
      )}
      {xenonBlocked && !refueling && (
        <div className="hint-box warn-hint"><Icon name="info" size={15} /> Not enough reactivity to go critical ({fmtPcm(headroom)} pcm with rods out{p.boron ? ' and no boron' : ''}). {r.xenon > 0.3 ? 'Xenon is too high — wait for it to decay (xenon dead time).' : 'The fuel is exhausted — refuel.'}</div>
      )}
      {over && <div className="alert-box"><b>Leaking fuel:</b> {r.failedRods} failed rods. Stay below {fmtPct(advisory)} (fines are quadrupled above it) and replace them at the next outage.</div>}
      {reason && !refueling && <div className="hint-box warn-hint"><Icon name="alert" size={15} /> {reason} (max {fmtPct(limit)})</div>}

      {/* Power / rod control */}
      {p.fission && (
        <Toggle label="Automatic rod control" on={r.autoRods} sub={r.autoRods ? 'Rods move to hold the power target.' : 'You move the rods yourself — watch the period!'}
          onChange={(v) => run((s) => A.setRodMode(s, b.id, v))} />
      )}
      {(r.autoRods || !p.fission) ? (
        <Slider label="Power target" value={r.setpoint} onChange={(v) => run((s) => A.setSetpoint(s, b.id, v), { sound: null })} format={(v) => `${Math.round(v * 100)}%`} />
      ) : (
        <Slider label={`Rod bank position (target ${Math.round(r.rodTarget * 100)}% out)`} value={r.rodTarget}
          onChange={(v) => run((s) => A.setRodTarget(s, b.id, v), { sound: null })} format={() => `${Math.round(r.rods * 100)}% withdrawn`} />
      )}
      {p.fission && r.autoRods && <div className="rod-bar"><span>Rods</span><Bar value={r.rods} max={1} height={6} /><span className="mono">{Math.round(r.rods * 100)}% out</span></div>}

      {p.boron && (
        <div className="boron-box">
          <div className="row-between">
            <span><b>Boron</b> <span className="mono">{Math.round(r.boron)} ppm</span></span>
            <div className="row gap">
              <Button small onClick={() => run((s) => A.adjustBoron(s, b.id, 25), { sound: null })}>Borate +25</Button>
              <Button small onClick={() => run((s) => A.adjustBoron(s, b.id, -25), { sound: null })}>Dilute −25</Button>
            </div>
          </div>
          <Toggle label="Automatic boron (chemical shim)" on={r.autoBoron} onChange={(v) => run((s) => A.setAutoBoron(s, b.id, v))}
            sub="Dilutes as fuel burns, borates after shutdown to keep a safety margin." />
        </div>
      )}

      <Slider label={p.voidCoeff ? 'Recirculation pumps (BWR power trim)' : 'Coolant pumps'} value={r.pumpSpeed} min={0.6} max={1.25} step={0.01}
        onChange={(v) => run((s) => A.setPumpSpeed(s, b.id, v), { sound: null })}
        format={(v) => `${Math.round(v * 100)}% · ${fmtPower(r.houseLoad)} used`} />

      {/* Instruments */}
      <div className="stat-grid four">
        <Stat label="Neutron power" value={fmtPct(Math.min(9.99, r.power), r.power < 0.1 ? 2 : 0)} sub={fmtPower(r.fission)} tone={r.power > 1.05 ? 'bad' : undefined} />
        <Stat label="Reactor period" value={p.fission ? fmtPeriod(r.period) : '—'} tone={r.period > 0 && r.period < 20 ? 'bad' : undefined} sub={p.fission ? `k-eff ${(1 / (1 - r.rho.total / 1e5)).toFixed(5)}` : undefined} />
        <Stat label="Decay heat" value={fmtPower(r.decayHeat)} sub="after-heat" />
        <Stat label="Steam heat" value={fmtPower(r.thermal)} sub={`rated ${fmtPower(reactorMaxThermal(b, mods))}`} />
      </div>

      <div className="temp-gauge">
        <div className="row-between small">
          <span><Icon name="thermo" size={13} /> Coolant {Math.round(r.temp)}°C</span>
          <span className="muted">warn {Math.round(warn)}° · trip {Math.round(trip)}° · boil {Math.round(sat)}°</span>
        </div>
        <div className="temp-track">
          <div className="temp-fill" style={{ width: `${Math.min(100, tempFrac * 100)}%` }} />
          <div className="temp-mark warn" style={{ left: `${((warn - amb) / (trip - amb)) * 100}%` }} />
          <div className="temp-mark trip" style={{ left: '100%' }} />
        </div>
        {p.fission && (
          <div className="row-between small" style={{ marginTop: 6 }}>
            <span>Fuel centreline <b className={r.fuelTemp > 1800 ? 'bad' : r.fuelTemp > 1200 ? 'warn' : ''}>{Math.round(r.fuelTemp)}°C</b></span>
            <span className="muted">cladding damage &gt;1200° · melting ≈2800°</span>
          </div>
        )}
        {p.fission && !p.drainable && (
          <div className="rod-bar"><span>Water level</span><Bar value={r.inventory} max={1} height={6} color={r.inventory < 0.85 ? '#ff5a5a' : '#3d9be0'} /><span className="mono">{fmtPct(r.inventory)}</span></div>
        )}
      </div>

      {/* Reactivity balance */}
      {p.fission && (
        <details className="rho-box" open>
          <summary><b>Reactivity balance</b> <span className={`mono ${r.rho.total > 0.5 * p.beta ? 'bad' : ''}`}>{fmtPcm(r.rho.total)} pcm</span> <span className="muted small">(prompt critical at +{p.beta})</span></summary>
          {rows.map(([label, v, hint]) => (
            <div key={label} className="rho-row" title={hint}>
              <span className="rho-label">{label}</span>
              <div className="rho-track"><div className={`rho-fill ${v >= 0 ? 'pos' : 'neg'}`} style={{ width: `${(Math.abs(v) / maxAbs) * 50}%`, [v >= 0 ? 'left' : 'right']: '50%' } as React.CSSProperties} /></div>
              <span className="mono rho-val">{fmtPcm(v)}</span>
            </div>
          ))}
          <div className="muted small">pcm = 0.001% change in neutron multiplication. Net zero = critical (steady power).</div>
        </details>
      )}

      <div className="charts three">
        <div><div className="chart-label">Power %</div><Sparkline values={hist.current.p} min={0} color="#4fd1ff" height={38} /></div>
        <div><div className="chart-label">Coolant °C</div><Sparkline values={hist.current.t} color="#ff9f6b" height={38} /></div>
        {p.fission && <div><div className="chart-label">Xenon % eq.</div><Sparkline values={hist.current.x} min={0} color="#b18cff" height={38} /></div>}
      </div>

      {/* Fuel */}
      <div className="fuel-box">
        <div className="row-between small">
          <span><Icon name="fuel" size={13} /> Core fuel {spec.onlineRefuel ? '(online refuelling)' : ''}</span>
          <span className={`mono ${r.coreFuel < 0.15 ? 'bad' : r.coreFuel < 0.3 ? 'warn' : ''}`}>{fmtPct(r.coreFuel)} · {fmtNum(coreSize(b))} assemblies · {r.coreEnr.toFixed(1)}% U-235</span>
        </div>
        <Bar value={r.coreFuel} max={1} warn={r.coreFuel < 0.25} height={8} />
        <div className="integrity">
          <span className={r.failedRods ? 'bad' : 'good'}><Icon name={r.failedRods ? 'alert' : 'check'} size={13} /> {r.failedRods ? `${r.failedRods} leaking rod${r.failedRods > 1 ? 's' : ''}` : 'Fuel cladding intact'}</span>
          <span className="muted">{r.coreDefects > 0 ? `~${r.coreDefects} defective assemblies loaded` : 'no known defects'}</span>
        </div>
        {!spec.onlineRefuel && !refueling && (
          <>
            <div className="row gap">
              <button className={`tab${mode === 'batch' ? ' active' : ''}`} onClick={() => setMode('batch')}>Batch reload (⅓ core)</button>
              <button className={`tab${mode === 'full' ? ' active' : ''}`} onClick={() => setMode('full')}>Full core</button>
            </div>
            <Button wide icon="fuel" variant={r.coreFuel < 0.15 || r.failedRods ? 'primary' : 'default'}
              disabled={r.power > 0.05 || g.fuel < 1 || (r.coreFuel > 0.98 && !r.failedRods) || poolRoom < 1}
              onClick={() => run((s) => A.refuelReactor(s, b.id, mode), { sound: 'place', structural: true })}>
              {r.power > 0.05 ? 'Shut down to refuel' : poolRoom < 1 ? 'Spent fuel pool full' : `Refuel · ${Math.min(need, Math.floor(g.fuel))}/${need} assemblies · ${fmtTime(refuelDuration(g, b))}`}
            </Button>
            <div className="muted small">Spent fuel pool {fmtNum(site.spent.pool)} / {fmtNum(poolCapacity(site))} · dry casks {fmtNum(site.spent.casks)} / {fmtNum(st.caskCap)}</div>
          </>
        )}
        {g.automation.autoRefuel && <div className="muted small">Outage planning is on: the plant shuts down and refuels automatically.</div>}
      </div>

      <div className="action-grid">
        {!r.scrammed ? (
          <Button icon="scram" variant="danger" disabled={refueling} onClick={() => run((s) => A.manualScram(s, b.id), { sound: 'alarm' })}>SCRAM</Button>
        ) : (
          <Button icon="play" variant="good" disabled={!restartOk} onClick={() => run((s) => A.restartReactor(s, b.id), { sound: 'complete' })}>
            {restartOk ? 'Reset trip & restart' : `Stabilising… ${Math.max(0, Math.ceil(RESTART_DELAY - (g.gameTime - r.scramTime)))}s`}
          </Button>
        )}
        <Button icon="eye" variant="ghost" onClick={() => setShowNeutrons((v) => !v)}>{showNeutrons ? 'Hide' : 'Show'} core view</Button>
      </div>
      {showNeutrons && <NeutronView buildingId={b.id} />}
      <p className="edu-note">Simplified educational physics (point kinetics, xenon, Doppler and moderator feedback, decay heat), tuned for play. Not real operating procedures.</p>
    </div>
  );
}
