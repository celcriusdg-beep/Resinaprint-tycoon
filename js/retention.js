/* Retention & comfort (4.7): first-visit tips on every screen, a daily login streak, low-effects mode, text size and contrast. */
/* ---------- tips ---------- */
const TIPS={
  studio:['Your studio','Prints finish on their own. Tap a station to wash, paint, pack or send by hand, or hire people and machines to do it. Your goal is the gold bar at the top.'],
  orders:['Orders','Customers order figures you have in stock. Pack them, then send the dispatch bay when it fills or when a courier comes. Money arrives a few days after you send.'],
  buy:['The Shop','Everything you can buy lives here. Printers and resin first, then space, stores, dispatch upgrades and the fleet. Prices go up, so buy what you need now.'],
  team:['Your team','People do jobs for you: painting, packing, repairs. Machines never get tired. Watch morale: a tired team quits.'],
  'empire:company':['Company','Your company worth, taxes and reports. Register at the KvK when hobby sales get serious.'],
  'empire:vault':['The Vault','Levelling up earns chests. Rarer chests give more cash, items and printers. Printers go to storage first, so place them from Items.'],
  'empire:items':['Items','Usable items from chests and goals. Printers waiting in storage are listed here: place them in a free spot or sell them.'],
  'empire:rebirth':['Rebirth','Restart in a new country and keep Resin Shards, perks and your vault. Perks are permanent. Do not hoard too many shards: black matter gets unstable.'],
  'empire:sing':['Singularity','Fuse shards into Cores and forge printers far beyond the shop. Each machine needs the one before it. Nothing here resets your company.'],
  'empire:rivals':['Rivals','Rival companies take a share of your demand. Undercut them, sabotage them, or buy them out for a permanent bonus.'],
  'empire:auto':['Auto board','Switch on rules that run your empire: send the bay, rebuy resin, place printers, service machines. They cost real money but no energy.'],
  'shop:dispatch':['Dispatch','Packed orders wait in the bay. A bigger bay, more pickups and faster payouts all speed up your income.'],
  'shop:fleet':['Fleet & garage','Vehicles enlarge the bay, cut shipping and add pickups. They cost upkeep every day and need garage slots.']
};
const tipsSeen=()=>{try{return JSON.parse(localStorage.getItem('resinaprint-tips')||'{}')}catch(e){return {}}};
const tipsSave=o=>{try{localStorage.setItem('resinaprint-tips',JSON.stringify(o))}catch(e){}};
function tipKey(){
  if(tab==='empire')return 'empire:'+(sub.empire||'company');
  if(tab==='buy'&&sub.buy&&['dispatch','fleet'].includes(sub.buy))return 'shop:'+sub.buy;
  return tab;
}
function tipBanner(){
  if(!S||!S.started||(S.lv||1)>40)return '';
  const k=tipKey(),t=TIPS[k];if(!t||tipsSeen()[k])return '';
  return `<div class="tipbar"><span class="tipi">?</span><div class="grow"><b>${t[0]}</b><div>${t[1]}</div></div><button class="btn sm" data-a="tipOk" data-k="${k}">Got it</button></div>`;
}
const _wrapView=(name,key)=>{const f=VIEWS[name];VIEWS[name]=function(){return tipBanner()+f.apply(this,arguments)}};
['studio','orders','buy','team','empire'].forEach(n=>_wrapView(n));
Object.assign(A,{
  tipOk(d){const o=tipsSeen();o[d.k]=1;tipsSave(o)},
  tipsReset(){tipsSave({});toast('Tips will show again')}
});
/* ---------- daily login streak ---------- */
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const dstr=()=>{try{return JSON.parse(localStorage.getItem('resinaprint-daily')||'{"last":"","streak":0}')}catch(e){return{last:'',streak:0}}};
const dstrSave=o=>{try{localStorage.setItem('resinaprint-daily',JSON.stringify(o))}catch(e){}};
const DAILY=[
  {t:'Pocket money',f:()=>{const c=Math.max(500,Math.round(value(S)*.002));earn('Daily reward',c);return fmt(c)}},
  {t:'A helpful item',f:()=>{const k=pickItem(1);addItem(k);return ITEMS[k].n}},
  {t:'A chest',f:()=>{vaultAdd(S,Math.max(3,S.lv));return 'Chest (level '+Math.max(3,S.lv)+')'}},
  {t:'Bigger pocket money',f:()=>{const c=Math.max(1500,Math.round(value(S)*.005));earn('Daily reward',c);return fmt(c)}},
  {t:'A rare item',f:()=>{const k=pickItem(3);addItem(k);return ITEMS[k].n}},
  {t:'A better chest',f:()=>{vaultAdd(S,Math.max(8,S.lv+3));return 'Chest (level '+Math.max(8,S.lv+3)+')'}},
  {t:'Jackpot',f:()=>{vaultAdd(S,Math.max(12,S.lv+6));const n=2+Math.floor((S.lv||1)/15);rebOf(S).shards+=n;rebOf(S).total+=n;return `Chest + ${n} Resin Shards`}}
];
function dailyDue(){return !!S&&S.started&&!S.over&&dstr().last!==dayKey()}
function dailyShow(after){
  const D=dstr(),today=dayKey(),y=new Date(Date.now()-864e5),yk=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
  const streak=D.last===yk?D.streak+1:1,idx=(streak-1)%7;
  pending=[{f:()=>{if(typeof after==='function')after()}}];
  modal(`<div class="kicker">Daily reward</div><h3>Welcome back</h3><div class="dstreak">${DAILY.map((r,i)=>`<div class="dday ${i<idx?'done':i===idx?'now':''}"><b>${i+1}</b><small>${i===6?'★':i%3===2?'▣':i%3===1?'◆':'€'}</small></div>`).join('')}</div><p style="text-align:center;margin:10px 0 2px">Day ${streak}: <b>${DAILY[idx].t}</b></p><div class="acts" style="margin-top:12px"><button class="btn primary" data-a="dailyClaim">Claim</button></div>`);
}
A.dailyClaim=function(){
  const D=dstr(),y=new Date(Date.now()-864e5),yk=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
  const streak=D.last===yk?D.streak+1:1,idx=(streak-1)%7,got=DAILY[idx].f();
  dstrSave({last:dayKey(),streak});closeModal();confetti(50);snd('level');toast('Claimed: '+got);log(`Daily reward (day ${streak}): ${got}.`,'good');
};
let _dailyTried=false;
setInterval(()=>{
  if(_dailyTried||!dailyDue()||modalOpen()||(S.lv||1)<2)return;
  if(typeof patchDue==='function'&&patchDue())return;
  _dailyTried=true;dailyShow();
},4000);
/* ---------- comfort: low effects, text size, contrast, reduced motion ---------- */
const comfy=()=>{let c={fx:'auto',text:'normal',contrast:false,calm:false};try{Object.assign(c,JSON.parse(localStorage.getItem('resinaprint-comfort')||'{}'))}catch(e){}return c};
function comfyApply(){
  const c=comfy(),low=c.fx==='low'||(c.fx==='auto'&&((navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||4)<=2));
  const b=document.documentElement;
  b.classList.toggle('lowfx',low);b.classList.toggle('hicon',!!c.contrast);b.classList.toggle('calm',!!c.calm);
  b.dataset.text=c.text;
}
const comfySet=(k,v)=>{const c=comfy();c[k]=v;try{localStorage.setItem('resinaprint-comfort',JSON.stringify(c))}catch(e){}comfyApply()};
comfyApply();
Object.assign(A,{
  comfy(d){comfySet(d.k,d.v==='true'?true:d.v==='false'?false:d.v);toast('Saved')},
  comfyTog(d){comfySet(d.k,!comfy()[d.k]);toast('Saved')}
});
function comfyCard(){
  const c=comfy(),btn=(k,v,l)=>`<button class="btn sm ${c[k]===v?'on':''}" data-a="comfy" data-k="${k}" data-v="${v}">${l}</button>`;
  return `<div class="card" style="margin-top:12px"><div class="t">Performance &amp; comfort</div>
   <div class="s" style="margin-top:4px">Effects: auto picks low on older phones. Low turns off sparks, glows and icon animations to save battery.</div><div class="animbtns">${btn('fx','auto','Auto')}${btn('fx','full','Full')}${btn('fx','low','Low')}</div>
   <div class="s" style="margin-top:12px">Text size</div><div class="animbtns">${btn('text','normal','Normal')}${btn('text','large','Large')}${btn('text','xl','Extra large')}</div>
   <div class="opts"><button class="btn sm ${c.contrast?'primary':''}" data-a="comfyTog" data-k="contrast">High contrast ${c.contrast?'on':'off'}</button><button class="btn sm ${c.calm?'primary':''}" data-a="comfyTog" data-k="calm">Reduce motion ${c.calm?'on':'off'}</button><button class="btn sm" data-a="tipsReset">Show tips again</button></div></div>`;
}
