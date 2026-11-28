import { useMemo, useState } from 'react';
import { CARD_BY_ID, RARITY_ORDER, SET_IDS, SETS, kindLabel, setCards, type SetId } from '../data/cards';
import { BUYLIST_RATE, ONLINE_FEE, fmt, marketMult, rawValue, singleValue } from '../game/economy';
import { COMPANIES, slabTitle } from '../game/grading';
import { displaySlots, listInDisplay, listOnline, rawCount, sellToBuylist, sendToGrading } from '../game/sim';
import type { Company, Single } from '../game/types';
import { Slab } from './visuals';
import { act, tryAct, useStore } from '../store';
import { CardImage, RARITY_COLOR } from './CardImage';
import { Button, Modal, PriceInput } from './common';

type Filter = 'all' | 'owned' | 'missing';
type Sort = 'number' | 'value-desc' | 'value-asc' | 'name' | 'rarity' | 'owned';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'number', label: 'Card number' },
  { id: 'value-desc', label: 'Value: high → low' },
  { id: 'value-asc', label: 'Value: low → high' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'owned', label: 'Most owned' },
];

const SORT_KEY = 'riftshop-binder-sort';

export function BinderScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  // Open on the set you own the most of.
  const [set, setSet] = useState<SetId | 'ALL'>(() => {
    const n: Record<string, number> = {};
    for (const id of Object.keys(g.seen)) n[CARD_BY_ID[id].set] = (n[CARD_BY_ID[id].set] ?? 0) + 1;
    return (Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] as SetId) ?? 'VEN';
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [showcase, setShowcase] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSortState] = useState<Sort>(() => {
    try { return (localStorage.getItem(SORT_KEY) as Sort) || 'number'; } catch { return 'number'; }
  });
  const setSort = (v: Sort) => { setSortState(v); try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ } };
  const all = useMemo(() => (set === 'ALL' ? SET_IDS.flatMap((s) => setCards(s)) : setCards(set)), [set]);
  const owned = (id: string) => (g.cards[id]?.[0] ?? 0) + (g.cards[id]?.[1] ?? 0);
  const value = (id: string) => rawValue(g, id, false);
  const q = query.trim().toLowerCase();
  const list = all
    .filter((c) => (showcase ? c.kind !== 'std' : c.kind === 'std'))
    .filter((c) => filter === 'all' || (filter === 'owned' ? owned(c.id) > 0 : !g.seen[c.id]))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    .sort((a, b) => {
      switch (sort) {
        case 'value-desc': return value(b.id) - value(a.id);
        case 'value-asc': return value(a.id) - value(b.id);
        case 'name': return a.name.localeCompare(b.name);
        case 'rarity': return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || value(b.id) - value(a.id);
        case 'owned': return owned(b.id) - owned(a.id) || value(b.id) - value(a.id);
        default: return SET_IDS.indexOf(a.set) - SET_IDS.indexOf(b.set) || a.n - b.n || a.code.localeCompare(b.code);
      }
    });
  const base = all.filter((c) => c.kind === 'std');
  const have = base.filter((c) => g.seen[c.id]).length;
  const ownedValue = list.reduce((t, c) => t + (g.cards[c.id]?.[0] ?? 0) * rawValue(g, c.id, false) + (g.cards[c.id]?.[1] ?? 0) * rawValue(g, c.id, true), 0);
  return (
    <div className="screen">
      <div className="set-tabs">
        <button className={set === 'ALL' ? 'on' : ''} onClick={() => setSet('ALL')}>All sets</button>
        {SET_IDS.map((s) => (
          <button key={s} className={s === set ? 'on' : ''} onClick={() => setSet(s)}>{SETS[s].name}</button>
        ))}
      </div>
      <div className="binder-head">
        <div>
          <b>{set === 'ALL' ? 'All sets' : SETS[set].name}</b>
          <div className="muted small">{have}/{base.length} cards collected · {all.filter((c) => c.kind !== 'std' && g.seen[c.id]).length} showcase</div>
          <div className="bar"><div style={{ width: `${(have / Math.max(1, base.length)) * 100}%` }} /></div>
        </div>
        <div className="seg">
          {(['all', 'owned', 'missing'] as Filter[]).map((f) => <button key={f} className={f === filter ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}
          <button className={showcase ? 'on gold' : ''} onClick={() => setShowcase((v) => !v)} aria-label="Showcase printings">✦</button>
        </div>
      </div>
      <div className="binder-tools">
        <input className="search" type="search" placeholder="Search name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="muted small">{list.length} cards{ownedValue > 0 ? ` · your copies worth ${fmt(ownedValue)}` : ''}</div>
      <div className="grid3">
        {list.map((c) => {
          const n = owned(c.id);
          return (
            <div className="slot" key={c.id} onClick={() => useStore.getState().showCard(c.id)}>
              <CardImage id={c.id} thumb dim={!g.seen[c.id]} />
              <span className="tag">{fmt(value(c.id))}</span>
              {n > 0 && <span className="count">×{n}</span>}
              {!g.seen[c.id] && <span className="code">{c.code.split('/')[0]}</span>}
            </div>
          );
        })}
        {list.length === 0 && <p className="muted small">No cards match.</p>}
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
  const [company, setCompany] = useState<Company>('PSA');
  const [tier, setTier] = useState('regular');
  if (!id) return null;
  const c = CARD_BY_ID[id];
  const close = () => { setAction(null); useStore.getState().showCard(null); };
  const trend = marketMult(g, c);
  const copies: { s: Single; label: string }[] = [];
  for (const foil of [false, true]) {
    if (rawCount(g, id, foil) > 0) copies.push({ s: { uid: 0, cardId: id, foil }, label: `${foil && c.kind === 'std' ? 'Foil' : 'Raw'} ×${rawCount(g, id, foil)}` });
  }
  for (const sl of g.slabs.filter((x) => x.cardId === id)) copies.push({ s: sl, label: slabTitle(sl.slab!) });
  const begin = (s: Single, mode: 'display' | 'online' | 'grade') => {
    setAction({ s, mode });
    setPrice(Math.max(0.1, Math.round(singleValue(g, s) * (mode === 'display' ? 1.1 : 1) * 100) / 100));
  };
  const pickCompany = (co: Company) => { setCompany(co); setTier(COMPANIES[co].tiers[1].id); };
  const t = COMPANIES[company].tiers.find((x) => x.id === tier) ?? COMPANIES[company].tiers[1];
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
          {s.slab && <div className="copy-slab"><Slab s={{ ...s, slab: s.slab }} small /></div>}
          <div><b>{label}</b><div className="muted small">worth {fmt(singleValue(g, s))}</div></div>
          <div className="row wrap">
            <Button small kind="primary" onClick={() => begin(s, 'display')} disabled={g.display.length >= displaySlots(g)}>Put in display case</Button>
            <Button small onClick={() => begin(s, 'online')}>Sell online</Button>
            {!s.slab && <Button small kind="gold" onClick={() => begin(s, 'grade')}>Grade it</Button>}
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
          <span>Your price</span>
          <PriceInput value={price} onChange={setPrice} />
          <p className="muted small">
            Market {fmt(singleValue(g, action.s))}.{' '}
            {action.mode === 'online' ? `Sells in a day or two near market; fees ${Math.round(ONLINE_FEE * 100)}% (you get ${fmt(price * (1 - ONLINE_FEE))}).` : 'Customers who come in pay 0.85–1.35× market.'}
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
          <b>Send for grading</b>
          <div className="companies">
            {(['PSA', 'BGS'] as Company[]).map((co) => (
              <button key={co} className={`co ${co.toLowerCase()}${co === company ? ' on' : ''}`} onClick={() => pickCompany(co)}>
                <b>{co === 'PSA' ? 'PSA' : 'BECKETT'}</b><span>{COMPANIES[co].full}</span>
              </button>
            ))}
          </div>
          <p className="muted small">{COMPANIES[company].blurb}</p>
          <div className="tiers">
            {COMPANIES[company].tiers.map((x) => (
              <button key={x.id} className={x.id === t.id ? 'on' : ''} onClick={() => setTier(x.id)}>
                <b>{x.name}</b><span>{fmt(x.fee)} · {x.days} day{x.days > 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
          <p className="muted small">The grade is luck of the draw. Worth {fmt(singleValue(g, action.s))} raw — a {company === 'PSA' ? 'PSA 10' : 'BGS 9.5'} would be about {fmt(singleValue(g, { ...action.s, slab: company === 'PSA' ? { company: 'PSA', grade: 10, cert: 0 } : { company: 'BGS', grade: 9.5, cert: 0 } }))}, a {company === 'PSA' ? 'PSA 7' : 'BGS 8'} about {fmt(singleValue(g, { ...action.s, slab: company === 'PSA' ? { company: 'PSA', grade: 7, cert: 0 } : { company: 'BGS', grade: 8, cert: 0 } }))}.</p>
          <div className="row">
            <Button kind="primary" onClick={() => { if (tryAct((st) => sendToGrading(st, action.s, company, t.id), `Sent to ${company}.`)) setAction(null); }}>Send to {company} ({fmt(t.fee)})</Button>
            <Button kind="ghost" onClick={() => setAction(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
