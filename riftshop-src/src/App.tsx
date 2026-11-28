import { useEffect, useState } from 'react';
import { CARD_BY_ID, CARDS, productImage, sanityUrl, tcgUrl } from './data/cards';
import { DAY_HOURS, SHOP_LEVELS, clockLabel, fmt, rawValue, singleValue } from './game/economy';
import { slabTitle } from './game/grading';
import { act } from './store';
import { Slab } from './ui/visuals';
import { resetGame, useStore, type Tab } from './store';
import { ShopScreen } from './ui/ShopScreen';
import { PackOpening, StockScreen } from './ui/StockScreen';
import { BinderScreen, CardModal } from './ui/BinderScreen';
import { GradingScreen, MarketScreen } from './ui/MarketScreen';
import { Button, Modal, Toast } from './ui/common';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shop', label: 'Shop', icon: '🏪' },
  { id: 'stock', label: 'Stock', icon: '📦' },
  { id: 'binder', label: 'Binder', icon: '📖' },
  { id: 'market', label: 'Market', icon: '📈' },
  { id: 'grading', label: 'Grading', icon: '🏅' },
];

export default function App() {
  const tab = useStore((s) => s.tab);
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const welcome = useStore((s) => s.welcome);
  useEffect(() => {
    document.querySelector('.content')?.scrollTo(0, 0);
  }, [tab]);
  const dayProgress = (g.hours % DAY_HOURS) / DAY_HOURS;
  return (
    <div className="app">
      <header className="top">
        <div className="cash">{fmt(g.cash)}</div>
        <div className="clock">
          <span>Day {g.day} · {clockLabel(g.hours)}</span>
          <div className="bar"><div style={{ width: `${dayProgress * 100}%` }} /></div>
        </div>
        <div className="rep" title="Reputation">★ {Math.round(g.rep)}</div>
      </header>
      <main className="content">
        {tab === 'shop' && <ShopScreen />}
        {tab === 'stock' && <StockScreen />}
        {tab === 'binder' && <BinderScreen />}
        {tab === 'market' && <MarketScreen />}
        {tab === 'grading' && <GradingScreen />}
        <div className="footer-actions">
          <PictureCheck />
          <button className="link" onClick={() => { if (confirm('Start a brand new shop? Your current save will be deleted.')) resetGame(); }}>Start over</button>
        </div>
      </main>
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => useStore.getState().setTab(t.id)}>
            <span className="ic">{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'shop' && g.offers.length > 0 && <i className="dot">{g.offers.length}</i>}
            {t.id === 'grading' && g.grading.length > 0 && <i className="dot blue">{g.grading.length}</i>}
          </button>
        ))}
      </nav>
      <PackOpening />
      <CardModal />
      <Toast />
      {welcome && (
        <Modal title="Welcome back" onClose={() => useStore.getState().closeWelcome()}>
          <p>You were away for about {welcome.hours >= DAY_HOURS ? `${(welcome.hours / DAY_HOURS).toFixed(1)} shop days` : `${welcome.hours.toFixed(1)} shop hours`}.</p>
          <p className="muted small">{g.clerk ? 'Your clerk kept the shop running.' : 'The shop was closed (hire a clerk to keep selling while you are away).'} Online listings and grading kept going.</p>
          <Button kind="primary" wide onClick={() => useStore.getState().closeWelcome()}>Open the shop</Button>
        </Modal>
      )}
      {g.reveals.length > 0 && !useStore.getState().opening && <GradeReveal />}
      {g.stats.packsOpened === 0 && g.day === 1 && g.hours < 0.5 && !welcome && <FirstRun />}
    </div>
  );
}

function FirstRun() {
  const close = () => useStore.getState().g.hours < 0.5 && (useStore.getState().g.hours = 0.5);
  return (
    <Modal title="Your Riftbound card shop" onClose={close}>
      <p>You've rented a {SHOP_LEVELS[0].name.toLowerCase()} with <b>$1,500</b> and a few packs of Vendetta and Unleashed. Every decision is yours:</p>
      <ul className="howto">
        <li>📈 Buy cheap: distributor wholesale, the daily deals board, and people selling at your counter.</li>
        <li>🏷️ Put packs and boxes on your shelf and cards in your display case — at your own prices. Customers only buy what you put out.</li>
        <li>📦 Or open the packs yourself: real Riftbound pull rates and TCGplayer prices.</li>
        <li>🏅 Send your best pulls to PSA or Beckett. The grade is luck — a 10 can multiply the value.</li>
      </ul>
      <Button kind="primary" wide onClick={() => { close(); useStore.getState().setTab('stock'); }}>Open my first pack</Button>
    </Modal>
  );
}

/** Shows which picture servers this phone can load from (to report problems). */
function PictureCheck() {
  const [open, setOpen] = useState(false);
  const c = CARDS.find((x) => x.tcg && x.set === 'OGN')!;
  const tests: [string, string | undefined][] = [
    ['Riot art via Sanity', sanityUrl(c, 300)],
    ['Riot art (original server)', c.img],
    ['TCGplayer card photo', tcgUrl(c, true)],
    ['TCGplayer product photo', productImage('OGN', 'pack', true)],
  ];
  return (
    <div className="pic-check">
      <button className="link" onClick={() => setOpen((v) => !v)}>Picture check</button>
      {open && tests.map(([label, src]) => <PicTest key={label} label={label} src={src} />)}
    </div>
  );
}

function PicTest({ label, src }: { label: string; src?: string }) {
  const [st, setSt] = useState<'…' | '✓' | '✗'>(src ? '…' : '✗');
  const [t0] = useState(() => performance.now());
  const [ms, setMs] = useState(0);
  return (
    <div className="pic-test">
      {src && <img src={`${src}${src.includes('?') ? '&' : '?'}check=${t0.toFixed(0)}`} alt="" onLoad={() => { setSt('✓'); setMs(performance.now() - t0); }} onError={() => setSt('✗')} />}
      <span>{st} {label}{st === '✓' ? ` (${(ms / 1000).toFixed(1)} s)` : ''}</span>
    </div>
  );
}

/** A grade just came back: show the slab. */
function GradeReveal() {
  const g = useStore((s) => s.g);
  const uid = g.reveals[0];
  const s = g.slabs.find((x) => x.uid === uid) ?? g.display.find((x) => x.uid === uid) ?? g.online.find((x) => x.uid === uid);
  const next = () => act((st) => { st.reveals.shift(); });
  if (!s || !s.slab) { next(); return null; }
  const raw = rawValue(g, s.cardId, s.foil);
  const v = singleValue(g, s);
  const great = s.slab.black || s.slab.grade >= (s.slab.company === 'PSA' ? 10 : 9.5);
  return (
    <div className="opening reveal-grade" onClick={next}>
      <div className="opening-top"><span>{s.slab.company === 'PSA' ? 'PSA' : 'Beckett'} returned your card</span></div>
      <div className="summary">
        <div className={`grade-pop${great ? ' great' : ''}`}><Slab s={{ ...s, slab: s.slab }} /></div>
        <b className="grade-title">{slabTitle(s.slab)}</b>
        <p>{CARD_BY_ID[s.cardId].name}: raw {fmt(raw)} → <b className={v >= raw ? 'up' : 'down'}>{fmt(v)}</b></p>
        <Button kind="primary" onClick={next}>{g.reveals.length > 1 ? 'Next slab' : 'Nice'}</Button>
      </div>
    </div>
  );
}
