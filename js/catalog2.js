/* Catalogue revamp (4.16): tabs per product type, compact cards, and the less-used controls folded away.
   Every feature of the old catalogue is still here: listing, price, sell-off, stop making, auto-price and pre-orders. */
const catOpen=new Set();
function catGroups(){
  const own=PKEYS.filter(k=>unlocked(k)&&!PRODUCTS[k].ip),g=[];
  g.push({id:'selling',n:'Selling',keys:PKEYS.filter(k=>unlocked(k)&&S.listed[k]&&makeable(k))});
  g.push({id:'own',n:'Own designs',keys:own});
  if(typeof IP_GAMES!=='undefined')for(const G of IP_GAMES){const ks=G.figs.map(f=>f[0]).filter(k=>unlocked(k));if(ks.length)g.push({id:G.id,n:G.short,col:G.col,keys:ks})}
  g.push({id:'idle',n:'Not listed',keys:PKEYS.filter(k=>unlocked(k)&&!S.listed[k])});
  return g;
}
Object.assign(A,{
  catTab(d){sub.cat=d.k;window.scrollTo({top:0})},
  catMore(d){catOpen.has(d.k)?catOpen.delete(d.k):catOpen.add(d.k)}
});
function catCard(k){
  const Pd=PRODUCTS[k],can=makeable(k),on=S.listed[k]&&can,clr=S.clear[k],stop=S.stop[k],open=catOpen.has(k);
  const res=reserved(k),pipe=inPipe(k),d=demand(k),pf=unitProfit(k),days=d>.05?S.stock[k]/d:0;
  const status=clr?'<span class="chip amber">Selling off</span>':on?(stop?'<span class="chip amber">Paused</span>':'<span class="chip good">Selling</span>'):can?'<span class="chip">Not listed</span>':'<span class="chip">Locked</span>';
  let h=`<div class="cat-card ${on?'on':''} ${clr?'clr':''}" ${Pd.col?`style="--pc:${Pd.col}"`:''}>
    <div class="cat-top">${artBox(prodArt(k),'prod cat-art','',['f',k])}
      <div class="grow"><div class="cat-n">${Pd.name}</div><div class="cat-st">${status}${Pd.royalty?` <span class="chip">${Math.round(Pd.royalty*100)}% royalty</span>`:''}</div></div>
      ${on&&!clr?`<div class="stepper"><button class="btn sm" data-a="price" data-k="${k}" data-d="-1" aria-label="Lower price">−</button><b>${fmt(S.prices[k])}</b><button class="btn sm" data-a="price" data-k="${k}" data-d="1" aria-label="Raise price">+</button></div>`:clr?`<b class="num">${fmt(S.prices[k])}</b>`:''}
    </div>`;
  if(on)h+=`<div class="cat-stats"><span><b>${d.toFixed(1)}</b>orders/day</span><span><b>${S.stock[k]}</b>ready${res?` · ${res} held`:''}</span><span><b>${pipe}</b>coming</span><span><b class="${pf>=0?'good':'bad'}">${fmt(pf)}</b>profit each</span><span><b>${days>0&&S.stock[k]>0?(days<1?'<1':Math.round(days))+' d':'—'}</b>stock lasts</span></div>`;
  else h+=`<div class="s" style="margin-top:8px">${can?'Not listed. Customers cannot buy it yet.':`Needs a ${TIERS[Pd.tier].toLowerCase()} printer to make.`}</div>`;
  h+=`<div class="cat-acts">${clr?`<button class="btn sm primary" data-a="cancelClear" data-k="${k}">Cancel sell-off</button>`:`<button class="btn sm ${S.listed[k]?'ghost':'primary'}" data-a="list" data-k="${k}" ${can?'':'disabled'}>${S.listed[k]?'Unlist':'List for sale'}</button>`}
    ${on&&!clr?`<button class="btn sm ${open?'on':''}" data-a="catMore" data-k="${k}">${open?'Less':'More options'}</button>`:''}</div>`;
  if(on&&!clr&&open)h+=`<div class="cat-more"><div class="cat-acts"><button class="btn sm" data-a="sellOff" data-k="${k}">Sell off ${Math.round(CLEAR_OFF*100)}% off</button><button class="btn sm ${stop?'primary':'ghost'}" data-a="stopMake" data-k="${k}">${stop?'Make again':'Stop making'}</button></div>${autoRow(k)}${preRow(k)}<div class="s" style="margin-top:6px">${stop?'Production is paused. ':''}+${productXp(k)} XP per sale.</div></div>`;
  return h+'</div>';
}
catalogView=function(){
  const G=catGroups();if(!sub.cat||!G.some(g=>g.id===sub.cat))sub.cat='selling';
  const cur=G.find(g=>g.id===sub.cat),stockN=PKEYS.reduce((a,k)=>a+S.stock[k],0),val=PKEYS.reduce((a,k)=>a+S.stock[k]*S.prices[k],0);
  let h=`<div class="cat-sum"><div><b>${G[0].keys.length}</b><span>selling</span></div><div><b>${stockN}</b><span>ready</span></div><div><b>${fmt(val)}</b><span>stock worth</span></div><div><b>${S.orders.length}</b><span>open orders</span></div><div><b>×${season().m}</b><span>${season().n}</span></div></div>`;
  h+=`<div class="cat-tabs">${G.map(g=>`<button class="${g.id===sub.cat?'on':''}" data-a="catTab" data-k="${g.id}" ${g.col?`style="--tc:${g.col}"`:''}>${g.n}<span>${g.keys.length}</span></button>`).join('')}</div>`;
  if(!cur.keys.length)h+=`<div class="card"><div class="s">${cur.id==='selling'?'Nothing is listed yet. Open Own designs and list something.':cur.id==='idle'?'Everything you can make is listed.':'Nothing here yet.'}</div></div>`;
  h+=`<div class="cat-list">${cur.keys.map(catCard).join('')}</div>`;
  if(cur.id==='selling')h+=`<div class="s cat-help"><b>Sell off</b> sells what is left at ${Math.round(CLEAR_OFF*100)}% off and unlists it when it is gone. <b>Stop making</b> only pauses production. Both are under More options.</div>`;
  return h;
};
