import { CARD_BY_ID, CARDS, META, SET_IDS, SETS } from '../data/cards';
import { DAY_HOURS, ONLINE_FEE, allocation, fmt, marketMult, rawValue, sealedValue, singleValue, wholesale } from '../game/economy';
import { slabTitle } from '../game/grading';
import type { SealedKind } from '../game/types';
import { buyDeal, buySealed, dealName, dealValue, sealedName, setListingPrice, singleName, unlist } from '../game/sim';
import { act, tryAct, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, PriceInput, Section } from './common';
import { ProductImage, Slab } from './visuals';

const KINDS: SealedKind[] = ['pack', 'box', 'case'];

export function MarketScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const movers = CARDS.filter((c) => c.price >= 2)
    .map((c) => ({ c, m: marketMult(g, c) }))
    .filter((x) => Math.abs(x.m - 1) > 0.08)
    .sort((a, b) => Math.abs(b.m - 1) * b.c.price - Math.abs(a.m - 1) * a.c.price)
    .slice(0, 8);
  const sp = g.market.spike;
  return (
    <div className="screen">
      {sp && g.day <= sp.until && (
        <div className="news">🔥 <b>{sp.champion}</b> is dominating the meta — {sp.champion} cards are up {Math.round((sp.factor - 1) * 100)}% until day {sp.until}.</div>
      )}

      <Section title="Deals board" right={<span className="muted small">New deals every shop day</span>}>
        {g.deals.length === 0 && <p className="muted small">You've bought everything. New deals tomorrow.</p>}
        <div className="deals">
          {g.deals.map((d) => {
            const v = dealValue(g, d);
            const pct = Math.round((1 - d.price / v) * 100);
            return (
              <div className="deal" key={d.id}>
                <div onClick={() => d.what.type === 'single' && useStore.getState().showCard(d.what.cardId)}>
                  {d.what.type === 'single' ? <CardImage id={d.what.cardId} foil={d.what.foil} thumb /> : <ProductImage set={d.what.set} kind={d.what.kind} qty={d.what.qty} />}
                </div>
                <b className="deal-name">{dealName(d)}</b>
                <span className="muted small">{d.who}</span>
                <span className="small">market {fmt(v)} · <b className={pct > 0 ? 'up' : 'down'}>{pct > 0 ? `${pct}% under` : `${-pct}% over`}</b></span>
                <Button small kind="primary" disabled={g.cash < d.price} onClick={() => tryAct((s) => buyDeal(s, d.id), 'Bought it.')}>Buy {fmt(d.price)}</Button>
              </div>
            );
          })}
        </div>
        <p className="muted small">Not every deal is a bargain — check the market price before you buy.</p>
      </Section>

      <Section title="Distributor" right={<span className="muted small">Allocation resets each day</span>}>
        {SET_IDS.slice().reverse().map((set) => (
          <div className="dist-set" key={set}>
            <b>{SETS[set].name}</b>
            <div className="dist-grid">
              {KINDS.map((k) => {
                const alloc = allocation(set, k);
                const left = alloc - (g.bought[`${set}:${k}`] ?? 0);
                const cost = wholesale(g, set, k);
                return (
                  <div className="dist-item" key={k}>
                    <ProductImage set={set} kind={k} />
                    <span className="small">{k === 'pack' ? 'Pack' : k === 'box' ? 'Box · 24 packs' : 'Case · 6 boxes'}</span>
                    {alloc === 0 ? (
                      <span className="muted small">Not available</span>
                    ) : (
                      <>
                        <span className="cost">{fmt(cost)}</span>
                        <span className="muted small">mkt {fmt(sealedValue(g, set, k))} · {left} left</span>
                        <div className="row">
                          <Button small kind="primary" disabled={left <= 0 || g.cash < cost} onClick={() => tryAct((s) => buySealed(s, set, k, 1), `Bought ${sealedName(set, k)}.`)}>Buy</Button>
                          {k === 'pack' && <Button small disabled={left < 10 || g.cash < cost * 10} onClick={() => tryAct((s) => buySealed(s, set, k, 10), `Bought 10 ${SETS[set].name} packs.`)}>×10</Button>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="muted small">Wholesale is about 62% of MSRP ($119.99 a box), more for sets that trade above it. Sealed market prices: TCGplayer, {META.sealedDate}; they move every shop day.</p>
      </Section>

      <Section title={`Online listings (${g.online.length})`}>
        {g.online.length === 0 && <p className="muted small">Nothing listed. Tap a card you own → Sell online.</p>}
        {g.online.map((l) => (
          <div className="listing" key={l.uid}>
            <div onClick={() => useStore.getState().showCard(l.cardId)}>{l.slab ? <Slab s={{ ...l, slab: l.slab }} small /> : <CardImage id={l.cardId} foil={l.foil} thumb />}</div>
            <div className="listing-info">
              <b>{singleName(l)}</b>
              <span className="muted small">market {fmt(singleValue(g, l))} · you get {fmt(l.price * (1 - ONLINE_FEE))}</span>
              <div className="row">
                <PriceInput value={l.price} onChange={(p) => act((s) => setListingPrice(s, 'online', l.uid, p))} />
                <Button small kind="ghost" onClick={() => act((s) => unlist(s, 'online', l.uid))}>Cancel</Button>
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Price movers">
        {movers.length === 0 && <p className="muted small">Prices match today's real market. They start moving after your first shop day ({DAY_HOURS} hours).</p>}
        {movers.map(({ c, m }) => (
          <div className="mover" key={c.id} onClick={() => useStore.getState().showCard(c.id)}>
            <span>{c.name}</span>
            <span className="muted small">{SETS[c.set].name}</span>
            <b className={m >= 1 ? 'up' : 'down'}>{fmt(rawValue(g, c.id, false))} {m >= 1 ? '▲' : '▼'}{Math.round(Math.abs(m - 1) * 100)}%</b>
          </div>
        ))}
      </Section>
      <p className="credit">{META.source} Product photos: TCGplayer. Riftbound and all card names and images © Riot Games. PSA and Beckett are trademarks of their owners. Unofficial private fan project.</p>
    </div>
  );
}

export function GradingScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const slabs = [...g.slabs].sort((a, b) => singleValue(g, b) - singleValue(g, a));
  return (
    <div className="screen">
      <Section title={`Submissions (${g.grading.length})`}>
        {g.grading.length === 0 && <p className="muted small">Nothing at the graders. Tap a card you own → Grade it → PSA or Beckett.</p>}
        {g.grading.map((j) => {
          const left = Math.max(0, j.readyAt - g.hours);
          const total = Math.max(0.01, j.readyAt - j.sentAt);
          return (
            <div className="listing" key={j.uid}>
              <CardImage id={j.cardId} foil={j.foil} thumb />
              <div className="listing-info">
                <b>{CARD_BY_ID[j.cardId].name}</b>
                <span className="small"><b className={j.company === 'PSA' ? 'psa-txt' : 'bgs-txt'}>{j.company === 'PSA' ? 'PSA' : 'Beckett'}</b> {j.tier} · back in {left >= DAY_HOURS ? `${(left / DAY_HOURS).toFixed(1)} days` : `${left.toFixed(1)} h`}</span>
                <div className="bar"><div style={{ width: `${(1 - left / total) * 100}%` }} /></div>
              </div>
            </div>
          );
        })}
      </Section>
      <Section title={`Your slabs (${slabs.length})`}>
        {slabs.length === 0 && <p className="muted small">Graded cards come back in PSA or Beckett slabs. High grades sell for a lot more — put them in your display case.</p>}
        <div className="slab-grid">
          {slabs.map((s) => (
            <div key={s.uid} onClick={() => useStore.getState().showCard(s.cardId)}>
              <Slab s={{ ...s, slab: s.slab! }} small />
              <div className="slab-val"><span>{slabTitle(s.slab!)}</span><b>{fmt(singleValue(g, s))}</b></div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
