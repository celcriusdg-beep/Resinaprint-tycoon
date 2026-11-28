import { useState } from 'react';
import { CARD_BY_ID, cardSources, type Card } from '../data/cards';

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
 * Official card picture. TCGplayer's photo (small, fast) shows first where the card has one;
 * Riot's full-size official art fades in on top as soon as it has loaded. While nothing has
 * loaded yet a shimmering placeholder with the card's name shows.
 */
export function CardImage({ id, foil, thumb, className, dim }: { id: string; foil?: boolean; thumb?: boolean; className?: string; dim?: boolean }) {
  const c = CARD_BY_ID[id];
  const { base, top } = cardSources(c, !!thumb);
  const [baseState, setBase] = useState<'loading' | 'ok' | 'fail'>(base ? 'loading' : 'fail');
  const [topState, setTop] = useState<'loading' | 'ok' | 'fail'>(top ? 'loading' : 'fail');
  const anyOk = baseState === 'ok' || topState === 'ok';
  const allFailed = baseState === 'fail' && topState === 'fail';
  const landscape = c.w > c.h;
  const shine = (foil || c.kind !== 'std') && !dim;
  return (
    <div className={`card-img${className ? ' ' + className : ''}${dim ? ' dim' : ''}${landscape ? ' landscape' : ''}`} style={{ ['--rc' as string]: cardColor(c) }}>
      {!anyOk && (
        <div className={`card-face${allFailed ? '' : ' loading'}`} style={{ background: `linear-gradient(160deg, ${DOMAIN_COLOR[c.domains[0]] ?? '#555'}, #14101f)` }}>
          <div className="cf-name">{c.name}</div>
          <div className="cf-code">{c.code}</div>
        </div>
      )}
      {base && baseState !== 'fail' && (
        <img className={`base${baseState === 'ok' ? ' in' : ''}`} src={base} alt={c.name} loading={thumb ? 'lazy' : 'eager'} decoding="async" draggable={false}
          onLoad={() => setBase('ok')} onError={() => setBase('fail')} />
      )}
      {top && topState !== 'fail' && (
        <img className={`top${topState === 'ok' ? ' in' : ''}`} src={top} alt={c.name} loading={thumb ? 'lazy' : 'eager'} decoding="async" draggable={false}
          onLoad={() => setTop('ok')} onError={() => setTop('fail')} />
      )}
      {shine && <div className="foil" />}
    </div>
  );
}
