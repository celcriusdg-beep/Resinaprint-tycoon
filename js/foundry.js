/* Foundry (4.33): metal casting, a whole new section with its own tab. Opens once all six Singularity printers are forged.
   Buy the foundry, then casting machines in five tiers (€10M to €500M). Machines burn money every day and wear with every pour:
   service them or they cast defects and break down. Buy metal by the kilo, cast metal products, sell them to collectors and take on
   huge projects for museums, cities and film studios. The foundry stays yours through rebirths. */
const FD_COST=25e6;
const METALS={
  al:{n:'Aluminium',kg:3,col:'#c9d2dc',step:[100,1000,10000]},
  brass:{n:'Brass',kg:8,col:'#d9b45a',step:[100,1000,10000]},
  bronze:{n:'Bronze',kg:11,col:'#c07a3f',step:[100,1000,10000]},
  steel:{n:'Stainless steel',kg:6,col:'#9aa6b2',step:[100,1000,10000]},
  silver:{n:'Silver',kg:850,col:'#e6ebf2',step:[1,10,100]},
  ti:{n:'Titanium',kg:40,col:'#8f9bb0',step:[100,1000,5000]},
  gold:{n:'Gold',kg:60000,col:'#ffd36b',step:[1,5,20]}
};
const FD_TIERS=[
  {id:'sand',n:'Sand-casting cell',cost:10e6,up:40e3,batch:20,h:6,wear:3,col:'#c07a3f',d:'Packed sand moulds, a gas crucible and a lot of sweat. Aluminium, brass and bronze.'},
  {id:'wax',n:'Lost-wax investment line',cost:30e6,up:110e3,batch:30,h:6,wear:2.6,col:'#e6ebf2',d:'Wax copies, ceramic shells, molten metal. Fine detail in silver and steel.'},
  {id:'die',n:'High-pressure die-cast press',cost:80e6,up:280e3,batch:120,h:4,wear:3.5,col:'#9aa6b2',d:'Steel dies slam shut at 1,000 bar. Mass production in aluminium.'},
  {id:'vac',n:'Vacuum titanium caster',cost:200e6,up:650e3,batch:40,h:6,wear:2.2,col:'#8f9bb0',d:'Casting in a vacuum chamber: titanium and gold without a single bubble.'},
  {id:'hip',n:'Binder-jet & HIP foundry',cost:500e6,up:1.5e6,batch:80,h:5,wear:1.6,col:'#ffd36b',d:'Printed metal, pressed at 1,000 bar and 1,200 °C. Life-size pieces.'}
];
const FD_PROD={
  m_kit:{n:'Aluminium mecha kit',t:0,m:'al',kg:1.5,ref:2400,base:40},
  m_brass:{n:'Brass desk statue',t:0,m:'brass',kg:3,ref:5500,base:40},
  m_bronze:{n:'Bronze figure 1/6',t:0,m:'bronze',kg:4,ref:8500,base:35},
  m_coin:{n:'Silver collector coin set',t:1,m:'silver',kg:.35,ref:9000,base:45},
  m_katana:{n:'Stainless steel katana',t:1,m:'steel',kg:1.5,ref:14000,base:40},
  m_bronze4:{n:'Bronze statue 1/4',t:1,m:'bronze',kg:14,ref:19000,base:30},
  m_car:{n:'Die-cast collector car 1/18',t:2,m:'al',kg:.9,ref:1800,base:300},
  m_army:{n:'Metal miniature army box',t:2,m:'brass',kg:1.2,ref:3200,base:260},
  m_mech35:{n:'Aluminium mecha 1/35',t:2,m:'al',kg:4,ref:7500,base:200},
  m_ti:{n:'Titanium figure 1/4',t:3,m:'ti',kg:6,ref:48000,base:20},
  m_armor:{n:'Steel armour replica',t:3,m:'steel',kg:18,ref:32000,base:22},
  m_gold:{n:'Gold-plated statue 1/4',t:3,m:'gold',kg:.1,ref:75000,base:14},
  m_life:{n:'Bronze life-size statue',t:4,m:'bronze',kg:220,ref:420000,base:8},
  m_head:{n:'Titanium mecha head 1:1',t:4,m:'ti',kg:160,ref:900000,base:5},
  m_throne:{n:'Gold-leaf throne replica',t:4,m:'gold',kg:1.2,ref:1500000,base:3}
};
const FD_UP=[
  {id:'induction',n:'Induction furnaces',max:3,cost:15e6,d:l=>`Every pour ${l*15}% faster`},
  {id:'robots',n:'Shell-coating robots',max:3,cost:25e6,d:l=>`+${l*20}% pieces per pour`},
  {id:'xray',n:'X-ray inspection',max:1,cost:40e6,d:()=>`Half the defects`},
  {id:'patina',n:'Patina & polish studio',max:3,cost:30e6,d:l=>`Metal pieces are worth ${l*15}% more`},
  {id:'recycle',n:'Scrap recycling',max:1,cost:12e6,d:()=>`Defects give back 80% of their metal`},
  {id:'crew',n:'Foundry crew',max:1,cost:50e6,d:()=>`Services machines by itself below 50%`},
  {id:'heat',n:'Heat recovery',max:2,cost:60e6,d:l=>`Upkeep ${l*25}% lower`},
  {id:'gallery',n:'Gallery network',max:2,cost:80e6,d:l=>`+${l*40}% project pay and +${l*25}% demand`}
];
const FD_CLIENTS=['Rijksmuseum shop','City of Rotterdam','Pinewood film studio','Resinaland theme park','A Saudi collector','Tokyo game studio','Louvre gift shop','Comic-con Europe','A Hollywood director','Esports world finals'];
const fdOf=()=>S.fnd||(S.fnd={own:0,mach:[],metal:{},stock:{},listed:{},price:{},up:{},board:[],act:[],fame:0,sold:0,rev:0,made:0,next:0,nid:1});
const fdUnlocked=()=>!!(S.fnd&&S.fnd.own)||((S.reb&&S.reb.count)||0)>=3&&(typeof SING_P!=='undefined'&&S.sing&&SING_P.every(x=>(S.sing.forged[x.k]||0)>0));
const fdUp=id=>(S.fnd&&S.fnd.up[id])||0;
const fdTierOwned=()=>Math.max(-1,...fdOf().mach.map(m=>m.t));
const fdPrice=k=>fdOf().price[k]||Math.round(FD_PROD[k].ref*(1+.15*fdUp('patina')));
const fdFame=()=>1+Math.min(1.5,fdOf().sold/3000);
const fdDemand=k=>{const P=FD_PROD[k],r=P.ref*(1+.15*fdUp('patina'))/fdPrice(k);return P.base*Math.pow(r,2.2)*fdFame()*(1+.25*fdUp('gallery'))*(typeof rbMult==='function'?1:1)};
const fdBatch=T=>Math.round(T.batch*(1+.2*fdUp('robots')));
const fdHours=T=>T.h*(1-.15*fdUp('induction'));
const fdUpkeep=m=>FD_TIERS[m.t].up*(1-.25*fdUp('heat'));
const fdCanMake=k=>FD_PROD[k].t<=fdTierOwned();
/* ---------- simulation ---------- */
function fdHour(){
  const F=S.fnd;if(!F||!F.own)return;
  for(const m of F.mach){
    if(m.broken||m.off||!m.prod)continue;const T=FD_TIERS[m.t],P=FD_PROD[m.prod];if(!P||P.t>m.t){m.prod=null;continue}
    if(fdUp('crew')&&m.cond<50)fdService(m,true);
    if(!m.run){const need=P.kg*fdBatch(T);if((F.metal[P.m]||0)<need){m.wait=1;continue}F.metal[P.m]-=need;m.run={k:m.prod,n:fdBatch(T),prog:0};m.wait=0}
    m.run.prog+=1/fdHours(T);
    if(m.run.prog>=1){
      const def=Math.min(.6,(100-m.cond)/220*(fdUp('xray')?.5:1)),bad=Math.round(m.run.n*def*Math.random()*2),good=m.run.n-bad;
      F.stock[m.run.k]=(F.stock[m.run.k]||0)+good;F.made+=good;if(bad&&fdUp('recycle'))F.metal[P.m]=(F.metal[P.m]||0)+P.kg*bad*.8;
      m.cond=Math.max(0,m.cond-T.wear*(.8+Math.random()*.4));m.pours=(m.pours||0)+1;
      if(bad&&!awayMode&&!simulating&&bad>m.run.n*.2)log(`${T.n}: ${bad} of ${m.run.n} pieces came out with defects. Service the machine.`,'bad');
      if(m.cond<25&&Math.random()<.15){m.broken=1;log(`${T.n} broke down. Repair it in the Foundry.`,'bad');if(!awayMode&&!simulating&&typeof snd==='function')snd('bad')}
      m.run=null;
    }
  }
}
function fdDay(){
  const F=S.fnd;if(!F||!F.own)return;
  const up=F.mach.filter(m=>!m.off).reduce((a,m)=>a+fdUpkeep(m),0);if(up)spend('Foundry upkeep',up);
  let rev=0;
  for(const k in FD_PROD){if(!F.listed[k]||!(F.stock[k]>0))continue;const n=Math.min(F.stock[k],poisson(fdDemand(k)));if(!n)continue;F.stock[k]-=n;F.sold+=n;rev+=n*fdPrice(k)}
  if(rev){earn('Metal sales',rev);F.rev+=rev;S.revenue+=rev}
  for(const p of [...F.act])if(S.day>p.due){F.act=F.act.filter(x=>x!==p);F.fame=Math.max(0,F.fame-1);F.sold=Math.max(0,F.sold-50);log(`Foundry project for ${p.who} failed: the deadline passed.`,'bad')}
  F.board=F.board.filter(b=>b.exp>=S.day);
  if(S.day>=F.next&&F.board.length<3&&fdTierOwned()>=0){fdNewProject();F.next=S.day+2}
}
function fdNewProject(){
  const ks=Object.keys(FD_PROD).filter(fdCanMake);if(!ks.length)return;const k=pick(ks),P=FD_PROD[k];
  const qty=Math.max(1,Math.round(fdBatch(FD_TIERS[P.t])*(1+Math.random()*2)*(P.t>=4?.25:1)));
  fdOf().board.push({id:fdOf().nid++,who:pick(FD_CLIENTS),k,qty,days:4+Math.floor(Math.random()*5),pay:Math.round(qty*P.ref*(2+Math.random())*(1+.4*fdUp('gallery'))/1000)*1000,exp:S.day+3});
}
function fdService(m,auto){const T=FD_TIERS[m.t],c=Math.round(T.cost*.02*(100-m.cond)/100);if(S.cash<c){if(!auto)toast('Not enough cash');return false}if(c)spend('Foundry service',c);m.cond=100;return true}
const _hsFD=hourStep;hourStep=function(){_hsFD();if(!S.over&&S.fnd&&S.fnd.own)fdHour()};
const _eodFD=endOfDay;endOfDay=function(){_eodFD();if(S.fnd&&S.fnd.own)fdDay()};
/* the foundry survives rebirth */
const _rbFD=doRebirth;doRebirth=function(d){const o=S.fnd;const g=_rbFD(d);if(o){S.fnd=o;o.mach.forEach(m=>{m.run=null;m.off=1});o.act=[]}return g};
const _rsFD=restartRun;restartRun=function(){const o=S.fnd;_rsFD();if(o){S.fnd=o;o.mach.forEach(m=>{m.run=null;m.off=1});o.act=[]}};
Object.assign(A,{
  fdBuy(){if(!fdUnlocked())return;if(S.cash<FD_COST)return toast('Not enough cash');spend('Foundry',FD_COST);fdOf().own=1;log('You bought the foundry. Metal casting is open: buy your first casting machine.','good');if(typeof confetti==='function')confetti(150);if(typeof snd==='function')snd('level')},
  fdMach(d){const T=FD_TIERS[+d.t];if(!T||!fdOf().own)return;if(S.cash<T.cost)return toast('Not enough cash');if(fdOf().mach.length>=fdBays())return toast('No free bay. Expand the foundry hall');
    spend('Foundry machines',T.cost);const F=fdOf();const k=Object.keys(FD_PROD).find(x=>FD_PROD[x].t===+d.t);F.mach.push({id:F.nid++,t:+d.t,prod:k,cond:100});F.listed[k]=true;toast(`${T.n} installed`);if(typeof snd==='function')snd('buy');if(typeof confetti==='function')confetti(60)},
  fdProd(d){const m=fdOf().mach.find(x=>x.id==d.id);if(!m)return;const ks=Object.keys(FD_PROD).filter(k=>FD_PROD[k].t<=m.t);m.prod=ks[(ks.indexOf(m.prod)+1)%ks.length];fdOf().listed[m.prod]=true},
  fdServ(d){const m=fdOf().mach.find(x=>x.id==d.id);if(!m)return;if(m.broken){const c=Math.round(FD_TIERS[m.t].cost*.08);if(S.cash<c)return toast('Not enough cash');spend('Foundry repairs',c);m.broken=0;m.cond=100;toast('Repaired')}else if(fdService(m))toast('Serviced')},
  fdTog(d){const m=fdOf().mach.find(x=>x.id==d.id);if(!m)return;m.off=m.off?0:1;toast(m.off?'Switched off: no upkeep':'Switched on')},
  fdSell(d){const F=fdOf(),m=F.mach.find(x=>x.id==d.id);if(!m)return;const back=Math.round(FD_TIERS[m.t].cost*.4);confirmBox(`Sell the ${FD_TIERS[m.t].n}?`,`You get ${fmt(back)} back.`,()=>{F.mach=F.mach.filter(x=>x!==m);earn('Machine sales',back)})},
  fdMetal(d){const M=METALS[d.k],kg=+d.n,c=M.kg*kg;if(S.cash<c)return toast('Not enough cash');spend('Metal',c);fdOf().metal[d.k]=(fdOf().metal[d.k]||0)+kg;toast(`+${nf(kg)} kg ${M.n.toLowerCase()}`)},
  fdList(d){const F=fdOf();F.listed[d.k]=!F.listed[d.k]},
  fdPrice(d){const F=fdOf();F.price[d.k]=Math.max(100,Math.round(fdPrice(d.k)*(1+(+d.d)*.05)/50)*50)},
  fdUpg(d){const U=FD_UP.find(x=>x.id===d.k),l=fdUp(d.k);if(!U||l>=U.max)return;const c=U.cost*(l+1);if(S.cash<c)return toast('Not enough cash');spend('Foundry upgrades',c);fdOf().up[d.k]=l+1;toast(`${U.n} ${l+1}`);if(typeof snd==='function')snd('buy')},
  fdTake(d){const F=fdOf(),b=F.board.find(x=>x.id==d.id);if(!b)return;if(F.act.length>=3)return toast('Three projects at a time');F.board=F.board.filter(x=>x!==b);F.act.push({...b,due:S.day+b.days});toast(`Project accepted: ${b.who}`)},
  fdDeliver(d){const F=fdOf(),p=F.act.find(x=>x.id==d.id);if(!p)return;if((F.stock[p.k]||0)<p.qty)return toast('Not enough in stock yet');F.stock[p.k]-=p.qty;F.act=F.act.filter(x=>x!==p);F.sold+=p.qty;F.fame++;earn('Foundry projects',p.pay);F.rev+=p.pay;S.revenue+=p.pay;
    log(`Delivered ${p.qty} × ${FD_PROD[p.k].n.toLowerCase()} to ${p.who}: +${fmt(p.pay)}.`,'good');if(typeof confetti==='function')confetti(90);if(typeof snd==='function')snd('cash')},
  fdHall(){const F=fdOf(),c=fdHallCost();if(!c)return;if(S.cash<c)return toast('Not enough cash');spend('Foundry',c);F.hall=(F.hall||0)+1;toast(`The foundry hall now fits ${fdBays()} machines`)}
});
const fdBays=()=>4+4*((S.fnd&&S.fnd.hall)||0);
const fdHallCost=()=>{const h=(S.fnd&&S.fnd.hall)||0;return h>=3?0:[60e6,180e6,450e6][h]};
/* ---------- art ---------- */
function fdMachArt(m){
  const T=FD_TIERS[m.t],P=m.prod&&FD_PROD[m.prod],mc=P?METALS[P.m].col:'#ff8a3c',on=!!m.run&&!m.broken,c=T.col;
  return `<svg viewBox="0 0 120 90" class="fd-art ${on?'on':''} ${m.broken?'broken':''}" style="--mc:${mc};--c:${c}">
    <rect x="0" y="78" width="120" height="12" fill="#22252d"/>
    <rect x="12" y="30" width="44" height="48" rx="6" fill="#3a3e48"/><rect x="16" y="34" width="36" height="16" rx="4" fill="#1b1d24"/>
    <rect x="18" y="36" width="32" height="12" rx="3" fill="#ff7a2a" class="fd-glow"/>
    <rect x="12" y="56" width="44" height="4" fill="${c}"/>
    <path d="M56 40h14l6 6" stroke="#5b606c" stroke-width="5" fill="none"/>
    <g class="fd-ladle"><path d="M66 38h22l-3 12h-16z" fill="#4a4f5c"/><path d="M69 41h16l-2 7h-12z" fill="#ff8a3c" class="fd-glow"/></g>
    <path d="M80 50q1 10 0 20" stroke="var(--mc)" stroke-width="3.5" fill="none" class="fd-pour"/>
    <rect x="68" y="66" width="34" height="12" rx="2" fill="#5b606c"/><rect x="72" y="68" width="26" height="6" rx="1.5" fill="var(--mc)" class="fd-mould"/>
    ${[0,1,2].map(i=>`<circle cx="${30+i*8}" cy="24" r="${3+i}" fill="#ffffff22" class="fd-smoke s${i}"/>`).join('')}
    ${m.broken?'<path d="M20 20l16 16M36 20L20 36" stroke="#ff6d82" stroke-width="4"/>':''}
  </svg>`;
}
function fdHeroArt(){
  return `<svg viewBox="0 0 320 120" class="fd-hero-art"><defs><linearGradient id="fdsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a16"/><stop offset="1" stop-color="#120c0a"/></linearGradient><radialGradient id="fdglow" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#ff8a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a3c" stop-opacity="0"/></radialGradient></defs>
    <rect width="320" height="120" fill="url(#fdsky)"/><rect width="320" height="120" fill="url(#fdglow)" class="fd-glow"/>
    <path d="M20 100V50l40-20v20l40-20v20l40-20v70z" fill="#2c2f38"/><rect x="190" y="20" width="14" height="80" fill="#3a3e48"/><rect x="214" y="34" width="10" height="66" fill="#3a3e48"/>
    ${[0,1,2].map(i=>`<circle cx="${197+i*3}" cy="${12-i*6}" r="${5+i*2}" fill="#ffffff18" class="fd-smoke s${i}"/>`).join('')}
    ${[0,1,2,3,4,5].map(i=>`<rect x="${30+i*24}" y="72" width="12" height="10" fill="#ff8a3c" class="fd-glow" style="animation-delay:${-i*.4}s"/>`).join('')}
    <rect x="236" y="60" width="70" height="40" fill="#2c2f38"/><path d="M236 60l35-18 35 18z" fill="#3a3e48"/><text x="271" y="86" text-anchor="middle" font-size="10" font-weight="900" fill="#ffb547" letter-spacing="1.5">FOUNDRY</text>
    <rect y="100" width="320" height="20" fill="#18191e"/></svg>`;
}
/* ---------- views ---------- */
if(!sub.fd)sub.fd='floor';
function fdView(){
  const F=fdOf();
  if(!fdUnlocked())return `<div class="card" style="margin-top:16px"><div class="t">Foundry</div><div class="s">Forge all six Singularity printers to open metal casting.</div></div>`;
  if(!F.own)return `<div class="card fd-hero">${fdHeroArt()}<div class="t" style="margin-top:12px">The Foundry</div><div class="s">A whole new business beside your resin empire: metal casting. Buy the foundry, then casting machines from €10M to €500M. They burn money every day and wear with every pour, but metal pieces sell for thousands to millions, and museums, cities and film studios pay fortunes for big projects. The foundry stays yours through every rebirth.</div><div class="opts"><button class="btn primary" data-a="fdBuy" ${S.cash<FD_COST?'disabled':''}>Buy the foundry · ${fmt(FD_COST)}</button></div></div>`;
  const up=F.mach.filter(m=>!m.off).reduce((a,m)=>a+fdUpkeep(m),0);
  let h=`<div class="fd-top">${fdHeroArt()}<div class="fd-sum"><div><b>${F.mach.length}/${fdBays()}</b><span>machines</span></div><div><b>${fmt(up)}</b><span>upkeep a day</span></div><div><b>${fmt(F.rev)}</b><span>earned</span></div><div><b>×${fdFame().toFixed(2)}</b><span>fame</span></div></div></div>`;
  h+=segs('fd',[['floor','Floor',F.mach.filter(m=>m.broken||m.cond<40).length],['metal','Metal'],['prod','Products'],['proj','Projects',F.board.length],['up','Upgrades']]);
  if(sub.fd==='metal')return h+fdMetalView();
  if(sub.fd==='prod')return h+fdProdView();
  if(sub.fd==='proj')return h+fdProjView();
  if(sub.fd==='up')return h+fdUpView();
  h+=label('Casting floor',`${F.mach.length} of ${fdBays()} bays`);
  h+=F.mach.length?F.mach.map(m=>{const T=FD_TIERS[m.t],P=m.prod&&FD_PROD[m.prod],st=m.off?'<span class="chip">Off</span>':m.broken?'<span class="chip bad">Broken</span>':m.wait?'<span class="chip amber">No metal</span>':m.run?'<span class="chip good">Pouring</span>':'<span class="chip">Idle</span>';
    return `<div class="card fd-m"><div class="fd-mh">${fdMachArt(m)}<div class="grow"><div class="t">${T.n} ${st}</div><div class="s">${P?`${P.n} · ${fdBatch(T)} per pour · ${fdHours(T).toFixed(1)} h · ${P.kg*fdBatch(T)>=1?nf(Math.round(P.kg*fdBatch(T))):P.kg*fdBatch(T)} kg ${METALS[P.m].n.toLowerCase()}`:'Pick a product'}</div>
      <div class="fd-cond"><span>Condition</span>${bar(m.cond,m.cond>=60?'var(--good)':m.cond>=30?'var(--warn)':'var(--bad)')}<b>${Math.round(m.cond)}%</b></div>${m.run?`<div class="fd-cond"><span>Pour</span>${bar(m.run.prog*100,'var(--mc,#ff8a3c)')}<b>${Math.round(m.run.prog*100)}%</b></div>`:''}</div></div>
      <div class="opts"><button class="btn sm" data-a="fdProd" data-id="${m.id}">Product: ${P?P.n.split(' ').slice(0,2).join(' '):'none'} ↻</button><button class="btn sm ${m.broken||m.cond<50?'primary':''}" data-a="fdServ" data-id="${m.id}">${m.broken?`Repair ${fmt(Math.round(T.cost*.08))}`:`Service ${fmt(Math.round(T.cost*.02*(100-m.cond)/100))}`}</button><button class="btn sm ${m.off?'primary':'ghost'}" data-a="fdTog" data-id="${m.id}">${m.off?'Switch on':'Switch off'}</button><button class="btn sm ghost" data-a="fdSell" data-id="${m.id}">Sell</button></div>
      <div class="s" style="margin-top:6px">${m.off?'Switched off: no upkeep, no casting':`Upkeep ${fmt(fdUpkeep(m))} a day`} · ${m.pours||0} pours</div></div>`}).join(''):`<div class="card"><div class="s">No machines yet. Buy your first one below.</div></div>`;
  h+=label('Casting machines','five tiers')+`<div class="group">${FD_TIERS.map((T,i)=>`<div class="item fd-cat"><div class="fd-tier" style="--c:${T.col}">${i+1}</div><div class="grow"><div class="t">${T.n}</div><div class="s">${T.d} ${fdBatch(T)} pieces every ${fdHours(T).toFixed(1)} h · upkeep ${fmt(T.up)}/day</div></div><button class="btn sm primary" data-a="fdMach" data-t="${i}" ${S.cash<T.cost||F.mach.length>=fdBays()?'disabled':''}>${fmt(T.cost)}</button></div>`).join('')}</div>`;
  const hc=fdHallCost();if(hc)h+=`<div class="opts"><button class="btn sm" data-a="fdHall" ${S.cash<hc?'disabled':''}>Expand the hall to ${fdBays()+4} bays · ${fmt(hc)}</button></div>`;
  return h;
}
function fdMetalView(){
  const F=fdOf();
  return label('Metal store','priced per kilo')+`<div class="group">${Object.entries(METALS).map(([k,M])=>`<div class="item fd-metal"><i class="fd-ingot" style="--mc:${M.col}"></i><div class="grow"><div class="t">${M.n}</div><div class="s">${fmt(M.kg)}/kg · <b style="color:var(--ink)">${nf(Math.round(F.metal[k]||0))} kg</b> in stock</div></div><div class="fd-buy">${M.step.map(n=>`<button class="btn sm" data-a="fdMetal" data-k="${k}" data-n="${n}" ${S.cash<M.kg*n?'disabled':''}>${n>=1000?n/1000+' t':n+' kg'}</button>`).join('')}</div></div>`).join('')}</div>`;
}
function fdProdView(){
  const F=fdOf(),t=fdTierOwned();
  return label('Metal products',`${Object.values(FD_PROD).filter(P=>P.t<=t).length} you can cast`)+`<div class="group">${Object.entries(FD_PROD).map(([k,P])=>{const can=P.t<=t,d=fdDemand(k);
    return `<div class="item fd-p ${can?'':'lock'}"><i class="fd-ingot" style="--mc:${METALS[P.m].col}"></i><div class="grow"><div class="t">${P.n} ${can?(F.listed[k]?'<span class="chip good">Selling</span>':'<span class="chip">Not listed</span>'):`<span class="chip">Tier ${P.t+1}</span>`}</div><div class="s">${P.kg} kg ${METALS[P.m].n.toLowerCase()} · ${F.stock[k]||0} in stock${can?` · ${d.toFixed(1)} sold a day`:''}</div></div>
      ${can?`<div style="display:grid;gap:6px;justify-items:end"><div class="stepper"><button class="btn sm" data-a="fdPrice" data-k="${k}" data-d="-1">−</button><b>${fmt(fdPrice(k))}</b><button class="btn sm" data-a="fdPrice" data-k="${k}" data-d="1">+</button></div><button class="btn sm ${F.listed[k]?'ghost':'primary'}" data-a="fdList" data-k="${k}">${F.listed[k]?'Unlist':'List'}</button></div>`:''}</div>`}).join('')}</div>`;
}
function fdProjView(){
  const F=fdOf();let h=label('Running projects',`${F.act.length} of 3`);
  h+=F.act.length?F.act.map(p=>{const have=F.stock[p.k]||0,dl=p.due-S.day;return `<div class="card fd-pj"><div class="t">${p.who}</div><div class="s">${p.qty} × ${FD_PROD[p.k].n} · ${have}/${p.qty} in stock · <span class="${dl<=1?'bad':''}">${dl} d left</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100,have/p.qty*100)}%"></i></div><div class="opts"><button class="btn sm primary" data-a="fdDeliver" data-id="${p.id}" ${have<p.qty?'disabled':''}>Deliver · ${fmt(p.pay)}</button></div></div>`}).join(''):`<div class="card"><div class="s">No running projects.</div></div>`;
  h+=label('Offers','new ones every 2 days');
  h+=F.board.length?F.board.map(b=>`<div class="card fd-pj"><div class="t">${b.who}</div><div class="s">Wants ${b.qty} × ${FD_PROD[b.k].n} within ${b.days} days</div><div class="fd-pay">${fmt(b.pay)}</div><div class="opts"><button class="btn sm primary" data-a="fdTake" data-id="${b.id}" ${F.act.length>=3?'disabled':''}>Accept</button></div></div>`).join(''):`<div class="card"><div class="s">${F.mach.length?'No offers right now.':'Buy a machine and offers start coming in.'}</div></div>`;
  return h;
}
function fdUpView(){
  return label('Foundry upgrades')+`<div class="group">${FD_UP.map(U=>{const l=fdUp(U.id),c=U.cost*(l+1);return item(`${U.n} <span class="chip">${l}/${U.max}</span>`,`${l?U.d(l):'Not built'}${l<U.max?` <span class="f">→ ${U.d(l+1)}</span>`:''}`,l>=U.max?'<span class="chip good">Max</span>':`<button class="btn sm primary" data-a="fdUpg" data-k="${U.id}" ${S.cash<c?'disabled':''}>${fmt(c)}</button>`)}).join('')}</div>`;
}
VIEWS.foundry=fdView;
/* the Foundry tab appears in the bottom bar once it is unlocked */
const FD_TAB=`<button data-tab="foundry" class="fd-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20V10l5 3V10l5 3V7l6 3v10z"/><path d="M8 20v-3h3v3"/><path d="M17 5c0-1 1-2 1-3"/></svg>Foundry</button>`;
const _rFD=render;render=function(){
  const tabs=document.getElementById('tabs');
  if(tabs){const has=tabs.querySelector('[data-tab="foundry"]'),want=fdUnlocked();
    if(want&&!has){tabs.insertAdjacentHTML('beforeend',FD_TAB);tabs.classList.add('six')}else if(!want&&has){has.remove();tabs.classList.remove('six')}}
  if(tab==='foundry'&&!fdUnlocked())tab='studio';
  return _rFD.apply(this,arguments);
};
/* a teaser in the Singularity reactor */
if(typeof singView==='function'){const _svFD=singView;singView=function(){const h=_svFD.apply(this,arguments);if(fdUnlocked())return h;const n=SING_P.filter(x=>S.sing&&S.sing.forged[x.k]).length;return h+`<div class="card" style="margin-top:12px"><div class="t">Next: the Foundry</div><div class="s">Forge all six Singularity printers (${n}/6) to open metal casting: a whole new business with machines from €10M to €500M.</div></div>`}}
