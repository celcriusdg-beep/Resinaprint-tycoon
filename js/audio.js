/* Audio engine (4.7): real recorded-style sound effects and two music loops (made by tools/make_audio.py), mixed with Web Audio.
   snd(kind) keeps working everywhere in the game. Music follows the screen and ducks for big moments. */
const AUDIO={ctx:null,sfxG:null,musG:null,buf:{},wait:{},unlocked:false,cur:null,curName:null,duckT:0,last:{}};
const audCfg=(()=>{let c={sv:.85,mv:.5,music:true};try{Object.assign(c,JSON.parse(localStorage.getItem('resinaprint-audio2')||'{}'))}catch(e){}return c})();
const audSave=()=>{try{localStorage.setItem('resinaprint-audio2',JSON.stringify(audCfg))}catch(e){}};
const AUD_PRELOAD=['tap','select','coin','good','bad','level','cash','buy','chest_shake','chest_open0','chest_open1','chest_open2','notify','print_done','pack','send'];
function audCtx(){
  if(AUDIO.ctx)return AUDIO.ctx;
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    const c=AUDIO.ctx=new C(),comp=c.createDynamicsCompressor();
    comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.2;
    AUDIO.sfxG=c.createGain();AUDIO.musG=c.createGain();
    AUDIO.sfxG.gain.value=audCfg.sv;AUDIO.musG.gain.value=audCfg.mv*.6;
    AUDIO.sfxG.connect(comp);AUDIO.musG.connect(comp);comp.connect(c.destination);
  }catch(e){AUDIO.ctx=null}
  return AUDIO.ctx;
}
function audLoad(name){
  if(AUDIO.buf[name])return Promise.resolve(AUDIO.buf[name]);
  if(AUDIO.wait[name])return AUDIO.wait[name];
  const c=audCtx();if(!c)return Promise.reject();
  return AUDIO.wait[name]=fetch(`audio/${name}.mp3`).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(ab=>new Promise((ok,no)=>c.decodeAudioData(ab,ok,no))).then(b=>AUDIO.buf[name]=b).catch(e=>{delete AUDIO.wait[name];throw e});
}
function audUnlock(){
  if(AUDIO.unlocked)return;const c=audCtx();if(!c)return;
  AUDIO.unlocked=true;if(c.state==='suspended')c.resume();
  AUD_PRELOAD.forEach(n=>audLoad(n).catch(()=>{}));
  audMusicTick();
}
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,audUnlock,{passive:true}));
document.addEventListener('visibilitychange',()=>{const c=AUDIO.ctx;if(!c)return;if(document.hidden)c.suspend();else if(AUDIO.unlocked)c.resume()});
function audPlay(name,o){
  o=o||{};const c=audCtx();if(!c||!AUDIO.unlocked)return;
  const go=b=>{
    const s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.playbackRate.value=o.rate||1;g.gain.value=o.vol==null?1:o.vol;
    s.connect(g);g.connect(AUDIO.sfxG);s.start();
  };
  if(AUDIO.buf[name])go(AUDIO.buf[name]);
  else{const t=performance.now();audLoad(name).then(b=>{if(performance.now()-t<900)go(b)}).catch(()=>{})}
}
const SND_MAP={tap:'tap',select:'select',coin:'coin',good:'good',bad:'bad',level:'level',cash:'cash',buy:'buy',on:'on',off:'off',notify:'notify',pack:'pack',send:'send',forge:'forge',glitch:'glitch',perk:'perk',rival:'rival',unstable:'unstable',whoosh:'whoosh',print_done:'print_done',chest_shake:'chest_shake'};
const SND_GAP={tap:35,coin:300,print_done:700,pack:90,select:50,bad:350,notify:500};
const SND_VAR={tap:.04,coin:.03,select:.03,print_done:.02,pack:.04};
snd=function(kind,arg){
  if(!sndOn)return;
  const now=performance.now();if(SND_GAP[kind]&&now-(AUDIO.last[kind]||0)<SND_GAP[kind])return;AUDIO.last[kind]=now;
  let name=SND_MAP[kind];
  if(kind==='chest'||kind==='chest_open'){const i=+arg||0;name='chest_open'+(i>=7?2:i>=4?1:0);audDuck(i>=4?3500:2500)}
  if(!name)return;
  const v=SND_VAR[kind];audPlay(name,{rate:v?1+(Math.random()*2-1)*v:1});
};
/* music: crossfaded loops that follow where you are in the game */
function audMusicFor(){
  try{if(tab==='empire'&&(sub.empire==='sing'||sub.empire==='rebirth'))return 'music_void'}catch(e){}
  return 'music_lofi';
}
function audFade(g,to,t){const c=AUDIO.ctx;g.gain.cancelScheduledValues(c.currentTime);g.gain.setValueAtTime(g.gain.value,c.currentTime);g.gain.linearRampToValueAtTime(to,c.currentTime+t)}
function audStartTrack(name){
  const c=audCtx();if(!c)return;
  audLoad(name).then(b=>{
    if(AUDIO.curName===name||!audCfg.music||!sndOn)return;
    const old=AUDIO.cur;if(old){old.stop=true;audFade(old.g,0,1.6);setTimeout(()=>{try{old.src&&old.src.stop()}catch(e){}},1800)}
    const run={name,g:c.createGain(),stop:false,src:null};run.g.gain.value=0;run.g.connect(AUDIO.musG);
    AUDIO.cur=run;AUDIO.curName=name;
    const dur=b.duration,x=2.0;
    const play=(at,first)=>{
      if(run.stop)return;
      const s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.connect(g);g.connect(run.g);
      g.gain.setValueAtTime(first?0:0,at);g.gain.linearRampToValueAtTime(1,at+(first?1.5:x));g.gain.setValueAtTime(1,at+dur-x);g.gain.linearRampToValueAtTime(0,at+dur);
      s.start(at);run.src=s;
      const next=at+dur-x;setTimeout(()=>play(next,false),Math.max(200,(next-c.currentTime-.3)*1000));
    };
    run.g.gain.value=1;play(c.currentTime+.05,true);
  }).catch(()=>{});
}
function audMusicTick(){
  if(!AUDIO.unlocked||!AUDIO.ctx)return;
  if(!audCfg.music||!sndOn){if(AUDIO.cur&&!AUDIO.cur.stop){const o=AUDIO.cur;o.stop=true;audFade(o.g,0,.6);AUDIO.curName=null;setTimeout(()=>{try{o.src&&o.src.stop()}catch(e){}},900)}return}
  const want=audMusicFor();if(AUDIO.curName!==want)audStartTrack(want);
}
setInterval(audMusicTick,1500);
function audDuck(ms){
  const c=AUDIO.ctx;if(!c||!AUDIO.musG)return;const g=AUDIO.musG.gain,base=audCfg.mv*.6;
  g.cancelScheduledValues(c.currentTime);g.setValueAtTime(g.value,c.currentTime);g.linearRampToValueAtTime(base*.25,c.currentTime+.2);
  clearTimeout(AUDIO.duckT);AUDIO.duckT=setTimeout(()=>{if(AUDIO.ctx)audFade(AUDIO.musG,audCfg.mv*.6,1.2)},ms);
}
const _setSound=setSound;
setSound=function(on){_setSound(on);if(on)audUnlock();audMusicTick()};
/* click sounds: specific for important actions, a soft tick for primary buttons */
const CLICK_SND={pack:'pack',packAll:'pack',sendBay:'send',sub:'select',shopGo:'select',openSkill:'select',singSel:'select',perk:'perk',stabUp:'perk',stabVent:'glitch',rvUndercut:'rival',rvSabotage:'rival',rvBuyout:'cash',fleetBuy:'buy',fleetUp:'buy',dspBuy:'buy',buyPrinter:'buy',autoTog:'select',autoSet:'select',placePrinter:'buy',animMode:'select',diff:'select',theme:'select'};
function clickSound(e){
  const t=e.target&&e.target.closest?e.target:null;if(!t)return;
  const b=t.closest('[data-a],[data-tab],.btn.primary,.stn,.task,.ub');if(!b||b.disabled)return;
  const a=b.dataset&&b.dataset.a,k=a&&CLICK_SND[a];
  if(b.dataset&&b.dataset.tab&&!a){snd('select');buzz(5);return}
  if(k){snd(k);buzz(6);return}
  if(b.matches('.btn.primary,.stn,.task,.ub')){snd('tap');buzz(6)}
}
/* failed actions say so */
const _toast0=toast;
toast=function(t){_toast0(t);if(/not enough|too tired|is full|missing|wait |no room|no free|caught|can.t|locked|needs a/i.test(String(t)))snd('bad')};
Object.assign(A,{
  music(){audCfg.music=!audCfg.music;audSave();audUnlock();audMusicTick();toast(audCfg.music?'Music on':'Music off')},
  vol(d){const k=d.k,v=+d.v;if(k==='sv'){audCfg.sv=v;if(AUDIO.sfxG)AUDIO.sfxG.gain.value=v;audSave();audPlay('select')}else{audCfg.mv=v;if(AUDIO.musG)AUDIO.musG.gain.value=v*.6;audSave()}}
});
const _collect=collect;collect=function(p){_collect(p);if(!awayMode&&!simulating)snd('print_done')};
