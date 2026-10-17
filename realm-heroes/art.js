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
    const hk = BIG ? 1.38 : 1.28; ctx.translate(2, -79); ctx.scale(hk, hk); ctx.translate(-2, 79);
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
    } else if (hs !== 'bald' && L.hat !== 'hood' && BIG) {
      ctx.fillStyle = hair; // jagged anime bangs
      ctx.beginPath(); ctx.moveTo(hx - 11, hy - 2); ctx.lineTo(hx - 9, hy - 11); ctx.quadraticCurveTo(hx + 2, hy - 17, hx + 13, hy - 8);
      ctx.lineTo(hx + 12.5, hy - 3); ctx.lineTo(hx + 9.5, hy - 7.5); ctx.lineTo(hx + 7.5, hy - 3.5); ctx.lineTo(hx + 4.5, hy - 8.5);
      ctx.lineTo(hx + 1.5, hy - 4.5); ctx.lineTo(hx - 1.5, hy - 9); ctx.lineTo(hx - 5, hy - 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 11, hy - 6); ctx.quadraticCurveTo(hx + 14.5, hy + 1, hx + 12, hy + 7); ctx.lineTo(hx + 10.5, hy - 1); ctx.fill(); // side lock
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
    if (BIG && L.hat !== 'hood') {
      // anime eyes for pixel frames: white, coloured iris with a dark top, highlight, lash line
      const iris = L.eye || '#6a4a3a';
      const eyeAt = (ex, w) => {
        ctx.fillStyle = C('#ffffff'); ctx.fillRect(ex - w, -91.6, w * 2, 4.4);
        ctx.fillStyle = C(iris); ctx.fillRect(ex - w * 0.7, -91.6, w * 1.4, 4.4);
        ctx.fillStyle = C(iris, -0.55); ctx.fillRect(ex - w * 0.7, -91.6, w * 1.4, 1.6);
        ctx.fillStyle = C('#ffffff'); ctx.fillRect(ex - w * 0.55, -90.2, 1, 1.1);
        ctx.fillStyle = C('#1a1018'); ctx.fillRect(ex - w - 0.5, -92.9, w * 2 + 1, 1.4);
      };
      eyeAt(6.2, 1.8);
      if (!L.patch) eyeAt(11.8, 1.45);
      ctx.fillStyle = C(L.skin, -0.35); ctx.fillRect(8.2, -83.6, 2.2, 0.9); // mouth
    } else {
      const ek = BIG ? 1.7 : 1;
      ctx.beginPath(); ctx.ellipse(6.5, -89, 1.5 * ek, 2 * blink * ek, 0, 0, PI * 2); ctx.fill();
      if (!L.patch) { ctx.beginPath(); ctx.ellipse(11.5, -89, 1.3 * ek, 1.9 * blink * ek, 0, 0, PI * 2); ctx.fill(); }
    }
    if (L.patch) {
      ctx.fillStyle = C('#141018');
      ctx.beginPath(); ctx.ellipse(11.5, -89.5, 3.2, 3, 0, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = C('#141018'); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-8, -94); ctx.lineTo(12, -91); ctx.stroke();
    }
    if (L.hat !== 'hood' && !BIG) {
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
      case 'tricorn':
        ctx.fillStyle = C('#1e1a22');
        ctx.beginPath(); ctx.moveTo(hx - 17, hy - 9); ctx.quadraticCurveTo(hx, hy - 4, hx + 17, hy - 10);
        ctx.quadraticCurveTo(hx + 10, hy - 24, hx, hy - 22); ctx.quadraticCurveTo(hx - 10, hy - 24, hx - 17, hy - 9); ctx.fill();
        ctx.strokeStyle = C('#e0b040'); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hx - 16, hy - 9); ctx.quadraticCurveTo(hx, hy - 4, hx + 16, hy - 10); ctx.stroke();
        ctx.fillStyle = C('#c8202e');
        ctx.beginPath(); ctx.moveTo(hx - 4, hy - 20); ctx.quadraticCurveTo(hx - 18, hy - 34, hx - 22 + Math.sin(t * 3), hy - 22); ctx.quadraticCurveTo(hx - 12, hy - 24, hx - 2, hy - 18); ctx.fill();
        break;
      case 'antlers':
        ctx.strokeStyle = C('#6a4a2a'); ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const sd of [-1, 1]) {
          const bx = hx + sd * 6;
          ctx.beginPath(); ctx.moveTo(bx, hy - 9); ctx.lineTo(bx + sd * 8, hy - 24); ctx.lineTo(bx + sd * 6, hy - 36);
          ctx.moveTo(bx + sd * 8, hy - 24); ctx.lineTo(bx + sd * 17, hy - 30);
          ctx.moveTo(bx + sd * 4, hy - 16); ctx.lineTo(bx + sd * 13, hy - 17); ctx.stroke();
        }
        ctx.fillStyle = C('#5aa04a');
        for (const [ax, ay] of [[hx - 14, hy - 30], [hx + 16, hy - 36], [hx - 4, hy - 38]]) { circle(ctx, ax, ay, 3); ctx.fill(); }
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

  // Vector rig, used only to build pixel frames. o: {x, y, s, anim, p, t, solid}
  function rig(ctx, h, o) {
    const L = h.look, P = pose(o.anim || 'idle', o.p || 0, o.t || 0, L.wpn);
    FL = o.flash || 0; FLC = o.flashCol ? rgb(o.flashCol) : [255, 255, 255];
    const s = (o.s || 1) * (L.size || 1), b = L.build || 1, t = o.t || 0;
    const alpha = o.solid ? 1 : (o.alpha == null ? 1 : o.alpha) * P.alpha;
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
    const aura = o.solid ? 0 : Math.max(P.glow, o.aura || 0);
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

  // ---- pixel sprites ----
  // Each animation frame is the rig drawn at 4x, shrunk to sprite size, snapped to the hero's palette
  // and given a dark outline. Frames are built on first use and cached.
  const PX = 0.7;                                        // sprite pixels per rig unit
  const WIN = { x0: -135, x1: 100, y0: -178, y1: 10 };   // rig-unit window one frame covers
  const FW = Math.ceil((WIN.x1 - WIN.x0) * PX), FH = Math.ceil((WIN.y1 - WIN.y0) * PX);
  const OX = Math.round(-WIN.x0 * PX), OY = Math.round(-WIN.y0 * PX); // feet inside the frame
  const FRAMES = { idle: 4, run: 6, win: 4, melee: 7, shoot: 6, cast: 7, ult: 7, hit: 2, die: 7 };
  const OUTLINE = [28, 18, 34];
  const EXTRA = ['#3a2a1e', '#dfe6ee', '#b8c2cc', '#9aa6b4', '#6b4426', '#7a5432', '#5a3a22', '#ffcf3a', '#ff3a5a', '#efe6d0',
    '#ffffff', '#2a1e18', '#d6c8ee', '#2a1f30', '#cfd8e2', '#d8c8a8', '#9fe8ff', '#141018'];
  const frames = new Map(), whites = new Map(), palettes = new Map();
  let BIG = false; // set while building frames: bigger eyes so they survive the shrink

  function shadeRGB(h, k) {
    let [r, g, b] = rgb(h);
    if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return [r | 0, g | 0, b | 0];
  }
  function palette(h) {
    let out = palettes.get(h.id);
    if (out) return out;
    const L = h.look, f = FACTIONS[h.fac];
    out = [];
    [L.skin, L.hair, L.armor, L.armor2, L.trim, L.cape, L.shield, L.beard, L.eye, f.col, f.glow].forEach(c => {
      if (c) for (const k of [-0.5, -0.28, 0, 0.22, 0.5]) out.push(shadeRGB(c, k));
    });
    EXTRA.forEach(c => out.push(rgb(c)));
    palettes.set(h.id, out);
    return out;
  }
  function frameIndex(anim, p, t) {
    const n = FRAMES[anim] || 4;
    if (anim === 'idle') return Math.floor(t * 5) % n;
    if (anim === 'run') return Math.floor(t * 12) % n;
    if (anim === 'win') return Math.floor(t * 7) % n;
    return Math.min(n - 1, Math.max(0, Math.floor(p * n)));
  }
  function frameParams(anim, i) {
    const n = FRAMES[anim] || 4;
    if (anim === 'idle') return { p: 0, t: 1 + i / n * (2 * PI / 2.6) };
    if (anim === 'run') return { p: 0, t: 1 + i / n * (2 * PI / 13) };
    if (anim === 'win') return { p: 0, t: 1 + i / n * (PI / 5) };
    return { p: (i + 0.5) / n, t: 1.3 };
  }
  function buildFrame(h, anim, i) {
    const S = 3, hi = document.createElement('canvas');
    hi.width = FW * S; hi.height = FH * S;
    BIG = true;
    rig(hi.getContext('2d'), h, { x: OX * S, y: OY * S, s: PX * S, anim, ...frameParams(anim, i), noShadow: true, solid: true });
    BIG = false;
    const c = document.createElement('canvas');
    c.width = FW; c.height = FH;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(hi, 0, 0, FW, FH);
    const img = x.getImageData(0, 0, FW, FH), d = img.data, pal = palette(h), solid = new Uint8Array(FW * FH);
    const near = new Map();
    for (let k = 0; k < FW * FH; k++) {
      const o = k * 4;
      if (d[o + 3] < 110) { d[o + 3] = 0; continue; }
      const a = d[o + 3] / 255, r = d[o] / a, g = d[o + 1] / a, b = d[o + 2] / a; // un-premultiply edge pixels
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      let best = near.get(key);
      if (best === undefined) {
        let bd = 1e9; best = 0;
        for (let j = 0; j < pal.length; j++) {
          const q = pal[j], e = (q[0] - r) ** 2 * 0.3 + (q[1] - g) ** 2 * 0.59 + (q[2] - b) ** 2 * 0.11;
          if (e < bd) { bd = e; best = j; }
        }
        near.set(key, best);
      }
      d[o] = pal[best][0]; d[o + 1] = pal[best][1]; d[o + 2] = pal[best][2]; d[o + 3] = 255;
      solid[k] = 1;
    }
    // cel shading: light from the top left. Pixels on a top/left edge get a highlight,
    // a two-pixel band along bottom/right edges gets shadow.
    const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < FW && yy < FH && solid[yy * FW + xx];
    const tone = new Int8Array(FW * FH);
    for (let y = 0; y < FH; y++) for (let xx = 0; xx < FW; xx++) {
      if (!solid[y * FW + xx]) continue;
      if (!at(xx + 1, y) || !at(xx, y + 1) || !at(xx + 1, y + 1)) tone[y * FW + xx] = -2;
      else if (!at(xx + 2, y) || !at(xx, y + 2)) tone[y * FW + xx] = -1;
      else if (!at(xx - 1, y) || !at(xx, y - 1)) tone[y * FW + xx] = 1;
    }
    for (let k = 0; k < FW * FH; k++) {
      const tn = tone[k]; if (!tn) continue;
      const o = k * 4, f = tn > 0 ? 0.28 : tn === -1 ? -0.14 : -0.26;
      for (let c = 0; c < 3; c++) d[o + c] = f > 0 ? d[o + c] + (255 - d[o + c]) * f : d[o + c] * (1 + f);
    }
    for (let y = 0; y < FH; y++) for (let xx = 0; xx < FW; xx++) {
      const k = y * FW + xx;
      if (solid[k]) continue;
      if ((xx > 0 && solid[k - 1]) || (xx < FW - 1 && solid[k + 1]) || (y > 0 && solid[k - FW]) || (y < FH - 1 && solid[k + FW])) {
        const o = k * 4; d[o] = OUTLINE[0]; d[o + 1] = OUTLINE[1]; d[o + 2] = OUTLINE[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function frame(h, anim, i) {
    const key = h.id + '|' + anim + '|' + i;
    let f = frames.get(key);
    if (!f) { f = buildFrame(h, anim, i); frames.set(key, f); }
    return f;
  }
  function white(h, anim, i) {
    const key = h.id + '|' + anim + '|' + i;
    let w = whites.get(key);
    if (!w) {
      const f = frame(h, anim, i);
      w = document.createElement('canvas'); w.width = FW; w.height = FH;
      const x = w.getContext('2d');
      x.drawImage(f, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, FW, FH);
      whites.set(key, w);
    }
    return w;
  }
  // Screen pixels per sprite pixel; whole numbers once large enough so pixels stay square.
  function pixelSize(s) { const ps = s / PX; return ps >= 0.75 ? Math.max(1, Math.round(ps)) : ps; }

  // ---- hand-made pixel sprites (img/<id>.png) ----
  // Drawn at whole-number scale and animated as one piece: bob, lean, lunge, recoil, flash, fall.
  const sprites = {}, spriteWhite = {};
  let REF = 60; // typical sprite height in pixels; a sprite this tall stands as high as the 125-unit rig
  function loadSprites() {
    return Promise.all(HEROES.filter(h => h.img).map(h => new Promise(res => {
      const im = new Image();
      im.onload = () => {
        sprites[h.id] = im;
        const w = document.createElement('canvas');
        w.width = im.naturalWidth; w.height = im.naturalHeight;
        const x = w.getContext('2d');
        x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height);
        spriteWhite[h.id] = w;
        res();
      };
      im.onerror = () => res();
      im.src = 'img/' + h.id + '.png';
    }))).then(() => {
      const hs = Object.values(sprites).map(im => im.naturalHeight).sort((a, b) => a - b);
      if (hs.length) REF = hs[hs.length >> 1];
    });
  }
  // Screen pixels per sprite pixel for world scale s (s screen px per rig unit).
  function spriteScale(s) { const ps = s * 125 / REF; return ps >= 0.75 ? Math.max(1, Math.round(ps)) : ps; }
  const spriteRef = () => REF;
  // Half the drawn width of a hero, for spacing melee attacks.
  function halfWidth(h, s) {
    const im = sprites[h.id];
    return im ? im.naturalWidth * spriteScale(s) * 0.5 : 30 * s;
  }

  // ---- part rigs (RIGS in data.js): the sprite is cut into parts that rotate around their joints ----
  const rigs = {}, PAD = 26; // composition canvas margin, room for limbs swinging outside the sprite
  function inPoly(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function buildRig(h) {
    const defs = RIGS[h.id], im = sprites[h.id];
    if (!defs || !im) return null;
    const W = im.naturalWidth, H = im.naturalHeight;
    let src;
    try {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      src = x.getImageData(0, 0, W, H).data;
    } catch { return null; } // file:// pages can't read pixels; the sprite then moves as one piece
    // which part owns each opaque pixel
    const owner = new Int16Array(W * H).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[(y * W + x) * 4 + 3] < 20) continue;
      let k = defs.findIndex(d => inPoly(d.poly, x + 0.5, y + 0.5));
      if (k < 0) k = defs.length - 1;
      owner[y * W + x] = k;
    }
    const parts = defs.map((d, k) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'), img = x.createImageData(W, H), out = img.data;
      const fillPoly = d.fill === true ? d.poly : d.fill || null;
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx, o = i * 4;
        let from = -1;
        if (owner[i] === k) from = i;
        else if (fillPoly && owner[i] >= 0 && inPoly(fillPoly, xx + 0.5, y + 0.5)) {
          // paint in from the nearest pixel this part owns
          for (let r = 1; r < 14 && from < 0; r++) {
            for (const [dx, dy] of [[-r, 0], [r, 0], [0, r], [0, -r], [-r, r], [r, r], [-r, -r], [r, -r]]) {
              const sx = xx + dx, sy = y + dy;
              if (sx >= 0 && sy >= 0 && sx < W && sy < H && owner[sy * W + sx] === k) { from = sy * W + sx; break; }
            }
          }
        }
        if (from >= 0) for (let c2 = 0; c2 < 4; c2++) out[o + c2] = src[from * 4 + c2];
      }
      x.putImageData(img, 0, 0);
      return { ...d, canvas: c };
    });
    const byName = {}; parts.forEach(p => (byName[p.n] = p));
    const order = [...parts].sort((a, b) => a.z - b.z);
    const comp = document.createElement('canvas'); comp.width = W + PAD * 2; comp.height = H + PAD * 2;
    const white = document.createElement('canvas'); white.width = comp.width; white.height = comp.height;
    return { W, H, parts, byName, order, comp, white };
  }
  function rigFor(h) {
    if (!(h.id in rigs)) rigs[h.id] = buildRig(h);
    return rigs[h.id];
  }

  const EASE = { out: k => 1 - (1 - k) ** 3, in: k => k ** 3, inout: k => k * k * (3 - 2 * k), linear: k => k };
  const clipOf = (h, anim) => (CLIPS[h.id] && CLIPS[h.id][anim]) || null;
  // Plays a keyframe clip at progress p into R.
  function playClip(R, clip, p) {
    const ks = clip.keys;
    let i = 1;
    while (i < ks.length - 1 && p > ks[i].at) i++;
    const a = ks[i - 1], b = ks[i], k = (EASE[b.ease] || EASE.linear)(Math.min(1, Math.max(0, (p - a.at) / ((b.at - a.at) || 1))));
    for (const ch of ['body', 'head', 'armF', 'armB', 'legF', 'legB', 'tail']) {
      const va = a[ch] || [], vb = b[ch] || [];
      for (let j = 0; j < 3; j++) R[ch][j] += (va[j] || 0) + ((vb[j] || 0) - (va[j] || 0)) * k;
    }
  }

  // Joint angles (degrees, + turns clockwise; sprites face right so + lowers an arm) and offsets for one moment.
  function rigPose(h, anim, p, t) {
    const R = { body: [0, 0, 0], head: [0, 0, 0], armF: [0, 0, 0], armB: [0, 0, 0], legF: [0, 0, 0], legB: [0, 0, 0], tail: [0, 0, 0], base: [0, 0, 0] };
    const set = (k, a, dx = 0, dy = 0) => { R[k][0] += a; R[k][1] += dx; R[k][2] += dy; };
    const sw = (a, b, k) => a + (b - a) * k, ez = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
    const wpn = h.look.wpn, br = Math.sin(t * 2.6);
    set('tail', Math.sin(t * 3.1) * 9);
    const clip = clipOf(h, anim);
    if (clip) {
      playClip(R, clip, p);
      if (clip.fire && p > clip.fire[0] && p < clip.fire[1] && Math.floor(t * 24) % 2) { set('armF', -4, -3, 0); set('body', -2, -1, 0); set('head', -2); } // recoil
      return R;
    }
    switch (anim) {
      case 'idle':
        set('body', br * 2, 0, br > 0.3 ? -1 : 0); set('head', Math.sin(t * 2.6 - 0.7) * 4);
        set('armF', Math.sin(t * 2.6 + 0.5) * 4); set('armB', -Math.sin(t * 2.6 + 0.3) * 5);
        set('legF', Math.sin(t * 1.3) * 2); set('legB', -Math.sin(t * 1.3) * 2);
        break;
      case 'run': {
        const c = Math.sin(t * 13);
        set('legF', c * 22); set('legB', -c * 22); set('body', 7, 0, -Math.abs(c) * 1.5);
        set('armB', -c * 14); set('armF', c * 6); set('head', -4); set('tail', c * 12);
        break;
      }
      case 'melee': {
        if (p < 0.38) { const k = ez(p / 0.38); set('armF', -72 * k); set('body', -7 * k); set('armB', 14 * k); set('head', -4 * k); }
        else if (p < 0.56) { const k = ez((p - 0.38) / 0.18); set('armF', sw(-72, 38, k)); set('body', sw(-7, 11, k)); set('armB', sw(14, -10, k)); set('legF', 10 * k); set('legB', -8 * k); }
        else { const k = ez((p - 0.56) / 0.44); set('armF', 38 * (1 - k)); set('body', 11 * (1 - k)); set('armB', -10 * (1 - k)); set('legF', 10 * (1 - k)); set('legB', -8 * (1 - k)); }
        break;
      }
      case 'shoot':
        if (wpn === 'gun') { // gatling burst: aim, then recoil jitter
          const k = ez(Math.min(1, p / 0.2)), fire = p > 0.2 && p < 0.85, kick = fire ? (Math.floor(t * 24) % 2) : 0;
          set('armF', -4 * k - kick * 3, -kick * 2, 0); set('body', -3 * k - kick, 0, 0); set('head', -2 * k); set('armB', 6 * k);
        } else { // bow: draw back, release
          if (p < 0.55) { const k = ez(p / 0.55); set('armB', -4 * k, -5 * k, 0); set('armF', -3 * k); set('body', -3 * k); set('head', -2 * k); }
          else { const k = ez((p - 0.55) / 0.45); set('armB', -4 * (1 - k), 1 - 6 * (1 - k), 0); set('armF', 6 * (1 - k) - 3 * (1 - k)); set('body', -3 * (1 - k)); }
        }
        break;
      case 'cast': case 'ult': {
        const k = Math.sin(Math.PI * Math.min(1, p));
        set('armF', -45 * k); set('armB', -55 * k); set('head', -6 * k); set('body', -5 * k);
        set('legF', -8 * k); set('legB', 8 * k); set('tail', 15 * k);
        break;
      }
      case 'hit': {
        const k = p < 0.15 ? p / 0.15 : 1 - ez((p - 0.15) / 0.85);
        set('body', -16 * k, -2 * k, 0); set('head', -20 * k); set('armF', -26 * k); set('armB', 24 * k); set('legF', -10 * k); set('legB', 6 * k); set('tail', -20 * k);
        break;
      }
      case 'die': {
        const k = ez(Math.min(1, p * 1.6));
        set('head', -20 * k); set('armF', 50 * k); set('armB', 40 * k); set('legF', -15 * k);
        break;
      }
      case 'win': {
        const k = Math.abs(Math.sin(t * 5));
        set('armF', -70); set('armB', -80 + Math.sin(t * 10) * 10); set('head', -8); set('legF', -10 * k); set('legB', 10 * k);
        break;
      }
    }
    return R;
  }

  // Composes the posed sprite at its own pixel size (rotations sample nearest pixels, so it stays pixel art).
  function composeRig(rig, h, anim, p, t) {
    const x = rig.comp.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, rig.comp.width, rig.comp.height);
    x.imageSmoothingEnabled = false;
    const R = rigPose(h, anim, p, Math.floor(t * 12) / 12); // 12 fps, like hand-made sprite animation
    const mats = {};
    const matOf = part => {
      if (mats[part.n]) return mats[part.n];
      const parent = part.par ? matOf(rig.byName[part.par]) : new DOMMatrix().translate(PAD, PAD);
      const [a, dx, dy] = R[part.role] || [0, 0, 0];
      const m = parent.translate(part.pv[0] + dx, part.pv[1] + dy).rotate(a).translate(-part.pv[0], -part.pv[1]);
      return (mats[part.n] = m);
    };
    // a weapon arm raised far back (sword wound up overhead) passes behind the body and head
    const order = R.armF[0] < -60 ? [...rig.order].sort((a, b) => (a.role === 'armF' ? 1.5 : a.z) - (b.role === 'armF' ? 1.5 : b.z)) : rig.order;
    for (const part of order) {
      const m = matOf(part);
      // snap translation to whole pixels so parts never sit between pixels
      x.setTransform(m.a, m.b, m.c, m.d, Math.round(m.e), Math.round(m.f));
      x.drawImage(part.canvas, 0, 0);
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    const pt = (part, q) => { const r = matOf(part).transformPoint(new DOMPoint(q[0], q[1])); return [Math.round(r.x), Math.round(r.y)]; };
    const out = { comp: rig.comp };
    const weapon = rig.parts.find(q => q.tip);
    if (weapon) { out.tip = pt(weapon, weapon.tip); if (weapon.base) out.base = pt(weapon, weapon.base); }
    const clip = clipOf(h, anim), px = (cx, cy, c) => { x.fillStyle = c; x.fillRect(cx, cy, 1, 1); };
    // gatling muzzle flash, every other frame while firing
    if (clip && clip.fire && out.tip && p > clip.fire[0] && p < clip.fire[1] && Math.floor(t * 24) % 2) {
      const [mx, my] = out.tip;
      x.fillStyle = '#ffd040'; x.fillRect(mx + 1, my - 2, 4, 5); x.fillRect(mx + 5, my - 1, 3, 3);
      x.fillStyle = '#fff8d0'; x.fillRect(mx + 1, my - 1, 3, 3); x.fillRect(mx + 4, my, 4, 1);
      px(mx + 2, my - 4, '#ff9020'); px(mx + 3, my + 4, '#ff9020'); px(mx + 9, my, '#ffd040');
    }
    // nocked arrow from the drawing hand to past the bow while the bow is drawn
    if (clip && clip.release && p < clip.release && p > 0.05 && out.tip) {
      const hand = rig.parts.find(q => q.hand), [hx, hy] = pt(hand, hand.hand), [gx, gy] = out.tip;
      const n = Math.max(Math.abs(gx + 6 - hx), Math.abs(gy - hy));
      for (let i = 0; i <= n; i++) px(Math.round(hx + (gx + 6 - hx) * i / n), Math.round(hy + (gy - hy) * i / n), '#c8b080');
      px(gx + 7, gy, '#e8f0f0'); px(gx + 8, gy, '#e8f0f0'); px(gx + 7, gy - 1, '#a8b8b8'); px(gx + 7, gy + 1, '#a8b8b8');
      px(hx - 1, hy - 1, '#e8e8e8'); px(hx - 1, hy + 1, '#e8e8e8');
    }
    return out;
  }

  function drawSprite(ctx, h, o, P, alpha) {
    const im = sprites[h.id], ps = spriteScale(o.s || 1), k = ps * REF / 125; // k: screen px per rig unit
    const W = im.naturalWidth * ps, H = im.naturalHeight * ps, face = o.face || 1, t = o.t || 0, anim = o.anim || 'idle';
    const snap = v => Math.round(v / ps) * ps; // keep motion on the sprite's pixel grid
    ctx.save();
    ctx.translate(Math.round(o.x), Math.round(o.y));
    if (!o.noShadow) {
      ctx.globalAlpha = 0.55 * alpha; ctx.fillStyle = '#1a1024';
      ctx.beginPath(); ctx.ellipse(snap(P.dx * k * face), 0, Math.max(W * 0.32, 16 * k), 6 * k, 0, 0, PI * 2); ctx.fill();
    }
    const aura = Math.max(P.glow, o.aura || 0);
    if (aura > 0.02) {
      const f = FACTIONS[h.fac], cy = -H * 0.45;
      for (let r = 4; r >= 1; r--) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = hexA(f.glow, 0.08 * aura * (5 - r));
        const w = H * 0.22 * r, hh = w * 1.3, c = w * 0.22;
        ctx.fillRect(snap(-w / 2), snap(cy - hh / 2 + c), snap(w), snap(hh - c * 2));
        ctx.fillRect(snap(-w / 2 + c), snap(cy - hh / 2), snap(w - c * 2), snap(hh));
      }
    }
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(face, 1);
    let dy = P.dy + P.bob * 0.6;
    if (anim === 'idle' && !RIGS[h.id]) dy -= Math.sin(t * 2.6) > 0.2 ? 1.2 : 0; // one-pixel breathing bob
    ctx.translate(snap(P.dx * k * 1.4), snap(dy * k));
    const rot = P.rot + (RIGS[h.id] ? 0 : P.lean * 0.45);
    if (rot) ctx.rotate(rot);
    const x0 = -Math.round((h.fx || 0.5) * im.naturalWidth) * ps;
    const rig = rigFor(h);
    let result = null;
    if (rig) {
      const posed = composeRig(rig, h, anim, Math.min(1, o.p || 0), t), comp = posed.comp, cw = comp.width * ps, ch = comp.height * ps;
      // where the weapon is on screen, for trails (no rotation here except while falling)
      const tx = snap(P.dx * k * 1.4), ty = snap(dy * k);
      const toWorld = q => q && [Math.round(o.x) + face * (tx + x0 - PAD * ps + (q[0] + 0.5) * ps), Math.round(o.y) + ty - H - PAD * ps + (q[1] + 0.5) * ps];
      result = { tip: toWorld(posed.tip), base: toWorld(posed.base) };
      ctx.drawImage(comp, x0 - PAD * ps, -H - PAD * ps, cw, ch);
      if ((o.flash || 0) > 0.02) {
        const wx = rig.white.getContext('2d');
        wx.globalCompositeOperation = 'copy'; wx.drawImage(comp, 0, 0);
        wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#fff'; wx.fillRect(0, 0, comp.width, comp.height);
        wx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * Math.min(1, o.flash); ctx.drawImage(rig.white, x0 - PAD * ps, -H - PAD * ps, cw, ch);
      }
    } else {
      ctx.drawImage(im, x0, -H, W, H);
      if ((o.flash || 0) > 0.02) { ctx.globalAlpha = alpha * Math.min(1, o.flash); ctx.drawImage(spriteWhite[h.id], x0, -H, W, H); }
    }
    ctx.restore();
    return result;
  }

  // o: {x, y, s, face, anim, p, t, flash, alpha, aura, noShadow}
  function drawHero(ctx, h, o) {
    const anim = o.anim || 'idle', t = o.t || 0, P = pose(anim, o.p || 0, t, h.look.wpn);
    const alpha = (o.alpha == null ? 1 : o.alpha) * P.alpha;
    if (alpha <= 0.01) return;
    if (sprites[h.id]) return drawSprite(ctx, h, o, P, alpha);
    const i = frameIndex(anim, o.p || 0, t), fr = frame(h, anim, i), ps = pixelSize(o.s || 1);
    const face = o.face || 1, sz = h.look.size || 1;
    ctx.save();
    ctx.translate(Math.round(o.x), Math.round(o.y));
    const aura = Math.max(P.glow, o.aura || 0);
    if (aura > 0.02) { // stepped glow rings behind the sprite
      const cy = -50 * PX * ps * sz, f = FACTIONS[h.fac], gk = PX * ps * sz / 0.36;
      for (let r = 4; r >= 1; r--) {
        ctx.fillStyle = hexA(f.glow, 0.08 * aura * (5 - r));
        const w = r * 9 * gk, hgt = w * 1.3, c = w * 0.22; // octagon from two overlapping bars
        ctx.fillRect(Math.round(-w / 2), Math.round(cy - hgt / 2 + c), Math.round(w), Math.round(hgt - c * 2));
        ctx.fillRect(Math.round(-w / 2 + c), Math.round(cy - hgt / 2), Math.round(w - c * 2), Math.round(hgt));
      }
    }
    if (!o.noShadow) { // solid oval shadow
      ctx.globalAlpha = 0.55 * alpha; ctx.fillStyle = '#1a1024';
      const k = PX * ps * sz * (h.look.build || 1);
      ctx.beginPath(); ctx.ellipse(0, 0, 24 * k, 6 * k, 0, 0, PI * 2); ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(face, 1);
    ctx.drawImage(fr, -OX * ps, -OY * ps, FW * ps, FH * ps);
    if ((o.flash || 0) > 0.02) { ctx.globalAlpha = alpha * Math.min(1, o.flash); ctx.drawImage(white(h, anim, i), -OX * ps, -OY * ps, FW * ps, FH * ps); }
    ctx.restore();
  }

  // Low-resolution canvas for chunky pixel backgrounds: draw at (w/k, h/k), then blow up without smoothing.
  function pixCanvas(w, h, k, paint) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w / k); c.height = Math.ceil(h / k);
    const x = c.getContext('2d');
    paint(x, c.width, c.height);
    return c;
  }
  function blit(dst, src, w, h) { dst.imageSmoothingEnabled = false; dst.drawImage(src, 0, 0, w, h); }

  // Head-and-shoulders portrait, cached as a data URL per hero and size.
  const portraits = new Map();
  function portrait(h, size = 96) {
    const key = h.id + size;
    if (portraits.has(key)) return portraits.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d'), f = FACTIONS[h.fac];
    blit(x, pixCanvas(size, size, size / 32, (b, w, hh) => {
      for (let y = 0; y < hh; y++) for (let xx = 0; xx < w; xx++) {
        const d = Math.hypot(xx - w / 2, y - hh * 0.4) / (w * 0.7);
        b.fillStyle = d < 0.35 ? f.glow : d < 0.6 || (d < 0.75 && (xx + y) % 2) ? f.col : '#1a1226';
        b.fillRect(xx, y, 1, 1);
      }
    }), size, size);
    x.imageSmoothingEnabled = false;
    const im = sprites[h.id];
    if (im) { // head and shoulders of the sprite
      const ps = Math.max(1, Math.round(size / 34));
      x.drawImage(im, Math.round(size / 2 - h.hx * im.naturalWidth * ps), Math.round(size * 0.42 - h.hy * im.naturalHeight * ps),
        im.naturalWidth * ps, im.naturalHeight * ps);
    } else {
      const ps = Math.max(1, Math.round(size / 48)), sz = h.look.size || 1, fr = frame(h, 'idle', 0);
      const hx = OX + 4 * PX * sz, hy = OY - 92 * PX * sz; // head centre inside the frame
      x.drawImage(fr, Math.round(size / 2 - hx * ps), Math.round(size * 0.4 - hy * ps), FW * ps, FH * ps);
    }
    const url = c.toDataURL();
    portraits.set(key, url);
    return url;
  }

  // Tall roster-card splash: the hero in an action pose over pixel rays, cached per hero.
  const cards = new Map();
  function cardArt(h, w = 184, hgt = 300) {
    const key = h.id + w + 'x' + hgt;
    if (cards.has(key)) return cards.get(key);
    const c = document.createElement('canvas');
    c.width = w; c.height = hgt;
    const x = c.getContext('2d'), f = FACTIONS[h.fac];
    blit(x, pixCanvas(w, hgt, 4, (b, W, H) => {
      const g = b.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3a2638'); g.addColorStop(1, '#120a14');
      b.fillStyle = g; b.fillRect(0, 0, W, H);
      b.save(); b.translate(W / 2, H * 0.36);
      for (let i = 0; i < 12; i++) {
        b.rotate(PI / 6);
        b.fillStyle = hexA(i % 2 ? f.glow : '#ffd27a', 0.12);
        b.beginPath(); b.moveTo(0, 0); b.lineTo(-H * 0.1, -H); b.lineTo(H * 0.1, -H); b.fill();
      }
      b.restore();
      for (let r = 5; r >= 1; r--) { b.fillStyle = hexA(f.glow, 0.09); b.beginPath(); b.arc(W / 2, H * 0.42, r * W * 0.11, 0, PI * 2); b.fill(); }
      for (let i = 0; i < 26; i++) { b.fillStyle = hexA('#fff6c0', 0.5); b.fillRect((i * 37) % W, (i * 53) % (H * 0.7), 1, 1); }
      b.fillStyle = hexA(f.col, 0.35); b.fillRect(0, H * 0.86, W, H * 0.14);
    }), w, hgt);
    x.imageSmoothingEnabled = false;
    const im = sprites[h.id];
    if (im) {
      // fill the card height; wide weapons may run off the sides like splash art
      const ps = Math.max(1, Math.round(hgt * 0.7 / im.naturalHeight));
      const dw = im.naturalWidth * ps, dh = im.naturalHeight * ps, cx = w * 0.5 - (h.fx || 0.5) * dw;
      x.fillStyle = 'rgba(20,10,30,.55)';
      x.beginPath(); x.ellipse(w / 2, hgt * 0.9, Math.min(dw * 0.36, w * 0.4), 5 * ps, 0, 0, PI * 2); x.fill();
      x.drawImage(im, Math.round(cx), Math.round(hgt * 0.9 - dh), dw, dh);
    } else {
      const wpn = h.look.wpn, sz = h.look.size || 1;
      const anim = MELEE.has(wpn) ? 'melee' : wpn === 'bow' ? 'shoot' : 'cast';
      const ps = Math.max(1, Math.floor(hgt * 0.78 / (125 * PX * sz)));
      x.drawImage(frame(h, anim, anim === 'melee' ? 2 : 3), Math.round(w * 0.47 - OX * ps), Math.round(hgt * 0.9 - OY * ps), FW * ps, FH * ps);
    }
    const url = c.toDataURL();
    cards.set(key, url);
    return url;
  }

  // Waits for the pixel fonts so canvas text uses them from the first frame.
  function ready() {
    if (!document.fonts || !document.fonts.load) return loadSprites();
    return Promise.race([
      Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('16px "Pixelify Sans"')]),
      new Promise(r => setTimeout(r, 2500)),
    ]).catch(() => {}).then(loadSprites);
  }

  return { drawHero, portrait, cardArt, hexA, rgb, ready, pixelSize, pixCanvas, blit, spriteRef, spriteScale, halfWidth, clipOf };
})();
