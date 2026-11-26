import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUI, type PanelId, type CameraInput } from '../../stores/uiStore';
import { useGame } from '../../stores/gameStore';
import { useSettings } from '../../stores/settingsStore';
import { Icon, type IconName } from './Icons';
import { audio } from '../../systems/audio/audio';
import { BUILDINGS } from '../../game/buildings/defs';
import { buildCost } from '../../game/actions';
import { fmtMoney } from '../../ui/format';
import { confirmPlacement, rotatePlacement } from '../../ui/actions';
import { diagnose } from '../../game/diagnostics';

const NAV: { id: PanelId; label: string; icon: IconName }[] = [
  { id: 'status', label: 'Status', icon: 'alert' },
  { id: 'build', label: 'Build', icon: 'hammer' },
  { id: 'research', label: 'Research', icon: 'flask' },
  { id: 'manage', label: 'Plant', icon: 'factory' },
  { id: 'supply', label: 'Supply', icon: 'truck' },
  { id: 'market', label: 'Market', icon: 'chart' },
  { id: 'goals', label: 'Goals', icon: 'trophy' },
  { id: 'sites', label: 'More', icon: 'menu' },
];

export function NavBar() {
  const panel = useUI((s) => s.panel);
  const g = useGame();
  const claimable = g.daily.objectives.filter((o) => !o.claimed && o.progress >= o.target).length;
  const idleResearch = !g.research.active && g.research.points > 30;
  const st = g.sites[g.activeSite].stats;
  const supplyAlert = st.waterFactor < 0.999 || st.treatedFactor < 0.999 || g.fuel < 5;
  const issues = diagnose(g);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warn').length;
  return (
    <nav className="nav" aria-label="Main">
      {NAV.map((n) => (
        <button key={n.id} className={`nav-btn${panel === n.id ? ' active' : ''}`}
          onClick={() => { audio.sfx('open'); useUI.getState().togglePanel(n.id); }} aria-label={n.label}>
          <Icon name={n.icon} size={21} />
          <span>{n.label}</span>
          {n.id === 'goals' && claimable > 0 && <i className="badge">{claimable}</i>}
          {n.id === 'research' && idleResearch && <i className="badge dot" />}
          {n.id === 'supply' && supplyAlert && <i className="badge dot alert" />}
          {n.id === 'status' && errorCount > 0 && <i className="badge">{errorCount}</i>}
          {n.id === 'status' && errorCount === 0 && warnCount > 0 && <i className="badge warnb">{warnCount}</i>}
        </button>
      ))}
    </nav>
  );
}

/** Responsive panel: right-hand drawer on desktop, bottom sheet on phones. */
export function Sheet({ title, icon, children, onClose, wide }: { title: string; icon?: IconName; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <aside className={`sheet${wide ? ' wide' : ''}`} style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
      <div className="sheet-head"
        onTouchStart={(e) => (start.current = e.touches[0].clientY)}
        onTouchMove={(e) => {
          if (start.current === null) return;
          setDrag(Math.max(0, e.touches[0].clientY - start.current));
        }}
        onTouchEnd={() => {
          if (drag > 90) onClose();
          setDrag(0);
          start.current = null;
        }}>
        <div className="sheet-grip" />
        <div className="sheet-title">
          {icon && <Icon name={icon} size={18} />}
          <h2>{title}</h2>
        </div>
        <button className="icon-btn" onClick={() => { audio.sfx('click'); onClose(); }} aria-label="Close"><Icon name="x" /></button>
      </div>
      <div className="sheet-body" ref={body}>{children}</div>
    </aside>
  );
}

export function PlacementBar() {
  const pl = useUI((s) => s.placement);
  const g = useGame();
  if (!pl) return null;
  const def = BUILDINGS[pl.type];
  const moving = pl.moveId !== undefined;
  const cost = moving ? 0 : buildCost(g, pl.type);
  return (
    <div className={`placement-bar${moving ? ' moving' : ''}`}>
      <div className="placement-info">
        <div className="placement-name">{moving ? `Move ${def.short}` : def.name}</div>
        <div className="placement-sub">
          {moving ? 'Free' : fmtMoney(cost)} · <span className="hide-touch">Click to place · R rotate{moving ? '' : ' · Shift-click to keep building'} · Esc cancel</span>
          <span className="show-touch">Tap the new spot, then confirm</span>
        </div>
      </div>
      <div className="placement-actions">
        <button className="round-btn" onClick={rotatePlacement} aria-label="Rotate"><Icon name="rotate" /></button>
        <button className="round-btn danger" onClick={() => { audio.sfx('click'); useUI.getState().cancelPlacement(); }} aria-label="Cancel"><Icon name="x" /></button>
        <button className={`round-btn primary${pl.x === null ? ' disabled' : ''}`} onClick={() => confirmPlacement()} aria-label="Place building"><Icon name="check" /></button>
      </div>
    </div>
  );
}

export function CameraButtons() {
  const cmd = (c: CameraInput) => { audio.sfx('click'); useUI.getState().cameraCmd(c); };
  const labels = useSettings((s) => s.showLabels);
  return (
    <div className="camera-buttons">
      <button className="cam-btn" onClick={() => cmd({ kind: 'zoom', factor: 0.75 })} aria-label="Zoom in"><Icon name="zoomIn" /></button>
      <button className="cam-btn" onClick={() => cmd({ kind: 'zoom', factor: 1.33 })} aria-label="Zoom out"><Icon name="zoomOut" /></button>
      <button className="cam-btn" onClick={() => cmd({ kind: 'rotate', delta: Math.PI / 4 })} aria-label="Rotate view"><Icon name="rotate" /></button>
      <button className="cam-btn" onClick={() => cmd({ kind: 'reset' })} aria-label="Reset view"><Icon name="home" /></button>
      <button className={`cam-btn${labels ? ' on' : ''}`} onClick={() => { audio.sfx('click'); useSettings.getState().set({ showLabels: !labels }); }} aria-label="Building labels" aria-pressed={labels}><Icon name="tag" /></button>
    </div>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => window.setTimeout(() => useUI.getState().dismissToast(t.id), Math.max(500, (t.kind === 'achievement' || t.kind === 'level' ? 5200 : 3800) - (Date.now() - t.at))));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);
  const icon: Record<string, IconName> = { achievement: 'trophy', level: 'star', build: 'hammer', research: 'flask', scram: 'scram', bad: 'alert', warn: 'alert', good: 'check', info: 'info' };
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => useUI.getState().dismissToast(t.id)}>
          <Icon name={icon[t.kind] ?? 'info'} size={20} />
          <div>
            <div className="toast-title">{t.title}</div>
            {t.text && <div className="toast-text">{t.text}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
