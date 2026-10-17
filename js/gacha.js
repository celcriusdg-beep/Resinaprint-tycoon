/* Chest opening 2.0 (4.56): the rarer the pull, the bigger the show.
   Common/Uncommon  quick shake, pop, rewards slide in
   Rare/Epic        longer build-up, glow pulses in the rarity colour, light burst and a flash
   Legendary        golden god rays, three heavy shakes, screen shake and a coin shower
   Mythic and up    a full-screen gacha pull: the chest cracks, a light pillar shoots up, an orb climbs through the
                    rarity colours (it can "upgrade" on the way), a huge flash, the rarity name slams in, and the
                    rewards flip over one by one. Cosmic and Ethern add a shattering screen and rainbow rays.
   Tap anywhere (not a button) to skip to the result. */
let gxTimers=[];
const gxClear=()=>{gxTimers.forEach(clearTimeout);gxTimers=[]};
const gxAt=(ms,f)=>gxTimers.push(setTimeout(()=>{if(document.querySelector('.gx'))f()},ms));
const gxTier=i=>i<=1?0:i<=3?1:i===4?2:3;
function gxRows(got,card){
  return got.map((g,j)=>card
    ?`<div class="gx-card" style="--d:${j}"><div class="gx-cin"><div class="gx-back"><i></i></div><div class="gx-front ${g.big?'big':''}">${g.art?`<span class="gx-art">${g.art}</span>`:`<span class="gx-art gx-ico">${gxIco(g.k)}</span>`}<small>${g.t}</small><b>${g.v}</b></div></div></div>`
    :`<div class="gx-row ${g.big?'big':''}" style="--d:${j}">${g.art?`<span class="gx-art">${g.art}</span>`:`<span class="gx-art gx-ico">${gxIco(g.k)}</span>`}<span class="gx-l">${g.t}</span><b>${g.v}</b></div>`).join('');
}
const GX_ICO={cash:'€',energy:'⚡',hype:'🔥',boost:'📈',rating:'★',upgrade:'⬆',shards:'◆',special:'🎁',item:'✦',printer:'🖨',resin:'💧',relic:'✹'};
const gxIco=k=>GX_ICO[k]||'✦';
function gxStars(n){let h='';for(let j=0;j<n;j++)h+=`<i style="--x:${(Math.random()*100).toFixed(1)}%;--y:${(Math.random()*100).toFixed(1)}%;--s:${(1+Math.random()*2.2).toFixed(1)}px;--t:${(1.5+Math.random()*3).toFixed(2)}s;--dl:${(Math.random()*2).toFixed(2)}s"></i>`;return h}
function gxCoins(n){let h='';for(let j=0;j<n;j++)h+=`<i style="--x:${(Math.random()*100).toFixed(1)}%;--t:${(1.2+Math.random()*1.4).toFixed(2)}s;--dl:${(Math.random()*1.2).toFixed(2)}s;--r:${Math.round(Math.random()*720)}deg"></i>`;return h}
showVaultReveal=function(i,lv,got,big,left){
  gxClear();
  const R=RARITIES[i],t=gxTier(i),ch=typeof lastOpened!=='undefined'?lastOpened:null,X=ch&&ch.sp&&typeof SPECIAL!=='undefined'?SPECIAL[ch.sp]:null;
  const kicker=X?X.n:big?'Vault crate':'Level '+lv+' chest',fx=typeof RAR_FX!=='undefined'?RAR_FX[i].n:'';
  const chest=CHEST_SVG(big,false).replace('class="chestimg','class="chestimg '+(ch&&ch.sp?'sp-'+ch.sp:''));
  pending=[{f:()=>{gxClear()}},{f:()=>{gxClear();A.openChest({})}}];
  const acts=`<div class="gx-acts">${left?`<button class="btn primary" data-choice="1">Open next (${left} left)</button>`:''}<button class="btn ${left?'ghost':'primary'}" data-choice="0">${left?'Later':'Collect'}</button></div>`;
  const gacha=t===3,steps=[];
  if(gacha){for(let k=2;k<=i;k++)steps.push(RARITIES[k].col);if(Math.random()<.5&&i>5)steps.splice(steps.length-1,0,RARITIES[i-1].col)}
  modal(`<div class="gx gx-t${t} gr${i}" style="--rc:${R.col};--oc:${gacha?RARITIES[2].col:R.col}">
    <div class="gx-bg">${t>=1?`<div class="gx-stars">${gxStars(t===3?70:t===2?36:18)}</div>`:''}${t>=2?'<i class="gx-rays"></i>':''}${t===3?'<i class="gx-rays r2"></i><i class="gx-ring"></i><i class="gx-ring r2"></i>':''}${i>=8?'<i class="gx-rainbow"></i><i class="gx-crack"></i>':''}</div>
    <div class="gx-stage">
      <div class="gx-chest">${chest}</div>
      ${gacha?'<i class="gx-pillar"></i><div class="gx-orb"><i></i></div>':''}
      <i class="gx-burst"></i><div class="gx-pts">${typeof vaultParticles==='function'?vaultParticles(i):''}</div>
      ${t>=2?`<div class="gx-coins">${gxCoins(t===3?40:24)}</div>`:''}
    </div>
    <i class="gx-flash"></i>
    <div class="gx-res"><div class="kicker">${kicker}${fx?' · '+fx:''}</div><div class="gx-name">${rarName(i)}</div>
      <div class="${gacha?'gx-cards':'gx-rows'}">${gxRows(got,gacha)}</div></div>
    ${acts}<div class="gx-skip">tap to skip</div></div>`);
  const root=document.querySelector('#modalRoot .modal');if(root&&gacha)root.classList.add('gx-full');
  const G=document.querySelector('.gx');if(!G)return;
  const at=(ms,cls)=>gxAt(ms,()=>G.classList.add(cls));
  const shake=[450,700,1000,1300][t],open=shake;
  if(typeof snd==='function')snd('chest_shake');
  at(0,'s-shake');
  if(t>=1)at(shake*.45,'s-glow');
  if(t===2){at(shake*.3,'s-big');at(shake*.65,'s-big2')}
  if(!gacha){
    at(open,'s-open');gxAt(open,()=>{if(typeof snd==='function')snd('chest_open',i);if(t>=2){document.body.classList.add('gx-quake');setTimeout(()=>document.body.classList.remove('gx-quake'),600)}if(t>=1&&typeof confetti==='function')confetti(t===2?140:60)});
    at(open+120,'s-res');at(open+500,'s-done');
  }else{
    at(shake,'s-crack');at(shake+250,'s-pillar');at(shake+450,'s-orb');
    steps.forEach((c,k)=>gxAt(shake+700+k*380,()=>{G.style.setProperty('--oc',c);G.classList.remove('s-pulse');void G.offsetWidth;G.classList.add('s-pulse');if(typeof snd==='function')snd('tap')}));
    const boom=shake+700+steps.length*380+250;
    gxAt(boom,()=>{G.classList.add('s-open','s-boom');if(typeof snd==='function')snd('chest_open',i);document.body.classList.add('gx-quake');setTimeout(()=>document.body.classList.remove('gx-quake'),900);if(typeof confetti==='function')confetti(220)});
    at(boom+300,'s-res');at(boom+700,'s-cards');at(boom+700+got.length*170+400,'s-done');
  }
  G.addEventListener('click',e=>{if(e.target.closest('button'))return;if(G.classList.contains('s-done'))return;gxClear();if(gacha)G.style.setProperty('--oc',R.col);G.classList.add('s-shake','s-glow','s-open','s-res','s-cards','s-done','s-skip')});
};
