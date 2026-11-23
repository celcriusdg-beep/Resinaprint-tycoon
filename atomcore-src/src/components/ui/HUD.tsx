import { useGame } from '../../stores/gameStore';
import { useUI, type PanelId } from '../../stores/uiStore';
import { fmtMoney, fmtPower, fmtPct, fmtNum } from '../../ui/format';
import { BUILDINGS } from '../../game/buildings/defs';
import { diagnose } from '../../game/diagnostics';
import { netIncome } from '../../game/engine';
import { xpForNext } from '../../game/progression/levels';
import { RESEARCH_BY_ID } from '../../game/research/tree';
import { EVENT_BY_ID } from '../../game/events/events';
import { fuelCapacity } from '../../game/simulation/plant';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { MILESTONES } from '../../game/progression/milestones';
import { Icon, type IconName } from './Icons';
import { audio } from '../../systems/audio/audio';

export function HUD() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const st = site.stats;
  const income = netIncome(g);
  let exportMW = 0, demand = 0, contractMW = 0;
  for (const id of g.unlockedSites) {
    exportMW += g.sites[id].stats.exportMW;
    demand += g.sites[id].stats.demandMW;
  }
  for (const c of g.contracts) contractMW += c.mw;
  const reactors = site.buildings.filter((b) => b.reactor && b.status !== 'constructing' && b.status !== 'destroyed');
  const scrammed = reactors.filter((b) => (b.reactor!.scrammed || b.reactor!.atws) && b.status !== 'refueling').length;
  const refuelNeeded = reactors.filter((b) => b.status === 'active' && !BUILDINGS[b.type].reactor!.onlineRefuel && (b.reactor!.coreFuel < 0.15 || b.reactor!.failedRods > 0)).length;
  const refueling = reactors.filter((b) => b.status === 'refueling').length;
  const waterOk = st.waterFactor >= 0.999 && st.treatedFactor >= 0.999;
  const allIssues = diagnose(g);
  const issueErrors = allIssues.filter((i) => i.severity === 'error').length;
  const issueWarns = allIssues.filter((i) => i.severity === 'warn').length;
  const hot = st.maxTempFrac > 0.9;
  const reactorTone = scrammed ? 'bad' : hot || refuelNeeded ? 'warn' : st.reactorsOnline > 0 ? 'good' : 'dim';
  const active = g.research.active ? RESEARCH_BY_ID[g.research.active] : null;
  const rpRate = g.unlockedSites.reduce((a, id) => a + g.sites[id].stats.researchRate, 0);
  const fuelCap = fuelCapacity(g);
  const fuelFrac = g.fuel / fuelCap;
  const xpNeed = xpForNext(g.level);
  const open = (p: PanelId) => { audio.sfx('open'); useUI.getState().togglePanel(p); };

  return (
    <header className="hud">
      <div className="hud-row">
        <button className="hud-chip money" onClick={() => open('manage')} aria-label="Finances">
          <div className="hud-money">{fmtMoney(g.money, 2)}</div>
          <div className={`hud-sub ${income >= 0 ? 'good' : 'bad'}`}>{income >= 0 ? '+' : ''}{fmtMoney(income)}/s</div>
        </button>
        <button className="hud-chip power" onClick={() => open('market')} aria-label="Power and market">
          <div className="hud-line">
            <Icon name="bolt" size={14} />
            <span className="mono">{fmtPower(exportMW)}</span>
            <span className="dim">/ {fmtPower(demand + contractMW)}</span>
          </div>
          <div className="power-bar">
            <div className="power-fill" style={{ width: `${Math.min(100, (exportMW / Math.max(1, demand + contractMW)) * 100)}%` }} />
            {contractMW > 0 && <div className="power-mark" style={{ left: `${Math.min(100, (contractMW / Math.max(1, demand + contractMW)) * 100)}%` }} />}
          </div>
          <div className="hud-sub dim">${Math.round(st.price)}/MWh · {LOCATION_BY_ID[site.id].name}</div>
        </button>
        <button className="hud-chip level" onClick={() => open('goals')} aria-label="Company level">
          <div className="level-badge">{g.level}</div>
          <div className="level-xp"><div style={{ width: `${Math.min(100, (g.xp / xpNeed) * 100)}%` }} /></div>
        </button>
      </div>
      <div className="hud-row hud-row2">
        {(issueErrors > 0 || issueWarns > 0) && (
          <button className={`hud-pill ${issueErrors ? 'bad' : 'warn'}`} onClick={() => open('status')} aria-label="Plant status">
            <Icon name="alert" size={14} /> {issueErrors ? `${issueErrors} problem${issueErrors > 1 ? 's' : ''}` : `${issueWarns} warning${issueWarns > 1 ? 's' : ''}`}
          </button>
        )}
        <button className={`hud-pill ${reactorTone}`} onClick={() => open('status')}>
          <Icon name="atom" size={14} />
          {scrammed ? `${scrammed} SCRAM` : refuelNeeded ? `${refuelNeeded} need fuel` : refueling ? `${refueling} refuelling` : `${st.reactorsOnline}/${st.reactorsTotal} online`}
        </button>
        <button className={`hud-pill ${st.coolingRatio < 1 ? 'bad' : st.coolingRatio < 1.1 ? 'warn' : ''}`} onClick={() => open('manage')}>
          <Icon name="thermo" size={14} />
          {fmtPct(Math.min(9.99, st.maxTempFrac))}
        </button>
        <button className={`hud-pill ${fuelFrac < 0.1 ? 'bad' : fuelFrac < 0.25 ? 'warn' : ''}`} onClick={() => open('supply')} aria-label="Fuel assemblies in stock">
          <Icon name="fuel" size={14} />
          {fmtNum(g.fuel)}
        </button>
        {!st.offsitePower && (
          <button className={`hud-pill ${st.pumpsPowered ? 'warn' : 'bad'}`} onClick={() => open('manage')}>
            <Icon name="alert" size={14} /> {st.pumpsPowered ? 'On diesel' : 'BLACKOUT'}
          </button>
        )}
        <button className={`hud-pill ${waterOk ? '' : 'bad'}`} onClick={() => open('supply')} aria-label="Water balance">
          <Icon name="drop" size={14} />
          {waterOk ? fmtNum(st.evaporation) + ' m³' : `${fmtPct(Math.min(st.waterFactor, st.treatedFactor))}`}
        </button>
        <button className="hud-pill research" onClick={() => open('research')}>
          <Icon name="flask" size={14} />
          {active ? (
            <>
              <span className="pill-text">{active.name}</span>
              <span className="mono">{fmtPct(g.research.progress / active.cost)}</span>
            </>
          ) : (
            <span className="pill-text">{Math.floor(g.research.points)} RP · +{rpRate.toFixed(1)}/s</span>
          )}
        </button>
        {g.events.slice(0, 2).map((e) => {
          const def = EVENT_BY_ID[e.id];
          return (
            <span key={e.id + (e.siteId ?? '')} className={`hud-pill event ${def?.kind}`}>
              <Icon name={(def?.kind === 'bad' ? 'alert' : 'info') as IconName} size={14} />
              <span className="pill-text">{def?.name}</span>
              <span className="mono dim">{Math.ceil(e.remaining)}s</span>
            </span>
          );
        })}
      </div>
      <MilestoneBar />
    </header>
  );
}

function MilestoneBar() {
  const g = useGame();
  const m = MILESTONES[g.milestone];
  if (!m) return null;
  return (
    <button className="milestone" onClick={() => { audio.sfx('open'); useUI.getState().togglePanel('goals'); }}>
      <Icon name="star" size={14} />
      <span className="milestone-title">{m.title}</span>
      <span className="milestone-reward">+{fmtMoney(m.reward)}</span>
    </button>
  );
}
