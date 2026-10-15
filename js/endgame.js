/* Endgame (4.4): rival companies, unstable black matter, and an auto board that runs the empire. */
const EG_MIN=250000;
const endg=()=>S.endg||(S.endg={auto:{},stab:0,rvb:0});
const egOpen=()=>value(S)>=EG_MIN||(S.rv&&S.rv.list&&S.rv.list.length>0);
/* ---------- rivals ---------- */
const RIV_NAMES=[['Printopia','#ff7fa8'],['Voxel & Co','#5aa6ff'],['ResinWorks','#5bd6a6'],['Layerline','#e8b34b'],['Cured Kings','#9d89ff'],['Mould Mafia','#ff8a5c'],['Pixel Foundry','#27e3ff']];
const rvOf=()=>S.rv||(S.rv={list:[],used:0,wait:0});
function newRival(pow){
  const R=rvOf(),n=RIV_NAMES[R.used++%RIV_NAMES.length],keys=PKEYS.filter(k=>!PRODUCTS[k].royalty);
  return{id:nid(),name:n[0],col:n[1],pow:pow||2+Math.random()*1.5,cash:4000+Math.round(Math.random()*6000),focus:keys[Math.floor(Math.random()*keys.length)],cd:0,hit:0,hitK:null};
}
function rivalMult(k){
  const R=S.rv;let m=1;
  if(R&&R.list)for(const r of R.list){m-=r.pow*.012;if(r.focus===k)m-=r.pow*.014;if(r.hit>0&&r.hitK===k)m-=.07}
  return Math.max(.4,m)*(1+Math.min(.3,.02*endg().rvb));
}
const _dem5=demand;demand=function(k){return _dem5(k)*rivalMult(k)};
const buyoutCost=r=>Math.round((r.cash*3+8000*Math.pow(r.pow,1.8))/100)*100;
const undercutCost=r=>Math.round(800*Math.pow(r.pow,1.5)/10)*10;
function rivalDay(){
  if(!egOpen())return;
  const R=rvOf();
  if(!R.list.length&&!R.seeded){R.seeded=1;R.list=[newRival(2.2),newRival(2.8),newRival(3.4)];log('Three rival printing companies have noticed you.','amber')}
  if(R.list.length<3&&R.seeded&&R.wait>0&&--R.wait<=0)R.list.push(newRival(1.6));
  for(const r of R.list){
    r.pow=Math.min(12,r.pow+.05+Math.random()*.07);r.cash+=Math.round(r.pow*500);if(r.cd>0)r.cd--;if(r.hit>0)r.hit--;
    if(S.day%6===0&&Math.random()<.5){const keys=PKEYS.filter(k=>!PRODUCTS[k].royalty);r.focus=keys[Math.floor(Math.random()*keys.length)]}
    if(Math.random()<.08){r.hit=3;r.hitK=r.focus;log(`${r.name} slashed prices on ${PRODUCTS[r.focus].name}. Your demand for it drops for a few days.`,'bad')}
  }
}
Object.assign(A,{
  rvUndercut(d){const r=rvOf().list.find(x=>x.id==d.id);if(!r)return;if(r.cd>0)return toast(`Wait ${r.cd} d`);const c=undercutCost(r);if(S.cash<c)return toast('Not enough cash');
    spend('Price war',c);r.pow=Math.max(1,r.pow-1.2);r.cash=Math.round(r.cash*.7);r.cd=3;toast(`${r.name} loses ground`);snd('good')},
  rvSabotage(d){const r=rvOf().list.find(x=>x.id==d.id);if(!r)return;if(r.cd>0)return toast(`Wait ${r.cd} d`);if(!useE(15))return;
    r.cd=3;if(Math.random()<.55-r.pow*.02){r.pow=Math.max(1,r.pow-2);r.cash=Math.round(r.cash*.6);log(`Your stunt against ${r.name} worked.`,'good');toast('It worked')}
    else{S.rating=Math.max(1,S.rating-.15);spend('Fines',300*Math.round(r.pow));log(`${r.name} caught you. Fine and a bad review.`,'bad');toast('Caught!')}},
  rvBuyout(d){const R=rvOf(),r=R.list.find(x=>x.id==d.id);if(!r)return;const c=buyoutCost(r);if(S.cash<c)return toast('Not enough cash');
    confirmBox(`Buy out ${r.name}?`,`${fmt(c)}. They leave the market. You get a permanent +2% demand and one of their printers goes to your inventory.`,()=>{
      if(S.cash<c)return;spend('Buyouts',c);R.list=R.list.filter(x=>x!==r);R.wait=10;endg().rvb++;
      const g=Math.min(3,Math.floor(r.pow/3.2)),pool=Object.keys(PRINTERS).filter(k=>PRINTERS[k].grp===g&&!PRINTERS[k].inj&&!PRINTERS[k].sing);
      if(pool.length)(S.pinv=S.pinv||[]).push({id:nid(),type:pool[Math.floor(Math.random()*pool.length)]});
      log(`You bought out ${r.name}.`,'good');confetti(60);snd('good');toast('Bought out')})}
});
function rivalsView(){
  if(!egOpen())return label('Rivals','locked')+`<div class="card"><div class="s">Rival companies notice you once your company is worth ${fmt(EG_MIN)}. You are at ${fmt(value(S))}.</div><div style="margin-top:10px">${bar(Math.min(100,value(S)/EG_MIN*100),'var(--amber)')}</div></div>`;
  const R=rvOf(),tot=R.list.reduce((a,r)=>a+r.pow*1.2,0);
  let h=label('Rivals',`they take about ${tot.toFixed(0)}% of your demand`)+`<div class="card"><div class="s">Rivals grow every day and target one figure each. Beat them down with price wars, play dirty, or buy them out. ${endg().rvb?`Buyouts so far: <b>${endg().rvb}</b> (+${Math.min(30,2*endg().rvb)}% demand).`:''}</div></div>`;
  for(const r of R.list){
    h+=`<div class="card rival" style="--c:${r.col};margin-top:10px"><div class="rvh"><span class="rvlogo">${r.name[0]}</span><div class="grow"><div class="t">${r.name}</div><div class="s">Targets <b>${PRODUCTS[r.focus].name}</b>${r.hit>0?` <span class="chip bad">price war ${r.hit} d</span>`:''}</div></div><div class="rvp"><b class="num">${r.pow.toFixed(1)}</b><small>power</small></div></div>
    <div class="bar" style="margin:10px 0"><i style="width:${r.pow/12*100}%;background:${r.col}"></i></div>
    <div class="acts"><button class="btn sm" data-a="rvUndercut" data-id="${r.id}" ${r.cd>0?'disabled':''}>${r.cd>0?`${r.cd} d`:`Undercut ${fmt(undercutCost(r))}`}</button><button class="btn sm" data-a="rvSabotage" data-id="${r.id}" ${r.cd>0?'disabled':''}>Sabotage ${en(15)}</button><button class="btn sm primary" data-a="rvBuyout" data-id="${r.id}" ${S.cash<buyoutCost(r)?'disabled':''}>Buy out ${fmt(buyoutCost(r))}</button></div></div>`;
  }
  if(!R.list.length)h+=`<div class="card" style="margin-top:10px"><div class="s">The market is clear. A new challenger appears in about ${Math.max(1,R.wait)} days.</div></div>`;
  return h;
}
/* ---------- unstable black matter ---------- */
const stabThr=()=>120+60*endg().stab;
const stabLoad=()=>rebOf(S).shards+(typeof sng==='function'?sng().cores*8:0);
const stabRatio=()=>stabLoad()/stabThr();
const stabCost=()=>Math.round(15*Math.pow(1.55,endg().stab));
function stabDay(){
  const r=stabRatio();if(r<=1)return;
  if(Math.random()>Math.min(.7,.12+(r-1)*.4))return;
  const R=rebOf(S);
  if(Math.random()<.6){
    const lose=Math.max(1,Math.min(Math.floor(R.shards*.25),Math.floor(R.shards*(.03+.07*Math.random()*r))));
    R.shards-=lose;let extra='';
    if(r>2&&typeof sng==='function'&&sng().cores>0&&Math.random()<.15){sng().cores--;extra=' A Core collapsed.'}
    log(`The black matter leaked. You lost ${lose} Resin Shards.${extra}`,'bad');
  }else{
    const c=Math.round(value(S)*.005);earn('Matter surge',c);S.hype+=15;
    log(`A matter surge discharged: +${fmt(c)} and +15 hype.`,'amber');
  }
}
Object.assign(A,{
  stabUp(){const c=stabCost(),E=endg();if(E.stab>=10)return;if(rebOf(S).shards<c)return toast('Not enough Resin Shards');rebOf(S).shards-=c;E.stab++;toast(`Containment level ${E.stab}`);snd('good')},
  stabVent(){const R=rebOf(S),n=Math.max(1,Math.floor(R.shards*.1));if(R.shards<1)return;R.shards-=n;earn('Vented matter',n*1500);toast(`Vented ${n} shards for ${fmt(n*1500)}`)}
});
function stabCard(){
  const r=stabRatio(),E=endg(),pct=Math.min(100,r*100),bad=r>1;
  return `<div class="card stabcard ${bad?'unstable':''}"><div class="chk"><span>Containment</span><b>${bad?glit('UNSTABLE'):'Stable'}</b></div>
    <div class="bar" style="margin:8px 0"><i style="width:${pct}%;background:${r>1?'#ff2fa8':r>.75?'var(--amber)':'#9d6bff'}"></i></div>
    <div class="s">${Math.round(stabLoad())} of ${stabThr()} safe (shards + Cores × 8). ${bad?'Each day it may leak shards or surge into cash and hype.':'Over the limit it leaks or surges every day.'}</div>
    <div class="opts"><button class="btn sm primary" data-a="stabUp" ${E.stab>=10||rebOf(S).shards<stabCost()?'disabled':''}>${E.stab>=10?'Max containment':`Containment ${E.stab+1} · ${stabCost()} shards`}</button><button class="btn sm" data-a="stabVent" ${rebOf(S).shards<1?'disabled':''}>Vent 10%</button></div></div>`;
}
const _sv5=singView;singView=function(){return stabCard()+_sv5()};
const _rv5=rebirthView;rebirthView=function(){return stabCard()+_rv5()};
/* ---------- auto board ---------- */
const AUTO=[
  {id:'bay',n:'Send the bay',d:o=>`when it is ${o.pct}% full`,opt:'pct',vals:[50,80,100],def:{pct:80}},
  {id:'resin',n:'Rebuy resin',d:o=>`keep ${o.min} bottle${o.min>1?'s':''} per used resin, price up to ×${o.cap}`,opt:'min',vals:[1,2,4],def:{min:2,cap:1.2},opt2:'cap',vals2:[1,1.2,1.5]},
  {id:'place',n:'Place stored printers',d:()=>'into free spots, best first',def:{}},
  {id:'service',n:'Service printers',d:o=>`idle printers below ${o.cond}% condition`,opt:'cond',vals:[40,60,75],def:{cond:60}},
  {id:'stab',n:'Buy containment',d:()=>'when matter turns unstable',def:{}}
];
const au=id=>{const A0=AUTO.find(x=>x.id===id),a=endg().auto;return a[id]||(a[id]=Object.assign({on:false},A0.def))};
Object.assign(A,{
  autoTog(d){const o=au(d.k);o.on=!o.on;toast(`${AUTO.find(x=>x.id===d.k).n}: ${o.on?'on':'off'}`)},
  autoSet(d){const o=au(d.k);o[d.o]=+d.v}
});
function autoRun(){
  if(!egOpen())return;
  const a=endg().auto;
  if(a.bay&&a.bay.on){const b=bayOf();if(b.length&&b.length>=dispCap()*a.bay.pct/100){const n=sendBay();if(n&&!awayMode)log(`Auto board sent ${n} parcels.`,'good')}}
  if(a.resin&&a.resin.on){
    for(const k of new Set(S.printers.filter(p=>!PRINTERS[p.type].form).map(p=>p.resin))){
      const vol=RESINS[k].vol||1000,price=resinPrice(k);
      if((S.resin[k]||0)<vol*a.resin.min&&S.mk.resin<=a.resin.cap&&S.cash>price*3){spend('Resin',price);S.resin[k]=(S.resin[k]||0)+vol}
    }
  }
  if(a.place&&a.place.on&&S.pinv&&S.pinv.length&&S.printers.length<space().printers){
    const x=S.pinv.filter(y=>!printerLock(PRINTERS[y.type])).sort((p,q)=>PRINTERS[q.type].cost-PRINTERS[p.type].cost)[0];
    if(x){const n=S.printers.length;A.placePrinter({id:x.id});if(S.printers.length>n&&!awayMode)log('Auto board placed a stored printer.','good')}
  }
  if(a.service&&a.service.on)for(const p of S.printers)if(p.state==='idle'&&p.cond<a.service.cond&&S.cash>serviceFee(p)*2){service(p)}
  if(a.stab&&a.stab.on&&stabRatio()>1&&endg().stab<10&&rebOf(S).shards>=stabCost()){A.stabUp()}
}
function autoView(){
  if(!egOpen())return label('Auto board','locked')+`<div class="card"><div class="s">The auto board unlocks at a company worth ${fmt(EG_MIN)}. You are at ${fmt(value(S))}.</div><div style="margin-top:10px">${bar(Math.min(100,value(S)/EG_MIN*100),'var(--amber)')}</div></div>`;
  let h=label('Auto board','rules run every game hour')+`<div class="card"><div class="s">Switch on the rules you want. Everything they do costs real money and uses your real stock. They never use energy.</div></div><div class="group" style="margin-top:12px">`;
  for(const R of AUTO){
    const o=au(R.id);
    h+=`<div class="item" style="align-items:flex-start;flex-wrap:wrap"><div class="grow"><div class="t">${R.n}</div><div class="s">${R.d(o)}</div>${R.opt?`<div class="arow">${R.vals.map(v=>`<button class="btn sm ${o[R.opt]==v?'primary':''}" data-a="autoSet" data-k="${R.id}" data-o="${R.opt}" data-v="${v}">${R.opt==='min'?v+' btl':v+'%'}</button>`).join('')}</div>`:''}${R.opt2?`<div class="arow">${R.vals2.map(v=>`<button class="btn sm ${o[R.opt2]==v?'primary':''}" data-a="autoSet" data-k="${R.id}" data-o="${R.opt2}" data-v="${v}">max ×${v}</button>`).join('')}</div>`:''}</div><button class="btn sm ${o.on?'primary':''}" data-a="autoTog" data-k="${R.id}">${o.on?'On':'Off'}</button></div>`;
  }
  return h+'</div>';
}
/* ---------- hooks ---------- */
const _eod5=endOfDay;endOfDay=function(){_eod5();rivalDay();stabDay()};
const _hs5=hourStep;hourStep=function(){_hs5();if(!S.over)autoRun()};
const _rb5=doRebirth;doRebirth=function(d){const o=S;const g=_rb5(d);S.endg=o.endg;return g};
const _rs5=restartRun;restartRun=function(){const o=S;_rs5();S.endg=o.endg};
