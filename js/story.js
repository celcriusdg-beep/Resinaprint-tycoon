/* Story chapters, named regulars, weekly events and the figure shelf (3.5). */
const nf=n=>Math.round(n).toLocaleString('en-NL');
const hasLab=()=>S.printers.some(p=>PRINTERS[p.type].lab);
const storeMerged=()=>Object.values(S.stores||{}).some(x=>x&&x.merged);
const O=(t,cur,max,go)=>({t,f:()=>[Math.min(max,cur()),max],go});
const CHAPTERS=[
  {t:'Hok days',intro:'A storage unit, one little printer and a lot of hope. Everyone starts somewhere.',reward:{chest:2,items:['service']},objs:[
    O('Sell 5 figures',()=>S.sold,5,['studio']),O('Own 2 printers',()=>S.printers.length,2,['buy','printers']),O('Reach level 3',()=>S.lv,3,['empire','more'])]},
  {t:'Going official',intro:'Customers want invoices. Time to become a real company with a real address.',reward:{chest:5,items:['meal']},objs:[
    O('Register at the KvK',()=>S.biz.kvk?1:0,1,['empire','company']),O('Move into a small studio',()=>S.ws>=1?1:0,1,['buy','space']),
    O('Hire your first worker or machine',()=>S.staff.length,1,['team','people']),O('Sell 100 figures',()=>S.sold,100,['studio'])]},
  {t:'Workshop life',intro:'The neighbours complain about the smell. You complain about the neighbours.',reward:{chest:8,items:['boost','hype']},objs:[
    O('Rent a workshop',()=>S.ws>=2?1:0,1,['buy','space']),O('Get 3-phase power',()=>S.up.power3?1:0,1,['empire','upgrades']),
    O('Own 6 printers',()=>S.printers.length,6,['buy','printers']),O('Deliver 3 contracts',()=>S.contractsDone,3,['orders','jobs'])]},
  {t:'Factory floor',intro:'Forklifts. Pallets. A coffee machine that costs more than your first car.',reward:{chest:12,items:['tskip','xp']},objs:[
    O('Move into a factory hall',()=>S.ws>=3?1:0,1,['buy','space']),O('Own 15 printers',()=>S.printers.length,15,['buy','printers']),
    O('Merge a store',()=>storeMerged()?1:0,1,['buy','stores']),O('Sell 2,500 figures',()=>S.sold,2500,['studio'])]},
  {t:'The Laboratorium',intro:'Behind the steel door, the printers hum like a choir. Nobody is allowed to sneeze.',reward:{chest:20,items:['charm','workshop']},objs:[
    O('Build the Laboratorium wing',()=>S.up.labwing?1:0,1,['empire','upgrades']),O('Own a laboratory printer',()=>hasLab()?1:0,1,['buy','printers']),
    O('Install an Omega Forge machine',()=>machOwned(true).length,1,['team','lab']),O('Reach level 25',()=>S.lv,25,['empire','more'])]},
  {t:'Going global',intro:'Time to take the name abroad. Same company, new country, new customers.',reward:{chest:30,items:['sale','finish']},objs:[
    O('Rebirth once',()=>rebOf(S).count,1,['empire','rebirth']),O('Sell 10,000 figures this run',()=>S.sold,10000,['studio'])]},
  {t:'Resin legend',intro:'Collectors whisper your name. Your keychains hang from rear-view mirrors on three continents.',reward:{chest:40,items:['workshop','charm','xp']},objs:[
    O('Rebirth 3 times',()=>rebOf(S).count,3,['empire','rebirth']),O('Own 8 Omega Forge machines',()=>machOwned(true).length,8,['team','lab']),O('Complete 4 figure sets',()=>Object.keys(shelfOf().claimed).length,4,['empire','shelf'])]}
];
const storyOf=s=>s.story||(s.story={ch:0,ff:0,done:0});
const chDone=c=>c.objs.every(o=>{const [a,b]=o.f();return a>=b});
function storyCheck(){
  const st=storyOf(S);
  if(!st.ff){st.ff=1;let n=0;while(st.ch<CHAPTERS.length&&chDone(CHAPTERS[st.ch])){st.ch++;n++}if(n)log(`Your progress already covers ${n} story chapter${n>1?'s':''}.`,'good');return}
  if(st.ch>=CHAPTERS.length||modalOpen()||simulating)return;
  const c=CHAPTERS[st.ch];if(!chDone(c))return;
  st.ch++;st.done++;
  vaultAdd(S,Math.max(c.reward.chest,S.lv));for(const k of c.reward.items)addItem(k);
  const nx=CHAPTERS[st.ch];
  confetti(120);snd('level');
  modal(`<h3>Chapter ${st.ch} complete</h3><p><b>${c.t}</b><br>${c.intro}</p><div class="card" style="margin:12px 0"><div class="t">Reward</div><div class="s">1 chest (level ${Math.max(c.reward.chest,S.lv)}) and ${c.reward.items.map(k=>ITEMS[k].n).join(', ')}</div></div>${nx?`<p><b>Next: ${nx.t}</b><br>${nx.intro}</p>`:'<p>You finished the story. The legend never stops, though.</p>'}<div class="acts"><button class="btn primary" data-choice="0">Onwards</button></div>`);
  pending=[{f:()=>{}}];
  log(`Chapter complete: ${c.t}. Reward: a chest and items.`,'good');
}
function smartGoal(){
  /* after the story, or between chapters: the most useful next purchase */
  if(S.printers.length<space().printers){const k=Object.keys(PRINTERS).filter(k=>!PRINTERS[k].req||S.up[PRINTERS[k].req]).filter(k=>PRINTERS[k].cost>(S.printers.length?0:0)&&!PRINTERS[k].lab).sort((a,b)=>PRINTERS[a].cost-PRINTERS[b].cost).find(k=>PRINTERS[k].cost>S.cash*.5&&PRINTERS[k].cost<=Math.max(S.cash*3,500));
    if(k)return{t:`Buy a ${PRINTERS[k].name}`,cur:Math.min(S.cash,PRINTERS[k].cost),max:PRINTERS[k].cost,go:['buy','printers'],money:1}}
  const u=UPGRADES.filter(u=>!S.up[u.id]&&(!u.req||u.req())).sort((a,b)=>a.cost-b.cost)[0];
  if(u)return{t:`Buy upgrade: ${u.name}`,cur:Math.min(S.cash,u.cost),max:u.cost,go:['empire','upgrades'],money:1};
  return{t:'Keep growing your empire',cur:1,max:1,go:['studio']};
}
function currentGoal(){
  const st=storyOf(S);
  if(st.ch<CHAPTERS.length){const c=CHAPTERS[st.ch],o=c.objs.find(o=>{const [a,b]=o.f();return a<b})||c.objs[0],[a,b]=o.f();return{kick:`Ch ${st.ch+1}`,t:o.t,cur:a,max:b,go:o.go}}
  const g=smartGoal();g.kick='Goal';return g;
}
Object.assign(A,{goGoal(){const g=currentGoal(),[t,s]=g.go||['studio'];if(s==='upgrades'){openSkill();return}tab=t;if(s){const k={buy:'buy',empire:'empire',orders:'orders',team:'team'}[t];if(k)sub[k]=s}window.scrollTo({top:0})}});
function goalHTML(){
  const g=currentGoal(),p=Math.min(100,100*g.cur/g.max);
  return `<span class="gk">${g.kick}</span><span class="gt">${g.t}</span><span class="gp"><i style="width:${p}%"></i></span><span class="gn">${g.money?fmt(g.cur)+' / '+fmt(g.max):nf(g.cur)+' / '+nf(g.max)}</span>`;
}
function chapterCard(){
  const st=storyOf(S);if(st.ch>=CHAPTERS.length)return '';
  const c=CHAPTERS[st.ch];
  return `<div class="card chap"><div class="chk"><span>Chapter ${st.ch+1} of ${CHAPTERS.length}</span><b>${c.t}</b></div><div class="s" style="margin:4px 0 10px">${c.intro}</div>`+
    c.objs.map(o=>{const [a,b]=o.f(),d=a>=b;return `<button class="obj ${d?'done':''}" data-a="goObj" data-i="${c.objs.indexOf(o)}"><i>${d?'✓':''}</i><span>${o.t}</span><em>${d?'Done':nf(a)+' / '+nf(b)}</em></button>`}).join('')+
    `<div class="s" style="margin-top:8px">Reward: a chest and ${c.reward.items.map(k=>ITEMS[k].n.toLowerCase()).join(', ')}</div></div>`;
}
Object.assign(A,{goObj(d){const c=CHAPTERS[storyOf(S).ch],o=c&&c.objs[+d.i];if(!o)return;const [t,s]=o.go||['studio'];if(s==='upgrades'){openSkill();return}tab=t;if(s){const k={buy:'buy',empire:'empire',orders:'orders',team:'team'}[t];if(k)sub[k]=s}window.scrollTo({top:0})}});
/* ---------- regulars ---------- */
const REGS=[
  {id:'kenji',n:'Kenji',role:'Anime collector',fav:['chibi'],at:0,hue:350},
  {id:'sofie',n:'Sofie',role:'Bust enthusiast',fav:['bust','lux','yasuo','jinhsib'],at:30,hue:200},
  {id:'marco',n:'Marco',role:'Desk gamer',fav:['desk'],at:80,hue:140},
  {id:'tomo',n:'Tomo',role:'Card shop owner',fav:['deckbox','licensed'],at:150,hue:30},
  {id:'lotte',n:'Lotte',role:'Garage kit painter',fav:['kit'],at:250,hue:280},
  {id:'ayaka',n:'Ayaka',role:'Champion fan',fav:['ahri','akali','yone','jhin','jinx','kaisa','jinhsi'],at:500,hue:320},
  {id:'voss',n:'Dr. Voss',role:'Premium collector',fav:['premium','fullcolor'],at:900,hue:50},
  {id:'bram',n:'Bram',role:'Statue baron',fav:['statue'],at:1600,hue:20}
];
const REG_PTS=[30,120,400,1200],REG_BONUS=.06;
const regsOf=s=>s.regs||(s.regs={});
function regOf(r){const R=regsOf(S);return R[r.id]||(R[r.id]={pts:0,lv:0,gifts:0})}
const regBonus=k=>{let b=0;for(const r of REGS){const x=regsOf(S)[r.id];if(x&&x.lv&&r.fav.includes(k))b+=x.lv*REG_BONUS}return b};
function regSale(k){
  shelfOf().found[k]=1;
  for(const r of REGS){if(!r.fav.includes(k)||S.sold<r.at)continue;const x=regOf(r);x.pts++;
    const nl=REG_PTS.filter(p=>x.pts>=p).length;
    if(nl>x.lv){x.lv=nl;x.gifts++;log(`${r.n} (${r.role}) is now a level ${nl} regular. Demand for their favourites is up ${Math.round(nl*REG_BONUS*100)}%.`,'good');if(!simulating)toast(`${r.n} is level ${nl}`)}}
}
Object.assign(A,{regGift(d){const r=REGS.find(x=>x.id===d.id),x=r&&regOf(r);if(!x||!x.gifts)return;x.gifts--;vaultAdd(S,Math.max(2,Math.round(S.lv*.7)));const id=pickItem(3);addItem(id);confetti(40);snd('chest');toast(`Gift from ${r.n}: a chest and ${ITEMS[id].n}`)}});
function regsView(){
  let h=label('Regulars',`${REGS.filter(r=>S.sold>=r.at||regsOf(S)[r.id]).length} of ${REGS.length} know your shop`)+`<div class="card" style="margin-bottom:12px"><div class="s">Loyal customers buy their favourite figures more often. Sell them and they level up: more demand for those figures and a gift chest each level.</div></div><div class="group">`;
  for(const r of REGS){
    const known=S.sold>=r.at||regsOf(S)[r.id];
    if(!known){h+=`<div class="item reg locked"><span class="rav" style="--h:${r.hue}">?</span><div class="grow"><div class="t">Someone new</div><div class="s">Appears after ${nf(r.at)} figures sold</div></div></div>`;continue}
    const x=regOf(r),next=REG_PTS[x.lv],pr=next?100*(x.pts-(REG_PTS[x.lv-1]||0))/(next-(REG_PTS[x.lv-1]||0)):100;
    h+=`<div class="item reg"><span class="rav" style="--h:${r.hue}">${r.n[0]}</span><div class="grow"><div class="t">${r.n} <span class="chip amber">Lv ${x.lv}</span></div><div class="s">${r.role} · loves ${r.fav.slice(0,2).map(k=>PRODUCTS[k].short||PRODUCTS[k].name).join(', ')}${x.lv?` · +${Math.round(x.lv*REG_BONUS*100)}% demand`:''}</div>
      <div class="bar" style="margin-top:6px"><i style="width:${pr}%;background:var(--amber)"></i></div></div>${x.gifts?`<button class="btn sm primary" data-a="regGift" data-id="${r.id}">Gift ×${x.gifts}</button>`:`<span class="s">${next?x.pts+' / '+next:'Max'}</span>`}</div>`}
  return h+'</div>';
}
/* ---------- weekly events ---------- */
const EVENTS=[
  {id:'con',n:'Convention Week',txt:'Crowds everywhere. Every figure sells 30% better.',need:60,unit:'figures shipped',days:7},
  {id:'rush',n:'Collector Rush',txt:'Collectors are after one figure in particular. It sells twice as well.',need:25,unit:'shipped',days:7},
  {id:'fair',n:'Resin Fair',txt:'Suppliers slash prices: resin costs 25% less all week.',need:60,unit:'figures printed',days:7}
];
const evtDemand=k=>{const e=S.evt;if(!e||S.day>e.until)return 1;return e.id==='con'?1.3:e.id==='rush'&&e.p===k?2:1};
const evtResin=()=>{const e=S.evt;return e&&S.day<=e.until&&e.id==='fair'?.75:1};
function evtCur(e){return e.id==='con'?S.sold-e.base:e.id==='rush'?(S.soldBy[e.p]||0)-e.base:e.cur||0}
function eventDaily(){
  const e=S.evt;
  if(e&&S.day>e.until+1){if(!e.claimed&&evtCur(e)<e.need)log(`${e.n} ended. You did not reach the goal.`,'amber');S.evt=null}
  if(!S.evt&&S.day>=4&&S.day%14===4&&S.started){
    const t=pick(EVENTS),need=Math.round(t.need*(1+S.lv/18)),pool=PKEYS.filter(k=>sellable(k));
    const ev={id:t.id,until:S.day+t.days,need,base:0,cur:0,claimed:false};
    if(t.id==='con')ev.base=S.sold;
    if(t.id==='rush'){if(!pool.length)return;ev.p=pick(pool);ev.base=S.soldBy[ev.p]||0;ev.need=Math.round(need*.6)}
    S.evt=ev;log(`${t.n} starts! ${t.txt}`,'good');notice(t.n,t.txt+` Goal: ${ev.need} ${t.unit}. It lasts ${t.days} days.`,'Nice');
  }
}
const _qInc0=qInc;qInc=function(k,n){_qInc0(k,n);const e=S&&S.evt;if(e&&e.id==='fair'&&k==='printed')e.cur=(e.cur||0)+(n==null?1:n)};
const _eod0=endOfDay;endOfDay=function(){_eod0();eventDaily()};
Object.assign(A,{claimEvent(){const e=S.evt;if(!e||e.claimed||evtCur(e)<e.need)return;e.claimed=true;vaultAdd(S,Math.max(3,S.lv));addItem(pickItem(4));addItem(pickItem(3));confetti(80);snd('chest');toast('Event reward: a chest and two items')}});
function eventCard(){
  const e=S.evt;if(!e||S.day>e.until+(e.claimed?0:1))return '';
  const t=EVENTS.find(x=>x.id===e.id),cur=Math.min(e.need,evtCur(e)),done=cur>=e.need,left=Math.max(0,e.until-S.day+1);
  return `<div class="card evt"><div class="chk"><span>Event · ${left} day${left===1?'':'s'} left</span><b>${t.n}${e.p?': '+PRODUCTS[e.p].name:''}</b></div><div class="s" style="margin:4px 0 8px">${t.txt}</div><div class="bar"><i style="width:${100*cur/e.need}%;background:var(--uv)"></i></div><div class="evrow"><span class="s">${nf(cur)} / ${nf(e.need)} ${t.unit}</span>${e.claimed?'<span class="chip good">Claimed</span>':done?'<button class="btn sm primary" data-a="claimEvent">Claim reward</button>':'<span class="s">Reward: chest + 2 items</span>'}</div></div>`;
}
/* ---------- figure shelf ---------- */
const shelfOf=s=>{s=s||S;return s.shelf||(s.shelf={found:{},claimed:{}})};
const SETS=[
  {id:'basics',n:'Starter shelf',keys:['chibi','bust','desk']},
  {id:'collector',n:'Collector shelf',keys:['kit','premium','statue','fullcolor']},
  {id:'cards',n:'Game night',keys:['licensed','deckbox']},
  {id:'lol',n:'Champions',keys:['ahri','akali','yone','jhin','jinx','lux','yasuo','kaisa']},
  {id:'ww',n:'Wuthering',keys:['jinhsi','jinhsib']}
];
const SET_BONUS=.04;
const shelfBonus=()=>Object.keys(shelfOf().claimed).length*SET_BONUS;
Object.assign(A,{claimSet(d){const st=SETS.find(x=>x.id===d.id),sh=shelfOf();if(!st||sh.claimed[st.id]||!st.keys.every(k=>sh.found[k]))return;sh.claimed[st.id]=1;vaultAdd(S,Math.max(3,S.lv));confetti(90);snd('level');toast(`${st.n} complete: +${Math.round(SET_BONUS*100)}% demand forever`)}});
function shelfView(){
  const sh=shelfOf(),total=PKEYS.length,got=PKEYS.filter(k=>sh.found[k]).length;
  let h=label('Figure shelf',`${got} of ${total} made and sold`)+`<div class="card" style="margin-bottom:12px"><div class="s">Sell every figure in a set to fill its shelf. A full shelf gives a chest and +${Math.round(SET_BONUS*100)}% demand for everything, forever (${Math.round(shelfBonus()*100)}% now). It carries over when you rebirth.</div></div>`;
  for(const st of SETS){
    const n=st.keys.filter(k=>sh.found[k]).length,full=n===st.keys.length;
    h+=`<div class="shelfset"><div class="ssh"><b>${st.n}</b><span>${n}/${st.keys.length}</span>${sh.claimed[st.id]?'<span class="chip good">Complete</span>':full?`<button class="btn sm primary" data-a="claimSet" data-id="${st.id}">Claim</button>`:''}</div><div class="plank">`;
    for(const k of st.keys){const f=sh.found[k];h+=`<div class="fig ${f?'':'sil'}"><div class="fimg">${prodArt(k)}</div><span>${f?(PRODUCTS[k].short||PRODUCTS[k].name):'???'}</span></div>`}
    h+='</div></div>';
  }
  return h;
}
/* keep story, regulars and shelf through rebirth and restart, and show everything */
const _storyKeep=o=>{S.story=o.story;S.regs=o.regs;S.shelf=o.shelf;S.pinv=o.pinv};
const _doRebirth0=doRebirth;doRebirth=function(d){const o=S;_doRebirth0(d);_storyKeep(o)};
const _restart0=restartRun;restartRun=function(){const o=S;_restart0();_storyKeep(o)};
