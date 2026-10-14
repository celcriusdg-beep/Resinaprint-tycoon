/* Rebirth (2.4): restart the company from the hok and keep Resin Shards, a permanent currency for perks. */
const REBIRTH_MIN=1000000;
const PERKS=[
  {id:'head',n:'Head start',base:2,max:10,d:l=>`Start every run with +${fmt(500*l)} cash`},
  {id:'dem',n:'Brand heat',base:3,max:10,d:l=>`+${l*3}% demand for everything`},
  {id:'xp',n:'Quick study',base:2,max:10,d:l=>`Studio XP +${l*10}%`},
  {id:'luck',n:'Shard luck',base:3,max:10,d:l=>`Chests roll rarer rewards (+${l*10}% luck)`},
  {id:'rsn',n:'Resin contacts',base:2,max:10,d:l=>`Resin costs ${l*2}% less`},
  {id:'spd',n:'Tuned printers',base:3,max:10,d:l=>`Prints ${l*2}% faster`},
  {id:'en',n:'Second wind',base:2,max:10,d:l=>`+${l*10} max energy`},
  {id:'keys',n:'Vault keys',base:4,max:5,d:l=>`Start every run with ${l} free chest${l===1?'':'s'}`},
  {id:'gain',n:'Shard hunter',base:5,max:10,d:l=>`+${l*10}% Resin Shards on rebirth`}
];
const NEWCTRY_BONUS=3;
const PERK_ICO={"head": "<circle cx=\"8\" cy=\"8\" r=\"6\"/><circle cx=\"8\" cy=\"8\" r=\"2.2\"/>", "dem": "<path d=\"M2 12 6 8l3 2.5L14 4\"/><path d=\"M10 4h4v4\"/>", "xp": "<path d=\"M8 1.8l1.9 3.9 4.2.6-3 3 .7 4.2L8 11.4 4.2 13.5l.7-4.2-3-3 4.2-.6z\"/>", "luck": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"2\"/><circle cx=\"5.7\" cy=\"5.7\" r=\".7\"/><circle cx=\"10.3\" cy=\"10.3\" r=\".7\"/><circle cx=\"8\" cy=\"8\" r=\".7\"/>", "rsn": "<path d=\"M8 2C6 5 3.5 7.5 3.5 10.2a4.5 4.5 0 0 0 9 0C12.5 7.5 10 5 8 2z\"/>", "spd": "<path d=\"M2.5 11a5.5 5.5 0 1 1 11 0\"/><path d=\"M8 11l3-4\"/>", "en": "<rect x=\"2\" y=\"5\" width=\"11\" height=\"6\" rx=\"1\"/><path d=\"M13 7v2M5 7v2M8 7v2\"/>", "keys": "<circle cx=\"5\" cy=\"8\" r=\"2.8\"/><path d=\"M7.8 8H14M12 8v2.5M10 8v2\"/>", "gain": "<path d=\"M8 1.8l4.6 4.8L8 14.2 3.4 6.6z\"/><path d=\"M3.4 6.6h9.2\"/>"};
const newReb=()=>({shards:0,total:0,count:0,perks:{},history:[],branches:{}});
const rebOf=s=>s.reb||(s.reb=newReb());
function perk(id){return (S&&S.reb&&S.reb.perks[id])||0}
const rebDem=()=>perk('dem')*.03+(hasBranch('jp')?.04:0);
const perkCost=(P,l)=>Math.round(P.base*Math.pow(1.5,l));
/* Resin Shard: black matter with a purple glow */
var shardSvg=(px,cls)=>`<svg class="shard ${cls||''}" viewBox="0 0 48 64" width="${px}" height="${Math.round(px*64/48)}" aria-hidden="true"><defs><linearGradient id="shg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1a48"/><stop offset=".45" stop-color="#07050d"/><stop offset="1" stop-color="#150b28"/></linearGradient><linearGradient id="shf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a8ff" stop-opacity=".85"/><stop offset="1" stop-color="#7a3bff" stop-opacity="0"/></linearGradient></defs><polygon points="24,2 41,21 35,59 24,62 12,57 7,23" fill="url(#shg)" stroke="#a46bff" stroke-width="1.6" stroke-linejoin="round"/><polygon points="24,2 41,21 24,26" fill="url(#shf)" opacity=".7"/><polygon points="24,26 41,21 35,59 24,62" fill="#000" opacity=".45"/><polygon points="7,23 24,26 24,62 12,57" fill="#7a3bff" opacity=".2"/><path d="M24 2 24 62M7 23 24 26 41 21" stroke="#b98aff" stroke-width=".7" opacity=".65" fill="none"/><circle cx="19" cy="22" r="1.6" fill="#fff" opacity=".8"/></svg>`;
var shardN=n=>`<span class="shardn">${shardSvg(14)}<b class="num">${n}</b></span>`;
function shardGain(s){
  s=s||S;const v=value(s);
  return Math.max(0,Math.floor((Math.pow(Math.max(0,v)/100000,.6)+(s.lv||1)/5)*(1+((s.reb&&s.reb.perks.gain)||0)*.1)));
}
const canRebirth=()=>S.started&&!S.over&&value(S)>=REBIRTH_MIN;
function doRebirth(dest){
  const old=S,keep=rebOf(old),from=old.country||'nl';dest=dest||from;
  const gain=shardGain(old)+((!keep.branches[dest]&&dest!==from)?NEWCTRY_BONUS:0);
  keep.branches=keep.branches||{};const bp=keep.branches[from]||{best:0,runs:0};bp.best=Math.max(bp.best,Math.round(value(old)));bp.runs++;keep.branches[from]=bp;
  keep.shards+=gain;keep.total+=gain;keep.count++;
  keep.history.push({n:keep.count,c:from,day:old.day,value:Math.round(value(old)),sold:old.sold,lv:old.lv,shards:gain});
  if(keep.history.length>30)keep.history.shift();
  S=fresh();
  S.started=true;S.lastT=Date.now();S.reb=keep;S.country=dest;S.inv=old.inv||{};S.vault=old.vault;S.theme=old.theme;S.diff=old.diff;S.seenVer=old.seenVer;
  S.cash+=500*perk('head');
  for(let i=0;i<perk('keys');i++)vaultAdd(S,1);
  refreshOffers();newTrend();lastHTML='';
  log(`Rebirth ${keep.count}: Resinaprint opens in ${COUNTRIES[dest].n}. You carry ${keep.shards} Resin Shards.`,'amber');
  return gain;
}
Object.assign(A,{
  rebirth(){
    if(!canRebirth())return toast(`Reach a company worth ${fmt(REBIRTH_MIN)} first`);
    const g=shardGain();
    confirmBox('Rebirth Resinaprint?',`Your current company becomes a branch that keeps earning. You start over in the hok (${fmt(800+500*perk('head'))}) in a country you choose on the globe, and keep your Resin Shards, perks and vault. You will earn ${g} Resin Shard${g===1?'':'s'}. Cash, printers, staff, stores and upgrades are reset.`,()=>{
      openWorld('pick',dest=>{
        const gain=doRebirth(dest);tab='empire';sub.empire='rebirth';
        pending=[{f:()=>{}}];
        modal(`<div class="vreveal" style="--rc:#9d6bff"><div class="vshow" style="animation-delay:.1s"><div class="kicker">Rebirth ${rebOf(S).count} · ${COUNTRIES[dest].f} ${COUNTRIES[dest].n}</div><div style="display:grid;place-items:center;margin:6px 0 4px">${shardSvg(96,'big')}</div><div class="vname" style="margin-bottom:6px"><b class="rn rp" aria-label="Resin Shards">${[...'Resin Shards'].map((c,j)=>`<i class="c" aria-hidden="true" style="--i:${j}">${c===' '?'&nbsp;':c}</i>`).join('')}</b></div><p style="text-align:center;margin:0 0 4px">+${gain} earned · ${rebOf(S).shards} to spend</p></div></div><div class="acts" style="margin-top:12px"><button class="btn primary" data-choice="0">Spend them in Empire › Rebirth</button></div>`);
      });
    });
  },
  world(){openWorld('view')},
  perk(d){
    const P=PERKS.find(x=>x.id===d.k),R=rebOf(S),l=perk(P.id);
    if(l>=P.max)return;const c=perkCost(P,l);
    if(R.shards<c)return toast('Not enough Resin Shards');
    R.shards-=c;R.perks[P.id]=l+1;toast(`${P.n} level ${l+1}`);
  }
});
function rebirthView(){
  const R=rebOf(S),v=value(S),ok=canRebirth(),g=shardGain();
  let h=label('Rebirth',`${R.count} rebirth${R.count===1?'':'s'} · ${R.total} shards earned`)+
  `<div class="card shardcard"><div class="shardhero">${shardSvg(84,'big')}<div class="grow"><div class="s">Resin Shards</div><div class="shardbig num">${R.shards}</div></div></div>
  <div class="s" style="margin-top:12px">Restart in the hok and keep your shards, perks and vault. Every run goes a bit faster than the last.</div>
  <div style="margin-top:12px">${bar(Math.min(100,v/REBIRTH_MIN*100),'var(--uv)')}<div class="kv"><span>Company worth <b>${fmt(v)}</b> of <b>${fmt(REBIRTH_MIN)}</b></span></div></div>
  <div class="opts"><button class="btn primary" data-a="rebirth" ${ok?'':'disabled'}>${ok?`Rebirth · +${g} shard${g===1?'':'s'}`:'Not ready yet'}</button></div></div>`;
  const br=Object.keys(R.branches||{});
  h+=label('World',`${ctryOf().f} ${ctryOf().n} · ${br.length} branch${br.length===1?'':'es'}`)+`<div class="card"><div class="bonus">${modChips(ctryOf().m,ctryOf().fav)||'<span class="chip">Standard rules</span>'}</div><div class="s" style="margin-top:10px">${br.length?`Your branches earn <b style="color:var(--ink)">${fmt(branchTotal())}</b> a day and give permanent perks.`:'Rebirth to open a new company in another country. The old one stays open as a branch and keeps paying out.'}</div>${br.length?`<div class="bonus" style="margin-top:8px">${br.map(k=>`<span class="chip amber">${COUNTRIES[k].f} ${COUNTRIES[k].bp}</span>`).join('')}</div>`:''}<div class="opts"><button class="btn sm uv" data-a="world">Open the world map</button></div></div>`;
  h+=label('Perks','permanent, they survive every rebirth')+`<div class="group">`;
  for(const P of PERKS){const l=perk(P.id),max=l>=P.max,c=perkCost(P,l);
    h+=`<div class="item"><div class="perkico"><svg viewBox="0 0 16 16" aria-hidden="true">${PERK_ICO[P.id]}</svg></div><div class="grow"><div class="t">${P.n} <span class="chip uv">Lv ${l}/${P.max}</span></div><div class="s">${l?P.d(l):'Not owned'}${max?'':` <span class="f">→ ${P.d(l+1)}</span>`}</div></div>${max?'<span class="chip good">Max</span>':`<button class="btn sm shardbtn" data-a="perk" data-k="${P.id}" ${R.shards<c?'disabled':''}>${shardSvg(11)} ${c}</button>`}</div>`}
  h+='</div>';
  if(R.history.length)h+=label('Past companies')+`<div class="group">`+R.history.slice().reverse().map(x=>item(`Run ${x.n}${x.c?' · '+COUNTRIES[x.c].f+' '+COUNTRIES[x.c].n:''}`,`Day ${x.day} · worth ${fmt(x.value)} · ${x.sold} sold · level ${x.lv}`,`<span class="num">${shardN('+'+x.shards)}</span>`)).join('')+'</div>';
  return h;
}
function rebirthCard(){
  if(!canRebirth())return '';
  return `<div class="card vcta shardcard" style="margin-top:16px"><div>${shardSvg(40,'big')}</div><div class="grow"><div class="t">Rebirth available</div><div class="s">A restart is worth ${shardGain()} Resin Shards.</div></div><button class="btn sm primary" data-a="goRebirth">See</button></div>`;
}
A.goRebirth=()=>{tab='empire';sub.empire='rebirth'};

/* Restart the run without a rebirth: permanent progress (shards, perks, branches, vault, settings) is kept, no shards are earned. */
function restartRun(){
  const old=S;
  S=fresh();
  S.started=true;S.lastT=Date.now();S.reb=rebOf(old);S.inv=old.inv||{};S.vault=old.vault;S.theme=old.theme;S.diff=old.diff;S.seenVer=old.seenVer;S.country=old.country||'nl';
  S.cash+=500*perk('head');
  for(let i=0;i<perk('keys');i++)vaultAdd(S,1);
  refreshOffers();newTrend();lastHTML='';
  log('You started over in the hok.','amber');
}
