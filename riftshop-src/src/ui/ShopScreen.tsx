import { useState } from 'react';
import { CARD_BY_ID, SET_IDS, SETS } from '../data/cards';
import { ADS_COST, CLERK_WAGE, SHOP_LEVELS, fmt, sealedValue, singleValue } from '../game/economy';
import { acceptOffer, boxPrice, buyAds, declineOffer, displaySlots, packPrice, sealedCount, setListingPrice, trafficRate, unlist, upgradeShop } from '../game/sim';
import { act, tryAct, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, Modal, PriceInput, Section } from './common';

export function ShopScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const lvl = SHOP_LEVELS[g.shopLevel - 1];
  const next = SHOP_LEVELS[g.shopLevel];
  const [edit, setEdit] = useState<number | null>(null);
  const editing = g.display.find((l) => l.uid === edit);
  const stockedSets = SET_IDS.filter((s) => sealedCount(g, s, 'pack') > 0 || sealedCount(g, s, 'box') > 0);
  return (
    <div className="screen">
      <div className="shop-hero">
        <div>
          <div className="muted small">Your shop</div>
          <div className="big">{lvl.name}</div>
          <div className="muted small">≈{Math.round(trafficRate(g))} customers/hour · rent {fmt(lvl.rent)}/day</div>
        </div>
        {next && <Button kind="gold" small disabled={g.cash < next.cost} onClick={() => tryAct(upgradeShop)}>Move up<br />{fmt(next.cost)}</Button>}
      </div>

      <div className="stat-row">
        <div className="stat"><span>Today's sales</span><b>{fmt(g.today.revenue)}</b></div>
        <div className="stat"><span>Customers served</span><b>{g.today.sales}</b></div>
        <div className="stat"><span>Reputation</span><b>{Math.round(g.rep)}</b></div>
      </div>

      {g.offers.length > 0 && (
        <Section title="Someone wants to sell to you">
          <div className="offers">
            {g.offers.map((o) => {
              const c = CARD_BY_ID[o.cardId];
              const v = singleValue(g, { cardId: o.cardId, foil: o.foil });
              return (
                <div className="offer" key={o.id}>
                  <div onClick={() => useStore.getState().showCard(o.cardId)}><CardImage id={o.cardId} foil={o.foil} thumb /></div>
                  <div className="offer-info">
                    <b>{c.name}</b>
                    <span className="muted small">{o.who} asks {fmt(o.ask)} · market {fmt(v)}</span>
                    <div className="row">
                      <Button kind="primary" small onClick={() => tryAct((s) => acceptOffer(s, o.id), `Bought ${c.name}.`)}>Buy {fmt(o.ask)}</Button>
                      <Button kind="ghost" small onClick={() => act((s) => declineOffer(s, o.id))}>No thanks</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={`Display case ${g.display.length}/${displaySlots(g)}`} right={<span className="muted small">Tap a card in your binder to add it</span>}>
        {g.display.length === 0 ? (
          <p className="muted small">Empty. Open packs, then put your best pulls here — walk-in customers buy singles priced near market.</p>
        ) : (
          <div className="grid4">
            {g.display.map((l) => {
              const v = singleValue(g, l);
              return (
                <div className="slot" key={l.uid} onClick={() => setEdit(l.uid)}>
                  <CardImage id={l.cardId} foil={l.foil} thumb />
                  {l.grade && <span className="slab">{l.grade}</span>}
                  <span className={`tag${l.price > v * 1.25 ? ' hi' : ''}`}>{fmt(l.price)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Shelf prices">
        <Markup label="Packs" value={g.markup.pack} onChange={(v) => act((s) => (s.markup.pack = v))} />
        <Markup label="Booster boxes" value={g.markup.box} onChange={(v) => act((s) => (s.markup.box = v))} />
        {stockedSets.length > 0 && (
          <div className="price-table">
            {stockedSets.map((s) => (
              <div key={s}>
                <b>{SETS[s].name}</b>
                <span>pack {fmt(packPrice(g, s))} <i>(mkt {fmt(sealedValue(g, s, 'pack'))})</i> ×{sealedCount(g, s, 'pack')}</span>
                {sealedCount(g, s, 'box') > 0 && <span>box {fmt(boxPrice(g, s))} <i>(mkt {fmt(sealedValue(g, s, 'box'))})</i> ×{sealedCount(g, s, 'box')}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Staff & advertising">
        <div className="row wrap">
          <Button kind={g.clerk ? 'primary' : 'default'} small onClick={() => act((s) => (s.clerk = !s.clerk))}>
            {g.clerk ? 'Clerk hired ✓' : `Hire a clerk (${fmt(CLERK_WAGE)}/day)`}
          </Button>
          <Button small disabled={g.cash < ADS_COST} onClick={() => tryAct(buyAds)}>{g.adsUntil > g.hours ? 'Ads running · extend' : `Run ads (${fmt(ADS_COST)})`}</Button>
        </div>
        <p className="muted small">A clerk keeps selling (at half pace) while the app is closed. Ads bring 60% more customers for a shop day.</p>
      </Section>

      <Section title="Shop log">
        <div className="feed">
          {g.feed.slice(0, 14).map((f) => (
            <div key={f.id} className={`feed-row ${f.kind}`}>
              <span>{f.text}</span>
              {f.amount !== undefined && f.kind === 'sale' && <b>+{fmt(f.amount)}</b>}
            </div>
          ))}
          {!g.feed.length && <p className="muted small">The doors are open. Customers will start coming in.</p>}
        </div>
      </Section>

      {editing && (
        <Modal title={CARD_BY_ID[editing.cardId].name} onClose={() => setEdit(null)}>
          <div className="edit-listing">
            <CardImage id={editing.cardId} foil={editing.foil} />
            <div>
              <p className="muted small">Market value {fmt(singleValue(g, editing))}{editing.grade ? ` · graded ${editing.grade}` : ''}</p>
              <PriceInput value={editing.price} onChange={(v) => act((s) => setListingPrice(s, 'display', editing.uid, v))} />
              <p className="muted small">Customers pay up to about 1.4× market; most want a fair price.</p>
              <Button kind="ghost" wide onClick={() => { act((s) => unlist(s, 'display', editing.uid)); setEdit(null); }}>Take it out of the case</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Markup({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="markup">
      <span>{label}: <b>{value >= 1 ? '+' : ''}{Math.round((value - 1) * 100)}%</b> vs market</span>
      <input type="range" min={0.8} max={1.6} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="muted small">{value <= 1.02 ? 'Fair prices: customers love it (reputation up).' : value > 1.3 ? 'Expensive: many will walk out.' : 'A normal shop markup.'}</span>
    </label>
  );
}
