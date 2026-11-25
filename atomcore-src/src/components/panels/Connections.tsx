import { useEffect, useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { getMods } from '../../game/simulation/modifiers';
import type { Building, GameState, Link, LinkKind, Site } from '../../game/types';
import {
  LINK_CLASSES, KIND_LABEL, MAX_CIRCUITS, GRID_TIE, OVERLOAD_LIMIT, roleOf, kindsForRole, linksOf, otherEnd, endpointName, linkRating,
  linkLength, routeLength, endpointWorld, linkRepairCost, classLockReason, suggestClass, designNeed, validTargets, targetHint, lossPct, linkCost,
} from '../../game/network/network';
import { fmtMoney, fmtNum } from '../../ui/format';
import { run, A, haptic } from '../../ui/actions';
import { Bar, Button } from '../ui/common';
import { Icon, type IconName } from '../ui/Icons';
import { audio } from '../../systems/audio/audio';

// Pipes and cables UI: the Connections card in a building's panel, and the
// connect bar shown while the player picks the other end of a new link.

export const KIND_ICON: Record<LinkKind, IconName> = { steam: 'cloud', cooling: 'drop', power: 'bolt' };
const UNIT: Record<LinkKind, string> = { steam: 'MWth', cooling: 'MWth', power: 'MW' };

/** 1 400 → "1.4 G", 24 000 → "24 G", 160 → "160 " (append the unit's tail). */
function mw(n: number, unit = ''): string {
  if (n >= 1000) {
    const g = n / 1000;
    return `${g >= 10 ? Math.round(g) : g.toFixed(1).replace(/\.0$/, '')} G${unit.slice(1)}`;
  }
  return `${n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.round(n)}${unit ? ' ' + unit : ''}`;
}

function needFor(site: Site, kind: LinkKind, a: number, b: number): number {
  const na = designNeed(site, kind, a);
  const nb = designNeed(site, kind, b);
  const both = [na, nb].filter((x) => x > 0);
  return both.length ? Math.min(...both) : 0;
}

// ── Size picker shared by "new link" and "rebuild link" ───────────────────

function SizePicker({ g, site, kind, a, b, cls, circuits, setCls, setCircuits }: {
  g: GameState; site: Site; kind: LinkKind; a: number; b: number; cls: number; circuits: number;
  setCls: (c: number) => void; setCircuits: (n: number) => void;
}) {
  return (
    <>
      <div className="chip-row" role="radiogroup" aria-label="Size">
        {LINK_CLASSES[kind].map((c, i) => {
          const lock = classLockReason(g, site, kind, i, a, b);
          return (
            <button key={c.name} type="button" role="radio" aria-checked={cls === i} title={lock ?? c.name}
              className={`size-chip${cls === i ? ' on' : ''}${lock ? ' locked' : ''}`} disabled={!!lock}
              onClick={() => { audio.sfx('click'); setCls(i); }}>
              <b>{c.short}</b>
              <span>{c.kv ? `${c.kv} · ` : ''}{mw(c.rating, UNIT[kind])}</span>
              {lock && <Icon name="lock" size={12} />}
            </button>
          );
        })}
      </div>
      <div className="row-between circuits">
        <span className="muted small">Parallel {kind === 'power' ? 'circuits' : 'runs'}</span>
        <div className="stepper">
          <button type="button" className="round-btn sm" disabled={circuits <= 1} onClick={() => setCircuits(circuits - 1)} aria-label="Fewer"><Icon name="minus" size={16} /></button>
          <span className="mono">×{circuits}</span>
          <button type="button" className="round-btn sm" disabled={circuits >= MAX_CIRCUITS} onClick={() => setCircuits(circuits + 1)} aria-label="More"><Icon name="plus" size={16} /></button>
        </div>
      </div>
    </>
  );
}

// ── Connect bar (choosing the far end of a new link) ──────────────────────

export function ConnectBar() {
  const c = useUI((s) => s.connect);
  const g = useGame();
  const site = g.sites[g.activeSite];
  const [cls, setCls] = useState(0);
  const [circuits, setCircuits] = useState(1);
  const target = c?.target ?? null;
  useEffect(() => {
    if (!c || target === null) return;
    const sug = suggestClass(g, site, c.kind, c.from, target, needFor(site, c.kind, c.from, target) * 1.1);
    setCls(sug.cls);
    setCircuits(sug.circuits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.from, c?.kind, target]);
  if (!c) return null;
  const from = site.buildings.find((b) => b.id === c.from);
  if (!from) return null;
  const role = roleOf(from.type);
  const fromName = endpointName(site, c.from);
  const targets = validTargets(site, c.kind, c.from);
  // Prefer the main partner (reactor, cooling unit, switchyard) over cross-ties and the grid connection.
  const rank = (id: number) => (id === GRID_TIE ? 1 : role === 'turbine' && roleOf(site.buildings.find((x) => x.id === id)!.type) === 'turbine' ? 2 : 0);
  const nearest = [...targets].sort((x, y) => rank(x) - rank(y) || routeLength(site, c.from, x) - routeLength(site, c.from, y))[0];
  const cancel = () => { audio.sfx('click'); useUI.getState().cancelConnect(); };

  if (target === null) {
    return (
      <div className="placement-bar connect-bar">
        <div className="placement-info">
          <div className="placement-name"><Icon name={KIND_ICON[c.kind]} size={16} /> {KIND_LABEL[c.kind]} from {fromName}</div>
          <div className="placement-sub">
            {targets.length ? `Tap ${targetHint(c.kind, role)} on the map (highlighted).` : `Nothing to connect to yet — build ${targetHint(c.kind, role)} first.`}
          </div>
        </div>
        <div className="placement-actions">
          {c.kind === 'power' && targets.includes(GRID_TIE) && (
            <Button small icon="grid" onClick={() => useUI.getState().setConnectTarget(GRID_TIE)}>Grid</Button>
          )}
          {nearest !== undefined && <Button small icon="compass" onClick={() => { haptic(15); useUI.getState().setConnectTarget(nearest); }}>Nearest</Button>}
          <button className="round-btn danger" onClick={cancel} aria-label="Cancel"><Icon name="x" /></button>
        </div>
      </div>
    );
  }

  const len = routeLength(site, c.from, target);
  const cost = linkCost(c.kind, cls, circuits, len, getMods(g, site.id).buildCost);
  const rating = LINK_CLASSES[c.kind][cls].rating * circuits;
  const need = needFor(site, c.kind, c.from, target);
  const loss = (LINK_CLASSES[c.kind][cls].loss ?? 0) * (len / 100);
  const lock = classLockReason(g, site, c.kind, cls, c.from, target);
  const build = () => {
    if (run((s) => A.buildLink(s, c.kind, c.from, target, cls, circuits), { structural: true, sound: 'place' })) {
      haptic(25);
      useUI.getState().cancelConnect();
    }
  };
  return (
    <div className="placement-bar connect-bar open">
      <div className="connect-head">
        <div>
          <div className="placement-name"><Icon name={KIND_ICON[c.kind]} size={16} /> {fromName} → {endpointName(site, target)}</div>
          <div className="placement-sub">{fmtNum(len, 0)} m route · {LINK_CLASSES[c.kind][cls].name}</div>
        </div>
        <button className="round-btn danger" onClick={cancel} aria-label="Cancel"><Icon name="x" /></button>
      </div>
      <SizePicker g={g} site={site} kind={c.kind} a={c.from} b={target} cls={cls} circuits={circuits} setCls={setCls} setCircuits={setCircuits} />
      <div className={`connect-sum${need > rating * 1.001 ? ' warn' : ''}`}>
        Carries <b>{mw(rating, UNIT[c.kind])}</b>{need > 0 ? ` · full output needs ≈ ${mw(need, UNIT[c.kind])}` : ''}
        {c.kind === 'power' ? ` · loss at full load ${loss.toFixed(2)}%` : ''}
        {need > rating * 1.001 ? ' — too small, it will hold the plant back' : ''}
      </div>
      <div className="connect-actions">
        <Button variant="ghost" icon="rotate" onClick={() => useUI.getState().setConnectTarget(null)}>Other end</Button>
        <Button variant="primary" icon="check" disabled={!!lock || g.money < cost} onClick={build}>Build · {fmtMoney(cost)}</Button>
      </div>
    </div>
  );
}

// ── Connections card in the building panel ────────────────────────────────

export function ConnectionsCard({ b }: { b: Building }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const role = roleOf(b.type);
  const kinds = kindsForRole(role);
  const [open, setOpen] = useState<number | null>(null);
  if (!kinds.length || b.status === 'destroyed') return null;
  const links = linksOf(site, b.id);
  const missing = kinds.filter((k) => !linksOf(site, b.id, k).length && !(role === 'turbine' && k !== 'steam' && !linksOf(site, b.id, 'steam').length));
  return (
    <div className="flow-card connections">
      <div className="row-between"><b>Connections</b><span className="muted small">{links.length ? `${links.length} link${links.length > 1 ? 's' : ''}` : 'not connected'}</span></div>
      {links.map((l) => (
        <LinkRow key={l.id} l={l} from={b.id} open={open === l.id} toggle={() => setOpen(open === l.id ? null : l.id)} />
      ))}
      <div className="connect-add">
        {kinds.map((k) => (
          <Button key={k} small icon={KIND_ICON[k]} variant={missing.includes(k) ? 'primary' : 'default'}
            onClick={() => { audio.sfx('click'); useUI.getState().startConnect(b.id, k); }}>
            + {KIND_LABEL[k]}
          </Button>
        ))}
      </div>
      {missing.length > 0 && <div className="muted small">Needs: {missing.map((k) => `${KIND_LABEL[k].toLowerCase()} to ${targetHint(k, role)}`).join('; ')}.</div>}
    </div>
  );
}

function LinkRow({ l, from, open, toggle }: { l: Link; from: number; open: boolean; toggle: () => void }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const other = otherEnd(l, from);
  const rating = linkRating(l);
  const load = l.flow / Math.max(1e-6, rating);
  const c = LINK_CLASSES[l.kind][l.cls];
  return (
    <div className={`link-row${open ? ' open' : ''}${l.trip > 0 || l.broken ? ' tripped' : ''}`}>
      <button type="button" className="link-main" onClick={toggle} aria-expanded={open}>
        <Icon name={KIND_ICON[l.kind]} size={16} />
        <div className="link-text">
          <div><b>{endpointName(site, other)}</b> <span className="muted">· {c.short}{c.kv ? ` ${c.kv}` : ''}{l.circuits > 1 ? ` ×${l.circuits}` : ''}</span></div>
          <div className="link-load">
            <Bar value={Math.min(load, OVERLOAD_LIMIT)} max={1} height={5} warn={load > 0.97 || l.trip > 0} />
            <span className="mono">{l.broken ? 'STORM DAMAGE' : l.trip > 0 ? `TRIPPED ${Math.ceil(l.trip)} s` : `${mw(l.flow)} / ${mw(rating)}`}</span>
          </div>
        </div>
        <Icon name={open ? 'minus' : 'gear'} size={15} />
      </button>
      {l.broken && (
        <div className="link-editor">
          <Button small variant="danger" icon="wrench" disabled={g.money < linkRepairCost(l)} onClick={() => run((s) => A.repairLink(s, l.id), { structural: true, sound: 'cash' })}>
            Repair storm damage · {fmtMoney(linkRepairCost(l))}
          </Button>
        </div>
      )}
      {open && <LinkEditor l={l} from={from} />}
    </div>
  );
}

function LinkEditor({ l, from }: { l: Link; from: number }) {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const [cls, setCls] = useState(l.cls);
  const [circuits, setCircuits] = useState(l.circuits);
  const changed = cls !== l.cls || circuits !== l.circuits;
  const cost = changed ? A.relinkCost(g, l.id, cls, circuits) : 0;
  const len = linkLength(site, l);
  const goto = endpointWorld(site, otherEnd(l, from));
  return (
    <div className="link-editor">
      <div className="muted small">
        {fmtNum(len, 0)} m · {LINK_CLASSES[l.kind][l.cls].name}
        {l.kind === 'power' ? ` · losing ${lossPct(site, l).toFixed(2)}% now` : ''}
        {l.kind === 'power' && l.heat > 0.01 ? ` · conductor heat ${Math.round(l.heat * 100)}%` : ''}
      </div>
      <SizePicker g={g} site={site} kind={l.kind} a={l.a} b={l.b} cls={cls} circuits={circuits} setCls={setCls} setCircuits={setCircuits} />
      <div className="connect-actions">
        <Button small variant="ghost" icon="trash" onClick={() => run((s) => A.removeLink(s, l.id), { structural: true, sound: 'place', okText: `Removed · refund ${fmtMoney(A.removeLinkRefund(g, l.id))}` })}>Remove</Button>
        {goto && <Button small variant="ghost" icon="eye" onClick={() => useUI.getState().cameraCmd({ kind: 'focus', x: goto[0], z: goto[1], distance: 40 })}>Show</Button>}
        <Button small variant="primary" icon="up" disabled={!changed || g.money < cost} onClick={() => run((s) => A.upgradeLink(s, l.id, cls, circuits), { structural: true, sound: 'place' })}>
          {changed ? `Rebuild · ${fmtMoney(cost)}` : 'Rebuild'}
        </Button>
      </div>
    </div>
  );
}
