import { lazy, Suspense, useEffect, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { useUI, type PanelId } from './stores/uiStore';
import { useSettings } from './stores/settingsStore';
import { loadGame, requestPersistence } from './systems/save/storage';
import { simulateOffline } from './systems/offline/offline';
import { startLoop, persist, setSaveEnabled } from './systems/loop';
import { audio } from './systems/audio/audio';
import { HUD } from './components/ui/HUD';
import { NavBar, Sheet, PlacementBar, CameraButtons, Toasts } from './components/ui/Chrome';
import { Modals, LoadingScreen, SceneErrorBoundary } from './components/ui/Modals';
import { BuildPanel } from './components/panels/BuildPanel';
import { BuildingPanel } from './components/panels/BuildingPanel';
import { ResearchPanel } from './components/panels/ResearchPanel';
import { ManagePanel } from './components/panels/ManagePanel';
import { MarketPanel } from './components/panels/MarketPanel';
import { GoalsPanel } from './components/panels/GoalsPanel';
import { SitesPanel } from './components/panels/SitesPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { BUILDINGS } from './game/buildings/defs';
import { rotatePlacement } from './ui/actions';
import type { IconName } from './components/ui/Icons';

const GameCanvas = lazy(() => import('./components/world/GameCanvas'));

const PANELS: Record<PanelId, { title: string; icon: IconName; render: () => JSX.Element; wide?: boolean }> = {
  build: { title: 'Construction', icon: 'hammer', render: () => <BuildPanel /> },
  research: { title: 'Research', icon: 'flask', render: () => <ResearchPanel />, wide: true },
  manage: { title: 'Plant Management', icon: 'factory', render: () => <ManagePanel /> },
  market: { title: 'Energy Market', icon: 'chart', render: () => <MarketPanel /> },
  goals: { title: 'Goals & Progress', icon: 'trophy', render: () => <GoalsPanel /> },
  sites: { title: 'Sites & Corporation', icon: 'globe', render: () => <SitesPanel /> },
  settings: { title: 'Settings', icon: 'gear', render: () => <SettingsPanel /> },
};

export default function App() {
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [loadText, setLoadText] = useState('Loading save…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await useSettings.getState().load();
      const params = new URLSearchParams(window.location.search);
      if (params.has('showcase')) {
        const { createShowcaseState } = await import('./game/dev');
        setSaveEnabled(false);
        useGameStore.getState().setGame(createShowcaseState());
        useSettings.setState({ seenWelcome: true });
        startLoop();
        (window as unknown as Record<string, unknown>).__atom = () => useGameStore.getState().game;
        setPhase('ready');
        return;
      }
      const res = await loadGame();
      if (cancelled) return;
      if (res.state) {
        useGameStore.getState().setGame(res.state);
        setLoadText('Calculating offline progress…');
        const away = (Date.now() - res.savedAt) / 1000;
        const report = simulateOffline(res.state, away);
        if (report && report.simulated > 60) useUI.getState().setModal({ kind: 'offline', report });
        if (res.error) useUI.getState().pushToast({ kind: 'warn', title: 'Save restored from backup', text: res.error });
      } else if (res.error) {
        useUI.getState().setModal({ kind: 'loadError', text: `Your save could not be read (${res.error}). A new game was started; the damaged save was left untouched until you save over it.` });
      }
      if (!useSettings.getState().seenWelcome && !useUI.getState().modal) useUI.getState().setModal({ kind: 'welcome' });
      setLoadText('Starting reactors…');
      startLoop();
      if (new URLSearchParams(window.location.search).has('debug')) {
        const w = window as unknown as Record<string, unknown>;
        w.__atom = () => useGameStore.getState().game;
        w.__persist = persist;
      }
      void requestPersistence();
      setPhase('ready');
      if (res.state) void persist();
    })().catch((e) => {
      console.error(e);
      setLoadText('Could not start: ' + (e as Error).message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Audio must be unlocked by a user gesture (iOS).
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const ui = useUI.getState();
      if (e.key === 'Escape') {
        if (ui.placement) ui.cancelPlacement();
        else if (ui.modal) ui.setModal(null);
        else if (ui.panel) ui.setPanel(null);
        else ui.select(null);
      }
      if ((e.key === 'r' || e.key === 'R') && ui.placement) rotatePlacement();
      const map: Record<string, PanelId> = { b: 'build', t: 'research', p: 'manage', m: 'market', g: 'goals' };
      if (!ui.placement && map[e.key]) ui.togglePanel(map[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (phase === 'loading') return <LoadingScreen text={loadText} progress={0.35} />;
  return <GameShell />;
}

function GameShell() {
  const panel = useUI((s) => s.panel);
  const selectedId = useUI((s) => s.selectedId);
  const placement = useUI((s) => s.placement);
  useGameStore((s) => s.structure);
  const game = useGameStore.getState().game;
  const selected = selectedId !== null ? game.sites[game.activeSite].buildings.find((b) => b.id === selectedId) : undefined;
  const p = panel ? PANELS[panel] : null;
  return (
    <div className={`app${placement ? ' placing' : ''}`}>
      <div className="scene">
        <SceneErrorBoundary>
          <Suspense fallback={<LoadingScreen text="Building the plant…" progress={0.7} />}>
            <GameCanvas />
          </Suspense>
        </SceneErrorBoundary>
      </div>
      <HUD />
      <Toasts />
      {!placement && <CameraButtons />}
      <PlacementBar />
      {p && (
        <Sheet title={p.title} icon={p.icon} wide={p.wide} onClose={() => useUI.getState().setPanel(null)}>
          {p.render()}
        </Sheet>
      )}
      {!p && selected && (
        <Sheet title={BUILDINGS[selected.type].name} icon="factory" onClose={() => useUI.getState().select(null)}>
          <BuildingPanel id={selected.id} />
        </Sheet>
      )}
      {!placement && <NavBar />}
      <Modals />
    </div>
  );
}
