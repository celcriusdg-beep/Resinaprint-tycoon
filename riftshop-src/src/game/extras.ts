import { CARDS, CARD_BY_ID, SETS, type SetId } from '../data/cards';
import { fmt, rawValue, sealedValue, singleValue } from './economy';
import { slabTitle } from './grading';
import { openPack, type Pull } from './packs';
import { addXp, bump, isUnlocked, unlockLevel } from './progression';
import { between, pick, random, weighted } from './rng';
import type { GameState, SealedKind, Single, Slab } from './types';
import { addCard, earn, log, openSealed, returnSingle, sealedCount, sealedName, singleName, spend, takeSingle, trafficRate } from './sim';
import { notify } from './events';

// Raffles and giveaways, pack battles, mystery vaults.

const NAMES = ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Jamie', 'Taylor', 'Quinn', 'Avery', 'Rowan', 'Kai', 'Noah', 'Mia', 'Leo', 'Zoe', 'Eli', 'Ivy'];

/** "+12%", "−5%" or "market": a price compared with what the item is worth. */
export function vsMarket(price: number, value: number): { text: string; tone: 'good' | 'warn' | 'bad' } {
  if (value <= 0) return { text: '', tone: 'good' };
  const pct = Math.round((price / value - 1) * 100);
  const text = pct === 0 ? 'market' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
  return { text, tone: pct > 30 ? 'bad' : pct > 12 ? 'warn' : 'good' };
}

// ── Raffles and giveaways ───────────────────────────────────────────────

export type Prize = { type: 'single'; s: Single } | { type: 'sealed'; set: SetId; kind: SealedKind; qty: number };

export interface Raffle {
  prize: Prize;
  /** 0 = free giveaway. */
  ticket: number;
  tickets: number;
  sold: number;
  endsDay: number;
}

export function prizeName(p: Prize): string {
  return p.type === 'single' ? singleName(p.s) : sealedName(p.set, p.kind, p.qty);
}

export function prizeWorth(g: GameState, p: Prize): number {
  return p.type === 'single' ? singleValue(g, p.s) : sealedValue(g, p.set, p.kind) * p.qty;
}

/** How fast tickets sell: total ticket money compared with the prize's value. */
export function ticketDemand(g: GameState, r: Pick<Raffle, 'prize' | 'ticket' | 'tickets'>): number {
  if (r.ticket <= 0) return 1.5;
  const f = (r.ticket * r.tickets) / Math.max(1, prizeWorth(g, r.prize));
  return Math.max(0.05, Math.min(1.3, 1.6 - 0.7 * f)) * (prizeWorth(g, r.prize) >= 100 ? 1.2 : 1);
}

/** Roughly how many tickets sell in one shop day at this price. */
export function ticketsPerDay(g: GameState, r: Pick<Raffle, 'prize' | 'ticket' | 'tickets'>): number {
  return trafficRate(g) * 0.25 * ticketDemand(g, r) * 2.5 * 12;
}

export function startRaffle(g: GameState, prize: Prize, ticket: number, tickets: number, days: number): string | null {
  if (!isUnlocked(g, 'raffles')) return `Raffles unlock at level ${unlockLevel('raffles')}.`;
  if (g.raffle) return 'A raffle is already running.';
  if (prize.type === 'single') {
    const t = takeSingle(g, prize.s);
    if (!t) return 'You no longer have that.';
    prize = { type: 'single', s: t };
  } else {
    if (sealedCount(g, prize.set, prize.kind) < prize.qty) return 'Not enough of that in the back room.';
    g.sealed[`${prize.set}:${prize.kind}`] = sealedCount(g, prize.set, prize.kind) - prize.qty;
    if (!g.sealed[`${prize.set}:${prize.kind}`]) delete g.sealed[`${prize.set}:${prize.kind}`];
  }
  g.raffle = { prize, ticket: Math.max(0, Math.round(ticket * 100) / 100), tickets: Math.max(1, Math.round(tickets)), sold: 0, endsDay: g.day + days - 1 };
  log(g, 'info', `🎟️ ${ticket > 0 ? `Raffle started: ${tickets} tickets at ${fmt(ticket)}` : 'Free giveaway started'} for ${prizeName(prize)}.`);
  return null;
}

/** Call off a raffle before anyone has bought a ticket: the prize goes back. */
export function cancelRaffle(g: GameState): string | null {
  const r = g.raffle;
  if (!r) return null;
  if (r.sold > 0 && r.ticket > 0) return 'Tickets are already sold — the draw has to happen.';
  if (r.prize.type === 'single') returnSingle(g, r.prize.s);
  else g.sealed[`${r.prize.set}:${r.prize.kind}`] = sealedCount(g, r.prize.set, r.prize.kind) + r.prize.qty;
  g.raffle = null;
  return null;
}

/** Ticket buyers during the shop day. */
export function raffleTick(g: GameState, offline: boolean, step: number): void {
  const r = g.raffle;
  if (!r || r.sold >= r.tickets) return;
  const presence = offline ? (g.clerk ? 0.5 : 0) : 1;
  const buyers = trafficRate(g) * 0.25 * ticketDemand(g, r) * presence * step;
  let n = 0;
  for (let i = 0; i < Math.floor(buyers) + (random() < buyers % 1 ? 1 : 0); i++) n += weighted<number>([[1, 5], [2, 3], [3, 1.5], [5, 1]]);
  n = Math.min(n, r.tickets - r.sold);
  if (n <= 0) return;
  r.sold += n;
  bump(g, 'ticketsSold', n);
  if (r.ticket > 0) earn(g, r.ticket * n, false);
  if (r.sold >= r.tickets) drawRaffle(g);
}

export function drawRaffle(g: GameState): void {
  const r = g.raffle;
  if (!r) return;
  g.raffle = null;
  const worth = prizeWorth(g, r.prize);
  const name = prizeName(r.prize);
  if (r.sold === 0) {
    // Nobody entered: you keep the prize.
    if (r.prize.type === 'single') returnSingle(g, r.prize.s);
    else g.sealed[`${r.prize.set}:${r.prize.kind}`] = sealedCount(g, r.prize.set, r.prize.kind) + r.prize.qty;
    notify(g, '🎟️', 'Raffle cancelled', `Nobody bought a ticket for ${name}, so you kept it. Try a lower ticket price or fewer tickets.`);
    return;
  }
  const winner = pick(NAMES);
  const takings = r.ticket * r.sold;
  const fair = r.ticket <= 0 || takings <= worth * 1.3;
  g.rep = Math.min(100, g.rep + (r.ticket <= 0 ? Math.min(8, 1 + worth / 60) : fair ? 1.5 : 0.3));
  bump(g, 'raffles');
  addXp(g, 50 + Math.round(Math.min(worth, 2000) / 10));
  const text = r.ticket > 0
    ? `${winner} won ${name} (worth ${fmt(worth)}) with one of ${r.sold} tickets. You took in ${fmt(takings)} — ${takings >= worth ? `${fmt(takings - worth)} more` : `${fmt(worth - takings)} less`} than the prize is worth.`
    : `${winner} won ${name} in your free giveaway! ${r.sold} people entered and the shop's reputation went up.`;
  notify(g, '🎉', 'Raffle winner!', text);
  log(g, 'hit', `🎉 ${text}`);
}

/** Free giveaways bring a crowd; paid raffles a few extra people. */
export function raffleTraffic(g: GameState): number {
  if (!g.raffle) return 1;
  return g.raffle.ticket <= 0 ? 1.3 : 1.12;
}

// ── Pack battles ────────────────────────────────────────────────────────

export interface Battle {
  set: SetId;
  packs: number;
  rival: string;
  mine: Pull[];
  theirs: Pull[];
  myTotal: number;
  theirTotal: number;
  won: boolean | null; // null = tie
}

const pullsValue = (g: GameState, ps: Pull[]) => ps.reduce((n, p) => n + rawValue(g, p.cardId, p.foil), 0);

/** You and a challenger each open `packs` packs of a set; the higher total value takes every card. */
export function packBattle(g: GameState, set: SetId, packs: number): Battle | string {
  if (!isUnlocked(g, 'battles')) return `Pack battles unlock at level ${unlockLevel('battles')}.`;
  if (sealedCount(g, set, 'pack') < packs) return `You need ${packs} ${SETS[set].name} packs in the back room.`;
  const mine: Pull[] = [];
  for (let i = 0; i < packs; i++) mine.push(...(openSealed(g, set, 'pack') ?? []));
  const theirs: Pull[] = [];
  for (let i = 0; i < packs; i++) theirs.push(...openPack(set));
  const myTotal = pullsValue(g, mine), theirTotal = pullsValue(g, theirs);
  const won = Math.abs(myTotal - theirTotal) < 0.005 ? null : myTotal > theirTotal;
  const rival = pick(NAMES);
  if (won === true) for (const p of theirs) addCard(g, p.cardId, p.foil);
  if (won === false) for (const p of mine) addCard(g, p.cardId, p.foil, -1);
  bump(g, 'battles');
  if (won) bump(g, 'battlesWon');
  addXp(g, 40 * packs + (won ? 60 * packs : 0));
  g.rep = Math.min(100, g.rep + 0.4);
  log(g, won ? 'hit' : 'info', `⚔️ Pack battle vs ${rival} (${packs} ${SETS[set].name} packs): ${fmt(myTotal)} vs ${fmt(theirTotal)} — ${won === null ? 'a tie, everyone keeps their cards' : won ? 'you won all the cards!' : `${rival} took all the cards.`}`);
  return { set, packs, rival, mine, theirs, myTotal, theirTotal, won };
}

// ── Mystery vaults ──────────────────────────────────────────────────────

export interface VaultDef {
  id: 'starter' | 'collector' | 'grail';
  name: string;
  icon: string;
  price: number;
  level: number;
}

export const VAULTS: VaultDef[] = [
  { id: 'starter', name: 'Starter Vault', icon: '🎁', price: 50, level: 3 },
  { id: 'collector', name: 'Collector Vault', icon: '💼', price: 250, level: 6 },
  { id: 'grail', name: 'Grail Vault', icon: '👑', price: 1_000, level: 9 },
];

/** Hit, as a multiple of the vault price. Pays back about 86% on average: most boxes lose a little, a few win big. */
const VAULT_ODDS: [[number, number], number][] = [
  [[0.1, 0.25], 38], [[0.25, 0.6], 25], [[0.6, 1], 15], [[1, 2], 13], [[2, 4], 6], [[4, 7], 2.3], [[7, 12], 0.7],
];

export const VAULT_TABLE = VAULT_ODDS.map(([[lo, hi], w]) => ({ lo, hi, chance: w / VAULT_ODDS.reduce((n, x) => n + x[1], 0) }));

const SLAB_KINDS: { slab: Omit<Slab, 'cert'> | null; label: string }[] = [
  { slab: null, label: 'raw' },
  { slab: { company: 'PSA', grade: 9 }, label: 'PSA 9' },
  { slab: { company: 'PSA', grade: 10 }, label: 'PSA 10' },
  { slab: { company: 'BGS', grade: 9.5, sub: { centering: 9.5, corners: 9.5, edges: 9.5, surface: 9.5 } }, label: 'BGS 9.5' },
  { slab: { company: 'BGS', grade: 10, sub: { centering: 10, corners: 10, edges: 9.5, surface: 10 } }, label: 'BGS 10' },
  { slab: { company: 'BGS', grade: 10, black: true, sub: { centering: 10, corners: 10, edges: 10, surface: 10 } }, label: 'Black Label' },
];

/** Every card and slab a vault could hold, with today's value. */
function vaultPool(g: GameState): { s: Single; v: number; black: boolean }[] {
  const out: { s: Single; v: number; black: boolean }[] = [];
  for (const c of CARDS) {
    if (c.price < 1) continue;
    const foil = c.kind !== 'std';
    for (const k of SLAB_KINDS) {
      if (k.slab && c.price < 3) continue;
      const s: Single = { uid: 0, cardId: c.id, foil, slab: k.slab ? { ...k.slab, cert: 0 } as Slab : undefined };
      out.push({ s, v: singleValue(g, s), black: !!k.slab?.black });
    }
  }
  return out;
}

export interface VaultResult {
  vault: VaultDef;
  item: Single;
  value: number;
}

/** Buy and open a mystery vault: one card or slab, at least 10% of the price, rarely up to 12×. */
export function openVault(g: GameState, id: VaultDef['id']): VaultResult | string {
  const vault = VAULTS.find((v) => v.id === id)!;
  if (!isUnlocked(g, `vault:${vault.id}`)) return `${vault.name}s unlock at level ${unlockLevel(`vault:${vault.id}`)}.`;
  if (g.cash < vault.price) return 'Not enough cash.';
  spend(g, vault.price);
  const [lo, hi] = weighted(VAULT_ODDS);
  const target = vault.price * between(lo, hi);
  const pool = vaultPool(g);
  // Black Labels only show up as the big hits.
  const near = pool.filter((x) => x.v >= target * 0.85 && x.v <= target * 1.18 && (!x.black || lo >= 4));
  const blacks = near.filter((x) => x.black);
  const choice = (lo >= 7 && blacks.length ? pick(blacks) : near.length ? pick(near) : null)
    ?? pool.reduce((a, b) => (Math.abs(b.v - target) < Math.abs(a.v - target) ? b : a));
  let item: Single;
  if (choice.s.slab) {
    item = { uid: g.nextUid++, cardId: choice.s.cardId, foil: choice.s.foil, slab: { ...choice.s.slab, cert: 30_000_000 + Math.floor(random() * 69_999_999) } };
    g.slabs.push(item);
  } else {
    addCard(g, choice.s.cardId, choice.s.foil);
    item = { uid: 0, cardId: choice.s.cardId, foil: choice.s.foil };
  }
  const value = singleValue(g, item);
  bump(g, 'vaultsOpened');
  if (value >= vault.price * 4) bump(g, 'vaultGrails');
  addXp(g, Math.round(vault.price / 5));
  log(g, value >= vault.price ? 'hit' : 'info', `${vault.icon} ${vault.name}: ${CARD_BY_ID[item.cardId].name}${item.slab ? ` · ${slabTitle(item.slab)}` : ''} worth ${fmt(value)} (${(value / vault.price).toFixed(1)}×).`);
  return { vault, item, value };
}
