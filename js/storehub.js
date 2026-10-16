/* Stores (4.38): a Stores tab next to Studio once you own a store. Pick one of your stores and run it in an animated scene.
   The trading card shop goes deep: retail packs, boxes and accessories at your own prices, B2B wholesale accounts, events,
   PSA grading that turns cards into slabs worth more, singles you list at your own price, and store upgrades. */
const TS_ACC={
  binder:{n:'9-pocket binder',w:8,m:20,ico:'📒'},sleeves:{n:'Card sleeves (100)',w:3,m:8,ico:'🃏'},deckbox:{n:'Deck box',w:5,m:14,ico:'📦'},
  playmat:{n:'Playmat',w:12,m:30,ico:'🟪'},toploader:{n:'Toploaders (25)',w:2,m:6,ico:'🛡'}
};
const TS_UP=[
  {id:'b2b',n:'Distributor account',max:3,cost:[15000,60000,200000],d:l=>['No wholesale yet','Buy sealed at 80% of market','Buy sealed at 70% · prerelease events','Buy sealed at 60% · championship events'][l]},
  {id:'shelf',n:'Wall shelving',max:3,cost:[5000,20000,60000],d:l=>`+${l*20}% customers`},
  {id:'cases',n:'Display cases',max:3,cost:[8000,30000,90000],d:l=>`Singles and slabs sell ${l*25}% faster`},
  {id:'play',n:'Play area',max:2,cost:[10000,40000],d:l=>['A couple of tables','Room for 48 players','Room for 128 players'][l]},
  {id:'psa',n:'Grading partnership',max:2,cost:[25000,100000],d:l=>l?`PSA grading ${l*30}% cheaper and faster`:'Standard PSA rates'},
  {id:'ads',n:'Local marketing',max:3,cost:[3000,12000,40000],d:l=>`+${l*15}% customers`}
];
const TS_EV=[
  {id:'league',n:'League night',cost:50,cd:3,base:12,fee:5,need:null,d:'Casual games, a few packs sold.'},
  {id:'weekly',n:'Weekly tournament',cost:150,cd:7,base:24,fee:10,need:null,d:'Prize packs for the top 4.'},
  {id:'pre',n:'Spiritforged prerelease',cost:600,cd:14,base:40,fee:30,need:['b2b',2],d:'Everyone opens 6 packs. Pack sales triple that day.'},
  {id:'champ',n:'Regional championship',cost:3000,cd:28,base:90,fee:40,need:['b2b',3],d:'The big one. Crowds, hype and serious sales.'}
];
const TS_GRADE=[{g:10,w:.18,m:4},{g:9,w:.4,m:1.7},{g:8,w:.27,m:1.1},{g:7,w:.15,m:.8}];
const TS_GMIN={7:6,8:9,9:14,10:30};
const tsU=id=>((S.tcg&&S.tcg.up)||{})[id]||0;
function tsInit(){const T=tcgOf();T.up=T.up||{};T.rp=T.rp||{pack:TCG_SET.pack,box:TCG_SET.box};T.acc=T.acc||{};T.ap=T.ap||{};T.list=T.list||{};T.slabs=T.slabs||[];T.psa=T.psa||[];T.ev=T.ev||{cd:{}};T.keep=T.keep||0;T.boxes=T.boxes||0;T.day=T.day||{v:0,rev:0};if(T.sell==null)T.sell=1;return T}
const tsWhole=()=>[1,.8,.7,.6][tsU('b2b')];
const slabVal=s=>Math.max(TS_GMIN[s.g],tcgPrice(TCG_BY[s.c])*TS_GRADE.find(x=>x.g===s.g).m);
const tsOwned=()=>Object.keys(STORES).filter(k=>S.stores&&S.stores[k]&&S.stores[k].open);
/* ---------- daily store simulation ---------- */
function tsDay(){
  const st=S.stores&&S.stores.tcg;if(!st||!st.open)return;const T=tsInit();
  const clerks=S.staff.filter(s=>s.role==='clerk'&&s.store==='tcg').length,ev=T.ev.today===S.day?T.ev.last:null;
  if(!clerks&&S.shift.tcg!==S.day&&!ev){T.day={v:0,rev:0};return}
  const v=poisson(STORES.tcg.traffic*LVL[st.level-1]*(1+.2*tsU('shelf')+.15*tsU('ads'))*(typeof hypeMult==='function'?Math.sqrt(hypeMult()):1))+(ev?ev.players:0);
  let rev=0;const sell=(cat,a)=>{rev+=a};
  /* sealed */
  if(T.sell){const pm=TCG_SET.pack/T.rp.pack,pp=Math.min(.9,.32*Math.pow(pm,2.5))*(ev&&ev.id==='pre'?3:1);
    for(let i=0;i<v&&T.packs>T.keep;i++){if(Math.random()<pp){const n=Math.min(T.packs-T.keep,1+(Math.random()*2|0));T.packs-=n;sell('p',n*T.rp.pack)}}
    const bp=Math.min(.5,.015*Math.pow(TCG_SET.box/T.rp.box,2.5));for(let i=0;i<v&&T.boxes>0;i++)if(Math.random()<bp){T.boxes--;sell('b',T.rp.box)}}
  for(const k in TS_ACC){const A2=TS_ACC[k],pr=T.ap[k]||A2.m,p=Math.min(.6,.07*Math.pow(A2.m/pr,2));for(let i=0;i<v&&(T.acc[k]||0)>0;i++)if(Math.random()<p){T.acc[k]--;sell('a',pr)}}
  /* singles and slabs at your own prices */
  const fast=1+.25*tsU('cases');
  for(const id of Object.keys(T.list)){const c=TCG_BY[id],pr=T.list[id];if(!c||!(T.own[id]>0)){delete T.list[id];continue}
    const p=Math.min(.85,.12*fast*Math.pow(tcgPrice(c)/pr,3)*(1+v/120));if(Math.random()<p){T.own[id]--;sell('s',pr);if(!(T.own[id]>0))delete T.list[id];if(pr>=50&&!awayMode)log(`A collector bought your ${c.n} for ${tcgF(pr)}.`,'good')}}
  for(const s of [...T.slabs]){if(!s.price)continue;const p=Math.min(.8,.1*fast*Math.pow(slabVal(s)/s.price,3)*(1+v/120));if(Math.random()<p){T.slabs=T.slabs.filter(x=>x!==s);sell('g',s.price);if(!awayMode)log(`Sold a PSA ${s.g} ${TCG_BY[s.c].n} for ${tcgF(s.price)}.`,'good')}}
  if(rev){earn('TCG store sales',rev);S.revenue+=rev}
  T.day={v,rev:Math.round(rev*100)/100};
  /* grading comes back */
  for(const q of [...T.psa])if(S.day>=q.due){T.psa=T.psa.filter(x=>x!==q);const g=tsRollGrade();const s={id:nid(),c:q.c,g,price:null};T.slabs.unshift(s);
    log(`PSA graded your ${TCG_BY[q.c].n}: a ${g}${g===10?'! Gem mint.':'.'} Worth about ${tcgF(slabVal(s))}.`,g===10?'good':'');if(g===10&&!awayMode&&typeof confetti==='function')confetti(80)}
  for(const k in T.ev.cd)if(T.ev.cd[k]>0)T.ev.cd[k]--;
}
function tsRollGrade(){let r=Math.random();for(const x of TS_GRADE){if(r<x.w)return x.g;r-=x.w}return 8}
const _sdTS=storesDay;storesDay=function(){_sdTS();tsDay()};
Object.assign(A,{
  goStore(d){tab='stores';sub.store=d.k||sub.store;window.scrollTo({top:0})},
  tsBuy(d){const T=tsInit(),w=tsWhole(),k=d.k,c=(k==='case'?TCG_SET.case:k==='box'?TCG_SET.box:TCG_SET.pack)*w*(+d.n||1);if(S.cash<c)return toast('Not enough cash');spend('Store stock',c);T.spent=(T.spent||0)+c;
    if(k==='pack')T.packs+=(+d.n||1);else T.boxes+=(k==='case'?TCG_CASE:1)*(+d.n||1);toast(`Bought ${k==='case'?'a case':k==='box'?'a box':(+d.n||1)+' pack'+((+d.n||1)>1?'s':'')}${w<1?' at wholesale':''}`);if(typeof snd==='function')snd('buy')},
  tsOpenBox(){const T=tsInit();if(!T.boxes)return;T.boxes--;T.packs+=TCG_BOX;toast(`${TCG_BOX} packs unboxed`);if(typeof snd==='function')snd('pack')},
  tsPrice(d){const T=tsInit(),k=d.k,f=1+(+d.d)*.05;if(k==='pack'||k==='box')T.rp[k]=Math.max(.5,Math.round(T.rp[k]*f*100)/100);else T.ap[k]=Math.max(.5,Math.round((T.ap[k]||TS_ACC[k].m)*f*100)/100)},
  tsAcc(d){const T=tsInit(),A2=TS_ACC[d.k],n=+d.n||10,c=A2.w*n*(tsU('b2b')?.85:1);if(S.cash<c)return toast('Not enough cash');spend('Store stock',c);T.acc[d.k]=(T.acc[d.k]||0)+n;toast(`+${n} ${A2.n.toLowerCase()}`)},
  tsSellTog(){const T=tsInit();T.sell=T.sell?0:1},
  tsKeep(d){const T=tsInit();T.keep=Math.max(0,T.keep+(+d.d))},
  tsSF(d){const f=tsSF();f[d.t]=d.t==='min'?+d.k:d.k;sub.tssN=60},
  tsListAll(d){const T=tsInit(),f=tsSF();let n=0;for(const c of TCG_SET.cards){if(!(T.own[c.id]>0)||(f.r!=='all'&&c.r!==f.r)||(f.min>0&&tcgPrice(c)<f.min))continue;if(f.s==='on'&&!T.list[c.id]||f.s==='off'&&T.list[c.id])continue;
    if(d.p==='off'){if(T.list[c.id]){delete T.list[c.id];n++}}else if(!T.list[c.id]){T.list[c.id]=Math.max(.05,Math.round(tcgPrice(c)*100)/100);n++}}
    toast(d.p==='off'?`${n} card${n===1?'':'s'} unlisted`:`${n} card${n===1?'':'s'} listed at market price`)},
  tsList(d){const T=tsInit(),c=TCG_BY[d.k];if(!c)return;if(d.p==='off'){delete T.list[d.k];return}const cur=T.list[d.k]||tcgPrice(c),f=d.p==='up'?1.1:d.p==='down'?.9:1;T.list[d.k]=Math.max(.05,Math.round(cur*f*100)/100)},
  tsGrade(d){const T=tsInit(),c=TCG_BY[d.k];if(!c||!(T.own[d.k]>0))return;const ex=d.x==='1',fee=(ex?100:25)*(1-.3*tsU('psa')),days=Math.max(1,Math.round((ex?3:10)*(1-.3*tsU('psa'))));
    if(S.cash<fee)return toast('Not enough cash');spend('Grading',fee);T.own[d.k]--;if(!(T.own[d.k]>0))delete T.list[d.k];T.psa.push({c:d.k,due:S.day+days});toast(`${c.n} sent to PSA · back in ${days} days`);if(typeof snd==='function')snd('send')},
  tsSlab(d){const T=tsInit(),s=T.slabs.find(x=>x.id==d.id);if(!s)return;if(d.p==='sell'){T.slabs=T.slabs.filter(x=>x!==s);const v=Math.round(slabVal(s)*.85*100)/100;earn('Card sales',v);toast(`Sold the slab to a dealer for ${tcgF(v)}`);return}
    if(d.p==='off'){s.price=null;return}const cur=s.price||slabVal(s),f=d.p==='up'?1.1:d.p==='down'?.9:1;s.price=Math.round(cur*f*100)/100},
  tsEvent(d){const T=tsInit(),E=TS_EV.find(x=>x.id===d.k);if(!E)return;if(T.ev.cd[E.id])return;if(E.need&&tsU(E.need[0])<E.need[1])return toast('Needs a better distributor account');if(S.cash<E.cost)return toast('Not enough cash');
    spend('Events',E.cost);const cap=[24,48,128][tsU('play')],players=Math.min(cap,Math.round(E.base*(1+tsU('play')*.6)*(.8+Math.random()*.5)*Math.sqrt(typeof hypeMult==='function'?hypeMult():1)));
    const fees=players*E.fee;earn('Event entry fees',fees);S.revenue+=fees;S.hype+=Math.round(players/4);T.ev.cd[E.id]=E.cd;T.ev.today=S.day;T.ev.last={id:E.id,players};
    if(E.id==='pre'){const n=Math.min(T.packs,players*6);T.packs-=n;earn('TCG store sales',n*T.rp.pack)}
    log(`${E.n}: ${players} players came. ${fmt(fees)} in entry fees, +${Math.round(players/4)} hype.`,'good');if(typeof confetti==='function')confetti(60);if(typeof snd==='function')snd('level')},
  tsUp(d){const T=tsInit(),U=TS_UP.find(x=>x.id===d.k),l=tsU(d.k);if(!U||l>=U.max)return;const c=U.cost[l];if(S.cash<c)return toast('Not enough cash');spend('Stores',c);T.up[d.k]=l+1;toast(`${U.n} ${l+1}`);if(typeof snd==='function')snd('buy');if(typeof confetti==='function')confetti(30)}
});
/* ---------- scenes ---------- */
function tcgScene(){
  const T=tsInit(),st=S.stores.tcg,ev=T.ev.today===S.day?T.ev.last:null,open=S.staff.some(s=>s.role==='clerk'&&s.store==='tcg')||S.shift.tcg===S.day,cust=Math.min(9,Math.round((T.day.v||0)/10)+(open?2:0)),packs=Math.min(30,T.packs),boxes=Math.min(6,T.boxes);
  const packCols=['#7a2f8f','#3a5cc9','#c9402f','#2f8f6a'];
  let shelf='';for(let i=0;i<packs;i++){const r=i%10,row=Math.floor(i/10);shelf+=`<rect x="${22+r*13}" y="${34+row*22}" width="10" height="16" rx="1.5" fill="${packCols[i%4]}" stroke="#ffd36b55" stroke-width=".6"/>`}
  let bx='';for(let i=0;i<boxes;i++)bx+=`<rect x="${172+(i%3)*22}" y="${44+Math.floor(i/3)*18}" width="20" height="15" rx="1.5" fill="#3a1c5c" stroke="#c9a24a"/><rect x="${174+(i%3)*22}" y="${47+Math.floor(i/3)*18}" width="16" height="4" fill="#c9a24a"/>`;
  const slabs=T.slabs.slice(0,4).map((s,i)=>`<g transform="translate(${252+i*22} 52)"><rect width="18" height="26" rx="2" fill="#e8ecf2"/><rect x="1.5" y="1.5" width="15" height="5" fill="#c4302b"/><text x="9" y="5.7" text-anchor="middle" font-size="4" font-weight="900" fill="#fff">${s.g}</text><rect x="2.5" y="8" width="13" height="16" fill="${TCG_R[TCG_BY[s.c].r].c}" opacity=".8"/></g>`).join('');
  const tables=ev?[0,1,2].map(i=>`<g transform="translate(${70+i*80} 132)"><rect x="-26" y="0" width="52" height="16" rx="3" fill="#5a3d2a"/><rect x="-18" y="3" width="10" height="10" fill="#fff" class="ts-card"/><rect x="8" y="3" width="10" height="10" fill="#fff" class="ts-card c2"/><circle cx="-34" cy="6" r="6" fill="#f1d2b6"/><circle cx="34" cy="6" r="6" fill="#d9a77e"/><rect x="-40" y="10" width="12" height="14" rx="4" fill="#5bd6a6"/><rect x="28" y="10" width="12" height="14" rx="4" fill="#ff6d82"/></g>`).join(''):`<g transform="translate(150 140)"><rect x="-40" y="0" width="80" height="14" rx="3" fill="#5a3d2a" opacity=".7"/><text y="10" text-anchor="middle" font-size="7" fill="#e6dcff" opacity=".7">PLAY AREA</text></g>`;
  const people=Array.from({length:cust},(_,i)=>`<g class="ts-walker" style="--d:${(i*1.7)%9}s;--y:${150+(i%3)*10}px;--s:${7+(i%4)}s"><circle cy="-22" r="5" fill="${['#f1d2b6','#d9a77e','#a86e4b','#f5dcc8'][i%4]}"/><rect x="-6" y="-17" width="12" height="13" rx="4" fill="${['#ff6d82','#5bd6a6','#9fd3ff','#ffd36b','#c79bff'][i%5]}"/><rect x="-4" y="-4" width="3" height="7" fill="#2b2f3a" class="leg"/><rect x="1" y="-4" width="3" height="7" fill="#2b2f3a" class="leg l2"/></g>`).join('');
  return `<div class="ts-scene"><svg viewBox="0 0 340 190" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="tsw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2140"/><stop offset="1" stop-color="#1b1630"/></linearGradient></defs>
    <rect width="340" height="120" fill="url(#tsw)"/><rect y="120" width="340" height="70" fill="#3a2a22"/>${Array.from({length:9},(_,i)=>`<rect x="${i*40}" y="120" width="1" height="70" fill="#00000030"/>`).join('')}
    <rect x="16" y="26" width="140" height="74" rx="3" fill="#4a3424"/>${[0,1,2].map(r=>`<rect x="16" y="${50+r*22}" width="140" height="3" fill="#6b4a32"/>`).join('')}${shelf}
    <rect x="166" y="36" width="72" height="50" rx="3" fill="#4a3424"/>${bx}
    <rect x="246" y="44" width="84" height="44" rx="4" fill="#bfe6ff22" stroke="#bfe6ff66"/>${slabs}<text x="288" y="40" text-anchor="middle" font-size="6" fill="#bfe6ff">GRADED</text>
    <g class="ts-neon"><rect x="120" y="6" width="100" height="16" rx="4" fill="#120c1c" stroke="#3a2a52"/><text x="170" y="18" text-anchor="middle" font-size="10" font-weight="900" fill="#c79bff">RIFT CARDS</text></g>
    <rect x="236" y="104" width="90" height="22" rx="3" fill="#6b4a32"/><rect x="240" y="100" width="82" height="6" fill="#8a5a36"/><rect x="290" y="88" width="18" height="12" rx="2" fill="#2b2f3a"/><rect x="292" y="90" width="14" height="7" fill="${open?'#5bd6a6':'#3a3e48'}" class="${open?'sr-blink':''}"/>
    ${open?'<g transform="translate(262 92)"><circle cy="-6" r="6" fill="#f1d2b6"/><rect x="-7" y="0" width="14" height="10" rx="4" fill="#ffb547"/></g>':''}
    ${tables}${people}
    ${!open&&!ev?'<rect width="340" height="190" fill="#0a0c1a" opacity=".45"/><g transform="translate(170 80)"><rect x="-38" y="-12" width="76" height="22" rx="5" fill="#1b1d24" stroke="#ff6d82"/><text y="4" text-anchor="middle" font-size="11" font-weight="900" fill="#ff6d82">CLOSED</text></g>':''}
    ${ev?`<g transform="translate(170 112)"><rect x="-70" y="-10" width="140" height="16" rx="8" fill="#ffb547"/><text y="1.5" text-anchor="middle" font-size="8" font-weight="900" fill="#2b1a03">${TS_EV.find(e=>e.id===ev.id).n.toUpperCase()} · ${ev.players} PLAYERS</text></g>`:''}
  </svg></div>`;
}
function plainScene(k){
  const D=STORES[k],st=S.stores[k],open=S.staff.some(s=>s.role==='clerk'&&s.store===k)||S.shift[k]===S.day,cust=open?Math.min(7,2+Math.round((st.last||0)/200)):0,cafe=k==='cafe';
  const stockPct=Math.min(1,st.stock/(D.capB*st.level));
  let items='';const n=Math.round(stockPct*24);for(let i=0;i<n;i++)items+=cafe?`<circle cx="${30+(i%12)*20}" cy="${52+Math.floor(i/12)*26}" r="6" fill="${['#ffb3cb','#ffd36b','#c79bff','#9fd3ff'][i%4]}"/>`:`<rect x="${24+(i%12)*20}" y="${36+Math.floor(i/12)*26}" width="8" height="20" rx="1" fill="${['#ff6d82','#5aa6ff','#5bd6a6','#ffd36b','#c79bff'][i%5]}"/>`;
  const people=Array.from({length:cust},(_,i)=>`<g class="ts-walker" style="--d:${(i*1.9)%9}s;--y:${150+(i%3)*10}px;--s:${8+(i%3)}s"><circle cy="-22" r="5" fill="${['#f1d2b6','#d9a77e','#a86e4b'][i%3]}"/><rect x="-6" y="-17" width="12" height="13" rx="4" fill="${['#ff6d82','#5bd6a6','#9fd3ff','#ffd36b'][i%4]}"/><rect x="-4" y="-4" width="3" height="7" fill="#2b2f3a" class="leg"/><rect x="1" y="-4" width="3" height="7" fill="#2b2f3a" class="leg l2"/></g>`).join('');
  return `<div class="ts-scene"><svg viewBox="0 0 340 190" preserveAspectRatio="xMidYMid slice"><rect width="340" height="120" fill="${cafe?'#3a2a34':'#26304a'}"/><rect y="120" width="340" height="70" fill="${cafe?'#5a4038':'#3a2a22'}"/>
    <rect x="16" y="26" width="260" height${cafe?'="10"':'="74"'} rx="3" fill="#4a3424"/>${cafe?'':[0,1].map(r=>`<rect x="16" y="${58+r*26}" width="260" height="3" fill="#6b4a32"/>`).join('')}${items}
    ${cafe?[0,1,2].map(i=>`<g transform="translate(${70+i*90} 140)"><ellipse rx="22" ry="6" fill="#8a5a36"/><rect x="-2" y="0" width="4" height="16" fill="#5a3d2a"/></g>`).join(''):''}
    <g class="ts-neon"><rect x="110" y="4" width="120" height="16" rx="4" fill="#120c1c"/><text x="170" y="16" text-anchor="middle" font-size="9" font-weight="900" fill="${cafe?'#ff9fb8':'#9fd3ff'}">${D.name.toUpperCase()}</text></g>${people}
    ${open?'':'<rect width="340" height="190" fill="#0a0c1a" opacity=".45"/><g transform="translate(170 80)"><rect x="-38" y="-12" width="76" height="22" rx="5" fill="#1b1d24" stroke="#ff6d82"/><text y="4" text-anchor="middle" font-size="11" font-weight="900" fill="#ff6d82">CLOSED</text></g>'}</svg></div>`;
}
/* ---------- the basics every store has (moved here from Shop › Stores) ---------- */
function storeBasics(k){
  const D=STORES[k],st=S.stores[k],clerks=S.staff.filter(s=>s.role==='clerk'&&s.store===k).length,cap=D.capB*st.level,openToday=clerks>0||S.shift[k]===S.day;
  return `<div class="card"><div class="t">${D.name} <span class="chip">Level ${st.level}</span> ${openToday?'<span class="chip good">Open today</span>':'<span class="chip bad">Closed: no clerk</span>'}</div><div class="s">Yesterday ${fmt(st.last||0)} in ${D.item}</div>
    <div style="margin-top:10px">${bar(st.stock/cap*100,'var(--amber)')}<div class="kv"><span>Stock <b>${st.stock}/${cap}</b> ${D.item}</span><span>Clerks <b>${clerks}/${st.level*2}</b></span></div></div>
    <div class="opts"><button class="btn sm primary" data-a="restock" data-k="${k}">Restock ${fmt(Math.min(D.pack,cap-st.stock)*D.unit)}</button>${clerks?'':`<button class="btn sm uv" data-a="shift" data-k="${k}" ${S.shift[k]===S.day?'disabled':''}>Work a shift</button>`}<button class="btn sm" data-a="clerk" data-k="${k}">+ Clerk €85/day</button>${st.level<3?`<button class="btn sm ghost" data-a="storeUp" data-k="${k}">Level up ${fmt(D.cost*(st.level===1?.4:.8))}</button>`:''}${st.merged?'':`<button class="btn sm ghost" data-a="merge" data-k="${k}">Merge ${fmt(D.merge)}</button>`}${st.merged&&k==='cafe'?`<button class="btn sm uv" data-a="workshop" ${S.cds.work?'disabled':''}>${S.cds.work?`Workshop in ${S.cds.work} d`:'Paint workshop'}</button>`:''}</div></div>`;
}
/* ---------- the TCG store pages ---------- */
function tsShelf(){
  const T=tsInit(),w=tsWhole();
  let h=label('Sealed product',`your prices · market ${tcgF(TCG_SET.pack)} a pack`);
  h+=`<div class="group">${[['pack','Booster pack',T.packs,`${T.keep} kept back for opening`],['box','Booster box',T.boxes,`${TCG_BOX} packs each`]].map(([k,n,have,sub2])=>{const m=k==='pack'?TCG_SET.pack:TCG_SET.box,p=T.rp[k];
    return `<div class="item"><div class="ts-ic">${tcgPackArt()}</div><div class="grow"><div class="t">${n} <span class="chip">${have} in stock</span></div><div class="s">${sub2} · market ${tcgF(m)} · <span class="${p>m*1.15?'bad':p<m*.95?'good':''}">${Math.round(p/m*100)}% of market</span></div></div><div class="stepper"><button class="btn sm" data-a="tsPrice" data-k="${k}" data-d="-1">−</button><b>${tcgF(p)}</b><button class="btn sm" data-a="tsPrice" data-k="${k}" data-d="1">+</button></div></div>`}).join('')}
    <div class="item"><div class="grow"><div class="t">Sell packs at the counter</div><div class="s">Keep some back to open yourself</div></div><div class="stepper"><button class="btn sm" data-a="tsKeep" data-d="-5">−5</button><b>${T.keep}</b><button class="btn sm" data-a="tsKeep" data-d="5">+5</button></div><button class="btn sm ${T.sell?'primary':''}" data-a="tsSellTog">${T.sell?'On':'Off'}</button></div></div>`;
  h+=label('Restock sealed',w<1?`wholesale ${Math.round(w*100)}% of market`:'market price · unlock B2B for wholesale')+`<div class="tcg-shop">
    <div class="tcg-prod"><div class="tcg-pi pack">${tcgPackArt()}</div><b>10 packs</b><small>${tcgF(TCG_SET.pack*w)} each</small><button class="btn sm primary" data-a="tsBuy" data-k="pack" data-n="10" ${S.cash<TCG_SET.pack*w*10?'disabled':''}>${tcgF(TCG_SET.pack*w*10)}</button></div>
    <div class="tcg-prod"><div class="tcg-pi box">${tcgPackArt()}${tcgPackArt()}${tcgPackArt()}</div><b>Booster box</b><small>${TCG_BOX} packs</small><button class="btn sm primary" data-a="tsBuy" data-k="box" ${S.cash<TCG_SET.box*w?'disabled':''}>${tcgF(TCG_SET.box*w)}</button></div>
    <div class="tcg-prod"><div class="tcg-pi case">${tcgPackArt()}${tcgPackArt()}${tcgPackArt()}${tcgPackArt()}</div><b>Case</b><small>${TCG_CASE} boxes</small><button class="btn sm primary" data-a="tsBuy" data-k="case" ${S.cash<TCG_SET.case*w?'disabled':''}>${tcgF(TCG_SET.case*w)}</button></div></div>
    ${T.boxes?`<div class="opts"><button class="btn sm" data-a="tsOpenBox">Unbox one box into ${TCG_BOX} packs</button></div>`:''}`;
  h+=label('Accessories','buy in, sell at your price')+`<div class="group">${Object.entries(TS_ACC).map(([k,A2])=>{const p=T.ap[k]||A2.m;return `<div class="item"><span class="ts-acc">${A2.ico}</span><div class="grow"><div class="t">${A2.n} <span class="chip">${T.acc[k]||0}</span></div><div class="s">Buy ${tcgF(A2.w*(tsU('b2b')?.85:1))} · market ${tcgF(A2.m)}</div></div><div style="display:grid;gap:5px;justify-items:end"><div class="stepper"><button class="btn sm" data-a="tsPrice" data-k="${k}" data-d="-1">−</button><b>${tcgF(p)}</b><button class="btn sm" data-a="tsPrice" data-k="${k}" data-d="1">+</button></div><button class="btn sm" data-a="tsAcc" data-k="${k}" data-n="10">+10 · ${tcgF(A2.w*10*(tsU('b2b')?.85:1))}</button></div></div>`}).join('')}</div>`;
  return h;
}
const tsSF=()=>sub.tssF||(sub.tssF={o:'hi',r:'all',s:'all',min:0});
function tsSingles(){
  const T=tsInit(),all=TCG_SET.cards.filter(c=>T.own[c.id]>0),f=tsSF(),num=c=>parseInt(c.no)||0;
  const shown=all.filter(c=>(f.r==='all'||c.r===f.r)&&(f.s==='all'||(f.s==='on'?!!T.list[c.id]:!T.list[c.id]))&&(f.min<=0||tcgPrice(c)>=f.min));
  const SORT={hi:(a,b)=>tcgPrice(b)-tcgPrice(a),lo:(a,b)=>tcgPrice(a)-tcgPrice(b),rar:(a,b)=>(TCG_R[a.r].o-TCG_R[b.r].o)||tcgPrice(b)-tcgPrice(a),name:(a,b)=>a.n.localeCompare(b.n),no:(a,b)=>num(a)-num(b)||a.no.localeCompare(b.no),qty:(a,b)=>(T.own[b.id]-T.own[a.id])||tcgPrice(b)-tcgPrice(a),gap:(a,b)=>((T.list[b.id]||0)/tcgPrice(b))-((T.list[a.id]||0)/tcgPrice(a))};
  shown.sort(SORT[f.o]||SORT.hi);
  const chip=(t,k,n,on,cnt)=>`<button class="${on?'on':''}" data-a="tsSF" data-t="${t}" data-k="${k}">${n}${cnt!=null?` <i>${cnt}</i>`:''}</button>`;
  const rs=Object.keys(TCG_R).filter(r=>all.some(c=>c.r===r));
  let h=label('Your singles',`${Object.keys(T.list).length} listed · ${all.length} different cards · ${all.reduce((a,c)=>a+T.own[c.id],0)} in total`);
  if(all.length)h+=`<div class="card ts-filt">
    <div class="pinv-sort"><span>Sort</span>${[['hi','Price ↓'],['lo','Price ↑'],['rar','Rarity'],['name','Name'],['no','Number'],['qty','Most copies'],['gap','My price %']].map(([k,n])=>chip('o',k,n,f.o===k)).join('')}</div>
    <div class="pinv-sort"><span>Rarity</span>${chip('r','all','All',f.r==='all',all.length)}${rs.map(r=>chip('r',r,TCG_R[r].n,f.r===r,all.filter(c=>c.r===r).length)).join('')}</div>
    <div class="pinv-sort"><span>Show</span>${chip('s','all','All',f.s==='all')}${chip('s','on','Listed',f.s==='on',Object.keys(T.list).length)}${chip('s','off','Not listed',f.s==='off')}</div>
    <div class="pinv-sort"><span>Worth</span>${[[0,'Any'],[1,'€1+'],[10,'€10+'],[50,'€50+'],[200,'€200+']].map(([k,n])=>chip('min',k,n,f.min===k)).join('')}</div>
    <div class="kv" style="margin-top:4px"><span>${shown.length} shown · worth ${tcgF(shown.reduce((a,c)=>a+tcgPrice(c)*T.own[c.id],0))}</span><span style="display:flex;gap:6px"><button class="btn sm" data-a="tsListAll" data-p="set" ${shown.some(c=>!T.list[c.id])?'':'disabled'}>List shown</button><button class="btn sm ghost" data-a="tsListAll" data-p="off" ${shown.some(c=>T.list[c.id])?'':'disabled'}>Unlist shown</button></span></div></div>`;
  const lim=sub.tssN||60;
  h+=all.length&&!shown.length?`<div class="card"><div class="s">No cards match these filters.</div></div>`:'';
  h+=shown.length?`<div class="group">${shown.slice(0,lim).map(c=>{const L=T.list[c.id];return `<div class="item ts-single"><div class="ts-cimg r-${c.r}" style="--rc:${TCG_R[c.r].c}" data-a="tcgView" data-k="${c.id}">${tcgImg(c)}</div><div class="grow"><div class="t">${c.n} <span class="chip">×${T.own[c.id]}</span></div><div class="s"><span style="color:${TCG_R[c.r].c}">${TCG_R[c.r].n}</span> · market ${tcgF(tcgPrice(c))}${L?` · <b class="${L>tcgPrice(c)*1.2?'bad':'good'}">listed ${tcgF(L)}</b>`:''}</div></div>
      <div style="display:grid;gap:5px;justify-items:end">${L?`<div class="stepper"><button class="btn sm" data-a="tsList" data-k="${c.id}" data-p="down">−</button><b>${tcgF(L)}</b><button class="btn sm" data-a="tsList" data-k="${c.id}" data-p="up">+</button></div><button class="btn sm ghost" data-a="tsList" data-k="${c.id}" data-p="off">Unlist</button>`:`<button class="btn sm primary" data-a="tsList" data-k="${c.id}" data-p="set">List at ${tcgF(tcgPrice(c))}</button>`}</div></div>`}).join('')}</div>${shown.length>lim?`<div class="opts"><button class="btn sm" data-a="sub" data-t="tssN" data-k="${lim+60}">Show ${Math.min(60,shown.length-lim)} more</button></div>`:''}`:all.length?'':`<div class="card"><div class="s">Open packs to get singles to sell.</div></div>`;
  h+=`<div class="s cat-help">Customers and collectors buy listed singles over time. Below market they sell fast, above market they wait. Display cases speed it up.</div>`;
  return h;
}
function slabHTML(s){const c=TCG_BY[s.c];return `<div class="ts-slab g${s.g}"><div class="ts-lab"><b>PSA ${s.g}</b><span>${s.g===10?'GEM MT':s.g===9?'MINT':s.g===8?'NM-MT':'NM'}</span><small>${c.n} · ${c.no}</small></div><div class="ts-win">${tcgImg(c)}<i class="tcg-holo"></i></div></div>`}
function tsGrading(){
  const T=tsInit(),fs=1-.3*tsU('psa'),own=TCG_SET.cards.filter(c=>T.own[c.id]>0).sort((a,b)=>tcgPrice(b)-tcgPrice(a)).slice(0,12);
  let h=`<div class="card"><div class="t">PSA grading</div><div class="s">Send a card off and it comes back in a slab with a grade from 7 to 10. A PSA 10 is worth about 4× the raw card, a 9 about 1.7×. Standard ${fmt(25*fs)} (${Math.round(10*fs)} days) · express ${fmt(100*fs)} (${Math.max(1,Math.round(3*fs))} days).</div></div>`;
  if(T.psa.length)h+=label('At PSA',`${T.psa.length} card${T.psa.length>1?'s':''}`)+`<div class="group">${T.psa.map(q=>item(TCG_BY[q.c].n,`Back on day ${q.due} (${Math.max(0,q.due-S.day)} d)`)).join('')}</div>`;
  h+=label('Send to PSA','your most valuable cards')+(own.length?`<div class="group">${own.map(c=>`<div class="item ts-single"><div class="ts-cimg r-${c.r}" style="--rc:${TCG_R[c.r].c}">${tcgImg(c)}</div><div class="grow"><div class="t">${c.n}</div><div class="s">Raw ${tcgF(tcgPrice(c))} · PSA 10 ≈ ${tcgF(Math.max(30,tcgPrice(c)*4))}</div></div><div style="display:grid;gap:5px"><button class="btn sm" data-a="tsGrade" data-k="${c.id}" data-x="0">Standard</button><button class="btn sm primary" data-a="tsGrade" data-k="${c.id}" data-x="1">Express</button></div></div>`).join('')}</div>`:`<div class="card"><div class="s">No cards to send yet.</div></div>`);
  h+=label('Your slabs',`${T.slabs.length}`)+(T.slabs.length?`<div class="ts-slabs">${T.slabs.map(s=>`<div class="ts-slabc">${slabHTML(s)}<div class="s">Worth ${tcgF(slabVal(s))}${s.price?` · <b>listed ${tcgF(s.price)}</b>`:''}</div><div class="ts-sa">${s.price?`<button class="btn sm" data-a="tsSlab" data-id="${s.id}" data-p="down">−</button><button class="btn sm" data-a="tsSlab" data-id="${s.id}" data-p="up">+</button><button class="btn sm ghost" data-a="tsSlab" data-id="${s.id}" data-p="off">Unlist</button>`:`<button class="btn sm primary" data-a="tsSlab" data-id="${s.id}" data-p="set">List</button><button class="btn sm ghost" data-a="tsSlab" data-id="${s.id}" data-p="sell">Dealer ${tcgF(slabVal(s)*.85)}</button>`}</div></div>`).join('')}</div>`:`<div class="card"><div class="s">Graded cards show up here.</div></div>`);
  return h;
}
function tsEvents(){
  const T=tsInit();
  return label('Events','players pay entry and buy packs')+`<div class="group">${TS_EV.map(E=>{const lock=E.need&&tsU(E.need[0])<E.need[1],cd=T.ev.cd[E.id]||0;return item(`${E.n}${lock?' <span class="chip">Needs B2B '+E.need[1]+'</span>':''}`,`${E.d} Setup ${fmt(E.cost)} · €${E.fee} entry · every ${E.cd} days`,`<button class="btn sm primary" data-a="tsEvent" data-k="${E.id}" ${lock||cd||S.cash<E.cost?'disabled':''}>${cd?`In ${cd} d`:'Host'}</button>`)}).join('')}</div><div class="s cat-help">The play area decides how many players fit: ${[24,48,128][tsU('play')]} now.</div>`;
}
function tsUpgrades(){
  return label('Store upgrades')+`<div class="group">${TS_UP.map(U=>{const l=tsU(U.id);return item(`${U.n} <span class="chip">${l}/${U.max}</span>`,`${U.d(l)}${l<U.max?` <span class="f">→ ${U.d(l+1)}</span>`:''}`,l>=U.max?'<span class="chip good">Max</span>':`<button class="btn sm primary" data-a="tsUp" data-k="${U.id}" ${S.cash<U.cost[l]?'disabled':''}>${fmt(U.cost[l])}</button>`)}).join('')}</div>`;
}
/* ---------- the Stores tab ---------- */
const ST_ICO={manga:'📚',tcg:'🃏',cafe:'☕'};
function storesTab(){
  const own=tsOwned();
  if(!own.length)return `<div class="card" style="margin-top:16px"><div class="t">Stores</div><div class="s">Open a store in Shop › Stores and run it from here.</div></div>`;
  if(!own.includes(sub.store))sub.store=own.includes('tcg')?'tcg':own[0];const k=sub.store;
  let h=`<div class="ts-pick">${own.map(x=>`<button class="${x===k?'on':''}" data-a="sub" data-t="store" data-k="${x}"><i>${ST_ICO[x]||'🏬'}</i>${STORES[x].name}</button>`).join('')}</div>`;
  if(k!=='tcg')return h+plainScene(k)+storeBasics(k);
  const T=tsInit();
  h+=tcgScene()+`<div class="ts-today"><div><b>${T.day.v||0}</b><span>customers</span></div><div><b>${tcgF(T.day.rev||0)}</b><span>yesterday</span></div><div><b>${T.packs}</b><span>packs</span></div><div><b>${T.slabs.length}</b><span>slabs</span></div></div>`;
  if(!sub.tss)sub.tss='floor';
  h+=segs('tss',[['floor','Floor'],['shelf','Shelf'],['packs','Open packs',T.packs],['singles','Singles',Object.keys(T.list).length],['psa','Grading',T.psa.length],['events','Events'],['up','Upgrades']]);
  if(sub.tss==='shelf')return h+tsShelf();
  if(sub.tss==='singles')return h+tsSingles();
  if(sub.tss==='psa')return h+tsGrading();
  if(sub.tss==='events')return h+tsEvents();
  if(sub.tss==='up')return h+tsUpgrades();
  if(sub.tss==='packs'){const keep=sub.tcg;sub.tcg=sub.tcgp||'packs';let x=tcgView();sub.tcg=keep;return h+x.replace(/data-t="tcg"/g,'data-t="tcgp"')}
  return h+storeBasics('tcg')+`<div class="card" style="margin-top:12px"><div class="t">How the card shop works</div><div class="s">Stock sealed packs, boxes and accessories on the Shelf and set your prices. Open packs yourself and list the hits as Singles, or grade them at PSA for slabs worth more. Host events for entry fees and hype. Better distributor accounts in Upgrades unlock wholesale prices and bigger events.</div></div>`;
}
VIEWS.stores=storesTab;
/* tcgView reads sub.tcg; inside the store it uses its own key so the two never clash */
const _tvTS=tcgView;tcgView=function(){if(tab==='stores'){const k=sub.tcg;sub.tcg=sub.tcgp||'packs';try{return _tvTS.apply(this,arguments)}finally{sub.tcg=k}}return _tvTS.apply(this,arguments)};
/* the Stores tab sits right after Studio once you own a store */
const ST_TAB=`<button data-tab="stores" class="st-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 9l2-5h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/></svg>Stores</button>`;
const _rST=render;render=function(){
  const tabs=document.getElementById('tabs');
  if(tabs){const has=tabs.querySelector('[data-tab="stores"]'),want=tsOwned().length>0;
    if(want&&!has){const st=tabs.querySelector('[data-tab="studio"]');st?st.insertAdjacentHTML('afterend',ST_TAB):tabs.insertAdjacentHTML('afterbegin',ST_TAB)}else if(!want&&has)has.remove()}
  if(tab==='stores'&&!tsOwned().length)tab='studio';
  return _rST.apply(this,arguments);
};
/* Shop › TCG counter now opens the store */
const _vbTS=VIEWS.buy;VIEWS.buy=function(){if(sub.buy==='tcg'){sub.buy='hub';tab='stores';sub.store='tcg';return storesTab()}return _vbTS.apply(this,arguments)};
/* ---------- 4.43: stores rebirth with the studio, but your card collection is kept ----------
   (4.39 to 4.42 kept the whole store.) Now the stores, their level, till, clerks, upgrades and accessories reset,
   while sealed packs and boxes, every card you pulled, your slabs and cards out at PSA carry over. Retail level is kept. */
function storesCarry(o){
  if(o&&o.tcg){const T=o.tcg;S.tcg={packs:T.packs||0,boxes:T.boxes||0,own:T.own||{},opened:T.opened||0,best:T.best||null,spent:T.spent||0,sold:T.sold||0,seen:T.seen||{},slabs:T.slabs||[],psa:T.psa||[]}}
  if(o&&o.retail)S.retail=o.retail;
}
const _rbSK=doRebirth;doRebirth=function(d){const o=S;const g=_rbSK(d);storesCarry(o);if(o.tcg&&((o.tcg.packs||0)+Object.keys(o.tcg.own||{}).length))log('Your stores closed with the old company, but your Riftbound packs, cards and slabs came with you.','good');return g};
const _rsSK=restartRun;restartRun=function(){const o=S;_rsSK();storesCarry(o)};
