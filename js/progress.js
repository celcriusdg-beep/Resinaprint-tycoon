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
  const m=h.indexOf('<div class="cat-more">');if(m>=0){const T=qTier(k),N=qNext(k),j=m+'<div class="cat-more">'.length;h=h.slice(0,j)+`<div class="s qt-help">Quality <b style="color:${T.c}">${T.t}</b>: customers accept prices ${T.m>=1?'+':''}${Math.round((T.m-1)*100)}% vs a normal piece.${N?` Reach <b style="color:${N.c}">${N.t}</b> with better resin, better printers, skilled painters and post-processors, inspectors or a higher paint tier.`:' Top tier.'}</div>`+h.slice(j)}
  return h};
const _cvPG=catalogView;catalogView=function(){const h=_cvPG.apply(this,arguments);calcReach();const C=reachCap(),eff=reachTot*reachF;
  const card=`<div class="card rc-card"><div class="kv"><span><b>Market reach</b> · ${Math.round(eff)} of ${C} orders/day</span><span>${reachF<.9?'<span class="bad">at your limit</span>':'room to grow'}</span></div>${bar(Math.min(100,eff/C*100),reachF<.9?'var(--bad)':'var(--good)')}<div class="s" style="margin-top:4px">How many customers can find you. It grows with a bigger space, more sales channels, your level and every rebirth.${reachF<.99?` Demand is ${Math.round((1-reachF)*100)}% lower than it could be.`:''}</div></div>`;
  return card+h};
