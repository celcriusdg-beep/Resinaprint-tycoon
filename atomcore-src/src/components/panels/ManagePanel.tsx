import { useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { BUILDINGS } from '../../game/buildings/defs';
import { fuelCapacity, repairCost, safetyRating, contractSlots } from '../../game/simulation/plant';
import { getMods } from '../../game/simulation/modifiers';
import { netIncome, canAffordEssential, creditLimit } from '../../game/engine';
import { RESEARCH } from '../../game/research/tree';
import { LEDGER_WINDOW } from '../../game/constants';
import { fmtMoney, fmtPower, fmtPct, fmtTime, fmtNum, fmtEnergy } from '../../ui/format';
import { run, A } from '../../ui/actions';
import { Bar, Button, Stat, Tabs, Section, Toggle, Sparkline, Empty } from '../ui/common';
import { PlantBalance } from './PlantBalance';
import { StaffPanel } from './StaffPanel';
import type { Automation } from '../../game/types';

type Tab = 'finance' | 'plant' | 'maint' | 'staff' | 'auto' | 'fuel' | 'log';

export function ManagePanel() {
  const [tab, setTab] = useState<Tab>('finance');
  return (
    <div className="panel-stack">
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'finance', label: 'Finance' }, { id: 'plant', label: 'Plant' }, { id: 'maint', label: 'Maintenance' },
        { id: 'staff', label: 'Staff' }, { id: 'auto', label: 'Automation' }, { id: 'fuel', label: 'Fuel' }, { id: 'log', label: 'Log' },
      ]} />
      {tab === 'finance' && <Finance />}
      {tab === 'plant' && <Plant />}
      {tab === 'maint' && <Maintenance />}
      {tab === 'staff' && <Staff />}
      {tab === 'auto' && <AutomationTab />}
      {tab === 'fuel' && <Fuel />}
      {tab === 'log' && <Log />}
    </div>
  );
}

function Finance() {
  const g = useGame();
  // Use the completed window if available, otherwise the running one scaled.
  const useCur = g.ledgerPrev.sales === 0 && g.ledgerPrev.upkeep === 0;
  const L = useCur ? g.ledger : g.ledgerPrev;
  const scale = useCur ? 60 / Math.max(1, g.ledgerTimer) : 60 / LEDGER_WINDOW;
  const income = [
    { label: 'Electricity sales', v: L.sales },
    { label: 'Contracts', v: L.contracts },
    { label: 'Bonuses & grants', v: Math.max(0, L.other) },
  ];
  const expenses = [
    { label: 'Building upkeep', v: L.upkeep },
    { label: 'Salaries', v: L.salaries },
    { label: 'Fuel & materials', v: L.fuel },
    { label: 'Water', v: L.water ?? 0 },
    { label: 'Repairs', v: L.maintenance },
    { label: 'Construction', v: L.construction },
    { label: 'Research funding', v: L.research },
    { label: 'Other', v: Math.max(0, -L.other) },
  ];
  const totalIn = income.reduce((a, x) => a + x.v, 0);
  const totalOut = expenses.reduce((a, x) => a + x.v, 0);
  const op = netIncome(g);
  return (
    <>
      <div className="stat-grid">
        <Stat label="Cash" value={fmtMoney(g.money, 2)} />
        <Stat label="Operating profit" value={`${fmtMoney(op)}/s`} tone={op >= 0 ? 'good' : 'bad'} sub={`${fmtMoney(op * 60)}/min`} />
        <Stat label="Earned this run" value={fmtMoney(g.runEarned)} />
        <Stat label="Lifetime earnings" value={fmtMoney(g.lifetimeEarned)} />
        <Stat label="Emergency credit" value={fmtMoney(creditLimit(g))} sub={g.money < 0 ? `using ${fmtMoney(-g.money)} · 1.2%/min interest` : 'for repairs & fuel when broke'} tone={g.money < 0 ? 'warn' : undefined} />
      </div>
      <Section title="Cash history">
        <Sparkline values={g.history.map((h) => h.money)} color="#5be08a" height={56} />
      </Section>
      <Section title="Profit & loss (per minute)">
        <table className="pl">
          <tbody>
            {income.map((r) => <tr key={r.label}><td>{r.label}</td><td className="good mono">+{fmtMoney(r.v * scale)}</td></tr>)}
            <tr className="sum"><td>Total income</td><td className="good mono">+{fmtMoney(totalIn * scale)}</td></tr>
            {expenses.filter((r) => r.v > 0.5).map((r) => <tr key={r.label}><td>{r.label}</td><td className="bad mono">−{fmtMoney(r.v * scale)}</td></tr>)}
            <tr className="sum"><td>Total expenses</td><td className="bad mono">−{fmtMoney(totalOut * scale)}</td></tr>
            <tr className="sum big"><td>Net</td><td className={`mono ${totalIn - totalOut >= 0 ? 'good' : 'bad'}`}>{fmtMoney((totalIn - totalOut) * scale)}</td></tr>
          </tbody>
        </table>
        <div className="muted small">Includes one-off spending (construction, research, repairs) during the last minute.</div>
      </Section>
    </>
  );
}

function Plant() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const st = site.stats;
  const mods = getMods(g, site.id);
  const reactors = site.buildings.filter((b) => b.reactor);
  return (
    <>
      <PlantBalance />
      <div className="stat-grid">
        <Stat label="Electric output" value={fmtPower(st.electricMW)} sub={`export ${fmtPower(st.exportMW)}`} />
        <Stat label="Cooling margin" value={st.coolingRatio >= 10 ? '—' : fmtPct(st.coolingRatio)} tone={st.coolingRatio < 1 ? 'bad' : st.coolingRatio < 1.1 ? 'warn' : 'good'} />
        <Stat label="Safety rating" value={`${Math.round(safetyRating(g, site.id, mods))}/100`} />
        <Stat label="Storage" value={`${fmtNum(st.storageMWh)} / ${fmtNum(st.storageCapMWh)} MWh`} sub={st.storageFlowMW > 0.1 ? `charging ${fmtPower(st.storageFlowMW)}` : st.storageFlowMW < -0.1 ? `discharging ${fmtPower(-st.storageFlowMW)}` : 'idle'} />
      </div>
      <Section title="Reactors" right={reactors.length > 1 ? (
        <div className="row gap">
          <Button small onClick={() => run((s) => A.setAllSetpoints(s, 0.5))}>All 50%</Button>
          <Button small onClick={() => run((s) => A.setAllSetpoints(s, 1))}>All 100%</Button>
        </div>
      ) : undefined}>
        {reactors.length === 0 && <Empty>No reactors at this site yet.</Empty>}
        {reactors.map((b) => (
          <button key={b.id} className="list-row" onClick={() => useUI.getState().select(b.id)}>
            <span className="list-name">{BUILDINGS[b.type].short} <span className="muted">L{b.level}</span></span>
            <span className={`mono ${b.reactor!.scrammed ? 'bad' : ''}`}>{b.reactor!.scrammed ? 'SCRAM' : b.status !== 'active' ? b.status : fmtPct(b.reactor!.power)}</span>
            <span className="mono muted">{Math.round(b.reactor!.temp)}°C</span>
          </button>
        ))}
      </Section>
      <Section title="Today's market">
        <div className="muted small">Demand {fmtPower(st.demandMW)} · sold {fmtPower(st.soldMW)} · surplus {fmtPower(st.surplusMW)} (sold at 20%) · price ${Math.round(st.price)}/MWh</div>
      </Section>
    </>
  );
}

function Maintenance() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const list = [...site.buildings].filter((b) => b.status !== 'constructing').sort((a, b) => (a.status === 'broken' ? -1 : 0) - (b.status === 'broken' ? -1 : 0) || a.condition - b.condition);
  const worn = list.filter((b) => b.condition < 99.5 || b.status === 'broken');
  const total = worn.reduce((a, b) => a + repairCost(b), 0);
  const crews = site.buildings.filter((b) => b.type === 'maintenance' && b.status === 'active').length;
  return (
    <>
      <div className="stat-grid">
        <Stat label="Workshops" value={crews} sub={crews ? 'slowing wear & restoring condition' : 'none — equipment wears faster'} />
        <Stat label="Broken" value={list.filter((b) => b.status === 'broken').length} tone={list.some((b) => b.status === 'broken') ? 'bad' : 'good'} />
      </div>
      <Button variant="primary" icon="wrench" wide disabled={!worn.length || g.money < total}
        onClick={() => { for (const b of worn) A.repairBuilding(g, b.id); run(() => null, { sound: 'cash', structural: true }); }}>
        Repair all {worn.length ? fmtMoney(total) : ''}
      </Button>
      <div className="list">
        {list.map((b) => (
          <div key={b.id} className="list-row">
            <button className="list-name link" onClick={() => useUI.getState().select(b.id)}>{BUILDINGS[b.type].short} <span className="muted">L{b.level}</span></button>
            <div className="list-bar"><Bar value={b.condition} max={100} warn={b.condition < 40} color={b.status === 'broken' ? '#ff5a5a' : undefined} /></div>
            <Button small disabled={(b.condition >= 99.5 && b.status !== 'broken') || !canAffordEssential(g, repairCost(b))} onClick={() => run((s) => A.repairBuilding(s, b.id), { sound: 'cash', structural: true })}>
              {b.status === 'broken' ? 'Fix' : `${Math.round(b.condition)}%`} {b.condition < 99.5 || b.status === 'broken' ? fmtMoney(repairCost(b)) : ''}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

function Staff() {
  const g = useGame();
  return (
    <>
      <StaffPanel />
      <Section title="Contracts desk">
        <div className="muted small">Contract slots: {g.contracts.length} / {contractSlots(g)} (each Administration Building adds one).</div>
      </Section>
    </>
  );
}

const AUTO_INFO: { key: keyof Automation; label: string; desc: string }[] = [
  { key: 'autoFuel', label: 'Fuel procurement', desc: 'Buys fuel assemblies on the market when stock falls below 30%.' },
  { key: 'autoRefuel', label: 'Outage planning', desc: 'Shuts reactors down for refuelling when their core runs low or rods fail, then returns them to power.' },
  { key: 'autoRestart', label: 'Plant monitoring', desc: 'Restarts reactors after a SCRAM once it is safe.' },
  { key: 'autoRepair', label: 'Predictive maintenance', desc: 'Repairs equipment below 45% condition (needs a Maintenance Workshop at the site).' },
  { key: 'loadFollow', label: 'Load following', desc: 'Adjusts reactor power to match demand, contracts and storage, within turbine and cooling limits.' },
  { key: 'smartStorage', label: 'Smart storage dispatch', desc: 'Charges batteries off-peak and sells at peak prices.' },
];

function AutomationTab() {
  const g = useGame();
  return (
    <div className="list">
      {AUTO_INFO.map((a) => {
        const node = RESEARCH.find((r) => r.automation === a.key)!;
        const unlocked = g.research.completed.includes(node.id);
        return (
          <Toggle key={a.key} label={a.label} on={g.automation[a.key]} disabled={!unlocked}
            sub={unlocked ? a.desc : `Locked — research ${node.name}`}
            onChange={(v) => run((s) => A.setAutomation(s, a.key, v))} />
        );
      })}
    </div>
  );
}

function Fuel() {
  const g = useGame();
  const cap = fuelCapacity(g);
  const use = g.supply.rates.burn; // assemblies per second
  const buy = (frac: number) => run((s) => A.buyFuel(s, Math.ceil(cap * frac)), { sound: 'cash' });
  return (
    <>
      <div className="stat-grid">
        <Stat label="Assemblies in stock" value={`${fmtNum(g.fuel)} / ${fmtNum(cap)}`} tone={g.fuel / cap < 0.15 ? 'bad' : undefined} sub={<Bar value={g.fuel} max={cap} warn={g.fuel / cap < 0.2} />} />
        <Stat label="Burn rate" value={`${fmtNum(use * 60)}/min`} sub={use > 0 ? `stock covers ${fmtTime(g.fuel / use)} of burnup` : 'reactors idle'} />
        <Stat label="Market price" value={`$${Math.round(g.market.fuelPrice)}`} sub="per fuel assembly" />
        <Stat label="Fuel cost" value={`${fmtMoney(use * g.market.fuelPrice)}/s`} />
      </div>
      <div className="action-grid">
        <Button onClick={() => buy(0.25)}>+25%</Button>
        <Button onClick={() => buy(0.5)}>+50%</Button>
        <Button variant="primary" onClick={() => buy(1)}>Fill · {fmtMoney(Math.max(0, cap - g.fuel) * g.market.fuelPrice)}</Button>
      </div>
      <p className="muted small">Reactors burn the fuel loaded in their core; fresh assemblies from this stock are loaded during refuelling outages. The stock is shared by all sites — build Fuel Storage Facilities to hold enough for a full reload of your biggest reactor. Make your own in Supply → Fuel chain. {g.automation.autoFuel ? 'Auto-buy is ON.' : ''}</p>
      <p className="muted small">Energy sold this run: {fmtEnergy(g.stats.energyMWh)}</p>
    </>
  );
}

function Log() {
  const g = useGame();
  if (!g.log.length) return <Empty>Nothing has happened yet.</Empty>;
  return (
    <div className="log">
      {g.log.map((l, i) => (
        <div key={i} className={`log-row ${l.kind}`}>
          <span className="mono muted">{fmtTime(l.t)}</span>
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  );
}
