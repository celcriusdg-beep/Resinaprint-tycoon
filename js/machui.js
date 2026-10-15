/* Machine catalogue and fleet (3.7): filters, sorting, spec sheets, payback maths, tuning (Mk I to Mk IV) and a fleet dashboard. */
const MK_NAMES=['Mk I','Mk II','Mk III','Mk IV'];
const mkPw=(m,mk)=>m.pw*(1+.25*(mk||0)),mkUp=(m,mk)=>Math.round(m.up*(1+.12*(mk||0))),mkCost=(m,mk)=>Math.round(m.cost*.5*((mk||0)+1));
const MROLE_ORDER=['tech','post','painter','packer','support','social','engineer','buyer','logistics','inspector','designer','photographer','salesrep','accountant'];
const TIER_LABEL={basic:'Basic',pro:'Pro',ind:'Industrial',lab:'Prototype'};
const machLockText=m=>typeof machLock==='function'?machLock(m):'';
function mstat(m,mk){
  const pw=mkPw(m,mk),up=mkUp(m,mk),hw=ROLES[m.role].wage,out=pw*24/shiftLen(),save=Math.round(hw*out-up),pay=save>0?Math.ceil(m.cost/save):0;
  return{pw,up,hw,out,save,pay};
}
const mbar=(v,col)=>`<div class="mb"><i style="width:${Math.max(4,Math.min(100,v))}%;background:${col}"></i></div>`;
function mspecs(m,mk){
  const s=mstat(m,mk);
  return `<div class="mspec"><span>Speed</span>${mbar(Math.log10(Math.max(1,s.pw))/Math.log10(700)*100,'var(--uv)')}<b>${s.pw>=100?Math.round(s.pw):s.pw.toFixed(1)}×</b></div>
    <div class="mspec"><span>Output</span>${mbar(Math.log10(Math.max(1,s.out))/Math.log10(1700)*100,'var(--good)')}<b>${s.out.toFixed(1)}×</b></div>
    <div class="mspec"><span>Upkeep</span>${mbar(Math.log10(Math.max(1,s.up))/Math.log10(120000)*100,'var(--warn)')}<b>${fmt(s.up)}/d</b></div>`;
}
function roiLine(m,mk){
  const s=mstat(m,mk);
  return s.save>0?`Saves about <b>${fmt(s.save)}</b>/day against hiring · pays back in <b>${s.pay} d</b>`:`Costs more than hiring for this job right now`;
}
function mfilter(lab){
  let l=MACH.filter(m=>!!m.lab===lab);
  const kf=lab?'mfl':'mf',kt=lab?'mtl':'mt';
  if(sub[kf]&&sub[kf]!=='all')l=l.filter(m=>m.role===sub[kf]);
  if(sub[kt]&&sub[kt]!=='all'){l=l.filter(m=>lab&&!m.tier?('lab'+m.lvl===sub[kt]):machTier(m)===sub[kt])}
  const key={price:m=>m.cost,speed:m=>-m.pw,upkeep:m=>m.up,payback:m=>{const s=mstat(m);return s.save>0?s.pay:1e9},role:m=>MROLE_ORDER.indexOf(m.role)*1e7+m.cost}[sub.ms||'price'];
  return l.sort((a,b)=>key(a)-key(b));
}
function machCard(m){
  const R=ROLES[m.role],n=S.staff.filter(s=>s.mach===m.id).length,full=machOwned(m.lab).length>=machBays(m.lab),t=machTier(m),lock=machLockText(m);
  return `<div class="mcard ${t}${lock?' locked':''}"><div class="mart-w">${machArt(m)}<span class="chip tier ${t}">${TIER_LABEL[t]}</span></div>
    <div class="mbody"><div class="t">${m.name}${n?` <span class="f">×${n}</span>`:''}</div><div class="s"><b>${R.name}</b> · ${TRAITS[m.trait].n}</div>
      ${mspecs(m,0)}<div class="roi">${lock?`<span class="f">${lock}</span>`:roiLine(m,0)}</div>
      <div class="macts"><button class="btn sm" data-a="machInfo" data-k="${m.id}">Details</button><button class="btn sm primary" data-a="buyMach" data-k="${m.id}" ${lock||full||S.cash<m.cost?'disabled':''}>${lock?'Locked':full?'No bay':fmt(m.cost)}</button></div></div></div>`;
}
function fleetCard(s){
  const m=MACH.find(x=>x.id===s.mach),mk=s.mk||0,st=mstat(m,mk),load=Math.round((s.load||0)*100),next=mk<3?mkCost(m,mk):0;
  return `<div class="mcard own ${machTier(m)}${typeof puCls==='function'?puCls('s:'+s.id):''}">${typeof puFx==='function'?puFx('s:'+s.id):''}<div class="mart-w">${machArt(m)}<span class="chip tier ${machTier(m)}">${MK_NAMES[mk]}</span></div>
    <div class="mbody"><div class="t">${s.name} <span class="chip good">Online</span></div><div class="s">${ROLES[s.role].name} · ${TRAITS[s.trait].n}</div>
      <div class="tm"><div class="act">${LT('sa'+s.id,s.act||'Starting up')}</div></div>
      ${mspecs(m,mk)}
      <div class="mspec"><span>Busy</span>${mbar(load,'var(--amber)')}<b>${load}%</b></div>
      <div class="s" style="margin-top:4px">${nf(s.done||0)} tasks done · yesterday ${load}% busy</div>
      <div class="macts"><button class="btn sm" data-a="machInfo" data-k="${m.id}" data-id="${s.id}">Details</button>${s.role==='buyer'?`<button class="btn sm primary" data-a="stockPlan" data-id="${s.id}">Stock plan</button>`:''}<button class="btn sm" data-a="puUnit" data-k="s:${s.id}">Power-ups${typeof puAt==='function'&&puAt('s:'+s.id).length?' ('+puAt('s:'+s.id).length+')':''}</button>
        <button class="btn sm ${next?'primary':'ghost'}" data-a="tuneMach" data-id="${s.id}" ${!next||S.cash<next?'disabled':''}>${next?`Tune to ${MK_NAMES[mk+1]} ${fmt(next)}`:'Max tuned'}</button>
        <button class="btn sm ghost" data-a="sellMach" data-id="${s.id}">Sell</button></div></div></div>`;
}
function fleetSummary(lab,own){
  const bays=machBays(lab),up=own.reduce((a,s)=>a+s.wage,0),eq=own.reduce((a,s)=>a+mkPw(MACH.find(x=>x.id===s.mach),s.mk),0),
    saved=own.reduce((a,s)=>{const m=MACH.find(x=>x.id===s.mach);return a+mstat(m,s.mk).save},0),roles={};
  own.forEach(s=>roles[s.role]=(roles[s.role]||0)+1);
  return `<div class="fleet"><div class="ft"><b>${own.length}<small>/${bays}</small></b><span>Bays used</span></div><div class="ft"><b>${eq.toFixed(1)}×</b><span>Workforce power</span></div><div class="ft"><b>${fmt(up)}</b><span>Upkeep a day</span></div><div class="ft ${saved>0?'good':''}"><b>${fmt(saved)}</b><span>Saved vs hiring</span></div></div>
    <div class="rolechips">${MROLE_ORDER.map(r=>`<span class="rc ${roles[r]?'on':''}">${ROLES[r].name.split(' ')[0]}${roles[r]?` <b>${roles[r]}</b>`:''}</span>`).join('')}</div>`;
}
function machView(lab){
  const own=machOwned(lab);
  if(lab&&!S.up.labwing)return `<div class="card empty" style="margin-top:18px">The Omega Forge is sealed. Build the <b>Laboratorium wing</b> in the Shop › Upgrades skill tree to open it.</div>`;
  if(!sub.mv)sub.mv=own.length?'fleet':'catalog';
  let h=segs('mv',[['fleet',`Fleet`,own.length],['catalog','Catalogue']]);
  h+=`<div class="card mhero ${lab?'lab':''}"><div class="chk"><span>${lab?'Laboratory-grade automation':'Automation'}</span><b>${lab?'The Omega Forge':'Machines'}</b></div><div class="s" style="margin-top:4px">${lab?'Far faster than any person. Works through the night and never asks for a raise.':'The same jobs as people, but they never get tired or unhappy, work round the clock and only cost upkeep. More bays come with a bigger space.'}</div></div>`;
  if(sub.mv==='fleet'){
    h+=fleetSummary(lab,own);
    h+=own.length?`<div class="mlist">${own.map(fleetCard).join('')}</div>`:`<div class="card empty" style="margin-top:12px">No machines yet. Open the catalogue to buy your first one.</div>`;
    return h;
  }
  const tierSegs=lab?[['all','All'],['lab4','Prototype'],['lab5','Prime'],...(typeof FORGE_TIERS!=='undefined'?FORGE_TIERS.map(t=>[t,TIER_LABEL[t]]):[])]:[['all','All'],['basic','Basic'],['pro','Pro'],['ind','Industrial'],...(typeof NEW_TIERS!=='undefined'?NEW_TIERS.map(t=>[t,TIER_LABEL[t]]):[])];
  h+=label('Catalogue',`${machBays(lab)-own.length} free bay${machBays(lab)-own.length===1?'':'s'}`);
  h+=`<div class="mfil">${segs(lab?'mtl':'mt',tierSegs).replace('margin-top:18px','margin-top:0')}${segs(lab?'mfl':'mf',[['all','All jobs'],...MROLE_ORDER.filter(r=>MACH.some(m=>!!m.lab===lab&&m.role===r)).map(r=>[r,ROLES[r].name.split(' ')[0]])]).replace('margin-top:18px','margin-top:6px')}${segs('ms',[['price','Price'],['speed','Speed'],['upkeep','Upkeep'],['payback','Payback'],['role','Job']]).replace('margin-top:18px','margin-top:6px')}</div>`;
  const l=mfilter(lab);
  h+=l.length?`<div class="mlist">${l.map(machCard).join('')}</div>`:`<div class="card empty" style="margin-top:12px">Nothing matches these filters.</div>`;
  return h;
}
Object.assign(A,{
  machInfo(d){
    const m=MACH.find(x=>x.id===d.k),own=d.id?S.staff.find(x=>x.id==d.id):null,mk=own?own.mk||0:0;if(!m)return;
    const R=ROLES[m.role],s=mstat(m,mk),t=machTier(m),full=machOwned(m.lab).length>=machBays(m.lab);
    const next=own&&mk<3?mkCost(m,mk):0;
    const rows=[['Job',R.name],['Tier',TIER_LABEL[t]+(own?' · '+MK_NAMES[mk]:'')],['Skill level',m.lvl+' of 5'],['Trait',`${TRAITS[m.trait].n}: ${traitDesc(m.role,m.trait)}`],['Speed',s.pw.toFixed(1)+'× a person'],['Working hours','24 hours a day (a person works '+shiftLen()+')'],['Output','about '+s.out.toFixed(1)+'× one person'],['Price',fmt(m.cost)],['Upkeep',fmt(s.up)+' a day'],['A person doing this job costs',fmt(s.hw)+' a day']];
    modal(`<div class="mdet ${t}">${machArt(m,1)}</div><h3>${m.name}</h3><p>${R.desc}</p>
      <div class="dtable">${rows.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
      <div class="card" style="margin:12px 0"><div class="t">Compared with hiring</div><div class="s" style="margin-top:4px">${roiLine(m,mk)}</div></div>
      ${!own?`<p class="s" style="margin:0 0 10px">Tuning: Mk II, III and IV each add +25% speed for +12% upkeep, after you buy it.</p>`:''}
      ${own&&m.role==='buyer'&&typeof spSummary==='function'?`<div class="card" style="margin:0 0 12px"><div class="t">Stock plan</div><div class="s" style="margin-top:4px">${spSummary(own)}</div></div>`:''}<div class="acts">${own?`${m.role==='buyer'?'<button class="btn primary" data-choice="1">Edit stock plan</button>':''}<button class="btn ghost" data-choice="0">Close</button>`:`<button class="btn primary" data-choice="0" ${machLockText(m)||full||S.cash<m.cost?'disabled':''}>${machLockText(m)||(full?'No free bay':'Buy '+fmt(m.cost))}</button><button class="btn ghost" data-choice="1">Close</button>`}</div>`);
    pending=own?[{f:()=>{}},{f:()=>setTimeout(()=>spSheet(own.id),0)}]:[{f:()=>A.buyMach({k:m.id})},{f:()=>{}}];
  },
  tuneMach(d){
    const s=S.staff.find(x=>x.id==d.id),m=s&&MACH.find(x=>x.id===s.mach);if(!s||!m)return;
    const mk=s.mk||0;if(mk>=3)return;const c=mkCost(m,mk);if(S.cash<c)return toast('Not enough cash');
    spend('Machine tuning',c);s.mk=mk+1;s.pw=mkPw(m,s.mk);s.wage=mkUp(m,s.mk);s.tuned=(s.tuned||0)+c;
    log(`${s.name} tuned to ${MK_NAMES[s.mk]}: ${s.pw.toFixed(1)}× speed.`,'good');toast(`${s.name} is now ${MK_NAMES[s.mk]}`);confetti(25);snd('good');
  },
  sellMach(d){
    const s=S.staff.find(x=>x.id==d.id);if(!s)return;const m=MACH.find(x=>x.id===s.mach),back=Math.round((m.cost+(s.tuned||0))*.4);
    confirmBox(`Sell ${s.name}?`,`You get ${fmt(back)} back (40% of everything you put into it).`,()=>{S.staff=S.staff.filter(x=>x!==s);earn('Machine sales',back);toast(`Sold for ${fmt(back)}`)});
  }
});
