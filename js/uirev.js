/* UI revamp (4.50)
   1. Compact header (styles in css/uirev.css), tap the header to show or hide the stat pills and goal.
   2. Shop hub: "Recommended for you" picks on top, then compact tiles in three groups.
   3. Product cards for printers and resin: key stats as bars, green/red arrows against your best, clear lock reasons,
      and "€X short" when you cannot afford it.
   4. Filters and sorting in the printer and resin catalogues.
   5. Bigger purchases ask for a quick confirmation with a preview of what changes; every purchase gets a small pop.
   6. Tips show once: they disappear by themselves once you leave the page. */
/* ---------- 1. header toggle ---------- */
const uiPref=()=>{try{return JSON.parse(localStorage.getItem('resinaprint-ui')||'{}')}catch(e){return {}}};
const uiSave=o=>{try{localStorage.setItem('resinaprint-ui',JSON.stringify(o))}catch(e){}};
function uiApplyHdr(){document.body.classList.toggle('hdr-min',!!uiPref().min)}
document.addEventListener('click',e=>{const h=e.target.closest('header');if(!h||e.target.closest('button,a,[data-a]'))return;const o=uiPref();o.min=!o.min;uiSave(o);uiApplyHdr()});
uiApplyHdr();
/* ---------- 6. tips show once ---------- */
let _tipShown=null;
if(typeof tipBanner==='function'){const _tb=tipBanner;tipBanner=function(){const k=typeof tipKey==='function'?tipKey():null;
  if(_tipShown&&_tipShown!==k){const o=tipsSeen();o[_tipShown]=1;tipsSave(o);_tipShown=null}
  const h=_tb.apply(this,arguments);if(h)_tipShown=k;return h}}
/* ---------- helpers ---------- */
const pOut=D=>D.slots*D.speed;
const pKind=D=>D.lab?'Next-gen':D.inj?'Injection':D.pj?'PolyJet':D.fam==='carbon'?'Carbon DLS':D.form?'Cartridge':'Open vat';
function bestOwned(inj){let b=null;for(const p of S.printers){const D=PRINTERS[p.type];if(!!D.inj!==!!inj)continue;if(!b||pOut(D)>pOut(b))b=D}return b}
const PMAX=(()=>{const L=Object.values(PRINTERS);return {out:Math.max(...L.map(pOut)),fail:Math.max(...L.map(D=>D.fail)),q:Math.max(.01,...L.map(D=>D.q||0)),slots:Math.max(...L.map(D=>D.slots)),speed:Math.max(...L.map(D=>D.speed))}})();
const lg=(v,m)=>Math.log(1+Math.max(0,v))/Math.log(1+m)*100;
const statBar=(n,val,pct,delta)=>`<div class="pc-st"><span>${n}</span><i><b style="width:${Math.max(3,Math.min(100,pct))}%"></b></i><em>${val}${delta||''}</em></div>`;
const dArrow=(v,b,lowerBetter)=>{if(b==null||!isFinite(v)||!isFinite(b)||b===v)return '';const up=lowerBetter?v<b:v>b,pct=b?Math.round(Math.abs(v-b)/Math.abs(b)*100):0;if(!pct)return '';return ` <small class="${up?'up':'dn'}">${up?'▲':'▼'}${pct}%</small>`};
const shortBtn=(a,k,cost,dis,extra='',lbl)=>{const short=cost-S.cash;return `<div class="pc-buy"><button class="btn sm primary" data-a="${a}" data-k="${k}" ${extra} ${dis||short>0?'disabled':''}>${lbl||fmt(cost)}</button>${short>0&&!dis?`<small class="bad">${fmt(short)} short</small>`:''}</div>`};
const chipRow=(key,list,cur)=>`<div class="pc-filt">${list.map(([k,n])=>`<button class="${cur===k?'on':''}" data-a="sub" data-t="${key}" data-k="${k}">${n}</button>`).join('')}</div>`;
/* ---------- 3+4. printer cards ---------- */
function printerCardShop(t,best){
  const D=PRINTERS[t],lk=printerLock(D),full=S.printers.length>=space().printers,cmp=D.inj?best.inj:best.vat;
  return `<div class="pcard ${lk?'locked':''}">${artBox(printerArt(t),'pc-art','',['p',t])}<div class="pc-body"><div class="pc-h"><b>${D.name}</b><span class="chip">${pKind(D)} · ${D.slots} slots · ${D.speed}×</span></div>
    ${lk?`<div class="pc-lock">🔒 ${lk}</div>`:`<div class="pc-stats">${statBar('Output',`${Math.round(pOut(D))}`,lg(pOut(D),PMAX.out),dArrow(pOut(D),cmp&&pOut(cmp)))}${statBar('Fail',(Math.round(D.fail*1000)/10)+'%',(1-D.fail/PMAX.fail)*100,dArrow(D.fail,cmp&&cmp.fail,true))}${D.q?statBar('Quality','+'+D.q.toFixed(2),D.q/PMAX.q*100,''):''}</div>`}
    </div>${lk?`<div class="pc-buy"><span class="chip">${fmt(D.cost)}</span></div>`:full?`<div class="pc-buy"><button class="btn sm" disabled>${fmt(D.cost)}</button><small>no free spot</small></div>`:shortBtn('buyPrinter',t,D.cost,false)}</div>`;
}
function shopPrinters(){
  let h=`<div style="margin-top:12px">${segs('pg',PGROUPS.map((n,i)=>[String(i),(typeof REB_PGRP!=='undefined'&&REB_PGRP[i]&&rebN()<REB_PGRP[i]?'🔒 ':'')+(n==='Singularity'?'✦ ':'')+n]).filter(x=>PGROUPS[+x[0]]!=='Singularity'||(typeof singAny==='function'&&singAny()))).replace('margin-top:18px','')}</div>`;
  if(PGROUPS[+sub.pg]==='Singularity'&&!(typeof singAny==='function'&&singAny()))sub.pg='0';
  const f=sub.pf||'all',o=sub.po||'price',best={vat:bestOwned(false),inj:bestOwned(true)};
  h+=chipRow('pf',[['all','All'],['afford','Affordable'],['up','Upgrades']],f)+chipRow('po',[['price','Price ↑'],['pricehi','Price ↓'],['out','Output'],['q','Quality']],o);
  let ks=Object.keys(PRINTERS).filter(t=>PRINTERS[t].grp===+sub.pg);
  if(f==='afford')ks=ks.filter(t=>!printerLock(PRINTERS[t])&&PRINTERS[t].cost<=S.cash);
  if(f==='up')ks=ks.filter(t=>{const D=PRINTERS[t],b=D.inj?best.inj:best.vat;return !printerLock(D)&&(!b||pOut(D)>pOut(b))});
  const SO={price:(a,b)=>PRINTERS[a].cost-PRINTERS[b].cost,pricehi:(a,b)=>PRINTERS[b].cost-PRINTERS[a].cost,out:(a,b)=>pOut(PRINTERS[b])-pOut(PRINTERS[a]),q:(a,b)=>(PRINTERS[b].q||0)-(PRINTERS[a].q||0)};
  ks.sort(SO[o]||SO.price);
  if(PGROUPS[+sub.pg]==='Singularity')h+=`<div class="card"><div class="s">Every Singularity printer you have forged can be bought here for cash.</div></div>`;
  if(+sub.pg===4)h+=`<div class="card"><div class="s">Laboratorium printers make every product without moulds or washing, in huge batches, with almost no failures. Needs an industrial unit, 3-phase power and the Laboratorium wing.</div></div>`;
  const b=best.vat;
  h+=label(PGROUPS[+sub.pg]+' printers',`${S.printers.length} of ${space().printers} spots${b?` · arrows vs your ${b.name.split(' ').slice(0,3).join(' ')}`:''}`);
  h+=ks.length?`<div class="pc-list">${ks.map(t=>printerCardShop(t,best)).join('')}</div>`:`<div class="card"><div class="s">Nothing here matches this filter.</div></div>`;
  return h;
}
/* ---------- 3+4. resin cards ---------- */
function shopResin(){
  const own=new Set(S.printers.map(p=>PRINTERS[p.type].fam));own.add('vat');const used=new Set(S.printers.map(p=>p.resin));
  const f=sub.rf||'all',o=sub.ro||'q';
  let h=label('Resin',S.mk.resin>1.03||S.mk.resin<.97?`market ${S.mk.resin>1?'+':''}${Math.round((S.mk.resin-1)*100)}%${S.up.bulk?' · bulk −20%':''}`:S.up.bulk?'20% bulk discount':'market price · only resin your printers can use');
  const bs=S.staff.filter(s=>s.role==='buyer');
  h+=bs.length&&typeof spSummary==='function'?`<div class="card sp-card"><div class="t">Stock plans</div>${bs.map(s=>`<div class="item"><div class="grow"><div class="t">${s.name}</div><div class="s">${spSummary(s)}</div></div><button class="btn sm" data-a="stockPlan" data-id="${s.id}">Edit</button></div>`).join('')}</div>`:'';
  h+=chipRow('rf',[['all','All'],['use','In use'],['stock','In stock'],['better','Better than mine']],f)+chipRow('ro',[['q','Quality'],['price','Price ↑'],['name','Name']],o);
  const curQ={};for(const p of S.printers){const fm=PRINTERS[p.type].fam;curQ[fm]=Math.max(curQ[fm]??-9,(RESINS[p.resin]&&RESINS[p.resin].q)||0)}
  for(const fm in FAMS){if(!own.has(fm))continue;
    let ks=Object.keys(RESINS).filter(k=>RESINS[k].fam===fm&&!RESINS[k].mix);
    if(f==='use')ks=ks.filter(k=>used.has(k));if(f==='stock')ks=ks.filter(k=>(S.resin[k]||0)>0);if(f==='better')ks=ks.filter(k=>RESINS[k].q>(curQ[fm]??0));
    const SO={q:(a,b)=>RESINS[b].q-RESINS[a].q,price:(a,b)=>resinPrice(a)-resinPrice(b),name:(a,b)=>RESINS[a].name.localeCompare(RESINS[b].name)};ks.sort(SO[o]||SO.q);
    if(!ks.length)continue;
    h+=label(FAMS[fm])+`<div class="pc-list">${ks.map(k=>{const R=RESINS[k],st=S.resin[k]||0,p1=resinPrice(k),p5=p1*4.5;
      return `<div class="pcard rs">${artBox(resinArt(k),'pc-art')}<div class="pc-body"><div class="pc-h"><b>${R.name}</b>${used.has(k)?'<span class="chip good">In use</span>':''}</div>
        <div class="s">${R.note} · ${R.pack}</div>
        <div class="pc-stats">${statBar('Quality',(R.q>=0?'+':'')+R.q.toFixed(2),(R.q+.05)/.65*100,(()=>{const d=R.q-(curQ[fm]??0);return Math.abs(d)<.005?'':` <small class="${d>0?'up':'dn'}">${d>0?'▲+':'▼'}${d.toFixed(2)}</small>`})())}${statBar('In stock',amt(k,st),Math.min(100,st/((R.vol||1000)*5)*100),'')}</div></div>
        <div class="pc-buy col"><button class="btn sm" data-a="resin" data-k="${k}" data-n="1" ${S.cash<p1?'disabled':''}>1× ${fmt(p1)}</button>${S.ws>=1?`<button class="btn sm primary" data-a="resin" data-k="${k}" data-n="5" ${S.cash<p5?'disabled':''}>5× ${fmt(p5)}</button>`:''}</div></div>`}).join('')}</div>`;
  }
  if(own.size<2)h+=`<div class="label"><small>Cartridge, PolyJet and pellet supplies show up once you own that kind of machine.</small></div>`;
  if(S.ws<1)h+='<div class="label"><small>5-packs unlock with a small studio.</small></div>';
  return h;
}
/* ---------- 2. shop hub ---------- */
const SHOP_GROUPS=[['Production',['printers','resin','gear','space']],['Business',['skill','stores','channels','crates']],['Logistics',['dispatch','fleet','carriers']]];
function shopRecs(){
  const R=[],room=S.printers.length<space().printers;
  /* running low on a resin you use */
  for(const k of new Set(S.printers.map(p=>p.resin))){const Rz=RESINS[k];if(!Rz||Rz.mix)continue;const need=S.printers.filter(p=>p.resin===k).reduce((a,p)=>a+(PRINTERS[p.type].vat||1000),0);
    if((S.resin[k]||0)<need&&S.cash>=resinPrice(k)){R.push({p:5,art:resinArt(k),t:`Running low on ${Rz.name.split(' ').slice(0,3).join(' ')}`,w:`${amt(k,S.resin[k]||0)} left`,b:`<button class="btn sm primary" data-a="resin" data-k="${k}" data-n="${S.ws>=1?5:1}">${S.ws>=1?'5×':'1×'} ${fmt(resinPrice(k)*(S.ws>=1?4.5:1))}</button>`});break}}
  /* best printer upgrade you can afford */
  if(room){const b=bestOwned(false),c=Object.keys(PRINTERS).filter(t=>{const D=PRINTERS[t];return !D.inj&&!printerLock(D)&&D.cost<=S.cash}).sort((a,b2)=>pOut(PRINTERS[b2])-pOut(PRINTERS[a]))[0];
    if(c&&(!b||pOut(PRINTERS[c])>pOut(b)*1.05)){const D=PRINTERS[c];R.push({p:4,art:printerArt(c),t:D.name,w:b?`+${Math.round((pOut(D)/pOut(b)-1)*100)}% output vs your best printer`:'Your first upgrade',b:`<button class="btn sm primary" data-a="buyPrinter" data-k="${c}">${fmt(D.cost)}</button>`})}}
  else if(SPACES[S.ws+1]&&!S.wsBuild){const W=SPACES[S.ws+1];R.push({p:4,art:uiIcon('space',48),t:`Move to the ${W.name.toLowerCase()}`,w:`All ${S.printers.length} printer spots are full · room for ${W.printers}`,b:`<button class="btn sm primary" data-a="shopGo" data-k="space">View</button>`})}
  /* wash and cure */
  {const ks=Object.keys(WASHERS),i=ks.indexOf(S.washer),n=ks[i+1];if(n&&S.ws>=WASHERS[n].ws&&S.cash>=WASHERS[n].cost&&S.printers.length*6>WASHERS[S.washer].cap){const W=WASHERS[n];R.push({p:3,art:`<img src="${washImg(n)}" alt="">`,t:W.name,w:`Washes ${W.cap} per batch (now ${WASHERS[S.washer].cap})`,b:`<button class="btn sm primary" data-a="washer" data-k="${n}">${fmt(W.cost)}</button>`})}}
  /* better resin */
  {let best=null;for(const p of S.printers){const fm=PRINTERS[p.type].fam,cq=(RESINS[p.resin]&&RESINS[p.resin].q)||0;for(const k in RESINS){const Rz=RESINS[k];if(Rz.fam!==fm||Rz.mix||Rz.q<=cq+.05||resinPrice(k)*5>S.cash*.2)continue;if(!best||Rz.q-cq>best.d)best={k,d:Rz.q-cq}}}
    if(best){const Rz=RESINS[best.k];R.push({p:2,art:resinArt(best.k),t:`Try ${Rz.name}`,w:`+${best.d.toFixed(2)} quality on your figures`,b:`<button class="btn sm primary" data-a="resin" data-k="${best.k}" data-n="1">1× ${fmt(resinPrice(best.k))}</button>`})}}
  /* skill tree */
  {const n=typeof nodeState==='function'?UPGRADES.filter(u=>u.br&&nodeState(u)==='buy').length:0;if(n)R.push({p:1,art:uiIcon('skill',48),t:`${n} upgrade${n>1?'s':''} ready`,w:'In the skill tree',b:`<button class="btn sm primary" data-a="shopGo" data-k="skill">Open</button>`})}
  return R.sort((a,b)=>b.p-a.p).slice(0,3);
}
shopHub=function(){
  const T=Object.fromEntries(shopTiles().map(t=>[t.k,t])),rec=shopRecs();
  let h=label('Shop',`${fmt(S.cash)} to spend`);
  if(rec.length)h+=`<div class="rec"><div class="rec-h">Recommended for you</div>${rec.map(r=>`<div class="rec-i"><span class="rec-art">${r.art}</span><div class="grow"><b>${r.t}</b><small>${r.w}</small></div>${r.b}</div>`).join('')}</div>`;
  for(const [g,ks] of SHOP_GROUPS){h+=`<div class="sg-h">${g}</div><div class="sgrid">${ks.filter(k=>T[k]).map(k=>{const t=T[k];return `<button class="stile2" data-a="shopGo" data-k="${k}" style="--c:${t.col}"><span class="sico2 ${SHOP_IMG.includes(k)?'has-img':''}">${shopIco(k)}</span><span class="stt2"><b>${t.n}</b><small>${t.d}</small></span>${t.badge?`<em class="sbadge2">${t.badge}</em>`:''}</button>`}).join('')}</div>`}
  return h;
};
const _vbUI=VIEWS.buy;VIEWS.buy=function(){
  if(sub.buy==='printers')return (typeof tipBanner==='function'?tipBanner():'')+shopBack('Printers')+shopPrinters();
  if(sub.buy==='resin')return (typeof tipBanner==='function'?tipBanner():'')+shopBack('Resin & supplies')+shopResin();
  return _vbUI.apply(this,arguments)};
/* ---------- 5. buy preview and purchase pop ---------- */
function buyPop(art,txt){const d=document.createElement('div');d.className='buypop';d.innerHTML=`<span class="bp-art">${art||''}</span><b>${txt}</b>`;document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
const bigBuy=c=>c>=50000||c>=S.cash*.25;
{const f=A.buyPrinter;A.buyPrinter=function(d){const D=PRINTERS[d.k];if(!D)return;const go=()=>{const n=S.printers.length;f.call(this,d);if(S.printers.length>n){buyPop(printerArt(d.k),`${D.name} added`);if(typeof snd==='function')snd('buy')}};
  if(S.printers.length>=space().printers||printerLock(D)||S.cash<D.cost||!bigBuy(D.cost))return go();
  const b=D.inj?bestOwned(true):bestOwned(false);
  confirmBox(`Buy the ${D.name}?`,`<div class="bprev"><div>${artBox(printerArt(d.k),'pc-art')}</div><div><div class="kv"><span>Price</span><b>${fmt(D.cost)}</b></div><div class="kv"><span>Cash after</span><b>${fmt(S.cash-D.cost)}</b></div><div class="kv"><span>Printer spots</span><b>${S.printers.length+1} of ${space().printers}</b></div>${b?`<div class="kv"><span>Output vs your best</span><b class="${pOut(D)>=pOut(b)?'good':'bad'}">${pOut(D)>=pOut(b)?'+':''}${Math.round((pOut(D)/pOut(b)-1)*100)}%</b></div>`:''}</div></div>`,go)}}
{const f=A.washer;A.washer=function(d){const W=WASHERS[d.k];if(!W)return;const go=()=>{const o=S.washer;f.call(this,d);if(S.washer!==o)buyPop(`<img src="${washImg(d.k)}" alt="">`,`${W.name} installed`)};
  if(S.cash<W.cost||!bigBuy(W.cost))return go();
  confirmBox(`Install the ${W.name}?`,`<div class="bprev"><div><img class="gimg" src="${washImg(d.k)}" alt=""></div><div><div class="kv"><span>Price</span><b>${fmt(W.cost)}</b></div><div class="kv"><span>Cash after</span><b>${fmt(S.cash-W.cost)}</b></div><div class="kv"><span>Per batch</span><b class="good">${W.cap} (now ${WASHERS[S.washer].cap})</b></div></div></div>`,go)}}
{const f=A.resin;A.resin=function(d){const c0=S.cash;f.call(this,d);if(S.cash<c0)buyPop(resinArt(d.k),`+${d.n} × ${RESINS[d.k].name.split(' ').slice(0,3).join(' ')}`)}}
