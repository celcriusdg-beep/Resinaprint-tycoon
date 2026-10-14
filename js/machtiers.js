/* Five more machine tiers above Industrial: Advanced, Elite, Quantum, Mythic and Apex. 70 machines, one per job per tier. */
const NEW_TIERS=['adv','elite','quantum','myth','apex'];
Object.assign(TIER_LABEL,{adv:'Advanced',elite:'Elite',quantum:'Quantum',myth:'Mythic',apex:'Apex'});
Object.assign(MTIER,{
  adv:['#4aa3e8','#245f99','#a9d6ff','#9be1ff'],
  elite:['#e2c04a','#8a6b14','#fff0a8','#fff6c9'],
  quantum:['#35d3c4','#0f7a72','#b4fff6','#e8fffc'],
  myth:['#ff5c8a','#9a1f48','#ffc0d3','#ffe0ea'],
  apex:['#fff1b8','#b8923a','#ffffff','#ffe27a']
});
const TIER_COST=[3,8,20,55,150],TIER_UP=[1.5,2.6,4.4,7.5,12],TIER_PW=[1.35,1.9,2.6,3.6,5];
const TIER_NAMES_BY_ROLE={
  tech:['Servo Gantry S2','Hexapod Print-Bot','Photon Weaver','Aether Loom','Genesis Arm'],
  post:['Ultrasonic Vortex Bath','Plasma Cure Tunnel','Cryo-Flash Chamber','Stellar Cure Forge','Singularity Wash Core'],
  painter:['Dual-Arm Colourist','Spectrum Sprayer X','Hyperfine Atelier','Chroma Weaver','Rainbow Genesis'],
  packer:['Quad-Belt Packer','Cargo Spiral','Gravity Boxer','Ether Sorter','Omni Dispatch Hub'],
  support:['Concierge Duo','Sentiment Engine','Empath Nexus','Oracle Choir','All-Seeing Host'],
  social:['Trend Radar','Viral Foundry','Meme Singularity','Hype Cathedral','Attention Black Hole'],
  engineer:['Torque Spider','Nano-Service Rig','Self-Repair Hive','Time-Loop Mechanic','Entropy Reverser'],
  buyer:['Contract Hawk','Supply Strategist','Futures Engine','Market Whisperer','Economy Sovereign'],
  logistics:['Fleet Brain','Hyper-Route Mesh','Teleport Depot','Slipstream Network','Worldline Router'],
  inspector:['Micron Scanner','Tri-Lens Auditor','Quantum Gauge','Truth Prism','The Perfect Eye'],
  designer:['Parametric Muse','Neural Sculptor','Dream Compiler','Mythos Forge','Genesis Mind'],
  photographer:['Studio Drone','Light-Field Rig','Hologram Studio','Aurora Lens','Eternal Frame'],
  salesrep:['Negotiator Pro','Charm Engine','Deal Oracle','Syndicate Prime','Contract Overlord'],
  accountant:['Ledger Cluster','Audit Hydra','Tax Oracle','Fiscal Singularity','Wealth Sovereign']
};
(function addTiers(){
  const traits=['careful','efficient','quick'];
  for(const role of MROLE_ORDER){
    const base=MACH.filter(m=>!m.lab&&m.role===role).sort((a,b)=>b.cost-a.cost)[0];
    if(!base)continue;
    NEW_TIERS.forEach((t,i)=>{
      const m=mm(`${role}_${t}`,TIER_NAMES_BY_ROLE[role][i],role,Math.round(base.cost*TIER_COST[i]/100)*100,Math.round(base.up*TIER_UP[i]/5)*5,+(base.pw*TIER_PW[i]).toFixed(1),i===0?4:5,traits[(MROLE_ORDER.indexOf(role)+i)%3],false);
      m.tier=t;MACH.push(m);
    });
  }
})();
/* unlock chain: Advanced needs a factory hall and an Industrial machine, each later tier needs one of the tier before */
function machLock(m){
  const i=NEW_TIERS.indexOf(m.tier);if(i<0)return '';
  if(i===0&&S.ws<3)return 'Needs a factory hall';
  const prev=i===0?'ind':NEW_TIERS[i-1];
  const has=S.staff.some(s=>s.mach&&machTier(MACH.find(x=>x.id===s.mach))===prev);
  return has?'':`Own any ${TIER_LABEL[prev]} machine first`;
}
const _buyMach0=A.buyMach;
A.buyMach=function(d){const m=MACH.find(x=>x.id===d.k);const why=m&&machLock(m);if(why)return toast(why);_buyMach0(d)};

/* ===== Omega Forge: three more tiers, 20 to 100 times better than the Prime machines ===== */
const FORGE_TIERS=['rift','eternal','omega'];
Object.assign(TIER_LABEL,{rift:'Rift',eternal:'Eternal',omega:'Omega'});
Object.assign(MTIER,{
  rift:['#b04aff','#4a1a8a','#e9c8ff','#ff9cf5'],
  eternal:['#2fe0ff','#0a4a78','#c8f6ff','#ffffff'],
  omega:['#ffd24a','#8a4a00','#fff3c0','#ff6a3a']
});
const FORGE_NAMES={
  tech:['Riftwright Gantry','Chronos Printwright','Omega Genesis Press'],
  post:['Rift Cure Vortex','Everspring Cure','Omega Cure Sun'],
  painter:['Riftbrush Atelier','Palette of Ages','Omega Masterbrush'],
  packer:['Rift Cargo Gate','Orbit Packer','Omega Logistics Core'],
  support:['Rift Concierge','Companion Eternal','Omega Heartlink'],
  social:['Rift Hype Engine','Echo Chamber','Omega Broadcast'],
  engineer:['Riftsmith Swarm','Perpetual Mender','Omega Restorer'],
  buyer:['Rift Market Seer','Fortune Weaver','Omega Market Mind'],
  logistics:['Rift Dispatch Portal','Meridian Engine','Omega Worldweb'],
  inspector:['Rift Truth Lens','Verity Eye','Omega Allsight'],
  designer:['Rift Dreamsmith','Muse of Ages','Omega Creator'],
  photographer:['Rift Lightwell','Lumen Eternal','Omega Prism'],
  salesrep:['Rift Dealmaker','Emissary of Gold','Omega Closer'],
  accountant:['Rift Ledger Mind','Infinite Ledger','Omega Treasury']
};
(function addForgeTiers(){
  const PW=[20,50,100],COST=[12,35,80],UP=[8,20,45],traits=['careful','efficient','quick'];
  for(const role of MROLE_ORDER){
    const base=MACH.filter(m=>m.lab&&!m.tier&&m.role===role).sort((a,b)=>b.cost-a.cost)[0];
    if(!base)continue;
    FORGE_TIERS.forEach((t,i)=>{
      const m=mm(`${role}_${t}`,FORGE_NAMES[role][i],role,Math.round(base.cost*COST[i]/1000)*1000,Math.round(base.up*UP[i]/10)*10,+(base.pw*PW[i]).toFixed(0),5,traits[(MROLE_ORDER.indexOf(role)+i)%3],true);
      m.tier=t;MACH.push(m);
    });
  }
})();
const _machLock0=machLock;
machLock=function(m){
  const i=FORGE_TIERS.indexOf(m.tier);
  if(i<0)return _machLock0(m);
  if(!S.up.labwing)return 'Needs the Laboratorium wing';
  const has=S.staff.some(s=>{if(!s.mach)return false;const x=MACH.find(y=>y.id===s.mach);return i===0?(x.lab&&!x.tier&&x.lvl>=5):x.tier===FORGE_TIERS[i-1]});
  return has?'':i===0?'Own any Prime machine in the Forge first':`Own any ${TIER_LABEL[FORGE_TIERS[i-1]]} machine first`;
};
