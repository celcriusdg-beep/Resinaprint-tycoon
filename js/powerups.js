/* Power-ups (4.14): a crate gacha in the Shop. Power-ups come in 12 rarities for staff, machines and printers.
   Equip as many as you like from Items; a unit takes the look of its rarest power-up. New printers, staff and machines start without one. */
const PU_RAR=[
  {n:'Common',c:'#aeb3bf'},{n:'Uncommon',c:'#4fd08a'},{n:'Rare',c:'#4f9dff'},{n:'Epic',c:'#a56bff'},{n:'Legendary',c:'#ffc23a'},{n:'Mythic',c:'#ff5a2a'},
  {n:'Divine',c:'#fff1b8'},{n:'Celestial',c:'#5fd4ff'},{n:'Cosmic',c:'#c75bff'},{n:'Ethern',c:'#e8f3ff'},{n:'Primordial',c:'#d4162f'},{n:'Singular',c:'#ffffff'}
];
const PU_VAL=[.02,.03,.05,.07,.10,.14,.19,.25,.33,.43,.56,.75];
const PU_CAT={
  staff:{n:'Staff',who:'people',stats:{spd:'Focus charm',spirit:'Spirit badge'}},
  mach:{n:'Machine',who:'machines',stats:{spd:'Overclock chip',cool:'Cryo coolant'}},
  printer:{n:'Printer',who:'printers',stats:{spd:'Turbo laser',prec:'Precision optics'}}
};
const PU_STAT_TXT={spd:'faster work',spirit:'mood every day',cool:'faster work',prec:'fewer failed prints'};
const PU_CRATES=[
  {id:'scrap',n:'Scrap crate',cost:2500,shift:0,floor:0,d:'Mostly common parts. Sometimes a lucky find.'},
  {id:'tech',n:'Tech crate',cost:25000,shift:.22,floor:0,d:'Better odds, never junk for long.'},
  {id:'elite',n:'Elite crate',cost:250000,shift:.38,floor:1,d:'Uncommon or better, every time.'},
  {id:'mythic',n:'Mythic crate',cost:2500000,shift:.52,floor:2,d:'Rare or better. Real chance at Divine.'},
  {id:'void',n:'Void crate',shards:15,shift:.66,floor:3,d:'Paid in Resin Shards. The only crate where Singular drops often.'}
];
const PU_W=[1000,550,300,160,80,40,18,8,3.5,1.4,.5,.15];
const puOf=()=>S.pu||(S.pu={items:[],opened:0,best:-1});
const puName=r=>`<b class="rn r${Math.min(r,9)} ${r>=10?'r'+r:''}" aria-label="${PU_RAR[r].n}">${[...PU_RAR[r].n].map((c,j)=>`<i class="c" aria-hidden="true" style="--i:${j}">${c}</i>`).join('')}</b>`;
const puLabel=it=>`${PU_RAR[it.r].n} ${PU_CAT[it.cat].stats[it.stat]}`;
const puOdds=C=>{const w=PU_W.map((x,i)=>i<C.floor?0:x*Math.exp(C.shift*i)),t=w.reduce((a,b)=>a+b,0);return w.map(x=>x/t)};
/* units */
const unitKey=(kind,id)=>kind+':'+id;
const unitExists=k=>{const[t,id]=k.split(':');return t==='p'?S.printers.some(p=>p.id==id):S.staff.some(s=>s.id==id)};
const puAt=k=>puOf().items.filter(x=>x.at===k);
const puFree=()=>puOf().items.filter(x=>!x.at||!unitExists(x.at));
function unitRar(k){let r=-1;for(const x of puOf().items)if(x.at===k&&x.r>r)r=x.r;return r}
const puEff=T=>4*(1-Math.exp(-T/4));
function puBonus(k,stat){let T=0;for(const x of puOf().items)if(x.at===k&&x.stat===stat)T+=PU_VAL[x.r];return puEff(T)}
const unitCat=k=>{if(k[0]==='p')return 'printer';const s=S.staff.find(x=>'s:'+x.id===k);return s&&s.mach?'mach':'staff'};
function unitName(k){const[t,id]=k.split(':');if(t==='p'){const p=S.printers.find(x=>x.id==id);return p?short(p):'?'}const s=S.staff.find(x=>x.id==id);return s?s.name:'?'}
/* look: classes and an effects layer for any card */
const puCls=k=>{const r=unitRar(k);return r<0?'':` ru ru-${r}`};
const puFx=k=>{const r=unitRar(k);if(r<0)return '';const n=puAt(k).length;return `<i class="ru-fx" aria-hidden="true"><i></i><i></i><i></i></i><span class="ru-badge" style="--rc:${PU_RAR[r].c}">${PU_RAR[r].n}${n>1?' ×'+n:''}</span>`};
/* ---------- hooks ---------- */
const _jh8=jobHours;jobHours=function(p){return _jh8(p)/(1+puBonus('p:'+p.id,'spd'))};
const _ej8=endJob;endJob=function(p){const b=puBonus('p:'+p.id,'prec');if(b&&p.job){const D=PRINTERS[p.type],red=(D.fail+p.job.rf)*Math.min(.9,b*.5);p.job.rf-=red}_ej8(p)};
const _st8=staffTask;staffTask=function(s){const r=_st8(s);if(r&&r.h){const k='s:'+s.id;r.h/=1+puBonus(k,'spd')+puBonus(k,'cool')}return r};
const _eod8=endOfDay;endOfDay=function(){_eod8();for(const s of S.staff){const b=puBonus('s:'+s.id,'spirit');if(b&&!s.mach)s.mood=Math.min(100,s.mood+12*b)}};
const _rb8=doRebirth;doRebirth=function(d){const o=S;const g=_rb8(d);S.pu=o.pu;if(S.pu)S.pu.items.forEach(x=>x.at=null);return g};
const _rs8=restartRun;restartRun=function(){const o=S;_rs8();S.pu=o.pu;if(S.pu)S.pu.items.forEach(x=>x.at=null)};
/* ---------- gacha ---------- */
function puRoll(C){
  const o=puOdds(C);let x=Math.random(),r=0;for(;r<11;r++){x-=o[r];if(x<0)break}
  const cats=Object.keys(PU_CAT),cat=cats[Math.floor(Math.random()*cats.length)],stats=Object.keys(PU_CAT[cat].stats),stat=stats[Math.floor(Math.random()*stats.length)];
  return{id:nid(),cat,stat,r,at:null};
}
function puOpen(id,n){
  const C=PU_CRATES.find(x=>x.id===id);if(!C)return;
  const price=C.shards?C.shards*n*(n>1?.9:1):C.cost*n*(n>1?.9:1);
  if(C.shards){if(rebOf(S).shards<Math.ceil(price))return toast('Not enough Resin Shards');rebOf(S).shards-=Math.ceil(price)}
  else{if(S.cash<price)return toast('Not enough cash');spend('Power crates',price)}
  const got=[];for(let i=0;i<n;i++){const it=puRoll(C);puOf().items.push(it);got.push(it)}
  const P=puOf();P.opened+=n;const best=got.reduce((a,b)=>b.r>a.r?b:a);P.best=Math.max(P.best,best.r);
  puReveal(C,got,best);
}
function puReveal(C,got,best){
  const R=PU_RAR[best.r];
  if(typeof snd==='function')snd('chest_open',Math.min(9,best.r));if(best.r>=4)confetti(40+best.r*12);
  pending=[{f:()=>{}},{f:()=>{tab='team';sub.team='powers'}}];
  modal(`<div class="vrv pu-rv ru-${best.r}" style="--rc:${R.c};--pow:${(.4+best.r*.06).toFixed(2)}"><div class="vrv-fx"><i class="vflash"></i><i class="vrays"></i><i class="vhalo"></i></div>
    <div class="pu-orb ru-${best.r}"><span class="pu-core"></span>${puIcon(best)}</div>
    <div class="vshow"><div class="kicker">${C.n}${got.length>1?' · '+got.length+' power-ups':''}</div><div class="vname">${puName(best.r)}</div>
    <div class="pu-got">${got.slice().sort((a,b)=>b.r-a.r).map(it=>`<div class="pu-row" style="--rc:${PU_RAR[it.r].c}"><span class="pu-dot"></span><span class="grow">${puLabel(it)}</span><small>${PU_CAT[it.cat].n} · +${Math.round(PU_VAL[it.r]*100)}% ${PU_STAT_TXT[it.stat]}</small></div>`).join('')}</div></div></div>
    <div class="acts" style="margin-top:12px"><button class="btn primary" data-choice="1">Equip them in Team › Power-ups</button><button class="btn" data-choice="0">Later</button></div>`);
}
const PU_ICO={spd:'<path d="M9 1 3 9h4l-1 6 6-8H8z"/>',spirit:'<path d="M8 14s-5-3.2-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 3.8-5 7-5 7z"/>',cool:'<path d="M8 1v14M2 4.5l12 7M2 11.5l12-7"/>',prec:'<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3"/>'};
const puIcon=it=>`<svg class="pu-ico" viewBox="0 0 16 16" aria-hidden="true">${PU_ICO[it.stat]}</svg>`;
/* ---------- actions ---------- */
Object.assign(A,{
  puOpen(d){puOpen(d.k,+d.n||1)},
  puEquip(d){
    const P=puOf(),ref=P.items.find(x=>x.id==d.id);if(!ref)return;
    const list=ref.cat==='printer'?S.printers.map(p=>({v:'p:'+p.id,l:`${short(p)} <small>${puAt('p:'+p.id).length} held</small>`})):S.staff.filter(s=>ref.cat==='mach'?s.mach:!s.mach&&s.role!=='clerk').map(s=>({v:'s:'+s.id,l:`${s.name} <small>${ROLES[s.role]?ROLES[s.role].name:''} · ${puAt('s:'+s.id).length} held</small>`}));
    if(!list.length)return toast(`You have no ${PU_CAT[ref.cat].who} to equip`);
    chooseTarget(`Equip ${puLabel(ref)}`,`+${Math.round(PU_VAL[ref.r]*100)}% ${PU_STAT_TXT[ref.stat]}. A unit can hold any number of power-ups.`,list,k=>{ref.at=k;toast(`Equipped on ${unitName(k)}`);if(typeof snd==='function')snd('perk');render()});
  },
  puAuto(){ /* hand out every free power-up to the unit of the right kind with the fewest */
    let n=0;for(const it of puFree()){const ks=it.cat==='printer'?S.printers.map(p=>'p:'+p.id):S.staff.filter(s=>it.cat==='mach'?s.mach:!s.mach&&s.role!=='clerk').map(s=>'s:'+s.id);if(!ks.length)continue;
      ks.sort((a,b)=>puAt(a).length-puAt(b).length);it.at=ks[0];n++}
    toast(n?`Equipped ${n} power-up${n>1?'s':''}`:'Nothing to equip');
  },
  puOff(d){const it=puOf().items.find(x=>x.id==d.id);if(it){it.at=null;toast('Back in your inventory')}},
  puFuse(d){
    const [cat,stat,r]=d.k.split('|'),rr=+r;if(rr>=11)return;
    const pool=puFree().filter(x=>x.cat===cat&&x.stat===stat&&x.r===rr);if(pool.length<3)return toast('You need 3 of the same');
    const P=puOf();pool.slice(0,3).forEach(x=>P.items.splice(P.items.indexOf(x),1));const it={id:nid(),cat,stat,r:rr+1,at:null};P.items.push(it);P.best=Math.max(P.best,it.r);
    toast(`Fused into ${puLabel(it)}`);if(typeof snd==='function')snd('forge');if(it.r>=4)confetti(30+it.r*8);
  },
  puUnit(d){puLoadout(d.k)},
  goPowers(){tab='team';sub.team='powers';window.scrollTo({top:0})},
  goCrates(){tab='buy';sub.buy='crates';window.scrollTo({top:0})}
});
function puLoadout(k){
  const r=unitRar(k),its=puAt(k).sort((a,b)=>b.r-a.r),cat=unitCat(k),stats=Object.keys(PU_CAT[cat].stats);
  pending=[{f:()=>{}}];
  modal(`<div class="pu-load${puCls(k)}" style="--rc:${r>=0?PU_RAR[r].c:'#555'}">${puFx(k)}<div class="kicker">${PU_CAT[cat].n} loadout</div><h3 style="margin:4px 0">${unitName(k)}</h3>
    <div class="s">${r>=0?`Rarity: ${puName(r)}`:'No rarity yet. Equip a power-up to give it one.'}</div>
    <div class="pu-tot">${stats.map(st=>`<div><b>+${Math.round(puBonus(k,st)*100)}%</b><span>${PU_CAT[cat].stats[st]}<br><small>${PU_STAT_TXT[st]}</small></span></div>`).join('')}</div></div>
    <div class="pu-list">${its.length?its.map(it=>`<div class="pu-row" style="--rc:${PU_RAR[it.r].c}"><span class="pu-dot"></span><span class="grow">${puLabel(it)} <small>+${Math.round(PU_VAL[it.r]*100)}%</small></span><button class="btn sm ghost" data-choice="0" onclick="A.puOff({id:'${it.id}'})">Remove</button></div>`).join(''):'<div class="s" style="padding:8px 2px">Nothing equipped. Open crates in Shop › Power crates.</div>'}</div>
    <div class="acts" style="margin-top:12px"><button class="btn primary" data-choice="0">Close</button></div>`);
}
/* ---------- views ---------- */
function cratesView(){
  const P=puOf();
  let h=`<div class="card pu-hero"><div class="kicker">Power crates · ${P.opened} opened${P.best>=0?' · best '+PU_RAR[P.best].n:''}</div><div class="s" style="margin-top:6px">Every crate holds a power-up for your staff, machines or printers, in one of 12 rarities. Rarer ones are much stronger, and the unit takes on their look. Fuse three of the same into one of the next rarity.</div></div>`;
  for(const C of PU_CRATES){
    const o=puOdds(C),can=C.shards?rebOf(S).shards>=C.shards:S.cash>=C.cost,can10=C.shards?rebOf(S).shards>=Math.ceil(C.shards*9):S.cash>=C.cost*9;
    h+=`<div class="card pu-crate pc-${C.id}"><div class="pc-h"><span class="pc-art"><i></i></span><div class="grow"><div class="t">${C.n}</div><div class="s">${C.d}</div></div></div>
      <div class="pc-odds">${o.map((x,i)=>x>0?`<span style="--rc:${PU_RAR[i].c}" title="${PU_RAR[i].n}"><i></i>${x>=.1?(x*100).toFixed(0):x>=.001?(x*100).toFixed(x>=.01?1:2):'<.1'}%</span>`:'').join('')}</div>
      <div class="acts"><button class="btn sm primary" data-a="puOpen" data-k="${C.id}" data-n="1" ${can?'':'disabled'}>Open · ${C.shards?C.shards+' shards':fmt(C.cost)}</button><button class="btn sm" data-a="puOpen" data-k="${C.id}" data-n="10" ${can10?'':'disabled'}>Open 10 · ${C.shards?Math.ceil(C.shards*9)+' shards':fmt(C.cost*9)}</button></div></div>`;
  }
  return h;
}
function puInvView(){
  const free=puFree();if(!free.length&&!puOf().items.length)return '';
  const groups={};for(const it of free){const g=it.cat+'|'+it.stat+'|'+it.r;(groups[g]=groups[g]||[]).push(it)}
  const keys=Object.keys(groups).sort((a,b)=>+b.split('|')[2]-+a.split('|')[2]);
  let h=label('Power-ups',`${free.length} free · ${puOf().items.length-free.length} equipped`)+`<div class="opts" style="margin:0 0 8px"><button class="btn sm primary" data-a="puAuto" ${free.length?'':'disabled'}>Auto-equip all</button><button class="btn sm" data-a="goPowers">See units</button></div><div class="group">`;
  if(!keys.length)h+='<div class="empty">All your power-ups are equipped.</div>';
  for(const g of keys){const L=groups[g],it=L[0];
    h+=`<div class="item pu-item" style="--rc:${PU_RAR[it.r].c}"><span class="pu-gem ru-${it.r}">${puIcon(it)}</span><div class="grow"><div class="t">${puName(it.r)} <span class="pu-sn">${PU_CAT[it.cat].stats[it.stat]}</span>${L.length>1?` <span class="chip">×${L.length}</span>`:''}</div><div class="s">${PU_CAT[it.cat].n} · +${Math.round(PU_VAL[it.r]*100)}% ${PU_STAT_TXT[it.stat]}</div></div>
      <div style="display:grid;gap:6px"><button class="btn sm primary" data-a="puEquip" data-id="${it.id}">Equip</button>${L.length>=3&&it.r<11?`<button class="btn sm" data-a="puFuse" data-k="${g}">Fuse 3</button>`:''}</div></div>`}
  return h+'</div>';
}
function powersView(){
  const units=[...S.staff.filter(s=>s.role!=='clerk').map(s=>'s:'+s.id),...S.printers.map(p=>'p:'+p.id)];
  let h=label('Power-ups',`${units.length} units · ${puFree().length} free power-ups`)+`<div class="opts" style="margin:0 0 8px"><button class="btn sm primary" data-a="puAuto" ${puFree().length?'':'disabled'}>Auto-equip free power-ups</button><button class="btn sm" data-a="goCrates">Open crates</button></div>`;
  if(!units.length)return h+'<div class="card"><div class="s">Hire people, build machines or buy printers first.</div></div>';
  h+='<div class="pu-grid">';
  for(const k of units){const r=unitRar(k),n=puAt(k).length,cat=unitCat(k),stats=Object.keys(PU_CAT[cat].stats);
    h+=`<button class="pu-unit${puCls(k)}" data-a="puUnit" data-k="${k}" style="--rc:${r>=0?PU_RAR[r].c:'#3a3d48'}">${puFx(k)}<span class="pu-uk">${PU_CAT[cat].n}</span><b>${unitName(k)}</b><span class="pu-un">${n?`${n} power-up${n>1?'s':''}`:'No power-ups'}</span><span class="pu-us">${stats.map(st=>{const b=puBonus(k,st);return b?`+${Math.round(b*100)}% ${PU_STAT_TXT[st].split(' ')[0]}`:''}).filter(Boolean).join(' · ')||'&nbsp;'}</span></button>`}
  return h+'</div>';
}
