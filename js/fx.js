/* Juice: sounds, haptics, confetti and floating numbers. Purely cosmetic. */
let sndOn=true;try{sndOn=localStorage.getItem('resinaprint-sound')!=='off'}catch(e){}
let _ac=null,_lastSnd=0;
function snd(kind){
  if(!sndOn)return;const now=performance.now();if(kind==='coin'&&now-_lastSnd<350)return;_lastSnd=now;
  try{_ac=_ac||new (window.AudioContext||window.webkitAudioContext)();if(_ac.state==='suspended')_ac.resume();
    const T={tap:[[520,.04,'triangle',.03]],coin:[[880,.05,'sine',.04],[1320,.08,'sine',.04]],level:[[523,.1,'triangle',.06],[659,.1,'triangle',.06],[784,.1,'triangle',.06],[1046,.25,'triangle',.06]],
      chest:[[330,.08,'square',.04],[440,.08,'square',.04],[660,.2,'square',.05]],good:[[600,.08,'sine',.05],[900,.14,'sine',.05]],bad:[[220,.18,'sawtooth',.04]]}[kind];
    if(!T)return;let t=_ac.currentTime;
    for(const [f,d,w,v] of T){const o=_ac.createOscillator(),g=_ac.createGain();o.type=w;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g);g.connect(_ac.destination);o.start(t);o.stop(t+d+.02);t+=d*.85}
  }catch(e){}
}
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
function setSound(on){sndOn=on;try{localStorage.setItem('resinaprint-sound',on?'on':'off')}catch(e){}}
function confetti(power){
  const n=power||60,cv=document.createElement('canvas');cv.className='confetti';cv.width=innerWidth;cv.height=innerHeight;document.body.appendChild(cv);
  const c=cv.getContext('2d'),cols=['#ffb547','#9d89ff','#5bd6a6','#ff6d82','#fff','#7ff3ff'],ps=[];
  for(let i=0;i<n;i++)ps.push({x:innerWidth/2+(Math.random()-.5)*80,y:innerHeight*.45,vx:(Math.random()-.5)*11,vy:-Math.random()*13-3,r:Math.random()*6,s:3+Math.random()*5,c:cols[i%cols.length],vr:(Math.random()-.5)*.4});
  let f=0;(function tick(){c.clearRect(0,0,cv.width,cv.height);f++;
    for(const p of ps){p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.vx*=.992;p.r+=p.vr;c.save();c.translate(p.x,p.y);c.rotate(p.r);c.fillStyle=p.c;c.globalAlpha=Math.max(0,1-f/90);c.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);c.restore()}
    if(f<90)requestAnimationFrame(tick);else cv.remove()})();
}
function flyer(text,cls,el){
  if(!el)return;const r=el.getBoundingClientRect(),d=document.createElement('div');d.className='flyer '+(cls||'');d.textContent=text;
  d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+r.height)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),1100);
}
/* every tap on a main button gets a soft tick and a tiny buzz */
document.addEventListener('click',e=>{if(typeof clickSound==='function')clickSound(e);else{const b=e.target.closest&&e.target.closest('.btn.primary,.stn,.task,.ub');if(b&&!b.disabled){snd('tap');buzz(6)}}},true);
/* ambient particles drifting up behind everything, like resin sparks over a lit workshop */
(function(){const a=document.createElement('div');a.id='amb';a.setAttribute('aria-hidden','true');
  for(let i=0;i<18;i++){const e=document.createElement('i');const s=2+Math.random()*4;
    e.style.cssText=`left:${Math.random()*100}%;--s:${s.toFixed(1)}px;--d:${(14+Math.random()*16).toFixed(1)}s;--dl:${(-Math.random()*20).toFixed(1)}s;--x:${(Math.random()*80-40).toFixed(0)}px`;a.appendChild(e)}
  document.body.insertBefore(a,document.body.firstChild)})();
