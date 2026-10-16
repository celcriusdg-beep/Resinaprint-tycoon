/* Progress (4.43)
   - Quality tiers per figure: every product shows a tier D, C, B, A or S, from the quality of what you made lately
     (resin, printer, painters, post-processing, inspectors, paint tier). Better tiers sell at higher prices.
   - Market reach: how many orders a day customers can find you for. It grows with your space, sales channels,
     level and rebirths, so 2000+ orders a day only happens in the late game. Demand above your reach tapers off. */
const QT=[{t:'D',min:-9,m:.9,c:'#8a8f98',n:'Rough'},{t:'C',min:0,m:1,c:'#9fd3ff',n:'Decent'},{t:'B',min:.2,m:1.08,c:'#5bd6a6',n:'Good'},{t:'A',min:.4,m:1.18,c:'#ffb547',n:'Excellent'},{t:'S',min:.65,m:1.3,c:'#ff6dd8',n:'Masterpiece'}];
function qTier(k){const q=(S.qual&&S.qual[k])||0;let r=QT[0];for(const x of QT)if(q>=x.min)r=x;return r}
const qNext=k=>{const i=QT.indexOf(qTier(k));return QT[i+1]||null};
/* ---------- market reach ---------- */
const REACH=[12,35,90,220,550,1400];
let reachF=1,reachTot=0;
function reachCap(){
  const ch=Object.keys(S.ch||{}).filter(k=>S.ch[k]).length;
  return Math.round(REACH[Math.min(S.ws||0,REACH.length-1)]*(1+.3*((S.reb&&S.reb.count)||0))*(1+.004*(S.lv||1))*(1+.08*Math.max(0,ch-1)));
}
function calcReach(){reachF=1;let t=0;for(const k of PKEYS)if(sellable(k))t+=demand(k);reachTot=t;const C=reachCap();reachF=t>0?C*Math.tanh(t/C)/t:1;return reachF}
const _demPG=demand;demand=function(k){const d=_demPG(k);if(!(d>0))return d;return d*Math.pow(qTier(k).m,2.2)*reachF};
const _hsPG=hourStep;hourStep=function(){calcReach();return _hsPG.apply(this,arguments)};
/* ---------- views ---------- */
const qChip=k=>{const T=qTier(k);return `<span class="chip qt" style="--qc:${T.c}" title="${T.n} quality">${T.t} · ${T.n}</span>`};
const _ccPG=catCard;catCard=function(k){let h=_ccPG(k);const i=h.indexOf('<div class="cat-st">');if(i>=0){const j=i+'<div class="cat-st">'.length;h=h.slice(0,j)+qChip(k)+' '+h.slice(j)}
  const m=h.indexOf('<div class="cat-more">');if(m>=0){const j=m+'<div class="cat-more">'.length;h=h.slice(0,j)+qBreak(k)+h.slice(j)}
  return h};
const _cvPG=catalogView;catalogView=function(){const h=_cvPG.apply(this,arguments);calcReach();const C=reachCap(),eff=reachTot*reachF;
  const card=`<div class="card rc-card"><div class="kv"><span><b>Market reach</b> · ${Math.round(eff)} of ${C} orders/day</span><span>${reachF<.9?'<span class="bad">at your limit</span>':'room to grow'}</span></div>${bar(Math.min(100,eff/C*100),reachF<.9?'var(--bad)':'var(--good)')}<div class="s" style="margin-top:4px">How many customers can find you. It grows with a bigger space, more sales channels, your level and every rebirth.${reachF<.99?` Demand is ${Math.round((1-reachF)*100)}% lower than it could be.`:''}</div></div>`;
  return card+h};

/* ---------- quality score breakdown (4.48) ---------- */
if(typeof PAINT_T!=='undefined')PAINT_T.forEach(t=>{if(!/quality/.test(t.d))t.d+=` · +${t.q.toFixed(2)} quality`});
function qParts(k){
  const ps=S.printers.filter(p=>p.prod===k),avg=f=>ps.length?ps.reduce((a,p)=>a+f(p),0)/ps.length:null;
  const team=sumRole('post',s=>.01*((s.lvl||1)-1)+(s.trait==='careful'?.04:0))+sumRole('painter',s=>.01*((s.lvl||1)-1)+(s.trait==='careful'?.04:0)),insp=sumRole('inspector',s=>.03*skill(s)),up=upv('qual');
  const pt=typeof paintT==='function'?paintT(k):0;
  return {n:ps.length,resin:avg(p=>(RESINS[p.resin]&&RESINS[p.resin].q)||0),printer:avg(p=>PRINTERS[p.type].q||0),up,team,insp,bonus:qualBonus(),paint:pt&&typeof PAINT_T!=='undefined'?PAINT_T[pt].q:0,paintN:pt&&typeof PAINT_T!=='undefined'?PAINT_T[pt].n:'Basic'};
}
function qBreak(k){
  const T=qTier(k),N=qNext(k),P=qParts(k),cur=(S.qual&&S.qual[k])||0,f=v=>`${v>=0?'+':''}${v.toFixed(2)}`;
  const tgt=P.n?P.resin+P.printer+P.bonus+P.paint:null,TT=tgt==null?null:QT.slice().reverse().find(x=>tgt>=x.min);
  const row=(n,v,sub)=>`<div><span>${n}${sub?` <small>${sub}</small>`:''}</span><b class="${v>0?'good':v<0?'bad':''}">${v==null?'—':f(v)}</b></div>`;
  return `<div class="qb"><div class="qb-h"><span>Quality score <b style="color:${T.c}">${cur.toFixed(2)} · ${T.t}</b></span>${tgt!=null?`<span>heading to <b style="color:${TT.c}">${tgt.toFixed(2)} · ${TT.t}</b></span>`:''}</div>
    <div class="qb-rows">${row('Resin',P.resin,P.n?`${P.n} printer${P.n>1?'s':''} on it`:'no printer on it')}${row('Printer',P.printer)}${row('Upgrades',Math.min(.35,P.up),'lamp, airbrush, booth, quality lab')}${row('Painters & post-processors',P.team,'+0.01 per level, +0.04 careful')}${row('Inspectors',P.insp,'+0.03 × skill')}${row('Paint tier',P.paint,P.paintN)}</div>
    <div class="s">Team, upgrades and inspectors together count up to +0.35 (now ${f(P.bonus)}). Tiers: D below 0 · C 0 · B 0.20 · A 0.40 · S 0.65. Each finished print moves the score 40% of the way to its new value.
    Customers accept prices ${T.m>=1?'+':''}${Math.round((T.m-1)*100)}% for ${T.t}.${N?` Next: <b style="color:${N.c}">${N.t}</b> at ${N.min.toFixed(2)}.`:''}</div></div>`;
}
