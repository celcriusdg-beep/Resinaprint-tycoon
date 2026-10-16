/* Rebirth balance (4.40). Worth alone made rebirth too easy: branches, stores and the foundry pay into the new run from day 1,
   so a run could hit its goal without building much of a studio. A rebirth now also needs:
   - studio sales this run of at least half the goal (branch, store, foundry and other side income does not count)
   - a minimum run length: 7 days + 3 per rebirth, capped at 30 */
const REB_OUTSIDE=['Branch income','Metal sales','Foundry projects','Store sales','TCG store sales','Card sales','Event entry fees','Theme park','Matter surge','Vented matter'];
if(typeof RB_SKIP!=='undefined'&&!RB_SKIP.includes('Branch income'))RB_SKIP.push('Branch income');
const rebMinDays=()=>Math.min(30,7+3*((S&&S.reb&&S.reb.count)||0));
const rebStudioNeed=()=>Math.round(rebGoal()*.5);
const rebStudio=()=>(S&&S.studioRev)||0;
function rebExtraOk(){return S.day>=rebMinDays()&&rebStudio()>=rebStudioNeed()}
const _earnRBal=earn;earn=function(cat,a){if(a>0&&!REB_OUTSIDE.includes(cat)&&!(typeof RB_SKIP!=='undefined'&&RB_SKIP.includes(cat)))S.studioRev=(S.studioRev||0)+a;return _earnRBal(cat,a)};
const _frRBal=fresh;fresh=function(){const s=_frRBal.apply(this,arguments);s.studioRev=0;return s};
const _patchRBal=patch;patch=function(s){const r=_patchRBal(s),o=r||s;if(o&&o.studioRev==null)o.studioRev=o.revenue||0;return r};
function rebReqCard(){
  const v=value(S),g=rebGoal(),st=rebStudio(),sn=rebStudioNeed(),d=S.day,dn=rebMinDays();
  const row=(ok,t,p,txt)=>`<div class="rq-row"><div class="kv"><span>${ok?'<span class="chip good">Done</span>':'<span class="chip">To do</span>'} ${t}</span><span class="num">${txt}</span></div>${bar(Math.min(100,p*100),ok?'var(--good)':'var(--uv)')}</div>`;
  return `<div class="card rq-card"><div class="t">Rebirth ${rebOf(S).count+1} needs</div><div class="s">Your studio has to earn it: income from branches, stores and the foundry does not count towards studio sales.</div>
    ${row(v>=g,'Company worth',v/g,`${fmt(v)} / ${fmt(g)}`)}
    ${row(st>=sn,'Studio sales this run',st/sn,`${fmt(st)} / ${fmt(sn)}`)}
    ${row(d>=dn,'Days in this run',d/dn,`${d} / ${dn}`)}</div>`;
}
const _rvRBal=rebirthView;rebirthView=function(){const h=_rvRBal.apply(this,arguments),i=h.indexOf('<div class="card shardcard');return i<0?rebReqCard()+h:h.slice(0,i)+rebReqCard()+h.slice(i)};
const _arRBal=A.rebirth;A.rebirth=function(){if(!canRebirth()){if(value(S)<rebGoal())return toast(`Reach a company worth ${fmt(rebGoal())} first`);if(rebStudio()<rebStudioNeed())return toast(`Your studio needs ${fmt(rebStudioNeed())} in sales this run first`);if(S.day<rebMinDays())return toast(`This run has to last ${rebMinDays()} days first`)}return _arRBal.apply(this,arguments)};
