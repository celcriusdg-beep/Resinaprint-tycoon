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
  musPrime();audMusicTick();
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
/* music: a shuffled playlist of real lo-fi tracks (Holizna, CC0 via OpenGameArt), streamed through two audio
   elements that crossfade. Workshop tracks normally, darker tracks in Rebirth and Singularity. */
const PLAYLIST={
  work:['work-creature-comforts','work-glad-to-be-stuck-inside','work-something-in-the-air','work-a-little-shade','work-waves','work-morning-coffee','work-vintage'],
  void:['void-snow-drift','void-first-snow','void-foggy-headed']
};
const MUS={els:[],g:[],cur:-1,mode:null,order:{},pos:{},busy:false,primed:false};
function audMusicFor(){
  try{if(tab==='empire'&&(sub.empire==='sing'||sub.empire==='rebirth'))return 'void'}catch(e){}
  return 'work';
}
function musInit(){
  if(MUS.els.length)return true;const c=audCtx();if(!c)return false;
  for(let i=0;i<2;i++){
    const el=new Audio();el.preload='none';el.crossOrigin='anonymous';el.setAttribute('playsinline','');
    const g=c.createGain();g.gain.value=0;
    try{c.createMediaElementSource(el).connect(g)}catch(e){}
    g.connect(AUDIO.musG);
    el.addEventListener('timeupdate',()=>{if(MUS.cur===i&&el.duration&&el.duration-el.currentTime<4&&!MUS.busy)musNext()});
    el.addEventListener('ended',()=>{if(MUS.cur===i&&!MUS.busy)musNext()});
    el.addEventListener('error',()=>{if(MUS.cur===i){MUS.busy=false;setTimeout(musNext,1500)}});
    MUS.els.push(el);MUS.g.push(g);
  }
  return true;
}
function musPrime(){ /* iOS lets each audio element play only after a tap: touch both once during the unlock tap */
  if(MUS.primed||!musInit())return;MUS.primed=true;
  for(const el of MUS.els){try{const pr=el.play();if(pr&&pr.catch)pr.catch(()=>{});el.pause()}catch(e){}}
}
function musPick(mode){
  if(!MUS.order[mode]||MUS.pos[mode]>=MUS.order[mode].length){MUS.order[mode]=PLAYLIST[mode].slice().sort(()=>Math.random()-.5);MUS.pos[mode]=0}
  return MUS.order[mode][MUS.pos[mode]++];
}
function musPlay(mode){
  if(!musInit())return;const c=AUDIO.ctx;MUS.busy=true;MUS.mode=mode;
  const nxt=MUS.cur<0?0:1-MUS.cur,el=MUS.els[nxt],g=MUS.g[nxt],old=MUS.cur;
  el.src='music/'+musPick(mode)+'.mp3';el.currentTime=0;
  const pr=el.play();
  const go=()=>{
    g.gain.cancelScheduledValues(c.currentTime);g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(1,c.currentTime+3);
    if(old>=0){const og=MUS.g[old],oe=MUS.els[old];og.gain.cancelScheduledValues(c.currentTime);og.gain.setValueAtTime(og.gain.value,c.currentTime);og.gain.linearRampToValueAtTime(0,c.currentTime+3);setTimeout(()=>{if(MUS.cur!==old)oe.pause()},3300)}
    MUS.cur=nxt;setTimeout(()=>{MUS.busy=false},3500);
  };
  if(pr&&pr.then)pr.then(go).catch(()=>{MUS.busy=false});else go();
}
function musNext(){if(audCfg.music&&sndOn)musPlay(audMusicFor())}
function musStop(){
  const c=AUDIO.ctx;if(!c)return;MUS.mode=null;
  MUS.g.forEach((g,i)=>{g.gain.cancelScheduledValues(c.currentTime);g.gain.setValueAtTime(g.gain.value,c.currentTime);g.gain.linearRampToValueAtTime(0,c.currentTime+.8);setTimeout(()=>{if(!MUS.mode)MUS.els[i].pause()},900)});
}
function audMusicTick(){
  if(!AUDIO.unlocked||!AUDIO.ctx)return;
  if(!audCfg.music||!sndOn){if(MUS.mode)musStop();return}
  if(document.hidden)return;
  const want=audMusicFor();if(MUS.mode!==want&&!MUS.busy)musPlay(want);
}
setInterval(audMusicTick,1500);
document.addEventListener('visibilitychange',()=>{if(!MUS.els.length)return;if(document.hidden)MUS.els.forEach(e=>e.pause());else if(MUS.cur>=0&&MUS.mode&&audCfg.music&&sndOn)MUS.els[MUS.cur].play().catch(()=>{})});
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
