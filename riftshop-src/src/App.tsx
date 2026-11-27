import { useEffect } from 'react';
import { CARD_BY_ID } from './data/cards';
import { DAY_HOURS, SHOP_LEVELS, clockLabel, fmt } from './game/economy';
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
          <button className="link" onClick={() => { if (confirm('Start a brand new shop? Your current save will be deleted.')) resetGame(); }}>Start over</button>
        </div>
      </main>
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => useStore.getState().setTab(t.id)}>
            <span className="ic">{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'shop' && g.offers.length > 0 && <i className="dot">{g.offers.length}</i>}
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
      {g.stats.packsOpened === 0 && g.day === 1 && g.hours < 0.5 && !welcome && <FirstRun />}
    </div>
  );
}

function FirstRun() {
  const close = () => useStore.getState().g.hours < 0.5 && (useStore.getState().g.hours = 0.5);
  return (
    <Modal title="Your Riftbound card shop" onClose={close}>
      <p>You've rented a {SHOP_LEVELS[0].name.toLowerCase()} with <b>$1,500</b> and a few packs of Vendetta and Unleashed.</p>
      <ul className="howto">
        <li>📈 Buy packs, boxes and cases from the distributor at wholesale.</li>
        <li>🏪 Customers buy packs and singles at your shelf prices.</li>
        <li>📦 Or open them yourself — real Riftbound pull rates and today's TCGplayer prices.</li>
        <li>📖 Keep your hits, display them, sell online or grade them.</li>
      </ul>
      <Button kind="primary" wide onClick={() => { close(); useStore.getState().setTab('stock'); }}>Open my first pack</Button>
    </Modal>
  );
}

export { CARD_BY_ID };
