/* Singularity (4.3): fuse black matter into Singularity Cores, then forge printers far beyond anything in the shop. No rebirth needed, and it survives rebirths. */
const sng=()=>S.sing||(S.sing={cores:0,made:0,forged:{}});
const SING_P=[
  {k:'sg1',n:'Event Horizon Press',col:'#9d6bff',cost:4e6,slots:1700,speed:70,fail:.004,wear:.18,pow:3000,q:.25,
    d:'The first machine that prints from inside a collapsing field.',rec:[{t:'core',n:2},{t:'shard',n:12},{t:'cash',n:1.5e6},{t:'lab',n:1}]},
  {k:'sg2',n:'Quasar Lattice',col:'#5aa6ff',cost:12e6,slots:2400,speed:110,fail:.004,wear:.15,pow:4200,q:.32,
    d:'A lattice of light fed by a distant quasar. Prints whole armies at once.',rec:[{t:'core',n:4},{t:'shard',n:30},{t:'cash',n:5e6},{t:'pt',k:'sg1',n:1},{t:'lab',n:1}]},
  {k:'sg3',n:'Tachyon Loom',col:'#27e3ff',cost:36e6,slots:3400,speed:170,fail:.003,wear:.12,pow:6000,q:.4,
    d:'Weaves figures from particles that arrive before the order does.',rec:[{t:'core',n:7},{t:'shard',n:70},{t:'cash',n:18e6},{t:'pt',k:'sg2',n:1},{t:'lab',n:2},{t:'item',k:'charm',n:1}]},
  {k:'sg4',n:'Wormhole Foundry',col:'#5bd6a6',cost:110e6,slots:5000,speed:260,fail:.003,wear:.1,pow:9000,q:.5,
    d:'Resin goes in one end. Finished figures come out of somewhere else.',rec:[{t:'core',n:12},{t:'shard',n:150},{t:'cash',n:60e6},{t:'pt',k:'sg3',n:1},{t:'lab',n:2},{t:'item',k:'workshop',n:1}]},
  {k:'sg5',n:'Dark Matter Reactor',col:'#e8b34b',cost:340e6,slots:8000,speed:400,fail:.002,wear:.08,pow:14000,q:.65,
    d:'Burns the stuff that is not there. Nothing out-prints it. Almost.',rec:[{t:'core',n:20},{t:'shard',n:320},{t:'cash',n:200e6},{t:'pt',k:'sg4',n:1},{t:'pt',k:'sg2',n:1},{t:'item',k:'workshop',n:2}]},
  {k:'sg6',n:'Omega Singularity',col:'#ff4fb0',cost:1.2e9,slots:15000,speed:700,fail:.001,wear:.05,pow:25000,q:.9,
    d:'The end of the line. A point of infinite density that makes figures.',rec:[{t:'core',n:35},{t:'shard',n:700},{t:'cash',n:1e9},{t:'pt',k:'sg5',n:1},{t:'pt',k:'sg3',n:1},{t:'item',k:'charm',n:2},{t:'item',k:'workshop',n:2}]}
];
for(const x of SING_P)PRINTERS[x.k]=mkP(x.n,5,x.cost,x.slots,x.speed,x.fail,x.wear,4,Math.round(x.cost/400),0,{form:true,fam:'lab',lab:1,sing:1,pow:x.pow,q:x.q});
const SING_BY=Object.fromEntries(SING_P.map(x=>[x.k,x]));
/* art: dark tower, glowing rings, a black core */
let _sgId=0;
function singArt(k){
  const x=SING_BY[k],t=SING_P.indexOf(x)+1,id='sg'+(++_sgId),c=x.col;
  const rings=Array.from({length:Math.min(4,1+Math.ceil(t/2))},(_,i)=>`<ellipse cx="32" cy="30" rx="${17+i*4}" ry="${4+i*1.4}" fill="none" stroke="${c}" stroke-width="${1.6-i*.2}" opacity="${.95-i*.2}" transform="rotate(${-20+i*14} 32 30)"><animateTransform attributeName="transform" type="rotate" from="${-20+i*14} 32 30" to="${340+i*14} 32 30" dur="${5+i*2}s" repeatCount="indefinite"/></ellipse>`).join('');
  return `<svg viewBox="0 0 64 64" style="width:100%;height:100%" aria-hidden="true"><defs><radialGradient id="${id}"><stop offset="0" stop-color="#000"/><stop offset=".6" stop-color="#0a0612"/><stop offset="1" stop-color="${c}" stop-opacity=".9"/></radialGradient><radialGradient id="${id}h"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="32" cy="30" r="26" fill="url(#${id}h)"/>
    <rect x="12" y="48" width="40" height="9" rx="3" fill="#14131c" stroke="${c}" stroke-opacity=".5"/><rect x="16" y="44" width="32" height="6" rx="2" fill="#1c1a28"/>
    <path d="M18 44 22 20h20l4 24z" fill="#0d0c14" stroke="${c}" stroke-opacity=".35"/>
    ${rings}
    <circle cx="32" cy="30" r="${7+Math.min(4,t*.5)}" fill="url(#${id})" stroke="${c}" stroke-width="1.2"/>
    <circle cx="29" cy="27" r="1.6" fill="#fff" opacity=".7"/>
    <rect x="22" y="52" width="${6+t*2}" height="2" rx="1" fill="${c}"/></svg>`;
}
const _pa4=printerArt;printerArt=function(k){return SING_BY[k]?singArt(k):_pa4(k)};
/* ---- ingredients ---- */
const pcand=pred=>{
  const L=[];
  for(const x of (S.pinv||[]))if(pred(PRINTERS[x.type]))L.push({src:'inv',x,c:PRINTERS[x.type].cost});
  for(const p of S.printers)if(p.state==='idle'&&pred(PRINTERS[p.type]))L.push({src:'pl',x:p,c:PRINTERS[p.type].cost+1e12});
  return L.sort((a,b)=>a.c-b.c);
};
const ingPred=g=>g.t==='lab'?(D=>D.grp===4):g.t==='pt'?(D=>PRINTERS[g.k]===D):(D=>!D.sing);
function ingHave(g){
  if(g.t==='core')return sng().cores;
  if(g.t==='shard')return rebOf(S).shards;
  if(g.t==='cash')return Math.max(0,S.cash);
  if(g.t==='item')return invOf(S)[g.k]||0;
  return pcand(ingPred(g)).length;
}
function ingName(g){
  if(g.t==='core')return 'Singularity Core';
  if(g.t==='shard')return 'Resin Shards';
  if(g.t==='cash')return 'Cash';
  if(g.t==='item')return ITEMS[g.k].n;
  if(g.t==='lab')return 'Laboratorium printer';
  if(g.t==='pt')return PRINTERS[g.k].name;
  return 'Any printer';
}
const ingFmt=(g,v)=>g.t==='cash'?fmt(v):String(Math.floor(v));
const ingOk=g=>ingHave(g)>=g.n;
function ingTake(g){
  if(g.t==='core')sng().cores-=g.n;
  else if(g.t==='shard')rebOf(S).shards-=g.n;
  else if(g.t==='cash')spend('Singularity',g.n);
  else if(g.t==='item')for(let i=0;i<g.n;i++)takeItem(g.k);
  else for(const c of pcand(ingPred(g)).slice(0,g.n)){if(c.src==='inv')S.pinv=S.pinv.filter(y=>y!==c.x);else S.printers=S.printers.filter(y=>y!==c.x)}
}
const coreRec=()=>{const n=sng().made;return [{t:'shard',n:Math.round(6*Math.pow(1.045,n))},{t:'cash',n:Math.round(300000*Math.pow(1.06,n)/1000)*1000},{t:'any',n:1}]};
const ingChips=(rec)=>rec.map(g=>{const ok=ingOk(g);return `<span class="ing ${ok?'ok':'no'} t-${g.t}"><i></i><span>${ingName(g)}</span><b>${g.t==='cash'?fmt(g.n):'×'+g.n}</b><em>${ingFmt(g,ingHave(g))}</em></span>`}).join('');
const singState=x=>{
  if(sng().forged[x.k])return 'done';
  const pre=x.rec.filter(g=>g.t==='pt');
  return 'open';
};
let singSel='sg1';
Object.assign(A,{
  singSel(d){singSel=d.k},
  singFuse(){
    const rec=coreRec();if(!rec.every(ingOk))return toast('You are missing ingredients');
    const noun=rec.find(g=>g.t==='any'),cand=pcand(ingPred(noun))[0];
    confirmBox('Fuse a Singularity Core?',`Uses ${fmt(rec[1].n)}, ${rec[0].n} Resin Shards and one printer (${PRINTERS[(cand.x.type)].name}${cand.src==='pl'?', placed in your studio':', from storage'}).`,()=>{
      if(!rec.every(ingOk))return;rec.forEach(ingTake);sng().cores++;sng().made++;confetti(40);snd('good');toast('Singularity Core fused');log('A Singularity Core collapsed into being.','amber')});
  },
  singForge(d){
    const x=SING_BY[d.k];if(!x)return;if(!x.rec.every(ingOk))return toast('You are missing ingredients');
    const pr=x.rec.filter(g=>['pt','lab','any'].includes(g.t)).map(g=>g.n+'× '+ingName(g)).join(', ');
    confirmBox(`Forge ${x.n}?`,`This consumes ${x.rec.map(g=>g.t==='cash'?fmt(g.n):g.t==='core'?g.n+' Cores':g.t==='shard'?g.n+' shards':g.n+'× '+ingName(g)).join(', ')}. The printer is sent to your inventory first.`,()=>{
      if(!x.rec.every(ingOk))return;
      x.rec.filter(g=>g.t!=='cash').concat(x.rec.filter(g=>g.t==='cash')).forEach(ingTake);
      (S.pinv=S.pinv||[]).push({id:nid(),type:x.k});sng().forged[x.k]=(sng().forged[x.k]||0)+1;
      confetti(80);snd('good');log(`${x.n} forged. It waits in your inventory.`,'amber');
      pending=[{f:()=>{}}];
      modal(`<div class="vreveal" style="--rc:${x.col}"><div class="vshow"><div class="kicker">Forged · sent to inventory</div><div class="sgreveal">${singArt(x.k)}</div><div class="vname" style="margin:4px 0">${x.n}</div><p style="text-align:center;margin:0 0 6px;color:var(--muted)">${x.speed}× speed · ${x.slots} slots</p></div></div><div class="acts" style="margin-top:12px"><button class="btn primary" data-a="goItems" data-choice="0">Open inventory</button></div>`);
    });
  }
});
function singNode(x,i){
  const a=(-90+60*i)*Math.PI/180,px=50+37*Math.cos(a),py=50+37*Math.sin(a),f=sng().forged[x.k],ready=x.rec.every(ingOk);
  return `<button class="snode ${f?'forged':ready?'ready':''} ${singSel===x.k?'sel':''}" data-a="singSel" data-k="${x.k}" style="left:${px}%;top:${py}%;--c:${x.col}"><span class="sa">${singArt(x.k)}</span><b>${i+1}</b>${f?`<em>${f}</em>`:''}</button>`;
}
function singView(){
  const R=sng(),n=R.cores;
  const best=Math.max(...Object.values(PRINTERS).filter(p=>!p.sing).map(p=>p.speed));
  let h=label('Singularity',`${R.made} Cores fused · ${Object.values(R.forged).reduce((a,b)=>a+b,0)} printers forged`);
  /* reactor */
  const lines=SING_P.map((x,i)=>{const a=(-90+60*i)*Math.PI/180;return `<line x1="50" y1="50" x2="${(50+37*Math.cos(a)).toFixed(1)}" y2="${(50+37*Math.sin(a)).toFixed(1)}" stroke="${x.col}" stroke-opacity=".28" stroke-width=".5" stroke-dasharray="1.5 1.5"/>`}).join('');
  const arcs=SING_P.slice(1).map((x,i)=>{const a=(-90+60*i)*Math.PI/180,b=(-90+60*(i+1))*Math.PI/180,ax=50+37*Math.cos(a),ay=50+37*Math.sin(a),bx=50+37*Math.cos(b),by=50+37*Math.sin(b);return `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}Q50 50 ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${x.col}" stroke-opacity=".5" stroke-width=".7"/>`}).join('');
  h+=`<div class="card sgcard"><div class="reactor"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="37" fill="none" stroke="rgba(157,107,255,.25)" stroke-width=".4"/><circle cx="50" cy="50" r="24" fill="none" stroke="rgba(157,107,255,.15)" stroke-width=".4" stroke-dasharray="2 3" class="rspin"/>${lines}${arcs}</svg>
    <div class="rcore"><div class="rc-hole">${shardSvg(58,'big')}</div><div class="rc-n num">${glit(n)}</div><small>Cores</small></div>${SING_P.map(singNode).join('')}</div>
    <div class="s" style="text-align:center">Fuse black matter into Cores, then forge printers. Each machine needs the one before it. Nothing here resets your company.</div></div>`;
  /* fuse */
  const cr=coreRec(),cok=cr.every(ingOk);
  h+=`<div class="card" style="margin-top:12px"><div class="chk"><span>Fuse a Core</span><b>${shardN(rebOf(S).shards)}</b></div><div class="ings">${ingChips(cr)}</div><div class="s" style="margin:8px 0 0">Black matter, money and a printer you do not need. Every Core costs a little more than the last.</div><div class="opts"><button class="btn primary" data-a="singFuse" ${cok?'':'disabled'}>Fuse Core</button></div></div>`;
  /* detail */
  const x=SING_BY[singSel]||SING_P[0],D=PRINTERS[x.k],ok=x.rec.every(ingOk),f=R.forged[x.k]||0;
  h+=`<div class="card sgdetail" style="margin-top:12px;--c:${x.col}"><div class="sgh"><div class="sgart">${singArt(x.k)}</div><div class="grow"><div class="kicker">Tier ${SING_P.indexOf(x)+1} of 6${f?` · forged ${f}×`:''}</div><div class="sgn">${x.n}</div><div class="s">${x.d}</div></div></div>
    <div class="fleet" style="margin-top:12px"><div class="ft"><b>${D.speed}×</b><span>Speed</span></div><div class="ft"><b>${D.slots}</b><span>Slots</span></div><div class="ft"><b>${(D.fail*100).toFixed(1)}%</b><span>Fail rate</span></div><div class="ft good"><b>${(D.speed/best).toFixed(1)}×</b><span>vs best shop printer</span></div></div>
    <div class="chk" style="margin-top:14px"><span>Recipe</span><b></b></div><div class="ings">${ingChips(x.rec)}</div>
    <div class="opts"><button class="btn primary" data-a="singForge" data-k="${x.k}" ${ok?'':'disabled'}>${ok?'Forge · send to inventory':'Missing ingredients'}</button></div></div>`;
  return h;
}
/* Singularity survives rebirth and restart */
const _rb4=doRebirth;doRebirth=function(d){const o=S;const g=_rb4(d);S.sing=o.sing;return g};
const _rs4=restartRun;restartRun=function(){const o=S;_rs4();S.sing=o.sing};
