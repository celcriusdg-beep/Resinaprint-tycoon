import { useState } from 'react';
import type { SetId } from '../data/cards';
import { fmt, sealedValue, singleValue, wholesale } from '../game/economy';
import type { SealedKind, Single } from '../game/types';
import { listInDisplay, listOnDesk, sealedCount, sealedName, shelveSealed, singleName } from '../game/sim';
import { tryAct, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, Modal, PriceInput, Pct } from './common';
import { ProductImage, Slab } from './visuals';

/** Put sealed product from the back room on the shelf: how many and at what price. */
export function ShelveSheet({ set, kind, onClose }: { set: SetId; kind: SealedKind; onClose: () => void }) {
  const g = useStore((s) => s.g);
  const have = sealedCount(g, set, kind);
  const onShelf = g.shelf.find((l) => l.set === set && l.kind === kind);
  const [qty, setQty] = useState(have);
  const [price, setPrice] = useState(onShelf?.price ?? Math.round(sealedValue(g, set, kind) * 1.1 * 100) / 100);
  const cost = wholesale(g, set, kind);
  const mkt = sealedValue(g, set, kind);
  return (
    <Modal title={`Sell ${sealedName(set, kind)}`} onClose={onClose} footer={
      <Button kind="primary" wide disabled={have <= 0} onClick={() => {
        if (tryAct((s) => shelveSealed(s, set, kind, qty, price), `On the shelf at ${fmt(price)}.`)) onClose();
      }}>Put {qty} on the shelf · {fmt(price)} each</Button>
    }>
      <div className="sheet-hero">
        <ProductImage set={set} kind={kind} big />
      </div>
      <div className="price-help">
        <div><span>Market</span><b>{fmt(mkt)}</b></div>
        <div><span>Distributor</span><b>{fmt(cost)}</b></div>
        <div><span>Your price</span><b className={price > mkt * 1.3 ? 'down' : 'up'}>{fmt(price)} <Pct price={price} value={mkt} /></b></div>
      </div>
      <PriceInput value={price} onChange={setPrice} big />
      <div className="quick-prices">
        {[0.95, 1, 1.1, 1.2, 1.35].map((m) => (
          <button key={m} onClick={() => setPrice(Math.round(mkt * m * 100) / 100)}>{m === 1 ? 'Market' : `${m > 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`}</button>
        ))}
      </div>
      <label className="markup">
        <span>How many: <b>{qty}</b> of {have}</span>
        <input type="range" min={1} max={Math.max(1, have)} value={qty} onChange={(e) => setQty(parseInt(e.target.value))} />
      </label>
      <p className="muted small center">{price > mkt * 1.35 ? 'Too expensive: almost nobody will buy.' : price > mkt * 1.15 ? 'Pricey: only some customers will pay this.' : 'Most customers will happily pay this.'}</p>
    </Modal>
  );
}

/** Put one card (raw or slab) in the display case, or a slab on the slab desk, at your price. */
export function CaseSheet({ s, onClose, desk }: { s: Single; onClose: () => void; desk?: boolean }) {
  const g = useStore((st) => st.g);
  const v = singleValue(g, s);
  const [price, setPrice] = useState(Math.max(0.1, Math.round(v * 1.1 * 100) / 100));
  return (
    <Modal title={singleName(s)} onClose={onClose} footer={
      <Button kind="primary" wide onClick={() => { if (tryAct((st) => (desk ? listOnDesk(st, s, price) : listInDisplay(st, s, price)), desk ? 'On the slab desk.' : 'In the display case.')) onClose(); }}>{desk ? 'Put on the slab desk' : 'Put in the display case'} · {fmt(price)}</Button>
    }>
      <div className="sheet-hero card">{s.slab ? <Slab s={{ ...s, slab: s.slab }} /> : <CardImage id={s.cardId} foil={s.foil} />}</div>
      <div className="price-help">
        <div><span>Market</span><b>{fmt(v)}</b></div>
        <div><span>Your price</span><b className={price > v * 1.3 ? 'down' : 'up'}>{fmt(price)} <Pct price={price} value={v} /></b></div>
      </div>
      <PriceInput value={price} onChange={setPrice} big />
      <div className="quick-prices">
        {[0.95, 1, 1.1, 1.2, 1.35].map((m) => (
          <button key={m} onClick={() => setPrice(Math.max(0.05, Math.round(v * m * 100) / 100))}>{m === 1 ? 'Market' : `${m > 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`}</button>
        ))}
      </div>
    </Modal>
  );
}
