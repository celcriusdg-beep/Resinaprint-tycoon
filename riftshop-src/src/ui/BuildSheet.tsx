import { useState } from 'react';
import { fmt } from '../game/economy';
import { isUnlocked, unlockLevel } from '../game/progression';
import {
  CUSTOMERS, FURN, FURNITURE, RACK_COST, RACK_SPACE, buyFurniture, buyRack, customerMix, displaySlots, floorSize, floorUsed,
  maxRacks, resaleValue, sellFurniture, upgradeFurniture, shelfSlots, storageCap, storageUsed, upgradeCost, vibe, vibeTraffic,
  type CustomerType, type Furniture, type FurnitureDef,
} from '../game/shop';
import { tryAct, useStore } from '../store';
import { Button, Modal } from './common';

/** What a piece does at a given tier, in a few words. */
export function effectText(d: FurnitureDef, tier: number): string {
  const parts: string[] = [];
  if (d.shelf) parts.push(`${d.shelf[tier - 1]} shelf spots`);
  if (d.display) parts.push(`${d.display[tier - 1]} case spots`);
  if (d.vibe) parts.push(`+${d.vibe[tier - 1]} atmosphere`);
  return parts.join(' · ');
}

const stars = (tier: number, max: number) => '★'.repeat(tier) + '☆'.repeat(max - tier);

/** Build mode: the shop floor as tiles, the furniture catalog, the back room and who walks in. */
export function BuildSheet({ onClose }: { onClose: () => void }) {
  const g = useStore((s) => s.g);
  useStore((s) => s.rev);
  const [sel, setSel] = useState<number | 'new' | null>(null);
  const size = floorSize(g);
  const used = floorUsed(g);
  const free = size - used;
  const v = vibe(g);
  const mix = customerMix(g);
  const picked = typeof sel === 'number' ? g.furniture.find((f) => f.uid === sel) : null;

  return (
    <Modal title="🛠 Build your shop" onClose={onClose}>
      <div className="build-stats">
        <div><span>Floor</span><b>{used}/{size}</b></div>
        <div><span>Shelf spots</span><b>{shelfSlots(g)}</b></div>
        <div><span>Case spots</span><b>{displaySlots(g)}</b></div>
        <div><span>Atmosphere</span><b>{v} <i>+{Math.round((vibeTraffic(g) - 1) * 100)}% visitors</i></b></div>
      </div>

      <div className="floor">
        {g.furniture.map((f) => (
          <button key={f.uid} className={`tile${FURN[f.type].size > 1 ? ' wide' : ''}${sel === f.uid ? ' on' : ''} t-${f.type}`} onClick={() => setSel(sel === f.uid ? null : f.uid)}>
            <span className="tile-icon">{FURN[f.type].icon}</span>
            <span className="tile-name">{FURN[f.type].name}</span>
            {FURN[f.type].tiers > 1 && <span className="tile-stars">{stars(f.tier, FURN[f.type].tiers)}</span>}
          </button>
        ))}
        {Array.from({ length: free }, (_, i) => (
          <button key={`e${i}`} className={`tile empty${sel === 'new' ? ' on' : ''}`} onClick={() => setSel('new')}>＋</button>
        ))}
      </div>
      {!picked && sel !== 'new' && <p className="muted small center">Tap a piece to upgrade or sell it, or an empty tile to add furniture.</p>}

      {picked && <PieceInfo f={picked} onDone={() => setSel(null)} />}
      {sel === 'new' && <Catalog free={free} onDone={() => setSel(null)} />}

      <h3 className="build-h">📦 Back room</h3>
      <div className="backroom">
        <div className="row between"><span>Space used</span><b>{storageUsed(g)} / {storageCap(g)}</b></div>
        <div className="bar big"><div style={{ width: `${Math.min(100, (storageUsed(g) / storageCap(g)) * 100)}%` }} /></div>
        <span className="muted small">A pack takes 1 space, a box 24, a case 144. Stock on the shelves doesn't count.</span>
        <div className="row between">
          <span>Storage racks {g.racks}/{maxRacks(g)} <i className="muted small">+{RACK_SPACE} space each</i></span>
          <Button small disabled={g.racks >= maxRacks(g) || g.cash < RACK_COST} onClick={() => tryAct(buyRack, 'Rack installed.')}>{g.racks >= maxRacks(g) ? 'Full' : fmt(RACK_COST)}</Button>
        </div>
      </div>

      <h3 className="build-h">🚶 Who walks in</h3>
      <div className="mix">
        {(Object.keys(mix) as CustomerType[]).filter((k) => mix[k] > 0).map((k) => (
          <div key={k} className="mix-row">
            <span className="mix-icon">{CUSTOMERS[k].icon}</span>
            <div>
              <div className="row between"><b>{CUSTOMERS[k].name}</b><span>{Math.round(mix[k] * 100)}%</span></div>
              <div className="bar"><div style={{ width: `${mix[k] * 100}%` }} /></div>
              <span className="muted small">{CUSTOMERS[k].text}</span>
            </div>
          </div>
        ))}
        {g.shopLevel < 3 && <p className="muted small">💼 Investors start coming once you have a Game Store.</p>}
      </div>
    </Modal>
  );
}

function PieceInfo({ f, onDone }: { f: Furniture; onDone: () => void }) {
  const g = useStore((s) => s.g);
  const d = FURN[f.type];
  const max = f.tier >= d.tiers;
  return (
    <div className="piece">
      <div className="piece-head">
        <span className="tile-icon big">{d.icon}</span>
        <div><b>{d.name}</b>{d.tiers > 1 && <span className="tile-stars">{stars(f.tier, d.tiers)}</span>}<span className="muted small">{d.text}</span></div>
      </div>
      <div className="piece-fx">
        <span>Now: <b>{effectText(d, f.tier)}</b></span>
        {!max && <span>Upgraded: <b>{effectText(d, f.tier + 1)}</b></span>}
      </div>
      <div className="row">
        {!max && <Button kind="gold" small disabled={g.cash < upgradeCost(f)} onClick={() => tryAct((s) => upgradeFurniture(s, f.uid), 'Upgraded!')}>Upgrade {fmt(upgradeCost(f))}</Button>}
        <Button kind="ghost" small onClick={() => { if (tryAct((s) => sellFurniture(s, f.uid), `Sold for ${fmt(resaleValue(f))}.`)) onDone(); }}>Sell for {fmt(resaleValue(f))}</Button>
      </div>
    </div>
  );
}

function Catalog({ free, onDone }: { free: number; onDone: () => void }) {
  const g = useStore((s) => s.g);
  return (
    <div className="catalog">
      {FURNITURE.map((d) => {
        const locked = d.unlock && !isUnlocked(g, d.unlock);
        const fits = d.size <= free;
        return (
          <div key={d.type} className={`cat-row${locked ? ' locked' : ''}`}>
            <span className="tile-icon">{d.icon}</span>
            <div>
              <b>{d.name}{d.size > 1 ? <i className="muted small"> · {d.size} tiles</i> : null}</b>
              <span className="muted small">{d.text}</span>
              <span className="small fx">{effectText(d, 1)}{d.tiers > 1 ? ` · upgrades ×${d.tiers - 1}` : ''}</span>
            </div>
            {locked ? <span className="locked-note">🔒 Lv {unlockLevel(d.unlock!)}</span>
              : <Button kind="primary" small disabled={!fits || g.cash < d.cost} onClick={() => { if (tryAct((s) => buyFurniture(s, d.type), `${d.name} placed!`)) onDone(); }}>{fits ? fmt(d.cost) : 'No room'}</Button>}
          </div>
        );
      })}
    </div>
  );
}
