/* Craft (4.21): the paint studio and the resin lab.
   Paint studio: give each product a paint tier (Basic, Studio, Competition). Higher tiers take your painters longer, but the figure is worth
   far more and its quality goes up. Enter painting competitions for trophies, prize money and a lasting demand boost.
   Resin lab: mix special resins (glow, metallic, crystal, flex, colour-shift) from your own bottles. Prints made with them are variant
   editions that sell at a premium. */
const PAINT_T=[{n:'Basic',eff:1,ref:0,q:0,d:'Quick base coat and wash'},{n:'Studio',eff:1.7,ref:.35,q:.12,d:'Airbrushed, layered and highlighted'},{n:'Competition',eff:2.8,ref:.9,q:.3,d:'Freehand detail, blending, display varnish'}];
const PAINT_EQ=[{id:'airbrush',n:'Airbrush booth',cost:6000,d:'Unlocks the Studio paint tier and Premium commissions.'},{id:'bench',n:'Competition bench',cost:18000,d:'Magnifier lamps and wet palettes. Unlocks the Competition tier, Masterpiece commissions and contests.'}];
const COMPS=[{n:'Local Golden Brush',fee:150,prize:[600,300,150],hype:6,dem:.05,bar:58},{n:'National Painting Masters',fee:900,prize:[5000,2500,1200],hype:14,dem:.08,bar:72,need:1},{n:'World Miniature Open',fee:5000,prize:[30000,14000,6000],hype:30,dem:.12,bar:86,need:2}];
const paintOf=()=>S.paint||(S.paint={t:{},eq:{},tro:[],comp:null,next:0});
const paintEq=()=>{const P=S.paint;return !P?0:P.eq.bench?2:P.eq.airbrush?1:0};
const paintT=k=>(S.paint&&S.paint.t[k])||0;
function paintApply(){for(const k of PKEYS){const P=PRODUCTS[k];if(P.ref0==null)P.ref0=P.ref;P.ref=Math.round(P.ref0*(1+PAINT_T[paintT(k)].ref)*100)/100}}
const troBonus=k=>S.paint?S.paint.tro.filter(t=>t.p===k).reduce((a,t)=>a+COMPS[t.lv].dem*[1,.6,.35][t.pl],0):0;
/* hooks: painters take longer on higher tiers, quality rises, trophies lift demand */
const _stP=staffTask;staffTask=function(s){
  if(s.role==='painter'){const k=nextFinish();const r0=_stP(s);if(r0&&k&&paintT(k)&&/Finishing/.test(r0.act||'')){r0.h*=PAINT_T[paintT(k)].eff;r0.act=r0.act.replace('Finishing',PAINT_T[paintT(k)].n+'-painting')}return r0}
  return _stP(s)};
const _colP=collect;collect=function(p){const j=p.job,k=j&&j.prod,rk=p.resin,u=j&&j.units;_colP(p);
  if(!k)return;if(paintT(k))S.qual[k]+=PAINT_T[paintT(k)].q*.4;
  const R=RESINS[rk];if(R&&R.mix){const V=S.vstock||(S.vstock={}),v=V[k]||(V[k]={n:0,b:0});v.b=(v.b*v.n+R.vb*u)/(v.n+u);v.n+=u}};
const _demP=demand;demand=function(k){return _demP(k)*(1+troBonus(k))};
/* ---------- competitions ---------- */
function compTick(){
  const P=paintOf();if(paintEq()<2)return;
  if(!P.comp&&S.day>=P.next){const lv=Math.min(2,P.tro.reduce((a,t)=>Math.max(a,t.pl===0?t.lv+1:t.lv),0));P.comp={lv,open:S.day,ends:S.day+3,entry:null};log(`${COMPS[lv].n} is open for entries for 3 days (Team › Paint studio).`,'amber')}
  const C=P.comp;if(!C||S.day<C.ends)return;
  P.comp=null;P.next=S.day+11;if(!C.entry)return;
  const L=COMPS[C.lv],best=Math.max(1,...S.staff.filter(s=>s.role==='painter').map(s=>s.lvl||1));
  const score=Math.round(30+best*7+paintT(C.entry)*9+S.qual[C.entry]*25+r(-12,12));
  const pl=score>=L.bar+20?0:score>=L.bar+10?1:score>=L.bar?2:-1;
  if(pl<0){log(`${L.n}: your ${PRODUCTS[C.entry].name.toLowerCase()} scored ${score}. No medal this time.`,'bad');return}
  P.tro.unshift({lv:C.lv,pl,p:C.entry,d:S.day,sc:score});earn('Competition prizes',L.prize[pl]);S.hype+=L.hype*[1,.6,.4][pl];
  log(`${L.n}: ${['Gold','Silver','Bronze'][pl]} for your ${PRODUCTS[C.entry].name.toLowerCase()} (score ${score})! +${fmt(L.prize[pl])}.`,'good');
  if(!awayMode&&!simulating){if(typeof confetti==='function')confetti(pl===0?120:60);if(typeof snd==='function')snd('level')}
}
const _eodP=endOfDay;endOfDay=function(){_eodP();if(S.paint)compTick();if(S.mix)mixTick(24)};
const _patchP=patch;patch=function(s){const r0=_patchP(s);setTimeout(paintApply,0);return r0};
const _rbP=doRebirth;doRebirth=function(d){const g=_rbP(d);setTimeout(paintApply,0);return g};
const _rsP=restartRun;restartRun=function(){_rsP();setTimeout(paintApply,0)};
Object.assign(A,{
  paintSet(d){const k=d.k,t=paintT(k)+(+d.d);if(t<0||t>2)return;if(t>paintEq())return toast(`Buy the ${PAINT_EQ[t-1].n.toLowerCase()} first`);paintOf().t[k]=t;paintApply();toast(`${PRODUCTS[k].name}: ${PAINT_T[t].n} paint`)},
  paintBuy(d){const E=PAINT_EQ.find(x=>x.id===d.k),P=paintOf();if(!E||P.eq[E.id])return;if(E.id==='bench'&&!P.eq.airbrush)return toast('Buy the airbrush booth first');if(S.cash<E.cost)return toast('Not enough cash');spend('Paint studio',E.cost);P.eq[E.id]=1;toast(`${E.n} installed`);if(typeof snd==='function')snd('buy');if(typeof confetti==='function')confetti(30);if(E.id==='bench'&&!P.next)P.next=S.day+1},
  compEnter(d){const P=paintOf(),C=P.comp;if(!C||C.entry)return;const L=COMPS[C.lv];if(S.cash<L.fee)return toast('Not enough cash');if(freeStock(d.k)<1)return toast('You need one in stock to send in');
    spend('Competition fees',L.fee);S.stock[d.k]--;C.entry=d.k;toast(`Entered your ${PRODUCTS[d.k].name.toLowerCase()}`);if(typeof snd==='function')snd('send')}
});
const cupSvg=(pl,big)=>{const c=['#ffd36b','#d9e1ea','#e0a46a'][pl],d=['#b8860b','#8d99a6','#9c5f2c'][pl];return `<svg viewBox="0 0 40 48" class="cup ${big?'big':''}" aria-hidden="true"><defs><linearGradient id="cg${pl}" x1="0" x2="1"><stop offset="0" stop-color="${d}"/><stop offset=".45" stop-color="${c}"/><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="${d}"/></linearGradient></defs><path d="M9 4h22v10a11 11 0 0 1-22 0z" fill="url(#cg${pl})"/><path d="M9 7H4a6 6 0 0 0 6 8M31 7h5a6 6 0 0 1-6 8" fill="none" stroke="${c}" stroke-width="2.4"/><rect x="17.5" y="24" width="5" height="9" fill="${d}"/><rect x="11" y="33" width="18" height="5" rx="1.5" fill="url(#cg${pl})"/><rect x="8" y="38" width="24" height="7" rx="2" fill="#2a2420"/><text x="20" y="16" text-anchor="middle" font-size="9" font-weight="800" fill="${d}">${pl+1}</text></svg>`};
function paintView(){
  const P=paintOf(),eq=paintEq(),ks=PKEYS.filter(k=>unlocked(k)&&S.listed[k]);
  let h=`<div class="card ps-hero"><div class="ps-easel"><i></i><i></i><i></i></div><div class="grow"><div class="t">Paint studio</div><div class="s">Higher paint tiers take painters longer, but the figure is worth more and its quality goes up. Raise the price to match.</div></div></div>`;
  h+=label('Equipment')+`<div class="group">${PAINT_EQ.map(E=>item(`${E.n} ${P.eq[E.id]?'<span class="chip good">Installed</span>':''}`,E.d,P.eq[E.id]?'':`<button class="btn sm primary" data-a="paintBuy" data-k="${E.id}" ${S.cash<E.cost?'disabled':''}>${fmt(E.cost)}</button>`)).join('')}</div>`;
  h+=label('Paint tiers',`${ks.length} listed products`);
  h+=ks.length?`<div class="group">${ks.map(k=>{const t=paintT(k),T=PAINT_T[t],P0=PRODUCTS[k];return `<div class="item ps-row t${t}">${artBox(prodArt(k),'cm-art','',['f',k])}<div class="grow"><div class="t">${P0.name}</div><div class="s"><span class="ps-tier">${T.n}</span> worth ${fmt(P0.ref)}${t?` (+${Math.round(T.ref*100)}%)`:''} · ${T.eff}× paint time${troBonus(k)?` · <span class="good">+${Math.round(troBonus(k)*100)}% demand</span>`:''}</div></div><div class="stepper"><button class="btn sm" data-a="paintSet" data-k="${k}" data-d="-1" ${t?'':'disabled'}>−</button><b>${t+1}</b><button class="btn sm" data-a="paintSet" data-k="${k}" data-d="1" ${t>=2||t>=eq?'disabled':''}>+</button></div></div>`}).join('')}</div>`:`<div class="card"><div class="s">List some products first.</div></div>`;
  h+=label('Competitions',eq<2?'needs the competition bench':P.comp?`entries close in ${P.comp.ends-S.day} d`:`next one in ${Math.max(0,P.next-S.day)} d`);
  if(eq>=2&&P.comp){const L=COMPS[P.comp.lv];
    h+=`<div class="card ps-comp"><div class="t">${L.n}</div><div class="s">Entry ${fmt(L.fee)} and one figure from stock. Prizes ${L.prize.map(fmt).join(' / ')}. Medals add a lasting demand boost to that product.</div>
      ${P.comp.entry?`<div class="s good" style="margin-top:8px">Entered: ${PRODUCTS[P.comp.entry].name}. Results on day ${P.comp.ends}.</div>`:`<div class="ps-entries">${ks.filter(k=>freeStock(k)>0&&paintT(k)>=1).sort((a,b)=>paintT(b)-paintT(a)||S.qual[b]-S.qual[a]).slice(0,6).map(k=>`<button class="ps-entry" data-a="compEnter" data-k="${k}" ${S.cash<L.fee?'disabled':''}>${artBox(prodArt(k),'cm-art','',['f',k])}<b>${PRODUCTS[k].name.split(' (')[0]}</b><small>${PAINT_T[paintT(k)].n}</small></button>`).join('')||'<div class="s">You need a Studio or Competition painted figure in stock.</div>'}</div>`}</div>`}
  else h+=`<div class="card"><div class="s">${eq<2?'Install the competition bench to enter painting contests: Local, then National, then the World Open.':'No contest is open right now.'}</div></div>`;
  h+=label('Trophy cabinet',`${P.tro.length} medal${P.tro.length===1?'':'s'}`)+`<div class="card ps-cab">${P.tro.length?P.tro.slice(0,24).map(t=>`<div class="ps-tro" title="${COMPS[t.lv].n}">${cupSvg(t.pl,t.lv>=1)}<small>${['Local','National','World'][t.lv]}</small></div>`).join(''):'<div class="s">Empty for now. Win a contest to fill it.</div>'}</div>`;
  return h;
}
/* ---------- resin lab ---------- */
const MIX_ADD=[
  {id:'glow',n:'Glow powder',col:'#7dffb0',res:'Glow-in-the-dark',vb:.3,cost:9,q:.02,need:0},
  {id:'mica',n:'Metallic mica',col:'#ffcf6b',res:'Metallic sheen',vb:.25,cost:7,q:.04,need:0},
  {id:'clear',n:'Crystal tint',col:'#7fd6ff',res:'Crystal clear',vb:.35,cost:11,q:.06,need:1},
  {id:'flex',n:'Flex agent',col:'#ff9fb8',res:'Soft-touch flex',vb:.2,cost:6,q:-.02,need:1},
  {id:'shift',n:'Colour-shift pigment',col:'#c79bff',res:'Colour-shift',vb:.6,cost:22,q:.05,need:2}
];
MIX_ADD.forEach(M=>{RESINS['mx_'+M.id]=mkR(`${M.res} blend`,'vat','Mixed in your lab',M.cost+30,M.q,0,`Your own mix. Prints become ${M.res.toLowerCase()} editions: +${Math.round(M.vb*100)}% on every sale`,{mix:M.id,vb:M.vb,col:M.col})});
const MIX_LV=[{n:'Mixing corner',cost:4000,speed:1,batch:5},{n:'Mixing station',cost:20000,speed:2,batch:20},{n:'Resin lab',cost:75000,speed:4,batch:60}];
const mixOf=()=>S.mix||(S.mix={lv:-1,run:null,made:0});
function mixTick(h){const M=S.mix;if(!M||!M.run)return;M.run.left-=h*MIX_LV[M.lv].speed;if(M.run.left<=0){const k='mx_'+M.run.a;S.resin[k]=(S.resin[k]||0)+M.run.ml;M.made+=M.run.ml;log(`The lab finished ${L(M.run.ml)} of ${RESINS[k].name}.`,'good');M.run=null;if(!awayMode&&!simulating&&typeof snd==='function')snd('good')}}
const _hsM=hourStep;hourStep=function(){_hsM();if(S.mix&&S.mix.run)mixTick(1)};
const mixBase=()=>Object.keys(RESINS).filter(k=>RESINS[k].fam==='vat'&&!RESINS[k].mix&&(S.resin[k]||0)>=1000).sort((a,b)=>S.resin[b]-S.resin[a]);
Object.assign(A,{
  mixBuild(){const M=mixOf(),n=M.lv+1,X=MIX_LV[n];if(!X)return;if(S.cash<X.cost)return toast('Not enough cash');spend('Resin lab',X.cost);M.lv=n;toast(`${X.n} ready`);if(typeof snd==='function')snd('buy');if(typeof confetti==='function')confetti(30)},
  mixGo(d){const M=mixOf(),A2=MIX_ADD.find(x=>x.id===d.k);if(!A2||M.lv<0||M.run)return;if(A2.need>M.lv)return toast(`Needs the ${MIX_LV[A2.need].n.toLowerCase()}`);
    const L1=Math.min(+d.n||1,MIX_LV[M.lv].batch),base=mixBase()[0];if(!base)return toast('You need at least 1 L of a standard vat resin');
    const ml=Math.min(L1*1000,Math.floor(S.resin[base]/1000)*1000),c=A2.cost*ml/1000;if(S.cash<c)return toast('Not enough cash');
    S.resin[base]-=ml;spend('Resin lab',c);M.run={a:A2.id,ml,left:2+ml/1000*1.5,total:2+ml/1000*1.5,base};toast(`Mixing ${L(ml)} of ${A2.res.toLowerCase()}`);if(typeof snd==='function')snd('select')}
});
function mixArt(k){const R=RESINS[k],c=R.col||'#c79bff';return `<svg viewBox="0 0 60 80" class="mixbottle" style="--c:${c}" aria-hidden="true"><defs><linearGradient id="mb_${k}" x1="0" x2="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".5"/></linearGradient></defs><rect x="22" y="4" width="16" height="10" rx="2" fill="#222"/><path d="M18 14h24v6l6 8v44a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V28l6-8z" fill="#ffffff14" stroke="#ffffff40"/><path class="liq" d="M13 40q8-4 17 0t17 0v32a5 5 0 0 1-5 5H18a5 5 0 0 1-5-5z" fill="url(#mb_${k})"/><circle class="bub" cx="24" cy="66" r="2" fill="#fff8"/><circle class="bub b2" cx="36" cy="70" r="1.5" fill="#fff8"/><rect x="16" y="46" width="28" height="14" rx="2" fill="#0008"/><text x="30" y="56" text-anchor="middle" font-size="7" font-weight="800" fill="${c}">MIX</text></svg>`}
const _raM=resinArt;resinArt=function(k){return RESINS[k]&&RESINS[k].mix?mixArt(k):_raM(k)};
/* the variant premium: a sale of a product with variant stock pays extra */
const _ssM=shipSale;shipSale=function(o,counter){const v=S.vstock&&S.vstock[o.p];const pr=S.prices[o.p];const rec=_ssM(o,counter);
  if(v&&v.n>0){v.n--;const b=Math.round(pr*v.b*100)/100;earn('Variant premium',b);S.revenue+=b;if(v.n>S.stock[o.p]+inPipe(o.p))v.n=S.stock[o.p]+inPipe(o.p)}return rec};
function mixView(){
  const M=mixOf(),X=MIX_LV[M.lv],nx=MIX_LV[M.lv+1],vs=S.vstock?Object.entries(S.vstock).filter(([k,v])=>v.n>0&&PRODUCTS[k]):[];
  let h=`<div class="card mx-hero"><div class="mx-vat ${M.run?'on':''}" style="--c:${M.run?MIX_ADD.find(a=>a.id===M.run.a).col:'#5bd6a6'}"><i></i><i></i><i></i><b></b></div><div class="grow"><div class="t">${X?X.n:'Resin lab'}</div><div class="s">Mix special resins from your own standard resin. Set a printer to a blend and its prints become variant editions that sell for more.</div>
    ${nx?`<div class="opts"><button class="btn sm primary" data-a="mixBuild" ${S.cash<nx.cost?'disabled':''}>${M.lv<0?'Build':'Upgrade to'} ${nx.n.toLowerCase()} · ${fmt(nx.cost)}</button></div>`:''}</div></div>`;
  if(M.lv<0)return h+`<div class="s cat-help">Build the mixing corner to start. It mixes up to 5 L at a time.</div>`;
  if(M.run){const A2=MIX_ADD.find(a=>a.id===M.run.a),pct=100*(1-M.run.left/M.run.total);h+=label('Mixing now')+`<div class="card"><div class="t">${L(M.run.ml)} of ${A2.res.toLowerCase()}</div><div class="s">from ${RESINS[M.run.base].name}, about ${Math.ceil(M.run.left/MIX_LV[M.lv].speed)} h left</div><div class="bar" style="margin-top:8px"><i style="width:${pct}%;background:${A2.col}"></i></div></div>`}
  const base=mixBase()[0];
  h+=label('Recipes',base?`base: ${RESINS[base].name} (${amt(base,S.resin[base])})`:'needs 1 L of standard vat resin');
  h+=`<div class="mx-grid">${MIX_ADD.map(A2=>{const k='mx_'+A2.id,lock=A2.need>M.lv;return `<div class="mx-card ${lock?'lock':''}" style="--c:${A2.col}"><div class="mx-art">${mixArt(k)}</div><div class="t">${A2.res}</div><div class="s">+${Math.round(A2.vb*100)}% per sale · ${fmt(A2.cost)}/L</div><div class="s">${amt(k,S.resin[k]||0)} in stock</div>
    ${lock?`<span class="chip">Needs ${MIX_LV[A2.need].n.toLowerCase()}</span>`:`<div class="mx-acts">${[1,5,X.batch>5?X.batch:0].filter(Boolean).map(n=>`<button class="btn sm" data-a="mixGo" data-k="${A2.id}" data-n="${n}" ${M.run||!base||S.cash<A2.cost*n?'disabled':''}>${n} L</button>`).join('')}</div>`}</div>`}).join('')}</div>`;
  if(vs.length)h+=label('Variant editions in stock')+`<div class="group">${vs.map(([k,v])=>item(PRODUCTS[k].name,`${v.n} variant units · +${Math.round(v.b*100)}% on each sale`)).join('')}</div>`;
  h+=`<div class="s cat-help">To print a variant, pick the blend in a printer's resin menu. Each unit printed with it adds the bonus to one future sale of that product.</div>`;
  return h;
}
