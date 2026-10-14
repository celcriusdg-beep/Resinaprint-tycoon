/* Inventory (3.0): usable items from chests and daily goals. Tap Use in Empire > Items. */
const ITEMS={
  service:{n:'Service kit',r:0,d:'Gives one printer a brand new FEP, tank or screw. Free and instant.',ico:'<path d="M10.5 2.5a3.5 3.5 0 0 0-3 5L2.5 12.5l1 1 5-5a3.5 3.5 0 0 0 5-3l-2 2-1.5-.5-.5-1.5z"/>'},
  bigcoffee:{n:'Double espresso',r:0,d:'Refills 30% of your max energy. No daily limit.',ico:'<path d="M3 6h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M11 7h1.5a1.5 1.5 0 0 1 0 3H11M5 2v2M8 2v2"/>'},
  meal:{n:'Hot meal',r:1,d:'Refills 50% of your max energy.',ico:'<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.2"/>'},
  tskip:{n:'Time skip ticket',r:1,d:'Skips 4 hours for free. Printers keep printing.',ico:'<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>'},
  washall:{n:'Express wash pass',r:1,d:'Washes and cures every unwashed print at once. No energy.',ico:'<path d="M8 2C6 5 3.5 7.5 3.5 10.2a4.5 4.5 0 0 0 9 0C12.5 7.5 10 5 8 2z"/>'},
  packall:{n:'Shipping label book',r:1,d:'Packs and ships up to 10 orders you have stock for. No energy.',ico:'<path d="M2 5l6-3 6 3v6l-6 3-6-3zM2 5l6 3 6-3M8 8v6"/>'},
  boost:{n:'Demand ticket',r:2,d:'+25% demand for 24 hours.',ico:'<path d="M2 12l4-4 3 3 5-6"/><path d="M10 5h4v4"/>'},
  hype:{n:'Viral post pack',r:2,d:'+40 hype.',ico:'<path d="M3 7v3l8 3V4zM3 7l8-3M5 10l1 3"/>'},
  sale:{n:'Free sale pass',r:3,d:'Starts the site-wide sale for 3 days, no cooldown.',ico:'<path d="M2 8.5V2.5h6l6 6-6 6z"/><circle cx="5" cy="5.5" r=".8"/>'},
  xp:{n:'Training manual',r:3,d:'Gives your studio 40% of the XP it needs for the next level.',ico:'<path d="M8 1.8l1.9 3.9 4.2.6-3 3 .7 4.2L8 11.4 4.2 13.5l.7-4.2-3-3 4.2-.6z"/>'},
  train:{n:'Staff course voucher',r:3,d:'Sends one team member on a course: they level up for free.',ico:'<path d="M1.5 6L8 3l6.5 3L8 9zM4 8v3c2 2 6 2 8 0V8"/>'},
  finish:{n:"Painter's masterclass",r:3,d:'Finishes up to 10 figures right now. No energy.',ico:'<path d="M3 13l5-5M7 7l2 2 4-6-6 4z"/>'},
  charm:{n:'Lucky charm',r:4,d:'Your next chest rolls much better rewards.',ico:'<circle cx="6" cy="6" r="2.5"/><circle cx="10" cy="6" r="2.5"/><circle cx="6" cy="10" r="2.5"/><circle cx="10" cy="10" r="2.5"/>'},
  workshop:{n:'Workshop day',r:5,d:'Fully services every printer that is not printing.',ico:'<circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4"/>'}
};
const IKEYS=Object.keys(ITEMS);
const invOf=s=>s.inv||(s.inv={});
const invCount=()=>Object.values(invOf(S)).reduce((a,b)=>a+b,0);
function addItem(k,n){const v=invOf(S);v[k]=(v[k]||0)+(n||1)}
function takeItem(k){const v=invOf(S);if(!(v[k]>0))return false;v[k]--;if(v[k]<=0)delete v[k];return true}
/* chests and goals drop items; better rarities drop better items */
function pickItem(maxR){
  const pool=IKEYS.filter(k=>ITEMS[k].r<=maxR),w=pool.map(k=>1+(ITEMS[k].r>=maxR-2?2:0)),tot=w.reduce((a,b)=>a+b,0);let x=Math.random()*tot,i=0;
  for(;i<pool.length-1;i++){x-=w[i];if(x<0)break}
  return pool[i];
}
const ITEM_CHANCE=[.25,.3,.35,.4,.45,.5,.6,.7,.8,1];
/* targeted items: show a list of targets, apply to the one picked */
function chooseTarget(title,text,list,apply){
  if(!list.length)return false;
  choice(title,text,[...list.map(o=>({l:o.l,f:()=>apply(o.v)})),{l:'Cancel',f:()=>{}}]);return true;
}
const ITEM_USE={
  service(done){
    const ps=S.printers.filter(p=>p.state!=='printing'&&p.cond<100);
    if(!ps.length)return toast('No printer needs a service right now');
    chooseTarget('Service kit','Which printer gets new parts?',ps.map(p=>({v:p,l:`${short(p)} <small>${wearName(PRINTERS[p.type])} ${Math.round(p.cond)}%</small>`})),p=>{if(takeItem('service')){p.cond=100;did('Printers serviced');toast(`${wearNew(PRINTERS[p.type])} fitted on ${short(p)}`)}});
  },
  bigcoffee(){S.energy=Math.min(Math.round(maxE()*1.2),S.energy+Math.round(maxE()*.3));takeItem('bigcoffee');toast('Energy topped up')},
  meal(){S.energy=Math.min(Math.round(maxE()*1.2),S.energy+Math.round(maxE()*.5));takeItem('meal');toast('That hit the spot')},
  tskip(){takeItem('tskip');advance(4);S.lastT=Date.now();afterSim();toast('+4 h')},
  washall(){const n=totUnwashed();if(!n)return toast('Nothing to wash');for(const k of PKEYS){S.cured[k]+=S.unwashed[k];S.unwashed[k]=0}takeItem('washall');toast(`Washed and cured ${n} prints`)},
  packall(){if(packableIdx()<0)return toast('No order has stock yet');let n=0;while(n<10&&packableIdx()>=0&&packOne())n++;did('Orders packed',n);takeItem('packall');toast(`Shipped ${n} order${n>1?'s':''}`)},
  boost(){if(boostMult()>=1.25)return toast('A bigger boost is already running');S.boost={m:1.25,until:S.abs+24};takeItem('boost');toast('+25% demand for a day')},
  hype(){S.hype+=40;takeItem('hype');toast('+40 hype')},
  sale(){if(saleOn())return toast('A sale is already running');S.sale={until:S.abs+72,off:.2};S.hype+=5;takeItem('sale');log('Site-wide sale started: 20% off for 3 days.','amber');toast('Sale live for 3 days')},
  xp(){const n=Math.round(XP_NEED(S.lv)*.4);takeItem('xp');addXp(n);toast(`+${n} XP`)},
  train(){
    const st=S.staff.filter(s=>s.role!=='clerk'&&!s.mach&&(s.lvl||1)<5);
    if(!st.length)return toast('No one on your team can learn more');
    chooseTarget('Staff course voucher','Who goes on the course?',st.map(s=>({v:s,l:`${s.name} <small>${ROLES[s.role].name} · Lv ${s.lvl||1}</small>`})),s=>{if(takeItem('train')){s.xp=XPN[(s.lvl||1)-1];levelUp(s);toast(`${s.name} completed a course`)}});
  },
  finish(){let n=0;while(n<10){const k=nextFinish();if(!k)break;finishOne(k);n++}if(!n)return toast('No prints are waiting to be finished');did('Figures finished',n);takeItem('finish');toast(`Finished ${n} figure${n>1?'s':''}`)},
  charm(){vaultOf(S).charm=true;takeItem('charm');toast('Your next chest is lucky')},
  workshop(){let n=0;for(const p of S.printers)if(p.state!=='printing'&&p.cond<100){p.cond=100;n++}if(!n)return toast('No printer needs a service right now');takeItem('workshop');toast(`${n} printer${n>1?'s':''} serviced`)}
};
Object.assign(A,{useItem(d){if(!(invOf(S)[d.k]>0))return;if(vaultOf(S).charm&&d.k==='charm')return toast('A lucky charm is already active');ITEM_USE[d.k]()},goItems(){tab='empire';sub.empire='items'}});
function itemsView(){
  const v=invOf(S),have=IKEYS.filter(k=>v[k]>0);
  let h=label('Items',`${invCount()} in your bag`);
  if(vaultOf(S).charm)h+=`<div class="card" style="margin-bottom:12px"><div class="t">Lucky charm active</div><div class="s">Your next chest rolls much better rewards.</div></div>`;
  if(!have.length)return h+`<div class="card empty">Nothing here yet. Chests and daily goals drop items.</div>`;
  h+=`<div class="group">`;
  for(const k of have){const I=ITEMS[k],c=RARITIES[Math.min(9,I.r)].col;
    h+=`<div class="item"><div class="perkico" style="color:${c};border-color:${c}"><svg viewBox="0 0 16 16" aria-hidden="true">${I.ico}</svg></div><div class="grow"><div class="t">${I.n} <span class="chip">×${v[k]}</span></div><div class="s">${I.d}</div></div><button class="btn sm primary" data-a="useItem" data-k="${k}">Use</button></div>`}
  return h+'</div>';
}
function itemsCard(){
  const n=invCount();if(!n)return '';
  return `<div class="card vcta" style="margin-top:16px"><div class="perkico" style="width:44px;height:44px"><svg viewBox="0 0 16 16" aria-hidden="true">${ITEMS.service.ico}</svg></div><div class="grow"><div class="t">${n} item${n>1?'s':''} in your bag</div><div class="s">Service kits, drinks, boosts and more.</div></div><button class="btn sm primary" data-a="goItems">Open</button></div>`;
}
