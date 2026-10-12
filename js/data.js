/* Static game data: products, printers, resins, staff roles, spaces, carriers, upgrades, campaigns, milestones. */
/* ---------- data ---------- */
const PRODUCTS={
  chibi:{name:'Chibi keychain',ml:25,size:1,h:2,ref:12,effort:.5,ship:2,base:3,tier:0,inj:1},
  bust:{name:'Character bust',ml:60,size:3,h:4,ref:29,effort:1,ship:4,base:1.6,tier:0,inj:1},
  desk:{name:'Desk figure 1/10',ml:120,size:5,h:6,ref:49,effort:1.5,ship:5,base:1.2,tier:0,inj:1},
  kit:{name:'Garage kit 1/7',ml:250,size:8,h:8,ref:69,effort:.4,ship:6,base:.6,tier:1,note:'Sold unpainted'},
  premium:{name:'Premium 1/6 painted',ml:400,size:14,h:10,ref:149,effort:4,ship:8,base:.35,tier:1},
  statue:{name:'Statue 1/4',ml:1500,size:40,h:18,ref:449,effort:10,ship:15,base:.08,tier:2},
  fullcolor:{name:'Full-colour figure 1/6',ml:300,size:14,h:9,ref:389,effort:.3,ship:8,base:.3,tier:3,note:'Printed in colour, no painting'},
  licensed:{name:'Licensed figure',ml:150,size:5,h:7,ref:89,effort:2,ship:5,base:1.5,tier:0,req:'licensing',royalty:.15,inj:1},
  deckbox:{name:'Deck box',ml:80,size:4,h:5,ref:25,effort:.6,ship:4,base:1.8,tier:0,req:'deckbox',inj:1},
  ahri:{name:'Ahri 1/7 (League of Legends)',ml:260,size:8,h:8,ref:169,effort:3,ship:6,base:.55,tier:1,req:'licensing',royalty:.15,official:1,col:'#f08fc0'},
  akali:{name:'Akali 1/7 (League of Legends)',ml:250,size:8,h:8,ref:159,effort:3,ship:6,base:.55,tier:1,req:'licensing',royalty:.15,official:1,col:'#5fd38d'},
  yone:{name:'Yone 1/7 (League of Legends)',ml:250,size:8,h:8,ref:159,effort:3,ship:6,base:.55,tier:1,req:'licensing',royalty:.15,official:1,col:'#52c7d8'},
  jhin:{name:'Jhin 1/7 (League of Legends)',ml:260,size:8,h:8,ref:169,effort:3,ship:6,base:.5,tier:1,req:'licensing',royalty:.15,official:1,col:'#e0b24a'},
  jinx:{name:'Jinx 1/7 (League of Legends)',ml:260,size:8,h:8,ref:169,effort:3,ship:6,base:.55,tier:1,req:'licensing',royalty:.15,official:1,col:'#6aa7ff'},
  lux:{name:'Lux bust (League of Legends)',ml:70,size:3,h:4,ref:89,effort:1.2,ship:4,base:1,tier:0,req:'licensing',royalty:.15,official:1,inj:1,col:'#f2e394'},
  yasuo:{name:'Yasuo bust (League of Legends)',ml:70,size:3,h:4,ref:89,effort:1.2,ship:4,base:1,tier:0,req:'licensing',royalty:.15,official:1,inj:1,col:'#9db7d6'},
  jinhsi:{name:'Jinhsi 1/7 (Wuthering Waves)',ml:260,size:8,h:8,ref:169,effort:3,ship:6,base:.55,tier:1,req:'licensing',royalty:.15,official:1,col:'#e8c872'},
  jinhsib:{name:'Jinhsi bust (Wuthering Waves)',ml:70,size:3,h:4,ref:89,effort:1.2,ship:4,base:1,tier:0,req:'licensing',royalty:.15,official:1,inj:1,col:'#e8c872'},
  kaisa:{name:"Kai'Sa statue 1/4 (League of Legends)",ml:1500,size:40,h:18,ref:499,effort:10,ship:15,base:.07,tier:2,req:'licensing',royalty:.15,official:1,col:'#b58cf0'}
};
const PKEYS=Object.keys(PRODUCTS);
const TIERS=['Small','Medium','Large','Industrial','Laboratory'];
const PGROUPS=['Desktop','Pro','Large','Industrial','Laboratorium'];
const mkP=(name,grp,cost,slots,speed,fail,wear,tier,fix,ws,o)=>Object.assign({name,grp,cost,slots,speed,fail,wear,tier,vat:0,form:false,fix,ws,fam:'vat'},o);
const PRINTERS={
  mars:mkP('Elegoo Mars 4 Ultra',0,250,16,1,.10,4,0,15,0,{vat:500}),
  mars5:mkP('Elegoo Mars 5 Ultra',0,320,18,1.15,.09,3.8,0,15,0,{vat:500}),
  photon:mkP('Anycubic Photon Mono M7 Pro',0,450,24,1.4,.08,3.5,0,15,0,{vat:600}),
  m5s:mkP('Anycubic Photon Mono M5s',0,520,26,1.35,.08,3.4,0,15,0,{vat:600}),
  sonic8k:mkP('Phrozen Sonic Mini 8K S',0,580,22,1.3,.07,3.4,0,15,0,{vat:450}),
  mage:mkP('Creality Halot-Mage Pro',0,640,30,1.5,.08,3.3,0,18,0,{vat:700}),
  saturn:mkP('Elegoo Saturn 4 Ultra',1,650,40,1.2,.07,3,1,20,0,{vat:900}),
  saturn16:mkP('Elegoo Saturn 4 Ultra 16K',1,780,44,1.35,.065,3,1,20,0,{vat:950}),
  mighty:mkP('Phrozen Sonic Mighty Revo',1,850,45,1.5,.06,3,1,20,1,{vat:1000}),
  m7max:mkP('Anycubic Photon Mono M7 Max',1,1050,64,1.3,.07,3,1,25,1,{vat:1100}),
  prusa:mkP('Prusa SL1S Speed',1,1900,34,1.9,.045,2.5,1,30,1,{vat:600}),
  form3:mkP('Formlabs Form 3+',1,3300,28,1.8,.025,1.8,1,100,1,{form:true,fam:'form'}),
  form4:mkP('Formlabs Form 4',1,4500,32,2.2,.02,1.5,1,120,1,{form:true,fam:'form'}),
  form4b:mkP('Formlabs Form 4B',1,5400,32,2.2,.015,1.4,1,120,1,{form:true,fam:'form'}),
  asiga:mkP('Asiga MAX UV',1,9800,44,2.1,.03,1.2,1,90,2,{vat:700}),
  jupiter:mkP('Elegoo Jupiter SE',2,1600,120,.9,.08,2.5,2,45,2,{vat:2000}),
  mega:mkP('Phrozen Sonic Mega 8K S',2,2100,110,1.2,.075,2.6,2,50,2,{vat:1800}),
  form4l:mkP('Formlabs Form 4L',2,12000,100,2,.02,1.2,2,250,2,{form:true,fam:'form'}),
  nexa:mkP('Nexa3D XiP',2,24000,120,4,.04,2,2,150,3,{vat:1500,req:'power3'}),
  carbon:mkP('Carbon M3',2,58000,140,3.4,.015,1,2,600,3,{form:true,fam:'carbon',req:'power3',pow:60}),
  pj35:mkP('Stratasys J35 Pro (PolyJet)',3,48000,60,2.4,.02,1,3,700,3,{form:true,fam:'pj',req:'power3',pow:120,pj:1}),
  mjp:mkP('3D Systems ProJet MJP 2500 Plus',3,72000,70,2.6,.018,.9,3,900,3,{form:true,fam:'mjp',req:'power3',pow:140,pj:1}),
  pj55:mkP('Stratasys J55 Prime (PolyJet)',3,98000,120,3,.015,.8,3,1100,4,{form:true,fam:'pj',req:'power3',pow:160,pj:1}),
  pj850:mkP('Stratasys J850 Prime (PolyJet)',3,215000,300,4.2,.012,.7,3,2000,4,{form:true,fam:'pj',req:'power3',pow:260,pj:1}),
  baby:mkP('Babyplast 6/10P (injection)',3,14500,30,7,.02,1,1,400,2,{form:true,fam:'inj',inj:1,req:'power3',pow:90}),
  arburg:mkP('Arburg Allrounder 270 A (injection)',3,78000,140,9,.015,.9,1,1200,3,{form:true,fam:'inj',inj:1,req:'power3',pow:260}),
  engel:mkP('Engel e-mac 180 (injection)',3,142000,280,11,.012,.8,1,2200,4,{form:true,fam:'inj',inj:1,req:'power3',pow:420}),
  /* Laboratorium: beyond PolyJet and injection moulding. Make every product, no moulds, no washing, huge batches, near-zero failures. */
  aurora:mkP('Aurora Photonic Forge',4,320000,360,14,.008,.5,4,3000,4,{form:true,fam:'lab',lab:1,req:'labwing',pow:600,q:.05}),
  helix:mkP('Helix Volumetric V1',4,480000,440,20,.007,.4,4,3600,4,{form:true,fam:'lab',lab:1,req:'labwing',pow:800,q:.08}),
  nebula:mkP('Nebula Holo-Press',4,700000,540,27,.006,.35,4,4500,4,{form:true,fam:'lab',lab:1,req:'labwing',pow:1000,q:.12}),
  chronos:mkP('Chronos Time-Lattice',4,1000000,660,36,.005,.3,4,6000,4,{form:true,fam:'lab',lab:1,req:'labwing',pow:1300,q:.15}),
  valkyrie:mkP('Valkyrie Quantum Caster',4,1600000,820,46,.004,.25,4,8000,5,{form:true,fam:'lab',lab:1,req:'labwing',pow:1700,q:.2}),
  leviathan:mkP('Leviathan Mega-Forge',4,2500000,1500,40,.004,.2,4,12000,5,{form:true,fam:'lab',lab:1,req:'labwing',pow:2400,q:.18}),
  singularity:mkP('Singularity Nano-Assembler',4,4200000,1150,72,.002,.15,4,18000,5,{form:true,fam:'lab',lab:1,req:'labwing',pow:3200,q:.28}),
  omega:mkP('Omega Genesis Engine',4,8000000,2000,105,.001,.1,4,30000,5,{form:true,fam:'lab',lab:1,req:'labwing',pow:5000,q:.4})
};
const FAMS={vat:'Resin for open vat printers',form:'Formlabs cartridges',carbon:'Carbon cartridges',pj:'Stratasys PolyJet cartridges',mjp:'3D Systems cartridges',inj:'Injection moulding pellets',lab:'Laboratorium feedstock'};
const DEFRES={vat:'estd',form:'fgrey',carbon:'crpu',pj:'vpw',mjp:'mjr',inj:'pabs',lab:'labq'};
const mkR=(name,fam,pack,cost,q,fail,note,o)=>Object.assign({name,fam,pack,cost,q,fail,note,form:fam!=='vat'},o);
const RESINS={
  estd:mkR('Elegoo Standard 2.0','vat','1 kg bottle',30,0,0,'Cheap all-rounder'),
  ewater:mkR('Elegoo Water Washable','vat','1 kg bottle',34,0,.005,'Washes in water: wash & cure costs half the energy',{water:1}),
  erapid:mkR('Elegoo Rapid Resin','vat','1 kg bottle',36,-.03,.01,'Prints 30% faster, a little softer detail',{fast:1.3}),
  eabs:mkR('Elegoo ABS-Like 3.0','vat','1 kg bottle',38,.1,-.02,'Tougher parts, fewer failed prints'),
  aww:mkR('Anycubic Water-Wash+','vat','1 kg bottle',35,0,.01,'Washes in water: wash & cure costs half the energy',{water:1}),
  aplant:mkR('Anycubic Plant-Based UV Resin','vat','1 kg bottle',33,.05,0,'Greener, a little nicer reviews'),
  atough:mkR('Anycubic Tough Resin','vat','1 kg bottle',44,.12,-.02,'Survives drops, fewer snapped parts'),
  siraya:mkR('Siraya Tech Fast','vat','1 kg bottle',42,.15,-.01,'Crisp detail, better reviews'),
  sblu:mkR('Siraya Tech Blu','vat','1 kg bottle',58,.2,-.03,'Clear and very tough'),
  sten:mkR('Siraya Tech Tenacious','vat','1 kg bottle',62,.18,-.02,'Flexible and hard to break'),
  ssculpt:mkR('Siraya Tech Sculpt Ultra','vat','1 kg bottle',66,.25,0,'Fine detail for collectors'),
  phaqua:mkR('Phrozen Aqua-Gray 8K','vat','1 kg bottle',48,.2,0,'Razor sharp and water washable',{water:1}),
  prusa:mkR('Prusament Resin Tough','vat','1 kg bottle',79,.22,-.03,'Pro-grade tough resin'),
  mono:mkR('Monocure 3D Rapid','vat','1 kg bottle',40,0,0,'Fast curing, prints 25% faster',{fast:1.25}),
  fgrey:mkR('Formlabs Grey V5','form','1 L cartridge',179,.3,-.01,'Best detail for the price'),
  fwhite:mkR('Formlabs White V5','form','1 L cartridge',179,.3,-.01,'Great for painting'),
  fclear:mkR('Formlabs Clear V5','form','1 L cartridge',179,.25,-.01,'Glass-clear parts'),
  fdraft:mkR('Formlabs Draft V2','form','1 L cartridge',149,.1,0,'Prints 40% faster',{fast:1.4}),
  ftough:mkR('Formlabs Tough 2000','form','1 L cartridge',199,.2,-.03,'Rugged, snap-fit parts'),
  fflex:mkR('Formlabs Flexible 80A','form','1 L cartridge',199,.15,-.01,'Rubbery parts'),
  frigid:mkR('Formlabs Rigid 10K','form','1 L cartridge',249,.25,-.02,'Glass-filled, very stiff'),
  fhigh:mkR('Formlabs High Temp V2','form','1 L cartridge',259,.2,-.02,'Heat resistant'),
  fcast:mkR('Formlabs Castable Wax 40','form','1 L cartridge',349,.35,.005,'Jewellery-grade detail'),
  crpu:mkR('Carbon RPU 70','carbon','1 L cartridge',520,.4,-.01,'Rigid production polyurethane'),
  cepu:mkR('Carbon EPU 41','carbon','1 L cartridge',560,.35,-.01,'Elastic production polyurethane'),
  vpw:mkR('Stratasys Vero PureWhite','pj','2 kg cartridge',600,.5,-.01,'Sharp white parts',{vol:2000}),
  vvivid:mkR('Stratasys Vero Vivid colours','pj','2 kg cartridge',780,.6,-.01,'Full-colour printing, no painting',{vol:2000}),
  ag30:mkR('Stratasys Agilus30','pj','2 kg cartridge',700,.45,0,'Flexible, rubber-like',{vol:2000}),
  dabs:mkR('Stratasys Digital ABS Plus','pj','2 kg cartridge',720,.5,-.02,'Tough, ABS-like',{vol:2000}),
  mjr:mkR('3D Systems VisiJet Rigid','mjp','2 kg cartridge',640,.48,-.01,'Crisp rigid plastic',{vol:2000}),
  mjf:mkR('3D Systems VisiJet Flex','mjp','2 kg cartridge',700,.42,0,'Flexible plastic',{vol:2000}),
  pabs:mkR('ABS pellets','inj','25 kg bag',60,-.02,0,'Standard moulding plastic',{vol:25000}),
  ppp:mkR('Polypropylene pellets','inj','25 kg bag',45,-.08,0,'Cheapest. Softer, duller finish',{vol:25000}),
  ppetg:mkR('PETG pellets','inj','25 kg bag',55,.05,-.005,'Glossy and tough',{vol:25000}),
  labq:mkR('Quantum Photopolymer','lab','20 L drum',900,.6,-.015,'Laboratorium standard feedstock',{vol:20000}),
  labc:mkR('Chrono Accelerant Resin','lab','20 L drum',1300,.55,-.015,'Prints 50% faster',{vol:20000,fast:1.5}),
  labn:mkR('Aether Nano-Resin','lab','20 L drum',1700,.8,-.02,'Atom-fine detail, collectors pay more',{vol:20000}),
  labv:mkR('Void-Matter Feedstock','lab','20 L drum',2800,1,-.03,'Flawless parts, 30% faster',{vol:20000,fast:1.3})
};
const WASHERS={
  bucket:{name:'IPA bucket + UV lamp',cap:4,cost:0,ws:0},
  mercury:{name:'Elegoo Mercury Plus 3.0',cap:10,cost:120,ws:0},
  acplus:{name:'Anycubic Wash & Cure Plus',cap:14,cost:220,ws:0},
  wcmax:{name:'Anycubic Wash & Cure Max',cap:24,cost:320,ws:1},
  formwc:{name:'Formlabs Form Wash + Form Cure',cap:30,cost:1900,ws:1},
  formwcl:{name:'Formlabs Form Wash L + Cure L',cap:60,cost:3800,ws:2},
  line:{name:'Industrial ultrasonic wash line',cap:150,cost:14000,ws:3},
  postpro:{name:'Automated post-processing line',cap:400,cost:48000,ws:4}
};
const ROLES={
  tech:{name:'Print technician',wage:95,desc:'Runs your printers: cleans, collects, refills, services and starts prints, picking what to print from demand. Every technician makes all printers faster.'},
  post:{name:'Post-processor',wage:80,desc:'Washes and cures every finished plate as soon as it comes off a printer.'},
  painter:{name:'Painter',wage:90,desc:'Removes supports, sands and paints. Premium figures and statues take hours.'},
  packer:{name:'Packer',wage:70,desc:'Packs and ships orders the moment a figure is ready.'},
  support:{name:'Customer support',wage:75,desc:'Answers your DMs, lifts reviews and makes customers wait longer.'},
  social:{name:'Social media manager',wage:80,desc:'Posts all day for about +3 hype a day.'},
  engineer:{name:'Maintenance engineer',wage:100,desc:'Services printers before they wear out and cuts wear by a quarter.',kvk:1},
  buyer:{name:'Production manager',wage:90,desc:'Orders resin, pellets and cartridges for you before they run out.',kvk:1},
  logistics:{name:'Logistics coordinator',wage:85,desc:'Negotiates shipping rates and cuts lost and damaged parcels.',kvk:1},
  inspector:{name:'Quality inspector',wage:85,desc:'Checks every figure: better quality and fewer damaged parcels.',kvk:1},
  designer:{name:'3D designer',wage:105,desc:'Creates original designs, so customers accept higher prices.',kvk:1},
  photographer:{name:'Product photographer',wage:80,desc:'Makes your webshop look great: more orders and a bit of hype.',kvk:1},
  salesrep:{name:'Sales representative',wage:100,desc:'Accepts business contracts and delivers them when the stock is there.',kvk:1},
  accountant:{name:'Accountant',wage:110,desc:'Files your BTW return, finds tax deductions and handles the paperwork.',kvk:1}
};
const TRAITS={
  quick:{n:'Quick',d:{all:'Works 25% faster'}},
  careful:{n:'Careful',d:{tech:'Fewer failed prints',post:'Better print quality',painter:'Better print quality',packer:'Better reviews',support:'Better reviews',social:'Hype fades slower',engineer:'Machines last longer',buyer:'Finds cheaper deals',logistics:'Fewer lost parcels',inspector:'Even fewer damaged parcels',designer:'Designs sell for more',photographer:'Better photos',salesrep:'Negotiates better pay',accountant:'Finds more deductions'}},
  efficient:{n:'Efficient',d:{tech:'Wastes 12% less resin',post:'Bigger wash batches',painter:'Finishes figures faster',packer:'Saves €0.50 shipping per order',support:'Replies earn hype',social:'+30% more hype',engineer:'Repairs cost less',buyer:'Bulk deals: 6% cheaper',logistics:'Cheaper rates',inspector:'Spots problems early',designer:'More designs, more demand',photographer:'More orders',salesrep:'Closes more contracts',accountant:'Lower accounting costs'}}
};
const XPN=[30,90,200,380];
const traitDesc=(role,t)=>t?(TRAITS[t].d.all||TRAITS[t].d[role]||''):'';
const PASSIVE={social:'Posting content',designer:'Drawing a new design',photographer:'Shooting product photos',accountant:'Doing the books',logistics:'Optimising shipping rates',inspector:'Inspecting figures'};
const HOUR_MS=12000,MAX_AWAY=240;
const QUARTER=28,YEAR=112,KOR_LIMIT=20000,KVK_FEE=85,EMP_COSTS=.18;
const SPACES=[
  {name:'Hok (storage unit)',rent:150,printers:2,staff:1,cost:0},
  {name:'Small studio',rent:700,printers:5,staff:4,cost:2500,kvk:1},
  {name:'Workshop',rent:1900,printers:12,staff:10,cost:9000,permit:'omg'},
  {name:'Factory hall',rent:5200,printers:30,staff:25,cost:35000,permit:'milieu'},
  {name:'Industrial unit',rent:11000,printers:60,staff:50,cost:110000,permit:'milieu'},
  {name:'Production campus',rent:26000,printers:140,staff:120,cost:420000,permit:'iso'}
];
const PERMITS={
  omg:{name:'Omgevingsvergunning',desc:'Needed to run a workshop with resin storage.',cost:1200},
  milieu:{name:'Environmental permit + fire safety',desc:'Needed for a factory hall or industrial unit.',cost:4500},
  iso:{name:'ISO 9001 certification',desc:'Needed for a production campus. Big B2B clients like it.',cost:12000}
};
const CARRIERS={
  postnl:{name:'PostNL',mult:1,days:2,lost:.012,dmg:.012,cost:0,note:'Cheap and everywhere'},
  dhl:{name:'DHL Parcel',mult:1.12,days:1.5,lost:.008,dmg:.01,cost:150,kvk:1,note:'Faster, business account'},
  dpd:{name:'DPD',mult:.92,days:2.5,lost:.015,dmg:.016,cost:0,req:()=>S.sold>=40,reqText:'Ship 40 orders first',note:'A little cheaper, a little rougher'},
  ups:{name:'UPS',mult:1.55,days:1,lost:.003,dmg:.005,cost:400,kvk:1,note:'Premium: fast and careful, even abroad'},
  van:{name:'Own delivery van',mult:.35,days:1,lost:.002,dmg:.004,cost:16000,weekly:380,nl:1,req:()=>S.ws>=2&&S.up.dock,reqText:'Needs a workshop and a loading dock',note:'Netherlands only. €380 a week for van and driver'},
  fulfil:{name:'Fulfilment partner',mult:1.25,days:1.5,lost:.004,dmg:.006,cost:2500,weekly:90,fee:2.2,auto:1,kvk:1,req:()=>S.sold>=400,reqText:'Ship 400 orders first',note:'They pack and ship for you, no staff needed'}
};
const DESTS={nl:{name:'Netherlands',cost:1,days:1,w:.62,lost:1},eu:{name:'Europe (BE, DE, ...)',cost:1.7,days:1.6,w:.28,lost:1.4},world:{name:'Rest of the world',cost:3.2,days:3,w:.10,lost:2.4}};
const CHANNELS={
  web:{name:'Your webshop',w:1,fee:.019,fix:.3,feeName:'Payment fees'},
  bol:{name:'bol.com',w:.45,fee:.15,fix:.99,feeName:'Marketplace fees',cost:1500,kvk:1,note:'Many buyers, 15% + €0.99 per order'},
  etsy:{name:'Etsy',w:.25,fee:.105,fix:.2,feeName:'Marketplace fees',cost:100,kvk:1,note:'Niche buyers, about 10.5% + €0.20 per order'}
};
const SEASONS=[{n:'Spring',m:1,len:28},{n:'Summer holidays',m:.9,len:28},{n:'Con season',m:1.15,len:28},{n:'Holiday rush',m:1.4,len:28}];
const STORES={
  manga:{name:'Manga store',cost:15000,rent:900,unit:6,sell:10,traffic:28,capB:300,pack:100,item:'volumes',req:()=>S.ws>=1,reqText:'Needs a small studio',merge:6000,mergeText:'Your figures sell at the counter with no shipping, and it unlocks the licensing deal.'},
  tcg:{name:'Trading card shop',cost:22000,rent:1100,unit:3,sell:5,traffic:55,capB:600,pack:200,item:'boosters',req:()=>!!S.stores.manga?.open,reqText:'Open the manga store first',merge:8000,mergeText:'Host weekly tournaments and unlock the deck box line.'},
  cafe:{name:'Anime café',cost:38000,rent:1600,unit:1.3,sell:4.5,traffic:90,capB:250,pack:100,item:'portions',spoil:true,req:()=>S.ws>=2,reqText:'Needs a workshop',merge:12000,mergeText:'+5 hype every day and paint-your-own-figure workshops.'}
};
const LVL=[1,1.7,2.6];
const needWs=n=>[{req:()=>S.ws>=n,reqText:'Needs the '+SPACES[n].name.toLowerCase()}];
const mkU=(id,cat,name,cost,desc,fx,x)=>({id,cat,name,cost,desc,...fx,...(x||{})});
const UPGRADES=[
  {id:'coffee',cat:'energy',name:'Espresso machine',cost:80,desc:'+10 max energy and +0.5 regen per hour.',e:10,rg:.5},
  {id:'mat',cat:'energy',name:'Anti-fatigue mat',cost:150,desc:'+10 max energy.',e:10},
  {id:'inbox',cat:'energy',name:'Reply templates',cost:100,desc:'Answering a message costs 1 energy instead of 2.'},
  {id:'label',cat:'energy',name:'Label printer',cost:140,desc:'Packing an order costs 2 energy instead of 3.'},
  {id:'feeder',cat:'energy',name:'Resin auto-feeder',cost:300,desc:'Refilling a vat costs no energy.'},
  {id:'ultra',cat:'energy',name:'Ultrasonic support remover',cost:350,desc:'Finishing figures costs 30% less energy.'},
  {id:'mattress',cat:'energy',name:'Good mattress',cost:400,desc:'+20 max energy and night regen +50%.',e:20,nr:.5},
  {id:'bench',cat:'energy',name:'Ergonomic workbench',cost:600,desc:'+30 max energy.',e:30},
  {id:'gym',cat:'energy',name:'Gym membership',cost:500,desc:'+20 max energy and +0.8 regen per hour.',e:20,rg:.8,req:()=>S.sold>=100,reqText:'Sell 100 figures first'},
  {id:'meals',cat:'energy',name:'Meal prep service',cost:900,desc:'+25 max energy.',e:25,req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'slicer',cat:'biz',name:'Pro slicer license',cost:250,desc:'Prints finish 12% faster.'},
  {id:'rails',cat:'biz',name:'Linear rail kits',cost:400,desc:'Prints finish 10% faster.'},
  {id:'tune',cat:'biz',name:'Print farm tuning',cost:1800,desc:'Prints finish 15% faster.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'training',cat:'biz',name:'Training budget',cost:1200,desc:'Staff earn experience 50% faster.',req:()=>S.staff.length>=1,reqText:'Hire someone first'},
  {id:'lounge',cat:'biz',name:'Staff lounge',cost:700,desc:'Morale recovers faster and drops slower.',req:()=>S.staff.length>=1,reqText:'Hire someone first'},
  {id:'night',cat:'biz',name:'Extended shifts',cost:3000,desc:'Staff work 06:00–22:00 instead of 08:00–18:00. Wages +20%.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'lightbox',cat:'biz',name:'Product photo lightbox',cost:180,desc:'+10% webshop demand.'},
  {id:'supports',cat:'biz',name:'Auto-support presets',cost:450,desc:'40% fewer failed prints.'},
  {id:'fume',cat:'biz',name:'Fume extraction',cost:900,desc:'Staff morale drops half as fast.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'sub',cat:'biz',name:'Resin subscription',cost:500,desc:'Reorders every resin your printers use when it drops under 1 L.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'recycle',cat:'biz',name:'IPA recycling still',cost:1800,desc:'IPA and waste disposal cost 60% less.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'theme',cat:'biz',name:'Webshop redesign',cost:1200,desc:'+15% webshop demand.',req:()=>S.sold>=50,reqText:'Sell 50 figures first'},
  {id:'ip',cat:'biz',name:'Own character brand',cost:2500,desc:'Original characters: +10% demand and no more takedown notices.',req:()=>S.staff.some(s=>s.role==='designer'),reqText:'Hire a 3D designer first'},
  {id:'bulk',cat:'biz',name:'Bulk resin contract',cost:2000,desc:'All resin 20% cheaper.',req:()=>S.ws>=2,reqText:'Needs a workshop'},
  {id:'licensing',cat:'biz',name:'Licensing deal',cost:5000,desc:'New products: licensed figures and official League of Legends and Wuthering Waves characters (15% royalty).',req:()=>!!S.stores.manga?.merged,reqText:'Merge the manga store first'},
  {id:'deckbox',cat:'biz',name:'Deck box line',cost:1500,desc:'New product: printed deck boxes.',req:()=>!!S.stores.tcg?.merged,reqText:'Merge the card shop first'},
  {id:'franchise',cat:'biz',name:'Resinaprint franchise',cost:50000,desc:'Demand ×1.5 for everything.',req:()=>Object.values(S.stores).filter(s=>s.merged).length>=3,reqText:'Merge all three stores'},
  {id:'racks',cat:'site',name:'Racking & shelving',cost:600,desc:'+2 printer spots.'},
  {id:'office',cat:'site',name:'Office corner',cost:3000,desc:'+3 staff spots.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'aircon',cat:'site',name:'Air conditioning',cost:2200,desc:'Stable temperature: 10% fewer failed prints.',req:()=>S.ws>=1,reqText:'Needs a small studio'},
  {id:'power3',cat:'site',name:'3-phase power connection',cost:3500,desc:'Required for industrial printers and injection moulding.',req:()=>S.ws>=2,reqText:'Needs a workshop'},
  {id:'dock',cat:'site',name:'Loading dock',cost:4000,desc:'Shipping costs 10% less. Unlocks your own van.',req:()=>S.ws>=2,reqText:'Needs a workshop'},
  {id:'mezz',cat:'site',name:'Mezzanine floor',cost:6500,desc:'+4 printer spots and +4 staff spots.',req:()=>S.ws>=2,reqText:'Needs a workshop'},
  {id:'solar',cat:'site',name:'Solar panels',cost:7500,desc:'Electricity bill 40% lower.',req:()=>S.ws>=2,reqText:'Needs a workshop'},
  {id:'clean',cat:'site',name:'Cleanroom corner',cost:9000,desc:'Cartridge, Carbon and PolyJet machines fail 20% less.',req:()=>S.ws>=3,reqText:'Needs a factory hall'}
  ,
  // ---- energy: regen, max energy, cheaper tasks, night sleep ----
  mkU('chef','energy','Healthy lunch box habit',120,'+0.4 energy regen per hour.',{rg:.4}),
  mkU('nap','energy','Power nap couch',220,'+1 regen per hour, and double regen when you are nearly empty.',{rg:1,low:1}),
  mkU('headph','energy','Noise-cancelling headphones',180,'Every task costs 5% less energy.',{ec:.05}),
  mkU('blackout','energy','Blackout curtains',150,'You sleep better: night regen +30%.',{nr:.3}),
  mkU('pet','energy','Studio cat',400,'Pets calm everyone. +0.5 regen per hour and staff morale drops 15% slower.',{rg:.5,mo:.15}),
  mkU('standing','energy','Standing desk',350,'+15 max energy and +0.5 regen per hour.',{e:15,rg:.5}),
  mkU('flow','energy','Flow state playlist',300,'Every task costs 8% less energy.',{ec:.08}),
  mkU('tracker','energy','Sleep tracker',260,'Night regen +40%.',{nr:.4}),
  mkU('caff','energy','Coffee subscription',450,'You may drink 3 more energy drinks a day.',{dr:3}),
  mkU('wind','energy','Second wind',700,'Below 15 energy your regen is tripled again.',{low:1.5}),
  mkU('sauna','energy','Sauna session',1500,'+1.5 regen per hour.',{rg:1.5},...needWs(1)),
  mkU('physio','energy','Physio sessions',800,'+25 max energy.',{e:25}),
  mkU('zen','energy','Zen corner',1800,'+0.8 regen per hour and staff morale drops 20% slower.',{rg:.8,mo:.2},...needWs(1)),
  mkU('massage','energy','Massage chair',2500,'+20 max energy and +1.2 regen per hour.',{e:20,rg:1.2},{req:()=>S.sold>=300,reqText:'Sell 300 figures first'}),
  mkU('biohack','energy','Biohacking stack',6000,'+30 max energy, +2 regen per hour.',{e:30,rg:2},{req:()=>S.sold>=1000,reqText:'Sell 1000 figures first'}),
  mkU('cobot','energy','Desk cobot assistant',12000,'A robot arm does the heavy lifting: every task costs 20% less energy.',{ec:.2},...needWs(2)),
  mkU('autopilot','energy','Autopilot routines',20000,'+40 max energy, +3 regen per hour. You run the place without breaking a sweat.',{e:40,rg:3},{req:()=>S.ws>=3&&S.staff.length>=6,reqText:'Needs a factory hall and 6 staff'}),
  // ---- production ----
  mkU('warmer','prod','Resin warmer',220,'Prints 4% faster and 3% fewer failures.',{spd:.04,fail:.03}),
  mkU('jig','prod','Levelling jig',200,'4% fewer failed prints.',{fail:.04}),
  mkU('led','prod','LED lighting',150,'Electricity bill 5% lower.',{pow:.05}),
  mkU('fep','prod','Spare FEP stock',250,'Printers wear 10% slower.',{wear:.1}),
  mkU('filter','prod','Resin filter station',400,'Reuse leftover resin: 5% less resin used.',{rsn:.05}),
  mkU('vatheat','prod','Vat heater',450,'5% fewer failed prints.',{fail:.05}),
  mkU('lamp','prod','Colour-calibrated lamp',600,'+0.03★ print quality.',{qual:.03}),
  mkU('profiles','prod','Print profile library',900,'Prints 6% faster.',{spd:.06}),
  mkU('uvlamp','prod','Efficient UV lamps',900,'Electricity bill 10% lower.',{pow:.1}),
  mkU('airbrush','prod','Fine-tip airbrush kit',900,'+0.04★ print quality.',{qual:.04}),
  mkU('enclose','prod','UV-tight enclosure',700,'4% fewer failed prints.',{fail:.04}),
  mkU('firm','prod','Firmware tuning',1500,'Prints 6% faster.',{spd:.06},...needWs(1)),
  mkU('pm','prod','Preventive maintenance plan',1500,'Printers wear 15% slower.',{wear:.15},...needWs(1)),
  mkU('loop','prod','Resin recycling loop',2500,'6% less resin used.',{rsn:.06},...needWs(1)),
  mkU('sensors','prod','Sensor package',2500,'8% fewer failed prints.',{fail:.08},...needWs(1)),
  mkU('booth','prod','Spray booth',3500,'+0.05★ print quality.',{qual:.05},...needWs(1)),
  mkU('linear','prod','Linear motion upgrade',5000,'Prints 8% faster.',{spd:.08},...needWs(2)),
  mkU('parts','prod','Parts warehouse',6000,'Printers wear 20% slower.',{wear:.2},...needWs(2)),
  mkU('direct','prod','Direct manufacturer account',8000,'8% less resin cost.',{rsn:.08},...needWs(2)),
  mkU('aidet','prod','AI failure detection',9000,'12% fewer failed prints.',{fail:.12},...needWs(2)),
  mkU('battery','prod','Battery storage',12000,'Electricity bill 15% lower.',{pow:.15},...needWs(2)),
  mkU('edge','prod','Edge-compute slicing',12000,'Prints 10% faster.',{spd:.1},...needWs(3)),
  mkU('qlab','prod','Quality lab',15000,'+0.08★ print quality.',{qual:.08},...needWs(3)),
  mkU('twin','prod','Digital twin',30000,'15% fewer failed prints.',{fail:.15},...needWs(3)),
  mkU('mes','prod','Smart factory system',60000,'Prints 12% faster, 10% fewer failures, all tasks 10% cheaper in energy.',{spd:.12,fail:.1,ec:.1},...needWs(4)),
  mkU('lights','prod','Lights-out production',150000,'Prints 15% faster, wages 10% lower, electricity 10% lower.',{spd:.15,wag:.1,pow:.1},...needWs(5)),
  // ---- sales & marketing ----
  mkU('cards','sales','Business cards & portfolio',200,'Contracts pay 4% more.',{pay:.04}),
  mkU('newsletter','sales','Email newsletter',300,'+5% demand.',{dem:.05}),
  mkU('labelsw','sales','Shipping label software',400,'Shipping costs 3% less.',{shp:.03}),
  mkU('foam','sales','Foam inserts',600,'Damaged parcels 20% rarer.',{dmg:.2}),
  mkU('bubble','sales','Bubble wrap station',300,'Damaged parcels 15% rarer.',{dmg:.15}),
  mkU('gshop','sales','Google Shopping feed',400,'+6% demand.',{dem:.06}),
  mkU('loyal','sales','Loyalty cards',500,'+5% demand.',{dem:.05}),
  mkU('discord','sales','Community Discord',600,'+1 hype a day.',{hyp:1}),
  mkU('igshop','sales','Instagram shop',700,'+7% demand.',{dem:.07}),
  mkU('carrdisc','sales','Carrier account discount',800,'Shipping costs 5% less.',{shp:.05},{req:()=>S.biz.kvk,reqText:'Register at the KvK first'}),
  mkU('track','sales','Tracked & insured shipping',1200,'Lost parcels 25% rarer.',{loss:.25}),
  mkU('seo','sales','SEO audit',1200,'+8% demand.',{dem:.08},{req:()=>S.sold>=50,reqText:'Sell 50 figures first'}),
  mkU('b2b','sales','B2B sales deck',1500,'Contracts pay 6% more.',{pay:.06},{req:()=>S.biz.kvk,reqText:'Register at the KvK first'}),
  mkU('patreon','sales','Patreon page',1500,'+2 hype a day.',{hyp:2},{req:()=>S.sold>=100,reqText:'Sell 100 figures first'}),
  mkU('shelf','sales','Warehouse shelving',1800,'Shipping costs 5% less.',{shp:.05},...needWs(1)),
  mkU('affil','sales','Affiliate programme',2500,'+10% demand.',{dem:.1},...needWs(1)),
  mkU('mascot','sales','Brand mascot',3000,'+3 hype a day.',{hyp:3},{req:()=>S.sold>=300,reqText:'Sell 300 figures first'}),
  mkU('video','sales','Brand video',6000,'+10% demand.',{dem:.1},{req:()=>S.sold>=500,reqText:'Sell 500 figures first'}),
  mkU('pr','sales','PR agency retainer',20000,'+15% demand and +4 hype a day.',{dem:.15,hyp:4},...needWs(2)),
  // ---- team ----
  mkU('cofcorner','team','Coffee corner',400,'Staff morale drops 10% slower.',{mo:.1},{req:()=>S.staff.length>=1,reqText:'Hire someone first'}),
  mkU('payroll','team','Payroll software',500,'Wages 3% lower.',{wag:.03},{req:()=>S.biz.kvk&&S.staff.length>=1,reqText:'Hire someone first'}),
  mkU('courses','team','Online courses',800,'Staff earn experience 20% faster.',{xp:.2},{req:()=>S.staff.length>=1,reqText:'Hire someone first'}),
  mkU('tbday','team','Team building day',1000,'Staff morale drops 20% slower.',{mo:.2},{req:()=>S.staff.length>=2,reqText:'Hire two people first'}),
  mkU('mentor','team','Mentor programme',1500,'Staff earn experience 25% faster.',{xp:.25},{req:()=>S.staff.length>=2,reqText:'Hire two people first'}),
  mkU('wellness','team','Wellness budget',2000,'Staff morale drops 25% slower.',{mo:.25},{req:()=>S.staff.length>=2,reqText:'Hire two people first'}),
  mkU('appren','team','Apprenticeship scheme',2500,'Wages 6% lower and experience 10% faster.',{wag:.06,xp:.1},{req:()=>S.staff.length>=3,reqText:'Hire three people first'}),
  mkU('hrsys','team','HR system',4000,'Wages 5% lower.',{wag:.05},{req:()=>S.staff.length>=4,reqText:'Hire four people first'}),
  mkU('academy','team','Resinaprint Academy',15000,'Experience 30% faster, wages 5% lower.',{xp:.3,wag:.05},{req:()=>S.staff.length>=6,reqText:'Hire six people first'})
];
UPGRADES.push({id:'labwing',cat:'site',name:'Laboratorium wing',cost:200000,desc:'A clean, shielded research wing. Unlocks the 8 Laboratorium printers in Buy › Printers.',req:()=>S.ws>=4&&!!S.up.power3,reqText:'Needs an industrial unit and the 3-phase power connection'});
const UCATS=[['energy','Energy'],['prod','Production'],['sales','Sales'],['team','Team'],['biz','Business']];

const CAMPAIGNS=[
  {id:'tiktok',name:'TikTok timelapse',cost:0,energy:15,hype:6,cd:2,desc:'Film a print rising out of the vat and edit it yourself.'},
  {id:'insta',name:'Instagram ads',cost:150,hype:18,cd:2,desc:'Paid reach for your best product photos.'},
  {id:'influencer',name:'Influencer unboxing',cost:600,hype:45,cd:7,minRating:4.2,desc:'Needs a 4.2★ rating.'},
  {id:'con',name:'Anime con booth',cost:1500,hype:80,cd:14,desc:'Big hype, and you sell up to 25 figures from stock.'},
  {id:'youtube',name:'YouTube review',cost:3000,hype:140,cd:21,minRating:4.5,minSold:200,desc:'Needs 4.5★ and 200 figures sold.'},
  {id:'kick',name:'Kickstarter campaign',cost:1200,hype:15,cd:56,minRating:4.2,minHype:60,kvk:1,desc:'Backers prepay a big run of statues or premium figures. Deliver within 4 weeks or refund them. Needs 60 hype and 4.2★.'}
];
const NAMES=['Sanne','Jelle','Femke','Sjoerd','Anouk','Tjitske','Bram','Lotte','Wytse','Noor','Daan','Ilse','Hylke','Yara','Sietse','Mila','Gerben','Fenna','Lars','Romy','Jorrit','Eva','Thijs','Lieke','Pieter','Marije','Tsjalling','Rinske','Douwe','Aukje','Jildou','Wiebe','Ruurd','Sybren','Gjalt','Hanneke'];
const CLIENTS=['Otaku Corner webshop','Dutch anime club','Cosplay group Kitsune','Indie game studio','Escape room props co.','Comic-con raffle','Tabletop gaming café','Animation school','Museum shop','Toy retailer chain'];
const QTY={chibi:[20,45],bust:[8,18],desk:[5,12],kit:[3,8],premium:[2,5],statue:[1,2],fullcolor:[2,6],licensed:[4,10],deckbox:[10,24],ahri:[2,5],akali:[2,5],yone:[2,5],jhin:[2,5],jinx:[2,5],lux:[4,10],yasuo:[4,10],kaisa:[1,2],jinhsi:[2,5],jinhsib:[4,10]};
const MILESTONES=[
  {id:'sale',t:'Ship your first figure',f:s=>s.sold>=1},
  {id:'kvk',t:'Register at the KvK',f:s=>s.biz.kvk},
  {id:'hire',t:'Hire your first employee',f:s=>s.staff.length>=1},
  {id:'contract',t:'Deliver a contract',f:s=>s.contractsDone>=1},
  {id:'s100',t:'Sell 100 figures',f:s=>s.sold>=100},
  {id:'studio',t:'Move out of the hok',f:s=>s.ws>=1},
  {id:'form',t:'Own a Formlabs printer',f:s=>s.printers.some(p=>PRINTERS[p.type].fam==='form')},
  {id:'rev25',t:'€25.000 total revenue',f:s=>s.revenue>=25000},
  {id:'star',t:'4.5★ with 100+ reviews',f:s=>s.rating>=4.5&&s.reviews>=100},
  {id:'store',t:'Open your first store',f:s=>Object.values(s.stores).some(x=>x.open)},
  {id:'merge',t:'Merge a store into Resinaprint',f:s=>Object.values(s.stores).some(x=>x.merged)},
  {id:'s1000',t:'Sell 1.000 figures',f:s=>s.sold>=1000},
  {id:'parcels',t:'Deliver 500 parcels',f:s=>s.dstat.del>=500},
  {id:'bv',t:'Turn Resinaprint into a BV',f:s=>s.biz.form==='bv'},
  {id:'group',t:'Resinaprint Group: merge all three stores',f:s=>Object.values(s.stores).filter(x=>x.merged).length>=3},
  {id:'pj',t:'Own a PolyJet printer',f:s=>s.printers.some(p=>PRINTERS[p.type].pj)},
  {id:'inj',t:'Own an injection moulding machine',f:s=>s.printers.some(p=>PRINTERS[p.type].inj)},
  {id:'campus',t:'Move into the production campus',f:s=>s.ws>=5},
  {id:'v250',t:'Company worth €250.000',f:s=>value(s)>=250000},
  {id:'lab',t:'Own a Laboratorium printer',f:s=>s.printers.some(p=>PRINTERS[p.type].lab)},
  {id:'v1m',t:'Company worth €1.000.000',f:s=>value(s)>=1000000}
];

