import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, CARDS, SET_IDS, SETS } from '../src/data/cards';
import { openPack } from '../src/game/packs';
import { mulberry32, setRandom } from '../src/game/rng';
import { advance, buySealed, listInDisplay, migrate, newGame, openSealed, sellBulk, sendToGrading, shelveSealed } from '../src/game/sim';
import { rollGrade, slabMult } from '../src/game/grading';
import { rawValue, sealedValue, wholesale } from '../src/game/economy';

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
  it('only sells what you put on the shelf, at your price', () => {
    setRandom(mulberry32(3));
    const g = newGame();
    g.cash = 5_000;
    advance(g, 6);
    expect(g.stats.sales).toBe(0); // nothing listed, nothing sold
    expect(buySealed(g, 'VEN', 'box', 2)).toBeNull();
    openSealed(g, 'VEN', 'box');
    expect(g.sealed['VEN:pack']).toBe(12 + 24);
    const v = sealedValue(g, 'VEN', 'pack');
    expect(shelveSealed(g, 'VEN', 'pack', 30, v)).toBeNull();
    expect(g.sealed['VEN:pack']).toBe(6);
    advance(g, 12);
    expect(g.stats.sales).toBeGreaterThan(5);
    // Way overpriced: nobody buys.
    const g2 = newGame();
    shelveSealed(g2, 'VEN', 'pack', 12, v * 3);
    advance(g2, 12);
    expect(g2.stats.sales).toBe(0);
    expect(g2.feed.some((f) => f.kind === 'leave')).toBe(true);
  });

  it('grades with PSA and Beckett and slabs the card', () => {
    setRandom(mulberry32(11));
    const g = newGame();
    g.cash = 1_000;
    openSealed(g, 'VEN', 'pack');
    const ids = Object.keys(g.cards);
    const one = (i: number) => ({ uid: 0, cardId: ids[i], foil: g.cards[ids[i]][0] === 0 });
    expect(sendToGrading(g, one(0), 'PSA', 'express')).toBeNull();
    expect(sendToGrading(g, one(1), 'BGS', 'express')).toBeNull();
    advance(g, 13);
    expect(g.slabs.length).toBe(2);
    expect(g.reveals.length).toBe(2);
    const psa = g.slabs.find((x) => x.slab!.company === 'PSA')!;
    const bgs = g.slabs.find((x) => x.slab!.company === 'BGS')!;
    expect(Number.isInteger(psa.slab!.grade)).toBe(true);
    expect(bgs.slab!.sub).toBeDefined();
    expect(listInDisplay(g, psa, 99)).toBeNull();
    expect(g.display[0].slab).toBeDefined();
  });

  it('Beckett overall grades follow the subgrades', () => {
    setRandom(mulberry32(5));
    let black = 0;
    for (let i = 0; i < 50000; i++) {
      const s = rollGrade('BGS', i);
      const subs = Object.values(s.sub!);
      expect(s.grade).toBeLessThanOrEqual(Math.min(...subs) + 1);
      if (s.black) { black++; expect(s.grade).toBe(10); }
    }
    expect(black).toBeGreaterThan(0);
    expect(black).toBeLessThan(60);
  });

  it('values slabs: BGS 10 is 5% under PSA 10, Black Label is ~12x on chase cards', () => {
    const psa10 = slabMult({ company: 'PSA', grade: 10, cert: 1 }, 3000);
    const bgs10 = slabMult({ company: 'BGS', grade: 10, cert: 1 }, 3000);
    expect(bgs10 / psa10).toBeCloseTo(0.95, 5);
    const black = 3000 * slabMult({ company: 'BGS', grade: 10, black: true, cert: 1 }, 3000);
    expect(black).toBeGreaterThanOrEqual(30_000);
    expect(black).toBeLessThanOrEqual(40_000);
  });

  it('migrates a version 1 save', () => {
    const g = migrate({ version: 1, cash: 42, cards: { [CARDS[0].id]: [2, 0] }, graded: [{ uid: 5, cardId: CARDS[0].id, foil: false, grade: 9 }], markup: { pack: 1.1 } });
    expect(g.version).toBe(2);
    expect(g.cash).toBe(42);
    expect(g.slabs[0].slab).toMatchObject({ company: 'PSA', grade: 9 });
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
