import { useMemo, useState } from 'react';
import { CARD_BY_ID, SET_IDS, SETS, kindLabel, setCards, type SetId } from '../data/cards';
import { BUYLIST_RATE, GRADE_NAMES, GRADE_TIERS, ONLINE_FEE, fmt, marketMult, rawValue, singleValue } from '../game/economy';
import { displaySlots, listInDisplay, listOnline, rawCount, sellToBuylist, sendToGrading } from '../game/sim';
import type { GradeTier, Single } from '../game/types';
import { act, tryAct, useStore } from '../store';
import { CardImage, RARITY_COLOR } from './CardImage';
import { Button, Modal, PriceInput } from './common';

type Filter = 'all' | 'owned' | 'missing';

export function BinderScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  // Open on the set you own the most of.
  const [set, setSet] = useState<SetId>(() => {
    const n: Record<string, number> = {};
    for (const id of Object.keys(g.seen)) n[CARD_BY_ID[id].set] = (n[CARD_BY_ID[id].set] ?? 0) + 1;
    return (Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] as SetId) ?? 'VEN';
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [showcase, setShowcase] = useState(false);
  const all = useMemo(() => setCards(set), [set]);
  const list = all.filter((c) => (showcase ? c.kind !== 'std' : c.kind === 'std'))
    .filter((c) => filter === 'all' || (filter === 'owned' ? !!g.seen[c.id] : !g.seen[c.id]));
  const base = all.filter((c) => c.kind === 'std');
  const have = base.filter((c) => g.seen[c.id]).length;
  return (
    <div className="screen">
      <div className="set-tabs">
        {SET_IDS.map((s) => (
          <button key={s} className={s === set ? 'on' : ''} onClick={() => setSet(s)}>{SETS[s].name}</button>
        ))}
      </div>
      <div className="binder-head">
        <div>
          <b>{SETS[set].name}</b>
          <div className="muted small">{have}/{base.length} cards collected · {all.filter((c) => c.kind !== 'std' && g.seen[c.id]).length} showcase</div>
          <div className="bar"><div style={{ width: `${(have / Math.max(1, base.length)) * 100}%` }} /></div>
        </div>
        <div className="seg">
          {(['all', 'owned', 'missing'] as Filter[]).map((f) => <button key={f} className={f === filter ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}
          <button className={showcase ? 'on gold' : ''} onClick={() => setShowcase((v) => !v)}>✦</button>
        </div>
      </div>
      <div className="grid3">
        {list.map((c) => {
          const n = (g.cards[c.id]?.[0] ?? 0) + (g.cards[c.id]?.[1] ?? 0);
          return (
            <div className="slot" key={c.id} onClick={() => useStore.getState().showCard(c.id)}>
              <CardImage id={c.id} thumb dim={!g.seen[c.id]} />
              <span className="tag">{fmt(rawValue(g, c.id, false))}</span>
              {n > 0 && <span className="count">×{n}</span>}
              {!g.seen[c.id] && <span className="code">{c.code.split('/')[0]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Card details and everything you can do with your copies. */
export function CardModal() {
  const id = useStore((s) => s.cardId);
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [action, setAction] = useState<{ s: Single; mode: 'display' | 'online' | 'grade' } | null>(null);
  const [price, setPrice] = useState(0);
  const [tier, setTier] = useState<GradeTier>('standard');
  if (!id) return null;
  const c = CARD_BY_ID[id];
  const close = () => { setAction(null); useStore.getState().showCard(null); };
  const trend = marketMult(g, c);
  const copies: { s: Single; label: string }[] = [];
  for (const foil of [false, true]) {
    if (rawCount(g, id, foil) > 0) copies.push({ s: { uid: 0, cardId: id, foil }, label: `${foil && c.kind === 'std' ? 'Foil' : 'Raw'} ×${rawCount(g, id, foil)}` });
  }
  for (const gr of g.graded.filter((x) => x.cardId === id)) copies.push({ s: gr, label: `Graded ${gr.grade} · ${GRADE_NAMES[gr.grade!] ?? ''}` });
  const begin = (s: Single, mode: 'display' | 'online' | 'grade') => {
    setAction({ s, mode });
    setPrice(Math.max(0.1, Math.round(singleValue(g, s) * (mode === 'display' ? 1.1 : 1) * 100) / 100));
  };
  return (
    <Modal title={c.name} onClose={close}>
      <div className="card-detail">
        <CardImage id={id} foil={c.kind !== 'std'} />
        <div className="cd-info">
          <span className="pill" style={{ background: RARITY_COLOR[c.rarity] }}>{c.rarity}</span>
          {c.kind !== 'std' && <span className="pill gold">{kindLabel(c.kind)}</span>}
          <div className="muted small">{SETS[c.set].name} · {c.code} · {c.type}{c.domains.length ? ` · ${c.domains.join('/')}` : ''}</div>
          <div className="price-big">{fmt(rawValue(g, id, false))}</div>
          <div className="muted small">
            Real TCGplayer price {fmt(c.price)}{c.est ? ' (estimated)' : ''} · in-game market {trend >= 1 ? '+' : ''}{Math.round((trend - 1) * 100)}%
            {c.kind === 'std' && <> · foil {fmt(rawValue(g, id, true))}</>}
          </div>
        </div>
      </div>
      {copies.length === 0 && <p className="muted small center">You don't own this card yet.</p>}
      {!action && copies.map(({ s, label }) => (
        <div className="copy-row" key={`${s.uid}-${s.foil}`}>
          <div><b>{label}</b><div className="muted small">worth {fmt(singleValue(g, s))}</div></div>
          <div className="row wrap">
            <Button small onClick={() => begin(s, 'display')} disabled={g.display.length >= displaySlots(g)}>Display</Button>
            <Button small onClick={() => begin(s, 'online')}>Sell online</Button>
            {!s.grade && <Button small onClick={() => begin(s, 'grade')}>Grade</Button>}
            <Button small kind="ghost" onClick={() => {
              const v = act((st) => sellToBuylist(st, s));
              if (v > 0) useStore.getState().say(`Sold to a buylist for ${fmt(v)}.`);
            }}>Sell now {fmt(singleValue(g, s) * BUYLIST_RATE)}</Button>
          </div>
        </div>
      ))}
      {action && action.mode !== 'grade' && (
        <div className="action-box">
          <b>{action.mode === 'display' ? 'Put it in your display case' : 'List it on the online marketplace'}</b>
          <PriceInput value={price} onChange={setPrice} />
          <p className="muted small">
            Market {fmt(singleValue(g, action.s))}.{' '}
            {action.mode === 'online' ? `Sells in a day or two near market; fees ${Math.round(ONLINE_FEE * 100)}% (you get ${fmt(price * (1 - ONLINE_FEE))}).` : 'Walk-in customers pay up to about 1.4× market.'}
          </p>
          <div className="row">
            <Button kind="primary" onClick={() => {
              const ok = tryAct((st) => (action.mode === 'display' ? listInDisplay(st, action.s, price) : listOnline(st, action.s, price)), action.mode === 'display' ? 'In the display case.' : 'Listed online.');
              if (ok) setAction(null);
            }}>Confirm</Button>
            <Button kind="ghost" onClick={() => setAction(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {action && action.mode === 'grade' && (
        <div className="action-box">
          <b>Send to Rift Grading Co.</b>
          <div className="tiers">
            {(Object.keys(GRADE_TIERS) as GradeTier[]).map((t) => (
              <button key={t} className={t === tier ? 'on' : ''} onClick={() => setTier(t)}>
                <b>{GRADE_TIERS[t].name}</b><span>{fmt(GRADE_TIERS[t].fee)} · {GRADE_TIERS[t].label}</span>
              </button>
            ))}
          </div>
          <p className="muted small">Pack-fresh cards usually grade 8–9. A Gem Mint 10 is worth about 3× raw (3.5× for chase cards); a 7 or lower is worth less than raw.</p>
          <div className="row">
            <Button kind="primary" onClick={() => { if (tryAct((st) => sendToGrading(st, action.s, tier), 'Sent for grading.')) setAction(null); }}>Send ({fmt(GRADE_TIERS[tier].fee)})</Button>
            <Button kind="ghost" onClick={() => setAction(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
