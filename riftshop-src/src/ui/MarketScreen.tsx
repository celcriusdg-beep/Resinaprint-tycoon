import { CARD_BY_ID, CARDS, META, SET_IDS, SETS } from '../data/cards';
import { DAY_HOURS, GRADE_NAMES, ONLINE_FEE, allocation, fmt, marketMult, rawValue, sealedValue, singleValue, wholesale } from '../game/economy';
import type { SealedKind } from '../game/types';
import { buySealed, setListingPrice, unlist } from '../game/sim';
import { act, tryAct, useStore } from '../store';
import { CardImage } from './CardImage';
import { Button, PriceInput, Section } from './common';

const KINDS: { k: SealedKind; label: string }[] = [
  { k: 'pack', label: 'Pack' },
  { k: 'box', label: 'Box (24)' },
  { k: 'case', label: 'Case (6 boxes)' },
];

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
      <Section title="Distributor" right={<span className="muted small">Allocation resets each day</span>}>
        {SET_IDS.slice().reverse().map((set) => (
          <div className="dist-set" key={set}>
            <div className="pack-art" data-set={set}><span>{SETS[set].name}</span></div>
            <div className="dist-rows">
              <b>{SETS[set].name}</b>
              {KINDS.map(({ k, label }) => {
                const left = allocation(set, k) - (g.bought[`${set}:${k}`] ?? 0);
                if (allocation(set, k) === 0) return <div className="dist-row muted small" key={k}>{label}: no allocation for this older set</div>;
                const cost = wholesale(g, set, k);
                return (
                  <div className="dist-row" key={k}>
                    <span>{label}<br /><i className="muted small">mkt {fmt(sealedValue(g, set, k))}{SETS[set].est?.includes(k) ? '*' : ''}</i></span>
                    <span className="cost">{fmt(cost)}</span>
                    <Button small kind="primary" disabled={left <= 0 || g.cash < cost} onClick={() => tryAct((s) => buySealed(s, set, k, 1), `Bought a ${SETS[set].name} ${k}.`)}>Buy</Button>
                    {k === 'pack' && <Button small disabled={left < 10 || g.cash < cost * 10} onClick={() => tryAct((s) => buySealed(s, set, k, 10), `Bought 10 ${SETS[set].name} packs.`)}>×10</Button>}
                    <span className="muted small left">{left} left</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="muted small">Wholesale is about 62% of MSRP ($119.99 a box), more for sets that trade above it. Market prices are TCGplayer's as of {META.pricesDate} and move every shop day. *estimated</p>
      </Section>

      <Section title={`Online listings (${g.online.length})`}>
        {g.online.length === 0 && <p className="muted small">Nothing listed. Tap any card you own → Sell online.</p>}
        {g.online.map((l) => {
          const v = singleValue(g, l);
          return (
            <div className="listing" key={l.uid}>
              <div onClick={() => useStore.getState().showCard(l.cardId)}><CardImage id={l.cardId} foil={l.foil} thumb /></div>
              <div className="listing-info">
                <b>{CARD_BY_ID[l.cardId].name}{l.grade ? ` · ${l.grade} ${GRADE_NAMES[l.grade] ?? ''}` : ''}</b>
                <span className="muted small">market {fmt(v)} · you get {fmt(l.price * (1 - ONLINE_FEE))}</span>
                <div className="row">
                  <PriceInput value={l.price} onChange={(p) => act((s) => setListingPrice(s, 'online', l.uid, p))} />
                  <Button small kind="ghost" onClick={() => act((s) => unlist(s, 'online', l.uid))}>Cancel</Button>
                </div>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Price movers">
        {movers.length === 0 && <p className="muted small">Prices are close to today's real market. They start moving after your first shop day ({DAY_HOURS} hours).</p>}
        {movers.map(({ c, m }) => (
          <div className="mover" key={c.id} onClick={() => useStore.getState().showCard(c.id)}>
            <span>{c.name}</span>
            <span className="muted small">{SETS[c.set].name}</span>
            <b className={m >= 1 ? 'up' : 'down'}>{fmt(rawValue(g, c.id, false))} {m >= 1 ? '▲' : '▼'}{Math.round(Math.abs(m - 1) * 100)}%</b>
          </div>
        ))}
      </Section>
      <p className="credit">{META.source} Riftbound and all card names and images © Riot Games. Unofficial fan project, not endorsed by Riot.</p>
    </div>
  );
}

export function GradingScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const graded = [...g.graded].sort((a, b) => singleValue(g, b) - singleValue(g, a));
  return (
    <div className="screen">
      <Section title="At Rift Grading Co.">
        {g.grading.length === 0 && <p className="muted small">Nothing being graded. Tap a card you own → Grade.</p>}
        {g.grading.map((j) => {
          const left = Math.max(0, j.readyAt - g.hours);
          return (
            <div className="listing" key={j.uid}>
              <CardImage id={j.cardId} foil={j.foil} thumb />
              <div className="listing-info">
                <b>{CARD_BY_ID[j.cardId].name}</b>
                <span className="muted small">back in {left >= DAY_HOURS ? `${(left / DAY_HOURS).toFixed(1)} shop days` : `${left.toFixed(1)} hours`}</span>
              </div>
            </div>
          );
        })}
      </Section>
      <Section title={`Graded slabs (${graded.length})`}>
        {graded.length === 0 && <p className="muted small">Graded cards show up here. Put the 10s in your display case — collectors pay a big premium.</p>}
        <div className="grid3">
          {graded.map((s) => (
            <div className="slot slabbed" key={s.uid} onClick={() => useStore.getState().showCard(s.cardId)}>
              <div className="slab-label"><b>RGC {s.grade}</b><span>{GRADE_NAMES[s.grade!] ?? ''}</span></div>
              <CardImage id={s.cardId} foil={s.foil} thumb />
              <span className="tag">{fmt(singleValue(g, s))}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
