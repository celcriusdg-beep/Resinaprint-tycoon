import { useGame } from '../../stores/gameStore';
import { getMods } from '../../game/simulation/modifiers';
import {
  ROLES, ROLE_INFO, KEY_ROLES, KEY_INFO, TRAITS, staffEffects, totalHired, inTraining, keyHireFee, type Role,
} from '../../game/staff/staff';
import { DAY_LENGTH } from '../../game/constants';
import { fmtMoney, fmtNum, fmtPct, fmtTime } from '../../ui/format';
import { run, A } from '../../ui/actions';
import { Bar, Button, Stat, Section, Toggle } from '../ui/common';
import { Icon } from '../ui/Icons';
import { LOCATION_BY_ID } from '../../game/progression/locations';

// Staff & shifts for the active site: headcount per role, hiring and
// training, shift pattern, fatigue and morale, key people and the training
// program.

export function StaffPanel() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const staff = site.staff;
  const mods = getMods(g, site.id);
  const fx = staffEffects(site, mods.salary);
  const office = site.stats.staffCap;
  const used = totalHired(staff);
  const trainCost = A.trainingCost(g);
  return (
    <div className="panel-stack staff">
      <div className="stat-grid">
        <Stat label="Employees" value={`${fmtNum(used)} / ${fmtNum(office)}`} sub="desks (Administration Buildings)" tone={used >= office ? 'warn' : undefined} />
        <Stat label="Payroll" value={`${fmtMoney(fx.salaries)}/s`} sub={fx.overtime > 0 ? `incl. overtime ${fmtMoney(fx.overtime * 1.5)}/s` : 'no overtime'} tone={fx.overtime > 0 ? 'warn' : undefined} />
        <Stat label="Fatigue" value={fmtPct(staff.fatigue)} tone={staff.fatigue > 0.7 ? 'bad' : staff.fatigue > 0.45 ? 'warn' : 'good'} sub={<Bar value={staff.fatigue} warn={staff.fatigue > 0.45} />} />
        <Stat label="Morale" value={fmtPct(staff.morale)} tone={staff.morale < 0.45 ? 'bad' : staff.morale < 0.6 ? 'warn' : 'good'} sub={<Bar value={staff.morale} warn={staff.morale < 0.45} />} />
      </div>

      <Section title={`People at ${LOCATION_BY_ID[site.id].name}`}>
        <Toggle on={staff.autoHire} onChange={(v) => run((s) => A.setAutoHire(s, v))} label="Auto-hire"
          sub="Recruits whoever is missing when a building needs people (pays the recruitment fee)." />
        <div className="staff-rows">
          {ROLES.map((r) => <RoleRow key={r} role={r} need={fx.needs[r]} cover={fx.cover[r]} />)}
        </div>
      </Section>

      <Section title="Shift pattern">
        <div className="seg">
          <button type="button" className={staff.shift === '3x8' ? 'on' : ''} onClick={() => run((s) => A.setShift(s, '3x8'))}>
            <b>3 × 8 hours</b><span>Rested crews, needs more operators</span>
          </button>
          <button type="button" className={staff.shift === '2x12' ? 'on' : ''} onClick={() => run((s) => A.setShift(s, '2x12'))}>
            <b>2 × 12 hours</b><span>20% fewer operators, more fatigue</span>
          </button>
        </div>
        <p className="muted small">Short crews work overtime (paid 1.5×, up to a quarter of the gap). Overtime and long shifts build fatigue; tired crews make operator errors that trip reactors, and unhappy people quit.</p>
      </Section>

      <Section title="Key people">
        <div className="key-slots">
          {KEY_ROLES.map((kr) => {
            const p = staff.key[kr];
            return (
              <div key={kr} className={`key-slot${p ? ' filled' : ''}`}>
                <div className="key-title">{KEY_INFO[kr].title}</div>
                {p ? (
                  <>
                    <div className="key-name">{p.name} <span className="lvl">L{p.level}</span></div>
                    <div className="muted small">{TRAITS[p.trait].name} · {fmtMoney(p.salary)}/s</div>
                    {p.level < 3 && <Bar value={p.xp} max={DAY_LENGTH * 3} height={4} />}
                    <Button small variant="ghost" icon="x" onClick={() => run((s) => A.dismissKeyPerson(s, kr))}>Dismiss</Button>
                  </>
                ) : <div className="muted small">Vacant — {KEY_INFO[kr].bonus}</div>}
              </div>
            );
          })}
        </div>
        <div className="wx-h">Candidates today</div>
        <div className="list">
          {g.candidates.map((c) => (
            <div key={c.id} className="cand">
              <div>
                <b>{c.name}</b> <span className="lvl">L{c.level}</span>
                <div className="small">{KEY_INFO[c.role].title} — {KEY_INFO[c.role].bonus}</div>
                <div className="muted small"><b>{TRAITS[c.trait].name}:</b> {TRAITS[c.trait].text} Salary {fmtMoney(c.salary)}/s.</div>
              </div>
              <Button small variant="primary" disabled={g.money < keyHireFee(c)} onClick={() => run((s) => A.hireKeyPerson(s, c.id), { sound: 'complete' })}>
                {staff.key[c.role] ? 'Replace' : 'Hire'} · {fmtMoney(keyHireFee(c))}
              </Button>
            </div>
          ))}
          {!g.candidates.length && <div className="muted small">New candidates arrive every game day.</div>}
        </div>
      </Section>

      <Section title="Training program">
        <p className="muted small">Company-wide: +4% reactor output and research per level, +10% salaries, and better morale.</p>
        <div className="row-between">
          <span>Level {g.staffTraining} / 8</span>
          <Button variant="primary" icon="up" disabled={g.staffTraining >= 8 || g.money < trainCost} onClick={() => run((s) => A.trainStaff(s), { sound: 'complete' })}>
            {g.staffTraining >= 8 ? 'Maxed' : `Train · ${fmtMoney(trainCost)}`}
          </Button>
        </div>
      </Section>
    </div>
  );
}

function RoleRow({ role, need, cover }: { role: Role; need: number; cover: number }) {
  const g = useGame();
  const staff = g.sites[g.activeSite].staff;
  const info = ROLE_INFO[role];
  const hired = staff.hired[role];
  const training = inTraining(staff, role);
  const nextReady = staff.training.filter((t) => t.role === role).reduce((a, t) => Math.min(a, t.ready), Infinity);
  const short = need > hired;
  return (
    <div className={`role-row${cover < 0.8 ? ' bad' : cover < 0.999 ? ' warn' : ''}`}>
      <div className="role-main">
        <div className="row-between">
          <b>{info.plural}</b>
          <span className="mono">{fmtNum(hired)} / {fmtNum(need)}</span>
        </div>
        <Bar value={cover} max={1} height={5} warn={cover < 0.999} />
        <div className="muted small">
          {info.job}
          {training > 0 && <> · <Icon name="flask" size={11} /> {fmtNum(training)} in training ({fmtTime(Math.max(0, nextReady - g.gameTime))})</>}
        </div>
      </div>
      <div className="role-btns">
        <button type="button" className="round-btn sm" aria-label={`Let one ${info.name} go`} disabled={hired <= 0} onClick={() => run((s) => A.fireStaff(s, role, 1))}><Icon name="minus" size={16} /></button>
        <button type="button" className={`round-btn sm${short ? ' primary' : ''}`} aria-label={`Hire one ${info.name} for ${fmtMoney(info.fee)}`} onClick={() => run((s) => A.hireStaff(s, role, Math.max(1, short ? need - hired : 1)), { sound: 'cash' })}><Icon name="plus" size={16} /></button>
      </div>
    </div>
  );
}
