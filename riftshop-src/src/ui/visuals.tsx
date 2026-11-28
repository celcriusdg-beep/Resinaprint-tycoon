import { useState } from 'react';
import { CARD_BY_ID, SETS, productImage, type SetId } from '../data/cards';
import type { SealedKind, Single, Slab as SlabT } from '../game/types';
import { PSA_LABEL, bgsLabel } from '../game/grading';
import { CardImage } from './CardImage';

/** Official product photo (TCGplayer). Packs are cropped to the pack; a drawn wrapper shows only until it loads. */
export function ProductImage({ set, kind, big, qty }: { set: SetId; kind: SealedKind; big?: boolean; qty?: number }) {
  // Try the large photo, then the small one; the drawn wrapper stays until one has actually loaded.
  const [stage, setStage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`product ${kind}${big ? ' big' : ''}${loaded ? ' loaded' : ''}`}>
      {!loaded && (
        <div className="pack-art" data-set={set} data-kind={kind}>
          <span>{SETS[set].name}</span>
          <small>{kind === 'pack' ? 'Booster' : kind === 'box' ? 'Booster Display' : 'Display Case'}</small>
        </div>
      )}
      {stage < 2 && (
        <img key={stage} className={loaded ? 'in' : ''} src={productImage(set, kind, stage === 1)} alt={`${SETS[set].name} ${kind}`} draggable={false}
          onLoad={() => setLoaded(true)} onError={() => setStage((s) => s + 1)} />
      )}
      {qty !== undefined && qty > 1 && <span className="qty">×{qty}</span>}
    </div>
  );
}

function grade(n: number): string {
  return n % 1 ? n.toFixed(1) : String(n);
}

/** A graded card in its PSA or Beckett slab. */
export function Slab({ s, small }: { s: Single & { slab: SlabT }; small?: boolean }) {
  const c = CARD_BY_ID[s.cardId];
  const slab = s.slab;
  const year = '2026';
  const variant = c.kind === 'sig' ? 'SIGNATURE' : c.kind === 'over' ? 'OVERNUMBERED' : c.kind === 'alt' ? 'ALT ART' : s.foil ? 'FOIL' : c.rarity.toUpperCase();
  if (slab.company === 'PSA') {
    return (
      <div className={`slab psa${small ? ' small' : ''}`}>
        <div className="psa-label">
          <div className="psa-left">
            <span>{year} RIFTBOUND {SETS[c.set].name.toUpperCase()}</span>
            <b>{c.name.toUpperCase()}</b>
            <span>{variant}</span>
          </div>
          <div className="psa-right">
            <span>#{c.code.split('/')[0].split('-')[1]}</span>
            <b className="psa-word">{PSA_LABEL[slab.grade]}</b>
            <b className="psa-num">{slab.grade}</b>
          </div>
          <div className="psa-foot">
            <i className="barcode" />
            <span>{slab.cert}</span>
            <b className="psa-logo">PSA</b>
          </div>
        </div>
        <div className="slab-window"><CardImage id={s.cardId} foil={s.foil} thumb={small} /></div>
      </div>
    );
  }
  const tone = slab.black ? 'black' : slab.grade >= 9.5 ? 'gold' : 'silver';
  return (
    <div className={`slab bgs ${tone}${small ? ' small' : ''}`}>
      <div className="bgs-label">
        <div className="bgs-top">
          <div className="bgs-left">
            <span>{year} Riftbound {SETS[c.set].name}</span>
            <b>{c.name}</b>
            <span>{variant} · {c.code.split('/')[0]}</span>
          </div>
          <div className="bgs-grade">
            <b>{grade(slab.grade)}</b>
            <span>{bgsLabel(slab)}</span>
          </div>
        </div>
        {slab.sub && (
          <div className="bgs-subs">
            <span>{small ? 'CEN' : 'CENTERING'} <b>{grade(slab.sub.centering)}</b></span>
            <span>{small ? 'COR' : 'CORNERS'} <b>{grade(slab.sub.corners)}</b></span>
            <span>{small ? 'EDG' : 'EDGES'} <b>{grade(slab.sub.edges)}</b></span>
            <span>{small ? 'SUR' : 'SURFACE'} <b>{grade(slab.sub.surface)}</b></span>
          </div>
        )}
        <div className="bgs-foot"><b>BECKETT</b><span>{slab.cert}</span><i className="barcode" /></div>
      </div>
      <div className="slab-window"><CardImage id={s.cardId} foil={s.foil} thumb={small} /></div>
    </div>
  );
}
