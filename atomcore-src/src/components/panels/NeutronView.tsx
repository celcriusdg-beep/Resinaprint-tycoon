import { useEffect, useRef } from 'react';
import { getGame } from '../../stores/gameStore';

// Educational 2D visualisation of a chain reaction inside a fuel lattice:
// neutrons (dots) fly between fuel pins, some cause fissions (flashes) that
// release more neutrons, and control rods (dark bars) absorb them. The number
// of neutrons tracks the simulated reactor power. Purely illustrative.

interface Neutron { x: number; y: number; vx: number; vy: number; life: number; fast: boolean }
interface Flash { x: number; y: number; t: number }

export function NeutronView({ buildingId }: { buildingId: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    const neutrons: Neutron[] = [];
    const flashes: Flash[] = [];
    let last = performance.now();
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = cv.clientWidth, H = cv.clientHeight;
      const g = getGame();
      const b = g.sites[g.activeSite].buildings.find((x) => x.id === buildingId);
      const r = b?.reactor;
      const power = r?.power ?? 0;
      const insert = r ? 1 - r.rods : 1;
      // Background: water moderator with a Cherenkov tint proportional to power
      const grd = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
      grd.addColorStop(0, `rgba(${30 + power * 30}, ${90 + power * 80}, ${150 + power * 90}, 1)`);
      grd.addColorStop(1, '#07121c');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Fuel pin lattice
      const cols = 9, rows = 4;
      const sx = W / (cols + 1), sy = H / (rows + 1);
      const pins: [number, number][] = [];
      for (let i = 1; i <= cols; i++)
        for (let j = 1; j <= rows; j++) {
          if (i % 3 === 2) continue; // control rod channels
          pins.push([i * sx, j * sy]);
          ctx.beginPath();
          ctx.arc(i * sx, j * sy, Math.min(sx, sy) * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = '#c98a3a';
          ctx.fill();
          ctx.strokeStyle = '#7a5022';
          ctx.stroke();
        }
      // Control rods slide in from the top
      const rodLen = insert * H;
      ctx.fillStyle = '#1c242e';
      for (let i = 2; i <= cols; i += 3) {
        ctx.fillRect(i * sx - 5, 0, 10, rodLen);
        ctx.fillStyle = '#56616e';
        ctx.fillRect(i * sx - 5, rodLen - 3, 10, 3);
        ctx.fillStyle = '#1c242e';
      }
      // Keep neutron population proportional to power
      const target = Math.round(4 + power * 90);
      while (neutrons.length < target) spawn(W * Math.random(), H * Math.random(), true);
      if (neutrons.length > target * 1.3) neutrons.splice(0, neutrons.length - target);
      function spawn(x: number, y: number, fast: boolean) {
        const a = Math.random() * Math.PI * 2;
        const sp = fast ? 160 : 70;
        neutrons.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.5 + Math.random(), fast });
      }
      for (let k = neutrons.length - 1; k >= 0; k--) {
        const n = neutrons[k];
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        n.life -= dt;
        // Moderation: fast neutrons slow down over time
        if (n.fast && Math.random() < dt * 1.5) {
          n.fast = false;
          n.vx *= 0.45;
          n.vy *= 0.45;
        }
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        // Absorbed by control rods
        let dead = n.life <= 0;
        for (let i = 2; i <= cols && !dead; i += 3) if (Math.abs(n.x - i * sx) < 6 && n.y < rodLen) dead = true;
        // Thermal neutron hits a fuel pin → fission
        if (!dead && !n.fast) {
          for (const [px, py] of pins) {
            if ((n.x - px) ** 2 + (n.y - py) ** 2 < 36 && Math.random() < 0.35) {
              flashes.push({ x: px, y: py, t: 0 });
              dead = true;
              if (neutrons.length < target * 1.3) {
                spawn(px, py, true);
                if (Math.random() < 0.5) spawn(px, py, true);
              }
              break;
            }
          }
        }
        if (dead) {
          neutrons.splice(k, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.fast ? 1.8 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle = n.fast ? '#ffffff' : '#7fe8ff';
        ctx.fill();
      }
      for (let k = flashes.length - 1; k >= 0; k--) {
        const f = flashes[k];
        f.t += dt;
        if (f.t > 0.35) {
          flashes.splice(k, 1);
          continue;
        }
        const a = 1 - f.t / 0.35;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4 + f.t * 40, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 140, ${a * 0.55})`;
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(r?.scrammed ? 'SCRAM — rods fully inserted' : `Neutron population ∝ power (${Math.round(power * 100)}%)`, 8, H - 8);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [buildingId]);
  return <canvas ref={ref} className="neutron-view" aria-label="Neutron chain reaction visualisation" />;
}
