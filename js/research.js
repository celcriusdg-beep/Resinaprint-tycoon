/* R&D lab (4.16): fund research projects that take game time and can fail. Breakthroughs are permanent and survive rebirth.
   Technicians and engineers raise the odds, and every failure makes the next attempt at that project more likely to work. */
const RD=[
  {id:'photo1',n:'Rapid photopolymer',d:'Prints 6% faster',cost:8000,h:24,ch:.85,fx:{spd:.06}},
  {id:'fep1',n:'Anti-adhesion film',d:'15% fewer failed prints',cost:12000,h:36,ch:.8,fx:{fail:.15}},
  {id:'mkt1',n:'Market analytics',d:'+5% demand for everything',cost:15000,h:36,ch:.8,fx:{dem:.05}},
  {id:'ergo1',n:'Ergonomic workflow',d:'Staff and machines work 8% faster',cost:20000,h:48,ch:.75,fx:{staff:.08}},
  {id:'route1',n:'Route optimisation',d:'Shipping costs 6% less',cost:25000,h:48,ch:.75,fx:{ship:.06}},
  {id:'viral1',n:'Viral content lab',d:'+3 hype every day',cost:30000,h:48,ch:.7,fx:{hype:3}},
  {id:'roy1',n:'Royalty negotiation',d:'IP royalties 3 points lower',cost:60000,h:72,ch:.65,fx:{roy:.03},need:()=>typeof IP_GAMES!=='undefined'&&IP_GAMES.some(G=>S.up['ip_'+G.id]),needT:'Own an IP licence'},
  {id:'photo2',n:'Rapid photopolymer II',d:'Prints another 10% faster',cost:80000,h:72,ch:.65,fx:{spd:.10},req:'photo1'},
  {id:'fep2',n:'Nano-coated vats',d:'Another 25% fewer failed prints',cost:150000,h:96,ch:.6,fx:{fail:.25},req:'fep1'},
  {id:'mkt2',n:'Predictive demand AI',d:'Another +10% demand',cost:300000,h:120,ch:.55,fx:{dem:.10},req:'mkt1'},
  {id:'ergo2',n:'Robotics integration',d:'Staff and machines another 15% faster',cost:500000,h:120,ch:.55,fx:{staff:.15},req:'ergo1'},
  {id:'route2',n:'Drone last mile',d:'Shipping another 12% cheaper',cost:700000,h:144,ch:.5,fx:{ship:.12},req:'route1'},
  {id:'roy2',n:'Exclusive IP partnership',d:'IP royalties another 4 points lower',cost:1200000,h:168,ch:.45,fx:{roy:.04},req:'roy1'},
  {id:'photo3',n:'Quantum curing',d:'Prints another 20% faster',cost:1500000,h:168,ch:.45,fx:{spd:.20},req:'photo2'},
  {id:'mkt3',n:'Cultural trend engine',d:'Another +15% demand and +5 hype a day',cost:4000000,h:240,ch:.4,fx:{dem:.15,hype:5},req:'mkt2'}
];
const RD_BY=Object.fromEntries(RD.map(x=>[x.id,x]));
const rdOf=()=>S.rd||(S.rd={done:{},fails:{},run:[],benches:1});
const rdFx=k=>Object.keys(rdOf().done).reduce((a,id)=>a+((RD_BY[id]&&RD_BY[id].fx[k])||0),0);
const rdBonus=()=>Math.min(.2,.05*S.staff.filter(s=>s.role==='tech'||s.role==='engineer').length);
const rdChance=x=>Math.min(.97,x.ch+rdBonus()+.15*(rdOf().fails[x.id]||0));
const rdCan=x=>!rdOf().done[x.id]&&!rdOf().run.some(r=>r.id===x.id)&&(!x.req||rdOf().done[x.req])&&(!x.need||x.need());
const RD_BENCH_COST=[0,100000,750000];
/* ---------- hooks ---------- */
const _jh10=jobHours;jobHours=function(p){return _jh10(p)/(1+rdFx('spd'))};
const _ej10=endJob;endJob=function(p){const f=Math.min(.8,rdFx('fail'));if(f&&p.job){const D=PRINTERS[p.type];p.job.rf-=(D.fail+p.job.rf)*f}_ej10(p)};
const _dem10=demand;demand=function(k){return _dem10(k)*(1+rdFx('dem'))};
const _st10=staffTask;staffTask=function(s){const r=_st10(s);if(r&&r.h)r.h/=1+rdFx('staff');return r};
const _pc10=parcelCost;parcelCost=function(p,dest,cid){const c=_pc10(p,dest,cid),f=Math.min(.5,rdFx('ship'));return f?Math.max(.5,c*(1-f)):c};
function rdApplyRoyalty(){if(typeof IP_GAMES==='undefined')return;const cut=rdFx('roy');for(const G of IP_GAMES)for(const [k] of G.figs)if(PRODUCTS[k])PRODUCTS[k].royalty=Math.max(.02,G.roy-cut)}
const _eod10=endOfDay;endOfDay=function(){_eod10();const h=rdFx('hype');if(h)S.hype+=h};
const _hs10=hourStep;hourStep=function(){
  _hs10();if(S.over||!S.rd)return;const R=rdOf();
  for(const r of [...R.run]){r.left-=1;if(r.left>0)continue;
    R.run=R.run.filter(x=>x!==r);const x=RD_BY[r.id];if(!x)continue;
    if(Math.random()<r.ch){R.done[x.id]=S.day;rdApplyRoyalty();log(`Breakthrough: ${x.n}. ${x.d}.`,'good');if(!awayMode&&!simulating){if(typeof confetti==='function')confetti(70);if(typeof snd==='function')snd('level')}}
    else{R.fails[x.id]=(R.fails[x.id]||0)+1;const back=Math.round(x.cost*.3);earn('Research refund',back);log(`Research failed: ${x.n}. ${fmt(back)} came back, and the next attempt is 15% more likely to work.`,'bad');if(!awayMode&&!simulating&&typeof snd==='function')snd('bad')}
  }
};
const _rb10=doRebirth;doRebirth=function(d){const o=S;const g=_rb10(d);if(o.rd){S.rd=o.rd;S.rd.run=[]}rdApplyRoyalty();return g};
const _rs10=restartRun;restartRun=function(){const o=S;_rs10();if(o.rd){S.rd=o.rd;S.rd.run=[]}rdApplyRoyalty()};
const _patch10=patch;patch=function(s){const r=_patch10(s);setTimeout(rdApplyRoyalty,0);return r};
Object.assign(A,{
  rdStart(d){const x=RD_BY[d.k],R=rdOf();if(!x||!rdCan(x))return;if(R.run.length>=R.benches)return toast('All lab benches are busy');if(S.cash<x.cost)return toast('Not enough cash');
    spend('Research',x.cost);R.run.push({id:x.id,left:x.h,total:x.h,ch:rdChance(x)});log(`Research started: ${x.n}.`,'amber');if(typeof snd==='function')snd('buy')},
  rdBench(){const R=rdOf(),c=RD_BENCH_COST[R.benches];if(!c)return;if(S.cash<c)return toast('Not enough cash');spend('Research',c);R.benches++;toast(`Lab bench ${R.benches} ready`);if(typeof snd==='function')snd('buy')}
});
function rdView(){
  const R=rdOf(),done=RD.filter(x=>R.done[x.id]),can=RD.filter(rdCan),locked=RD.filter(x=>!R.done[x.id]&&!rdCan(x)&&!R.run.some(r=>r.id===x.id));
  const fx=[['spd','faster prints'],['fail','fewer failures'],['dem','demand'],['staff','faster staff'],['ship','cheaper shipping'],['roy','royalty cut'],['hype','hype a day']].map(([k,t])=>{const v=rdFx(k);return v?`<span class="chip good">${k==='hype'?'+'+v:k==='roy'?'−'+Math.round(v*100)+' pts':(k==='ship'||k==='fail'?'−':'+')+Math.round(v*100)+'%'} ${t}</span>`:''}).join('');
  let h=label('R&D lab',`${done.length} of ${RD.length} breakthroughs · ${R.benches} bench${R.benches>1?'es':''}`);
  h+=`<div class="card rd-hero"><div class="s">Fund research that takes game time and can fail. Breakthroughs are permanent, even through rebirth. Technicians and engineers add up to +20% success; every failure adds +15% to that project's next try and refunds 30%.</div>${fx?`<div class="bonus" style="margin-top:10px">${fx}</div>`:''}
    ${R.benches<3?`<div class="opts"><button class="btn sm" data-a="rdBench" ${S.cash<RD_BENCH_COST[R.benches]?'disabled':''}>Add a lab bench · ${fmt(RD_BENCH_COST[R.benches])}</button></div>`:''}</div>`;
  h+=label('Running',`${R.run.length} of ${R.benches} benches`);
  h+=R.run.length?R.run.map(r=>{const x=RD_BY[r.id],pct=100*(1-r.left/r.total);return `<div class="card rd-run"><div class="rd-h"><span class="rd-ico">⚗</span><div class="grow"><div class="t">${x.n}</div><div class="s">${x.d} · ${Math.round(r.ch*100)}% chance</div></div><b class="num">${Math.ceil(r.left)} h</b></div><div class="bar" style="margin-top:10px"><i style="width:${pct}%"></i></div></div>`}).join(''):`<div class="card"><div class="s">No research running. Start a project below.</div></div>`;
  if(can.length)h+=label('Available')+`<div class="group">${can.map(x=>`<div class="item"><div class="grow"><div class="t">${x.n} <span class="chip">${Math.round(rdChance(x)*100)}%</span>${R.fails[x.id]?` <span class="chip amber">${R.fails[x.id]} failed</span>`:''}</div><div class="s">${x.d} · ${x.h} game hours</div></div><button class="btn sm primary" data-a="rdStart" data-k="${x.id}" ${S.cash<x.cost||R.run.length>=R.benches?'disabled':''}>${fmt(x.cost)}</button></div>`).join('')}</div>`;
  if(locked.length)h+=label('Locked')+`<div class="group">${locked.map(x=>`<div class="item rd-lock"><div class="grow"><div class="t">${x.n}</div><div class="s">${x.d} · <span class="f">${x.req?`Needs ${RD_BY[x.req].n}`:x.needT||''}</span></div></div><span class="chip">${fmt(x.cost)}</span></div>`).join('')}</div>`;
  if(done.length)h+=label('Breakthroughs')+`<div class="group">${done.map(x=>`<div class="item"><div class="grow"><div class="t">${x.n} <span class="chip good">Done</span></div><div class="s">${x.d}</div></div></div>`).join('')}</div>`;
  return h;
}
