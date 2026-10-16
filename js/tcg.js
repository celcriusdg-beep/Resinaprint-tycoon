/* TCG counter (4.37): once you own the trading card shop, Shop gets a TCG counter. Buy real Riftbound: Spiritforged
   booster packs, boxes and cases at market price, rip them open card by card, build a binder of official cards
   (every Overnumbered and Signature card plus 80 others) and sell singles at their market value.
   Card data and art: the official Riftbound card gallery; prices: TCGplayer market prices (see tools/make_tcg.py). */
const TCG_BY=Object.fromEntries(TCG_SET.cards.map(c=>[c.id,c]));
const TCG_POOL={};TCG_SET.cards.forEach(c=>(TCG_POOL[c.r]=TCG_POOL[c.r]||[]).push(c));
const TCG_R={common:{n:'Common',c:'#9aa3ad',o:6},uncommon:{n:'Uncommon',c:'#41b4b8',o:5},rare:{n:'Rare',c:'#e0a84a',o:4},epic:{n:'Epic',c:'#c45bff',o:3},alt:{n:'Alt art',c:'#ff7fd0',o:2},over:{n:'Overnumbered',c:'#ffd36b',o:1},sig:{n:'Signature',c:'#fff1b8',o:0}};
const TCG_BOX=24,TCG_CASE=6;
const tcgOf=()=>S.tcg||(S.tcg={packs:0,own:{},opened:0,best:null,spent:0,sold:0,seen:{}});
const tcgOpen=()=>!!(S.stores&&S.stores.tcg&&S.stores.tcg.open);
const tcgPrice=c=>Math.max(.05,c.p);
const tcgSellP=c=>Math.round(tcgPrice(c)*.9*100)/100;
const tcgF=v=>v>=100?fmt(v):'€ '+v.toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});
const tcgImg=(c,cls)=>`<img src="${c.img}" alt="${c.n}" loading="lazy" decoding="async" class="${cls||''}">`;
/* one booster: 7 commons, 3 uncommons, 2 rare-or-better slots and 1 foil of any rarity */
function tcgRoll(){
  const pick=a=>a[Math.random()*a.length|0],out=[];
  for(let i=0;i<7;i++)out.push({c:pick(TCG_POOL.common)});
  for(let i=0;i<3;i++)out.push({c:pick(TCG_POOL.uncommon)});
  const r=Math.random(),hit=r<1/360?'sig':r<1/36?'over':null;
  for(let i=0;i<2;i++){let k;if(i===1&&hit)k=hit;else{const x=Math.random();k=x<1/12?'alt':x<1/12+.22?'epic':'rare'}out.push({c:pick(TCG_POOL[k]),foil:1})}
  const f=Math.random(),fk=f<.6?'common':f<.9?'uncommon':f<.98?'rare':'epic';out.push({c:pick(TCG_POOL[fk]),foil:1});
  return out;
}
Object.assign(A,{
  tcgBuy(d){if(!tcgOpen())return;const n=d.k==='case'?TCG_BOX*TCG_CASE:d.k==='box'?TCG_BOX:1,c=d.k==='case'?TCG_SET.case:d.k==='box'?TCG_SET.box:TCG_SET.pack;
    if(S.cash<c)return toast('Not enough cash');spend('Booster packs',c);const T=tcgOf();T.packs+=n;T.spent+=c;toast(`+${n} Spiritforged pack${n>1?'s':''}`);if(typeof snd==='function')snd('buy')},
  tcgRip(){const T=tcgOf();if(!T.packs)return toast('Buy a pack first');T.packs--;T.opened++;const cards=tcgRoll();for(const x of cards){T.own[x.c.id]=(T.own[x.c.id]||0)+1;T.seen[x.c.id]=1}
    const best=cards.slice().sort((a,b)=>tcgPrice(b.c)-tcgPrice(a.c))[0];if(!T.best||tcgPrice(best.c)>tcgPrice(TCG_BY[T.best]||{p:0}))T.best=best.c.id;
    if(best.c.r==='sig'||best.c.r==='over')log(`You pulled ${best.c.n} (${TCG_R[best.c.r].n} ${best.c.no}), worth about ${tcgF(tcgPrice(best.c))}!`,'good');
    tcgReveal(cards);save()},
  tcgSell(d){const T=tcgOf(),c=TCG_BY[d.k];if(!c||!(T.own[c.id]>0))return;T.own[c.id]--;const v=tcgSellP(c);earn('Card sales',v);T.sold+=v;toast(`Sold ${c.n} for ${tcgF(v)}`);if(typeof snd==='function')snd('coin')},
  tcgSellDupes(){const T=tcgOf();let v=0,n=0;for(const id in T.own){const c=TCG_BY[id];while(T.own[id]>1){T.own[id]--;v+=tcgSellP(c);n++}}if(!n)return toast('No duplicates');earn('Card sales',v);T.sold+=v;toast(`Sold ${n} duplicates for ${tcgF(v)}`);if(typeof snd==='function')snd('cash')},
  tcgSellBulk(){const T=tcgOf();let v=0,n=0;for(const id in T.own){const c=TCG_BY[id];if(c.r!=='common'&&c.r!=='uncommon')continue;n+=T.own[id];v+=tcgSellP(c)*T.own[id];T.own[id]=0}if(!n)return toast('No bulk to sell');earn('Card sales',v);T.sold+=v;toast(`Sold ${n} bulk cards for ${tcgF(v)}`)},
  tcgView(d){tcgZoom(d.k)},
  tcgFilter(d){sub.tcgf=d.k},
  tcgSort(){sub.tcgs=sub.tcgs==='value'?'number':'value'}
});
/* ---------- pack opening, full screen ---------- */
const TCGO={cards:[],i:0};
function tcgPackArt(){return `<svg viewBox="0 0 200 300" class="tcg-pack-svg"><defs><linearGradient id="tpk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a1c5c"/><stop offset=".5" stop-color="#7a2f8f"/><stop offset="1" stop-color="#1b2a5c"/></linearGradient><linearGradient id="tpf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a24a"/><stop offset=".5" stop-color="#fff1b8"/><stop offset="1" stop-color="#c9a24a"/></linearGradient></defs>
  <path d="M10 18h180l-6 8 6 8v236l-6 8 6 8H10l6-8-6-8V34l6-8z" fill="url(#tpk)" stroke="url(#tpf)" stroke-width="3"/><rect x="10" y="18" width="180" height="16" fill="#00000040"/><rect x="10" y="266" width="180" height="16" fill="#00000040"/>
  <circle cx="100" cy="130" r="58" fill="#00000030" stroke="url(#tpf)" stroke-width="2"/><path d="M100 82l14 34 36 4-27 23 9 36-32-19-32 19 9-36-27-23 36-4z" fill="url(#tpf)" opacity=".9"/>
  <text x="100" y="214" text-anchor="middle" font-size="13" font-weight="900" fill="#fff1b8" letter-spacing="2">RIFTBOUND</text><text x="100" y="236" text-anchor="middle" font-size="17" font-weight="900" fill="#fff" letter-spacing="1">SPIRITFORGED</text><text x="100" y="254" text-anchor="middle" font-size="8" fill="#e6dcff" letter-spacing="2">BOOSTER PACK · 14 CARDS</text>
  <rect x="10" y="34" width="180" height="232" fill="url(#tpf)" opacity=".08" class="tcg-shine"/></svg>`}
function tcgReveal(cards){
  /* commons first, the best card last */
  TCGO.cards=cards.slice().sort((a,b)=>(TCG_R[b.c.r].o-TCG_R[a.c.r].o)||(tcgPrice(a.c)-tcgPrice(b.c)));TCGO.i=-1;
  let el=document.getElementById('tcgOpen');if(!el){el=document.createElement('div');el.id='tcgOpen';el.className='tcg-open';document.body.appendChild(el);el.addEventListener('click',tcgClick)}
  el.classList.add('on');document.body.classList.add('skopen');
  el.innerHTML=`<div class="tcg-stage"><div class="tcg-pack" data-t="tear">${tcgPackArt()}<div class="tcg-hint">Tap to open</div></div></div><div class="tcg-bar"><button class="btn sm ghost" data-t="skip">Skip to the end</button><button class="btn sm" data-t="close">Close</button></div>`;
}
function tcgCardHTML(x,flip){const c=x.c,R=TCG_R[c.r];return `<div class="tcg-card r-${c.r} ${x.foil?'foil':''} ${flip?'flip':''}" style="--rc:${R.c}"><div class="tcg-in"><div class="tcg-back"></div><div class="tcg-front">${tcgImg(c)}<i class="tcg-holo"></i></div></div></div>`}
function tcgNext(){
  const el=document.getElementById('tcgOpen');if(!el)return;TCGO.i++;
  if(TCGO.i>=TCGO.cards.length)return tcgSummary();
  const x=TCGO.cards[TCGO.i],c=x.c,R=TCG_R[c.r],big=c.r==='sig'||c.r==='over'||c.r==='alt';
  el.querySelector('.tcg-stage').innerHTML=`<div class="tcg-solo ${big?'big':''}" data-t="next">${tcgCardHTML(x)}<div class="tcg-cap"><b style="color:${R.c}">${R.n}${x.foil&&c.r!=='sig'&&c.r!=='over'?' foil':''}</b><span>${c.n} · ${c.no}</span><em>${tcgF(tcgPrice(c))}</em></div><div class="tcg-count">${TCGO.i+1} / ${TCGO.cards.length}</div></div>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const k=el.querySelector('.tcg-card');if(k)k.classList.add('flip')}));
  if(typeof snd==='function')snd(big?'level':c.r==='epic'||c.r==='rare'?'good':'tap');
  if(big&&typeof confetti==='function')confetti(c.r==='sig'?200:c.r==='over'?120:50);
}
function tcgSummary(){
  const el=document.getElementById('tcgOpen'),T=tcgOf(),tot=TCGO.cards.reduce((a,x)=>a+tcgPrice(x.c),0);
  el.querySelector('.tcg-stage').innerHTML=`<div class="tcg-sum"><div class="t">Pack value ${tcgF(tot)}</div><div class="s">Paid ${fmt(TCG_SET.pack)} · ${tot>=TCG_SET.pack?'<span class="good">profit</span>':'<span class="bad">loss</span>'}</div><div class="tcg-grid">${TCGO.cards.slice().reverse().map(x=>`<div class="tcg-mini r-${x.c.r} ${x.foil?'foil':''}" style="--rc:${TCG_R[x.c.r].c}">${tcgImg(x.c)}<i class="tcg-holo"></i><b>${tcgF(tcgPrice(x.c))}</b></div>`).join('')}</div>
    <div class="opts" style="justify-content:center">${T.packs?`<button class="btn primary" data-t="again">Open another (${T.packs} left)</button>`:''}<button class="btn" data-t="close">Done</button></div></div>`;
  el.querySelector('.tcg-bar').innerHTML='';
}
function tcgClick(e){
  const t=e.target.closest('[data-t]');if(!t)return;const a=t.dataset.t;
  if(a==='tear'){t.classList.add('torn');if(typeof snd==='function')snd('whoosh');setTimeout(tcgNext,550);return}
  if(a==='next')return tcgNext();
  if(a==='skip'){TCGO.i=TCGO.cards.length;return tcgSummary()}
  if(a==='again'){A.tcgRip();return}
  if(a==='close'){const el=document.getElementById('tcgOpen');el.classList.remove('on');document.body.classList.remove('skopen');render()}
}
function tcgZoom(id){
  const c=TCG_BY[id],T=tcgOf(),n=T.own[id]||0,R=TCG_R[c.r];if(!c)return;
  modal(`<div class="tcg-zoom r-${c.r}" style="--rc:${R.c}"><div class="tcg-zc ${n?'':'miss'}">${tcgImg(c)}<i class="tcg-holo"></i></div><h3>${c.n}</h3><p><b style="color:${R.c}">${R.n}</b> · ${c.no} · ${c.t}${c.ill?` · art by ${c.ill}`:''}</p><div class="tcg-zp"><div><b>${tcgF(tcgPrice(c))}</b><span>market price</span></div><div><b>${n}</b><span>owned</span></div><div><b>${tcgF(tcgSellP(c))}</b><span>you get</span></div></div>
    <div class="acts">${n?`<button class="btn primary" data-choice="0">Sell 1 for ${tcgF(tcgSellP(c))}</button>`:''}<button class="btn ghost" data-choice="${n?1:0}">Close</button></div></div>`);
  pending=n?[{f:()=>A.tcgSell({k:id})},{f:()=>{}}]:[{f:()=>{}}];
}
/* ---------- the counter ---------- */
function tcgView(){
  if(!tcgOpen())return `<div class="card" style="margin-top:16px"><div class="t">TCG counter</div><div class="s">Open the trading card shop (Shop › Stores) to sell and open Riftbound packs here.</div></div>`;
  const T=tcgOf(),owned=TCG_SET.cards.filter(c=>T.own[c.id]>0),val=TCG_SET.cards.reduce((a,c)=>a+(T.own[c.id]||0)*tcgPrice(c),0),cnt=Object.values(T.own).reduce((a,b)=>a+b,0);
  if(!sub.tcg)sub.tcg='packs';
  let h=`<div class="card tcg-hero"><div class="tcg-hero-pack">${tcgPackArt()}</div><div class="grow"><div class="kicker">Riftbound · League of Legends TCG</div><div class="t">Spiritforged</div><div class="s">Official cards at TCGplayer market prices. ${owned.length} of ${TCG_SET.cards.length} cards collected · ${cnt} cards worth ${tcgF(val)}</div></div></div>`;
  h+=segs('tcg',[['packs','Packs',T.packs],['binder','Binder',owned.length],['sell','Sell']]);
  if(sub.tcg==='binder')return h+tcgBinder();
  if(sub.tcg==='sell')return h+tcgSellView(val);
  h+=`<div class="card tcg-rip"><div class="grow"><div class="t">${T.packs} sealed pack${T.packs===1?'':'s'}</div><div class="s">${T.opened} opened so far${T.best?` · best pull: ${TCG_BY[T.best].n} (${tcgF(tcgPrice(TCG_BY[T.best]))})`:''}</div></div><button class="btn primary" data-a="tcgRip" ${T.packs?'':'disabled'}>Open a pack</button></div>`;
  h+=label('Buy sealed','TCGplayer market prices')+`<div class="tcg-shop">
    <div class="tcg-prod"><div class="tcg-pi pack">${tcgPackArt()}</div><b>Booster pack</b><small>14 cards</small><button class="btn sm primary" data-a="tcgBuy" data-k="pack" ${S.cash<TCG_SET.pack?'disabled':''}>${fmt(TCG_SET.pack)}</button></div>
    <div class="tcg-prod"><div class="tcg-pi box">${tcgPackArt()}${tcgPackArt()}${tcgPackArt()}</div><b>Booster box</b><small>${TCG_BOX} packs</small><button class="btn sm primary" data-a="tcgBuy" data-k="box" ${S.cash<TCG_SET.box?'disabled':''}>${fmt(TCG_SET.box)}</button></div>
    <div class="tcg-prod"><div class="tcg-pi case">${tcgPackArt()}${tcgPackArt()}${tcgPackArt()}${tcgPackArt()}</div><b>Box case</b><small>${TCG_CASE} boxes</small><button class="btn sm primary" data-a="tcgBuy" data-k="case" ${S.cash<TCG_SET.case?'disabled':''}>${fmt(TCG_SET.case)}</button></div></div>`;
  h+=`<div class="s cat-help">Every pack: 7 commons, 3 uncommons, 2 rares or better and 1 foil. Epics show up in about 1 in 4 rare slots, alt arts in 1 in 12. About 1 pack in 36 has an Overnumbered card, and 1 in 360 a Signature.</div>`;
  h+=label('Chase cards','most valuable in the set')+`<div class="tcg-chase">${TCG_SET.cards.filter(c=>c.r==='sig'||c.r==='over').slice(0,8).map(c=>`<button class="tcg-mini r-${c.r} ${T.own[c.id]?'':'miss'}" style="--rc:${TCG_R[c.r].c}" data-a="tcgView" data-k="${c.id}">${tcgImg(c)}<i class="tcg-holo"></i><b>${tcgF(tcgPrice(c))}</b></button>`).join('')}</div>`;
  return h;
}
function tcgBinder(){
  const T=tcgOf(),f=sub.tcgf||'all',sort=sub.tcgs||'value';
  let L=TCG_SET.cards.filter(c=>f==='all'||(f==='owned'?T.own[c.id]>0:c.r===f));
  L=L.slice().sort(sort==='value'?(a,b)=>tcgPrice(b)-tcgPrice(a):(a,b)=>parseInt(a.no)-parseInt(b.no)||a.no.localeCompare(b.no));
  const fl=[['all','All'],['owned','Owned'],['sig','Signature'],['over','Overnumbered'],['alt','Alt art'],['epic','Epic'],['rare','Rare'],['uncommon','Uncommon'],['common','Common']];
  return `<div class="tcg-fil">${fl.map(([k,n])=>`<button class="${f===k?'on':''}" data-a="tcgFilter" data-k="${k}" ${TCG_R[k]?`style="--rc:${TCG_R[k].c}"`:''}>${n}</button>`).join('')}<button data-a="tcgSort">Sort: ${sort==='value'?'value':'number'}</button></div>
    <div class="tcg-binder">${L.map(c=>{const n=T.own[c.id]||0;return `<button class="tcg-mini r-${c.r} ${n?'':'miss'}" style="--rc:${TCG_R[c.r].c}" data-a="tcgView" data-k="${c.id}">${tcgImg(c)}<i class="tcg-holo"></i>${n>1?`<span class="tcg-n">×${n}</span>`:''}<b>${tcgF(tcgPrice(c))}</b></button>`}).join('')||'<div class="s">No cards here yet.</div>'}</div>`;
}
function tcgSellView(val){
  const T=tcgOf(),dup=Object.keys(T.own).reduce((a,id)=>a+Math.max(0,T.own[id]-1)*tcgSellP(TCG_BY[id]),0),bulk=Object.keys(T.own).reduce((a,id)=>a+((TCG_BY[id].r==='common'||TCG_BY[id].r==='uncommon')?T.own[id]*tcgSellP(TCG_BY[id]):0),0);
  return `<div class="card"><div class="t">Collection worth ${tcgF(val)}</div><div class="s">Singles sell for 90% of the market price. Spent on sealed product: ${tcgF(T.spent)} · earned from singles: ${tcgF(T.sold)}</div>
    <div class="opts"><button class="btn sm primary" data-a="tcgSellDupes" ${dup?'':'disabled'}>Sell all duplicates · ${tcgF(dup)}</button><button class="btn sm" data-a="tcgSellBulk" ${bulk?'':'disabled'}>Sell all bulk · ${tcgF(bulk)}</button></div></div>
    <div class="s cat-help">Tap any card in the binder to sell a single copy.</div>`;
}
/* ---------- wiring: a Shop tile, a button on the store card, and the route ---------- */
const _vBuyT=VIEWS.buy;VIEWS.buy=function(){
  if(sub.buy==='tcg')return shopBack('TCG counter')+tcgView();
  let h=_vBuyT.apply(this,arguments);
  if(tcgOpen()&&sub.buy==='hub'){const i=h.indexOf('<div class="shopgrid">');const tile=`<button class="card tcg-tile" data-a="sub" data-t="buy" data-k="tcg"><div class="tcg-tile-pack">${tcgPackArt()}</div><div class="grow"><div class="t">TCG counter</div><div class="s">Riftbound Spiritforged packs, binder and singles${tcgOf().packs?` · ${tcgOf().packs} sealed`:''}</div></div><span class="btn sm primary">Open</span></button>`;if(i>=0)h=h.slice(0,i)+tile+h.slice(i)}
  if(tcgOpen()&&sub.buy==='stores')h=h.replace('data-a="tournament"','data-a="tournament" ').replace('<div class="label"><span>Your stores','<div class="card tcg-tile" style="margin-top:14px"><div class="grow"><div class="t">TCG counter</div><div class="s">Open Riftbound packs and run your binder.</div></div><button class="btn sm primary" data-a="sub" data-t="buy" data-k="tcg">Open counter</button></div><div class="label"><span>Your stores');
  return h;
};
/* ---------- storage: sort printers by price ---------- */
if(typeof storageView==='function'){const _svT=storageView;storageView=function(){
  const L=S.pinv||[];if(L.length<2)return _svT.apply(this,arguments);const m=sub.pinvSort||'new',cost=x=>PRINTERS[x.type]?PRINTERS[x.type].cost:0,keep=S.pinv;
  S.pinv=m==='hi'?L.slice().sort((a,b)=>cost(b)-cost(a)):m==='lo'?L.slice().sort((a,b)=>cost(a)-cost(b)):L;
  let h;try{h=_svT.apply(this,arguments)}finally{S.pinv=keep}
  const bar=`<div class="pinv-sort"><span>Sort</span>${[['new','Newest'],['hi','Price ↓'],['lo','Price ↑']].map(([k,n])=>`<button class="${m===k?'on':''}" data-a="sub" data-t="pinvSort" data-k="${k}">${n}</button>`).join('')}</div>`;
  const i=h.indexOf('<div class="group">');return i<0?h:h.slice(0,i)+bar+h.slice(i)}}
