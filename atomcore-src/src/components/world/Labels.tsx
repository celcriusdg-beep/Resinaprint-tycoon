import type { CSSProperties } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';
import { useSettings } from '../../stores/settingsStore';
import { useUI } from '../../stores/uiStore';
import { BUILDINGS } from '../../game/buildings/defs';
import { CELL } from '../../game/constants';
import type { BuildingCategory } from '../../game/types';
import { Icon, type IconName } from '../ui/Icons';
import { labelAnchors } from './sceneRegistry';
import { buildingMeter, meterContext } from '../../game/meters';

// Floating building tags. A DOM layer over the canvas holds one tag per
// building; a projector inside the canvas moves them every frame. A tag shows
// icon + short name when its building is big enough on screen and the name
// does not collide with another, otherwise just the coloured category icon.

export const CATEGORY_TAG: Record<BuildingCategory, { icon: IconName; color: string }> = {
  reactor: { icon: 'atom', color: '#ff8a5c' },
  power: { icon: 'bolt', color: '#ffd34d' },
  cooling: { icon: 'snow', color: '#5cd6ff' },
  water: { icon: 'drop', color: '#5b8cff' },
  fuel: { icon: 'fuel', color: '#9be564' },
  grid: { icon: 'grid', color: '#c792ff' },
  industry: { icon: 'factory', color: '#ff6fa8' },
  support: { icon: 'wrench', color: '#cfd8e3' },
};

const tags = new Map<number, HTMLDivElement>();
const ORDER: BuildingCategory[] = ['reactor', 'power', 'cooling', 'grid', 'water', 'fuel', 'industry', 'support'];

export function LabelLayer() {
  useGameStore((s) => s.structure);
  const on = useSettings((s) => s.showLabels);
  if (!on) return null;
  const g = useGameStore.getState().game;
  const site = g.sites[g.activeSite];
  return (
    <div className="btags" aria-hidden>
      {site.buildings.map((b) => {
        const def = BUILDINGS[b.type];
        const c = CATEGORY_TAG[def.category];
        return (
          <div
            key={`${site.id}-${b.id}`}
            className="btag"
            style={{ '--tag': c.color } as CSSProperties}
            ref={(el) => { if (el) tags.set(b.id, el); else tags.delete(b.id); }}
          >
            <Icon name={c.icon} size={13} />
            <span>{def.short}<em /></span>
            <i><b /></i>
          </div>
        );
      })}
    </div>
  );
}

const v = new THREE.Vector3();

interface Slot { el: HTMLDivElement; x: number; y: number; px: number; w: number; pri: number }

export function LabelProjector() {
  const { camera, size } = useThree();
  const on = useSettings((s) => s.showLabels);
  useFrame((state) => {
    if (!on) return;
    const g = useGameStore.getState().game;
    const site = g.sites[g.activeSite];
    // Gauges change slowly: refresh them a few times a second.
    const t = state.clock.elapsedTime;
    if (t - meterAt >= 0.4) {
      meterAt = t;
      const ctx = meterContext(g);
      for (const b of site.buildings) {
        const el = tags.get(b.id);
        if (el) paintMeter(el, buildingMeter(g, site, b, ctx));
      }
    }
    const ui = useUI.getState();
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const slots: Slot[] = [];
    for (const b of site.buildings) {
      const el = tags.get(b.id);
      const a = labelAnchors.get(b.id);
      if (!el || !a) continue;
      if (b.id === ui.selectedId) { hide(el); continue; }
      v.copy(a).project(camera);
      if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) { hide(el); continue; }
      const dist = camera.position.distanceTo(a);
      const pxPerM = size.height / (2 * Math.tan(fov / 2) * dist);
      const def = BUILDINGS[b.type];
      const px = Math.max(def.size[0], def.size[1]) * CELL * pxPerM;
      slots.push({
        el, px,
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (-v.y * 0.5 + 0.5) * size.height,
        w: 62 + def.short.length * 6.6,
        pri: ORDER.indexOf(def.category) * 1000 - px,
      });
    }
    // Most important / largest first. Each tag tries its name, then just its
    // icon, and is hidden if even the icon would overlap one already placed.
    slots.sort((p, q) => p.pri - q.pri);
    const placed: [number, number, number, number][] = [];
    const free = (r: [number, number, number, number]) => !placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]);
    for (const s of slots) {
      const name: [number, number, number, number] = [s.x - s.w / 2, s.y - 26, s.x + s.w / 2, s.y + 8];
      const icon: [number, number, number, number] = [s.x - 11, s.y - 26, s.x + 11, s.y + 8];
      let mode = 'none';
      if (s.px >= 46 && free(name)) { mode = 'full'; placed.push(name); }
      else if (free(icon)) { mode = 'icon'; placed.push(icon); }
      if (mode === 'none') { hide(s.el); continue; }
      const key = `${Math.round(s.x)},${Math.round(s.y)},${mode}`;
      if (last.get(s.el) === key) continue;
      last.set(s.el, key);
      s.el.style.display = '';
      s.el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, calc(-100% - 6px))`;
      s.el.classList.toggle('full', mode === 'full');
    }
  });
  return null;
}

let meterAt = -1;

function paintMeter(el: HTMLDivElement, mt: ReturnType<typeof buildingMeter>) {
  const key = mt ? `${mt.tone}|${mt.text}|${Math.round(mt.value * 50)}` : '-';
  if (el.dataset.m === key) return;
  el.dataset.m = key;
  const bar = el.querySelector('i') as HTMLElement;
  const fill = bar.firstChild as HTMLElement;
  const pctEl = el.querySelector('em') as HTMLElement;
  if (!mt) {
    bar.style.display = 'none';
    pctEl.textContent = '';
    el.removeAttribute('data-tone');
    return;
  }
  bar.style.display = '';
  fill.style.width = `${Math.round(mt.value * 100)}%`;
  pctEl.textContent = mt.text;
  el.dataset.tone = mt.tone;
}

// Last written state per tag element, so unchanged tags cost nothing.
const last = new WeakMap<HTMLDivElement, string>();

function hide(el: HTMLDivElement) {
  if (last.get(el) === 'hidden') return;
  last.set(el, 'hidden');
  el.style.display = 'none';
}
