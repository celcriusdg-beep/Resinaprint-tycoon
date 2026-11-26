import { useEffect, useState } from 'react';
import { useGame, getGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { useSettings, isTouchDevice } from '../../stores/settingsStore';
import type { GameState } from '../../game/types';
import { roleOf } from '../../game/network/network';
import { Icon, type IconName } from './Icons';
import { Button } from './common';
import { audio } from '../../systems/audio/audio';

// Tip cards: a short card the first time each system matters, one at a time,
// never over an open panel or an emergency. They can be read again from
// More → Settings → Help & tips.

export interface Tip {
  id: string;
  icon: IconName;
  title: string;
  lines: string[];
  /** When the tip becomes relevant. */
  when: (g: GameState) => boolean;
  action?: { label: string; run: () => void };
}

const openPanel = (p: Parameters<ReturnType<typeof useUI.getState>['setPanel']>[0]) => () => useUI.getState().setPanel(p);

export const TIPS: Tip[] = [
  {
    id: 'connections', icon: 'bolt', title: 'Pipes & cables',
    lines: [
      'Nothing connects by itself any more. Heat leaves a reactor only through a steam line to a turbine hall; the turbine needs a cooling-water pipe to a cooling unit; power reaches the grid only by cable to a substation or the grid connection.',
      'Open a building → Connections → tap “+ Steam line / Cooling-water pipe / Power cable”, then tap the other building (it glows green). Pick a size — bigger lines carry more, high voltage loses less.',
      'Your existing plant has been connected for you. Everything new you build, you wire yourself.',
    ],
    when: () => true,
    action: {
      label: 'Show a turbine',
      run: () => {
        const g = getGame();
        const t = g.sites[g.activeSite].buildings.find((b) => roleOf(b.type) === 'turbine');
        if (t) useUI.getState().select(t.id);
      },
    },
  },
  {
    id: 'weather', icon: 'sun', title: 'Weather & seasons',
    lines: [
      'Each season lasts 7 game days. Hot, humid days weaken cooling towers, droughts lower the river, frost can ice up the intakes, and storms can bring down power lines.',
      'Tap the weather pill at the top for the 3-day forecast — it is exactly what will happen, so lower power before a heatwave and keep money for repairs before a storm.',
    ],
    when: () => true,
    action: { label: 'Open the forecast', run: openPanel('weather') },
  },
  {
    id: 'staff', icon: 'users', title: 'Staff & shifts',
    lines: [
      'Every building needs operators, technicians, engineers, security or scientists. Auto-hire recruits them for you; new reactor operators need half a game day of licence training first.',
      'Short crews work overtime and get tired — tired crews make mistakes that trip reactors. Key people (supervisor, chief engineer…) give big bonuses.',
    ],
    when: () => true,
    action: { label: 'Open Staff', run: openPanel('staff') },
  },
  {
    id: 'regulator', icon: 'scram', title: 'The regulator',
    lines: [
      'New reactors need a construction permit (Build → Reactors, top of the list) and, once built, an operating licence — they start by themselves when the pre-start checklist passes.',
      'Inspectors visit every 3 game days. Fix findings before the deadline: fines first, and from level 5 a reactor can be suspended until the problem is fixed.',
    ],
    when: (g) => g.level >= 2,
    action: { label: 'Open Regulator', run: openPanel('regulator') },
  },
  {
    id: 'emergencies', icon: 'alert', title: 'Emergencies',
    lines: [
      'Now and then something goes wrong: a leak, a stuck valve, a fire, a flood or an earthquake. A red alarm card shows the options and a countdown.',
      'Pick the textbook response to keep it small. If you do nothing, the automatic systems respond — less well. Fire stations, an emergency centre, drills and rested crews all help.',
    ],
    when: (g) => g.level >= 3,
    action: { label: 'Preparedness', run: openPanel('regulator') },
  },
  {
    id: 'graphics', icon: 'eye', title: 'Graphics on newer iPhones',
    lines: ['On a recent iPhone (15 Pro or newer) set Settings → Graphics → High for the full detail: shadows, rain, traffic and sharper buildings. It scales down by itself if the frame rate drops.'],
    when: () => isTouchDevice() && useSettings.getState().quality === 'auto',
    action: { label: 'Settings', run: openPanel('settings') },
  },
];

const GAP_MS = 35_000;
let lastClosed = 0;

export function TipCard() {
  const g = useGame();
  const seen = useSettings((s) => s.seenTips);
  const loaded = useSettings((s) => s.loaded);
  const blocked = useUI((s) => !!(s.panel || s.selectedId !== null || s.placement || s.connect || s.modal));
  const [current, setCurrent] = useState<Tip | null>(null);
  const [forced, setForced] = useState<string | null>(null);
  useEffect(() => {
    const onShow = (e: Event) => setForced((e as CustomEvent<string>).detail);
    window.addEventListener('atom-tip', onShow);
    return () => window.removeEventListener('atom-tip', onShow);
  }, []);
  const emergency = g.emergencies.some((e) => e.started <= g.gameTime);
  const showcase = new URLSearchParams(window.location.search).has('showcase');
  useEffect(() => {
    if (forced) {
      setCurrent(TIPS.find((t) => t.id === forced) ?? null);
      return;
    }
    if (current || !loaded || showcase || blocked || emergency || Date.now() - lastClosed < GAP_MS) return;
    const next = TIPS.find((t) => !seen.includes(t.id) && t.when(g));
    if (next) setCurrent(next);
  }, [g.gameTime, seen, loaded, blocked, emergency, current, forced, g, showcase]);
  if (!current || (!forced && (blocked || emergency))) return null;
  const close = () => {
    audio.sfx('click');
    if (!seen.includes(current.id)) useSettings.getState().set({ seenTips: [...seen, current.id] });
    lastClosed = Date.now();
    setCurrent(null);
    setForced(null);
  };
  const idx = TIPS.indexOf(current) + 1;
  return (
    <div className="tip-card" role="dialog" aria-labelledby="tip-title">
      <div className="tip-head">
        <Icon name={current.icon} size={20} />
        <b id="tip-title">{current.title}</b>
        <span className="muted small">New · {idx}/{TIPS.length}</span>
      </div>
      {current.lines.map((l, i) => <p key={i}>{l}</p>)}
      <div className="tip-actions">
        {current.action && <Button small variant="ghost" onClick={() => { close(); current.action!.run(); }}>{current.action.label}</Button>}
        <Button small variant="primary" icon="check" onClick={close}>Got it</Button>
      </div>
    </div>
  );
}

/** Show a tip again (Help list). */
export function showTip(id: string): void {
  useUI.getState().setPanel(null);
  window.dispatchEvent(new CustomEvent('atom-tip', { detail: id }));
}
