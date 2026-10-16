/* Rebirth gates (4.26): better printer and machine generations open with rebirths instead of with cash alone.
   Printers: Desktop and Pro from the start, Large after 1 rebirth, Industrial after 2, Laboratorium after 3.
   Machines: Basic and Pro from the start, then one tier per rebirth. You no longer need to own the previous generation. */
const REB_PGRP={2:1,3:2,4:3};
const REB_MTIER={ind:1,adv:2,elite:3,quantum:4,myth:5,apex:6,lab:3,rift:5,eternal:6,omega:7};
const rebN=()=>(S&&S.reb&&S.reb.count)||0;
const rebTxt=n=>`Unlocks after ${n} rebirth${n>1?'s':''}`;
function rebLock(D){const n=REB_PGRP[D.grp];return n&&rebN()<n?rebTxt(n):''}
function machRebNeed(m){return REB_MTIER[machTier(m)]||0}
/* machines: rebirth gate plus the space and wing a tier needs, no previous-generation rule */
machLock=function(m){
  const n=machRebNeed(m);if(n&&rebN()<n)return rebTxt(n);
  const t=machTier(m);
  if(NEW_TIERS.includes(t)&&S.ws<3)return 'Needs a factory hall';
  if(m.lab&&!S.up.labwing)return 'Needs the Laboratorium wing';
  return '';
};
/* the buy action checks the lock too, for anything that bypasses the catalogue */
const _bpRG=A.buyPrinter;if(_bpRG)A.buyPrinter=function(d){const D=PRINTERS[d.k];const w=D&&rebLock(D);if(w)return toast(w);return _bpRG(d)};
/* what the next rebirth opens, shown on the rebirth tab */
function rebNextUnlocks(n){
  const out=[];for(const g in REB_PGRP)if(REB_PGRP[g]===n)out.push(`${PGROUPS[g]} printers`);
  for(const t in REB_MTIER)if(REB_MTIER[t]===n)out.push(`${TIER_LABEL[t]||t} machines`);
  return out;
}
function rebGateCard(){
  const n=rebN(),nx=rebNextUnlocks(n+1),open=[...['Desktop','Pro'].map(x=>x+' printers'),...Object.keys(REB_PGRP).filter(g=>REB_PGRP[g]<=n).map(g=>PGROUPS[g]+' printers')];
  const mOpen=['Basic','Pro',...Object.keys(REB_MTIER).filter(t=>REB_MTIER[t]<=n).map(t=>TIER_LABEL[t]||t)];
  return `<div class="card rg-card"><div class="t">Unlocked by rebirth</div>
    <div class="rg-row"><span>Printers</span><div>${open.map(x=>`<i class="on">${x.replace(' printers','')}</i>`).join('')}${Object.keys(REB_PGRP).filter(g=>REB_PGRP[g]>n).map(g=>`<i>🔒 ${PGROUPS[g]} · ${REB_PGRP[g]}</i>`).join('')}</div></div>
    <div class="rg-row"><span>Machines</span><div>${mOpen.map(x=>`<i class="on">${x}</i>`).join('')}${Object.keys(REB_MTIER).filter(t=>REB_MTIER[t]>n).sort((a,b)=>REB_MTIER[a]-REB_MTIER[b]).map(t=>`<i>🔒 ${TIER_LABEL[t]||t} · ${REB_MTIER[t]}</i>`).join('')}</div></div>
    ${nx.length?`<div class="s" style="margin-top:8px">Next rebirth opens: <b>${nx.join(', ')}</b></div>`:''}</div>`;
}
const _rvRG=rebirthView;rebirthView=function(){const h=_rvRG.apply(this,arguments),i=h.indexOf('<div class="card shardcard">');return i<0?h+rebGateCard():h.slice(0,i)+rebGateCard()+h.slice(i)};
