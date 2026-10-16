/* Pacing (4.42): slows the mid and late game down.
   - Market saturation: every product has a market. Selling lots of one product fills it and its demand drops until it recovers.
   - Dutch taxes: inkomstenbelasting with real 2025 brackets per game year (zelfstandigenaftrek, MKB-winstvrijstelling,
     algemene heffingskorting, arbeidskorting), or for a BV vennootschapsbelasting plus box 2 on the half you pay out.
     Paid weekly as a prepayment on the profit so far this tax year, so the rate climbs as the year goes on.
   - Build times: moving to a bigger space, the foundry and foundry machines take days.
   - Rebirth unlocks: Anime café after 1 rebirth, megaprojects after 2, the foundry after 3. */
/* ---------- market saturation ---------- */
const SAT_DECAY=.85;
const satOf=()=>S.sat||(S.sat={});
/* 4.46: bigger spaces reach more buyers, so markets hold more. Recovery is faster when you rest a product:
   unlisted 35% a day, production stopped 25%, selling 15%. A product rested 3+ days comes back with a 4-day
   "back in stock" buzz (+25% demand). A fresh campaign clears 35% of the saturation, once a week per product. */
const satCap=k=>Math.max(4,(PRODUCTS[k].base||1)*150*(1+.15*Object.keys((S.reb&&S.reb.branches)||{}).length)*(1+.2*(S.ws||0)));
const satRate=k=>!S.listed[k]?.65:(S.stop&&S.stop[k])||(S.clear&&S.clear[k])?.75:SAT_DECAY;
const satBuzz=k=>S.buzz&&S.buzz[k]>=S.day;
const satAdCost=k=>Math.round((PRODUCTS[k].ref||20)*40*(1+(S.ws||0)));
const satDays=k=>{const l=satLvl(k);if(l<=.6)return 0;return Math.ceil(Math.log(.6/l)/Math.log(satRate(k)))};
const satLvl=k=>((S.sat&&S.sat[k])||0)/satCap(k);
const satMult=k=>1/(1+Math.pow(satLvl(k),1.5));
const _demPC=demand;demand=function(k){const d=_demPC(k);return d>0?d*satMult(k)*(satBuzz(k)?1.25:1):d};
const _toPC=takeOrders;takeOrders=function(k,n,wom){const t=_toPC(k,n,wom);if(t>0){const s=satOf();s[k]=(s[k]||0)+t}return t};
const _eodPC=endOfDay;endOfDay=function(){_eodPC();
  const s=satOf();for(const k in s){s[k]*=satRate(k);if(s[k]<.5)delete s[k]}
  S.rest=S.rest||{};S.buzz=S.buzz||{};
  for(const k of PKEYS){if(!S.listed[k]||(S.stop&&S.stop[k]))S.rest[k]=(S.rest[k]||0)+1;else{if((S.rest[k]||0)>=3&&!(S.stop&&S.stop[k])){S.buzz[k]=S.day+4;if(!awayMode&&!simulating)log(`${PRODUCTS[k].name} is back after a break: +25% demand for 4 days.`,'good')}delete S.rest[k]}}
  if(S.wsBuild&&S.day>=S.wsBuild.done){S.ws=S.wsBuild.i;const W=SPACES[S.ws];delete S.wsBuild;log(`The ${W.name.toLowerCase()} is ready. You moved in: room for ${W.printers} printers and ${W.staff} staff.`,'good');if(!awayMode&&!simulating){toast(`Moved into the ${W.name.toLowerCase()}`);if(typeof confetti==='function')confetti(90)}}
  const F=S.fnd;if(F&&F.own){
    if(F.build&&S.day>=F.build){delete F.build;log('The foundry hall is built. Buy your first casting machine.','good')}
    for(const m of F.mach)if(m.build&&S.day>=m.build){delete m.build;m.off=0;log(`${FD_TIERS[m.t].n} is installed and switched on.`,'good')}
  }
};
const satTxt=k=>{const l=satLvl(k),bz=satBuzz(k)?`<div class="cat-sat"><span style="color:var(--good)">Back in stock · +25% demand until day ${S.buzz[k]}</span></div>`:'';return l<.25?bz:bz+`<div class="cat-sat"><span>Market ${l<.6?'busy':l<1?'crowded':'flooded'}</span>${bar(Math.min(100,l*50),l<.6?'var(--amber)':'var(--bad)')}<small>demand ×${satMult(k).toFixed(2)} · ${!S.listed[k]?'resting: recovers 35% a day':(S.stop&&S.stop[k])?'production stopped: recovers 25% a day':'recovers 15% a day while selling'}${satDays(k)?` · about ${satDays(k)} d to busy`:''}</small>${S.listed[k]?`<div class="cat-acts" style="margin-top:6px"><button class="btn sm" data-a="satAd" data-k="${k}" ${S.satCd&&S.satCd[k]>S.day?'disabled':''}>${S.satCd&&S.satCd[k]>S.day?`Campaign again day ${S.satCd[k]}`:`Fresh campaign · ${fmt(satAdCost(k))}`}</button><small style="margin:0">or stop making / unlist it for a few days</small></div>`:''}</div>`};
A.satAd=function(d){const k=d.k,c=satAdCost(k);S.satCd=S.satCd||{};if(S.satCd[k]>S.day)return;if(S.cash<c)return toast('Not enough cash');spend('Marketing',c);const s=satOf();s[k]=(s[k]||0)*.65;S.satCd[k]=S.day+7;toast(`Fresh campaign for ${PRODUCTS[k].name}: market 35% calmer`)};
const _ccPC=catCard;catCard=function(k){const h=_ccPC(k),i=h.indexOf('<div class="cat-acts">');return i<0?h:h.slice(0,i)+satTxt(k)+h.slice(i)};
/* ---------- Dutch taxes ---------- */
const NL_TAX={ib:[[38441,.3582],[76817,.3748],[Infinity,.495]],zelf:2470,mkb:.127,vpb:[[200000,.19],[Infinity,.258]],box2:[[67804,.245],[Infinity,.31]],payout:.5};
const taxBrk=(x,B)=>{let t=0,lo=0;for(const [hi,r] of B){if(x<=lo)break;t+=(Math.min(x,hi)-lo)*r;lo=hi}return t};
const nlAhk=i=>Math.max(0,3068-Math.max(0,i-28406)*.06337);
const nlAk=i=>i<=12169?i*.08053:i<=26288?980+(i-12169)*.3003:i<=43071?5220+(i-26288)*.02258:Math.max(0,5599-(i-43071)*.0651);
function nlTaxYear(p){
  if(p<=0)return 0;
  if(S.biz.form==='bv'){const v=taxBrk(p,NL_TAX.vpb);return v+taxBrk((p-v)*NL_TAX.payout,NL_TAX.box2)}
  const t=Math.max(0,(p-NL_TAX.zelf)*(1-NL_TAX.mkb));return Math.max(0,taxBrk(t,NL_TAX.ib)-nlAhk(t)-nlAk(t));
}
function nlYear(){const b=S.biz,y=Math.floor((S.day-1)/YEAR);if(b.tyr!==y){if(b.tyr!=null&&b.ytd>0)log(`New tax year. Last year: ${fmt(b.ytd)} profit, ${fmt(b.ytdTax||0)} tax (${Math.round((b.ytdTax||0)/b.ytd*100)}%).`,'amber');b.tyr=y;b.ytd=0;b.ytdTax=0}}
incomeTax=function(base){
  const b=S.biz;nlYear();const y=Math.max(0,b.ytd||0),t=nlTaxYear(y+base)-nlTaxYear(y);
  return Math.max(0,Math.round(t*cm('tax')*(1-Math.min(.3,upv('tax')))*(1-Math.min(.2,sumRole('accountant',s=>.04*skill(s))))));
};
const _pdPC=payday;payday=function(){const b=S.biz;nlYear();const pre=b.taxBase+(b.wkInc-b.wkExp),t=b.kvk&&pre>0?incomeTax(pre):0;const r=_pdPC.apply(this,arguments);if(b.kvk&&pre>0){b.ytd=(b.ytd||0)+pre;b.ytdTax=(b.ytdTax||0)+t}return r};
function taxCard(){
  const b=S.biz;if(!b.kvk)return '';nlYear();const y=b.ytd||0,eff=y>0?nlTaxYear(y)/y:0,bv=b.form==='bv';
  const left=YEAR-((S.day-1)%YEAR);
  return `<div class="card tx-card"><div class="t">Belastingdienst · tax year ${b.tyr+1}</div><div class="s">${bv?'BV: vennootschapsbelasting 19% up to €200.000 and 25,8% above, plus box 2 (24,5% / 31%) on the half of the profit you pay yourself.':'Eenmanszaak: inkomstenbelasting 35,82% / 37,48% / 49,5%, after zelfstandigenaftrek (€2.470) and 12,7% MKB-winstvrijstelling, minus algemene heffingskorting and arbeidskorting.'} Paid every payday on the profit so far this year, so the rate rises as the year goes on.</div>
    <div class="rt-wk"><div><b>${fmt(y)}</b><span>profit this year</span></div><div><b>${fmt(b.ytdTax||0)}</b><span>tax paid</span></div><div><b>${Math.round(eff*100)}%</b><span>average rate</span></div><div><b>${left} d</b><span>year ends</span></div></div></div>`;
}
const _cvPC=companyView;companyView=function(){const h=_cvPC.apply(this,arguments),p=h.indexOf('>Permits<'),i=p<0?-1:h.lastIndexOf('<div class="label',p);return i<0?h+taxCard():h.slice(0,i)+taxCard()+h.slice(i)};
/* ---------- build times: spaces ---------- */
const WS_DAYS=[0,2,3,5,7,10];
A.move=function(d){const i=+d.k,W=SPACES[i],lk=moveLock(i);if(lk)return toast(lk);if(S.wsBuild)return toast(`The ${SPACES[S.wsBuild.i].name.toLowerCase()} is still being built`);const days=WS_DAYS[i]||5;
  confirmBox(`Move to ${W.name.toLowerCase()}?`,`Costs ${fmt(W.cost)} to set up and takes ${days} days to build. You keep working in your current space until it is ready. Rent becomes ${fmt(W.rent)} a week.`,()=>{
    if(S.cash<W.cost)return toast('Not enough cash');spend('Moving',W.cost);S.wsBuild={i,done:S.day+days};log(`Construction of the ${W.name.toLowerCase()} has started. Ready on day ${S.day+days}.`,'good')})};
const _vbPC=VIEWS.buy;VIEWS.buy=function(){const h=_vbPC.apply(this,arguments);if(sub.buy!=='space'||!S.wsBuild)return h;const W=SPACES[S.wsBuild.i],tot=WS_DAYS[S.wsBuild.i]||5,left=Math.max(0,S.wsBuild.done-S.day);
  const card=`<div class="card bd-card"><div class="t">🏗️ Building the ${W.name.toLowerCase()}</div><div style="margin-top:8px">${bar((1-left/tot)*100,'var(--amber)')}<div class="kv"><span>Ready on day ${S.wsBuild.done}</span><span>${left} day${left===1?'':'s'} to go</span></div></div></div>`;
  const i=h.indexOf('<div class="label"');return i<0?card+h:h.slice(0,i)+card+h.slice(i)};
/* ---------- build times: foundry ---------- */
const FD_BUILD=7,FD_MDAYS=[3,4,6,8,10];
{const f=A.fdBuy;A.fdBuy=function(){const was=!!(S.fnd&&S.fnd.own);f.apply(this,arguments);if(!was&&S.fnd&&S.fnd.own){S.fnd.build=S.day+FD_BUILD;log(`The foundry hall is under construction. Ready on day ${S.fnd.build}.`,'amber')}}}
{const f=A.fdMach;A.fdMach=function(d){const F=fdOf();if(F.build&&F.build>S.day)return toast(`The foundry hall is ready on day ${F.build}`);const n=F.mach.length;f.call(this,d);if(F.mach.length>n){const m=F.mach[F.mach.length-1];m.build=S.day+FD_MDAYS[m.t];m.off=1;log(`${FD_TIERS[m.t].n} is being installed. Ready on day ${m.build}.`,'amber')}}}
{const f=A.fdTog;A.fdTog=function(d){const m=fdOf().mach.find(x=>x.id==d.id);if(m&&m.build&&m.build>S.day)return toast(`Still being installed: ready on day ${m.build}`);return f.call(this,d)}}
const _fvPC=VIEWS.foundry;VIEWS.foundry=function(){
  const F=S.fnd;
    const h=_fvPC.apply(this,arguments);if(!F||!F.own)return h;let b='';
  if(F.build&&F.build>S.day)b+=`<div class="card bd-card"><div class="t">🏗️ The foundry hall is being built</div><div style="margin-top:8px">${bar((1-(F.build-S.day)/FD_BUILD)*100,'var(--amber)')}<div class="kv"><span>Ready on day ${F.build}</span><span>${F.build-S.day} days to go</span></div></div></div>`;
  for(const m of F.mach)if(m.build&&m.build>S.day)b+=`<div class="card bd-card"><div class="t">🔧 Installing the ${FD_TIERS[m.t].n}</div><div style="margin-top:8px">${bar((1-(m.build-S.day)/FD_MDAYS[m.t])*100,'var(--amber)')}<div class="kv"><span>Ready on day ${m.build}</span><span>${m.build-S.day} days to go</span></div></div></div>`;
  return b+h};
/* ---------- rebirth unlocks for the bigger systems ---------- */
const rtRebN=()=>(S&&S.reb&&S.reb.count)||0;
const REB_OTHER={1:['Anime café'],2:['Megaprojects','Hobby & model shop (with retail level 5)'],5:['The Foundry (€500M)','Casting tier 1'],6:['Casting tier 2'],7:['Casting tier 3'],8:['Casting tier 4'],9:['Casting tier 5']};
const _rnuPC=rebNextUnlocks;rebNextUnlocks=function(n){return _rnuPC(n).concat(REB_OTHER[n]||[])};
const _rgcPC=rebGateCard;rebGateCard=function(){const h=_rgcPC.apply(this,arguments),n=rtRebN();
  const row=`<div class="rg-row"><span>Business</span><div>${Object.keys(REB_OTHER).flatMap(k=>REB_OTHER[k].map(x=>n>=k?`<i class="on">${x}</i>`:`<i>🔒 ${x} · ${k}</i>`)).join('')}</div></div>`;
  const i=h.lastIndexOf('</div>');return h.slice(0,i)+row+h.slice(i)};
