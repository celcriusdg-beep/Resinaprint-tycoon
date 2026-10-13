/* Helpers, game state (new game, save migration, local + cloud save) and derived stats. */
/* ---------- helpers ---------- */
const eur=new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const fmt=n=>eur.format(Math.round(n));
const sfmt=n=>(n>=0?'+':'−')+eur.format(Math.abs(Math.round(n)));
const r=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(r(a,b+1));
const pick=a=>a[Math.random()*a.length|0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function poisson(l){if(l<=0)return 0;if(l>30)return Math.max(0,Math.round(l+Math.sqrt(l)*(Math.random()+Math.random()+Math.random()-1.5)*2));let L=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random()}while(p>L);return k-1}
const BOLT='<svg class="bolt" viewBox="0 0 10 14" aria-hidden="true"><path d="M6 0 0 8h4l-1 6 7-9H6z" fill="currentColor"/></svg>';
const en=n=>n>0?`<span class="e" aria-label="${n} energy">${BOLT}${n}</span>`:'';
const L=ml=>(ml/1000).toFixed(ml<10000?2:1)+' L';

/* ---------- state ---------- */
let S;
const newRep=s=>({day:s.day,cash0:s.cash,rating0:s.rating,hype0:s.hype,earn:{},spend:{},you:{},team:{},printed:0,failed:0,finished:0,shipped:0,newOrders:0,cancelled:0,ignored:0,delivered:0,lost:0,damaged:0,hours:0,events:[]});
const newBiz=()=>({kvk:false,kor:false,form:'none',vatOut:0,vatIn:0,vatDue:null,yrRev:0,yrNext:YEAR+1,qNext:QUARTER+1,taxBase:0,wkInc:0,wkExp:0,waste:0,perm:{},ins:false,korCd:0,warned:false});
function fresh(){
  const s={inv:{service:1},country:'nl',reb:newReb(),vault:newVault(),lv:1,xp:0,cdSeen:0,soldBy:{},trend:null,diff:'normal',theme:'amber',seenVer:VERSION,always:{},target:{},autoP:{},quest:null,revs:[],sale:null,crunch:false,pre:{},stop:{},clear:{},soc:{},boost:null,wom:0,lastBig:0,grant:false,v:2,day:1,hour:8,cash:800,energy:200,rating:3.5,reviews:0,hype:5,ws:0,washer:'bucket',
    resin:{estd:1000},prices:{},listed:{},qual:{},unwashed:{},cured:{},stock:{},
    printers:[{id:1,type:'mars',resin:'estd',vat:300,cond:90,prod:'chibi',state:'idle',job:null,auto:true,sc:false}],
    orders:[{id:2,p:'desk',age:0,dest:'nl',ch:'web'},{id:3,p:'chibi',age:0,dest:'nl',ch:'web'}],dms:[],offers:[],contracts:[],staff:[],stores:{},up:{},cds:{},shift:{},
    sold:0,revenue:0,contractsDone:0,hist:[800],log:[],done:{},started:false,over:false,unread:0,nextId:10,paintBank:0,packBank:0,lunchCd:0,drinks:0,m:0,abs:0,lastT:Date.now(),repDue:false,warnDay:0,
    biz:newBiz(),loans:[],parcels:[],dstat:{sent:0,del:0,lost:0,dmg:0},ship:{nl:'postnl',eu:'postnl',world:'postnl'},car:{postnl:true},ch:{web:true},mk:{resin:1,comp:1},moulds:{},season:0};
  for(const k of PKEYS){s.prices[k]=PRODUCTS[k].ref;s.listed[k]=['chibi','bust','desk'].includes(k);s.qual[k]=0;s.unwashed[k]=0;s.cured[k]=0;s.stock[k]=0}
  s.cured.desk=1;
  s.log=[{d:1,t:'You set up an Elegoo Mars 4 Ultra in the hok. Two customers already ordered from your webshop.',k:'amber'}];
  s.rep=newRep(s);
  return s;
}
function patch(s){
  const old=!s.biz;
  if(!s.lv){s.lv=1;let xp=s.sold||0;while(xp>=XP_NEED(s.lv)){xp-=XP_NEED(s.lv);s.lv++}s.xp=xp}
  if(!s.vault){s.vault=newVault();for(let l=2;l<=Math.min(s.lv,13);l++)vaultAdd(s,l)}
  if(!s.inv)s.inv={service:1};
  if(!s.reb)s.reb=newReb();s.reb.branches=s.reb.branches||{};s.country=s.country||'nl';
  s.xp=s.xp||0;s.cdSeen=s.cdSeen===undefined?(s.contractsDone||0):s.cdSeen;s.soldBy=s.soldBy||{};s.diff=s.diff||'normal';s.theme=s.theme||'amber';if(s.seenVer===undefined)s.seenVer='';if(s.trend===undefined)s.trend=null;
  if(!s.rep)s.rep=newRep(s);
  s.drinks=s.drinks||0;s.m=s.m||0;s.abs=s.abs||0;s.lastT=s.lastT||Date.now();s.paused=false;s.repDue=false;s.warnDay=s.warnDay||0;
  if(old){
    s.biz=newBiz();
    if(s.staff.length||s.ws>=1||Object.keys(s.stores).length||s.revenue>=1500){s.biz.kvk=true;s.biz.form='eenmanszaak';s.biz.kor=true;s.biz.qNext=s.day+QUARTER;s.biz.yrNext=s.day+YEAR}
    if(s.washer==='formwc')s.washer='formwcl';
  }else s.biz=Object.assign(newBiz(),s.biz);
  s.pre=s.pre||{};s.target=s.target||{};s.always=s.always||{};s.autoP=s.autoP||{};s.revs=s.revs||[];s.sale=s.sale||null;s.crunch=!!s.crunch;s.quest=s.quest||null;s.stop=s.stop||{};s.clear=s.clear||{};s.soc=s.soc||{};s.wom=s.wom||0;s.lastBig=s.lastBig||0;s.boost=s.boost||null;s.loans=s.loans||[];s.parcels=s.parcels||[];s.dstat=s.dstat||{sent:0,del:0,lost:0,dmg:0};
  s.ship=s.ship||{nl:'postnl',eu:'postnl',world:'postnl'};s.car=s.car||{postnl:true};s.ch=s.ch||{web:true};s.mk=s.mk||{resin:1,comp:1};s.moulds=s.moulds||{};s.season=s.season||0;
  for(const k of PKEYS)if(s.prices[k]==null){s.prices[k]=PRODUCTS[k].ref;s.listed[k]=false;s.qual[k]=0;s.unwashed[k]=0;s.cured[k]=0;s.stock[k]=0}
  s.orders.forEach(o=>{if(!o.dest){o.dest=pickDest();o.ch='web'}});
  s.staff.forEach(x=>{x.lvl=x.lvl||1;x.xp=x.xp||0;x.cd=0;x.act='';if(x.trait===undefined)x.trait=x.role==='clerk'?'':pick(['quick','careful','efficient'])});
  s.printers.forEach(p=>{if(p.auto===undefined)p.auto=true;if(p.sc===undefined)p.sc=false});
  if(s.up.bench&&s.energy>100+30)s.energy=130;
  return s;
}
function load(){try{const j=localStorage.getItem('resinaprint-tycoon-v2');if(j){const s=JSON.parse(j);if(s&&s.v===2)return patch(s)}}catch(e){}return null}
function save(){S.savedAt=Date.now();try{localStorage.setItem('resinaprint-tycoon-v2',JSON.stringify(S))}catch(e){}queueCloud()}
/* cloud save: one private document per player, so progress survives the app closing */
let cloudRef=null,cloudBusy=false,cloudDirty=false,cloudTimer=null;
function queueCloud(){if(!cloudRef)return;cloudDirty=true;clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloud,800)}
async function flushCloud(){
  if(!cloudRef||cloudBusy||!cloudDirty)return;
  cloudBusy=true;cloudDirty=false;clearTimeout(cloudTimer);
  try{await cloudRef.set({v:2,savedAt:S.savedAt||Date.now(),json:JSON.stringify(S)})}
  catch(e){if(!e||e.code==='unavailable')cloudDirty=true}
  cloudBusy=false;if(cloudDirty)queueCloud();
}
async function initCloud(){
  try{
    if(!window.claude?.use)return;
    const [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);
    if(!db||!user)return;
    const id=await user.id();if(!id)return;
    const ref=db.doc('data/users/'+id+'/save');
    const snap=await ref.get();
    cloudRef=ref;
    if(snap.exists){
      const d=snap.data();
      if(d&&typeof d.json==='string'&&(d.savedAt||0)>(S.savedAt||0)){
        const s=JSON.parse(d.json);
        if(s&&s.v===2){S=patch(s);lastHTML='';
          if(modalOpen()&&S.started&&!S.over)closeModal();
          try{localStorage.setItem('resinaprint-tycoon-v2',JSON.stringify(S))}catch(e){}
          render();toast('Save loaded');return}
      }
    }
    if(S.started){cloudDirty=true;flushCloud()}
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushCloud()});
window.addEventListener('pagehide',()=>flushCloud());
const nid=()=>S.nextId++;
const upv=k=>{let a=0;for(const u of UPGRADES)if(S.up[u.id]&&u[k])a+=u[k];return a};
const regen=()=>{const night=S.hour>=23||S.hour<7;let r=regenDay();if(night)r*=1.5+upv('nr');if(S.energy<15)r*=1+upv('low');return r};
const ecm=()=>1-Math.min(.6,upv('ec'));
const space=()=>{const b=SPACES[S.ws];return{...b,rent:Math.round(b.rent*cm('rent')),printers:b.printers+(S.up.racks?2:0)+(S.up.mezz?4:0)+upv('sp'),staff:b.staff+(S.up.mezz?4:0)+(S.up.office?3:0)+upv('st')}};
const maxE=()=>Math.round(flatMaxE()*(1+pctMaxE()));
const studioStaff=()=>S.staff.filter(s=>s.role!=='clerk'&&!s.mach);
const countRole=k=>S.staff.filter(s=>s.role===k).length;
const wages=()=>Math.round(S.staff.reduce((a,s)=>a+s.wage,0)*(S.up.night?1.2:1)*(S.crunch?1.4:1)*(1-Math.min(.3,upv('wag')))*diffM().wage*cm('wage'));
const shift=()=>S.up.night?[6,22]:[8,18];
const shiftLen=()=>{const a=shift();return a[1]-a[0]};
const skill=s=>(1+.2*((s.lvl||1)-1))*(s.trait==='quick'?1.25:1)*(s.pw||1);
const ofRole=r=>S.staff.filter(s=>s.role===r);
const ofTrait=(r,t)=>ofRole(r).filter(s=>s.trait===t).length;
const sumRole=(r,f)=>ofRole(r).reduce((a,s)=>a+f(s),0);
const printRate=()=>1+Math.min(.6,sumRole('tech',s=>.04*skill(s)))+Math.min(.5,upv('spd'))+perk('spd')*.02+(hasBranch('kr')?.03:0)+(S.crunch?.25:0);
const failMult=()=>Math.max(.4,1-sumRole('tech',s=>.03*((s.lvl||1)-1)+(s.trait==='careful'?.12:0)))*(1-Math.min(.5,upv('fail')))*diffM().fail;
const resinMult=()=>(1-Math.min(.25,.12*ofTrait('tech','efficient')))*(1-Math.min(.2,upv('rsn')));
const qualBonus=()=>Math.min(.35,upv('qual')+sumRole('post',s=>.01*((s.lvl||1)-1)+(s.trait==='careful'?.04:0))+sumRole('painter',s=>.01*((s.lvl||1)-1)+(s.trait==='careful'?.04:0))+sumRole('inspector',s=>.03*skill(s)));
const supportPower=()=>Math.min(.5,sumRole('support',s=>.12*(1+.1*((s.lvl||1)-1)+(s.trait==='careful'?.25:0))));
const socialHype=()=>sumRole('social',s=>3*(1+.15*((s.lvl||1)-1))*(s.trait==='efficient'?1.3:1))+sumRole('photographer',s=>1.5*skill(s));
const hypeKeep=()=>.94+.01*Math.min(2,ofTrait('social','careful'));
const shipSave=()=>ofTrait('packer','efficient')?.5:0;
const designMult=()=>1+Math.min(.25,sumRole('designer',s=>.06*skill(s)*(s.trait==='careful'?1.3:1)));
const photoMult=()=>1+Math.min(.2,sumRole('photographer',s=>.05*skill(s)*(s.trait==='careful'||s.trait==='efficient'?1.2:1)));
const logiSave=()=>Math.min(.3,sumRole('logistics',s=>.07*skill(s)*(s.trait==='efficient'?1.3:1)));
const lossMult=()=>Math.pow(.75,ofRole('logistics').length)*(ofTrait('logistics','careful')?.8:1)*(1-Math.min(.6,upv('loss')));
const dmgMult=()=>Math.pow(.7,ofRole('inspector').length)*(ofTrait('inspector','careful')?.8:1)*(1-Math.min(.6,upv('dmg')));
const wearMult=()=>Math.pow(.75,ofRole('engineer').length)*(ofTrait('engineer','careful')?.85:1)*(1-Math.min(.5,upv('wear')))*(hasBranch('de')?.95:1);
const salesMult=()=>1+Math.min(.5,upv('pay')+(hasBranch('us')?.04:0)+sumRole('salesrep',s=>.05*skill(s)*(s.trait==='careful'?1.4:1)));
const rent=()=>space().rent+Object.keys(S.stores).filter(k=>S.stores[k].open).reduce((a,k)=>a+STORES[k].rent,0);
const maxTier=()=>S.printers.reduce((a,p)=>Math.max(a,PRINTERS[p.type].tier),-1);
const unlocked=k=>!PRODUCTS[k].req||S.up[PRODUCTS[k].req];
const makeable=k=>unlocked(k)&&PRODUCTS[k].tier<=maxTier();
const sellable=k=>S.listed[k]&&makeable(k);
const resinPrice=k=>RESINS[k].cost*(S.up.bulk?.8:1)*S.mk.resin*(1-perk('rsn')*.02-(hasBranch('br')?.04:0))*cm('resin');
const mf=s=>.5+s.mood/200;
const short=p=>PRINTERS[p.type].name.replace(/^(Elegoo|Anycubic|Phrozen|Formlabs|Creality|Stratasys|3D Systems|Prusa|Carbon|Nexa3D|Asiga|Engel|Arburg|Babyplast) /,'').replace(/ \((PolyJet|injection)\)/,'')+' #'+p.id;
const E0={start:()=>4,collect:()=>3,refill:()=>S.up.feeder?0:2,clean:()=>6,service:()=>8,pack:()=>S.up.label?2:3,dm:()=>S.up.inbox?1:2,deliver:()=>6,restock:()=>5,shift:()=>40};
const E=Object.fromEntries(Object.keys(E0).map(k=>[k,()=>{const v=E0[k]();return v>0?Math.max(1,Math.round(v*ecm())):0}]));
const season=()=>SEASONS[Math.floor(((S.day-1)%YEAR)/28)];
const chanMult=()=>Object.keys(S.ch).filter(k=>S.ch[k]).reduce((a,k)=>a+CHANNELS[k].w,0);
const wearName=D=>D.lab?'Core module':D.inj?'Screw barrel':D.pj?'Printhead set':D.form?'Resin tank':'FEP film';
const wearNew=D=>D.lab?'New core':D.inj?'New screw':D.pj?'New printheads':D.form?'New tank':'New FEP';
const amt=(k,ml)=>RESINS[k].fam==='inj'?(ml/1000).toFixed(1)+' kg':L(ml);
const energyBill=()=>Math.round(S.printers.reduce((a,p)=>{const D=PRINTERS[p.type];return a+(D.pow||[2,5,10,150][D.tier])},0)*(S.up.solar?.6:1)*(1-Math.min(.6,upv('pow'))));
const wasteCost=()=>S.printers.length?Math.round(4+S.biz.waste/1000*3*(S.up.recycle?.4:1)):0;
function value(s){return s.cash+s.printers.reduce((a,p)=>a+PRINTERS[p.type].cost*.5*(p.cond/100),0)+PKEYS.reduce((a,k)=>a+s.stock[k]*s.prices[k]*.6,0)+SPACES.slice(1,s.ws+1).reduce((a,w)=>a+w.cost*.3,0)+Object.keys(s.stores).reduce((a,k)=>a+(s.stores[k].open?STORES[k].cost*(.6+.3*(s.stores[k].level-1))*(s.stores[k].merged?1.5:1):0),0)-s.loans.reduce((a,l)=>a+l.bal,0)-Math.max(0,s.biz.vatOut-s.biz.vatIn)}
function demand(k){
  if(!sellable(k))return 0;
  const Pd=PRODUCTS[k];
  let d=Pd.base*(1+S.hype/50)*Math.pow(S.rating/4.5,3)*Math.pow(Pd.ref*designMult()/S.prices[k],2.2)*(1+Math.log10(1+S.sold)/2);
  if(S.up.lightbox)d*=1.1; if(S.up.theme)d*=1.15; if(S.up.franchise)d*=1.5; if(S.up.ip)d*=1.1;
  d*=saleMult()*earlyBoost()*socDem()*boostMult()*(1+Math.min(.8,upv('dem')))*photoMult()*season().m*S.mk.comp*chanMult()*trendMult(k)*(1+lvDem())*diffM().dem*(1+rebDem())*cm('dem')*(1+ctryFav(k));
  return d;
}
function need(k){return S.orders.filter(o=>o.p===k).length+S.contracts.filter(c=>c.p===k).reduce((a,c)=>a+c.qty,0)-S.stock[k]}
function log(t,k){S.log.unshift({d:S.day,t,k:k||''});if(S.log.length>90)S.log.length=90;S.unread++;if(simulating&&S.rep.events.length<40)S.rep.events.push({t,k:k||''})}
function useE(n){if(n<=0)return true;if(S.energy<n){toast('You are too tired. Energy refills by itself, or hire help');return false}S.energy-=n;return true}
function review(score){S.rating=clamp(S.rating+(score-S.rating)*.035,1,5);S.reviews++}
const SALES=['Webshop sales','bol.com sales','Etsy sales','Counter sales','Store sales','Contracts','Con booth sales','Wholesale','Tournaments','Workshops','Crowdfunding'];
const VATCATS=['Resin','Printers','Equipment','Marketing','Shipping','Repairs','Upgrades','Packaging','Store stock','Training','IPA & gloves','Moulds','Moving'];
const NONDED=['Income tax','Corporate tax','BTW','Fines','Loan repayment','Investor share'];
function earn(cat,a){
  S.cash+=a;S.rep.earn[cat]=(S.rep.earn[cat]||0)+a;
  const b=S.biz;if(!b.kvk||a<=0)return;
  if(SALES.includes(cat)){const net=b.kor?a:a/1.21;if(!b.kor)b.vatOut+=a-net;b.yrRev+=net;b.wkInc+=net;if(b.kor&&b.yrRev>KOR_LIMIT)endKor()}
  else if(cat!=='BTW refund'&&cat!=='Loan'&&cat!=='Investor')b.wkInc+=a;
}
function spend(cat,a){
  S.cash-=a;S.rep.spend[cat]=(S.rep.spend[cat]||0)+a;
  const b=S.biz;if(!b.kvk||a<=0)return;
  let net=a;if(!b.kor&&VATCATS.includes(cat)){net=a/1.21;b.vatIn+=a-net}
  if(!NONDED.includes(cat))b.wkExp+=net;
}
function did(k,n=1,team){const o=team?S.rep.team:S.rep.you;o[k]=(o[k]||0)+n}

