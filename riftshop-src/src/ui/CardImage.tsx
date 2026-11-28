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
 * Official card picture: Riot's art (resized by Sanity's CDN, falling back to Riot's own server).
 * TCGplayer's small photo sits underneath as a quick placeholder while it loads. A shimmer with the
 * card's name shows until anything has loaded.
 */
export function CardImage({ id, foil, thumb, className, dim }: { id: string; foil?: boolean; thumb?: boolean; className?: string; dim?: boolean }) {
  const c = CARD_BY_ID[id];
  const { base, chain } = cardSources(c, !!thumb);
  const [baseState, setBase] = useState<'loading' | 'ok' | 'fail'>(base ? 'loading' : 'fail');
  const [step, setStep] = useState(0);
  const [topOk, setTopOk] = useState(false);
  const top = chain[step];
  const anyOk = baseState === 'ok' || topOk;
  const allFailed = baseState === 'fail' && !top;
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
      {base && baseState !== 'fail' && !topOk && (
        <img className={`ci-base${baseState === 'ok' ? ' in' : ''}`} src={base} alt="" loading={thumb ? 'lazy' : 'eager'} decoding="async" draggable={false}
          onLoad={() => setBase('ok')} onError={() => setBase('fail')} />
      )}
      {top && (
        <img key={top} className={`ci-top${topOk ? ' in' : ''}`} src={top} alt={c.name} loading={thumb ? 'lazy' : 'eager'} decoding="async" draggable={false}
          onLoad={() => setTopOk(true)} onError={() => { setTopOk(false); setStep((s) => s + 1); }} />
      )}
      {shine && <div className="foil" />}
    </div>
  );
}
