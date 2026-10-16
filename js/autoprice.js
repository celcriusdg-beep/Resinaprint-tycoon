/* Smart auto price (4.47). Once a day, for every product with Auto price on:
   - it tries a slightly lower, the current and a slightly higher price and keeps the one that earns the most profit a day
     (orders a day × profit per piece after fees, material, shipping and royalty)
   - when you are selling out you can only fill part of the demand, so a higher price usually wins
   - when the market is crowded or flooded it never lowers the price, and raises it unless that costs too much profit
   - the step grows while it keeps moving the same way (up to 15%) and halves when it turns around (down to 2%)
   - limits: never below cost + 15% or 65% of the base price, never above 180% of the base price × the quality tier bonus (S tier: up to 234%) */
const AP_MIN=.02,AP_MAX=.15,AP_START=.06;
/* printer time, packing and wear per piece: profit per piece does not count them, so cheap prices looked better than they are */
const apHandle=k=>{const P=PRODUCTS[k];return 1.5+.12*P.ref+(P.h||2)*.3};
const apOf=()=>S.ap||(S.ap={});
function apDemandAt(k,p){const o=S.prices[k];S.prices[k]=p;try{return demand(k)}finally{S.prices[k]=o}}
function apBounds(k){const P=PRODUCTS[k],cost=Math.max(0,-unitProfit(k,0))/Math.max(.3,1-CHANNELS.web.fee-(P.royalty||0)),q=typeof qTier==='function'?qTier(k).m:1;
  return [Math.max(1,Math.round(Math.max(P.ref*.65,cost*1.15))),Math.round(P.ref*1.8*q)]}
function autoPriceDay(){
  for(const k of PKEYS){
    if(!S.autoP[k]||!S.listed[k]||S.clear[k]||!sellable(k))continue;
    const A0=apOf(),st=A0[k]||(A0[k]={s:AP_START,dir:0}),p=S.prices[k],[lo,hi]=apBounds(k);
    const d=demand(k),days=S.stock[k]/Math.max(.05,d),sat=typeof satLvl==='function'?satLvl(k):0,soldOut=days<2&&d>.2;
    const pu=Math.min(hi,Math.round(p*(1+st.s)*100)/100),pd=Math.max(lo,Math.round(p*(1-st.s)*100)/100);
    const cap=soldOut?d*.6:Infinity,hand=apHandle(k),score=x=>Math.min(apDemandAt(k,x),cap)*(unitProfit(k,x)-hand);
    const s0=score(p),su=pu>p?score(pu):-Infinity,sd=pd<p&&!soldOut&&sat<.6?score(pd):-Infinity;
    let np=p,why='= best price';
    if(sat>=.6&&pu>p&&su>=s0*.9){np=pu;why=sat>=1?'↑ flooded market':'↑ crowded market'}
    else if(soldOut&&pu>p&&su>=s0){np=pu;why='↑ selling out'}
    else if(su>s0&&su>=sd){np=pu;why='↑ more profit'}
    else if(sd>s0){np=pd;why=days>8?'↓ stock piling up':'↓ more profit'}
    if(p<lo){np=lo;why='↑ below cost'}else if(p>hi){np=hi;why='↓ above the limit'}
    const dir=np>p?1:np<p?-1:0;
    st.s=dir&&dir===st.dir?Math.min(AP_MAX,st.s*1.5):dir&&st.dir&&dir!==st.dir?Math.max(AP_MIN,st.s*.5):dir?st.s:Math.max(AP_MIN,st.s*.75);
    if(dir)st.dir=dir;st.why=why;st.at=S.day;st.prof=Math.round(Math.max(s0,su,sd===-Infinity?s0:sd));
    S.prices[k]=np;
  }
}
const _arAP=autoRow;autoRow=function(k){const h=_arAP(k);if(!S.autoP[k])return h;const st=apOf()[k],[lo,hi]=apBounds(k);
  return h+`<div class="s ap-why">Auto price ${fmt(lo)}–${fmt(hi)}${st?` · last change: <b>${st.why}</b> · next step ${Math.round(st.s*100)}% · about ${fmt(st.prof||0)} profit a day`:' · first check tonight'}</div>`};
