/* Simulation: production, delivery, messages, contracts, live clock, staff AI, company admin, random events. */
/* ---------- production ---------- */
const units=(p,k=p.prod)=>{const D=PRINTERS[p.type];let n=Math.floor(D.slots/PRODUCTS[k].size);if(D.lab)n=Math.min(n,150);if(!D.form&&D.vat)n=Math.min(n,Math.floor(D.vat/(PRODUCTS[k].ml*resinMult())));return Math.max(1,n)};
const jobMl=p=>Math.ceil(units(p)*PRODUCTS[p.prod].ml*resinMult());
function jobHours(p){const D=PRINTERS[p.type];return PRODUCTS[p.prod].h/(D.speed*(S.up.slicer?1.12:1)*(S.up.rails?1.1:1)*(S.up.tune?1.15:1)*(RESINS[p.resin].fast||1))}
function whyNot(p,k){
  const D=PRINTERS[p.type],Pd=PRODUCTS[k];
  if(!unlocked(k))return 'Not unlocked yet';
  if(Pd.tier>D.tier)return 'This printer is too small for that product';
  if(D.inj&&!Pd.inj)return 'Injection machines only make mouldable products';
  if(D.inj&&!S.moulds[k])return 'Buy a mould first (Buy › Gear)';
  return '';
}
const canMake=(p,k)=>!whyNot(p,k)&&makeable(k);
function autoProd(p){
  const pipe=k=>S.unwashed[k]+S.cured[k]+S.printers.reduce((a,q)=>a+(q.state!=='idle'&&q.job&&q.job.prod===k?q.job.units:0),0);
  const ks=PKEYS.filter(k=>canMake(p,k)&&(!S.stop[k]||S.contracts.some(c=>c.p===k))&&(S.listed[k]||need(k)>0||(S.target[k]||0)>0));
  let best=null,bs=0;
  for(const k of ks){const sh=Math.max(need(k)-pipe(k),S.stop[k]?0:(S.target[k]||0)-S.stock[k]-pipe(k));if(sh>bs){bs=sh;best=k}}
  if(best)return best;
  let b2=null,s2=0;
  for(const k of ks){if(!S.listed[k]||(!S.always[k]&&S.stock[k]+pipe(k)>=(PRINTERS[p.type].lab?Math.min(units(p,k),40):units(p,k))*3+10))continue;let sc=demand(k)*S.prices[k]/(PRODUCTS[k].effort+.5);if(S.always[k])sc/=1+(S.stock[k]+pipe(k))/40;if(sc>s2){s2=sc;b2=k}}
  return b2;
}
function startJob(p,auto){
  const D=PRINTERS[p.type];
  if(p.state!=='idle')return false;
  const why=whyNot(p,p.prod);
  if(why||!makeable(p.prod)){if(!auto)toast(why||'Not available yet');return false}
  if(p.cond<=0){if(!auto)toast(`${wearName(D)} worn out. Service it first`);return false}
  const ml=jobMl(p);
  if(D.form){if((S.resin[p.resin]||0)<ml){if(!auto)toast(`Not enough ${RESINS[p.resin].name}`);return false}S.resin[p.resin]-=ml}
  else{if(p.vat<ml){if(!auto)toast('Vat too low. Refill it first');return false}p.vat-=ml}
  S.biz.waste+=D.inj?ml*.02:ml;
  const h=jobHours(p);
  p.job={prod:p.prod,units:units(p),left:h,total:h,q:RESINS[p.resin].q+(D.q||0),rf:RESINS[p.resin].fail};p.state='printing';return true;
}
function endJob(p){
  const D=PRINTERS[p.type],j=p.job;
  let ch=D.fail+j.rf+(p.cond<40?(40-p.cond)/100:0);if(S.up.supports&&!D.inj)ch*=.6;ch*=failMult();
  if(S.up.aircon)ch*=.9;if(S.up.clean&&(D.fam==='form'||D.fam==='carbon'||D.pj))ch*=.8;if(p.sc)ch*=.8;
  p.cond=Math.max(0,p.cond-D.wear*r(.8,1.2)*wearMult()*(p.sc?.6:1));
  if(Math.random()<Math.max(0,ch)){p.state='failed';S.rep.failed++;log(D.inj||D.pj||D.lab?`${short(p)}: the batch was rejected. Clean the machine before the next run.`:`${short(p)}: print failed, the supports let go. Clean the vat before the next print.`,'bad')}
  else p.state='done';
}
function collect(p){const D=PRINTERS[p.type],j=p.job;if(D.inj||D.pj||D.lab)S.cured[j.prod]+=j.units;else S.unwashed[j.prod]+=j.units;S.qual[j.prod]=S.qual[j.prod]*.6+(j.q+qualBonus())*.4;qInc('printed',j.units);S.rep.printed+=j.units;p.state='idle';p.job=null}
function clean(p){p.state='idle';p.job=null}
function refill(p){const D=PRINTERS[p.type];const have=S.resin[p.resin]||0;const take=Math.min(D.vat-p.vat,have);if(take<=0)return false;S.resin[p.resin]-=take;p.vat+=take;return true}
const serviceFee=p=>p.sc?0:Math.round(PRINTERS[p.type].fix*(ofTrait('engineer','efficient')?.8:1));
function service(p,auto){const fee=serviceFee(p);if(S.cash<fee){if(!auto)toast('Not enough cash');return false}if(fee)spend('Repairs',fee);p.cond=100;return true}
const totUnwashed=()=>PKEYS.reduce((a,k)=>a+S.unwashed[k],0);
const totCured=()=>PKEYS.reduce((a,k)=>a+S.cured[k],0);
const byNeed=()=>[...PKEYS].sort((a,b)=>need(b)-need(a));
const washE=()=>S.printers.length&&S.printers.every(p=>RESINS[p.resin].water)?4:8;
function wash(){let left=Math.round(WASHERS[S.washer].cap*(ofTrait('post','efficient')?1.5:1)),n=0;for(const k of byNeed()){const m=Math.min(left,S.unwashed[k]);S.unwashed[k]-=m;S.cured[k]+=m;left-=m;n+=m}spend('IPA & gloves',1.2*(S.up.recycle?.4:1));return n}
function nextFinish(bank){let best=null;for(const k of PKEYS){if(S.cured[k]>0&&(bank==null||PRODUCTS[k].effort<=bank)&&(!best||need(k)>need(best)))best=k}return best}
function finishOne(k){S.cured[k]--;S.stock[k]++;S.rep.finished++;qInc('finished')}
const finishE=k=>Math.max(2,Math.ceil(PRODUCTS[k].effort*5*(S.up.ultra?.7:1)*ecm()));
function packableIdx(){return S.orders.findIndex(o=>freeStock(o.p)>0)}

/* ---------- delivery ---------- */
function pickDest(){let x=Math.random(),a=0;for(const k in DESTS){a+=DESTS[k].w;if(x<a)return k}return 'nl'}
function pickChan(){const ks=Object.keys(CHANNELS).filter(k=>S.ch[k]);let x=Math.random()*ks.reduce((a,k)=>a+CHANNELS[k].w,0);for(const k of ks){x-=CHANNELS[k].w;if(x<=0)return k}return 'web'}
function carrierFor(dest){let id=S.ship[dest]||'postnl';if(!S.car[id]||(CARRIERS[id].nl&&dest!=='nl'))id='postnl';return id}
function parcelCost(p,dest,cid){const C=CARRIERS[cid],D=DESTS[dest];let c=PRODUCTS[p].ship*C.mult*D.cost;c*=1-logiSave();c*=1-Math.min(.3,upv('shp'));c*=cm('ship')*(1-(hasBranch('nl')?.05:0));if(S.up.dock)c*=.9;c-=shipSave();return Math.max(.5,c)+(C.fee||0)}
function ship(o,counter){
  const Pd=PRODUCTS[o.p],price=S.prices[o.p]*(saleOn()?1-S.sale.off:1);
  S.stock[o.p]--;
  const chn=CHANNELS[o.ch||'web']||CHANNELS.web;
  earn(counter?'Counter sales':chn.cat||(o.ch==='bol'?'bol.com sales':o.ch==='etsy'?'Etsy sales':'Webshop sales'),price);
  if(Pd.royalty)spend('Royalties',price*Pd.royalty);
  S.revenue+=price;S.sold++;(S.soldBy=S.soldBy||{})[o.p]=(S.soldBy[o.p]||0)+1;regSale(o.p);S.rep.shipped++;qInc('shipped');addXp(productXp(o.p));
  if(o.rush&&(o.age||0)<=1&&!counter){const rb=Math.round(price*.4*100)/100;earn('Rush bonus',rb);S.revenue+=rb;log(`Rush order shipped in time: +${fmt(rb)} bonus.`,'good')}
  const priceB=clamp((Pd.ref/price-1)*1.5,-.6,.4);
  if(counter){review(clamp(4.4+S.qual[o.p]+supportPower()+priceB+r(-.45,.3),1,5));return}
  spend(chn.feeName,(price*chn.fee+chn.fix)*(1-Math.min(.5,upv('fee'))));
  const dest=o.dest||'nl',cid=carrierFor(dest),C=CARRIERS[cid],D=DESTS[dest];
  spend('Shipping',parcelCost(o.p,dest,cid));spend('Packaging',.4);
  S.dstat.sent++;
  const td=C.days*D.days;
  S.parcels.push({id:nid(),p:o.p,price,due:S.abs+td*12,dest,cid,age:o.age||0,pb:priceB,q:S.qual[o.p],td});
}
function deliverParcel(par){
  const C=CARRIERS[par.cid],D=DESTS[par.dest],nm=PRODUCTS[par.p].name.toLowerCase();
  if(Math.random()<C.lost*D.lost*lossMult()){S.dstat.lost++;S.rep.lost++;S.dms.push({id:nid(),kind:'lost',p:par.p,price:par.price,age:0});log(`A ${nm} got lost in transit with ${C.name}.`,'bad');return}
  if(Math.random()<C.dmg*dmgMult()){S.dstat.dmg++;S.rep.damaged++;S.dms.push({id:nid(),kind:'broken',p:par.p,age:0});log(`A ${nm} arrived damaged (${C.name}).`,'bad');return}
  S.dstat.del++;S.rep.delivered++;
  const late=Math.max(0,par.td-3)*.25;
  const sc=clamp(4.4+par.q+supportPower()+(ofTrait('packer','careful')?.05:0)-Math.max(0,(par.age||0)-2)*.35-late+par.pb+r(-.45,.3),1,5);review(sc);logReview(sc,par.p);if(sc>=4)wordOfMouth(par);
}
function packOne(){const i=packableIdx();if(i<0)return false;const o=S.orders.splice(i,1)[0];ship(o);return true}
function deliverContract(c,team){
  S.stock[c.p]-=c.qty;earn('Contracts',c.pay);S.revenue+=c.pay;S.sold+=c.qty;S.contractsDone++;S.cdSeen=S.contractsDone;addXp(c.qty*productXp(c.p)+10);S.contracts=S.contracts.filter(x=>x!==c);review(4.9);
  did('Contracts delivered',1,team);log(`Delivered ${c.qty}× ${PRODUCTS[c.p].name} to ${c.client}${c.pay?' for '+fmt(c.pay):''}.`,'good');
}
function acceptOffer(o){
  S.offers=S.offers.filter(x=>x!==o);
  const pay=Math.round(o.pay*salesMult()/10)*10;
  S.contracts.push({id:o.id,client:o.client,p:o.p,qty:o.qty,pay,due:S.day+o.days});
  log(`Accepted ${o.qty}× ${PRODUCTS[o.p].name} for ${o.client}.`);
}

/* ---------- messages & contracts ---------- */
function newDM(){
  const ks=PKEYS.filter(sellable);if(!ks.length)return;
  const kind=pick(['where','broken','custom','question','question','where']);
  S.dms.push({id:nid(),kind,p:pick(ks),age:0,amt:Math.round(r(120,320)/10)*10,q:pick(['Do you ship to Belgium?','Is the resin safe once it is cured?','Can I pick up my order instead?','Will you restock the sold-out figure?','Do you have an invoice with BTW for me?','Can you paint it in different colours?'])});
}
function dmText(d){return{where:'Hi! Where is my order? It has been a few days.',broken:`My ${PRODUCTS[d.p].name.toLowerCase()} arrived with a snapped-off part.`,lost:`My ${PRODUCTS[d.p].name.toLowerCase()} never arrived and the tracking has not moved for days.`,custom:'Could you print my original character? I can send you the 3D file.',question:d.q}[d.kind]}
function dmOpts(d){
  if(d.kind==='where')return[{l:'Send tracking + apology',f:()=>review(4.7)}];
  if(d.kind==='broken')return[{l:'Send a replacement',ok:()=>freeStock(d.p)>0,f:()=>{S.stock[d.p]--;review(5)}},{l:`Refund 30% (${fmt(S.prices[d.p]*.3)})`,f:()=>{spend('Refunds',S.prices[d.p]*.3);review(4.1)}}];
  if(d.kind==='lost')return[{l:'Send a replacement',ok:()=>freeStock(d.p)>0,f:()=>{S.stock[d.p]--;spend('Shipping',PRODUCTS[d.p].ship);review(4.6)}},{l:`Refund ${fmt(d.price)}`,f:()=>{spend('Refunds',d.price);review(3.4)}}];
  if(d.kind==='custom'){const k=makeable('premium')?'premium':'desk';return[{l:`Quote ${fmt(d.amt)}`,ok:()=>S.contracts.length<4,f:()=>{S.contracts.push({id:nid(),client:'Custom commission',p:k,qty:1,pay:d.amt,due:S.day+6});log(`Accepted a custom commission for ${fmt(d.amt)}. One ${PRODUCTS[k].name.toLowerCase()} due in 6 days.`,'good')}},{l:'Decline politely',f:()=>{}}]}
  return[{l:'Answer',f:()=>{S.hype+=1;review(4.8)}}];
}
function answerDM(id,i,team){const d=S.dms.find(x=>x.id==id);if(!d)return;const o=dmOpts(d)[i];if(!o||(o.ok&&!o.ok()))return;if(!team&&!useE(E.dm()))return;o.f();qInc('dm');S.dms=S.dms.filter(x=>x!==d);did('Messages answered',1,team)}
function refreshOffers(){
  S.offers=[];
  if(!S.biz.kvk)return;
  const ks=PKEYS.filter(contractable);
  for(let i=0;i<3&&ks.length;i++){const p=pick(ks),[a,b]=QTY[p],qty=Math.max(1,Math.round(ri(a,b)*(1+S.ws*.5))),days=ri(4,9);
    S.offers.push({id:nid(),client:pick(CLIENTS),p,qty,days,pay:Math.round(qty*PRODUCTS[p].ref*r(.85,1.15)*(S.biz.perm.iso?1.1:1)/10)*10})}
  if(ks.length&&Math.random()<.4){const hi=ks.filter(k=>PRODUCTS[k].ref>=29),p=pick(hi.length?hi:ks);S.offers.push({id:nid(),client:pick(['Private collector','Cosplayer from Utrecht','Anime club chair','Gamer from Groningen']),p,qty:1,days:ri(5,9),pay:Math.round(PRODUCTS[p].ref*r(1.8,2.6)/10)*10,commission:true})}
}

/* ---------- clock (live) ---------- */
let simulating=false,queue=[],awayMode=false;
function sim(dt){
  const rate=printRate();
  S.abs+=dt;
  for(const p of S.printers)if(p.state==='printing'){p.job.left-=dt*rate;if(p.job.left<=0)endJob(p)}
  staffWork(dt);
  if(S.energy<maxE())S.energy=Math.min(maxE(),S.energy+regen()*dt);
  S.m+=dt*60;
  while(S.m>=60){S.m-=60;hourStep();if(S.over)return}
}
function hourStep(){
  S.hour++;
  if(S.hour>=24){S.hour=0;endOfDay();if(S.over)return}
  if(S.hour===7)S.drinks=0;
  clearanceDone();
  autoContracts();
  for(const k of PKEYS)if(sellable(k)){const P=S.pre[k],lt=!!(P&&P.on&&P.ltd);takeOrders(k,poisson(demand(k)*(lt?1.3:1)/24))}
  for(let i=S.orders.length-1;i>=0;i--){const o=S.orders[i];if(freeStock(o.p)>0&&CARRIERS[carrierFor(o.dest||'nl')].auto){S.orders.splice(i,1);ship(o);did('Orders packed by the fulfilment partner',1,true)}}
  if(S.parcels.length){const keep=[];for(const par of S.parcels){if(S.abs>=par.due)deliverParcel(par);else keep.push(par)}S.parcels=keep}
  if(S.hour>=8&&S.hour<23&&Math.random()<.025+S.orders.length*.004)newDM();
  if(S.hour===12&&S.day>3&&Math.random()<.28)randomEvent();
}
/* staff: every worker has a task cooldown and picks the most useful job on their own */
function gainXp(s,h){
  if(s.mach)return;
  s.xp=(s.xp||0)+(h+.12)*(S.up.training?1.5:1)*(1+upv('xp'));
  while((s.lvl||1)<5&&s.xp>=XPN[(s.lvl||1)-1])levelUp(s);
}
function levelUp(s){s.lvl=(s.lvl||1)+1;s.wage=Math.round(s.wage*1.1);log(`${s.name} reached level ${s.lvl}. Works faster, wage now ${fmt(s.wage)}/day.`,'good')}
function techTask(s){
  for(const p of S.printers){
    if(p.state==='failed'){clean(p);did('Failed prints cleaned',1,true);return{h:.1,act:`Cleaning ${short(p)}`}}
    if(p.state==='done'){collect(p);did('Plates collected',1,true);return{h:.08,act:`Collecting a plate from ${short(p)}`}}
  }
  for(const p of S.printers){
    if(p.state!=='idle')continue;
    const D=PRINTERS[p.type];
    if(p.cond<25&&S.cash>serviceFee(p)*3&&service(p,true)){did('Printers serviced',1,true);return{h:.3,act:`Servicing ${short(p)}`}}
    if(p.auto!==false){const k=autoProd(p);if(!k)continue;p.prod=k}
    if(p.swap){const need=jobMl(p)-(D.form?0:p.vat);
      if(need>0&&(S.resin[p.resin]||0)<need){
        const alt=Object.keys(RESINS).filter(k=>RESINS[k].fam===D.fam&&k!==p.resin&&(S.resin[k]||0)>=need).sort((a,b)=>(S.resin[b]||0)-(S.resin[a]||0))[0];
        if(alt){const was=RESINS[p.resin].name;p.resin=alt;did('Resins switched',1,true);log(`${short(p)} ran out of ${was} and switched to ${RESINS[alt].name}.`,'amber');return{h:.05,act:`Switching ${short(p)} to ${RESINS[alt].name}`}}
      }}
    if(!D.form&&p.vat<jobMl(p)&&refill(p)){did('Vats refilled',1,true);return{h:.1,act:`Refilling ${short(p)}`}}
    if(startJob(p,true)){did('Prints started',1,true);return{h:.06,act:`Starting a print on ${short(p)}`}}
    if(S.warnDay!==S.day&&!whyNot(p,p.prod)&&(S.resin[p.resin]||0)<jobMl(p)&&p.cond>0){S.warnDay=S.day;log(`Out of ${RESINS[p.resin].name}. Technicians are waiting on supplies.`,'bad')}
  }
  return null;
}
function haveStock(k){return S.stock[k]+S.cured[k]+S.unwashed[k]+S.printers.reduce((a,q)=>a+(q.state!=='idle'&&q.job&&q.job.prod===k?q.job.units:0),0)}
function staffTask(s){
  if(s.role==='tech')return techTask(s);
  if(s.role==='post'){if(totUnwashed()>0){const n=wash();did('Batches washed',1,true);return{h:.45,act:`Washing and curing ${n} prints`}}return null}
  if(s.role==='painter'){const k=nextFinish();if(!k)return null;finishOne(k);did('Figures finished',1,true);return{h:Math.max(.12,PRODUCTS[k].effort*.45/skill(s)*(s.trait==='efficient'?.8:1)*paintMult()*(S.crunch?.75:1)),act:`Finishing a ${PRODUCTS[k].name.toLowerCase()}`}}
  if(s.role==='packer'){if(packableIdx()<0)return null;packOne();did('Orders packed',1,true);return{h:.3,act:'Packing an order'}}
  if(s.role==='support'){const d=S.dms[0];if(!d)return null;const opts=dmOpts(d);const i=opts.findIndex(o=>!o.ok||o.ok());answerDM(d.id,i<0?opts.length-1:i,true);if(s.trait==='efficient')S.hype+=.5;return{h:.25,act:'Answering a message'}}
  if(s.role==='engineer'){for(const p of S.printers)if(p.state==='idle'&&p.cond<60&&S.cash>serviceFee(p)*2&&service(p,true)){did('Printers serviced',1,true);return{h:.4,act:`Servicing ${short(p)}`}}return null}
  if(s.role==='buyer'){
    for(const k of new Set(S.printers.map(p=>p.resin))){const vol=RESINS[k].vol||1000;if((S.resin[k]||0)<vol*.8){const c=resinPrice(k)*(s.trait==='efficient'?.94:1);if(S.cash>c*3){spend('Resin',c);S.resin[k]=(S.resin[k]||0)+vol;did('Supplies ordered',1,true);return{h:.3,act:`Ordering ${RESINS[k].name}`}}}}
    return null}
  if(s.role==='salesrep'){
    for(const c of S.contracts)if(S.stock[c.p]>=c.qty){deliverContract(c,true);return{h:.3,act:`Delivering to ${c.client}`}}
    if(S.contracts.length<4){const o=S.offers.find(o=>haveStock(o.p)>=Math.min(o.qty,6)||o.qty<=6);if(o){acceptOffer(o);did('Contracts signed',1,true);return{h:.4,act:`Signing a deal with ${o.client}`}}}
    return null}
  return null;
}
function staffWork(dt){
  const [a,b]=shift(),on=S.hour>=a&&S.hour<b;
  for(const s of S.staff){
    if(s.role==='clerk')continue;
    if(!on&&!s.mach){s.act='Off shift';s.cd=0;continue}
    if(PASSIVE[s.role]){s.act=PASSIVE[s.role];s.busy+=dt*.5;gainXp(s,dt*.5);continue}
    s.cd-=dt;
    let n=0;
    while(s.cd<=0&&n++<12){
      const t=staffTask(s);if(t)s.done=(s.done||0)+1;
      if(!t){s.cd=0;s.act=(typeof idleWhy==='function'&&idleWhy(s))||'Waiting for work';break}
      const d=t.h/(skill(s)*mf(s));
      s.cd+=d;s.busy+=d;s.act=t.act;gainXp(s,d);
    }
  }
}
/* ---------- company admin ---------- */
function endKor(){S.biz.kor=false;S.biz.korCd=YEAR;log('You passed the KOR limit. From now on you charge BTW on your sales.','amber');toast('KOR ended: BTW applies now')}
function incomeTax(base){
  let t;
  if(S.biz.form==='bv')t=Math.min(base,3850)*.19+Math.max(0,base-3850)*.258;
  else{const x=Math.max(0,base-70);t=Math.min(x,700)*.19+Math.max(0,x-700)*.37}
  return Math.round(t*cm('tax')*(1-Math.min(.3,upv('tax')))*(1-Math.min(.2,sumRole('accountant',s=>.04*skill(s)))));
}
function weekly(){
  const L=[];
  L.push(['Rent',rent()]);
  const w=wages()*7;if(w){L.push(['Wages',w]);if(S.biz.kvk)L.push(['Employer costs',Math.round(w*EMP_COSTS)])}
  const eb=energyBill();if(eb)L.push(['Electricity',eb]);
  const wc=wasteCost();if(wc)L.push(['Waste disposal',wc]);
  L.push(['Shopify plan',6]);
  if(S.biz.kvk)L.push(['Business bank account',5]);
  if(S.biz.ins)L.push(['Insurance',12+4*S.staff.length]);
  if(S.biz.form==='bv')L.push(['Accounting (BV)',ofRole('accountant').length?60:150]);
  else if(S.biz.kvk&&!ofRole('accountant').length)L.push(['Bookkeeping software',6]);
  const sc=S.printers.filter(p=>p.sc).reduce((a,p)=>a+Math.max(3,PRINTERS[p.type].cost*.004),0);if(sc)L.push(['Service contracts',Math.round(sc)]);
  for(const id in CARRIERS)if(S.car[id]&&CARRIERS[id].weekly)L.push([CARRIERS[id].name+' (fixed costs)',CARRIERS[id].weekly]);
  return L;
}
function payday(){
  const b=S.biz;let tot=0;
  for(const [c,a] of weekly()){spend(c,a);tot+=a}
  b.waste=0;
  const prof=b.wkInc-b.wkExp;
  for(const l of [...S.loans]){
    if(l.pct){const a=Math.max(0,prof)*l.pct;if(a>0){spend('Investor share',a);tot+=a}l.n--;if(l.n<=0){S.loans=S.loans.filter(x=>x!==l);log('Your investor deal has ended.','good')}}
    else{const pr=Math.min(l.bal,l.p0/l.n0),it=l.bal*l.rate;spend('Loan repayment',pr);spend('Loan interest',it);tot+=pr+it;l.bal-=pr;if(l.bal<=.5){S.loans=S.loans.filter(x=>x!==l);log(`${l.name} is paid off.`,'good')}}
  }
  if(b.kvk){b.taxBase+=prof;b.wkInc=0;b.wkExp=0;if(b.taxBase>0){const t=incomeTax(b.taxBase);b.taxBase=0;if(t>0){spend(b.form==='bv'?'Corporate tax':'Income tax',t);tot+=t}}}
  S.mk.resin=clamp(S.mk.resin*r(.92,1.1),.8,1.5);
  S.mk.comp=clamp(S.mk.comp*r(.97,1.03)+(S.mk.comp<1?.01:0),.8,1.05);
  log(`Payday: ${fmt(tot)} in rent, wages, tax and company costs.`,S.cash<0?'bad':'');
  if(S.cash<0)log('Your account is in the red. Below −€1.500 the bank closes it.','bad');
}
function settleVat(a,auto){
  if(a>=0)spend('BTW',a);else earn('BTW refund',-a);
  log(`${auto?'Your accountant filed':'You filed'} the BTW return: ${a>=0?'paid '+fmt(a):'refund '+fmt(-a)}.`,'amber');
}
function bizDay(){
  const b=S.biz;
  if(!b.kvk){
    if(S.revenue>=2000&&!b.warned){b.warned=true;log('Your sales are growing. Register at the KvK before the Belastingdienst notices.','amber')}
    if(S.revenue>=3500&&!b.fined){b.fined=true;spend('Fines',400);b.kvk=true;b.form='eenmanszaak';b.kor=true;b.qNext=S.day+QUARTER;b.yrNext=S.day+YEAR;log('The Belastingdienst fined you €400 for selling without registration. You are now registered at the KvK with KOR.','bad')}
    return;
  }
  if(S.day>=b.qNext){
    b.qNext+=QUARTER;
    if(!b.kor){
      const a=Math.round(b.vatOut-b.vatIn);b.vatOut=0;b.vatIn=0;
      if(ofRole('accountant').length)settleVat(a,true);
      else{b.vatDue={amt:a,by:S.day+7};log(`BTW return is due: ${a>=0?'pay '+fmt(a):'you get '+fmt(-a)+' back'}. File it in Empire › Company within 7 days.`,'amber')}
    }
  }
  if(b.vatDue&&S.day>b.vatDue.by){const a=b.vatDue.amt;b.vatDue=null;spend('Fines',Math.abs(a)*.25+50);settleVat(a,false);log('The BTW return was late. A fine was added.','bad')}
  if(S.day>=b.yrNext){b.yrNext+=YEAR;b.yrRev=0}
  if(b.korCd>0)b.korCd--;
}
function endOfDay(){
  storesDay();
  S.day++;
  socialDay();bigOfferRoll();autoPriceDay();newQuests();
  const lim=5+Math.min(countRole('support'),3)*2;let canc=0;
  S.orders=S.orders.filter(o=>{o.age++;if(o.age>(o.pre?lim*3:lim)){canc++;review(o.pre?(awayMode?4:3.4):(awayMode?3.2:1.8));return false}return true});
  S.rep.cancelled+=canc;
  if(canc)log(`${canc} customer${canc>1?'s':''} cancelled after waiting too long.`,'bad');
  let ign=0;S.dms=S.dms.filter(d=>{d.age++;if(d.age>2){ign++;review(awayMode?3:2);return false}return true});
  S.rep.ignored+=ign;
  if(ign)log(`${ign} unanswered message${ign>1?'s':''} turned into bad reviews.`,'bad');
  S.contracts=S.contracts.filter(c=>{if(S.day>c.due){
    if(c.prepaid){spend('Refunds',c.refund);S.rating=Math.max(1,S.rating-.4);log(`You missed the Kickstarter deadline and refunded ${fmt(c.refund)}.`,'bad')}
    else{S.rating=Math.max(1,S.rating-.15);log(`Missed the deadline for ${c.client}. Rating dropped.`,'bad')}
    return false}return true});
  if(S.day%3===1)refreshOffers();
  S.hype=Math.max(2,(S.hype+socialHype()+hypePerDay()+upv('hyp')+(S.stores.cafe?.merged?5:0))*hypeKeep());
  for(const s of [...S.staff]){const load=s.busy/shiftLen();s.busy=0;
    if(s.mach){s.mood=100;s.load=load;continue}
    if(s.role!=='clerk'){if(load>.85)s.mood-=2.5*(S.crunch?2:1)*(S.up.fume?.5:1)*(S.up.lounge?.6:1)*(1-Math.min(.7,upv('mo')));else s.mood+=S.up.lounge?2:1.2}
    s.mood=clamp(s.mood,0,100);
    if(s.mood<30&&Math.random()<.05){S.staff=S.staff.filter(x=>x!==s);log(`${s.name} (${s.role==='clerk'?'store clerk':ROLES[s.role].name.toLowerCase()}) quit. Morale was too low.`,'bad')}}
  if(S.up.sub){const used=new Set(S.printers.map(p=>p.resin));for(const k of used){const vol=RESINS[k].vol||1000;if((S.resin[k]||0)<vol&&S.cash>resinPrice(k)){spend('Resin',resinPrice(k));S.resin[k]=(S.resin[k]||0)+vol}}}
  const si=Math.floor(((S.day-1)%YEAR)/28);
  if(si!==S.season){S.season=si;log(`${SEASONS[si].n} starts. Demand ×${SEASONS[si].m}.`,'amber')}
  bizDay();
  if((S.day-1)%7===0)payday();
  for(const k in S.cds)if(S.cds[k]>0)S.cds[k]--;
  if(S.lunchCd>0)S.lunchCd--;
  S.hist.push(Math.round(S.cash));if(S.hist.length>30)S.hist.shift();
  for(const m of MILESTONES)if(!S.done[m.id]&&m.f(S)){S.done[m.id]=S.day;log(`Goal reached: ${m.t}`,'good')}
  if(S.cash<-1500)S.over=true;
}
function storesDay(){
  for(const k in S.stores){const st=S.stores[k],D=STORES[k];if(!st.open)continue;
    const clerks=S.staff.filter(s=>s.role==='clerk'&&s.store===k);
    st.last=0;
    if(!clerks.length&&S.shift[k]!==S.day)continue;
    const mult=LVL[st.level-1]*(1+S.hype/80);
    const sold=Math.min(st.stock,Math.round(poisson(D.traffic*mult)*1.3));
    st.stock-=sold;
    if(sold){earn('Store sales',sold*D.sell);S.revenue+=sold*D.sell}
    st.last=sold*D.sell;
    if(st.merged&&k==='manga'){const walk=poisson(D.traffic*mult*.06);let f=0;for(let i=0;i<walk;i++){const ks=PKEYS.filter(p=>freeStock(p)>0&&S.listed[p]);if(!ks.length)break;ship({p:pick(ks),age:0},true);f++}if(f)log(`${f} figure${f>1?'s':''} sold at the manga store counter.`,'good')}
    if(D.spoil)st.stock=Math.floor(st.stock*.3);
    const cap=D.capB*st.level;
    if(clerks.length&&st.stock<cap*.4){const want=Math.floor(cap*.8)-st.stock,c=want*D.unit;if(S.cash>c+500){spend('Store stock',c);st.stock+=want}}
    clerks.forEach(s=>s.mood=clamp(s.mood+.5,0,100));
  }
}
function advance(hours){simulating=true;let left=hours;try{while(left>1e-9&&!S.over){const dt=Math.min(.1,left);sim(dt);left-=dt}}catch(err){reportError(err)}finally{simulating=false}}
const skipRate=()=>1.5+S.printers.length*.5+studioStaff().length*.8;
const skipCost=h=>Math.round(h*skipRate());
function afterSim(){
  S.lastT=Date.now();
  if(S.over){render();gameOver();return}
  nextQueued();
}
function skip(h){
  const c=skipCost(h);
  if(S.cash<c)return toast(`Skipping costs ${fmt(c)}`);
  spend('Time skip',c);
  advance(h);save();render();afterSim();
  if(!modalOpen())toast(`+${h} h for ${fmt(c)}`);
}
function wait2(){skip(2)}
function liveTick(){
  if(!S||!S.started||S.over)return;
  const now=Date.now();let gap=now-(S.lastT||now);S.lastT=now;
  if(gap<=0)return;
  if(S.paused||modalOpen())return;
  if(gap>4000){ // you were away: the shop kept running
    const h=Math.min(MAX_AWAY,gap/HOUR_MS);
    S.rep=newRep(S);S.rep.hours=h;
    awayMode=true;advance(h);awayMode=false;S.lastT=Date.now();
    if(S.over){S.over=false;S.cash=Math.max(S.cash,-1400);log('The bank froze your account while you were away. Sort out your finances before it closes it.','bad')}
    save();render();
    const go=()=>{if(h>=.5)showAway(h);else nextQueued()};if(patchDue())showPatch(go);else go();
    return;
  }
  const dt=gap/HOUR_MS;
  simulating=true;let left=dt;try{while(left>1e-9&&!S.over){const d=Math.min(.05,left);sim(d);left-=d}}catch(err){reportError(err)}finally{simulating=false}
  S.lastT=Date.now();
  if(now-(liveTick.saved||0)>10000){liveTick.saved=now;save()}
  render();
  if(S.over){gameOver();return}
  if(queue.length)nextQueued();
}

/* ---------- events ---------- */
function randomEvent(){
  const ev=[];
  ev.push(()=>{const h=ri(20,40);S.hype+=h;log(`A customer's photo of your figure went viral. Hype +${h}.`,'good')});
  ev.push(()=>{const p=S.printers.filter(p=>!PRINTERS[p.type].form&&p.vat>100);if(!p.length)return;const x=pick(p),l=Math.min(x.vat,ri(150,400));x.vat-=l;log(`Someone knocked into ${short(x)} and spilled ${l} ml of resin.`,'bad')});
  ev.push(()=>{S.resin.siraya=(S.resin.siraya||0)+1000;log('Siraya Tech sent you a free 1 kg bottle of Fast resin to test.','good')});
  ev.push(()=>{let n=0;S.printers.forEach(p=>{if(p.state==='printing'){p.job.left+=3;n++}});if(n)log('Power outage. Running prints lost 3 hours.','bad')});
  ev.push(()=>{S.mk.resin=clamp(S.mk.resin*1.25,.8,1.6);log('Resin prices jumped after a supply shortage.','bad')});
  ev.push(()=>{if(!S.parcels.length)return;S.parcels.forEach(p=>p.due+=12);log('A carrier strike is delaying your parcels.','bad')});
  ev.push(()=>{S.mk.comp=clamp(S.mk.comp-.08,.8,1.05);log('A new competitor started selling cheaper figures. Demand dipped.','bad')});
  if(S.printers.length<space().printers&&S.biz.kvk)ev.push(()=>choice('Flash sale','Elegoo has a refurbished Saturn 4 Ultra for €450 instead of €650. Offer ends today.',[
    {l:'Buy it (€450)',ok:()=>S.cash>=450&&S.printers.length<space().printers,f:()=>{spend('Printers',450);addPrinter('saturn');log('Bought a refurbished Saturn 4 Ultra.','good')}},{l:'Skip',f:()=>{}}]));
  ev.push(()=>choice('Convention invite','An organiser offers you a last-minute booth at an anime con for €800. You sell from stock and get a big hype boost.',[
    {l:'Book the booth (€800)',ok:()=>S.cash>=800,f:()=>{spend('Marketing',800);S.hype+=55;const s=sellStock(15);log(`Con booth: sold ${s} figures and gained a lot of followers.`,'good')}},{l:'Skip it',f:()=>{}}]));
  const tot=PKEYS.reduce((a,k)=>a+freeStock(k),0);
  if(tot>=5)ev.push(()=>choice('Wholesale offer','A webshop wants to buy your whole finished stock at 65% of your prices.',[
    {l:'Sell it all',ok:()=>PKEYS.some(k=>freeStock(k)>0),f:()=>{const now=PKEYS.reduce((a,k)=>a+freeStock(k),0),val=Math.round(PKEYS.reduce((a,k)=>a+freeStock(k)*S.prices[k],0)*.65);PKEYS.forEach(k=>{const n=freeStock(k);addXp(n*productXp(k));S.stock[k]-=n});earn('Wholesale',val);S.revenue+=val;S.sold+=now;log(`Sold ${now} items wholesale for ${fmt(val)}.`,'amber')}},{l:'Keep them',f:()=>{}}]));
  if(S.staff.some(x=>!x.mach)){const s=pick(S.staff.filter(x=>!x.mach));ev.push(()=>choice('Raise request',`${s.name} asks for a raise of €15 a day.`,[
    {l:'Give the raise',f:()=>{s.wage+=15;s.mood=clamp(s.mood+30,0,100);log(`${s.name} got a raise and is motivated.`,'good')}},
    {l:'Not now',f:()=>{s.mood=clamp(s.mood-25,0,100);log(`${s.name} is disappointed about the raise.`,'amber')}}]))}
  const fk=PKEYS.filter(k=>freeStock(k)>0).sort((a,b)=>PRODUCTS[b].ref-PRODUCTS[a].ref)[0];
  if(fk)ev.push(()=>choice('Influencer DM',`A cosplayer with 80k followers asks for a free ${PRODUCTS[fk].name.toLowerCase()} to review.`,[
    {l:'Send one free',ok:()=>freeStock(fk)>0,f:()=>{S.stock[fk]--;S.hype+=Math.round(15+PRODUCTS[fk].ref/6);log('The review video is out. Hype is climbing.','good')}},{l:'Decline',f:()=>{}}]));
  if(S.sold>=20)ev.push(()=>{const cost=S.biz.ins?150:1200;choice('Skin reaction claim',`A customer says they got a rash from handling an uncured part and wants ${fmt(1200)}.${S.biz.ins?' Your insurance covers it, you pay the €150 excess.':''}`,[
    {l:`Settle (${fmt(cost)})`,f:()=>{spend('Claims',cost);log('You settled a skin reaction claim.','amber')}},
    {l:'Fight it',f:()=>{if(Math.random()<(S.biz.ins?.7:.4)){log('The claim was dismissed.','good')}else{spend('Claims',cost*1.6);S.rating=Math.max(1,S.rating-.05);log('You lost the claim and paid extra costs.','bad')}}}])});
  if(S.biz.kvk&&S.revenue>=5000)ev.push(()=>{if(ofRole('accountant').length){log('The Belastingdienst audited your books. Your accountant handled everything.','good')}else{spend('Admin',300);log('The Belastingdienst audited your books. It cost you €300 in admin.','bad')}});
  if(!S.up.ip&&PKEYS.some(k=>S.listed[k]&&PRODUCTS[k].ref>=29&&!PRODUCTS[k].official))ev.push(()=>choice('Takedown notice','A rights holder says one of your fan figures infringes their copyright and asks you to stop selling it.',[
    {l:'Pay a €400 settlement',ok:()=>S.cash>=400,f:()=>{spend('Claims',400);log('You paid a settlement and kept selling.','amber')}},
    {l:'Pull the listing',f:()=>{const k=PKEYS.filter(k=>S.listed[k]&&PRODUCTS[k].ref>=29&&!PRODUCTS[k].official&&!['licensed','deckbox'].includes(k))[0];if(k){S.listed[k]=false;log(`You pulled the ${PRODUCTS[k].name.toLowerCase()} from sale.`,'bad')}}}]));
  if(S.printers.length>=3)ev.push(()=>{const cost=S.biz.ins?200:900;const p=pick(S.printers);if(p.state==='printing'){p.job.left+=6}spend('Repairs',cost);log(`${short(p)} overheated. ${S.biz.ins?'Insurance paid most of the repair.':'The repair cost '+fmt(cost)+'.'}`,'bad')});
  pickEvent(ev);
}
function sellStock(max){let s=0,v=0;for(const k of [...PKEYS].sort((a,b)=>PRODUCTS[b].ref-PRODUCTS[a].ref)){while(freeStock(k)>0&&s<max){S.stock[k]--;s++;v+=S.prices[k];S.sold++;addXp(productXp(k))}}if(v){earn('Con booth sales',v);S.revenue+=v}return s}
function addPrinter(t){const D=PRINTERS[t];S.printers.push({id:nid(),type:t,resin:D.form?DEFRES[D.fam]:'estd',vat:0,cond:100,prod:D.inj?'chibi':makeable('desk')?'desk':'chibi',state:'idle',job:null,auto:true,sc:false})}

