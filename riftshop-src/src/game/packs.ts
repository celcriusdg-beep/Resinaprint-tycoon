import { CARDS, CARDS_PER_PACK, type Card, type SetId } from '../data/cards';
import { pick, random } from './rng';

// Booster contents follow Riot's published structure (14 cards): 7 Common,
// 3 Uncommon, 2 Rare-or-better, 1 Foil and 1 Rune. Published Origins odds:
// about one Epic every four packs, about two Alternate Art cards per box,
// about one Overnumbered card every three boxes, 1 in 10 of those signed.

export interface Pull {
  cardId: string;
  foil: boolean;
  /** Which slot it came from (for the reveal order). */
  slot: 'common' | 'uncommon' | 'rare' | 'foil' | 'rune';
}

export const ODDS = {
  /** Chance that a Rare-or-better slot holds an Epic (2 slots → ~1 Epic per 4 packs). */
  epicPerRareSlot: 0.125,
  /** Foil slot upgrades. */
  altArt: 2 / 24,
  overnumbered: 1 / 72,
  signedShare: 0.1,
  /** Alternate-art rune in the rune slot (sets that have them). */
  altRune: 1 / 24,
  /** Rarity of a plain foil in the foil slot. */
  foilRarity: { Common: 0.55, Uncommon: 0.28, Rare: 0.12, Epic: 0.05 },
};

interface Pools {
  common: Card[];
  uncommon: Card[];
  rare: Card[];
  epic: Card[];
  alt: Card[];
  over: Card[];
  sig: Card[];
  rune: Card[];
  altRune: Card[];
}

const poolCache = new Map<SetId, Pools>();

export function pools(set: SetId): Pools {
  let p = poolCache.get(set);
  if (p) return p;
  const s = CARDS.filter((c) => c.set === set);
  const std = s.filter((c) => c.kind === 'std');
  const notRune = (c: Card) => c.type !== 'Rune';
  p = {
    common: std.filter((c) => c.rarity === 'Common' && notRune(c)),
    uncommon: std.filter((c) => c.rarity === 'Uncommon' && notRune(c)),
    rare: std.filter((c) => c.rarity === 'Rare' && notRune(c)),
    epic: std.filter((c) => c.rarity === 'Epic' && notRune(c)),
    alt: s.filter((c) => c.kind === 'alt' && notRune(c)),
    over: s.filter((c) => c.kind === 'over'),
    sig: s.filter((c) => c.kind === 'sig'),
    rune: std.filter((c) => c.type === 'Rune'),
    altRune: s.filter((c) => c.kind === 'alt' && c.type === 'Rune'),
  };
  // Fall back sensibly if a set lacks a pool.
  if (!p.rune.length) p.rune = p.common;
  if (!p.epic.length) p.epic = p.rare;
  poolCache.set(set, p);
  return p;
}

function from(list: Card[], fallback: Card[]): Card {
  return pick(list.length ? list : fallback);
}

export function openPack(set: SetId): Pull[] {
  const p = pools(set);
  const out: Pull[] = [];
  for (let i = 0; i < 7; i++) out.push({ cardId: pick(p.common).id, foil: false, slot: 'common' });
  for (let i = 0; i < 3; i++) out.push({ cardId: pick(p.uncommon).id, foil: false, slot: 'uncommon' });
  for (let i = 0; i < 2; i++) {
    const epic = random() < ODDS.epicPerRareSlot;
    out.push({ cardId: (epic ? from(p.epic, p.rare) : pick(p.rare)).id, foil: false, slot: 'rare' });
  }
  // Foil slot
  const r = random();
  if (r < ODDS.overnumbered && p.over.length) {
    const signed = random() < ODDS.signedShare && p.sig.length;
    out.push({ cardId: (signed ? pick(p.sig) : pick(p.over)).id, foil: true, slot: 'foil' });
  } else if (r < ODDS.overnumbered + ODDS.altArt && p.alt.length) {
    out.push({ cardId: pick(p.alt).id, foil: true, slot: 'foil' });
  } else {
    const f = ODDS.foilRarity;
    const q = random();
    const list = q < f.Common ? p.common : q < f.Common + f.Uncommon ? p.uncommon : q < f.Common + f.Uncommon + f.Rare ? p.rare : p.epic;
    out.push({ cardId: pick(list).id, foil: true, slot: 'foil' });
  }
  // Rune slot
  const altRune = p.altRune.length && random() < ODDS.altRune;
  out.push({ cardId: (altRune ? pick(p.altRune) : pick(p.rune)).id, foil: !!altRune, slot: 'rune' });
  if (out.length !== CARDS_PER_PACK) throw new Error('bad pack');
  return out;
}
