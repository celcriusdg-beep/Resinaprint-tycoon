/* Age of Resin: game logic, enemy AI, input and UI. */
const $=id=>document.getElementById(id);
const cv=$('cv'),cx=cv.getContext('2d');
let G=null,scale=1,dprS=1,diffKey='normal',rafId=0,lastT=0,muted=false;
const SAVE='age-of-resin-v1';
let save={wins:{easy:0,normal:0,hard:0},best:0,games:0};
try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE)||'{}'));muted=!!JSON.parse(localStorage.getItem(SAVE+'-mute')||'false')}catch(e){}
const persist=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(e){}};
/* ---------- sound ---------- */
let ac=null;
function sfx(kind){
  if(muted)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime,f={hit:[180,60,.07,'square'],shoot:[520,260,.06,'triangle'],boom:[110,30,.3,'sawtooth'],spawn:[330,440,.07,'sine'],age:[300,900,.5,'triangle'],coin:[800,1200,.05,'sine'],fail:[200,80,.4,'sawtooth']}[kind];
    if(!f)return;o.type=f[3];o.frequency.setValueAtTime(f[0],n);o.frequency.exponentialRampToValueAtTime(f[1],n+f[2]);g.gain.setValueAtTime(.05,n);g.gain.exponentialRampToValueAtTime(.001,n+f[2]);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+f[2]+.02)}catch(e){}
}
/* ---------- setup ---------- */
function newGame(diff){
  diffKey=diff;const D=DIFF[diff];
  G={t:0,gold:175,xp:0,age:0,eage:0,units:[],proj:[],parts:[],texts:[],queue:[],qt:0,egold:120,eqt:2,eAcc:0,
    turrets:[[],[]],base:[{hp:1800,max:1800,flash:0},{hp:D.hp,max:D.hp,flash:0}],spec:0,over:0,speed:1,paused:false,
    cam:0,camHold:0,shake:0,strikes:[],kills:0,diff:D,income:0,eturrets:0};
  $('menu').classList.add('hide');$('end').classList.add('hide');buildButtons();resize();ui(true);
  save.games++;persist();
  if(!rafId){lastT=performance.now();rafId=requestAnimationFrame(frame)}
}
function resize(){
  const w=Math.min(960,$('stage').clientWidth||360);dprS=window.devicePixelRatio||1;scale=w/VW;
  cv.style.width=w+'px';cv.style.height=VH*scale+'px';cv.width=Math.round(w*dprS);cv.height=Math.round(VH*scale*dprS);
}
addEventListener('resize',resize);
/* ---------- helpers ---------- */
const side0=()=>G.units.filter(u=>u.side===0&&!u.dying),side1=()=>G.units.filter(u=>u.side===1&&!u.dying);
function mkUnit(side,age,type){
  const d=unitDef(age,type);
  return {side,age,type,def:d,x:side?WW-BASE_X-10:BASE_X+10,hp:d.hp,maxhp:d.hp,cd:Math.random()*.4,t:Math.random()*6,sw:0,flash:0,moving:true,dying:0};
}
function text(x,y,s,col){G.texts.push({x,y,s,col,t:0})}
function burst(x,y,col,n,sp){for(let i=0;i<n;i++)G.parts.push({x,y,vx:(Math.random()-.5)*sp,vy:-Math.random()*sp*.9,t:0,life:.4+Math.random()*.4,col,s:1.5+Math.random()*2})}
/* ---------- player actions ---------- */
function train(type){
  if(!G||G.over)return;const d=unitDef(G.age,type);
  if(G.queue.length>=5)return;if(G.gold<d.cost){sfx('fail');return}
  G.gold-=d.cost;G.queue.push({type,age:G.age,t:d.train,tot:d.train});sfx('coin');ui(true);
}
function evolve(){
  if(!G||G.over||G.age>=4)return;const need=EVOLVE_XP[G.age];if(G.xp<need)return;
  G.xp-=need;G.age++;G.base[0].hp=Math.min(G.base[0].max,G.base[0].hp+G.base[0].max*.2);
  text(G.cam+VW/2,110,'NEW AGE: '+AGES[G.age].n.toUpperCase(),'#ffd35a');G.shake=.4;sfx('age');buildButtons();ui(true);
}
function buildTurret(){
  if(!G||G.over)return;const ts=G.turrets[0];if(ts.length>=3)return;const c=TURRET.cost[G.age];
  if(G.gold<c){sfx('fail');return}G.gold-=c;ts.push({age:G.age,cd:1,flash:0});sfx('coin');ui(true);
}
function sellTurret(){
  if(!G||G.over)return;const ts=G.turrets[0];if(!ts.length)return;const t=ts.pop();G.gold+=Math.round(TURRET.cost[t.age]*.6);sfx('coin');ui(true);
}
function special(side){
  if(side===0){if(!G||G.over||G.spec>0)return;G.spec=SPECIAL.cd}
  const age=side===0?G.age:G.eage,tgt=G.units.filter(u=>u.side!==side&&!u.dying),lo=side===0?WW*.4:150,hi=side===0?WW-150:WW*.6;
  for(let i=0;i<SPECIAL.strikes;i++){
    const u=tgt.length&&Math.random()<.75?tgt[(Math.random()*tgt.length)|0]:null,x=u?u.x+(Math.random()-.5)*30:lo+Math.random()*(hi-lo);
    G.strikes.push({x,t:-i*.17-Math.random()*.1,age,side,done:0});
  }
  sfx('boom');if(side===0)ui(true);
}
/* ---------- simulation ---------- */
function dmgUnit(u,d,from){
  if(u.dying)return;u.hp-=d;u.flash=.12;
  if(u.hp<=0){u.dying=.001;u.moving=false;
    if(u.side===1){G.gold+=u.def.cost*.7;G.xp+=u.def.cost*.7;G.kills++;text(u.x,GY-50,'+'+Math.round(u.def.cost*.7),'#ffd35a');sfx('hit')}
    else G.egold+=u.def.cost*.3;
    burst(u.x,GY-18,u.side?'#c4453c':'#3a7bd5',8,90)}
}
function dmgBase(side,d){const b=G.base[side];if(b.hp<=0)return;b.hp-=d;b.flash=.1;if(side===0)G.shake=Math.max(G.shake,.06);
  if(b.hp<=0){b.hp=0;G.over=side===0?2:1;G.shake=.8;burst(side?WW-BASE_X:BASE_X,GY-60,'#ffb84a',60,220);sfx(side?'boom':'fail');finish()}}
function shoot(from,kind,x0,y0,tx,ty,dmg,tgt,aoe,arc){
  const dist=Math.abs(tx-x0),spd=kind==='laser'||kind==='bullet'?900:kind==='plasma'?600:420;
  G.proj.push({kind,x0,y0,tx,ty,x:x0,y:y0,u:0,dur:Math.max(.12,dist/spd),dmg,tgt,aoe,side:from,arc:arc==null?(kind==='laser'||kind==='bullet'?0:Math.min(40,dist*.18)):arc});
}
function projKind(age,def){
  if(def.type===3||def.type===2)return age===1?'rock':age===2?'ball':age===3?'shell':'plasma';
  return ['rock','arrow','ball','bullet','laser'][age];
}
function step(dt){
  if(!G||G.over)return;G.t+=dt;
  G.income=INCOME[G.age];G.gold+=G.income*dt;
  if(G.spec>0)G.spec=Math.max(0,G.spec-dt);
  /* training queue */
  if(G.queue.length){const q=G.queue[0];q.t-=dt;if(q.t<=0){G.queue.shift();const u=mkUnit(0,q.age,q.type);
    if(!G.units.some(o=>o.side===0&&!o.dying&&Math.abs(o.x-u.x)<8)||true){G.units.push(u);sfx('spawn')}}}
  /* enemy AI */
  const D=G.diff;G.egold+=INCOME[G.eage]*D.inc*dt;
  if(G.eage<4&&G.t>ENEMY_EVOLVE[G.eage]*D.evo){G.eage++}
  G.eqt-=dt;
  if(G.eqt<=0){
    const mine=side0().length,theirs=side1().length,w=[.38,.3,.24,.08+G.eage*.01],bud=G.egold;
    let pick=-1,r=Math.random()*(w[0]+w[1]+w[2]+w[3]);for(let i=0;i<4;i++){r-=w[i];if(r<=0){pick=i;break}}
    if(pick<0)pick=0;
    let d=unitDef(G.eage,pick);if(bud<d.cost){pick=bud>=unitDef(G.eage,1).cost?1:0;d=unitDef(G.eage,pick)}
    if(bud>=d.cost&&theirs<26){G.egold-=d.cost;G.units.push(mkUnit(1,G.eage,pick));G.eqt=d.train*(mine>theirs+2?.5:.9)}
    else G.eqt=.5;
  }
  const maxT=Math.min(3,Math.floor(G.t/150));
  if(G.turrets[1].length<maxT&&G.egold>TURRET.cost[G.eage]*1.5){G.egold-=TURRET.cost[G.eage];G.turrets[1].push({age:G.eage,cd:1,flash:0})}
  if(G.t>90&&!G.eSpecT)G.eSpecT=60+Math.random()*30;
  if(G.eSpecT){G.eSpecT-=dt;if(G.eSpecT<=0){special(1);G.eSpecT=70+Math.random()*30}}
  /* units */
  for(const u of G.units){
    if(u.dying){u.dying+=dt*2.2;continue}
    u.t+=dt;if(u.sw>0)u.sw-=dt;if(u.flash>0)u.flash-=dt;u.cd-=dt;
    const dir=u.side?-1:1,foes=G.units.filter(o=>o.side!==u.side&&!o.dying);
    let tgt=null,best=1e9;
    for(const o of foes){const dx=(o.x-u.x)*dir;if(dx>-10&&dx<best){best=dx;tgt=o}}
    const baseX=u.side?BASE_X:WW-BASE_X,bdx=(baseX-u.x)*dir,reach=u.def.range+(u.def.type>=2?10:0);
    let engage=null,dist=0;
    if(tgt&&best<=reach){engage='u';dist=best}else if(bdx<=reach+12){engage='b'}
    /* blocked by an ally in front */
    let blocked=false;
    for(const o of G.units){if(o===u||o.side!==u.side||o.dying)continue;const dx=(o.x-u.x)*dir;if(dx>0&&dx<(u.def.ranged?20:26)){blocked=true;break}}
    u.moving=false;
    if(engage){
      if(u.cd<=0){u.cd=u.def.cd;u.sw=.25;
        if(u.def.ranged){const tx=engage==='u'?tgt.x:baseX,ty=GY-(engage==='u'?20:60),k=projKind(u.age,u.def);
          shoot(u.side,k,u.x+dir*14,GY-(u.def.type>=2?36:24),tx,ty,u.def.dmg,engage==='u'?tgt:null,u.def.splash||0);sfx('shoot')}
        else{
          if(engage==='u'){dmgUnit(tgt,u.def.dmg,u);if(u.def.splash)for(const o of foes)if(o!==tgt&&Math.abs(o.x-tgt.x)<u.def.splash)dmgUnit(o,u.def.dmg*.5,u)}
          else dmgBase(1-u.side,u.def.dmg);
          sfx('hit');burst(u.x+dir*20,GY-20,'#fff',2,50)}}
    }else if(!blocked){u.x+=dir*u.def.spd*dt;u.moving=true}
  }
  G.units=G.units.filter(u=>u.dying<1);
  /* projectiles */
  for(const p of G.proj){p.u+=dt/p.dur;
    if(p.u>=1){p.done=1;
      if(p.aoe){for(const o of G.units)if(o.side!==p.side&&!o.dying&&Math.abs(o.x-p.tx)<p.aoe)dmgUnit(o,p.dmg,null);burst(p.tx,GY-8,'#ffb84a',8,110);
        const bx=p.side?BASE_X:WW-BASE_X;if(Math.abs(p.tx-bx)<p.aoe)dmgBase(1-p.side,p.dmg)}
      else if(p.tgt){if(!p.tgt.dying)dmgUnit(p.tgt,p.dmg,null)}
      else if(p.side===0&&Math.abs(p.tx-(WW-BASE_X))<30)dmgBase(1,p.dmg);
      else if(p.side===1&&Math.abs(p.tx-BASE_X)<30)dmgBase(0,p.dmg);
    }}
  G.proj=G.proj.filter(p=>!p.done);
  /* turrets */
  for(let s=0;s<2;s++){G.turrets[s].forEach((tu,i)=>{
    tu.cd-=dt;if(tu.flash>0)tu.flash-=dt;if(tu.cd>0)return;
    const bx=s?WW-BASE_X+22:BASE_X-22,dir=s?-1:1,rng=TURRET.range[tu.age];let t=null,b=1e9;
    for(const o of G.units){if(o.side===s||o.dying)continue;const dx=(o.x-bx)*dir;if(dx>-20&&dx<rng&&dx<b){b=dx;t=o}}
    if(!t)return;tu.cd=TURRET.cd[tu.age];tu.flash=.1;
    shoot(s,['rock','arrow','ball','bullet','laser'][tu.age],bx,GY-80-i*26,t.x,GY-20,TURRET.dmg[tu.age],t,tu.age===2?40:0);sfx('shoot')})}
  /* specials */
  for(const k of G.strikes){k.t+=dt;if(k.t>=0&&!k.done){
    const age=k.age,kind=['rock','arrow','ball','shell','laser'][age];
    if(!k.launched){k.launched=1;k.u=0}
    k.u=Math.min(1,(k.t)/.55);
    if(k.t>=.55){k.done=1;for(const o of G.units)if(o.side!==k.side&&!o.dying&&Math.abs(o.x-k.x)<SPECIAL.radius)dmgUnit(o,SPECIAL.dmg[age],null);
      const bx=k.side?BASE_X:WW-BASE_X;if(Math.abs(k.x-bx)<SPECIAL.radius)dmgBase(1-k.side,SPECIAL.dmg[age]*.25);
      burst(k.x,GY-6,age===4?'#7ff3ff':age===0?'#ff9a3a':'#ffd35a',14,160);G.shake=Math.max(G.shake,.12)}}}
  G.strikes=G.strikes.filter(k=>!(k.done&&k.t>.7));
  /* effects */
  for(const p of G.parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt}
  G.parts=G.parts.filter(p=>p.t<p.life);
  for(const t of G.texts)t.t+=dt;G.texts=G.texts.filter(t=>t.t<1.2);
  for(const b of G.base)if(b.flash>0)b.flash-=dt;
  if(G.shake>0)G.shake-=dt;
  /* camera */
  if(G.camHold>0)G.camHold-=dt;
  else{const mine=side0();let fx=BASE_X;for(const u of mine)fx=Math.max(fx,u.x);
    const target=Math.max(0,Math.min(WW-VW,fx-VW*.4));G.cam+=(target-G.cam)*Math.min(1,dt*1.8)}
}
function finish(){
  const win=G.over===1;
  if(win){save.wins[diffKey]++;save.best=Math.max(save.best,G.age+1)}else save.best=Math.max(save.best,G.age);persist();
  setTimeout(()=>{$('endT').textContent=win?'Victory!':'Defeat';$('endS').textContent=win?`You destroyed the enemy base in ${Math.floor(G.t/60)}m ${Math.floor(G.t%60)}s. Kills: ${G.kills}. Age reached: ${AGES[G.age].n}.`:`Your base fell after ${Math.floor(G.t/60)}m ${Math.floor(G.t%60)}s. Kills: ${G.kills}. Age reached: ${AGES[G.age].n}.`;
    $('end').classList.remove('hide')},900);
}
/* ---------- render ---------- */
function render(){
  const c=cx;c.setTransform(dprS*scale,0,0,dprS*scale,0,0);
  let sx=0,sy=0;if(G.shake>0){sx=(Math.random()-.5)*G.shake*14;sy=(Math.random()-.5)*G.shake*10}
  drawBackground(c,G.age,G.cam,G.t);
  c.save();c.translate(-G.cam+sx,sy);
  drawBase(c,0,G.age,G.base[0].hp,G.base[0].max,G.t);drawBase(c,1,G.eage,G.base[1].hp,G.base[1].max,G.t);
  for(let s=0;s<2;s++)G.turrets[s].forEach((tu,i)=>drawTurret(c,tu,s?WW-BASE_X+22:BASE_X-22,GY-72-i*26,s,tu.age,tu.flash));
  const sorted=[...G.units].sort((a,b)=>a.def.type-b.def.type);
  for(const u of sorted)drawUnit(c,u,u.def);
  for(const p of G.proj)drawProj(c,p);
  for(const k of G.strikes){if(k.t<0)continue;const age=k.age,u=k.u||0,y=-30+(GY-8+30)*u;
    if(age===4){c.fillStyle='#7ff3ff';c.globalAlpha=.25+.6*u;c.fillRect(k.x-3,0,6,GY);c.fillStyle='#fff';c.fillRect(k.x-1,0,2,GY);c.globalAlpha=1}
    else if(age===3){c.save();c.translate(k.x,y);R(c,-3,-9,6,14,'#444');R(c,-6,-2,12,2,'#888');c.restore()}
    else if(age===0){E(c,k.x,y,8,8,'#8a6a3e');E(c,k.x,y-8,4,12,'#ffb84a');E(c,k.x,y,5,5,'#ffd35a')}
    else if(age===1){L(c,k.x,y-12,k.x,y,'#6a4a28',1.6);R(c,k.x-1.5,y,3,3,'#ddd')}
    else{E(c,k.x,y,5,5,'#222')}}
  for(const p of G.parts){c.globalAlpha=1-p.t/p.life;c.fillStyle=p.col;c.fillRect(p.x,p.y,p.s,p.s)}c.globalAlpha=1;
  c.font='bold 13px system-ui,sans-serif';c.textAlign='center';
  for(const t of G.texts){c.globalAlpha=1-t.t/1.2;c.fillStyle='#000';c.fillText(t.s,t.x+1,t.y-t.t*30+1);c.fillStyle=t.col;c.fillText(t.s,t.x,t.y-t.t*30)}c.globalAlpha=1;
  c.restore();
  /* mini lane map */
  const mw=200,mx=(VW-mw)/2,my=8;c.fillStyle='#0008';c.fillRect(mx-3,my-3,mw+6,14);
  c.fillStyle='#3a7bd5';c.fillRect(mx,my+4,4,4);c.fillStyle='#c4453c';c.fillRect(mx+mw-4,my+4,4,4);
  for(const u of G.units){if(u.dying)continue;c.fillStyle=u.side?'#e0605a':'#6aa0f0';c.fillRect(mx+u.x/WW*mw-1,my+(u.side?6:3),2,3)}
  c.strokeStyle='#fff';c.lineWidth=1;c.strokeRect(mx+G.cam/WW*mw,my,VW/WW*mw,11);
}
/* ---------- UI ---------- */
let uiCache={};
function setT(id,v){if(uiCache[id]!==v){uiCache[id]=v;$(id).textContent=v}}
function buildButtons(){
  const box=$('units');box.innerHTML='';
  for(let i=0;i<4;i++){const d=unitDef(G.age,i),b=document.createElement('button');b.className='ub';b.dataset.t=i;
    b.innerHTML=`<i class="ic ic${i}"></i><span class="nm">${d.name}</span><span class="co">${d.cost}</span><span class="st">${Math.round(d.hp)} hp · ${Math.round(d.dmg)} dmg</span>`;
    b.onclick=()=>train(i);box.appendChild(b)}
}
function ui(force){
  if(!G)return;if(force)uiCache={};
  setT('gold',Math.floor(G.gold)+'');setT('inc','+'+G.income+'/s');
  const need=G.age<4?EVOLVE_XP[G.age]:0;
  setT('age',AGES[G.age].n);
  $('xpfill').style.width=G.age>=4?'100%':Math.min(100,100*G.xp/need)+'%';
  setT('xpt',G.age>=4?'Max age':`XP ${Math.floor(G.xp)} / ${need}`);
  const ev=$('evolve');ev.disabled=G.age>=4||G.xp<need;ev.classList.toggle('ready',G.age<4&&G.xp>=need);
  $('b0').style.width=100*G.base[0].hp/G.base[0].max+'%';$('b1').style.width=100*G.base[1].hp/G.base[1].max+'%';
  setT('b0t',Math.ceil(G.base[0].hp)+'');setT('b1t',Math.ceil(G.base[1].hp)+'');
  document.querySelectorAll('.ub').forEach(b=>{const d=unitDef(G.age,+b.dataset.t);b.disabled=G.gold<d.cost||G.queue.length>=5});
  const q=G.queue;$('queue').innerHTML=q.length?q.map((x,i)=>`<span class="qi${i?'':' on'}">${unitDef(x.age,x.type).name}${i?'':` ${Math.max(0,x.t).toFixed(1)}s`}</span>`).join(''):'<span class="qe">Train units to fill the queue (max 5)</span>';
  const ts=G.turrets[0].length,tc=TURRET.cost[G.age];
  setT('tb',ts>=3?'Turrets full':`Build ${TURRET.name[G.age]} (${tc})`);$('tb').disabled=ts>=3||G.gold<tc;$('ts').disabled=!ts;
  setT('tcount',ts+'/3');
  setT('sp',G.spec>0?`${AGES[G.age].spec} ${Math.ceil(G.spec)}s`:AGES[G.age].spec);$('sp').disabled=G.spec>0;
  setT('spd',G.speed===1?'1×':'2×');setT('pz',G.paused?'Resume':'Pause');
}
function frame(now){
  rafId=requestAnimationFrame(frame);
  let dt=Math.min(.1,(now-lastT)/1000);lastT=now;
  if(G&&!G.paused){const n=G.speed;for(let i=0;i<n*2;i++)step(dt/2)}
  if(G){render();if(((now/100)|0)!==uiCache.tick){uiCache.tick=(now/100)|0;const k=uiCache.tick;ui(false);uiCache.tick=k}}
}
/* ---------- input ---------- */
let drag=null;
cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,cam:G?G.cam:0};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag||!G)return;G.cam=Math.max(0,Math.min(WW-VW,drag.cam-(e.clientX-drag.x)/scale));G.camHold=3});
cv.addEventListener('pointerup',()=>{drag=null});
$('camHome').onclick=()=>{G.cam=0;G.camHold=4};$('camEnemy').onclick=()=>{G.cam=WW-VW;G.camHold=4};$('camFront').onclick=()=>{G.camHold=0};
$('evolve').onclick=evolve;$('tb').onclick=buildTurret;$('ts').onclick=sellTurret;$('sp').onclick=()=>special(0);
$('spd').onclick=()=>{G.speed=G.speed===1?2:1;ui(true)};$('pz').onclick=()=>{G.paused=!G.paused;ui(true)};
$('mute').onclick=()=>{muted=!muted;try{localStorage.setItem(SAVE+'-mute',JSON.stringify(muted))}catch(e){};$('mute').textContent=muted?'Sound off':'Sound on'};
$('mute').textContent=muted?'Sound off':'Sound on';
$('quit').onclick=()=>{if(G){G.over=0;G.paused=true}showMenu()};
function showMenu(){
  $('wins').textContent=`Wins: Easy ${save.wins.easy} · Normal ${save.wins.normal} · Hard ${save.wins.hard}`;
  $('menu').classList.remove('hide');
}
document.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>newGame(b.dataset.diff));
$('again').onclick=()=>newGame(diffKey);$('tomenu').onclick=()=>{$('end').classList.add('hide');showMenu()};
addEventListener('keydown',e=>{if(!G)return;if(e.key>='1'&&e.key<='4')train(+e.key-1);else if(e.key==='e')evolve();else if(e.key==='t')buildTurret();else if(e.key==='s')special(0);else if(e.key===' '){G.paused=!G.paused;e.preventDefault()}});
window.__aor={step:dt=>step(dt),get G(){return G},newGame,train,evolve,buildTurret,special,render,ui};
showMenu();resize();
