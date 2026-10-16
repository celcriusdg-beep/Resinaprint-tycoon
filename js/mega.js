/* Megaprojects (4.32): the late-game money sink. Six huge builds, four stages each. Every stage costs cash (scaled to your rebirth goal),
   a delivery of real figures from stock and days of building. Finished projects give big bonuses for the rest of the run,
   and every project ever finished adds +2% income for good (Legacy). */
const MEGA=[
  {id:'refinery',n:'Resin Refinery',col:'#5bd6a6',base:1.5,min:20,fx:'Resin costs 40% less and 5 L of every resin you use arrives free each day.',feat:'tanks'},
  {id:'hub',n:'Global Logistics Hub',col:'#5aa6ff',base:2,min:25,fx:'Shipping costs 35% less.',feat:'plane'},
  {id:'studio',n:'Resin Saga Anime Studio',col:'#ff7fd0',base:3,min:40,fx:'Your own anime series: own designs sell 50% more often.',feat:'reel'},
  {id:'park',n:'Resinaland Theme Park',col:'#ffb547',base:5,min:60,fx:'Visitors pay 0.4% of your rebirth goal every day, plus +5 hype a day.',feat:'wheel'},
  {id:'orbital',n:'Orbital Print Lab',col:'#9d89ff',base:8,min:100,fx:'Printers run 25% faster and fail half as often.',feat:'rocket'},
  {id:'museum',n:'The Grand Resin Museum',col:'#e8d9a8',base:12,min:150,fx:'A vault chest every day and reviews slowly climb towards 5 stars.',feat:'columns'}
];
const MEGA_STAGE=[{n:'Groundwork',c:.25,q:40,d:2},{n:'Structure',c:.5,q:80,d:3},{n:'Fit-out',c:1,q:160,d:4},{n:'Grand opening',c:2,q:320,d:5}];
const megaOf=()=>S.mega||(S.mega={});
const megaP=id=>megaOf()[id]||(megaOf()[id]={st:0,run:null});
const megaDone=id=>(S.mega&&S.mega[id]&&S.mega[id].st>=4);
const megaOpen=()=>((S.reb&&S.reb.count)||0)>=1||value(S)>=5e6;
const megaScale=()=>typeof rebGoal==='function'?rebGoal():1e6;
const megaCost=(M,i)=>Math.round(M.base*MEGA_STAGE[i].c*megaScale()/1000)*1000;
const megaQty=(M,i)=>Math.round(MEGA_STAGE[i].q*(1+((S.reb&&S.reb.count)||0)*.25));
const megaGoods=M=>PKEYS.filter(k=>S.stock[k]>0&&PRODUCTS[k].ref>=M.min);
const megaHave=M=>megaGoods(M).reduce((a,k)=>a+freeStock(k),0);
const legacyN=()=>(S.reb&&S.reb.mono)||0;
/* ---------- effects ---------- */
const _spMG=spend;spend=function(cat,a){if(a>0){if(cat==='Resin'&&megaDone('refinery'))a*=.6;if(cat==='Shipping'&&megaDone('hub'))a*=.65}return _spMG(cat,a)};
const _demMG=demand;demand=function(k){const d=_demMG(k);return megaDone('studio')&&!PRODUCTS[k].ip&&!PRODUCTS[k].prop?d*1.5:d};
const _jhMG=jobHours;jobHours=function(p){return _jhMG(p)/(megaDone('orbital')?1.25:1)};
const _ejMG=endJob;endJob=function(p){if(megaDone('orbital')&&p.job){const D=PRINTERS[p.type];p.job.rf-=(D.fail+p.job.rf)*.5}_ejMG(p)};
const _earnMG=earn;earn=function(cat,a){if(a>0&&legacyN()&&typeof RB_SKIP!=='undefined'&&!RB_SKIP.includes(cat))a*=1+.02*legacyN();return _earnMG(cat,a)};
const _eodMG=endOfDay;endOfDay=function(){_eodMG();if(!S.mega)return;
  if(megaDone('refinery'))for(const k of new Set(S.printers.map(p=>p.resin)))if(RESINS[k]&&!RESINS[k].mix)S.resin[k]=(S.resin[k]||0)+5000;
  if(megaDone('park')){earn('Theme park',Math.round(megaScale()*.004));S.hype+=5}
  if(megaDone('museum')){if(typeof vaultAdd==='function')vaultAdd(S,Math.max(1,S.lv||1));S.rating=Math.min(5,S.rating+(5-S.rating)*.01)}
  for(const M of MEGA){const P=S.mega[M.id];if(!P||!P.run)continue;P.run.left--;if(P.run.left<=0){P.run=null;P.st++;megaStageDone(M,P)}}
};
function megaStageDone(M,P){
  if(P.st>=4){S.reb=S.reb||{};S.reb.mono=(S.reb.mono||0)+1;if(S.reb.shards!=null){S.reb.shards+=25;S.reb.total=(S.reb.total||0)+25}
    log(`${M.n} is open! ${M.fx} Legacy: +2% income for good (now +${legacyN()*2}%). +25 Resin Shards.`,'good');
    if(!awayMode&&!simulating){if(typeof confetti==='function')confetti(160);if(typeof snd==='function')snd('level');setTimeout(()=>toast(`${M.n} is open!`),300)}}
  else{log(`${M.n}: ${MEGA_STAGE[P.st-1].n} finished. Next: ${MEGA_STAGE[P.st].n}.`,'good');if(!awayMode&&!simulating&&typeof snd==='function')snd('good')}
}
Object.assign(A,{
  megaGo(d){const M=MEGA.find(x=>x.id===d.k),P=megaP(d.k);if(!M||P.run||P.st>=4)return;
    const i=P.st,c=megaCost(M,i),q=megaQty(M,i);if(S.cash<c)return toast('Not enough cash');if(megaHave(M)<q)return toast(`You need ${q} figures worth €${M.min}+ in stock`);
    spend('Megaprojects',c);let need=q;for(const k of megaGoods(M).sort((a,b)=>freeStock(b)-freeStock(a))){const t=Math.min(need,freeStock(k));S.stock[k]-=t;need-=t;if(!need)break}
    P.run={left:MEGA_STAGE[i].d,total:MEGA_STAGE[i].d};log(`${M.n}: ${MEGA_STAGE[i].n} started. ${fmt(c)} and ${q} figures delivered.`,'amber');
    if(typeof snd==='function')snd('buy');if(typeof confetti==='function')confetti(30)}
});
/* ---------- art: the building grows with every stage ---------- */
function megaArt(M,st,building,blue){
  const c=M.col,dk='#1b1d24';let g=`<rect x="0" y="86" width="160" height="14" fill="#2a2d36"/><rect x="0" y="86" width="160" height="2" fill="#3a3e4a"/>`;
  if(st>=1||building&&st===0)g+=`<rect x="22" y="80" width="116" height="7" fill="#4a4f5c" ${st<1?'opacity=".45"':''}/>`;
  if(st>=2||building&&st===1)g+=`<g ${st<2?'opacity=".45"':''}><rect x="30" y="46" width="100" height="34" fill="${shade(c,.55)}"/><rect x="30" y="46" width="100" height="5" fill="${shade(c,.75)}"/>${[0,1,2,3,4].map(i=>`<rect x="${38+i*19}" y="56" width="10" height="9" fill="${st>=4?'#fff3c0':'#262a33'}" class="${st>=4?'mg-win':''}"/>`).join('')}</g>`;
  const F={
    tanks:`<rect x="38" y="24" width="18" height="22" rx="4" fill="${c}"/><rect x="62" y="20" width="18" height="26" rx="4" fill="${shade(c,.85)}"/><rect x="104" y="6" width="8" height="40" fill="#5b606c"/><circle cx="108" cy="2" r="4" fill="#ffffff40" class="mg-smoke"/>`,
    plane:`<rect x="40" y="30" width="80" height="16" fill="${shade(c,.8)}"/><path d="M96 14l26 6-26 6-6 10-4 0 3-10-12-2-4 4-3 0 2-6-2-6 3 0 4 4 12-2-3-10 4 0z" fill="#e8ecf2" class="mg-fly"/>`,
    reel:`<circle cx="80" cy="26" r="18" fill="${c}"/>${[0,1,2,3,4,5].map(i=>`<circle cx="${80+Math.cos(i*1.047)*10}" cy="${26+Math.sin(i*1.047)*10}" r="3.5" fill="${dk}"/>`).join('')}<circle cx="80" cy="26" r="3" fill="${dk}"/>`,
    wheel:`<g class="mg-spin" style="transform-origin:80px 24px"><circle cx="80" cy="24" r="21" fill="none" stroke="${c}" stroke-width="3"/>${[0,1,2,3,4,5,6,7].map(i=>`<line x1="80" y1="24" x2="${80+Math.cos(i*.785)*21}" y2="${24+Math.sin(i*.785)*21}" stroke="${c}" stroke-width="1.4"/><rect x="${76+Math.cos(i*.785)*21}" y="${21+Math.sin(i*.785)*21}" width="8" height="6" rx="1.5" fill="${['#ff6d82','#5bd6a6','#9fd3ff','#ffd36b'][i%4]}"/>`).join('')}</g><path d="M80 24l-12 22h24z" fill="none" stroke="#8a8f9a" stroke-width="2"/>`,
    rocket:`<g class="mg-hover"><path d="M80 0c8 8 10 22 8 36h-16c-2-14 0-28 8-36z" fill="#e8ecf2"/><circle cx="80" cy="16" r="4" fill="${c}"/><path d="M72 30l-8 10h8zM88 30l8 10h-8z" fill="${c}"/></g><path d="M74 40l6 6 6-6" fill="#ffb547" class="mg-flame"/>`,
    columns:`<path d="M30 24l50-18 50 18z" fill="${c}"/><rect x="30" y="24" width="100" height="4" fill="${shade(c,.8)}"/>${[0,1,2,3,4].map(i=>`<rect x="${36+i*20}" y="28" width="7" height="18" fill="#f4efe6"/>`).join('')}`
  };
  if(st>=3||building&&st===2)g+=`<g ${st<3?'opacity=".45"':''}>${F[M.feat]}</g>`;
  if(st>=4)g+=`<g class="mg-glow"><circle cx="80" cy="40" r="60" fill="${c}" opacity=".08"/></g>${blue?'':`<text x="80" y="97" text-anchor="middle" font-size="7" font-weight="900" fill="${c}">OPEN</text>`}`;
  if(building)g+=`<g class="mg-crane"><rect x="142" y="10" width="3" height="76" fill="#ffb547"/><rect x="110" y="10" width="44" height="3" fill="#ffb547"/><line x1="118" y1="13" x2="118" y2="${st>=2?20:40}" stroke="#ccc" stroke-width=".8" class="mg-hook"/><rect x="114" y="${st>=2?20:40}" width="8" height="5" fill="#8a8f9a" class="mg-hook"/></g>`;
  return `<svg viewBox="0 0 160 100" class="mg-art${blue?' blue':''}" style="--c:${c}">${g}${blue?'<text x="80" y="14" text-anchor="middle" font-size="7" font-weight="800" fill="#9fd3ff" letter-spacing="1.5">BLUEPRINT</text>':''}</svg>`;
}
function megaView(){
  if(!megaOpen())return `<div class="card cm-lock" style="margin-top:16px"><div class="t">Megaprojects</div><div class="s">Huge builds for the late game. They open after your first rebirth or once your company is worth €5M (now ${fmt(value(S))}).</div></div>`;
  const done=MEGA.filter(M=>megaDone(M.id)).length;
  let h=`<div class="card mg-hero"><div class="grow"><div class="t">Megaprojects</div><div class="s">Six giant builds with four stages each. Every stage costs cash, a delivery of figures from your stock and days of building. Finished projects give big bonuses for this run, and each one ever finished adds <b>+2% income for good</b>.</div></div><div class="mg-leg"><b>+${legacyN()*2}%</b><span>Legacy</span></div></div>`;
  h+=label('Projects',`${done} of ${MEGA.length} open this run · costs scale with your rebirth goal`);
  h+=MEGA.map(M=>{const P=megaP(M.id),st=P.st,run=P.run,i=Math.min(st,3),c=megaCost(M,i),q=megaQty(M,i),have=megaHave(M);
    return `<div class="card mg-card ${st>=4?'open':''}" style="--c:${M.col}">${st===0&&!run?megaArt(M,4,false,true):megaArt(M,st,!!run)}
      <div class="mg-h"><div class="grow"><div class="t">${M.n}</div><div class="s">${M.fx}</div></div>${st>=4?'<span class="chip good">Open</span>':`<span class="chip">${st}/4</span>`}</div>
      <div class="mg-steps">${MEGA_STAGE.map((S2,j)=>`<span class="${j<st?'ok':j===st&&run?'cur':''}">${S2.n}</span>`).join('')}</div>
      ${st>=4?'':run?`<div class="s">${MEGA_STAGE[st].n} under construction · ${run.left} day${run.left===1?'':'s'} left</div><div class="bar" style="margin-top:6px"><i style="width:${100*(1-run.left/run.total)}%;background:${M.col}"></i></div>`
        :`<div class="mg-need"><span class="${S.cash>=c?'good':'bad'}">${fmt(c)}</span><span class="${have>=q?'good':'bad'}">${q} figures €${M.min}+ <small>(${have} in stock)</small></span><span>${MEGA_STAGE[i].d} days</span></div>
          <div class="opts"><button class="btn sm primary" data-a="megaGo" data-k="${M.id}" ${S.cash<c||have<q?'disabled':''}>Start ${MEGA_STAGE[i].n.toLowerCase()}</button></div>`}</div>`}).join('');
  return h;
}
