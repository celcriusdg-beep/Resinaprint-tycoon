import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, SET_IDS, SETS } from '../src/data/cards';
import { openPack } from '../src/game/packs';
import { mulberry32, setRandom } from '../src/game/rng';
import { advance, buySealed, newGame, openSealed, sellBulk, sendToGrading, listInDisplay } from '../src/game/sim';
import { rawValue, wholesale } from '../src/game/economy';

describe('booster packs', () => {
  it('follow the published structure and odds', () => {
    setRandom(mulberry32(7));
    for (const set of SET_IDS) {
      const N = 24 * 200;
      let epics = 0, alts = 0, overs = 0, valueSum = 0;
      const g = newGame();
      for (let i = 0; i < N; i++) {
        const p = openPack(set);
        expect(p).toHaveLength(14);
        expect(p.filter((x) => x.slot === 'common')).toHaveLength(7);
        expect(p.filter((x) => x.slot === 'foil')).toHaveLength(1);
        for (const x of p) {
          const c = CARD_BY_ID[x.cardId];
          expect(c.set).toBe(set);
          if (x.slot === 'rare' && c.rarity === 'Epic') epics++;
          if (x.slot === 'foil' && c.kind === 'alt') alts++;
          if (x.slot === 'foil' && (c.kind === 'over' || c.kind === 'sig')) overs++;
          valueSum += rawValue(g, x.cardId, x.foil);
        }
      }
      const boxes = N / 24;
      expect(epics / N).toBeGreaterThan(0.2);
      expect(epics / N).toBeLessThan(0.3);
      expect(alts / boxes).toBeGreaterThan(1.6);
      expect(alts / boxes).toBeLessThan(2.4);
      expect(overs / boxes).toBeGreaterThan(0.2);
      expect(overs / boxes).toBeLessThan(0.5);
      // A box is worth opening on average, but not wildly more than buying it sealed.
      const ev = (valueSum / N) * 24;
      console.log(set, 'box EV', ev.toFixed(0), 'box market', SETS[set].box, 'wholesale', wholesale(g, set, 'box'));
      expect(ev).toBeGreaterThan(SETS[set].box * 0.25);
      expect(ev).toBeLessThan(SETS[set].box * 3);
    }
  });
});

describe('the shop', () => {
  it('buys stock, opens a box, sells to customers and pays rent', () => {
    setRandom(mulberry32(3));
    const g = newGame();
    g.cash = 5_000;
    expect(buySealed(g, 'VEN', 'box', 2)).toBeNull();
    expect(g.sealed['VEN:box']).toBe(2);
    openSealed(g, 'VEN', 'box');
    expect(g.sealed['VEN:pack']).toBe(12 + 24);
    for (let i = 0; i < 5; i++) openSealed(g, 'VEN', 'pack');
    expect(g.stats.packsOpened).toBe(5);
    const cash0 = g.cash;
    advance(g, 24);
    expect(g.day).toBe(3);
    expect(g.stats.sales).toBeGreaterThan(10);
    expect(g.cash).not.toBe(cash0);
  });

  it('grades cards and lists them', () => {
    setRandom(mulberry32(11));
    const g = newGame();
    g.cash = 1_000;
    openSealed(g, 'VEN', 'pack');
    const id = Object.keys(g.cards)[0];
    const foil = g.cards[id][0] === 0;
    expect(sendToGrading(g, { uid: 0, cardId: id, foil }, 'express')).toBeNull();
    advance(g, 5);
    expect(g.graded.length).toBe(1);
    const gr = g.graded[0];
    expect(gr.grade).toBeGreaterThanOrEqual(3);
    expect(listInDisplay(g, gr, 99)).toBeNull();
    expect(g.graded.length).toBe(0);
    expect(g.display.length).toBe(1);
  });

  it('sells bulk', () => {
    setRandom(mulberry32(2));
    const g = newGame();
    for (let i = 0; i < 6; i++) openSealed(g, 'UNL', 'pack');
    const r = sellBulk(g, 1, true);
    expect(r.count).toBeGreaterThan(20);
    expect(r.total).toBeGreaterThan(0);
  });
});
