/* Offline & the bank (4.9): coming back should never feel like a punishment.
   - Away time runs at a fifth of live speed and is capped (12 game hours, growing with your level to 48).
   - The shop closes itself before it would run into debt, and nobody quits while you are away.
   - The bank never ends your run: if cash drops too low it gives a rescue loan that is only repaid when you can afford it. */
const AWAY_SLOW=5;
const awayCap=()=>Math.min(48,12+2*Math.max(0,(S.lv||1)-1));
function bankRescue(){
  if(S.cash>=-1500)return;
  if(typeof perk==='function'&&perk('phoenix')&&!S.phx){S.phx=1;S.cash=300;log('The Phoenix perk burned away your debts. One chance used.','amber');return}
  const amt=Math.round(-S.cash+1000);
  const L=(S.loans=S.loans||[]).find(l=>l.key==='rescue');
  if(L){L.bal+=amt;L.p0=L.bal;L.n0=10;L.n=10}
  else S.loans.push({id:nid(),key:'rescue',name:'Bank rescue loan',bal:amt,p0:amt,n0:10,n:10,rate:.001,pct:0});
  earn('Loan',amt);
  log(`The bank stepped in with a ${fmt(amt)} rescue loan. You repay it weekly, only when you have the cash.`,'amber');
  if(!S.rescueSeen){S.rescueSeen=1;if(typeof notice==='function')try{notice('The bank stepped in',`You ran out of money, so the bank lent you ${fmt(amt)} to keep going. It is repaid in small weekly parts, and skipped in weeks you cannot afford it. Your run continues.`)}catch(e){}}
}
gameOver=function(){S.over=false;bankRescue();save();render()};
liveTick=function(){
  if(!S||!S.started)return;
  if(S.over){S.over=false;bankRescue()}
  const now=Date.now();let gap=now-(S.lastT||now);S.lastT=now;
  if(gap<=0)return;
  if(S.paused||modalOpen())return;
  if(gap>4000){
    const want=gap/HOUR_MS/AWAY_SLOW,cap=awayCap(),h=Math.min(cap,want);
    S.rep=newRep(S);S.rep.hours=h;
    const cash0=S.cash;let done=0,closed=false;
    awayMode=true;
    try{while(done<h-1e-9){const st=Math.min(1,h-done);advance(st);done+=st;if(S.cash<0&&S.cash<cash0){closed=true;break}}}
    finally{awayMode=false}
    if(S.over){S.over=false;bankRescue()}
    S.lastT=Date.now();S.rep.hours=done;
    save();render();
    const note=[];
    if(want>cap+.01)note.push(`You were away longer than your shop can run alone. It ran for <b>${Math.round(cap)} game hours</b> (the limit grows with your level), then waited for you.`);
    if(closed)note.push(`Cash ran low, so the shop <b>closed early</b> after ${Math.max(1,Math.round(done))} hours to keep you out of debt.`);
    const go=()=>{if(done>=.5){showAway(done);if(note.length){const sh=document.querySelector('.sheet');if(sh)sh.insertAdjacentHTML('afterbegin',`<div class="awaynote">${note.join('<br>')}</div>`)}}else nextQueued()};
    if(patchDue())showPatch(go);else go();
    return;
  }
  const dt=gap/HOUR_MS;
  simulating=true;let left=dt;try{while(left>1e-9&&!S.over){const d=Math.min(.05,left);sim(d);left-=d}}catch(err){reportError(err)}finally{simulating=false}
  if(S.over){S.over=false;bankRescue()}
  S.lastT=Date.now();
  if(now-(liveTick.saved||0)>10000){liveTick.saved=now;save()}
  render();
  if(queue.length)nextQueued();
};
