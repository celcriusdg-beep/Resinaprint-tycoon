import { useState } from 'react';
import { SET_IDS } from '../data/cards';
import { ADS_COST, CLERK_WAGE, SHOP_LEVELS, fmt, rawValue, sealedValue, singleValue } from '../game/economy';
import type { SealedKind, Single } from '../game/types';
import {
  buyAds, buyDeal, dealName, dealValue, declineOffer, displaySlots, sealedCount, sealedName, setListingPrice, setShelfPrice,
  shelfSlots, singleName, trafficRate, unlist, unshelve, upgradeShop,
} from '../game/sim';
import { act, tryAct, useStore } from '../store';
import { isUnlocked, unlockLevel } from '../game/progression';
import { CardImage } from './CardImage';
import { Button, Modal, PriceInput } from './common';
import { CaseSheet, ShelveSheet } from './ShelveSheet';
import { ProductImage, Slab } from './visuals';

const KINDS: SealedKind[] = ['case', 'box', 'pack'];

/** The store, as you'd see it: shelves on the wall, the glass case, the counter. */
export function ShopScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const lvl = SHOP_LEVELS[g.shopLevel - 1];
  const next = SHOP_LEVELS[g.shopLevel];
  const [sheet, setSheet] = useState<
    | { t: 'pickSealed' } | { t: 'pickCard' } | { t: 'shelve'; set: (typeof SET_IDS)[number]; kind: SealedKind }
    | { t: 'case'; s: Single } | { t: 'editShelf'; uid: number } | { t: 'editCase'; uid: number } | null
  >(null);
  const [logOpen, setLogOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const offer = g.offers[0];
  const close = () => setSheet(null);

  const shelfCells = Array.from({ length: shelfSlots(g) }, (_, i) => g.shelf[i] ?? null);
  const caseCells = Array.from({ length: displaySlots(g) }, (_, i) => g.display[i] ?? null);
  const rows: (typeof shelfCells)[] = [];
  for (let i = 0; i < shelfCells.length; i += 3) rows.push(shelfCells.slice(i, i + 3));

  return (
    <div className="screen store">
      <div className="store-sign">
        <div>
          <b>{lvl.name}</b>
          <span>{fmt(g.today.revenue)} today · {g.today.sales} sold · ★ {Math.round(g.rep)}</span>
        </div>
        <span className="open-badge">OPEN</span>
      </div>

      {offer && (
        <div className="counter">
          <div className="counter-who">🧑 <b>{offer.who}</b> is at the counter{g.offers.length > 1 ? ` (+${g.offers.length - 1} waiting)` : ''}</div>
          <div className="counter-body">
            <div className="counter-item" onClick={() => offer.what.type === 'single' && useStore.getState().showCard(offer.what.cardId)}>
              {offer.what.type === 'single' ? <CardImage id={offer.what.cardId} foil={offer.what.foil} thumb /> : <ProductImage set={offer.what.set} kind={offer.what.kind} qty={offer.what.qty} />}
            </div>
            <div className="counter-text">
              <span>"Want to buy my <b>{dealName(offer)}</b>?"</span>
              <span className="ask">Asks <b>{fmt(offer.price)}</b> <i>· worth {fmt(dealValue(g, offer))}</i></span>
              <div className="row">
                <Button kind="primary" small disabled={g.cash < offer.price} onClick={() => tryAct((s) => buyDeal(s, offer.id), 'Bought it.')}>Buy</Button>
                <Button kind="ghost" small onClick={() => act((s) => declineOffer(s, offer.id))}>No thanks</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="wall">
        <div className="wall-title">Shelves <span>{g.shelf.length}/{shelfSlots(g)}</span></div>
        {rows.map((row, r) => (
          <div className="shelf-row" key={r}>
            {row.map((l, i) =>
              l ? (
                <button className="shelf-spot" key={l.uid} onClick={() => setSheet({ t: 'editShelf', uid: l.uid })}>
                  <ProductImage set={l.set} kind={l.kind} qty={l.qty} />
                  <span className={`price-tag${l.price > sealedValue(g, l.set, l.kind) * 1.3 ? ' hi' : ''}`}>{fmt(l.price)}</span>
                </button>
              ) : (
                <button className="shelf-spot empty" key={`e${i}`} onClick={() => setSheet({ t: 'pickSealed' })}>＋<span>Stock</span></button>
              ),
            )}
            <div className="board" />
          </div>
        ))}
      </div>

      <div className="glass-case">
        <div className="wall-title">Display case <span>{g.display.length}/{displaySlots(g)}</span></div>
        <div className="case-grid">
          {caseCells.map((l, i) =>
            l ? (
              <button className="case-spot" key={l.uid} onClick={() => setSheet({ t: 'editCase', uid: l.uid })}>
                {l.slab ? <Slab s={{ ...l, slab: l.slab }} small /> : <CardImage id={l.cardId} foil={l.foil} thumb />}
                <span className={`price-tag${l.price > singleValue(g, l) * 1.3 ? ' hi' : ''}`}>{fmt(l.price)}</span>
              </button>
            ) : (
              <button className="case-spot empty" key={`e${i}`} onClick={() => setSheet({ t: 'pickCard' })}>＋</button>
            ),
          )}
        </div>
      </div>

      <div className="ticker" onClick={() => setLogOpen(true)}>
        {g.feed.slice(0, 3).map((f) => (
          <div key={f.id} className={`feed-row ${f.kind}`}>
            <span>{f.text}</span>
            {f.amount !== undefined && f.kind === 'sale' && <b>+{fmt(f.amount)}</b>}
          </div>
        ))}
        {!g.feed.length && <div className="feed-row">Customers come in about {Math.round(trafficRate(g))} times an hour. Stock your shelves!</div>}
        <span className="more">See all activity ›</span>
      </div>

      <button className="manage-toggle" onClick={() => setManage((v) => !v)}>⚙️ Manage shop {manage ? '▲' : '▼'}</button>
      {manage && (
        <div className="manage">
          {next && (
            <div className="manage-row">
              <div><b>Move to a {next.name}</b><span className="muted small">{next.shelf} shelves · {next.display} case spots · {Math.round(next.traffic / lvl.traffic * 100 - 100)}% more customers · rent {fmt(next.rent)}/day</span></div>
              {isUnlocked(g, `shop:${g.shopLevel + 1}`)
                ? <Button kind="gold" small disabled={g.cash < next.cost} onClick={() => tryAct(upgradeShop)}>{fmt(next.cost)}</Button>
                : <span className="locked-note">🔒 Lv {unlockLevel(`shop:${g.shopLevel + 1}`)}</span>}
            </div>
          )}
          <div className="manage-row">
            <div><b>Clerk</b><span className="muted small">Sells from your shelves at your prices while the app is closed · {fmt(CLERK_WAGE)}/day</span></div>
            {isUnlocked(g, 'clerk')
              ? <Button kind={g.clerk ? 'primary' : 'default'} small onClick={() => act((s) => (s.clerk = !s.clerk))}>{g.clerk ? 'Hired ✓' : 'Hire'}</Button>
              : <span className="locked-note">🔒 Lv {unlockLevel('clerk')}</span>}
          </div>
          <div className="manage-row">
            <div><b>Advertising</b><span className="muted small">60% more customers for a shop day</span></div>
            {isUnlocked(g, 'ads')
              ? <Button small disabled={g.cash < ADS_COST} onClick={() => tryAct(buyAds)}>{g.adsUntil > g.hours ? 'Running · +1 day' : fmt(ADS_COST)}</Button>
              : <span className="locked-note">🔒 Lv {unlockLevel('ads')}</span>}
          </div>
          <p className="muted small">Rent {fmt(lvl.rent)} a day is paid at closing.</p>
        </div>
      )}

      {logOpen && (
        <Modal title="Shop activity" onClose={() => setLogOpen(false)}>
          <div className="feed">
            {g.feed.map((f) => (
              <div key={f.id} className={`feed-row ${f.kind}`}>
                <span>{f.text}</span>
                {f.amount !== undefined && f.kind === 'sale' && <b>+{fmt(f.amount)}</b>}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {sheet?.t === 'pickSealed' && <PickSealed onPick={(set, kind) => setSheet({ t: 'shelve', set, kind })} onClose={close} />}
      {sheet?.t === 'shelve' && <ShelveSheet set={sheet.set} kind={sheet.kind} onClose={close} />}
      {sheet?.t === 'pickCard' && <PickCard onPick={(s) => setSheet({ t: 'case', s })} onClose={close} />}
      {sheet?.t === 'case' && <CaseSheet s={sheet.s} onClose={close} />}
      {sheet?.t === 'editShelf' && <EditShelf uid={sheet.uid} onClose={close} />}
      {sheet?.t === 'editCase' && <EditCase uid={sheet.uid} onClose={close} />}
    </div>
  );
}

function PickSealed({ onPick, onClose }: { onPick: (set: (typeof SET_IDS)[number], kind: SealedKind) => void; onClose: () => void }) {
  const g = useStore((s) => s.g);
  const items = SET_IDS.flatMap((set) => KINDS.filter((k) => sealedCount(g, set, k) > 0).map((kind) => ({ set, kind })));
  return (
    <Modal title="Stock a shelf" onClose={onClose}>
      {items.length === 0 ? (
        <p className="muted">Your back room is empty. Buy packs and boxes on the Market tab.</p>
      ) : (
        <div className="pick-grid">
          {items.map(({ set, kind }) => (
            <button key={set + kind} className="pick" onClick={() => onPick(set, kind)}>
              <ProductImage set={set} kind={kind} qty={sealedCount(g, set, kind)} />
              <span>{sealedName(set, kind)}</span>
              <b>mkt {fmt(sealedValue(g, set, kind))}</b>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function PickCard({ onPick, onClose }: { onPick: (s: Single) => void; onClose: () => void }) {
  const g = useStore((s) => s.g);
  const raw = Object.entries(g.cards)
    .flatMap(([id, [n, f]]) => [n > 0 ? { uid: 0, cardId: id, foil: false } : null, f > 0 ? { uid: 0, cardId: id, foil: true } : null])
    .filter((x): x is Single => !!x);
  const all: Single[] = [...g.slabs, ...raw].sort((a, b) => singleValue(g, b) - singleValue(g, a)).slice(0, 60);
  return (
    <Modal title="Put a card in the case" onClose={onClose}>
      {all.length === 0 ? (
        <p className="muted">No cards yet. Open some packs!</p>
      ) : (
        <div className="pick-cards">
          {all.map((s) => (
            <button key={`${s.uid}-${s.cardId}-${s.foil}`} className="pick" onClick={() => onPick(s)}>
              {s.slab ? <Slab s={{ ...s, slab: s.slab }} small /> : <CardImage id={s.cardId} foil={s.foil} thumb />}
              <b>{fmt(s.slab ? singleValue(g, s) : rawValue(g, s.cardId, s.foil))}</b>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function EditShelf({ uid, onClose }: { uid: number; onClose: () => void }) {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const l = g.shelf.find((x) => x.uid === uid);
  if (!l) return null;
  const v = sealedValue(g, l.set, l.kind);
  return (
    <Modal title={sealedName(l.set, l.kind)} onClose={onClose}>
      <div className="sheet-hero"><ProductImage set={l.set} kind={l.kind} big qty={l.qty} /></div>
      <div className="price-help">
        <div><span>On shelf</span><b>{l.qty}</b></div>
        <div><span>Market</span><b>{fmt(v)}</b></div>
        <div><span>Your price</span><b className={l.price > v * 1.3 ? 'down' : 'up'}>{fmt(l.price)}</b></div>
      </div>
      <PriceInput value={l.price} onChange={(p) => act((s) => setShelfPrice(s, uid, p))} big />
      {sealedCount(g, l.set, l.kind) > 0 && <p className="muted small center">{sealedCount(g, l.set, l.kind)} more in the back room — add them from the Stock tab.</p>}
      <Button kind="ghost" wide onClick={() => { act((s) => unshelve(s, uid)); onClose(); }}>Take off the shelf</Button>
    </Modal>
  );
}

function EditCase({ uid, onClose }: { uid: number; onClose: () => void }) {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const l = g.display.find((x) => x.uid === uid);
  if (!l) return null;
  const v = singleValue(g, l);
  return (
    <Modal title={singleName(l)} onClose={onClose}>
      <div className="sheet-hero card">{l.slab ? <Slab s={{ ...l, slab: l.slab }} /> : <CardImage id={l.cardId} foil={l.foil} />}</div>
      <div className="price-help">
        <div><span>Market</span><b>{fmt(v)}</b></div>
        <div><span>Your price</span><b className={l.price > v * 1.3 ? 'down' : 'up'}>{fmt(l.price)}</b></div>
      </div>
      <PriceInput value={l.price} onChange={(p) => act((s) => setListingPrice(s, 'display', uid, p))} big />
      <Button kind="ghost" wide onClick={() => { act((s) => unlist(s, 'display', uid)); onClose(); }}>Take it out of the case</Button>
    </Modal>
  );
}
