/* Stock plans (4.18): every Production manager, human or machine, has its own shopping list. Per resin you set a reorder level
   and a fill-up target: when stock falls to the level, it buys bottles until the target is reached ("at 10 L, fill up to 100 L"). */
const spUnit=k=>RESINS[k].fam==='inj'?'kg':'L';
const spVol=k=>RESINS[k].vol||1000;
const spInUse=()=>[...new Set(S.printers.map(p=>p.resin))].filter(k=>RESINS[k]);
/* resins worth showing: what your machines can use, what you own, and what a plan already covers */
function spList(s){
  const fams=new Set(S.printers.map(p=>PRINTERS[p.type].fam));fams.add('vat');
  return Object.keys(RESINS).filter(k=>fams.has(RESINS[k].fam)||(S.resin[k]||0)>0||(s&&s.plan&&s.plan[k]));
}
/* with no plan yet, a manager keeps every resin in use between 1 and 3 bottles */
function spPlan(s){
  if(s.plan)return s.plan;
  const p={};for(const k of spInUse())p[k]={min:spVol(k),to:spVol(k)*3,auto:1};return p;
}
function spOrder(s){
  const plan=spPlan(s);
  for(const k in plan){const r=plan[k];if(!RESINS[k]||!r||r.off)continue;
    const have=S.resin[k]||0;if(have>r.min)continue;
    const vol=spVol(k),one=resinPrice(k)*(s.trait==='efficient'?.94:1);
    let n=Math.max(1,Math.ceil((r.to-have)/vol));
    const cost=c=>Math.floor(c/5)*one*(S.ws>=1?4.5:5)+(c%5)*one;
    while(n>0&&S.cash-cost(n)<Math.max(200,one*2))n--;   /* keep a cash cushion */
    if(n<=0){if(!s.broke){s.broke=1;if(!awayMode&&!simulating)log(`${s.name} cannot afford ${RESINS[k].name}. Stock is ${amt(k,have)}.`,'bad')}continue}
    s.broke=0;spend('Resin',cost(n));S.resin[k]=have+vol*n;did('Supplies ordered',1,true);
    if(!awayMode&&!simulating&&n>=3)log(`${s.name} restocked ${RESINS[k].name}: ${n} × ${amt(k,vol)}, now ${amt(k,S.resin[k])}.`,'');
    return{h:Math.min(1,.3+.04*n),act:`Ordering ${n} × ${RESINS[k].name}`};
  }
  return null;
}
const _stSP=staffTask;staffTask=function(s){if(s.role==='buyer')return spOrder(s);return _stSP(s)};
/* ---------- the plan sheet ---------- */
function spSheet(id){
  const s=S.staff.find(x=>x.id==id);if(!s)return;
  const plan=spPlan(s),ks=spList(s).sort((a,b)=>(plan[b]?1:0)-(plan[a]?1:0));
  const row=k=>{const R=RESINS[k],r=plan[k],u=spUnit(k),on=!!r&&!r.off,d=r||{min:spVol(k),to:spVol(k)*3};
    return `<div class="sp-row ${on?'on':''}" data-k="${k}"><label class="sp-top">${artBox(resinArt(k),'sp-art')}<input type="checkbox" class="sp-on" ${on?'checked':''}><span class="grow"><b>${R.name}</b><small>${amt(k,S.resin[k]||0)} in stock · ${amt(k,spVol(k))} for ${fmt(resinPrice(k))}</small></span></label>
      <div class="sp-nums"><label>When at<span><input type="number" inputmode="decimal" min="0" step="0.5" class="sp-min" value="${+(d.min/1000).toFixed(1)}">${u}</span></label><label>Fill up to<span><input type="number" inputmode="decimal" min="0" step="0.5" class="sp-to" value="${+(d.to/1000).toFixed(1)}">${u}</span></label></div></div>`};
  modal(`<h3>Stock plan · ${s.name}</h3><p>Tick what ${s.name} buys. When stock falls to the first number, it orders bottles until it reaches the second. ${S.ws>=1?'Orders of 5 bottles or more get the 5-pack price.':''}${s.plan?'':' This is the automatic plan: every resin in use, 1 to 3 bottles.'}</p>
    <div class="sp-list">${ks.map(row).join('')||'<div class="s">Buy a printer first.</div>'}</div>
    <div class="acts"><button class="btn primary" data-choice="0">Save plan</button><button class="btn ghost" data-choice="1">Cancel</button></div>`);
  document.querySelectorAll('.sp-row .sp-on').forEach(c=>c.addEventListener('change',()=>c.closest('.sp-row').classList.toggle('on',c.checked)));
  pending=[{f:()=>{}},{f:()=>{}}];
  /* read the form before the modal closes */
  const btn=document.querySelector('#modalRoot [data-choice="0"]');
  btn.addEventListener('click',()=>{
    const p={};document.querySelectorAll('#modalRoot .sp-row').forEach(el=>{
      const k=el.dataset.k,on=el.querySelector('.sp-on').checked,mn=Math.max(0,+el.querySelector('.sp-min').value||0)*1000;
      let to=Math.max(0,+el.querySelector('.sp-to').value||0)*1000;if(to<mn+spVol(k))to=mn+spVol(k);
      if(on)p[k]={min:mn,to};});
    s.plan=p;const n=Object.keys(p).length;pending[0]={f:()=>toast(n?`${s.name} now watches ${n} resin${n>1?'s':''}`:`${s.name} buys nothing now`)};
  },{capture:true});
}
Object.assign(A,{stockPlan(d){spSheet(d.id)}});
function spSummary(s){const p=spPlan(s),ks=Object.keys(p).filter(k=>RESINS[k]&&!p[k].off);
  if(!ks.length)return 'Buys nothing yet';
  return (s.plan?'':'Auto · ')+ks.slice(0,2).map(k=>`${RESINS[k].name.split(' ').slice(0,2).join(' ')} ${(p[k].min/1000).toFixed(p[k].min%1000?1:0)}→${(p[k].to/1000).toFixed(p[k].to%1000?1:0)} ${spUnit(k)}`).join(', ')+(ks.length>2?` +${ks.length-2}`:'');}
/* the resin shop shows what your managers keep in stock */
const _vBuySP=VIEWS.buy;VIEWS.buy=function(){
  const h=_vBuySP.apply(this,arguments);if(sub.buy!=='resin')return h;
  const bs=S.staff.filter(s=>s.role==='buyer');
  const card=bs.length?`<div class="card sp-card"><div class="t">Stock plans</div>${bs.map(s=>`<div class="item"><div class="grow"><div class="t">${s.name}</div><div class="s">${spSummary(s)}</div></div><button class="btn sm" data-a="stockPlan" data-id="${s.id}">Edit</button></div>`).join('')}</div>`
    :`<div class="card sp-card"><div class="s">Hire a <b>Production manager</b> (Team) or buy a Procurement Bot and it keeps your resin stocked: set when to reorder and how much to buy.</div></div>`;
  const i=h.indexOf('<div class="label">');return i<0?h+card:h.slice(0,i)+card+h.slice(i);
};
