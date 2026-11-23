import { useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { BUILDINGS } from '../../game/buildings/defs';
import { diagnose, healthySystems, reactorStatus, SYSTEM_LABEL, type Issue, type Severity } from '../../game/diagnostics';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { fmtPower, fmtPct } from '../../ui/format';
import { runFix } from '../../ui/actions';
import { Button, Section, Tabs } from '../ui/common';
import { Icon, type IconName } from '../ui/Icons';

const SEV_ICON: Record<Severity, IconName> = { error: 'alert', warn: 'alert', info: 'info', ok: 'check' };

export function IssueCard({ issue, showSite }: { issue: Issue; showSite?: boolean }) {
  return (
    <div className={`issue ${issue.severity}`}>
      <Icon name={SEV_ICON[issue.severity]} size={18} />
      <div className="grow">
        <div className="issue-title">{issue.title}{showSite ? <span className="muted small"> · {LOCATION_BY_ID[issue.siteId]?.name}</span> : null}</div>
        <div className="issue-detail">{issue.detail}</div>
      </div>
      {issue.fix && <Button small variant={issue.severity === 'error' ? 'primary' : 'default'} onClick={() => runFix(issue.fix!.action, issue.siteId)}>{issue.fix.label}</Button>}
    </div>
  );
}

type Tab = 'issues' | 'reactors';

/** Plant status board: what's fine, what's degraded, what's broken — and how to fix it. */
export function StatusPanel() {
  const g = useGame();
  const [tab, setTab] = useState<Tab>('issues');
  const [showInfo, setShowInfo] = useState(false);
  const issues = diagnose(g);
  const errors = issues.filter((i) => i.severity === 'error');
  const warns = issues.filter((i) => i.severity === 'warn');
  const infos = issues.filter((i) => i.severity === 'info');
  const healthy = healthySystems(issues, g);
  const multiSite = g.unlockedSites.length > 1;

  return (
    <div className="panel-stack">
      <div className={`summary-banner ${errors.length ? 'bad' : warns.length ? 'warnb' : ''}`}>
        <div className="status-counts">
          <span className="count bad"><b>{errors.length}</b> problems</span>
          <span className="count warn"><b>{warns.length}</b> warnings</span>
          <span className="count good"><b>{healthy.length}</b> systems OK</span>
        </div>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'issues', label: 'Problems & warnings' }, { id: 'reactors', label: 'Every reactor' }]} />

      {tab === 'issues' && (
        <>
          {errors.length === 0 && warns.length === 0 && <div className="issue ok"><Icon name="check" size={18} /><div className="grow"><div className="issue-title">Everything is running normally</div><div className="issue-detail">No problems or warnings at any site.</div></div></div>}
          {errors.length > 0 && <Section title="Needs attention now">{errors.map((i) => <IssueCard key={i.key} issue={i} showSite={multiSite} />)}</Section>}
          {warns.length > 0 && <Section title="Warnings">{warns.map((i) => <IssueCard key={i.key} issue={i} showSite={multiSite} />)}</Section>}
          {infos.length > 0 && (
            <Section title={`Information (${infos.length})`} right={<button className="link-btn" onClick={() => setShowInfo((v) => !v)}>{showInfo ? 'Hide' : 'Show'}</button>}>
              {showInfo && infos.map((i) => <IssueCard key={i.key} issue={i} showSite={multiSite} />)}
            </Section>
          )}
          <Section title="Working normally">
            <div className="ok-grid">
              {healthy.map((sys) => <span key={sys} className="ok-chip"><Icon name="check" size={13} /> {SYSTEM_LABEL[sys]}</span>)}
            </div>
          </Section>
        </>
      )}

      {tab === 'reactors' && g.unlockedSites.map((id) => {
        const site = g.sites[id];
        const reactors = site.buildings.filter((b) => b.reactor);
        if (!reactors.length) return null;
        return (
          <Section key={id} title={`${LOCATION_BY_ID[id].name} · ${fmtPower(site.stats.exportMW)} exported`}>
            {reactors.map((b) => {
              const st = reactorStatus(g, site, b);
              const r = b.reactor!;
              return (
                <button key={b.id} className={`reactor-row ${st.severity}`} onClick={() => runFix({ kind: 'select', id: b.id }, id)}>
                  <span className={`dot ${st.severity}`} />
                  <span className="grow">
                    <span className="reactor-name">{BUILDINGS[b.type].short} <span className="muted">L{b.level}</span></span>
                    <span className="reactor-head">{st.headline}</span>
                  </span>
                  <span className="reactor-meters mono small">
                    <span>target {fmtPct(r.setpoint)}</span>
                    <span>fuel {fmtPct(r.coreFuel)}</span>
                  </span>
                </button>
              );
            })}
          </Section>
        );
      })}
      <p className="muted small">Tip: “power target” is what you ask for; the reactor’s actual power can lag behind while it starts up, is tripped, runs out of fuel or is held back by xenon. The headline on each reactor tells you which.</p>
    </div>
  );
}
