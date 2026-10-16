/* Rebirth boost (4.25): every rebirth adds a permanent +10% to all income. Rebirth boost I, II, III, IV and so on.
   Loans, refunds, sales of your own equipment and rewards are not income, so they are not boosted. */
const RB_SKIP=['Loan','Investor','BTW refund','Refund','Refunds','Research refund','Machine sales','Printer sales','Vehicle sale','Showroom','Vault rewards','Daily reward','Level rewards','Quest rewards','Subsidy','Interest'];
const rbLevel=()=>(S&&S.reb&&S.reb.count)||0;
const rbMult=()=>1+.1*rbLevel();
function roman(n){if(n<=0)return '0';const t=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let s='';for(const [v,r] of t)while(n>=v){s+=r;n-=v}return s}
const rbName=n=>`Rebirth boost ${roman(n)}`;
const _earnRB=earn;earn=function(cat,a){if(a>0&&rbLevel()&&!RB_SKIP.includes(cat)){const x=a*(rbMult()-1);a+=x;if(S.rep)S.rep.rbx=(S.rep.rbx||0)+x;S.rbTot=(S.rbTot||0)+x}return _earnRB(cat,a)};
const _rbRB=doRebirth;doRebirth=function(d){const g=_rbRB(d);const n=rbLevel();if(n){log(`${rbName(n)}: all income is now +${n*10}% for good.`,'good');if(typeof toast==='function'&&!awayMode)setTimeout(()=>toast(`${rbName(n)} · +${n*10}% income`),600)}return g};
function rbCard(){
  const n=rbLevel(),pips=Math.min(n+1,12);
  return `<div class="card rb-card ${n?'on':''}"><div class="rb-badge"><span>${n?roman(n):'—'}</span></div><div class="grow"><div class="t">${n?rbName(n):'Rebirth boost'}</div>
    <div class="s">${n?`<b class="good">+${n*10}%</b> on all income, for good. Every rebirth adds another 10%.`:'Your first rebirth gives a permanent +10% on all income. Every rebirth after that adds another 10%.'}</div>
    <div class="rb-pips">${Array.from({length:pips},(_,i)=>`<i class="${i<n?'on':''}" title="${rbName(i+1)}">${roman(i+1)}</i>`).join('')}</div>
    <div class="s" style="margin-top:6px">${n?`Next: ${rbName(n+1)} · +${(n+1)*10}%`:`Next: ${rbName(1)} · +10%`}${S.rbTot?` · earned ${fmt(S.rbTot)} extra this run`:''}</div></div></div>`;
}
const _rvRB=rebirthView;rebirthView=function(){const h=_rvRB.apply(this,arguments),i=h.indexOf('<div class="card shardcard">');return i<0?rbCard()+h:h.slice(0,i)+rbCard()+h.slice(i)};
