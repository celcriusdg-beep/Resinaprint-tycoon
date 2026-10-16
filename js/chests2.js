/* Chests 2 (4.49): 42 new items, 8 permanent relics, 5 special chests, timed buffs, and every resin reward shows its own bottle.
   - Items go to Empire › Items like before. Many give a timed buff (faster prints, more demand, cheaper resin...).
   - Relics are ultra rare, used automatically and kept forever, even through rebirth. A duplicate turns into 5 Resin Shards.
   - Special chests: Golden chest, Resin crate, Collector's chest, Singularity cache and Mystery box. They drop from normal
     chests, big deals and rebirths, and can be bought with Resin Shards in the Vault. */
const IC={
  bolt:'<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>',cup:'<path d="M3 6h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M11 7h1.5a1.5 1.5 0 0 1 0 3H11"/>',
  clock:'<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',coin:'<circle cx="8" cy="8" r="6"/><path d="M8 4.5v7M10 6H7a1.2 1.2 0 0 0 0 2.4h2a1.2 1.2 0 0 1 0 2.4H6"/>',
  drop:'<path d="M8 2C6 5 3.5 7.5 3.5 10.2a4.5 4.5 0 0 0 9 0C12.5 7.5 10 5 8 2z"/>',box:'<path d="M2 5l6-3 6 3v6l-6 3-6-3zM2 5l6 3 6-3M8 8v6"/>',
  up:'<path d="M2 12l4-4 3 3 5-6"/><path d="M10 5h4v4"/>',mega:'<path d="M3 7v3l8 3V4zM3 7l8-3M5 10l1 3"/>',heart:'<path d="M8 13s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"/>',
  gear:'<circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4"/>',
  star:'<path d="M8 1.8l1.9 3.9 4.2.6-3 3 .7 4.2L8 11.4 4.2 13.5l.7-4.2-3-3 4.2-.6z"/>',key:'<circle cx="5" cy="8" r="3"/><path d="M8 8h6M12 8v2.5M14 8v2"/>',
  gem:'<path d="M3 6l2.5-3h5L13 6l-5 7z"/><path d="M3 6h10M6.5 3 8 6l1.5-3"/>',crown:'<path d="M2 12h12M3 12 2 5l3.5 3L8 3l2.5 5L14 5l-1 7"/>',
  scroll:'<path d="M4 2.5h7a1.5 1.5 0 0 1 1.5 1.5v9H5.5A1.5 1.5 0 0 1 4 11.5z"/><path d="M6.5 6h4M6.5 8.5h4"/>',rocket:'<path d="M8 1.5c3 2 4 5 3 9H5c-1-4 0-7 3-9z"/><path d="M5 10.5 3 13h3M11 10.5l2 2.5h-3"/>',
  shield:'<path d="M8 1.8 13 4v4c0 3-2.2 5.2-5 6.3C5.2 13.2 3 11 3 8V4z"/>',ticket:'<path d="M2 5h12v2a1.5 1.5 0 0 0 0 3v2H2v-2a1.5 1.5 0 0 0 0-3z"/><path d="M10 5v7"/>',
  chart:'<path d="M2 14h12M4 14V9M8 14V5M12 14V2"/>',people:'<circle cx="5.5" cy="5.5" r="2"/><circle cx="11" cy="6" r="1.7"/><path d="M1.5 13c0-2.2 1.8-3.8 4-3.8s4 1.6 4 3.8M9.5 13c0-1.6 1-2.8 2.5-2.8S14.5 11.4 14.5 13"/>',
  shard:'<path d="M8 2l5 5-5 7-5-7z"/>',dice:'<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><circle cx="5.7" cy="5.7" r=".8"/><circle cx="10.3" cy="10.3" r=".8"/><circle cx="8" cy="8" r=".8"/>'
};
/* ---------- timed buffs ---------- */
const BUFF={spd:'prints faster',dem:'more demand',inc:'more income',res:'cheaper resin',ship:'cheaper shipping',xp:'more XP',nrg:'less energy per task',calm:'markets do not fill up',qual:'figure quality',wage:'lower wages'};
const bufOf=()=>S.buf||(S.buf={});
const bufV=t=>{const b=S&&S.buf&&S.buf[t];return b&&b.until>S.abs?b.m:0};
function addBuf(t,m,h){const B=bufOf(),c=B[t];B[t]={m:c&&c.until>S.abs?Math.max(c.m,m):m,until:Math.max(c&&c.until>S.abs?c.until:0,S.abs)+h}}
const bufTxt=(t,m,h)=>t==='qual'?`+${m.toFixed(2)} quality on new prints for ${h>=24?Math.round(h/24)+' days':h+' h'}`:t==='calm'?`markets stay calm for ${Math.round(h/24)} days`:`${Math.round(m*100)}% ${BUFF[t]} for ${h>=24?Math.round(h/24)+' days':h+' h'}`;
/* ---------- relics: permanent, survive rebirth ---------- */
const RELICS={
  first:{n:"Founder's first print",d:'+3% on all income, forever',ico:IC.star},
  spatula:{n:'Golden spatula',d:'Prints 5% faster, forever',ico:IC.gear},
  vat:{n:'Crystal vat',d:'Resin costs 5% less, forever',ico:IC.drop},
  banner:{n:'Fan-made banner',d:'+5% demand for everything, forever',ico:IC.mega},
  dice:{n:'Lucky dice',d:'Every chest rolls with more luck, forever',ico:IC.dice},
  brush:{n:'Ancient brush',d:'+0.05 quality on every print, forever',ico:IC.crown},
  mug:{n:'Bottomless coffee mug',d:'Wake up with +25% energy every morning, forever',ico:IC.cup},
  heart:{n:'Black matter heart',d:'+2 Resin Shards on every rebirth, forever',ico:IC.shard}
};
const relOf=()=>(S.reb&&(S.reb.relics||(S.reb.relics={})))||{};
const rel=k=>!!(S&&S.reb&&S.reb.relics&&S.reb.relics[k]);
function giveRelic(){const ks=Object.keys(RELICS),k=ks[Math.floor(Math.random()*ks.length)],R=relOf();
  if(R[k]){if(S.reb){S.reb.shards+=5;S.reb.total+=5}return {k:'relic',t:'Relic (duplicate → 5 shards)',v:RELICS[k].n,big:1,art:relicArt(k)}}
  R[k]=S.day||1;log(`RELIC FOUND: ${RELICS[k].n}. ${RELICS[k].d}.`,'good');return {k:'relic',t:'RELIC · kept forever',v:`${RELICS[k].n}: ${RELICS[k].d}`,big:1,art:relicArt(k)}}
const relicArt=k=>`<span class="relic-ico"><svg viewBox="0 0 16 16" aria-hidden="true">${RELICS[k].ico}</svg></span>`;
/* ---------- helpers for item effects ---------- */
const cashAmt=m=>Math.max(50,Math.round(25*m*Math.pow(S.lv||1,1.7)));
const giveCash=(m,t)=>{const c=cashAmt(m);earn('Vault rewards',c);toast(`+${fmt(c)}`);if(t)log(`${t}: +${fmt(c)}.`,'good')};
const ownFams=()=>{const f=new Set(S.printers.map(p=>PRINTERS[p.type].fam||'vat'));f.add('vat');return f};
function resinPick(lo,hi){const f=ownFams(),ks=Object.keys(RESINS).filter(k=>{const R=RESINS[k];return !R.mix&&f.has(R.fam)&&R.q>=lo&&R.q<=hi});return ks.length?ks[Math.floor(Math.random()*ks.length)]:'estd'}
function giveResin(k,bottles){const R=RESINS[k],ml=(R.vol||1000)*bottles;S.resin[k]=(S.resin[k]||0)+ml;return {k:'resin',t:'Resin',v:`${bottles} × ${R.name}`,art:resinArt(k)}}
const skipH=h=>{advance(h);S.lastT=Date.now();afterSim();toast(`+${h} h`)};
const buffItem=(id,t,m,h)=>()=>{addBuf(t,m,h);takeItem(id);toast(bufTxt(t,m,h))};
/* ---------- 42 new items ---------- */
const NEW_ITEMS=[
  ['snack','Energy bar',0,'Refills 15% of your max energy.',IC.bolt,()=>{S.energy=Math.min(Math.round(maxE()*1.2),S.energy+Math.round(maxE()*.15));takeItem('snack');toast('Energy +15%')}],
  ['tape','Packing tape roll',0,'Packs and ships up to 3 orders you have stock for.',IC.box,()=>{let n=0;while(n<3&&packableIdx()>=0&&packOne())n++;if(!n)return toast('No order has stock yet');takeItem('tape');toast(`Shipped ${n}`)}],
  ['ipa','IPA refill can',0,'Washes and cures up to 20 prints.',IC.drop,()=>{let left=20,n=0;for(const k of PKEYS){const m=Math.min(left,S.unwashed[k]);S.unwashed[k]-=m;S.cured[k]+=m;left-=m;n+=m}if(!n)return toast('Nothing to wash');takeItem('ipa');toast(`Washed ${n}`)}],
  ['tipjar','Tip jar',0,'A little cash, more at higher levels.',IC.coin,()=>{takeItem('tipjar');giveCash(1)}],
  ['flyers','Flyer stack',0,'+8 hype.',IC.mega,()=>{S.hype+=8;takeItem('flyers');toast('+8 hype')}],
  ['nap','Power nap',1,'Refills 40% of your max energy.',IC.clock,()=>{S.energy=Math.min(Math.round(maxE()*1.2),S.energy+Math.round(maxE()*.4));takeItem('nap');toast('Energy +40%')}],
  ['night','All-nighter',1,'Skips 2 hours for free.',IC.clock,()=>{takeItem('night');skipH(2)}],
  ['sample','Sample bottle',1,'One bottle of a good resin for your printers.',IC.drop,()=>{const g=giveResin(resinPick(.05,.2),1);takeItem('sample');toast(g.v)}],
  ['envelope','Envelope of cash',1,'Some cash, more at higher levels.',IC.coin,()=>{takeItem('envelope');giveCash(3)}],
  ['gloves','Box of nitrile gloves',1,'Tasks cost 25% less energy for 12 hours.',IC.shield,buffItem('gloves','nrg',.25,12)],
  ['overclock','Overclock chip',2,'Prints 15% faster for 24 hours.',IC.bolt,buffItem('overclock','spd',.15,24)],
  ['shoutout','Influencer shoutout',2,'+20% demand for 24 hours.',IC.mega,buffItem('shoutout','dem',.2,24)],
  ['courier','Courier coupon',2,'Shipping 50% cheaper for 2 days.',IC.ticket,buffItem('courier','ship',.5,48)],
  ['pizza','Pizza party',2,'Every team member +25 morale.',IC.heart,()=>{if(!S.staff.length)return toast('No team yet');S.staff.forEach(s=>s.mood=clamp(s.mood+25,0,100));takeItem('pizza');toast('Team morale +25')}],
  ['crate','Premium resin crate',2,'Three bottles of a premium resin.',IC.box,()=>{const g=giveResin(resinPick(.15,.3),3);takeItem('crate');toast(g.v)}],
  ['xpweek','Double XP weekend',3,'Studio XP +100% for 2 days.',IC.star,buffItem('xpweek','xp',1,48)],
  ['research','Market research report',3,'Every market is 30% less saturated.',IC.chart,()=>{const s=S.sat||{};for(const k in s)s[k]*=.7;takeItem('research');toast('Markets 30% calmer')}],
  ['supplier','Supplier discount',3,'Resin 40% cheaper for 3 days.',IC.drop,buffItem('supplier','res',.4,72)],
  ['golden','Golden hour',3,'+15% income for 24 hours.',IC.coin,buffItem('golden','inc',.15,24)],
  ['rolodex','Rolodex',3,'A new big-deal client calls right now.',IC.scroll,()=>{if(typeof dealsOf!=='function'||!dealsOpen())return toast('Big deals open at level 5');const D=dealsOf();if(D.board.length>=3)return toast('The deal board is full');const d=newDeal();if(!d)return toast('No client right now');d.exp=S.day+5;D.board.push(d);takeItem('rolodex');toast(`${d.client} is on the board`)}],
  ['calib','Calibration kit',3,'+0.10 quality on new prints for 2 days.',IC.gear,buffItem('calib','qual',.1,48)],
  ['weekend','Weekend away',4,'Skips 8 hours for free.',IC.clock,()=>{takeItem('weekend');skipH(8)}],
  ['investor','Investor envelope',4,'A big pile of cash.',IC.coin,()=>{takeItem('investor');giveCash(10,'Investor envelope')}],
  ['subsidy','Wage subsidy',4,'Wages and employer costs 50% lower for 7 days.',IC.people,buffItem('subsidy','wage',.5,168)],
  ['sparekey','Spare key',4,'Two extra chests at your level.',IC.key,()=>{vaultAdd(S,S.lv||1);vaultAdd(S,S.lv||1);takeItem('sparekey');toast('+2 chests in the vault')}],
  ['hashtag','Trending hashtag',4,'+120 hype.',IC.up,()=>{S.hype+=120;takeItem('hashtag');toast('+120 hype')}],
  ['turbo','Turbo firmware',5,'Prints 30% faster for 3 days.',IC.rocket,buffItem('turbo','spd',.3,72)],
  ['tv','TV feature',5,'+50% demand for 2 days.',IC.mega,buffItem('tv','dem',.5,48)],
  ['season','Fresh market season',5,'Clears the saturation of every market, and keeps them calm for 2 days.',IC.chart,()=>{S.sat={};addBuf('calm',1,48);takeItem('season');toast('Every market is fresh')}],
  ['notes',"Master sculptor's notes",5,'Every listed figure +0.15 quality right now.',IC.scroll,()=>{for(const k of PKEYS)if(S.listed[k])S.qual[k]=(S.qual[k]||0)+.15;takeItem('notes');toast('+0.15 quality on every listed figure')}],
  ['goldkey','Golden key',5,'Opens a Golden chest (Legendary or better, extra items).',IC.key,()=>{addSpecial('gold');takeItem('goldkey');toast('A Golden chest is in the vault')}],
  ['retreat','Team-building retreat',6,'Every team member gains a level (up to 5).',IC.people,()=>{const st=S.staff.filter(s=>s.role!=='clerk'&&!s.mach&&(s.lvl||1)<5);if(!st.length)return toast('No one can learn more');st.forEach(s=>{s.xp=XPN[(s.lvl||1)-1];levelUp(s)});takeItem('retreat');toast(`${st.length} people levelled up`)}],
  ['viral','Viral moment',6,'+30% income for 3 days.',IC.rocket,buffItem('viral','inc',.3,72)],
  ['fragment','Resin shard fragment',6,'+3 Resin Shards.',IC.shard,()=>{if(S.reb){S.reb.shards+=3;S.reb.total+=3}takeItem('fragment');toast('+3 Resin Shards')}],
  ['voucher','Printer voucher',6,'A printer from your best unlocked group, sent to storage.',IC.ticket,()=>{const ks=Object.keys(PRINTERS).filter(k=>{const D=PRINTERS[k];return !D.inj&&!D.sing&&!(typeof printerLock==='function'&&printerLock(D))});if(!ks.length)return toast('No printer available');const g=Math.max(...ks.map(k=>PRINTERS[k].grp)),pool=ks.filter(k=>PRINTERS[k].grp===g),k=pool[Math.floor(Math.random()*pool.length)];(S.pinv=S.pinv||[]).push({id:nid(),type:k});takeItem('voucher');toast(`${PRINTERS[k].name} is in storage`)}],
  ['crystal','Time crystal',7,'Skips 24 hours for free.',IC.gem,()=>{takeItem('crystal');skipH(24)}],
  ['angel','Angel investor',7,'A fortune in cash.',IC.crown,()=>{takeItem('angel');giveCash(40,'Angel investor')}],
  ['philo',"Philosopher's resin",7,'+0.40 quality on new prints for 3 days.',IC.drop,buffItem('philo','qual',.4,72)],
  ['singkey','Singularity key',7,'Opens a Singularity cache (Mythic or better, Resin Shards, a shot at a relic).',IC.key,()=>{addSpecial('cache');takeItem('singkey');toast('A Singularity cache is in the vault')}],
  ['core','Black matter core',8,'+10 Resin Shards.',IC.shard,()=>{if(S.reb){S.reb.shards+=10;S.reb.total+=10}takeItem('core');toast('+10 Resin Shards')}],
  ['lottery','Lottery ticket',8,'1 in 10 chance of a jackpot worth 500× a tip jar. Otherwise 5×.',IC.ticket,()=>{takeItem('lottery');if(Math.random()<.1){giveCash(500,'JACKPOT');if(typeof confetti==='function')confetti(200)}else giveCash(5)}],
  ['relicmap','Relic map',8,'Leads you to a relic. Kept forever.',IC.scroll,()=>{takeItem('relicmap');const g=giveRelic();toast(g.v.split(':')[0])}]
];
for(const [id,n,r,d,ico,use] of NEW_ITEMS){ITEMS[id]={n,r,d,ico};ITEM_USE[id]=use}
IKEYS.length=0;IKEYS.push(...Object.keys(ITEMS));
/* ---------- buff hooks ---------- */
const _jhC2=jobHours;jobHours=function(p){return _jhC2(p)/(1+bufV('spd')+(rel('spatula')?.05:0))};
const _demC2=demand;demand=function(k){const d=_demC2(k);return d>0?d*(1+bufV('dem')+(rel('banner')?.05:0)):d};
const _earnC2=earn;earn=function(cat,a){if(a>0&&typeof RB_SKIP!=='undefined'&&!RB_SKIP.includes(cat))a*=1+bufV('inc')+(rel('first')?.03:0);return _earnC2(cat,a)};
const _spC2=spend;spend=function(cat,a){if(a>0){if(cat==='Resin')a*=(1-bufV('res'))*(rel('vat')?.95:1);else if(cat==='Shipping')a*=1-bufV('ship');else if(cat==='Wages'||cat==='Employer costs'||cat==='Store wages'||cat==='Store employer costs')a*=1-bufV('wage')}return _spC2(cat,a)};
const _axC2=addXp;addXp=function(n){return _axC2(n*(1+bufV('xp')))};
const _ueC2=useE;useE=function(n){return _ueC2(n>0?Math.max(1,Math.round(n*(1-bufV('nrg')))):n)};
const _toC2=takeOrders;takeOrders=function(k,n,wom){const b=S.sat&&S.sat[k]||0;const t=_toC2(k,n,wom);if(bufV('calm')&&S.sat){if(b)S.sat[k]=b;else delete S.sat[k]}return t};
const _colC2=collect;collect=function(p){const k=p.job&&p.job.prod;const r=_colC2(p);if(k){const q=bufV('qual')+(rel('brush')?.05:0);if(q)S.qual[k]=(S.qual[k]||0)+q*.4}return r};
const _eodC2=endOfDay;endOfDay=function(){_eodC2();if(rel('mug'))S.energy=Math.min(maxE(),S.energy+Math.round(maxE()*.25))};
const _rbC2=doRebirth;doRebirth=function(d){const o=S;const g=_rbC2(d);if(o.buf)delete o.buf;if(rel('heart')&&S.reb){S.reb.shards+=2;S.reb.total+=2}addSpecial('gold');log('Rebirth gift: a Golden chest is waiting in the vault.','amber');return g};
/* ---------- special chests ---------- */
const SPECIAL={
  gold:{n:'Golden chest',min:4,luck:1,items:2,col:'#ffd45e',cost:40,d:'Legendary or better, plus 2 extra items.'},
  resin:{n:'Resin crate',min:2,luck:0,items:0,col:'#4fd8c8',cost:15,d:'Rare or better, plus 4 to 8 bottles of premium resin.'},
  coll:{n:"Collector's chest",min:3,luck:.5,items:3,imin:3,col:'#c39bff',cost:25,d:'Epic or better, plus 3 items of Epic rank or higher.'},
  cache:{n:'Singularity cache',min:5,luck:2,items:1,col:'#9d6bff',cost:120,shards:5,relic:.06,d:'Mythic or better, +5 Resin Shards and a 6% shot at a relic.'},
  mystery:{n:'Mystery box',min:0,luck:0,items:1,col:'#ff7fd0',cost:10,relic:.01,d:'Anything goes, from Common to Ethern. 1% shot at a relic.'}
};
const RELIC_CH=[0,0,0,0,0,0,0,.005,.04,.15];
const SP_DROP=[0,0,.02,.04,.06,.08,.1,.12,.15,.2];
function addSpecial(t){const v=vaultOf(S);v.chests.unshift({lv:Math.max(1,S.lv||1),sp:t})}
let curChest=null;
const _vrC2=vaultRoll;vaultRoll=function(ch){curChest=ch;const v=vaultOf(S),X=ch&&ch.sp&&SPECIAL[ch.sp];
  if(rel('dice')&&!X)ch={...ch,lv:ch.lv+12};
  if(X&&ch.sp==='mystery'){const w=[30,22,16,12,8,5,3.5,2,1,.5],t=w.reduce((a,b)=>a+b,0);let x=Math.random()*t,k=0;for(;k<9;k++){x-=w[k];if(x<0)break}return k}
  let i=_vrC2(X?{...ch,lv:ch.lv+X.luck*20,big:true}:ch);return X?Math.max(i,X.min):i};
const _vgC2=vaultGive;vaultGive=function(i,lv){
  const got=_vgC2(i,lv),ch=curChest||{},X=ch.sp&&SPECIAL[ch.sp];curChest=null;
  for(const g of got)if(g.k==='resin'&&!g.art){const R=Object.keys(RESINS).find(k=>g.v.endsWith(RESINS[k].name));if(R)g.art=resinArt(R)}
  if(X){
    if(ch.sp==='resin'){const n=2+Math.floor(Math.random()*2);for(let j=0;j<n;j++)got.push(giveResin(resinPick(.12+i*.02,.3+i*.05),1+Math.floor(Math.random()*3)))}
    for(let j=0;j<(X.items||0);j++){const id=pickItem(Math.max(X.imin||0,Math.min(8,i)));addItem(id);got.push({k:'item',t:'Item',v:ITEMS[id].n,art:itemIco(id)})}
    if(X.shards&&S.reb){S.reb.shards+=X.shards;S.reb.total+=X.shards;got.push({k:'shards',t:'Resin Shards',v:'+'+X.shards})}
  }
  if(Math.random()<Math.max(RELIC_CH[i],X&&X.relic||0))got.push(giveRelic());
  if(!X&&Math.random()<SP_DROP[i]){const r=Math.random(),t=r<.35?'resin':r<.6?'coll':r<.8?'gold':r<.95?'mystery':'cache';addSpecial(t);got.push({k:'special',t:'Special chest',v:SPECIAL[t].n,big:1})}
  for(const g of got)if(g.k==='item'&&!g.art){const id=IKEYS.find(k=>ITEMS[k].n===g.v);if(id)g.art=itemIco(id)}
  if(X)log(`${X.n} opened.`,'good');
  return got};
const itemIco=id=>{const I=ITEMS[id],c=RARITIES[Math.min(9,I.r)].col;return `<span class="it-ico" style="color:${c};border-color:${c}"><svg viewBox="0 0 16 16" aria-hidden="true">${I.ico}</svg></span>`};
/* special chest look: tinted chest, name in the reveal */
const _svrC2=showVaultReveal;showVaultReveal=function(i,lv,got,big,left){const ch=lastOpened;_svrC2(i,lv,got,big,left);
  if(ch&&ch.sp){const X=SPECIAL[ch.sp],m=document.querySelector('.vrv');if(m){m.classList.add('sp-'+ch.sp);const kk=m.querySelector('.kicker');if(kk)kk.textContent=X.n;m.querySelectorAll('.vrv-c img').forEach(e=>e.classList.add('sp-'+ch.sp))}}};
let lastOpened=null;
{const f=A.openChest;A.openChest=function(){const v=vaultOf(S);lastOpened=v.chests[0]||null;return f.apply(this,arguments)}}
chestSlot=function(c,i){return `<div class="cslot ${c.big?'big':''} ${c.sp?'sp':''}" style="--d:${i}"><div class="cs-art">${CHEST_SVG(c.big,false).replace('class="chestimg','class="chestimg '+(c.sp?'sp-'+c.sp:''))}</div><b>${c.sp?SPECIAL[c.sp].n.split(' ')[0]:c.big?'Crate':'Lv '+c.lv}</b></div>`};
A.buySpecial=function(d){const X=SPECIAL[d.k];if(!X||!S.reb)return;if(S.reb.shards<X.cost)return toast('Not enough Resin Shards');S.reb.shards-=X.cost;addSpecial(d.k);toast(`${X.n} added to the vault`);if(typeof snd==='function')snd('buy')};
{const f=dealComplete;dealComplete=function(d){f(d);if(Math.random()<.3){addSpecial('coll');log(`${d.client} also sent a Collector's chest.`,'good')}}}
const _vvC2=vaultView;vaultView=function(){
  let h=_vvC2.apply(this,arguments);const sh=(S.reb&&S.reb.shards)||0,R=relOf(),have=Object.keys(RELICS).filter(k=>R[k]).length;
  h+=label('Special chests','drop from chests, big deals and rebirths · or buy with Resin Shards')+`<div class="group">${Object.keys(SPECIAL).map(k=>{const X=SPECIAL[k];return `<div class="item"><div class="sp-thumb">${CHEST_SVG(false,false).replace('class="chestimg','class="chestimg sp-'+k)}</div><div class="grow"><div class="t" style="color:${X.col}">${X.n}</div><div class="s">${X.d}</div></div><button class="btn sm shardbtn" data-a="buySpecial" data-k="${k}" ${sh<X.cost?'disabled':''}>${typeof shardSvg==='function'?shardSvg(11):''} ${X.cost}</button></div>`}).join('')}</div>`;
  h+=label('Relics',`${have} of ${Object.keys(RELICS).length} found · kept forever, even through rebirth`)+`<div class="relic-grid">${Object.keys(RELICS).map(k=>`<div class="relic ${R[k]?'on':''}">${relicArt(k)}<b>${R[k]?RELICS[k].n:'???'}</b><small>${R[k]?RELICS[k].d:'Ultra rare: Cosmic and Ethern chests, Singularity caches, Relic maps'}</small></div>`).join('')}</div>`;
  return h};
/* active buffs at the top of Items */
const _ivC2=itemsView;itemsView=function(){const h=_ivC2.apply(this,arguments),B=bufOf(),on=Object.keys(B).filter(t=>B[t].until>S.abs);if(!on.length)return h;
  return `<div class="card buf-card"><div class="t">Active boosts</div>${on.map(t=>{const b=B[t],left=b.until-S.abs;return `<div class="kv"><span>${t==='qual'?`+${b.m.toFixed(2)} quality on new prints`:t==='calm'?'Markets stay calm':`+${Math.round(b.m*100)}% · ${BUFF[t]}`}</span><span>${left>=24?Math.ceil(left/24)+' d':Math.ceil(left)+' h'} left</span></div>`}).join('')}</div>`+h};
