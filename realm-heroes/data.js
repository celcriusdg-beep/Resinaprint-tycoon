'use strict';
// Realm Heroes: static data. Heroes, factions, roles, rarities, summon rates.

const FACTIONS = {
  fire:   { name: 'Fire',   col: '#ff6a3d', glow: '#ffb347', icon: '🔥' },
  water:  { name: 'Water',  col: '#3da5ff', glow: '#9fe0ff', icon: '💧' },
  nature: { name: 'Nature', col: '#5fd35a', glow: '#c2f59a', icon: '🍃' },
  light:  { name: 'Light',  col: '#ffd84a', glow: '#fff4b8', icon: '☀️' },
  dark:   { name: 'Dark',   col: '#a35cff', glow: '#dcb8ff', icon: '🌙' },
};
// attacker faction -> faction it deals bonus damage to (light and dark beat each other)
const BEATS = { fire: 'nature', nature: 'water', water: 'fire', light: 'dark', dark: 'light' };

const ROLES = {
  tank:     { name: 'Tank',     hp: 1500, atk: 80,  def: 60, spd: 90,  front: true },
  warrior:  { name: 'Warrior',  hp: 1100, atk: 120, def: 40, spd: 100, front: true },
  mage:     { name: 'Mage',     hp: 800,  atk: 150, def: 25, spd: 105 },
  archer:   { name: 'Archer',   hp: 850,  atk: 140, def: 25, spd: 115 },
  assassin: { name: 'Assassin', hp: 850,  atk: 150, def: 25, spd: 125 },
  healer:   { name: 'Healer',   hp: 900,  atk: 100, def: 30, spd: 110 },
};

const RARITY = {
  R:   { name: 'Rare',      stars: 3, mult: 1,    col: '#4aa3ff' },
  SR:  { name: 'Epic',      stars: 4, mult: 1.25, col: '#b061ff' },
  SSR: { name: 'Legendary', stars: 5, mult: 1.6,  col: '#ffb800' },
};
const MAX_STARS = 7;

// Summon: rates per pull, SSR guaranteed on the PITY-th pull without one.
const SUMMON = { SSR: 0.04, SR: 0.24, pity: 40, cost1: 100, cost10: 900 };

const MELEE = new Set(['sword', 'axe', 'hammer', 'spear', 'dagger', 'scythe']);

// look: drawn fallback rig (skin, hair, hs, hat, armor, armor2, trim, cape, wpn, shield, eye, beard, build, size).
// img: painted sprite in img/<id>.webp; face: which way the painting faces (1 right, -1 left);
// hx: head position across the sprite (0..1) for portrait framing; sz: battle size.
// ult types: single, aoe, back, random, burn, stun, heal, healLow, buff, drain
const HEROES = [
  // Legendary
  { id: 'vesper', name: 'Vesper', title: 'Blackpowder Captain', fac: 'fire', role: 'warrior', rar: 'SSR', img: 1, face: 1, hx: 0.43,
    ult: { name: 'Broadside Barrage', type: 'random', hits: 5, mult: 0.8 },
    look: { skin: '#f0c8a8', hair: '#b8202e', hs: 'long', hat: 'none', armor: '#1f2a4a', armor2: '#5a3a22', trim: '#e0b040', cape: '#1f2a4a', wpn: 'sword' } },
  { id: 'morwen', name: 'Morwen', title: 'the Tidecaller', fac: 'water', role: 'mage', rar: 'SSR', img: 1, face: 1, hx: 0.53,
    ult: { name: 'Maelstrom', type: 'stun', mult: 1.0, chance: 0.4, aoe: true },
    look: { skin: '#f2d6c4', hair: '#2ab0c0', hs: 'long', hat: 'tiara', armor: '#1e8a9a', armor2: '#145a6a', trim: '#ffd0e0', wpn: 'staff' } },
  { id: 'thornmaw', name: 'Thornmaw', title: 'Elder of the Wildwood', fac: 'nature', role: 'tank', rar: 'SSR', img: 1, face: 1, hx: 0.45, hy: 0.2, sz: 1.12,
    ult: { name: 'Wildroot Oath', type: 'buff', mult: 1.3, atkUp: 0.3, turns: 2 },
    look: { skin: '#5a4a2a', hair: '#4a8a3a', hs: 'bald', hat: 'viking', armor: '#3a3020', armor2: '#2a2418', trim: '#7adf6a', wpn: 'hammer', build: 1.3 } },
  { id: 'amunet', name: 'Amunet', title: 'Sun of the Dunes', fac: 'light', role: 'healer', rar: 'SSR', img: 1, face: 1, hx: 0.41,
    ult: { name: 'Sunwell Blessing', type: 'heal', mult: 1.6 },
    look: { skin: '#8a5a3a', hair: '#1a1410', hs: 'braid', hat: 'crown', armor: '#efe6d0', armor2: '#d8c8a0', trim: '#e8b830', wpn: 'staff' } },
  { id: 'odette', name: 'Odette', title: 'the Porcelain Doll', fac: 'dark', role: 'assassin', rar: 'SSR', img: 1, face: 1, hx: 0.5,
    ult: { name: 'Strings of Sorrow', type: 'back', mult: 1.7 },
    look: { skin: '#f0e4ea', hair: '#e890c8', hs: 'long', hat: 'none', armor: '#5a2a7a', armor2: '#2a1a30', trim: '#e04a8a', wpn: 'dagger', eye: '#7a3aaa' } },
  { id: 'kestrel', name: 'Kestrel', title: 'Windborne Huntress', fac: 'nature', role: 'archer', rar: 'SSR', img: 1, face: 1, hx: 0.46,
    ult: { name: 'Gale Volley', type: 'aoe', mult: 1.05 },
    look: { skin: '#f2dccc', hair: '#e8e8f0', hs: 'braid', hat: 'ears', armor: '#2a7a3a', armor2: '#3a2a1a', trim: '#d8c060', cape: '#1f5a2a', wpn: 'bow' } },
  // Epic
  { id: 'grimhold', name: 'Grimhold', title: 'Forge Warden', fac: 'fire', role: 'tank', rar: 'SR', img: 1, face: -1, hx: 0.48, sz: 0.95,
    ult: { name: 'Molten Slam', type: 'stun', mult: 1.6, chance: 0.7, aoe: false },
    look: { skin: '#e0a882', hair: '#c8401a', hs: 'bald', hat: 'viking', armor: '#3a2a22', armor2: '#2a1a14', trim: '#ff7a2a', wpn: 'hammer', shield: '#5a3a2a', beard: '#c8401a', build: 1.3, size: 0.9 } },
  { id: 'selka', name: 'Selka', title: 'the Coral Knight', fac: 'water', role: 'warrior', rar: 'SR', img: 1, face: -1, hx: 0.55,
    ult: { name: 'Riptide Lance', type: 'single', mult: 2.6 },
    look: { skin: '#f0d6c0', hair: '#5ac0a8', hs: 'short', hat: 'helmet', armor: '#cfe8ec', armor2: '#7ab8c0', trim: '#2a9aaa', cape: '#1e7a8a', wpn: 'spear' } },
  { id: 'willow', name: 'Willow', title: 'Dryad Healer', fac: 'nature', role: 'healer', rar: 'SR', img: 1, face: 1, hx: 0.53,
    ult: { name: 'Blossom Ward', type: 'healLow', mult: 2.2, shield: 1.2 },
    look: { skin: '#a8c890', hair: '#6aa04a', hs: 'long', hat: 'none', armor: '#4a8a3a', armor2: '#3a6a2a', trim: '#f0a0c0', wpn: 'staff' } },
  { id: 'aurelia', name: 'Aurelia', title: 'Sunlance Paladin', fac: 'light', role: 'warrior', rar: 'SR', img: 1, face: 1, hx: 0.5,
    ult: { name: 'Dawnbreaker', type: 'buff', mult: 1.2, atkUp: 0.25, turns: 2 },
    look: { skin: '#f2d0b0', hair: '#f0c860', hs: 'short', hat: 'helmet', armor: '#f0e0b0', armor2: '#c8a860', trim: '#ffd84a', cape: '#f4ecd8', wpn: 'spear' } },
  { id: 'malachar', name: 'Malachar', title: 'the Hexknight', fac: 'dark', role: 'warrior', rar: 'SR',
    ult: { name: 'Soul Rend', type: 'drain', mult: 2.0, heal: 0.6 },
    look: { skin: '#c7b2b2', hair: '#e8e8f0', hs: 'long', hat: 'none', armor: '#22181e', armor2: '#140e12', trim: '#ff2a3a', cape: '#6a1020', wpn: 'sword', eye: '#ff3355', build: 1.1 } },
  { id: 'cinder', name: 'Cinder', title: 'the Flame Witch', fac: 'fire', role: 'mage', rar: 'SR',
    ult: { name: 'Inferno Rain', type: 'burn', mult: 0.9, dot: 0.35, turns: 2 },
    look: { skin: '#f6d0b0', hair: '#ff7a2a', hs: 'long', hat: 'wizard', armor: '#2a1418', armor2: '#1a0e10', trim: '#ff6a2a', wpn: 'staff', eye: '#ff9d00' } },
  // Rare
  { id: 'brakka', name: 'Brakka', title: 'Orc Raider', fac: 'fire', role: 'warrior', rar: 'R',
    ult: { name: 'Skull Splitter', type: 'single', mult: 1.9 },
    look: { skin: '#7a9a4a', hair: '#1a1a14', hs: 'pony', hat: 'none', armor: '#6a4a2a', armor2: '#3a2a1a', trim: '#c84a2a', wpn: 'axe', build: 1.2 } },
  { id: 'garrick', name: 'Garrick', title: 'Shieldbearer', fac: 'water', role: 'tank', rar: 'R',
    ult: { name: 'Rally', type: 'buff', mult: 1.0, atkUp: 0.2, turns: 2 },
    look: { skin: '#e0b08a', hair: '#4a3a2a', hs: 'short', hat: 'helmet', armor: '#5a7d99', armor2: '#33495a', trim: '#c9d8e6', wpn: 'spear', shield: '#4a6d8a', build: 1.2 } },
  { id: 'wren', name: 'Wren', title: 'Forest Scout', fac: 'nature', role: 'archer', rar: 'R',
    ult: { name: 'Aimed Shot', type: 'single', mult: 1.8 },
    look: { skin: '#e7c39d', hair: '#3e2a1a', hs: 'short', hat: 'hood', armor: '#5f7a3a', armor2: '#3b3020', trim: '#a8c070', cape: '#4a6a2a', wpn: 'bow' } },
  { id: 'pip', name: 'Pip', title: 'Tide Apprentice', fac: 'water', role: 'mage', rar: 'R',
    ult: { name: 'Ripple', type: 'aoe', mult: 0.75 },
    look: { skin: '#f2d2b6', hair: '#5a4a8a', hs: 'spiky', hat: 'wizard', armor: '#4a6fa5', armor2: '#2e3e5e', trim: '#bcd8ff', wpn: 'staff', size: 0.9 } },
  { id: 'mae', name: 'Sister Mae', title: 'Acolyte', fac: 'light', role: 'healer', rar: 'R',
    ult: { name: 'Prayer', type: 'heal', mult: 1.1 },
    look: { skin: '#f6d8bc', hair: '#d9a441', hs: 'long', hat: 'hood', armor: '#efe6cc', armor2: '#a89a72', trim: '#e6c25a', cape: '#e8e0c8', wpn: 'staff' } },
  { id: 'skrit', name: 'Skrit', title: 'Goblin Cutthroat', fac: 'dark', role: 'assassin', rar: 'R',
    ult: { name: 'Flurry', type: 'random', hits: 4, mult: 0.6 },
    look: { skin: '#7fa35a', hair: '#2a2a1a', hs: 'bald', hat: 'ears', ears: 1.8, armor: '#4a3a2a', armor2: '#2a2018', trim: '#9a7a4a', wpn: 'dagger', size: 0.82, eye: '#ffde3a' } },
];
// Heroes from the first roster, mapped to their replacements so old saves carry over.
const RENAMED = { pyra: 'vesper', thalor: 'morwen', sylvara: 'amunet', aurelion: 'thornmaw', nyx: 'odette', kael: 'kestrel',
  brann: 'selka', mira: 'cinder', vex: 'malachar', lumi: 'willow', rook: 'grimhold', fenna: 'aurelia',
  tobin: 'brakka', dorn: 'garrick', marlo: 'pip', sela: 'mae', grub: 'skrit' };
const HMAP = {};
HEROES.forEach(h => (HMAP[h.id] = h));

const STARTERS = ['brakka', 'garrick', 'wren', 'pip', 'mae'];

// Campaign backdrops, one per chapter of 10 stages (cycles after the last).
const THEMES = [
  { name: 'Verdant Fields', sky: ['#7ec8ff', '#d7f0ff'], hill: ['#5b9a5a', '#3f7a45'], ground: ['#6fae4f', '#477a34'], sun: '#fff6c0' },
  { name: 'Sunscorch Dunes', sky: ['#ffb46b', '#ffe3a8'], hill: ['#d69a55', '#b87a3f'], ground: ['#e3b46c', '#b98a4a'], sun: '#fff1b0' },
  { name: 'Frostpeak Pass', sky: ['#8fb8e8', '#e8f4ff'], hill: ['#c8d9ec', '#9fb6d2'], ground: ['#e8f0f8', '#b8c8dc'], sun: '#ffffff' },
  { name: 'Ashen Caldera', sky: ['#3a1a1a', '#a2402a'], hill: ['#4a2a24', '#2e1a18'], ground: ['#5a3a2e', '#3a241e'], sun: '#ffb050' },
  { name: 'Shadow Marsh', sky: ['#1e1838', '#5a4a86'], hill: ['#2e2a48', '#1e1a30'], ground: ['#3a3a4e', '#24243a'], sun: '#d8c8ff' },
  { name: 'Celestial Spire', sky: ['#2a3a8a', '#f0b8ff'], hill: ['#8a7ad8', '#5a4aa8'], ground: ['#b8a8ec', '#7a6ac0'], sun: '#fff8e0' },
];
const STAGES_PER_CHAPTER = 10;
const MAX_ROUNDS = 15;

if (typeof module !== 'undefined') module.exports = { FACTIONS, BEATS, ROLES, RARITY, MAX_STARS, SUMMON, MELEE, HEROES, HMAP, RENAMED, STARTERS, THEMES, STAGES_PER_CHAPTER, MAX_ROUNDS };
