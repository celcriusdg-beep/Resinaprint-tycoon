import { useGame } from '../../stores/gameStore';
import { fmtPower, fmtPct } from '../../ui/format';
import { Bar } from '../ui/common';

/** Heat → steam → electricity → grid balance with the current bottleneck. */
export function PlantBalance({ compact }: { compact?: boolean }) {
  const g = useGame();
  const st = g.sites[g.activeSite].stats;
  const rows = [
    { label: 'Reactor heat', value: st.thermalMW, cap: st.thermalMW, hint: '' },
    { label: 'Turbine capacity', value: st.steamUsedMW, cap: st.steamCapMW, hint: st.thermalMW > st.steamCapMW * 1.01 ? 'Turbines are limiting output — build or upgrade Turbine Halls.' : '' },
    { label: 'Cooling capacity', value: st.heatRejectMW, cap: st.coolingCapMW, hint: st.coolingRatio < 1 ? 'Cooling is overloaded — reactors are heating up!' : st.coolingRatio < 1.1 ? 'Cooling margin is thin.' : '' },
    { label: 'Grid export', value: st.exportMW, cap: st.gridCapMW, hint: st.curtailedMW > 0.5 ? `${fmtPower(st.curtailedMW)} is being curtailed — add Substations.` : '' },
  ];
  const staffShort = st.staffFactor < 0.999;
  const hints = rows.map((r) => r.hint).filter(Boolean);
  if (staffShort) hints.push(`Understaffed (${Math.round(st.staffNeeded)}/${Math.round(st.staffCap)}) — build an Administration Building.`);
  return (
    <div className={`balance${compact ? ' compact' : ''}`}>
      {rows.slice(1).map((r) => {
        const frac = r.cap > 0 ? r.value / r.cap : r.value > 0 ? 2 : 0;
        return (
          <div key={r.label} className="balance-row">
            <div className="balance-label">
              <span>{r.label}</span>
              <span className="mono">{fmtPower(r.value)} / {fmtPower(r.cap)}</span>
            </div>
            <Bar value={Math.min(1, frac)} warn={frac > 0.95} color={frac > 1 ? '#ff5a5a' : undefined} />
          </div>
        );
      })}
      <div className="balance-foot">
        <span>Heat {fmtPower(st.thermalMW)}</span>
        <span>Efficiency {fmtPct(st.efficiency * st.staffFactor, 1)}</span>
        <span>Demand {fmtPower(st.demandMW)}</span>
      </div>
      {hints.length > 0 && <div className="balance-hint">{hints[0]}</div>}
    </div>
  );
}
