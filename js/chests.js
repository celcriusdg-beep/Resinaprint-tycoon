/* Vault redesign (4.2): realistic chests, a proper opening sequence, a vault hall with a pity meter, and rarity names whose effects match their meaning. */
const RAR_FX=[
  {kind:'dust',n:'plain steel'},{kind:'leaf',n:'emerald sheen'},{kind:'crystal',n:'cut sapphire'},{kind:'rune',n:'arcane lightning'},{kind:'coin',n:'molten gold'},
  {kind:'ember',n:'dragonfire'},{kind:'mote',n:'holy light'},{kind:'star',n:'night sky'},{kind:'nebula',n:'galaxy and black hole'},{kind:'wisp',n:'ether'}
];
CHEST_SVG=(big,open,col)=>{
  const glow=col||'#e8b34b';
  if(big)return `<svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="cs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b6070"/><stop offset=".5" stop-color="#3a3e4b"/><stop offset="1" stop-color="#22252e"/></linearGradient><linearGradient id="cs2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b8194"/><stop offset="1" stop-color="#454a58"/></linearGradient><radialGradient id="cg1"><stop offset="0" stop-color="${glow}" stop-opacity=".9"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="60" cy="90" rx="44" ry="6" fill="#000" opacity=".45"/>
    ${open?`<ellipse cx="60" cy="52" rx="38" ry="22" fill="url(#cg1)"/>`:''}
    <rect x="14" y="44" width="92" height="44" rx="5" fill="url(#cs1)" stroke="#14161b" stroke-width="1.5"/>
    <rect x="14" y="44" width="92" height="5" fill="#fff" opacity=".1"/>
    <path d="M14 66h92" stroke="#14161b" stroke-width="2"/><rect x="14" y="62" width="92" height="3" fill="${glow}" opacity=".85"/>
    <g fill="#c9a24a" stroke="#14161b" stroke-width="1"><rect x="12" y="42" width="14" height="14" rx="2"/><rect x="94" y="42" width="14" height="14" rx="2"/><rect x="12" y="76" width="14" height="14" rx="2"/><rect x="94" y="76" width="14" height="14" rx="2"/></g>
    <g fill="#14161b" opacity=".7">${[[19,49],[101,49],[19,83],[101,83]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2"/>`).join('')}</g>
    <circle cx="60" cy="70" r="11" fill="#2b2e38" stroke="#c9a24a" stroke-width="2.5"/><circle cx="60" cy="70" r="3.4" fill="${glow}"/><path d="M60 59v-5M60 81v5M49 70h-5M71 70h5" stroke="#c9a24a" stroke-width="2.4"/>
    <g style="transform-origin:14px 44px;transform:${open?'rotate(-64deg)':'none'};transition:transform .5s"><path d="M14 44c0-14 14-24 46-24s46 10 46 24z" fill="url(#cs2)" stroke="#14161b" stroke-width="1.5"/><path d="M14 44c0-14 14-24 46-24s46 10 46 24" fill="none" stroke="#fff" stroke-width="1" opacity=".18"/><rect x="52" y="38" width="16" height="12" rx="2" fill="#c9a24a" stroke="#14161b"/></g></svg>`;
  return `<svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="wd1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#4f301b"/></linearGradient><linearGradient id="wd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a56d3e"/><stop offset="1" stop-color="#6b4226"/></linearGradient><radialGradient id="cg2"><stop offset="0" stop-color="${glow}" stop-opacity=".9"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="60" cy="90" rx="44" ry="6" fill="#000" opacity=".45"/>
    ${open?`<ellipse cx="60" cy="52" rx="36" ry="20" fill="url(#cg2)"/>`:''}
    <rect x="16" y="46" width="88" height="42" rx="4" fill="url(#wd1)" stroke="#2a190d" stroke-width="1.5"/>
    <g stroke="#2a190d" stroke-width="1.2" opacity=".55"><path d="M30 46v42M45 46v42M60 46v42M75 46v42M90 46v42"/></g>
    <g fill="#3a3f4a" stroke="#14161b" stroke-width="1"><rect x="16" y="46" width="88" height="7"/><rect x="16" y="81" width="88" height="7"/><rect x="24" y="46" width="9" height="42"/><rect x="87" y="46" width="9" height="42"/></g>
    <g fill="#8a90a0">${[[28,50],[92,50],[28,84],[92,84]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="1.8"/>`).join('')}</g>
    <rect x="50" y="56" width="20" height="24" rx="3" fill="#c9a24a" stroke="#14161b" stroke-width="1.5"/><circle cx="60" cy="66" r="3.6" fill="#14161b"/><path d="M60 66v8" stroke="#14161b" stroke-width="2.6"/>
    <g style="transform-origin:16px 46px;transform:${open?'rotate(-62deg)':'none'};transition:transform .5s"><path d="M16 46c0-16 12-26 44-26s44 10 44 26z" fill="url(#wd2)" stroke="#2a190d" stroke-width="1.5"/><g stroke="#2a190d" stroke-width="1.2" opacity=".5"><path d="M34 22v24M48 20v26M60 20v26M72 20v26M86 22v24"/></g><path d="M16 46c0-16 12-26 44-26s44 10 44 26" fill="none" stroke="#fff" stroke-width="1" opacity=".15"/><g fill="#3a3f4a" stroke="#14161b"><rect x="24" y="24" width="9" height="22"/><rect x="87" y="24" width="9" height="22"/></g><rect x="52" y="40" width="16" height="12" rx="2" fill="#c9a24a" stroke="#14161b"/></g></svg>`;
};
const rarStamp=i=>`<span class="rstamp r${i}-st" style="--rc:${RARITIES[i].col}"><i></i></span>`;
function vaultParticles(i){
  const n=i<2?14:i<5?20:28,k=RAR_FX[i].kind;let h='';
  for(let j=0;j<n;j++){
    const a=Math.random()*Math.PI*2,d=40+Math.random()*120,x=Math.cos(a)*d,y=Math.sin(a)*d*(k==='ember'||k==='mote'||k==='wisp'?1.4:.9)-20,s=3+Math.random()*(k==='coin'||k==='rune'?7:5),t=(.9+Math.random()*1.6).toFixed(2),dl=(1.05+Math.random()*.5).toFixed(2);
    h+=`<i class="pt pt-${k}" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--s:${s.toFixed(1)}px;--t:${t}s;--dl:${dl}s;--r:${(Math.random()*360).toFixed(0)}deg">${k==='rune'?'✧':k==='star'?'✦':''}</i>`;
  }
  return h;
}
showVaultReveal=function(i,lv,got,big,left){
  const R=RARITIES[i];
  pending=[{f:()=>{}},{f:()=>A.openChest({})}];
  modal(`<div class="vrv r${i}-bg" style="--rc:${R.col};--pow:${(.4+i*.11).toFixed(2)}">
    <div class="vrv-fx"><i class="vflash"></i><i class="vrays"></i><i class="vhalo"></i></div>
    <div class="vrv-stage"><div class="vrv-c shut ${big?'big':''}">${CHEST_SVG(big,false)}</div><div class="vrv-c open ${big?'big':''}">${CHEST_SVG(big,true,R.col)}</div><i class="vrv-orb"></i><div class="vrv-pts">${vaultParticles(i)}</div></div>
    <div class="vshow"><div class="kicker">${big?'Vault crate':'Level '+lv+' chest'} · ${RAR_FX[i].n}</div>
      <div class="vname">${rarName(i)}</div>
      <div class="vgot">${got.map((g,j)=>`<div class="vrow ${g.big?'big':''}" style="--d:${j}">${g.art?`<span class="vart">${g.art}</span>`:''}<span class="vl">${g.t}</span><b class="num">${g.v}</b></div>`).join('')}</div></div>
    </div><div class="acts" style="margin-top:14px">${left?`<button class="btn primary" data-choice="1">Open next chest (${left} left)</button>`:''}<button class="btn ${left?'ghost':'primary'}" data-choice="0">${left?'Later':'Collect'}</button></div>`);
  if(typeof snd==='function'){setTimeout(()=>snd('chest'),950)}
};
function chestSlot(c,i){return `<div class="cslot ${c.big?'big':''}" style="--d:${i}"><div class="cs-art">${CHEST_SVG(c.big,false)}</div><b>${c.big?'Crate':'Lv '+c.lv}</b></div>`}
vaultCard=function(){
  const v=vaultOf(S),n=v.chests.length;if(!n)return '';
  return `<div class="card vcta" style="margin-top:16px"><div class="vchest sm">${CHEST_SVG(v.chests.some(c=>c.big),false)}</div><div class="grow"><div class="t">${n} ${n>1?'chests':'chest'} waiting</div><div class="s">Earned by levelling up. Open them in the Vault.</div></div><button class="btn sm primary" data-a="openChest">Open</button></div>`;
};
function pityLeft(){const v=vaultOf(S);return Math.max(0,10-(v.pity||0))}
vaultView=function(){
  const v=vaultOf(S),n=v.chests.length,tw=RARITIES.reduce((a,x)=>a+x.w,0),pl=pityLeft();
  let h=label('The Vault',`${v.opened} opened · best ${RARITIES[v.best].n}`);
  h+=`<div class="vhall"><div class="vdoor"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="#1a1c23" stroke="#3a3e4b" stroke-width="4"/><circle cx="60" cy="60" r="44" fill="none" stroke="#c9a24a" stroke-width="3"/><g class="vwheel" stroke="#c9a24a" stroke-width="5" stroke-linecap="round"><path d="M60 24v72M24 60h72M34 34l52 52M86 34L34 86"/></g><circle cx="60" cy="60" r="13" fill="#2b2e38" stroke="#c9a24a" stroke-width="3"/><circle cx="60" cy="60" r="4" fill="#e8b34b"/></svg></div>
    <div class="vinfo"><div class="t">${n?`${n} ${n>1?'chests':'chests'} ready`:'No chests right now'}</div><div class="s">${n?'Every level-up earns one. Every 5th level it is a crate with better odds.':`Next chest at level ${S.lv+1}.`}</div>
    <div class="pity"><div class="ph"><span>Guaranteed Epic or better</span><b>${pl===0?'next open':pl+' opens'}</b></div><div class="bar"><i style="width:${100*(10-pl)/10}%"></i></div></div>
    <button class="btn primary" data-a="openChest" ${n?'':'disabled'}>Open ${n?'next chest':'a chest'}</button></div></div>`;
  if(n)h+=`<div class="cshelf">${v.chests.slice(0,12).map(chestSlot).join('')}${n>12?`<span class="cmore">+${n-12}</span>`:''}</div>`;
  h+=label('Rarities',`higher level = better luck`)+`<div class="rgrid">`;
  RARITIES.forEach((R,i)=>{const found=v.found[i]||0;
    h+=`<div class="rcard rc${i}" style="--rc:${R.col}"><div class="rc-top"><div class="vname sm">${rarName(i)}</div><span class="chip">${(R.w/tw*100).toFixed(R.w<1?2:1)}%</span></div>
      <div class="s">${RAR_FX[i].n}</div>
      <div class="rc-r"><span>Cash ×${R.cash}</span><span>Hype +${R.hype}</span><span>${R.res?R.res+' resin':'no resin'}</span>${R.boost?`<span>+${Math.round((R.boost[0]-1)*100)}% demand</span>`:''}${VAULT_PRINTER[i]?`<span>printer ${Math.round(VAULT_PRINTER[i]*100)}%</span>`:''}</div>
      <div class="rc-f">${found?`Found ${found}×`:'Not found yet'}</div></div>`});
  return h+'</div>';
};
/* 4.7: the rendered chest replaces the hand-drawn one */
CHEST_SVG=(big,open)=>`<img class="chestimg ${big?'crate':''} ${open?'burst':''}" src="img/ui/chest.webp" alt="" width="256" height="256">`;
