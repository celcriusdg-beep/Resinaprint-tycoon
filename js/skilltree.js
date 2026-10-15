/* The skill tree screen: a full-screen map you can drag and pinch. Tap a node to see it and buy it. */
const GL={bolt:'M9 1L3 9h4l-1 6 6-8H8z',drop:'M8 2C6 5 3.5 7.5 3.5 10.2a4.5 4.5 0 0 0 9 0C12.5 7.5 10 5 8 2z',wrench:'M10.5 2.5a3.5 3.5 0 0 0-3 5L2.5 12.5l1 1 5-5a3.5 3.5 0 0 0 5-3l-2 2-1.5-.5-.5-1.5z',
  flame:'M8 1c.5 2.4 3.5 3.8 3.5 7a3.5 3.5 0 0 1-7 0c0-1.2.5-2 1.2-2.8C6 6.5 6.6 7 7 7c0-2-.3-3.5 1-6z',tag:'M2 8.5V2.5h6l6 6-6 6z',person:'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5z',
  box:'M2 5l6-3 6 3v6l-6 3-6-3zM2 5l6 3 6-3M8 8v6',star:'M8 1.8l1.9 3.9 4.2.6-3 3 .7 4.2L8 11.4 4.2 13.5l.7-4.2-3-3 4.2-.6z',lock:'M4 7V5a4 4 0 0 1 8 0v2M3 7h10v7H3z',check:'M3 8.5l3.2 3.2L13 4.5'};
function glyphOf(u){
  const t=(u.name+' '+u.desc).toLowerCase();
  if(/energy|regen|coffee|nap|sleep|stamina|drink/.test(t))return 'bolt';
  if(/resin|vat|print|speed|faster|fep|wash|cure/.test(t))return 'drop';
  if(/fail|wear|service|repair|tool|maintenance/.test(t))return 'wrench';
  if(/hype|social|viral|post|media|follower|ad\b|campaign/.test(t))return 'flame';
  if(/demand|price|sales|order|customer|pay|contract|review/.test(t))return 'tag';
  if(/staff|team|train|mood|wage|lounge|hire|worker/.test(t))return 'person';
  if(/ship|parcel|box|tax|btw|insur|company|store|space|permit/.test(t))return 'box';
  return 'star';
}
const cshort=n=>n>=1e9?(n/1e9).toFixed(n>=1e10?0:1)+'B':n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+'M':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+'k':String(n);
let skillOpen=false,skSel=null,cam={x:0,y:0,k:.5},skCache={},skBuilt=false,camAnim=0;
function buildSkill(){
  const el=document.createElement('div');el.id='skill';el.className='skill';
  el.innerHTML=`<div class="sk-top"><button id="skX" class="btn sm">✕ Close</button><div class="sk-cash" id="skCash"></div><button id="skBest" class="btn sm">Best buy</button><button id="skFit" class="btn sm">Fit</button></div>
    <div class="sk-chips" id="skChips">${BRANCHES.map(B=>`<button data-b="${B.id}" style="--c:${B.col}"><i></i>${B.n}<span id="skc-${B.id}"></span></button>`).join('')}</div>
    <svg id="skSvg"><g id="stg"><g id="skEdges"></g><g id="skNodes"></g><g id="skHub"></g></g></svg><div class="sk-panel" id="skPanel"></div>`;
  document.body.appendChild(el);
  let e='',n='',h='';
  for(const u of UPGRADES){if(!u.br)continue;for(const id of u.par){const p=UBY[id];e+=`<line class="e" data-p="${id}" data-c="${u.id}" x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${u.x.toFixed(1)}" y2="${u.y.toFixed(1)}" style="--c:${u.br.col}"/>`}}
  for(const u of UPGRADES){if(!u.br)continue;const R=u.key?22:16;
    n+=`<g class="nd${u.key?' key':''}" data-id="${u.id}" transform="translate(${u.x.toFixed(1)} ${u.y.toFixed(1)})" style="--c:${u.br.col}"><circle class="ring" r="${R+6}"/><circle class="bg" r="${R}"/>${u.ipKey&&OFF.f[u.ipKey]?`<image href="${OFF.f[u.ipKey].replace('/products/','/thumbs/')}" x="${-R+2}" y="${-R+2}" width="${2*R-4}" height="${2*R-4}" decoding="async"/>`:u.id==='pr_root'?`<text class="iplic" y="6">⚔</text>`:u.cat==='ip'&&u.step===0?`<text class="iplic" y="6">${u.name[0]}</text>`:`<g transform="translate(-8 -8) ${u.key?'scale(1)':'scale(1)'}"><path class="gl" d="${GL[glyphOf(u)]}"/></g>`}<text class="lbl c" y="${R+13}">${cshort(u.cost)}</text><text class="lbl nm" y="${R+25}">${u.name.length>16?u.name.slice(0,15)+'…':u.name}</text></g>`}
  for(const B of BRANCHES){const rr=B.custom?R0+235:R0-62,x=TREE_C+Math.cos(B.ang)*rr,y=TREE_C+Math.sin(B.ang)*rr;h+=`<text class="bn" x="${x.toFixed(1)}" y="${y.toFixed(1)}" style="--c:${B.col}">${B.n}</text>`}
  h+=`<circle class="hub" cx="${TREE_C}" cy="${TREE_C}" r="62"/><circle class="hubr" cx="${TREE_C}" cy="${TREE_C}" r="72"/><text class="hubt" x="${TREE_C}" y="${TREE_C-4}">STUDIO</text><text class="hubs" id="skHubS" x="${TREE_C}" y="${TREE_C+18}"></text>`;
  document.getElementById('skEdges').innerHTML=e;document.getElementById('skNodes').innerHTML=n;document.getElementById('skHub').innerHTML=h;
  skBuilt=true;wireSkill();
}
let _camRaf=0;
function applyCam(){if(_camRaf)return;_camRaf=requestAnimationFrame(()=>{_camRaf=0;applyCam0()})}
function skMoving(){const s=document.getElementById('skSvg');if(!s)return;s.classList.add('moving');clearTimeout(skMoving.t);skMoving.t=setTimeout(()=>s.classList.remove('moving'),180)}
function applyCam0(){skMoving();document.getElementById('stg').setAttribute('transform',`translate(${cam.x.toFixed(1)} ${cam.y.toFixed(1)}) scale(${cam.k.toFixed(3)})`);
  const s=document.getElementById('skSvg');s.classList.toggle('z1',cam.k>=.62);s.classList.toggle('z2',cam.k>=1.05)}
function skSize(){const s=document.getElementById('skSvg');return{w:s.clientWidth,h:s.clientHeight}}
function flyTo(wx,wy,k,instant){
  const {w,h}=skSize(),to={x:w/2-wx*k,y:h/2-wy*k,k};
  cancelAnimationFrame(camAnim);if(instant){cam=to;applyCam();return}
  const from={...cam},t0=performance.now();
  (function f(now){const t=Math.min(1,(now-t0)/320),e=1-Math.pow(1-t,3);cam={x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e,k:from.k+(to.k-from.k)*e};applyCam();if(t<1)camAnim=requestAnimationFrame(f)})(t0);
}
function zoomAt(px,py,k2){k2=Math.max(.2,Math.min(1.8,k2));const wx=(px-cam.x)/cam.k,wy=(py-cam.y)/cam.k;cam={k:k2,x:px-wx*k2,y:py-wy*k2};applyCam()}
function wireSkill(){
  const svg=document.getElementById('skSvg'),ptrs=new Map();let moved=0,pd=0;
  const pt=e=>{const r=svg.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,pt(e));moved=0;cancelAnimationFrame(camAnim);if(ptrs.size===2){const [a,b]=[...ptrs.values()];pd=Math.hypot(a.x-b.x,a.y-b.y)}});
  svg.addEventListener('pointermove',e=>{
    if(!ptrs.has(e.pointerId))return;const p=pt(e),o=ptrs.get(e.pointerId);
    if(ptrs.size===1){cam.x+=p.x-o.x;cam.y+=p.y-o.y;moved+=Math.abs(p.x-o.x)+Math.abs(p.y-o.y);ptrs.set(e.pointerId,p);applyCam()}
    else if(ptrs.size===2){ptrs.set(e.pointerId,p);const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pd>0)zoomAt((a.x+b.x)/2,(a.y+b.y)/2,cam.k*d/pd);pd=d;moved+=20}
  });
  const up=e=>{const was=ptrs.size;ptrs.delete(e.pointerId);if(was===1&&moved<8){const el=document.elementFromPoint(e.clientX,e.clientY),nd=el&&el.closest&&el.closest('.nd');selectNode(nd?nd.dataset.id:null)}if(ptrs.size<2)pd=0};
  svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId)});
  svg.addEventListener('wheel',e=>{e.preventDefault();const p=pt(e);zoomAt(p.x,p.y,cam.k*(e.deltaY<0?1.12:.89))},{passive:false});
  document.getElementById('skX').onclick=closeSkill;
  document.getElementById('skFit').onclick=()=>flyTo(TREE_C,TREE_C,Math.min(skSize().w,skSize().h)/3600*1.9);
  document.getElementById('skBest').onclick=()=>{const u=bestBuy();if(u){selectNode(u.id);flyTo(u.x,u.y,.95)}else toast('Nothing to buy right now')};
  document.getElementById('skChips').onclick=e=>{const b=e.target.closest('button');if(!b)return;const B=BRANCHES.find(x=>x.id===b.dataset.b),mid=B.rows>2?3:1,rad=R0+mid*ROW_H;flyTo(TREE_C+Math.cos(B.ang)*rad,TREE_C+Math.sin(B.ang)*rad,.8)};
  document.getElementById('skPanel').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(!b||b.disabled)return;buyNode(b.dataset.buy)});
}
const nodeEl=id=>document.querySelector(`#skNodes .nd[data-id="${id}"]`);
function nodeState(u){
  if(S.up[u.id])return 'own';
  const ok=!u.req||u.req();
  if(ok)return S.cash>=u.cost?'buy':'open';
  return treeOpen(u)?'wait':'lock';
}
function bestBuy(){return UPGRADES.filter(u=>u.br&&nodeState(u)==='buy').sort((a,b)=>b.cost-a.cost)[0]||UPGRADES.filter(u=>u.br&&nodeState(u)==='open').sort((a,b)=>a.cost-b.cost)[0]}
function refreshSkill(){
  if(!skillOpen)return;
  const st={};let own=0;
  for(const u of UPGRADES){if(!u.br)continue;const s=nodeState(u);st[u.id]=s;if(s==='own')own++;
    if(skCache[u.id]!==s){skCache[u.id]=s;const g=nodeEl(u.id);if(g)g.setAttribute('data-s',s)}}
  document.querySelectorAll('#skEdges .e').forEach(l=>{const a=st[l.dataset.p],b=st[l.dataset.c],c=a==='own'&&b==='own'?'e on':a==='own'?'e av':'e';if(l.getAttribute('class')!==c)l.setAttribute('class',c)});
  setT(document.getElementById('skCash'),fmt(S.cash));
  document.getElementById('skHubS').textContent=`${own} / ${UPGRADES.filter(u=>u.br).length}`;
  for(const B of BRANCHES){const n=UPGRADES.filter(u=>u.cat===B.id&&S.up[u.id]).length;const sp=document.getElementById('skc-'+B.id);if(sp)setT(sp,` ${n}/${B.total}`)}
  if(skSel)showPanel(skSel);
}
function showPanel(id){
  const u=UBY[id],p=document.getElementById('skPanel');if(!u){p.classList.remove('on');return}
  const s=nodeState(u),pars=u.par.map(i=>UBY[i]);
  const why=s==='lock'?`Own ${pars.slice(0,2).map(x=>`<b>${x.name}</b>`).join(' or ')} first.`:s==='wait'?`<span class="f">${u.reqText||''}</span>`:'';
  const html=`<div class="skp-h"><span class="skp-b" style="--c:${u.br.col}">${u.br.n} · row ${u.row+1}${u.key?' · keystone':''}</span><button class="skp-x" data-x aria-label="Close">✕</button></div>
    <div class="skp-t">${u.name}</div><div class="skp-d">${u.desc}</div>${why?`<div class="skp-w">${why}</div>`:''}
    <div class="skp-f">${s==='own'?'<span class="chip good">Owned</span>':`<b class="skp-c">${fmt(u.cost)}</b><button class="btn primary" data-buy="${u.id}" ${s==='buy'?'':'disabled'}>${s==='buy'?'Buy':s==='open'?'Not enough cash':'Locked'}</button>`}</div>`;
  if(p._h!==html){p._h=html;p.innerHTML=html;p.querySelector('[data-x]').onclick=()=>selectNode(null)}
  p.classList.add('on');
}
function selectNode(id){
  if(skSel){const o=nodeEl(skSel);o&&o.classList.remove('sel')}
  skSel=id&&UBY[id]?id:null;
  if(skSel){const g=nodeEl(skSel);g&&g.classList.add('sel');showPanel(skSel)}else{const p=document.getElementById('skPanel');p.classList.remove('on')}
}
function buyNode(id){
  const u=UBY[id];if(!u||nodeState(u)!=='buy')return;
  A.upgrade({k:id});save();render();
  if(S.up[id]){confetti(35);snd('buy');buzz(15);u.par&&0;
    UPGRADES.forEach(c=>{if(c.par&&c.par.includes(id)){const g=nodeEl(c.id);if(g){g.classList.remove('pop');void g.getBBox();g.classList.add('pop')}}});}
  skCache={};refreshSkill();
}
function openSkill(branch){
  if(!skBuilt)buildSkill();
  skillOpen=true;document.getElementById('skill').classList.add('on');document.body.classList.add('skopen');
  skCache={};refreshSkill();
  const {w,h}=skSize();
  if(branch){const B=BRANCHES.find(b=>b.id===branch);const rr=B.custom?R0+420:R0+ROW_H*2;flyTo(TREE_C+Math.cos(B.ang)*rr,TREE_C+Math.sin(B.ang)*rr,.8,true)}
  else{const u=bestBuy();if(u){flyTo(u.x,u.y,.85,true);selectNode(u.id)}else flyTo(TREE_C,TREE_C,Math.min(w,h)/3600*1.9,true)}
}
function closeSkill(){skillOpen=false;skSel=null;const el=document.getElementById('skill');if(el)el.classList.remove('on');document.body.classList.remove('skopen')}
addEventListener('keydown',e=>{if(e.key==='Escape'&&skillOpen)closeSkill()});
Object.assign(A,{openSkill(d){openSkill(d&&d.b)}});
function skillCard(){
  const tot=UPGRADES.filter(u=>u.br).length,own=UPGRADES.filter(u=>u.br&&S.up[u.id]).length;
  return `<div class="card skcard"><div class="chk"><span>${own} of ${tot} unlocked</span><b>Skill tree</b></div><div class="s" style="margin:4px 0 10px">Seven branches grow out of your studio. Own a node to open the ones it links to. Drag to explore, pinch to zoom, tap a node to buy it.</div>
    <div class="skb">${BRANCHES.map(B=>{const n=UPGRADES.filter(u=>u.cat===B.id&&S.up[u.id]).length;return `<button data-a="openSkill" data-b="${B.id}" style="--c:${B.col}"><i style="width:${100*n/B.total}%"></i><span>${B.n}</span><em>${n}/${B.total}</em></button>`}).join('')}</div>
    <div class="opts" style="margin-top:12px"><button class="btn primary" data-a="openSkill">Open skill tree</button></div></div>`;
}
