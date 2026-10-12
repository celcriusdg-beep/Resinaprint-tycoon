/* Content packs v10-v12: social media, word of mouth, events, big offers, catalog, contracts, quests, reviews. */
/* ---------- v10: social media, word of mouth, events, big offers, more upgrades ---------- */
const SOCIALS={
  tiktok:{name:'TikTok',e:12,g:[25,110],h:.6,scale:3000,cap:.25,v:.10,note:'Short print timelapses'},
  instagram:{name:'Instagram',e:10,g:[15,60],h:.5,scale:2500,cap:.2,v:.05,note:'Photos and reels of finished figures'},
  facebook:{name:'Facebook groups',e:8,g:[10,45],h:.4,scale:3000,cap:.18,v:.04,note:'Anime and collector groups'},
  youtube:{name:'YouTube Shorts',e:30,g:[8,40],h:.8,scale:1500,cap:.3,v:.07,note:'Slower, but followers stick'},
  pinterest:{name:'Pinterest',e:6,g:[10,40],h:.3,scale:3000,cap:.12,v:.03,note:'Pins that bring buyers for months'},
  reddit:{name:'Reddit',e:10,g:[5,70],h:.4,scale:2000,cap:.15,v:.14,note:'Hit or miss, sometimes huge'},
  twitch:{name:'Twitch',e:25,g:[5,35],h:.7,scale:1200,cap:.2,v:.05,note:'Stream your prints live'},
  x:{name:'X',e:6,g:[8,30],h:.25,scale:4000,cap:.1,v:.04,note:'Quick posts and replies'}
};
Object.assign(CHANNELS,{
  marktplaats:{name:'Marktplaats',w:.2,fee:.02,fix:0,feeName:'Marketplace fees',cost:0,note:'Free local listings, 2% fee',cat:'Marktplaats sales'},
  facebook:{name:'Facebook Shop',w:.25,fee:.05,fix:.1,feeName:'Marketplace fees',cost:150,note:'Sell to your followers, 5% fee',cat:'Facebook sales'},
  tiktokshop:{name:'TikTok Shop',w:.3,fee:.06,fix:.2,feeName:'Marketplace fees',cost:300,kvk:1,note:'Buy button under your videos, 6% fee',cat:'TikTok Shop sales'},
  instashop:{name:'Instagram Shop',w:.25,fee:.05,fix:.1,feeName:'Marketplace fees',cost:200,kvk:1,note:'Tagged products in your posts, 5% fee',cat:'Instagram sales'}
});
['Marktplaats sales','Facebook sales','TikTok Shop sales','Instagram sales','Sponsorships'].forEach(x=>SALES.push(x));
CAMPAIGNS.push(
  {id:'fbpost',name:'Facebook group posts',cost:0,energy:8,hype:3,cd:1,fol:{facebook:40},desc:'Post your latest print in anime and collector groups.'},
  {id:'flyers',name:'Flyers at café and school',cost:40,energy:15,hype:7,cd:3,desc:'Print flyers and hang them up around Friesland.'},
  {id:'redditama',name:'Reddit AMA',cost:0,energy:20,hype:10,cd:5,fol:{reddit:150},minSold:10,desc:'Answer questions about resin printing. Needs 10 sales.'},
  {id:'twitchstream',name:'Twitch print stream',cost:0,energy:30,hype:12,cd:3,fol:{twitch:90},desc:'Stream a full print from start to finish.'},
  {id:'pinads',name:'Pinterest promoted pins',cost:120,hype:12,cd:3,fol:{pinterest:120},desc:'Promote your best product photos.'},
  {id:'ytshort',name:'YouTube Shorts push',cost:150,hype:20,cd:4,fol:{youtube:180},desc:'Pay to boost a Short.'},
  {id:'fbads',name:'Facebook ads',cost:100,hype:14,cd:2,fol:{facebook:120},desc:'Target anime fans in the Netherlands and Belgium.'},
  {id:'ttads',name:'TikTok ads',cost:200,hype:24,cd:3,fol:{tiktok:250},desc:'Boost your timelapse to new viewers.'},
  {id:'giveaway',name:'Instagram giveaway',cost:80,hype:22,cd:4,gift:1,fol:{instagram:350},desc:'Give away one figure from stock for follows and shares.'},
  {id:'local',name:'Local newspaper ad',cost:250,hype:20,cd:7,desc:'The Leeuwarder Courant reaches everyone nearby.'},
  {id:'fair',name:'Hobby fair stand',cost:1000,hype:60,cd:14,sell:15,minSold:20,desc:'Sell up to 15 figures from stock at a hobby fair.'},
  {id:'cosplayc',name:'Cosplay collab',cost:500,hype:40,cd:8,fol:{instagram:600,tiktok:300},minRating:3.8,desc:'A cosplayer shoots photos with your figures. Needs 3.8★.'},
  {id:'podcast',name:'Podcast sponsorship',cost:800,hype:45,cd:12,minSold:40,desc:'Sponsor an anime podcast. Needs 40 sales.'},
  {id:'radio',name:'Radio spot',cost:900,hype:50,cd:10,minSold:50,desc:'A regional radio ad. Needs 50 sales.'},
  {id:'billboard',name:'Billboard in Leeuwarden',cost:2500,hype:90,cd:21,minSold:150,desc:'Everyone drives past it. Needs 150 sales.'},
  {id:'bolweek',name:'Bol.com campaign week',cost:600,hype:10,cd:21,boost:{m:1.3,days:7},kvk:1,needCh:'bol',desc:'+30% demand for a week. You must sell on bol.com.'}
);
UCATS.splice(0,UCATS.length,['energy','Energy'],['prod','Production'],['sales','Sales'],['social','Media'],['team','Team'],['biz','Business']);
const FXT={
  rg:v=>`+${v} energy regen per hour`,e:v=>`+${v} max energy`,ec:v=>`Every task costs ${Math.round(v*100)}% less energy`,nr:v=>`Night regen +${Math.round(v*100)}%`,
  spd:v=>`Prints ${Math.round(v*100)}% faster`,fail:v=>`${Math.round(v*100)}% fewer failed prints`,rsn:v=>`${Math.round(v*100)}% less resin used`,wear:v=>`Printers wear ${Math.round(v*100)}% slower`,
  pow:v=>`Electricity ${Math.round(v*100)}% lower`,qual:v=>`+${v.toFixed(2)}★ print quality`,pay:v=>`Contracts pay ${Math.round(v*100)}% more`,dem:v=>`+${Math.round(v*100)}% demand`,
  hyp:v=>`+${v} hype a day`,shp:v=>`Shipping ${Math.round(v*100)}% cheaper`,loss:v=>`Lost parcels ${Math.round(v*100)}% rarer`,dmg:v=>`Damaged parcels ${Math.round(v*100)}% rarer`,
  mo:v=>`Staff morale drops ${Math.round(v*100)}% slower`,xp:v=>`Staff learn ${Math.round(v*100)}% faster`,wag:v=>`Wages ${Math.round(v*100)}% lower`,
  post:v=>`Social posts win ${Math.round(v*100)}% more followers`,viral:v=>`+${Math.round(v*100)}% chance a post goes viral`,wom:v=>`+${Math.round(v*100)}% word-of-mouth chance`,
  evg:v=>`Good surprises ${Math.round(v*100)}% more likely`,evb:v=>`Bad surprises ${Math.round(v*100)}% less likely`,fee:v=>`Marketplace and payment fees ${Math.round(v*100)}% lower`,
  tax:v=>`Income tax ${Math.round(v*100)}% lower`,offer:v=>`Big company offers ${Math.round(v*100)}% more often`,sp:v=>`+${v} printer spot${v>1?'s':''}`,st:v=>`+${v} staff spot${v>1?'s':''}`
};
const mkU2=(id,cat,name,cost,fx,x)=>({id,cat,name,cost,desc:Object.keys(fx).map(k=>FXT[k](fx[k])).join(' · ')+'.',...fx,...(x||{})});
const needKv=()=>({req:()=>S.biz.kvk,reqText:'Register at the KvK first'});
const soldN=n=>({req:()=>S.sold>=n,reqText:`Sell ${n} figures first`});
const staffN=n=>({req:()=>S.staff.length>=n,reqText:n===1?'Hire someone first':`Hire ${n} people first`});
UPGRADES.push(
  // ---- media ----
  mkU2('tripod','social','Phone tripod',60,{post:.1}),
  mkU2('ringlight','social','Ring light',90,{post:.1}),
  mkU2('editapp','social','Video editing app',120,{post:.15}),
  mkU2('hashtags','social','Hashtag research',150,{post:.1}),
  mkU2('trending','social','Trend tracker app',180,{post:.1,viral:.02}),
  mkU2('clipmic','social','Clip-on microphone',200,{post:.12}),
  mkU2('sched','social','Post scheduler',250,{post:.1,ec:.02}),
  mkU2('greens','social','Green screen backdrop',300,{post:.12}),
  mkU2('gimbal','social','Phone gimbal',400,{post:.15,viral:.02}),
  mkU2('calendar','social','Content calendar',600,{post:.15}),
  mkU2('brandkit','social','Brand style kit',500,{dem:.04}),
  mkU2('macro','social','Macro lens',700,{post:.15,qual:.02}),
  mkU2('giveapp','social','Giveaway tool',800,{post:.1,hyp:1}),
  mkU2('studiolights','social','Studio lights',900,{post:.2}),
  mkU2('camera','social','Mirrorless camera',1200,{post:.25,dem:.03}),
  mkU2('tiktokfund','social','TikTok creator programme',1500,{viral:.04,hyp:1},soldN(100)),
  mkU2('stream','social','Livestream setup',1500,{viral:.04,hyp:2}),
  mkU2('commtool','social','Community manager tool',1800,{hyp:2,wom:.03}),
  mkU2('verified','social','Verified badges',2000,{post:.2,hyp:2},soldN(300)),
  mkU2('collabnet','social','Creator collab network',2500,{viral:.05,post:.15},{req:()=>S.hype>=40,reqText:'Reach 40 hype first'}),
  mkU2('ambass','social','Ambassador programme',3500,{wom:.06,hyp:3},soldN(200)),
  mkU2('podstudio','social','Podcast studio',5000,{hyp:4,post:.2},needWs(1)[0]),
  mkU2('loyapp','social','Own loyalty app',8000,{wom:.08,dem:.08},needWs(2)[0]),
  mkU2('agency','social','Social media agency',12000,{post:.4,viral:.05,hyp:4},needWs(2)[0]),
  mkU2('viral','social','Viral content lab',25000,{viral:.08,post:.3},needWs(3)[0]),
  // ---- word of mouth and sales ----
  mkU2('thankyou','sales','Thank-you cards',150,{wom:.03}),
  mkU2('sticker','sales','Sticker in every parcel',200,{wom:.03}),
  mkU2('codes','sales','Discount code tool',250,{dem:.03}),
  mkU2('giftwrap','sales','Gift wrap option',300,{dem:.03,wom:.02}),
  mkU2('banners','sales','Seasonal shop banners',350,{dem:.04}),
  mkU2('referral','sales','Refer-a-friend codes',400,{wom:.05}),
  mkU2('chat','sales','Live chat widget',400,{dem:.04}),
  mkU2('photowall','sales','Customer photo wall',500,{wom:.03,hyp:1}),
  mkU2('trust','sales','Trustpilot integration',500,{dem:.05}),
  mkU2('cart','sales','Abandoned cart emails',600,{dem:.06}),
  mkU2('unbox','sales','Unboxing experience',600,{wom:.05}),
  mkU2('bundles','sales','Bundle deals',700,{dem:.05}),
  mkU2('prodvid','sales','Product videos',900,{dem:.06}),
  mkU2('pixel','sales','Ad pixel tracking',1000,{dem:.06}),
  mkU2('points','sales','Loyalty points',1200,{wom:.04,dem:.04}),
  mkU2('aplus','sales','Bol A+ content',1500,{dem:.06},{req:()=>!!S.ch.bol,reqText:'Sell on bol.com first'}),
  mkU2('vip','sales','VIP club',3000,{wom:.06,dem:.06},soldN(500)),
  mkU2('retarget','sales','Retargeting ads',3000,{dem:.08},needWs(1)[0]),
  // ---- business: events, offers, fees, tax ----
  mkU2('charm','biz','Lucky charm',100,{evg:.05}),
  mkU2('tcs','biz','Legal terms and conditions',350,{evb:.08}),
  mkU2('stripe','biz','Payment provider deal',300,{fee:.1}),
  mkU2('network','biz','KvK networking events',300,{evg:.08,offer:.2},needKv()),
  mkU2('brochure','biz','Company brochure',400,{offer:.25},needKv()),
  mkU2('dashboard','biz','Cash flow dashboard',500,{evg:.04}),
  mkU2('presskit','biz','Press kit',500,{offer:.2,evg:.05}),
  mkU2('assoc','biz','Trade association',600,{evg:.06,offer:.15},needKv()),
  mkU2('bkauto','biz','Bookkeeping automation',700,{tax:.03},needKv()),
  mkU2('bizsite','biz','Company website',700,{offer:.2,dem:.03},needKv()),
  mkU2('crisis','biz','Crisis plan',800,{evb:.1}),
  mkU2('chamber','biz','Chamber of commerce network',800,{offer:.3},needKv()),
  mkU2('cyber','biz','Cyber insurance',900,{evb:.1},needKv()),
  mkU2('taxadv','biz','Tax advisor',1000,{tax:.05},needKv()),
  mkU2('payrates','biz','Negotiated payment rates',1200,{fee:.2},needKv()),
  mkU2('lawyer','biz','Business lawyer on call',1500,{evb:.15},needKv()),
  mkU2('suppl','biz','Supplier loyalty programme',1800,{rsn:.04},needKv()),
  mkU2('pension','biz','Deductions plan',2500,{tax:.08},needKv()),
  mkU2('partner','biz','Marketplace partner status',2500,{fee:.25},{req:()=>S.biz.kvk&&(S.ch.bol||S.ch.etsy),reqText:'Sell on bol.com or Etsy first'}),
  mkU2('coop','biz','Resin buying co-op',3500,{rsn:.05},needKv()),
  mkU2('wbso','biz','Innovation tax credit (WBSO)',6000,{tax:.1},needWs(2)[0]),
  mkU2('bd','biz','Business development manager',9000,{offer:.5,evg:.08,pay:.05},needWs(2)[0]),
  // ---- energy, extra ----
  mkU2('bottle','energy','Water bottle habit',60,{rg:.2}),
  mkU2('stretch','energy','Stretch routine',90,{rg:.3}),
  mkU2('vitamins','energy','Vitamins',120,{rg:.3}),
  mkU2('meditate','energy','Meditation app',150,{nr:.2}),
  mkU2('bike','energy','Bike to the studio',200,{e:10,rg:.3}),
  mkU2('walk','energy','Daily walk',300,{e:10,rg:.4}),
  mkU2('quiet','energy','Quiet corner',500,{rg:.5}),
  mkU2('kitchen','energy','Healthy kitchen',1200,{e:15,rg:.8},needWs(1)[0]),
  // ---- production, extra ----
  mkU2('squeeze','prod','IPA squeeze bottles',80,{ec:.02}),
  mkU2('scale','prod','Resin scale',100,{rsn:.02}),
  mkU2('magtray','prod','Magnetic tool tray',120,{ec:.02}),
  mkU2('toolwall','prod','Tool wall',150,{ec:.03}),
  mkU2('bucket2','prod','Second wash bucket',200,{ec:.03}),
  mkU2('curershelf','prod','Cure station shelf',300,{ec:.03}),
  mkU2('plates','prod','Flexible build plates',350,{ec:.03,fail:.02}),
  mkU2('autolevel','prod','Auto-levelling kit',900,{fail:.04}),
  mkU2('fastprof','prod','High-speed resin profiles',1200,{spd:.05}),
  mkU2('curebox','prod','UV curing chamber',1500,{spd:.04}),
  mkU2('oven','prod','Post-cure oven',2500,{qual:.03,fail:.02},needWs(1)[0]),
  mkU2('conveyor','prod','Conveyor to packing',4000,{ec:.1},needWs(2)[0]),
  // ---- team, extra ----
  mkU2('cake','team','Staff birthday cake',100,{mo:.05},staffN(1)),
  mkU2('staffgym','team','Gym passes for staff',600,{mo:.1},staffN(1)),
  mkU2('freelunch','team','Free lunch for staff',900,{mo:.12},staffN(1)),
  mkU2('flex','team','Flexible hours',1000,{mo:.15},staffN(2)),
  mkU2('bonus','team','Bonus scheme',1500,{xp:.1,mo:.1},staffN(2)),
  mkU2('ladder','team','Career ladder',2500,{xp:.15,wag:.02},staffN(3)),
  mkU2('trainroom','team','Staff training room',3000,{xp:.2},needWs(1)[0]),
  mkU2('retreat','team','Team retreat',5000,{mo:.25,xp:.1},staffN(4)),
  // ---- site, extra ----
  mkU2('foldtable','site','Folding table',150,{st:1}),
  mkU2('wallshelf','site','Wall shelves',250,{sp:1}),
  mkU2('workbench','site','Extra workbench',500,{sp:1}),
  mkU2('dehumid','site','Dehumidifier',300,{fail:.03}),
  mkU2('insul','site','Insulation',700,{pow:.05},needWs(1)[0]),
  mkU2('firecab','site','Fire safety cabinet',500,{evb:.05}),
  mkU2('rackshelf','site','Second-hand racks',800,{sp:2},needWs(1)[0]),
  mkU2('deskpack','site','Extra desks',600,{st:2},needWs(1)[0]),
  mkU2('breakroom','site','Break room',1500,{st:2,mo:.1},needWs(1)[0]),
  mkU2('floorx','site','Floor expansion',9000,{sp:3,st:3},needWs(2)[0]),
  mkU2('officesuite','site','Office suite',8000,{st:5},needWs(3)[0]),
  mkU2('mezz2','site','Second mezzanine',15000,{sp:4,st:4},needWs(3)[0]),
  mkU2('annex','site','Warehouse annex',40000,{sp:6,st:6},needWs(4)[0])
);

/* ----- demand helpers ----- */
const earlyBoost=()=>1+Math.max(0,1-S.sold/250);
const socDem=()=>1+Math.min(.9,Object.keys(SOCIALS).reduce((a,k)=>a+Math.min(SOCIALS[k].cap,(S.soc[k]?S.soc[k].f:0)/SOCIALS[k].scale*SOCIALS[k].cap),0));
const boostMult=()=>S.boost&&S.abs<S.boost.until?S.boost.m:1;
const womChance=()=>clamp(.06+(S.rating-3.5)*.05+upv('wom'),.02,.6);
const soc=k=>S.soc[k]||(S.soc[k]={f:0});
const postGain=k=>{const P=SOCIALS[k];return Math.round(ri(P.g[0],P.g[1])*(1+Math.min(1.5,S.hype/120))*(1+upv('post'))*(1+Math.max(0,S.rating-3.5)*.12))};
const hypePerDay=()=>Object.keys(SOCIALS).reduce((a,k)=>a+soc(k).f/1000*SOCIALS[k].h,0);
function takeOrders(k,n,wom){
  if(!sellable(k)||n<=0)return 0;
  const P=S.clear[k]?null:S.pre[k],lt=!!(P&&P.on&&P.ltd);
  const open=S.orders.filter(o=>o.p===k).length,fs=freeStock(k),cover=Math.max(0,fs-open),backlog=Math.max(0,open-fs);
  const room=lt?P.cap:cover+(P&&P.on?Math.max(0,P.cap-backlog):0),take=Math.min(n,room);
  for(let i=0;i<take;i++){const pre=lt||i>=cover;S.orders.push({id:nid(),p:k,age:0,dest:pickDest(),ch:pickChan(),pre,rush:!pre&&Math.random()<.08});if(lt)P.cap--}
  if(!wom){S.rep.newOrders+=take;if(n>take)S.rep.soldout=(S.rep.soldout||0)+n-take}
  if(lt&&P.cap<=0){P.on=false;P.ltd=false;P.cap=10;S.listed[k]=false;log(`Limited run of ${PRODUCTS[k].name} sold out. It is unlisted.`,'good')}
  return take;
}
function wordOfMouth(par){
  if(Math.random()>=womChance())return;
  const ks=PKEYS.filter(sellable),k=Math.random()<.6&&sellable(par.p)?par.p:pick(ks.length?ks:[par.p]);
  if(takeOrders(k,1,true)){S.wom=(S.wom||0)+1;S.rep.wom=(S.rep.wom||0)+1;if(S.wom<=3||S.wom%10===0)log(`A happy customer told a friend. New order for a ${PRODUCTS[k].name.toLowerCase()}.`,'good')}
}

/* ----- social media ----- */
function doPost(k,mult,team){
  const g=Math.round(postGain(k)*mult);let big=1;
  if(Math.random()<SOCIALS[k].v+upv('viral')){big=5;S.hype+=8;if(!team||Math.random()<.5)log(`Your ${SOCIALS[k].name} post went viral! +${g*5} followers.`,'good')}
  soc(k).f+=g*big;S.hype+=g*big/220;if(!team)qInc('posted');return g*big;
}
function socialDay(){
  for(const k in SOCIALS){const s=soc(k);s.f=Math.max(0,s.f*.992)}
  const keys=Object.keys(SOCIALS);
  for(const s of ofRole('social')){const n=2+(s.trait==='efficient'?1:0);for(let i=0;i<n;i++){doPost(pick(keys),.55*skill(s),true);did('Posts made',1,true)}}
  for(const s of ofRole('photographer')){doPost(pick(['instagram','pinterest','tiktok']),.4*skill(s),true);did('Photos posted',1,true)}
}

/* ----- popups ----- */
const notice=(title,text,btn)=>choice(title,text,[{l:btn||'Nice',f:()=>{}}]);
const ownedResins=()=>Object.keys(S.resin).filter(k=>S.resin[k]>200);
const listed=()=>PKEYS.filter(k=>sellable(k));
const hit=a=>Math.round(Math.min(a*diffM().hit,25+Math.max(0,S.cash)*.2+S.revenue*.02));
function pickEvent(mixed){
  const G=goodEvents().filter(Boolean),B=badEvents().filter(Boolean);
  const x=Math.random();
  if(x<.35)return pick(mixed)();
  const good=S.sold<8||Math.random()<.5+Math.min(.25,upv('evg'));
  if(!good&&Math.random()<Math.min(.6,upv('evb')))return pick(G)();
  const pool=good?G:B;(pool.length?pick(pool):pick(mixed))();
}
function goodEvents(){
  const g=[];
  g.push(()=>{const h=ri(15,30);S.hype+=h;soc('instagram').f+=ri(80,300);notice('A blogger featured you',`An anime blogger wrote about Resinaprint. Hype +${h} and new followers.`)});
  g.push(()=>{S.hype+=ri(15,30);soc('tiktok').f+=ri(150,600);notice('A local streamer showed your figure',`Someone put your figure on their desk during a stream. Your TikTok took off for a day.`)});
  g.push(()=>{S.hype+=20;S.rating=clamp(S.rating+.06,1,5);notice('Customer photos are everywhere','A happy customer posted a photo wall of your figures. Rating +0.06, hype +20.')});
  g.push(()=>{const a=ri(40,160);earn('Tips',a);notice('A fan tipped you',`A collector sent a ${fmt(a)} tip because the paint job was so good.`)});
  g.push(()=>{S.mk.resin=clamp(S.mk.resin*.88,.8,1.6);notice('Resin supplier discount','Your resin supplier sent a price cut. Resin is cheaper for a while.')});
  g.push(()=>{const ks=listed();if(!ks.length)return notice('Quiet day','Nothing much happened today.');const k=pick(ks);const n=takeOrders(k,ri(3,6),true);notice('A repeat customer ordered again',`An old customer wants ${n} more ${PRODUCTS[k].name.toLowerCase()}${n===1?'':'s'}.`)});
  g.push(()=>{const ks=listed();if(!ks.length)return;let n=0;for(let i=0;i<ri(4,8);i++)n+=takeOrders(pick(ks),1,true);S.hype+=10;notice('Word is spreading',`A happy customer's post brought ${n} new order${n===1?'':'s'}.`)});
  if(S.biz.kvk)g.push(()=>{const a=ri(150,600);earn('BTW refund',a);notice('Surprise tax refund',`The Belastingdienst corrected an earlier assessment and refunded ${fmt(a)}.`)});
  if(S.biz.kvk&&!S.grant&&S.sold>=20)g.push(()=>{S.grant=true;const a=ri(400,1000);earn('Subsidy',a);notice('Startup grant approved',`A regional startup grant of ${fmt(a)} landed in your account.`)});
  if(S.sold>=100)g.push(()=>{S.rating=clamp(S.rating+.1,1,5);S.hype+=40;notice('Best local webshop award','A regional magazine voted you best local webshop. Rating +0.10, hype +40.')});
  if(S.printers.length)g.push(()=>{const a=ri(40,150);earn('Refund',a);notice('Electricity refund',`Your energy supplier corrected your bill. You got ${fmt(a)} back.`)});
  if(S.staff.filter(s=>s.role!=='clerk').length)g.push(()=>{const s=pick(S.staff.filter(x=>x.role!=='clerk'));s.xp=(s.xp||0)+40;while((s.lvl||1)<5&&s.xp>=XPN[(s.lvl||1)-1])levelUp(s);notice('A good idea from the team',`${s.name} found a smarter way to work and learned a lot doing it.`)});
  g.push(()=>choice('Fan artist offer','A fan artist offers to draw your mascot as a poster if you pay €100. Fans would share it everywhere.',[
    {l:'Pay €100',ok:()=>S.cash>=100,f:()=>{spend('Marketing',100);S.hype+=25;soc('instagram').f+=400;soc('tiktok').f+=200;log('The fan art poster is everywhere. Hype +25.','good')}},{l:'No thanks',f:()=>{}}]));
  if(S.stock&&PKEYS.some(k=>S.stock[k]>=2))g.push(()=>choice('School project',`A local school wants a handful of figures for a class project and offers to pay your list price.`,[
    {l:'Sell them',ok:()=>PKEYS.some(k=>S.stock[k]>0),f:()=>{const s=sellStock(5);log(`The school took ${s} figures and the teacher posted about you. Hype +10.`,'good');S.hype+=10}},{l:'Skip it',f:()=>{}}]));
  return g;
}
function badEvents(){
  const b=[];
  b.push(()=>choice('A harsh review','A customer posted a one-star review. Reply to turn it around or ignore it?',[
    {l:'Apologise and send a free keychain',f:()=>{S.rating=clamp(S.rating-.03,1,5);log('You turned a bad review around with a friendly reply.','amber')}},
    {l:'Ignore it',f:()=>{S.rating=clamp(S.rating-.12,1,5);S.hype=Math.max(0,S.hype-8);log('The bad review stayed up. Rating dropped.','bad')}}]));
  b.push(()=>{const a=hit(ri(30,120));spend('Chargebacks',a);notice('Chargeback',`A buyer disputed a payment and the bank took ${fmt(a)} back.`,'Ouch')});
  b.push(()=>{if(S.hype<25)return;const l=Math.round(S.hype*.3);S.hype-=l;notice('Social media backlash',`A post of yours got misread online. You lost ${l} hype.`,'Ouch')});
  b.push(()=>{const k=pick(Object.keys(SOCIALS)),s=soc(k),l=Math.round(s.f*.3);s.f-=l;notice('Account restricted',`${SOCIALS[k].name} restricted your reach for a while. You lost ${l} followers.`,'Ouch')});
  b.push(()=>{const rk=ownedResins();if(!rk.length)return;const k=pick(rk),l=Math.min(S.resin[k],1000);S.resin[k]-=l;notice('Resin recall',`The maker recalled a batch of ${RESINS[k].name}. You lost ${amt(k,l)} of it.`,'Ouch')});
  b.push(()=>{S.mk.comp=clamp(S.mk.comp-.06,.8,1.05);S.hype=Math.max(0,S.hype-10);notice('Copycat seller',"A shop started selling look-alikes cheaper than you. Demand dipped.",'Ouch')});
  b.push(()=>{S.rating=clamp(S.rating-.1,1,5);S.hype=Math.max(0,S.hype-10);notice('Review bombing','A rival group left a pile of fake one-star reviews. Rating dropped.','Ouch')});
  b.push(()=>{const a=hit(ri(8,40));spend('Admin',a);notice('Bank fee increase',`Your bank charged an unexpected fee of ${fmt(a)}.`,'Ouch')});
  b.push(()=>{const ks=PKEYS.filter(k=>S.stock[k]>0);if(!ks.length)return;const k=pick(ks),n=Math.min(2,S.stock[k]);S.stock[k]-=n;notice('Parcels went missing at the counter',`${n} ${PRODUCTS[k].name.toLowerCase()}${n>1?'s':''} disappeared from your pick-up shelf.`,'Ouch')});
  b.push(()=>choice('Refund request','A customer says the figure is not what they expected and wants their money back.',[
    {l:'Refund it',ok:()=>listed().length>0,f:()=>{const k=pick(listed()),a=S.prices[k];spend('Refunds',a);log(`You refunded ${fmt(a)}. The customer left a kind review.`,'amber');review(4.5)}},
    {l:'Refuse',f:()=>{S.rating=clamp(S.rating-.07,1,5);log('You refused the refund and the customer complained online.','bad')}}]));
  b.push(()=>choice('Strange invoice','An invoice for domain "renewal" of €240 shows up in your inbox. Looks slightly off.',[
    {l:'Ignore it',f:()=>{log('It was a scam invoice. Good thing you ignored it.','good')}},
    {l:'Pay it',f:()=>{spend('Admin',240);log('The invoice was a scam. You lost €240.','bad')}}]));
  if(S.ws>=1)b.push(()=>{const a=hit(ri(150,500));spend('Rent',a);notice('Service charge settlement',`The landlord sent a yearly service charge settlement of ${fmt(a)}.`,'Ouch')});
  if(S.ws>=1&&!S.biz.perm.omg)b.push(()=>{const a=hit(ri(250,700));spend('Fines',a);notice('Municipality fine',`An inspector found your resin storage was not registered. Fine: ${fmt(a)}.`,'Ouch')});
  if(S.printers.length)b.push(()=>{let n=0;S.printers.forEach(p=>{if(p.state==='printing'){p.job.left+=2;n++}});if(n)notice('Firmware bug',`A bad firmware update slowed ${n} printer${n>1?'s':''}. Prints lost 2 hours.`,'Ouch')});
  if(S.printers.length)b.push(()=>{const a=hit(S.printers.length*ri(12,30));spend('Electricity',a);notice('Power price spike',`Energy prices spiked this week. It cost you an extra ${fmt(a)}.`,'Ouch')});
  if(S.ws===0&&ownedResins().length)b.push(()=>{const k=pick(ownedResins()),l=Math.round(S.resin[k]*.25);S.resin[k]-=l;notice('Damp in the storage unit',`Water got into the hok. You lost ${amt(k,l)} of ${RESINS[k].name}.`,'Ouch')});
  const st=S.staff.filter(s=>s.role!=='clerk'&&s.mood<75);
  if(S.staff.filter(s=>s.role!=='clerk').length>=2)b.push(()=>{const s=pick(S.staff.filter(x=>x.role!=='clerk'));choice('A better offer',`${s.name} got a better job offer from a competitor.`,[
    {l:'Counter offer: +€12/day',f:()=>{s.wage+=12;s.mood=clamp(s.mood+20,0,100);log(`${s.name} stayed with a raise.`,'good')}},
    {l:'Let them go',f:()=>{S.staff=S.staff.filter(x=>x!==s);log(`${s.name} left for a competitor.`,'bad')}}])});
  if(S.biz.kvk&&S.sold>=30)b.push(()=>{const a=hit(ri(80,300));spend('Admin',a);notice('Late filing penalty',`A form was filed late and the authority charged ${fmt(a)}.`,'Ouch')});
  return b;
}

/* ----- big company offers ----- */
function bigOffers(){
  const o=[];
  const st=PKEYS.reduce((a,k)=>a+S.stock[k],0);
  if(S.sold>=10)o.push(()=>choice('Dutch Comic Con (DCC) stand',`DCC has a stand free at the next edition and thousands of fans walk past. Bring stock: you have ${st} figures ready.`,[
    {l:'Small stand (€900)',ok:()=>S.cash>=900,f:()=>{spend('Marketing',900);const s=sellStock(20);S.hype+=50;soc('tiktok').f+=400;soc('instagram').f+=300;log(`DCC small stand: sold ${s} figures. Hype +50.`,'good')}},
    {l:'Big corner stand (€3,200)',ok:()=>S.cash>=3200&&S.rating>=3.8,f:()=>{spend('Marketing',3200);const s=sellStock(70);S.hype+=130;soc('tiktok').f+=1500;soc('instagram').f+=1000;S.boost={m:1.25,until:S.abs+72};log(`DCC big stand: sold ${s} figures. Hype +130 and a demand wave.`,'good')}},
    {l:'Decline',f:()=>{}}]));
  if(S.sold>=40&&S.biz.kvk)o.push(()=>{const ks=PKEYS.filter(contractable);if(!ks.length||S.contracts.length>=4)return;const k=pick(ks),[a,b]=QTY[k],qty=Math.round(ri(a,b)*(1.5+S.ws*.5)),pay=Math.round(qty*PRODUCTS[k].ref*.78/10)*10;
    choice('Toyland wants a wholesale deal',`The Toyland chain wants ${qty}× ${PRODUCTS[k].name.toLowerCase()} for ${fmt(pay)} within 14 days.`,[
      {l:'Accept the deal',ok:()=>S.contracts.length<4,f:()=>{S.contracts.push({id:nid(),client:'Toyland chain',p:k,qty,pay,due:S.day+14});log(`You accepted the Toyland deal: ${qty}× ${PRODUCTS[k].name}.`,'good')}},{l:'Decline',f:()=>{}}])});
  if(S.sold>=100&&S.biz.kvk)o.push(()=>{const ks=PKEYS.filter(k=>contractable(k)&&PRODUCTS[k].ref>=40);if(!ks.length||S.contracts.length>=4)return;const k=pick(ks),qty=ri(4,10),pay=Math.round(qty*PRODUCTS[k].ref*1.05/10)*10;
    choice('StreamBox Studios merch deal',`A streaming studio wants ${qty}× ${PRODUCTS[k].name.toLowerCase()} as premiere merch. They pay ${fmt(pay)} and need them in 21 days.`,[
      {l:'Take the deal',ok:()=>S.contracts.length<4,f:()=>{S.contracts.push({id:nid(),client:'StreamBox Studios',p:k,qty,pay,due:S.day+21});log(`StreamBox deal accepted: ${qty}× ${PRODUCTS[k].name}.`,'good')}},{l:'Decline',f:()=>{}}])});
  if(S.sold>=60)o.push(()=>choice('Anime festival sponsor',`A big festival asks for a sponsor. You get your logo on every banner and sell from a table.`,[
    {l:'Sponsor for €1,500',ok:()=>S.cash>=1500,f:()=>{spend('Marketing',1500);const s=sellStock(30);S.hype+=100;S.boost={m:1.2,until:S.abs+72};log(`Festival sponsor: sold ${s} figures, hype +100.`,'good')}},{l:'Not this year',f:()=>{}}]));
  if(st>=10)o.push(()=>choice('Streaming premiere event',`StreamBox invites you to a premiere party. You hand out 8 figures for free in return for lots of press.`,[
    {l:'Hand them out',ok:()=>PKEYS.reduce((a,k)=>a+S.stock[k],0)>=8,f:()=>{let n=8;for(const k of PKEYS)while(n>0&&S.stock[k]>0){S.stock[k]--;n--}S.hype+=90;soc('instagram').f+=800;soc('tiktok').f+=800;log('Premiere party: great press, 8 figures given away. Hype +90.','good')}},{l:'Decline',f:()=>{}}]));
  if(S.sold>=150&&PKEYS.some(k=>S.stock[k]>=3))o.push(()=>choice('Museum exhibition',`A museum in Leeuwarden wants to display your work for a month and pays an exhibit fee.`,[
    {l:'Lend 3 figures',ok:()=>PKEYS.some(k=>S.stock[k]>=3),f:()=>{const k=PKEYS.find(k=>S.stock[k]>=3);S.stock[k]-=3;earn('Sponsorships',800);S.hype+=45;S.rating=clamp(S.rating+.05,1,5);log('Museum exhibition: paid 800, hype +45.','good')}},{l:'Decline',f:()=>{}}]));
  if(S.sold>=200&&S.biz.kvk)o.push(()=>choice('Game studio sponsorship',`An indie game studio pays €2,000 if you feature their characters in a limited campaign.`,[
    {l:'Accept',f:()=>{earn('Sponsorships',2000);S.hype+=30;log('Game studio sponsorship: +€2,000.','good')}},{l:'Decline',f:()=>{}}]));
  return o;
}
function bigOfferRoll(){
  if(S.sold<10||S.day-(S.lastBig||0)<6)return;
  const p=(.07+Math.min(.1,S.hype/1500))*(1+upv('offer'));
  if(Math.random()>=p)return;
  const o=bigOffers();if(!o.length)return;
  S.lastBig=S.day;pick(o)();
}

/* ----- extra actions ----- */
Object.assign(A,{
  post(d){const k=d.k,P=SOCIALS[k];if(S.cds['p'+k]>0)return toast('Already posted today');if(!useE(Math.max(1,Math.round(P.e*ecm()))))return;
    const g=doPost(k,1);S.cds['p'+k]=1;did('Posts made');toast(`+${g} followers on ${P.name}`)}
});
function socialView(){
  let h=label('Social media',`${Math.round(hypePerDay()*100)/100} hype a day from followers · ${Math.round((socDem()-1)*100)}% extra demand`)+`<div class="group">`;
  for(const k in SOCIALS){const P=SOCIALS[k],s=soc(k),cd=S.cds['p'+k]||0;
    h+=item(P.name,`${Math.round(s.f).toLocaleString('nl-NL')} followers · ${P.note}`,`<button class="btn sm ${cd?'ghost':'primary'}" data-a="post" data-k="${k}" ${cd?'disabled':''}>${cd?'Posted':'Post'} ${en(Math.max(1,Math.round(P.e*ecm())))}</button>`)}
  h+='</div>'+label('Word of mouth',`${Math.round(womChance()*100)}% of happy customers tell a friend`)+`<div class="card"><div class="kv" style="margin:0"><span>Friends sent <b>${S.wom||0}</b></span><span>Rating <b>${S.rating.toFixed(2)}★</b></span></div><div class="s" style="margin-top:8px">Better reviews and nicer parcels make more people tell their friends.</div></div>`;
  return h;
}

UPGRADES.forEach(u=>{if(u.e)u.e*=2;if(u.rg)u.rg*=2;u.desc=u.desc.replace(/\+(\d+(?:\.\d+)?)(?= max energy| regen| energy regen)/g,(m,n)=>'+'+(Math.round(+n*20)/10))});
/* ---------- v11: catalog, contracts, stock reservation, sell-off ---------- */
const reserved=k=>S.contracts.reduce((a,c)=>a+(c.p===k?c.qty:0),0);
const freeStock=k=>Math.max(0,S.stock[k]-reserved(k));
const inPipe=k=>S.unwashed[k]+S.cured[k]+S.printers.reduce((a,q)=>a+(q.state!=='idle'&&q.job&&q.job.prod===k?q.job.units:0),0);
const unitCost=k=>PRODUCTS[k].ml*resinPrice('estd')/1000*resinMult();
const unitProfit=(k,price)=>{const Pd=PRODUCTS[k],p=price==null?S.prices[k]:price,w=CHANNELS.web;return p*(1-w.fee)-w.fix-unitCost(k)-Pd.ship-.4-(Pd.royalty?p*Pd.royalty:0)};
const CLEAR_OFF=.15;
const contractable=k=>makeable(k)&&!!S.listed[k]&&!S.stop[k]&&!S.clear[k]&&S.printers.some(p=>!whyNot(p,k));
const pruneOffers=()=>{S.offers=S.offers.filter(o=>contractable(o.p))};
function clearanceDone(){
  for(const k of Object.keys(S.clear)){
    const c=S.clear[k];
    if(S.stock[k]<=0&&!S.orders.some(o=>o.p===k)&&S.cured[k]<=0&&S.unwashed[k]<=0){
      S.listed[k]=false;S.prices[k]=c.orig;S.stop[k]=false;delete S.clear[k];
      log(`Sell-off finished: ${PRODUCTS[k].name} is sold out and unlisted.`,'good');
    }
  }
}
function autoContracts(){
  for(const c of [...S.contracts]){
    if(!c.auto||S.stock[c.p]<c.qty)continue;
    const packer=countRole('packer')>0;
    if(!packer){if(S.energy<E.deliver())continue;S.energy-=E.deliver()}
    deliverContract(c);did('Contracts delivered',1,packer);
    log(`Contract for ${c.client} was delivered automatically${c.pay?`: +${fmt(c.pay)}`:''}.`,'good');
  }
}
Object.assign(A,{
  autoContract(d){const c=S.contracts.find(x=>x.id==d.id);if(!c)return;c.auto=!c.auto;toast(c.auto?'Auto-deliver on':'Auto-deliver off');if(c.auto)autoContracts()},
  sellOff(d){const k=d.k;if(S.clear[k])return;if(!S.listed[k])return;
    S.clear[k]={orig:S.prices[k]};S.prices[k]=Math.max(1,Math.round(S.prices[k]*(1-CLEAR_OFF)));S.stop[k]=true;
    if(S.pre[k]){S.pre[k].on=false;S.pre[k].ltd=false}
    pruneOffers();toast(`Selling off ${PRODUCTS[k].name}`);log(`Sell-off started for ${PRODUCTS[k].name}: ${CLEAR_OFF*100}% off, nobody makes more.`,'amber');clearanceDone()},
  cancelClear(d){const k=d.k,c=S.clear[k];if(!c)return;S.prices[k]=c.orig;delete S.clear[k];S.stop[k]=false;toast('Sell-off cancelled')},
  stopMake(d){const k=d.k;S.stop[k]=!S.stop[k];pruneOffers();toast(S.stop[k]?'No more will be made':'Production resumed')}
});
function catalogView(){
  const stockN=PKEYS.reduce((a,k)=>a+S.stock[k],0),val=PKEYS.reduce((a,k)=>a+S.stock[k]*S.prices[k],0);
  let h=label('Catalog',`${season().n} ×${season().m}`)+`<div class="card"><div class="kv" style="margin:0"><span>Ready <b>${stockN}</b></span><span>Worth <b>${fmt(val)}</b></span><span>Open orders <b>${S.orders.length}</b></span></div>
  <div class="s" style="margin-top:8px"><b>Sell off</b> sells what you have left at ${Math.round(CLEAR_OFF*100)}% off, stops everyone from making more, then unlists it automatically. <b>Stop making</b> only pauses production.</div></div>`;
  h+=`<div class="group" style="margin-top:14px">`;
  for(const k of PKEYS){
    if(!unlocked(k))continue;
    const Pd=PRODUCTS[k],can=makeable(k),on=S.listed[k]&&can,clr=S.clear[k],stop=S.stop[k];
    const dot=artBox(prodArt(k),'prod','',['f',k]);
    const status=clr?'<span class="chip amber">Selling off</span>':on?'<span class="chip good">Selling</span>':can?'<span class="chip">Not listed</span>':'<span class="chip">Locked</span>';
    const res=reserved(k),pipe=inPipe(k),d=demand(k),pf=unitProfit(k);
    let sub2;
    if(on){
      const days=d>.05?S.stock[k]/d:0;
      sub2=`~${d.toFixed(1)} orders/day · <b>${S.stock[k]}</b> ready${res?` (${res} for contracts)`:''}${pipe?` · ${pipe} coming`:''}${days>0&&S.stock[k]>0?` · lasts ${days<1?'<1':Math.round(days)} d`:''}<br>Profit ≈ <span class="${pf>=0?'good':'bad'}">${fmt(pf)}</span> each${stop&&!clr?' · <span class="amber">production stopped</span>':''}`;
    }else sub2=can?'Not listed. Customers cannot buy it.':`Needs a ${TIERS[Pd.tier].toLowerCase()} printer`;
    h+=`<div class="item" style="flex-wrap:wrap">${dot}<div class="grow"><div class="t">${Pd.name} ${status}</div><div class="s">${sub2}</div></div>
    ${on&&!clr?`<div class="stepper"><button class="btn sm" data-a="price" data-k="${k}" data-d="-1" aria-label="Lower price">−</button><b>${fmt(S.prices[k])}</b><button class="btn sm" data-a="price" data-k="${k}" data-d="1" aria-label="Raise price">+</button></div>`:clr?`<b class="num">${fmt(S.prices[k])}</b>`:''}
    <div style="flex:1 1 100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      ${clr?`<button class="btn sm primary" data-a="cancelClear" data-k="${k}">Cancel sell-off</button>`:`<button class="btn sm ${S.listed[k]?'ghost':'uv'}" data-a="list" data-k="${k}" ${can?'':'disabled'}>${S.listed[k]?'Unlist now':'List'}</button>`}
      ${on&&!clr?`<button class="btn sm" data-a="sellOff" data-k="${k}">Sell off</button><button class="btn sm ${stop?'primary':'ghost'}" data-a="stopMake" data-k="${k}">${stop?'Make again':'Stop making'}</button>`:''}
    </div>
    ${on&&!clr?autoRow(k)+preRow(k):''}</div>`;
  }
  return h+'</div>';
}
function jobsView(){
  let h=label('Active contracts',`${S.contracts.length} of 4 · stock is reserved for them`)+`<div class="group">`;
  if(!S.contracts.length)h+=`<div class="empty">No active contracts. Accept one from the job board below.</div>`;
  for(const c of S.contracts){
    const left=c.due-S.day,have=Math.min(S.stock[c.p],c.qty),pipe=inPipe(c.p),pct=Math.round(have/c.qty*100),ready=S.stock[c.p]>=c.qty;
    const risk=!ready&&S.stock[c.p]+pipe<c.qty&&left<=2;
    const chip=ready?'<span class="chip good">Ready</span>':risk?'<span class="chip bad">At risk</span>':'<span class="chip">Building</span>';
    h+=`<div class="item" style="flex-wrap:wrap"><div class="grow"><div class="t">${c.qty}× ${PRODUCTS[c.p].name} ${chip}</div>
    <div class="s">${c.client} · ${c.prepaid?'prepaid '+fmt(c.refund):fmt(c.pay)+' ('+fmt(c.pay/c.qty)+' each)'} · <span class="${left<=1?'bad':'amber'}">${left<=0?'due today':left+' d left'}</span></div>
    <div style="margin-top:8px;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--good)"></div></div>
    <div class="s" style="margin-top:4px">${S.stock[c.p]} of ${c.qty} ready${pipe?` · ${pipe} being made`:''}</div></div>
    <div style="display:grid;gap:6px;justify-items:end"><button class="btn sm primary" data-a="deliver" data-id="${c.id}" ${ready?'':'disabled'}>Deliver</button><button class="btn sm ${c.auto?'uv':'ghost'}" data-a="autoContract" data-id="${c.id}" aria-pressed="${!!c.auto}">${c.auto?'Auto-deliver on':'Auto-deliver'}</button></div>
    <div class="s" style="flex:1 1 100%;margin-top:6px">${c.auto?`Stock is held for this contract${S.staff.some(s=>s.role==='packer')?' and your packer sends it':' and it is sent when you have the energy'} the moment all ${c.qty} are ready.`:'Stock is held for this contract. Turn on auto-deliver to have it sent as soon as it is complete.'}</div></div>`;
  }
  h+='</div>';
  const nxt=((1-S.day%3)+3)%3||3;
  h+=label('Job board',`new offers in ${nxt} d`)+`<div class="group">`;
  if(!S.offers.length)h+=`<div class="empty">${S.biz.kvk?'No offers right now. Contracts only come for products you list and are still making.':'Businesses only work with registered companies. Register at the KvK in Empire › Company.'}</div>`;
  const offs=S.offers.filter(o=>contractable(o.p)).map(o=>({o,profit:o.pay-o.qty*(unitCost(o.p)+PRODUCTS[o.p].ship+.4)})).sort((a,b)=>b.profit-a.profit);
  for(const {o,profit} of offs){
    const mk=makeable(o.p),each=o.pay/o.qty,vs=Math.round(each/PRODUCTS[o.p].ref*100),have=S.stock[o.p];
    h+=`<div class="item" style="flex-wrap:wrap"><div class="grow"><div class="t">${o.qty}× ${PRODUCTS[o.p].name} ${o.commission?'<span class="chip uv">Custom commission</span>':''}</div>
    <div class="s">${o.client} · ${o.days} days · <span class="amber">${fmt(o.pay)}</span> (${fmt(each)} each, ${vs}% of list)</div>
    <div class="s">Profit ≈ <span class="${profit>=0?'good':'bad'}">${fmt(profit)}</span> · ${mk?`${have} ready now`:'<span class="f">You cannot make this yet</span>'}</div></div>
    <button class="btn uv sm" data-a="accept" data-id="${o.id}" ${mk&&S.contracts.length<4?'':'disabled'}>Accept</button></div>`;
  }
  return h+'</div>';
}
/* ---------- v12: stock targets, auto price, rush, quests, reviews, chart, do-all, sale, commissions, crunch ---------- */
FXT.paint=v=>`Painters finish ${Math.round(v*100)}% faster`;
UPGRADES.push(
  mkU2('paintrack','prod','Paint rack and drying lamp',250,{paint:.1}),
  mkU2('compressor','prod','Airbrush compressor',600,{paint:.12,qual:.01},staffN(1)),
  mkU2('palette','prod','Pre-mixed paint palettes',1200,{paint:.15},staffN(1)),
  mkU2('paintroom','prod','Dedicated paint room',4500,{paint:.2,qual:.02},needWs(1)[0])
);
const paintMult=()=>Math.max(.3,1/(1+upv('paint')));
/* ----- quests ----- */
const QDEFS=[
  {id:'shipped',t:n=>`Ship ${n} orders`,base:6,rw:n=>n*5},
  {id:'finished',t:n=>`Finish ${n} figures`,base:5,rw:n=>n*6},
  {id:'printed',t:n=>`Print ${n} figures`,base:8,rw:n=>n*4},
  {id:'posted',t:n=>`Make ${n} social posts`,base:2,rw:n=>n*25,hy:true},
  {id:'dm',t:n=>`Answer ${n} messages`,base:3,rw:n=>n*10}
];
function newQuests(){
  const sc=Math.min(3,1+S.sold/250),ids=[...QDEFS].sort(()=>Math.random()-.5).slice(0,3);
  S.quest={day:S.day,qc:{},list:ids.map(q=>{const need=Math.max(1,Math.round(q.base*sc));return{id:q.id,need,reward:Math.round(q.rw(need)*sc/ sc),done:false}})};
}
function qInc(k,n=1){
  if(!S.quest||S.quest.day!==S.day)newQuests();
  S.quest.qc[k]=(S.quest.qc[k]||0)+n;if(k==='shipped')addXp(n);
  for(const q of S.quest.list)if(!q.done&&q.id===k&&S.quest.qc[k]>=q.need){
    q.done=true;addXp(5);earn('Quest rewards',q.reward);S.hype+=3;log(`Daily goal done: ${QDEFS.find(d=>d.id===k).t(q.need)}. +${fmt(q.reward)}.`,'good');
  }
}
function questCard(){
  if(!S.quest||S.quest.day!==S.day)newQuests();
  let h=label('Daily goals','small rewards, reset every day')+`<div class="group">`;
  for(const q of S.quest.list){const D=QDEFS.find(d=>d.id===q.id),have=Math.min(q.need,S.quest.qc[q.id]||0),pct=Math.round(have/q.need*100);
    h+=`<div class="item" style="flex-wrap:wrap"><div class="grow"><div class="t">${D.t(q.need)} ${q.done?'<span class="chip good">Done</span>':''}</div><div class="s">${have} of ${q.need} · reward ${fmt(q.reward)}</div>
    <div style="margin-top:6px;height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:${pct}%;background:${q.done?'var(--good)':'var(--amber)'}"></div></div></div></div>`}
  return h+`</div>`;
}
/* ----- actions ----- */
const saleOn=()=>!!(S.sale&&S.abs<S.sale.until);
const saleMult=()=>saleOn()?1.6:1;
Object.assign(A,{
  target(d){const t=S.target[d.k]||0,st=t>=10?5:t>=1?1:5;S.target[d.k]=Math.max(0,t+(d.d>0?(t<1?5:st):-(t>10?5:t>1?1:t)))},
  always(d){S.always[d.k]=!S.always[d.k];toast(S.always[d.k]?'Printers keep making it, even with lots in stock':'Printers pause when stock is high')},
  autoPrice(d){S.autoP[d.k]=!S.autoP[d.k];toast(S.autoP[d.k]?'Price adjusts itself':'Auto price off')},
  sale(){if(S.cds.sale)return toast('Wait for the cooldown');if(saleOn())return;S.sale={until:S.abs+72,off:.2};S.cds.sale=10;S.hype+=5;log('Site-wide sale started: 20% off for 3 days.','amber');toast('Sale live for 3 days')},
  crunch(){S.crunch=!S.crunch;toast(S.crunch?'Crunch mode on':'Crunch mode off')},
  doAll(){
    const e0=S.energy;let n=0;
    for(const p of S.printers){if(S.energy<5)break;if(p.state!=='printing'){const s0=S.energy;A.printerMain({id:p.id});if(S.energy<s0)n++}}
    if(totUnwashed()>0&&S.energy>=washE()){A.wash();n++}
    let g=40;while(nextFinish()&&S.energy>=3&&g-->0){const s0=S.energy;A.finish();if(S.energy>=s0)break;n++}
    const pk0=S.rep.shipped;A.packAll();n+=S.rep.shipped-pk0;
    g=20;while(S.dms[0]&&S.energy>=2&&g-->0){const c=S.dms.length;A.dm({id:S.dms[0].id,i:0});if(S.dms.length===c)break;n++}
    toast(n?`${n} jobs done · ${Math.round(e0-S.energy)} energy`:'Nothing to do right now')
  }
});
function autoPriceDay(){
  for(const k of PKEYS){
    if(!S.autoP[k]||!S.listed[k]||S.clear[k]||!sellable(k))continue;
    const d=demand(k),days=S.stock[k]/Math.max(.05,d),P=PRODUCTS[k];let p=S.prices[k];
    const step=Math.max(1,Math.round(p*.03));
    if(days>8)p-=step;else if(days<2&&d>.2)p+=step;
    S.prices[k]=clamp(p,Math.max(1,Math.round(P.ref*.6)),Math.round(P.ref*1.8));
  }
}
const crunchRow=()=>item('Crunch mode',S.crunch?'On: everyone works faster, wages +40%, morale drops twice as fast.':'Printers and staff work 25% faster. Wages +40% and morale drops twice as fast.',`<button class="btn sm ${S.crunch?'primary':'ghost'}" data-a="crunch">${S.crunch?'Turn off':'Turn on'}</button>`);
function saleCard(){
  const cd=S.cds.sale||0;
  return label('Site-wide sale')+`<div class="group">${item('20% off everything for 3 days',saleOn()?`Running · ${Math.max(0,Math.ceil((S.sale.until-S.abs)/24))} d left. Demand is up 60%.`:cd?`Ready again in ${cd} d`:'Demand rises 60%, but every order pays 20% less.',saleOn()?chip('Live','good'):`<button class="btn sm primary" data-a="sale" ${cd?'disabled':''}>Start sale</button>`)}</div>`;
}
function autoRow(k){
  const t=S.target[k]||0;
  return `<div style="flex:1 1 100%;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--line,rgba(255,255,255,.07))"><div class="grow s" style="min-width:110px">${t?`Staff keep ${t} ready`:'No stock target'}</div>
  <div class="stepper"><button class="btn sm" data-a="target" data-k="${k}" data-d="-1" aria-label="Lower target">−</button><b>${t||'off'}</b><button class="btn sm" data-a="target" data-k="${k}" data-d="1" aria-label="Raise target">+</button></div>
  <button class="btn sm ${S.autoP[k]?'primary':'ghost'}" data-a="autoPrice" data-k="${k}">${S.autoP[k]?'Auto price on':'Auto price'}</button>
  <button class="btn sm ${S.always[k]?'primary':'ghost'}" data-a="always" data-k="${k}">${S.always[k]?'Keep printing: on':'Keep printing'}</button></div>`;
}
/* ----- reviews and chart ----- */
const REVTXT={5:['Perfect paint job, I love it!','Arrived fast and looks amazing.','Better than the photos. Will order again.','My friends all want one now.'],4:['Really nice figure, packaging was good.','Great quality for the price.','Looks good, shipping was a bit slow.'],3:['It is okay. A few rough spots on the base.','Decent, but I expected a bit more.'],2:['The paint was uneven and it took long.','Not what I hoped for.'],1:['Arrived broken or badly made. Disappointed.','Would not order again.']};
function logReview(sc,p){
  const k=Math.max(1,Math.min(5,Math.round(sc)));
  S.revs.unshift({s:k,p,t:pick(REVTXT[k]),n:pick(NAMES),d:S.day});if(S.revs.length>14)S.revs.length=14;
}
function reviewsView(){
  if(!S.revs.length)return '';
  return label('Customer reviews',`${S.rating.toFixed(2)}★ overall`)+`<div class="group">`+S.revs.slice(0,8).map(r=>item(`${'★'.repeat(r.s)}<span class="f">${'★'.repeat(5-r.s)}</span> ${PRODUCTS[r.p]?PRODUCTS[r.p].name:''}`,`“${r.t}” · ${r.n}, day ${r.d}`)).join('')+'</div>';
}
function chartView(){
  const H=S.hist;if(H.length<3)return '';
  const mn=Math.min(...H),mx=Math.max(...H),w=330,hh=90,rg=Math.max(1,mx-mn);
  const pts=H.map((v,i)=>`${(i/(H.length-1)*w).toFixed(1)},${(hh-(v-mn)/rg*(hh-10)-5).toFixed(1)}`).join(' ');
  return label('Cash',`last ${H.length} days`)+`<div class="card"><svg viewBox="0 0 ${w} ${hh}" width="100%" height="${hh}" role="img" aria-label="Cash per day"><polyline points="${pts}" fill="none" stroke="var(--amber)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg><div class="kv" style="margin:8px 0 0"><span>Low <b>${fmt(mn)}</b></span><span>Now <b>${fmt(H[H.length-1])}</b></span><span>High <b>${fmt(mx)}</b></span></div></div>`;
}
