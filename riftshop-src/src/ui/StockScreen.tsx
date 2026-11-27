import { useState } from 'react';
import { CARD_BY_ID, SET_IDS, SETS, type SetId } from '../data/cards';
import { BUYLIST_RATE, fmt, rawValue } from '../game/economy';
import type { SealedKind } from '../game/types';
import { openSealed, sealedCount, sellBulk } from '../game/sim';
import type { Pull } from '../game/packs';
import { act, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, Section } from './common';

export function StockScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [bulkMax, setBulkMax] = useState(0.5);
  const owned = SET_IDS.filter((s) => (['pack', 'box', 'case'] as SealedKind[]).some((k) => sealedCount(g, s, k) > 0));

  const open = (set: SetId, n: number) => {
    const packs: Pull[][] = [];
    act((s) => {
      for (let i = 0; i < n; i++) {
        const p = openSealed(s, set, 'pack');
        if (p) packs.push(p);
      }
    });
    if (packs.length) useStore.getState().setOpening({ set, packs });
  };

  const top = Object.entries(g.cards)
    .flatMap(([id, [n, f]]) => [n > 0 ? { id, foil: false, n } : null, f > 0 ? { id, foil: true, n: f } : null])
    .filter((x): x is { id: string; foil: boolean; n: number } => !!x)
    .map((x) => ({ ...x, v: rawValue(g, x.id, x.foil) }))
    .sort((a, b) => b.v - a.v);
  const bulkPreview = top.filter((x) => x.v < bulkMax).reduce((a, x) => a + (x.n - (x.foil ? 0 : 1)) * x.v * BUYLIST_RATE, 0);

  return (
    <div className="screen">
      <Section title="Sealed stock">
        {owned.length === 0 && <p className="muted small">No sealed product. Buy packs, boxes or cases from the distributor on the Market tab.</p>}
        {owned.map((set) => (
          <div className="sealed-set" key={set}>
            <div className="pack-art" data-set={set}><span>{SETS[set].name}</span></div>
            <div className="sealed-info">
              <b>{SETS[set].name}</b>
              <div className="row wrap">
                {sealedCount(g, set, 'case') > 0 && (
                  <Button small onClick={() => act((s) => openSealed(s, set, 'case'))}>Open case ({sealedCount(g, set, 'case')}) → 6 boxes</Button>
                )}
                {sealedCount(g, set, 'box') > 0 && (
                  <Button small onClick={() => act((s) => openSealed(s, set, 'box'))}>Open box ({sealedCount(g, set, 'box')}) → 24 packs</Button>
                )}
              </div>
              {sealedCount(g, set, 'pack') > 0 && (
                <div className="row wrap">
                  <span className="muted small">{sealedCount(g, set, 'pack')} packs</span>
                  <Button kind="primary" small onClick={() => open(set, 1)}>Open a pack</Button>
                  {sealedCount(g, set, 'pack') >= 5 && <Button small onClick={() => open(set, 5)}>Open 5</Button>}
                  {sealedCount(g, set, 'pack') >= 24 && <Button small onClick={() => open(set, 24)}>Open 24</Button>}
                </div>
              )}
            </div>
          </div>
        ))}
        <p className="muted small">Sealed packs and boxes on your shelf sell to customers at your shelf price. Opening them is a gamble: some boxes are worth far more opened, most are worth less.</p>
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
        <p className="muted small">Buylists pay {Math.round(BUYLIST_RATE * 100)}% of market. Valuable cards sell better in your display case or online.</p>
      </Section>
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
  const close = () => {
    useStore.getState().setOpening(null);
    setPackIdx(0);
    setShown(0);
    setTorn(false);
    setAll(false);
  };
  const nextPack = () => {
    setPackIdx((i) => i + 1);
    setShown(0);
    setTorn(false);
  };
  const totalAll = opening.packs.flat().reduce((a, p) => a + rawValue(g, p.cardId, p.foil), 0);
  const current = cards[Math.min(shown, cards.length - 1)];
  return (
    <div className="opening">
      <div className="opening-top">
        <span>{SETS[opening.set].name} · pack {packIdx + 1}/{opening.packs.length}</span>
        <button className="x" onClick={close}>✕</button>
      </div>
      {all ? (
        <div className="summary">
          <b>Best pulls from {opening.packs.length} packs</b>
          <div className="summary-grid">
            {opening.packs.flat().sort((a, b) => rawValue(g, b.cardId, b.foil) - rawValue(g, a.cardId, a.foil)).slice(0, 15).map((p, i) => (
              <div className="slot" key={i} onClick={() => useStore.getState().showCard(p.cardId)}>
                <CardImage id={p.cardId} foil={p.foil} thumb />
                <span className="tag">{fmt(rawValue(g, p.cardId, p.foil))}</span>
              </div>
            ))}
          </div>
          <p>Total value <b>{fmt(totalAll)}</b> ({opening.packs.length * 14} cards)</p>
          <Button kind="primary" onClick={close}>Done</Button>
        </div>
      ) : !torn ? (
        <div className="tear" onClick={() => setTorn(true)}>
          <div className="pack-art big" data-set={opening.set}><span>{SETS[opening.set].name}</span></div>
          <p>Tap to open</p>
          {opening.packs.length > 1 && (
            <Button small kind="ghost" onClick={() => setAll(true)}>Skip to best pulls</Button>
          )}
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
          <div className="summary-grid">
            {[...cards].sort((a, b) => rawValue(g, b.cardId, b.foil) - rawValue(g, a.cardId, a.foil)).map((p, i) => (
              <div className="slot" key={i} onClick={() => useStore.getState().showCard(p.cardId)}>
                <CardImage id={p.cardId} foil={p.foil} thumb />
                <span className="tag">{fmt(rawValue(g, p.cardId, p.foil))}</span>
              </div>
            ))}
          </div>
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
