import { useState } from 'react';
import { CARD_BY_ID, SET_IDS, SETS, type SetId } from '../data/cards';
import { fmt, rawValue, sealedValue, singleValue } from '../game/economy';
import {
  VAULTS, VAULT_TABLE, cancelRaffle, openVault, packBattle, prizeName, prizeWorth, startRaffle, ticketsPerDay,
  type Battle, type Prize, type VaultResult,
} from '../game/extras';
import { slabTitle } from '../game/grading';
import type { Pull } from '../game/packs';
import { isUnlocked, unlockLevel } from '../game/progression';
import { sealedCount } from '../game/sim';
import type { SealedKind, Single } from '../game/types';
import { act, tryAct, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, Modal, Pct, PriceInput, Section } from './common';
import { Chips } from './EventsSheet';
import { ProductImage, Slab } from './visuals';

function PrizeImage({ p }: { p: Prize }) {
  if (p.type === 'sealed') return <ProductImage set={p.set} kind={p.kind} qty={p.qty} />;
  return p.s.slab ? <Slab s={{ ...p.s, slab: p.s.slab }} small /> : <CardImage id={p.s.cardId} foil={p.s.foil} thumb />;
}

// ── Raffles ─────────────────────────────────────────────────────────────

export function RafflePanel() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [picking, setPicking] = useState(false);
  const [free, setFree] = useState(false);
  const [tickets, setTickets] = useState(25);
  const [ticket, setTicket] = useState(5);
  const [days, setDays] = useState(1);

  if (!isUnlocked(g, 'raffles')) return <p className="muted small">🔒 Raffles and giveaways unlock at level {unlockLevel('raffles')}.</p>;

  const r = g.raffle;
  if (r) {
    const worth = prizeWorth(g, r.prize);
    return (
      <div className="piece">
        <div className="raffle-head">
          <div className="raffle-prize"><PrizeImage p={r.prize} /></div>
          <div>
            <b>{r.ticket > 0 ? '🎟️ Raffle' : '🎁 Free giveaway'}: {prizeName(r.prize)}</b>
            <span className="muted small">worth {fmt(worth)} · draw at closing {r.endsDay === g.day ? 'today' : `on day ${r.endsDay}`}</span>
          </div>
        </div>
        <div className="row between small"><span>{r.ticket > 0 ? 'Tickets sold' : 'Entries'}</span><b>{r.sold} / {r.tickets}</b></div>
        <div className="bar big"><div style={{ width: `${(r.sold / r.tickets) * 100}%` }} /></div>
        {r.ticket > 0 && <span className="small">Taken in so far: <b className={r.ticket * r.sold >= worth ? 'up' : ''}>{fmt(r.ticket * r.sold)}</b> <Pct price={r.ticket * r.sold} value={worth} moreIsBetter /> vs the prize's value</span>}
        {(r.sold === 0 || r.ticket <= 0) && <Button kind="ghost" small onClick={() => tryAct(cancelRaffle, 'Raffle called off — prize returned.')}>Call it off</Button>}
      </div>
    );
  }

  const worth = prize ? prizeWorth(g, prize) : 0;
  const price = free ? 0 : ticket;
  const plan = prize ? { prize, ticket: price, tickets } : null;
  const perDay = plan ? ticketsPerDay(g, plan) : 0;
  const expSold = Math.min(tickets, Math.round(perDay * days));
  /** A ticket price that adds up to about 1.25× the prize when every ticket sells. */
  const fairTicket = (w: number, n: number) => {
    const raw = (w * 1.25) / n;
    return raw < 2 ? Math.max(0.1, Math.round(raw * 20) / 20) : Math.round(raw * 4) / 4;
  };
  /** The most tickets that will likely sell out before the draw, at a fair price (at least $0.50 each). */
  const suggest = (p: Prize, d: number) => {
    const w = prizeWorth(g, p);
    const n = [200, 100, 50, 25, 10].find((x) => fairTicket(w, x) >= 0.5 && ticketsPerDay(g, { prize: p, ticket: fairTicket(w, x), tickets: x }) * d >= x * 0.95) ?? 10;
    setTickets(n);
    setTicket(fairTicket(w, n));
  };
  const pickPrize = (p: Prize) => {
    setPrize(p);
    setPicking(false);
    suggest(p, days);
  };
  return (
    <div className="piece">
      <span className="muted small">Put up a prize, sell tickets all day, and draw a winner at closing. Total ticket money above the prize's value is your profit — ask too much and tickets don't sell, but the prize still goes. A free giveaway costs you the prize but brings a crowd and lots of reputation.</span>
      <button className="raffle-pick" onClick={() => setPicking(true)}>
        {prize ? <><div className="raffle-prize"><PrizeImage p={prize} /></div><span><b>{prizeName(prize)}</b><i className="muted small">worth {fmt(worth)} · tap to change</i></span></>
          : <span>＋ <b>Choose a prize</b> <i className="muted small">a slab, a card or sealed product</i></span>}
      </button>
      <Chips label="Type" value={free ? 1 : 0} options={[0, 1]} fmt={(v) => (v ? '🎁 Free giveaway' : '🎟️ Paid raffle')} onPick={(v) => setFree(!!v)} />
      <Chips label={free ? 'Entries' : 'Tickets'} value={tickets} options={[10, 25, 50, 100, 200]} fmt={(v) => String(v)} onPick={(v) => { setTickets(v); if (prize) setTicket(fairTicket(worth, v)); }} />
      {!free && (
        <>
          <div className="row between"><span>Ticket price</span>{prize && <span className="muted small">all sold = {fmt(ticket * tickets)} <Pct price={ticket * tickets} value={worth} moreIsBetter /></span>}</div>
          <PriceInput value={ticket} onChange={setTicket} />
        </>
      )}
      <Chips label="Draw at closing" value={days} options={[1, 2]} fmt={(v) => (v === 1 ? 'today' : 'tomorrow')} onPick={(v) => { setDays(v); if (prize && !free) suggest(prize, v); }} />
      {prize && (
        <div className="price-help">
          <div><span>Expected {free ? 'entries' : 'sold'}</span><b>{expSold}/{tickets}</b></div>
          <div><span>Prize</span><b>{fmt(worth)}</b></div>
          <div><span>{free ? 'Cost' : 'Expected take'}</span><b className={free ? '' : expSold * price >= worth ? 'up' : 'down'}>{free ? fmt(worth) : fmt(expSold * price)}</b></div>
        </div>
      )}
      <Button kind="gold" wide disabled={!prize} onClick={() => { if (prize && tryAct((s) => startRaffle(s, prize, price, tickets, days), free ? 'Giveaway started!' : 'Raffle started!')) setPrize(null); }}>
        {free ? 'Start the giveaway' : 'Start the raffle'}
      </Button>
      {picking && <PickPrize onPick={pickPrize} onClose={() => setPicking(false)} />}
    </div>
  );
}

function PickPrize({ onPick, onClose }: { onPick: (p: Prize) => void; onClose: () => void }) {
  const g = useStore((s) => s.g);
  const slabs = [...g.slabs].sort((a, b) => singleValue(g, b) - singleValue(g, a));
  const cards: Single[] = Object.entries(g.cards)
    .flatMap(([id, [n, f]]) => [n > 0 ? { uid: 0, cardId: id, foil: false } : null, f > 0 ? { uid: 0, cardId: id, foil: true } : null])
    .filter((x): x is Single => !!x && rawValue(g, x.cardId, x.foil) >= 2)
    .sort((a, b) => rawValue(g, b.cardId, b.foil) - rawValue(g, a.cardId, a.foil))
    .slice(0, 40);
  const sealed = SET_IDS.flatMap((set) => (['case', 'box', 'pack'] as SealedKind[]).filter((k) => sealedCount(g, set, k) > 0).map((kind) => ({ set, kind })));
  return (
    <Modal title="Choose a prize" onClose={onClose}>
      {sealed.length > 0 && <h3 className="build-h">Sealed</h3>}
      <div className="pick-cards">
        {sealed.flatMap(({ set, kind }) => (kind === 'pack' ? [1, 3, 5, 10].filter((q) => q <= sealedCount(g, set, kind)) : [1]).map((qty) => (
          <button key={set + kind + qty} className="pick" onClick={() => onPick({ type: 'sealed', set, kind, qty })}>
            <ProductImage set={set} kind={kind} qty={qty} />
            <b>{fmt(sealedValue(g, set, kind) * qty)}</b>
          </button>
        )))}
      </div>
      {slabs.length > 0 && <h3 className="build-h">Slabs</h3>}
      <div className="pick-cards">
        {slabs.map((s) => (
          <button key={s.uid} className="pick" onClick={() => onPick({ type: 'single', s })}>
            <Slab s={{ ...s, slab: s.slab! }} small />
            <b>{fmt(singleValue(g, s))}</b>
          </button>
        ))}
      </div>
      {cards.length > 0 && <h3 className="build-h">Cards</h3>}
      <div className="pick-cards">
        {cards.map((s) => (
          <button key={s.cardId + s.foil} className="pick" onClick={() => onPick({ type: 'single', s })}>
            <CardImage id={s.cardId} foil={s.foil} thumb />
            <b>{fmt(rawValue(g, s.cardId, s.foil))}</b>
          </button>
        ))}
      </div>
      {!sealed.length && !slabs.length && !cards.length && <p className="muted">Nothing to give away yet.</p>}
    </Modal>
  );
}

// ── Pack battles ────────────────────────────────────────────────────────

export function BattlePanel() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const sets = SET_IDS.filter((s) => sealedCount(g, s, 'pack') > 0);
  const [set, setSet] = useState<SetId | null>(sets[0] ?? null);
  const [packs, setPacks] = useState(1);
  const [result, setResult] = useState<Battle | null>(null);
  if (!isUnlocked(g, 'battles')) return <p className="muted small">🔒 Pack battles unlock at level {unlockLevel('battles')}.</p>;
  const cur = set && sets.includes(set) ? set : sets[0] ?? null;
  const fight = () => {
    if (!cur) return;
    const r = act((s) => packBattle(s, cur, packs));
    if (typeof r === 'string') useStore.getState().say(r, true);
    else setResult(r);
  };
  return (
    <div className="piece">
      <span className="muted small">You and a challenger each open the same packs. Whoever pulls the higher total value takes <b>every</b> card from both sides.</span>
      {sets.length === 0 ? <span className="muted small">You need booster packs in the back room to battle.</span> : (
        <>
          <div className="chips">{sets.map((s) => <button key={s} className={s === cur ? 'on' : ''} onClick={() => setSet(s)}>{SETS[s].name} ({sealedCount(g, s, 'pack')})</button>)}</div>
          <Chips label="Packs each" value={packs} options={[1, 3, 5]} fmt={(v) => `${v} pack${v > 1 ? 's' : ''}`} onPick={setPacks} />
          <Button kind="gold" wide disabled={!cur || sealedCount(g, cur, 'pack') < packs} onClick={fight}>⚔️ Battle!</Button>
        </>
      )}
      {result && <BattleResult b={result} onAgain={() => { setResult(null); fight(); }} onClose={() => setResult(null)} />}
    </div>
  );
}

function topHits(g: ReturnType<typeof useStore.getState>['g'], ps: Pull[]): Pull[] {
  return [...ps].sort((a, b) => rawValue(g, b.cardId, b.foil) - rawValue(g, a.cardId, a.foil)).slice(0, 4);
}

function BattleResult({ b, onAgain, onClose }: { b: Battle; onAgain: () => void; onClose: () => void }) {
  const g = useStore((s) => s.g);
  const canAgain = sealedCount(g, b.set, 'pack') >= b.packs;
  const side = (title: string, ps: Pull[], total: number, win: boolean) => (
    <div className={`battle-side${win ? ' win' : ''}`}>
      <b>{title}</b>
      <span className="battle-total">{fmt(total)}</span>
      <div className="battle-hits">
        {topHits(g, ps).map((p, i) => (
          <div key={i}><CardImage id={p.cardId} foil={p.foil} thumb /><span>{fmt(rawValue(g, p.cardId, p.foil))}</span></div>
        ))}
      </div>
    </div>
  );
  return (
    <Modal title={`⚔️ ${b.packs} ${SETS[b.set].name} pack${b.packs > 1 ? 's' : ''} each`} onClose={onClose} footer={
      <div className="row">
        <Button kind="primary" wide disabled={!canAgain} onClick={onAgain}>Battle again</Button>
        <Button kind="ghost" onClick={onClose}>Done</Button>
      </div>
    }>
      <div className={`battle-banner ${b.won === null ? 'tie' : b.won ? 'won' : 'lost'}`}>
        {b.won === null ? 'Tie! Everyone keeps their cards.' : b.won ? `You win! All ${b.mine.length + b.theirs.length} cards are yours.` : `${b.rival} wins and takes all the cards.`}
      </div>
      <div className="battle">
        {side('You', b.mine, b.myTotal, b.won === true)}
        <div className="vs">VS</div>
        {side(b.rival, b.theirs, b.theirTotal, b.won === false)}
      </div>
    </Modal>
  );
}

// ── Mystery vaults ──────────────────────────────────────────────────────

export function VaultsSection() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [result, setResult] = useState<VaultResult | null>(null);
  const [odds, setOdds] = useState(false);
  const open = (id: (typeof VAULTS)[number]['id']) => {
    const r = act((s) => openVault(s, id));
    if (typeof r === 'string') useStore.getState().say(r, true);
    else setResult(r);
  };
  return (
    <Section title="🎁 Mystery vaults" right={<button className="link" onClick={() => setOdds((v) => !v)}>{odds ? 'Hide odds' : 'Odds'}</button>}>
      <p className="muted small">Online hit boxes: one card or slab per vault, worth at least 10% of the price — or up to 12×, Black Labels included. On average they pay back a bit less than they cost.</p>
      {odds && (
        <div className="odds">
          {VAULT_TABLE.map((t) => <div key={t.lo}><span>{t.lo}×–{t.hi}× the price</span><b>{(t.chance * 100).toFixed(1)}%</b></div>)}
        </div>
      )}
      <div className="vaults">
        {VAULTS.map((v) => {
          const locked = !isUnlocked(g, `vault:${v.id}`);
          return (
            <div key={v.id} className={`vault v-${v.id}${locked ? ' locked' : ''}`}>
              <span className="vault-icon">{v.icon}</span>
              <b>{v.name}</b>
              <span className="small">{fmt(v.price * 0.1)} – {fmt(v.price * 12)}</span>
              {locked ? <span className="locked-note">🔒 Lv {unlockLevel(`vault:${v.id}`)}</span>
                : <Button kind="gold" small disabled={g.cash < v.price} onClick={() => open(v.id)}>{fmt(v.price)}</Button>}
            </div>
          );
        })}
      </div>
      {result && <VaultReveal r={result} onAgain={() => { const id = result.vault.id; setResult(null); open(id); }} onClose={() => setResult(null)} />}
    </Section>
  );
}

function VaultReveal({ r, onAgain, onClose }: { r: VaultResult; onAgain: () => void; onClose: () => void }) {
  const g = useStore((s) => s.g);
  const [shown, setShown] = useState(false);
  const x = r.value / r.vault.price;
  const c = CARD_BY_ID[r.item.cardId];
  return (
    <Modal title={`${r.vault.icon} ${r.vault.name}`} onClose={onClose} footer={shown ? (
      <div className="row">
        <Button kind="primary" wide disabled={g.cash < r.vault.price} onClick={onAgain}>Open another · {fmt(r.vault.price)}</Button>
        <Button kind="ghost" onClick={onClose}>Done</Button>
      </div>
    ) : undefined}>
      {!shown ? (
        <button className={`vault-box v-${r.vault.id}`} onClick={() => setShown(true)}>
          <span className="vault-icon big">{r.vault.icon}</span>
          <b>Tap to open</b>
        </button>
      ) : (
        <div className={`vault-reveal${x >= 4 ? ' grail' : x >= 1 ? ' win' : ''}`}>
          <div className="vault-item">{r.item.slab ? <Slab s={{ ...r.item, slab: r.item.slab }} /> : <CardImage id={r.item.cardId} foil={r.item.foil} />}</div>
          <b className="vault-name">{c.name}{r.item.slab ? ` · ${slabTitle(r.item.slab)}` : r.item.foil && c.kind === 'std' ? ' (foil)' : ''}</b>
          <span className="vault-value">{fmt(r.value)}</span>
          <span className={`vault-x${x >= 1 ? ' up' : ''}`}>{x.toFixed(x < 1 ? 2 : 1)}× the price{x >= 4 ? ' — what a hit!' : x >= 1 ? ' — profit!' : ''}</span>
          <span className="muted small">{r.item.slab ? 'It’s with your slabs on the Grading tab.' : 'It’s in your binder.'}</span>
        </div>
      )}
    </Modal>
  );
}
