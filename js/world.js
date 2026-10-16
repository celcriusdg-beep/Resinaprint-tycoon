/* World (2.5): every rebirth you open a new company in another country. Pick it on a 3D globe.
   Each country changes the rules of the run. Old companies stay open as branches with passive income and a permanent perk. */
const COUNTRIES={
  nl:{n:'Netherlands',f:'🇳🇱',lat:52.2,lon:5.3,t:'Home. The classic Resinaprint start.',m:{},fav:{},bp:'Shipping 5% cheaper',home:1},
  jp:{n:'Japan',f:'🇯🇵',lat:36.2,lon:138.3,t:'Anime heartland. Huge demand, high costs.',m:{dem:1.2,rent:1.4,wage:1.15,ship:1.2,resin:1.1},fav:{chibi:.25,premium:.25,fullcolor:.25},bp:'+4% demand'},
  us:{n:'USA',f:'🇺🇸',lat:39.8,lon:-98.6,t:'The biggest market, but everything is far away.',m:{dem:1.15,rent:1.3,ship:1.5,resin:.95,tax:.9},fav:{statue:.25,bust:.25},bp:'+4% contract pay'},
  de:{n:'Germany',f:'🇩🇪',lat:51.2,lon:10.4,t:'Precise collectors, solid logistics, higher tax.',m:{dem:1.05,rent:1.1,wage:1.1,ship:.9,resin:.95,tax:1.1},fav:{desk:.2,kit:.2},bp:'Printers wear 5% slower'},
  gb:{n:'United Kingdom',f:'🇬🇧',lat:54,lon:-2.5,t:'Card-game culture and pricey rent.',m:{dem:1.05,rent:1.25,ship:1.1,resin:1.05},fav:{bust:.2,deckbox:.25},bp:'+1 hype a day'},
  br:{n:'Brazil',f:'🇧🇷',lat:-10.8,lon:-52.9,t:'Cheap rent and wages, expensive imports.',m:{dem:.95,rent:.7,wage:.7,ship:1.3,resin:1.15,tax:.95},fav:{chibi:.25,desk:.25},bp:'Resin 4% cheaper'},
  au:{n:'Australia',f:'🇦🇺',lat:-25.7,lon:134.5,t:'Huge distances, passionate con scene.',m:{dem:1,ship:1.4,resin:1.2},fav:{kit:.2,premium:.2},bp:'+10 max energy'},
  kr:{n:'South Korea',f:'🇰🇷',lat:36.5,lon:127.8,t:'Colourful, fast-moving market.',m:{dem:1.15,rent:1.1,ship:.85},fav:{fullcolor:.25,licensed:.25},bp:'Prints 3% faster'}
};
const CKEYS=Object.keys(COUNTRIES);
const ctryOf=()=>COUNTRIES[(S&&S.country)||'nl']||COUNTRIES.nl;
const cm=k=>ctryOf().m[k]||1;
const ctryFav=k=>ctryOf().fav[k]||0;
const branchOf=()=>(S&&S.reb&&S.reb.branches)||{};
const hasBranch=id=>!!branchOf()[id];
/* 4.29: square-root scaling, so one giant run cannot pay half a million a day forever (€1M best: €500/day, €100M: €5k, €5B: €35k) */
const branchIncome=b=>Math.round(Math.sqrt(Math.max(0,b.best))*.5);
const branchTotal=()=>Object.values(branchOf()).reduce((a,b)=>a+branchIncome(b),0);
const MOD_TXT={dem:'Demand',rent:'Rent',wage:'Wages',ship:'Shipping',resin:'Resin',tax:'Tax'};
const modChips=(m,fav)=>{const c=[];for(const k in m){const d=Math.round((m[k]-1)*100);if(!d)continue;const good=(k==='dem')?d>0:d<0;c.push(`<span class="chip ${good?'good':'bad'}">${MOD_TXT[k]} ${d>0?'+':''}${d}%</span>`)}
  const fk=Object.keys(fav);if(fk.length)c.push(`<span class="chip uv">Loves ${fk.map(k=>PRODUCTS[k].name.split(' ')[0].toLowerCase()).join(', ')}</span>`);return c.join('')};
function branchDay(){
  const t=branchTotal();if(t>0)earn('Branch income',t);
  if(hasBranch('gb'))S.hype+=1;
}
const _eodW=endOfDay;endOfDay=function(){_eodW();branchDay()};

/* ---------- the globe ---------- */
const LAND={
  na:[[-166,64],[-162,70],[-150,71],[-140,70],[-128,70],[-115,68],[-100,70],[-90,69],[-85,66],[-93,61],[-93,57],[-87,55],[-82,53],[-79,55],[-78,60],[-72,61],[-65,59],[-61,56],[-56,52],[-60,48],[-65,45],[-70,43],[-70,41],[-74,40],[-76,37],[-76,34],[-80,32],[-81,29],[-80,26],[-82,26],[-83,29],[-86,30],[-90,29],[-94,29],[-97,27],[-97,22],[-95,19],[-91,18],[-90,21],[-87,21],[-88,16],[-84,15],[-83,11],[-81,9],[-78,8],[-80,7],[-83,8],[-86,11],[-90,13],[-94,16],[-97,16],[-101,17],[-105,20],[-106,23],[-109,26],[-112,29],[-114,30],[-115,32],[-117,32],[-118,34],[-121,35],[-123,38],[-124,41],[-124,47],[-125,50],[-130,55],[-134,58],[-141,60],[-148,60],[-152,58],[-158,57],[-163,55],[-162,59],[-166,61]],
  gl:[[-55,60],[-44,60],[-40,65],[-22,70],[-20,76],[-30,83],[-55,82],[-68,78],[-58,75],[-53,70],[-50,65]],
  sa:[[-77,8],[-72,12],[-63,11],[-55,6],[-50,1],[-45,-1],[-37,-5],[-35,-9],[-39,-15],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-63,-41],[-65,-46],[-68,-52],[-72,-54],[-74,-50],[-73,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,-1],[-78,3]],
  eu:[[-9,37],[-9,43],[-2,43.5],[-1,46],[-4,48],[-1,49.5],[2,51],[4,52],[8,54],[8,56.5],[10,57],[10,54],[14,54],[20,54.5],[22,57],[24,59.5],[29,60],[33,66],[40,67],[44,68],[55,68],[68,69],[80,73],[100,77],[113,74],[130,72],[150,71],[170,70],[180,68],[180,65],[178,62],[170,60],[163,58],[160,54],[156,51],[156,57],[150,59],[142,59],[137,54],[141,52],[140,47],[135,43],[131,42],[129,40],[129,36],[126,35],[126,38],[125,40],[121,40],[122,37],[119,37],[122,31],[120,27],[117,23],[110,21],[108,21],[106,18],[109,12],[105,9],[103,10],[100,13],[99,8],[103,1.5],[100,3],[98,8],[98,16],[94,17],[92,21],[90,22],[87,21],[85,19],[80,15],[80,10],[77,8],[73,16],[72,21],[67,24],[62,25],[57,26],[56,27],[52,28],[48,30],[50,26],[51,24],[56,25],[59,22],[55,17],[44,13],[42,16],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[29,41],[35,42],[40,41],[41,43],[37,45],[34,45.5],[36,47],[31,46.5],[29,45],[28,42],[26,41],[23,40],[24,38],[22,36.5],[20,40],[19,42],[14,45],[12,45],[16,41],[18,40],[16,38],[15.5,38],[12,42],[10,44],[8,44],[3,43],[0,39],[-1,37.5],[-5,36]],
  sc:[[5,58],[5,62],[12,66],[18,70],[26,71],[30,70],[30,66],[25,65],[22,64],[18,62],[18,59],[12,56],[10,59]],
  af:[[-17,15],[-17,21],[-13,27],[-10,30],[-6,36],[0,36],[10,37],[11,33],[20,31],[25,32],[32,31],[35,28],[38,20],[43,12],[51,12],[48,5],[41,-2],[39,-8],[40,-15],[35,-24],[33,-27],[30,-31],[26,-34],[20,-35],[18,-32],[14,-23],[12,-15],[13,-9],[9,-1],[9,4],[5,6],[-2,5],[-8,4],[-13,8],[-17,13]],
  au:[[114,-22],[122,-18],[130,-12],[136,-12],[137,-16],[142,-11],[146,-19],[153,-26],[151,-34],[146,-39],[140,-38],[135,-34],[129,-32],[115,-34],[114,-27]],
  jp:[[130,31],[132,34],[136,34],[140,35],[141,40],[142,43],[145,44],[141,45],[140,42],[139,38],[136,37],[132,35],[130,33]],
  gb:[[-5,50],[1,51],[2,53],[-1,55],[-2,57],[-2,58.5],[-6,58.5],[-6,56],[-5,55],[-3,54],[-4,52],[-5,52]],
  ie:[[-10,52],[-6,52],[-6,55],[-9,54.5]],
  ic:[[-24,64],[-14,64],[-14,66],[-22,66]],
  su:[[95,5],[98,4],[105,-3],[106,-6],[101,-3]],
  bo:[[109,2],[117,7],[119,1],[116,-4],[110,-3]],
  ng:[[131,-1],[141,-3],[150,-10],[142,-9],[135,-4]],
  nz:[[172,-34],[178,-38],[175,-41],[172,-41]],
  nz2:[[167,-46],[174,-41],[171,-45]],
  mg:[[44,-25],[49,-15],[50,-13],[44,-17]]
};
const inPoly=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
let _landCells=null;
function landCells(){
  if(_landCells)return _landCells;
  const polys=Object.values(LAND),out=[],st=2.7;
  for(let lat=-58;lat<=80;lat+=st){const n=Math.max(1,Math.round(360*Math.cos(lat*Math.PI/180)/st));
    for(let i=0;i<n;i++){const lon=-180+(i+.5)*360/n;if(polys.some(P=>inPoly(lon,lat,P)))out.push([lat,lon,360/n])}}
  return _landCells=out;
}
const llv=(lat,lon,r)=>{const a=lat*Math.PI/180,o=lon*Math.PI/180;return[r*Math.cos(a)*Math.sin(o),r*Math.sin(a),r*Math.cos(a)*Math.cos(o)]};
function buildGlobe(sel){
  const S3=Scene3(),land=landCells(),vis=branchOf();
  S3.sph(0,0,0,1,1,1,[.03,.04,.12],{nu:44,nv:26});
  S3.sph(0,0,0,1.085,1.085,1.085,rgb('#7a3bff'),{add:true,unlit:true,em:.22,alpha:.18,nu:30,nv:18});
  const lo=rgb('#3a2a8a'),hi=rgb('#3fd0e0');
  for(const [lat,lon,dl] of land){
    const hl=1.15,hw=dl/2*.86,tt=(Math.abs(lat)/70),c=mixc(hi,lo,Math.min(1,tt*.9+((lat*7+lon*3)%11)/60));
    S3.grid((u,v)=>llv(lat-hl+2*hl*v,lon-hw+2*hw*u,1.012),1,1,c,{unlit:true,em:.8});
  }
  for(const k of CKEYS){
    const C=COUNTRIES[k],on=k===sel,open=!!vis[k],col=on?rgb('#ffffff'):open?rgb('#ffb547'):rgb('#b58cff');
    const P=[llv(C.lat,C.lon,1.0),llv(C.lat,C.lon,1.04),llv(C.lat,C.lon,1.08),llv(C.lat,C.lon,1.12)];
    S3.lock(P,on?.016:.011,.007,col,col,6,{unlit:true,em:1.1});
    const h=llv(C.lat,C.lon,1.135),r=on?.055:.036;
    S3.sph(h[0],h[1],h[2],r,r,r,col,{unlit:true,em:1.3,anim:on?2:0,nu:12,nv:8});
    if(on||open)S3.sph(h[0],h[1],h[2],r*2.4,r*2.4,r*2.4,col,{add:true,unlit:true,em:.35,alpha:.35,anim:on?2:0,nu:12,nv:8});
  }
  return S3.done();
}
let WORLD={sel:'nl',mode:'view',v:null};
function worldInfoHTML(){
  const k=WORLD.sel,C=COUNTRIES[k],b=branchOf()[k],cur=((S.country)||'nl')===k;
  let st='';
  if(WORLD.mode==='pick'){const fresh2=!branchOf()[k]&&k!==((S.country)||'nl');st=fresh2?`<span class="chip uv">New country · +${NEWCTRY_BONUS} bonus shards</span>`:b||k===S.country?'<span class="chip">Already open · branch levels up</span>':''}
  else st=cur?'<span class="chip amber">You are here</span>':'';
  return `<div class="t" style="font-size:17px">${C.f} ${C.n} ${st}</div><div class="s" style="margin:4px 0 8px">${C.t}</div><div class="bonus">${modChips(C.m,C.fav)||'<span class="chip">Standard rules</span>'}</div>
  <div class="s" style="margin-top:10px">Branch perk once opened: <b style="color:var(--ink)">${C.bp}</b>${b?`<br>Open · best company ${fmt(b.best)} · earns <b style="color:var(--ink)">${fmt(branchIncome(b))}</b>/day`:''}</div>`;
}
function worldChipsHTML(){
  return CKEYS.map(k=>{const C=COUNTRIES[k],open=!!branchOf()[k];return `<button class="ctry ${k===WORLD.sel?'on':''} ${open?'open':''}" data-ctry="${k}"><span>${C.f}</span>${C.n.replace('United Kingdom','UK').replace('South Korea','S. Korea')}</button>`}).join('');
}
function worldGlobe(){
  const old=document.getElementById('wcv');if(!old)return;
  const cv=document.createElement('canvas');cv.id='wcv';old.replaceWith(cv);
  const C=COUNTRIES[WORLD.sel];
  try{
    const sc=buildGlobe(WORLD.sel);
    if(!startViewer(cv,sc,{accent:'#9d6bff',ry:-C.lon*Math.PI/180,rp:Math.max(-.2,Math.min(.9,C.lat*Math.PI/180*.9)),auto:false,zoom:2.05}))throw 0;
  }catch(e){const f=document.getElementById('wfb');if(f){f.style.display='block';cv.style.display='none'}}
}
function worldSelect(k){
  if(!COUNTRIES[k])return;WORLD.sel=k;
  const i=document.getElementById('wInfo'),c=document.getElementById('wChips');
  if(i)i.innerHTML=worldInfoHTML();if(c)c.innerHTML=worldChipsHTML();worldGlobe();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ctry]');if(b)worldSelect(b.dataset.ctry)});
function openWorld(mode,onGo){
  WORLD.mode=mode;WORLD.sel=mode==='pick'?CKEYS.find(k=>!branchOf()[k]&&k!==S.country)||S.country||'nl':S.country||'nl';
  pending=mode==='pick'?[{f:()=>onGo(WORLD.sel)},{f:()=>{}}]:[{f:()=>{}}];
  modal(`<div class="kicker">${mode==='pick'?'Rebirth':'World'}</div><h3>${mode==='pick'?'Pick the next country':'World map'}</h3>
  <div class="v3d" id="wglobe"><canvas id="wcv"></canvas><div class="v3fb" id="wfb" style="display:none"><div class="s" style="text-align:center;padding-top:40%">3D is not available here</div></div></div>
  <div class="ctrys" id="wChips">${worldChipsHTML()}</div>
  <div class="card" style="margin:10px 0 14px" id="wInfo">${worldInfoHTML()}</div>
  <div class="acts">${mode==='pick'?'<button class="btn primary" data-choice="0">Open the company here</button><button class="btn ghost" data-choice="1">Cancel</button>':'<button class="btn primary" data-choice="0">Close</button>'}</div>`);
  worldGlobe();
}
