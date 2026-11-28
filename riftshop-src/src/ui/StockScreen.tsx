import { useState } from 'react';
import { CARD_BY_ID, SET_IDS, SETS, preloadCards, type SetId } from '../data/cards';
import { BUYLIST_RATE, fmt, rawValue, sealedValue } from '../game/economy';
import type { SealedKind } from '../game/types';
import { openSealed, sealedCount, sealedName, sellBulk, shelfSlots } from '../game/sim';
import { storageCap, storageUsed } from '../game/shop';
import type { Pull } from '../game/packs';
import { act, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, Section } from './common';
import { ShelveSheet } from './ShelveSheet';
import { ProductImage } from './visuals';

const KINDS: SealedKind[] = ['case', 'box', 'pack'];

export function StockScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [bulkMax, setBulkMax] = useState(0.5);
  const [shelving, setShelving] = useState<{ set: SetId; kind: SealedKind } | null>(null);
  const owned = SET_IDS.filter((s) => KINDS.some((k) => sealedCount(g, s, k) > 0));

  const open = (set: SetId, n: number) => {
    const packs: Pull[][] = [];
    act((s) => {
      for (let i = 0; i < n; i++) {
        const p = openSealed(s, set, 'pack');
        if (p) packs.push(p);
      }
    });
    if (packs.length) {
      // Start downloading the first packs' pictures now, so cards flip in instantly.
      preloadCards(packs.slice(0, 3).flat().map((p) => p.cardId));
      useStore.getState().setOpening({ set, packs });
    }
  };
  const startShelf = (set: SetId, kind: SealedKind) => setShelving({ set, kind });

  const top = Object.entries(g.cards)
    .flatMap(([id, [n, f]]) => [n > 0 ? { id, foil: false, n } : null, f > 0 ? { id, foil: true, n: f } : null])
    .filter((x): x is { id: string; foil: boolean; n: number } => !!x)
    .map((x) => ({ ...x, v: rawValue(g, x.id, x.foil) }))
    .sort((a, b) => b.v - a.v);
  const bulkPreview = top.filter((x) => x.v < bulkMax).reduce((a, x) => a + (x.n - (x.foil ? 0 : 1)) * x.v * BUYLIST_RATE, 0);

  return (
    <div className="screen">
      <Section title="Back room" right={<span className="muted small">Shelves {g.shelf.length}/{shelfSlots(g)}</span>}>
        <BackroomBar />
        {owned.length === 0 && <p className="muted small">No sealed product. Buy from the distributor or the deals board on the Market tab.</p>}
        {owned.map((set) => (
          <div className="sealed-set" key={set}>
            <b>{SETS[set].name}</b>
            {KINDS.filter((k) => sealedCount(g, set, k) > 0).map((kind) => {
              const n = sealedCount(g, set, kind);
              return (
                <div className="sealed-row" key={kind}>
                  <ProductImage set={set} kind={kind} qty={n} />
                  <div className="sealed-info">
                    <span>{sealedName(set, kind, n)}</span>
                    <span className="muted small">market {fmt(sealedValue(g, set, kind))} each</span>
                    <div className="row wrap">
                      <Button small onClick={() => startShelf(set, kind)}>Put on shelf</Button>
                      {kind === 'pack' && <Button kind="primary" small onClick={() => open(set, 1)}>Open</Button>}
                      {kind === 'pack' && n >= 5 && <Button small onClick={() => open(set, Math.min(n, 24))}>Open {Math.min(n, 24)}</Button>}
                      {kind !== 'pack' && <Button kind="primary" small onClick={() => act((s) => openSealed(s, set, kind))}>{kind === 'box' ? 'Open box → 24 packs' : 'Open case → 6 boxes'}</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <p className="muted small">Sell sealed on your shelf for a steady profit, or gamble and open it: most packs are worth less than sealed, but one big hit can pay for a whole box.</p>
      </Section>

      <Section title="Your best cards" right={<span className="muted small">{top.reduce((a, x) => a + x.n, 0)} cards</span>}>
        {top.length === 0 && <p className="muted small">Open some packs!</p>}
        <div className="grid4">
          {top.slice(0, 24).map((x) => (
            <div className="slot" key={x.id + x.foil} onClick={() => useStore.getState().showCard(x.id)}>
              <CardImage id={x.id} foil={x.foil} thumb />
              <span className="tag">{fmt(x.v)}</span>
              {x.n > 1 && <span className="count">×{x.n}</span>}
            </div>
          ))}
        </div>
        {top.length > 0 && <p className="muted small">Tap a card to put it in your display case, sell it online, or send it to PSA or Beckett.</p>}
      </Section>

      <Section title="Sell bulk">
        <label className="markup">
          <span>Sell every copy worth under <b>{fmt(bulkMax)}</b> (keeps one of each for your binder)</span>
          <input type="range" min={0.1} max={5} step={0.1} value={bulkMax} onChange={(e) => setBulkMax(parseFloat(e.target.value))} />
        </label>
        <Button wide disabled={bulkPreview <= 0} onClick={() => {
          const r = act((s) => sellBulk(s, bulkMax, true));
          useStore.getState().say(`Sold ${r.count} cards to a buylist for ${fmt(r.total)}.`);
        }}>Sell bulk for about {fmt(bulkPreview)}</Button>
      </Section>

      {shelving && <ShelveSheet set={shelving.set} kind={shelving.kind} onClose={() => setShelving(null)} />}
    </div>
  );
}

/** Full-screen pack opening: tap to flip each card, rare slots last. */
export function PackOpening() {
  const opening = useStore((s) => s.opening);
  const g = useStore((s) => s.g);
  const [packIdx, setPackIdx] = useState(0);
  const [shown, setShown] = useState(0);
  const [torn, setTorn] = useState(false);
  const [all, setAll] = useState(false);
  if (!opening) return null;
  const pack = opening.packs[packIdx];
  const order = { common: 0, uncommon: 1, rune: 2, rare: 3, foil: 4 };
  const cards = [...pack].sort((a, b) => order[a.slot] - order[b.slot]);
  const done = shown >= cards.length;
  const value = cards.reduce((a, p) => a + rawValue(g, p.cardId, p.foil), 0);
  const totalAll = opening.packs.flat().reduce((a, p) => a + rawValue(g, p.cardId, p.foil), 0);
  const close = () => {
    useStore.getState().setOpening(null);
    setPackIdx(0);
    setShown(0);
    setTorn(false);
    setAll(false);
  };
  const nextPack = () => {
    preloadCards((opening.packs[packIdx + 2] ?? []).map((p) => p.cardId));
    setPackIdx((i) => i + 1);
    setShown(0);
    setTorn(false);
  };
  const current = cards[Math.min(shown, cards.length - 1)];
  const grid = (list: Pull[]) => (
    <div className="summary-grid">
      {list.map((p, i) => (
        <div className="slot" key={i} onClick={() => useStore.getState().showCard(p.cardId)}>
          <CardImage id={p.cardId} foil={p.foil} thumb />
          <span className="tag">{fmt(rawValue(g, p.cardId, p.foil))}</span>
        </div>
      ))}
    </div>
  );
  const byValue = (list: Pull[]) => [...list].sort((a, b) => rawValue(g, b.cardId, b.foil) - rawValue(g, a.cardId, a.foil));
  return (
    <div className="opening">
      <div className="opening-top">
        <span>{SETS[opening.set].name} · pack {packIdx + 1}/{opening.packs.length}</span>
        <button className="x" onClick={close}>✕</button>
      </div>
      {all ? (
        <div className="summary">
          <b>Best pulls from {opening.packs.length} packs</b>
          {grid(byValue(opening.packs.flat()).slice(0, 15))}
          <p>Total value <b>{fmt(totalAll)}</b> ({opening.packs.length * 14} cards)</p>
          <Button kind="primary" onClick={close}>Done</Button>
        </div>
      ) : !torn ? (
        <div className="tear">
          <div className="tear-pack" onClick={() => setTorn(true)}><ProductImage set={opening.set} kind="pack" big /></div>
          <p>Tap the pack to rip it open</p>
          {opening.packs.length > 1 && <Button small kind="ghost" onClick={() => setAll(true)}>Skip to best pulls</Button>}
        </div>
      ) : !done ? (
        <div className="reveal" onClick={() => setShown((n) => n + 1)}>
          <div key={shown} className={`reveal-card ${current.slot === 'rare' || current.slot === 'foil' ? 'big-hit' : ''}`}>
            <CardImage id={current.cardId} foil={current.foil} />
          </div>
          <div className="reveal-info">
            <b>{CARD_BY_ID[current.cardId].name}</b>
            <span>{CARD_BY_ID[current.cardId].rarity}{current.foil && CARD_BY_ID[current.cardId].kind === 'std' ? ' · Foil' : ''} · {fmt(rawValue(g, current.cardId, current.foil))}</span>
          </div>
          <p className="muted small">Tap for the next card ({shown + 1}/{cards.length})</p>
          <Button small kind="ghost" onClick={() => setShown(cards.length)}>Show all</Button>
        </div>
      ) : (
        <div className="summary">
          {grid(byValue(cards))}
          <p>Pack value <b>{fmt(value)}</b>{opening.packs.length > 1 ? <> · all {opening.packs.length} packs <b>{fmt(totalAll)}</b></> : null}</p>
          <div className="row">
            {packIdx + 1 < opening.packs.length ? (
              <>
                <Button kind="primary" onClick={nextPack}>Next pack</Button>
                <Button onClick={() => setAll(true)}>Skip to best pulls</Button>
              </>
            ) : opening.packs.length > 1 ? (
              <Button kind="primary" onClick={() => setAll(true)}>See all hits</Button>
            ) : (
              <Button kind="primary" onClick={close}>Done</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** How full the back room is (packs 1, boxes 24, cases 144). */
export function BackroomBar() {
  const g = useStore((s) => s.g);
  const used = storageUsed(g), cap = storageCap(g);
  return (
    <div className="backroom-bar">
      <div className="row between small"><span className="muted">Back room space</span><b className={used > cap * 0.9 ? 'down' : ''}>{used.toLocaleString('en-US')} / {cap.toLocaleString('en-US')}</b></div>
      <div className="bar"><div style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} /></div>
    </div>
  );
}
