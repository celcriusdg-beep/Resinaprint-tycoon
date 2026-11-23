import { useGame, useGameStore } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { LOCATIONS, expandCost, nextSize } from '../../game/progression/locations';
import { pendingShares, prestigeMult } from '../../game/progression/prestige';
import { PRESTIGE_MIN_EARNED } from '../../game/constants';
import { fmtMoney, fmtPower } from '../../ui/format';
import { run, confirm, A } from '../../ui/actions';
import { Bar, Button, Section } from '../ui/common';
import { Icon } from '../ui/Icons';
import { audio } from '../../systems/audio/audio';
import { persist } from '../../systems/loop';

export function SitesPanel() {
  const g = useGame();
  const shares = pendingShares(g);
  return (
    <div className="panel-stack">
      {LOCATIONS.map((loc) => {
        const owned = g.unlockedSites.includes(loc.id);
        const site = g.sites[loc.id];
        const active = g.activeSite === loc.id;
        const levelOk = g.level >= loc.unlockLevel;
        return (
          <div key={loc.id} className={`site-card ${loc.theme}${active ? ' active' : ''}`}>
            <div className="row-between">
              <div>
                <div className="site-name">{loc.name}</div>
                <div className="muted small">{loc.region} · {loc.perk}</div>
              </div>
              {owned ? (
                active ? <span className="status-chip good">Viewing</span> :
                  <Button small variant="primary" onClick={() => { run((s) => A.switchSite(s, loc.id), { structural: true }); useUI.getState().select(null); }}>View</Button>
              ) : (
                <Button small variant="primary" disabled={!levelOk || g.money < loc.cost}
                  onClick={() => confirm(`Acquire ${loc.name}?`, `Buy land for ${fmtMoney(loc.cost)} and start a new plant. ${loc.description}`, 'Acquire', () => run((s) => A.unlockSite(s, loc.id), { structural: true, sound: 'achievement' }))}>
                  {levelOk ? fmtMoney(loc.cost) : <><Icon name="lock" size={13} /> Level {loc.unlockLevel}</>}
                </Button>
              )}
            </div>
            <p className="small">{loc.description}</p>
            {owned && site && (
              <>
                <div className="site-stats small">
                  <span>{fmtPower(site.stats.exportMW)} export</span>
                  <span>{site.buildings.length} buildings</span>
                  <span>{site.stats.reactorsOnline}/{site.stats.reactorsTotal} reactors</span>
                  <span>Plot {site.size}×{site.size}</span>
                </div>
                {site.size < loc.maxSize ? (
                  <Button small icon="grid" disabled={g.money < expandCost(loc, site.size)}
                    onClick={() => run((s) => A.expandSite(s, loc.id), { structural: true, sound: 'place' })}>
                    Expand land to {nextSize(loc, site.size)}×{nextSize(loc, site.size)} · {fmtMoney(expandCost(loc, site.size))}
                  </Button>
                ) : <div className="muted small">Maximum plot size reached.</div>}
              </>
            )}
          </div>
        );
      })}

      <Section title="Corporate restructuring (prestige)">
        <p className="small">Sell the company to investors and start over with permanent <b>Shares</b>. Each share gives +3% electricity price, +3% research and +1% build speed forever. Achievements are kept.</p>
        <div className="stat-grid">
          <div className="stat"><div className="stat-label">Current shares</div><div className="stat-value">{g.prestige.shares} <span className="muted small">(×{prestigeMult(g.prestige.shares).toFixed(2)})</span></div></div>
          <div className="stat"><div className="stat-label">Shares on restructuring</div><div className="stat-value good">+{shares}</div></div>
        </div>
        {shares === 0 && (
          <>
            <Bar value={g.runEarned} max={PRESTIGE_MIN_EARNED} />
            <div className="muted small">Earn {fmtMoney(PRESTIGE_MIN_EARNED)} in a single run to unlock ({fmtMoney(g.runEarned)} so far).</div>
          </>
        )}
        <Button variant="danger" wide disabled={shares === 0}
          onClick={() => confirm('Restructure the company?', `Your plants, money and research are reset. You keep achievements and gain ${shares} shares (total ${g.prestige.shares + shares}).`, 'Restructure', () => {
            const res = A.prestige(useGameStore.getState().game);
            if (res.state) {
              useGameStore.getState().setGame(res.state);
              useUI.getState().select(null);
              useUI.getState().setPanel(null);
              audio.sfx('achievement');
              void persist();
            }
          }, true)}>
          Restructure for +{shares} shares
        </Button>
      </Section>
    </div>
  );
}
