/* Screens (Studio, Orders, Buy, Team, Empire) and render(). */
const segs=(t,items)=>`<div class="seg" role="tablist">${items.map(([k,l,n])=>`<button role="tab" class="${sub[t]===k?'on':''}" data-a="sub" data-t="${t}" data-k="${k}">${l}${n?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>`;
const label=(t,s)=>`<div class="label"><span>${t}</span>${s?`<small>${s}</small>`:''}</div>`;
const moodChip=m=>m>=70?'<span class="chip good">Happy</span>':m>=40?'<span class="chip amber">Tired</span>':'<span class="chip bad">Burnt out</span>';
let liveVals={};
const tok=(id,v)=>{liveVals[id]=v;return '\u0001'+id+'\u0002'};
const LT=(id,v)=>`<span data-l="${id}">${tok(id,v)}</span>`;
const lbar=(id,pct,col)=>`<div class="bar"><i data-w="${id}" style="width:${tok(id,clamp(pct,0,100).toFixed(1))}%;background:${col||'var(--good)'}"></i></div>`;
function dur(sec){sec=Math.max(0,Math.ceil(sec));if(sec<60)return sec+' s';const m=Math.floor(sec/60),r2=sec%60;if(m<60)return m+' min'+(r2?' '+r2+' s':'');return Math.floor(m/60)+' h '+(m%60)+' min'}
const setT=(el,t)=>{if(el._t!==t){el._t=t;el.textContent=t}};
const setH=(el,h)=>{if(el._h!==h){el._h=h;el.innerHTML=h}};
const PAUSE='<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.4" height="12" rx="1"/><rect x="9.6" y="2" width="3.4" height="12" rx="1"/></svg>',PLAY='<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6z"/></svg>';
const bar=(pct,col)=>`<div class="bar"><i style="width:${clamp(pct,0,100)}%;background:${col||'var(--good)'}"></i></div>`;
const condCol=c=>c>60?'var(--good)':c>35?'var(--warn)':'var(--bad)';
const CHEV='<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4.5 6 7.5 9 4.5"/></svg>';
function item(t,s,right){return `<div class="item"><div class="grow"><div class="t">${t}</div>${s?`<div class="s">${s}</div>`:''}</div>${right||''}</div>`}
function spark(h){const w=300,ht=60,pad=4;const min=Math.min(0,...h),max=Math.max(...h,1);const sx=i=>pad+i*(w-2*pad)/Math.max(1,h.length-1);const sy=v=>ht-pad-(v-min)/(max-min||1)*(ht-2*pad);const pts=h.map((v,i)=>`${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" style="width:100%;height:60px;display:block;margin-top:12px" aria-label="Cash over the last ${h.length} days"><line x1="0" x2="${w}" y1="${sy(0)}" y2="${sy(0)}" stroke="rgba(255,255,255,.1)" stroke-dasharray="3 3"/><polygon points="${sx(0)},${sy(min)} ${pts} ${sx(h.length-1)},${sy(min)}" fill="var(--amber-soft)"/><polyline points="${pts}" fill="none" stroke="var(--amber)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${sx(h.length-1)}" cy="${sy(h[h.length-1])}" r="3.5" fill="var(--amber)"/></svg>`}

/* ---------- views ---------- */
function itemArt(art,t,s,right){return `<div class="item">${art}<div class="grow"><div class="t">${t}</div>${s?`<div class="s">${s}</div>`:''}</div>${right||''}</div>`}
function printerCard(p){
  const D=PRINTERS[p.type],R2=RESINS[p.resin],nm=short(p);
  let status,btn='',cls='primary',dis=false;
  if(p.state==='printing'){const pct=100*(1-p.job.left/p.job.total);status=`<span class="uvc">Printing</span> · ${p.job.units}× ${PRODUCTS[p.job.prod].name} · ${LT('pt'+p.id,dur(p.job.left/printRate()*HOUR_MS/1000))} left`;btn=LT('pb'+p.id,Math.floor(pct)+'%');cls='ghost';dis=true}
  else if(p.state==='done'){status=`<span class="good">Done</span> · ${p.job.units}× ${PRODUCTS[p.job.prod].name} ready`;btn=`Collect ${en(E.collect()+E.start())}`}
  else if(p.state==='failed'){status=`<span class="bad">Failed</span> · batch rejected`;btn=`Clean ${en(E.clean())}`}
  else{const why=whyNot(p,p.prod);status=`Idle · next ${units(p)}× ${PRODUCTS[p.prod].name}`;
    if(why){status=`<span class="warn">${why}</span>`;btn='Set up';dis=true;cls='ghost'}
    else if(!D.form&&p.vat<jobMl(p)){if((S.resin[p.resin]||0)>0)btn=`Refill ${en(E.refill())}`;else{btn='No resin';dis=true;cls='ghost'}}
    else if(D.form&&(S.resin[p.resin]||0)<jobMl(p)){btn=D.inj?'No pellets':'No supply';dis=true;cls='ghost'}
    else if(p.cond<=0){btn='Worn out';dis=true;cls='ghost'}
    else btn=`Start ${en(E.start())}`}
  const lv=D.form?clamp((S.resin[p.resin]||0)/((R2.vol||1000)*.02),8,90):clamp(p.vat/D.vat*100,4,92);
  const open=openPr.has(p.id);
  const prods=PKEYS.filter(k=>unlocked(k)&&PRODUCTS[k].tier<=D.tier&&(!D.inj||PRODUCTS[k].inj));
  const resins=Object.keys(RESINS).filter(k=>RESINS[k].fam===D.fam);
  const lock=p.state==='printing'?'disabled':'';
  return `<div class="card pr">
    <div class="pr-row">${artBox(printerArt(p.type)+'<i class="lvl"></i>',(D.form?'form ':'')+(p.state==='printing'?'run':p.state==='idle'?'idle':''),'--lv:'+lv+'%',['p',p.type])}
      <div class="grow"><div class="t">${nm}</div><div class="s">${status}</div></div>
      <button class="btn sm ${cls}" data-a="printerMain" data-id="${p.id}" ${dis?'disabled':''}>${btn}</button></div>
    ${p.state==='printing'?lbar('pw'+p.id,100*(1-p.job.left/p.job.total),'var(--uv)'):''}
    <div class="pr-meta"><span>${D.form?`${R2.name} · ${amt(p.resin,S.resin[p.resin]||0)}`:`${R2.name} · vat ${Math.round(p.vat)}/${D.vat} ml`}</span><span style="color:${condCol(p.cond)}">${wearName(D).split(' ')[0]} ${Math.round(p.cond)}%</span>
      <button class="more ${open?'open':''}" data-a="togglePr" data-id="${p.id}" aria-expanded="${open}">Settings ${CHEV}</button></div>
    ${open?`<div class="drawer">
      <label class="chk"><input type="checkbox" data-chk="auto" data-id="${p.id}" ${p.auto!==false?'checked':''}>Technicians pick the product by demand</label>
      <label class="chk"><input type="checkbox" data-chk="swap" data-id="${p.id}" ${p.swap?'checked':''}>Switch to another resin automatically when this one runs out</label>
      ${D.cost>=1500?`<label class="chk"><input type="checkbox" data-chk="sc" data-id="${p.id}" ${p.sc?'checked':''}>Service contract ${fmt(Math.max(3,D.cost*.004))}/week: free repairs, 20% fewer failures</label>`:''}
      <label>Product<select data-sel="prod" data-id="${p.id}" ${lock}>${prods.map(k=>`<option value="${k}" ${k===p.prod?'selected':''}>${PRODUCTS[k].name} (${units(p,k)}×)${D.inj&&!S.moulds[k]?' · no mould':''}</option>`).join('')}</select></label>
      <label>${D.inj?'Material':'Resin'}<select data-sel="resin" data-id="${p.id}" ${lock}>${resins.map(k=>`<option value="${k}" ${k===p.resin?'selected':''}>${RESINS[k].name}</option>`).join('')}</select></label>
      <button class="btn sm" data-a="service" data-id="${p.id}" ${p.cond>95||p.state==='printing'?'disabled':''}>${wearNew(D)} ${fmt(serviceFee(p))} ${en(E.service())}</button>
      <button class="btn sm ghost" data-a="sellPrinter" data-id="${p.id}">Sell printer</button>
    </div>`:''}
  </div>`;
}
const chip=(t,c)=>`<span class="chip ${c||''}">${t}</span>`;
function marketChips(){
  const c=[],se=season();
  c.push(chip(`${se.n} ×${se.m}`,se.m>1?'good':se.m<1?'bad':''));
  c.push(chip(`${ctryOf().f} ${ctryOf().n}`,'uv'));
  if(Math.abs(S.mk.resin-1)>.03)c.push(chip(`Resin ${S.mk.resin>1?'+':''}${Math.round((S.mk.resin-1)*100)}%`,S.mk.resin>1?'bad':'good'));
  if(S.mk.comp<.97)c.push(chip(`Competitors −${Math.round((1-S.mk.comp)*100)}%`,'bad'));
  if(S.trend&&S.trend.up)c.push(chip(`Trending: ${PRODUCTS[S.trend.up].short||PRODUCTS[S.trend.up].name} +45%`,'good'));
  if(S.trend&&S.trend.down)c.push(chip(`Cooling: ${PRODUCTS[S.trend.down].short||PRODUCTS[S.trend.down].name} −30%`,'bad'));
  if(S.parcels.length)c.push(chip(`${S.parcels.length} parcel${S.parcels.length>1?'s':''} on the road`));
  return `<div class="bonus" style="margin-top:14px">${c.join('')}</div>`;
}
function vStudio(){
  const uw=totUnwashed(),cu=totCured(),ready=PKEYS.reduce((a,k)=>a+S.stock[k],0),fk=nextFinish(),pk=packableIdx()>=0;
  let h='';
  if(!S.biz.kvk&&S.sold>=3)h+=`<div class="card" style="margin-top:16px"><div class="t" style="font-weight:800">Make it official</div><div class="s" style="margin-top:4px">Register at the KvK to hire staff, rent a studio, take business contracts and sell on marketplaces. It costs ${fmt(KVK_FEE)}.</div><div class="opts"><button class="btn sm primary" data-a="kvk" ${S.cash<KVK_FEE?'disabled':''}>Register ${fmt(KVK_FEE)}</button></div></div>`;
  if(S.biz.vatDue)h+=`<div class="card" style="margin-top:16px"><div class="t" style="font-weight:800">BTW return due</div><div class="s" style="margin-top:4px">${S.biz.vatDue.amt>=0?'Pay '+fmt(S.biz.vatDue.amt):'You get '+fmt(-S.biz.vatDue.amt)+' back'}. File it within ${Math.max(0,S.biz.vatDue.by-S.day)} days or you get a fine.</div><div class="opts"><button class="btn sm primary" data-a="vat">File now</button></div></div>`;
  h+=marketChips();
  h+=vaultCard()+itemsCard()+rebirthCard();
  h+=item('Do everything','Collect, wash, finish, pack and reply as far as your energy goes',`<button class="btn sm primary" data-a="doAll">Do all</button>`).replace('class="item"','class="item card" style="margin-top:16px"');
  h+=questCard();
  h+=label('Printer settings',`${S.printers.length} of ${space().printers} spots · ${WASHERS[S.washer].name}`)+`<div class="stack">`;
  h+=S.printers.length?S.printers.map(printerCard).join(''):`<div class="card empty">No printers yet. Buy one in the Buy tab.</div>`;
  h+='</div>';
  return h;
}
function carrierOpts(dest){
  return Object.keys(CARRIERS).filter(id=>S.car[id]&&!(CARRIERS[id].nl&&dest!=='nl')).map(id=>`<option value="${id}" ${S.ship[dest]===id?'selected':''}>${CARRIERS[id].name}</option>`).join('');
}
function vOrders(){
  const pk=PKEYS.reduce((a,k)=>a+Math.min(S.stock[k],S.orders.filter(o=>o.p===k).length),0);
  let h=segs('orders',[['queue','Orders'],['dms','Inbox',S.dms.length],['deals','Big deals',typeof dealsOf==='function'&&dealsOpen()?dealsOf().active.length:0],['jobs','Contracts'],['catalog','Catalog'],['delivery','Delivery']]);
  if(sub.orders==='deals')return h+dealsView();
  if(sub.orders==='queue'){
    h+=typeof dispatchCard==='function'?dispatchCard():'';
    h+=label('Ready to ship',`cancel after ${5+Math.min(countRole('support'),3)*2} days`)+`<div class="group">${item(`${pk} order${pk===1?'':'s'} can ship now`,`Packing costs ${en(E.pack())} per order`,`<button class="btn primary sm" data-a="packAll" ${pk?'':'disabled'}>Pack all</button>`)}</div>`;
    const ks=PKEYS.filter(k=>S.orders.some(o=>o.p===k));
    h+=label('Waiting',`${S.orders.length} orders`)+`<div class="group">`;
    h+=ks.length?ks.map(k=>{const os=S.orders.filter(o=>o.p===k),old=Math.max(...os.map(o=>o.age));return item(`${PRODUCTS[k].name} <span class="f">×${os.length}</span>`,`${S.stock[k]} ready · ${S.cured[k]} to finish${os.some(o=>o.pre)?` · ${os.filter(o=>o.pre).length} pre-ordered`:''} · oldest ${old} d`,old>=4?'<span class="chip bad">Late</span>':'')}).join(''):`<div class="empty">No open orders. Build hype in Empire › Media.</div>`;
    h+='</div>';
  }else if(sub.orders==='dms'){
    h+=label('Messages',`reply within 2 days · ${E.dm()} energy each`)+`<div class="stack">`;
    h+=S.dms.length?S.dms.map(d=>`<div class="card"><div style="display:flex;gap:10px;align-items:flex-start"><div class="grow"><div class="t" style="font-weight:700">${dmText(d)}</div><div class="s">${d.age?`${d.age} day${d.age>1?'s':''} ago`:'Today'}</div></div>${d.age>=2?'<span class="chip bad">Urgent</span>':''}</div><div class="opts">${dmOpts(d).map((o,i)=>`<button class="btn sm ${i===0?'uv':'ghost'}" data-a="dm" data-id="${d.id}" data-i="${i}" ${o.ok&&!o.ok()?'disabled':''}>${o.l}</button>`).join('')}</div></div>`).join(''):`<div class="card empty">Inbox zero.</div>`;
    h+='</div>';
  }else if(sub.orders==='jobs'){
    h+=jobsView();
  }else if(sub.orders==='delivery'){
    const st=S.dstat,done=st.del+st.lost+st.dmg;
    h+=label('In transit',`${S.parcels.length} parcel${S.parcels.length===1?'':'s'}`)+`<div class="group">`;
    const by={};S.parcels.forEach(p=>by[p.cid]=(by[p.cid]||0)+1);
    h+=Object.keys(by).length?Object.keys(by).map(id=>item(CARRIERS[id].name,`${by[id]} on the way`)).join(''):`<div class="empty">No parcels on the road.</div>`;
    h+=item('Track record',`${st.del} delivered · ${st.lost} lost · ${st.dmg} damaged${done?` · ${Math.round(100*st.del/done)}% perfect`:''}`)+'</div>';
    h+=label('Delivery rules','which carrier ships where')+`<div class="group">`;
    for(const d in DESTS){const D=DESTS[d],C=CARRIERS[carrierFor(d)];h+=`<div class="item"><div class="grow"><div class="t">${D.name}</div><div class="s">${Math.round(D.w*100)}% of orders · about ${fmt(PRODUCTS.desk.ship*C.mult*D.cost)} for a desk figure</div></div><select class="sel" data-ship="${d}">${carrierOpts(d)}</select></div>`}
    h+='</div>'+`<div class="card" style="margin-top:12px"><div class="s">Carriers are bought in the Shop.</div></div>`;
  }else{
    h+=catalogView();
  }
  return h;
}
function vBuy(){
  let h='';
  const price=(a,k,cost,dis,extra='')=>`<button class="btn sm primary" data-a="${a}" data-k="${k}" ${extra} ${dis?'disabled':''}>${fmt(cost)}</button>`;
  if(sub.buy==='printers'){
    h+=`<div style="margin-top:12px">${segs('pg',PGROUPS.map((n,i)=>[String(i),n])).replace('margin-top:18px','')}</div>`;
    if(+sub.pg===4)h+=`<div class="card" style="margin-top:14px"><div class="t">Laboratorium</div><div class="s" style="margin-top:4px">Beyond PolyJet and injection moulding. Every Laboratorium printer makes every product without moulds or washing, in huge batches, with almost no failures and a quality bonus. Needs an industrial unit, the 3-phase power connection and the Laboratorium wing (Buy › Space).</div></div>`;
    h+=label(PGROUPS[+sub.pg]+' printers',`${S.printers.length} of ${space().printers} spots`)+`<div class="group">`;
    for(const t in PRINTERS){const D=PRINTERS[t];if(D.grp!==+sub.pg)continue;const lk=printerLock(D);
      const kind=D.lab?'Next-gen':D.inj?'Injection moulding':D.pj?'PolyJet':D.fam==='carbon'?'Carbon DLS':D.form?'Cartridge':'Open vat';
      h+=itemArt(artBox(printerArt(t),'','',['p',t]),D.name,lk?`<span class="f">${lk}</span>`:`${kind} · ${TIERS[D.tier]} · ${D.slots} slots · ${D.speed}× · ${Math.round(D.fail*1000)/10}% fail`,price('buyPrinter',t,D.cost,!!lk||S.cash<D.cost||S.printers.length>=space().printers))}
    h+='</div>';
  }else if(sub.buy==='resin'){
    h+=label('Official resin',S.mk.resin>1.03||S.mk.resin<.97?`market ${S.mk.resin>1?'+':''}${Math.round((S.mk.resin-1)*100)}%${S.up.bulk?' · bulk −20%':''}`:S.up.bulk?'20% bulk discount':'market price')+'';
    const own=new Set(S.printers.map(p=>PRINTERS[p.type].fam));own.add('vat');
    for(const f in FAMS){if(!own.has(f))continue;
      h+=label(FAMS[f])+`<div class="group">`;
      for(const k in RESINS){const R2=RESINS[k];if(R2.fam!==f)continue;
        h+=`<div class="item rsitem" style="flex-wrap:wrap">${artBox(resinArt(k),'rsart')}<div class="grow" style="min-width:50%"><div class="t">${R2.name} ${R2.q>0?`<span class="chip good">+${R2.q.toFixed(2)}★</span>`:''}</div><div class="s">${R2.note} · ${R2.pack} · <b class="num" style="color:var(--ink)">${amt(k,S.resin[k]||0)}</b> in stock</div></div>
        <div style="display:flex;gap:6px"><button class="btn sm" data-a="resin" data-k="${k}" data-n="1" ${S.cash<resinPrice(k)?'disabled':''}>1× ${fmt(resinPrice(k))}</button>${S.ws>=1?`<button class="btn sm primary" data-a="resin" data-k="${k}" data-n="5" ${S.cash<resinPrice(k)*4.5?'disabled':''}>5× ${fmt(resinPrice(k)*4.5)}</button>`:''}</div></div>`}
      h+='</div>'}
    if(own.size<2)h+=`<div class="label"><small>Cartridge, PolyJet and pellet supplies show up once you own that kind of machine.</small></div>`;
    if(S.ws<1)h+='<div class="label"><small>5-packs unlock with a small studio.</small></div>';
  }else if(sub.buy==='gear'){
    h+=label('Wash & cure','prints per batch')+`<div class="group">`;
    const ks=Object.keys(WASHERS),cur=ks.indexOf(S.washer);
    ks.forEach((k,i)=>{const W=WASHERS[k],lock=S.ws<W.ws;h+=item(`<span style="display:flex;align-items:center;gap:10px"><img class="gimg" src="${washImg(k)}" alt="">${W.name}</span>`,`${W.cap} per batch${lock?` · needs a ${SPACES[W.ws].name.toLowerCase()}`:''}`,k===S.washer?'<span class="chip amber">Yours</span>':i>cur?price('washer',k,W.cost,lock||S.cash<W.cost):'<span class="chip">Owned</span>')});
    h+='</div>';
    if(S.printers.some(p=>PRINTERS[p.type].inj)){
      h+=label('Injection moulds','steel moulds make parts almost for free')+`<div class="group">`;
      for(const k of PKEYS){if(!PRODUCTS[k].inj||!unlocked(k))continue;h+=item(PRODUCTS[k].name,`Mould for one product. Parts need no washing.`,S.moulds[k]?'<span class="chip good">Owned</span>':price('mould',k,mouldCost(k),S.cash<mouldCost(k)))}
      h+='</div>';
    }
  }else{
    h+=label('Workspace')+`<div class="group">`;
    SPACES.forEach((W,i)=>{const lk=i>S.ws?moveLock(i):'';h+=item(W.name,`${W.printers} printers · ${W.staff} staff · ${fmt(W.rent)}/week${lk&&i===S.ws+1?` · <span class="f">${lk}</span>`:''}`,i===S.ws?'<span class="chip amber">Current</span>':i>S.ws?price('move',i,W.cost,S.cash<W.cost||i>S.ws+1||!!lk):'')});
    h+='</div>'+label('Site upgrades',`${S.printers.length} of ${space().printers} printer spots · ${studioStaff().length} of ${space().staff} staff`)+`<div class="group">${upgradeItems('site')}</div>`;
  }
  return h;
}
const GROUPS=[['Production',['tech','post','painter','engineer','inspector','buyer']],['Sales & service',['packer','support','logistics','salesrep']],['Creative & office',['social','designer','photographer','accountant']]];
function vTeam(){
  const st=studioStaff();
  const bo=[];
  if(ofRole('tech').length)bo.push(`Prints ${Math.round((printRate()-1)*100)}% faster`);
  if(failMult()<1)bo.push(`${Math.round((1-failMult())*100)}% fewer failed prints`);
  if(resinMult()<1)bo.push(`${Math.round((1-resinMult())*100)}% less resin used`);
  if(wearMult()<1)bo.push(`${Math.round((1-wearMult())*100)}% less wear`);
  if(qualBonus()>0)bo.push(`+${qualBonus().toFixed(2)}★ print quality`);
  if(supportPower()>0)bo.push(`+${supportPower().toFixed(2)}★ service`);
  if(socialHype()>0)bo.push(`+${socialHype().toFixed(1)} hype a day`);
  if(designMult()>1)bo.push(`Figures worth ${Math.round((designMult()-1)*100)}% more`);
  if(photoMult()>1)bo.push(`+${Math.round((photoMult()-1)*100)}% orders`);
  if(logiSave()>0)bo.push(`${Math.round(logiSave()*100)}% cheaper shipping`);
  if(salesMult()>1)bo.push(`+${Math.round((salesMult()-1)*100)}% contract pay`);
  let h=label('Team',`${st.length} of ${space().staff} · ${fmt(wages())}/day`)+`<div class="group">`;
  h+=item('You <span class="chip uv">Owner</span>',`${Math.round(S.energy)}/${maxE()} energy · +${regen().toFixed(1)}/h · more in Shop › Upgrades`)+crunchRow();
  for(const s of S.staff){
    if(s.mach)continue;
    if(s.role==='clerk'){h+=`<div class="item"><div class="grow"><div class="t">${s.name} ${moodChip(s.mood)}</div><div class="s">${STORES[s.store].name} clerk · ${fmt(s.wage)}/day</div></div><button class="btn sm ghost" data-a="fire" data-id="${s.id}">Let go</button></div>`;continue}
    const lv=s.lvl||1,lo=lv>1?XPN[lv-2]:0,hi=XPN[lv-1]||lo+1,xpct=lv>=5?100:100*((s.xp||0)-lo)/(hi-lo);
    h+=`<div class="item${typeof puCls==='function'?puCls('s:'+s.id):''}" style="align-items:flex-start">${typeof puFx==='function'?puFx('s:'+s.id):''}<div class="grow"><div class="t">${s.name} <span class="chip amber">Lv ${lv}</span> ${moodChip(s.mood)}</div>
      <div class="s">${ROLES[s.role].name} · ${fmt(s.wage)}/day</div>${s.role==='buyer'&&typeof spSummary==='function'?`<div class="s">📦 ${spSummary(s)}</div>`:''}
      <div class="s"><b style="color:var(--ink)">${TRAITS[s.trait].n}</b>: ${traitDesc(s.role,s.trait)}</div>
      <div class="tm"><div class="act">${LT('sa'+s.id,s.act||'Starting up')}</div>
      <div class="row"><span class="lv">XP</span>${lbar('sx'+s.id,xpct,'var(--amber)')}</div>
      <div class="row"><span class="lv">Mood</span>${bar(s.mood,s.mood>=70?'var(--good)':s.mood>=40?'var(--warn)':'var(--bad)')}</div></div></div>
      <div style="display:grid;gap:6px"><button class="btn sm" data-a="train" data-id="${s.id}" ${lv>=5||S.cash<150*lv?'disabled':''}>${lv>=5?'Max level':'Train '+fmt(150*lv)}</button>${s.role==='buyer'?`<button class="btn sm primary" data-a="stockPlan" data-id="${s.id}">Stock plan</button>`:''}<button class="btn sm" data-a="puUnit" data-k="s:${s.id}">Power-ups ${typeof puAt==='function'&&puAt('s:'+s.id).length?'('+puAt('s:'+s.id).length+')':''}</button><button class="btn sm ghost" data-a="fire" data-id="${s.id}">Let go</button></div></div>`}
  if(S.staff.some(s=>!s.mach))h+=item('Team lunch','+20 morale for everyone, once a week',`<button class="btn sm" data-a="lunch" ${S.lunchCd?'disabled':''}>${S.lunchCd?`in ${S.lunchCd} d`:fmt(Math.max(15,S.staff.filter(s=>!s.mach).length*15))}</button>`);
  h+='</div>';
  if(bo.length)h+=label('Team bonuses')+`<div class="card"><div class="bonus">${bo.map(x=>`<span class="chip good">${x}</span>`).join('')}</div></div>`;
  if(!S.biz.kvk)h+=`<div class="card" style="margin-top:18px"><div class="t" style="font-weight:800">Register first</div><div class="s" style="margin-top:4px">To hire people you need a company. Register at the KvK for ${fmt(KVK_FEE)}.</div><div class="opts"><button class="btn sm primary" data-a="kvk" ${S.cash<KVK_FEE?'disabled':''}>Register ${fmt(KVK_FEE)}</button></div></div>`;
  for(const [gn,rs] of GROUPS){
    h+=label(gn,gn==='Production'?`work ${shift()[0]}:00–${shift()[1]}:00 · pick from 3 applicants`:'')+`<div class="group">`;
    for(const k of rs){const R2=ROLES[k],n=countRole(k);h+=item(`${R2.name}${n?` <span class="f">×${n}</span>`:''}`,`${R2.desc} From ${fmt(R2.wage)}/day.`,`<button class="btn sm primary" data-a="hire" data-k="${k}" ${st.length>=space().staff||!S.biz.kvk?'disabled':''}>Hire</button>`)}
    h+='</div>'}
  if(st.length>=space().staff)h+=`<div class="label"><small>Your ${space().name.toLowerCase()} is full. Move or add an office corner in Buy › Space.</small></div>`;
  return h;
}
function preRow(k){
  const P=S.pre[k]||{on:false,cap:5,ltd:false},open=S.orders.filter(o=>o.p===k&&o.pre).length;
  const mode=P.on?(P.ltd?`Limited run · ${P.cap} left`:`Pre-orders open · up to ${P.cap} waiting`):'Only in-stock figures can be bought';
  return `<div style="flex:1 1 100%;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--line,rgba(255,255,255,.07))"><div class="grow s" style="min-width:120px">${mode}${open?` · ${open} waiting`:''}</div>
  ${P.on?`<div class="stepper"><button class="btn sm" data-a="preCap" data-k="${k}" data-d="-1" aria-label="Fewer">−</button><b>${P.cap}</b><button class="btn sm" data-a="preCap" data-k="${k}" data-d="1" aria-label="More">+</button></div>`:''}
  <button class="btn sm ${P.on&&!P.ltd?'primary':'ghost'}" data-a="pre" data-k="${k}">${P.on&&!P.ltd?'Close pre-order':'Pre-order'}</button>
  <button class="btn sm ${P.ltd?'primary':'ghost'}" data-a="limited" data-k="${k}">${P.ltd?'Stop limited':'Limited run'}</button></div>`}
function upgradeItems(cat){return UPGRADES.filter(u=>u.cat===cat).sort((a,b)=>cat==='energy'?a.cost-b.cost:0).map(U=>{const own=S.up[U.id],ok=!U.req||U.req();return item(U.name,own||ok?U.desc:`<span class="f">${U.reqText}</span>`,own?'<span class="chip good">Owned</span>':`<button class="btn sm primary" data-a="upgrade" data-k="${U.id}" ${!ok||S.cash<U.cost?'disabled':''}>${fmt(U.cost)}</button>`)}).join('')}
function companyView(){
  const b=S.biz;let h='';
  const formName=b.kvk?(b.form==='bv'?'BV':'Eenmanszaak'):'Hobby seller';
  h+=label('Company',`worth ${fmt(value(S))}`);
  if(!b.kvk){
    h+=`<div class="card"><div class="t" style="font-weight:800">You are selling without a company</div><div class="s" style="margin-top:6px">Selling more than a hobby needs a KvK registration. It unlocks hiring, studios, business contracts, marketplaces and business carriers. If you wait too long, the Belastingdienst will fine you.</div><div class="opts"><button class="btn sm primary" data-a="kvk" ${S.cash<KVK_FEE?'disabled':''}>Register at the KvK ${fmt(KVK_FEE)}</button></div></div>`;
    return h;
  }
  h+=`<div class="group">${item('Legal form',b.form==='bv'?'Company tax 19% / 25.8%, accounting required':'Income tax up to 37% on profit',b.form==='bv'?chip('BV','amber'):`<button class="btn sm" data-a="bv" ${S.cash<2800?'disabled':''}>Become a BV €2.800</button>`)}
  ${item('KOR (small business scheme)',b.kor?`No BTW charged. Revenue this year ${fmt(b.yrRev)} of ${fmt(KOR_LIMIT)}`:`You charge 21% BTW and reclaim BTW on purchases${b.korCd>0?` · rejoin in ${b.korCd} d`:''}`,b.kor?`<button class="btn sm ghost" data-a="korLeave">Leave</button>`:`<button class="btn sm" data-a="korJoin" ${b.korCd>0||b.yrRev>KOR_LIMIT?'disabled':''}>Join</button>`)}
  ${item('Insurance',b.ins?`Covers claims and fires · ${fmt(12+4*S.staff.length)}/week`:'Liability and fire cover for claims and accidents',`<button class="btn sm ${b.ins?'ghost':'primary'}" data-a="insure">${b.ins?'Cancel':'Get insured'}</button>`)}</div>`;
  if(!b.kor){
    const liab=b.vatOut-b.vatIn;
    h+=label('BTW (VAT)',`return in ${Math.max(0,b.qNext-S.day)} days`)+`<div class="card"><div class="kv" style="margin:0"><span>Collected <b>${fmt(b.vatOut)}</b></span><span>Reclaimed <b>${fmt(b.vatIn)}</b></span><span>To pay <b>${fmt(Math.max(0,liab))}</b></span></div><div class="s" style="margin-top:8px">Set this money aside. It is not yours.</div>${b.vatDue?`<div class="opts"><button class="btn sm primary" data-a="vat">${b.vatDue.amt>=0?'Pay '+fmt(b.vatDue.amt):'Claim '+fmt(-b.vatDue.amt)}</button></div>`:''}</div>`;
  }
  const wk=b.wkInc-b.wkExp+b.taxBase,est=wk>0?incomeTax(wk):0;
  h+=label('Weekly costs',`payday in ${7-((S.day-1)%7)} d`)+`<div class="group">`;
  const wl=weekly();h+=wl.map(([c,a])=>item(c,'',`<span class="num">${fmt(a)}</span>`)).join('')+item('Profit this week',`${b.form==='bv'?'Company':'Income'} tax estimate ${fmt(est)}`,`<span class="num ${b.wkInc-b.wkExp>=0?'good':'bad'}">${sfmt(b.wkInc-b.wkExp)}</span>`)+'</div>';
  h+=label('Permits','needed for bigger buildings')+`<div class="group">`+Object.keys(PERMITS).map(k=>{const P2=PERMITS[k];return item(P2.name,P2.desc,b.perm[k]?chip('Held','good'):`<button class="btn sm primary" data-a="permit" data-k="${k}" ${S.cash<P2.cost?'disabled':''}>${fmt(P2.cost)}</button>`)}).join('')+'</div>';
  h+=label('Financing')+`<div class="group">`;
  h+=S.loans.map(l=>item(l.name,l.pct?`${Math.round(l.pct*100)}% of weekly profit · ${l.n} weeks left`:`${fmt(l.bal)} left · ${(l.rate*100).toFixed(2)}% interest a week`,l.pct?'':`<button class="btn sm" data-a="repay" data-id="${l.id}" ${S.cash<l.bal?'disabled':''}>Repay</button>`)).join('');
  h+=Object.keys(LOANS).filter(k=>!S.loans.some(l=>l.key===k)).map(k=>{const L2=LOANS[k],lk=L2.bv&&b.form!=='bv'?'Needs a BV':value(S)<(L2.minValue||L2.amt*.9)?`Needs a company worth ${fmt(L2.minValue||L2.amt*.9)}`:'';return item(L2.name,L2.desc||`${fmt(L2.amt)} over ${L2.n} weeks · ${(L2.rate*100).toFixed(2)}% a week${lk?` · <span class="f">${lk}</span>`:''}`,`<button class="btn sm primary" data-a="loan" data-k="${k}" ${lk?'disabled':''}>${fmt(L2.amt)}</button>`)}).join('');
  h+='</div>';
  return h;
}
function storesView(){
  let h='';
    const closed=Object.keys(STORES).filter(k=>!S.stores[k]),opened=Object.keys(STORES).filter(k=>S.stores[k]);
    if(opened.length){h+=label('Your stores',`rent ${fmt(rent()-space().rent)}/week`)+`<div class="stack">`;
      for(const k of opened){const D=STORES[k],st=S.stores[k],clerks=S.staff.filter(s=>s.role==='clerk'&&s.store===k).length,cap=D.capB*st.level,openToday=clerks>0||S.shift[k]===S.day;
        h+=`<div class="card"><div style="display:flex;gap:10px;align-items:flex-start"><div class="grow"><div class="t">${D.name}</div><div class="s">${openToday?'<span class="good">Open today</span>':'<span class="bad">Closed: no clerk</span>'} · yesterday ${fmt(st.last||0)}</div></div><span class="chip ${st.merged?'amber':''}">${st.merged?'Merged':'Level '+st.level}</span></div>
        <div style="margin-top:12px">${bar(st.stock/cap*100,'var(--amber)')}<div class="kv"><span>Stock <b>${st.stock}/${cap}</b> ${D.item}</span><span>Clerks <b>${clerks}/${st.level*2}</b></span>${D.spoil?'<span>Spoils overnight</span>':''}</div></div>
        <div class="opts"><button class="btn sm primary" data-a="restock" data-k="${k}">Restock ${fmt(Math.min(D.pack,cap-st.stock)*D.unit)} ${en(E.restock())}</button>
        ${clerks?'':`<button class="btn sm uv" data-a="shift" data-k="${k}" ${S.shift[k]===S.day?'disabled':''}>Work a shift ${en(E.shift())}</button>`}
        <button class="btn sm" data-a="clerk" data-k="${k}">+ Clerk €85/day</button>
        ${st.level<3?`<button class="btn sm ghost" data-a="storeUp" data-k="${k}">Level up ${fmt(D.cost*(st.level===1?.4:.8))}</button>`:''}
        ${st.merged?(k==='tcg'?`<button class="btn sm uv" data-a="tournament" ${S.cds.tourn?'disabled':''}>${S.cds.tourn?`Tournament in ${S.cds.tourn} d`:'Host tournament'} ${en(20)}</button>`:k==='cafe'?`<button class="btn sm uv" data-a="workshop" ${S.cds.work?'disabled':''}>${S.cds.work?`Workshop in ${S.cds.work} d`:'Paint workshop'} ${en(20)}</button>`:''):`<button class="btn sm ghost" data-a="merge" data-k="${k}" ${st.level<2?'disabled':''}>${st.level<2?'Merge at level 2':'Merge '+fmt(D.merge)}</button>`}</div>
        ${st.merged?'':`<div class="s" style="margin-top:10px">Merge bonus: ${D.mergeText}</div>`}</div>`}
      h+='</div>'}
    if(closed.length){h+=label('Open a store','sells on days a clerk or you work')+`<div class="group">`;
      for(const k of closed){const D=STORES[k],ok=D.req();h+=item(D.name,ok?`Sells ${D.item} · ${fmt(D.rent)}/week`:`<span class="f">${D.reqText}</span>`,`<button class="btn sm primary" data-a="openStore" data-k="${k}" ${!ok||S.cash<D.cost?'disabled':''}>${fmt(D.cost)}</button>`)}
      h+='</div>'}
  return h;
}
function channelsView(){
  let h='';
    h+=label('Sales channels','where customers find you')+`<div class="group">`;
    for(const k in CHANNELS){const C=CHANNELS[k],on=S.ch[k];h+=item(C.name,k==='web'?'Your own Shopify store':`${C.note}`,on?chip('Live','good'):`<button class="btn sm primary" data-a="channel" data-k="${k}" ${S.cash<C.cost||(C.kvk&&!S.biz.kvk)?'disabled':''}>${C.cost?fmt(C.cost):'Start'}</button>`)}
  h+='</div>';
  return h;
}
function carriersView(){
  let h=label('Carriers')+`<div class="group">`;
    for(const id in CARRIERS){const C=CARRIERS[id],own=S.car[id],blocked=(C.kvk&&!S.biz.kvk)?'Register at the KvK first':(C.req&&!C.req())?C.reqText:'';
      h+=item(C.name,`${C.note} · ×${C.mult} price · ${C.days*12>=24?Math.round(C.days)+' d':'1 d'} · ${((1-(1-C.lost)*(1-C.dmg))*100).toFixed(1)}% problems${blocked&&!own?` · <span class="f">${blocked}</span>`:''}`,own?chip('Yours','amber'):`<button class="btn sm primary" data-a="carrier" data-k="${id}" ${blocked||S.cash<C.cost?'disabled':''}>${C.cost?fmt(C.cost):'Free'}</button>`)}
  h+='</div>';
  return h;
}
function mediaView(){
  let h='';
    h+=label('Hype','drops 6% a day')+`<div class="card"><div style="display:flex;align-items:baseline;gap:10px"><span class="num" style="font-size:28px;color:var(--uv)">${Math.round(S.hype)}</span><span class="s">+50 hype doubles webshop demand</span></div><div style="margin-top:10px">${bar(S.hype/2,'var(--uv)')}</div></div>`;
    h+=saleCard()+socialView()+label('Campaigns')+`<div class="group">`;
    for(const C of CAMPAIGNS){const cd=S.cds[C.id]||0,lock=(C.minRating&&S.rating<C.minRating)||(C.minSold&&S.sold<C.minSold)||(C.minHype&&S.hype<C.minHype)||(C.kvk&&!S.biz.kvk)||(C.needCh&&!S.ch[C.needCh]);h+=item(`${C.name} <span class="chip uv">+${C.hype}</span>`,C.desc,`<button class="btn sm ${C.cost?'primary':'uv'}" data-a="camp" data-k="${C.id}" ${cd||lock||S.cash<C.cost?'disabled':''}>${cd?`in ${cd} d`:C.cost?fmt(C.cost):`Post ${en(C.energy)}`}</button>`)}
    h+='</div>';
  return h;
}
function vEmpire(){
  let h=segs('empire',[['company','Company'],['goals','Goals',sub.empire!=='goals'?Math.min(S.unread,99):0],['vault','Vault',vaultOf(S).chests.length],['items','Items',invCount()],['regulars','Regulars'],['shelf','Shelf'],['rebirth','Rebirth',canRebirth()&&sub.empire!=='rebirth'?1:0],['sing','Singularity'],['lab','R&D',typeof rdOf==='function'&&S.rd?S.rd.run.length:0],['rivals','Rivals'],['auto','Auto'],['more','More']]);
  if(sub.empire==='lab'){
    h+=rdView();
  }else if(sub.empire==='rivals'){
    h+=rivalsView();
  }else if(sub.empire==='auto'){
    h+=autoView();
  }else if(sub.empire==='sing'){
    h+=singView();
  }else if(sub.empire==='rebirth'){
    h+=rebirthView();
  }else if(sub.empire==='regulars'){
    h+=regsView();
  }else if(sub.empire==='shelf'){
    h+=shelfView();
  }else if(sub.empire==='items'){
    h+=itemsView();
  }else if(sub.empire==='vault'){
    h+=vaultView();
  }else if(sub.empire==='more'){
    h+=moreView();
  }else if(sub.empire==='company'){
    h+=companyView();
  }else{
    h+=label('Company',`worth ${fmt(value(S))}`)+`<div class="card"><div class="kv" style="margin:0"><span>Sold <b>${S.sold}</b></span><span>Revenue <b>${fmt(S.revenue)}</b></span><span>Reviews <b>${S.reviews}</b></span><span>Rent <b>${fmt(rent())}</b>/wk</span></div>${spark(S.hist)}<div class="s">Cash, last ${S.hist.length} days</div></div>`;
    h+=chartView()+reviewsView()+label('Goals',`${Object.keys(S.done).length} of ${MILESTONES.length}`)+`<div class="group">`+MILESTONES.map(m=>`<div class="item ms ${S.done[m.id]?'done':''}"><i>${S.done[m.id]?'✓':''}</i><div class="grow t">${m.t}</div></div>`).join('')+`</div>`;
    h+=label('Log')+`<div class="group">`+S.log.slice(0,40).map(l=>`<div class="item" style="min-height:0;padding:11px 16px"><span class="logd">D${l.d}</span><div class="grow s ${l.k}" style="margin:0;color:${l.k?'':'var(--ink)'}">${l.t}</div></div>`).join('')+`</div>
    <div style="margin-top:22px;text-align:center"><button class="btn sm ghost" data-a="goMore">Restart options</button></div>`;
  }
  return h;
}
const VIEWS={studio:vStudio,orders:vOrders,buy:vBuy,team:vTeam,empire:vEmpire};
/* Update the screen in place: only the parts that changed are touched, so pictures do not reload or flash. */
function morphAttrs(a,b){
  for(const at of [...a.attributes])if(!b.hasAttribute(at.name))a.removeAttribute(at.name);
  for(const at of b.attributes)if(a.getAttribute(at.name)!==at.value)a.setAttribute(at.name,at.value);
  if(a.tagName==='INPUT'){if(a.checked!==b.checked)a.checked=b.checked}
}
function morphKids(a,b){
  const ac=[...a.childNodes],bc=[...b.childNodes];
  for(let i=0;i<bc.length;i++){
    const x=ac[i],y=bc[i];
    if(!x)a.appendChild(y.cloneNode(true));
    else if(x.nodeType!==y.nodeType||(x.nodeType===1&&x.tagName!==y.tagName))a.replaceChild(y.cloneNode(true),x);
    else if(x.nodeType===1){if(x.hasAttribute('data-keep')&&y.hasAttribute('data-keep')&&x.id===y.id)continue;morphAttrs(x,y);morphKids(x,y);if(x.tagName==='SELECT'&&x.value!==y.value)x.value=y.value}
    else if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue;
  }
  for(let i=ac.length-1;i>=bc.length;i--)a.removeChild(ac[i]);
}
function morphInto(el,html){const t=document.createElement(el.tagName);t.innerHTML=html;morphKids(el,t)}
function render(){
  setT(document.getElementById('cash'),fmt(S.cash));document.getElementById('cash').classList.toggle('neg',S.cash<0);
  setT(document.getElementById('clock'),String(S.hour).padStart(2,'0')+':'+String(Math.floor(S.m)).padStart(2,'0')+(S.paused?' · paused':''));
  setT(document.getElementById('day'),`Day ${S.day}`);
  const pd=7-((S.day-1)%7);setH(document.getElementById('mPay'),`Payday <b>${pd===1?'tonight':'in '+pd+' d'}</b>`);
  const w=document.getElementById('waitBtn'),c2=skipCost(2);setH(w,`+2 h<small>${fmt(c2)}</small>`);w.disabled=S.cash<c2;
  const pb=document.getElementById('pauseBtn');setH(pb,S.paused?PLAY:PAUSE);pb.classList.toggle('on',!!S.paused);
  document.getElementById('drinkBtn').disabled=S.drinks>=drinkMax();
  setT(document.getElementById('mEnergy'),`${Math.round(S.energy)}/${maxE()}`);
  const eb=document.getElementById('mEnergyBar');eb.style.width=clamp(S.energy/maxE()*100,0,100)+'%';eb.style.background=S.energy<20?'var(--bad)':S.energy<50?'var(--warn)':'var(--good)';
  setT(document.getElementById('mRating'),S.rating.toFixed(2)+'★');
  setT(document.getElementById('mHype'),String(Math.round(S.hype)));renderLv();
  {const sh=document.getElementById('mShard'),n=rebOf(S).shards;sh.hidden=!(n>0);if(n>0)setH(sh,shardN(n))}
  if(tab==='empire'&&sub.empire==='goals')S.unread=0;
  const badge={orders:S.dms.length,empire:S.unread};
  document.querySelectorAll('#tabs button').forEach(b=>{b.classList.toggle('on',b.dataset.tab===tab);let d=b.querySelector('.dot');const n=badge[b.dataset.tab]||0;if(n){if(!d){b.insertAdjacentHTML('beforeend','<span class="dot"></span>');d=b.querySelector('.dot')}d.textContent=n>9?'9+':n}else if(d)d.remove()});
  liveVals={};
  const raw=VIEWS[tab](),main=document.getElementById('main');
  if(raw!==lastHTML){morphInto(main,raw.replace(/\u0001(\w+)\u0002/g,(m,id)=>liveVals[id]));lastHTML=raw}
  else for(const id in liveVals){const v=liveVals[id];const e1=main.querySelector('[data-l="'+id+'"]');if(e1&&e1.textContent!==v)e1.textContent=v;const e2=main.querySelector('[data-w="'+id+'"]');if(e2)e2.style.width=v+'%'}
}

