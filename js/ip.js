/* IP licences (4.15): buy the rights from the company behind a game, then unlock its figures one by one in the skill tree,
   from a 10 cm mini up to a 1/4 statue. Licensed figures sell for far more than your own designs but pay a royalty.
   Loaded right after data.js so every system sees the new products. */
const IP_SCALE=[
  {n:'Mini 10cm',ml:40,size:2,h:3,ref:59,effort:.8,ship:3,base:1.4,tier:0},
  {n:'Mini Deluxe',ml:60,size:2,h:3.5,ref:79,effort:1,ship:3,base:1.2,tier:0},
  {n:'1/12',ml:90,size:3,h:4,ref:119,effort:1.3,ship:4,base:1,tier:0},
  {n:'1/10',ml:130,size:5,h:6,ref:169,effort:1.8,ship:5,base:.8,tier:0},
  {n:'1/8',ml:190,size:7,h:7,ref:239,effort:2.4,ship:6,base:.6,tier:1},
  {n:'1/8 Deluxe',ml:240,size:8,h:8,ref:299,effort:2.8,ship:6,base:.5,tier:1},
  {n:'1/7',ml:280,size:8,h:8,ref:349,effort:3,ship:6,base:.45,tier:1},
  {n:'1/7 Deluxe',ml:340,size:10,h:9,ref:429,effort:3.6,ship:7,base:.38,tier:1},
  {n:'1/6',ml:450,size:14,h:10,ref:599,effort:4.5,ship:8,base:.3,tier:2},
  {n:'1/4 Statue',ml:1500,size:40,h:18,ref:1499,effort:10,ship:15,base:.08,tier:2}
];
const IP_NODE_COST=[.12,.16,.22,.3,.4,.55,.7,.9,1.2,2];
const IP_GAMES=[
  {id:'lol',co:'Riot Games',game:'League of Legends',short:'LoL',cost:15000,roy:.15,pop:1,col:'#c8aa6e',
   figs:[['missf','Miss Fortune'],['ashe','Ashe'],['lux','Lux'],['akali','Akali'],['yone','Yone'],['jhin','Jhin'],['jinx','Jinx'],['ahri','Ahri'],['seraphine','Seraphine'],['kaisa',"Kai'Sa"]]},
  {id:'gi',co:'HoYoverse',game:'Genshin Impact',short:'Genshin',cost:30000,roy:.18,pop:1.2,col:'#7fd6c9',
   figs:[['venti','Venti'],['zhongli','Zhongli'],['qiqi','Qiqi'],['klee','Klee'],['keqing','Keqing'],['nahida','Nahida'],['hutao','Hu Tao'],['ganyu','Ganyu'],['ayaka','Kamisato Ayaka'],['raiden','Raiden Shogun']]},
  {id:'ww',co:'Kuro Games',game:'Wuthering Waves',short:'WuWa',cost:25000,roy:.15,pop:1.05,col:'#e8c872',
   figs:[['carlotta','Carlotta'],['cantarella','Cantarella'],['changli','Changli'],['shorekeeper','Shorekeeper'],['phoebe','Phoebe'],['verina','Verina'],['augusta','Augusta'],['yinlin','Yinlin'],['mornye','Mornye'],['jinhsi','Jinhsi']]},
  {id:'zzz',co:'HoYoverse',game:'Zenless Zone Zero',short:'ZZZ',cost:40000,roy:.18,pop:1.1,col:'#ff9f2e',
   figs:[['belle','Belle'],['wise','Wise'],['grace','Grace Howard'],['yanagi','Tsukishiro Yanagi'],['nicole','Nicole Demara'],['anby','Anby Demara'],['jane','Jane Doe'],['evelyn','Evelyn Chevalier'],['ellen','Ellen Joe'],['miyabi','Hoshimi Miyabi']]},
  {id:'e7',co:'Smilegate',game:'Epic Seven',short:'Epic 7',cost:20000,roy:.12,pop:.9,col:'#8fb8ff',
   figs:[['vivian','Vivian'],['diene','Diene'],['ken','Ken'],['ras','Ras'],['tamarinne','Tamarinne'],['yufine','Yufine'],['iseria','Iseria'],['bellona','Seaside Bellona'],['eda','Festive Eda'],['luna','New Moon Luna']]}
];
const IP_BY={},IP_GAME_OF={};
IP_GAMES.forEach((G,lane)=>{
  UPGRADES.push({id:'ip_'+G.id,cat:'ip',name:`${G.co} licence`,cost:G.cost,lane,step:0,ipGame:G.id,
    desc:`Buy the ${G.game} IP from ${G.co}. Opens its 10 figures in this branch. ${Math.round(G.roy*100)}% royalty on every sale.`});
  G.figs.forEach(([k,n],i)=>{
    const sc=IP_SCALE[i],id=`ip_${G.id}_${i+1}`,ref=Math.round(sc.ref*G.pop);
    PRODUCTS[k]={name:`${n} ${sc.n} (${G.short})`,ml:sc.ml,size:sc.size,h:sc.h,ref,effort:sc.effort,ship:sc.ship,base:sc.base*G.pop,tier:sc.tier,req:id,royalty:G.roy,official:1,col:G.col,ip:G.id,scale:i};
    UPGRADES.push({id,cat:'ip',name:`${n} · ${sc.n}`,cost:Math.round(G.cost*IP_NODE_COST[i]/50)*50,lane,step:i+1,ipGame:G.id,ipKey:k,
      desc:`Unlocks ${n} ${sc.n} from ${G.game}. Sells for about €${ref}${sc.tier?`, needs a ${['','pro','large'][sc.tier]} printer`:''}.`});
    if(!PKEYS.includes(k))PKEYS.push(k);IP_BY[k]=G;
  });
});
/* the old busts are retired: the new lines have no busts */
for(const k of ['yasuo','jinhsib']){if(PRODUCTS[k])PRODUCTS[k].req='retired';const i=PKEYS.indexOf(k);if(i>=0)PKEYS.splice(i,1)}
