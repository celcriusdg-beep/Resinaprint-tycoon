/* Age of Resin: data. Five ages, four units each, turrets, specials, difficulty. */
const VW=480,VH=360,WW=1500,GY=300,BASE_X=105;
const AGES=[
  {n:'Stone Age',sky:['#79c3e6','#f1ead0'],far:'#a7bd9a',near:'#86a27a',gnd:'#8a6a3e',gnd2:'#6a4f2d',grass:'#6f9a47',sun:'#fff3b0',spec:'Meteor shower'},
  {n:'Castle Age',sky:['#6aa8e8','#e6efe0'],far:'#9db3c6',near:'#7f9a86',gnd:'#7a6a4a',gnd2:'#5a4c34',grass:'#5f9444',sun:'#fff6c9',spec:'Arrow rain'},
  {n:'Renaissance',sky:['#d9a35f','#f3dfb4'],far:'#b49b83',near:'#8f8068',gnd:'#775f40',gnd2:'#59452d',grass:'#7d8f45',sun:'#ffe3a0',spec:'Cannon barrage'},
  {n:'Modern Age',sky:['#5d7f9e','#c6d0d6'],far:'#7c8b96',near:'#667780',gnd:'#5d5b57',gnd2:'#454340',grass:'#59713f',sun:'#f2f2f2',spec:'Air strike'},
  {n:'Future Age',sky:['#150f3a','#6b3fa0'],far:'#3a2a78',near:'#2b2063',gnd:'#2a2b46',gnd2:'#1b1c33',grass:'#3de0c2',sun:'#b69bff',spec:'Orbital laser'}
];
const MULT=[1,2.3,5.3,12,27], COSTM=[1,2.4,6,14,32];
const TYPES=[
  {k:'melee', cost:15, hp:55, dmg:7, range:22, spd:44, cd:.8, train:1.2},
  {k:'ranged',cost:25, hp:40, dmg:6.5,range:140,spd:40, cd:1.0,train:1.6},
  {k:'heavy', cost:100,hp:230,dmg:16, range:28, spd:34, cd:1.0,train:3},
  {k:'super', cost:350,hp:800,dmg:38, range:32, spd:26, cd:1.4,train:5, splash:38}
];
const NAMES=[
  ['Clubman','Slinger','Dino Rider','Mammoth'],
  ['Swordsman','Archer','Knight','Catapult'],
  ['Fencer','Musketeer','Cavalry','Cannon Cart'],
  ['Marine','Rifleman','Tank','Rocket Truck'],
  ['Blade Trooper','Plasma Gunner','Combat Mech','Titan Walker']
];
const TURRET={cost:[100,250,550,1100,2200],dmg:[14,30,62,130,280],cd:[1.3,1.2,1,.9,.8],range:[190,210,230,250,270],name:['Rock thrower','Ballista','Mortar','Machine gun','Plasma cannon']};
const SPECIAL={dmg:[90,200,430,900,1900],cd:45,strikes:14,radius:46};
const EVOLVE_XP=[250,900,3000,10000];
const INCOME=[3,7,16,36,80];
const DIFF={easy:{name:'Easy',inc:1.1,hp:1500,evo:1.1},normal:{name:'Normal',inc:1.7,hp:2200,evo:.9},hard:{name:'Hard',inc:3,hp:3200,evo:.75}};
const ENEMY_EVOLVE=[110,260,450,700];
function unitDef(age,type){
  const T=TYPES[type],m=MULT[age];
  return {age,type,name:NAMES[age][type],cost:Math.round(T.cost*COSTM[age]),hp:Math.round(T.hp*m),dmg:T.dmg*m,
    range:T.k==='ranged'?T.range+age*18:T.range+(T.k==='heavy'&&age>=3?12:0)+(T.k==='super'?(age===1||age===2||age===3?150:0):0),
    spd:T.spd,cd:T.cd,train:T.train,splash:T.splash||0,ranged:T.k==='ranged'||(T.k==='super'&&age>=1&&age<=3)};
}
