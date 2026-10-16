/* Company worth (4.35): cash no longer counts. Worth is everything the company owns, each at 90% of what it cost,
   minus loans and BTW owed. The foundry and the stores are separate businesses and stay out of it. */
const WORTH_KEEP=.9,WORTH_CASH=.15;
const WORTH_LEDGER=['Equipment','Fleet upgrades','Paint studio','Resin lab','Megaprojects'];
const _spW=spend;spend=function(cat,a){const c0=S.cash;const r=_spW(cat,a);if(WORTH_LEDGER.includes(cat)&&S.cash<c0){const L=S.assets||(S.assets={});L[cat]=(L[cat]||0)+(c0-S.cash)}return r};
function worthParts(s){
  const P={};
  P.Printers=(s.printers||[]).reduce((a,p)=>a+(PRINTERS[p.type]?PRINTERS[p.type].cost:0),0)+(s.pinv||[]).reduce((a,p)=>a+(PRINTERS[p.type]?PRINTERS[p.type].cost:0),0);
  P.Machines=(s.staff||[]).filter(x=>x.mach).reduce((a,x)=>{const m=typeof MACH!=='undefined'&&MACH.find(y=>y.id===x.mach);return a+(m?m.cost:0)+(x.tuned||0)},0);
  P.Space=SPACES.slice(1,(s.ws||0)+1).reduce((a,w)=>a+w.cost,0);
  /* stores (4.39) are their own businesses and survive rebirth, so they stay out of company worth */
  P.Upgrades=UPGRADES.reduce((a,u)=>a+(s.up&&s.up[u.id]&&typeof u.cost==='number'?u.cost:0),0);
  P.Moulds=Object.keys(s.moulds||{}).reduce((a,k)=>a+(s.moulds[k]&&PRODUCTS[k]&&typeof mouldCost==='function'?mouldCost(k):0),0);
  if(typeof DSP_UP!=='undefined'&&s.dsp)P.Dispatch=DSP_UP.reduce((a,u)=>{let t=0;for(let i=0;i<(s.dsp[u.id]||0);i++)t+=u.cost(i)||0;return a+t},0);
  if(typeof VEH!=='undefined'&&s.fleet&&s.fleet.own)P.Fleet=Object.keys(s.fleet.own).reduce((a,k)=>a+(VEH[k]?VEH[k].cost*(s.fleet.own[k]||0):0),0);
  if(typeof SR_ITEMS!=='undefined'&&s.show&&s.show.own){const Sh=s.show;P.Showroom=SR_LEASE+SR_SIZES.slice(1,(Sh.size||0)+1).reduce((a,z)=>a+z.cost,0)+Object.keys(Sh.styles||{}).reduce((a,k)=>a+(SR_STYLES[k]?SR_STYLES[k].cost:0),0)+(Sh.items||[]).reduce((a,it)=>a+(SR_ITEMS[it.t]?SR_ITEMS[it.t].cost:0),0)}
  P['Equipment & builds']=Object.values(s.assets||{}).reduce((a,v)=>a+v,0);
  P.Stock=PKEYS.reduce((a,k)=>a+((s.stock&&s.stock[k])||0)*(typeof unitCost==='function'?unitCost(k):0),0);
  return P;
}
value=function(s){
  s=s||S;const P=worthParts(s),gross=Object.values(P).reduce((a,v)=>a+v,0)*WORTH_KEEP;
  return gross+Math.max(0,s.cash||0)*WORTH_CASH-(s.loans||[]).reduce((a,l)=>a+(l.bal||0),0)-Math.max(0,((s.biz&&s.biz.vatOut)||0)-((s.biz&&s.biz.vatIn)||0));
};
/* the company page explains it */
const _cvW=companyView;companyView=function(){const h=_cvW.apply(this,arguments),P=worthParts(S);
  const rows=Object.entries(P).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const card=`<div class="card wt-card"><div class="t">Company worth ${fmt(value(S))}</div><div class="s">Everything your company owns at 90% of what it cost, plus 15% of your cash, minus loans and BTW owed.</div>${rows.length?`<div class="wt-rows">${rows.map(([k,v])=>`<div><span>${k}</span><b>${fmt(v*WORTH_KEEP)}</b></div>`).join('')}${S.cash>0?`<div><span>Cash (15%)</span><b>${fmt(S.cash*WORTH_CASH)}</b></div>`:''}</div>`:''}</div>`;
  const i=h.indexOf('</div>',h.indexOf('<div class="label">'));return i<0?card+h:h.slice(0,i+6)+card+h.slice(i+6)};
