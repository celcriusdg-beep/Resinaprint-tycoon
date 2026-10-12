/* SVG pictures of printers and figures. */
/* ---------- pictures ---------- */
const OR='#f29a3c',ORD='#d9801f';
/* per model look: k=drawing, b=body, h=hood, a=accent, w=width, t=hood height */
const PLOOK={
 mars:{k:'vat',b:'#444b55',h:OR,a:'#e8e8ea',w:34,t:24},
 mars5:{k:'vat',b:'#2f353d',h:OR,a:'#f2f2f4',w:34,t:25,s:1},
 photon:{k:'vat',b:'#23262c',h:'#f2b34a',a:'#6fd08a',w:34,t:24},
 m5s:{k:'vat',b:'#2b2f36',h:'#f2b34a',a:'#6fd08a',w:36,t:25},
 sonic8k:{k:'vat',b:'#2b2d31',h:OR,a:'#ff6a3d',w:30,t:22},
 mage:{k:'vat',b:'#e9ebee',h:'#f0a64a',a:'#2f6fd6',w:36,t:26,light:1},
 saturn:{k:'vat',b:'#444b55',h:OR,a:'#e8e8ea',w:42,t:32},
 saturn16:{k:'vat',b:'#2f353d',h:OR,a:'#f2f2f4',w:42,t:33,s:1},
 mighty:{k:'vat',b:'#24272b',h:OR,a:'#ff6a3d',w:44,t:33},
 m7max:{k:'vat',b:'#23262c',h:'#f2b34a',a:'#6fd08a',w:46,t:34},
 mega:{k:'vat',b:'#24272b',h:OR,a:'#ff6a3d',w:50,t:36},
 jupiter:{k:'vat',b:'#444b55',h:OR,a:'#e8e8ea',w:52,t:38},
 prusa:{k:'sl1',b:'#f08a24',h:'#1f2227',a:'#ffffff'},
 asiga:{k:'cab',b:'#3b4350',h:'#9ab8d6',a:'#4aa3ff',w:40,t:34},
 nexa:{k:'cab',b:'#2a2f37',h:'#7fd6b5',a:'#2fcf9a',w:42,t:40},
 form3:{k:'form',b:'#f3f4f7',h:'#59606b',a:'#7a5cd6',w:32,t:40},
 form4:{k:'form',b:'#f7f8fa',h:'#3b414b',a:'#7a5cd6',w:32,t:40,s:1},
 form4b:{k:'form',b:'#f7f8fa',h:'#3b414b',a:'#2f6fd6',w:32,t:40,s:1},
 form4l:{k:'form',b:'#f7f8fa',h:'#3b414b',a:'#7a5cd6',w:44,t:44,s:1},
 carbon:{k:'cab',b:'#25282e',h:'#6fd3ff',a:'#4aa3ff',w:42,t:42,glow:1},
 pj35:{k:'pj',b:'#e7eaee',h:'#9ab8d6',a:'#2f6fd6',w:48},
 mjp:{k:'pj',b:'#f2f3f5',h:'#8aa4bf',a:'#d23a3a',w:44},
 pj55:{k:'pj',b:'#e7eaee',h:'#9ab8d6',a:'#2f6fd6',w:52},
 pj850:{k:'pj',b:'#d5d9df',h:'#9ab8d6',a:'#2f6fd6',w:58,big:1},
 baby:{k:'inj',b:'#8fa3b8',h:'#e8742a',a:'#c9ced6',w:34,sm:1},
 arburg:{k:'inj',b:'#d8372f',h:'#2b2f38',a:'#c9ced6',w:54},
 engel:{k:'inj',b:'#2e9b5a',h:'#e9ecef',a:'#c9ced6',w:58},
 aurora:{k:'lab',b:'#1c1f33',h:'#7fd6ff',a:'#ffb347',w:46,v:0},
 helix:{k:'lab',b:'#171a2b',h:'#7fffd4',a:'#38e8a0',w:44,v:1},
 nebula:{k:'lab',b:'#1d1530',h:'#d46bff',a:'#ff6ad5',w:46,v:2},
 chronos:{k:'lab',b:'#221d14',h:'#ffd45e',a:'#fff3b0',w:46,v:3},
 valkyrie:{k:'lab',b:'#171d33',h:'#9db7ff',a:'#e8f0ff',w:48,v:4},
 leviathan:{k:'lab',b:'#2a1712',h:'#ff6a3d',a:'#ffb347',w:56,v:5},
 singularity:{k:'lab',b:'#120f22',h:'#b58cff',a:'#ffffff',w:48,v:6},
 omega:{k:'lab',b:'#1a1022',h:'#ff9ae8',a:'#ffffff',w:54,v:7}
};
function printerArt(k){
  const L=PLOOK[k]||PLOOK.mars;let g='';const x0=(64-(L.w||40))/2,w=L.w||40;
  if(L.k==='vat'){
    const bh=14,by=56-bh,hy=by-L.t;
    g=`<rect x="${x0}" y="${by}" width="${w}" height="${bh}" rx="3" fill="${L.b}"/>`+
      `<path d="M${x0+2} ${by}V${hy+6}q0-6 6-6h${w-16}q6 0 6 6V${by}z" fill="${L.h}" fill-opacity=".62" stroke="${ORD}" stroke-width="1.4"/>`+
      `<rect x="${x0+7}" y="${hy+9}" width="${w-14}" height="${L.t-13}" rx="2" fill="#f7dca2" fill-opacity=".55"/>`+
      `<rect x="${64/2-6}" y="${hy+9}" width="12" height="5" fill="#cfd3d8"/>`+
      `<rect x="${x0+5}" y="${by+3}" width="${Math.min(18,w*.45)}" height="8" rx="2" fill="${L.light?'#222':'#0f1114'}"/><rect x="${x0+7}" y="${by+5}" width="${Math.min(14,w*.35)}" height="4" rx="1" fill="#6aa7ff"/>`+
      `<rect x="${x0}" y="${by+bh-3}" width="${w}" height="2" fill="${L.a}" fill-opacity=".9"/>`+
      (L.s?`<rect x="${x0+w-9}" y="${by+4}" width="5" height="5" rx="1" fill="${L.a}"/>`:`<circle cx="${x0+w-7}" cy="${by+7}" r="2" fill="#7bd88f"/>`);
  }else if(L.k==='sl1'){
    g=`<rect x="12" y="44" width="40" height="12" rx="3" fill="${L.b}"/><rect x="14" y="14" width="36" height="31" rx="3" fill="${L.h}"/><rect x="17" y="17" width="30" height="25" rx="2" fill="${L.b}" fill-opacity=".55" stroke="${L.b}"/><rect x="22" y="22" width="20" height="14" rx="1.5" fill="#ffd9a8" fill-opacity=".6"/><rect x="18" y="47" width="14" height="5" rx="1.5" fill="#101215"/><rect x="18" y="14" width="28" height="3" fill="${L.b}"/>`;
  }else if(L.k==='cab'){
    const t=L.t,y0=58-t-12;
    g=`<rect x="${x0}" y="${y0}" width="${w}" height="${t+12}" rx="4" fill="${L.b}"/><rect x="${x0+4}" y="${y0+4}" width="${w-8}" height="${t-6}" rx="2.5" fill="${L.h}" fill-opacity="${L.glow?.8:.55}"/>`+
      (L.glow?`<rect x="${x0+9}" y="${y0+12}" width="${w-18}" height="9" rx="1.5" fill="#fff" fill-opacity=".75"/>`:`<rect x="${x0+9}" y="${y0+9}" width="${w-18}" height="${t-18}" rx="1.5" fill="#fff" fill-opacity=".25"/>`)+
      `<rect x="${x0+4}" y="${y0+t+1}" width="${w*.4}" height="7" rx="1.5" fill="#0f1114"/><circle cx="${x0+w-8}" cy="${y0+t+4.5}" r="2" fill="${L.a}"/>`;
  }else if(L.k==='form'){
    const t=L.t,y0=58-t-6;
    g=`<rect x="${x0}" y="${y0}" width="${w}" height="${t+6}" rx="6" fill="${L.b}" stroke="#c4c6d0" stroke-width="1.4"/><rect x="${x0+2}" y="${y0+2}" width="${w-4}" height="${t*.42}" rx="5" fill="${L.h}"/><rect x="${x0+6}" y="${y0+t*.42+8}" width="${w-12}" height="${t*.3}" rx="2.5" fill="#1d2027"/><rect x="${x0+8}" y="${y0+t*.42+10}" width="${w-16}" height="${t*.3-4}" rx="1.5" fill="${L.a}" fill-opacity=".85"/><rect x="${64/2-6}" y="${y0+t+1}" width="12" height="2.2" rx="1" fill="#c4c6d0"/>`;
  }else if(L.k==='lab'){
    const id='l'+(_g++),v=L.v||0,ch=40+Math.min(8,v)*1.5,y0=58-ch,cw=w*.46,cx=32;
    g=`<defs><linearGradient id="c${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${L.h}"/><stop offset="1" stop-color="${L.a}"/></linearGradient><radialGradient id="r${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${L.h}" stop-opacity=".7"/><stop offset="1" stop-color="${L.h}" stop-opacity="0"/></radialGradient></defs>`+
      `<circle cx="32" cy="${y0+ch*.45}" r="${w*.62}" fill="url(#r${id})"/>`+
      `<rect x="${x0}" y="${y0+ch-10}" width="${w}" height="10" rx="3" fill="${L.b}" stroke="${L.h}" stroke-opacity=".6" stroke-width="1"/>`+
      `<rect x="${x0+3}" y="${y0}" width="4.5" height="${ch-9}" rx="2" fill="${L.b}"/><rect x="${x0+w-7.5}" y="${y0}" width="4.5" height="${ch-9}" rx="2" fill="${L.b}"/>`+
      `<rect x="${cx-cw/2}" y="${y0+3}" width="${cw}" height="${ch-13}" rx="${cw/2}" fill="url(#c${id})"/>`+
      [0,1,2].slice(0,2+v%2).map(n=>`<ellipse cx="${cx}" cy="${y0+9+n*(ch-24)/2}" rx="${w*.38}" ry="3.2" fill="none" stroke="${L.a}" stroke-width="1.5" opacity=".9"/>`).join('')+
      (v>=5?`<circle cx="${x0+2}" cy="${y0+8}" r="2.4" fill="${L.a}"/><circle cx="${x0+w-2}" cy="${y0+16}" r="2.4" fill="${L.a}"/>`:'')+
      `<circle cx="${cx}" cy="${y0+2}" r="${v>=6?4:2.6}" fill="${L.a}"/><rect x="${x0+6}" y="${y0+ch-7}" width="${w*.3}" height="3" rx="1.5" fill="${L.h}"/>`;
  }else if(L.k==='pj'){
    const hh=L.big?46:40,y0=58-hh;
    g=`<rect x="${x0}" y="${y0}" width="${w}" height="${hh}" rx="3" fill="${L.b}" stroke="#aab1bb" stroke-width="1.4"/><rect x="${x0+4}" y="${y0+5}" width="${(w-12)/2}" height="${hh-17}" rx="2" fill="${L.h}" fill-opacity=".7"/><rect x="${x0+8+(w-12)/2}" y="${y0+5}" width="${(w-12)/2}" height="${hh-17}" rx="2" fill="${L.h}" fill-opacity=".7"/><rect x="${x0+4}" y="${y0+hh-9}" width="${w*.28}" height="5" rx="1.2" fill="#2b2f38"/><rect x="${x0+w-14}" y="${y0+hh-9}" width="10" height="5" rx="1.2" fill="${L.a}"/><rect x="${x0+w*.4}" y="${y0-4}" width="${w*.2}" height="4" rx="1" fill="#2b2f38"/>`;
  }else{ /* injection */
    const w2=w,x1=(64-w2)/2,sm=L.sm;
    g=`<rect x="${x1}" y="${sm?38:40}" width="${w2}" height="${sm?10:12}" rx="2" fill="${L.b}"/><rect x="${x1+2}" y="${sm?31:30}" width="${w2*.36}" height="${sm?9:11}" rx="2" fill="${L.h}"/><path d="M${x1+w2*.09} ${sm?31:30}l${w2*.07} -9h${w2*.1}l${w2*.07} 9z" fill="${L.a}"/><rect x="${x1+w2*.4}" y="${sm?35:35}" width="${w2*.28}" height="5" rx="2" fill="#6b7686"/><rect x="${x1+w2*.68}" y="${sm?29:27}" width="${w2*.26}" height="${sm?13:15}" rx="2" fill="${L.a}" stroke="#7d8794" stroke-width="1.2"/><rect x="${x1-2}" y="${sm?48:52}" width="${w2+4}" height="${sm?5:5}" rx="2" fill="#2b2f38"/><rect x="${x1+4}" y="${sm?41:43}" width="9" height="5" rx="1" fill="#0f1114"/>`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${g}</svg>`;
}
let _g=0;
const INK='#2a2b33';
/* hair: colour, tip: hair tip colour, st: long|twin|pony|bob, eye, out/out2: robe colours, acc: trim, tree: leaf colour, wp: sword|staff|none, ears, grey */
const FLOOK={
 chibi:{hair:'#8a5a3c',tip:'#b8845a',st:'bob',eye:'#3d7be0',out:'#f26d8d',acc:'#fff'},
 bust:{hair:'#2f3350',tip:'#5a6094',st:'long',eye:'#c04a6a',out:'#e9edf5',out2:'#8fa6d8',acc:'#d8b86a'},
 desk:{hair:'#5a3d2e',tip:'#8a5f45',st:'long',eye:'#4a8f5a',out:'#f3f4f8',out2:'#2a3a78',acc:'#d8b86a',tree:'#f4a6c0',pose:'stand'},
 kit:{hair:'#c4c9d1',tip:'#e4e7ec',st:'pony',eye:'#aab1bb',out:'#d0d4da',out2:'#b4b9c1',acc:'#e1e4e8',grey:1,tree:'#cfd3d9'},
 premium:{hair:'#d9739f',tip:'#f7c4da',st:'long',eye:'#8a4ae0',out:'#b83e68',out2:'#f6e6d0',acc:'#e9c46a',tree:'#f4a6c0',wp:'staff'},
 fullcolor:{hair:'#2fb8ac',tip:'#a8f0e6',st:'twin',eye:'#f06aa8',out:'#6a4cc8',out2:'#4fb6f2',acc:'#f2c94c',tree:'#ff9ec7'},
 licensed:{hair:'#d8b25a',tip:'#f6e2a4',st:'twin',eye:'#3d9be0',out:'#fbfbfd',out2:'#e8742a',acc:'#e8742a',tree:'#ff8a4a'},
 deckbox:{hair:'#c4304f',tip:'#f06a86',st:'long',eye:'#f2c94c',out:'#6d5acf',out2:'#2a2150',acc:'#fff'},
 ahri:{hair:'#eee6f0',tip:'#ffffff',st:'long',eye:'#e0a02a',out:'#e86a9c',out2:'#f6e8ef',acc:'#f2d27a',tree:'#ff9ec7'},
 akali:{hair:'#262a33',tip:'#4a5260',st:'pony',eye:'#d23a5a',out:'#238a56',out2:'#1a1d24',acc:'#5fd38d',wp:'sword'},
 yone:{hair:'#dfeef2',tip:'#ffffff',st:'bob',eye:'#2fb0c8',out:'#2f5f9c',out2:'#e8f2f6',acc:'#52c7d8',wp:'sword'},
 jhin:{hair:'#f0f0f0',tip:'#ffffff',st:'bob',eye:'#e0b24a',out:'#8a5e18',out2:'#2a1f3a',acc:'#e0b24a',wp:'staff'},
 jinx:{hair:'#3a8ef0',tip:'#8ac4ff',st:'twin',eye:'#d23a5a',out:'#2b2f38',out2:'#f06aa8',acc:'#f06aa8'},
 lux:{hair:'#f0dc7a',tip:'#fff4b8',st:'pony',eye:'#6aa7ff',out:'#f4f5fa',out2:'#5a7fd0',acc:'#f2e394'},
 yasuo:{hair:'#262a33',tip:'#4a5260',st:'pony',eye:'#6a8fb8',out:'#8aa6c8',out2:'#e9eef5',acc:'#d8e3ee'},
 jinhsi:{hair:'#f1ede2',tip:'#ffffff',st:'long',eye:'#e8c872',out:'#e6dfc8',out2:'#2f3a52',acc:'#e8c872',wp:'staff',tree:'#e8c872'},
 jinhsib:{hair:'#f1ede2',tip:'#ffffff',st:'long',eye:'#e8c872',out:'#e6dfc8',out2:'#2f3a52',acc:'#e8c872'},
 kaisa:{hair:'#a070e0',tip:'#d8b8ff',st:'long',eye:'#e04ad0',out:'#5a36b0',out2:'#d8b8ff',acc:'#e4d0ff',wp:'sword'},
 statue:{hair:'#a9a396',tip:'#c8c3b8',st:'long',eye:'#8d96a3',out:'#b0aa9e',out2:'#8e887c',acc:'#c8c3b8',wp:'sword',grey:1,tree:'#b8b2a6'}
};
const _lite=(c,a)=>c; 
function eHead(cx,cy,o,sc){
  sc=sc||1;const id='s'+(_g++);
  const skin=o.grey?['#eceef1','#cdd1d7']:['#fbe6d6','#efc7ab'];
  const hr=o.hair,tp=o.tip||o.hair;
  const gh=`<linearGradient id="h${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hr}"/><stop offset="1" stop-color="${tp}"/></linearGradient><linearGradient id="k${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${skin[0]}"/><stop offset="1" stop-color="${skin[1]}"/></linearGradient>`;
  let back='';
  const P=(d,f)=>`<path d="${d}" fill="${f}"/>`;
  if(o.st==='long')back=P(`M${cx-5} ${cy-2}C${cx-11} ${cy+3} ${cx-10} ${cy+15} ${cx-15} ${cy+26}C${cx-8} ${cy+21} ${cx-5} ${cy+17} ${cx-3.5} ${cy+9}L${cx} ${cy+3}Z`,`url(#h${id})`)+P(`M${cx+5} ${cy-2}C${cx+9} ${cy+5} ${cx+8} ${cy+14} ${cx+11} ${cy+23}C${cx+5} ${cy+19} ${cx+3} ${cy+13} ${cx+3.5} ${cy+7}Z`,`url(#h${id})`);
  else if(o.st==='twin')back=P(`M${cx-4.8} ${cy-2}C${cx-12} ${cy+2} ${cx-11} ${cy+16} ${cx-17} ${cy+25}C${cx-9} ${cy+22} ${cx-6} ${cy+12} ${cx-3.5} ${cy+6}Z`,`url(#h${id})`)+P(`M${cx+4.8} ${cy-2}C${cx+12} ${cy+2} ${cx+11} ${cy+16} ${cx+17} ${cy+25}C${cx+9} ${cy+22} ${cx+6} ${cy+12} ${cx+3.5} ${cy+6}Z`,`url(#h${id})`);
  else if(o.st==='pony')back=P(`M${cx+3} ${cy-5}C${cx+13} ${cy-6} ${cx+17} ${cy+6} ${cx+13} ${cy+20}C${cx+10} ${cy+11} ${cx+7} ${cy+3} ${cx+3} ${cy}Z`,`url(#h${id})`)+`<circle cx="${cx+4}" cy="${cy-4}" r="1.3" fill="${o.acc}"/>`;
  else back=P(`M${cx-5.3} ${cy-2}C${cx-6} ${cy+6} ${cx-5} ${cy+8} ${cx-4} ${cy+9}L${cx+4} ${cy+9}C${cx+5} ${cy+8} ${cx+6} ${cy+6} ${cx+5.3} ${cy-2}Z`,`url(#h${id})`);
  const face=`<path d="M${cx-4.2} ${cy-.5}C${cx-4.2} ${cy+3} ${cx-2.2} ${cy+5.2} ${cx} ${cy+5.8}C${cx+2.2} ${cy+5.2} ${cx+4.2} ${cy+3} ${cx+4.2} ${cy-.5}C${cx+4.2} ${cy-4.6} ${cx-4.2} ${cy-4.6} ${cx-4.2} ${cy-.5}Z" fill="url(#k${id})"/>`;
  const bangs=`<path d="M${cx-5.2} ${cy+1}C${cx-6} ${cy-7} ${cx+6} ${cy-7} ${cx+5.2} ${cy+1}C${cx+4.6} ${cy-2} ${cx+3.4} ${cy-2.4} ${cx+2.2} ${cy-3.2}C${cx+1.6} ${cy-1.6} ${cx+.4} ${cy-2.2} ${cx-.4} ${cy-3.4}C${cx-1.2} ${cy-1.8} ${cx-2.6} ${cy-2} ${cx-3.2} ${cy-2.6}C${cx-3.8} ${cy-1} ${cx-4.6} ${cy-.4} ${cx-5.2} ${cy+1}Z" fill="${hr}"/><path d="M${cx-5} ${cy}C${cx-5.4} ${cy+4} ${cx-4.8} ${cy+7} ${cx-4.2} ${cy+9}M${cx+5} ${cy}C${cx+5.4} ${cy+4} ${cx+4.8} ${cy+7} ${cx+4.2} ${cy+9}" stroke="${hr}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M${cx-3} ${cy-5}Q${cx} ${cy-6.6} ${cx+3} ${cy-5}" stroke="#fff" stroke-opacity=".45" stroke-width=".7" fill="none"/>`;
  const eye=sx=>`<path d="M${cx+sx-1.15} ${cy+.7}q1.15-1.35 2.3 0q-1.15 1.2-2.3 0z" fill="${o.eye}"/><path d="M${cx+sx-1.35} ${cy+.55}q1.35-1.4 2.7 0" stroke="${INK}" stroke-width=".5" fill="none" stroke-linecap="round"/><circle cx="${cx+sx+.2}" cy="${cy+.4}" r=".28" fill="#fff"/>`;
  const rest=eye(-2)+eye(2)+`<path d="M${cx-.7} ${cy+3.7}q.7.5 1.4 0" stroke="#c45a58" stroke-width=".7" fill="none" stroke-linecap="round"/><ellipse cx="${cx-3}" cy="${cy+2.4}" rx=".9" ry=".5" fill="#f08a8a" fill-opacity=".45"/><ellipse cx="${cx+3}" cy="${cy+2.4}" rx=".9" ry=".5" fill="#f08a8a" fill-opacity=".45"/>`;
  const orn=`<circle cx="${cx-4.4}" cy="${cy-3.2}" r=".9" fill="${o.acc}"/><circle cx="${cx+4.4}" cy="${cy-3.2}" r=".9" fill="${o.acc}"/>`;
  return {defs:gh,back,front:`<rect x="${cx-1.1}" y="${cy+4.6}" width="2.2" height="3.4" fill="${skin[1]}"/>`+face+bangs+rest+orn};
}
function eFig(o,withBase){
  const id='f'+(_g++),H=eHead(30,14,o);
  const out=o.out,out2=o.out2||o.out,acc=o.acc;
  const skin=o.grey?'#dfe2e6':'#f7dcc8';
  let g=`<defs>${H.defs}<linearGradient id="r${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${out}"/><stop offset="1" stop-color="${out2}"/></linearGradient><linearGradient id="p${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a404c"/><stop offset="1" stop-color="#14161b"/></linearGradient></defs>`;
  /* plinth + rock */
  g+=`<rect x="8" y="55.5" width="48" height="5" rx="1" fill="url(#p${id})"/><rect x="8" y="55.5" width="48" height="1" fill="#fff" fill-opacity=".25"/>`;
  g+=`<path d="M13 56C15 49 21 46 25 47C31 43 40 44 44 48C48 50 51 53 52 56Z" fill="${o.grey?'#a9aeb6':'#6b7280'}"/><path d="M20 56C22 51 28 49 33 51C38 49 44 51 47 56Z" fill="${o.grey?'#c3c7cd':'#8a92a0'}"/>`;
  /* tree */
  if(o.tree){const tc=o.tree;g+=`<path d="M46 50C44 42 47 32 43 24C41 20 42 17 45 15" stroke="${o.grey?'#9a9ea6':'#5a3a2e'}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`+[[44,13,8,3],[52,21,7,2.6],[41,26,7,2.4],[51,32,6,2.2]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y+1}" rx="${rx}" ry="${ry}" fill="#000" fill-opacity=".18"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${tc}"/><ellipse cx="${x-1}" cy="${y-1}" rx="${rx*.6}" ry="${ry*.5}" fill="#fff" fill-opacity=".22"/>`).join('')}
  /* back hair */
  g+=H.back;
  /* weapon behind */
  if(o.wp==='sword')g+=`<path d="M43 54L38 14l1.6-.4 6.2 40z" fill="#e4eaf2" stroke="#8d96a3" stroke-width=".6"/><rect x="41" y="50" width="7" height="1.8" rx=".9" fill="${acc}"/>`;
  if(o.wp==='staff')g+=`<rect x="44.6" y="12" width="1.2" height="42" rx=".6" fill="#8d6a3c"/><path d="M45.2 7l3 3-3 3-3-3z" fill="${acc}" stroke="#fff" stroke-width=".5"/>`;
  /* flowing skirt */
  g+=`<path d="M25.5 33C22 42 17 48 11 53C20 54 28 53.5 33 53.5C40 53.5 46 54 51 52C45 47 40 41 35 33Z" fill="url(#r${id})"/><path d="M28 34C27 42 26 48 24 53.5C28 54 34 54 37 53.5C35 47 33 40 32 34Z" fill="${out2}" fill-opacity=".9"/><path d="M11 53C20 54 28 53.5 33 53.5C40 53.5 46 54 51 52" stroke="${acc}" stroke-width="1" fill="none"/>`;
  /* sleeves + arms */
  g+=`<path d="M25.6 22.5C20 25 18.5 32 19.5 40C22 41 25 40 26 39C25.5 33 26.5 28 27.5 24Z" fill="url(#r${id})" fill-opacity=".95"/><path d="M19.6 40C22 41 25 40 26 39" stroke="${acc}" stroke-width=".9" fill="none"/><ellipse cx="22.6" cy="41.2" rx="1.4" ry="1.8" fill="${skin}"/>`;
  g+=`<path d="M34.4 22.5C40 24 42 28 40 33C38.8 35 36.5 35.6 35 34" stroke="${out}" stroke-width="3.4" fill="none" stroke-linecap="round"/><ellipse cx="34.5" cy="34.4" rx="1.4" ry="1.5" fill="${skin}"/>`;
  /* bodice */
  g+=`<path d="M25.4 21.6Q30 20.2 34.6 21.6L35.2 32Q30 33.6 24.8 32Z" fill="url(#r${id})"/><path d="M27.4 21.2L30 26l2.6-4.8" fill="${out2}" stroke="${acc}" stroke-width=".7"/><rect x="24.6" y="31" width="10.8" height="2.4" rx="1.1" fill="${acc}"/><circle cx="30" cy="32.2" r="1.1" fill="${out2}" stroke="#fff" stroke-width=".4"/>`;
  /* trailing ribbon */
  g+=`<path d="M35 33C41 36 45 42 44 49C42 44 39 41 35 38Z" fill="${acc}" fill-opacity=".85"/>`;
  g+=H.front;
  /* hair highlight */
  g+=`<path d="M25.5 10.5q4.5-3.5 9 0" stroke="#fff" stroke-opacity=".35" stroke-width=".8" fill="none"/>`;
  return g;
}
function prodArt(k){
  const P=PRODUCTS[k],o=FLOOK[k]||FLOOK.desk;let g;
  if(k==='chibi'){const hr=o.hair;g=`<circle cx="32" cy="8" r="4.5" fill="none" stroke="#9aa3ad" stroke-width="2.2"/><path d="M14 36C12 18 22 14 32 14S52 18 50 36C48 30 44 24 32 24S16 30 14 36Z" fill="${hr}"/><ellipse cx="32" cy="36" rx="17" ry="16" fill="#f8dfcb"/><path d="M14 38C12 20 22 13 32 13S52 20 50 38C48 29 42 22 36 24C33 21 30 25 27 22C23 24 17 28 14 38Z" fill="${hr}"/><ellipse cx="24" cy="38" rx="4" ry="5.2" fill="#fff"/><ellipse cx="24.4" cy="38.6" rx="3.1" ry="4.4" fill="${o.eye}"/><circle cx="24.4" cy="39.4" r="1.6" fill="${INK}"/><circle cx="23" cy="36.6" r="1.2" fill="#fff"/><ellipse cx="40" cy="38" rx="4" ry="5.2" fill="#fff"/><ellipse cx="39.6" cy="38.6" rx="3.1" ry="4.4" fill="${o.eye}"/><circle cx="39.6" cy="39.4" r="1.6" fill="${INK}"/><circle cx="38.2" cy="36.6" r="1.2" fill="#fff"/><path d="M29.5 46q2.5 2.2 5 0" stroke="#c45a58" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="19" cy="44.5" rx="2.6" ry="1.5" fill="#f08a8a" fill-opacity=".5"/><ellipse cx="45" cy="44.5" rx="2.6" ry="1.5" fill="#f08a8a" fill-opacity=".5"/><path d="M20 52q12 8 24 0v6q-12 6-24 0z" fill="${o.out}"/>`}
  else if(k==='deckbox'){const H=eHead(32,36,o);g=`<defs>${H.defs}</defs><rect x="11" y="9" width="42" height="48" rx="4" fill="#5646b0"/><rect x="11" y="9" width="42" height="9" rx="4" fill="#6d5acf"/><rect x="16" y="21" width="32" height="31" rx="2.5" fill="#241c4a"/><g transform="translate(32 40) scale(1.5) translate(-32 -36)">${H.back}${H.front}</g><path d="M16 49h32v3H16z" fill="${o.acc}" fill-opacity=".5"/>`}
  else if(k==='bust'||k==='lux'||k==='yasuo'||k==='jinhsib'){const H=eHead(32,28,o);g=`<defs>${H.defs}<linearGradient id="bg${_g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.out}"/><stop offset="1" stop-color="${o.out2||o.out}"/></linearGradient></defs><rect x="9" y="55" width="46" height="6" rx="1.5" fill="#1d2027"/><rect x="9" y="55" width="46" height="1" fill="#fff" fill-opacity=".25"/>${H.back}<path d="M10 56C10 45 18 39.5 27 38.5L32 45 37 38.5C46 39.5 54 45 54 56Z" fill="url(#bg${_g})"/><path d="M27 38.5L32 45 37 38.5" fill="none" stroke="${o.acc}" stroke-width="1"/>${H.front}`.replace(/<g>/,'');_g++}
  else if(k==='statue'||k==='kaisa'){g=`<path d="M6 60l5-9h42l5 9z" fill="#7a828e"/><path d="M11 51l4-4h34l4 4z" fill="#a1a8b3"/><g transform="translate(32 54) scale(1.0) translate(-32 -54)">${eFig(o)}</g><path d="M23 22C14 28 12 42 14 52C20 48 24 40 25 32Z" fill="${o.acc}" fill-opacity=".8"/>`}
  else g=eFig(o);
  const star=P.official?`<path d="M57 5l1.8 3.7 4 .6-2.9 2.8.7 4L57 14l-3.6 2 .7-4-2.9-2.8 4-.6z" fill="#f2c94c" stroke="#b8902a" stroke-width=".6"/>`:'';
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${g}${star}</svg>`;
}
const artBox=(svg,cls='',style='',v)=>`<div class="art ${cls}${v?' v3':''}" style="${style}"${v?` data-a="view3d" data-t="${v[0]}" data-k="${v[1]}" role="button" aria-label="View in 3D"`:''}>${svg}</div>`;
