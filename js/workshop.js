/* Studio scene: your workshop as a picture. Printers, crew, stock and the bench are drawn from the real game state. */
function printerAct(p){
  const D=PRINTERS[p.type];
  if(p.state==='printing')return{t:LT('sp'+p.id,Math.floor(100*(1-p.job.left/p.job.total))+'%'),dis:1,cls:'run'};
  if(p.state==='done')return{t:'Collect',cls:'done'};
  if(p.state==='failed')return{t:'Clean',cls:'fail'};
  if(whyNot(p,p.prod))return{t:'Set up',dis:1,cls:'warn'};
  if(!D.form&&p.vat<jobMl(p)){if((S.resin[p.resin]||0)>0)return{t:'Refill',cls:'idle'};return{t:'No resin',dis:1,cls:'warn'}}
  if(D.form&&(S.resin[p.resin]||0)<jobMl(p))return{t:D.inj?'No pellets':'No supply',dis:1,cls:'warn'};
  if(p.cond<=0)return{t:'Worn out',dis:1,cls:'warn'};
  return{t:'Start',cls:'idle'};
}
const ROLE_HUE={tech:210,post:170,painter:330,packer:30,support:280,social:300,engineer:50,buyer:120,logistics:90,inspector:190,designer:260,photographer:15,salesrep:240,accountant:140};
function avatar(s){
  const hue=ROLE_HUE[s.role]||200,working=s.act&&!/Off shift|Waiting|Starting/.test(s.act),nm=`${s.name} · ${ROLES[s.role]?ROLES[s.role].name:'Clerk'}${s.act?' · '+s.act:''}`;
  const body=s.mach
    ?`<rect x="7" y="9" width="18" height="15" rx="4" fill="hsl(${hue} 35% 62%)"/><rect x="10" y="4" width="12" height="8" rx="3" fill="hsl(${hue} 30% 78%)"/><circle cx="13.5" cy="8" r="1.5" fill="#12121c"/><circle cx="18.5" cy="8" r="1.5" fill="#12121c"/><path d="M16 4V1" stroke="hsl(${hue} 30% 78%)" stroke-width="1.6"/><rect x="11" y="24" width="3" height="4" fill="#444"/><rect x="18" y="24" width="3" height="4" fill="#444"/>`
    :`<circle cx="16" cy="7" r="4.4" fill="#e8c39e"/><path d="M7 26c0-6 4-10 9-10s9 4 9 10z" fill="hsl(${hue} 50% 58%)"/>`;
  return `<span class="crew${working?' work':''}${s.mach?' mach':''}" title="${nm.replace(/"/g,'')}"><svg viewBox="0 0 32 30" aria-hidden="true">${body}</svg></span>`;
}
function skyFor(h){
  const k=h<5||h>=21?['#0f1233','#2b2f6e']:h<8?['#f4a860','#ffd9a0']:h<17?['#6fb4ee','#cfeaff']:h<20?['#e57f5b','#ffc48a']:['#38306b','#8a5aa8'];
  return `linear-gradient(${k[0]},${k[1]})`;
}
function workshopScene(){
  const sp=space(),shown=S.printers.slice(0,12);
  let h=`<div class="shop ws${S.ws}"><div class="wall">
    <div class="win" style="background:${skyFor(S.hour)}">${S.hour>=21||S.hour<5?'<i class="moon"></i>':'<i class="sun"></i>'}</div>
    <div class="spname">${sp.name}</div>
    <div class="clockface">${String(S.hour).padStart(2,'0')}:${String(Math.floor(S.m)).padStart(2,'0')}</div>
    <div class="board"><b>${S.orders.length}</b><span>orders</span>${S.contracts.length?`<b>${S.contracts.length}</b><span>contracts</span>`:''}</div>
    <div class="shelf">`;
  const stock=PKEYS.filter(k=>S.stock[k]>0).slice(0,7);
  h+=stock.length?stock.map(k=>`<span class="sitem">${prodArt(k)}${S.stock[k]>1?`<em>${S.stock[k]}</em>`:''}</span>`).join(''):'<span class="sempty">Finished figures show up here</span>';
  h+=`</div></div><div class="floor"><div class="stns">`;
  if(!shown.length)h+=`<button class="stn empty" data-a="goBuy"><span class="pic">+</span><span class="nm">Buy your first printer</span></button>`;
  for(const p of shown){const D=PRINTERS[p.type],a=printerAct(p),pct=p.state==='printing'?100*(1-p.job.left/p.job.total):p.state==='done'?100:0;
    h+=`<button class="stn st-${p.state} ${D.lab?'lab':''} ${a.cls}" data-a="printerMain" data-id="${p.id}" ${a.dis?'disabled':''} aria-label="${short(p)}: ${p.state}">
      <span class="lamp"></span><span class="pic" style="--pct:${pct}%">${printerArt(p.type)}</span><span class="nm">${short(p).replace(/ #\d+$/,'')} <small>#${p.id}</small></span><span class="act ${a.cls}">${a.t}</span>${p.cond<35?'<i class="wrench" title="Needs service"></i>':''}</button>`}
  if(S.printers.length>12)h+=`<div class="stn more"><span class="pic">+${S.printers.length-12}</span><span class="nm">more printers below</span></div>`;
  h+=`</div><div class="crewrow">${S.staff.slice(0,18).map(avatar).join('')}${S.staff.length>18?`<span class="crewmore">+${S.staff.length-18}</span>`:''}</div></div>`;
  const uw=totUnwashed(),cu=totCured(),fk=nextFinish(),pk=packableIdx()>=0;
  h+=`<div class="bench">
    <button class="bst ${uw?'go':''}" data-a="wash" ${uw?'':'disabled'}><b>${uw}</b><strong>Wash & cure</strong><span>${uw?en(washE()):'nothing yet'}</span></button>
    <button class="bst ${fk?'go':''}" data-a="finish" ${fk?'':'disabled'}><b>${cu}</b><strong>Finish</strong><span>${fk?en(finishE(fk)):'nothing yet'}</span></button>
    <button class="bst ${pk?'go':''}" data-a="pack" ${pk?'':'disabled'}><b>${PKEYS.reduce((a,k)=>a+Math.min(S.stock[k],S.orders.filter(o=>o.p===k).length),0)}</b><strong>Pack & ship</strong><span>${pk?en(E.pack()):'nothing yet'}</span></button>
  </div></div>`;
  return h;
}
Object.assign(A,{goBuy(){tab='buy';sub.buy='printers'}});
/* new Studio layout: scene first, then the old cards */
const _vStudio0=vStudio;
vStudio=function(){return workshopScene()+chapterCard()+eventCard()+paintCard()+_vStudio0()};
VIEWS.studio=vStudio;
/* HUD extras: goal strip, floating money, level-up confetti, story checks */
let _lastCash=null,_lastLv=null;
const _render0=render;
render=function(){
  _render0();
  try{
    document.body.dataset.tab=tab;
    setH(document.getElementById('goal'),goalHTML());
    document.getElementById('mRating').textContent=S.rating.toFixed(2);
    const ce=document.getElementById('cash');
    if(_lastCash!=null&&S.started){const d=S.cash-_lastCash;
      if(d>=5){flyer('+'+fmt(d),'',ce);ce.classList.remove('pulse');void ce.offsetWidth;ce.classList.add('pulse');snd('coin')}
      else if(d<=-5&&d>-1e12)flyer('−'+fmt(-d),'neg',ce)}
    _lastCash=S.cash;
    if(_lastLv!=null&&S.lv>_lastLv){confetti(70);snd('level');buzz([20,40,20])}
    _lastLv=S.lv;
    storyCheck();if(typeof skillOpen!=='undefined'&&skillOpen)refreshSkill();
  }catch(e){console.error(e)}
};
const _reveal0=showVaultReveal;
showVaultReveal=function(i){_reveal0.apply(null,arguments);try{snd('chest');if(i>=3)confetti(40+i*14);buzz(i>=3?[30,40,30]:15)}catch(e){}};
Object.assign(A,{sound(){setSound(!sndOn);toast(sndOn?'Sound on':'Sound off')}});
