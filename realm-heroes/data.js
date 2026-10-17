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

// img: pixel sprite in img/<id>.png (faces right); fx: where the feet sit across the sprite (0..1);
// hx, hy: head position in the sprite, for portraits. look: colours and weapon for effects and fallbacks.
// ult types: single, aoe, back, random, burn, stun, heal, healLow, buff, drain
const HEROES = [
  { id: 'scarlet', name: 'Scarlet', title: 'Flame Knight', fac: 'fire', role: 'warrior', rar: 'SSR', img: 1, fx: 0.32, hx: 0.24, hy: 0.16,
    ult: { name: 'Blazing Arc', type: 'burn', mult: 0.95, dot: 0.35, turns: 2 },
    look: { skin: '#f0c8a8', hair: '#b8202e', hs: 'long', hat: 'none', armor: '#a52a2a', armor2: '#6a1a1a', trim: '#e0a040', wpn: 'sword' } },
  { id: 'nova', name: 'Nova', title: 'Cyber Gunner', fac: 'water', role: 'archer', rar: 'SSR', img: 1, fx: 0.42, hx: 0.3, hy: 0.12,
    ult: { name: 'Gatling Storm', type: 'random', hits: 6, mult: 0.62 },
    look: { skin: '#e0e8f0', hair: '#2a6ab8', hs: 'short', hat: 'helmet', armor: '#2a5aa8', armor2: '#1a3a6a', trim: '#7ae8ff', wpn: 'gun' } },
  { id: 'sszira', name: 'Sszira', title: 'Naga Matriarch', fac: 'dark', role: 'tank', rar: 'SR', img: 1, fx: 0.45, hx: 0.42, hy: 0.15,
    ult: { name: 'Coil Crush', type: 'stun', mult: 1.0, chance: 0.4, aoe: true },
    look: { skin: '#a88a6a', hair: '#4a3a2a', hs: 'long', hat: 'none', armor: '#6a5a3a', armor2: '#8a7a5a', trim: '#d8c8a0', wpn: 'spear' } },
  { id: 'lupa', name: 'Lupa', title: 'Wolfkin Ranger', fac: 'nature', role: 'archer', rar: 'R', img: 1, fx: 0.4, hx: 0.36, hy: 0.2,
    ult: { name: 'Moonfang Volley', type: 'back', mult: 1.3 },
    look: { skin: '#f0d8c0', hair: '#9aa0a8', hs: 'long', hat: 'ears', armor: '#5a7a3a', armor2: '#6a4a2a', trim: '#c8b080', wpn: 'bow' } },
];
// Heroes from earlier rosters are gone; saves that only had those start again with the starters.
const RENAMED = {};
const HMAP = {};
HEROES.forEach(h => (HMAP[h.id] = h));

const STARTERS = ['sszira', 'lupa'];

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
