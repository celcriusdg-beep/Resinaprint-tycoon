/* Live workshop floor (4.13): a top-down view of your space that you can watch.
   Printers glow while they print, people and machines walk to the stations they work at, prints travel to the wash,
   parcels roll to the dispatch bay and the van drives off at pickup. Tap a printer to open it.
   The canvas lives outside #main (the screen is rebuilt by morphing, which would reset a canvas), positioned over a placeholder. */
const FLOOR={cv:null,ctx:null,host:null,w:0,h:0,dpr:1,t0:performance.now(),last:0,ppl:{},fx:[],prev:null,van:0,hit:[],open:true};
try{FLOOR.open=localStorage.getItem('resinaprint-floor')!=='closed'}catch(e){}
function floorCard(){
  if(!S||!S.started)return '';
  return `<div class="card floorcard"><div class="fl-h"><span class="kicker">Live floor · ${SPACES[S.ws].name}</span><button class="btn sm" data-a="floorTog">${FLOOR.open?'Hide':'Show'}</button></div>${FLOOR.open?'<div id="floorHost" class="floorhost" data-keep></div>':''}</div>`;
}
A.floorTog=()=>{FLOOR.open=!FLOOR.open;try{localStorage.setItem('resinaprint-floor',FLOOR.open?'open':'closed')}catch(e){}};
const _vs7=VIEWS.studio;VIEWS.studio=function(){return floorCard()+_vs7.apply(this,arguments)};
/* ---------- layout ---------- */
const FL_THEME=[
  {floor:'#1b1a1f',tile:'#222127',wall:'#2e2c33',acc:'#8a7d68'},   // hok
  {floor:'#1d1b1a',tile:'#26221f',wall:'#3a2f29',acc:'#b0845a'},   // small studio
  {floor:'#1a1c1f',tile:'#22252a',wall:'#30343b',acc:'#e8b34b'},   // workshop
  {floor:'#191b1e',tile:'#202328',wall:'#2b3037',acc:'#f2c14e'},   // factory
  {floor:'#181a1d',tile:'#1f2227',wall:'#2a2f36',acc:'#7ff3ff'},   // industrial
  {floor:'#16181c',tile:'#1d2026',wall:'#262b33',acc:'#9d89ff'}    // campus
];
function flLayout(){
  const W=FLOOR.w,H=FLOOR.h,slots=Math.max(1,space().printers),cols=Math.min(slots,Math.max(3,Math.ceil(Math.sqrt(slots*2.2)))),rows=Math.ceil(slots/cols);
  const areaW=W*.66,areaH=H*.56,pw=Math.min(46,(areaW-12)/cols-8),ph=Math.min(40,(areaH-8)/rows-10);
  const slotsXY=[];for(let i=0;i<slots;i++){const c=i%cols,r=Math.floor(i/cols);slotsXY.push({x:14+c*(areaW/cols)+(areaW/cols-pw)/2,y:30+r*(areaH/rows)+(areaH/rows-ph)/2,w:pw,h:ph})}
  const sy=H-50,st={wash:{x:W*.08,y:sy},paint:{x:W*.3,y:sy},pack:{x:W*.52,y:sy},bay:{x:W*.74,y:sy},office:{x:W*.84,y:H*.26}};
  return{slotsXY,st,dock:{x:W-18,y:sy}};
}
const ROLE_STATION={post:'wash',painter:'paint',packer:'pack',logistics:'bay',support:'office',social:'office',salesrep:'office',clerk:'office'};
const ROLE_COL={tech:'#5aa6ff',post:'#7ff3ff',painter:'#ff7fa8',packer:'#e8b34b',logistics:'#ff8a5c',support:'#5bd6a6',social:'#b98cff',engineer:'#cfc7b6',salesrep:'#f3e7c4',clerk:'#a3d977'};
/* ---------- host + canvas ---------- */
function flEnsure(){
  if(!FLOOR.cv){
    const c=document.createElement('canvas');c.id='floorCanvas';c.setAttribute('aria-label','Live workshop floor');
    FLOOR.cv=c;FLOOR.ctx=c.getContext('2d');c.addEventListener('click',flTap);
  }
  return FLOOR.cv;
}
/* the canvas sits inside its card (the morph leaves data-keep nodes alone), so it scrolls and layers like any other element */
function flPlace(){
  const host=document.getElementById('floorHost');if(!host||tab!=='studio')return false;
  const c=flEnsure();if(c.parentNode!==host){host.appendChild(c);FLOOR.w=0}
  const r=host.getBoundingClientRect();if(r.width<10)return false;
  const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(r.width),h=Math.round(r.height);
  if(FLOOR.w!==w||FLOOR.h!==h||FLOOR.dpr!==dpr){FLOOR.w=w;FLOOR.h=h;FLOOR.dpr=dpr;c.width=w*dpr;c.height=h*dpr}
  return r.bottom>0&&r.top<innerHeight;
}
/* ---------- events from the simulation (diffs between frames) ---------- */
function flSense(L){
  const now={unw:PKEYS.reduce((a,k)=>a+(S.unwashed[k]||0),0),bay:typeof bayOf==='function'?bayOf().length:0,done:S.printers.map(p=>p.id+':'+p.state).join(',')};
  const P=FLOOR.prev;FLOOR.prev=now;if(!P)return;
  if(now.unw>P.unw){const src=S.printers.findIndex(p=>p.state==='idle'||p.state==='printing');const s=L.slotsXY[Math.max(0,src)]||L.slotsXY[0];for(let i=0;i<Math.min(3,now.unw-P.unw);i++)FLOOR.fx.push({k:'print',x0:s.x+s.w/2,y0:s.y+s.h/2,x1:L.st.wash.x,y1:L.st.wash.y,t:0,d:1.2+i*.15})}
  if(now.bay>P.bay)for(let i=0;i<Math.min(4,now.bay-P.bay);i++)FLOOR.fx.push({k:'box',x0:L.st.pack.x,y0:L.st.pack.y,x1:L.st.bay.x,y1:L.st.bay.y,t:-i*.25,d:1.1});
  if(now.bay<P.bay&&P.bay-now.bay>=1)FLOOR.van=1;
}
/* ---------- workers ---------- */
function flTarget(s,L,i){
  const idle=!s.act||(typeof IDLE_RE!=='undefined'&&IDLE_RE.test(s.act))||s.act==='Off shift';
  if(s.act==='Off shift')return{x:L.st.office.x-20+(i%5)*10,y:L.st.office.y-22-Math.floor(i/5)*9};
  if(s.role==='tech'||s.role==='engineer'){
    const want=S.printers.map((p,j)=>[p,j]).filter(([p])=>p.state==='done'||p.state==='failed'||p.state==='idle');
    const pick=want.length?want[(i+Math.floor(performance.now()/7000))%want.length][1]:(i+Math.floor(performance.now()/9000))%Math.max(1,S.printers.length);
    const sl=L.slotsXY[pick]||L.slotsXY[0];return{x:sl.x+sl.w/2,y:sl.y+sl.h+9};
  }
  const st=L.st[ROLE_STATION[s.role]||'office'];
  return idle?{x:st.x+(i%3-1)*14,y:st.y-26}:{x:st.x+(i%2?10:-10),y:st.y-14};
}
function flWorkers(L,dt){
  const seen={};
  S.staff.forEach((s,i)=>{
    const id=s.id||s.name;seen[id]=1;
    let p=FLOOR.ppl[id];if(!p)p=FLOOR.ppl[id]={x:FLOOR.w*.9,y:FLOOR.h*.5,ph:Math.random()*6};
    const t=flTarget(s,L,i),dx=t.x-p.x,dy=t.y-p.y,dist=Math.hypot(dx,dy),sp=(s.mach?70:46)*dt;
    if(dist>1){p.x+=dx/dist*Math.min(sp,dist);p.y+=dy/dist*Math.min(sp,dist);p.walk=true}else p.walk=false;
    p.s=s;
  });
  for(const id in FLOOR.ppl)if(!seen[id])delete FLOOR.ppl[id];
}
/* ---------- drawing ---------- */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function flDraw(time){
  const c=FLOOR.ctx,W=FLOOR.w,H=FLOOR.h,th=FL_THEME[Math.min(5,S.ws)]||FL_THEME[0],L=flLayout(),t=time/1000;
  c.setTransform(FLOOR.dpr,0,0,FLOOR.dpr,0,0);c.clearRect(0,0,W,H);
  /* floor + walls */
  rr(c,0,0,W,H,14);c.fillStyle=th.floor;c.fill();c.save();rr(c,0,0,W,H,14);c.clip();
  c.strokeStyle=th.tile;c.lineWidth=1;for(let x=0;x<W;x+=22){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=22){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
  if(S.ws>=2){c.fillStyle='rgba(232,179,75,.18)';for(let x=0;x<W;x+=16){c.save();c.translate(x,H-74);c.rotate(-.6);c.fillRect(0,0,6,14);c.restore()}}
  const lg=c.createLinearGradient(0,0,0,H);lg.addColorStop(0,'rgba(255,255,255,.04)');lg.addColorStop(1,'rgba(0,0,0,.25)');c.fillStyle=lg;c.fillRect(0,0,W,H);
  /* belt between stations */
  const by=L.st.wash.y+10;c.fillStyle='#121216';rr(c,L.st.wash.x-16,by-5,L.st.bay.x-L.st.wash.x+32,10,5);c.fill();
  c.strokeStyle='rgba(255,255,255,.08)';c.setLineDash([6,6]);c.lineDashOffset=-t*18;c.beginPath();c.moveTo(L.st.wash.x-12,by);c.lineTo(L.st.bay.x+12,by);c.stroke();c.setLineDash([]);
  /* printers */
  FLOOR.hit=[];
  L.slotsXY.forEach((sl,i)=>{
    const p=S.printers[i];
    if(!p){c.strokeStyle='rgba(255,255,255,.1)';c.setLineDash([4,4]);rr(c,sl.x,sl.y,sl.w,sl.h,7);c.stroke();c.setLineDash([]);return}
    const D=PRINTERS[p.type],st=p.state,pr=st==='printing'&&p.job?1-p.job.left/p.job.total:0;
    const glow=st==='printing'?'rgba(255,170,60,':st==='done'?'rgba(91,214,166,':st==='failed'?'rgba(255,90,90,':null;
    if(glow){const g=c.createRadialGradient(sl.x+sl.w/2,sl.y+sl.h/2,2,sl.x+sl.w/2,sl.y+sl.h/2,sl.w);g.addColorStop(0,glow+(st==='printing'?(.35+.15*Math.sin(t*3+i)):.4)+')');g.addColorStop(1,glow+'0)');c.fillStyle=g;c.fillRect(sl.x-sl.w/2,sl.y-sl.h/2,sl.w*2,sl.h*2)}
    rr(c,sl.x,sl.y,sl.w,sl.h,7);c.fillStyle=D.sing?'#0d0a14':D.lab?'#1c2230':'#2a2b31';c.fill();c.strokeStyle=D.sing?'#9d6bff':'rgba(255,255,255,.12)';c.lineWidth=1.2;c.stroke();
    rr(c,sl.x+4,sl.y+4,sl.w-8,sl.h*.55,4);c.fillStyle=st==='printing'?`rgba(255,180,70,${.55+.2*Math.sin(t*4+i)})`:st==='done'?'rgba(91,214,166,.55)':st==='failed'?'rgba(255,90,90,.5)':'rgba(255,255,255,.08)';c.fill();
    if(st==='printing'){c.fillStyle='rgba(255,255,255,.85)';const lh=(sl.h*.55-6)*pr;c.fillRect(sl.x+sl.w/2-5,sl.y+4+sl.h*.55-3-lh,10,lh)}
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(sl.x+5,sl.y+sl.h-9,sl.w-10,4);
    if(st==='printing'){c.fillStyle='#ffb547';c.fillRect(sl.x+5,sl.y+sl.h-9,(sl.w-10)*pr,4)}
    c.beginPath();c.arc(sl.x+sl.w-7,sl.y+sl.h-7,2.2,0,7);c.fillStyle=st==='printing'?'#ffb547':st==='done'?(Math.sin(t*6)>0?'#5bd6a6':'#1f5a44'):st==='failed'?'#ff5a5a':'#5c5f6a';c.fill();
    if(typeof unitRar==='function'){const ur=unitRar('p:'+p.id);if(ur>=0)flAura(c,sl.x+sl.w/2,sl.y+sl.h/2,sl.w*.72,ur,t,i)}
    FLOOR.hit.push({x:sl.x,y:sl.y,w:sl.w,h:sl.h,id:p.id});
  });
  /* stations */
  const lbl=(x,y,s,col)=>{c.font='600 9px Karla,sans-serif';c.textAlign='center';c.fillStyle=col||'rgba(255,255,255,.55)';c.fillText(s,x,y)};
  const unw=PKEYS.reduce((a,k)=>a+(S.unwashed[k]||0),0),cur=PKEYS.reduce((a,k)=>a+(S.cured[k]||0),0),bay=typeof bayOf==='function'?bayOf().length:0,cap=typeof dispCap==='function'?dispCap():50;
  // wash tub
  let s=L.st.wash;rr(c,s.x-14,s.y-12,28,22,6);c.fillStyle='#24323a';c.fill();rr(c,s.x-11,s.y-9,22,14,4);c.fillStyle=unw?`rgba(127,243,255,${.35+.15*Math.sin(t*5)})`:'rgba(127,243,255,.12)';c.fill();
  if(unw)for(let i=0;i<3;i++){const yy=s.y-2-((t*14+i*5)%10);c.beginPath();c.arc(s.x-6+i*6,yy,1.4,0,7);c.fillStyle='rgba(255,255,255,.7)';c.fill()}
  lbl(s.x,s.y+22,'WASH'+(unw?' · '+unw:''));
  // paint booth
  s=L.st.paint;rr(c,s.x-15,s.y-12,30,22,6);c.fillStyle='#33262c';c.fill();c.fillStyle=cur?'#ff7fa8':'rgba(255,127,168,.3)';c.beginPath();c.arc(s.x,s.y-1,5,0,7);c.fill();
  if(cur&&S.staff.some(x=>x.role==='painter')){for(let i=0;i<4;i++){const a=t*4+i*1.6;c.fillStyle=`rgba(255,${120+i*30},180,.6)`;c.fillRect(s.x+Math.cos(a)*9,s.y-1+Math.sin(a)*6,2,2)}}
  lbl(s.x,s.y+22,'PAINT'+(cur?' · '+cur:''));
  // pack table
  s=L.st.pack;rr(c,s.x-16,s.y-11,32,20,5);c.fillStyle='#3a3026';c.fill();c.fillStyle='#c79a5b';c.fillRect(s.x-6,s.y-6,12,9);c.strokeStyle='rgba(0,0,0,.35)';c.beginPath();c.moveTo(s.x,s.y-6);c.lineTo(s.x,s.y+3);c.stroke();
  lbl(s.x,s.y+22,'PACK');
  // bay with stacked parcels
  s=L.st.bay;rr(c,s.x-18,s.y-14,36,26,5);c.fillStyle='#24262c';c.fill();
  const stack=Math.min(9,Math.ceil(bay/Math.max(1,cap)*9));for(let i=0;i<stack;i++){c.fillStyle='#c79a5b';c.fillRect(s.x-14+(i%3)*10,s.y+4-Math.floor(i/3)*8,8,7)}
  lbl(s.x,s.y+22,`BAY ${bay}/${cap}`,bay>=cap?'#ff6d6d':null);
  // office desk
  s=L.st.office;rr(c,s.x-18,s.y-10,36,18,4);c.fillStyle='#262a33';c.fill();c.fillStyle=`rgba(127,200,255,${.4+.2*Math.sin(t*2)})`;c.fillRect(s.x-8,s.y-7,16,9);lbl(s.x,s.y+18,'OFFICE');
  // dock door + van
  const dk=L.dock;c.fillStyle='#14151a';c.fillRect(W-8,dk.y-26,8,40);c.fillStyle=th.acc;c.fillRect(W-8,dk.y-26,2,40);
  if(FLOOR.van>0){FLOOR.van+=.016;const vx=W-40+Math.max(0,FLOOR.van-1)*160*(FLOOR.van<2.2?1:0);if(FLOOR.van<2.6){c.fillStyle='#e9ecf3';rr(c,vx,dk.y-18,34,18,4);c.fill();c.fillStyle=th.acc;c.fillRect(vx,dk.y-6,34,3);c.fillStyle='#9fd3ff';c.fillRect(vx+24,dk.y-15,8,6)}else FLOOR.van=0}
  /* moving prints and parcels */
  FLOOR.fx=FLOOR.fx.filter(f=>{f.t+=1/60/f.d;if(f.t<0)return true;const e=f.t<.5?2*f.t*f.t:1-Math.pow(-2*f.t+2,2)/2,x=f.x0+(f.x1-f.x0)*e,y=f.y0+(f.y1-f.y0)*e-Math.sin(f.t*Math.PI)*(f.k==='print'?26:6);
    if(f.k==='print'){c.beginPath();c.arc(x,y,3.2,0,7);c.fillStyle='#d8dbe2';c.fill()}else{c.fillStyle='#c79a5b';c.fillRect(x-4,y-4,8,7)}return f.t<1});
  /* people and machines */
  for(const id in FLOOR.ppl){const p=FLOOR.ppl[id],s2=p.s,col=ROLE_COL[s2.role]||'#ccc',bob=p.walk?Math.sin(t*12+p.ph)*1.2:0;
    if(typeof unitRar==='function'){const ur=unitRar('s:'+s2.id);if(ur>=0)flAura(c,p.x,p.y+1,11,ur,t,p.ph)}
    c.beginPath();c.ellipse(p.x,p.y+7,6,2.2,0,0,7);c.fillStyle='rgba(0,0,0,.35)';c.fill();
    if(s2.mach){rr(c,p.x-6,p.y-6+bob,12,11,3);c.fillStyle='#3a3e4b';c.fill();c.strokeStyle=col;c.lineWidth=1.4;c.stroke();c.fillStyle=col;c.fillRect(p.x-3,p.y-3+bob,6,2);c.beginPath();c.moveTo(p.x,p.y-6+bob);c.lineTo(p.x,p.y-10+bob);c.strokeStyle='rgba(255,255,255,.5)';c.stroke()}
    else{c.beginPath();c.ellipse(p.x,p.y+1+bob,5.2,6,0,0,7);c.fillStyle=col;c.fill();c.beginPath();c.arc(p.x,p.y-6+bob,3.6,0,7);c.fillStyle='#f0c9a6';c.fill();
      if(s2.act==='Off shift'){c.font='700 8px Karla';c.fillStyle='rgba(255,255,255,.6)';c.fillText('z',p.x+6,p.y-9)}}}
  /* the owner, at the desk when there are no staff */
  if(!S.staff.length){const ox=L.st.pack.x,oy=L.st.pack.y-24+Math.sin(t*2)*1;c.beginPath();c.ellipse(ox,oy+1,5.2,6,0,0,7);c.fillStyle='#e8b34b';c.fill();c.beginPath();c.arc(ox,oy-6,3.6,0,7);c.fillStyle='#f0c9a6';c.fill();lbl(ox,oy-13,'YOU','rgba(232,179,75,.8)')}
  c.restore();
  rr(c,.5,.5,W-1,H-1,14);c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=1;c.stroke();
}
/* rarity aura for power-up holders: a ring in the rarity colour, pulsing faster and brighter the rarer it is, with sparks from Divine up */
function flAura(c,x,y,R,r,t,ph){
  const col=PU_RAR[r].c,pulse=.5+.5*Math.sin(t*(1.5+r*.35)+ph);
  c.save();c.globalAlpha=.35+.45*pulse;c.strokeStyle=col;c.lineWidth=1+r*.18;c.shadowColor=col;c.shadowBlur=6+r*1.5;
  c.beginPath();c.ellipse(x,y,R,R*.62,0,0,7);c.stroke();
  if(r>=10){c.setLineDash([3,4]);c.lineDashOffset=-t*20;c.beginPath();c.ellipse(x,y,R*1.25,R*.8,0,0,7);c.stroke();c.setLineDash([])}
  if(r>=6)for(let k=0;k<Math.min(6,r-4);k++){const a=t*(1+k*.2)+k*1.7+ph;c.globalAlpha=.6+.4*Math.sin(t*5+k);c.fillStyle=r===11?(k%2?'#fff':'#000'):col;c.beginPath();c.arc(x+Math.cos(a)*R*1.1,y+Math.sin(a)*R*.7,1.4+(r>=9?.6:0),0,7);c.fill()}
  c.restore();
}
function flTap(e){
  if(modalOpen())return;const r=FLOOR.cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  const h=FLOOR.hit.find(b=>x>=b.x-4&&x<=b.x+b.w+4&&y>=b.y-4&&y<=b.y+b.h+4);
  if(h&&A.printerMain){A.printerMain({id:String(h.id)});if(typeof snd==='function')snd('select');render()}
}
function flLoop(time){
  requestAnimationFrame(flLoop);
  const vis=S&&S.started&&FLOOR.open&&!document.hidden&&flPlace();
  if(!vis)return;
  const low=document.documentElement.classList.contains('lowfx')||document.documentElement.classList.contains('calm'),gap=low?1000/12:1000/40;
  if(time-FLOOR.last<gap)return;const dt=Math.min(.1,(time-FLOOR.last)/1000);FLOOR.last=time;
  try{const L=flLayout();flSense(L);flWorkers(L,dt);flDraw(time)}catch(err){console.error(err)}
}
requestAnimationFrame(flLoop);
addEventListener('resize',()=>{FLOOR.w=0});
