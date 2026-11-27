import { useState } from 'react';
import { CARD_BY_ID, type Card } from '../data/cards';

export const RARITY_COLOR: Record<string, string> = {
  Common: '#9aa3ad', Uncommon: '#4fd18b', Rare: '#4fa3ff', Epic: '#b46cff', Showcase: '#ffc94d',
};

export const DOMAIN_COLOR: Record<string, string> = {
  Fury: '#e2463f', Calm: '#3fb67a', Mind: '#3f8de2', Body: '#e88a2e', Chaos: '#9a4fd6', Order: '#e6c33c', Colorless: '#8b8f96',
};

/** Accent colour for a card: showcase gold, otherwise its rarity. */
export function cardColor(c: Card): string {
  return c.kind !== 'std' ? RARITY_COLOR.Showcase : RARITY_COLOR[c.rarity];
}

/**
 * Official card picture from Riot's CDN. Thumbnails ask the CDN for a smaller
 * width first and fall back to the full image, then to a drawn card face (offline).
 */
export function CardImage({ id, foil, thumb, className, dim }: { id: string; foil?: boolean; thumb?: boolean; className?: string; dim?: boolean }) {
  const c = CARD_BY_ID[id];
  const [stage, setStage] = useState(thumb ? 0 : 1);
  const src = stage === 0 ? `${c.img}&w=320&fm=webp` : c.img;
  const landscape = c.w > c.h;
  const shine = foil || c.kind !== 'std';
  return (
    <div className={`card-img${className ? ' ' + className : ''}${dim ? ' dim' : ''}${landscape ? ' landscape' : ''}`} style={{ ['--rc' as string]: cardColor(c) }}>
      {/* Drawn face underneath: shows while the picture loads, or if it can't load (offline). */}
      <div className="card-face" style={{ background: `linear-gradient(160deg, ${DOMAIN_COLOR[c.domains[0]] ?? '#555'}, #14101f)` }}>
        <div className="cf-name">{c.name}</div>
        <div className="cf-type">{c.type}</div>
        <div className="cf-code">{c.code}</div>
      </div>
      {stage < 2 && <img src={src} alt={c.name} loading="lazy" decoding="async" draggable={false} onError={() => setStage((s) => s + 1)} />}
      {shine && !dim && <div className="foil" />}
    </div>
  );
}
