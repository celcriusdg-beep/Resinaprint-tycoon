import { RANDOM_INCIDENTS } from '../src/game/accidents/accidents';
RANDOM_INCIDENTS.on = false; // deterministic: no random incidents
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { tick } from '../src/game/engine';
import * as A from '../src/game/actions';
import { migrate, toEnvelope } from '../src/systems/save/serialize';
import { calendar, forecast, conditionsAt, stepWeather, wetBulb, DAYS_PER_SEASON, YEAR_DAYS } from '../src/game/weather/weather';
import { DAY_LENGTH } from '../src/game/constants';
import { diagnoseSite } from '../src/game/diagnostics';
import type { GameState } from '../src/game/types';

const run = (s: GameState, sec: number, dt = 0.5) => { for (let t = 0; t < sec; t += dt) tick(s, dt); };

describe('weather & seasons', () => {
  it('has four 7-day seasons', () => {
    expect(calendar(0).season).toBe(0);
    expect(calendar(DAY_LENGTH * DAYS_PER_SEASON + 1).season).toBe(1);
    expect(calendar(DAY_LENGTH * DAYS_PER_SEASON * 3 + 1).season).toBe(3);
    expect(calendar(DAY_LENGTH * YEAR_DAYS + 1)).toMatchObject({ season: 0, year: 2, dayOfSeason: 1 });
  });

  it('wet-bulb temperature is below the air temperature unless saturated', () => {
    expect(wetBulb(20, 0.5)).toBeCloseTo(13.7, 0);
    expect(wetBulb(30, 0.99)).toBeGreaterThan(29.5);
  });

  it('summer is hotter than winter, and hot weather weakens wet cooling', () => {
    const s = createInitialState();
    const site = s.sites.riverside;
    const avg = (day0: number) => {
      let air = 0, wet = 0, n = 0;
      for (let d = day0; d < day0 + 7; d++) for (let h = 0; h < 24; h += 3) {
        s.gameTime = (d + h / 24) * DAY_LENGTH;
        stepWeather(s, site, 0.1, true);
        air += site.weather.air; wet += site.weather.f.wet; n++;
      }
      return { air: air / n, wet: wet / n };
    };
    const summer = avg(7), winter = avg(21);
    expect(summer.air - winter.air).toBeGreaterThan(10);
    expect(summer.wet).toBeLessThan(winter.wet);
    expect(summer.wet).toBeGreaterThan(0.75);
  });

  it('the forecast matches the weather that actually comes', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const site = s.sites.riverside;
    run(s, 10);
    const fc = forecast(site, s.gameTime, 3);
    expect(fc.length).toBe(3);
    const tomorrow = fc[1];
    let max = -Infinity;
    for (let h = 0; h < 24; h++) max = Math.max(max, conditionsAt(site, (tomorrow.day + (h + 0.5) / 24) * DAY_LENGTH).air);
    run(s, DAY_LENGTH * 1.2, 1);
    expect(Math.abs(max - tomorrow.max)).toBeLessThan(0.01);
  });

  it('storms bring down overhead lines, which can be repaired', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    s.money = 1e6;
    const site = s.sites.riverside;
    run(s, 5);
    site.weather.fronts.push({ kind: 'storm', start: s.gameTime, end: s.gameTime + 4000, strength: 1 });
    site.weather.fronts.sort((a, b) => a.start - b.start);
    const cable = site.links.find((l) => l.kind === 'power')!;
    for (let i = 0; i < 30000 && !cable.broken; i++) tick(s, 0.1);
    expect(cable.broken).toBe(true);
    run(s, 1, 0.1);
    expect(site.stats.exportMW).toBe(0);
    expect(diagnoseSite(s, site).some((i) => i.title.startsWith('Storm damage'))).toBe(true);
    expect(A.repairLink(s, cable.id)).toBeNull();
    expect(cable.broken).toBe(false);
  });

  it('droughts lower the river; frost ices intakes unless de-icing is on', () => {
    const s = createInitialState();
    s.nextEventIn = 1e9;
    const site = s.sites.riverside;
    run(s, 2);
    site.weather.fronts = [{ kind: 'drought', start: s.gameTime, end: s.gameTime + DAY_LENGTH * 4, strength: 1 }];
    site.weather.planned = s.gameTime + DAY_LENGTH * 5;
    run(s, DAY_LENGTH * 2, 2);
    expect(site.weather.riverFlow).toBeLessThan(0.75);
    site.buildings.push({ ...site.buildings[2], id: 999, type: 'water_intake', x: 1, z: 1 });
    site.weather.fronts = [{ kind: 'coldsnap', start: s.gameTime, end: s.gameTime + DAY_LENGTH * 3, strength: 1 }];
    s.gameTime = DAY_LENGTH * (YEAR_DAYS - 3.5);
    site.weather.fronts[0].start = s.gameTime - 100;
    site.weather.fronts[0].end = s.gameTime + DAY_LENGTH * 2;
    site.weather.planned = s.gameTime + DAY_LENGTH * 5;
    stepWeather(s, site, 0.5, false);
    expect(site.weather.air).toBeLessThan(-3);
    const iced = site.weather.f.intake;
    expect(A.setDeice(s, 'riverside', true)).toBeNull();
    stepWeather(s, site, 0.5, false);
    expect(site.weather.f.intake).toBeGreaterThan(iced * 1.5);
  });

  it('older saves get weather on load', () => {
    const s = createInitialState();
    const env = JSON.parse(JSON.stringify(toEnvelope(s)));
    env.state.version = 4;
    for (const x of Object.values(env.state.sites) as { weather?: unknown }[]) delete x.weather;
    const loaded = migrate(env);
    expect(loaded.sites.riverside.weather.fronts.length).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(loaded.sites.riverside.weather.air)).toBe(true);
    run(loaded, 5);
  });
});
