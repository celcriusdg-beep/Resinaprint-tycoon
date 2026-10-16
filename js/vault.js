/* Vault (2.2): every level-up earns a chest. Chests hold rewards in 10 rarities, Common to Ethern. */
const RARITIES=[
  {n:'Common',w:50,cash:1,hype:2,res:0,e:.05,col:'#b4b0c4'},
  {n:'Uncommon',w:25,cash:1.5,hype:4,res:1,e:.1,col:'#6ee7a8'},
  {n:'Rare',w:12,cash:2.5,hype:8,res:1,e:.15,col:'#6fb7ff'},
  {n:'Epic',w:6,cash:4,hype:14,res:2,e:.25,col:'#c39bff',boost:[1.1,2]},
  {n:'Legendary',w:3.5,cash:7,hype:24,res:2,e:.35,col:'#ffd45e',boost:[1.15,3]},
  {n:'Mythic',w:1.8,cash:12,hype:40,res:3,e:.5,col:'#ff6a3d',boost:[1.2,3]},
  {n:'Divine',w:1,cash:20,hype:65,res:3,e:.65,col:'#fff0b8',boost:[1.25,4],rate:.02},
  {n:'Celestial',w:.45,cash:32,hype:100,res:4,e:.8,col:'#6ff0ff',boost:[1.3,5],rate:.04},
  {n:'Cosmic',w:.2,cash:50,hype:150,res:5,e:1,col:'#d46bff',boost:[1.4,6],rate:.06},
  {n:'Ethern',w:.05,cash:80,hype:250,res:6,e:1,col:'#ff9ae8',boost:[1.6,7],rate:.1}
];
/* chest items beyond cash: a printer and/or a free upgrade, by rarity */
const VAULT_PRINTER=[0,.08,.12,.15,.2,.25,.35,.45,.6,1];
const VAULT_UPGRADE=[0,.15,.25,.3,.35,.4,.45,.5,.6,.8];
const VAULT_UPMAX=[0,300,900,3000,10000,30000,90000,250000,600000,1500000];
const vaultPool=i=>{const P=g=>Object.keys(PRINTERS).filter(k=>PRINTERS[k].grp===g&&!PRINTERS[k].inj),LAB=P(4);
  return [[],P(0).slice(0,3),P(0),P(1),P(2),P(2).concat(P(3)),P(3),P(3).concat(LAB.slice(0,2)),LAB.slice(0,5),LAB.slice(3)][i]};
const VAULT_RESIN=['estd','siraya','siraya','ssculpt','ssculpt','ssculpt','prusa'];
const newVault=()=>({chests:[],opened:0,found:RARITIES.map(()=>0),pity:0,best:0});
const vaultOf=s=>s.vault||(s.vault=newVault());
/* a rarity name drawn letter by letter so each rarity can animate its own way */
const rarName=(i,cls)=>`<b class="rn r${i} ${cls||''}" aria-label="${RARITIES[i].n}">${[...RARITIES[i].n].map((c,j)=>`<i class="c" aria-hidden="true" style="--i:${j}">${c}</i>`).join('')}</b>`;
function vaultAdd(s,lv){const v=vaultOf(s);v.chests.push({lv,big:lv%5===0})}
function vaultRoll(ch){
  const v=vaultOf(S),luck=Math.min(1.2,.03*ch.lv)+(ch.big?.8:0)+perk('luck')*.1+(v.charm?1.5:0);
  const w=RARITIES.map((r,i)=>r.w*(1+luck*i));let min=ch.big?1:0;
  if(v.pity>=9)min=Math.max(min,3);
  const tot=w.reduce((a,b)=>a+b,0);let x=Math.random()*tot,k=0;
  for(;k<w.length-1;k++){x-=w[k];if(x<0)break}
  return Math.max(k,min);
}
function vaultGive(i,lv){
  const R=RARITIES[i],got=[];
  const cash=Math.max(30,Math.round(20*lv*R.cash*r(.85,1.15)));
  earn('Vault rewards',cash);got.push({k:'cash',t:'Cash',v:'+'+fmt(cash)});
  const e=i===9?maxE():Math.round(maxE()*R.e);
  const e0=S.energy;S.energy=Math.min(Math.max(S.energy,maxE()),S.energy+e);
  if(S.energy>e0)got.push({k:'energy',t:'Energy',v:'+'+Math.round(S.energy-e0)});
  S.hype+=R.hype;got.push({k:'hype',t:'Hype',v:'+'+R.hype});
  if(R.res){const band=[0,.05,.12,.2,.25,.3,.4,.5,.6,.6][i],key=typeof resinPick==='function'?resinPick(Math.max(0,band-.15),band):VAULT_RESIN[Math.min(i,VAULT_RESIN.length-1)];S.resin[key]=(S.resin[key]||0)+(RESINS[key].vol||1000)*R.res;got.push({k:'resin',t:'Resin',v:`${R.res} × ${RESINS[key].name}`,art:resinArt(key)})}
  if(R.boost&&(!boostMult()||R.boost[0]>boostMult())){S.boost={m:R.boost[0],until:S.abs+R.boost[1]*24};got.push({k:'boost',t:'Demand boost',v:`+${Math.round((R.boost[0]-1)*100)}% for ${R.boost[1]} days`})}
  if(Math.random()<VAULT_PRINTER[i]){
    const pool=vaultPool(i),k=pool[Math.floor(Math.random()*pool.length)],D=PRINTERS[k];
    (S.pinv=S.pinv||[]).push({id:nid(),type:k});
    got.push({k:'printer',t:'Printer · sent to storage',v:D.name,art:printerArt(k),big:1});
  }
  if(Math.random()<VAULT_UPGRADE[i]){
    const ok=UPGRADES.filter(u=>!S.up[u.id]&&u.cost<=VAULT_UPMAX[i]&&u.cost>=VAULT_UPMAX[i]/12&&(!u.req||u.req()));
    if(ok.length){const U=ok[Math.floor(Math.random()*ok.length)];S.up[U.id]=true;if(U.e)S.energy+=U.e;got.push({k:'upgrade',t:'Free upgrade (active now)',v:U.name})}
  }
  if(Math.random()<ITEM_CHANCE[i]){for(let n=0,m=i>=9?3:i>=7?2:1;n<m;n++){const id=pickItem(i);addItem(id);got.push({k:'item',t:'Item',v:ITEMS[id].n})}}
  if(R.rate){S.rating=clamp(S.rating+R.rate,1,5);got.push({k:'rating',t:'Rating',v:'+'+R.rate.toFixed(2)+'★'})}
  return got;
}
var CHEST_SVG=big=>{const a=big?'#ffd45e':'#b98a55',b=big?'#b8801f':'#7a5532',c=big?'#fff3b0':'#e0b783';
  return `<svg viewBox="0 0 96 80" aria-hidden="true"><ellipse cx="48" cy="72" rx="36" ry="6" fill="#000" opacity=".35"/><rect x="10" y="34" width="76" height="36" rx="5" fill="${b}"/><path d="M10 38C10 18 24 8 48 8s38 10 38 30z" fill="${a}"/><rect x="10" y="34" width="76" height="6" fill="${c}" opacity=".55"/><rect x="40" y="30" width="16" height="20" rx="3" fill="${c}"/><circle cx="48" cy="40" r="3" fill="${b}"/><rect x="22" y="34" width="5" height="36" fill="${c}" opacity=".35"/><rect x="69" y="34" width="5" height="36" fill="${c}" opacity=".35"/></svg>`};
function showVaultReveal(i,lv,got,big,left){
  const R=RARITIES[i];
  pending=[{f:()=>{}},{f:()=>A.openChest({})}];
  modal(`<div class="vreveal r${i}-bg" style="--rc:${R.col}">
    <div class="vchest ${big?'big':''}">${CHEST_SVG(big)}</div>
    <div class="vshow">
      <div class="kicker">${big?'Vault crate':'Level '+lv+' chest'}</div>
      <div class="vname">${rarName(i)}</div>
      <div class="vgot">${got.map((g,j)=>`<div class="vrow ${g.big?'big':''}" style="--d:${j}">${g.art?`<span class="vart">${g.art}</span>`:''}<span class="vl">${g.t}</span><b class="num">${g.v}</b></div>`).join('')}</div>
    </div>
    </div><div class="acts" style="margin-top:16px">${left?`<button class="btn primary" data-choice="1">Open next chest (${left} left)</button>`:''}<button class="btn ${left?'ghost':'primary'}" data-choice="0">${left?'Later':'Collect'}</button></div>`);
}
Object.assign(A,{
  openChest(){
    const v=vaultOf(S);if(!v.chests.length)return toast('No chests to open');
    const ch=v.chests.shift(),i=vaultRoll(ch);
    const charmUsed=v.charm;v.charm=false;v.opened++;v.found[i]=(v.found[i]||0)+1;v.best=Math.max(v.best,i);v.pity=i>=3?0:v.pity+1;
    const got=vaultGive(i,ch.lv);
    log(`Vault: ${RARITIES[i].n} chest from level ${ch.lv}. ${got.map(g=>g.t+' '+g.v).join(', ')}.`,i>=3?'good':'');
    save();showVaultReveal(i,ch.lv,got,ch.big,v.chests.length);
  }
});
function vaultCard(){
  const n=vaultOf(S).chests.length;if(!n)return '';
  return `<div class="card vcta" style="margin-top:16px"><div class="vchest sm">${CHEST_SVG(vaultOf(S).chests.some(c=>c.big))}</div><div class="grow"><div class="t">${n} ${n>1?'chests':'chest'} waiting</div><div class="s">Earned by levelling up. Open them in the Vault.</div></div><button class="btn sm primary" data-a="openChest">Open</button></div>`;
}
function vaultView(){
  const v=vaultOf(S),n=v.chests.length,tw=RARITIES.reduce((a,x)=>a+x.w,0);
  let h=label('Vault',`${v.opened} opened · best ${RARITIES[v.best].n}`)+`<div class="card vcta"><div class="vchest sm ${v.chests.some(c=>c.big)?'big':''}">${CHEST_SVG(v.chests.some(c=>c.big))}</div><div class="grow"><div class="t">${n?`${n} ${n>1?'chests':'chest'} ready`:'No chests right now'}</div><div class="s">${n?'Every level-up earns one. Every 5th level it is a crate with better odds.':`Next chest at level ${S.lv+1}. Every 5th level you get a crate with better odds.`}</div></div><button class="btn sm primary" data-a="openChest" ${n?'':'disabled'}>Open</button></div>`;
  h+=label('Rarities',`higher level = better luck · guaranteed Epic+ every 10 chests`)+`<div class="stack">`;
  RARITIES.forEach((R,i)=>{h+=`<div class="card vrar r${i}-bg" style="--rc:${R.col}"><div class="vrow2"><div class="vname sm">${rarName(i)}</div><span class="chip">${(R.w/tw*100).toFixed(R.w<1?2:1)}% base</span></div><div class="s" style="margin-top:6px">Cash ×${R.cash} · hype +${R.hype} · ${R.res?R.res+' resin bottle'+(R.res>1?'s':''):'no resin'}${R.boost?` · +${Math.round((R.boost[0]-1)*100)}% demand ${R.boost[1]} d`:''}${R.rate?` · +${R.rate.toFixed(2)}★`:''}${VAULT_PRINTER[i]?` · ${Math.round(VAULT_PRINTER[i]*100)}% printer`:''}${VAULT_UPGRADE[i]?` · ${Math.round(VAULT_UPGRADE[i]*100)}% free upgrade`:''}</div><div class="kv"><span>Found <b>${v.found[i]||0}</b></span></div></div>`});
  return h+'</div>';
}
