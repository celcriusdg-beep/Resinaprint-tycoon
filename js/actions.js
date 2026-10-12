/* Player actions and UI plumbing (toast, modals, intro, game over, away report). */
/* ---------- actions ---------- */
const LOANS={small:{name:'Small business loan',amt:5000,n:26,rate:.0015},mid:{name:'Business loan',amt:25000,n:52,rate:.0012},big:{name:'Expansion loan',amt:100000,n:104,rate:.001},inv:{name:'Investor round',amt:120000,pct:.12,n:78,bv:1,minValue:200000,desc:'€120.000 now for 12% of your weekly profit for 78 weeks'}};
const mouldCost=k=>Math.round(PRODUCTS[k].ref*60/10)*10;
const moveLock=i=>{const W=SPACES[i];if(W.kvk&&!S.biz.kvk)return 'Register at the KvK first';if(W.permit&&!S.biz.perm[W.permit])return `Needs the ${PERMITS[W.permit].name}`;return ''};
const printerLock=D=>S.ws<D.ws?`Needs a ${SPACES[D.ws].name.toLowerCase()}`:D.req&&!S.up[D.req]?`Needs the ${UPGRADES.find(u=>u.id===D.req).name.toLowerCase()}`:'';
const needKvk=()=>{if(S.biz.kvk)return false;toast('Register at the KvK first (Empire › Company)');return true};
const A={
  wait(){wait2()},
  pause(){S.paused=!S.paused;S.lastT=Date.now();toast(S.paused?'Paused':'Running')},
  train(d){const s=S.staff.find(x=>x.id==d.id);if(!s||(s.lvl||1)>=5)return;const c=150*(s.lvl||1);if(S.cash<c)return toast('Not enough cash');spend('Training',c);s.xp=XPN[(s.lvl||1)-1];levelUp(s);s.mood=clamp(s.mood-4,0,100);toast(`${s.name} completed a course`)},
  printerMain(d){const p=S.printers.find(x=>x.id==d.id);const D=PRINTERS[p.type];
    if(p.state==='failed'){if(useE(E.clean())){clean(p);did('Failed prints cleaned');toast('Cleaned')}return}
    if(p.state==='done'){if(!useE(E.collect()))return;collect(p);did('Plates collected');if(S.energy>=E.start()&&startJob(p,true)){S.energy-=E.start();did('Prints started');toast('Collected, next print started')}else toast('Collected');return}
    if(p.state==='idle'){if(!D.form&&p.vat<jobMl(p)&&(S.resin[p.resin]||0)>0){if(useE(E.refill())&&refill(p)){did('Vats refilled');toast('Vat refilled')}return}
      if(S.energy<E.start())return toast('You are too tired. Energy refills by itself, or hire help');if(startJob(p)){S.energy-=E.start();did('Prints started')}}},
  service(d){const p=S.printers.find(x=>x.id==d.id);if(p.state==='printing')return toast('Wait until the print is done');if(S.cash<serviceFee(p))return toast('Not enough cash');if(useE(E.service())){service(p);did('Printers serviced');toast(`${wearNew(PRINTERS[p.type])} fitted`)}},
  sellPrinter(d){const p=S.printers.find(x=>x.id==d.id);const v=PRINTERS[p.type].cost*.5*p.cond/100;confirmBox(`Sell ${short(p)}?`,`You get ${fmt(v)} back. Resin in the vat goes back to stock.`,()=>{earn('Printer sales',v);if(!PRINTERS[p.type].form)S.resin[p.resin]=(S.resin[p.resin]||0)+p.vat;S.printers=S.printers.filter(x=>x!==p)})},
  wash(){if(!totUnwashed())return;if(!useE(washE()))return;did('Batches washed');toast(`Washed and cured ${wash()} prints`)},
  finish(){const k=nextFinish();if(!k)return;if(!useE(finishE(k)))return;finishOne(k);did('Figures finished');toast(`${PRODUCTS[k].name} finished`)},
  pack(){if(packableIdx()<0)return;if(useE(E.pack())&&packOne()){did('Orders packed');toast('Order shipped')}},
  packAll(){let n=0;while(packableIdx()>=0&&S.energy>=E.pack()){S.energy-=E.pack();packOne();n++}if(n)did('Orders packed',n);toast(n?`Shipped ${n} orders`:'You are too tired')},
  drink(){if(S.drinks>=2+upv('dr'))return toast('That is enough coffee for today');if(S.cash<4)return toast('Not enough cash');spend('Energy drinks',4);S.drinks++;S.energy=Math.min(maxE()+40,S.energy+30);toast('+30 energy')},
  price(d){S.prices[d.k]=Math.max(1,Math.round(S.prices[d.k]*(d.d>0?1.1:1/1.1)))},
  pre(d){const P=S.pre[d.k]||(S.pre[d.k]={on:false,cap:5,ltd:false});P.on=!P.on;if(!P.on)P.ltd=false;toast(P.on?`Pre-orders open (max ${P.cap})`:'Pre-orders closed')},
  limited(d){const P=S.pre[d.k]||(S.pre[d.k]={on:false,cap:10,ltd:false});if(P.ltd){P.ltd=false;P.on=false;return toast('Limited run cancelled')}P.ltd=true;P.on=true;if(P.cap<5)P.cap=10;toast(`Limited run: ${P.cap} figures`)},
  preCap(d){const P=S.pre[d.k]||(S.pre[d.k]={on:false,cap:5,ltd:false});const st=P.cap>=20?5:1;P.cap=clamp(P.cap+d.d*st,1,200)},
  list(d){if(S.listed[d.k]){S.listed[d.k]=false;S.offers=S.offers.filter(o=>o.p!==d.k);return}
  if(!makeable(d.k))return toast(`Needs a ${TIERS[PRODUCTS[d.k].tier].toLowerCase()} printer`);S.listed[d.k]=!S.listed[d.k]},
  dm(d){answerDM(d.id,+d.i)},
  accept(d){if(S.contracts.length>=4)return toast('You can run 4 contracts at once');const o=S.offers.find(x=>x.id==d.id);if(o)acceptOffer(o)},
  deliver(d){const c=S.contracts.find(x=>x.id==d.id);if(!c)return;if(S.stock[c.p]<c.qty)return toast('Not enough finished stock');if(!useE(E.deliver()))return;deliverContract(c);did('Contracts delivered');toast(c.pay?`+${fmt(c.pay)}`:'Delivered')},
  buyPrinter(d){const D=PRINTERS[d.k];if(S.printers.length>=space().printers)return toast('No room. Move to a bigger space or add shelving');const lk=printerLock(D);if(lk)return toast(lk);if(S.cash<D.cost)return toast('Not enough cash');spend('Printers',D.cost);addPrinter(d.k);log(`Bought a ${D.name}.`);toast(`${D.name} installed${D.form?'':'. Fill its vat in the Studio'}`)},
  resin(d){const n=+d.n,c=resinPrice(d.k)*(n===5?4.5:1);if(S.cash<c)return toast('Not enough cash');spend('Resin',c);S.resin[d.k]=(S.resin[d.k]||0)+(RESINS[d.k].vol||1000)*n;toast(`+${n} × ${RESINS[d.k].name}`)},
  washer(d){const W=WASHERS[d.k];if(S.cash<W.cost)return toast('Not enough cash');spend('Equipment',W.cost);S.washer=d.k;log(`New wash & cure setup: ${W.name}.`);toast('Installed')},
  mould(d){const c=mouldCost(d.k);if(S.moulds[d.k])return;if(S.cash<c)return toast('Not enough cash');spend('Moulds',c);S.moulds[d.k]=true;log(`Bought a steel mould for the ${PRODUCTS[d.k].name.toLowerCase()}.`,'good');toast('Mould ready')},
  move(d){const i=+d.k,W=SPACES[i],lk=moveLock(i);if(lk)return toast(lk);confirmBox(`Move to ${W.name.toLowerCase()}?`,`Costs ${fmt(W.cost)} to set up. Rent becomes ${fmt(W.rent)} a week.`,()=>{if(S.cash<W.cost)return toast('Not enough cash');spend('Moving',W.cost);S.ws=i;log(`Moved into the ${W.name.toLowerCase()}.`,'good')})},
  hire(d){if(needKvk())return;if(studioStaff().length>=space().staff)return toast('No room. Move to a bigger space');
    const cs=candidates(d.k);
    choice(`Hire a ${ROLES[d.k].name.toLowerCase()}`,'Three people applied. Pick one.',[...cs.map(c=>({l:`${c.name} · ${TRAITS[c.trait].n}${c.lvl>1?' · Lv 2':''} · ${fmt(c.wage)}/day <small>${traitDesc(d.k,c.trait)}</small>`,f:()=>{if(studioStaff().length<space().staff)addStaff(d.k,null,c)}})),{l:'Nobody',f:()=>{}}])},
  fire(d){const s=S.staff.find(x=>x.id==d.id);confirmBox(`Let ${s.name} go?`,'The rest of the team will be a bit shaken.',()=>{S.staff=S.staff.filter(x=>x!==s);S.staff.forEach(x=>x.mood=clamp(x.mood-8,0,100));log(`${s.name} left the team.`)})},
  lunch(){const c=Math.max(15,S.staff.length*15);if(S.cash<c)return toast('Not enough cash');spend('Team lunch',c);S.lunchCd=7;S.staff.forEach(s=>s.mood=clamp(s.mood+20,0,100));toast('Team lunch. Morale up')},
  camp(d){const C=CAMPAIGNS.find(c=>c.id===d.k);if(S.cds[C.id])return;if(C.kvk&&needKvk())return;if(C.minHype&&S.hype<C.minHype)return toast(`Needs ${C.minHype} hype`);if(C.cost&&S.cash<C.cost)return toast('Not enough cash');
    if(C.id==='kick'){const k=contractable('statue')?'statue':contractable('premium')?'premium':null;if(!k)return toast('List a statue or premium figure you are making first');if(S.contracts.length>=4)return toast('You can run 4 contracts at once');
      spend('Marketing',C.cost);const qty=Math.round(15+S.hype/3+r(0,20)),net=Math.round(qty*S.prices[k]*.8*.9);earn('Crowdfunding',net);S.contracts.push({id:nid(),client:'Kickstarter backers',p:k,qty,pay:0,prepaid:true,refund:net,due:S.day+28});S.hype+=C.hype;S.cds.kick=C.cd;log(`Kickstarter funded: ${qty} backers prepaid ${fmt(net)}. Deliver ${qty}× ${PRODUCTS[k].name.toLowerCase()} within 4 weeks.`,'good');toast(`Funded: ${fmt(net)}`);return}
    if(C.needCh&&!S.ch[C.needCh])return toast('Start selling on bol.com first');
    if(C.gift&&!PKEYS.some(k=>S.stock[k]>0))return toast('You need a figure in stock to give away');
    if(C.energy&&!useE(C.energy))return;if(C.cost)spend('Marketing',C.cost);S.hype+=C.hype;S.cds[C.id]=C.cd;did('Campaigns run');
    if(C.fol)for(const k in C.fol)soc(k).f+=C.fol[k];
    if(C.boost)S.boost={m:C.boost.m,until:S.abs+C.boost.days*24};
    if(C.gift){const k=PKEYS.filter(k=>S.stock[k]>0).sort((a,b)=>PRODUCTS[a].ref-PRODUCTS[b].ref)[0];S.stock[k]--;log(`You gave away a ${PRODUCTS[k].name.toLowerCase()}.`,'amber')}
    if(C.sell){const s=sellStock(C.sell);log(`${C.name}: sold ${s} figures.`,'good')}
    if(C.id==='con'){const s=sellStock(25);log(`Con booth: sold ${s} figures in one weekend.`,'good')}else log(`${C.name} is live. Hype +${C.hype}.`,'good');toast(`${C.name} live`)},
  upgrade(d){const U=UPGRADES.find(u=>u.id===d.k);if(S.cash<U.cost)return toast('Not enough cash');spend('Upgrades',U.cost);S.up[U.id]=true;if(U.e)S.energy+=U.e;log(`Upgrade bought: ${U.name}.`,'good');toast(U.name)},
  openStore(d){if(needKvk())return;const D=STORES[d.k];confirmBox(`Open a ${D.name.toLowerCase()}?`,`Costs ${fmt(D.cost)} to fit out. Rent is ${fmt(D.rent)} a week. It only sells on days a clerk or you work there.`,()=>{if(S.cash<D.cost)return toast('Not enough cash');spend('Stores',D.cost);S.stores[d.k]={open:true,level:1,stock:0,merged:false,last:0};log(`Opened the ${D.name.toLowerCase()}. Stock it and staff it.`,'good')})},
  restock(d){const D=STORES[d.k],st=S.stores[d.k],cap=D.capB*st.level,n=Math.min(D.pack,cap-st.stock),c=n*D.unit;if(n<=0)return toast('Shelves are full');if(S.cash<c)return toast('Not enough cash');if(!useE(E.restock()))return;spend('Store stock',c);st.stock+=n;did('Store restocks');toast(`+${n} ${D.item}`)},
  shift(d){if(S.shift[d.k]===S.day)return;if(!useE(E.shift()))return;S.shift[d.k]=S.day;did('Store shifts worked');toast('You run the register today')},
  clerk(d){if(needKvk())return;const st=S.stores[d.k];if(S.staff.filter(s=>s.role==='clerk'&&s.store===d.k).length>=st.level*2)return toast('Upgrade the store for more clerks');addStaff('clerk',d.k)},
  storeUp(d){const D=STORES[d.k],st=S.stores[d.k],c=D.cost*(st.level===1?.4:.8);if(S.cash<c)return toast('Not enough cash');spend('Stores',c);st.level++;log(`${D.name} upgraded to level ${st.level}.`,'good')},
  merge(d){const D=STORES[d.k];confirmBox(`Merge the ${D.name.toLowerCase()}?`,`Costs ${fmt(D.merge)}. ${D.mergeText}`,()=>{if(S.cash<D.merge)return toast('Not enough cash');spend('Stores',D.merge);S.stores[d.k].merged=true;log(`The ${D.name.toLowerCase()} is now part of Resinaprint.`,'good')})},
  tournament(){if(S.cds.tourn)return;if(!useE(20))return;const p=ri(16,40);earn('Tournaments',p*5);S.revenue+=p*5;S.hype+=12;S.cds.tourn=7;did('Tournaments hosted');log(`Hosted a card tournament with ${p} players. Hype +12.`,'good')},
  workshop(){if(S.cds.work)return;const n=Math.min(12,S.stock.chibi);if(n<4)return toast('You need at least 4 chibi keychains in stock');if(!useE(20))return;S.stock.chibi-=n;earn('Workshops',n*25);S.revenue+=n*25;S.hype+=10;S.cds.work=7;did('Workshops hosted');log(`Paint-your-own workshop: ${n} guests, ${fmt(n*25)}.`,'good')},
  /* company */
  kvk(){if(S.biz.kvk)return;if(S.cash<KVK_FEE)return toast('Not enough cash');
    confirmBox('Register at the KvK?',`Costs ${fmt(KVK_FEE)}. You become an eenmanszaak. You can then hire staff, rent a studio, sell to businesses and use marketplaces and business carriers. Income tax applies to your profit.`,()=>{
      spend('Registration',KVK_FEE);const b=S.biz;b.kvk=true;b.form='eenmanszaak';b.qNext=S.day+QUARTER;b.yrNext=S.day+YEAR;b.wkInc=0;b.wkExp=0;refreshOffers();log('Resinaprint is now registered at the KvK.','good');
      choice('Use the KOR?','The kleineondernemersregeling (KOR) means you charge no BTW and file no returns while your yearly revenue stays under €20.000. You also cannot reclaim the BTW on your purchases. Most starters take it.',[{l:'Yes, use the KOR',f:()=>{S.biz.kor=true;log('You joined the KOR: no BTW to charge.','good')}},{l:'No, charge BTW',f:()=>{S.biz.kor=false;log('You charge 21% BTW and reclaim BTW on purchases.','amber')}}])})},
  korLeave(){const b=S.biz;if(!b.kor)return;confirmBox('Leave the KOR?','You will charge 21% BTW on sales and file a return every 4 weeks, but you can reclaim BTW on purchases. You cannot rejoin for a year.',()=>{b.kor=false;b.korCd=YEAR;b.vatOut=0;b.vatIn=0;log('You left the KOR. BTW applies from now.','amber')})},
  korJoin(){const b=S.biz;if(b.kor||!b.kvk)return;if(b.korCd>0)return toast(`You can rejoin in ${b.korCd} days`);if(b.yrRev>KOR_LIMIT)return toast('Your revenue is over the KOR limit');confirmBox('Rejoin the KOR?','You stop charging BTW and lose the right to reclaim BTW on purchases.',()=>{b.kor=true;log('You rejoined the KOR.','good')})},
  bv(){const b=S.biz;if(!b.kvk||b.form==='bv')return;if(S.cash<2800)return toast('Not enough cash');confirmBox('Turn Resinaprint into a BV?','Costs €2.800 for the notary. Company tax is 19% up to about €3.850 profit a week and 25.8% above, instead of up to 37%. It adds €150 a week of accounting (€60 with an accountant) and makes investors possible.',()=>{spend('Notary',2800);b.form='bv';log('Resinaprint is now a BV.','good')})},
  insure(){if(needKvk())return;S.biz.ins=!S.biz.ins;toast(S.biz.ins?'Insured':'Insurance cancelled')},
  permit(d){const P=PERMITS[d.k];if(S.biz.perm[d.k])return;if(needKvk())return;if(S.cash<P.cost)return toast('Not enough cash');spend('Permits',P.cost);S.biz.perm[d.k]=true;log(`You got the ${P.name}.`,'good');toast(P.name)},
  loan(d){const L2=LOANS[d.k];if(needKvk())return;if(S.loans.some(l=>l.key===d.k))return toast('You already have this one');if(L2.bv&&S.biz.form!=='bv')return toast('Investors only invest in a BV');if(value(S)<(L2.minValue||L2.amt*.9))return toast('The bank says no. Your company is worth too little');
    S.loans.push({id:nid(),key:d.k,name:L2.name,bal:L2.pct?0:L2.amt,p0:L2.amt,n0:L2.n,n:L2.n,rate:L2.rate||0,pct:L2.pct||0});earn('Loan',L2.amt);log(`${L2.name}: ${fmt(L2.amt)} in your account.`,'amber');toast(`+${fmt(L2.amt)}`)},
  repay(d){const l=S.loans.find(x=>x.id==d.id);if(!l||l.pct)return;if(S.cash<l.bal)return toast('Not enough cash');spend('Loan repayment',l.bal);S.loans=S.loans.filter(x=>x!==l);log(`${l.name} repaid early.`,'good')},
  vat(){const b=S.biz;if(!b.vatDue)return;const a=b.vatDue.amt;if(a>0&&S.cash<a)return toast('Not enough cash');b.vatDue=null;settleVat(a,false);toast('BTW return filed')},
  carrier(d){const C=CARRIERS[d.k];if(S.car[d.k])return;if(C.kvk&&needKvk())return;if(C.req&&!C.req())return toast(C.reqText);if(S.cash<C.cost)return toast('Not enough cash');if(C.cost)spend('Equipment',C.cost);S.car[d.k]=true;log(`${C.name} is now available for your parcels.`,'good');toast(`${C.name} unlocked`)},
  channel(d){const C=CHANNELS[d.k];if(S.ch[d.k])return;if(C.kvk&&needKvk())return;if(S.cash<C.cost)return toast('Not enough cash');if(C.cost)spend('Marketing',C.cost);S.ch[d.k]=true;log(`You started selling on ${C.name}.`,'good');toast(`${C.name} is live`)},
  sub(d){sub[d.t]=d.k;if(d.t==='empire'&&d.k==='goals')S.unread=0},
  reset(){confirmBox('Start a new company?','Your current save is deleted.',()=>{S=fresh();S.started=true;S.lastT=Date.now();refreshOffers()})}
};
function addStaff(role,store,c){const used=S.staff.map(s=>s.name);const name=(c&&c.name)||pick(NAMES.filter(n=>!used.includes(n)))||'Alex';
  S.staff.push({id:nid(),role,store,name,wage:role==='clerk'?85:(c?c.wage:ROLES[role].wage),mood:80,busy:0,lvl:c?c.lvl:1,xp:c&&c.lvl>1?XPN[c.lvl-2]:0,trait:role==='clerk'?'':(c?c.trait:pick(['quick','careful','efficient'])),cd:0,act:''});
  log(`Hired ${name} as ${role==='clerk'?STORES[store].name.toLowerCase()+' clerk':ROLES[role].name.toLowerCase()}.`,'good');toast(`Welcome, ${name}!`)}
function candidates(role){
  const used=S.staff.map(s=>s.name),pool=NAMES.filter(n=>!used.includes(n)).sort(()=>Math.random()-.5),traits=['quick','careful','efficient'].sort(()=>Math.random()-.5);
  return [0,1,2].map(i=>{const lvl=Math.random()<.3?2:1;return{name:pool[i]||'Alex'+i,lvl,trait:traits[i],wage:Math.round(ROLES[role].wage*(1+.1*(lvl-1))*r(.92,1.1))}});
}

/* ---------- UI plumbing ---------- */
let tab='studio',sub={orders:'queue',buy:'printers',empire:'stores',pg:'0',up:'energy'},pending=[],lastHTML='';
const openPr=new Set();
A.togglePr=d=>{const id=+d.id;openPr.has(id)?openPr.delete(id):openPr.add(id)};
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.opacity=0,1900)}
function modal(html){document.getElementById('modalRoot').innerHTML=`<div class="modal"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;const sh=document.querySelector('.sheet');if(sh)sh.scrollTop=0;const b=document.querySelector('.sheet button:not(:disabled)');b&&b.focus({preventScroll:true})}
const modalOpen=()=>!!document.querySelector('#modalRoot .modal');
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
function choice(title,text,opts){if(simulating){queue.push({title,text,opts});return}pending=opts;modal(`<h3>${title}</h3><p>${text}</p><div class="acts">${opts.map((o,i)=>`<button class="btn ${i===0?'primary':'ghost'}" data-choice="${i}" ${o.ok&&!o.ok()?'disabled':''}>${o.l}</button>`).join('')}</div>`)}
function nextQueued(){if(modalOpen())return;const q=queue.shift();if(q){if(q.patch)showPatch();else choice(q.title,q.text,q.opts)}}
function confirmBox(title,text,f){choice(title,text,[{l:'Confirm',f},{l:'Cancel',f:()=>{}}])}
function intro(){pending=[{f:()=>{S.started=true;S.lastT=Date.now()}}];modal(`<div class="kicker">Resinaprint Tycoon</div><h3>One printer in the hok. Build a figure empire.</h3><p>You start with ${fmt(800)}, an Elegoo Mars and one bottle of resin. Until you hire help, every job is yours:</p><ul><li>Start prints, collect plates, refill the vat</li><li>Wash & cure, then finish every figure</li><li>Pack orders and answer messages</li></ul><p>Time runs live and your printers keep printing while it does, even when you close the app. When you come back you get a report of what happened. Register at the KvK to hire people, and they will run the shop for you. Skipping ahead with <b>+2 h</b> costs a little for electricity and overtime. Rent, wages and taxes are due every 7 days. Below −€1.500 the bank closes your account.</p><div class="acts"><button class="btn primary" data-choice="0">Open the hok</button></div>`)}
function gameOver(){queue=[];pending=[{f:()=>{S=fresh();S.started=true;S.lastT=Date.now();refreshOffers()}}];modal(`<h3>The bank closed your account</h3><p>Resinaprint lasted ${S.day} days, shipped ${S.sold} figures and made ${fmt(S.revenue)} in revenue.</p><div class="acts"><button class="btn primary" data-choice="0">Start again</button></div>`)}

function showAway(h){
  const R2=S.rep;
  const inc=Object.entries(R2.earn).sort((a,b)=>b[1]-a[1]),exp=Object.entries(R2.spend).sort((a,b)=>b[1]-a[1]);
  const ti=inc.reduce((a,x)=>a+x[1],0),te=exp.reduce((a,x)=>a+x[1],0),profit=ti-te;
  const dr=S.rating-R2.rating0,dh=S.hype-R2.hype0;
  const ledger=(rows,sign,total,label)=>rows.length?`<div class="ledger">${rows.map(([k,v])=>`<div><span>${k}</span><span class="num">${sign}${fmt(v)}</span></div>`).join('')}${rows.length>1?`<div class="tot"><span>${label}</span><span class="num">${sign}${fmt(total)}</span></div>`:''}</div>`:`<div class="ledger"><div><span class="f">Nothing</span></div></div>`;
  const work=o=>{const e=Object.entries(o);return e.length?`<div class="ledger">${e.map(([k,v])=>`<div><span>${k}</span><span class="num">${v}</span></div>`).join('')}</div>`:`<div class="ledger"><div><span class="f">Nothing</span></div></div>`};
  const ev=R2.events.filter(e=>e.k).slice(0,8);
  const warn=[R2.failed?`${R2.failed} failed print${R2.failed>1?'s':''}`:'',R2.cancelled?`${R2.cancelled} cancelled order${R2.cancelled>1?'s':''}`:'',R2.ignored?`${R2.ignored} ignored message${R2.ignored>1?'s':''}`:'',R2.lost?`${R2.lost} lost parcel${R2.lost>1?'s':''}`:'',R2.damaged?`${R2.damaged} damaged parcel${R2.damaged>1?'s':''}`:''].filter(Boolean);
  const mins=Math.max(1,Math.round(h*HOUR_MS/60000));
  pending=[{f:()=>{S.rep=newRep(S);S.lastT=Date.now();save();render()}}];
  modal(`<div class="rep-top"><div class="rep-eyebrow">While you were away · ${mins} min</div>
  <div class="rep-profit ${profit>=0?'good':'bad'}">${sfmt(profit)}</div>
  <div class="rep-sub">Cash ${fmt(S.cash)} · ${S.rating.toFixed(2)}★ ${Math.abs(dr)>=.005?`<span class="${dr>0?'good':'bad'}">${dr>0?'+':''}${dr.toFixed(2)}</span>`:''} · hype ${Math.round(S.hype)} ${Math.round(dh)?`<span class="${dh>0?'good':'bad'}">${dh>0?'+':''}${Math.round(dh)}</span>`:''}</div></div>
  <div class="rep-sec"><div class="grid4"><div><b>${R2.printed}</b><span>Printed</span></div><div><b>${R2.finished}</b><span>Finished</span></div><div><b>${R2.shipped}</b><span>Shipped</span></div><div><b>${R2.delivered}</b><span>Delivered</span></div></div>
  ${warn.length?`<div class="rep-sub bad" style="margin-top:10px;text-align:center">${warn.join(' · ')}</div>`:''}${R2.wom?`<div class="rep-sub good" style="margin-top:10px;text-align:center">${R2.wom} friend${R2.wom>1?'s':''} came by word of mouth</div>`:''}</div>
  <div class="rep-sec"><h4>Earned</h4>${ledger(inc,'+',ti,'Total')}</div>
  <div class="rep-sec"><h4>Paid</h4>${ledger(exp,'−',te,'Total')}</div>
  ${Object.keys(R2.team).length?`<div class="rep-sec"><h4>Your team did</h4>${work(R2.team)}</div>`:''}
  ${ev.length?`<div class="rep-sec"><h4>What happened</h4><div class="ledger">${ev.map(e=>`<div><span class="${e.k}">${e.t}</span></div>`).join('')}</div></div>`:''}
  <div class="rep-sec"><div class="rep-sub" style="text-align:center;margin-bottom:12px">${S.orders.length} orders waiting · ${S.dms.length} messages · ${PKEYS.reduce((a,k)=>a+S.stock[k],0)} figures ready · ${S.parcels.length} parcels on the way</div>
  <div class="acts"><button class="btn primary" data-choice="0">Back to work</button></div></div>`);
}
