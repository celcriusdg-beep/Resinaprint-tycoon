'use strict';
// Realm Heroes: battle simulation and stat math. No DOM: the battle is computed up front as a
// list of events, then battle.js plays them back as animation (or skips straight to the result).

function rngFrom(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function maxLevel(stars) { return 10 + 20 * (stars - 2); } // 3★ 30, 4★ 50, 5★ 70, 6★ 90, 7★ 110
function starCost(id, stars) { return stars - RARITY[HMAP[id].rar].stars + 1; } // copies to reach the next star

function heroStats(id, lvl, stars) {
  const h = HMAP[id], r = ROLES[h.role], base = RARITY[h.rar];
  const m = base.mult * (1 + 0.09 * (lvl - 1)) * (1 + 0.18 * (stars - base.stars));
  return {
    hp: Math.round(r.hp * m),
    atk: Math.round(r.atk * m),
    def: Math.round(r.def * m),
    spd: Math.round(r.spd + (lvl - 1) * 0.4 + (stars - base.stars) * 4),
  };
}
function heroPower(id, lvl, stars) {
  const s = heroStats(id, lvl, stars);
  return Math.round(s.hp * 0.25 + s.atk * 2.5 + s.def * 2 + s.spd * 1.5);
}

// Gold and hero XP to go from lvl to lvl+1.
function levelCost(lvl) {
  return { gold: Math.round(20 * Math.pow(lvl, 1.45)), xp: Math.round(15 * Math.pow(lvl, 1.4)) };
}

function ultDesc(h) {
  const u = h.ult, p = x => Math.round(x * 100) + '%';
  switch (u.type) {
    case 'single': return `Strikes the weakest enemy for ${p(u.mult)} ATK.`;
    case 'aoe': return `Hits all enemies for ${p(u.mult)} ATK.`;
    case 'back': return `Hits the enemy back row for ${p(u.mult)} ATK.`;
    case 'random': return `${u.hits} hits on random enemies, ${p(u.mult)} ATK each.`;
    case 'burn': return `Hits all enemies for ${p(u.mult)} ATK and burns them for ${p(u.dot)} ATK over ${u.turns} turns.`;
    case 'stun': return u.aoe ? `Hits all enemies for ${p(u.mult)} ATK, ${p(u.chance)} chance to stun each.`
      : `Slams a front enemy for ${p(u.mult)} ATK, ${p(u.chance)} chance to stun.`;
    case 'heal': return `Heals all allies for ${p(u.mult)} ATK.`;
    case 'healLow': return `Heals the weakest ally for ${p(u.mult)} ATK and shields them for ${p(u.shield)} ATK.`;
    case 'buff': return `Hits a front enemy for ${p(u.mult)} ATK and raises all allies' ATK by ${p(u.atkUp)} for ${u.turns} turns.`;
    case 'drain': return `Strikes the weakest enemy for ${p(u.mult)} ATK and heals for ${p(u.heal)} of the damage.`;
  }
  return '';
}

// Enemy team for a campaign stage: [{id,lvl,stars,boss}] in slot order (0-1 front, 2-4 back).
function stageTeam(s) {
  const rng = rngFrom(s * 7919 + 13), boss = s % STAGES_PER_CHAPTER === 0;
  const lvl = Math.max(1, Math.round(1 + (s - 1) * 1.1));
  const n = s <= 2 ? 2 : s <= 5 ? 3 : s <= 9 ? 4 : 5;
  const pool = HEROES.filter(h => h.rar === 'R' || (h.rar === 'SR' && s >= 3) || (h.rar === 'SSR' && s >= 8));
  const picked = [];
  while (picked.length < n) { // distinct heroes while the pool allows, repeats after that
    const h = pool[Math.floor(rng() * pool.length)];
    if (!picked.includes(h) || picked.length >= pool.length) picked.push(h);
  }
  picked.sort((a, b) => (ROLES[b.role].front ? 1 : 0) - (ROLES[a.role].front ? 1 : 0));
  const extra = Math.floor((s - 1) / 12);
  return picked.map((h, i) => ({
    id: h.id, lvl,
    stars: Math.min(MAX_STARS, RARITY[h.rar].stars + extra),
    boss: boss && i === 0,
  }));
}
function teamPower(team) {
  return team.reduce((t, x) => t + (x ? heroPower(x.id, x.lvl, x.stars) * (x.boss ? 2.2 : 1) : 0), 0) | 0;
}

function makeUnit(side, slot, x) {
  const st = heroStats(x.id, x.lvl, x.stars);
  if (x.boss) { st.hp = Math.round(st.hp * 3); st.atk = Math.round(st.atk * 1.25); st.def = Math.round(st.def * 1.2); }
  return {
    uid: side + slot, side, slot, id: x.id, h: HMAP[x.id], lvl: x.lvl, stars: x.stars, boss: !!x.boss,
    hp: st.hp, maxHp: st.hp, atk: st.atk, def: st.def, spd: st.spd,
    en: 50, alive: true, burn: [], stun: 0, up: 0, upT: 0, sh: 0,
  };
}

function snapshot(units) {
  const o = {};
  for (const u of units) o[u.uid] = { hp: u.hp, en: u.en, sh: u.sh, stun: u.stun > 0, burn: u.burn.length > 0, up: u.upT > 0 };
  return o;
}

// A and B: arrays of 5 slots, each {id,lvl,stars,boss} or null. Side 'a' is the player.
function simulate(A, B, seed) {
  const rng = rngFrom(seed || 1), units = [], events = [];
  A.forEach((x, i) => x && units.push(makeUnit('a', i, x)));
  B.forEach((x, i) => x && units.push(makeUnit('b', i, x)));
  const init = units.map(u => ({ uid: u.uid, side: u.side, slot: u.slot, id: u.id, lvl: u.lvl, stars: u.stars, boss: u.boss, hp: u.hp, maxHp: u.maxHp, en: u.en }));

  const foes = u => units.filter(v => v.alive && v.side !== u.side);
  const mates = u => units.filter(v => v.alive && v.side === u.side);
  const sideAlive = s => units.some(u => u.alive && u.side === s);
  const over = () => !sideAlive('a') || !sideAlive('b');
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const front = u => { const f = foes(u), fr = f.filter(v => v.slot < 2); return pick(fr.length ? fr : f); };
  const weakest = arr => arr.reduce((m, v) => (v.hp / v.maxHp < m.hp / m.maxHp ? v : m));

  function hit(a, t, mult) {
    const atk = a.atk * (1 + (a.upT > 0 ? a.up : 0));
    let d = atk * mult * (1 - t.def / (t.def + 3 * a.atk));
    const adv = BEATS[a.h.fac] === t.h.fac ? 1 : BEATS[t.h.fac] === a.h.fac ? -1 : 0;
    d *= adv > 0 ? 1.3 : adv < 0 ? 0.85 : 1;
    const crit = rng() < (a.h.role === 'assassin' ? 0.3 : 0.15);
    if (crit) d *= 1.6;
    d = Math.max(1, Math.round(d * (0.92 + rng() * 0.16)));
    const absorbed = Math.min(t.sh, d);
    t.sh -= absorbed;
    t.hp = Math.max(0, t.hp - (d - absorbed));
    t.en = Math.min(100, t.en + 10);
    if (t.hp <= 0) t.alive = false;
    return { u: t.uid, dmg: d, crit, adv, kill: !t.alive };
  }
  function heal(m, amt) {
    const got = Math.min(Math.round(amt), m.maxHp - m.hp);
    m.hp += got;
    return { u: m.uid, amt: got };
  }

  function act(u) {
    const ult = u.en >= 100, U = u.h.ult;
    const e = { t: 'act', a: u.uid, kind: ult ? 'ult' : 'basic', hits: [], heals: [] };
    if (!ult) {
      e.hits.push(hit(u, front(u), 1));
      u.en = Math.min(100, u.en + 50);
    } else {
      e.name = U.name; e.type = U.type;
      u.en = 0;
      switch (U.type) {
        case 'single': e.hits.push(hit(u, weakest(foes(u)), U.mult)); break;
        case 'aoe': foes(u).forEach(t => e.hits.push(hit(u, t, U.mult))); break;
        case 'back': {
          const f = foes(u), bk = f.filter(v => v.slot >= 2);
          (bk.length ? bk : f).forEach(t => e.hits.push(hit(u, t, U.mult)));
          break;
        }
        case 'random':
          for (let i = 0; i < U.hits; i++) { const f = foes(u); if (!f.length) break; e.hits.push(hit(u, pick(f), U.mult)); }
          break;
        case 'burn':
          foes(u).forEach(t => {
            const r = hit(u, t, U.mult);
            if (t.alive) { t.burn.push({ d: Math.round(u.atk * U.dot / U.turns), n: U.turns }); r.burn = true; }
            e.hits.push(r);
          });
          break;
        case 'stun':
          (U.aoe ? foes(u) : [front(u)]).forEach(t => {
            const r = hit(u, t, U.mult);
            if (t.alive && rng() < U.chance) { t.stun = 1; r.stun = true; }
            e.hits.push(r);
          });
          break;
        case 'heal': mates(u).forEach(m => e.heals.push(heal(m, u.atk * U.mult))); break;
        case 'healLow': {
          const m = weakest(mates(u)), r = heal(m, u.atk * U.mult);
          m.sh += Math.round(u.atk * U.shield); r.shield = true;
          e.heals.push(r);
          break;
        }
        case 'buff':
          e.hits.push(hit(u, front(u), U.mult));
          e.buff = mates(u).map(m => { m.up = U.atkUp; m.upT = U.turns + (m === u ? 1 : 0); return m.uid; });
          break;
        case 'drain': {
          const r = hit(u, weakest(foes(u)), U.mult);
          e.hits.push(r);
          if (u.alive) e.heals.push(heal(u, r.dmg * U.heal));
          break;
        }
      }
    }
    if (u.upT > 0) u.upT--;
    e.after = snapshot(units);
    return e;
  }

  let round = 0;
  while (round < MAX_ROUNDS && !over()) {
    round++;
    events.push({ t: 'round', n: round });
    const order = units.filter(u => u.alive).sort((x, y) => y.spd - x.spd || (x.side < y.side ? -1 : 1) || x.slot - y.slot);
    for (const u of order) {
      if (!u.alive) continue;
      if (u.burn.length) {
        let d = 0;
        u.burn.forEach(b => { d += b.d; b.n--; });
        u.burn = u.burn.filter(b => b.n > 0);
        d = Math.min(d, u.hp);
        u.hp -= d;
        if (u.hp <= 0) u.alive = false;
        events.push({ t: 'dot', u: u.uid, dmg: d, kill: !u.alive, after: snapshot(units) });
        if (!u.alive) { if (over()) break; continue; }
      }
      if (u.stun > 0) { u.stun--; events.push({ t: 'stun', u: u.uid, after: snapshot(units) }); continue; }
      events.push(act(u));
      if (over()) break;
    }
  }
  const win = sideAlive('a') && !sideAlive('b');
  events.push({ t: 'end', win, rounds: round });
  return { init, events, win, rounds: round, final: snapshot(units) };
}

if (typeof module !== 'undefined') module.exports = { rngFrom, maxLevel, starCost, heroStats, heroPower, levelCost, ultDesc, stageTeam, teamPower, simulate };
