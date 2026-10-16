/* Perks 3 (4.34): no more carrying money into a new run, and 18 new rebirth perks.
   Heirloom (keep cash) and Head start (start cash) are gone; whatever shards they cost are refunded once.
   Also: forged Singularity printers get their own tab in Shop › Printers. */
const PERK_GONE=['heir','head'];
for(let i=PERKS.length-1;i>=0;i--)if(PERK_GONE.includes(PERKS[i].id))PERKS.splice(i,1);
function perkRefund(s){
  const R=s&&s.reb;if(!R||!R.perks)return;let back=0;
  for(const id of PERK_GONE){const l=R.perks[id]||0;if(!l)continue;const base=id==='heir'?6:2;for(let i=0;i<l;i++)back+=Math.round(base*Math.pow(1.5,i));delete R.perks[id]}
  if(back){R.shards+=back;s.log=s.log||[];s.log.unshift({d:s.day||1,t:`Heirloom and Head start were removed. ${back} Resin Shards came back to you.`,k:'amber'})}
}
const _patchP3=patch;patch=function(s){const r=_patchP3(s);perkRefund(r||s);return r};
const P3=[
  {id:'hands',cat:'Production',n:'Steady hands',base:3,max:10,d:l=>`Painters work ${l*4}% faster`,ico:'<path d="M3 13 11 5l2 2-8 8H3z"/><path d="M10 6l2 2"/>'},
  {id:'rinse',cat:'Production',n:'Ultrasonic memory',base:3,max:10,d:l=>`Washing and curing ${l*4}% faster`,ico:'<path d="M3 6h10v7H3z"/><path d="M5 4c0-1 1-1 1-2M8 4c0-1 1-1 1-2M11 4c0-1 1-1 1-2"/>'},
  {id:'boxes',cat:'Production',n:'Packing muscle',base:3,max:10,d:l=>`Packers ${l*4}% faster`,ico:'<path d="M2 5 8 2l6 3v6l-6 3-6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/>'},
  {id:'calm',cat:'Production',n:'Calm vats',base:4,max:10,d:l=>`${l*4}% fewer failed prints`,ico:'<path d="M3 8h10M3 11h10"/><circle cx="8" cy="4" r="2"/>'},
  {id:'golden',cat:'Production',n:'Golden plate',base:6,max:10,d:l=>`${l}% of print plates come out double`,ico:'<rect x="3" y="5" width="10" height="7" rx="1"/><path d="M5 5V3h6v2"/>'},
  {id:'mentor',cat:'Production',n:'Mentor',base:3,max:10,d:l=>`Staff learn ${l*10}% faster`,ico:'<circle cx="6" cy="5" r="2"/><path d="M2 13c0-2.5 2-4 4-4s4 1.5 4 4M11 7l3-2v6l-3-2"/>'},
  {id:'loyal',cat:'Economy',n:'Loyal crew',base:4,max:10,d:l=>`Wages ${l*3}% lower`,ico:'<path d="M8 13s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"/>'},
  {id:'landlord',cat:'Economy',n:'Friendly landlord',base:4,max:10,d:l=>`Rent and electricity ${l*3}% lower`,ico:'<path d="M2 8 8 3l6 5v6H2z"/><path d="M6 14v-4h4v4"/>'},
  {id:'courier',cat:'Economy',n:'Courier deals',base:4,max:10,d:l=>`Shipping ${l*3}% cheaper`,ico:'<rect x="1" y="5" width="9" height="6"/><path d="M10 7h3l2 2v2h-5"/><circle cx="4" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/>'},
  {id:'vip',cat:'Economy',n:'Marketplace VIP',base:4,max:10,d:l=>`Marketplace and payment fees ${l*5}% lower`,ico:'<path d="M2 4h12v8H2z"/><path d="M2 7h12"/>'},
  {id:'momentum',cat:'Economy',n:'Momentum',base:8,max:10,d:l=>`+${l*2}% on all income`,ico:'<path d="M2 12 7 7l2 2 5-5"/><path d="M10 4h4v4"/>'},
  {id:'sprint',cat:'Economy',n:'Fast start',base:4,max:5,d:l=>`+${l*20}% demand for the first 7 days of a run`,ico:'<path d="M3 13 9 3l1 5h3L7 15l-1-5H3z"/>'},
  {id:'fans',cat:'Economy',n:'Fan club',base:3,max:10,d:l=>`+${l} hype every day`,ico:'<path d="M8 2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2 4.4 13l.7-4L2.2 6.3l4-.6z"/>'},
  {id:'praise',cat:'Economy',n:'Five-star memory',base:5,max:10,d:l=>`Every review counts +${(l*.03).toFixed(2)} stars better`,ico:'<path d="M3 11h10M5 8h6M7 5h2"/>'},
  {id:'architect',cat:'Legacy',n:'Architect',base:6,max:10,d:l=>`Megaprojects ${l*4}% cheaper`,ico:'<path d="M2 14h12M4 14V6l4-3 4 3v8"/><path d="M7 14v-3h2v3"/>'},
  {id:'smelter',cat:'Legacy',n:'Master smelter',base:8,max:10,d:l=>`Foundry upkeep ${l*4}% lower`,ico:'<path d="M3 13h10l-2-6H5z"/><path d="M6 7c0-2 2-2 2-4M9 7c0-2 2-2 2-4"/>'},
  {id:'lucky',cat:'Vault',n:'Lucky streak',base:5,max:10,d:l=>`${l*3}% chance of a free chest every day`,ico:'<rect x="2" y="6" width="12" height="8" rx="1"/><path d="M2 9h12M8 6V4"/>'},
  {id:'quarry',cat:'Vault',n:'Shard quarry',base:10,max:5,d:l=>`+${l} Resin Shards every 10 game days`,ico:'<path d="M8 2l5 5-5 7-5-7z"/>'}
];
for(const P of P3){if(!PERKS.some(x=>x.id===P.id)){PERKS.push({id:P.id,cat:P.cat,n:P.n,base:P.base,max:P.max,d:P.d});PERK_ICO[P.id]=P.ico}}
/* ---------- hooks ---------- */
const _stP3=staffTask;staffTask=function(s){const r=_stP3(s);if(r&&r.h){const f=s.role==='painter'?perk('hands'):s.role==='post'?perk('rinse'):s.role==='packer'?perk('boxes'):0;if(f)r.h/=1+f*.04}return r};
const _ejP3=endJob;endJob=function(p){const f=perk('calm');if(f&&p.job){const D=PRINTERS[p.type];p.job.rf-=(D.fail+p.job.rf)*f*.04}_ejP3(p)};
const _colP3=collect;collect=function(p){const g=perk('golden');if(g&&p.job&&Math.random()<g*.01){p.job.units*=2;if(!awayMode&&!simulating)log(`Golden plate: ${short(p)} printed double.`,'amber')}return _colP3(p)};
if(typeof gainXp==='function'){const _gxP3=gainXp;gainXp=function(s,h){return _gxP3(s,h*(1+perk('mentor')*.1))}}
const P3_SPEND={Wages:'loyal','Employer costs':'loyal',Rent:'landlord',Electricity:'landlord',Shipping:'courier','Marketplace fees':'vip','Payment fees':'vip',Megaprojects:'architect','Foundry upkeep':'smelter'};
const P3_RATE={loyal:.03,landlord:.03,courier:.03,vip:.05,architect:.04,smelter:.04};
const _spP3=spend;spend=function(cat,a){const k=P3_SPEND[cat];if(k&&a>0){const l=perk(k);if(l)a*=Math.max(.2,1-l*P3_RATE[k])}return _spP3(cat,a)};
const _earnP3=earn;earn=function(cat,a){const l=perk('momentum');if(l&&a>0&&typeof RB_SKIP!=='undefined'&&!RB_SKIP.includes(cat))a*=1+l*.02;return _earnP3(cat,a)};
const _demP3=demand;demand=function(k){const d=_demP3(k),l=perk('sprint');return l&&S.day<=7?d*(1+l*.2):d};
const _revP3=review;review=function(sc){return _revP3(Math.min(5,sc+perk('praise')*.03))};
const _eodP3=endOfDay;endOfDay=function(){_eodP3();const f=perk('fans');if(f)S.hype+=f;
  const l=perk('lucky');if(l&&Math.random()<l*.03&&typeof vaultAdd==='function'){vaultAdd(S,Math.max(1,S.lv||1));if(!awayMode)log('Lucky streak: a free chest is waiting in the vault.','amber')}
  const q=perk('quarry');if(q&&S.day%10===0&&S.reb){S.reb.shards+=q;S.reb.total+=q;log(`Shard quarry: +${q} Resin Shards.`,'good')}};
/* ---------- Singularity printers in the shop ---------- */
if(typeof SING_P!=='undefined'&&!PGROUPS.includes('Singularity'))PGROUPS.push('Singularity');
const singForged=k=>!!(S&&S.sing&&S.sing.forged&&S.sing.forged[k]);
const singAny=()=>typeof SING_P!=='undefined'&&SING_P.some(x=>singForged(x.k));
function singLock(D){if(!D.sing)return '';const k=Object.keys(PRINTERS).find(t=>PRINTERS[t]===D);return singForged(k)?'':'Forge it once in the Singularity reactor to buy more'}
