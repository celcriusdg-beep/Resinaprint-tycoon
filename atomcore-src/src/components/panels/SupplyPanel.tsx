import { useState, type ReactNode } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { fuelCapacity } from '../../game/simulation/plant';
import { getMods } from '../../game/simulation/modifiers';
import { supplyCaps, supplyCapacity, itemPrice, mineOutput, vehicleLock, vehiclesOf, fuelQuota, fuelQuotaLeft, marketFuelPrice, ownFuelCost, ownStock, type Item } from '../../game/supply/fuelcycle';
import { BUILDINGS } from '../../game/buildings/defs';
import { EXCAVATORS, TRUCKS, slotsFor, type VehicleDef } from '../../game/supply/vehicles';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { ORE_PER_YELLOWCAKE, YELLOWCAKE_PER_ENRICHED, SELL_FACTOR } from '../../game/constants';
import { fmtMoney, fmtNum, fmtPct, fmtTime } from '../../ui/format';
import { run, A, beginBuild } from '../../ui/actions';
import { Bar, Button, Section, Slider, Stat, Tabs, Empty } from '../ui/common';
import { Icon } from '../ui/Icons';
import type { Building } from '../../game/types';

type Tab = 'fuel' | 'mining' | 'water';

export function SupplyPanel() {
  const [tab, setTab] = useState<Tab>('fuel');
  return (
    <div className="panel-stack">
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'fuel', label: 'Fuel chain', icon: 'fuel' }, { id: 'mining', label: 'Mining fleet', icon: 'hammer' }, { id: 'water', label: 'Water', icon: 'snow' }]} />
      {tab === 'fuel' && <FuelChain />}
      {tab === 'mining' && <Mining />}
      {tab === 'water' && <Water />}
    </div>
  );
}

// ── Fuel chain ────────────────────────────────────────────────────────────

type Tone = 'ok' | 'warn' | 'bad' | 'idle';

const EXPLAIN: Record<Item, { what: string; from: string; to: string }> = {
  ore: {
    what: 'Rock containing about 0.1–0.2% uranium. Worthless until milled.',
    from: 'Uranium Mine (needs excavators + trucks) or bought.',
    to: 'Ore Mill turns 10 t of ore into 1 unit of yellowcake. Also wanted by some buyers on the order board.',
  },
  yellowcake: {
    what: 'Uranium concentrate (U₃O₈) — the yellow powder. Natural uranium: only 0.7% U-235, too little for a power reactor.',
    from: 'Ore Mill, or bought.',
    to: 'Enrichment Plant raises the U-235 share to 3–5%. Fuel buyers pay a premium for it on the order board.',
  },
  enriched: {
    what: 'Low-enriched uranium (3–5% U-235), the actual nuclear fuel material.',
    from: 'Enrichment Plant, or bought.',
    to: 'Fuel Fabrication presses it into pellets, rods and assemblies. Molten Salt Reactors burn it directly — dissolved in their fuel salt. Fabricators buy it on the order board.',
  },
  assemblies: {
    what: 'Bundles of fuel rods, ready to load. Every solid-fuel reactor needs them.',
    from: 'Fuel Fabrication, or bought — suppliers can only deliver a limited amount per day.',
    to: 'Loaded into reactors during refuelling outages. Defective rods can leak in the core.',
  },
};

function Explain({ item }: { item: Item }) {
  const e = EXPLAIN[item];
  return (
    <details className="explain small">
      <summary>What is this for?</summary>
      <div>{e.what}</div>
      <div><b>Made by:</b> {e.from}</div>
      <div><b>Used by:</b> {e.to}</div>
    </details>
  );
}

function Node({ icon, title, stock, cap, unit, inRate, outRate, tone, note, children, item }: {
  icon: string; title: string; stock: number; cap: number; unit: string; inRate: number; outRate: number; tone: Tone;
  note?: ReactNode; children?: ReactNode; item: Item;
}) {
  const g = useGame();
  const price = itemPrice(g, item);
  const lot = item === 'ore' ? 100 : item === 'assemblies' ? Math.max(1, Math.min(fuelQuotaLeft(g), Math.max(10, Math.round(fuelCapacity(g) * 0.25)))) : 10;
  const soldOut = item === 'assemblies' && fuelQuotaLeft(g) <= 0;
  return (
    <div className={`flow-node ${tone}`}>
      <div className="flow-head">
        <span className="flow-emoji" aria-hidden>{icon}</span>
        <div className="grow">
          <div className="flow-title">{title}</div>
          <div className="muted small">{fmtNum(stock)} / {fmtNum(cap)} {unit}</div>
        </div>
        <div className="flow-rates mono small">
          <span className="good">+{fmtNum(inRate * 60)}/min</span>
          <span className="bad">−{fmtNum(outRate * 60)}/min</span>
        </div>
      </div>
      <Bar value={stock} max={cap} warn={stock / cap < 0.15 || stock / cap > 0.97} />
      {note && <div className="flow-note small">{note}</div>}
      <Explain item={item} />
      {children}
      <div className="trade-row">
        <span className="muted small">Market ${price.toFixed(price < 10 ? 2 : 0)} · sell ${(price * SELL_FACTOR).toFixed(price < 10 ? 2 : 0)}</span>
        <div className="row gap">
          <Button small disabled={soldOut} onClick={() => run((s) => A.tradeItem(s, item, lot), { sound: 'cash' })}>{soldOut ? 'Sold out today' : `Buy ${fmtNum(lot)}`}</Button>
          <Button small variant="ghost" disabled={stock < 1} onClick={() => run((s) => A.tradeItem(s, item, -Math.min(stock, lot)), { sound: 'cash' })}>Sell</Button>
        </div>
      </div>
    </div>
  );
}

function Arrow({ label, cap, used, missing, build }: { label: string; cap: number; used: number; missing?: string; build?: Parameters<typeof beginBuild>[0] }) {
  const g = useGame();
  const busy = cap > 0 && used >= cap * 0.97;
  return (
    <div className={`flow-arrow${missing ? ' missing' : busy ? ' busy' : ''}`}>
      <span className="arrow-line" />
      <span className="arrow-label">
        {missing ? (
          <>
            <Icon name="lock" size={12} /> {missing}
            {build && !A.buildLockReason(g, build) && <button className="link-btn" onClick={() => beginBuild(build)}> Build</button>}
          </>
        ) : (
          <>{label} · {fmtNum(used * 60)}/{fmtNum(cap * 60)} per min{busy ? ' — at capacity' : ''}</>
        )}
      </span>
    </div>
  );
}

function FuelChain() {
  const g = useGame();
  const sup = g.supply;
  const r = sup.rates;
  const caps = supplyCaps(g);
  const fuelCap = fuelCapacity(g);
  const proc = supplyCapacity(g);
  const produced = r.fabricated - r.rejected;
  const selfSufficiency = r.burn > 0 ? Math.min(1, produced / r.burn) : produced > 0 ? 1 : 0;
  const daysLeft = r.burn > 0 ? g.fuel / r.burn : Infinity;
  const defectShare = g.fuel > 0 ? sup.defects / g.fuel : 0;
  return (
    <>
      <div className="summary-banner">
        <div>
          <div className="muted small">Fuel self-sufficiency</div>
          <div className="big">{fmtPct(selfSufficiency)}</div>
        </div>
        <div className="grow">
          <Bar value={selfSufficiency} max={1} height={8} color={selfSufficiency >= 1 ? '#5be08a' : undefined} />
          <div className="muted small">
            Reactors burn {fmtNum(r.burn * 60)} assemblies/min · you make {fmtNum(produced * 60)}/min
            {Number.isFinite(daysLeft) ? ` · stock lasts ${fmtTime(daysLeft)}` : ''}
          </div>
        </div>
      </div>

      <MarketCard />
      <OrdersBoard />

      <div className="flow">
        <Node icon="⛏️" title="Uranium ore" item="ore" unit="t" stock={sup.ore} cap={caps.ore} inRate={r.mined} outRate={r.milled}
          tone={proc.mines === 0 ? 'idle' : r.mined <= 0 ? 'warn' : 'ok'}
          note={proc.mines === 0 ? 'No mine yet. Research Uranium Mining, build a mine and buy vehicles.' : r.mined <= 0 ? 'Mines are idle — they need both excavators and trucks.' : undefined} />
        <Arrow label={`Ore Mill (${ORE_PER_YELLOWCAKE} : 1)`} cap={proc.mill} used={r.milled} missing={proc.mill <= 0 ? 'No ore mill' : undefined} build="ore_mill" />
        <Node icon="🟨" title="Yellowcake (U₃O₈)" item="yellowcake" unit="units" stock={sup.yellowcake} cap={caps.yellowcake} inRate={r.milled / ORE_PER_YELLOWCAKE} outRate={r.enriched}
          tone={sup.yellowcake >= caps.yellowcake * 0.97 ? 'warn' : 'ok'} />
        <Arrow label={`Enrichment (${(YELLOWCAKE_PER_ENRICHED * Math.pow(sup.enrichment / 4, 1.3)).toFixed(1)} : 1 at ${sup.enrichment.toFixed(1)}%)`} cap={proc.enrich} used={r.enriched} missing={proc.enrich <= 0 ? 'No enrichment plant' : undefined} build="enrichment" />
        {proc.enrich > 0 && (
          <div className="qa-box">
            <Slider label="Product enrichment (U-235)" value={sup.enrichment} min={3} max={5} step={0.1}
              onChange={(v) => run((s) => A.setEnrichment(s, v), { sound: null })} format={(v) => `${v.toFixed(1)}%`} />
            <div className="muted small">Higher enrichment: each assembly lasts longer and the core has more excess reactivity, but it needs more yellowcake and enrichment work. Licence limit 5% (low-enriched uranium).</div>
          </div>
        )}
        <Node icon="🧪" title="Enriched uranium" item="enriched" unit="units" stock={sup.enriched} cap={caps.enriched} inRate={r.enriched / YELLOWCAKE_PER_ENRICHED} outRate={r.fabricated + (r.salt ?? 0)}
          note={(r.salt ?? 0) > 0 ? <>Molten Salt Reactors are dissolving <b>{fmtNum((r.salt ?? 0) * 60)}/min</b> into their fuel salt.</> : undefined}
          tone={sup.enriched >= caps.enriched * 0.97 ? 'warn' : 'ok'} />
        <Arrow label="Fuel Fabrication (1 : 1)" cap={proc.fab} used={r.fabricated} missing={proc.fab <= 0 ? 'No fabrication plant' : undefined} build="fuel_fab" />
        <Node icon="🔩" title="Fuel assemblies" item="assemblies" unit="" stock={g.fuel} cap={fuelCap} inRate={produced} outRate={r.burn}
          tone={g.fuel / fuelCap < 0.15 ? 'bad' : defectShare > 0.03 ? 'warn' : 'ok'}
          note={<>Average enrichment in stock {sup.stockEnr.toFixed(2)}% U-235. Estimated defective: <b className={defectShare > 0.03 ? 'bad' : defectShare > 0.01 ? 'warn' : 'good'}>{fmtPct(defectShare, 1)}</b> ({fmtNum(sup.defects)}). Bought assemblies are 0.2% defective.{' '}
            <button className="link-btn" onClick={() => beginBuild('fuel_depot')}>More storage: build a Fuel Storage Facility</button></>}>
          {proc.fab > 0 && (
            <div className="qa-box">
              <Slider label="Fabrication quality assurance" value={sup.qa} onChange={(v) => run((s) => A.setQA(s, v), { sound: null })}
                format={(v) => `${Math.round(v * 100)}%`} />
              <div className="row-between small">
                <span>Defect rate <b className={r.defectRate > 0.02 ? 'bad' : r.defectRate > 0.008 ? 'warn' : 'good'}>{fmtPct(r.defectRate, 1)}</b></span>
                <span className="muted">Line speed {fmtPct(1 - 0.5 * sup.qa)}</span>
              </div>
              <div className="muted small">
                {proc.inspect > 0
                  ? `Inspection lab checks ${fmtNum(proc.inspect * 60)}/min and rejected ${fmtNum(r.rejected * 60)}/min.`
                  : 'No Fuel Inspection Lab: defects go straight into your stock.'}
              </div>
            </div>
          )}
        </Node>
        <div className="flow-arrow"><span className="arrow-line" /><span className="arrow-label">Loaded into reactors during refuelling outages</span></div>
      </div>
      <p className="edu-note">Simplified fuel cycle: mined ore is milled into uranium concentrate, enriched in U-235 and made into fuel rods bundled as assemblies. Defective rods can fail in the reactor.</p>
    </>
  );
}

function MarketCard() {
  const g = useGame();
  const quota = fuelQuota(g);
  const left = fuelQuotaLeft(g);
  const now = marketFuelPrice(g);
  const own = ownFuelCost(g);
  const dayLeft = 240 - (g.gameTime % 240);
  return (
    <Section title="Fuel market vs. making your own">
      <div className="row-between small">
        <span>Suppliers can still deliver today</span>
        <b className={left <= 0 ? 'bad' : left < quota * 0.25 ? 'warn' : 'good'}>{fmtNum(left)} / {fmtNum(quota)} assemblies</b>
      </div>
      <Bar value={left} max={quota} warn={left < quota * 0.25} />
      <div className="row-between small" style={{ marginTop: 6 }}>
        <span>Next assembly on the market</span>
        <b className={now > g.market.fuelPrice * 1.5 ? 'warn' : ''}>{fmtMoney(now)}</b>
      </div>
      <div className="row-between small">
        <span>Your own fuel chain (running cost per assembly)</span>
        <b className={own === null ? 'muted' : own < now ? 'good' : 'warn'}>{own === null ? 'not producing' : fmtMoney(own)}</b>
      </div>
      <div className="muted small" style={{ marginTop: 6 }}>
        The price rises the more you buy in one day, and supply resets in {fmtTime(dayLeft)}.
        Small plants can live on the market; a big fleet needs its own mine → mill → enrichment → fabrication chain.
        Surplus yellowcake and enriched uranium can be sold to the buyers below.
      </div>
    </Section>
  );
}

const ITEM_NAME = { ore: 'uranium ore', yellowcake: 'yellowcake', enriched: 'enriched uranium' } as const;
const ITEM_UNIT = { ore: 't', yellowcake: 'units', enriched: 'units' } as const;

function OrdersBoard() {
  const g = useGame();
  const msr = Object.values(g.sites).some((x) => x.buildings.some((b) => BUILDINGS[b.type].reactor?.onlineRefuel));
  return (
    <Section title="Material orders">
      {g.orders.length === 0 && <Empty>No buyers right now.</Empty>}
      {g.orders.map((o) => {
        const have = ownStock(g, o.item);
        const ok = have >= o.qty;
        return (
          <div key={o.id} className="order-row">
            <div className="grow">
              <div><b>{o.buyer}</b></div>
              <div className="muted small">
                Wants {fmtNum(o.qty)} {ITEM_UNIT[o.item]} of {ITEM_NAME[o.item]} · you made {fmtNum(have)} · pays {fmtMoney(o.pay)} (+{fmtNum(o.xp)} XP)
                {' '}— about {Math.round((o.pay / (o.qty * itemPrice(g, o.item)) - 1) * 100)}% above market
              </div>
            </div>
            <Button small disabled={!ok} onClick={() => run((s) => A.deliverMaterialOrder(s, o.id), { sound: 'cash' })}>{ok ? 'Deliver' : 'Not enough'}</Button>
          </div>
        );
      })}
      <div className="muted small">New buyers arrive every few minutes. They only take material you produced yourself — not resold market stock. {msr ? 'Keep enough enriched uranium for your Molten Salt Reactors!' : ''}</div>
    </Section>
  );
}

// ── Mining ────────────────────────────────────────────────────────────────

function VehicleIcon({ d }: { d: VehicleDef }) {
  const size = 22 + d.tier * 9 + (d.selfHaul ? 6 : 0);
  if (d.kind === 'truck') {
    return (
      <svg width={size} height={size * 0.62} viewBox="0 0 40 25" className="veh-icon" aria-hidden>
        <path d="M2 14h22l4-8h-6v-4H5L2 9z" fill="#e6ad25" />
        <path d="M25 9h8l5 6v4H25z" fill={d.tier >= 2 ? '#cfd3d6' : '#c0392b'} />
        <circle cx="9" cy="20" r="4.5" fill="#1d1f21" /><circle cx="31" cy="20" r="4.5" fill="#1d1f21" />
      </svg>
    );
  }
  if (d.selfHaul) {
    return (
      <svg width={size} height={size * 0.62} viewBox="0 0 40 25" className="veh-icon" aria-hidden>
        <circle cx="33" cy="9" r="6" fill="none" stroke="#a9b0b6" strokeWidth="2" />
        <path d="M33 9L14 15" stroke="#e6ad25" strokeWidth="2.5" /><path d="M14 15L3 11" stroke="#e6ad25" strokeWidth="2" />
        <rect x="9" y="13" width="10" height="6" fill="#e6ad25" /><rect x="6" y="19" width="16" height="4" fill="#4d555c" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 40 25" className="veh-icon" aria-hidden>
      <rect x="4" y="18" width="18" height="5" rx="2" fill="#1d1f21" />
      <rect x="6" y="10" width="13" height="8" fill={d.tier >= 3 ? '#cfd3d6' : '#e6ad25'} />
      <rect x="15" y="7" width="4" height="4" fill="#2d4a63" />
      <path d="M18 11L29 4L36 14" stroke="#e6ad25" strokeWidth="2.5" fill="none" />
      <path d="M33 14h6l-2 5h-5z" fill="#4d555c" />
    </svg>
  );
}

function VehicleRow({ d, mine, owned, free }: { d: VehicleDef; mine: Building; owned: number; free: number }) {
  const g = useGame();
  const lock = vehicleLock(g, d);
  return (
    <div className={`veh-row${lock ? ' locked' : ''}`}>
      <div className="veh-pic"><VehicleIcon d={d} /></div>
      <div className="grow">
        <div className="veh-name">{d.name} {owned > 0 && <span className="veh-count">×{owned}</span>}</div>
        <div className="muted small">{d.spec} · {d.kind === 'excavator' ? 'digs' : 'hauls'} {fmtNum(d.rate * 60)} t/min{d.selfHaul ? ' (own conveyor)' : ''} · {fmtMoney(d.upkeep)}/s</div>
        {lock && <div className="lock small"><Icon name="lock" size={12} /> {lock}</div>}
      </div>
      <div className="veh-actions">
        <Button small variant="primary" disabled={!!lock || free <= 0 || g.money < d.cost}
          onClick={() => run((s) => A.buyMineVehicle(s, mine.id, d.kind, d.tier), { sound: 'cash', structural: true })}>
          {fmtMoney(d.cost)}
        </Button>
        {owned > 0 && <Button small variant="ghost" onClick={() => run((s) => A.sellMineVehicle(s, mine.id, d.kind, d.tier), { sound: 'cash', structural: true })}>Sell</Button>}
      </div>
    </div>
  );
}

function Mining() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const mines = site.buildings.filter((b) => b.type === 'uranium_mine');
  const [sel, setSel] = useState<number | null>(mines[0]?.id ?? null);
  const mine = mines.find((m) => m.id === sel) ?? mines[0];
  const loc = LOCATION_BY_ID[site.id];
  if (!mine) {
    return (
      <Empty>
        No mine at {loc.name}. {A.buildLockReason(g, 'uranium_mine') ?? ''}
        {!A.buildLockReason(g, 'uranium_mine') && <div><Button small variant="primary" onClick={() => beginBuild('uranium_mine')}>Build an Open-Pit Uranium Mine</Button></div>}
      </Empty>
    );
  }
  const mods = getMods(g, site.id);
  const out = mineOutput(mine, site.id, mods);
  const v = vehiclesOf(mine);
  const excUsed = v.excavators.reduce((a, n) => a + n, 0);
  const trUsed = v.trucks.reduce((a, n) => a + n, 0);
  const excSlots = slotsFor('excavator', mine.level);
  const trSlots = slotsFor('truck', mine.level);
  const bottleneck = out.dig === 0 ? 'Buy an excavator to start digging.' : out.haul < out.dig * 0.95 ? 'Trucks can’t keep up with the diggers — buy more or bigger trucks.' : out.dig < out.haul * 0.95 ? 'Diggers are the bottleneck — buy more or bigger excavators.' : 'Fleet is balanced.';
  return (
    <>
      {mines.length > 1 && (
        <Tabs<string> value={String(mine.id)} onChange={(id) => setSel(Number(id))} tabs={mines.map((m, i) => ({ id: String(m.id), label: `Mine ${i + 1} (L${m.level})` }))} />
      )}
      {mine.status === 'constructing' && <div className="hint-box">The mine is under construction. You can buy vehicles once it opens.</div>}
      <div className="stat-grid">
        <Stat label="Ore delivered" value={`${fmtNum(out.ore * 60)} t/min`} sub={`${loc.oreLabel} ×${loc.oreGrade}`} />
        <Stat label="Dig vs haul" value={`${fmtNum(out.dig * 60)} / ${fmtNum(out.haul * 60)}`} sub="t/min" tone={out.haul < out.dig * 0.95 || out.dig < out.haul * 0.95 ? 'warn' : 'good'} />
      </div>
      <div className={`hint-box${out.dig === 0 || Math.abs(out.dig - out.haul) > out.dig * 0.05 ? ' warn-hint' : ''}`}><Icon name="info" size={15} /> {bottleneck}</div>
      <Section title={`Excavators · ${excUsed}/${excSlots} slots`}>
        {EXCAVATORS.map((d) => <VehicleRow key={d.tier} d={d} mine={mine} owned={v.excavators[d.tier] ?? 0} free={excSlots - excUsed} />)}
      </Section>
      <Section title={`Haul trucks · ${trUsed}/${trSlots} slots`}>
        {TRUCKS.map((d) => <VehicleRow key={d.tier} d={d} mine={mine} owned={v.trucks[d.tier] ?? 0} free={trSlots - trUsed} />)}
      </Section>
      <div className="muted small">Upgrade the mine for more vehicle slots and stockpile space. Vehicles sell back for 50%.</div>
      <Button wide variant="ghost" icon="eye" onClick={() => { useUI.getState().setPanel(null); useUI.getState().select(mine.id); }}>Show mine</Button>
    </>
  );
}

// ── Water ────────────────────────────────────────────────────────────────

function Water() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const st = site.stats;
  const loc = LOCATION_BY_ID[site.id];
  const wells = site.buildings.filter((b) => b.type === 'water_wells').length;
  const evapShort = st.waterFactor < 0.999;
  const treatShort = st.treatedFactor < 0.999;
  const rawLeft = Math.max(0, st.rawSupply - st.rawToTreatment);
  const own = site.buildings.filter((b) => (b.type === 'water_intake' || b.type === 'water_wells') && b.status === 'active');
  return (
    <>
      <div className={`summary-banner ${evapShort || treatShort ? 'bad' : ''}`}>
        <div>
          <div className="muted small">Water balance · {loc.name}</div>
          <div className="big">{evapShort || treatShort ? 'Shortage' : 'OK'}</div>
        </div>
        <div className="grow small">
          {evapShort && <div className="bad">Cooling towers only get {fmtPct(st.waterFactor)} of the make-up water they need — cooling capacity is reduced.</div>}
          {treatShort && <div className="bad">Reactors only get {fmtPct(st.treatedFactor)} of their demineralised water — they are derated.</div>}
          {!evapShort && !treatShort && <div className="muted">All cooling and reactor water needs are met.</div>}
        </div>
      </div>
      <div className="flow">
        <div className="flow-node ok">
          <div className="flow-head"><span className="flow-emoji">🌊</span><div className="grow"><div className="flow-title">Raw water supply</div><div className="muted small">{loc.waterBody ? 'River / sea available' : 'No surface water — wells only'}</div></div>
            <div className="mono">{fmtNum(st.rawSupply)} m³/h</div></div>
          <div className="small muted">Municipal connection {fmtNum(loc.waterBase)} m³/h (paid per m³) · {own.length} own intake/well station{own.length === 1 ? '' : 's'}{!loc.waterBody ? ` · wells ${wells}/6` : ''}</div>
          <div className="row gap wrap">
            {loc.waterBody && <Button small onClick={() => beginBuild('water_intake')}>+ Water Intake</Button>}
            <Button small onClick={() => beginBuild('water_wells')}>+ Wells</Button>
            <Button small onClick={() => beginBuild('water_tank')}>+ Tank</Button>
          </div>
        </div>
        <div className="flow-split">
          <div className={`flow-node ${treatShort ? 'bad' : 'ok'}`}>
            <div className="flow-title">💧 Demineralised water</div>
            <div className="mono small">{fmtNum(st.treatedSupply)} / {fmtNum(st.treatedDemand)} m³/h</div>
            <Bar value={st.treatedFactor} max={1} color={treatShort ? '#ff5a5a' : undefined} />
            <div className="muted small">For reactor coolant and the steam cycle. Uses {fmtNum(st.rawToTreatment)} m³/h of raw water.</div>
            <Button small onClick={() => beginBuild('water_treatment')}>+ Treatment Plant</Button>
          </div>
          <div className={`flow-node ${evapShort ? 'bad' : 'ok'}`}>
            <div className="flow-title">♨️ Cooling evaporation</div>
            <div className="mono small">{fmtNum(st.evaporation)} m³/h lost as vapour</div>
            <Bar value={st.waterFactor} max={1} color={evapShort ? '#ff5a5a' : undefined} />
            <div className="muted small">{fmtNum(rawLeft)} m³/h available after treatment. Wet cooling towers lose water as the steam plume you see.</div>
            {!A.buildLockReason(g, 'cooling_dry') && <Button small onClick={() => beginBuild('cooling_dry')}>+ Dry Cooling (no water)</Button>}
          </div>
        </div>
        <div className="flow-node ok">
          <div className="row-between"><div className="flow-title">🛢️ Storage tanks</div><span className="mono small">{fmtNum(st.tankM3)} / {fmtNum(st.tankCapM3)} m³</span></div>
          <Bar value={st.tankM3} max={Math.max(1, st.tankCapM3)} warn={st.tankCapM3 > 0 && st.tankM3 < st.tankCapM3 * 0.2} />
          <div className="muted small">Tanks fill from surplus and cover short shortages (droughts, clogged intakes, heatwaves).</div>
        </div>
      </div>
      <div className="muted small">Water bill: {fmtMoney(st.waterCost)}/s. Own intakes and wells cost only their upkeep.</div>
      <p className="edu-note">Evaporative cooling towers lose roughly 1.5–2 m³ of water as vapour for every megawatt-hour of waste heat. Reactors also need ultra-pure water to protect the fuel and pipes from corrosion.</p>
    </>
  );
}
