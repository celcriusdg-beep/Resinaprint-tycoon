import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { BUILDINGS, BUILDING_LIST } from '../../game/buildings/defs';
import type { Building, BuildingType } from '../../game/types';
import {
  FINDING_INFO, permitFee, permitTime, permitsFor, permitProblem, licenceChecklist, licenceBlock, communityCost, opinionFactor, permitSpec,
} from '../../game/regulator/regulator';
import { isUnlockedByResearch } from '../../game/research/tree';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { fmtMoney, fmtTime } from '../../ui/format';
import { run, A } from '../../ui/actions';
import { Bar, Button, Section, Stat } from '../ui/common';
import { Icon } from '../ui/Icons';
import { preparedness, drillCost, riskFactor, inesLabel, EMERGENCIES, BASE_INCIDENT_INTERVAL } from '../../game/accidents/accidents';

// Regulator & public opinion: site rating, inspection schedule, findings,
// reactor licences, construction permits and the community programme.

export function RegulatorPanel() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const reg = site.reg;
  const R = g.regulator;
  const findings = R.findings.filter((f) => f.siteId === site.id);
  const reactors = site.buildings.filter((b) => b.reactor && b.status !== 'destroyed');
  const op = R.opinion;
  return (
    <div className="panel-stack regulator">
      <div className="stat-grid">
        <Stat label="Regulator rating" value={`${Math.round(reg.rating)}/100`} tone={reg.rating < 40 ? 'bad' : reg.rating < 60 ? 'warn' : 'good'} sub={<Bar value={reg.rating} max={100} warn={reg.rating < 60} />} />
        <Stat label="Public opinion" value={`${Math.round(op)}/100`} tone={op < 30 ? 'bad' : op < 50 ? 'warn' : 'good'} sub={<Bar value={op} max={100} warn={op < 50} />} />
        <Stat label="Next inspection" value={fmtTime(Math.max(0, reg.nextInspection - g.gameTime))} sub={LOCATION_BY_ID[site.id].name} />
        <Stat label="Licensing speed" value={`${Math.round((1 / opinionFactor(g)) * 100)}%`} sub={op > 75 ? 'permit fees −25%' : op < 30 ? 'protests slow construction' : 'set by public opinion'} tone={op < 30 ? 'bad' : undefined} />
      </div>

      {reg.holdUntil > g.gameTime && (
        <div className="alert-box"><b>Regulatory hold:</b> after the incident every reactor at this site stays shut down for another {fmtTime(reg.holdUntil - g.gameTime)}.</div>
      )}

      <Section title={`Findings (${findings.length})`}>
        {findings.length === 0 && <div className="muted small">No open findings. Inspections every 3 game days check emergency power, security, equipment condition, the spent fuel pool, crew fatigue, licensed operators and unplanned trips.</div>}
        {findings.map((f) => (
          <div key={f.id} className={`finding${f.major ? ' major' : ''}`}>
            <div className="row-between"><b>{FINDING_INFO[f.kind].title}</b><span className={`mono ${f.major ? 'bad' : 'warn'}`}>{f.major ? 'MAJOR' : 'minor'} · {fmtTime(Math.max(0, f.deadline - g.gameTime))}</span></div>
            <div className="muted small">{FINDING_INFO[f.kind].fix} {f.major ? 'If it is not fixed by the deadline a reactor is suspended.' : 'Not fixed by the deadline: a fine, and it becomes major.'}</div>
          </div>
        ))}
      </Section>

      <Section title="Reactor licences">
        {reactors.length === 0 && <div className="muted small">No reactors at this site.</div>}
        {reactors.map((b) => <LicenceRow key={b.id} b={b} />)}
      </Section>

      <PermitList />

      <Preparedness />

      <Section title="Community programme">
        <p className="muted small">Open days, school visits, local sponsorship. Each level raises public opinion over time.</p>
        <div className="row-between">
          <span>Level {R.community} / 5 · {fmtMoney(communityCost(g))}/s</span>
          <div className="stepper">
            <button type="button" className="round-btn sm" disabled={R.community <= 0} onClick={() => run((s) => A.setCommunity(s, s.regulator.community - 1))} aria-label="Lower"><Icon name="minus" size={16} /></button>
            <button type="button" className="round-btn sm" disabled={R.community >= 5} onClick={() => run((s) => A.setCommunity(s, s.regulator.community + 1))} aria-label="Raise"><Icon name="plus" size={16} /></button>
          </div>
        </div>
      </Section>
      <p className="edu-note">Real reactors need a construction permit and an operating licence, and inspectors can order a unit shut down until problems are fixed. Visitor centres and a long clean record build public trust.</p>
    </div>
  );
}

function LicenceRow({ b }: { b: Building }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const block = licenceBlock(g, site, b);
  const list = b.licence === 'pending' ? licenceChecklist(g, site, b) : [];
  return (
    <div className="licence-row">
      <div className="row-between">
        <button type="button" className="linklike" onClick={() => { useUI.getState().setPanel(null); useUI.getState().select(b.id); }}>{BUILDINGS[b.type].short}</button>
        <span className={`status-chip ${block ? (b.licence === 'pending' ? 'warn' : 'bad') : 'good'}`}>
          {b.status === 'constructing' ? 'Under construction' : b.licence === 'pending' ? 'Awaiting licence' : b.licence === 'suspended' ? 'Suspended' : block ? 'On hold' : 'Licensed'}
        </span>
      </div>
      {list.length > 0 && <LicenceChecklist items={list} />}
    </div>
  );
}

export function LicenceChecklist({ items }: { items: { label: string; ok: boolean }[] }) {
  return (
    <ul className="checklist">
      {items.map((c) => (
        <li key={c.label} className={c.ok ? 'ok' : 'no'}><Icon name={c.ok ? 'check' : 'x'} size={13} /> {c.label}</li>
      ))}
    </ul>
  );
}

/** Construction permits for reactor designs the company has unlocked. */
export function PermitList({ compact }: { compact?: boolean }) {
  const g = useGame();
  const siteId = g.activeSite;
  const designs = BUILDING_LIST.filter((d) => d.reactor && (!d.unlock.level || g.level >= d.unlock.level) && isUnlockedByResearch(d.type, g.research.completed));
  if (!designs.length) return null;
  return (
    <Section title="Construction permits">
      {!compact && <p className="muted small">Every new reactor needs a permit for this site. Bigger reactors take longer to review and need a better site safety rating.</p>}
      <div className="permit-list">
        {designs.map((d) => <PermitRow key={d.type} type={d.type} siteId={siteId} />)}
      </div>
    </Section>
  );
}

function PermitRow({ type, siteId }: { type: BuildingType; siteId: string }) {
  const g = useGame();
  const ps = permitsFor(g, siteId, type);
  const ready = ps.filter((p) => p.ready <= g.gameTime).length;
  const waiting = ps.filter((p) => p.ready > g.gameTime);
  const problem = permitProblem(g, siteId, type);
  const fee = permitFee(g, type);
  return (
    <div className="permit-row">
      <div>
        <b>{BUILDINGS[type].short}</b>
        <div className="muted small">
          {ready > 0 && <span className="good">{ready} granted — ready to build. </span>}
          {waiting.map((p) => <span key={p.id}>In review: {fmtTime(p.ready - g.gameTime)}. </span>)}
          {!ready && !waiting.length && `Review ≈ ${fmtTime(permitTime(g, type))} · min. safety ${permitSpec(type).minSafety}`}
        </div>
        {problem && <div className="small warn">{problem}</div>}
      </div>
      <Button small variant={ready ? 'default' : 'primary'} disabled={!!problem || g.money < fee} onClick={() => run((s) => A.applyForPermit(s, type), { sound: 'click' })}>
        Apply · {fmtMoney(fee)}
      </Button>
    </div>
  );
}

function Preparedness() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const prep = preparedness(g, site);
  const risk = riskFactor(g, site);
  const hasStation = site.buildings.some((b) => b.type === 'fire_station');
  const hasCentre = site.buildings.some((b) => b.type === 'emergency_centre');
  const wall = site.buildings.some((b) => b.type === 'flood_wall');
  const loc = LOCATION_BY_ID[site.id];
  const history = g.incidents.filter((i) => i.siteId === site.id).slice(0, 6);
  return (
    <Section title="Emergency preparedness">
      <div className="stat-grid">
        <Stat label="Preparedness" value={`${Math.round(prep * 100)}%`} tone={prep < 0.3 ? 'warn' : 'good'} sub={<Bar value={prep} max={1} warn={prep < 0.3} />} />
        <Stat label="Incident risk" value={`×${risk.toFixed(2)}`} sub={`≈ every ${fmtTime(BASE_INCIDENT_INTERVAL / risk)} of running`} tone={risk > 1.6 ? 'warn' : undefined} />
      </div>
      <ul className="checklist">
        <li className={hasStation ? 'ok' : 'no'}><Icon name={hasStation ? 'check' : 'x'} size={13} /> Fire station (fast firefighting)</li>
        <li className={hasCentre ? 'ok' : 'no'}><Icon name={hasCentre ? 'check' : 'x'} size={13} /> Emergency response centre</li>
        {loc.waterBody && <li className={wall ? 'ok' : 'no'}><Icon name={wall ? 'check' : 'x'} size={13} /> Flood defence wall</li>}
        <li className={(site.drill ?? 0) > 0.05 ? 'ok' : 'no'}><Icon name={(site.drill ?? 0) > 0.05 ? 'check' : 'x'} size={13} /> Recent emergency drill ({Math.round((site.drill ?? 0) * 100)}%)</li>
      </ul>
      <div className="row-between">
        <span className="muted small">Drills raise preparedness (it fades over ~10 game days) and tire the crews a little.</span>
        <Button small variant="primary" disabled={(site.drill ?? 0) >= 0.3 || g.money < drillCost(site)} onClick={() => run((s) => A.runDrill(s), { sound: 'complete' })}>Drill · {fmtMoney(drillCost(site))}</Button>
      </div>
      {history.length > 0 && (
        <div className="incident-list">
          {history.map((i) => (
            <div key={i.t + i.kind} className={`incident ines${Math.min(3, i.ines)}`}>
              <div className="row-between"><b>{EMERGENCIES[i.kind].title}</b><span className="mono">INES {i.ines}</span></div>
              <div className="muted small">{i.text}</div>
            </div>
          ))}
          <div className="muted small">{inesLabel(0)} … {inesLabel(3)}.</div>
        </div>
      )}
    </Section>
  );
}
