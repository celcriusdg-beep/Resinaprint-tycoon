/* Showroom (4.21): your own shop front, built tile by tile in an isometric room.
   Furniture brings people in (traffic), makes them buy (appeal) and puts your products on display (slots). Items share style tags,
   and three or more of a tag give a set bonus. Customers walk in, browse what is on display and pay at the till: real counter sales. */
const SR_T=56,SR_H=28,SR_WALL=118;
const SR_SIZES=[{w:6,d:5,n:'Corner shop'},{w:8,d:6,n:'High-street shop',cost:25000},{w:10,d:7,n:'Flagship store',cost:90000}];
const SR_OPEN=10,SR_CLOSE=19,SR_LEASE=10000,SR_RENT=40;
const SR_TAGS={cozy:{n:'Cozy',c:'#e8a86a'},japan:{n:'Japan',c:'#ff8fb1'},neon:{n:'Neon',c:'#c66bff'},geek:{n:'Geek',c:'#5bd6a6'},lux:{n:'Luxury',c:'#ffd36b'},urban:{n:'Urban',c:'#9fb4c8'}};
/* furniture: w,d footprint, h height, a = attract, p = appeal, s = display slots */
const SR_ITEMS={
  counter:{n:'Till counter',cat:'shop',w:2,d:1,h:30,cost:1500,a:0,p:4,s:0,tag:'cozy',till:1,d2:'Customers pay here. Each till serves 8 sales an hour.'},
  counter2:{n:'Glass counter',cat:'shop',w:2,d:1,h:32,cost:5200,a:1,p:7,s:2,tag:'lux',till:1,d2:'A till with a lit glass display in the front.'},
  shelf:{n:'Figure shelf',cat:'disp',w:1,d:1,h:74,cost:600,a:1,p:2,s:3,tag:'cozy',d2:'Three shelves of figures.'},
  table:{n:'Display table',cat:'disp',w:2,d:1,h:24,cost:900,a:1,p:2,s:4,tag:'cozy',d2:'Four figures on a low table.'},
  vitrine:{n:'Glass vitrine',cat:'disp',w:1,d:1,h:82,cost:2500,a:2,p:6,s:2,tag:'lux',d2:'Lit glass case. Shows your most expensive pieces.'},
  plinth:{n:'Turntable plinth',cat:'disp',w:1,d:1,h:30,cost:1800,a:3,p:3,s:1,tag:'lux',d2:'One hero piece, slowly turning.'},
  proprack:{n:'Prop wall',cat:'disp',w:2,d:1,h:84,cost:3500,a:4,p:3,s:3,tag:'geek',d2:'Swords, guns and masks on a pegboard.'},
  statue:{n:'Hero statue',cat:'disp',w:1,d:1,h:118,cost:9000,a:8,p:3,s:0,tag:'lux',d2:'A giant version of your priciest figure. People come in just to see it.'},
  gacha:{n:'Gacha machine',cat:'fun',w:1,d:1,h:58,cost:2200,a:4,p:1,s:0,tag:'japan',gacha:1,d2:'Visitors play for €3. About a third of them try.'},
  arcade:{n:'Arcade cabinet',cat:'fun',w:1,d:1,h:76,cost:3000,a:5,p:1,s:0,tag:'neon',d2:'Blinking, beeping, crowd-pulling.'},
  mannequin:{n:'Cosplay mannequin',cat:'fun',w:1,d:1,h:88,cost:2000,a:4,p:2,s:0,tag:'geek',d2:'A full costume on display.'},
  aquarium:{n:'Aquarium',cat:'fun',w:2,d:1,h:48,cost:4000,a:3,p:5,s:0,tag:'lux',d2:'Calm fish, longer visits.'},
  plant:{n:'Monstera',cat:'decor',w:1,d:1,h:52,cost:150,a:0,p:2,s:0,tag:'cozy',d2:'Green and friendly.'},
  sakura:{n:'Sakura tree',cat:'decor',w:1,d:1,h:96,cost:2600,a:3,p:3,s:0,tag:'japan',d2:'Falling petals all year.'},
  beanbag:{n:'Bean bags',cat:'decor',w:1,d:1,h:18,cost:250,a:0,p:2,s:0,tag:'cozy',d2:'A place to sit and stay longer.'},
  lamp:{n:'Floor lamp',cat:'decor',w:1,d:1,h:80,cost:400,a:1,p:1,s:0,tag:'urban',d2:'Warm light in the corner.'},
  rug:{n:'Round rug',cat:'decor',w:2,d:2,h:0,cost:300,a:0,p:2,s:0,tag:'cozy',rug:1,d2:'Lies under other furniture.'},
  poster:{n:'Figure poster',cat:'wall',wall:1,cost:120,a:1,p:1,s:0,tag:'geek',d2:'One of your products, framed.'},
  wallshelf:{n:'Wall shelf',cat:'wall',wall:1,cost:400,a:0,p:1,s:2,tag:'urban',d2:'Two figures on the wall.'},
  neon:{n:'Neon sign',cat:'wall',wall:1,cost:1600,a:4,p:1,s:0,tag:'neon',d2:'Buzzing pink letters.'},
  noren:{n:'Noren curtain',cat:'wall',wall:1,cost:350,a:1,p:2,s:0,tag:'japan',d2:'A split fabric banner.'},
  screen:{n:'Video wall',cat:'wall',wall:1,cost:3800,a:5,p:1,s:0,tag:'neon',d2:'Trailers and unboxings on loop.'},
  window:{n:'Shop window',cat:'wall',wall:1,cost:2500,a:6,p:0,s:0,tag:'urban',d2:'Passers-by look in, and some walk in.'}
};
const SR_STYLES={
  wood:{n:'Warm wood',cost:0,tag:'cozy',floor:'#a8744a',floor2:'#94653f',wall:'#e9dcc4',wall2:'#d9c8aa',trim:'#7a5232'},
  concrete:{n:'Concrete loft',cost:1500,tag:'urban',floor:'#8d9198',floor2:'#80848b',wall:'#b7bcc3',wall2:'#a5aab1',trim:'#5b6068'},
  tatami:{n:'Tatami',cost:2500,tag:'japan',floor:'#cfc583',floor2:'#bdb26f',wall:'#f2ebdb',wall2:'#e2d8c2',trim:'#5a3d2a'},
  neon:{n:'Neon grid',cost:4000,tag:'neon',floor:'#1d1733',floor2:'#251d40',wall:'#271d44',wall2:'#1f173a',trim:'#ff4fd8'},
  marble:{n:'Marble',cost:6000,tag:'lux',floor:'#e8e4ee',floor2:'#dcd7e4',wall:'#f4efe6',wall2:'#e7e0d2',trim:'#c9a24a'}
};
const SR_CATS=[['disp','Displays'],['shop','Tills'],['fun','Attractions'],['decor','Decor'],['wall','Wall'],['style','Style'],['room','Room']];
const showOf=()=>S.show||(S.show={own:0,size:0,style:'wood',items:[],today:{v:0,s:0,rev:0},hist:[],tot:{v:0,s:0,rev:0},nid:1});
const srOpen=()=>!!(S.show&&S.show.own);
const srCan=()=>S.ws>=1&&S.biz&&S.biz.kvk;
const srSize=()=>SR_SIZES[showOf().size];
const srDims=(it)=>{const I=SR_ITEMS[it.t];return it.rot?{w:I.d,d:I.w}:{w:I.w||1,d:I.d||1}};
/* ---------- stats ---------- */
function srStats(){
  const Sh=showOf(),tags={};let a=0,p=0,s=0,till=0,gacha=0;
  for(const it of Sh.items){const I=SR_ITEMS[it.t];if(!I)continue;a+=I.a;p+=I.p;s+=I.s;if(I.till)till++;if(I.gacha)gacha++;tags[I.tag]=(tags[I.tag]||0)+1}
  const st=SR_STYLES[Sh.style];tags[st.tag]=(tags[st.tag]||0)+2;
  let set=0;const sets=[];for(const t in tags){const c=tags[t],b=c>=9?.12:c>=6?.08:c>=3?.04:0;if(b){set+=b;sets.push([t,c,b])}}
  const traffic=(6+a*1.15)*(.55+S.rating/5)*(1+Math.min(2,S.hype/120))*(1+.15*Sh.size);
  const conv=clamp(.08+p*.0065+set,.05,.78);
  return{a,p,s,till,gacha,tags,sets,set,traffic,conv};
}
function srDisplay(){
  const st=srStats();if(!st.s)return[];
  return PKEYS.filter(k=>S.listed[k]&&freeStock(k)>0).sort((x,y)=>PRODUCTS[y].ref-PRODUCTS[x].ref).slice(0,st.s);
}
/* which product sits where: vitrines and plinths get the priciest pieces first */
function srAssign(){
  const Sh=showOf(),ks=srDisplay(),out={},order=Sh.items.filter(it=>SR_ITEMS[it.t].s).sort((x,y)=>SR_ITEMS[y.t].p-SR_ITEMS[x.t].p);let i=0;
  for(const it of order){out[it.id]=[];for(let j=0;j<SR_ITEMS[it.t].s&&i<ks.length;j++)out[it.id].push(ks[i++])}
  return out;
}
const srHero=()=>PKEYS.filter(k=>unlocked(k)).sort((a,b)=>PRODUCTS[b].ref-PRODUCTS[a].ref)[0];
/* ---------- simulation ---------- */
const SR_FX=[];
function srHour(){
  const Sh=showOf();if(!Sh.own)return;const h=S.hour;if(h<SR_OPEN||h>=SR_CLOSE)return;
  const st=srStats(),v=poisson(st.traffic/(SR_CLOSE-SR_OPEN));Sh.today.v+=v;Sh.tot.v+=v;Sh.lastV=v;
  if(st.gacha){const g=poisson(v*.33*Math.min(2,st.gacha));if(g){earn('Gacha machine',g*3);Sh.today.rev+=g*3;Sh.tot.rev+=g*3}}
  if(!st.till)return;
  const cap=st.till*8;let sold=0;
  for(let i=0;i<v&&sold<cap;i++){
    if(Math.random()>st.conv)continue;const ks=srDisplay();if(!ks.length)break;
    let tot=0;const w=ks.map(k=>{const x=Math.max(.05,demand(k));tot+=x;return x});let r0=Math.random()*tot,k=ks[0];for(let j=0;j<ks.length;j++){r0-=w[j];if(r0<=0){k=ks[j];break}}
    const pr=S.prices[k];ship({p:k,age:0,ch:'shop'},true);sold++;Sh.today.s++;Sh.tot.s++;Sh.today.rev+=pr;Sh.tot.rev+=pr;
    if(!awayMode&&!simulating&&SR_FX.length<12)SR_FX.push({k,pr});
  }
}
const _hsSR=hourStep;hourStep=function(){_hsSR();if(!S.over&&S.show&&S.show.own)srHour()};
const _eodSR=endOfDay;endOfDay=function(){_eodSR();const Sh=S.show;if(!Sh||!Sh.own)return;spend('Showroom rent',SR_RENT*(1+Sh.size));Sh.hist.unshift({d:S.day,...Sh.today});Sh.hist=Sh.hist.slice(0,14);Sh.today={v:0,s:0,rev:0}};
/* ---------- iso drawing ---------- */
function srIso(gx,gy,Wd){const D=Wd.d;return[(D*SR_T/2+12)+(gx-gy)*SR_T/2,SR_WALL+18+(gx+gy)*SR_H/2]}
const P2=p=>p[0].toFixed(1)+','+p[1].toFixed(1);
const up=(p,h)=>[p[0],p[1]-h];
const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16);let r0=n>>16,g=n>>8&255,b=n&255;const m=x=>Math.max(0,Math.min(255,Math.round(f>1?x+(255-x)*(f-1):x*f)));return '#'+((1<<24)+(m(r0)<<16)+(m(g)<<8)+m(b)).toString(16).slice(1)};
const fm=(a,b,len)=>`matrix(${((b[0]-a[0])/len).toFixed(4)},${((b[1]-a[1])/len).toFixed(4)},0,1,${a[0].toFixed(1)},${a[1].toFixed(1)})`;
function prism(Wd,x,y,w,d,h,col,o){
  o=o||{};const A0=srIso(x,y,Wd),B=srIso(x+w,y,Wd),C=srIso(x+w,y+d,Wd),D=srIso(x,y+d,Wd);
  const top=o.top||shade(col,1.12),lf=o.left||shade(col,.82),rf=o.right||shade(col,.66),op=o.op!=null?` fill-opacity="${o.op}"`:'';
  return `<polygon points="${P2(D)} ${P2(C)} ${P2(up(C,h))} ${P2(up(D,h))}" fill="${lf}"${op}/><polygon points="${P2(C)} ${P2(B)} ${P2(up(B,h))} ${P2(up(C,h))}" fill="${rf}"${op}/><polygon points="${P2(up(A0,h))} ${P2(up(B,h))} ${P2(up(C,h))} ${P2(up(D,h))}" fill="${top}"${op}/>`;
}
const thumb=k=>OFF.f[k]?OFF.f[k].replace('/products/','/thumbs/'):null;
function srProd(k,x,y,w,h,cls){
  if(!k)return '';const t=thumb(k);
  if(t)return `<image href="${t}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" class="${cls||''}"/>`;
  const sv=prodArt(k);if(sv.startsWith('<svg'))return sv.replace('<svg ',`<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" class="${cls||''}" `);
  return `<rect x="${x}" y="${y+h*.3}" width="${w}" height="${h*.7}" rx="3" fill="${PRODUCTS[k].col||'#c79bff'}"/>`;
}
/* the centre of an item's top, in screen space */
function srTopC(Wd,x,y,w,d,h){const a=srIso(x,y,Wd),c=srIso(x+w,y+d,Wd);return[(a[0]+c[0])/2,(a[1]+c[1])/2-h]}
function srItemSvg(it,Wd,disp,mini){
  const I=SR_ITEMS[it.t],{w,d}=srDims(it),x=it.x,y=it.y,h=I.h,st=SR_STYLES[showOf().style];let g='';
  const D=srIso(x,y+d,Wd),C=srIso(x+w,y+d,Wd),B=srIso(x+w,y,Wd),T=srTopC(Wd,x,y,w,d,h),ks=(disp&&disp[it.id])||[];
  const fl=(len)=>fm(D,C,len),fr=(len)=>fm(C,B,len);
  switch(it.t){
    case 'counter':case 'counter2':{
      const lux=it.t==='counter2';g+=prism(Wd,x,y,w,d,h,lux?'#e9e4f2':'#8a5a36',lux?{left:'#cfd8e6',op:.95}:{});
      if(lux){g+=`<g transform="${fl(w*56)}"><rect x="6" y="-27" width="${w*56-12}" height="17" fill="#bfe6ff" fill-opacity=".35" stroke="#fff" stroke-opacity=".6"/>${ks.map((k,i)=>srProd(k,10+i*30,-29,22,18)).join('')}<rect x="6" y="-10" width="${w*56-12}" height="2" fill="#c9a24a"/></g>`}
      else g+=`<g transform="${fl(w*56)}"><rect x="4" y="-24" width="${w*56-8}" height="3" fill="#6b4329"/><rect x="4" y="-14" width="${w*56-8}" height="2" fill="#6b4329"/></g>`;
      const R=srTopC(Wd,x+(it.rot?0:1),y+(it.rot?1:0),1,1,h);
      g+=`<g transform="translate(${R[0].toFixed(1)} ${R[1].toFixed(1)})"><rect x="-8" y="-12" width="16" height="10" rx="2" fill="#2b2f3a"/><rect x="-6" y="-11" width="12" height="6" rx="1" fill="#5bd6a6" class="sr-blink"/><rect x="-9" y="-3" width="18" height="4" rx="1.5" fill="#1d2028"/></g>`;
      break}
    case 'shelf':{
      g+=prism(Wd,x,y,w,d,h,'#7a5232');
      g+=`<g transform="${fl(56)}"><rect x="3" y="-${h-4}" width="50" height="${h-6}" fill="#3a2718"/>${[0,1,2].map(r=>`<rect x="3" y="${-(6+r*22)}" width="50" height="3" fill="#a77a4f"/>${ks[r]?srProd(ks[r],15,-(6+r*22)-19,22,19):''}`).join('')}</g>`;
      break}
    case 'table':{
      g+=prism(Wd,x,y,w,d,h,'#b08455');
      ks.forEach((k,i)=>{const o2=(i-(ks.length-1)/2)*15,dy=(it.rot?-1:1)*o2*.5;g+=srProd(k,T[0]+o2-10,T[1]+dy-21,20,21)});
      break}
    case 'vitrine':{
      g+=prism(Wd,x,y,w,d,16,'#2a2f3a');g+=prism(Wd,x,y,w,d,4,'#c9a24a');
      const Q=srTopC(Wd,x,y,w,d,16);ks.forEach((k,i)=>g+=srProd(k,Q[0]-15+i*10-(ks.length>1?5:0),Q[1]-48-i*4,26,44));
      g+=`<g class="sr-glass">${prism(Wd,x,y,w,d,h,'#bfe6ff',{op:.18,top:'#e9f6ff',left:'#bfe6ff',right:'#9fd0f0'})}</g>`;
      g+=`<polygon points="${P2(up(D,h))} ${P2(up(C,h))} ${P2(up(C,h-3))} ${P2(up(D,h-3))}" fill="#fff" fill-opacity=".5"/><ellipse cx="${T[0]}" cy="${T[1]+4}" rx="12" ry="5" fill="#fff6c8" fill-opacity=".55" class="sr-glow"/>`;
      break}
    case 'plinth':{
      g+=prism(Wd,x,y,w,d,h,'#2c2a36',{top:'#3a3746'});g+=`<ellipse cx="${T[0]}" cy="${T[1]}" rx="15" ry="7" fill="#c9a24a"/><ellipse cx="${T[0]}" cy="${T[1]-1}" rx="13" ry="5.5" fill="#e6c36a"/>`;
      if(ks[0])g+=`<g class="sr-spin" style="transform-origin:${T[0]}px ${T[1]}px">${srProd(ks[0],T[0]-17,T[1]-48,34,46)}</g>`;
      g+=`<path d="M${T[0]-4} ${T[1]-120}L${T[0]-18} ${T[1]}L${T[0]+18} ${T[1]}L${T[0]+4} ${T[1]-120}z" fill="#fff4c0" fill-opacity=".12" class="sr-glow"/>`;
      break}
    case 'proprack':{
      g+=prism(Wd,x,y,w,d,h,'#3b3f48');
      const props=PKEYS.filter(k=>PRODUCTS[k].prop&&unlocked(k)),pk=(ks.length?ks:props).slice(0,3);
      g+=`<g transform="${fl(w*56)}"><rect x="4" y="-${h-4}" width="${w*56-8}" height="${h-8}" fill="#262a31"/>${Array.from({length:Math.floor((w*56-12)/8)},(_,i)=>Array.from({length:9},(_,j)=>`<circle cx="${8+i*8}" cy="${-(10+j*8)}" r=".9" fill="#4a505b"/>`).join('')).join('')}${pk.map((k,i)=>srProd(k,8+i*((w*56-16)/Math.max(1,pk.length)),-h+10,(w*56-16)/Math.max(1,pk.length)-4,h-20)).join('')||'<path d="M20 -70l4 0 0 50 -4 0zM60 -72l3 0 0 54 -3 0z" fill="#c9ccd3"/>'}</g>`;
      break}
    case 'statue':{
      g+=prism(Wd,x,y,w,d,22,'#bdb6c8',{top:'#e3dcec'});const k=srHero();
      if(k)g+=srProd(k,T[0]-26,T[1]+22-118,52,100,'sr-statue');
      g+=`<path d="M${T[0]-6} ${T[1]-140}L${T[0]-30} ${T[1]+22}L${T[0]+30} ${T[1]+22}L${T[0]+6} ${T[1]-140}z" fill="#fff6c8" fill-opacity=".1" class="sr-glow"/>`;
      break}
    case 'gacha':{
      g+=prism(Wd,x,y,w,d,34,'#e2414f');const Q=srTopC(Wd,x,y,w,d,34);
      g+=`<g transform="${fl(56)}"><rect x="20" y="-24" width="16" height="10" rx="2" fill="#1b1d24"/><circle cx="28" cy="-9" r="3" fill="#ffd36b"/></g><circle cx="${Q[0]}" cy="${Q[1]-14}" r="17" fill="#cfefff" fill-opacity=".35" stroke="#fff" stroke-opacity=".7"/>`;
      ['#ff6d82','#ffd36b','#5bd6a6','#9fd3ff','#c79bff','#ff9fb8'].forEach((c,i)=>g+=`<circle cx="${Q[0]-9+(i%3)*9}" cy="${Q[1]-6-Math.floor(i/3)*9}" r="4.2" fill="${c}"/>`);
      g+=`<rect x="${Q[0]-10}" y="${Q[1]-33}" width="20" height="5" rx="2" fill="#e2414f"/>`;
      break}
    case 'arcade':{
      g+=prism(Wd,x,y,w,d,h,'#20232c');
      g+=`<g transform="${fl(56)}"><rect x="7" y="-66" width="42" height="12" rx="2" fill="#ff4fd8" class="sr-flick"/><text x="28" y="-57" text-anchor="middle" font-size="7" font-weight="900" fill="#fff">RESIN</text><rect x="8" y="-50" width="40" height="24" rx="3" class="sr-screen"/><rect x="6" y="-24" width="44" height="6" fill="#383c48"/><circle cx="18" cy="-21" r="2.2" fill="#ff6d82"/><circle cx="36" cy="-21" r="2" fill="#5bd6a6"/><circle cx="42" cy="-21" r="2" fill="#ffd36b"/></g>`;
      break}
    case 'mannequin':{
      const Q=srTopC(Wd,x,y,w,d,4);g+=prism(Wd,x,y,w,d,4,'#3b3f48');
      g+=`<g transform="translate(${Q[0].toFixed(1)} ${Q[1].toFixed(1)})"><rect x="-1.5" y="-30" width="3" height="30" fill="#777"/><path d="M-13 -66q13-8 26 0l-3 30h-20z" fill="#c13048"/><path d="M-15 -66q-6 18 -2 38l6-4z M15 -66q6 18 2 38l-6-4z" fill="#7a1b2d"/><path d="M-9 -36h18l3 10h-24z" fill="#2b2f3a"/><circle cy="-74" r="7" fill="#e9d2bd"/><path d="M-8 -77q8-12 16 0l-2 -5q-6-6-12 0z" fill="#f5f0ff"/><path d="M-6 -68l12 0" stroke="#c9a24a" stroke-width="2"/></g>`;
      break}
    case 'aquarium':{
      g+=prism(Wd,x,y,w,d,14,'#2b2f3a');const fl2=fl(w*56);
      g+=`<g class="sr-aq">${prism(Wd,x,y,w,d,h,'#3aa0d8',{op:.45,top:'#bfe6ff',left:'#3aa0d8',right:'#2a86bb'})}</g><g transform="${fl2}"><rect x="2" y="-${h-2}" width="${w*56-4}" height="${h-16}" fill="none"/><path d="M8 -16q6-12 2-22M20 -16q-4-10 0-18M${w*56-14} -16q5-14 0-24" stroke="#3fbf72" stroke-width="2.5" fill="none"/>
        <g class="sr-fish"><path d="M0 0q6-4 12 0q-6 4-12 0zM12 0l5-3v6z" fill="#ff9f43" transform="translate(14 -30)"/></g><g class="sr-fish f2"><path d="M0 0q5-3 10 0q-5 3-10 0zM10 0l4-2.5v5z" fill="#ffd36b" transform="translate(40 -24)"/></g><g class="sr-fish f3"><path d="M0 0q5-3 10 0q-5 3-10 0zM10 0l4-2.5v5z" fill="#ff6d82" transform="translate(60 -36)"/></g>
        <circle cx="30" cy="-20" r="1.5" fill="#fff9" class="sr-bub"/><circle cx="34" cy="-18" r="1" fill="#fff9" class="sr-bub b2"/></g>`;
      break}
    case 'plant':{
      g+=prism(Wd,x+.28,y+.28,.44,.44,14,'#c96b45');const Q=srTopC(Wd,x,y,w,d,14);
      g+=`<g transform="translate(${Q[0].toFixed(1)} ${Q[1].toFixed(1)})" class="sr-sway"><path d="M0 0q-18-14-14-34q10 6 14 34z" fill="#2f8f55"/><path d="M0 0q16-16 14-38q-12 10-14 38z" fill="#3fae68"/><path d="M0 0q-4-22 2-40q8 18-2 40z" fill="#4cc27a"/><path d="M-2 -18q-10-4-16-14" stroke="#1f6b3d" stroke-width="1" fill="none"/></g>`;
      break}
    case 'sakura':{
      const Q=srTopC(Wd,x,y,w,d,0);g+=prism(Wd,x+.3,y+.3,.4,.4,8,'#8b6b5a');
      g+=`<g transform="translate(${Q[0].toFixed(1)} ${Q[1].toFixed(1)})"><path d="M-2 -6q-2-30 2-52M0 -40q10-8 14-16M0 -30q-10-6-14-14" stroke="#5a3a2a" stroke-width="4" fill="none" stroke-linecap="round"/>${[[-14,-62,16],[8,-70,18],[18,-54,13],[-20,-46,12],[0,-84,15],[-6,-58,14]].map(([cx,cy,r0])=>`<circle cx="${cx}" cy="${cy}" r="${r0}" fill="#ffb3cb"/><circle cx="${cx-3}" cy="${cy-3}" r="${r0*.6}" fill="#ffd0df"/>`).join('')}${[0,1,2,3,4].map(i=>`<circle class="sr-petal p${i}" cx="${-20+i*10}" cy="-50" r="2" fill="#ffc2d6"/>`).join('')}</g>`;
      break}
    case 'beanbag':{
      const Q=srTopC(Wd,x,y,w,d,0);g+=`<g transform="translate(${Q[0].toFixed(1)} ${Q[1].toFixed(1)})"><ellipse cx="-7" cy="-6" rx="11" ry="8" fill="#e05a5a"/><ellipse cx="-7" cy="-9" rx="8" ry="5" fill="#f07a7a"/><ellipse cx="8" cy="-3" rx="10" ry="7" fill="#4f7ad8"/><ellipse cx="8" cy="-6" rx="7" ry="4.5" fill="#6f95ec"/></g>`;
      break}
    case 'lamp':{
      const Q=srTopC(Wd,x,y,w,d,0);g+=`<g transform="translate(${Q[0].toFixed(1)} ${Q[1].toFixed(1)})"><ellipse rx="8" ry="4" fill="#2b2f3a"/><rect x="-1.2" y="-70" width="2.4" height="70" fill="#3b3f48"/><path d="M-12 -66l5-14h14l5 14z" fill="#f2d49a"/><path d="M-12 -66L-30 4H30L12 -66z" fill="#ffe6a8" fill-opacity=".14" class="sr-glow"/></g>`;
      break}
    case 'rug':{
      const a=srIso(x,y,Wd),c=srIso(x+w,y+d,Wd),cx=(a[0]+c[0])/2,cy=(a[1]+c[1])/2;
      g+=`<ellipse cx="${cx}" cy="${cy}" rx="${w*24}" ry="${d*12}" fill="${st.trim}" fill-opacity=".85"/><ellipse cx="${cx}" cy="${cy}" rx="${w*19}" ry="${d*9.5}" fill="#c4553f"/><ellipse cx="${cx}" cy="${cy}" rx="${w*12}" ry="${d*6}" fill="#e8b26a"/><ellipse cx="${cx}" cy="${cy}" rx="${w*5}" ry="${d*2.5}" fill="#c4553f"/>`;
      break}
  }
  return g;
}
/* wall items are drawn in a flat 56 × 100 box that is sheared onto the wall */
function srWallSvg(it,Wd,disp){
  const ks=(disp&&disp[it.id])||[],side=it.side,i=it.i;
  const a=side==='R'?srIso(i,0,Wd):srIso(0,i+1,Wd),b=side==='R'?srIso(i+1,0,Wd):srIso(0,i,Wd);
  let g='';
  switch(it.t){
    case 'poster':{const k=ks[0]||srHero()||PKEYS[0];g=`<rect x="10" y="-92" width="36" height="48" fill="#1b1d24" stroke="#c9a24a" stroke-width="1.5"/><rect x="13" y="-89" width="30" height="42" fill="${PRODUCTS[k].col||'#5a4fa0'}" fill-opacity=".55"/>${srProd(k,13,-88,30,40)}`;break}
    case 'wallshelf':g=`<rect x="4" y="-46" width="48" height="4" fill="#7a5232"/><path d="M10 -42l4 6M46 -42l-4 6" stroke="#4a3220" stroke-width="2"/><rect x="4" y="-76" width="48" height="4" fill="#7a5232"/>${ks[0]?srProd(ks[0],16,-66,22,20):''}${ks[1]?srProd(ks[1],16,-96,22,20):''}`;break;
    case 'neon':g=`<rect x="4" y="-86" width="48" height="26" rx="4" fill="#120c1c" stroke="#3a2a52"/><text x="28" y="-68" text-anchor="middle" font-size="11" font-weight="900" fill="#ff4fd8" class="sr-neon">RESIN</text><path d="M10 -64h36" stroke="#4fd8ff" stroke-width="1.6" class="sr-neon n2"/>`;break;
    case 'noren':g=`<rect x="4" y="-96" width="48" height="3" fill="#5a3d2a"/>${[0,1,2].map(j=>`<rect x="${6+j*15.5}" y="-93" width="14" height="40" fill="#2e3f7a" class="sr-sway"/>`).join('')}<circle cx="28" cy="-78" r="8" fill="#f2ebdb"/><circle cx="28" cy="-78" r="4.5" fill="#d64545"/>`;break;
    case 'screen':g=`<rect x="3" y="-94" width="50" height="34" rx="2" fill="#0b0c10" stroke="#3b3f48" stroke-width="1.5"/><rect x="6" y="-91" width="44" height="28" class="sr-screen"/><path d="M24 -82l9 5-9 5z" fill="#fff" fill-opacity=".8"/>`;break;
    case 'window':g=`<rect x="4" y="-98" width="48" height="62" fill="#9fd3ff"/><rect x="4" y="-60" width="48" height="24" fill="#7a8796"/><g class="sr-walker"><circle cx="0" cy="-58" r="3" fill="#2b2f3a"/><rect x="-3" y="-55" width="6" height="12" rx="2" fill="#2b2f3a"/></g><g class="sr-walker w2"><circle cx="0" cy="-57" r="3" fill="#4a3a5a"/><rect x="-3" y="-54" width="6" height="11" rx="2" fill="#4a3a5a"/></g><rect x="4" y="-98" width="48" height="62" fill="none" stroke="#f4efe6" stroke-width="3"/><path d="M28 -98v62M4 -67h48" stroke="#f4efe6" stroke-width="2"/><rect x="4" y="-98" width="48" height="62" fill="url(#srShine)"/>`;break;
  }
  return `<g transform="${fm(a,b,56)}">${g}</g>`;
}
/* ---------- the room ---------- */
function srRoomSvg(o){
  o=o||{};const Sh=showOf(),Wd=srSize(),W=Wd.w,Dd=Wd.d,st=SR_STYLES[Sh.style],disp=srAssign();
  const vw=(W+Dd)*SR_T/2+24,vh=SR_WALL+18+(W+Dd)*SR_H/2+40;
  const O=srIso(0,0,Wd),R=srIso(W,0,Wd),Lf=srIso(0,Dd,Wd),F=srIso(W,Dd,Wd);
  const open=S.hour>=SR_OPEN&&S.hour<SR_CLOSE;
  let g=`<defs><linearGradient id="srShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="srLight" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#fff3d0" stop-opacity=".22"/><stop offset="1" stop-color="#fff3d0" stop-opacity="0"/></radialGradient></defs>`;
  /* walls */
  g+=`<polygon points="${P2(O)} ${P2(R)} ${P2(up(R,SR_WALL))} ${P2(up(O,SR_WALL))}" fill="${st.wall}"/><polygon points="${P2(O)} ${P2(Lf)} ${P2(up(Lf,SR_WALL))} ${P2(up(O,SR_WALL))}" fill="${st.wall2}"/>`;
  if(Sh.style==='concrete')for(let r0=1;r0<9;r0++){const y0=r0*13;g+=`<path d="M${P2(up(O,y0))}L${P2(up(R,y0))}M${P2(up(O,y0))}L${P2(up(Lf,y0))}" stroke="#00000014"/>`}
  if(Sh.style==='tatami')for(let i=1;i<W;i++){const p=srIso(i,0,Wd);g+=`<path d="M${P2(p)}L${P2(up(p,SR_WALL))}" stroke="${st.trim}" stroke-opacity=".5" stroke-width="2"/>`}
  if(Sh.style==='neon'){g+=`<path d="M${P2(up(O,SR_WALL-8))}L${P2(up(R,SR_WALL-8))}M${P2(up(O,SR_WALL-8))}L${P2(up(Lf,SR_WALL-8))}" stroke="#ff4fd8" stroke-width="2.5" class="sr-neon"/><path d="M${P2(up(O,10))}L${P2(up(R,10))}M${P2(up(O,10))}L${P2(up(Lf,10))}" stroke="#4fd8ff" stroke-width="2" class="sr-neon n2"/>`}
  g+=`<path d="M${P2(up(R,SR_WALL))}L${P2(up(O,SR_WALL))}L${P2(up(Lf,SR_WALL))}" stroke="${st.trim}" stroke-width="5" fill="none"/><path d="M${P2(R)}L${P2(O)}L${P2(Lf)}" stroke="${shade(st.trim,.8)}" stroke-width="4" fill="none"/>`;
  /* floor */
  let fl='';for(let x=0;x<W;x++)for(let y=0;y<Dd;y++){const a=srIso(x,y,Wd),b=srIso(x+1,y,Wd),c=srIso(x+1,y+1,Wd),d=srIso(x,y+1,Wd);fl+=`<polygon class="sr-tile" data-gx="${x}" data-gy="${y}" points="${P2(a)} ${P2(b)} ${P2(c)} ${P2(d)}" fill="${(x+y)%2?st.floor:st.floor2}"/>`}
  g+=`<g class="sr-floor">${fl}</g>`;
  if(Sh.style==='neon')g+=`<polygon points="${P2(O)} ${P2(R)} ${P2(F)} ${P2(Lf)}" fill="none" stroke="#ff4fd833" stroke-width="2"/>`;
  if(Sh.style==='marble')g+=`<path d="M${P2(srIso(1,0,Wd))}q30 30 10 60t40 40M${P2(srIso(W-1,1,Wd))}q-20 30 -50 40" stroke="#bdb6c8" stroke-opacity=".45" fill="none"/>`;
  /* entrance */
  const ex=srEntry(),E0=srIso(ex[0],ex[1],Wd),E1=srIso(ex[0]+1,ex[1]+1,Wd),E2=srIso(ex[0]+1,ex[1],Wd),E3=srIso(ex[0],ex[1]+1,Wd);
  g+=`<polygon points="${P2(E0)} ${P2(E2)} ${P2(E1)} ${P2(E3)}" fill="#3b2a20" fill-opacity=".55"/><text x="${(E0[0]+E1[0])/2}" y="${(E0[1]+E1[1])/2+3}" text-anchor="middle" font-size="7" font-weight="800" fill="#f2d49a" opacity=".85">WELCOME</text>`;
  /* rugs under everything */
  for(const it of Sh.items)if(SR_ITEMS[it.t].rug)g+=`<g class="sr-it${o.sel===it.id?' sel':''}" data-id="${it.id}">${srItemSvg(it,Wd,disp)}</g>`;
  /* wall items */
  for(const it of Sh.items)if(SR_ITEMS[it.t].wall)g+=`<g class="sr-it sr-w${o.sel===it.id?' sel':''}" data-id="${it.id}">${srWallSvg(it,Wd,disp)}</g>`;
  if(o.edit)g+=srWallSlots(Wd);
  /* floor items, back to front, sprites are slotted in between by depth */
  const fi=Sh.items.filter(it=>!SR_ITEMS[it.t].wall&&!SR_ITEMS[it.t].rug).map(it=>{const {w,d}=srDims(it);return{it,dep:it.x+w/2+it.y+d/2}}).sort((a,b)=>a.dep-b.dep);
  g+=`<g id="${o.id||'srObjs'}" class="sr-objs">${fi.map(({it,dep})=>`<g class="sr-it${o.sel===it.id?' sel':''}" data-id="${it.id}" data-dep="${dep.toFixed(2)}">${srItemSvg(it,Wd,disp)}</g>`).join('')}</g>`;
  g+=`<rect x="0" y="0" width="${vw}" height="${vh}" fill="url(#srLight)" pointer-events="none"/>`;
  if(!open)g+=`<rect x="0" y="0" width="${vw}" height="${vh}" fill="#0a0c1a" fill-opacity=".38" pointer-events="none"/><g transform="translate(${vw/2} ${SR_WALL*.42})"><rect x="-34" y="-12" width="68" height="22" rx="5" fill="#1b1d24" stroke="#ff6d82"/><text y="4" text-anchor="middle" font-size="11" font-weight="900" fill="#ff6d82">CLOSED</text></g>`;
  if(o.edit)g+=`<g id="srGhost" pointer-events="none"></g>`;
  return{svg:g,vw,vh};
}
const srEntry=()=>{const Wd=srSize();return[Math.floor(Wd.w/2),Wd.d-1]};
function srWallSlots(Wd){let g='<g class="sr-slots">';
  for(let i=0;i<Wd.w;i++){const a=srIso(i,0,Wd),b=srIso(i+1,0,Wd);g+=`<polygon class="sr-slot" data-side="R" data-i="${i}" points="${P2(up(a,24))} ${P2(up(b,24))} ${P2(up(b,104))} ${P2(up(a,104))}"/>`}
  for(let i=0;i<Wd.d;i++){const a=srIso(0,i+1,Wd),b=srIso(0,i,Wd);g+=`<polygon class="sr-slot" data-side="L" data-i="${i}" points="${P2(up(a,24))} ${P2(up(b,24))} ${P2(up(b,104))} ${P2(up(a,104))}"/>`}
  return g+'</g>'}
/* ---------- occupancy ---------- */
function srOcc(skip){const Sh=showOf(),m={};for(const it of Sh.items){if(it.id===skip)continue;const I=SR_ITEMS[it.t];if(I.wall){m['w'+it.side+it.i]=it.id;continue}const {w,d}=srDims(it);for(let x=it.x;x<it.x+w;x++)for(let y=it.y;y<it.y+d;y++)m[(I.rug?'r':'f')+x+','+y]=it.id}return m}
function srFits(t,x,y,rot,skip){
  const I=SR_ITEMS[t],Wd=srSize(),occ=srOcc(skip);if(I.wall)return false;
  const w=rot?I.d:I.w,d=rot?I.w:I.d,e=srEntry();
  for(let i=x;i<x+w;i++)for(let j=y;j<y+d;j++){if(i<0||j<0||i>=Wd.w||j>=Wd.d)return false;if(occ[(I.rug?'r':'f')+i+','+j])return false;if(!I.rug&&i===e[0]&&j===e[1])return false}
  return true;
}
const srWallFree=(side,i,skip)=>!srOcc(skip)['w'+side+i];
/* ---------- the builder (full screen, outside the normal render) ---------- */
const SRU={open:false,cat:'disp',sel:null,place:null,raf:0,sprites:[],last:0,spawnT:0};
function srBuild(){
  let el=document.getElementById('showroom');if(el)return el;
  el=document.createElement('div');el.id='showroom';el.className='showroom';document.body.appendChild(el);
  el.addEventListener('click',srClick);
  return el;
}
function srOpenUI(){if(!srOpen())return;SRU.open=true;const el=srBuild();el.classList.add('on');document.body.classList.add('skopen');SRU.sprites=[];srDraw();cancelAnimationFrame(SRU.raf);SRU.last=performance.now();SRU.raf=requestAnimationFrame(srLoop)}
function srCloseUI(){SRU.open=false;SRU.place=null;SRU.sel=null;const el=document.getElementById('showroom');if(el)el.classList.remove('on');document.body.classList.remove('skopen');cancelAnimationFrame(SRU.raf);if(typeof render==='function')render()}
function srDraw(){
  const el=srBuild(),Sh=showOf(),st=srStats(),R=srRoomSvg({edit:true,sel:SRU.sel}),Wd=srSize();
  const open=S.hour>=SR_OPEN&&S.hour<SR_CLOSE;
  el.innerHTML=`<div class="sr-top"><button class="btn sm" data-sr="close">✕ Close</button><div class="sr-ttl"><b>${Wd.n}</b><small>${open?`Open until ${SR_CLOSE}:00`:`Opens at ${SR_OPEN}:00`} · ${fmt(S.cash)}</small></div></div>
    <div class="sr-stats"><span title="Traffic">👣 <b>${Math.round(st.traffic)}</b>/day</span><span title="Appeal">✨ <b>${Math.round(st.conv*100)}%</b> buy</span><span title="Display slots">🗂 <b>${st.s}</b> slots</span><span title="Tills">🧾 <b>${st.till}</b> till${st.till===1?'':'s'}</span><span>📈 <b>${fmt(Sh.today.rev)}</b> today</span></div>
    ${st.sets.length?`<div class="sr-sets">${st.sets.map(([t,c,b])=>`<span style="--c:${SR_TAGS[t].c}">${SR_TAGS[t].n} ×${c} <b>+${Math.round(b*100)}%</b></span>`).join('')}</div>`:''}
    ${!st.till?'<div class="sr-warn">Place a till counter or nobody can pay.</div>':!st.s?'<div class="sr-warn">Add a shelf, table or vitrine to put products on display.</div>':''}
    <div class="sr-stage ${SRU.place?'placing':''}"><svg id="srSvg" viewBox="0 0 ${R.vw} ${R.vh}" preserveAspectRatio="xMidYMid meet">${R.svg}<g id="srFx"></g></svg>${SRU.place?`<div class="sr-hint">Tap a ${SR_ITEMS[SRU.place.t].wall?'wall spot':'floor tile'} to place ${SR_ITEMS[SRU.place.t].n.toLowerCase()}<button class="btn sm ghost" data-sr="cancel">Cancel</button></div>`:''}</div>
    <div class="sr-drawer">${SRU.sel&&!SRU.place?srSelPanel():srCatalog()}</div>`;
  srPaintSlots();SRU.sprites.forEach(sp=>sp.el=null);
}
function srPaintSlots(){
  const P=SRU.place;if(!P)return;const I=SR_ITEMS[P.t];
  document.querySelectorAll('#showroom .sr-tile').forEach(t=>{if(I.wall){t.classList.remove('ok','no');return}const ok=srFits(P.t,+t.dataset.gx,+t.dataset.gy,P.rot,P.move);t.classList.toggle('ok',ok);t.classList.toggle('no',!ok)});
  document.querySelectorAll('#showroom .sr-slot').forEach(s=>{const ok=I.wall&&srWallFree(s.dataset.side,+s.dataset.i,P.move);s.classList.toggle('ok',ok);s.classList.toggle('on',!!I.wall)});
}
function srMini(t){
  /* a one-item room for the catalogue card */
  const I=SR_ITEMS[t];
  if(I.wall){const Wd={w:1,d:1},it={id:'m',t,side:'R',i:0};const svgIn=srWallSvg(it,Wd,{m:PKEYS.filter(k=>unlocked(k)).slice(0,2)});const a=srIso(0,0,Wd),b=srIso(1,0,Wd);return `<svg viewBox="${a[0]-6} ${a[1]-110} 44 120"><polygon points="${P2(a)} ${P2(b)} ${P2(up(b,108))} ${P2(up(a,108))}" fill="#ffffff10"/>${svgIn}</svg>`}
  const w=I.w,d=I.d,Wd={w:w,d:d},it={id:'m',t,x:0,y:0},a=srIso(0,0,Wd),vw=(w+d)*SR_T/2,top=a[1]-Math.max(40,I.h+30);
  const ks=PKEYS.filter(k=>unlocked(k)).sort((x,y)=>PRODUCTS[y].ref-PRODUCTS[x].ref).slice(0,4);
  return `<svg viewBox="${a[0]-vw/2-4} ${top} ${vw+8} ${(w+d)*SR_H/2+(a[1]-top)+6}">${srItemSvg(it,Wd,{m:ks})}</svg>`;
}
function srCatalog(){
  const Sh=showOf();let body='';
  if(SRU.cat==='style')body=`<div class="sr-cards">${Object.entries(SR_STYLES).map(([id,X])=>`<button class="sr-card ${Sh.style===id?'on':''}" data-sr="style" data-k="${id}"><div class="sr-sw"><i style="background:${X.wall}"></i><i style="background:${X.floor}"></i><i style="background:${X.trim}"></i></div><b>${X.n}</b><small style="color:${SR_TAGS[X.tag].c}">${SR_TAGS[X.tag].n} +2</small><em>${Sh.style===id?'In use':Sh.styles&&Sh.styles[id]||!X.cost?'Owned':fmt(X.cost)}</em></button>`).join('')}</div>`;
  else if(SRU.cat==='room'){const nx=SR_SIZES[Sh.size+1],hs=Sh.hist.slice(0,7);
    body=`<div class="sr-room"><div class="t">${srSize().n} · ${srSize().w}×${srSize().d} tiles</div><div class="s">Rent ${fmt(SR_RENT*(1+Sh.size))} a day. Open ${SR_OPEN}:00 to ${SR_CLOSE}:00.</div>${nx?`<button class="btn sm primary" data-sr="grow" ${S.cash<nx.cost?'disabled':''}>Move to a ${nx.n.toLowerCase()} (${nx.w}×${nx.d}) · ${fmt(nx.cost)}</button>`:''}
      <div class="sr-week">${hs.length?hs.slice().reverse().map(x=>`<i style="height:${Math.max(4,Math.min(100,x.rev/Math.max(1,...hs.map(y=>y.rev))*100))}%" title="Day ${x.d}: ${fmt(x.rev)}"></i>`).join(''):'<span class="s">Sales per day show up here.</span>'}</div>
      <div class="s">All time: ${Sh.tot.v} visitors, ${Sh.tot.s} sales, ${fmt(Sh.tot.rev)}</div></div>`}
  else body=`<div class="sr-cards">${Object.entries(SR_ITEMS).filter(([,I])=>I.cat===SRU.cat).map(([id,I])=>`<button class="sr-card" data-sr="pick" data-k="${id}" ${S.cash<I.cost?'disabled':''}><div class="sr-mini">${srMini(id)}</div><b>${I.n}</b><small><span style="color:${SR_TAGS[I.tag].c}">${SR_TAGS[I.tag].n}</span>${I.a?` · 👣${I.a}`:''}${I.p?` · ✨${I.p}`:''}${I.s?` · 🗂${I.s}`:''}</small><em>${fmt(I.cost)}</em></button>`).join('')}</div>`;
  return `<div class="sr-tabs">${SR_CATS.map(([k,n])=>`<button class="${SRU.cat===k?'on':''}" data-sr="cat" data-k="${k}">${n}</button>`).join('')}</div>${body}`;
}
function srSelPanel(){
  const it=showOf().items.find(x=>x.id===SRU.sel);if(!it){SRU.sel=null;return srCatalog()}
  const I=SR_ITEMS[it.t],ks=srAssign()[it.id]||[];
  return `<div class="sr-sel"><div class="sr-mini big">${srMini(it.t)}</div><div class="grow"><div class="t">${I.n}</div><div class="s">${I.d2}</div><div class="s"><span style="color:${SR_TAGS[I.tag].c}">${SR_TAGS[I.tag].n}</span>${I.a?` · 👣 +${I.a} traffic`:''}${I.p?` · ✨ +${I.p} appeal`:''}${I.s?` · 🗂 ${I.s} slots`:''}</div>${ks.length?`<div class="s">On display: ${ks.map(k=>PRODUCTS[k].name.split(' (')[0]).join(', ')}</div>`:''}
    <div class="opts"><button class="btn sm" data-sr="move">Move</button>${!I.wall&&I.w!==I.d?'<button class="btn sm" data-sr="rot">Rotate</button>':''}<button class="btn sm ghost" data-sr="sell">Sell ${fmt(Math.round(I.cost*.6))}</button><button class="btn sm ghost" data-sr="desel">Done</button></div></div></div>`;
}
function srClick(e){
  const b=e.target.closest('[data-sr]'),Sh=showOf();
  if(b){const a=b.dataset.sr,k=b.dataset.k;if(b.disabled)return;
    if(a==='close')return srCloseUI();
    if(a==='cat'){SRU.cat=k;SRU.sel=null;return srDraw()}
    if(a==='pick'){SRU.place={t:k,rot:0};SRU.sel=null;if(typeof snd==='function')snd('select');return srDraw()}
    if(a==='cancel'){SRU.place=null;return srDraw()}
    if(a==='desel'){SRU.sel=null;return srDraw()}
    if(a==='style'){const X=SR_STYLES[k];Sh.styles=Sh.styles||{};if(!Sh.styles[k]&&X.cost){if(S.cash<X.cost)return toast('Not enough cash');spend('Showroom',X.cost);Sh.styles[k]=1}Sh.style=k;if(typeof snd==='function')snd('buy');save();return srDraw()}
    if(a==='grow'){const nx=SR_SIZES[Sh.size+1];if(!nx||S.cash<nx.cost)return;spend('Showroom',nx.cost);Sh.size++;
      toast(`Moved into a ${nx.n.toLowerCase()}`);if(typeof confetti==='function')confetti(60);if(typeof snd==='function')snd('level');save();return srDraw()}
    if(a==='move'){const it=Sh.items.find(x=>x.id===SRU.sel);if(!it)return;SRU.place={t:it.t,rot:it.rot||0,move:it.id};return srDraw()}
    if(a==='rot'){const it=Sh.items.find(x=>x.id===SRU.sel);if(!it)return;if(srFits(it.t,it.x,it.y,it.rot?0:1,it.id)){it.rot=it.rot?0:1;save();srDraw()}else toast('No room to turn it here');return}
    if(a==='sell'){const it=Sh.items.find(x=>x.id===SRU.sel);if(!it)return;const I=SR_ITEMS[it.t];if(I.till&&Sh.items.filter(x=>SR_ITEMS[x.t].till).length===1)toast('That was your only till: nobody can pay now');Sh.items=Sh.items.filter(x=>x!==it);earn('Showroom',Math.round(I.cost*.6));SRU.sel=null;save();return srDraw()}
    return;
  }
  const P=SRU.place;
  if(P){const I=SR_ITEMS[P.t];
    const t=e.target.closest(I.wall?'.sr-slot':'.sr-tile');if(!t)return;
    let x,y,side,i;if(I.wall){side=t.dataset.side;i=+t.dataset.i;if(!srWallFree(side,i,P.move))return toast('That spot is taken')}
    else{x=+t.dataset.gx;y=+t.dataset.gy;if(!srFits(P.t,x,y,P.rot,P.move))return toast('It does not fit there')}
    if(P.move){const it=Sh.items.find(q=>q.id===P.move);if(it){if(I.wall){it.side=side;it.i=i}else{it.x=x;it.y=y}}SRU.sel=P.move}
    else{if(S.cash<I.cost)return toast('Not enough cash');spend('Showroom',I.cost);const it={id:Sh.nid++,t:P.t};if(I.wall){it.side=side;it.i=i}else{it.x=x;it.y=y;if(P.rot)it.rot=1}Sh.items.push(it);srPuff(it)}
    SRU.place=null;if(typeof snd==='function')snd('buy');save();return srDraw();
  }
  const g=e.target.closest('.sr-it');if(g){SRU.sel=+g.dataset.id;if(typeof snd==='function')snd('tap');return srDraw()}
}
function srPuff(it){setTimeout(()=>{const g=document.querySelector(`#showroom .sr-it[data-id="${it.id}"]`);if(g)g.classList.add('pop')},0)}
/* ---------- customers ---------- */
const SR_SKIN=['#f1d2b6','#d9a77e','#a86e4b','#6e4630','#f5dcc8'],SR_SHIRT=['#ff6d82','#5bd6a6','#9fd3ff','#ffd36b','#c79bff','#ff9f43','#4f7ad8','#e8e4ee'],SR_HAIR=['#2b2018','#6b4a2b','#e8c25a','#c13048','#1d1d24','#f5f0ff','#7a5cff'];
function srGrid(){const Wd=srSize(),occ=srOcc();return(x,y)=>x>=0&&y>=0&&x<Wd.w&&y<Wd.d&&!occ['f'+x+','+y]}
function srPath(from,to){
  const free=srGrid(),key=(x,y)=>x+','+y,prev={},q=[from];prev[key(...from)]=null;
  while(q.length){const [x,y]=q.shift();if(x===to[0]&&y===to[1])break;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(k in prev||!free(nx,ny))continue;prev[k]=[x,y];q.push([nx,ny])}}
  if(!(key(...to) in prev))return null;const p=[];let c=to;while(c){p.unshift(c);c=prev[key(...c)]}return p;
}
function srSpotsNear(it){const {w,d}=srDims(it),free=srGrid(),out=[];
  for(let x=it.x-1;x<=it.x+w;x++)for(let y=it.y-1;y<=it.y+d;y++){const inside=x>=it.x&&x<it.x+w&&y>=it.y&&y<it.y+d,corner=(x<it.x||x>=it.x+w)&&(y<it.y||y>=it.y+d);if(!inside&&!corner&&free(x,y))out.push([x,y])}
  return out.sort((a,b)=>(b[0]+b[1])-(a[0]+a[1]))}
function srSpawn(job){
  const e=srEntry(),c=[pick(SR_SKIN),pick(SR_SHIRT),pick(SR_HAIR)];
  const sp={x:e[0]+.5,y:e[1]+1.6,path:[[e[0],e[1]]],wait:0,skin:c[0],shirt:c[1],hair:c[2],job:job||null,state:'in',life:0,id:Math.random()};
  SRU.sprites.push(sp);srRoute(sp);return sp;
}
function srRoute(sp){
  const Sh=showOf(),cur=[Math.floor(sp.x),Math.floor(sp.y)];
  let tgtItem=null;
  if(sp.job&&sp.state!=='leave'){const tills=Sh.items.filter(it=>SR_ITEMS[it.t].till);tgtItem=sp.state==='pay'?pick(tills):pick(Sh.items.filter(it=>SR_ITEMS[it.t].s&&(srAssign()[it.id]||[]).includes(sp.job.k)))||pick(Sh.items.filter(it=>SR_ITEMS[it.t].s));if(!tgtItem)tgtItem=pick(tills)}
  else if(sp.state!=='leave'){const pool=Sh.items.filter(it=>!SR_ITEMS[it.t].wall&&!SR_ITEMS[it.t].rug);tgtItem=pick(pool)}
  let to;
  if(sp.state==='leave'||!tgtItem){const e=srEntry();to=e;sp.state='leave'}
  else{const sps=srSpotsNear(tgtItem);to=sps.length?pick(sps.slice(0,4)):null;sp.look=tgtItem}
  const p=to&&srPath(cur[0]>=0&&cur[1]<srSize().d?cur:srEntry(),to);
  sp.path=p?p.slice(1):[];if(!p&&sp.state!=='leave'){sp.state='leave';const e=srEntry();sp.path=srPath(cur,e)||[]}
}
function srSpriteSvg(sp){return `<g class="sr-cust" data-dep="0"><ellipse cx="0" cy="0" rx="7" ry="3" fill="#000" fill-opacity=".22"/><g class="sr-body"><rect x="-4" y="-9" width="3" height="9" rx="1.2" fill="#2b2f3a" class="leg l1"/><rect x="1" y="-9" width="3" height="9" rx="1.2" fill="#2b2f3a" class="leg l2"/><rect x="-6" y="-21" width="12" height="13" rx="4" fill="${sp.shirt}"/><circle cy="-26" r="5.2" fill="${sp.skin}"/><path d="M-5.4 -27q5-8 10.8 0q-1-6-5.4-6t-5.4 6z" fill="${sp.hair}"/></g><g class="sr-bubble"></g></g>`}
function srFxPop(x,y,txt,k){const fx=document.getElementById('srFx');if(!fx)return;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','sr-pop');g.setAttribute('transform',`translate(${x.toFixed(1)} ${(y-34).toFixed(1)})`);
  g.innerHTML=`<g class="sr-popi"><rect x="-26" y="-14" width="52" height="18" rx="9" fill="#1b1d24" stroke="#ffd36b"/><circle cx="-16" cy="-5" r="5" fill="#ffd36b"/><text x="-16" y="-2.5" text-anchor="middle" font-size="7" font-weight="900" fill="#7a5a10">€</text><text x="5" y="-1" text-anchor="middle" font-size="9" font-weight="900" fill="#ffd36b">${txt}</text></g>`;fx.appendChild(g);setTimeout(()=>g.remove(),1500)}
function srLoop(now){
  if(!SRU.open)return;SRU.raf=requestAnimationFrame(srLoop);
  const dt=Math.min(.1,(now-SRU.last)/1000);SRU.last=now;
  const svg=document.getElementById('srSvg'),objs=document.getElementById('srObjs');if(!svg||!objs)return;
  const Wd=srSize(),open=S.hour>=SR_OPEN&&S.hour<SR_CLOSE,st=srStats();
  /* sales from the simulation become customers walking to the till */
  while(SR_FX.length){const f=SR_FX.shift();const idle=SRU.sprites.find(s=>!s.job&&s.state!=='leave');if(idle){idle.job=f;idle.state='browse';srRoute(idle)}else{const s=srSpawn(f);s.state='browse';srRoute(s)}}
  const want=open?Math.max(1,Math.min(9,Math.round(st.traffic/9*.8))):0;
  SRU.spawnT-=dt;if(open&&SRU.sprites.length<want&&SRU.spawnT<=0){srSpawn();SRU.spawnT=r(1.2,3)}
  for(const sp of [...SRU.sprites]){
    sp.life+=dt;
    if(sp.wait>0){sp.wait-=dt;if(sp.wait<=0)srArrive2(sp)}
    else if(sp.path.length){const [tx,ty]=sp.path[0],cx=tx+.5,cy=ty+.5,dx=cx-sp.x,dy=cy-sp.y,dd=Math.hypot(dx,dy),v=1.5*dt;
      if(dd<=v){sp.x=cx;sp.y=cy;sp.path.shift()}else{sp.x+=dx/dd*v;sp.y+=dy/dd*v}sp.walk=true;sp.fl=dx-dy<0}
    else srArrive(sp);
    if(sp.state==='gone'||sp.life>90){if(sp.el)sp.el.remove();SRU.sprites=SRU.sprites.filter(s=>s!==sp);continue}
    if(!sp.el){const tmp=document.createElementNS('http://www.w3.org/2000/svg','g');tmp.innerHTML=srSpriteSvg(sp);sp.el=tmp.firstChild}
    const p=srIso(sp.x,sp.y,Wd);sp.el.setAttribute('transform',`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);const bd=sp.el.querySelector('.sr-body');if(bd&&bd._fl!==!!sp.fl){bd._fl=!!sp.fl;bd.setAttribute('transform',sp.fl?'scale(-1 1)':'')}
    sp.el.classList.toggle('walk',!!(sp.walk&&sp.path.length&&!sp.wait));
    const dep=sp.x+sp.y;if(sp.dep==null||Math.abs(sp.dep-dep)>.05||!sp.el.parentNode){sp.dep=dep;const kids=objs.children;let before=null;for(const c of kids){if(c===sp.el)continue;const cd=+c.dataset.dep;if(c.classList.contains('sr-it')&&cd>dep){before=c;break}}if(sp.el.nextSibling!==before||!sp.el.parentNode)objs.insertBefore(sp.el,before)}
  }
}
function srArrive(sp){
  if(sp.state==='leave'||sp.state==='in'&&!sp.look){if(sp.state==='leave'){sp.y+=0;sp.state='gone'}else{sp.state='browse';srRoute(sp)}return}
  if(sp.state==='pay'){sp.wait=1.1;sp.paying=true;const p=srIso(sp.x,sp.y,srSize());srFxPop(p[0],p[1],fmt(sp.job.pr).replace('€','').trim(),sp.job.k);if(typeof snd==='function'&&!document.hidden)snd('coin');return}
  sp.wait=r(1.2,3);srBubble(sp,sp.job?'♥':pick(['…','?','♪','!']));
}
function srArrive2(sp){
  srBubble(sp,'');
  if(sp.paying){sp.paying=false;sp.job=null;sp.state='leave';srRoute(sp);return}
  if(sp.job){sp.state='pay';srRoute(sp);return}
  if(Math.random()<.45||sp.life>40){sp.state='leave'}else sp.state='browse';srRoute(sp);
}
function srBubble(sp,t){if(!sp.el)return;const b=sp.el.querySelector('.sr-bubble');if(!b)return;b.innerHTML=t?`<g transform="translate(0 -40)"><rect x="-8" y="-9" width="16" height="13" rx="6" fill="#fff"/><path d="M-2 4l2 4 2-4z" fill="#fff"/><text y="1" text-anchor="middle" font-size="9" font-weight="900" fill="${t==='♥'?'#ff6d82':'#2b2f3a'}">${t}</text></g>`:''}
/* ---------- studio card ---------- */
function showroomCard(){
  if(!srCan()&&!srOpen())return '';
  if(!srOpen())return `<div class="card sr-promo"><div class="sr-promo-art">${srPromoSvg()}</div><div class="t">Open a showroom</div><div class="s">Lease a shop front and build it tile by tile: shelves, vitrines, a gacha machine, neon, a sakura tree. Customers walk in and buy what is on display. Lease ${fmt(SR_LEASE)}, then ${fmt(SR_RENT)} a day.</div><div class="opts"><button class="btn sm primary" data-a="srLease" ${S.cash<SR_LEASE?'disabled':''}>Lease a shop front · ${fmt(SR_LEASE)}</button></div></div>`;
  const Sh=showOf(),st=srStats(),R=srRoomSvg({id:'srCardObjs'}),open=S.hour>=SR_OPEN&&S.hour<SR_CLOSE;
  return `<div class="card sr-cardx" data-a="srEnter" role="button"><div class="sr-cardh"><div class="grow"><div class="t">Showroom ${open?'<span class="chip good">Open</span>':'<span class="chip">Closed</span>'}</div><div class="s">${Sh.today.v} visitors · ${Sh.today.s} sales · ${fmt(Sh.today.rev)} today</div></div><span class="btn sm primary">Build</span></div>
    <svg class="sr-cardsvg" viewBox="0 0 ${R.vw} ${R.vh}" preserveAspectRatio="xMidYMid meet">${R.svg}</svg>
    <div class="sr-stats small"><span>👣 <b>${Math.round(st.traffic)}</b>/day</span><span>✨ <b>${Math.round(st.conv*100)}%</b></span><span>🗂 <b>${st.s}</b></span>${st.sets.map(([t,c,b])=>`<span style="color:${SR_TAGS[t].c}">${SR_TAGS[t].n} +${Math.round(b*100)}%</span>`).join('')}</div></div>`;
}
function srPromoSvg(){const keep=S.show;S.show={own:1,size:0,style:'wood',items:[{id:1,t:'counter',x:3,y:0},{id:2,t:'shelf',x:0,y:0},{id:3,t:'shelf',x:1,y:0},{id:4,t:'vitrine',x:0,y:2},{id:5,t:'plant',x:5,y:0},{id:6,t:'neon',side:'R',i:2},{id:7,t:'poster',side:'L',i:1},{id:8,t:'table',x:2,y:2},{id:9,t:'rug',x:2,y:2},{id:10,t:'gacha',x:5,y:3}],today:{v:0,s:0,rev:0},hist:[],tot:{v:0,s:0,rev:0},nid:11};
  const h0=S.hour;S.hour=12;const R=srRoomSvg({id:'srPromoObjs'});S.hour=h0;S.show=keep;return `<svg viewBox="0 0 ${R.vw} ${R.vh}">${R.svg}</svg>`}
Object.assign(A,{
  srLease(){if(srOpen())return;if(!srCan())return toast('Needs a small studio and a registered company');if(S.cash<SR_LEASE)return toast('Not enough cash');spend('Showroom',SR_LEASE);const Sh=showOf();Sh.own=1;
    Sh.items=[{id:Sh.nid++,t:'counter',x:3,y:0}];log('You leased a shop front. Build your showroom: put down displays so customers have something to buy.','good');if(typeof confetti==='function')confetti(80);if(typeof snd==='function')snd('level');setTimeout(srOpenUI,50)},
  srEnter(){srOpenUI()}
});
/* show it on the studio tab, right under the live floor */
const _vsSR=VIEWS.studio;VIEWS.studio=function(){const h=_vsSR.apply(this,arguments),c=showroomCard();if(!c)return h;const f=typeof workshopScene==='function'?workshopScene():'';const i=f?h.indexOf(f):-1;return i>=0?h.slice(0,i+f.length)+c+h.slice(i+f.length):c+h};
/* keep the builder's stats fresh while it is open */
setInterval(()=>{if(SRU.open&&!SRU.place&&!document.hidden){const st=document.querySelector('#showroom .sr-stats');if(st){const s2=srStats(),Sh=showOf();st.innerHTML=`<span>👣 <b>${Math.round(s2.traffic)}</b>/day</span><span>✨ <b>${Math.round(s2.conv*100)}%</b> buy</span><span>🗂 <b>${s2.s}</b> slots</span><span>🧾 <b>${s2.till}</b> till${s2.till===1?'':'s'}</span><span>📈 <b>${fmt(Sh.today.rev)}</b> today</span>`}const tt=document.querySelector('#showroom .sr-ttl small');if(tt){const open=S.hour>=SR_OPEN&&S.hour<SR_CLOSE;tt.textContent=`${open?`Open until ${SR_CLOSE}:00`:`Opens at ${SR_OPEN}:00`} · ${fmt(S.cash)}`}}},1000);
