/* Production line (3.12): a conveyor belt under the workshop. Prints wait in piles, move through the wash tub, queue up for the paint booth,
   and a painter (person or machine) really paints each figure before it counts as stock. */
let _deferFin=null;
const _finishOne0=finishOne;
finishOne=function(k){if(_deferFin){_deferFin.k=k;S.cured[k]--;return}_finishOne0(k)};
const _staffTask2=staffTask;
staffTask=function(s){
  if(s.role!=='painter')return _staffTask2(s);
  if(s.paint){const k=s.paint.k;s.paint=null;S.stock[k]++;S.rep.finished++;qInc('finished')}   /* the figure is dry: now it is stock */
  _deferFin={};const t=_staffTask2(s),d=_deferFin;_deferFin=null;
  if(d.k&&t){s.paint={k:d.k,t0:S.abs,dur:t.h/(skill(s)*mf(s))};t.act=`Painting a ${PRODUCTS[d.k].name.toLowerCase()}`}
  return t;
};
const paintingNow=s=>s.paint&&S.abs<s.paint.t0+s.paint.dur+.02;
function poolTokens(map,cls){
  const list=PKEYS.filter(k=>(map[k]||0)>0).sort((a,b)=>map[b]-map[a]),total=list.reduce((a,k)=>a+map[k],0);
  if(!total)return '';
  const left={};list.forEach(k=>left[k]=map[k]);const out=[];
  while(out.length<5){let did_=false;for(const k of list){if(left[k]>0&&out.length<5){out.push(k);left[k]--;did_=true}}if(!did_)break}
  return out.map(k=>`<span class="tok ${cls}">${prodArt(k)}</span>`).join('')+(total>5?`<b class="cnt2">${total>999?'999+':total}</b>`:total>1?`<b class="cnt2">${total}</b>`:'');
}
const SVG_TUB='<svg viewBox="0 0 40 30"><path d="M4 12h32l-3 15a3 3 0 0 1-3 2H10a3 3 0 0 1-3-2z" fill="#8fd3ff" opacity=".4" stroke="currentColor" stroke-width="1.6"/><path class="wave" d="M7 18q3-3 6 0t6 0 6 0 6 0" fill="none" stroke="currentColor" stroke-width="1.6"/><circle class="bub b1" cx="14" cy="24" r="1.8"/><circle class="bub b2" cx="22" cy="25" r="1.4"/><circle class="bub b3" cx="29" cy="23" r="1.7"/><path class="uvbar" d="M12 12V5M20 12V2M28 12V5" stroke="#c18bff" stroke-width="2.4" stroke-linecap="round"/></svg>';
const SVG_BOOTH='<svg viewBox="0 0 48 34"><rect x="2" y="2" width="44" height="6" rx="2" fill="currentColor" opacity=".55"/><rect x="2" y="2" width="4" height="30" fill="currentColor" opacity=".35"/><rect x="42" y="2" width="4" height="30" fill="currentColor" opacity=".35"/><path class="hose" d="M24 8v8l8 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle class="nozzle" cx="33" cy="23" r="3" fill="#ff6a9a"/><circle class="sp s1" cx="34" cy="28" r="1.6" fill="#ff6a9a"/><circle class="sp s2" cx="30" cy="29" r="1.4" fill="#7ff3ff"/><circle class="sp s3" cx="37" cy="26" r="1.4" fill="#ffd35a"/></svg>';
const SVG_TABLE='<svg viewBox="0 0 40 30"><rect x="3" y="18" width="34" height="5" rx="2" fill="currentColor" opacity=".5"/><rect x="6" y="23" width="3" height="6" fill="currentColor" opacity=".4"/><rect x="31" y="23" width="3" height="6" fill="currentColor" opacity=".4"/><path class="lid" d="M10 18l10-6 10 6" fill="#a98150" stroke="currentColor" stroke-width="1.4"/><rect x="11" y="12" width="18" height="6" fill="#c9a06a" stroke="currentColor" stroke-width="1.2"/><path class="tape" d="M16 12v6" stroke="#f1d9a8" stroke-width="3"/></svg>';
const SVG_DOCK='<svg viewBox="0 0 40 30"><rect x="2" y="8" width="22" height="14" rx="2" fill="#c9a06a" stroke="currentColor" stroke-width="1.4"/><path d="M24 12h8l6 6v4H24z" fill="currentColor" opacity=".55"/><circle class="whl" cx="9" cy="24" r="3.4" fill="#222" stroke="currentColor"/><circle class="whl" cx="31" cy="24" r="3.4" fill="#222" stroke="currentColor"/></svg>';
function beltScene(){
  const unw=poolTokens(S.unwashed,'raw'),cur=poolTokens(S.cured,'prime');
  const bayN=typeof bayOf==='function'?bayOf().length:0,bay=bayN?Array.from({length:Math.min(5,bayN)},()=>`<span class="tok box">${typeof PARCEL!=='undefined'?PARCEL:''}</span>`).join('')+(bayN>5?`<b class="cnt2">${bayN}</b>`:''):'';
  const work=r=>S.staff.some(s=>s.role===r&&s.act&&!IDLE_RE.test(s.act));
  const painters=S.staff.filter(s=>s.role==='painter'),paintSet=painters.filter(paintingNow);
  const busy=unw||cur||paintSet.length||bay;
  let pits='';
  paintSet.slice(0,4).forEach((s,i,a)=>{
    const pct=Math.max(0,Math.min(100,100*(S.abs-s.paint.t0)/s.paint.dur)),off=(i-(a.length-1)/2)*7;
    pits+=`<span class="pit" style="--pp:${pct.toFixed(0)}%;left:calc(${40+off}% - 0px)"><span class="g">${prodArt(s.paint.k)}</span><span class="c">${prodArt(s.paint.k)}</span><i class="brushline"></i></span>`;
  });
  return `<div class="belt${busy?' run':''}"><i class="rail"></i>
    <div class="stp st-in" style="left:5%">${unw}</div>
    <div class="stp st-tub ${work('post')||(unw&&S.staff.some(s=>s.role==='post'&&s.mach))?'work':''}" style="left:15%">${washIcon()}</div>
    <div class="stp st-q" style="left:28%">${cur}</div>
    <div class="stp st-booth ${paintSet.length?'work':''}" style="left:40%">${SVG_BOOTH}</div>${pits}
    <div class="stp st-pack ${work('packer')?'work':''}" style="left:64%">${uiIcon("dispatch",46)}</div>
    <div class="stp st-bay" style="left:77%">${bay}</div>
    <div class="stp st-dock ${bayN?'work':''}" style="left:90%">${uiIcon("fleet",46)}</div></div>`;
}
/* ===== 3.12b clean production line: four station cards in a row, joined by a belt. Each card is also the button for that step. ===== */
function miniTokens(map,cls,max){
  const list=PKEYS.filter(k=>(map[k]||0)>0).sort((a,b)=>map[b]-map[a]),total=list.reduce((a,k)=>a+map[k],0);
  if(!total)return '<span class="lq-empty">·</span>';
  const left={};list.forEach(k=>left[k]=map[k]);const out=[];
  while(out.length<max){let any=false;for(const k of list){if(left[k]>0&&out.length<max){out.push(k);left[k]--;any=true}}if(!any)break}
  return out.map(k=>`<span class="tk ${cls}">${prodArt(k)}</span>`).join('')+(total>out.length?`<b class="tkn">+${total-out.length>999?'999':total-out.length}</b>`:'');
}
function stationCrew(role){
  const all=S.staff.filter(s=>s.role===role);if(!all.length)return '<span class="nocrew" title="Nobody works here yet">–</span>';
  const pick=all.find(s=>s.act&&!IDLE_RE.test(s.act))||all[0],work=pick.act&&!IDLE_RE.test(pick.act),off=!pick.mach&&pick.act==='Off shift';
  const nm=`${pick.name} · ${ROLES[role].name}${pick.act?' · '+pick.act:''}`.replace(/"/g,'');
  const sprite=pick.mach?machArt(MACH.find(m=>m.id===pick.mach))+'<i class="gear"></i>':humanSprite(pick,ROLE_HUE[role]||200,0);
  return `<span class="cw ${pick.mach?'mach':'human'} ${work?'work':'idle'}${off?' off':''} r-${role}" title="${nm}"><span class="flip">${sprite}</span></span>${all.length>1?`<b class="crn">×${all.length}</b>`:''}`;
}
crewScene=function(){
  const unw=totUnwashed(),cur=totCured(),painting=S.staff.filter(s=>s.role==='painter'&&paintingNow(s));
  const packN=PKEYS.reduce((a,k)=>a+Math.min(S.stock[k],S.orders.filter(o=>o.p===k).length),0),bayN=bayOf().length,cap=dispCap(),full=bayFull();
  const fk=nextFinish(),pk=packableIdx()>=0&&!full;
  const busy=unw||cur||painting.length||bayN||packN;
  /* floor crew: printer technicians walk along the printers; office roles sit on the right */
  const techs=S.staff.filter(s=>s.role==='tech').slice(0,6),office=S.staff.filter(s=>!['tech','post','painter','packer','logistics','clerk'].includes(s.role));
  const techHTML=techs.map((s,i)=>{const work=s.act&&!IDLE_RE.test(s.act);return `<span class="cw ${s.mach?'mach rail':'human patrol'} ${work?'work':'idle'}${!s.mach&&work?' walk':''} r-tech" style="animation-delay:${-(i*2.7).toFixed(1)}s" title="${(s.name+' · '+(s.act||'')).replace(/"/g,'')}"><span class="flip">${s.mach?machArt(MACH.find(m=>m.id===s.mach))+'<i class="gear"></i>':humanSprite(s,ROLE_HUE.tech,i)}</span></span>`}).join('');
  const offHTML=office.slice(0,4).map((s,i)=>{const work=s.act&&!IDLE_RE.test(s.act);return `<span class="cw ${s.mach?'mach':'human'} ${work?'work':'idle'} r-${s.role}" title="${(s.name+' · '+ROLES[s.role].name).replace(/"/g,'')}"><span class="flip">${s.mach?machArt(MACH.find(m=>m.id===s.mach)):humanSprite(s,ROLE_HUE[s.role]||200,i)}</span></span>`}).join('')+(office.length>4?`<b class="crn">+${office.length-4}</b>`:'');
  let h=`<div class="pline">`;
  if(techs.length||office.length)h+=`<div class="crewstrip"><div class="cs-floor">${techHTML||'<span class="cs-none">No technicians</span>'}</div>${office.length?`<div class="cs-office">${offHTML}</div>`:''}</div>`;
  /* paint cell: the figure being painted, filling with colour */
  let paintMain='';
  if(painting.length){const s=painting[0],pct=Math.max(0,Math.min(100,100*(S.abs-s.paint.t0)/s.paint.dur));
    paintMain=`<span class="pfig" style="--pp:${pct.toFixed(0)}%"><span class="g">${prodArt(s.paint.k)}</span><span class="c">${prodArt(s.paint.k)}</span><i class="bl"></i></span>`;}
  else paintMain=`<span class="sticon">${paintIcon()}</span>`;
  const paintStatus=painting.length?`Painting ${Math.round(100*Math.max(0,Math.min(1,(S.abs-painting[0].paint.t0)/painting[0].paint.dur)))}%${painting.length>1?` · ${painting.length} at work`:''}`:cur?`${cur} to paint`:'Nothing to paint';
  h+=`<div class="lanes${busy?' run':''}"><i class="conv"></i>
    <button class="ln wash ${unw?'has':''}" data-a="wash" ${unw?'':'disabled'}><span class="lh">Wash</span><span class="lm"><span class="sticon st-tub ${unw?'work':''}">${washIcon()}</span>${stationCrew('post')}</span><span class="lq st-in">${miniTokens(S.unwashed,'raw',3)}</span><span class="ls">${unw?`${unw} waiting · ${en(washE())}`:'Empty'}</span></button>
    <button class="ln paint ${cur||painting.length?'has':''}" data-a="finish" ${fk?'':'disabled'}><span class="lh">Paint</span><span class="lm st-booth ${painting.length||cur?'work':''}">${paintMain}${stationCrew('painter')}</span><span class="lq st-q">${miniTokens(S.cured,'prime',3)}</span><span class="ls">${paintStatus}</span></button>
    <button class="ln pack ${packN?'has':''}" data-a="pack" ${pk?'':'disabled'}><span class="lh">Pack</span><span class="lm"><span class="sticon st-pack ${packN?'work':''}">${uiIcon("dispatch",46)}</span>${stationCrew('packer')}</span><span class="lq">${packN?`<b class="big">${packN}</b><small>orders</small>`:'<span class="lq-empty">·</span>'}</span><span class="ls">${full?'Bay is full':packN?`${en(E.pack())} each`:'No orders ready'}</span></button>
    <button class="ln send ${bayN?'has':''}${full?' full':''}" data-a="sendBay" ${bayN?'':'disabled'}><span class="lh">Send</span><span class="lm"><span class="sticon st-dock ${bayN?'work':''}">${uiIcon("fleet",46)}</span>${stationCrew('logistics')}</span><span class="lq st-bay"><span class="baybar"><i style="width:${Math.min(100,100*bayN/cap)}%"></i></span></span><span class="ls">Bay ${bayN}/${cap}</span></button>
  </div>${beltRow(unw,cur,painting,packN,bayN)}</div>`;
  return h;
};
function beltRow(unw,cur,painting,packN,bayN){
  const top=(map)=>{let b=null;for(const k of PKEYS)if((map[k]||0)>0&&(!b||map[k]>map[b]))b=k;return b};
  const ku=top(S.unwashed)||top(S.cured),kc=painting.length?painting[0].paint.k:top(S.stock);
  const segA=unw>0||cur>0,segB=(painting.length>0||packN>0)&&kc,segC=packN>0||bayN>0;
  const rider=(seg,html,cls,n)=>Array.from({length:n},(_,i)=>`<span class="rider ride-${seg} ${cls}" style="animation-delay:${(-i*0.9).toFixed(1)}s"><span class="ri">${html}</span></span>`).join('');
  let r='';
  if(segA&&ku)r+=rider('a',prodArt(ku),unw?'raw':'prime',2);
  if(segB)r+=rider('b',prodArt(kc),'',2);
  if(segC)r+=rider('c',typeof PARCEL!=='undefined'?PARCEL:'','box',2);
  const run=segA||segB||segC;
  return `<div class="beltrow${run?' run':''}"><i class="tread"></i><i class="roll r1"></i><i class="roll r2"></i><i class="roll r3"></i><i class="roll r4"></i><i class="roll r5"></i>${r}</div>`;
}
