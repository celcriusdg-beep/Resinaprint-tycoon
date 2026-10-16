/* Rebirth 2 (4.2): glitching black-matter Resin Shards, ten unusual perks, and a redesigned Rebirth page. */
let _shId=0;
shardSvg=(px,cls)=>{
  const id='sh'+(++_shId),big=/big/.test(cls||'');
  const blob='M24 3c8 2 14 8 16 16 3 8 1 17-3 23-4 7-11 12-17 11C13 52 7 46 6 37 4 28 7 18 12 11c3-4 7-7 12-8z';
  return `<svg class="shard ${cls||''}" viewBox="-10 -6 68 76" width="${px}" height="${Math.round(px*76/68)}" aria-hidden="true"><defs>
    ${big?`<filter id="${id}f" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".035 .06" numOctaves="2" seed="4" result="n"><animate attributeName="baseFrequency" dur="6s" values=".035 .06;.06 .03;.035 .06" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>`:''}
    <radialGradient id="${id}g" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#241236"/><stop offset=".5" stop-color="#030106"/><stop offset="1" stop-color="#000"/></radialGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a3bff" stop-opacity="0"/><stop offset=".5" stop-color="#e0a8ff"/><stop offset="1" stop-color="#ff3fb4" stop-opacity="0"/></linearGradient></defs>
    ${big?`<g class="sh-ring"><ellipse cx="24" cy="32" rx="30" ry="8" fill="none" stroke="url(#${id}r)" stroke-width="1.6" transform="rotate(-18 24 32)"/></g>`:''}
    <g class="sh-ca1"><path d="${blob}" fill="#ff2fa8" opacity=".75"/></g><g class="sh-ca2"><path d="${blob}" fill="#27e3ff" opacity=".75"/></g>
    <g ${big?`filter="url(#${id}f)"`:''}><path d="${blob}" fill="url(#${id}g)" stroke="#9a5cff" stroke-width="1.4"/><path d="M14 16c4-5 11-6 15-3" stroke="#d9b8ff" stroke-width="1.2" fill="none" opacity=".6" stroke-linecap="round"/><path d="M30 40c3-4 4-9 2-13" stroke="#6b2cff" stroke-width="1" fill="none" opacity=".7"/></g>
    ${big?`<g class="sh-bits">${[0,1,2,3,4,5].map(i=>`<circle class="sh-bit" style="--a:${i*60}deg;--d:${i*.7}s" r="${1+(i%3)*.5}" cx="24" cy="32" fill="${i%2?'#e0a8ff':'#7a3bff'}"/>`).join('')}</g><rect class="sh-scan" x="0" y="0" width="48" height="2" fill="#fff" opacity=".07"/>`:''}</svg>`;
};
const glit=(t,cls)=>`<span class="gl ${cls||''}" data-t="${t}">${t}</span>`;
shardN=n=>`<span class="shardn">${shardSvg(14)}<b class="num">${glit(n)}</b></span>`;
/* ---- new perks (every one has a real hook below) ---- */
const _newPerks=[
  {id:'heir',cat:'Legacy',n:'Heirloom',base:6,max:10,d:l=>`Keep ${l*2}% of your cash through a rebirth`},
  {id:'bank',cat:'Legacy',n:'Shard bank',base:4,max:10,d:l=>`Unspent shards earn ${l*5}% interest on every rebirth`},
  {id:'kit',cat:'Legacy',n:'Starter kit',base:6,max:3,d:l=>`Each run begins with ${l} printer${l>1?'s':''} waiting in storage`},
  {id:'phoenix',cat:'Legacy',n:'Phoenix',base:12,max:1,d:()=>`Once per run, your first bank rescue is free: debts gone, no loan`},
  {id:'echo',cat:'Economy',n:'Echo sale',base:4,max:10,d:l=>`${l*3}% of online sales pay out double`},
  {id:'mark',cat:'Economy',n:'Event horizon',base:6,max:10,d:l=>`Online sales fetch +${l}% more, pulled in from the dark`},
  {id:'interest',cat:'Economy',n:'Compound interest',base:4,max:8,d:l=>`Your cash grows ${(l*.1).toFixed(1)}% a day (max ${fmt(l*400)})`},
  {id:'ghost',cat:'Production',n:'Ghost shift',base:5,max:10,d:l=>`${l*4}% a game hour that an order packs itself, free`},
  {id:'dupe',cat:'Production',n:'Void forge',base:5,max:10,d:l=>`${l*3}% of finished figures appear twice`},
  {id:'fate',cat:'Vault',n:'Fate',base:5,max:4,d:l=>`New runs start with the vault ${l*2} opens into its pity timer`}
];
const _perkCat={head:'Legacy',dem:'Economy',xp:'Production',luck:'Vault',rsn:'Economy',spd:'Production',en:'Production',keys:'Vault',gain:'Legacy'};
PERKS.forEach(p=>p.cat=p.cat||_perkCat[p.id]);PERKS.push(..._newPerks);
const _ico=d=>`<path d="${d}"/>`;
Object.assign(PERK_ICO,{heir:'<path d="M2 12h12M3 12 2 5l3.5 3L8 3l2.5 5L14 5l-1 7"/>',bank:'<path d="M2 6.5 8 3l6 3.5M3.5 7v5M6.5 7v5M9.5 7v5M12.5 7v5M2 13h12"/>',kit:'<rect x="2" y="6" width="12" height="7" rx="1"/><path d="M6 6V4h4v2M2 9h12"/>',phoenix:'<path d="M8 14c-3-1-5-3-4-6 1 1 2 1 2 0-1-2 0-4 2-6 0 3 4 4 4 8 0 2-1 3-4 4z"/>',echo:'<circle cx="8" cy="8" r="2"/><circle cx="8" cy="8" r="4.6"/><circle cx="8" cy="8" r="7" opacity=".5"/>',mark:'<circle cx="8" cy="8" r="2.6" fill="currentColor"/><ellipse cx="8" cy="8" rx="7" ry="2.4"/>',interest:'<path d="M2 12c3 0 3-4 6-4s3-4 6-4M11 4h3v3"/>',ghost:'<path d="M3 14V7a5 5 0 0 1 10 0v7l-2-1.5L8 14l-3-1.5z"/><circle cx="6.2" cy="7.5" r=".6"/><circle cx="9.8" cy="7.5" r=".6"/>',dupe:'<rect x="2" y="4" width="8" height="9" rx="1"/><path d="M6 2h8v9"/>',fate:'<path d="M8 1.5l1.8 4 4.2.4-3.2 2.9.9 4.2L8 10.8 4.3 13l.9-4.2L2 5.9l4.2-.4z"/><circle cx="8" cy="7.5" r="1.2"/>'});
/* ---- hooks ---- */
const _ship2=shipSale;
shipSale=function(o,counter){
  const r=_ship2(o,counter);
  if(r&&!counter){
    const m=perk('mark'),e=perk('echo');
    if(m)r.price*=1+m*.01;
    if(e&&Math.random()<e*.03){r.price*=2;if(!awayMode&&Math.random()<.35)log(`Echo sale: ${PRODUCTS[r.p].name} paid double.`,'amber')}
  }
  return r;
};
const _fin2=finishOne;
finishOne=function(k){_fin2(k);const d=perk('dupe');if(d&&Math.random()<d*.03&&S.stock[k]!=null)S.stock[k]++};
const _hs2=hourStep;
hourStep=function(){
  _hs2();if(S.over)return;const g=perk('ghost');
  if(g&&Math.random()<g*.04&&typeof packableIdx==='function'&&packableIdx()>=0&&!(bayFull&&bayFull())){if(packOne()&&!awayMode)log('The ghost shift packed an order.','amber')}
};
const _eod2=endOfDay;
endOfDay=function(){
  _eod2();
  const i=perk('interest');if(i&&S.cash>0)earn('Interest',Math.min(i*400,S.cash*i*.001));
  if(S.over&&perk('phoenix')&&!S.phx){S.phx=1;S.over=false;S.cash=Math.max(S.cash,300);log('The Phoenix perk burned away your debts. One chance used.','amber')}
};
const _reb2=doRebirth;
doRebirth=function(dest){
  const old=S,cash=Math.max(0,old.cash),R=rebOf(old),bank=Math.floor(R.shards*.05*perk('bank'));
  const g=_reb2(dest);
  const h=perk('heir');if(h){S.cash+=Math.round(cash*h*.02)}
  if(bank){rebOf(S).shards+=bank;rebOf(S).total+=bank}
  _newRun();return g+bank;
};
const _rst2=restartRun;restartRun=function(){_rst2();_newRun()};
function _newRun(){
  const k=perk('kit');for(let i=0;i<k;i++)(S.pinv=S.pinv||[]).push({id:nid(),type:'mars'});
  const f=perk('fate');if(f){const v=vaultOf(S);v.pity=Math.max(v.pity||0,f*2)}
}
/* ---- page ---- */
const CAT_ICO={Legacy:'Carried over',Economy:'Money',Production:'Workshop',Vault:'Luck'};
function perkRow(P,R){
  const l=perk(P.id),max=l>=P.max,c=perkCost(P,l),pips=Array.from({length:Math.min(P.max,10)},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('');
  return `<div class="prk ${l?'own':''} ${max?'max':''}"><div class="perkico"><svg viewBox="0 0 16 16" aria-hidden="true">${PERK_ICO[P.id]}</svg></div><div class="grow"><div class="t">${P.n}</div><div class="s">${l?P.d(l):P.d(1)}${max||!l?'':` <span class="f">→ ${P.d(l+1)}</span>`}</div><div class="pips">${pips}</div></div>${max?'<span class="chip good">Max</span>':`<button class="btn sm shardbtn" data-a="perk" data-k="${P.id}" ${R.shards<c?'disabled':''}>${shardSvg(11)} ${c}</button>`}</div>`;
}
rebirthView=function(){
  const R=rebOf(S),v=value(S),ok=canRebirth(),g=shardGain(),carry=Math.round(Math.max(0,S.cash)*perk('heir')*.02);
  let h=label('Rebirth',`${R.count} rebirth${R.count===1?'':'s'} · ${R.total} shards earned`)+
  `<div class="card shardcard rbhero"><div class="rb-orb">${shardSvg(112,'big')}</div><div class="rb-n"><div class="s">Resin Shards</div><div class="shardbig num">${glit(R.shards,'lg')}</div></div>
  <div class="s" style="margin-top:6px;text-align:center">Black matter, pulled out of the resin. It does not stay where you put it.</div>
  <div style="margin-top:14px">${bar(Math.min(100,v/rebGoal()*100),'var(--uv)')}<div class="kv"><span>Company worth <b>${fmt(v)}</b> of <b>${fmt(rebGoal())}</b></span><span>Rebirth ${rebOf(S).count+1} goal · next one ×3</span></div></div>
  <div class="rbcols"><div><div class="k">You keep</div><ul><li>Resin Shards and perks</li><li>Vault, items, storage</li><li>Figure shelf, regulars</li><li>Branches in other countries</li>${carry?`<li>${fmt(carry)} heirloom cash</li>`:''}</ul></div><div><div class="k">You lose</div><ul><li>Cash, printers, staff</li><li>Stores and upgrades</li><li>Orders and stock</li></ul></div></div>
  <div class="opts"><button class="btn primary" data-a="rebirth" ${ok?'':'disabled'}>${ok?`Rebirth · +${g} shard${g===1?'':'s'}`:'Not ready yet'}</button></div></div>`;
  const br=Object.keys(R.branches||{});
  h+=label('World',`${ctryOf().f} ${ctryOf().n} · ${br.length} branch${br.length===1?'':'es'}`)+`<div class="card"><div class="bonus">${modChips(ctryOf().m,ctryOf().fav)||'<span class="chip">Standard rules</span>'}</div><div class="s" style="margin-top:10px">${br.length?`Your branches earn <b style="color:var(--ink)">${fmt(branchTotal())}</b> a day and give permanent perks.`:'Rebirth to open a new company in another country. The old one stays open as a branch and keeps paying out.'}</div>${br.length?`<div class="bonus" style="margin-top:8px">${br.map(k=>`<span class="chip amber">${COUNTRIES[k].f} ${COUNTRIES[k].bp}</span>`).join('')}</div>`:''}<div class="opts"><button class="btn sm uv" data-a="world">Open the world map</button></div></div>`;
  for(const cat of ['Economy','Production','Vault','Legacy']){
    h+=label(cat,CAT_ICO[cat]+' · survives every rebirth')+`<div class="group">${PERKS.filter(p=>p.cat===cat).map(p=>perkRow(p,R)).join('')}</div>`;
  }
  if(R.history.length)h+=label('Past companies')+`<div class="group">`+R.history.slice().reverse().map(x=>item(`Run ${x.n}${x.c?' · '+COUNTRIES[x.c].f+' '+COUNTRIES[x.c].n:''}`,`Day ${x.day} · worth ${fmt(x.value)} · ${x.sold} sold · level ${x.lv}`,`<span class="num">${shardN('+'+x.shards)}</span>`)).join('')+'</div>';
  return h;
};
