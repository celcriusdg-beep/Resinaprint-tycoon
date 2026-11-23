import type { Contract, ContractTier, GameState } from '../types';
import { random, pick } from '../rng';
import { BASE_FUEL_PRICE, BASE_PRICE, HOURS_PER_SECOND } from '../constants';
import { companyMods } from '../simulation/modifiers';
import { companyEventEffect, notify, pushLog } from '../events/events';
import { contractSlots } from '../simulation/plant';

const CLIENTS: Record<ContractTier, string[]> = {
  local: ['Westbrook Municipal Utility', 'Hollow Creek Water Works', 'Valley Rail Depot', 'St. Agnes Hospital', 'Millbrook Steel Foundry', 'Pine Ridge Data Hall'],
  regional: ['Northline Rail Authority', 'Cobalt Aluminium Smelter', 'Tri-County Power Cooperative', 'Harbourview Desalination', 'Meridian Cloud Campus'],
  national: ['National Grid Reserve', 'Federal Hydrogen Initiative', 'Continental Rail Network', 'Atlas Semiconductor Fabs'],
  global: ['Trans-Oceanic HVDC Consortium', 'Global Green Hydrogen Alliance', 'Orbital Launch Complex', 'World Compute Exchange'],
};

const TIER_PREMIUM: Record<ContractTier, [number, number]> = {
  local: [1.15, 1.35],
  regional: [1.25, 1.5],
  national: [1.35, 1.65],
  global: [1.5, 2.0],
};

export function totalExport(s: GameState): number {
  return Object.values(s.sites).reduce((a, x) => a + x.stats.exportMW, 0);
}

export function generateOffer(s: GameState): Contract {
  const globalUnlocked = s.research.completed.includes('d_global');
  const tiers: ContractTier[] = ['local'];
  if (s.level >= 5) tiers.push('regional');
  if (s.level >= 11) tiers.push('national');
  if (globalUnlocked) tiers.push('global', 'global');
  const tier = pick(tiers);
  const base = Math.max(4, totalExport(s));
  const sizeFrac = { local: [0.12, 0.3], regional: [0.2, 0.45], national: [0.3, 0.6], global: [0.5, 1.1] }[tier];
  const mw = roundMW(base * (sizeFrac[0] + random() * (sizeFrac[1] - sizeFrac[0])));
  const [pmin, pmax] = TIER_PREMIUM[tier];
  const price = Math.round(BASE_PRICE * companyMods(s).price * (pmin + random() * (pmax - pmin)));
  const duration = Math.round((120 + random() * 300) / 30) * 30 * (tier === 'global' ? 1.5 : 1);
  const required = mw * duration * HOURS_PER_SECOND;
  const value = required * price;
  return {
    id: s.nextContractId++,
    client: pick(CLIENTS[tier]),
    tier,
    mw,
    price,
    duration,
    remaining: duration,
    delivered: 0,
    required,
    penalty: Math.round(value * 0.3),
    bonus: Math.round(value * (tier === 'global' ? 0.25 : 0.12)),
  };
}

function roundMW(mw: number): number {
  if (mw < 10) return Math.max(1, Math.round(mw));
  const mag = Math.pow(10, Math.floor(Math.log10(mw)) - 1);
  return Math.round(mw / mag) * mag;
}

export function tickMarket(s: GameState, dt: number, offline: boolean): void {
  // Slow random walk of the wholesale market, mean-reverting to 1.
  const m = s.market;
  m.trend += (random() - 0.5) * 0.02 * dt - m.trend * 0.02 * dt;
  m.trend = Math.max(-0.05, Math.min(0.05, m.trend));
  m.priceMult += m.trend * dt * 0.05 + (1 - m.priceMult) * 0.004 * dt;
  m.priceMult = Math.max(0.82, Math.min(1.2, m.priceMult));
  m.fuelPrice = BASE_FUEL_PRICE * (0.9 + 0.2 * (m.priceMult - 0.82) / 0.38) * companyEventEffect(s, 'fuelPrice');

  // Active contracts
  for (const c of s.contracts) c.remaining -= dt;
  const done = s.contracts.filter((c) => c.remaining <= 0);
  if (done.length) {
    s.contracts = s.contracts.filter((c) => c.remaining > 0);
    for (const c of done) finishContract(s, c, offline);
  }

  // Offers refresh
  if (offline) return;
  s.nextOfferIn -= dt;
  if (s.nextOfferIn <= 0 || s.offers.length === 0) {
    s.nextOfferIn = 90;
    if (s.offers.length >= 3) s.offers.shift();
    while (s.offers.length < 3) s.offers.push(generateOffer(s));
  }
}

function finishContract(s: GameState, c: Contract, offline: boolean): void {
  const ratio = c.required > 0 ? c.delivered / c.required : 1;
  if (ratio >= 0.9) {
    const bonus = ratio >= 0.999 ? c.bonus : Math.round(c.bonus * 0.5);
    s.money += bonus;
    s.ledger.contracts += bonus;
    s.stats.contractsDone++;
    s.daily.counters.contract++;
    pushLog(s, 'good', `Contract with ${c.client} fulfilled (${Math.round(ratio * 100)}%). Bonus $${bonus.toLocaleString('en-US')}.`);
    if (!offline) notify(s, { kind: 'good', title: 'Contract fulfilled', text: `${c.client} paid a $${bonus.toLocaleString('en-US')} completion bonus.` });
  } else {
    const pen = Math.round(c.penalty * (1 - ratio / 0.9));
    s.money -= pen;
    s.ledger.contracts -= pen;
    pushLog(s, 'bad', `Contract with ${c.client} under-delivered (${Math.round(ratio * 100)}%). Penalty $${pen.toLocaleString('en-US')}.`);
    if (!offline) notify(s, { kind: 'bad', title: 'Contract penalty', text: `Only ${Math.round(ratio * 100)}% delivered to ${c.client}. Penalty $${pen.toLocaleString('en-US')}.` });
  }
}

export function acceptOffer(s: GameState, id: number): string | null {
  const idx = s.offers.findIndex((o) => o.id === id);
  if (idx < 0) return 'Offer no longer available.';
  if (s.contracts.length >= contractSlots(s)) return 'All contract slots are in use. Build an Administration Building or research trading.';
  const [c] = s.offers.splice(idx, 1);
  c.remaining = c.duration;
  c.delivered = 0;
  s.contracts.push(c);
  pushLog(s, 'info', `Signed ${c.mw} MW contract with ${c.client} at $${c.price}/MWh.`);
  return null;
}

export function cancelContract(s: GameState, id: number): string | null {
  const idx = s.contracts.findIndex((c) => c.id === id);
  if (idx < 0) return 'Contract not found.';
  const [c] = s.contracts.splice(idx, 1);
  const pen = Math.round(c.penalty * (c.remaining / c.duration));
  s.money -= pen;
  s.ledger.contracts -= pen;
  pushLog(s, 'warn', `Cancelled contract with ${c.client}. Termination fee $${pen.toLocaleString('en-US')}.`);
  return null;
}
