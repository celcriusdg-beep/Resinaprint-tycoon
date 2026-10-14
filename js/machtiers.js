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
