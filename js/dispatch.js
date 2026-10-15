/* Dispatch (3.11): packed orders wait in a dispatch bay (50 to start) until a courier takes them, and online sales are only paid out a few days later.
   Order -> pack -> bay -> send -> parcel -> delivered, and payment clears after a payout delay. A Shop catalogue upgrades every step. */
const dsp=()=>S.dsp||(S.dsp={});
const bayOf=()=>S.bay||(S.bay=[]);
const payoutsOf=()=>S.payouts||(S.payouts=[]);
const dspLv=k=>dsp()[k]||0;
function dispCap(){return 50+25*dspLv('racks')+(typeof fleetCap==='function'?fleetCap():0)}
const bayFull=()=>bayOf().length>=dispCap();
const PICKUPS=[[18],[12,18],[9,12,15,18],[8,10,12,14,16,18,20],[8,9,10,11,12,13,14,15,16,17,18,19,20]];
function pickHours(){const b=PICKUPS[Math.min(4,dspLv('pick'))];const x=typeof fleetPick==='function'?fleetPick():[];return x.length?[...new Set([...b,...x])].sort((a,c)=>a-c):b}
const PAY_BASE={web:1,bol:1,etsy:1};
const payoutDays=ch=>dspLv('pay')>=1?0:1;  /* 4.10: everything you send is paid the next morning; fast-track makes it instant */
const SEND_E=4;
function nextPickup(){const h=pickHours(),now=S.hour+S.m/60;const n=h.find(x=>x>now);return n!=null?n:h[0]+24}
const pendingPay=()=>payoutsOf().reduce((a,p)=>a+p.a,0);
/* ---- selling: stock leaves, stats and XP count now, money waits ---- */
function shipSale(o,counter){
  const Pd=PRODUCTS[o.p],price=S.prices[o.p]*(saleOn()?1-S.sale.off:1);
  S.stock[o.p]--;
  const key=o.ch||'web',chn=CHANNELS[key]||CHANNELS.web,cat=counter?'Counter sales':chn.cat||(key==='bol'?'bol.com sales':key==='etsy'?'Etsy sales':'Webshop sales');
  if(counter)earn(cat,price);
  if(Pd.royalty)spend('Royalties',price*Pd.royalty);
  S.revenue+=price;S.sold++;(S.soldBy=S.soldBy||{})[o.p]=(S.soldBy[o.p]||0)+1;regSale(o.p);S.rep.shipped++;qInc('shipped');addXp(productXp(o.p));
  if(o.rush&&(o.age||0)<=1&&!counter){const rb=Math.round(price*.4*100)/100;earn('Rush bonus',rb);S.revenue+=rb;log(`Rush order packed in time: +${fmt(rb)} bonus.`,'good')}
  const priceB=clamp((Pd.ref/price-1)*1.5,-.6,.4);
  if(counter){review(clamp(4.4+S.qual[o.p]+supportPower()+priceB+r(-.45,.3),1,5));return null}
  return{p:o.p,price,priceB,cat,ch:key,dest:o.dest||'nl',age:o.age||0,q:S.qual[o.p]};
}
function payoutAdd(cat,a,ch){
  const d=payoutDays(ch);
  if(d<=0){earn(cat,a);return}
  const day=S.day+d,P=payoutsOf(),x=P.find(e=>e.d===day&&e.c===cat);
  if(x)x.a+=a;else P.push({d:day,a,c:cat});
}
function shipDispatch(rec,bulk){
  const chn=CHANNELS[rec.ch]||CHANNELS.web;
  payoutAdd(rec.cat,rec.price,rec.ch);
  spend(chn.feeName,(rec.price*chn.fee+chn.fix)*(1-Math.min(.5,upv('fee'))));
  const dest=rec.dest,cid=carrierFor(dest),C=CARRIERS[cid],D=DESTS[dest];
  spend('Shipping',parcelCost(rec.p,dest,cid)*(bulk||1));spend('Packaging',.4);
  S.dstat.sent++;
  const td=C.days*D.days;
  S.parcels.push({id:nid(),p:rec.p,price:rec.price,due:S.abs+td*12,dest,cid,age:rec.age,pb:rec.priceB,q:rec.q,td});
}
ship=function(o,counter){const rec=shipSale(o,counter);if(rec)shipDispatch(rec,1)};   /* counter sales and fulfilment partners skip the bay */
packOne=function(){
  const i=packableIdx();if(i<0||bayFull())return false;
  const o=S.orders.splice(i,1)[0],rec=shipSale(o,false);if(rec)bayOf().push(rec);
  if(dspLv('auto')>=1&&bayFull())sendBay();
  return true;
};
function sendBay(){
  const bay=bayOf(),n=bay.length;if(!n)return 0;
  const bulk=1-(n>=20?Math.min(.32,.04*dspLv('bulk')):0),recs=bay.splice(0);
  for(const r of recs)shipDispatch(r,bulk);
  return n;
}
function payoutTick(){
  const P=payoutsOf(),keep=[];let tot=0;
  for(const e of P){if(e.d<=S.day){earn(e.c,e.a);tot+=e.a}else{e.d=Math.min(e.d,S.day+1);keep.push(e)}}
  S.payouts=keep;
  if(tot>0&&!awayMode)log(`Payments cleared: +${fmt(tot)}.`,'good');
}
const _eod1=endOfDay;endOfDay=function(){_eod1();payoutTick()};
const _hs1=hourStep;
hourStep=function(){
  _hs1();if(S.over)return;
  const bay=bayOf();if(!bay.length)return;
  if(pickHours().includes(S.hour)){const n=sendBay();if(n&&!awayMode)log(`The courier collected ${n} parcel${n>1?'s':''}.`,'good')}
  else if(dspLv('auto')>=2&&bay.length>=Math.ceil(dispCap()*.5))sendBay();
};
/* logistics people and machines now run the dispatch bay */
delete PASSIVE.logistics;
const _staffTask1=staffTask;
staffTask=function(s){
  if(s.role==='logistics'){
    if(bayOf().length>=Math.max(5,Math.ceil(dispCap()*.4))||bayFull()){const n=sendBay();return{h:.25,act:`Dispatching ${n} parcels`}}
    gainXp(s,.03);return null;
  }
  if(s.role==='packer'&&(bayFull()||packableIdx()<0))return null;
  return _staffTask1(s);
};
const _idleWhy1=typeof idleWhy==='function'?idleWhy:null;
idleWhy=function(s){
  if(s.role==='logistics')return 'Optimising shipping rates';
  if(s.role==='packer'&&bayFull()&&packableIdx()>=0)return 'Dispatch bay is full';
  return _idleWhy1?_idleWhy1(s):'';
};
Object.assign(A,{
  pack(){if(packableIdx()<0)return;if(bayFull())return toast('The dispatch bay is full. Send it first');if(useE(E.pack())&&packOne()){did('Orders packed');toast('Order packed')}},
  packAll(){let n=0;while(packableIdx()>=0&&!bayFull()&&S.energy>=E.pack()){S.energy-=E.pack();packOne();n++}if(n)did('Orders packed',n);toast(n?`Packed ${n} order${n>1?'s':''}`:bayFull()?'The dispatch bay is full':'You are too tired')},
  sendBay(){if(!bayOf().length)return toast('Nothing to send yet');if(!useE(SEND_E))return;const n=sendBay();did('Batches sent');toast(`Sent ${n} parcel${n>1?'s':''}`)},
  dspBuy(d){const u=DSP_UP.find(x=>x.id===d.k);if(!u)return;const l=dspLv(u.id);if(l>=u.max)return;const c=u.cost(l);if(S.cash<c)return toast('Not enough cash');spend('Dispatch upgrades',c);dsp()[u.id]=l+1;log(`${u.n} upgraded to level ${l+1}.`,'good');toast(`${u.n} level ${l+1}`);confetti(25);snd('buy')}
});
/* ---- the Shop catalogue ---- */
const DSP_UP=[
  {id:'racks',n:'Packing racks',max:10,cost:l=>Math.round(1500*Math.pow(1.7,l)/50)*50,now:l=>`Bay holds ${50+25*l} orders`,next:l=>`+25 orders (${75+25*l})`},
  {id:'pick',n:'Courier pickups',max:4,cost:l=>[2500,8000,25000,90000][l],now:l=>`${PICKUPS[l].length} a day, first at ${PICKUPS[l][0]}:00`,next:l=>`${PICKUPS[l+1].length} pickups a day`},
  {id:'auto',n:'Auto-dispatch',max:2,cost:l=>[6000,40000][l],now:l=>['Only at pickups','Sends the moment the bay is full','Also sends at half full'][l],next:l=>['Send when the bay is full','Send at half full too'][l]},
  {id:'bulk',n:'Bulk carrier contract',max:8,cost:l=>Math.round(3000*Math.pow(1.8,l)/50)*50,now:l=>l?`−${4*l}% shipping on batches of 20 or more`:'No discount',next:l=>`−${4*(l+1)}% shipping on batches of 20+`},
  {id:'pay',n:'Payout fast-track',max:1,cost:()=>4000,now:l=>l?'Paid the moment parcels leave':'Paid the next morning',next:()=>'Get paid the moment parcels leave'},
  {id:'ins',n:'Parcel insurance',max:5,cost:l=>Math.round(5000*Math.pow(2,l)/50)*50,now:l=>l?`${8*l}% fewer lost and damaged parcels`:'No cover',next:l=>`${8*(l+1)}% fewer lost and damaged`}
];
const payoutDaysFor=(ch,l)=>l>=1?0:1;
function dispatchView(){
  const bay=bayOf().length,cap=dispCap(),pend=pendingPay(),nxt=nextPickup();
  let h=`<div class="card dspcard"><span class="bayhero">${uiIcon('dispatch',96)}</span><div class="chk"><span>Dispatch bay</span><b>${bay} of ${cap}</b></div><div class="bar" style="margin:8px 0"><i style="width:${100*bay/cap}%;background:var(--amber)"></i></div>
    <div class="fleet" style="margin-top:6px"><div class="ft"><b>${cap}</b><span>Bay size</span></div><div class="ft"><b>${pickHours().length}</b><span>Pickups a day</span></div><div class="ft"><b>${payoutDaysFor('web',dspLv('pay'))}d</b><span>Webshop payout</span></div><div class="ft good"><b>${fmt(pend)}</b><span>Waiting to clear</span></div></div>
    <div class="s" style="margin-top:8px">Packed orders wait in the bay until the courier comes (next at ${String(nxt%24).padStart(2,'0')}:00) or you send them. Everything you send is paid out the next morning. Logistics people and machines send the bay for you.</div></div>`;
  h+=label('Upgrades','each one makes a step faster or bigger')+'<div class="group">';
  for(const u of DSP_UP){
    const l=dspLv(u.id),max=l>=u.max,c=max?0:u.cost(l);
    h+=`<div class="item" style="align-items:flex-start"><div class="grow"><div class="t">${u.n} <span class="chip amber">Lv ${l}/${u.max}</span></div><div class="s">${u.now(l)}</div>${max?'':`<div class="s" style="color:var(--good)">Next: ${u.next(l)}</div>`}<div class="pips">${Array.from({length:u.max},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('')}</div></div>${max?'<span class="chip good">Maxed</span>':`<button class="btn sm primary" data-a="dspBuy" data-k="${u.id}" ${S.cash<c?'disabled':''}>${fmt(c)}</button>`}</div>`;
  }
  return h+'</div>';
}
function dispatchCard(){
  const bay=bayOf().length,cap=dispCap(),pend=pendingPay();
  return `<div class="card dspcard" style="margin-top:12px"><div class="chk"><span>Dispatch bay · next pickup ${String(nextPickup()%24).padStart(2,'0')}:00</span><b>${bay} / ${cap}</b></div><div class="bar" style="margin:8px 0"><i style="width:${100*bay/cap}%;background:${bay>=cap?'var(--bad)':'var(--amber)'}"></i></div>
    <div class="evrow"><span class="s">${pend>0?`${fmt(pend)} waiting to clear`:'No payments waiting'}</span><span style="display:flex;gap:6px"><button class="btn sm" data-a="shopGo" data-k="dispatch">Upgrades</button><button class="btn sm primary" data-a="sendBay" ${bay?'':'disabled'}>Send now ${en(SEND_E)}</button></span></div></div>`;
}

/* 4.19: the fulfilment partner packs orders into the dispatch bay one by one, and its van takes the whole bay when it is full.
   Couriers still collect at their pickup hours. */
const fpOrders=()=>S.orders.filter(o=>freeStock(o.p)>0&&CARRIERS[carrierFor(o.dest||'nl')].auto);
function fpPack(){
  if(bayFull()){const n=sendBay();if(n&&!awayMode&&!simulating){log(`Bay full: the fulfilment partner's van took ${n} parcels.`,'good');if(typeof snd==='function')snd('send')}}
  const i=S.orders.findIndex(o=>freeStock(o.p)>0&&CARRIERS[carrierFor(o.dest||'nl')].auto);if(i<0)return false;
  const o=S.orders.splice(i,1)[0],rec=shipSale(o,false);if(rec)bayOf().push(rec);
  did('Orders packed by the fulfilment partner',1,true);
  if(bayFull()){const n=sendBay();if(n&&!awayMode&&!simulating){log(`Bay full: the fulfilment partner's van took ${n} parcels.`,'good');if(typeof snd==='function')snd('send')}}
  return true;
}
const _simFP=sim;sim=function(dt){
  _simFP(dt);if(S.over)return;
  const q=fpOrders().length;if(!q){S.fpAcc=0;return}
  S.fpAcc=(S.fpAcc||0)+dt*(8+q*.4);   /* packs about 8 an hour, faster when orders pile up */
  while(S.fpAcc>=1){S.fpAcc-=1;if(!fpPack())break}
};
