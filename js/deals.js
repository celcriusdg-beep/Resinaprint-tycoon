/* Big deals (4.13): named clients order several figures at once with a deadline. Deliver in parts as stock comes in.
   Completing one pays a lump sum, a chest and a permanent demand bonus, and raises your supplier rank. Missing one only costs reputation. */
const DEAL_MIN_LV=5,DEAL_MAX=2;
const DEAL_CLIENTS=[
  ['Meeple & Co','board-game publisher','#e8b34b'],['Kawaii Con','anime convention','#ff7fa8'],['Toyland','toy store chain','#5aa6ff'],
  ['Rijks Museumshop','museum gift shop','#cfc7b6'],['Dice & Brew','tabletop café chain','#ff8a5c'],['StreamBox Studios','film studio','#9d89ff'],
  ['Polar Wolves','esports team','#7ff3ff'],['Grimdark Games','miniature wargame studio','#c94a4a'],['Lumen Weddings','wedding planner','#f3e7c4'],
  ['Pixel Arcade','retro gaming bar','#5bd6a6'],['Novaland','theme park','#ffb547'],['Hero Academy','comic book store','#6b8cff'],
  ['Atelier Noir','luxury design label','#d9d9d9'],['Kraken Records','music label','#3fc1c9'],['CampusCo','university merch shop','#a3d977'],['Moonlit Fair','fantasy festival','#b98cff']
];
const DEAL_FLAVOUR=['for their launch','for a giveaway','for a limited edition box','for a fan event','for their shop windows','for a VIP gift pack','for a season opening','for a charity auction'];
const dealsOf=()=>S.deals||(S.deals={board:[],active:[],done:0,failed:0,next:0,bonus:0});
const dealRank=()=>Math.min(5,1+Math.floor(dealsOf().done/3));
const DEAL_RANKS=['','Local supplier','Trusted supplier','Preferred partner','Strategic partner','Legendary maker'];
const dealsOpen=()=>(S.lv||1)>=DEAL_MIN_LV;
const dealBonus=()=>Math.min(.25,.01*dealsOf().bonus);
function dealLeft(d,k){const it=d.items.find(x=>x.p===k);return it?Math.max(0,it.qty-it.got):0}
function dealLeftAll(k){return dealsOf().active.reduce((a,d)=>a+dealLeft(d,k),0)}
function newDeal(){
  const ks=PKEYS.filter(k=>makeable(k)&&!PRODUCTS[k].royalty&&!(PRODUCTS[k].inj0??PRODUCTS[k].inj));if(!ks.length)return null;
  const R=dealRank(),n=Math.min(ks.length,1+Math.floor(Math.random()*Math.min(3,1+R/2))),pick=ks.slice().sort(()=>Math.random()-.5).slice(0,n);
  const scale=(1+S.sold/400)*(0.7+R*.35);
  const items=pick.map(k=>{const P=PRODUCTS[k],base=Math.max(4,Math.round((24/Math.max(.5,P.size||1))*scale*(0.6+Math.random()*.8)));return{p:k,qty:Math.min(600,base),got:0}});
  const worth=items.reduce((a,it)=>a+it.qty*(S.prices[it.p]||PRODUCTS[it.p].ref),0);
  const c=DEAL_CLIENTS[Math.floor(Math.random()*DEAL_CLIENTS.length)];
  const days=Math.max(3,Math.round(3+items.reduce((a,it)=>a+it.qty*PRODUCTS[it.p].h,0)/Math.max(1,S.printers.length*20)));
  return{id:nid(),client:c[0],what:c[1],col:c[2],why:DEAL_FLAVOUR[Math.floor(Math.random()*DEAL_FLAVOUR.length)],items,days:Math.min(14,days),
    pay:Math.round(worth*(1.35+R*.08+Math.random()*.25)/10)*10,chest:Math.max(3,S.lv+R*2),auto:false};
}
function dealsRefresh(force){
  const D=dealsOf();if(!dealsOpen())return;
  if(force||S.day>=D.next||!D.board.length){D.board=[];for(let i=0;i<3;i++){const d=newDeal();if(d)D.board.push(d)}D.next=S.day+3}
}
function dealDeliver(d,quiet){
  let moved=0;
  for(const it of d.items){const free=Math.max(0,S.stock[it.p]-reserved(it.p)),n=Math.min(free,it.qty-it.got);if(n>0){S.stock[it.p]-=n;it.got+=n;moved+=n}}
  if(d.items.every(it=>it.got>=it.qty))dealComplete(d);
  else if(moved&&!quiet)toast(`Delivered ${moved} to ${d.client}`);
  return moved;
}
function dealComplete(d){
  const D=dealsOf();D.active=D.active.filter(x=>x!==d);D.done++;D.bonus++;
  const n=d.items.reduce((a,it)=>a+it.qty,0);
  earn('Contracts',d.pay);S.revenue+=d.pay;S.sold+=n;S.contractsDone++;addXp(n*2+40);vaultAdd(S,d.chest);S.rating=Math.min(5,S.rating+.05);
  log(`Big deal done: ${d.client} paid ${fmt(d.pay)} plus a chest. Permanent demand +1%.`,'good');
  if(!awayMode&&!simulating){confetti(90);snd('cash')}
  if(dealRank()>Math.min(5,1+Math.floor((D.done-1)/3)))log(`New supplier rank: ${DEAL_RANKS[dealRank()]}. Bigger deals are coming.`,'amber');
}
function dealsDay(){
  const D=dealsOf();if(!dealsOpen())return;
  for(const d of [...D.active])if(S.day>d.due){D.active=D.active.filter(x=>x!==d);D.failed++;S.rating=Math.max(1,S.rating-.15);S.hype=Math.max(2,S.hype-10);
    const got=d.items.reduce((a,it)=>a+it.got,0),tot=d.items.reduce((a,it)=>a+it.qty,0),part=Math.round(d.pay*.5*got/tot/10)*10;
    if(part>0)earn('Contracts',part);log(`You missed the deadline for ${d.client}. They paid ${fmt(part)} for what arrived. Rating and hype dropped.`,'bad')}
  dealsRefresh(false);
}
/* hooks: production plans for deals, auto-delivery every hour, demand bonus, daily refresh */
const _need6=need;need=function(k){return _need6(k)+dealLeftAll(k)};
const _dem6=demand;demand=function(k){return _dem6(k)*(1+dealBonus())};
const _hs6=hourStep;hourStep=function(){_hs6();if(S.over||!S.deals)return;for(const d of [...dealsOf().active])if(d.auto||S.staff.some(s=>s.role==='salesrep'))dealDeliver(d,true)};
const _eod6=endOfDay;endOfDay=function(){_eod6();dealsDay()};
Object.assign(A,{
  dealTake(d){const D=dealsOf();if(D.active.length>=DEAL_MAX)return toast(`You can run ${DEAL_MAX} big deals at once`);const x=D.board.find(y=>y.id==d.id);if(!x)return;
    D.board=D.board.filter(y=>y!==x);x.due=S.day+x.days;D.active.push(x);log(`Signed a big deal with ${x.client}. Due in ${x.days} days.`,'amber');snd('buy')},
  dealGive(d){const x=dealsOf().active.find(y=>y.id==d.id);if(!x)return;if(!dealDeliver(x))toast('No free stock for this deal yet')},
  dealAuto(d){const x=dealsOf().active.find(y=>y.id==d.id);if(!x)return;x.auto=!x.auto;toast(x.auto?'Auto-deliver on':'Auto-deliver off');if(x.auto)dealDeliver(x,true)},
  dealDrop(d){const x=dealsOf().active.find(y=>y.id==d.id);if(!x)return;confirmBox('Walk away from this deal?','You keep what was paid for nothing. Rating and hype drop as if you missed it.',()=>{const D=dealsOf();D.active=D.active.filter(y=>y!==x);D.failed++;S.rating=Math.max(1,S.rating-.15);S.hype=Math.max(2,S.hype-10);log(`You walked away from ${x.client}.`,'bad')})},
  dealReroll(){const c=Math.round(200+value(S)*.001);if(S.cash<c)return toast('Not enough cash');spend('Marketing',c);dealsRefresh(true);toast('New clients on the board')}
});
function dealItems(d,active){
  return `<div class="dl-items">${d.items.map(it=>{const pct=Math.round(100*it.got/it.qty),free=Math.max(0,S.stock[it.p]-reserved(it.p));
    return `<div class="dl-it"><span class="dl-art">${prodArt(it.p)}</span><div class="grow"><div class="dl-n">${PRODUCTS[it.p].short||PRODUCTS[it.p].name}</div>${active?`<div class="bar"><i style="width:${pct}%"></i></div>`:''}</div><b class="num">${active?`${it.got}/${it.qty}`:'×'+it.qty}</b>${active&&it.got<it.qty?`<small class="${free?'ok':''}">${free} ready</small>`:''}</div>`}).join('')}</div>`;
}
function dealCard(d,active){
  const left=active?d.due-S.day:d.days;
  return `<div class="card deal ${active?'on':''}" style="--c:${d.col}"><div class="dl-h"><span class="dl-logo">${d.client[0]}</span><div class="grow"><div class="t">${d.client}</div><div class="s">${d.what} · ${d.why}</div></div><span class="chip ${active&&left<=1?'bad':''}">${active?(left<=0?'due today':left+' d left'):left+' days'}</span></div>
    ${dealItems(d,active)}
    <div class="dl-r"><span><b>${fmt(d.pay)}</b> on delivery</span><span>Chest Lv ${d.chest}</span><span>+1% demand forever</span></div>
    <div class="acts">${active?`<button class="btn sm primary" data-a="dealGive" data-id="${d.id}">Deliver what is ready</button><button class="btn sm ${d.auto?'primary':''}" data-a="dealAuto" data-id="${d.id}">Auto ${d.auto?'on':'off'}</button><button class="btn sm ghost" data-a="dealDrop" data-id="${d.id}">Drop</button>`:`<button class="btn sm primary" data-a="dealTake" data-id="${d.id}" ${dealsOf().active.length>=DEAL_MAX?'disabled':''}>Sign the deal</button>`}</div></div>`;
}
function dealsView(){
  if(!dealsOpen())return label('Big deals','locked')+`<div class="card"><div class="s">Big clients start calling at level ${DEAL_MIN_LV}. Keep selling to get noticed.</div></div>`;
  dealsRefresh(false);const D=dealsOf(),R=dealRank();
  let h=`<div class="card dealrank"><div class="dl-h"><div class="grow"><div class="kicker">Supplier rank ${R} of 5</div><div class="t">${DEAL_RANKS[R]}</div><div class="s">${D.done} deals done${D.failed?` · ${D.failed} missed`:''} · demand +${Math.round(dealBonus()*100)}% from clients</div></div></div>${R<5?`<div class="bar" style="margin-top:10px"><i style="width:${(D.done%3)/3*100}%"></i></div><div class="s" style="margin-top:6px">${3-D.done%3} more to the next rank: bigger orders, bigger pay.</div>`:''}</div>`;
  h+=label('Active deals',`${D.active.length} of ${DEAL_MAX} · your printers plan for them`);
  h+=D.active.length?D.active.map(d=>dealCard(d,true)).join(''):`<div class="card"><div class="s">No active deals. Sign one from the board below. Stock goes in as it is finished, and a sales rep or Auto delivers it for you.</div></div>`;
  h+=label('Deal board',`new clients in ${Math.max(0,D.next-S.day)} d`)+D.board.map(d=>dealCard(d,false)).join('');
  h+=`<div class="opts"><button class="btn sm" data-a="dealReroll">Find other clients · ${fmt(Math.round(200+value(S)*.001))}</button></div>`;
  return h;
}
