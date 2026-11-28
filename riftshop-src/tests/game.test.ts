import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, CARDS, SET_IDS, SETS } from '../src/data/cards';
import { openPack } from '../src/game/packs';
import { mulberry32, setRandom } from '../src/game/rng';
import { SAVE_VERSION, addCard, advance, buySealed, endOfDay, fillRequest, newRequest, listInDisplay, migrate, newGame, openSealed, sellBulk, sendToGrading, shelveSealed } from '../src/game/sim';
import { rollGrade, slabMult } from '../src/game/grading';
import { buyFurniture, buyRack, displaySlots, floorSize, floorUsed, sellFurniture, shelfSlots, storageCap, storageUsed, upgradeFurniture } from '../src/game/shop';
import { MILESTONES, addXp, claimGoal, claimMilestone, goalProgress, isUnlocked, milestoneState, netWorth, xpForLevel } from '../src/game/progression';
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
    expect(sendToGrading(g, { uid: 0, cardId: CARDS[0].id, foil: false }, 'PSA', 'value')).toMatch(/level/i);
    g.level = 12;
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
    expect(g.version).toBe(SAVE_VERSION);
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

describe('progression', () => {
  it('levels up with XP and pays a reward', () => {
    const g = newGame();
    const cash = g.cash;
    addXp(g, xpForLevel(1) + xpForLevel(2) + 5);
    expect(g.level).toBe(3);
    expect(g.xp).toBe(5);
    expect(g.levelUps).toEqual([2, 3]);
    expect(g.cash).toBeGreaterThan(cash);
  });

  it('gates sets, cases and grading by level', () => {
    const g = newGame();
    g.cash = 1e6;
    expect(isUnlocked(g, 'set:VEN')).toBe(true);
    expect(buySealed(g, 'OGN', 'box', 1)).toMatch(/level/i);
    expect(buySealed(g, 'VEN', 'case', 1)).toMatch(/level/i);
    g.level = 10;
    expect(buySealed(g, 'OGN', 'box', 1)).toBeNull();
    expect(buySealed(g, 'VEN', 'case', 1)).toBeNull();
  });

  it('has daily goals that can be claimed once', () => {
    setRandom(mulberry32(9));
    const g = newGame();
    expect(g.goals).toHaveLength(3);
    const goal = g.goals[0];
    expect(claimGoal(g, goal.id)).not.toBeNull();
    g.todayCounts[goal.counter] = goal.target;
    expect(goalProgress(g, goal)).toBe(goal.target);
    const cash = g.cash;
    expect(claimGoal(g, goal.id)).toBeNull();
    expect(g.cash).toBe(cash + goal.cash);
    expect(claimGoal(g, goal.id)).not.toBeNull();
  });

  it('closes the day into the net-worth history and rolls new goals', () => {
    setRandom(mulberry32(4));
    const g = newGame();
    const day = g.day;
    endOfDay(g);
    expect(g.day).toBe(day + 1);
    expect(g.history).toHaveLength(1);
    expect(g.history[0].worth).toBeCloseTo(netWorth(g).total, -2);
    expect(g.goals.every((x) => !x.claimed)).toBe(true);
  });

  it('milestones become ready, then claimed', () => {
    const g = newGame();
    const m = MILESTONES.find((x) => x.id.startsWith('packs-opened'))!;
    expect(milestoneState(g, m)).toBe('locked');
    g.counts.packsOpened = 1e6;
    expect(milestoneState(g, m)).toBe('ready');
    expect(claimMilestone(g, m.id)).toBeNull();
    expect(milestoneState(g, m)).toBe('claimed');
  });

  it('migrates a version 2 save with earned XP', () => {
    const g = migrate({ version: 2, cash: 500, stats: { revenue: 20_000, packsOpened: 40, sales: 3 }, cards: {}, slabs: [] });
    expect(g.version).toBe(SAVE_VERSION);
    expect(g.level).toBeGreaterThan(3);
    expect(g.goals).toHaveLength(3);
  });
});

describe('building the shop', () => {
  it('starts with a shelf and a case, and furniture adds space', () => {
    const g = newGame();
    g.cash = 10_000;
    expect(shelfSlots(g)).toBe(3);
    expect(displaySlots(g)).toBe(6);
    expect(floorUsed(g)).toBe(2);
    expect(buyFurniture(g, 'shelf')).toBeNull();
    expect(shelfSlots(g)).toBe(6);
    expect(upgradeFurniture(g, g.furniture[2].uid)).toBeNull();
    expect(shelfSlots(g)).toBe(8);
    expect(buyFurniture(g, 'table')).toMatch(/level/i); // play tables at level 2
    g.level = 2;
    expect(buyFurniture(g, 'table')).toMatch(/floor/i); // 1 tile left, a table needs 2
    expect(buyFurniture(g, 'plant')).toBeNull();
    expect(floorUsed(g)).toBe(floorSize(g));
    expect(buyFurniture(g, 'plant')).toMatch(/floor/i);
  });

  it('will not sell a shelf that still holds product', () => {
    const g = newGame();
    expect(shelveSealed(g, 'VEN', 'pack', 2, 5)).toBeNull();
    expect(sellFurniture(g, g.furniture.find((f) => f.type === 'shelf')!.uid)).toMatch(/shelves/i);
  });

  it('limits the back room', () => {
    const g = newGame();
    g.cash = 1e6;
    g.level = 50;
    expect(storageCap(g)).toBe(240);
    expect(storageUsed(g)).toBe(18);
    expect(buySealed(g, 'VEN', 'box', 8)).toBeNull();
    g.bought = {};
    expect(buySealed(g, 'VEN', 'box', 1)).toBeNull(); // 18 + 9 × 24 = 234
    expect(buySealed(g, 'VEN', 'box', 1)).toMatch(/back room is full/i);
    expect(buyRack(g)).toBeNull();
    expect(buySealed(g, 'VEN', 'box', 1)).toBeNull();
    expect(buyRack(g)).toMatch(/bigger shop/i);
  });

  it('fills card requests from the binder', () => {
    setRandom(mulberry32(21));
    const g = newGame();
    const r = newRequest(g, 'player')!;
    expect(r).toBeTruthy();
    expect(r.pay).toBeGreaterThan(0);
    expect(fillRequest(g, r.id)).toMatch(/don/i);
    addCard(g, r.cardId, r.foil);
    const cash = g.cash;
    expect(fillRequest(g, r.id)).toBeNull();
    expect(g.cash).toBeCloseTo(cash + r.pay, 5);
    expect(g.requests).toHaveLength(0);
    expect(g.counts.requestsFilled).toBe(1);
  });

  it('customers of every type show up and buy', () => {
    setRandom(mulberry32(8));
    const g = newGame();
    g.level = 20;
    g.shopLevel = 4;
    g.cash = 1e6;
    g.sealed = { 'VEN:pack': 200, 'VEN:box': 10 };
    shelveSealed(g, 'VEN', 'pack', 200, sealedValue(g, 'VEN', 'pack'));
    shelveSealed(g, 'VEN', 'box', 10, sealedValue(g, 'VEN', 'box'));
    advance(g, 24);
    const who = new Set(g.feed.map((f) => f.who).filter(Boolean));
    expect(g.counts.packsSold).toBeGreaterThan(20);
    expect(who.size).toBeGreaterThanOrEqual(3);
  });

  it('furnishes an old save with the space it had', () => {
    const g = migrate({ version: 3, shopLevel: 3, level: 8, xp: 0, shelf: [], display: [], cards: {}, slabs: [], stats: { revenue: 0, packsOpened: 0, sales: 0 } });
    expect(g.version).toBe(4);
    expect(shelfSlots(g)).toBeGreaterThanOrEqual(8);
    expect(displaySlots(g)).toBeGreaterThanOrEqual(24);
    expect(floorUsed(g)).toBeLessThanOrEqual(floorSize(g));
  });
});
