'use strict';
// Realm Heroes: game state, saving, and the Campaign / Heroes / Summon screens.

const SAVE_KEY = 'realm-heroes-v1';
const IDLE_CAP_H = 12;
const $ = s => document.querySelector(s);

let S, tab = 'camp', heroFilter = 'all', heroSub = 'heroes', heroSort = 0;
const SORTS = ['Power', 'Level', 'Rarity'];
const ROLE_ICON = { tank: '🛡️', warrior: '⚔️', mage: '🔮', archer: '🏹', assassin: '🗡️', healer: '✚' };
const PENNANT = { SSR: '#b8292f', SR: '#d9822b', R: '#2f62b8' };

function fresh() {
  const heroes = {};
  STARTERS.forEach(id => (heroes[id] = { lvl: 1, stars: RARITY[HMAP[id].rar].stars, copies: 0 }));
  return { v: 1, gold: 3000, xp: 2000, gems: 2000, heroes, team: ['sszira', null, 'lupa', null, null],
    stage: 1, idleT: Date.now(), pity: 0, pulls: 0, freeDay: '', lootDay: '', sound: true, speed: 1, wins: 0 };
}
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { d = null; }
  return sanitize(d);
}
function sanitize(d) {
  const f = fresh();
  if (!d || typeof d !== 'object' || !d.heroes) return f;
  const s = Object.assign(f, d);
  const heroes = {};
  const rn = id => RENAMED[id] || id;
  if (d.team) d.team = d.team.map(id => (id ? rn(id) : id));
  for (const [old, h] of Object.entries(d.heroes || {})) {
    const id = rn(old);
    if (!HMAP[id] || !h || heroes[id]) continue;
    const base = RARITY[HMAP[id].rar].stars;
    const stars = Math.min(MAX_STARS, Math.max(base, h.stars | 0));
    heroes[id] = { stars, lvl: Math.min(maxLevel(stars), Math.max(1, h.lvl | 0)), copies: Math.max(0, h.copies | 0) };
  }
  if (!Object.keys(heroes).length) { // none of the saved heroes exist any more: keep progress, hand out starters
    const start = fresh(); // not f: Object.assign above already copied the old save's heroes into it
    Object.assign(heroes, start.heroes);
    d.team = start.team;
  }
  s.heroes = heroes;
  s.team = Array.from({ length: 5 }, (_, i) => (d.team && heroes[d.team[i]] ? d.team[i] : null));
  s.team = s.team.map((id, i) => (s.team.indexOf(id) === i ? id : null));
  ['gold', 'xp', 'gems', 'pity', 'pulls', 'wins'].forEach(k => (s[k] = Math.max(0, Math.floor(+s[k] || 0))));
  s.stage = Math.max(1, s.stage | 0);
  s.idleT = Math.min(Date.now(), +s.idleT || Date.now());
  s.speed = [1, 2, 3].includes(s.speed) ? s.speed : 1;
  return s;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* storage full or blocked */ } }

const fmt = n => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n)));
const today = () => new Date().toDateString();
const chapterOf = s => Math.ceil(s / STAGES_PER_CHAPTER);
const stageLabel = s => `${chapterOf(s)}-${((s - 1) % STAGES_PER_CHAPTER) + 1}`;
const themeOf = s => THEMES[(chapterOf(s) - 1) % THEMES.length];
const stars = (n, max) => '★'.repeat(n) + (max ? '<i>' + '★'.repeat(Math.max(0, max - n)) + '</i>' : '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function owned(id) { return S.heroes[id]; }
function power(id) { const o = owned(id); return o ? heroPower(id, o.lvl, o.stars) : 0; }
function teamUnits() { return S.team.map(id => (id && owned(id) ? { id, lvl: owned(id).lvl, stars: owned(id).stars } : null)); }
function myPower() { return S.team.reduce((t, id) => t + (id ? power(id) : 0), 0); }

// ---------- idle loot ----------
function idleRate() {
  const m = S.stage - 1;
  return { gold: 1500 + 500 * m, xp: 1000 + 400 * m, gems: 15 };
}
function pendingLoot() {
  const h = Math.min(IDLE_CAP_H, (Date.now() - S.idleT) / 3.6e6), r = idleRate();
  return { h, gold: Math.floor(r.gold * h), xp: Math.floor(r.xp * h), gems: Math.floor(r.gems * h) };
}
function grant(g, label) {
  S.gold += g.gold || 0; S.xp += g.xp || 0; S.gems += g.gems || 0;
  const parts = [];
  if (g.gold) parts.push('🪙' + fmt(g.gold));
  if (g.xp) parts.push('✨' + fmt(g.xp));
  if (g.gems) parts.push('💎' + fmt(g.gems));
  if (parts.length) toast((label ? label + ': ' : '') + parts.join('  '));
  Sfx.play('coin');
}
function collect() {
  const l = pendingLoot();
  if (l.gold < 1) return toast('Nothing to collect yet');
  grant(l, 'Collected');
  S.idleT = Date.now();
  save(); render();
}
function fastLoot() {
  const free = S.lootDay !== today();
  if (!free && S.gems < 80) return toast('Need 80 💎');
  if (free) S.lootDay = today(); else S.gems -= 80;
  const r = idleRate();
  grant({ gold: r.gold * 2, xp: r.xp * 2, gems: r.gems * 2 }, 'Fast loot');
  save(); render();
}
function stageReward(s) {
  const boss = s % STAGES_PER_CHAPTER === 0;
  return { gold: 400 + 150 * s, xp: 300 + 120 * s, gems: boss ? 300 : 50 };
}

// ---------- shared animation loop for live canvases ----------
let live = [];
function mountLive(cv, draw) { live.push({ cv, draw, w: 0, h: 0 }); }
(function loop(now) {
  live = live.filter(l => l.cv.isConnected);
  for (const l of live) {
    const r = l.cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (!r.width) continue;
    if (l.w !== r.width || l.h !== r.height) { l.w = r.width; l.h = r.height; l.cv.width = r.width * dpr; l.cv.height = r.height * dpr; }
    const ctx = l.cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, l.w, l.h);
    l.draw(ctx, l.w, l.h, now / 1000);
  }
  requestAnimationFrame(loop);
})(0);

// ---------- top bar, tabs, toast, modal ----------
function renderTop() {
  const best = Object.keys(S.heroes).sort((a, b) => power(b) - power(a))[0];
  const ava = Art.portrait(HMAP[best], 96);
  if ($('#pAva').getAttribute('src') !== ava) $('#pAva').src = ava;
  $('#pLv').textContent = 1 + Math.floor((S.stage - 1) / 3);
  $('#pXp').style.width = (((S.stage - 1) % 3) / 3 * 100 + 4) + '%';
  $('#rPow').textContent = fmt(myPower());
  $('#rGold').textContent = fmt(S.gold);
  $('#rXp').textContent = fmt(S.xp);
  $('#rGems').textContent = fmt(S.gems);
}
let toastT = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}
function openModal(html, cls = '') {
  const m = $('#modal');
  m.className = cls;
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.onclick = e => { if (e.target === m && !m.classList.contains('locked')) closeModal(); };
  return m;
}
function closeModal() { const m = $('#modal'); m.className = 'hide'; m.innerHTML = ''; }

function render() {
  renderTop();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const v = $('#view');
  if (tab === 'camp') v.innerHTML = campaignHTML(), bindCampaign();
  else if (tab === 'heroes') v.innerHTML = heroesHTML(), bindHeroes();
  else v.innerHTML = summonHTML(), bindSummon();
}

// ---------- campaign ----------
function campaignHTML() {
  const l = pendingLoot(), r = idleRate(), s = S.stage, enemy = stageTeam(s), th = themeOf(s);
  const hh = Math.floor(l.h), mm = Math.floor((l.h - hh) * 60);
  const ch = chapterOf(s), first = (ch - 1) * STAGES_PER_CHAPTER + 1;
  let nodes = '';
  for (let i = 0; i < STAGES_PER_CHAPTER; i++) {
    const n = first + i, cls = n < s ? 'done' : n === s ? 'cur' : 'lock';
    nodes += `<span class="node ${cls} ${i === STAGES_PER_CHAPTER - 1 ? 'boss' : ''}">${i === STAGES_PER_CHAPTER - 1 ? '☠' : i + 1}</span>`;
  }
  const ep = teamPower(enemy), mp = myPower();
  const rw = stageReward(s);
  return `
  <div class="scene"><canvas id="idleCv"></canvas>
    <div class="chap">Chapter ${ch} · ${esc(th.name)}</div>
    <button class="chest ${l.h >= 0.05 ? 'ready' : ''}" id="chest"><span class="cb">🎁</span><small>${hh}h ${mm}m</small></button>
  </div>
  <div class="card loot">
    <div><b>Idle loot</b> <small class="mut">${hh}h ${mm}m of ${IDLE_CAP_H}h</small>
      <div class="lootrow">🪙 ${fmt(l.gold)} <span>✨ ${fmt(l.xp)}</span> <span>💎 ${fmt(l.gems)}</span></div>
      <small class="mut">Per hour: 🪙${fmt(r.gold)} ✨${fmt(r.xp)} 💎${r.gems}. Clear stages to raise it.</small></div>
    <div class="col"><button class="pri" id="collect">Collect</button>
      <button id="fast">Fast loot<small>${S.lootDay !== today() ? 'Free' : '💎80'}</small></button></div>
  </div>
  <div class="card stage">
    <div class="sthead"><h3>Stage ${stageLabel(s)}${s % STAGES_PER_CHAPTER === 0 ? ' <span class="bosstag">BOSS</span>' : ''}</h3>
      <div class="nodes">${nodes}</div></div>
    <div class="foes">${enemy.map(e => `<div class="mini" style="--rc:${RARITY[HMAP[e.id].rar].col}"><img src="${Art.portrait(HMAP[e.id], 64)}" alt=""><span>${e.boss ? 'BOSS' : 'Lv' + e.lvl}</span></div>`).join('')}</div>
    <div class="vs"><span>Your power <b class="${mp >= ep ? 'good' : 'bad'}">${fmt(mp)}</b></span><span>Enemy <b>${fmt(ep)}</b></span></div>
    <div class="vs"><small class="mut">First clear: 🪙${fmt(rw.gold)} ✨${fmt(rw.xp)} 💎${rw.gems}</small></div>
    <button class="pri big" id="fight">⚔ Battle</button>
  </div>`;
}
function bindCampaign() {
  $('#collect').onclick = collect;
  $('#chest').onclick = collect;
  $('#fast').onclick = fastLoot;
  $('#fight').onclick = openFormation;
  const team = S.team.filter(Boolean).map(id => HMAP[id]);
  const theme = themeOf(S.stage);
  const acts = team.map(() => ({ anim: 'run', t0: 0, dur: 0 }));
  let nextAct = 1.5, coins = [];
  mountLive($('#idleCv'), (ctx, W, H, t) => {
    const bg = Scenery.backdrop(theme, W, H, 3);
    ctx.imageSmoothingEnabled = false;
    const off = Math.round((t * 40) % (W * 2) / 3) * 3;
    // mirrored tiles so the scroll has no seam
    for (let k = -1; k < 2; k++) {
      const x0 = k * W * 2 - off;
      ctx.drawImage(bg, x0, 0, W, H);
      ctx.save(); ctx.translate(x0 + W * 2, 0); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, W, H); ctx.restore();
    }
    const sc = Math.min(W / 560, H / 260);
    if (t > nextAct && team.length) {
      const i = Math.floor(Math.random() * team.length), w = team[i].look.wpn;
      acts[i] = { anim: MELEE.has(w) ? 'melee' : w === 'bow' ? 'shoot' : 'cast', t0: t, dur: 0.6 };
      nextAct = t + 0.9 + Math.random() * 1.6;
      coins.push({ x: W * 0.62 + Math.random() * W * 0.25, y: H * 0.55, t0: t + 0.35 });
    }
    const spots = [[0.47, 0.66], [0.43, 0.88], [0.27, 0.6], [0.23, 0.78], [0.19, 0.95]];
    team.map((h, i) => [h, i]).sort((a, b) => spots[a[1]][1] - spots[b[1]][1]).forEach(([h, i]) => {
      const a = acts[i];
      let anim = 'run', p = 0;
      if (a.anim !== 'run' && t - a.t0 < a.dur) { anim = a.anim; p = (t - a.t0) / a.dur; }
      Art.drawHero(ctx, h, { x: spots[i][0] * W, y: spots[i][1] * H, s: sc, face: 1, anim, p, t: t + i * 0.37 });
    });
    coins = coins.filter(c => t - c.t0 < 1.2);
    ctx.textAlign = 'center';
    for (const c of coins) {
      const k = t - c.t0; if (k < 0) continue;
      ctx.globalAlpha = 1 - k / 1.2;
      const u = Math.max(2, Math.round(2 * sc)), cx = Math.round(c.x / u) * u, cy = Math.round((c.y - k * 40) / u) * u;
      ctx.fillStyle = '#8a5a00'; ctx.fillRect(cx - 3 * u, cy - 3 * u, 6 * u, 6 * u);
      ctx.fillStyle = '#ffcf3a'; ctx.fillRect(cx - 2 * u, cy - 3 * u, 4 * u, 6 * u); ctx.fillRect(cx - 3 * u, cy - 2 * u, 6 * u, 4 * u);
      ctx.fillStyle = '#fff3a0'; ctx.fillRect(cx - u, cy - 2 * u, u, 2 * u);
      ctx.globalAlpha = 1;
    }
  });
}

// ---------- formation ----------
function autoTeam() {
  const ids = Object.keys(S.heroes).sort((a, b) => power(b) - power(a)).slice(0, 5);
  const fr = ids.filter(id => ROLES[HMAP[id].role].front), bk = ids.filter(id => !ROLES[HMAP[id].role].front);
  const order = [...fr.slice(0, 2), ...bk, ...fr.slice(2)];
  const front = order.filter(id => ROLES[HMAP[id].role].front).slice(0, 2);
  const rest = order.filter(id => !front.includes(id));
  while (front.length < 2 && rest.length) front.push(rest.shift());
  S.team = [front[0] || null, front[1] || null, rest[0] || null, rest[1] || null, rest[2] || null];
}
function openFormation() {
  const draw = () => {
    const slot = i => {
      const id = S.team[i];
      return id ? `<button class="slot full" data-slot="${i}" style="--rc:${RARITY[HMAP[id].rar].col}"><img src="${Art.portrait(HMAP[id], 64)}" alt=""><small>Lv${owned(id).lvl}</small></button>`
        : `<button class="slot" data-slot="${i}">+</button>`;
    };
    const roster = Object.keys(S.heroes).sort((a, b) => power(b) - power(a)).map(id => heroCard(id, { inTeam: S.team.includes(id), compact: true })).join('');
    const enemy = stageTeam(S.stage);
    openModal(`<h2>Formation <small class="mut">Stage ${stageLabel(S.stage)}</small></h2>
      <div class="form"><div class="row"><span class="lbl">Back</span>${slot(2)}${slot(3)}${slot(4)}</div>
      <div class="row"><span class="lbl">Front</span>${slot(0)}${slot(1)}</div></div>
      <div class="vs"><span>Your power <b>${fmt(myPower())}</b></span><span>Enemy <b>${fmt(teamPower(enemy))}</b></span></div>
      <small class="mut">Front row is hit first. Tap a hero to add or remove. Faction advantage: 🔥 › 🍃 › 💧 › 🔥, ☀️ ⇄ 🌙 (+30% damage).</small>
      <div class="grid compact">${roster}</div>
      <div class="btnrow"><button id="fAuto">Auto</button><button class="pri" id="fGo">⚔ Fight</button></div>`, 'form');
    document.querySelectorAll('#modal .slot').forEach(b => (b.onclick = () => { S.team[+b.dataset.slot] = null; save(); draw(); }));
    document.querySelectorAll('#modal .hcard').forEach(b => (b.onclick = () => {
      const id = b.dataset.id, at = S.team.indexOf(id);
      if (at >= 0) S.team[at] = null;
      else {
        const front = ROLES[HMAP[id].role].front;
        const order = front ? [0, 1, 2, 3, 4] : [2, 3, 4, 0, 1];
        const free = order.find(i => !S.team[i]);
        if (free == null) return toast('Team is full: tap a slot to free it');
        S.team[free] = id;
      }
      Sfx.play('tap'); save(); draw();
    }));
    $('#fAuto').onclick = () => { autoTeam(); save(); draw(); };
    $('#fGo').onclick = () => {
      if (!S.team.some(Boolean)) return toast('Add at least one hero');
      closeModal(); startBattle();
    };
  };
  draw();
}

// ---------- battle ----------
function startBattle() {
  Sfx.unlock();
  const s = S.stage, enemy = stageTeam(s);
  const res = simulate(teamUnits(), enemy, (Date.now() & 0x7fffffff) || 1);
  $('#battle').classList.remove('hide');
  $('#bstage').textContent = 'Stage ' + stageLabel(s);
  $('#bspeed').textContent = S.speed + '×';
  requestAnimationFrame(() => Battle.start(res, { theme: themeOf(s), speed: S.speed, onEnd: r => battleOver(r, s) }));
}
function battleOver(res, s) {
  let html;
  if (res.win) {
    const first = s === S.stage, rw = stageReward(s);
    if (first) { S.stage++; grant(rw); S.wins++; }
    save();
    html = `<div class="result win"><h1>Victory!</h1><p>Stage ${stageLabel(s)} cleared in ${res.rounds} rounds.</p>
      ${first ? `<div class="rw">🪙 ${fmt(rw.gold)} &nbsp; ✨ ${fmt(rw.xp)} &nbsp; 💎 ${rw.gems}</div>` : ''}
      ${s % STAGES_PER_CHAPTER === 0 ? `<p class="mut">Chapter ${chapterOf(s)} complete! Idle loot is now higher.</p>` : ''}
      <div class="btnrow"><button id="rBack">Back</button><button class="pri" id="rNext">Next stage ⚔</button></div></div>`;
  } else {
    html = `<div class="result lose"><h1>Defeat</h1><p>${res.rounds >= MAX_ROUNDS ? 'Out of time: the enemy held for 15 rounds.' : 'Your team fell.'}</p>
      <ul class="tips"><li>Level up heroes in <b>Heroes</b> with gold and hero XP.</li><li>Collect idle loot and use Fast loot.</li><li>Summon new heroes and use faction advantage.</li></ul>
      <div class="btnrow"><button id="rBack">Back</button><button id="rHeroes">Heroes</button><button class="pri" id="rRetry">Retry</button></div></div>`;
  }
  openModal(html, 'locked center');
  const leave = to => { closeModal(); Battle.stop(); $('#battle').classList.add('hide'); if (to) tab = to; render(); };
  $('#rBack').onclick = () => leave();
  if ($('#rNext')) $('#rNext').onclick = () => { closeModal(); startBattle(); };
  if ($('#rRetry')) $('#rRetry').onclick = () => { closeModal(); startBattle(); };
  if ($('#rHeroes')) $('#rHeroes').onclick = () => leave('heroes');
}

// ---------- heroes ----------
function heroCard(id, o = {}) {
  const h = HMAP[id], own = owned(id), r = RARITY[h.rar];
  if (!own) return `<div class="hcard locked" style="--rc:${r.col}"><img src="${Art.portrait(h, 96)}" alt=""><div class="nm">${esc(h.name)}</div><div class="st">${stars(r.stars)}</div></div>`;
  const canStar = own.copies >= starCost(id, own.stars) && own.stars < MAX_STARS;
  return `<button class="hcard ${o.inTeam ? 'inteam' : ''}" data-id="${id}" style="--rc:${r.col}">
    <img src="${Art.portrait(h, 96)}" alt=""><span class="fac">${FACTIONS[h.fac].icon}</span>
    <span class="lv">Lv${own.lvl}</span>${canStar ? '<span class="dot">!</span>' : ''}
    <div class="nm">${esc(h.name)}</div><div class="st">${stars(own.stars)}</div>
    ${o.compact ? '' : `<div class="pw">⚡${fmt(power(id))}</div>`}</button>`;
}
// Gold winged crest shown for Legendary-tier stars (5+); extra stars add pips under it.
const CREST = `<svg viewBox="0 0 100 40" class="crest" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#ffc533"/><stop offset="1" stop-color="#c47a0a"/></linearGradient></defs>
  <path fill="url(#cg)" stroke="#6b3a05" stroke-width="1.5" d="M50 2 L58 20 L98 10 L70 26 L58 24 L50 38 L42 24 L30 26 L2 10 L42 20 Z"/></svg>`;
function starMarks(st) {
  if (st < 5) return `<span class="sparks">${'✦'.repeat(st)}</span>`;
  return CREST + (st > 5 ? `<span class="pips">${'●'.repeat(st - 5)}</span>` : '');
}
function canLevel(id) {
  const o = owned(id); if (!o || o.lvl >= maxLevel(o.stars)) return false;
  const c = levelCost(o.lvl); return S.gold >= c.gold && S.xp >= c.xp;
}
function rosterCard(id) {
  const h = HMAP[id], o = owned(id), r = RARITY[h.rar], f = FACTIONS[h.fac];
  const st = o ? o.stars : r.stars, inTeam = S.team.includes(id);
  const alert = o && ((o.copies >= starCost(id, o.stars) && o.stars < MAX_STARS) || (inTeam && canLevel(id)));
  return `<button class="rcd ${o ? '' : 'off'} ${inTeam ? 'team' : ''}" data-id="${id}" style="--pc:${PENNANT[h.rar]};--fc:${f.col}">
    <div class="art"><img src="${Art.cardArt(h)}" alt="${esc(h.name)}">
      <div class="icons"><span class="dia" title="${ROLES[h.role].name}"><span>${ROLE_ICON[h.role]}</span></span><span class="dia" title="${f.name}"><span>${f.icon}</span></span></div>
      ${o && o.copies ? `<span class="plusn">+${o.copies}</span>` : ''}
      ${inTeam ? '<span class="tt">TEAM</span>' : ''}
      <span class="lvl">${o ? o.lvl : '—'}</span>
      <div class="marks">${starMarks(st)}</div>
    </div>
    <div class="pen"><span class="emb">${f.icon}</span></div>
    ${alert ? '<span class="alert"></span>' : ''}
    <span class="nm">${esc(h.name)}</span></button>`;
}
function sortedIds(ids) {
  const rank = { SSR: 3, SR: 2, R: 1 };
  const key = [id => power(id), id => (owned(id) ? owned(id).lvl * 1e6 : 0) + power(id), id => rank[HMAP[id].rar] * 1e7 + power(id)][heroSort];
  return ids.sort((a, b) => key(b) - key(a));
}
function heroesHTML() {
  const ids = HEROES.map(h => h.id).filter(id => heroFilter === 'all' || HMAP[id].fac === heroFilter);
  const list = heroSub === 'heroes' ? sortedIds(ids.filter(owned)) : [...sortedIds(ids.filter(owned)), ...ids.filter(id => !owned(id))];
  const dias = ['all', ...Object.keys(FACTIONS)].map(f => `<button class="fdia ${heroFilter === f ? 'on' : ''}" data-f="${f}" aria-label="${f}"><span>${f === 'all' ? 'All' : FACTIONS[f].icon}</span></button>`).join('');
  return `<div class="parch">
    <div class="ptop">
      <button class="pbtn" id="hBest"><span class="dia big"><span>⚔️</span></span><small>Best Team</small></button>
      <div class="pcount"><span>🛡️</span><b>${Object.keys(S.heroes).length}/${HEROES.length}</b><button class="dia add" id="hAdd" aria-label="Summon heroes"><span>+</span></button></div>
      <button class="pbtn" id="hQuick"><span class="dia big"><span>⭐</span></span><small>Quick Advance</small></button>
    </div>
    ${list.length ? `<div class="roster">${list.map(rosterCard).join('')}</div>` : '<p class="empty">No heroes of this faction yet. Summon to find some!</p>'}
    <div class="pfilter"><button class="sortb" id="hSort" aria-label="Sort"><span>⇅</span></button><small class="sortl">${SORTS[heroSort]}</small>${dias}</div>
  </div>
  <div class="subtabs"><button class="${heroSub === 'heroes' ? 'on' : ''}" data-sub="heroes">Heroes</button><button class="${heroSub === 'arch' ? 'on' : ''}" data-sub="arch">Archives</button></div>`;
}
function quickAdvance() {
  const team = S.team.filter(Boolean);
  if (!team.length) return toast('Set a team first');
  let n = 0;
  for (;;) {
    const id = team.filter(canLevel).sort((a, b) => owned(a).lvl - owned(b).lvl)[0];
    if (!id) break;
    const c = levelCost(owned(id).lvl);
    S.gold -= c.gold; S.xp -= c.xp; owned(id).lvl++; n++;
  }
  if (!n) return toast('Not enough gold or hero XP (or the team is at its level cap)');
  Sfx.play('coin'); toast(`Quick Advance: +${n} levels across the team`);
  save(); render();
}
function bindHeroes() {
  document.querySelectorAll('.fdia').forEach(b => (b.onclick = () => { heroFilter = b.dataset.f; Sfx.play('tap'); render(); }));
  document.querySelectorAll('.subtabs button').forEach(b => (b.onclick = () => { heroSub = b.dataset.sub; Sfx.play('tap'); render(); }));
  $('#hSort').onclick = () => { heroSort = (heroSort + 1) % SORTS.length; render(); };
  $('#hBest').onclick = () => { autoTeam(); save(); render(); toast('Strongest team set'); };
  $('#hQuick').onclick = quickAdvance;
  $('#hAdd').onclick = () => { tab = 'summon'; render(); };
  document.querySelectorAll('#view .rcd').forEach(b => (b.onclick = () => {
    if (owned(b.dataset.id)) openHero(b.dataset.id);
    else toast(`${HMAP[b.dataset.id].name} is not yet summoned. Find them in Summon.`);
  }));
}
function openHero(id) {
  const h = HMAP[id], o = owned(id), r = RARITY[h.rar], f = FACTIONS[h.fac];
  const st = heroStats(id, o.lvl, o.stars), cap = maxLevel(o.stars), cost = levelCost(o.lvl), need = starCost(id, o.stars);
  const inTeam = S.team.includes(id);
  openModal(`<div class="detail" style="--fc:${f.col};--rc:${r.col}">
    <canvas id="dcv"></canvas>
    <div class="dhead"><h2>${esc(h.name)} <small>${esc(h.title)}</small></h2>
      <div class="tags"><span style="color:${r.col}">${r.name}</span> · ${f.icon} ${f.name} · ${ROLES[h.role].name}</div>
      <div class="st big">${stars(o.stars, MAX_STARS)}</div></div>
    <div class="stats"><div><small>HP</small><b>${fmt(st.hp)}</b></div><div><small>ATK</small><b>${fmt(st.atk)}</b></div>
      <div><small>DEF</small><b>${fmt(st.def)}</b></div><div><small>SPD</small><b>${st.spd}</b></div><div><small>Power</small><b>${fmt(power(id))}</b></div></div>
    <div class="skill"><b>${esc(h.ult.name)}</b> <small class="mut">Ultimate, fires at 100 energy</small><p>${ultDesc(h)}</p></div>
    <div class="up"><div><b>Level ${o.lvl}</b><small class="mut">/${cap}</small>
      ${o.lvl < cap ? `<div class="cost ${S.gold >= cost.gold && S.xp >= cost.xp ? '' : 'short'}">🪙${fmt(cost.gold)} ✨${fmt(cost.xp)}</div>` : '<div class="cost">Max for these stars</div>'}</div>
      <div class="col2"><button class="pri" id="lv1" ${o.lvl >= cap ? 'disabled' : ''}>Level up</button><button id="lv10" ${o.lvl >= cap ? 'disabled' : ''}>+10</button></div></div>
    <div class="up"><div><b>Star up</b> <small class="mut">copies ${o.copies}/${o.stars >= MAX_STARS ? '—' : need}</small>
      <div class="cost mut">${o.stars >= MAX_STARS ? 'Max stars' : `+18% stats, level cap ${maxLevel(o.stars + 1)}`}</div></div>
      <button class="pri" id="star" ${o.copies >= need && o.stars < MAX_STARS ? '' : 'disabled'}>★ Star up</button></div>
    <div class="btnrow"><button id="dTeam">${inTeam ? 'Remove from team' : 'Add to team'}</button><button id="dClose">Close</button></div>
  </div>`, 'hero');
  const seq = [['idle', 1.6], [MELEE.has(h.look.wpn) ? 'melee' : h.look.wpn === 'bow' ? 'shoot' : 'cast', 0.65], ['idle', 1.3], ['ult', 0.9]];
  const total = seq.reduce((t, x) => t + x[1], 0);
  mountLive($('#dcv'), (ctx, W, H, t) => {
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.6);
    g.addColorStop(0, Art.hexA(f.glow, 0.55)); g.addColorStop(1, Art.hexA(f.col, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    let k = t % total, anim = 'idle', p = 0;
    for (const [a, d] of seq) { if (k < d) { anim = a; p = k / d; break; } k -= d; }
    const s = Math.min(H * 0.78 / 125, W / 170);
    Art.drawHero(ctx, h, { x: W / 2 - 10, y: H * 0.95, s, face: 1, anim, p, t });
  });
  const lvlUp = n => {
    let done = 0;
    while (done < n && o.lvl < cap) {
      const c = levelCost(o.lvl);
      if (S.gold < c.gold || S.xp < c.xp) break;
      S.gold -= c.gold; S.xp -= c.xp; o.lvl++; done++;
    }
    if (!done) return toast('Not enough gold or hero XP');
    Sfx.play('coin'); save(); renderTop(); openHero(id);
  };
  $('#lv1').onclick = () => lvlUp(1);
  $('#lv10').onclick = () => lvlUp(10);
  $('#star').onclick = () => {
    if (o.copies < need || o.stars >= MAX_STARS) return;
    o.copies -= need; o.stars++;
    Sfx.play('gold'); toast(`${h.name} is now ${o.stars}★`);
    save(); openHero(id);
  };
  $('#dTeam').onclick = () => {
    const at = S.team.indexOf(id);
    if (at >= 0) S.team[at] = null;
    else {
      const order = ROLES[h.role].front ? [0, 1, 2, 3, 4] : [2, 3, 4, 0, 1];
      const free = order.find(i => !S.team[i]);
      if (free == null) return toast('Team is full: remove someone first');
      S.team[free] = id;
    }
    save(); openHero(id);
  };
  $('#dClose').onclick = () => { closeModal(); render(); };
  $('#modal').onclick = e => { if (e.target.id === 'modal') { closeModal(); render(); } };
}

// ---------- summon ----------
function summonHTML() {
  const free = S.freeDay !== today(), left = SUMMON.pity - S.pity;
  const pct = x => Math.round(x * 100) + '%';
  return `<div class="banner"><canvas id="scv"></canvas>
      <div class="btxt"><h2>Hall of Legends</h2><p>Legendary ${pct(SUMMON.SSR)} · Epic ${pct(SUMMON.SR)} · Rare ${pct(1 - SUMMON.SSR - SUMMON.SR)}</p></div></div>
    <div class="card pity"><span>Legendary guaranteed within <b>${left}</b> summon${left === 1 ? '' : 's'}</span>
      <div class="bar"><i style="width:${100 * S.pity / SUMMON.pity}%"></i></div>
      <small class="mut">Every 10× summon includes at least one Epic or better. Duplicates become copies for star-ups.</small></div>
    <div class="sbtns"><button class="pri" id="s1">Summon ×1<small>${free ? 'Free today' : '💎' + SUMMON.cost1}</small></button>
      <button class="pri gold" id="s10">Summon ×10<small>💎${SUMMON.cost10}</small></button></div>
    <h3 class="mut">Legendary heroes</h3>
    <div class="grid">${HEROES.filter(h => h.rar === 'SSR').map(h => heroCard(h.id)).join('')}</div>`;
}
function bindSummon() {
  $('#s1').onclick = () => summon(1);
  $('#s10').onclick = () => summon(10);
  document.querySelectorAll('#view .hcard[data-id]').forEach(b => (b.onclick = () => openHero(b.dataset.id)));
  const rank = { SSR: 3, SR: 2, R: 1 };
  const feat = [...HEROES].sort((a, b) => rank[b.rar] - rank[a.rar]).slice(0, 3);
  mountLive($('#scv'), (ctx, W, H, t) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1650'); g.addColorStop(1, '#0d0a20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      const x = (i * 97.3 + t * 8 * (1 + i % 3)) % W, y = H - ((i * 53.1 + t * 20 * (1 + i % 2)) % H);
      ctx.fillStyle = `rgba(255,220,140,${0.3 + 0.3 * Math.sin(t * 3 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
    const sc = Math.min(W / 420, H / 210);
    const pos = [[0.5, 0.97, 1.15], [0.24, 0.92, 0.95], [0.78, 0.92, 0.95]];
    [1, 2, 0].forEach(i => {
      const h = feat[i], [px, py, k] = pos[i];
      if (!h) return;
      Art.drawHero(ctx, h, { x: W * px, y: H * py, s: sc * k, face: px > 0.6 ? -1 : 1, anim: 'idle', t: t + i, aura: 0.35 + 0.15 * Math.sin(t * 2 + i) });
    });
  });
}
function rollRarity() {
  S.pity++;
  if (S.pity >= SUMMON.pity) return 'SSR';
  const r = Math.random();
  return r < SUMMON.SSR ? 'SSR' : r < SUMMON.SSR + SUMMON.SR ? 'SR' : 'R';
}
function summon(n) {
  const free = n === 1 && S.freeDay !== today();
  const cost = n === 1 ? SUMMON.cost1 : SUMMON.cost10;
  if (!free && S.gems < cost) return toast(`Need 💎${cost}. Clear stages and collect idle loot for gems.`);
  Sfx.unlock();
  if (free) S.freeDay = today(); else S.gems -= cost;
  const res = [];
  for (let i = 0; i < n; i++) {
    let rar = rollRarity();
    if (n === 10 && i === 9 && !res.some(x => HMAP[x.id].rar !== 'R') && rar === 'R') rar = 'SR';
    if (rar === 'SSR') S.pity = 0;
    const pool = HEROES.filter(h => h.rar === rar), h = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !owned(h.id);
    if (isNew) S.heroes[h.id] = { lvl: 1, stars: RARITY[rar].stars, copies: 0 };
    else S.heroes[h.id].copies++;
    res.push({ id: h.id, isNew });
  }
  S.pulls += n;
  if (!S.team.some(Boolean)) autoTeam();
  save(); renderTop();
  summonShow(res);
}
function summonShow(res) {
  const best = res.some(x => HMAP[x.id].rar === 'SSR') ? 'SSR' : res.some(x => HMAP[x.id].rar === 'SR') ? 'SR' : 'R';
  const col = RARITY[best].col;
  const m = openModal(`<canvas id="sumCv"></canvas><div class="sumtap">Tap to skip</div>`, 'summon locked');
  Sfx.play('summon');
  const t0 = performance.now() / 1000;
  let stage = 0;
  const next = () => {
    if (stage > 0) return;
    stage = 1;
    const legends = res.filter(x => HMAP[x.id].rar === 'SSR');
    if (legends.length) { Sfx.play('gold'); revealLegend(legends, 0, () => summonGrid(res)); }
    else summonGrid(res);
  };
  m.onclick = next;
  setTimeout(next, 2100);
  mountLive($('#sumCv'), (ctx, W, H, tt) => {
    const t = tt - t0, cx = W / 2, cy = H * 0.45, R = Math.min(W, H) * 0.3;
    ctx.fillStyle = '#07051a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(cx, cy);
    const grow = Math.min(1, t / 0.6);
    for (let ring = 0; ring < 3; ring++) {
      ctx.save(); ctx.rotate(t * (ring % 2 ? -0.8 : 1.1) * (1 + t * 0.6));
      ctx.strokeStyle = Art.hexA(t > 1.3 ? col : '#9fc8ff', 0.8 - ring * 0.2); ctx.lineWidth = 2;
      const r = R * grow * (1 - ring * 0.25);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 6, 6); }
      ctx.restore();
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2 + t, d = R * 1.6 * Math.max(0, 1 - t / 1.4);
      ctx.fillStyle = Art.hexA(t > 1 ? col : '#bfe0ff', 0.9);
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (t > 1.3) {
      const k = Math.min(1, (t - 1.3) / 0.5);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.5 * k);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, Art.hexA(col, 0.9)); g.addColorStop(1, Art.hexA(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 2.5 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Art.hexA(col, 0.6 * (1 - k * 0.5)); ctx.fillRect(-R * 0.3 * k, -cy, R * 0.6 * k, H);
    }
    ctx.restore();
  });
}
function revealLegend(list, i, done) {
  const x = list[i], h = HMAP[x.id], f = FACTIONS[h.fac];
  const m = openModal(`<canvas id="legCv"></canvas><div class="legtxt"><div class="leg">LEGENDARY</div><h1>${esc(h.name)}</h1><p>${esc(h.title)} · ${f.icon} ${f.name}</p>${x.isNew ? '<span class="new">NEW</span>' : '<span class="new dup">+1 copy</span>'}<small>Tap to continue</small></div>`, 'summon locked');
  const t0 = performance.now() / 1000;
  m.onclick = () => (i + 1 < list.length ? revealLegend(list, i + 1, done) : done());
  mountLive($('#legCv'), (ctx, W, H, tt) => {
    const t = tt - t0;
    ctx.fillStyle = '#0a0618'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * 0.42);
    for (let k = 0; k < 16; k++) {
      ctx.rotate(Math.PI / 8 + t * 0.02);
      ctx.fillStyle = Art.hexA(k % 2 ? '#ffb800' : f.col, 0.12);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -Math.max(W, H)); ctx.lineTo(40, -Math.max(W, H)); ctx.fill();
    }
    ctx.restore();
    const sc = Math.min(W / 260, H / 330);
    Art.drawHero(ctx, h, { x: W / 2, y: H * 0.62, s: sc, face: 1, anim: t < 0.9 ? 'ult' : 'idle', p: Math.min(1, t / 0.9), t, aura: 0.6 });
  });
}
function summonGrid(res) {
  const cards = res.map((x, i) => {
    const h = HMAP[x.id], r = RARITY[h.rar];
    return `<div class="rcard ${h.rar}" style="--rc:${r.col};animation-delay:${i * 0.08}s"><img src="${Art.portrait(h, 96)}" alt="">
      <div class="nm">${esc(h.name)}</div><div class="st">${stars(r.stars)}</div>${x.isNew ? '<span class="new">NEW</span>' : '<span class="new dup">+1</span>'}</div>`;
  }).join('');
  openModal(`<h2>Summon results</h2><div class="rgrid">${cards}</div>
    <div class="btnrow"><button id="sumOk">OK</button><button class="pri" id="sumAgain">Again ×${res.length}</button></div>`, 'center');
  $('#sumOk').onclick = () => { closeModal(); render(); };
  $('#sumAgain').onclick = () => { closeModal(); render(); summon(res.length); };
}

// ---------- settings ----------
function openSettings() {
  openModal(`<h2>Settings</h2>
    <div class="btnrow"><button id="snd">Sound: ${S.sound ? 'On' : 'Off'}</button></div>
    <h3>Save</h3><small class="mut">Progress saves automatically in this browser. Copy the code below to move it to another device.</small>
    <textarea id="saveTxt" rows="3" spellcheck="false"></textarea>
    <div class="btnrow"><button id="exp">Copy save code</button><button id="imp">Load from code</button></div>
    <h3>Cheats</h3><div class="btnrow"><button id="chGems">+10,000 💎</button></div>
    <h3>Danger zone</h3><div class="btnrow"><button class="bad" id="reset">Reset progress</button></div>
    <div class="btnrow"><button id="sClose">Close</button></div>`);
  $('#snd').onclick = () => { S.sound = !S.sound; Sfx.set(S.sound); save(); openSettings(); };
  $('#exp').onclick = () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    $('#saveTxt').value = code; $('#saveTxt').select();
    try { navigator.clipboard.writeText(code); toast('Save code copied'); } catch { toast('Select the code and copy it'); }
  };
  $('#imp').onclick = () => {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob($('#saveTxt').value.trim()))));
      if (!d || !d.heroes) throw new Error('bad');
      S = sanitize(d); save(); closeModal(); render(); toast('Save loaded');
    } catch { toast('That save code is not valid'); }
  };
  $('#chGems').onclick = () => { S.gems += 10000; save(); render(); toast('+10,000 💎'); };
  let armed = false;
  $('#reset').onclick = () => {
    if (!armed) { armed = true; $('#reset').textContent = 'Tap again to erase everything'; return; }
    S = fresh(); save(); closeModal(); tab = 'camp'; render(); toast('Progress reset');
  };
  $('#sClose').onclick = closeModal;
}

// ---------- start ----------
S = load();
Sfx.set(S.sound);
document.querySelectorAll('#tabs button').forEach(b => (b.onclick = () => { tab = b.dataset.tab; Sfx.unlock(); Sfx.play('tap'); render(); }));
$('#btnSet').onclick = openSettings;
document.querySelectorAll('#top .plus').forEach(b => (b.onclick = () => { tab = b.dataset.go; render(); }));
$('#bspeed').onclick = () => {
  S.speed = S.speed >= 3 ? 1 : S.speed + 1; save();
  $('#bspeed').textContent = S.speed + '×';
  const r = Battle.current(); if (r) r.speed = S.speed;
};
$('#bskip').onclick = () => { const r = Battle.current(); if (r) r.skip(); };
Art.ready().then(() => { render(); save(); });
setInterval(() => { if (tab === 'camp' && $('#modal').classList.contains('hide') && $('#battle').classList.contains('hide')) render(); }, 30000);
addEventListener('visibilitychange', () => { if (!document.hidden && tab === 'camp' && $('#modal').classList.contains('hide')) render(); });
