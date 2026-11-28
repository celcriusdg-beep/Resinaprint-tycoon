import { useState } from 'react';
import { fmt } from '../game/economy';
import {
  MAX_LEVEL, MILESTONES, UNLOCKS, claimGoal, claimMilestone, goalProgress, levelReward, milestoneState, netWorth, xpForLevel,
} from '../game/progression';
import { act, tryAct, useStore } from '../store';
import { Button, Modal, Section } from './common';

/** Level, net worth, daily goals, milestones and the unlock roadmap. */
export function GoalsScreen() {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [showClaimed, setShowClaimed] = useState(false);
  const worth = netWorth(g);
  const need = xpForLevel(g.level);
  const nextUnlocks = UNLOCKS.filter((u) => u.level > g.level).slice(0, 3);
  const ms = MILESTONES.map((m) => ({ m, st: milestoneState(g, m) }));
  const order = { ready: 0, locked: 1, claimed: 2 };
  ms.sort((a, b) => order[a.st] - order[b.st]);
  return (
    <div className="screen">
      <div className="level-card">
        <div className="level-ring"><b>{g.level}</b><span>LEVEL</span></div>
        <div className="level-info">
          <b>{g.level >= MAX_LEVEL ? 'Max level!' : `Level ${g.level + 1} in ${Math.max(0, need - g.xp).toLocaleString('en-US')} XP`}</b>
          <div className="bar big"><div style={{ width: `${g.level >= MAX_LEVEL ? 100 : (g.xp / need) * 100}%` }} /></div>
          <span className="muted small">Earn XP from every sale ($1 = 1 XP), opening packs, grading, deals, daily goals and milestones. Next level reward: {fmt(levelReward(g.level + 1))}.</span>
        </div>
      </div>
      {nextUnlocks.length > 0 && (
        <div className="next-unlocks">
          <span className="muted small">Coming up</span>
          {nextUnlocks.map((u) => (
            <div key={u.key} className="unlock-row"><span className="lvl">Lv {u.level}</span><span>{u.title}</span></div>
          ))}
        </div>
      )}

      <Section title="Net worth" right={<span className="muted small">best {fmt(g.bestWorth)}</span>}>
        <div className="worth-big">{fmt(worth.total)}</div>
        <div className="worth-split">
          <span>Cash <b>{fmt(worth.cash)}</b></span>
          <span>Sealed <b>{fmt(worth.sealed)}</b></span>
          <span>Cards <b>{fmt(worth.cards)}</b></span>
          <span>Slabs <b>{fmt(worth.slabs)}</b></span>
        </div>
        <WorthChart points={[...g.history.map((h) => ({ day: h.day, v: h.worth })), { day: g.day, v: Math.round(worth.total) }]} />
      </Section>

      <Section title={`Today's goals · day ${g.day}`} right={<span className="muted small">new goals every shop day</span>}>
        {g.goals.map((goal) => {
          const p = goalProgress(g, goal);
          const done = p >= goal.target;
          return (
            <div key={goal.id} className={`goal${goal.claimed ? ' claimed' : done ? ' ready' : ''}`}>
              <div className="goal-text">
                <b>{goal.text}</b>
                <span className="muted small">{fmt(goal.cash)} + {goal.xp.toLocaleString('en-US')} XP</span>
                <div className="bar"><div style={{ width: `${(p / goal.target) * 100}%` }} /></div>
              </div>
              {goal.claimed ? <span className="claimed-tag">✓</span> : done ? (
                <Button kind="gold" small onClick={() => tryAct((s) => claimGoal(s, goal.id), `+${fmt(goal.cash)} and ${goal.xp} XP!`)}>Claim</Button>
              ) : <span className="muted small">{goal.counter === 'revenue' ? `${fmt(p)}/${fmt(goal.target)}` : `${p}/${goal.target}`}</span>}
            </div>
          );
        })}
      </Section>

      <Section title={`Milestones · ${Object.keys(g.milestones).length}/${MILESTONES.length}`} right={<button className="link" onClick={() => setShowClaimed((v) => !v)}>{showClaimed ? 'Hide done' : 'Show done'}</button>}>
        {ms.filter(({ st }) => showClaimed || st !== 'claimed').map(({ m, st }) => {
          const p = m.progress?.(g);
          return (
            <div key={m.id} className={`goal${st === 'claimed' ? ' claimed' : st === 'ready' ? ' ready' : ''}`}>
              <div className="goal-text">
                <b>{st === 'claimed' ? '🏆 ' : ''}{m.title}</b>
                <span className="muted small">{m.text} · {fmt(m.cash)} + {m.xp.toLocaleString('en-US')} XP</span>
                {p && st === 'locked' && <div className="bar"><div style={{ width: `${(p[0] / p[1]) * 100}%` }} /></div>}
              </div>
              {st === 'ready' ? (
                <Button kind="gold" small onClick={() => tryAct((s) => claimMilestone(s, m.id), `${m.title}! +${fmt(m.cash)}`)}>Claim</Button>
              ) : st === 'claimed' ? <span className="claimed-tag">✓</span> : p ? <span className="muted small">{p[1] >= 1000 ? `${fmt(p[0])}` : `${p[0]}/${p[1]}`}</span> : null}
            </div>
          );
        })}
      </Section>

      <Section title="Unlock roadmap">
        {UNLOCKS.map((u) => (
          <div key={u.key} className={`unlock-row${g.level >= u.level ? ' done' : ''}`}>
            <span className="lvl">Lv {u.level}</span>
            <div><b>{u.title}</b><span className="muted small">{u.text}</span></div>
            <span>{g.level >= u.level ? '✓' : '🔒'}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

/** Simple line chart of net worth per shop day. */
function WorthChart({ points }: { points: { day: number; v: number }[] }) {
  if (points.length < 2) return <p className="muted small">The graph fills in as shop days close.</p>;
  const W = 320, H = 110, P = 6;
  const min = Math.min(...points.map((p) => p.v)), max = Math.max(...points.map((p) => p.v));
  const span = Math.max(1, max - min);
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const up = points[points.length - 1].v >= points[0].v;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={`${d} L${x(points.length - 1)},${H} L${x(0)},${H} Z`} className={`area${up ? '' : ' down'}`} />
        <path d={d} className={`line${up ? '' : ' down'}`} />
      </svg>
      <div className="chart-axis"><span>Day {points[0].day}</span><span>{fmt(min)} – {fmt(max)}</span><span>Day {points[points.length - 1].day}</span></div>
    </div>
  );
}

/** Celebrates each level reached, with its reward and what it unlocked. */
export function LevelUp() {
  const g = useStore((s) => s.g);
  const level = g.levelUps[0];
  if (!level) return null;
  const unlocks = UNLOCKS.filter((u) => u.level === level || (g.levelUps.length === 1 && u.level <= level && u.level > level - 1));
  const close = () => act((s) => { s.levelUps.shift(); });
  return (
    <Modal title="" onClose={close} footer={<Button kind="primary" wide onClick={close}>{g.levelUps.length > 1 ? 'Next' : 'Nice!'}</Button>}>
      <div className="levelup">
        <div className="level-ring big"><b>{level}</b><span>LEVEL</span></div>
        <b className="levelup-title">Level up!</b>
        <span className="levelup-reward">+{fmt(levelReward(level))}</span>
        {unlocks.length > 0 ? (
          <div className="levelup-unlocks">
            {unlocks.map((u) => <div key={u.key}><b>🔓 {u.title}</b><span>{u.text}</span></div>)}
          </div>
        ) : <span className="muted small">Keep going — next unlock at level {UNLOCKS.find((u) => u.level > level)?.level ?? MAX_LEVEL}.</span>}
      </div>
    </Modal>
  );
}
