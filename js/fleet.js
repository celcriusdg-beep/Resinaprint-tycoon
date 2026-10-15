/* Fleet (4.2): bikes, vans, box trucks, a promo bus, a vrachtwagen and a trailer rig. They enlarge the dispatch bay, cut shipping, add pickups and cost upkeep. */
const flt=()=>S.fleet||(S.fleet={own:{},up:{},garage:0});
const VEH_ORDER=['bike','van','box','bus','truck','rig'];
const VEH={
  bike:{n:'Cargo bike',nl:'Bakfiets',cost:1200,cap:10,ship:.02,up:6,slots:1,hype:0,d:'Quick local runs. Cheap and charming.',col:'#5bd6a6'},
  van:{n:'Delivery van',nl:'Bestelbus',cost:7500,cap:30,ship:.05,up:18,slots:1,hype:0,d:'The classic. A solid bay boost and cheaper parcels.',col:'#e8b34b'},
  box:{n:'Box truck',nl:'Bakwagen',cost:24000,cap:70,ship:.08,up:45,slots:2,hype:0,d:'Carries whole pallets of figures.',col:'#ff8a5c'},
  bus:{n:'Promo bus',nl:'Promotiebus',cost:38000,cap:20,ship:0,up:60,slots:2,hype:2.5,d:'A wrapped coach that drives your brand around. Hype every day.',col:'#9d89ff'},
  truck:{n:'Freight truck',nl:'Vrachtwagen',cost:90000,cap:160,ship:.12,up:110,slots:3,hype:0,pick:[10,16],d:'A proper lorry. Huge bay, big discounts, two extra pickups.',col:'#5aa6ff'},
  rig:{n:'Trailer rig',nl:'Oplegger',cost:260000,cap:400,ship:.18,up:260,slots:5,hype:0,pick:[8,12,16,20],d:'Tractor and trailer. The end of the line.',col:'#ff7fa8'}
};
const FLT_UP=[
  {id:'garage',n:'Garage bays',max:8,cost:l=>Math.round(4000*Math.pow(1.7,l)/50)*50,now:l=>`${3+2*l} garage slots`,next:l=>`${5+2*l} garage slots`},
  {id:'sort',n:'Load sorting',max:5,cost:l=>Math.round(6000*Math.pow(2,l)/50)*50,now:l=>`+${l*10}% fleet bay capacity`,next:l=>`+${(l+1)*10}% fleet capacity`},
  {id:'gps',n:'Route planner',max:6,cost:l=>Math.round(5000*Math.pow(1.9,l)/50)*50,now:l=>`−${l*2}% shipping on every parcel`,next:l=>`−${(l+1)*2}% shipping`},
  {id:'eng',n:'Efficient engines',max:5,cost:l=>Math.round(4500*Math.pow(1.9,l)/50)*50,now:l=>`−${l*8}% fleet upkeep`,next:l=>`−${(l+1)*8}% upkeep`},
  {id:'wrap',n:'Branded wraps',max:5,cost:l=>Math.round(7000*Math.pow(1.9,l)/50)*50,now:l=>`+${(l*.4).toFixed(1)} hype a day per vehicle with a wrap (needs 1 vehicle)`,next:l=>`+${((l+1)*.4).toFixed(1)} hype a day per vehicle`},
  {id:'night',n:'Night shift drivers',max:1,cost:()=>45000,now:l=>l?'Pickups at 06:00 and 21:00 too':'Day pickups only',next:()=>'Adds pickups at 06:00 and 21:00'}
];
const fUp=k=>flt().up[k]||0;
const fOwn=k=>flt().own[k]||0;
const fCount=()=>VEH_ORDER.reduce((a,k)=>a+fOwn(k),0);
const fSlots=()=>VEH_ORDER.reduce((a,k)=>a+fOwn(k)*VEH[k].slots,0);
const garageCap=()=>3+2*fUp('garage');
function fleetCap(){return Math.round(VEH_ORDER.reduce((a,k)=>a+fOwn(k)*VEH[k].cap,0)*(1+.1*fUp('sort')))}
function fleetShip(){return Math.min(.42,VEH_ORDER.reduce((a,k)=>a+fOwn(k)*VEH[k].ship,0)+.02*fUp('gps'))}
function fleetUpkeep(){return VEH_ORDER.reduce((a,k)=>a+fOwn(k)*VEH[k].up,0)*(1-.08*fUp('eng'))}
function fleetHype(){return VEH_ORDER.reduce((a,k)=>a+fOwn(k)*(VEH[k].hype||0),0)+fCount()*.4*fUp('wrap')}
function fleetPick(){const o=[];for(const k of VEH_ORDER)if(fOwn(k)&&VEH[k].pick)o.push(...VEH[k].pick);if(fUp('night'))o.push(6,21);return o}
const garageSummary=()=>fCount()?`${fCount()} vehicle${fCount()>1?'s':''} · +${fleetCap()} bay`:'Vans, buses, trucks';
/* ---- art: side-view vehicles, wheels turn ---- */
const vwheel=(x,r)=>`<g class="whl" style="transform-origin:${x}px 49px"><circle cx="${x}" cy="49" r="${r}" fill="#14161b"/><circle cx="${x}" cy="49" r="${r*.55}" fill="#8a90a0"/><path d="M${x} ${49-r*.5}v${r}M${x-r*.5} 49h${r}" stroke="#14161b" stroke-width="1.6"/></g>`;
function vehArt(k){
  const c=VEH[k].col,dk='#1b1d24',win='#9fd3ff';
  const body={
    bike:`<path d="M20 49l16-18h14l8 18M36 31l-4-6h-6" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="70" y="26" width="26" height="17" rx="2" fill="${c}"/><rect x="70" y="26" width="26" height="4" fill="#fff" opacity=".25"/><path d="M58 49l12-8M38 31h30" stroke="${c}" stroke-width="3" fill="none"/>${vwheel(22,9)}${vwheel(100,9)}`,
    van:`<path d="M10 46V22c0-3 2-5 5-5h54c3 0 5 1 8 5l14 11c3 2 4 4 4 8v5z" fill="${c}"/><path d="M10 22c0-3 2-5 5-5h54" stroke="#fff" opacity=".3" fill="none"/><path d="M76 24l12 10H76z" fill="${win}"/><rect x="14" y="30" width="46" height="5" fill="${dk}" opacity=".7"/><path d="M12 46h96" stroke="${dk}" stroke-width="3"/>${vwheel(30,8)}${vwheel(88,8)}`,
    box:`<rect x="6" y="12" width="64" height="34" rx="2" fill="#e9ecf3"/><rect x="6" y="40" width="64" height="6" fill="${c}"/><path d="M6 12h64" stroke="#fff" stroke-width="2"/><path d="M72 22h20c3 0 5 1 7 4l8 10c2 3 3 4 3 8v2H72z" fill="${c}"/><path d="M78 26h12l8 10H78z" fill="${win}"/><rect x="14" y="20" width="40" height="8" rx="2" fill="${c}" opacity=".9"/>${vwheel(24,8)}${vwheel(56,8)}${vwheel(98,8)}`,
    bus:`<rect x="6" y="12" width="108" height="34" rx="7" fill="${c}"/><rect x="6" y="12" width="108" height="6" rx="3" fill="#fff" opacity=".25"/>${[14,32,50,68,86].map(x=>`<rect x="${x}" y="19" width="14" height="11" rx="2" fill="${win}"/>`).join('')}<path d="M104 18h6v13h-6z" fill="${win}"/><rect x="6" y="34" width="108" height="5" fill="${dk}" opacity=".55"/><path d="M14 43h60" stroke="#fff" stroke-width="2" opacity=".6" stroke-dasharray="6 4"/>${vwheel(30,8)}${vwheel(90,8)}`,
    truck:`<rect x="4" y="10" width="76" height="34" rx="2" fill="#e9ecf3"/><rect x="4" y="38" width="76" height="6" fill="${c}"/><rect x="14" y="18" width="56" height="12" rx="2" fill="${c}" opacity=".85"/><path d="M82 16h18c4 0 6 2 8 5l8 12c1 2 2 3 2 6v5H82z" fill="${c}"/><path d="M88 20h10l8 11H88z" fill="${win}"/><rect x="82" y="44" width="38" height="2" fill="${dk}"/>${vwheel(20,8)}${vwheel(36,8)}${vwheel(98,8)}`,
    rig:`<rect x="2" y="8" width="84" height="36" rx="2" fill="#e9ecf3"/><rect x="2" y="38" width="84" height="6" fill="${c}"/><path d="M10 14h60" stroke="${c}" stroke-width="5"/><path d="M10 24h40" stroke="${c}" stroke-width="3" opacity=".6"/><rect x="86" y="40" width="6" height="4" fill="${dk}"/><path d="M92 20h14c4 0 6 2 8 5l5 8c1 2 2 3 2 6v5H92z" fill="${c}"/><path d="M98 24h8l6 9H98z" fill="${win}"/><rect x="92" y="14" width="3" height="10" fill="${dk}"/>${vwheel(16,8)}${vwheel(32,8)}${vwheel(48,8)}${vwheel(104,8)}`
  }[k];
  return `<svg viewBox="0 0 124 60" aria-hidden="true"><ellipse cx="62" cy="57" rx="54" ry="3" fill="#000" opacity=".4"/>${body}</svg>`;
}
/* ---- actions, hooks ---- */
Object.assign(A,{
  fleetBuy(d){
    const V=VEH[d.k];if(!V)return;
    if(fSlots()+V.slots>garageCap())return toast('The garage is full. Add garage bays first');
    if(S.cash<V.cost)return toast('Not enough cash');
    spend('Vehicles',V.cost);flt().own[d.k]=fOwn(d.k)+1;log(`${V.n} (${V.nl}) joined the fleet.`,'good');toast(`${V.n} bought`);confetti(30);snd('buy');
  },
  fleetSell(d){
    const V=VEH[d.k];if(!V||!fOwn(d.k))return;
    confirmBox(`Sell a ${V.n.toLowerCase()}?`,`You get ${fmt(V.cost*.5)} back and lose its bay space and discounts.`,()=>{flt().own[d.k]--;earn('Vehicle sale',V.cost*.5);toast('Sold')});
  },
  fleetUp(d){
    const u=FLT_UP.find(x=>x.id===d.k);if(!u)return;const l=fUp(u.id);if(l>=u.max)return;const c=u.cost(l);
    if(S.cash<c)return toast('Not enough cash');spend('Fleet upgrades',c);flt().up[u.id]=l+1;toast(`${u.n} level ${l+1}`);snd('buy')
  }
});
const _parcelCost3=parcelCost;
parcelCost=function(p,dest,cid){const c=_parcelCost3(p,dest,cid),f=fleetShip();return f?Math.max(.5,c*(1-f)):c};
const _eod3=endOfDay;
endOfDay=function(){
  _eod3();
  const u=fleetUpkeep();if(u>0)spend('Fleet upkeep',u);
  const h=fleetHype();if(h>0)S.hype+=h;
};
/* ---- page ---- */
function fleetRoad(){
  const list=[];for(const k of VEH_ORDER)for(let i=0;i<Math.min(fOwn(k),3);i++)list.push(k);
  if(!list.length)return `<div class="froad empty"><span class="s">The garage is empty. Buy a vehicle below.</span></div>`;
  return `<div class="froad"><div class="fline"></div>${list.slice(0,8).map((k,i)=>`<div class="fveh" style="--t:${14+i*2.2}s;--d:${-i*3.1}s;--y:${i%2?0:6}px">${vehArt(k)}</div>`).join('')}</div>`;
}
function fleetView(){
  const cap=fleetCap(),sl=fSlots(),gc=garageCap();
  let h=`<div class="card dspcard"><span class="bayhero">${uiIcon('fleet',96)}</span><div class="chk"><span>Garage</span><b>${sl} of ${gc} slots</b></div><div class="bar" style="margin:8px 0"><i style="width:${Math.min(100,100*sl/gc)}%;background:var(--amber)"></i></div>${fleetRoad()}
    <div class="fleet" style="margin-top:10px"><div class="ft"><b>+${cap}</b><span>Bay space</span></div><div class="ft"><b>−${Math.round(fleetShip()*100)}%</b><span>Shipping</span></div><div class="ft"><b>${fmt(fleetUpkeep())}</b><span>Upkeep / day</span></div><div class="ft good"><b>+${fleetHype().toFixed(1)}</b><span>Hype / day</span></div></div></div>`;
  h+=label('Vehicles','every vehicle takes garage slots and costs upkeep')+'<div class="group">';
  for(const k of VEH_ORDER){
    const V=VEH[k],n=fOwn(k),can=fSlots()+V.slots<=garageCap();
    h+=`<div class="item vitem"><div class="vart">${vehArt(k)}</div><div class="grow"><div class="t">${V.n} <span class="chip">${V.nl}</span>${n?` <span class="chip amber">×${n}</span>`:''}</div><div class="s">${V.d}</div><div class="vst"><span>+${V.cap} bay</span>${V.ship?`<span>−${Math.round(V.ship*100)}% ship</span>`:''}${V.hype?`<span>+${V.hype} hype/d</span>`:''}${V.pick?`<span>+${V.pick.length} pickups</span>`:''}<span>${fmt(V.up)}/d</span><span>${V.slots} slot${V.slots>1?'s':''}</span></div></div><div class="vbtn"><button class="btn sm primary" data-a="fleetBuy" data-k="${k}" ${S.cash<V.cost||!can?'disabled':''}>${fmt(V.cost)}</button>${n?`<button class="btn sm ghost" data-a="fleetSell" data-k="${k}">Sell</button>`:''}</div></div>`;
  }
  h+='</div>'+label('Fleet upgrades','garage, sorting, routes and wraps')+'<div class="group">';
  for(const u of FLT_UP){
    const l=fUp(u.id),max=l>=u.max,c=max?0:u.cost(l);
    h+=`<div class="item" style="align-items:flex-start"><div class="grow"><div class="t">${u.n} <span class="chip amber">Lv ${l}/${u.max}</span></div><div class="s">${u.now(l)}</div>${max?'':`<div class="s" style="color:var(--good)">Next: ${u.next(l)}</div>`}<div class="pips">${Array.from({length:u.max},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('')}</div></div>${max?'<span class="chip good">Maxed</span>':`<button class="btn sm primary" data-a="fleetUp" data-k="${u.id}" ${S.cash<c?'disabled':''}>${fmt(c)}</button>`}</div>`;
  }
  return h+'</div>';
}
