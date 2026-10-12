/* Studio level, trends, difficulty, themes and the Empire > More screen. */
/* ---- studio level ---- */
const XP_NEED=l=>Math.round(30*Math.pow(l,1.55)+20);
const lvDem=()=>Math.min(.3,.01*(((S&&S.lv)||1)-1));
const lvEnergy=()=>Math.floor((((S&&S.lv)||1)-1)/5)*10;
function addXp(n){
  if(!S||n<=0)return;
  S.lv=S.lv||1;S.xp=(S.xp||0)+n;
  while(S.xp>=XP_NEED(S.lv)){
    S.xp-=XP_NEED(S.lv);S.lv++;
    const rw=40*S.lv;earn('Level rewards',rw);S.hype+=2;
    log(`Studio level ${S.lv}! +${fmt(rw)}${S.lv%5===0?' and +10 max energy':''}. Demand bonus is now +${Math.round(lvDem()*100)}%.`,'good');
    if(!simulating&&!awayMode)toast(`Level ${S.lv}! +${fmt(rw)}`);
  }
}
function levelDay(){
  const d=(S.contractsDone||0)-(S.cdSeen||0);S.cdSeen=S.contractsDone||0;
  if(d>0)addXp(d*10);
}

/* ---- trends ---- */
function newTrend(){
  const ks=PKEYS.filter(k=>unlocked(k)&&makeable(k)&&S.listed[k]&&!S.stop[k]);
  const sh=[...ks].sort(()=>Math.random()-.5);
  const old=S.trend;let up=sh.find(k=>!old||k!==old.up)||sh[0];
  let down=sh.find(k=>k!==up);
  S.trend={up:up||null,down:ks.length>=3?down||null:null,until:S.day+7};
  if(S.trend.up)log(`Trending this week: ${PRODUCTS[S.trend.up].name} (+45% demand)${S.trend.down?`. Cooling off: ${PRODUCTS[S.trend.down].name} (−30%)`:''}.`,'amber');
}
function trendDay(){if(!S.trend||S.day>=S.trend.until)newTrend()}
const trendMult=k=>{const t=S&&S.trend;return t?(t.up===k?1.45:t.down===k?.7:1):1};

/* ---- difficulty ---- */
const DIFFS={chill:{n:'Chill',dem:1.12,hit:.6,wage:.9,fail:.9,d:'More demand, softer bad events, cheaper wages'},normal:{n:'Normal',dem:1,hit:1,wage:1,fail:1,d:'The standard game'},hard:{n:'Hard',dem:.92,hit:1.4,wage:1.1,fail:1.15,d:'Less demand, nastier events, pricier wages, more failed prints'}};
const diffM=()=>DIFFS[(S&&S.diff)||'normal']||DIFFS.normal;
const THEMES={amber:'Resin amber',sakura:'Sakura',mint:'Mint',ice:'Ice'};
function applyTheme(){const t=(S&&S.theme)||'amber';const de=document.documentElement;if(de&&de.dataset&&de.dataset.theme!==t)de.dataset.theme=t}

/* ---- header level badge ---- */
function renderLv(){
  applyTheme();
  const el=document.getElementById('mLv');if(!el||!S)return;
  const lv=S.lv||1,p=Math.min(100,Math.round((S.xp||0)/XP_NEED(lv)*100));
  const h='Lv '+lv;
  if(el._h!==h){el.textContent=h;el._h=h}
  if(el.style.setProperty)el.style.setProperty('--xp',p+'%');
}

/* ---- More tab: level, stats, settings ---- */
function moreView(){
  const lv=S.lv||1,need=XP_NEED(lv),xp=S.xp||0;
  let h=label('Studio level',`${Math.round(xp)} / ${need} XP`)+`<div class="card"><div style="display:flex;align-items:center;gap:14px"><div class="lvbig">${lv}</div><div class="grow"><div class="t">Level ${lv}</div><div class="s">+${Math.round(lvDem()*100)}% demand · +${lvEnergy()} max energy · next level pays ${fmt(40*(lv+1))}</div><div class="bar" style="margin-top:10px"><i style="width:${Math.min(100,xp/need*100)}%;background:var(--grad)"></i></div></div></div><div class="s" style="margin-top:10px">Shipping a figure gives 1 XP. Daily goals give 5, finished contracts 10.</div></div>`;
  const by=Object.entries(S.soldBy||{}).sort((a,b)=>b[1]-a[1]).filter(e=>PRODUCTS[e[0]]).slice(0,5);
  const peak=Math.max(S.cash,...(S.hist||[0]));
  h+=label('Stats')+`<div class="statgrid">
   <div class="stat"><b>${S.day}</b><span>Days played</span></div>
   <div class="stat"><b>${S.sold}</b><span>Figures sold</span></div>
   <div class="stat"><b>${fmt(S.revenue)}</b><span>Revenue</span></div>
   <div class="stat"><b>${fmt(peak)}</b><span>Peak cash (30 days)</span></div>
   <div class="stat"><b>${S.rating.toFixed(2)}★</b><span>${S.reviews} reviews</span></div>
   <div class="stat"><b>${S.contractsDone||0}</b><span>Contracts done</span></div>
   <div class="stat"><b>${S.printers.length}</b><span>Printers</span></div>
   <div class="stat"><b>${S.staff.length}</b><span>Staff</span></div></div>`;
  const ds=S.dstat||{};
  h+=label('Parcels')+`<div class="card"><div class="kv" style="margin:0"><span>Sent <b>${ds.sent||0}</b></span><span>Delivered <b>${ds.del||0}</b></span><span>Lost <b>${ds.lost||0}</b></span><span>Damaged <b>${ds.dmg||0}</b></span></div></div>`;
  if(by.length){const mx=by[0][1];h+=label('Best sellers',`since 2.0`)+`<div class="group">${by.map(([k,n])=>`<div class="item">${artBox(prodArt(k),'','',['f',k])}<div class="grow"><div class="t">${PRODUCTS[k].name}</div><div class="bar" style="margin-top:7px;height:5px"><i style="width:${n/mx*100}%;background:var(--grad)"></i></div></div><b class="num">${n}</b></div>`).join('')}</div>`}
  h+=label('Difficulty')+`<div class="card"><div class="opts" style="margin:0">${Object.keys(DIFFS).map(k=>`<button class="btn sm ${(S.diff||'normal')===k?'primary':''}" data-a="diff" data-k="${k}">${DIFFS[k].n}</button>`).join('')}</div><div class="s" style="margin-top:10px">${diffM().d}.</div></div>`;
  h+=label('Theme')+`<div class="card"><div class="opts" style="margin:0">${Object.keys(THEMES).map(k=>`<button class="btn sm ${(S.theme||'amber')===k?'primary':''}" data-a="theme" data-k="${k}">${THEMES[k]}</button>`).join('')}</div></div>`;
  h+=label('About')+`<div class="card"><div class="t">Resinaprint Tycoon ${VERSION}</div><div class="s" style="margin-top:4px">${PATCH_TITLE}</div><div class="acts" style="margin-top:12px"><button class="btn sm" data-a="patchNotes">Read the patch notes</button></div></div>`;
  return h;
}
Object.assign(A,{
  diff(d){S.diff=d.k;toast(DIFFS[d.k].n+' difficulty')},
  theme(d){S.theme=d.k;applyTheme()},
  patchNotes(){showPatch()},
  goMore(){tab='empire';sub.empire='more'}
});
const _eod=endOfDay;endOfDay=function(){_eod();levelDay();trendDay()};
