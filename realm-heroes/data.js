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

// look: skin, hair, hs (hair style), hat, armor, armor2 (legs), trim, cape, wpn, shield, eye, beard, build, size
// ult types: single, aoe, back, random, burn, stun, heal, healLow, buff, drain
const HEROES = [
  // Legendary
  { id: 'pyra', name: 'Pyra', title: 'Ember Empress', fac: 'fire', role: 'mage', rar: 'SSR',
    ult: { name: 'Inferno Rain', type: 'burn', mult: 0.95, dot: 0.35, turns: 2 },
    look: { skin: '#f6d0b0', hair: '#e2332a', hs: 'long', hat: 'crown', armor: '#9c1c2c', armor2: '#4a1018', trim: '#ffc44d', cape: '#5c0f1b', wpn: 'staff', eye: '#ff9d00' } },
  { id: 'thalor', name: 'Thalor', title: 'Tide Warden', fac: 'water', role: 'warrior', rar: 'SSR',
    ult: { name: 'Riptide', type: 'stun', mult: 1.0, chance: 0.45, aoe: true },
    look: { skin: '#e0b48f', hair: '#1d3d6b', hs: 'short', hat: 'helmet', armor: '#2563a8', armor2: '#1a3256', trim: '#9fe3ff', cape: '#123a66', wpn: 'spear', beard: '#1d3d6b', build: 1.1 } },
  { id: 'sylvara', name: 'Sylvara', title: 'Grove Mother', fac: 'nature', role: 'healer', rar: 'SSR',
    ult: { name: 'Bloom of Life', type: 'heal', mult: 1.6 },
    look: { skin: '#f2d6b8', hair: '#7fdc6a', hs: 'long', hat: 'ears', armor: '#2f7a3b', armor2: '#1d4a26', trim: '#e9f7a1', cape: '#3f9b4a', wpn: 'staff', eye: '#2c8a3a' } },
  { id: 'aurelion', name: 'Aurelion', title: 'Dawn Paladin', fac: 'light', role: 'tank', rar: 'SSR',
    ult: { name: 'Sunforge Oath', type: 'buff', mult: 1.3, atkUp: 0.3, turns: 2 },
    look: { skin: '#f0c8a0', hair: '#f5e08a', hs: 'short', hat: 'halo', armor: '#e8c25a', armor2: '#8a6a2a', trim: '#fff6c8', cape: '#c4302b', wpn: 'hammer', shield: '#f4d26b', build: 1.2 } },
  { id: 'nyx', name: 'Nyx', title: 'Night Reaper', fac: 'dark', role: 'assassin', rar: 'SSR',
    ult: { name: 'Shadow Harvest', type: 'back', mult: 1.7 },
    look: { skin: '#d9c6e8', hair: '#2a1840', hs: 'long', hat: 'hood', armor: '#2d1b47', armor2: '#1a1029', trim: '#c08bff', cape: '#1f1233', wpn: 'scythe', eye: '#e05cff' } },
  { id: 'kael', name: 'Kael', title: 'Phoenix Archer', fac: 'fire', role: 'archer', rar: 'SSR',
    ult: { name: 'Phoenix Volley', type: 'random', hits: 5, mult: 0.75 },
    look: { skin: '#e8bf98', hair: '#ff8a3d', hs: 'spiky', hat: 'bandana', armor: '#7a3e1c', armor2: '#3d2412', trim: '#ffcf6b', cape: '#b8401a', wpn: 'bow' } },
  // Epic
  { id: 'brann', name: 'Brann', title: 'Ironhide', fac: 'nature', role: 'warrior', rar: 'SR',
    ult: { name: 'Earthsplitter', type: 'single', mult: 2.6 },
    look: { skin: '#d9a982', hair: '#6b3f1f', hs: 'bald', hat: 'viking', armor: '#5a6b3a', armor2: '#3a2e1f', trim: '#c9a35a', wpn: 'axe', beard: '#8b5a2b', build: 1.25 } },
  { id: 'mira', name: 'Mira', title: 'Frost Seer', fac: 'water', role: 'mage', rar: 'SR',
    ult: { name: 'Blizzard', type: 'aoe', mult: 1.0 },
    look: { skin: '#f4dcd0', hair: '#cfefff', hs: 'pony', hat: 'wizard', armor: '#3b6fb5', armor2: '#26457a', trim: '#e6f7ff', wpn: 'staff' } },
  { id: 'vex', name: 'Vex', title: 'Hexblade', fac: 'dark', role: 'warrior', rar: 'SR',
    ult: { name: 'Soul Rend', type: 'drain', mult: 2.0, heal: 0.6 },
    look: { skin: '#c7b2b2', hair: '#d9d9e6', hs: 'spiky', hat: 'none', armor: '#3a2340', armor2: '#221522', trim: '#ff4d7a', cape: '#5a1030', wpn: 'sword', eye: '#ff3355' } },
  { id: 'lumi', name: 'Lumi', title: 'Star Cleric', fac: 'light', role: 'healer', rar: 'SR',
    ult: { name: 'Starlight Ward', type: 'healLow', mult: 2.2, shield: 1.2 },
    look: { skin: '#ffe2c8', hair: '#fff2a8', hs: 'braid', hat: 'tiara', armor: '#f5f0e0', armor2: '#c9b98a', trim: '#ffcc33', wpn: 'staff' } },
  { id: 'rook', name: 'Rook', title: 'Cinder Knight', fac: 'fire', role: 'tank', rar: 'SR',
    ult: { name: 'Molten Slam', type: 'stun', mult: 1.6, chance: 0.7, aoe: false },
    look: { skin: '#d9a17a', hair: '#3a2a20', hs: 'short', hat: 'helmet', armor: '#6b2a1c', armor2: '#2e1a14', trim: '#ff7a2a', wpn: 'hammer', shield: '#8a3a22', build: 1.25 } },
  { id: 'fenna', name: 'Fenna', title: 'Thorn Archer', fac: 'nature', role: 'archer', rar: 'SR',
    ult: { name: 'Thorn Barrage', type: 'back', mult: 1.3 },
    look: { skin: '#efcfae', hair: '#c8641f', hs: 'pony', hat: 'ears', armor: '#4f7d34', armor2: '#2f4a20', trim: '#d6e88a', cape: '#3d6b2a', wpn: 'bow' } },
  // Rare
  { id: 'tobin', name: 'Tobin', title: 'Village Guard', fac: 'fire', role: 'warrior', rar: 'R',
    ult: { name: 'Power Strike', type: 'single', mult: 1.9 },
    look: { skin: '#f0c8a0', hair: '#7a4a2a', hs: 'short', hat: 'none', armor: '#a5452c', armor2: '#4a3324', trim: '#d9b27a', wpn: 'sword' } },
  { id: 'wren', name: 'Wren', title: 'Forest Scout', fac: 'nature', role: 'archer', rar: 'R',
    ult: { name: 'Aimed Shot', type: 'single', mult: 1.8 },
    look: { skin: '#e7c39d', hair: '#3e2a1a', hs: 'short', hat: 'hood', armor: '#5f7a3a', armor2: '#3b3020', trim: '#a8c070', cape: '#4a6a2a', wpn: 'bow' } },
  { id: 'marlo', name: 'Marlo', title: 'Tide Apprentice', fac: 'water', role: 'mage', rar: 'R',
    ult: { name: 'Ripple', type: 'aoe', mult: 0.75 },
    look: { skin: '#f2d2b6', hair: '#5a4a8a', hs: 'spiky', hat: 'wizard', armor: '#4a6fa5', armor2: '#2e3e5e', trim: '#bcd8ff', wpn: 'staff' } },
  { id: 'sela', name: 'Sela', title: 'Acolyte', fac: 'light', role: 'healer', rar: 'R',
    ult: { name: 'Prayer', type: 'heal', mult: 1.1 },
    look: { skin: '#f6d8bc', hair: '#d9a441', hs: 'long', hat: 'none', armor: '#efe6cc', armor2: '#a89a72', trim: '#e6c25a', wpn: 'staff' } },
  { id: 'grub', name: 'Grub', title: 'Goblin Raider', fac: 'dark', role: 'assassin', rar: 'R',
    ult: { name: 'Flurry', type: 'random', hits: 4, mult: 0.6 },
    look: { skin: '#7fa35a', hair: '#2a2a1a', hs: 'bald', hat: 'ears', ears: 1.8, armor: '#4a3a2a', armor2: '#2a2018', trim: '#9a7a4a', wpn: 'dagger', size: 0.82, eye: '#ffde3a' } },
  { id: 'dorn', name: 'Dorn', title: 'Shieldbearer', fac: 'water', role: 'tank', rar: 'R',
    ult: { name: 'Rally', type: 'buff', mult: 1.0, atkUp: 0.2, turns: 2 },
    look: { skin: '#e0b08a', hair: '#4a3a2a', hs: 'short', hat: 'helmet', armor: '#5a7d99', armor2: '#33495a', trim: '#c9d8e6', wpn: 'spear', shield: '#4a6d8a', build: 1.2 } },
];
const HMAP = {};
HEROES.forEach(h => (HMAP[h.id] = h));

const STARTERS = ['tobin', 'dorn', 'wren', 'marlo', 'sela'];

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

if (typeof module !== 'undefined') module.exports = { FACTIONS, BEATS, ROLES, RARITY, MAX_STARS, SUMMON, MELEE, HEROES, HMAP, STARTERS, THEMES, STAGES_PER_CHAPTER, MAX_ROUNDS };
