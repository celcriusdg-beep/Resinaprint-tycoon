/* Props (4.17): life-size replica props, a branch of their own in the skill tree. Open the prop workshop, then unlock
   four lanes from small to big: magic items, swords, guns & tech and masks & helmets. The Virtuous Contract crowns them all. */
const PROP_STEP=[
  {ml:300,size:10,h:8,ref:149,effort:2,ship:7,base:.6,tier:1},
  {ml:600,size:16,h:11,ref:249,effort:3,ship:8,base:.45,tier:1},
  {ml:1100,size:24,h:14,ref:399,effort:4,ship:10,base:.35,tier:2},
  {ml:1800,size:32,h:18,ref:649,effort:6,ship:13,base:.25,tier:2},
  {ml:2600,size:40,h:22,ref:999,effort:9,ship:16,base:.15,tier:2}
];
const PROP_LANES=[
  {id:'magic',n:'Magic items',col:'#ff7fd0',items:[['pr_vial',"Galadriel's glass vial"],['pr_compact','Prism heart compact'],['pr_book','Red magic book'],['pr_rod','Cutie moon rod'],['pr_tiare','Eternal tiare wand']]},
  {id:'swords',n:'Swords',col:'#9fd3ff',items:[['pr_sai',"Raphael's sai"],['pr_katana',"Tanjiro's nichirin katana"],['pr_giyu',"Giyu's nichirin sword"],['pr_keyblade','Kingdom key keyblade'],['pr_excal','Excalibur, sword of promised victory']]},
  {id:'tech',n:'Guns & tech',col:'#5bd6a6',items:[['pr_arc','Arc reactor'],['pr_phaser','Starfleet phaser'],['pr_vash',"Vash's revolver"],['pr_xgun','X-Gun'],['pr_dominator','The Dominator']]},
  {id:'masks',n:'Masks & helmets',col:'#ffb547',items:[['pr_glove','Bladed nightmare glove'],['pr_tracker','Tracker hunter mask'],['pr_celtic','Celtic hunter mask'],['pr_panther','Panther king helmet'],['pr_berserker','Berserker hunter mask']]}
];
const PROP_KEYS=[];
UPGRADES.push({id:'pr_root',cat:'props',name:'Prop workshop',cost:50000,lane:1.5,step:0,parIds:[],
  desc:'Opens life-size replica props: big prints, lots of painting, very high prices. Props need medium or large printers.'});
PROP_LANES.forEach((L,lane)=>L.items.forEach(([k,n],i)=>{
  const st=PROP_STEP[i],id='prn_'+k;
  PRODUCTS[k]={name:`${n} (1:1 prop)`,ml:st.ml,size:st.size,h:st.h,ref:st.ref,effort:st.effort,ship:st.ship,base:st.base,tier:st.tier,req:id,official:1,col:L.col,prop:L.id};
  UPGRADES.push({id,cat:'props',name:n,cost:[12000,25000,50000,100000,200000][i],lane,step:i+1,ipKey:k,parIds:[i?'prn_'+L.items[i-1][0]:'pr_root'],
    desc:`${L.n}: unlocks the ${n.toLowerCase()} replica. Sells for about €${st.ref}, needs a ${TIERS[st.tier].toLowerCase()} printer.`});
  if(!PKEYS.includes(k))PKEYS.push(k);PROP_KEYS.push(k);
}));
/* the crown of the branch: needs the top prop of every lane */
PRODUCTS.pr_virtuous={name:'Virtuous Contract, Ascendent Abyss (1:1 prop)',ml:4000,size:40,h:30,ref:4999,effort:15,ship:20,base:.05,tier:2,req:'prn_pr_virtuous',official:1,col:'#c75bff',prop:'legend'};
UPGRADES.push({id:'prn_pr_virtuous',cat:'props',name:'Virtuous Contract',cost:750000,lane:1.5,step:6,ipKey:'pr_virtuous',parIds:PROP_LANES.map(L=>'prn_'+L.items[4][0]),allPar:1,
  desc:'The legendary blade of the Ascendent Abyss. Needs the top prop of all four lanes. Sells for about €4,999.'});
PKEYS.push('pr_virtuous');PROP_KEYS.push('pr_virtuous');
