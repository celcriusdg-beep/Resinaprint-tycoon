'use strict';
// Realm Heroes: battle playback. Takes the event list from simulate() and animates it on a canvas:
// heroes run in and swing, archers loose arrows, mages throw orbs or call meteors, ultimates get a
// banner and aura. Skip jumps to the final state. Also draws the campaign backdrops.

const Scenery = (() => {
  const cache = new Map();
  // Backdrop for a theme, painted at 1/k resolution so it reads as pixel art when drawn W x H without
  // smoothing. Cached per size. Horizon at hzFrac of the height.
  function backdrop(theme, W, H, k = 3, hzFrac = 0.45) {
    const key = theme.name + W + 'x' + H + '/' + k + ':' + hzFrac.toFixed(3);
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas');
    c.width = Math.ceil(W / k); c.height = Math.ceil(H / k);
    const x = c.getContext('2d');
    x.scale(1 / k, 1 / k);
    W = c.width * k; H = c.height * k; // paint every low-res pixel, including a partial last column
    const rng = rngFrom(theme.name.length * 977);
    const hz = H * hzFrac;
    let g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, hz + 2);
    // sun or moon
    g = x.createRadialGradient(W * 0.78, H * 0.13, 2, W * 0.78, H * 0.13, H * 0.2);
    g.addColorStop(0, theme.sun); g.addColorStop(0.18, theme.sun); g.addColorStop(0.2, Art.hexA(theme.sun, 0.35)); g.addColorStop(1, Art.hexA(theme.sun, 0));
    x.fillStyle = g; x.fillRect(0, 0, W, hz);
    // clouds / motes
    x.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 6; i++) {
      const cx = rng() * W, cy = rng() * hz * 0.6, r = 8 + rng() * 14;
      for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(cx + k * r * 0.8, cy + Math.sin(k) * 3, r, r * 0.55, 0, 0, Math.PI * 2); x.fill(); }
    }
    // two layers of hills
    for (let layer = 0; layer < 2; layer++) {
      x.fillStyle = theme.hill[layer];
      x.beginPath(); x.moveTo(0, hz);
      const base = hz - (layer === 0 ? H * 0.12 : H * 0.05), amp = layer === 0 ? H * 0.09 : H * 0.05;
      for (let px = 0; px <= W + 20; px += 20) x.lineTo(px, base - Math.abs(Math.sin(px * 0.009 + layer * 2 + rng() * 0.2)) * amp - rng() * 6);
      x.lineTo(W, hz + 2); x.lineTo(0, hz + 2); x.fill();
    }
    g = x.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, theme.ground[0]); g.addColorStop(1, theme.ground[1]);
    x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
    // tufts and stones
    for (let i = 0; i < 70; i++) {
      const px = rng() * W, py = hz + 6 + rng() * (H - hz - 6), k = (py - hz) / (H - hz);
      x.fillStyle = rng() < 0.75 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.14)';
      x.beginPath(); x.ellipse(px, py, 3 + k * 9, 1.5 + k * 3, 0, 0, Math.PI * 2); x.fill();
    }
    // centre path where the armies meet
    x.fillStyle = 'rgba(255,255,255,.06)';
    x.beginPath(); x.ellipse(W / 2, hz + (H - hz) * 0.53, W * 0.42, (H - hz) * 0.36, 0, 0, Math.PI * 2); x.fill();
    cache.set(key, c);
    if (cache.size > 12) cache.delete(cache.keys().next().value);
    return c;
  }
  return { backdrop };
})();

const Battle = (() => {
  let run = null;

  // Feet position for a slot; the field is the bottom fh pixels of the canvas, starting at fy.
  function slotPos(side, slot, W, fy, fh) {
    const front = slot < 2;
    const ys = front ? [0.64, 0.84] : [0.57, 0.73, 0.9];
    const y = fy + ys[front ? slot : slot - 2] * fh;
    const x = (front ? 0.36 : 0.15) * W + (front ? 0 : (slot === 3 ? -0.03 * W : 0));
    return side === 'a' ? [x, y] : [W - x, y];
  }

  class Run {
    constructor(res, opts) {
      this.res = res; this.opts = opts;
      this.cv = document.getElementById('bcv');
      this.ctx = this.cv.getContext('2d');
      this.time = 0; this.speed = opts.speed || 1; this.waiters = [];
      this.fx = []; this.texts = []; this.projs = []; this.shake = 0; this.dim = 0;
      this.banner = null; this.round = 0; this.skipping = false; this.over = false; this.ended = false;
      this.units = {};
      res.init.forEach((u, i) => {
        this.units[u.uid] = { ...u, h: HMAP[u.id], face: u.side === 'a' ? 1 : -1, anim: 'idle', a0: 0, adur: 1,
          stun: false, burn: false, up: false, sh: 0, dead: false, dying: false, flash: 0, seed: i * 1.7, x: 0, y: 0, tw: null };
      });
      this.layout(true);
      this.last = performance.now();
      this.frame = this.frame.bind(this);
      this.raf = requestAnimationFrame(this.frame);
      this.onResize = () => this.layout(false);
      addEventListener('resize', this.onResize);
      this.hudInit();
      this.play();
    }

    layout(first) {
      const r = this.cv.getBoundingClientRect();
      this.dpr = Math.min(2, devicePixelRatio || 1);
      this.W = Math.max(200, r.width); this.H = Math.max(160, r.height);
      this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
      // keep the field no taller than it is wide-ish, so tall phones get sky instead of tiny heroes
      this.fh = Math.min(this.H, this.W * 1.35);
      this.fy = this.H - this.fh;
      this.hz = (this.fy + this.fh * 0.45) / this.H;
      // sprite pixels map to whole screen pixels: pick that pixel size, then derive the world scale from it
      this.pix = Math.max(2, Math.round(Math.min(this.W / 470, this.fh / 400) / 0.36));
      this.sc = this.pix * 0.36;
      for (const u of Object.values(this.units)) {
        const [x, y] = slotPos(u.side, u.slot, this.W, this.fy, this.fh);
        u.hx = x; u.hy = y;
        if (first || !u.tw) { u.x = x; u.y = y; }
      }
    }

    sleep(ms) {
      return new Promise(r => { if (this.skipping) return r(); this.waiters.push({ at: this.time + ms, r }); });
    }
    setAnim(u, a, dur) { u.anim = a; u.a0 = this.time; u.adur = dur; }
    moveTo(u, x, y, dur) {
      u.tw = { x0: u.x, y0: u.y, x1: x, y1: y, t0: this.time, d: dur };
      this.setAnim(u, 'run', dur);
      u.face = x >= u.x ? 1 : -1;
      if (Math.abs(x - u.x) < 2) u.face = u.side === 'a' ? 1 : -1;
      return this.sleep(dur);
    }
    say(x, y, txt, col, size, opts = {}) {
      this.texts.push({ x, y, txt, col, size: size || 16, t0: this.time, life: opts.life || 900, vy: opts.vy || -0.04, stroke: opts.stroke || '#000' });
    }
    burst(x, y, col, n, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = (opts.speed || 0.18) * (0.4 + Math.random());
        this.fx.push({ k: opts.k || 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0), g: opts.g ?? 0.0004,
          col, r: (opts.r || 3) * (0.6 + Math.random() * 0.8), t0: this.time, life: (opts.life || 500) * (0.6 + Math.random() * 0.6) });
      }
    }
    ring(x, y, col, r, life = 380) { this.fx.push({ k: 'ring', x, y, col, r, t0: this.time, life }); }
    slash(x, y, col, face) { this.fx.push({ k: 'slash', x, y, col, face, t0: this.time, life: 260 }); }
    centre(u) { return [u.x, u.y - 55 * this.sc * (u.boss ? 1.35 : 1)]; }

    hudInit() {
      const card = u => `<div class="bcard" data-u="${u.uid}" style="--fc:${FACTIONS[u.h.fac].col}">
        <img src="${Art.portrait(u.h, 64)}" alt="">${u.boss ? '<span class="bb">BOSS</span>' : ''}<div class="bars"><i class="hp"><b></b></i><i class="en"><b></b></i></div></div>`;
      const side = s => Object.values(this.units).filter(u => u.side === s).sort((a, b) => a.slot - b.slot).map(card).join('');
      document.getElementById('bteam').innerHTML = side('a');
      document.getElementById('bfoes').innerHTML = side('b');
      this.hud();
    }
    hud() {
      for (const el of document.querySelectorAll('#bteam .bcard, #bfoes .bcard')) {
        const u = this.units[el.dataset.u];
        el.querySelector('.hp b').style.width = (100 * u.hp / u.maxHp) + '%';
        el.querySelector('.en b').style.width = Math.min(100, u.en) + '%';
        el.classList.toggle('dead', u.hp <= 0);
        el.classList.toggle('full', u.en >= 100 && u.hp > 0);
      }
      document.getElementById('bround').textContent = `Round ${Math.max(1, this.round)}/${MAX_ROUNDS}`;
    }

    applySnap(after) {
      for (const [uid, s] of Object.entries(after)) {
        const u = this.units[uid];
        u.hp = s.hp; u.en = s.en; u.sh = s.sh; u.stun = s.stun; u.burn = s.burn; u.up = s.up;
        if (s.hp <= 0 && !u.dying && !u.dead) { u.dying = true; this.setAnim(u, 'die', 900); }
      }
      this.hud();
    }

    impact(att, hit, opts = {}) {
      const t = this.units[hit.u];
      t.hp = Math.max(0, t.hp - Math.max(0, hit.dmg - (opts.absorbed || 0)));
      const [cx, cy] = this.centre(t);
      const col = FACTIONS[att.h.fac].col;
      if (hit.kill && t.hp <= 0) { t.hp = 0; t.dying = true; this.setAnim(t, 'die', 900); Sfx.play('ko'); }
      else this.setAnim(t, 'hit', 320);
      t.flash = 1;
      this.burst(cx, cy, col, hit.crit ? 16 : 9, { speed: 0.22, r: 3 });
      this.burst(cx, cy, '#ffffff', 4, { speed: 0.12, r: 2 });
      if (opts.slash) this.slash(cx, cy, FACTIONS[att.h.fac].glow, att.face);
      const s = Math.max(13, 17 * this.sc + 4);
      if (hit.crit) { this.say(cx, cy - 22 * this.sc, hit.dmg, '#ffd23a', s * 1.35); this.say(cx, cy - 46 * this.sc, 'CRIT!', '#ff8a3a', s * 0.8); this.shake = Math.max(this.shake, 6); }
      else this.say(cx + (Math.random() - 0.5) * 16, cy - 22 * this.sc, hit.dmg, hit.adv > 0 ? '#ffb0a0' : '#ffffff', s);
      if (hit.stun) this.say(cx, cy - 62 * this.sc, 'Stunned', '#ffe680', s * 0.8);
      if (hit.burn) this.burst(cx, cy, '#ff7a2a', 8, { speed: 0.08, up: 0.08, g: -0.0002, k: 'flame', r: 4 });
      Sfx.play(hit.crit ? 'crit' : 'hit');
      this.hud();
    }

    healFx(h) {
      const m = this.units[h.u], [cx, cy] = this.centre(m);
      m.hp = Math.min(m.maxHp, m.hp + h.amt);
      this.burst(cx, cy + 20 * this.sc, '#7dff8a', 12, { speed: 0.05, up: 0.09, g: 0, k: 'heal', r: 3, life: 800 });
      if (h.amt > 0) this.say(cx, cy - 24 * this.sc, '+' + h.amt, '#7dff8a', Math.max(13, 16 * this.sc + 4));
      if (h.shield) { this.ring(cx, cy, '#bfe8ff', 40 * this.sc, 600); this.say(cx, cy - 46 * this.sc, 'Shield', '#bfe8ff', 13); }
    }

    proj(kind, from, to, col, dur) {
      this.projs.push({ kind, x0: from[0], y0: from[1], x1: to[0], y1: to[1], col, t0: this.time, d: dur });
    }

    async doAct(e) {
      const u = this.units[e.a], h = u.h, wpn = h.look.wpn, ult = e.kind === 'ult';
      const fac = FACTIONS[h.fac];
      if (u.dead || u.dying) return;
      if (ult) {
        this.banner = { txt: e.name, sub: h.name, col: fac.col, t0: this.time, life: 1100, side: u.side };
        this.dim = 1;
        this.setAnim(u, 'ult', 700);
        this.burst(u.x, u.y - 50 * this.sc, fac.glow, 22, { speed: 0.12, up: 0.05, g: 0, r: 3.5, life: 700 });
        this.ring(u.x, u.y - 50 * this.sc, fac.glow, 70 * this.sc, 600);
        Sfx.play('ult');
        await this.sleep(720);
      }
      const targets = e.hits.map(x => this.units[x.u]);
      if (e.hits.length) {
        if (MELEE.has(wpn)) await this.meleeAct(u, e, targets, ult);
        else await this.rangedAct(u, e, targets, ult);
      }
      if (e.heals.length) {
        if (!e.hits.length) { this.setAnim(u, 'cast', 600); await this.sleep(330); }
        e.heals.forEach(hh => this.healFx(hh));
        Sfx.play('heal');
        await this.sleep(380);
      }
      if (e.buff) {
        e.buff.forEach(id => {
          const m = this.units[id], [cx, cy] = this.centre(m);
          this.burst(cx, cy + 20 * this.sc, '#ffcf4a', 8, { speed: 0.04, up: 0.1, g: 0, k: 'up', r: 4, life: 800 });
        });
        this.say(u.x, u.y - 120 * this.sc, 'ATK UP', '#ffcf4a', 15);
        await this.sleep(300);
      }
      this.applySnap(e.after);
      this.dim = 0;
      await this.sleep(ult ? 260 : 140);
    }

    async meleeAct(u, e, targets, ult) {
      const sc = this.sc, distinct = [...new Set(targets)];
      let tx, ty;
      if (distinct.length === 1) { tx = distinct[0].x - u.face * 50 * sc * (distinct[0].boss ? 1.3 : 1); ty = distinct[0].y + 1; }
      else {
        tx = distinct.reduce((s, t) => s + t.x, 0) / distinct.length - u.face * 70 * sc;
        ty = distinct.reduce((s, t) => s + t.y, 0) / distinct.length;
      }
      await this.moveTo(u, tx, ty, ult ? 240 : 300);
      u.face = u.side === 'a' ? 1 : -1;
      const groups = e.type === 'random' ? e.hits.map(x => [x]) : [e.hits];
      for (const g of groups) {
        this.setAnim(u, 'melee', ult ? 380 : 440);
        Sfx.play('swing');
        await this.sleep(ult ? 170 : 210);
        if (ult && distinct.length > 1) { this.shake = 9; this.ring(tx + u.face * 70 * sc, ty - 40 * sc, FACTIONS[u.h.fac].glow, 120 * sc, 500); }
        g.forEach(hit => this.impact(u, hit, { slash: true }));
        await this.sleep(ult ? 200 : 230);
      }
      await this.moveTo(u, u.hx, u.hy, 260);
      u.face = u.side === 'a' ? 1 : -1;
      this.setAnim(u, 'idle', 1);
    }

    async rangedAct(u, e, targets, ult) {
      const sc = this.sc, bow = u.h.look.wpn === 'bow', fac = FACTIONS[u.h.fac];
      const meteor = ult && !bow && ['aoe', 'burn', 'back', 'stun'].includes(e.type);
      const groups = e.type === 'random' ? e.hits.map(x => [x]) : [e.hits];
      for (const g of groups) {
        this.setAnim(u, bow ? 'shoot' : 'cast', bow ? 480 : 560);
        await this.sleep(bow ? 270 : 300);
        const from = bow ? [u.x + u.face * 30 * sc, u.y - 70 * sc] : [u.x + u.face * 20 * sc, u.y - 112 * sc];
        const dur = meteor ? 420 : 280;
        g.forEach(hit => {
          const t = this.units[hit.u], to = this.centre(t);
          if (meteor) this.proj('meteor', [to[0] + (u.side === 'a' ? -120 : 120) * sc, to[1] - 260 * sc], to, fac.col, dur);
          else this.proj(bow ? 'arrow' : 'orb', from, to, bow ? fac.col : fac.glow, dur);
        });
        Sfx.play(bow ? 'bow' : 'cast');
        await this.sleep(dur);
        if (meteor) this.shake = 8;
        g.forEach(hit => this.impact(u, hit));
        await this.sleep(groups.length > 1 ? 90 : 220);
      }
    }

    async play() {
      await this.sleep(450);
      for (const e of this.res.events) {
        if (this.skipping) break;
        if (e.t === 'round') { this.round = e.n; this.hud(); this.say(this.W / 2, this.fy + this.fh * 0.25, 'Round ' + e.n, '#ffffff', 22, { life: 700, vy: 0 }); await this.sleep(420); }
        else if (e.t === 'act') await this.doAct(e);
        else if (e.t === 'dot') {
          const u = this.units[e.u], [cx, cy] = this.centre(u);
          this.burst(cx, cy, '#ff7a2a', 12, { speed: 0.06, up: 0.08, g: -0.0002, k: 'flame', r: 4.5 });
          this.say(cx, cy - 20 * this.sc, e.dmg, '#ff9a4a', 16);
          this.setAnim(u, 'hit', 300); u.flash = 0.8;
          this.applySnap(e.after);
          await this.sleep(420);
        } else if (e.t === 'stun') {
          const u = this.units[e.u], [cx, cy] = this.centre(u);
          this.say(cx, cy - 30 * this.sc, 'Stunned', '#ffe680', 14);
          this.applySnap(e.after);
          await this.sleep(420);
        }
      }
      this.finish();
    }

    finish() {
      if (this.over) return;
      this.over = true;
      if (this.skipping) {
        this.fx = []; this.projs = []; this.texts = []; this.banner = null; this.dim = 0;
        for (const u of Object.values(this.units)) { u.tw = null; u.x = u.hx; u.y = u.hy; u.face = u.side === 'a' ? 1 : -1; }
        const f = this.res.final;
        for (const [uid, s] of Object.entries(f)) {
          const u = this.units[uid];
          Object.assign(u, { hp: s.hp, en: s.en, sh: s.sh, stun: s.stun, burn: s.burn, up: s.up });
          if (s.hp <= 0) { u.dead = true; u.dying = false; }
          else this.setAnim(u, 'idle', 1);
        }
        this.round = this.res.rounds;
        this.hud();
      }
      this.skipping = false;
      const winSide = this.res.win ? 'a' : 'b';
      for (const u of Object.values(this.units)) if (u.side === winSide && u.hp > 0) this.setAnim(u, 'win', 1);
      Sfx.play(this.res.win ? 'win' : 'lose');
      setTimeout(() => { if (run === this && !this.ended) { this.ended = true; this.opts.onEnd(this.res); } }, 1300);
    }

    skip() {
      if (this.over) return;
      this.skipping = true;
      const w = this.waiters; this.waiters = [];
      w.forEach(x => x.r());
      // play() notices skipping at its next await and calls finish()
    }

    frame(now) {
      if (run !== this) return;
      const dtReal = Math.min(50, now - this.last);
      this.last = now;
      const dt = dtReal * this.speed;
      this.time += dt;
      if (this.waiters.length) {
        const due = this.waiters.filter(w => w.at <= this.time);
        if (due.length) { this.waiters = this.waiters.filter(w => w.at > this.time); due.forEach(w => w.r()); }
      }
      this.draw(dt);
      this.raf = requestAnimationFrame(this.frame);
    }

    draw(dt) {
      const { W, H, sc, pix } = this, screen = this.ctx;
      // The world is drawn into a buffer at 1/pix resolution and blown up, so sprites, scenery, particles
      // and projectiles all share one pixel grid. Bars and text go on top at full resolution.
      const bw = Math.ceil(W / pix), bh = Math.ceil(H / pix);
      if (!this.buf || this.buf.width !== bw || this.buf.height !== bh) {
        this.buf = document.createElement('canvas'); this.buf.width = bw; this.buf.height = bh;
      }
      const ctx = this.buf.getContext('2d');
      this.ctx = ctx;
      ctx.setTransform(1 / pix, 0, 0, 1 / pix, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const sh = this.shake > 0.3 ? this.shake : 0;
      this.shake *= Math.pow(0.9, dt / 16);
      ctx.drawImage(Scenery.backdrop(this.opts.theme, W, H, pix, this.hz), 0, 0, W, H);
      if (this.dim > 0) { ctx.fillStyle = 'rgba(10,6,24,.35)'; ctx.fillRect(0, 0, W, H); }
      const drawn = [];
      const list = Object.values(this.units).filter(u => !u.dead).sort((a, b) => a.y - b.y);
      for (const u of list) {
        if (u.tw) {
          const k = Math.min(1, (this.time - u.tw.t0) / u.tw.d), e = k * k * (3 - 2 * k);
          u.x = u.tw.x0 + (u.tw.x1 - u.tw.x0) * e; u.y = u.tw.y0 + (u.tw.y1 - u.tw.y0) * e;
          if (k >= 1) u.tw = null;
        }
        let p = (this.time - u.a0) / u.adur;
        const loop = u.anim === 'idle' || u.anim === 'win' || (u.anim === 'run' && u.tw);
        if (!loop && p >= 1) {
          if (u.anim === 'die') { u.dead = true; u.dying = false; continue; }
          if (!u.tw) { u.anim = 'idle'; p = 0; }
        }
        u.flash = Math.max(0, u.flash - dt / 260);
        const s = sc * (u.boss ? 1.35 : 1), t = this.time / 1000 + u.seed;
        Art.drawHero(ctx, u.h, { x: Math.round(u.x / pix) * pix, y: Math.round(u.y / pix) * pix, s, face: u.face, anim: u.anim,
          p: Math.min(1, p), t, flash: u.flash * 0.85, aura: u.up ? 0.25 + Math.sin(t * 4) * 0.1 : 0 });
        if (!u.dying) drawn.push([u, s, t]);
      }
      this.drawProjs();
      this.drawFx();
      this.ctx = screen;
      screen.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      screen.imageSmoothingEnabled = false;
      screen.fillStyle = '#000'; screen.fillRect(0, 0, W, H);
      const ox = sh ? Math.round((Math.random() - 0.5) * sh / pix) * pix : 0, oy = sh ? Math.round((Math.random() - 0.5) * sh / pix) * pix : 0;
      screen.drawImage(this.buf, ox, oy, bw * pix, bh * pix);
      screen.save(); screen.translate(ox, oy);
      for (const [u, s, t] of drawn) this.drawBars(u, s, t);
      if (this.banner) this.drawBanner();
      this.drawTexts();
      screen.restore();
    }

    drawBars(u, s, t) {
      const { ctx } = this, w = Math.max(34, 46 * s), x = u.x - w / 2, y = u.y - 128 * s - 8;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 1, y - 1, w + 2, 9);
      ctx.fillStyle = u.side === 'a' ? '#4fe36a' : '#ff5a4f';
      ctx.fillRect(x, y, w * u.hp / u.maxHp, 4.5);
      if (u.sh > 0) { ctx.fillStyle = 'rgba(200,235,255,.9)'; ctx.fillRect(x, y, Math.min(w, w * u.sh / u.maxHp), 2); }
      ctx.fillStyle = u.en >= 100 ? `rgba(255,${200 + Math.sin(t * 8) * 40 | 0},60,1)` : '#f0c040';
      ctx.fillRect(x, y + 5, w * Math.min(100, u.en) / 100, 2.5);
      ctx.font = `${Math.max(7, Math.round(6 * s + 3))}px "Press Start 2P", monospace`;
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3;
      const lv = u.boss ? 'BOSS' : String(u.lvl);
      ctx.strokeText(lv, x - 3, y + 7); ctx.fillText(lv, x - 3, y + 7);
      ctx.fillStyle = '#000'; ctx.fillRect(x + w + 2, y - 1, 9, 9);
      ctx.fillStyle = FACTIONS[u.h.fac].col; ctx.fillRect(x + w + 3, y, 7, 7);
      let ix = x;
      const icon = (txt) => { ctx.textAlign = 'left'; ctx.font = `${Math.max(9, 11 * s)}px system-ui`; ctx.fillText(txt, ix, y - 3); ix += 13; };
      if (u.up) icon('⬆');
      if (u.burn) icon('🔥');
      if (u.stun) {
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + i * 2.1, sx = u.x + Math.cos(a) * 12 * s, sy = u.y - 122 * s + Math.sin(a) * 3 * s;
          ctx.fillStyle = '#ffe14a'; ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 6, 6);
          ctx.fillStyle = '#fff8c0'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2);
        }
      }
    }

    drawProjs() {
      const { ctx, sc } = this;
      this.projs = this.projs.filter(p => this.time - p.t0 < p.d);
      for (const p of this.projs) {
        const k = (this.time - p.t0) / p.d;
        const arc = p.kind === 'arrow' ? -Math.sin(Math.PI * k) * 30 * sc : 0;
        const x = p.x0 + (p.x1 - p.x0) * k, y = p.y0 + (p.y1 - p.y0) * k + arc;
        if (p.kind === 'arrow') {
          const dy = (p.y1 - p.y0) - Math.cos(Math.PI * k) * Math.PI * 30 * sc, ang = Math.atan2(dy, p.x1 - p.x0);
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
          ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18 * sc, 0); ctx.lineTo(6 * sc, 0); ctx.stroke();
          ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(10 * sc, 0); ctx.lineTo(3 * sc, -3.5 * sc); ctx.lineTo(3 * sc, 3.5 * sc); ctx.fill();
          ctx.restore();
        } else {
          const r = (p.kind === 'meteor' ? 16 : 9) * Math.max(0.7, sc);
          // stepped glow: three nested squares
          [[2.2, 0.3], [1.4, 0.7], [0.8, 1]].forEach(([k, a], i) => {
            ctx.fillStyle = i === 2 ? '#ffffff' : Art.hexA(p.col, a);
            ctx.fillRect(x - r * k, y - r * k, r * k * 2, r * k * 2);
          });
          if (Math.random() < 0.8) this.fx.push({ k: 'spark', x, y, vx: (Math.random() - 0.5) * 0.04, vy: (Math.random() - 0.5) * 0.04, g: 0, col: p.col, r: r * 0.35, t0: this.time, life: 260 });
        }
      }
    }

    drawFx() {
      const { ctx } = this;
      this.fx = this.fx.filter(f => this.time - f.t0 < f.life);
      for (const f of this.fx) {
        const age = this.time - f.t0, k = age / f.life;
        ctx.globalAlpha = 1 - k;
        if (f.k === 'ring') {
          ctx.strokeStyle = f.col; ctx.lineWidth = 4 * (1 - k) + 1;
          ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + k), f.r * (0.3 + k) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (f.k === 'slash') {
          ctx.strokeStyle = f.col; ctx.lineWidth = 5 * (1 - k) + 1; ctx.lineCap = 'round';
          const r = 34 * this.sc;
          ctx.beginPath(); ctx.arc(f.x - f.face * r * 0.4, f.y, r, -1.2 + k * 0.6, 0.6 + k * 0.6); ctx.stroke();
        } else {
          const x = f.x + f.vx * age, y = f.y + f.vy * age + 0.5 * f.g * age * age;
          ctx.fillStyle = f.col;
          const r = f.r * (f.k === 'flame' ? 1 - k * 0.5 : 1);
          if (f.k === 'up') { ctx.fillRect(x - r * 0.5, y - r, r, r * 2); ctx.fillRect(x - r * 1.2, y - r * 0.4, r * 2.4, r * 0.8); }
          else if (f.k === 'heal') { ctx.fillRect(x - r * 0.4, y - r * 1.2, r * 0.8, r * 2.4); ctx.fillRect(x - r * 1.2, y - r * 0.4, r * 2.4, r * 0.8); }
          else ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    drawTexts() {
      const { ctx } = this;
      this.texts = this.texts.filter(t => this.time - t.t0 < t.life);
      ctx.textAlign = 'center';
      for (const t of this.texts) {
        const age = this.time - t.t0, k = age / t.life;
        const pop = age < 120 ? 0.6 + age / 120 * 0.5 : 1.1 - Math.min(0.1, (age - 120) / 1200);
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = `${Math.round(t.size * pop * 0.7)}px "Press Start 2P", monospace`;
        ctx.lineWidth = 4; ctx.strokeStyle = t.stroke; ctx.lineJoin = 'miter';
        const y = t.y + t.vy * age;
        ctx.strokeText(t.txt, t.x, y); ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, y);
      }
      ctx.globalAlpha = 1;
    }

    drawBanner() {
      const { ctx, W, H } = this, b = this.banner, age = this.time - b.t0, k = age / b.life;
      if (k >= 1) { this.banner = null; return; }
      const slide = age < 160 ? 1 - age / 160 : 0;
      const h = Math.max(34, this.fh * 0.11), y = Math.max(h / 2 + 4, this.fy + this.fh * 0.14);
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      const c = Art.hexA(b.col, 0.85);
      if (b.side === 'a') { g.addColorStop(0, c); g.addColorStop(0.7, Art.hexA(b.col, 0.4)); g.addColorStop(1, Art.hexA(b.col, 0)); }
      else { g.addColorStop(0, Art.hexA(b.col, 0)); g.addColorStop(0.3, Art.hexA(b.col, 0.4)); g.addColorStop(1, c); }
      ctx.save(); ctx.translate((b.side === 'a' ? -1 : 1) * slide * W * 0.5, 0);
      ctx.fillStyle = g; ctx.fillRect(0, y - h / 2, W, h);
      ctx.textAlign = b.side === 'a' ? 'left' : 'right';
      const tx = b.side === 'a' ? 16 : W - 16;
      ctx.font = `${Math.round(h * 0.34)}px "Press Start 2P", monospace`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.strokeText(b.txt, tx, y + h * 0.1); ctx.fillStyle = '#fff'; ctx.fillText(b.txt, tx, y + h * 0.1);
      ctx.font = `600 ${Math.round(h * 0.3)}px "Pixelify Sans", monospace`; ctx.fillStyle = '#ffeec0';
      ctx.fillText(b.sub, tx, y + h * 0.42);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    stop() {
      this.over = true;
      cancelAnimationFrame(this.raf);
      removeEventListener('resize', this.onResize);
      const w = this.waiters; this.waiters = []; this.skipping = true; w.forEach(x => x.r());
    }
  }

  function start(res, opts) {
    if (run) run.stop();
    run = new Run(res, opts);
    return run;
  }
  function stop() { if (run) { run.stop(); run = null; } }
  function current() { return run; }
  return { start, stop, current, slotPos };
})();

// Tiny synthesized sound effects (Web Audio), created on first use after a tap.
const Sfx = (() => {
  let ac = null, on = true;
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f0, f1, dur, type, vol, delay = 0) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp = 800) {
    const a = ctx(); if (!a) return;
    const n = a.sampleRate * dur, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  const SOUNDS = {
    hit: () => { noise(0.08, 0.25, 600); tone(180, 70, 0.1, 'square', 0.06); },
    crit: () => { noise(0.14, 0.35, 400); tone(320, 90, 0.16, 'square', 0.09); },
    swing: () => noise(0.12, 0.12, 2500),
    bow: () => tone(900, 300, 0.12, 'triangle', 0.08),
    cast: () => tone(400, 1200, 0.25, 'sine', 0.07),
    ult: () => { tone(200, 800, 0.4, 'sawtooth', 0.05); tone(300, 1200, 0.45, 'sine', 0.06, 0.05); },
    heal: () => { tone(660, 660, 0.15, 'sine', 0.07); tone(880, 880, 0.2, 'sine', 0.06, 0.08); },
    ko: () => tone(300, 60, 0.35, 'triangle', 0.1),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.08, i * 0.11)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.95, 0.28, 'triangle', 0.08, i * 0.16)),
    coin: () => { tone(988, 988, 0.08, 'square', 0.05); tone(1318, 1318, 0.18, 'square', 0.05, 0.07); },
    tap: () => tone(700, 500, 0.05, 'triangle', 0.05),
    summon: () => [392, 494, 587, 784, 988].forEach((f, i) => tone(f, f, 0.25, 'sine', 0.06, i * 0.09)),
    gold: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.4, 'triangle', 0.08, i * 0.07)); noise(0.5, 0.08, 3000); },
  };
  return {
    play(n) { if (on && SOUNDS[n]) try { SOUNDS[n](); } catch { /* audio unavailable */ } },
    set(v) { on = v; },
    unlock() { ctx(); },
  };
})();
