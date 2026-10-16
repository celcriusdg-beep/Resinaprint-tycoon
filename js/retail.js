/* Retail (4.42): stores are part of Resinaprint but run as their own source of income.
   - Every store has its own till. Its sales go into the till, and the till pays its own stock, rent, clerks and events.
     On payday the store keeps a reserve and pays the rest to the studio as a dividend. If the till runs dry, the studio tops it up.
   - Retail level: all store sales earn retail XP. It survives rebirth and unlocks clerks, store levels, events and the Hobby & model shop.
   - Studio shelf: stores sell your studio's figures. The studio gets its normal price, the store keeps a 25% markup.
   - Real costs: rent grows with store level, clerks get raises, shoplifting, and a neglected store loses its reputation.
   - New stores take days to fit out before they open. */
const rtReb=()=>(S&&S.reb&&S.reb.count)||0;
LVL.push(3.6,4.8);
STORES.hobby={name:'Hobby & model shop',cost:120000,rent:3200,unit:9,sell:18,traffic:38,capB:260,pack:80,item:'model kits',
  req:()=>retailLvl()>=5&&rtReb()>=2,reqText:'Needs retail level 5 and 2 rebirths',merge:40000,mergeText:'Garage kits, statues and premium figures from your studio sell here twice as often.'};
{const r0=STORES.cafe.req;STORES.cafe.req=()=>r0()&&rtReb()>=1;STORES.cafe.reqText='Needs a workshop and 1 rebirth'}
if(typeof ST_ICO!=='undefined')ST_ICO.hobby='🛠️';
STORES.manga.sell=12;STORES.tcg.sell=6;STORES.cafe.sell=5.5;
const ST_BUILD={manga:3,tcg:4,cafe:5,hobby:7};
const stBuildDays=k=>Math.max(1,Math.ceil((ST_BUILD[k]||4)*(retailLvl()>=9?.5:1)));
/* ---------- retail level ---------- */
const RT_XP=[0,5e3,15e3,40e3,1e5,2.5e5,6e5,1.5e6,4e6,1e7];
const RT_UNL={2:'+1 clerk in every store',3:'Stores can reach level 3',4:'Prerelease events in the card shop',5:'Hobby & model shop (also needs 2 rebirths)',6:'+1 clerk in every store',7:'Stores can reach level 4',8:'Regional championships',9:'New stores fit out twice as fast',10:'Stores can reach level 5'};
const rtOf=()=>S.retail||(S.retail={xp:0});
function retailLvl(){const x=rtOf().xp;let l=1;while(l<RT_XP.length&&x>=RT_XP[l])l++;return l}
function rtGain(a){const l0=retailLvl();rtOf().xp+=a;const l=retailLvl();if(l>l0){log(`Retail level ${l}! ${RT_UNL[l]||''}`,'good');if(!awayMode&&!simulating){toast(`Retail level ${l}`);if(typeof confetti==='function')confetti(80)}}}
const rtClerkCap=st=>st.level*2+(retailLvl()>=2?1:0)+(retailLvl()>=6?1:0);
const rtMaxLevel=()=>2+(retailLvl()>=3?1:0)+(retailLvl()>=7?1:0)+(retailLvl()>=10?1:0);
const rtUpCost=(D,st)=>Math.round(D.cost*[.4,.8,1.6,3.2][st.level-1]);
const rtTraffic=st=>(.6+.8*(st.rep==null?60:st.rep)/100)*(1+.02*(retailLvl()-1));
const rtRent=(k,st)=>Math.round(STORES[k].rent*(1+.5*(st.level-1)));
/* ---------- the till ---------- */
const TILL_IN={'TCG store sales':'tcg','Card sales':'tcg','Event entry fees':'tcg'};
const TILL_IN_CTX=['Store sales','TCG store sales','Card sales','Event entry fees','Store markup'];
const TILL_OUT=['Store stock','Events','Grading','Store rent','Store wages','Store employer costs'];
if(typeof REB_OUTSIDE!=='undefined')REB_OUTSIDE.push('Store markup');
SALES.push('Store orders');
let tillK=null;
const inTill=(k,f)=>{const o=tillK;tillK=k;try{return f()}finally{tillK=o}};
const tillSt=k=>k&&S.stores&&S.stores[k]&&S.stores[k].open?S.stores[k]:null;
function tillInit(st){if(st.till==null)st.till=0;st.wk=st.wk||{in:0,out:0};if(st.rep==null)st.rep=60;if(st.shelf==null)st.shelf=1;if(st.auto==null)st.auto=1;return st}
const _earnTL=earn;earn=function(cat,a){
  const st=TILL_IN_CTX.includes(cat)?tillSt(tillK||TILL_IN[cat]):null,c0=S.cash;const r=_earnTL(cat,a);
  if(st&&a>0){const got=S.cash-c0;if(got>0){tillInit(st);S.cash-=got;st.till+=got;st.wk.in+=got;st.life=(st.life||0)+got;rtGain(got)}}
  return r};
const _spTL=spend;spend=function(cat,a){
  const st=TILL_OUT.includes(cat)?tillSt(tillK):null,c0=S.cash;const r=_spTL(cat,a);
  if(st&&a>0){tillInit(st);const paid=c0-S.cash,p=Math.max(0,Math.min(st.till,paid));st.till-=p;S.cash+=p;st.wk.out+=paid;if(paid>p)st.wk.top=(st.wk.top||0)+paid-p}
  return r};
/* the studio no longer pays store rent and clerks out of its own weekly bill: each till does */
const storeRent0=()=>Object.keys(S.stores).filter(k=>S.stores[k].open&&STORES[k]).reduce((a,k)=>a+STORES[k].rent,0);
function clerkWeek(k){const all=S.staff.reduce((a,s)=>a+s.wage,0);if(!all)return 0;const c=S.staff.filter(s=>s.role==='clerk'&&(k==null||s.store===k)).reduce((a,s)=>a+s.wage,0);return wages()*c/all*7}
const _wkRT=weekly;weekly=function(){const L=_wkRT.apply(this,arguments),sr=storeRent0(),cw=clerkWeek();
  for(const l of L){if(l[0]==='Rent')l[1]=Math.max(0,l[1]-sr);else if(l[0]==='Wages')l[1]=Math.max(0,Math.round(l[1]-cw));else if(l[0]==='Employer costs')l[1]=Math.max(0,Math.round(l[1]-cw*EMP_COSTS))}
  return L.filter(l=>l[1]>0||l[0]==='Rent')};
function rtPayday(){
  let div=0,n=0;
  for(const k in S.stores){const st=S.stores[k],D=STORES[k];if(!st.open||!D)continue;tillInit(st);
    S.staff.filter(s=>s.role==='clerk'&&s.store===k).forEach(s=>{s.wk=(s.wk||0)+1;s.w0=s.w0||s.wage;const w=Math.round(s.w0*Math.min(1.6,1+.05*Math.floor(s.wk/4)));if(w>s.wage){s.wage=w;s.mood=clamp(s.mood+5,0,100);if(!awayMode&&Math.random()<.5)log(`${s.name} got a raise at the ${D.name.toLowerCase()}: ${fmt(w)} a day.`,'')}});
    const w=clerkWeek(k);
    inTill(k,()=>{spend('Store rent',rtRent(k,st));if(w){spend('Store wages',Math.round(w));if(S.biz.kvk)spend('Store employer costs',Math.round(w*EMP_COSTS))}});
    const reserve=Math.round((rtRent(k,st)+w*(1+EMP_COSTS))*2),d=st.auto?Math.max(0,Math.floor(st.till-reserve)):0;
    if(d>0){st.till-=d;S.cash+=d;st.divTot=(st.divTot||0)+d;div+=d;n++}
    st.lastWk={in:st.wk.in,out:st.wk.out,top:st.wk.top||0,lost:st.wk.lost||0,div:d};st.wk={in:0,out:0};
  }
  if(div){S.storeDiv=(S.storeDiv||0)+div;log(`Store dividend: ${fmt(div)} from ${n} store${n>1?'s':''} to the studio.`,'good')}
}
const _pdRT=payday;payday=function(){rtPayday();return _pdRT.apply(this,arguments)};
/* ---------- the daily store simulation, rebuilt around the till ---------- */
const SHELF_OK={manga:P=>true,tcg:P=>P.ref<=80,cafe:P=>P.ref<=45,hobby:P=>P.ref>=60};
function rtShelf(k,st,D,mult){
  st.shelfLast=0;if(!st.shelf||(k==='manga'&&st.merged))return;
  const ok=SHELF_OK[k]||(()=>true),ks=PKEYS.filter(p=>S.listed[p]&&sellable(p)&&ok(PRODUCTS[p])&&freeStock(p)>0);if(!ks.length)return;
  let n=poisson(D.traffic*mult*.05*(k==='hobby'&&st.merged?2:1)),got=0,mk=0;
  while(n-->0){const live=ks.filter(p=>freeStock(p)>0);if(!live.length)break;const p=pick(live),pr=S.prices[p];S.stock[p]--;S.sold++;got+=pr;mk+=pr*.25;st.shelfLast++}
  if(got){inTill(null,()=>earn('Store orders',got));S.revenue+=got;earn('Store markup',Math.round(mk*100)/100)}
}
function rtStoresDay(){
  for(const k in S.stores){const st=S.stores[k],D=STORES[k];if(!D)continue;
    if(!st.open){if(st.build&&S.day>=st.build){st.open=true;delete st.build;tillInit(st);log(`The ${D.name.toLowerCase()} is fitted out and open. Stock it and give it a clerk.`,'good');if(!awayMode&&!simulating){toast(`${D.name} is open!`);if(typeof confetti==='function')confetti(90)}}continue}
    tillInit(st);
    const clerks=S.staff.filter(s=>s.role==='clerk'&&s.store===k),cap=D.capB*st.level,open=clerks.length>0||S.shift[k]===S.day;st.last=0;
    st.rep=open&&st.stock>=cap*.1?Math.min(100,st.rep+1):Math.max(5,st.rep-3);
    if(!open)continue;
    const mult=LVL[st.level-1]*Math.sqrt(typeof hypeMult==='function'?hypeMult():1+S.hype/80)*rtTraffic(st);
    inTill(k,()=>{
      const sold=Math.min(st.stock,Math.round(poisson(D.traffic*mult)*1.3));st.stock-=sold;
      if(sold){earn('Store sales',sold*D.sell);S.revenue+=sold*D.sell}
      st.last=sold*D.sell;
      if(st.stock>0&&Math.random()<Math.max(.04,.3-.07*clerks.length)){const t=Math.min(st.stock,Math.ceil(st.stock*(.01+Math.random()*.03)));st.stock-=t;st.wk.lost=(st.wk.lost||0)+t*D.unit;if(!awayMode&&t*D.unit>=40&&Math.random()<.35)log(`Shoplifters took ${t} ${D.item} from the ${D.name.toLowerCase()}. More clerks keep an eye out.`,'bad')}
      rtShelf(k,st,D,mult);
      if(D.spoil)st.stock=Math.floor(st.stock*.3);
      if(clerks.length&&st.stock<cap*.4){const want=Math.floor(cap*.8)-st.stock,c=want*D.unit;if(st.till+S.cash>c+500){spend('Store stock',c);st.stock+=want}}
    });
    if(st.merged&&k==='manga'){const walk=poisson(D.traffic*mult*.06);let f=0;for(let i=0;i<walk;i++){const ks=PKEYS.filter(p=>freeStock(p)>0&&S.listed[p]);if(!ks.length)break;ship({p:pick(ks),age:0},true);f++}if(f&&!awayMode)log(`${f} figure${f>1?'s':''} sold at the manga store counter.`,'good')}
    clerks.forEach(s=>s.mood=clamp(s.mood+.5,0,100));
  }
}
storesDay=function(){rtStoresDay();const st=S.stores.tcg;if(!st||!st.open)return;const T=STORES.tcg,t0=T.traffic;T.traffic=t0*rtTraffic(st);try{inTill('tcg',tsDay)}finally{T.traffic=t0}};
/* ---------- actions ---------- */
const _rsRT=A.restock;A.restock=function(d){return inTill(d.k,()=>_rsRT.call(this,d))};
for(const a of ['tsBuy','tsAcc','tsGrade','tsSlab']){const f=A[a];if(f)A[a]=function(d){return inTill('tcg',()=>f.call(this,d))}}
{const f=A.tsEvent;A.tsEvent=function(d){if(d.k==='pre'&&retailLvl()<4)return toast('Prereleases need retail level 4');if(d.k==='champ'&&retailLvl()<8)return toast('Championships need retail level 8');return inTill('tcg',()=>f.call(this,d))}}
Object.assign(A,{
  openStore(d){if(needKvk())return;const D=STORES[d.k];if(!D||S.stores[d.k])return;if(!D.req())return toast(D.reqText);const days=stBuildDays(d.k);
    confirmBox(`Open a ${D.name.toLowerCase()}?`,`Costs ${fmt(D.cost)} to fit out and takes ${days} days before it opens. Rent is ${fmt(D.rent)} a week and grows with the store level. The store runs its own till: it pays its stock, rent and clerks and sends its profit to the studio every payday.`,()=>{
      if(S.cash<D.cost)return toast('Not enough cash');spend('Stores',D.cost);S.stores[d.k]={open:false,build:S.day+days,level:1,stock:0,merged:false,last:0,till:0,rep:60};log(`The fit-out of your ${D.name.toLowerCase()} has started. It opens on day ${S.day+days}.`,'good')})},
  storeUp(d){const D=STORES[d.k],st=S.stores[d.k];if(!st)return;if(st.level>=rtMaxLevel())return toast(st.level>=5?'Max level':`Level ${st.level+1} needs retail level ${[3,7,10][st.level-2]||3}`);const c=rtUpCost(D,st);if(S.cash<c)return toast('Not enough cash');spend('Stores',c);st.level++;log(`${D.name} upgraded to level ${st.level}. Rent is now ${fmt(rtRent(d.k,st))} a week.`,'good')},
  clerk(d){if(needKvk())return;const st=S.stores[d.k];if(!st||!st.open)return;if(S.staff.filter(s=>s.role==='clerk'&&s.store===d.k).length>=rtClerkCap(st))return toast('No room for more clerks. Level up the store or your retail level');addStaff('clerk',d.k)},
  tillTake(d){const st=S.stores[d.k];if(!st||!(st.till>0))return;const a=Math.floor(st.till);st.till-=a;S.cash+=a;st.divTot=(st.divTot||0)+a;toast(`${fmt(a)} moved to the studio`)},
  tillAdd(d){const st=S.stores[d.k];if(!st)return;const a=Math.min(Math.max(0,Math.floor(S.cash)),Math.max(1000,Math.round(rtRent(d.k,st)*2)));if(a<=0)return toast('Not enough cash');tillInit(st);S.cash-=a;st.till+=a;toast(`${fmt(a)} put in the till`)},
  tillAuto(d){const st=S.stores[d.k];if(!st)return;tillInit(st);st.auto=st.auto?0:1;toast(st.auto?'Weekly dividend on':'Profit stays in the till')},
  shelfTog(d){const st=S.stores[d.k];if(!st)return;tillInit(st);st.shelf=st.shelf?0:1;toast(st.shelf?'Studio shelf on':'Studio shelf off')}
});
/* ---------- views ---------- */
function rtCard(){
  const l=retailLvl(),x=rtOf().xp,nx=RT_XP[l],pv=RT_XP[l-1]||0;
  return `<div class="card rt-card"><div class="rt-top"><div class="rt-badge"><b>${l}</b><span>retail</span></div><div class="grow"><div class="t">Retail level ${l}</div><div class="s">Every euro your stores take in is 1 retail XP. Kept through rebirths. +${(l-1)*2}% customers in every store.</div></div></div>
    ${nx?`<div style="margin-top:10px">${bar((x-pv)/(nx-pv)*100,'var(--uv)')}<div class="kv"><span>${Math.round(x).toLocaleString("nl-NL")} / ${nx.toLocaleString("nl-NL")} XP</span><span>Next: ${RT_UNL[l+1]}</span></div></div>`:'<div class="s" style="margin-top:8px"><b class="good">Max retail level</b></div>'}
    <div class="rt-unl">${Object.keys(RT_UNL).filter(n=>n<=l+2).map(n=>`<i class="${l>=n?'on':''}">${l>=n?'✓':'🔒'} ${n} · ${RT_UNL[n]}</i>`).join('')}${l+2<10?`<i>+${10-l-2} more</i>`:''}</div></div>`;
}
function tillCard(k){
  const st=tillInit(S.stores[k]),D=STORES[k],w=clerkWeek(k),cost=rtRent(k,st)+w*(1+EMP_COSTS),L=st.lastWk;
  return `<div class="card rt-till"><div class="t">Till <b class="num ${st.till<cost?'bad':''}">${fmt(st.till)}</b></div><div class="s">The store pays its own stock, rent (${fmt(rtRent(k,st))}/wk) and clerks (${fmt(w)}/wk) from here. ${st.auto?`On payday it keeps ${fmt(cost*2)} and sends the rest to the studio.`:'Weekly dividend is off: profit stays in the till.'}</div>
    <div class="rt-wk"><div><b>${fmt(st.wk.in)}</b><span>in this week</span></div><div><b>${fmt(st.wk.out)}</b><span>out this week</span></div><div><b>${L?fmt(L.div):'—'}</b><span>last dividend</span></div><div><b>${fmt(st.divTot||0)}</b><span>paid to studio</span></div></div>
    ${L&&(L.top||L.lost)?`<div class="s" style="margin-top:6px">${L.top?`<span class="bad">The studio topped up ${fmt(L.top)} last week.</span> `:''}${L.lost?`Shoplifting cost ${fmt(L.lost)}.`:''}</div>`:''}
    <div class="opts"><button class="btn sm primary" data-a="tillTake" data-k="${k}" ${st.till>=1?'':'disabled'}>Take ${fmt(Math.floor(st.till))} now</button><button class="btn sm" data-a="tillAdd" data-k="${k}">Top up</button><button class="btn sm ${st.auto?'':'ghost'}" data-a="tillAuto" data-k="${k}">Weekly dividend ${st.auto?'on':'off'}</button></div></div>`;
}
storeBasics=function(k){
  const D=STORES[k],st=tillInit(S.stores[k]),clerks=S.staff.filter(s=>s.role==='clerk'&&s.store===k).length,cap=D.capB*st.level,openToday=clerks>0||S.shift[k]===S.day,mx=rtMaxLevel(),cc=rtClerkCap(st);
  const up=st.level>=5?'':st.level>=mx?`<button class="btn sm ghost" disabled>Level ${st.level+1}: retail ${[3,7,10][st.level-2]||3}</button>`:`<button class="btn sm ghost" data-a="storeUp" data-k="${k}">Level ${st.level+1} · ${fmt(rtUpCost(D,st))}</button>`;
  return tillCard(k)+`<div class="card"><div class="t">${D.name} <span class="chip">Level ${st.level}/${Math.max(st.level,mx)}</span> ${openToday?'<span class="chip good">Open today</span>':'<span class="chip bad">Closed: no clerk</span>'}</div><div class="s">Yesterday ${fmt(st.last||0)} in ${D.item}${st.shelfLast?` · ${st.shelfLast} studio figure${st.shelfLast>1?'s':''} sold`:''}</div>
    <div style="margin-top:10px">${bar(st.rep,st.rep>=60?'var(--good)':st.rep>=30?'var(--amber)':'var(--bad)')}<div class="kv"><span>Reputation <b>${Math.round(st.rep)}</b>/100</span><span>${st.rep>=60?'Customers love it':st.rep>=30?'Could be better':'Customers stay away'}</span></div></div>
    <div style="margin-top:10px">${bar(st.stock/cap*100,'var(--amber)')}<div class="kv"><span>Stock <b>${st.stock}/${cap}</b> ${D.item}</span><span>Clerks <b>${clerks}/${cc}</b></span></div></div>
    <div class="s" style="margin-top:6px">Keep it staffed and stocked to grow its reputation. Closed days or empty shelves cost reputation. More clerks mean less shoplifting.</div>
    <div class="opts"><button class="btn sm primary" data-a="restock" data-k="${k}">Restock ${fmt(Math.min(D.pack,cap-st.stock)*D.unit)}</button>${clerks?'':`<button class="btn sm uv" data-a="shift" data-k="${k}" ${S.shift[k]===S.day?'disabled':''}>Work a shift</button>`}<button class="btn sm" data-a="clerk" data-k="${k}" ${clerks>=cc?'disabled':''}>+ Clerk €85/day</button>${up}${st.merged?'':`<button class="btn sm ghost" data-a="merge" data-k="${k}">Merge ${fmt(D.merge)}</button>`}${st.merged&&k==='cafe'?`<button class="btn sm uv" data-a="workshop" ${S.cds.work?'disabled':''}>${S.cds.work?`Workshop in ${S.cds.work} d`:'Paint workshop'}</button>`:''}</div></div>
    <div class="card"><div class="t">Studio shelf <button class="btn sm ${st.shelf?'primary':'ghost'}" style="float:right" data-a="shelfTog" data-k="${k}">${st.shelf?'On':'Off'}</button></div><div class="s">${k==='manga'&&st.merged?'Merged: your figures already sell at the counter.':`Customers buy figures from your studio stock here: ${k==='tcg'?'keychains, busts, deck boxes and other pieces up to €80':k==='cafe'?'small pieces up to €45':k==='hobby'?'garage kits, statues and premium figures':'any listed figure'}. The studio gets its normal price, the store keeps a 25% markup.`}</div></div>`;
};
/* Shop › Stores: building, owned and new stores */
storesView=function(){
  let h=rtCard();const own=Object.keys(STORES).filter(k=>S.stores[k]),closed=Object.keys(STORES).filter(k=>!S.stores[k]);
  if(own.length){h+=label('Your stores','each runs its own till')+`<div class="group">`;
    for(const k of own){const D=STORES[k],st=S.stores[k];h+=item(`${ST_ICO[k]||''} ${D.name}`,st.open?`Level ${st.level} · till ${fmt(st.till||0)} · yesterday ${fmt(st.last||0)}`:`<span class="f">Fitting out · opens on day ${st.build}</span>`,st.open?`<button class="btn sm primary" data-a="goStore" data-k="${k}">Manage</button>`:`<span class="chip amber">${Math.max(0,st.build-S.day)} d</span>`)}
    h+='</div>'}
  if(closed.length){h+=label('Open a store','fit-out takes a few days')+`<div class="group">`;
    for(const k of closed){const D=STORES[k],ok=D.req();h+=item(`${ST_ICO[k]||''} ${D.name}`,ok?`Sells ${D.item} · ${fmt(D.rent)}/week · ${stBuildDays(k)} days to fit out`:`<span class="f">${D.reqText}</span>`,`<button class="btn sm primary" data-a="openStore" data-k="${k}" ${!ok||S.cash<D.cost?'disabled':''}>${fmt(D.cost)}</button>`)}
    h+='</div>'}
  return h;
};
const _vsRT=VIEWS.stores;VIEWS.stores=function(){const h=_vsRT.apply(this,arguments);if(h.indexOf('class="ts-pick"')<0)return h;return sub.store!=='tcg'||!sub.tss||sub.tss==='floor'?h+rtCard():h};
