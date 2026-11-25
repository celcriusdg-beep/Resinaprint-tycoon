import { useGame } from '../../stores/gameStore';
import { calendar, forecast, skyLabel, waterLabel, SEASONS, FRONT_LABEL, FRONT_TIP, DAYS_PER_SEASON, type FrontKind } from '../../game/weather/weather';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { run, A } from '../../ui/actions';
import { Stat, Toggle } from '../ui/common';
import { Icon, type IconName } from '../ui/Icons';
import { fmtPct } from '../../ui/format';

// Weather & seasons: today's conditions, how they affect the plant, and a
// three-day forecast (fronts are planned ahead, so the forecast is reliable).

const FRONT_ICON: Record<FrontKind, IconName> = { heatwave: 'thermo', coldsnap: 'snow', storm: 'wind', rain: 'rain', drought: 'sun' };

export function seasonText(gameTime: number): string {
  const c = calendar(gameTime);
  return `${SEASONS[c.season]} · day ${c.dayOfSeason}/${DAYS_PER_SEASON} · year ${c.year}`;
}

function effect(v: number): { text: string; tone?: 'good' | 'bad' | 'warn' } {
  const pct = Math.round((v - 1) * 100);
  if (Math.abs(pct) < 2) return { text: 'normal' };
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, tone: pct > 0 ? 'good' : pct < -12 ? 'bad' : 'warn' };
}

export function WeatherPanel() {
  const g = useGame();
  const site = g.sites[g.activeSite];
  const w = site.weather;
  const sky = skyLabel(site, g.gameTime);
  const days = forecast(site, g.gameTime, 3);
  const f = w.f;
  const hasOnce = site.buildings.some((b) => b.type === 'cooling_seawater');
  const hasDry = site.buildings.some((b) => b.type === 'cooling_dry' || b.type === 'cooling_sky' || b.type === 'cooling_hybrid');
  const intakes = site.buildings.some((b) => b.type === 'water_intake' || b.type === 'intake_large');
  const rows: [string, number, string][] = [
    ['Cooling towers (wet)', f.wet, 'Evaporative cooling depends on the wet-bulb temperature: hot, humid air hurts most.'],
    ...(hasDry ? [['Dry & air cooling', f.dry, 'Air-cooled condensers lose capacity as the air warms.'] as [string, number, string]] : []),
    ...(hasOnce ? [['Once-through cooling', f.once, `Limited by the ${waterLabel(site.id).toLowerCase()} temperature and the discharge limit.`] as [string, number, string]] : []),
    ['Intake water', f.intake, 'River flow, droughts and ice on the intake screens.'],
    ['Electricity demand', f.demand, 'Heating in cold weather, air-conditioning in hot weather.'],
    ['Grid export', f.grid, 'Storm damage on the transmission network.'],
  ];
  return (
    <div className="panel-stack weather">
      <div className="wx-now">
        <Icon name={sky.icon} size={40} />
        <div>
          <div className="wx-temp">{Math.round(w.air)}°C <span className="muted">{sky.label}</span></div>
          <div className="muted small">{LOCATION_BY_ID[site.id].name} · {seasonText(g.gameTime)}</div>
        </div>
      </div>
      <div className="stat-grid">
        <Stat label="Humidity" value={fmtPct(w.humidity)} />
        <Stat label="Wind" value={`${Math.round(w.wind)} m/s`} tone={w.wind > 20 ? 'bad' : w.wind > 14 ? 'warn' : undefined} />
        <Stat label={w.air < 0.5 ? 'Snowfall' : 'Rain'} value={`${w.rain.toFixed(1)} mm/h`} sub={w.snow > 0.05 ? `snow cover ${fmtPct(w.snow)}` : undefined} />
        <Stat label={`${waterLabel(site.id)}`} value={`${Math.round(w.waterTemp)}°C`} sub={waterLabel(site.id) === 'Sea' ? 'sea temperature' : `flow ${fmtPct(w.riverFlow)} of normal`} tone={w.riverFlow < 0.7 ? 'warn' : undefined} />
      </div>

      <div className="flow-card">
        <b>Effect on your plant right now</b>
        {rows.map(([label, v, tip]) => {
          const e = effect(v);
          return (
            <div key={label} className="row-between wx-row" title={tip}>
              <span>{label}</span>
              <span className={`mono ${e.tone ?? ''}`}>{e.text}</span>
            </div>
          );
        })}
      </div>

      {intakes && (
        <Toggle on={w.deice} onChange={(v) => run((s) => A.setDeice(s, s.activeSite, v))} label="Intake de-icing"
          sub="Heats the intake screens below −3 °C so ice can't block them. Uses 1.5 MW per intake level while it runs." />
      )}

      <h3 className="wx-h">Forecast</h3>
      <div className="wx-days">
        {days.map((d, i) => (
          <div key={d.day} className={`wx-day${d.fronts.includes('heatwave') || d.fronts.includes('storm') ? ' alert' : ''}`}>
            <div className="wx-day-name">{i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${SEASONS[d.season]} ${d.dayOfSeason}`}</div>
            <Icon name={d.fronts.includes('storm') ? 'wind' : d.rain > 0.3 ? (d.min < 0 ? 'snow' : 'rain') : d.fronts.includes('heatwave') ? 'thermo' : d.fronts.includes('coldsnap') ? 'snow' : 'sun'} size={24} />
            <div className="mono">{Math.round(d.max)}° / {Math.round(d.min)}°</div>
            <div className="muted small">wind {Math.round(d.maxWind)} m/s</div>
            {d.fronts.filter((k) => k !== 'rain').map((k) => <div key={k} className="wx-tag">{FRONT_LABEL[k]}</div>)}
          </div>
        ))}
      </div>
      {[...new Set(days.flatMap((d) => d.fronts))].filter((k) => k !== 'rain').map((k) => (
        <div key={k} className="hint-box"><Icon name={FRONT_ICON[k]} size={15} /> <b>{FRONT_LABEL[k]}:</b> {FRONT_TIP[k]}</div>
      ))}
      <p className="edu-note">Seasons last {DAYS_PER_SEASON} game days (a year ≈ 2 hours). Real plants derate in hot summers when rivers warm up and cooling towers lose capacity; storms can bring down overhead lines, while buried superconducting links are safe.</p>
    </div>
  );
}
