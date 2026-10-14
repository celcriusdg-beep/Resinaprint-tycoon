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
    <div class="stp st-tub ${work('post')||(unw&&S.staff.some(s=>s.role==='post'&&s.mach))?'work':''}" style="left:15%">${SVG_TUB}</div>
    <div class="stp st-q" style="left:28%">${cur}</div>
    <div class="stp st-booth ${paintSet.length?'work':''}" style="left:40%">${SVG_BOOTH}</div>${pits}
    <div class="stp st-pack ${work('packer')?'work':''}" style="left:64%">${SVG_TABLE}</div>
    <div class="stp st-bay" style="left:77%">${bay}</div>
    <div class="stp st-dock ${bayN?'work':''}" style="left:90%">${SVG_DOCK}</div></div>`;
}
