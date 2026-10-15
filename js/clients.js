/* Clients (4.21): custom commissions and the collector club.
   Commissions: a customer asks for a one-off piece. You print the base model, a painter (or you) paints it to the brief, you deliver before the deadline.
   Collector club: monthly mystery boxes. Members pay on box day, but every box needs real stock. */
const COM_WHO=['Mila (D&D group)','Tom, tabletop gamer','Sanne from Utrecht','A metal band','Jasper, cosplayer','Noor (VTuber)','A wedding couple','Daan, retro collector','Escape room studio','Lotte, comic artist','A game studio','Grandpa Henk','Yuki from Rotterdam','A tattoo shop','Ravi, streamer'];
const COM_WHAT=['my D&D paladin','our band mascot','a dragon for my son\'s birthday','my cat as a samurai','a cake topper of the two of us','the hero of my webcomic','my tabletop army general','my VTuber avatar','a retro robot','a mermaid queen','our company mascot','a knight on a horse','my original character','a fox spirit','a cyberpunk biker'];
const COM_HOW=['gold armour and a stone base','glowing eyes','battle damage and dirt','a cherry blossom base','soft pastel colours','a chrome finish','fire effects','a night-sky cape','freehand tattoos','a snowy base'];
const COM_TIER=[{n:'Standard',pay:1,hrs:1,need:0},{n:'Premium',pay:1.6,hrs:1.8,need:1},{n:'Masterpiece',pay:2.7,hrs:3,need:2}];
const comOf=()=>S.com||(S.com={board:[],act:[],done:0,stars:[],next:0});
const comOpen=()=>S.sold>=25;
const paintLvl=()=>typeof paintEq==='function'?paintEq():0;
function comNew(){
  const ks=PKEYS.filter(k=>makeable(k)&&!PRODUCTS[k].royalty);if(!ks.length)return;
  const k=pick(ks),P=PRODUCTS[k],days=Math.max(4,Math.round(3+P.effort*2+r(0,3)));
  comOf().board.push({id:nid(),who:pick(COM_WHO),what:pick(COM_WHAT),how:pick(COM_HOW),p:k,base:Math.round(P.ref*r(2.4,4.2)/5)*5,days,exp:S.day+3});
}
function comPainters(){return S.staff.filter(s=>s.role==='painter')}
function comQual(c){const best=Math.max(1,...comPainters().map(s=>s.lvl||1));return clamp(2.7+best*.32+c.t*.25+(typeof paintEq==='function'?paintEq()*.1:0)+r(-.45,.45),1,5)}
function comDeliver(c){
  const C=comOf();C.act=C.act.filter(x=>x!==c);
  const q=comQual(c),late=S.day>c.due,pay=Math.round(c.pay*(late?.6:1)*(q>=4.5?1.2:1));
  earn('Commissions',pay);S.revenue+=pay;C.done++;C.stars.unshift(+q.toFixed(1));C.stars=C.stars.slice(0,20);
  review(late?Math.min(q,3.2):q);S.hype+=q>=4.5?4:1;addXp(40+c.t*40);
  log(`Commission delivered to ${c.who}: ${fmt(pay)}${q>=4.5?' with a tip':''}. ${'★'.repeat(Math.round(q))} ${late?'(late)':''}`,late?'amber':'good');
  if(!awayMode&&!simulating){toast(`${c.who} loved it: +${fmt(pay)}`);if(typeof snd==='function')snd('cash');if(q>=4.5&&typeof confetti==='function')confetti(40)}
}
function comTick(){
  if(!comOpen())return;const C=comOf();
  C.board=C.board.filter(b=>b.exp>=S.day);
  if(S.day>=C.next&&C.board.length<3){comNew();C.next=S.day+(S.up.vip?1:2)}
  for(const c of [...C.act]){
    if(c.stage==='print'&&freeStock(c.p)>0){S.stock[c.p]--;c.stage='paint';log(`The base print for ${c.who} is ready. Painting starts.`,'')}
    if(S.day>c.due+4){C.act=C.act.filter(x=>x!==c);review(1.5);S.hype=Math.max(0,S.hype-5);log(`${c.who} cancelled the commission: it was far too late.`,'bad')}
  }
}
const _hsC=hourStep;hourStep=function(){_hsC();if(S.over)return;if(S.hour===9||S.hour===15)comTick();else{const C=S.com;if(C)for(const c of C.act)if(c.stage==='print'&&freeStock(c.p)>0){S.stock[c.p]--;c.stage='paint'}}};
/* painters pick up commission work first */
const _stC=staffTask;staffTask=function(s){
  if(s.role==='painter'&&S.com){const c=S.com.act.find(x=>x.stage==='paint');
    if(c){const h=Math.min(1,c.left);c.left-=h*skill(s)*(s.trait==='efficient'?1.2:1);if(c.left<=0)comDeliver(c);return{h,act:`Painting ${c.what} for ${c.who}`}}}
  return _stC(s);
};
const _needC=need;need=function(k){const C=S.com;return _needC(k)+(C?C.act.filter(c=>c.stage==='print'&&c.p===k).length:0)+(typeof clubNeed==='function'?clubNeed(k):0)};
Object.assign(A,{
  comTake(d){const C=comOf(),b=C.board.find(x=>x.id==d.id),t=+d.t;if(!b)return;
    if(C.act.length>=3)return toast('You can work on 3 commissions at a time');
    if(paintLvl()<COM_TIER[t].need)return toast(`${COM_TIER[t].n} needs the ${t===1?'airbrush booth':'competition bench'} (Team › Paint studio)`);
    C.board=C.board.filter(x=>x!==b);const P=PRODUCTS[b.p];
    C.act.push({...b,t,pay:Math.round(b.base*COM_TIER[t].pay),left:Math.max(2,P.effort*4*COM_TIER[t].hrs),total:Math.max(2,P.effort*4*COM_TIER[t].hrs),due:S.day+b.days,stage:'print'});
    if(freeStock(b.p)>0){S.stock[b.p]--;C.act.at(-1).stage='paint'}
    toast(`Accepted: ${b.what}`);if(typeof snd==='function')snd('buy')},
  comSkip(d){const C=comOf();C.board=C.board.filter(x=>x.id!=d.id)},
  comWork(d){const c=comOf().act.find(x=>x.id==d.id);if(!c||c.stage!=='paint')return;if(!useE(6))return;c.left-=1.2;did('Commission painting');if(c.left<=0)comDeliver(c);else toast('You painted for an hour')}
});
function comView(){
  if(!comOpen())return `<div class="card cm-lock"><div class="t">Commissions</div><div class="s">Customers start asking for custom pieces once you have sold 25 figures (${S.sold} so far).</div></div>`;
  const C=comOf(),avg=C.stars.length?C.stars.reduce((a,b)=>a+b,0)/C.stars.length:0;
  let h=`<div class="cm-sum"><div><b>${C.done}</b><span>delivered</span></div><div><b>${avg?avg.toFixed(1)+'★':'—'}</b><span>average</span></div><div><b>${C.act.length}/3</b><span>in progress</span></div><div><b>${comPainters().length}</b><span>painters</span></div></div>`;
  h+=label('In progress',C.act.length?'painters work on these first':'');
  h+=C.act.length?C.act.map(c=>{const pct=c.stage==='paint'?100*(1-c.left/c.total):0,dl=c.due-S.day;
    return `<div class="card cm-job ${dl<0?'late':''}"><div class="cm-h">${artBox(prodArt(c.p),'cm-art','',['f',c.p])}<div class="grow"><div class="t">${c.what}</div><div class="s">${c.who} · ${COM_TIER[c.t].n} · ${c.how}</div></div><b class="num">${fmt(c.pay)}</b></div>
      <div class="cm-steps"><span class="${c.stage==='print'?'cur':'ok'}">1 Print the base</span><span class="${c.stage==='paint'?'cur':''}">2 Paint it</span><span>3 Deliver</span></div>
      ${c.stage==='print'?`<div class="s">Needs 1 × ${PRODUCTS[c.p].name}. Your technicians print it next.</div>`:`<div class="bar"><i style="width:${pct}%"></i></div>`}
      <div class="cm-f"><span class="chip ${dl<0?'bad':dl<=1?'amber':''}">${dl<0?`${-dl} d late`:dl===0?'due today':`due in ${dl} d`}</span>${c.stage==='paint'?`<button class="btn sm" data-a="comWork" data-id="${c.id}">Paint 1 h yourself ⚡6</button>`:''}</div></div>`}).join(''):`<div class="card"><div class="s">Nothing in progress. Pick a request below.</div></div>`;
  h+=label('Requests',`${C.board.length} waiting · new ones every ${S.up.vip?1:2} days`);
  h+=C.board.length?C.board.map(b=>`<div class="card cm-req"><div class="cm-h">${artBox(prodArt(b.p),'cm-art','',['f',b.p])}<div class="grow"><div class="cm-q">“Can you make ${b.what}, with ${b.how}?”</div><div class="s">${b.who} · based on ${PRODUCTS[b.p].name.toLowerCase()} · ${b.days} days</div></div></div>
    <div class="cm-tiers">${COM_TIER.map((T,t)=>`<button class="btn sm ${t?'':'primary'}" data-a="comTake" data-id="${b.id}" data-t="${t}" ${paintLvl()<T.need||C.act.length>=3?'disabled':''}><b>${T.n}</b><small>${fmt(Math.round(b.base*T.pay))}</small></button>`).join('')}</div>
    <div class="cm-f"><span class="s">Offer ends in ${Math.max(0,b.exp-S.day)} d</span><button class="btn sm ghost" data-a="comSkip" data-id="${b.id}">Decline</button></div></div>`).join(''):`<div class="card"><div class="s">No requests right now. More arrive soon.</div></div>`;
  h+=`<div class="s cat-help">Premium and Masterpiece pay more and take longer. They need the airbrush booth or competition bench from Team › Paint studio. Better painters give better stars, and 4.5★ or more earns a 20% tip.</div>`;
  return h;
}
/* ---------- collector club ---------- */
const CLUB_T=[{n:'Starter box',n2:1,min:0,price:29,col:'#9fd3ff'},{n:'Collector box',n2:2,min:30,price:59,col:'#c79bff'},{n:'Grail box',n2:1,min:150,price:149,col:'#ffc861'}];
const clubOf=()=>S.club||(S.club={open:0,m:[0,0,0],price:CLUB_T.map(t=>t.price),pick:[null,null,null],next:0,boxes:0,hist:[]});
const clubOpenable=()=>S.sold>=120;
const clubOk=(t,k)=>k&&unlocked(k)&&PRODUCTS[k].ref>=CLUB_T[t].min;
function clubPick(t){const C=clubOf();if(clubOk(t,C.pick[t]))return C.pick[t];return PKEYS.filter(k=>clubOk(t,k)&&S.listed[k]).sort((a,b)=>S.stock[b]-S.stock[a])[0]||null}
const clubVal=t=>{const k=clubPick(t);return k?PRODUCTS[k].ref*CLUB_T[t].n2:0};
const clubMembers=()=>clubOf().m.reduce((a,b)=>a+Math.floor(b),0);
function clubNeed(k){const C=S.club;if(!C||!C.open||C.next-S.day>7)return 0;let n=0;CLUB_T.forEach((T,t)=>{if(clubPick(t)===k)n+=Math.floor(C.m[t])*T.n2});return n}
function clubDay(){
  const C=clubOf();if(!C.open)return;
  CLUB_T.forEach((T,t)=>{const v=clubVal(t),p=C.price[t];if(!v){C.m[t]*=.97;return}
    const join=Math.max(0,(S.rating-3.2)*.8+S.hype*.02)*Math.pow(v/p,1.6)*[.5,.22,.08][t]*(1+Math.log10(1+S.sold)/3);
    const churn=.006+(p>v*1.1?.02*(p/v-1):0);
    C.m[t]=Math.max(0,C.m[t]*(1-churn)+join*r(.6,1.4))});
  if(S.day>=C.next)clubShip();
}
function clubShip(){
  const C=clubOf();let paid=0,miss=0,boxes=0;
  CLUB_T.forEach((T,t)=>{const n=Math.floor(C.m[t]);if(!n)return;let k=clubPick(t),sent=0;
    for(let i=0;i<n;i++){let ok=true;for(let j=0;j<T.n2;j++){if(!k||S.stock[k]<=0)k=PKEYS.filter(x=>clubOk(t,x)&&S.stock[x]>0).sort((a,b)=>S.stock[b]-S.stock[a])[0];if(!k){ok=false;break}S.stock[k]--;S.sold++;regSale&&regSale(k)}
      if(ok){sent++;paid+=C.price[t]}else{miss++}}
    boxes+=sent;if(n>sent)C.m[t]=Math.max(0,C.m[t]-(n-sent)*.5)});
  if(paid){earn('Collector club',paid);S.revenue+=paid;spend('Shipping',boxes*5.5)}
  C.boxes+=boxes;C.next=S.day+28;C.hist.unshift({d:S.day,b:boxes,m:miss,a:paid});C.hist=C.hist.slice(0,8);
  if(miss){for(let i=0;i<Math.min(5,miss);i++)review(2.2);log(`Box day: ${boxes} boxes shipped for ${fmt(paid)}, but ${miss} members got nothing and half of them left.`,'bad')}
  else if(boxes){review(4.8);S.hype+=Math.min(15,boxes*.3);log(`Box day: ${boxes} collector boxes shipped. ${fmt(paid)} in membership fees.`,'good')}
  if(!awayMode&&!simulating&&boxes){if(typeof snd==='function')snd('cash');if(typeof confetti==='function')confetti(50)}
}
const _eodC=endOfDay;endOfDay=function(){_eodC();if(S.club&&S.club.open)clubDay()};
Object.assign(A,{
  clubToggle(){const C=clubOf();if(!clubOpenable())return;C.open=C.open?0:1;if(C.open&&!C.next)C.next=S.day+28;toast(C.open?'The collector club is open':'The club takes no new members');if(!C.open)C.m=C.m.map(x=>x*.5)},
  clubPrice(d){const C=clubOf(),t=+d.t;C.price[t]=Math.max(5,Math.round(C.price[t]+(+d.d)*(C.price[t]>=100?10:5)))},
  clubCycle(d){const C=clubOf(),t=+d.t,ks=PKEYS.filter(k=>clubOk(t,k));if(!ks.length)return;const i=ks.indexOf(clubPick(t));C.pick[t]=ks[(i+1)%ks.length]}
});
function clubView(){
  if(!clubOpenable())return `<div class="card cm-lock"><div class="t">Collector club</div><div class="s">Fans can subscribe to monthly mystery boxes once you have sold 120 figures (${S.sold} so far).</div></div>`;
  const C=clubOf(),mem=clubMembers(),dl=C.next?C.next-S.day:28;
  const income=CLUB_T.reduce((a,T,t)=>a+Math.floor(C.m[t])*C.price[t],0);
  let h=`<div class="card club-hero ${C.open?'on':''}"><div class="club-box">${['#9fd3ff','#c79bff','#ffc861'].map((c,i)=>`<i style="--c:${c};--i:${i}"></i>`).join('')}</div><div class="grow"><div class="t">Collector club ${C.open?'<span class="chip good">Open</span>':'<span class="chip">Closed</span>'}</div>
    <div class="s">${mem} member${mem===1?'':'s'} · next box day in ${Math.max(0,dl)} d · about ${fmt(income)} per box day</div></div><button class="btn sm ${C.open?'ghost':'primary'}" data-a="clubToggle">${C.open?'Close':'Open club'}</button></div>`;
  h+=label('Boxes','members pay on box day, every 28 days');
  h+=CLUB_T.map((T,t)=>{const k=clubPick(t),n=Math.floor(C.m[t]),need=n*T.n2,have=k?S.stock[k]:0,v=clubVal(t);
    return `<div class="card club-t" style="--c:${T.col}"><div class="cm-h"><div class="club-ico"><i></i></div><div class="grow"><div class="t">${T.n} <span class="chip">${n} members</span></div><div class="s">${T.n2} figure${T.n2>1?'s':''}${T.min?`, worth €${T.min}+ each`:''} · value ${fmt(v)}</div></div>
      <div class="stepper"><button class="btn sm" data-a="clubPrice" data-t="${t}" data-d="-1">−</button><b>${fmt(C.price[t])}</b><button class="btn sm" data-a="clubPrice" data-t="${t}" data-d="1">+</button></div></div>
      <div class="club-pick">${k?`${artBox(prodArt(k),'cm-art','',['f',k])}<div class="grow"><div class="t">${PRODUCTS[k].name}</div><div class="s ${C.open&&have<need?'bad':''}">${need?`Needs ${need} for box day, ${have} in stock`:'In this month\'s box'}</div></div>`:`<div class="grow s">No product qualifies yet.</div>`}<button class="btn sm" data-a="clubCycle" data-t="${t}">Change</button></div>
      ${C.price[t]>v*1.1&&v?`<div class="s bad" style="margin-top:6px">Priced above the box value: members leave faster.</div>`:''}</div>`}).join('');
  if(C.hist.length)h+=label('Past box days')+`<div class="group">${C.hist.map(x=>item(`Day ${x.d}: ${x.b} boxes`,`${fmt(x.a)} in fees${x.m?` · ${x.m} missed`:''}`)).join('')}</div>`;
  h+=`<div class="s cat-help">Members join faster with good stars, hype and a box worth more than its price. Technicians start printing for box day a week ahead. Any box you cannot fill costs reviews and members.</div>`;
  return h;
}
