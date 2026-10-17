/* Company worth (4.35, fuller in 4.52): cash counts 10%. Worth is everything the company owns, each at 90% of what it cost,
   minus loans and BTW owed. The foundry is a separate business and stays out of it. */
const WORTH_KEEP=.9,WORTH_CASH=.10;
const tillSum=s=>Object.values((s&&s.stores)||{}).reduce((a,st)=>a+Math.max(0,st.till||0),0);
const WORTH_LEDGER=['Equipment','Fleet upgrades','Paint studio','Resin lab','Megaprojects'];
const _spW=spend;spend=function(cat,a){const c0=S.cash;const r=_spW(cat,a);if(WORTH_LEDGER.includes(cat)&&S.cash<c0){const L=S.assets||(S.assets={});L[cat]=(L[cat]||0)+(c0-S.cash)}return r};
function worthParts(s){
  const P={};
  /* 4.54: only printers placed in the studio count; printers waiting in storage do not */
  P.Printers=(s.printers||[]).reduce((a,p)=>a+(PRINTERS[p.type]?PRINTERS[p.type].cost:0),0);
  P.Machines=(s.staff||[]).filter(x=>x.mach).reduce((a,x)=>{const m=typeof MACH!=='undefined'&&MACH.find(y=>y.id===x.mach);return a+(m?m.cost:0)+(x.tuned||0)},0);
  P.Space=SPACES.slice(1,(s.ws||0)+1).reduce((a,w)=>a+w.cost,0)+(s.wsBuild&&SPACES[s.wsBuild.i]?SPACES[s.wsBuild.i].cost:0)+Object.keys((s.biz&&s.biz.perm)||{}).reduce((a,k)=>a+(s.biz.perm[k]&&PERMITS[k]?PERMITS[k].cost:0),0);
  /* 4.52: gear, channels, paint studio, resin lab and supplies count from what you own, so older purchases count too */
  P.Gear=(WASHERS[s.washer]?WASHERS[s.washer].cost:0)+Object.keys(s.car||{}).reduce((a,k)=>a+(s.car[k]&&CARRIERS[k]?CARRIERS[k].cost||0:0),0)
    +(typeof PAINT_EQ!=='undefined'&&s.paint?PAINT_EQ.reduce((a,e)=>a+(s.paint.eq&&s.paint.eq[e.id]?e.cost:0),0):0)
    +(typeof MIX_LV!=='undefined'&&s.mix?MIX_LV.slice(0,(s.mix.lv|0)+1).reduce((a,x)=>a+x.cost,0):0);
  P['Sales channels']=Object.keys(s.ch||{}).reduce((a,k)=>a+(s.ch[k]&&CHANNELS[k]?CHANNELS[k].cost||0:0),0);
  P.Resin=Object.keys(s.resin||{}).reduce((a,k)=>{const R=RESINS[k];return a+(R&&!R.mix?(s.resin[k]||0)/(R.vol||1000)*R.cost:0)},0);
  /* stores (4.43) count again now that they rebirth with the company: fit-out, levels, merges, shelf stock and card shop upgrades.
     Till money counts like cash. Riftbound packs and cards are kept through rebirth, so they stay out. */
  P.Stores=Object.keys(s.stores||{}).reduce((a,k)=>{const st=s.stores[k],D=STORES[k];if(!st||!D)return a;let t=D.cost+(st.merged?D.merge||0:0);for(let l=1;l<(st.level||1);l++)t+=Math.round(D.cost*[.4,.8,1.6,3.2][l-1]);return a+t+(st.stock||0)*D.unit},0);
  if(s.tcg&&typeof TS_UP!=='undefined'){const T=s.tcg;P.Stores+=TS_UP.reduce((a,u)=>{let t=0;for(let i=0;i<((T.up&&T.up[u.id])||0);i++)t+=u.cost[i]||0;return a+t},0)+Object.keys(T.acc||{}).reduce((a,k)=>a+(T.acc[k]||0)*((TS_ACC[k]&&TS_ACC[k].w)||0),0)}
  P.Upgrades=UPGRADES.reduce((a,u)=>a+(s.up&&s.up[u.id]&&typeof u.cost==='number'?u.cost:0),0);
  P.Moulds=Object.keys(s.moulds||{}).reduce((a,k)=>a+(s.moulds[k]&&PRODUCTS[k]&&typeof mouldCost==='function'?mouldCost(k):0),0);
  if(typeof DSP_UP!=='undefined'&&s.dsp)P.Dispatch=DSP_UP.reduce((a,u)=>{let t=0;for(let i=0;i<(s.dsp[u.id]||0);i++)t+=u.cost(i)||0;return a+t},0);
  if(typeof VEH!=='undefined'&&s.fleet&&s.fleet.own)P.Fleet=Object.keys(s.fleet.own).reduce((a,k)=>a+(VEH[k]?VEH[k].cost*(s.fleet.own[k]||0):0),0);
  if(typeof SR_ITEMS!=='undefined'&&s.show&&s.show.own){const Sh=s.show;P.Showroom=SR_LEASE+SR_SIZES.slice(1,(Sh.size||0)+1).reduce((a,z)=>a+z.cost,0)+Object.keys(Sh.styles||{}).reduce((a,k)=>a+(SR_STYLES[k]?SR_STYLES[k].cost:0),0)+(Sh.items||[]).reduce((a,it)=>a+(SR_ITEMS[it.t]?SR_ITEMS[it.t].cost:0),0)}
  P['Builds & fleet upgrades']=Object.keys(s.assets||{}).filter(k=>!['Equipment','Paint studio','Resin lab'].includes(k)).reduce((a,k)=>a+s.assets[k],0);
  /* figures: what one costs to make (resin, printer time, labour), and never less than 35% of its base price */
  const mk=k=>{const Pd=PRODUCTS[k];return Math.max((typeof unitCost==='function'?unitCost(k):0)+1.5+.12*Pd.ref+(Pd.h||2)*.3,Pd.ref*.35)};
  P['Figures in stock']=PKEYS.reduce((a,k)=>a+((s.stock&&s.stock[k])||0)*mk(k),0);
  P['Prints in progress']=PKEYS.reduce((a,k)=>a+(((s.unwashed&&s.unwashed[k])||0)+((s.cured&&s.cured[k])||0))*mk(k)*.8,0);
  return P;
}
value=function(s){
  s=s||S;const P=worthParts(s),gross=Object.values(P).reduce((a,v)=>a+v,0)*WORTH_KEEP;
  return gross+(Math.max(0,s.cash||0)+tillSum(s))*WORTH_CASH-(s.loans||[]).reduce((a,l)=>a+(l.bal||0),0)-Math.max(0,((s.biz&&s.biz.vatOut)||0)-((s.biz&&s.biz.vatIn)||0));
};
/* the company page explains it */
const _cvW=companyView;companyView=function(){const h=_cvW.apply(this,arguments),P=worthParts(S);
  const rows=Object.entries(P).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const card=`<div class="card wt-card"><div class="t">Company worth ${fmt(value(S))}</div><div class="s">Everything your company owns at 90% of what it cost, plus 10% of your cash, minus loans and BTW owed.</div>${rows.length?`<div class="wt-rows">${rows.map(([k,v])=>`<div><span>${k}</span><b>${fmt(v*WORTH_KEEP)}</b></div>`).join('')}${S.cash+tillSum(S)>0?`<div><span>Cash and store tills (10%)</span><b>${fmt((S.cash+tillSum(S))*WORTH_CASH)}</b></div>`:''}</div>`:''}</div>`;
  const i=h.indexOf('</div>',h.indexOf('<div class="label">'));return i<0?card+h:h.slice(0,i+6)+card+h.slice(i+6)};
