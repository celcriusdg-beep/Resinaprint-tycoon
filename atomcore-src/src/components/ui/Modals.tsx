import { Component, type ReactNode } from 'react';
import { useUI } from '../../stores/uiStore';
import { useSettings } from '../../stores/settingsStore';
import { fmtMoney, fmtTime, fmtEnergy, fmtNum, fmtPct } from '../../ui/format';
import { Button } from './common';
import { Icon } from './Icons';
import { audio } from '../../systems/audio/audio';

export function Modals() {
  const modal = useUI((s) => s.modal);
  if (!modal) return null;
  const close = () => useUI.getState().setModal(null);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {modal.kind === 'offline' && (
          <>
            <div className="modal-icon good"><Icon name="money" size={28} /></div>
            <h2>Welcome back</h2>
            <p className="muted">Your plants kept running for {fmtTime(modal.report.simulated)}{modal.report.elapsed > modal.report.simulated + 1 ? ` (capped at ${modal.report.capHours} h — research Remote Operations to extend)` : ''} at {fmtPct(modal.report.efficiency)} efficiency.</p>
            <div className="offline-grid">
              <div><span className="muted small">Net earnings</span><b className={modal.report.money >= 0 ? 'good' : 'bad'}>{fmtMoney(modal.report.money)}</b></div>
              <div><span className="muted small">Energy sold</span><b>{fmtEnergy(modal.report.energyMWh)}</b></div>
              <div><span className="muted small">Research</span><b>{fmtNum(modal.report.research)} RP</b></div>
              <div><span className="muted small">Levels gained</span><b>{modal.report.levels}</b></div>
            </div>
            {modal.report.completed > 0 && <p className="small">{modal.report.completed} construction/upgrade job(s) finished while you were away.</p>}
            <Button variant="primary" wide onClick={() => { audio.sfx('cash'); close(); }}>Collect</Button>
          </>
        )}
        {modal.kind === 'confirm' && (
          <>
            <h2>{modal.title}</h2>
            <p className="muted">{modal.text}</p>
            <div className="modal-actions">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button variant={modal.danger ? 'danger' : 'primary'} onClick={() => { close(); modal.onConfirm(); }}>{modal.confirmLabel}</Button>
            </div>
          </>
        )}
        {modal.kind === 'welcome' && (
          <>
            <div className="modal-icon"><Icon name="atom" size={30} /></div>
            <h2>Welcome to ATOMCORE</h2>
            <p>You run a young energy company with a single pilot reactor. Sell electricity, reinvest, research better reactors and build a nuclear power empire.</p>
            <ul className="welcome-list">
              <li><b>Heat → steam → power:</b> reactors make heat, turbines turn steam into electricity, cooling removes waste heat, substations export to the grid.</li>
              <li><b>Keep it cool:</b> if cooling can't keep up, temperature rises and the reactor SCRAMs (shuts down safely).</li>
              <li><b>Grow:</b> follow the milestone banner at the top for guidance.</li>
            </ul>
            <p className="muted small">Controls: drag to pan, pinch or scroll to zoom, two-finger twist or right-drag to rotate. Tap a building to manage it.</p>
            <Button variant="primary" wide onClick={() => { useSettings.getState().set({ seenWelcome: true }); audio.unlock(); close(); }}>Start operating</Button>
          </>
        )}
        {modal.kind === 'loadError' && (
          <>
            <div className="modal-icon bad"><Icon name="alert" size={28} /></div>
            <h2>Save problem</h2>
            <p>{modal.text}</p>
            <Button variant="primary" wide onClick={close}>OK</Button>
          </>
        )}
      </div>
    </div>
  );
}

export function LoadingScreen({ text, progress }: { text: string; progress?: number }) {
  return (
    <div className="loading">
      <div className="loading-logo">
        <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
          <polygon points="70.8,62.0 50.0,74.0 29.2,62.0 29.2,38.0 50.0,26.0 70.8,38.0" fill="#0a2536" stroke="#4fd1ff" strokeWidth="2.5" strokeLinejoin="round" />
          <g fill="#9ff0ff"><circle cx="35.2" cy="50.0" r="2.4" /><circle cx="38.9" cy="56.4" r="2.4" /><circle cx="42.6" cy="62.8" r="2.4" /><circle cx="38.9" cy="43.6" r="2.4" /><circle cx="42.6" cy="50.0" r="2.4" /><circle cx="46.3" cy="56.4" r="2.4" /><circle cx="50.0" cy="62.8" r="2.4" /><circle cx="42.6" cy="37.2" r="2.4" /><circle cx="46.3" cy="43.6" r="2.4" /><circle cx="50.0" cy="50.0" r="2.4" /><circle cx="53.7" cy="56.4" r="2.4" /><circle cx="57.4" cy="62.8" r="2.4" /><circle cx="50.0" cy="37.2" r="2.4" /><circle cx="53.7" cy="43.6" r="2.4" /><circle cx="57.4" cy="50.0" r="2.4" /><circle cx="61.1" cy="56.4" r="2.4" /><circle cx="57.4" cy="37.2" r="2.4" /><circle cx="61.1" cy="43.6" r="2.4" /><circle cx="64.8" cy="50.0" r="2.4" /></g>
          <circle cx="50" cy="50" r="2.8" fill="#fff" />
        </svg>
      </div>
      <h1>ATOMCORE</h1>
      <div className="loading-sub">Nuclear Power Tycoon</div>
      <div className="loading-bar"><div style={{ width: `${Math.round((progress ?? 0.3) * 100)}%` }} /></div>
      <div className="loading-text">{text}</div>
    </div>
  );
}

interface EBState { error: Error | null }

/** Keeps the UI usable if WebGL fails (old device, context lost). */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('3D scene error', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="scene-error">
          <Icon name="alert" size={28} />
          <h3>3D view unavailable</h3>
          <p className="muted small">{this.state.error.message || 'WebGL could not start on this device.'}</p>
          <p className="muted small">The plant keeps running and all menus still work. Try Settings → Graphics → Low, then reload.</p>
          <Button onClick={() => this.setState({ error: null })}>Retry</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
