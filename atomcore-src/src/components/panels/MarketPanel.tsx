import { useGame } from '../../stores/gameStore';
import { dailyDemand, dailyPrice, dayPhase, contractSlots } from '../../game/simulation/plant';
import { DAY_LENGTH, HOURS_PER_SECOND } from '../../game/constants';
import { fmtMoney, fmtPower, fmtTime, fmtEnergy } from '../../ui/format';
import { run, confirm, A } from '../../ui/actions';
import { Bar, Button, Section, Stat, Empty } from '../ui/common';
import { EVENT_BY_ID } from '../../game/events/events';
import type { Contract } from '../../game/types';

export function MarketPanel() {
  const g = useGame();
  let exportMW = 0, demand = 0;
  for (const id of g.unlockedSites) {
    exportMW += g.sites[id].stats.exportMW;
    demand += g.sites[id].stats.demandMW;
  }
  const st = g.sites[g.activeSite].stats;
  const slots = contractSlots(g);
  const contractMW = g.contracts.reduce((a, c) => a + c.mw, 0);
  // Price/demand curve over the day
  const N = 48;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * DAY_LENGTH;
    return { d: dailyDemand(t), p: dailyPrice(t) };
  });
  const w = 300, h = 80;
  const path = (key: 'd' | 'p', lo: number, hi: number) => pts.map((p, i) => `${i ? 'L' : 'M'}${(i / N) * w},${h - 6 - ((p[key] - lo) / (hi - lo)) * (h - 12)}`).join(' ');
  const phase = dayPhase(g.gameTime);
  const hour = Math.floor(phase * 24);
  return (
    <div className="panel-stack">
      <div className="stat-grid">
        <Stat label="Spot price (here)" value={`$${Math.round(st.price)}/MWh`} sub={`market ×${g.market.priceMult.toFixed(2)}`} />
        <Stat label="Company export" value={fmtPower(exportMW)} />
        <Stat label="Regional demand" value={fmtPower(demand)} sub="all sites" />
        <Stat label="Contracted" value={fmtPower(contractMW)} sub={`${g.contracts.length}/${slots} slots`} tone={contractMW > exportMW ? 'bad' : undefined} />
      </div>
      <Section title={`Daily cycle · ${String(hour).padStart(2, '0')}:00`}>
        <svg viewBox={`0 0 ${w} ${h}`} className="day-chart" preserveAspectRatio="none">
          <path d={path('d', 0.6, 1.15)} className="demand" />
          <path d={path('p', 0.35, 1.45)} className="price" />
          <line x1={phase * w} x2={phase * w} y1={0} y2={h} className="now" />
        </svg>
        <div className="legend small"><span className="lg lg-demand">Demand</span><span className="lg lg-price">Price</span><span className="muted">One in-game day = {DAY_LENGTH / 60} minutes. Demand and price peak in the evening.</span></div>
      </Section>
      {g.events.length > 0 && (
        <Section title="Active events">
          {g.events.map((e) => (
            <div key={e.id + (e.siteId ?? '')} className={`event-row ${EVENT_BY_ID[e.id]?.kind}`}>
              <span>{EVENT_BY_ID[e.id]?.name}</span>
              <span className="muted small">{EVENT_BY_ID[e.id]?.description}</span>
              <span className="mono">{Math.ceil(e.remaining)}s</span>
            </div>
          ))}
        </Section>
      )}
      <Section title="Active contracts">
        {g.contracts.length === 0 && <Empty>No contracts. Contracts pay a premium and are supplied before the spot market.</Empty>}
        {g.contracts.map((c) => <ContractCard key={c.id} c={c} active />)}
      </Section>
      <Section title="Offers" right={<span className="muted small">new offers every 90 s</span>}>
        {g.offers.length === 0 && <Empty>No offers right now.</Empty>}
        {g.offers.map((c) => <ContractCard key={c.id} c={c} disabled={g.contracts.length >= slots} />)}
      </Section>
    </div>
  );
}

function ContractCard({ c, active, disabled }: { c: Contract; active?: boolean; disabled?: boolean }) {
  const g = useGame();
  const ratio = c.required > 0 ? c.delivered / c.required : 0;
  const elapsed = c.duration - c.remaining;
  const expected = c.mw * elapsed * HOURS_PER_SECOND;
  const onTrack = expected <= 0 || c.delivered / expected >= 0.9;
  return (
    <div className={`contract ${c.tier}`}>
      <div className="row-between">
        <div>
          <div className="contract-client">{c.client}</div>
          <div className="muted small">{c.tier} · {fmtPower(c.mw)} for {fmtTime(c.duration)} · ${c.price}/MWh</div>
        </div>
        {!active && (
          <Button small variant="primary" disabled={disabled} onClick={() => run((s) => A.acceptOffer(s, c.id), { sound: 'cash' })}>Sign</Button>
        )}
      </div>
      {active ? (
        <>
          <Bar value={ratio} max={1} color={onTrack ? '#5be08a' : '#ffb648'} />
          <div className="row-between small">
            <span className={onTrack ? 'good' : 'warn'}>{fmtEnergy(c.delivered)} / {fmtEnergy(c.required)} {onTrack ? '· on track' : '· behind!'}</span>
            <span className="mono">{fmtTime(c.remaining)}</span>
          </div>
          <div className="row-between small muted">
            <span>Bonus {fmtMoney(c.bonus)} · penalty up to {fmtMoney(c.penalty)}</span>
            <button className="link-btn" onClick={() => confirm('Cancel contract?', `Termination fee: ${fmtMoney(Math.round(c.penalty * (c.remaining / c.duration)))}.`, 'Cancel contract', () => run((s) => A.cancelContract(s, c.id)), true)}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="muted small">Value ≈ {fmtMoney(c.required * c.price)} + bonus {fmtMoney(c.bonus)}. Under 90% delivery costs up to {fmtMoney(c.penalty)}.</div>
      )}
      {void g}
    </div>
  );
}
