import { useMemo, useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { RESEARCH, RESEARCH_BY_ID, RESEARCH_CATEGORIES, type ResearchNode } from '../../game/research/tree';
import { BUILDINGS } from '../../game/buildings/defs';
import { fmtMoney, fmtNum, fmtTime, fmtPct } from '../../ui/format';
import { run, A } from '../../ui/actions';
import { Bar, Button } from '../ui/common';
import { Icon } from '../ui/Icons';
import type { GameState } from '../../game/types';

const NODE_W = 156;
const NODE_H = 54;
const COL = 180;
const ROW = 62;
const LABEL_W = 112;

type NodeState = 'done' | 'active' | 'available' | 'locked';

function nodeState(g: GameState, n: ResearchNode): NodeState {
  if (g.research.completed.includes(n.id)) return 'done';
  if (g.research.active === n.id) return 'active';
  const reqOk = n.requires.every((r) => g.research.completed.includes(r));
  return reqOk && (!n.level || g.level >= n.level) ? 'available' : 'locked';
}

export function ResearchPanel() {
  const g = useGame();
  const [selected, setSelected] = useState<string | null>(g.research.active ?? null);
  const rate = g.unlockedSites.reduce((a, id) => a + g.sites[id].stats.researchRate, 0);
  const active = g.research.active ? RESEARCH_BY_ID[g.research.active] : null;

  const layout = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const rows: { id: string; name: string; color: string; y: number; h: number }[] = [];
    let y = 8;
    for (const cat of RESEARCH_CATEGORIES) {
      const nodes = RESEARCH.filter((n) => n.category === cat.id);
      const byTier = new Map<number, ResearchNode[]>();
      for (const n of nodes) byTier.set(n.tier, [...(byTier.get(n.tier) ?? []), n]);
      const stack = Math.max(...[...byTier.values()].map((l) => l.length));
      for (const [tier, list] of byTier) list.forEach((n, i) => (pos[n.id] = { x: LABEL_W + (tier - 1) * COL, y: y + i * ROW }));
      rows.push({ id: cat.id, name: cat.name, color: cat.color, y, h: stack * ROW });
      y += stack * ROW + 14;
    }
    const maxTier = Math.max(...RESEARCH.map((n) => n.tier));
    return { pos, rows, width: LABEL_W + maxTier * COL, height: y };
  }, []);

  const sel = selected ? RESEARCH_BY_ID[selected] : null;
  const catColor = (id: string) => RESEARCH_CATEGORIES.find((c) => c.id === id)?.color ?? '#fff';

  return (
    <div className="panel-stack research">
      <div className="research-top">
        <div>
          <div className="muted small">Research points</div>
          <div className="big mono">{fmtNum(g.research.points)} RP <span className="muted small">+{rate.toFixed(2)}/s</span></div>
        </div>
        <div className="research-active">
          {active ? (
            <>
              <div className="row-between small"><span>{active.name}</span><span className="mono">{fmtPct(g.research.progress / active.cost)}</span></div>
              <Bar value={g.research.progress} max={active.cost} height={7} />
              <div className="muted small">{rate > 0 ? `~${fmtTime((active.cost - g.research.progress - g.research.points) / rate)} left` : 'Build a Research Lab to generate points'}</div>
            </>
          ) : (
            <div className="muted small">No active project — choose one below. Points keep accumulating meanwhile.</div>
          )}
        </div>
      </div>
      {rate <= 0.001 && <div className="hint-box"><Icon name="info" size={15} /> Research needs points: build a Research Laboratory (Build → Support).</div>}

      <div className="tree-scroll">
        <div className="tree" style={{ width: layout.width, height: layout.height }}>
          <svg className="tree-lines" width={layout.width} height={layout.height}>
            {RESEARCH.flatMap((n) =>
              n.requires.map((r) => {
                const a = layout.pos[r], b = layout.pos[n.id];
                if (!a || !b) return null;
                const done = g.research.completed.includes(r);
                const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                return <path key={`${r}-${n.id}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} className={done ? 'done' : ''} />;
              }),
            )}
          </svg>
          {layout.rows.map((row) => (
            <div key={row.id} className="tree-row-label" style={{ top: row.y, height: row.h - 8, borderColor: row.color }}>
              <span style={{ color: row.color }}>{row.name}</span>
            </div>
          ))}
          {RESEARCH.map((n) => {
            const p = layout.pos[n.id];
            const s = nodeState(g, n);
            return (
              <button key={n.id} className={`tree-node ${s}${selected === n.id ? ' sel' : ''}`}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H, ['--cat' as string]: catColor(n.category) }}
                onClick={() => setSelected(n.id)}>
                <span className="tn-name">{n.name}</span>
                <span className="tn-cost">
                  {s === 'done' ? <><Icon name="check" size={12} /> Done</> : s === 'active' ? fmtPct(g.research.progress / n.cost) : `${fmtNum(n.cost)} RP`}
                </span>
                {s === 'active' && <span className="tn-progress" style={{ width: `${(g.research.progress / n.cost) * 100}%` }} />}
              </button>
            );
          })}
        </div>
      </div>

      {sel && <ResearchDetail n={sel} state={nodeState(g, sel)} />}
    </div>
  );
}

function ResearchDetail({ n, state }: { n: ResearchNode; state: NodeState }) {
  const g = useGame();
  const missing = n.requires.filter((r) => !g.research.completed.includes(r));
  const levelLock = n.level && g.level < n.level;
  return (
    <div className="research-detail">
      <div className="row-between">
        <h4>{n.name}</h4>
        <span className={`status-chip ${state === 'done' ? 'good' : state === 'active' ? 'warn' : state === 'available' ? '' : 'dim'}`}>{state}</span>
      </div>
      <p>{n.description}</p>
      {n.unlocks && <p className="small">Unlocks: {n.unlocks.map((u) => BUILDINGS[u].name).join(', ')}</p>}
      <div className="row-between small muted">
        <span>{fmtNum(n.cost)} RP + {fmtMoney(n.money)} funding</span>
        {missing.length > 0 && <span>Needs: {missing.map((m) => RESEARCH_BY_ID[m].name).join(', ')}</span>}
        {levelLock ? <span>Needs level {n.level}</span> : null}
      </div>
      {state === 'available' && (
        <Button variant="primary" icon="flask" wide disabled={g.money < n.money}
          onClick={() => run((s) => A.startResearch(s, n.id), { sound: 'research' })}>
          {g.research.active ? 'Switch to this project' : 'Start research'} · {fmtMoney(n.money)}
        </Button>
      )}
    </div>
  );
}
