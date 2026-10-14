/* Animated workshop (3.10): printers show their print building up, finished prints fly through wash, finish and stock, and people and machines move differently. */
const IDLE_RE=/^(Off shift|Waiting|Starting|No |Printers full|Nothing)/;
function stationFx(p){
  if(p.state==='printing'){
    const k=p.job.prod;
    return `<i class="uv"></i><i class="scan"></i><span class="mini"><span class="fig">${prodArt(k)}</span></span>`;
  }
  if(p.state==='done')return `<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><span class="mini full"><span class="fig">${prodArt(p.job.prod)}</span></span>`;
  if(p.state==='failed')return `<i class="puff p1"></i><i class="puff p2"></i><i class="puff p3"></i>`;
  return '';
}
const SKIN_T=['#e8c39e','#d9a066','#c98d5f','#f0d0b0'];
function humanSprite(s,hue,idx){
  const skin=SKIN_T[(s.id||idx)%4],body=`hsl(${hue} 50% 52%)`,hair=['#3a2a1c','#7a4a22','#1c1c24','#b8863a'][((s.id||idx)>>1)%4];
  const tool={
    tech:'<rect x="24" y="23" width="8" height="6" rx="1" fill="#9be1ff"/><rect x="25" y="24" width="6" height="4" fill="#12202c"/>',
    post:'<rect x="24" y="23" width="8" height="5" rx="2" fill="#f7d774"/><path d="M26 25h4" stroke="#c9a23a"/>',
    painter:'<rect x="27" y="18" width="2" height="11" fill="#8a5a2b"/><rect x="26" y="14" width="4" height="5" rx="1" fill="#ff6a9a"/>',
    packer:'<circle cx="27" cy="26" r="4.4" fill="#d9a066"/><circle cx="27" cy="26" r="1.8" fill="#2a1d10"/>'
  }[s.role]||'<rect x="22" y="27" width="11" height="6" rx="1" fill="#ccd3e0"/><rect x="23" y="28" width="9" height="3.4" fill="#12202c"/>';
  return `<svg viewBox="0 0 34 42" aria-hidden="true"><ellipse cx="16" cy="40.5" rx="9" ry="2" fill="#0005"/>
    <rect class="leg l" x="10" y="28" width="5" height="12" rx="2.4" fill="#2c2f4a"/><rect class="leg r" x="17" y="28" width="5" height="12" rx="2.4" fill="#2c2f4a"/>
    <g class="trunk"><rect x="8" y="14" width="16" height="16" rx="6" fill="${body}"/><circle cx="16" cy="9" r="6.4" fill="${skin}"/><path d="M9.6 8c0-4 3-6.6 6.4-6.6S22.4 4 22.4 8c-2-2-4-2.6-6.4-2.6S11.6 6 9.6 8z" fill="${hair}"/>
    <g class="arm"><rect x="20" y="15" width="5" height="12" rx="2.5" fill="${skin}"/>${tool}</g></g></svg>`;
}
function crewScene(){
  const staff=S.staff.slice(0,18),ZONE={post:12.5,painter:37.5,packer:62.5,logistics:87.5},office=[7,23,39,55,71,87];
  const count={},seen={};staff.forEach(s=>count[s.role]=(count[s.role]||0)+1);
  let oi=0;
  const out=staff.map((s,idx)=>{
    const hue=ROLE_HUE[s.role]||200,idle=!s.act||IDLE_RE.test(s.act),off=!s.mach&&s.act==='Off shift',work=!idle;
    const i=seen[s.role]=(seen[s.role]||0)+1,n=count[s.role];
    let x,move='';
    if(s.role==='tech'){move=s.mach?' rail':' patrol';x=0}
    else if(ZONE[s.role]!==undefined)x=ZONE[s.role]+(i-1-(n-1)/2)*9;
    else x=office[(oi++)%office.length];
    const style=move?`animation-delay:${-(idx*2.3).toFixed(1)}s`:`left:${x}%`;
    const nm=`${s.name} · ${ROLES[s.role]?ROLES[s.role].name:'Clerk'}${s.act?' · '+s.act:''}`.replace(/"/g,'');
    const cls=`cw${move} ${s.mach?'mach':'human'} ${work?'work':'idle'}${off?' off':''}${s.role==='tech'&&work&&!s.mach?' walk':''} r-${s.role}`;
    const sprite=s.mach?`${machArt(MACH.find(m=>m.id===s.mach))}<i class="led"></i>`:humanSprite(s,hue,idx);
    return `<span class="${cls}" style="${style}" title="${nm}"><span class="flip">${sprite}${off?'<em class="zz">z z</em>':''}</span></span>`;
  }).join('');
  return `<div class="crewrow"><div class="zl z1">Wash</div><div class="zl z2">Finish</div><div class="zl z3">Pack</div><div class="zl z4">Send</div>${out}${S.staff.length>18?`<span class="crewmore">+${S.staff.length-18}</span>`:''}</div>`;
}
/* ---- flying prints: station -> wash tub -> finishing -> shelf -> parcel -> orders board ---- */
let _flow=null;
const PARCEL='<svg viewBox="0 0 16 16"><path d="M2 5l6-3 6 3v6l-6 3-6-3z" fill="#c9a06a" stroke="#7a5a35" stroke-width="1"/><path d="M2 5l6 3 6-3M8 8v6" stroke="#7a5a35" stroke-width="1" fill="none"/></svg>';
const q$=s=>document.querySelector(s);
function splash(el){
  if(!el||!document.body.contains(el))return;const r=el.getBoundingClientRect(),d=document.createElement('i');d.className='ringfx';
  d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+r.height/2)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),600);
}
function fly(from,to,html,delay,dur){
  if(!from||!to||!html||!el_ok(from)||!el_ok(to))return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),el=document.createElement('div');el.className='fly';el.innerHTML=html;document.body.appendChild(el);
  const x0=a.left+a.width/2-14,y0=a.top+a.height/2-14,x1=b.left+b.width/2-14,y1=b.top+b.height/2-14,mx=(x0+x1)/2,my=Math.min(y0,y1)-46;
  const an=el.animate([{transform:`translate(${x0}px,${y0}px) scale(.5)`,opacity:0},{transform:`translate(${x0+(mx-x0)*.35}px,${y0+(my-y0)*.6}px) scale(1)`,opacity:1,offset:.18},{transform:`translate(${mx}px,${my}px) scale(1.12)`,offset:.5},{transform:`translate(${x1}px,${y1}px) scale(.6)`,opacity:.85}],{duration:dur||900,delay:delay||0,easing:'ease-in-out',fill:'both'});
  an.onfinish=()=>{el.remove();splash(to)};an.oncancel=()=>el.remove();
}
const el_ok=e=>e&&e.getBoundingClientRect&&e.getBoundingClientRect().width>0;
/* animation intensity: Smart batches busy streams into a few flights, Calm only pulses, Off stops the flights */
function animMode(){try{return localStorage.getItem('resinaprint-anim')||'smart'}catch(e){return 'smart'}}
function applyAnimMode(){document.body.classList.toggle('noanim',animMode()==='off')}
applyAnimMode();
const _stage={},_pend={};
function stageFly(stage,count,from,to,html,dur){
  const mode=animMode();if(mode==='off'||count<=0)return;
  _pend[stage]=(_pend[stage]||0)+count;
  const n=_pend[stage],t=performance.now(),cool=n>8?1600:1000;
  if(t-(_stage[stage]||0)<cool)return;
  if(mode==='calm'){splash(to);_stage[stage]=t;_pend[stage]=0;return}
  if(document.querySelectorAll('.fly').length>4)return;
  _stage[stage]=t;_pend[stage]=0;
  fly(from,to,html+(n>1?`<b class="cnt">×${n>99?'99+':n}</b>`:''),0,dur);
}
const TRUCK='<svg viewBox="0 0 32 28"><rect x="2" y="7" width="17" height="14" rx="2" fill="#c9a06a" stroke="#7a5a35" stroke-width="1.4"/><path d="M19 11h6l5 5v5H19z" fill="#7a5a35"/><circle cx="8" cy="23" r="3" fill="#222"/><circle cx="24" cy="23" r="3" fill="#222"/></svg>';
function flowSnap(){
  const o={unw:{},cur:{},stock:{},bay:(typeof bayOf==='function'?bayOf().length:0),pst:{}};
  for(const k of PKEYS){o.unw[k]=S.unwashed[k]||0;o.cur[k]=S.cured[k]||0;o.stock[k]=S.stock[k]||0}
  for(const p of S.printers)o.pst[p.id]={st:p.state,prod:p.job&&p.job.prod,units:p.job&&p.job.units,type:p.type};
  return o;
}
function flowTick(){
  const now=flowSnap(),prev=_flow;_flow=now;
  if(!prev||tab!=='studio'||document.hidden||typeof prodArt!=='function')return;
  const wash=q$('.bst[data-a="wash"]'),fin=q$('.bst[data-a="finish"]'),pack=q$('.bst[data-a="pack"]'),send=q$('.bst[data-a="sendBay"]'),win=q$('.win'),shelf=q$('.shelf');
  const thumb=k=>`<span class="ft">${prodArt(k)}</span>`;
  /* 1. collected: the batch drops into the wash tub (injection, PolyJet and lab prints go straight to finishing) */
  let cw=0,cf=0,wEl=null,fEl=null,wP=null,fP=null;
  for(const id in prev.pst){
    const a=prev.pst[id],b=now.pst[id];
    if(a.st==='done'&&b&&b.st!=='done'&&a.prod){
      const D=PRINTERS[a.type],el=q$(`.stn[data-id="${id}"] .pic`);
      if(D.inj||D.pj||D.lab){cf+=a.units||1;fEl=fEl||el;fP=fP||a.prod}else{cw+=a.units||1;wEl=wEl||el;wP=wP||a.prod}
    }
  }
  if(cw)stageFly('cw',cw,wEl,wash,thumb(wP),850);
  if(cf)stageFly('cf',cf,fEl,fin,thumb(fP),850);
  /* 2. washed and cured, 3. finished and stocked */
  let dw=0,dwP=null,ds=0,dsP=null;
  for(const k of PKEYS){
    const w=prev.unw[k]-now.unw[k];if(w>0&&now.cur[k]>prev.cur[k]){dw+=w;dwP=dwP||k}
    const f=now.stock[k]-prev.stock[k];if(f>0&&now.cur[k]<prev.cur[k]){ds+=f;dsP=dsP||k}
  }
  if(dw)stageFly('wash',dw,wash,fin,thumb(dwP),800);
  if(ds){let el=shelf;if(dsP)for(const x of document.querySelectorAll('.shelf .sitem'))if(x.dataset.k===dsP)el=x;stageFly('fin',ds,fin,el,thumb(dsP),850)}
  /* 4. packed into the dispatch bay, 5. the courier takes the batch */
  const db=now.bay-prev.bay;
  if(db>0){stageFly('pack',db,shelf,pack,PARCEL,650);stageFly('bay',db,pack,send,PARCEL,750)}
  if(db<0)stageFly('send',-db,send,win,TRUCK,1100);
}
Object.assign(A,{animMode(d){try{localStorage.setItem('resinaprint-anim',d.m)}catch(e){}applyAnimMode();toast('Animations: '+d.m)}});
