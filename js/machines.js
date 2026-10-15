/* Machines (3.1): automated workers. They fill the same roles as people, never get tired and work round the clock. */
const mm=(id,name,role,cost,up,pw,lvl,trait,lab)=>({id,name,role,cost,up,pw,lvl,trait,lab:!!lab});
const MACH=[
  mm('tinker','Tinkerbot T-1','tech',2500,30,1,1,'quick'),
  mm('cobot','Clamp-Arm Cobot','tech',7500,45,1.3,2,'careful'),
  mm('gantry','Gantry Hand G-9','tech',18000,70,1.6,3,'efficient'),
  mm('carousel','Wash-N-Cure Carousel','post',3000,22,1,1,'efficient'),
  mm('dunk','Ultrasonic Dunk Tower','post',9000,38,1.4,2,'quick'),
  mm('drum','Rotary Cure Drum RX','post',21000,55,1.8,3,'careful'),
  mm('airbrush','Airbrush Arm AB-2','painter',4000,28,.9,1,'quick'),
  mm('mist','Spray-Mist Gantry','painter',12000,50,1.3,2,'careful'),
  mm('atelier','Robo-Brush Atelier','painter',30000,80,1.7,3,'efficient'),
  mm('pip','Pack-Bot Pip','packer',2200,18,1,1,'quick'),
  mm('pusher','Parcel Pusher PP-4','packer',8000,34,1.4,2,'efficient'),
  mm('boxer','Boxer 3000','packer',20000,50,1.9,3,'quick'),
  mm('charlie','Chat-Droid Charlie','support',3500,25,1,1,'careful'),
  mm('hydra','Helpdesk Hydra','support',12000,48,1.4,2,'careful'),
  mm('hype','Hype Engine HE-1','social',4500,30,1,1,'efficient'),
  mm('loom','Viral Loom','social',16000,60,1.4,2,'efficient'),
  mm('wrench','Wrench Drone','engineer',5500,32,1,1,'careful'),
  mm('autosvc','Auto-Service Gantry','engineer',17000,60,1.5,3,'careful'),
  mm('procure','Procurement Bot','buyer',4000,24,1,1,'efficient'),
  mm('route','Route Oracle','logistics',6500,35,1.2,2,'efficient'),
  mm('scan','Scan-Eye Mk I','inspector',6000,34,1.1,2,'careful'),
  mm('gauge','Optical Gauge OG-7','inspector',19000,60,1.5,3,'careful'),
  mm('muse','Generative Muse','designer',9000,45,1.2,2,'careful'),
  mm('lens','Lightbox Lens Rig','photographer',5000,30,1.2,2,'efficient'),
  mm('dave','Deal-Bot Dave','salesrep',8500,42,1.2,2,'quick'),
  mm('golem','Ledger Golem','accountant',7000,40,1.2,2,'efficient'),
  /* the Omega Forge: laboratory machines */
  mm('chrono','Chrono-Hand Prime','tech',160000,420,2.6,4,'quick',1),
  mm('qgantry','Quantum Gantry Q','tech',420000,900,3.6,5,'efficient',1),
  mm('voidw','Voidwright Arm','tech',1200000,1900,5,5,'careful',1),
  mm('plasma','Plasma Cure Cathedral','post',180000,450,2.8,4,'efficient',1),
  mm('cryo','Cryo-Wash Vortex','post',520000,1000,4,5,'quick',1),
  mm('mirage','Mirage Spectrum Painter','painter',260000,600,3,4,'careful',1),
  mm('omegaat','Atelier Omega','painter',1500000,2200,5.5,5,'efficient',1),
  mm('hyper','Hyperloop Packer','packer',150000,400,2.8,4,'quick',1),
  mm('singsort','Singularity Sorter','packer',640000,1200,4.6,5,'efficient',1),
  mm('oracle','Oracle Concierge','support',200000,480,2.6,4,'careful',1),
  mm('empathy','Empathy Core','support',800000,1500,4,5,'careful',1),
  mm('meme','Meme Reactor','social',220000,520,2.8,4,'efficient',1),
  mm('nova','Hypernova Broadcaster','social',900000,1600,4.4,5,'efficient',1),
  mm('swarm','Nanobot Swarm','engineer',280000,620,3,4,'careful',1),
  mm('lattice','Self-Healing Lattice','engineer',1000000,1800,4.5,5,'careful',1),
  mm('prophet','Market Prophet','buyer',240000,540,3,4,'efficient',1),
  mm('worm','Wormhole Dispatcher','logistics',300000,650,3.2,4,'efficient',1),
  mm('argus','Argus Array','inspector',320000,700,3.2,4,'careful',1),
  mm('photonaud','Photon Auditor','inspector',1100000,1900,4.8,5,'careful',1),
  mm('dream','Dream Foundry','designer',380000,800,3.4,4,'careful',1),
  mm('sculptor','Sculptor Prime','designer',1400000,2100,5,5,'careful',1),
  mm('halo','Holo-Studio Halo','photographer',340000,720,3.4,4,'efficient',1),
  mm('syndic','Silver-Tongue Syndicate','salesrep',360000,760,3.2,4,'quick',1),
  mm('titan','Tax Titan','accountant',420000,860,3.4,4,'efficient',1)
];
const machBays=lab=>lab?(S.up.labwing?8:0):2+3*S.ws;
const machOwned=lab=>S.staff.filter(s=>s.mach&&!!MACH.find(m=>m.id===s.mach).lab===!!lab);
Object.assign(A,{
  buyMach(d){
    const m=MACH.find(x=>x.id===d.k);if(!m)return;
    if(m.lab&&!S.up.labwing)return toast('Needs the Laboratorium wing');
    if(machOwned(m.lab).length>=machBays(m.lab))return toast('No free machine bay. Move to a bigger space');
    if(S.cash<m.cost)return toast('Not enough cash');
    spend('Machines',m.cost);
    const n=S.staff.filter(s=>s.mach===m.id).length;
    S.staff.push({id:nid(),role:m.role,store:null,name:m.name+(n?` #${n+1}`:''),wage:m.up,mood:100,busy:0,lvl:m.lvl,xp:0,trait:m.trait,cd:0,act:'',mach:m.id,pw:m.pw});
    log(`${m.name} installed. It works ${m.lab?'24/7':'round the clock'}.`,'good');toast(`${m.name} online`);
  },
  sellMach(d){
    const s=S.staff.find(x=>x.id==d.id);if(!s)return;const m=MACH.find(x=>x.id===s.mach),back=Math.round(m.cost*.4);
    confirmBox(`Sell ${s.name}?`,`You get ${fmt(back)} back (40% of what you paid).`,()=>{S.staff=S.staff.filter(x=>x!==s);earn('Machine sales',back);toast(`Sold for ${fmt(back)}`)});
  }
});
function machRow(m){
  const R=ROLES[m.role],n=S.staff.filter(s=>s.mach===m.id).length,full=machOwned(m.lab).length>=machBays(m.lab);
  return item(`${m.name}${n?` <span class="f">×${n}</span>`:''}`,`${R.name} · ${m.pw}× speed · ${fmt(m.up)}/day upkeep<br>${R.desc}`,`<button class="btn sm primary" data-a="buyMach" data-k="${m.id}" ${full||S.cash<m.cost?'disabled':''}>${fmt(m.cost)}</button>`);
}
function machView(lab){
  const own=machOwned(lab),bays=machBays(lab);
  let h='';
  if(lab&&!S.up.labwing)return label('The Omega Forge','sealed')+`<div class="card empty">Buy the Laboratorium wing in Shop › Upgrades to open the Omega Forge.</div>`;
  h+=label(lab?'The Omega Forge':'Machines',`${own.length} of ${bays} bays · ${fmt(own.reduce((a,s)=>a+s.wage,0))}/day upkeep`);
  h+=`<div class="card" style="margin-bottom:12px"><div class="s">${lab?'Laboratory-grade automation. Far faster than any person, works through the night and never asks for a raise.':'Machines do the same jobs as people. They never get tired or unhappy, work day and night, and cost only upkeep. More bays come with a bigger space.'}</div></div>`;
  if(own.length){
    h+='<div class="group">';
    for(const s of own){const m=MACH.find(x=>x.id===s.mach);
      h+=`<div class="item"><div class="grow"><div class="t">${s.name} <span class="chip good">Online</span></div><div class="s">${ROLES[s.role].name} · ${m.pw}× speed · ${fmt(s.wage)}/day</div><div class="tm"><div class="act">${LT('sa'+s.id,s.act||'Starting up')}</div></div></div><button class="btn sm ghost" data-a="sellMach" data-id="${s.id}">Sell</button></div>`}
    h+='</div>';
  }
  h+=label(lab?'Available in the Forge':'Available')+`<div class="group">${MACH.filter(m=>!!m.lab===lab).map(machRow).join('')}</div>`;
  return h;
}
const _vTeamPeople=vTeam;
vTeam=function(){
  const nm=machOwned(false).length,nl=machOwned(true).length;
  const t=segs('team',[['people','People'],['mach','Machines',nm],['lab','Omega Forge',nl],['powers','Power-ups',typeof puFree==='function'?puFree().length:0],['paint','Paint studio']]);
  if(sub.team==='paint')return t+paintView();
  if(sub.team==='powers')return t+powersView();
  if(sub.team==='mach')return t+machView(false);
  if(sub.team==='lab')return t+machView(true);
  return t+_vTeamPeople();
};
VIEWS.team=vTeam;
