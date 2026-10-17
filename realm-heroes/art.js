'use strict';
// Realm Heroes: procedural 2D character rig. Every hero is drawn from parts (legs, torso, arms,
// head, hair, headgear, weapon) so poses can be animated: idle, run, melee, shoot, cast, ult, hit,
// die, win. Coordinates are local to the feet (y up is negative), about 100 units tall, facing right.

const Art = (() => {
  const PI = Math.PI;
  const parsed = new Map();
  function rgb(h) {
    let r = parsed.get(h);
    if (r) return r;
    let s = h.slice(1);
    if (s.length === 3) s = [...s].map(c => c + c).join('');
    const n = parseInt(s, 16);
    r = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    parsed.set(h, r);
    return r;
  }
  // Colour with shade k (-1 black .. +1 white), then the current hit flash mixed in.
  let FL = 0, FLC = [255, 255, 255];
  function C(h, k = 0) {
    let [r, g, b] = rgb(h);
    if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    else if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    if (FL > 0) { r += (FLC[0] - r) * FL; g += (FLC[1] - g) * FL; b += (FLC[2] - b) * FL; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const THRUST = new Set(['spear', 'dagger']);

  function pose(anim, p, t, wpn) {
    const P = { bob: 0, lean: 0, aF: 0.3, aB: -0.2, lenB: 22, lF: 0, lB: 0, rot: 0, dx: 0, dy: 0, glow: 0, draw: 0, arrow: false, alpha: 1 };
    const br = Math.sin(t * 2.6);
    switch (anim) {
      case 'idle':
        P.bob = br * 1.2;
        P.aF = (wpn === 'bow' ? 0.55 : 0.3) + br * 0.05;
        P.aB = -0.15 - br * 0.05;
        break;
      case 'run': {
        const c = t * 13;
        P.lF = Math.sin(c) * 0.7; P.lB = -P.lF;
        P.aB = -Math.sin(c) * 0.6; P.aF = 0.8;
        P.bob = -Math.abs(Math.sin(c)) * 3; P.lean = 0.15;
        break;
      }
      case 'melee':
        if (THRUST.has(wpn)) {
          if (p < 0.4) { const k = ease(p / 0.4); P.aF = lerp(0.3, 1.0, k); P.dx = -4 * k; P.lean = -0.06 * k; }
          else if (p < 0.6) { const k = ease((p - 0.4) / 0.2); P.aF = lerp(1.0, 1.65, k); P.dx = lerp(-4, 14, k); P.lean = lerp(-0.06, 0.25, k); }
          else { const k = ease((p - 0.6) / 0.4); P.aF = lerp(1.65, 0.3, k); P.dx = 14 * (1 - k); P.lean = 0.25 * (1 - k); }
        } else {
          if (p < 0.4) { const k = ease(p / 0.4); P.aF = lerp(0.3, 2.8, k); P.lean = -0.08 * k; P.aB = lerp(-0.2, 0.6, k); }
          else if (p < 0.58) { const k = ease((p - 0.4) / 0.18); P.aF = lerp(2.8, 0.6, k); P.lean = lerp(-0.08, 0.24, k); P.dx = 6 * k; P.aB = lerp(0.6, -0.5, k); }
          else { const k = ease((p - 0.58) / 0.42); P.aF = lerp(0.6, 0.3, k); P.lean = 0.24 * (1 - k); P.dx = 6 * (1 - k); P.aB = lerp(-0.5, -0.2, k); }
        }
        P.lF = P.lean * 1.4; P.lB = -P.lean;
        break;
      case 'shoot':
        P.aF = PI / 2; P.aB = PI / 2 - 0.08;
        if (p < 0.55) { P.draw = ease(p / 0.55); P.arrow = true; }
        else { const k = (p - 0.55) / 0.45; P.lean = -0.06 * (1 - k); if (k > 0.6) P.aF = lerp(PI / 2, 0.55, (k - 0.6) / 0.4); }
        P.lenB = 22 - P.draw * 15;
        P.lF = 0.2; P.lB = -0.15;
        break;
      case 'cast':
        if (p < 0.5) { const k = ease(p / 0.5); P.aF = lerp(0.3, 2.4, k); P.aB = lerp(-0.2, 1.8, k); P.glow = k; }
        else if (p < 0.7) { const k = ease((p - 0.5) / 0.2); P.aF = lerp(2.4, 1.5, k); P.aB = lerp(1.8, 0.8, k); P.glow = 1; P.lean = 0.12 * k; }
        else { const k = ease((p - 0.7) / 0.3); P.aF = lerp(1.5, 0.3, k); P.aB = lerp(0.8, -0.2, k); P.glow = 1 - k; P.lean = 0.12 * (1 - k); }
        break;
      case 'ult': {
        const s = Math.sin(PI * Math.min(1, p));
        P.glow = s;
        P.dy = -Math.sin(PI * Math.min(1, p * 1.3)) * 18;
        P.aF = lerp(0.3, 2.9, s); P.aB = lerp(-0.2, 2.6, s);
        P.lF = -0.35 * s; P.lB = 0.35 * s;
        break;
      }
      case 'hit': {
        const k = 1 - ease(p);
        P.lean = -0.3 * k; P.dx = -8 * k;
        P.aF = 0.3 + 0.5 * k; P.aB = -0.2 - 0.4 * k;
        break;
      }
      case 'die': {
        const k = ease(Math.min(1, p * 1.6));
        P.rot = -1.5 * k; P.dx = -10 * k;
        P.alpha = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
        P.aF = 0.3 + 1.2 * k; P.aB = 1.2 * k;
        break;
      }
      case 'win': {
        const j = Math.abs(Math.sin(t * 5));
        P.dy = -j * 10; P.aF = 2.6; P.aB = 2.4 + Math.sin(t * 10) * 0.2;
        P.lF = j * 0.4; P.lB = -j * 0.4;
        break;
      }
    }
    return P;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); }
  // Limb from (x,y) along angle a (0 = straight down, +PI/2 = forward). Returns the far end.
  function limb(ctx, x, y, a, len, w, col) {
    const ex = x + Math.sin(a) * len, ey = y + Math.cos(a) * len;
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    return [ex, ey];
  }

  function drawLeg(ctx, L, x, a, back) {
    const k = back ? -0.25 : 0;
    const [fx, fy] = limb(ctx, x, -38, a, 36, 8, C(L.armor2, k));
    ctx.fillStyle = C('#3a2a1e', k);
    ctx.beginPath(); ctx.ellipse(fx + 3, fy - 1, 6, 3.5, 0, 0, PI * 2); ctx.fill();
  }

  function drawCape(ctx, L, b, t) {
    const w = Math.sin(t * 3) * 3;
    ctx.fillStyle = C(L.cape, -0.15);
    ctx.beginPath();
    ctx.moveTo(4, -75);
    ctx.quadraticCurveTo(-14 * b, -58, -19 * b + w, -20);
    ctx.lineTo(-5, -24);
    ctx.lineTo(-8 * b, -75);
    ctx.closePath();
    ctx.fill();
  }

  function drawTorso(ctx, h, L, b) {
    const fac = FACTIONS[h.fac];
    ctx.fillStyle = C(L.armor);
    rr(ctx, -10 * b, -78, 20 * b, 42, 7); ctx.fill();
    ctx.fillStyle = C(L.armor, 0.18);
    rr(ctx, -10 * b + 3, -76, 8 * b, 22, 4); ctx.fill();
    // tunic skirt
    ctx.fillStyle = C(L.armor, -0.15);
    ctx.beginPath(); ctx.moveTo(-11 * b, -42); ctx.lineTo(11 * b, -42); ctx.lineTo(13 * b, -30); ctx.lineTo(-13 * b, -30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C(L.trim);
    ctx.fillRect(-10 * b, -45, 20 * b, 4);
    ctx.fillStyle = C(fac.col);
    circle(ctx, 4 * b, -64, 2.6); ctx.fill();
    if (ROLES[h.role].front) { // shoulder pad
      ctx.fillStyle = C(L.trim, -0.1);
      ctx.beginPath(); ctx.ellipse(4 * b, -74, 7 * b, 5, 0, PI, PI * 2); ctx.fill();
    }
  }

  function drawHead(ctx, L, t, P) {
    const hx = 2, hy = -89;
    ctx.fillStyle = C(L.skin, -0.08);
    ctx.fillRect(-2, -81, 7, 6);
    ctx.save(); // chibi proportions: head scaled up around the neck
    ctx.translate(2, -79); ctx.scale(1.28, 1.28); ctx.translate(-2, 79);
    const hair = C(L.hair), hs = L.hs;
    if (L.hat === 'hood') {
      ctx.fillStyle = C(L.cape || L.armor, -0.1);
      circle(ctx, hx - 1, hy - 1, 15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, -86); ctx.lineTo(-16, -68); ctx.lineTo(0, -74); ctx.fill();
    }
    if (hs === 'long' && L.hat !== 'hood') {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.moveTo(-10, -96); ctx.quadraticCurveTo(-17, -78, -12 + Math.sin(t * 2) * 1.5, -64); ctx.lineTo(0, -68); ctx.lineTo(2, -92); ctx.fill();
    }
    if (hs === 'pony' && L.hat !== 'hood') {
      ctx.fillStyle = hair;
      ctx.save(); ctx.translate(-12, -90); ctx.rotate(0.5 + Math.sin(t * 3) * 0.12);
      ctx.beginPath(); ctx.ellipse(0, 8, 4, 10, 0, 0, PI * 2); ctx.fill(); ctx.restore();
    }
    if (hs === 'braid' && L.hat !== 'hood') {
      ctx.fillStyle = hair;
      for (let i = 0; i < 4; i++) { circle(ctx, -9 - Math.sin(t * 2 + i) * 0.8, -84 + i * 6, 3.4 - i * 0.3); ctx.fill(); }
    }
    // hair crescent: a larger hair circle behind, face on top
    if (hs !== 'bald' && L.hat !== 'hood') { ctx.fillStyle = hair; circle(ctx, hx - 1.5, hy - 1.5, 12.5); ctx.fill(); }
    if (L.hat === 'hood') {
      ctx.fillStyle = C(L.skin, -0.35);
      circle(ctx, hx + 3, hy + 1, 9.5); ctx.fill();
    } else {
      ctx.fillStyle = C(L.skin);
      circle(ctx, hx + 1.5, hy + 0.8, 11); ctx.fill();
    }
    if (hs === 'spiky' && L.hat !== 'hood') {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(-10, -92); ctx.lineTo(-14, -103); ctx.lineTo(-5, -99); ctx.lineTo(-4, -109); ctx.lineTo(2, -101); ctx.lineTo(6, -108); ctx.lineTo(8, -99); ctx.lineTo(13, -99); ctx.lineTo(10, -92);
      ctx.closePath(); ctx.fill();
    } else if (hs !== 'bald' && L.hat !== 'hood') {
      ctx.fillStyle = hair; // fringe
      ctx.beginPath(); ctx.ellipse(hx + 2, hy - 8, 10, 4.5, 0.15, PI, PI * 2.05); ctx.fill();
    }
    // ears
    if (L.hat === 'ears') {
      const e = L.ears || 1;
      ctx.fillStyle = C(L.skin, -0.05);
      ctx.beginPath(); ctx.moveTo(-3, -92); ctx.lineTo(-10 - 6 * e, -99 - 4 * e); ctx.lineTo(-2, -85); ctx.closePath(); ctx.fill();
    }
    // face
    const eye = L.hat === 'hood' ? C(L.eye || '#ffffff') : C(L.eye || '#2a1e18');
    const blink = (t % 4.2) < 0.12 ? 0.3 : 1;
    ctx.fillStyle = eye;
    ctx.beginPath(); ctx.ellipse(6.5, -89, 1.5, 2 * blink, 0, 0, PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, -89, 1.3, 1.9 * blink, 0, 0, PI * 2); ctx.fill();
    if (L.hat !== 'hood') {
      ctx.strokeStyle = C(L.skin, -0.45); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(7.5, -82.5); ctx.lineTo(10.5, -83); ctx.stroke();
    }
    if (L.beard) {
      ctx.fillStyle = C(L.beard);
      ctx.beginPath(); ctx.moveTo(1, -86); ctx.quadraticCurveTo(4, -72, 12, -78); ctx.lineTo(13, -84); ctx.quadraticCurveTo(8, -80, 4, -86); ctx.fill();
    }
    // headgear
    switch (L.hat) {
      case 'crown':
        ctx.fillStyle = C('#ffcf3a');
        ctx.beginPath(); ctx.moveTo(-7, -98); ctx.lineTo(-7, -106); ctx.lineTo(-3, -101); ctx.lineTo(1, -109); ctx.lineTo(5, -101); ctx.lineTo(9, -106); ctx.lineTo(10, -98); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C('#ff3a5a'); circle(ctx, 1.5, -101, 1.6); ctx.fill();
        break;
      case 'tiara':
        ctx.strokeStyle = C(L.trim); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx + 1, hy - 1, 11, PI * 1.15, PI * 1.85); ctx.stroke();
        ctx.fillStyle = C('#9fe8ff'); circle(ctx, hx + 1, hy - 12.5, 2.2); ctx.fill();
        break;
      case 'helmet': case 'viking': {
        const m = L.helm || '#9aa6b4';
        ctx.fillStyle = C(m);
        ctx.beginPath(); ctx.arc(hx + 1, hy - 1, 13, PI * 0.95, PI * 2.05); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C(m, -0.25); ctx.fillRect(hx - 12, hy - 2, 26, 3);
        ctx.fillStyle = C(m, -0.1); ctx.fillRect(hx + 8, hy - 2, 3, 9);
        if (L.hat === 'viking') {
          ctx.fillStyle = C('#efe6d0');
          ctx.beginPath(); ctx.moveTo(hx - 9, hy - 8); ctx.quadraticCurveTo(hx - 20, hy - 14, hx - 16, hy - 26); ctx.quadraticCurveTo(hx - 13, hy - 15, hx - 5, hy - 12); ctx.fill();
          ctx.beginPath(); ctx.moveTo(hx + 9, hy - 9); ctx.quadraticCurveTo(hx + 20, hy - 15, hx + 18, hy - 27); ctx.quadraticCurveTo(hx + 14, hy - 16, hx + 5, hy - 12); ctx.fill();
        } else {
          ctx.fillStyle = C(L.trim); ctx.fillRect(hx - 2, hy - 18, 4, 6);
        }
        break;
      }
      case 'wizard':
        ctx.fillStyle = C(L.armor, -0.1);
        ctx.beginPath(); ctx.ellipse(hx, hy - 9, 16, 3.6, -0.08, 0, PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - 10, hy - 10); ctx.quadraticCurveTo(hx - 4, hy - 26, hx - 14 + Math.sin(t * 2) * 1.5, hy - 36); ctx.quadraticCurveTo(hx + 2, hy - 28, hx + 10, hy - 10); ctx.fill();
        ctx.fillStyle = C(L.trim); ctx.fillRect(hx - 9, hy - 13, 18, 3);
        break;
      case 'halo':
        ctx.strokeStyle = `rgba(255,236,140,${0.7 + Math.sin(t * 3) * 0.2})`; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(hx, hy - 17 + Math.sin(t * 2) * 1, 10, 3, 0, 0, PI * 2); ctx.stroke();
        break;
      case 'bandana':
        ctx.fillStyle = C(L.trim, -0.2);
        ctx.fillRect(hx - 10, hy - 7, 22, 4);
        ctx.beginPath(); ctx.moveTo(hx - 10, hy - 6); ctx.lineTo(hx - 20, hy - 3 + Math.sin(t * 5) * 2); ctx.lineTo(hx - 19, hy + 2 + Math.sin(t * 5 + 1) * 2); ctx.closePath(); ctx.fill();
        break;
      case 'hood':
        ctx.strokeStyle = C(L.cape || L.armor, 0.05); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hx + 3, hy + 1, 11, -PI * 0.55, PI * 0.45); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  function drawWeapon(ctx, h, L, P, a, t) {
    const glow = FACTIONS[h.fac].glow;
    switch (L.wpn) {
      case 'sword':
        ctx.fillStyle = C('#5a3a22'); ctx.fillRect(-8, -1.6, 7, 3.2);
        ctx.fillStyle = C(L.trim); ctx.fillRect(-1.5, -6, 3, 12);
        ctx.fillStyle = C('#dfe6ee');
        ctx.beginPath(); ctx.moveTo(2, -2.4); ctx.lineTo(31, -2); ctx.lineTo(37, 0); ctx.lineTo(31, 2); ctx.lineTo(2, 2.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C('#ffffff', 0); ctx.globalAlpha *= 0.6; ctx.fillRect(4, -0.6, 26, 1.2); ctx.globalAlpha /= 0.6;
        break;
      case 'dagger':
        ctx.fillStyle = C('#4a3020'); ctx.fillRect(-5, -1.5, 5, 3);
        ctx.fillStyle = C(L.trim); ctx.fillRect(-1, -4, 2, 8);
        ctx.fillStyle = C('#cfd8e2');
        ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(15, -1); ctx.lineTo(19, 0); ctx.lineTo(15, 1); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
        break;
      case 'axe':
        ctx.strokeStyle = C('#6b4426'); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(30, 0); ctx.stroke();
        ctx.fillStyle = C('#b8c2cc');
        ctx.beginPath(); ctx.moveTo(22, -2); ctx.quadraticCurveTo(27, -16, 36, -18); ctx.quadraticCurveTo(33, -6, 33, 0); ctx.quadraticCurveTo(33, 6, 36, 14); ctx.quadraticCurveTo(27, 12, 22, 2); ctx.closePath(); ctx.fill();
        break;
      case 'hammer':
        ctx.strokeStyle = C('#6b4426'); ctx.lineWidth = 3.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(28, 0); ctx.stroke();
        ctx.fillStyle = C(L.trim === '#fff6c8' ? '#f0d070' : '#9aa6b4');
        rr(ctx, 22, -11, 13, 22, 3); ctx.fill();
        ctx.fillStyle = C(FACTIONS[h.fac].col); ctx.fillRect(26, -3, 5, 6);
        break;
      case 'spear':
        ctx.strokeStyle = C('#7a5432'); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(44, 0); ctx.stroke();
        ctx.fillStyle = C(L.trim, -0.1);
        ctx.beginPath(); ctx.moveTo(42, -5); ctx.lineTo(56, 0); ctx.lineTo(42, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C(FACTIONS[h.fac].col); ctx.fillRect(38, -2.5, 4, 5);
        break;
      case 'scythe':
        ctx.strokeStyle = C('#2a1f30'); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(42, 0); ctx.stroke();
        ctx.fillStyle = C('#d6c8ee');
        ctx.beginPath(); ctx.moveTo(41, -2); ctx.quadraticCurveTo(32, -30, 6, -36); ctx.quadraticCurveTo(28, -22, 37, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = `rgba(200,120,255,${0.5 + Math.sin(t * 4) * 0.3})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(41, -2); ctx.quadraticCurveTo(32, -30, 6, -36); ctx.stroke();
        break;
      case 'bow': {
        ctx.strokeStyle = C('#6b4426'); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-19, -1); ctx.quadraticCurveTo(0, 16, 19, -1); ctx.stroke();
        const pull = -2 - P.draw * 17;
        ctx.strokeStyle = 'rgba(240,240,240,.85)'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(-19, -1); ctx.lineTo(0, pull); ctx.lineTo(19, -1); ctx.stroke();
        if (P.arrow) {
          ctx.strokeStyle = C('#d8c8a8'); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(0, pull); ctx.lineTo(0, 22); ctx.stroke();
          ctx.fillStyle = C(FACTIONS[h.fac].col);
          ctx.beginPath(); ctx.moveTo(-2.5, 21); ctx.lineTo(0, 27); ctx.lineTo(2.5, 21); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'staff': {
        // undo the arm rotation so the staff stays mostly upright
        ctx.rotate(a);
        ctx.rotate(Math.max(-0.3, Math.min(1.3, (a - 0.3) * 0.6)));
        ctx.strokeStyle = C('#7a5432'); ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -44); ctx.stroke();
        ctx.strokeStyle = C(L.trim); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-5, -42); ctx.quadraticCurveTo(-6, -54, 0, -58); ctx.moveTo(5, -42); ctx.quadraticCurveTo(6, -54, 0, -58); ctx.stroke();
        const g = 0.45 + P.glow * 0.55, r = 7 + P.glow * 12 + Math.sin(t * 4) * 1.2;
        const grad = ctx.createRadialGradient(0, -50, 0, 0, -50, r);
        grad.addColorStop(0, `rgba(255,255,255,${g})`);
        grad.addColorStop(0.35, hexA(glow, g * 0.8));
        grad.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = grad; circle(ctx, 0, -50, r); ctx.fill();
        ctx.fillStyle = C(FACTIONS[h.fac].col, 0.3); circle(ctx, 0, -50, 4.2); ctx.fill();
        break;
      }
    }
  }

  function hexA(h, a) { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; }

  // ---- painted sprites (img/<id>.webp) ----
  const sprites = {}, ghosts = {};
  const SPRITE_H = 122; // sprite height in rig units (the rig is ~120 tall with its chibi head)
  function loadSprites() {
    return Promise.all(HEROES.filter(h => h.img).map(h => new Promise(res => {
      const im = new Image();
      im.onload = () => {
        sprites[h.id] = im;
        // white silhouette used for the hit flash
        const g = document.createElement('canvas');
        g.width = im.naturalWidth; g.height = im.naturalHeight;
        const x = g.getContext('2d');
        x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, g.width, g.height);
        ghosts[h.id] = g;
        res();
      };
      im.onerror = () => res();
      im.src = 'img/' + h.id + '.webp';
    })));
  }
  const hasSprite = h => !!sprites[h.id];

  function drawSprite(ctx, h, o, P) {
    const im = sprites[h.id], s = (o.s || 1) * (h.sz || 1), t = o.t || 0;
    const Hs = SPRITE_H * s, Ws = Hs * im.naturalWidth / im.naturalHeight;
    const alpha = (o.alpha == null ? 1 : o.alpha) * P.alpha;
    if (alpha <= 0.01) return;
    const face = o.face || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (!o.noShadow) {
      ctx.globalAlpha = 0.32 * alpha; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(P.dx * s * face, 0, Ws * 0.36, 6 * s, 0, 0, PI * 2); ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.scale(face, 1);
    ctx.translate(P.dx * s * 1.4, (P.dy + P.bob * 0.6) * s);
    const aura = Math.max(P.glow, o.aura || 0);
    if (aura > 0.02) {
      const g = ctx.createRadialGradient(0, -Hs * 0.45, 4, 0, -Hs * 0.45, Hs * 0.7);
      g.addColorStop(0, hexA(FACTIONS[h.fac].glow, 0.6 * aura)); g.addColorStop(1, hexA(FACTIONS[h.fac].glow, 0));
      ctx.fillStyle = g; circle(ctx, 0, -Hs * 0.45, Hs * 0.7); ctx.fill();
    }
    // whole-body motion: lean/fall pivot at the feet, breathing squash while idle
    ctx.rotate(P.rot + P.lean * 0.55);
    const br = o.anim === 'idle' || !o.anim ? Math.sin(t * 2.6) * 0.012 : 0;
    const strike = o.anim === 'melee' ? Math.sin(PI * Math.min(1, o.p || 0)) * 0.05 : 0;
    ctx.scale(1 - br * 0.5 + strike, 1 + br - strike * 0.6);
    if ((h.face || 1) < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -Ws / 2, -Hs, Ws, Hs);
    const fl = o.flash || 0;
    if (fl > 0.02) { ctx.globalAlpha = alpha * fl * 0.85; ctx.drawImage(ghosts[h.id], -Ws / 2, -Hs, Ws, Hs); }
    ctx.restore();
  }

  // o: {x, y, s, face, anim, p, t, flash, flashCol, alpha, aura}
  function drawHero(ctx, h, o) {
    const L = h.look, P = pose(o.anim || 'idle', o.p || 0, o.t || 0, L.wpn);
    if (sprites[h.id]) return drawSprite(ctx, h, o, P);
    FL = o.flash || 0; FLC = o.flashCol ? rgb(o.flashCol) : [255, 255, 255];
    const s = (o.s || 1) * (L.size || 1), b = L.build || 1, t = o.t || 0;
    const alpha = (o.alpha == null ? 1 : o.alpha) * P.alpha;
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (!o.noShadow) {
      ctx.globalAlpha = 0.3 * alpha;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(P.dx * s * (o.face || 1), 0, 20 * s * b, 5 * s, 0, 0, PI * 2); ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.scale(s * (o.face || 1), s);
    ctx.translate(P.dx, P.dy);
    const aura = Math.max(P.glow, o.aura || 0);
    if (aura > 0.02) {
      const g = ctx.createRadialGradient(0, -50, 4, 0, -50, 70);
      g.addColorStop(0, hexA(FACTIONS[h.fac].glow, 0.55 * aura));
      g.addColorStop(1, hexA(FACTIONS[h.fac].glow, 0));
      ctx.fillStyle = g; circle(ctx, 0, -50, 70); ctx.fill();
    }
    ctx.rotate(P.rot);
    drawLeg(ctx, L, -3 * b, P.lB, true);
    drawLeg(ctx, L, 3 * b, P.lF, false);
    ctx.save();
    ctx.translate(0, -38 + P.bob); ctx.rotate(P.lean); ctx.translate(0, 38);
    if (L.cape) drawCape(ctx, L, b, t);
    // back arm
    const [bx, by] = limb(ctx, -3 * b, -71, P.aB, P.lenB, 6.5 * b, C(L.armor, -0.3));
    ctx.fillStyle = C(L.skin, -0.25); circle(ctx, bx, by, 3.2); ctx.fill();
    drawTorso(ctx, h, L, b);
    drawHead(ctx, L, t, P);
    if (L.shield) {
      ctx.fillStyle = C(L.shield);
      ctx.beginPath(); ctx.ellipse(bx + 4, by - 4, 9 * b, 13 * b, 0, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = C(L.trim); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C(FACTIONS[h.fac].col); circle(ctx, bx + 4, by - 4, 3); ctx.fill();
    }
    // front arm + weapon
    const sx = 3 * b, sy = -71;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(-P.aF);
    ctx.strokeStyle = C(L.armor, -0.08); ctx.lineWidth = 7 * b; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 24); ctx.stroke();
    ctx.translate(0, 24);
    drawWeapon(ctx, h, L, P, P.aF, t);
    ctx.restore();
    ctx.fillStyle = C(L.skin);
    circle(ctx, sx + Math.sin(P.aF) * 24, sy + Math.cos(P.aF) * 24, 3.6); ctx.fill();
    ctx.restore();
    ctx.restore();
    FL = 0;
  }

  // Static head-and-shoulders portrait, cached as a data URL per hero and size.
  const portraits = new Map();
  function portrait(h, size = 96) {
    const key = h.id + size;
    if (portraits.has(key)) return portraits.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d'), f = FACTIONS[h.fac];
    const g = x.createRadialGradient(size * 0.5, size * 0.35, 4, size * 0.5, size * 0.5, size * 0.75);
    g.addColorStop(0, hexA(f.glow, 0.9)); g.addColorStop(0.5, hexA(f.col, 0.55)); g.addColorStop(1, '#14101e');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    const im = sprites[h.id];
    if (im) { // head and shoulders of the painting, centred on the head
      const dh = size * 2.7, dw = dh * im.naturalWidth / im.naturalHeight;
      x.drawImage(im, size / 2 - dw * (h.hx || 0.5), size * 0.32 - dh * (h.hy || 0.1), dw, dh);
    } else {
      const s = 1.45 * size / 96;
      drawHero(x, h, { x: size * 0.44, y: size * 0.36 + 89 * s, s, face: 1, anim: 'idle', t: 0.6, noShadow: true });
    }
    const url = toURL(c, h);
    portraits.set(key, url);
    return url;
  }

  // Tall roster-card splash: hero in an action pose over rays and a faction glow, cached per hero.
  const cards = new Map();
  function cardArt(h, w = 184, hgt = 300) {
    const key = h.id + w + 'x' + hgt;
    if (cards.has(key)) return cards.get(key);
    const c = document.createElement('canvas');
    c.width = w; c.height = hgt;
    const x = c.getContext('2d'), f = FACTIONS[h.fac];
    let g = x.createLinearGradient(0, 0, 0, hgt);
    g.addColorStop(0, '#3a2a2a'); g.addColorStop(1, '#140c10');
    x.fillStyle = g; x.fillRect(0, 0, w, hgt);
    x.save(); x.translate(w * 0.5, hgt * 0.32);
    for (let i = 0; i < 14; i++) {
      x.rotate(Math.PI / 7);
      x.fillStyle = hexA(i % 2 ? f.glow : '#ffd27a', 0.07);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(-hgt * 0.12, -hgt); x.lineTo(hgt * 0.12, -hgt); x.fill();
    }
    x.restore();
    g = x.createRadialGradient(w * 0.5, hgt * 0.38, 4, w * 0.5, hgt * 0.38, w * 0.85);
    g.addColorStop(0, hexA(f.glow, 0.6)); g.addColorStop(0.45, hexA(f.col, 0.3)); g.addColorStop(1, hexA(f.col, 0));
    x.fillStyle = g; x.fillRect(0, 0, w, hgt);
    const im = sprites[h.id];
    if (im) { // splash: the painting from head to knees
      const dh = hgt * 1.3, dw = dh * im.naturalWidth / im.naturalHeight;
      x.drawImage(im, w / 2 - dw * (0.5 + ((h.hx || 0.5) - 0.5) * 0.6), hgt * 0.04, dw, dh);
    } else {
      const wpn = h.look.wpn;
      const pose = MELEE.has(wpn) ? ['melee', 0.3] : wpn === 'bow' ? ['shoot', 0.5] : ['cast', 0.45];
      const s = hgt / 108;
      drawHero(x, h, { x: w * 0.47, y: hgt + 16 * s, s, face: 1, anim: pose[0], p: pose[1], t: 0.6, noShadow: true });
    }
    g = x.createLinearGradient(0, hgt * 0.62, 0, hgt);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,4,6,.75)');
    x.fillStyle = g; x.fillRect(0, 0, w, hgt);
    const url = toURL(c, h);
    cards.set(key, url);
    return url;
  }

  // Pages opened from file:// can't export canvases that drew local images; fall back to the raw sprite.
  function toURL(c, h) {
    try { return c.toDataURL(); } catch { return 'img/' + h.id + '.webp'; }
  }

  return { drawHero, portrait, cardArt, hexA, rgb, loadSprites, hasSprite };
})();
