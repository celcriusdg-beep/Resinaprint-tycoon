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
// Part rigs for the sprites, in sprite pixels. Each part: role (what animation drives it), poly (the pixels it
// owns; earlier parts win where polygons overlap), pv (joint it rotates around), par (parent part), z (draw order).
// fill: pixels of this part hidden under other parts (inside its poly, or inside the given polygon) are painted in
// from its own nearby pixels, so moving an arm away leaves no hole. Any pixel no polygon claims goes to the last part.
const RIGS = {
  scarlet: [
    { n: 'head', role: 'head', poly: [[9, 0], [25, 0], [26, 17], [8, 17]], pv: [17, 17], par: 'body', z: 5 },
    { n: 'sword', role: 'armF', tip: [61, 10], base: [29, 29], poly: [[22, 17], [33, 8], [36, 0], [62, 0], [62, 26], [35, 34], [28, 34], [22, 28]], pv: [23, 20], par: 'body', z: 6 },
    { n: 'armB', role: 'armB', poly: [[0, 7], [10, 7], [11, 24], [0, 25]], pv: [9, 20], par: 'body', z: 1 },
    { n: 'legB', role: 'legB', poly: [[0, 33], [13, 33], [14, 55], [0, 55]], pv: [10, 33], par: null, z: 0 },
    { n: 'legF', role: 'legF', poly: [[17, 36], [33, 36], [33, 55], [17, 55]], pv: [21, 36], par: null, z: 3 },
    { n: 'body', role: 'body', poly: [[5, 15], [28, 15], [28, 40], [5, 40]], pv: [16, 38], par: null, z: 2, fill: true },
  ],
  nova: [
    { n: 'head', role: 'head', poly: [[8, 0], [23, 0], [23, 15], [8, 15]], pv: [15, 15], par: 'body', z: 5 },
    { n: 'gun', role: 'armF', tip: [48, 33], base: [30, 33], poly: [[19, 17], [26, 17], [30, 22], [49, 24], [49, 42], [22, 42], [19, 36]], pv: [22, 20], par: 'body', z: 6 },
    { n: 'armB', role: 'armB', poly: [[0, 15], [11, 15], [13, 22], [12, 31], [0, 31]], pv: [11, 17], par: 'body', z: 1 },
    { n: 'legB', role: 'legB', poly: [[0, 37], [14, 37], [14, 60], [0, 60]], pv: [11, 38], par: null, z: 0 },
    { n: 'legF', role: 'legF', poly: [[17, 38], [30, 38], [30, 60], [17, 60]], pv: [20, 38], par: null, z: 3 },
    { n: 'body', role: 'body', poly: [[7, 13], [24, 13], [24, 42], [7, 42]], pv: [15, 40], par: null, z: 2, fill: true },
  ],
  sszira: [
    { n: 'head', role: 'head', poly: [[19, 0], [42, 0], [42, 15], [19, 15]], pv: [30, 15], par: 'torso', z: 5 },
    { n: 'staff', role: 'armB', poly: [[0, 6], [13, 6], [27, 17], [28, 30], [18, 31], [12, 20], [0, 16]], pv: [26, 19], par: 'torso', z: 3 },
    { n: 'glaive', role: 'armF', tip: [72, 52], base: [44, 36], poly: [[38, 20], [44, 26], [46, 32], [56, 32], [63, 32], [74, 46], [74, 58], [60, 58], [42, 40], [38, 34]], pv: [39, 22], par: 'torso', z: 6 },
    { n: 'tail', role: 'tail', poly: [[8, 27], [21, 27], [21, 44], [8, 44]], pv: [15, 44], par: null, z: 0 },
    { n: 'torso', role: 'body', poly: [[18, 14], [43, 14], [43, 42], [18, 42]], pv: [31, 42], par: null, z: 4, fill: true },
    { n: 'coil', role: 'base', poly: [[0, 0], [74, 0], [74, 65], [0, 65]], pv: [31, 60], par: null, z: 1, fill: [[18, 38], [43, 38], [43, 48], [18, 48]] },
  ],
  lupa: [
    { n: 'head', role: 'head', poly: [[11, 4], [31, 4], [31, 21], [11, 21]], pv: [21, 21], par: 'body', z: 5 },
    { n: 'bow', role: 'armF', tip: [42, 24], poly: [[29, 0], [49, 0], [49, 49], [33, 49], [29, 40], [30, 28], [26, 27], [26, 21]], pv: [26, 23], par: 'body', z: 6 },
    { n: 'armB', role: 'armB', hand: [24, 24], poly: [[7, 21], [26, 21], [26, 30], [7, 30]], pv: [18, 23], par: 'body', z: 4 },
    { n: 'tail', role: 'tail', poly: [[0, 38], [16, 38], [16, 52], [0, 52]], pv: [14, 43], par: 'body', z: 0 },
    { n: 'legB', role: 'legB', poly: [[10, 41], [21, 41], [21, 59], [10, 59]], pv: [16, 41], par: null, z: 1 },
    { n: 'legF', role: 'legF', poly: [[23, 41], [37, 41], [37, 59], [23, 59]], pv: [27, 41], par: null, z: 3 },
    { n: 'body', role: 'body', poly: [[8, 20], [30, 20], [30, 45], [8, 45]], pv: [20, 42], par: null, z: 2, fill: true },
  ],
};

// Attack animations per hero as keyframes over the move (at: 0..1). Each key sets joint channels
// [angle, dx, dy] (degrees and sprite pixels) for body, head, armF, armB, legF, legB, tail; ease shapes the
// approach to that key. hit: when the blow lands. fire: [from, to] window for guns. release: when an arrow leaves.
const CLIPS = {
  scarlet: { melee: { dur: 720, hit: 0.5, trail: [0.43, 0.66], keys: [
    { at: 0 },
    { at: 0.3, ease: 'out', body: [-8, -1, 2], armF: [-118], armB: [22], head: [-6], legF: [8], legB: [-6] },
    { at: 0.43, ease: 'in', body: [-11, -2, 3], armF: [-128], armB: [28], head: [-9], legF: [10], legB: [-8] },
    { at: 0.5, ease: 'out', body: [13, 5, 1], armF: [52], armB: [-22], head: [6], legF: [20], legB: [-16] },
    { at: 0.64, ease: 'out', body: [15, 6, 1], armF: [66], armB: [-26], head: [8], legF: [20], legB: [-16] },
    { at: 1, ease: 'inout' },
  ] } },
  sszira: { melee: { dur: 780, hit: 0.52, trail: [0.44, 0.66], slam: true, keys: [
    { at: 0 },
    { at: 0.32, ease: 'out', body: [-9, -1, -1], armF: [-96], armB: [-24], head: [-8], tail: [28] },
    { at: 0.44, ease: 'in', body: [-10, -1, -1], armF: [-108], armB: [-30], head: [-10], tail: [34] },
    { at: 0.52, ease: 'out', body: [10, 3, 1], armF: [16], armB: [12], head: [6], tail: [-22] },
    { at: 0.66, ease: 'out', body: [12, 3, 1], armF: [22], armB: [14], head: [8], tail: [-26] },
    { at: 1, ease: 'inout' },
  ] } },
  nova: { shoot: { dur: 950, fire: [0.24, 0.82], keys: [
    { at: 0 },
    { at: 0.2, ease: 'out', body: [-5, -1, 1], armF: [-8], armB: [10], head: [-3], legF: [7], legB: [-7] },
    { at: 0.82, body: [-5, -1, 1], armF: [-8], armB: [10], head: [-3], legF: [7], legB: [-7] },
    { at: 1, ease: 'inout' },
  ] } },
  lupa: { shoot: { dur: 820, release: 0.6, keys: [
    { at: 0 },
    { at: 0.16, ease: 'out', armF: [-6], body: [-2] },
    { at: 0.58, ease: 'inout', armB: [-6, -8, 0], armF: [-11], body: [-7, -1, 0], head: [-5], tail: [12], legB: [-5] },
    { at: 0.63, ease: 'out', armB: [5, 3, 0], armF: [3], body: [3, 1, 0], head: [2] },
    { at: 0.8, ease: 'out', armB: [2, 1, 0], armF: [0], body: [1] },
    { at: 1, ease: 'inout' },
  ] } },
};

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

if (typeof module !== 'undefined') module.exports = { FACTIONS, BEATS, ROLES, RARITY, MAX_STARS, SUMMON, MELEE, HEROES, HMAP, RENAMED, RIGS, CLIPS, STARTERS, THEMES, STAGES_PER_CHAPTER, MAX_ROUNDS };
