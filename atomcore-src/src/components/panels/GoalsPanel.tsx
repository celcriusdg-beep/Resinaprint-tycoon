import { useState } from 'react';
import { useGame } from '../../stores/gameStore';
import { ACHIEVEMENTS } from '../../game/progression/achievements';
import { MILESTONES } from '../../game/progression/milestones';
import { DAILY_LABEL } from '../../game/progression/daily';
import { xpForNext, levelTitle, demandForLevel, levelReward } from '../../game/progression/levels';
import { fmtMoney, fmtNum, fmtPower, fmtTime, fmtEnergy } from '../../ui/format';
import { run, A } from '../../ui/actions';
import { Bar, Button, Section, Tabs } from '../ui/common';
import { Icon } from '../ui/Icons';

type Tab = 'progress' | 'daily' | 'achievements' | 'stats';

export function GoalsPanel() {
  const g = useGame();
  const [tab, setTab] = useState<Tab>(g.daily.objectives.some((o) => !o.claimed && o.progress >= o.target) ? 'daily' : 'progress');
  return (
    <div className="panel-stack">
      <div className="level-card">
        <div className="level-big">{g.level}</div>
        <div className="grow">
          <div className="level-title">{levelTitle(g.level)}</div>
          <Bar value={g.xp} max={xpForNext(g.level)} height={8} />
          <div className="muted small">{fmtNum(g.xp)} / {fmtNum(xpForNext(g.level))} XP (1 XP per MWh sold) · next: +{fmtMoney(levelReward(g.level + 1))}, demand {fmtPower(demandForLevel(g.level + 1))}</div>
        </div>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'progress', label: 'Milestones' }, { id: 'daily', label: 'Daily' }, { id: 'achievements', label: 'Achievements' }, { id: 'stats', label: 'Stats' }]} />
      {tab === 'progress' && <Milestones />}
      {tab === 'daily' && <Daily />}
      {tab === 'achievements' && <Achievements />}
      {tab === 'stats' && <Stats />}
    </div>
  );
}

function Milestones() {
  const g = useGame();
  return (
    <div className="milestones">
      {MILESTONES.map((m, i) => {
        const state = i < g.milestone ? 'done' : i === g.milestone ? 'current' : 'future';
        if (i > g.milestone + 3) return null;
        return (
          <div key={i} className={`ms-row ${state}`}>
            <div className="ms-icon">{state === 'done' ? <Icon name="check" size={16} /> : i + 1}</div>
            <div className="grow">
              <div className="ms-title">{m.title}</div>
              {state === 'current' && <div className="muted small">{m.hint}</div>}
            </div>
            <div className="ms-reward mono">{fmtMoney(m.reward)}</div>
          </div>
        );
      })}
      {g.milestone >= MILESTONES.length && <div className="empty">All milestones complete. Remarkable.</div>}
    </div>
  );
}

function Daily() {
  const g = useGame();
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return (
    <>
      <div className="muted small">New objectives in {fmtTime((midnight.getTime() - now.getTime()) / 1000)} (local midnight).</div>
      {g.daily.objectives.map((o) => {
        const done = o.progress >= o.target;
        return (
          <div key={o.id} className={`daily ${o.claimed ? 'claimed' : done ? 'ready' : ''}`}>
            <div className="row-between">
              <span>{DAILY_LABEL[o.kind](o.target)}</span>
              <span className="mono small">{o.kind === 'earn' ? fmtMoney(o.progress) : fmtNum(o.progress)} / {o.kind === 'earn' ? fmtMoney(o.target) : fmtNum(o.target)}</span>
            </div>
            <Bar value={o.progress} max={o.target} />
            <div className="row-between">
              <span className="muted small">Reward {fmtMoney(o.reward)} + {fmtNum(o.rewardXp)} XP</span>
              <Button small variant={done && !o.claimed ? 'good' : 'ghost'} disabled={!done || o.claimed} onClick={() => run((s) => A.claimDaily(s, o.id), { sound: 'cash' })}>
                {o.claimed ? 'Claimed' : 'Claim'}
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Achievements() {
  const g = useGame();
  const got = new Set(g.achievements);
  return (
    <>
      <div className="muted small">{got.size} / {ACHIEVEMENTS.length} unlocked</div>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={`ach ${got.has(a.id) ? 'got' : ''}`}>
            <Icon name={got.has(a.id) ? 'trophy' : 'lock'} size={18} />
            <div>
              <div className="ach-name">{a.name}</div>
              <div className="ach-desc">{a.description}</div>
              {a.reward > 0 && <div className="ach-reward">{fmtMoney(a.reward)}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stats() {
  const g = useGame();
  const s = g.stats;
  const rows: [string, string][] = [
    ['Play time (this run)', fmtTime(s.playTime)],
    ['Energy sold', fmtEnergy(s.energyMWh)],
    ['Peak output', fmtPower(s.peakMW)],
    ['Buildings constructed', `${s.buildingsBuilt}`],
    ['Upgrades', `${s.upgrades}`],
    ['Research projects', `${s.researchDone}`],
    ['Contracts completed', `${s.contractsDone}`],
    ['SCRAMs', `${s.scrams}`],
    ['Repairs', `${s.repairs}`],
    ['Events', `${s.eventsSeen}`],
    ['Restructurings', `${g.prestige.count}`],
    ['Shares', `${g.prestige.shares}`],
  ];
  return (
    <Section title="Company statistics">
      <table className="pl"><tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="mono">{v}</td></tr>)}</tbody></table>
    </Section>
  );
}
