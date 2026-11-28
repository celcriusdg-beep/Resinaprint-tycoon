import { useState } from 'react';
import { SET_IDS, SETS, type SetId } from '../data/cards';
import { CLERK_WAGE, fmt, sealedValue } from '../game/economy';
import {
  LISTER_ONLINE_CAP, STAFF, TOURNEYS, activeEvent, autoList, canHost, cancelTournament, expectedPlayers, hire, hostTournament, launchToday, nextReleaseIn,
  preorder, preorderLimit, preorderPrice, preordered, prizeValue, seats, tourneyToday, type StaffId, type TourneyKind,
} from '../game/events';
import { isUnlocked, unlockLevel } from '../game/progression';
import { sealedCount } from '../game/sim';
import { act, tryAct, useStore } from '../store';
import { Button, Modal, PriceInput } from './common';
import { ProductImage } from './visuals';

/** Strip at the top of the shop: today's event, tournament and launch. */
export function EventBanner({ onOpen }: { onOpen: () => void }) {
  const g = useStore((s) => s.g);
  const ev = activeEvent(g);
  const t = tourneyToday(g);
  const launch = launchToday(g);
  const items: string[] = [];
  if (launch) items.push(`🚀 ${SETS[launch].name} launch day!`);
  if (t) items.push(`${TOURNEYS[t.kind].icon} ${TOURNEYS[t.kind].name} today`);
  else if (g.tournament) items.push(`${TOURNEYS[g.tournament.kind].icon} ${TOURNEYS[g.tournament.kind].name} tomorrow`);
  if (ev) items.push(`${ev.icon} ${ev.title}`);
  if (g.release && !launch) items.push(`📦 ${SETS[g.release.set].name} launch in ${g.release.day - g.day} day${g.release.day - g.day > 1 ? 's' : ''} · pre-order`);
  if (!items.length) return null;
  return (
    <button className="event-banner" onClick={onOpen}>
      {items.map((x) => <span key={x}>{x}</span>)}
    </button>
  );
}

/** Hire and configure staff (all optional — they automate things you can do yourself). */
export function StaffSheet({ onClose }: { onClose: () => void }) {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const ids = Object.keys(STAFF) as StaffId[];
  return (
    <Modal title="👥 Staff" onClose={onClose}>
      <p className="muted small">Staff are optional: they do jobs for you, for a daily wage paid at closing.</p>
      <div className="staff-row">
        <span className="tile-icon">🧑‍💼</span>
        <div><b>Clerk · ${CLERK_WAGE}/day</b><span className="muted small">Keeps selling from your shelves at your prices while the app is closed.</span></div>
        {isUnlocked(g, 'clerk')
          ? <Button kind={g.clerk ? 'primary' : 'default'} small onClick={() => act((s) => (s.clerk = !s.clerk))}>{g.clerk ? 'Hired ✓' : 'Hire'}</Button>
          : <span className="locked-note">🔒 Lv {unlockLevel('clerk')}</span>}
      </div>
      {ids.map((id) => {
        const d = STAFF[id];
        const on = !!g.staff[id];
        return (
          <div key={id} className="staff-block">
            <div className="staff-row">
              <span className="tile-icon">{d.icon}</span>
              <div><b>{d.name} · ${d.wage}/day</b><span className="muted small">{d.text}</span></div>
              {isUnlocked(g, d.unlock)
                ? <Button kind={on ? 'primary' : 'default'} small onClick={() => tryAct((s) => hire(s, id, !on), on ? `${d.name} let go.` : `${d.name} hired!`)}>{on ? 'Hired ✓' : 'Hire'}</Button>
                : <span className="locked-note">🔒 Lv {unlockLevel(d.unlock)}</span>}
            </div>
            {on && id === 'lister' && (
              <>
                <Chips label="List cards worth up to" value={g.staffCfg.listMax} options={[2, 5, 10, 20, 50, 100, 250]} fmt={(v) => `$${v}`} onPick={(v) => act((s) => { s.staffCfg.listMax = v; autoList(s); })} />
                <Chips label="Asking price" value={g.staffCfg.listMarkup} options={[0.9, 0.95, 1, 1.05, 1.1, 1.2]} fmt={(v) => (v === 1 ? 'market' : `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`)} onPick={(v) => act((s) => (s.staffCfg.listMarkup = v))} />
                <Chips label="Keep one of each card for your binder" value={g.staffCfg.listKeepOne ? 1 : 0} options={[1, 0]} fmt={(v) => (v ? 'Yes' : 'No, sell all')} onPick={(v) => act((s) => { s.staffCfg.listKeepOne = !!v; autoList(s); })} />
                {isUnlocked(g, 'online') && (
                  <Chips label={`Also list online when the case is full (up to ${LISTER_ONLINE_CAP}, cards $1+)`} value={g.staffCfg.listOnline ? 1 : 0} options={[1, 0]} fmt={(v) => (v ? 'Yes' : 'No')} onPick={(v) => act((s) => { s.staffCfg.listOnline = !!v; autoList(s); })} />
                )}
                <span className="muted small chips-note">Checks every shop hour. Slabs and anything worth more than your limit stay with you. Cards customers asked for are kept for their requests.</span>
              </>
            )}
            {on && id === 'buyer' && (
              <Chips label="Buy offers asking at most" value={g.staffCfg.buyerMax} options={[0.5, 0.6, 0.65, 0.7, 0.8]} fmt={(v) => `${Math.round(v * 100)}%`} onPick={(v) => act((s) => (s.staffCfg.buyerMax = v))} />
            )}
            {on && id === 'pricer' && (
              <Chips label="Price everything at market" value={g.staffCfg.markup} options={[1, 1.05, 1.1, 1.2, 1.3]} fmt={(v) => `+${Math.round((v - 1) * 100)}%`} onPick={(v) => act((s) => (s.staffCfg.markup = v))} />
            )}
          </div>
        );
      })}
    </Modal>
  );
}

function Chips({ label, value, options, fmt: f, onPick }: { label: string; value: number; options: number[]; fmt: (v: number) => string; onPick: (v: number) => void }) {
  return (
    <div className="chips-row">
      <span className="muted small">{label}</span>
      <div className="chips">{options.map((o) => <button key={o} className={o === value ? 'on' : ''} onClick={() => onPick(o)}>{f(o)}</button>)}</div>
    </div>
  );
}

/** Tournaments, launches and what's happening today. */
export function EventsSheet({ onClose }: { onClose: () => void }) {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const ev = activeEvent(g);
  return (
    <Modal title="📅 Events" onClose={onClose}>
      {ev && (
        <div className="event-card">
          <span className="tile-icon big">{ev.icon}</span>
          <div><b>{ev.title}</b><span className="muted small">{g.event?.text || ev.text}</span></div>
        </div>
      )}
      <h3 className="build-h">🏆 Tournaments</h3>
      <TournamentPanel />
      <h3 className="build-h">📦 Launches</h3>
      <PreorderCard />
    </Modal>
  );
}

function TournamentPanel() {
  const g = useStore((s) => s.g);
  const kinds = Object.keys(TOURNEYS) as TourneyKind[];
  const firstOpen = kinds.filter((k) => !canHost(g, k)).pop() ?? kinds.filter((k) => isUnlocked(g, TOURNEYS[k].unlock)).pop() ?? 'casual';
  const [kind, setKind] = useState<TourneyKind>(firstOpen);
  const [fee, setFee] = useState(TOURNEYS[firstOpen].fee);
  const packSets = SET_IDS.filter((s) => sealedCount(g, s, 'pack') > 0);
  const [prizeSet, setPrizeSet] = useState<SetId | null>(packSets[0] ?? null);
  const [packs, setPacks] = useState(0);

  if (g.tournament) {
    const t = g.tournament;
    const d = TOURNEYS[t.kind];
    return (
      <div className="piece">
        <div className="piece-head"><span className="tile-icon big">{d.icon}</span><div><b>{d.name}</b><span className="muted small">{t.day === g.day ? 'Today — players are in the shop' : 'Tomorrow'} · entry {fmt(t.fee)}{t.prize ? ` · prizes: ${t.prize.packs} ${SETS[t.prize.set].name} packs` : ''}</span></div></div>
        <span className="small">Expected about <b>{Math.min(seats(g), Math.round(expectedPlayers(g, t)))}</b> players ({seats(g)} seats).</span>
        {t.day > g.day && <Button kind="ghost" small onClick={() => act(cancelTournament)}>Cancel (prizes go back)</Button>}
      </div>
    );
  }

  const prize = prizeSet && packs > 0 ? { set: prizeSet, packs } : null;
  const plan = { kind, fee, prize };
  const exp = expectedPlayers(g, plan);
  const players = Math.min(seats(g), Math.round(exp));
  const err = canHost(g, kind);
  return (
    <div className="piece">
      <div className="chips">
        {kinds.map((k) => (
          <button key={k} className={k === kind ? 'on' : ''} disabled={!isUnlocked(g, TOURNEYS[k].unlock)} onClick={() => { setKind(k); setFee(TOURNEYS[k].fee); }}>
            {TOURNEYS[k].icon} {TOURNEYS[k].name}{!isUnlocked(g, TOURNEYS[k].unlock) ? ` 🔒${unlockLevel(TOURNEYS[k].unlock)}` : ''}
          </button>
        ))}
      </div>
      <span className="muted small">Held tomorrow at your play tables. Players pay the entry fee, buy packs and singles all day, and the winning deck’s champion goes up in price. Needs {TOURNEYS[kind].minTables} table star{TOURNEYS[kind].minTables > 1 ? 's' : ''}.</span>
      <div className="row between"><span>Entry fee</span><span className="muted small">usual {fmt(TOURNEYS[kind].fee)}</span></div>
      <PriceInput value={fee} onChange={setFee} />
      <div className="row between"><span>Prize packs</span><span className="muted small">{prize ? `worth ${fmt(prizeValue(g, plan))}` : 'none'}</span></div>
      {packSets.length ? (
        <>
          <div className="chips">{packSets.map((s) => <button key={s} className={s === prizeSet ? 'on' : ''} onClick={() => { setPrizeSet(s); setPacks(Math.min(packs, sealedCount(g, s, 'pack'))); }}>{SETS[s].name} ({sealedCount(g, s, 'pack')})</button>)}</div>
          <div className="stepper">
            <button onClick={() => setPacks((p) => Math.max(0, p - 1))}>−</button>
            <b>{packs} pack{packs === 1 ? '' : 's'}</b>
            <button onClick={() => setPacks((p) => Math.min(prizeSet ? sealedCount(g, prizeSet, 'pack') : 0, p + 1))}>+</button>
          </div>
        </>
      ) : <span className="muted small">No packs in the back room to give as prizes (prizes bring more players).</span>}
      <div className="price-help">
        <div><span>Players</span><b>{players}</b></div>
        <div><span>Seats</span><b>{seats(g)}</b></div>
        <div><span>Entry fees</span><b className="up">{fmt(players * fee)}</b></div>
      </div>
      {Math.round(exp) > seats(g) && <span className="small down">About {Math.round(exp) - seats(g)} more would come with more seats — add or upgrade play tables.</span>}
      {err ? <span className="locked-note">{err}</span>
        : <Button kind="gold" wide onClick={() => tryAct((s) => hostTournament(s, kind, fee, prize), 'Tournament planned for tomorrow!')}>Host it tomorrow</Button>}
    </div>
  );
}

/** Pre-orders for the next launch (Events sheet and Market tab). */
export function PreorderCard({ compact }: { compact?: boolean }) {
  const g = useStore((s) => s.g);
  const r = g.release;
  if (!r || r.day <= g.day) {
    if (compact) return null;
    return <p className="muted small">{r ? `${SETS[r.set].name} launches today!` : `The next restock launch is announced in ${nextReleaseIn(g)} day${nextReleaseIn(g) > 1 ? 's' : ''}.`}</p>;
  }
  const kinds = (['box', 'case'] as const).filter((k) => preorderLimit(g, k) > 0);
  return (
    <div className="preorder">
      <div className="row between"><b>📦 {SETS[r.set].name} launch · day {r.day}</b><span className="muted small">in {r.day - g.day} day{r.day - g.day > 1 ? 's' : ''}</span></div>
      <span className="muted small">Pre-order below the distributor price; it arrives on launch day (no back-room limit), when prices jump.</span>
      {kinds.map((k) => {
        const left = preorderLimit(g, k) - preordered(g, k);
        const price = preorderPrice(r.set, k);
        return (
          <div key={k} className="preorder-row">
            <ProductImage set={r.set} kind={k} />
            <div>
              <b>{k === 'box' ? 'Booster box' : 'Booster case'} · {fmt(price)}</b>
              <span className="muted small">market now {fmt(sealedValue(g, r.set, k))} · ordered {preordered(g, k)}/{preorderLimit(g, k)}</span>
            </div>
            <Button kind="primary" small disabled={left <= 0 || g.cash < price} onClick={() => tryAct((s) => preorder(s, k, 1), 'Pre-ordered!')}>{left > 0 ? '+1' : 'Max'}</Button>
          </div>
        );
      })}
    </div>
  );
}

/** One popup at a time for launches, results and events. */
export function NoticePopup() {
  const g = useStore((s) => s.g);
  const n = g.notices[0];
  if (!n) return null;
  const close = () => act((s) => { s.notices.shift(); });
  return (
    <Modal title="" onClose={close} footer={<Button kind="primary" wide onClick={close}>{g.notices.length > 1 ? 'Next' : 'OK'}</Button>}>
      <div className="levelup">
        <div className="notice-icon">{n.icon}</div>
        <b className="levelup-title">{n.title}</b>
        <span className="notice-text">{n.text}</span>
      </div>
    </Modal>
  );
}
