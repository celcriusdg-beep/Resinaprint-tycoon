import { useState } from 'react';
import { ADS_COST, CLERK_WAGE, SHOP_LEVELS, fmt, sealedValue, singleValue } from '../game/economy';
import {
  buyAds, buyDeal, dealName, dealValue, declineOffer, displaySlots, sealedName, setListingPrice, setShelfPrice, shelfSlots,
  singleName, trafficRate, unlist, unshelve, upgradeShop,
} from '../game/sim';
import { act, tryAct, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, Modal, PriceInput, Section } from './common';
import { ProductImage, Slab } from './visuals';

export function ShopScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const lvl = SHOP_LEVELS[g.shopLevel - 1];
  const next = SHOP_LEVELS[g.shopLevel];
  const [edit, setEdit] = useState<{ where: 'shelf' | 'display'; uid: number } | null>(null);
  const shelfItem = edit?.where === 'shelf' ? g.shelf.find((l) => l.uid === edit.uid) : undefined;
  const caseItem = edit?.where === 'display' ? g.display.find((l) => l.uid === edit.uid) : undefined;
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
        <div className="stat"><span>Sold today</span><b>{g.today.sales}</b></div>
        <div className="stat"><span>Reputation</span><b>{Math.round(g.rep)}</b></div>
      </div>

      {g.offers.length > 0 && (
        <Section title="At the counter: someone's selling">
          <div className="offers">
            {g.offers.map((o) => (
              <div className="offer" key={o.id}>
                <div onClick={() => o.what.type === 'single' && useStore.getState().showCard(o.what.cardId)}>
                  {o.what.type === 'single' ? <CardImage id={o.what.cardId} foil={o.what.foil} thumb /> : <ProductImage set={o.what.set} kind={o.what.kind} qty={o.what.qty} />}
                </div>
                <div className="offer-info">
                  <b>{dealName(o)}</b>
                  <span className="muted small">{o.who} asks {fmt(o.price)} · market {fmt(dealValue(g, o))}</span>
                  <div className="row">
                    <Button kind="primary" small disabled={g.cash < o.price} onClick={() => tryAct((s) => buyDeal(s, o.id), 'Bought it.')}>Buy {fmt(o.price)}</Button>
                    <Button kind="ghost" small onClick={() => act((s) => declineOffer(s, o.id))}>No thanks</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Shelves ${g.shelf.length}/${shelfSlots(g)}`} right={<span className="muted small">Stock them from the Stock tab</span>}>
        {g.shelf.length === 0 ? (
          <p className="muted small">Nothing for sale. Go to Stock and put packs or boxes on the shelf with your own price. Customers only buy what's on your shelves.</p>
        ) : (
          <div className="shelf">
            {g.shelf.map((l) => {
              const v = sealedValue(g, l.set, l.kind);
              return (
                <div className="shelf-item" key={l.uid} onClick={() => setEdit({ where: 'shelf', uid: l.uid })}>
                  <ProductImage set={l.set} kind={l.kind} qty={l.qty} />
                  <span className={`tag${l.price > v * 1.3 ? ' hi' : l.price < v * 0.95 ? ' lo' : ''}`}>{fmt(l.price)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={`Display case ${g.display.length}/${displaySlots(g)}`} right={<span className="muted small">Add cards from the Binder</span>}>
        {g.display.length === 0 ? (
          <p className="muted small">Empty. Tap any card in your Binder (or a slab in Grading) → Put in display case.</p>
        ) : (
          <div className="grid4">
            {g.display.map((l) => {
              const v = singleValue(g, l);
              return (
                <div className="slot" key={l.uid} onClick={() => setEdit({ where: 'display', uid: l.uid })}>
                  {l.slab ? <Slab s={{ ...l, slab: l.slab }} small /> : <CardImage id={l.cardId} foil={l.foil} thumb />}
                  <span className={`tag${l.price > v * 1.3 ? ' hi' : l.price < v * 0.95 ? ' lo' : ''}`}>{fmt(l.price)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Customer log">
        <div className="feed">
          {g.feed.slice(0, 16).map((f) => (
            <div key={f.id} className={`feed-row ${f.kind}`}>
              <span>{f.text}</span>
              {f.amount !== undefined && f.kind === 'sale' && <b>+{fmt(f.amount)}</b>}
            </div>
          ))}
          {!g.feed.length && <p className="muted small">The doors are open.</p>}
        </div>
      </Section>

      <Section title="Staff & advertising">
        <div className="row wrap">
          <Button kind={g.clerk ? 'primary' : 'default'} small onClick={() => act((s) => (s.clerk = !s.clerk))}>
            {g.clerk ? 'Clerk hired ✓' : `Hire a clerk (${fmt(CLERK_WAGE)}/day)`}
          </Button>
          <Button small disabled={g.cash < ADS_COST} onClick={() => tryAct(buyAds)}>{g.adsUntil > g.hours ? 'Ads running · extend' : `Run ads (${fmt(ADS_COST)})`}</Button>
        </div>
        <p className="muted small">A clerk sells from your shelves at your prices (half pace) while the app is closed. Ads bring 60% more customers for a shop day.</p>
      </Section>

      {shelfItem && (
        <Modal title={sealedName(shelfItem.set, shelfItem.kind)} onClose={() => setEdit(null)}>
          <div className="edit-listing">
            <ProductImage set={shelfItem.set} kind={shelfItem.kind} big />
            <div>
              <p><b>{shelfItem.qty}</b> on the shelf</p>
              <p className="muted small">Market {fmt(sealedValue(g, shelfItem.set, shelfItem.kind))} each</p>
              <PriceInput value={shelfItem.price} onChange={(v) => act((s) => setShelfPrice(s, shelfItem.uid, v))} />
              <p className="muted small">Most customers pay 0.85–1.35× market. Price low to sell fast and build reputation, high to make more per sale.</p>
              <Button kind="ghost" wide onClick={() => { act((s) => unshelve(s, shelfItem.uid)); setEdit(null); }}>Take off the shelf</Button>
            </div>
          </div>
        </Modal>
      )}
      {caseItem && (
        <Modal title={singleName(caseItem)} onClose={() => setEdit(null)}>
          <div className="edit-listing">
            {caseItem.slab ? <Slab s={{ ...caseItem, slab: caseItem.slab }} /> : <CardImage id={caseItem.cardId} foil={caseItem.foil} />}
            <div>
              <p className="muted small">Market {fmt(singleValue(g, caseItem))}</p>
              <PriceInput value={caseItem.price} onChange={(v) => act((s) => setListingPrice(s, 'display', caseItem.uid, v))} />
              <p className="muted small">Most customers pay 0.85–1.35× market.</p>
              <Button kind="ghost" wide onClick={() => { act((s) => unlist(s, 'display', caseItem.uid)); setEdit(null); }}>Take it out of the case</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
