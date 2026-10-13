/* Energy revamp (2.9): faster base regen, percentage bonuses for max energy and regen, stronger drinks, a breakdown card. */
FXT.emp=v=>`+${Math.round(v*100)}% max energy`;
FXT.rgp=v=>`+${Math.round(v*100)}% energy regen`;
FXT.drk=v=>`+${v} energy drink${v>1?'s':''} a day`;
FXT.drp=v=>`Energy drinks ${Math.round(v*100)}% stronger`;
const wsN=n=>({req:()=>S.ws>=n,reqText:'Needs the '+SPACES[n].name.toLowerCase()});
UPGRADES.push(
  mkU2('ep1','energy','Water bottle on the desk',120,{emp:.05}),
  mkU2('ep2','energy','Ergonomic stool',200,{rgp:.05}),
  mkU2('ep3','energy','Protein shakes',350,{emp:.08}),
  mkU2('ep4','energy','Fixed sleep schedule',400,{rgp:.08}),
  mkU2('ep5','energy','Drinks fridge',450,{drk:1,drp:.25}),
  mkU2('ep6','energy','Stretch breaks',600,{rgp:.06,emp:.04}),
  mkU2('ep7','energy','Cold showers',800,{emp:.10}),
  mkU2('ep8','energy','Sunrise alarm',900,{rgp:.10,nr:.1}),
  mkU2('ep9','energy','Personal trainer',1500,{emp:.12,rgp:.06},soldN(100)),
  mkU2('ep10','energy','Meal subscription',2200,{rgp:.12},wsN(1)),
  mkU2('ep11','energy','Sleep lab visit',3500,{rgp:.15,nr:.2},wsN(1)),
  mkU2('ep12','energy','Bio-monitor wristband',5000,{emp:.15}),
  mkU2('ep13','energy','Focus coach',7000,{emp:.10,rgp:.10},staffN(2)),
  mkU2('ep14','energy','Barista machine',9000,{drk:2,drp:.5},wsN(2)),
  mkU2('ep15','energy','Longevity clinic',12000,{emp:.20},wsN(2)),
  mkU2('ep16','energy','Recovery suite',18000,{rgp:.20},wsN(2)),
  mkU2('ep17','energy','Peak performance programme',35000,{emp:.25,rgp:.25},wsN(3)),
  mkU2('ep18','energy','Powered exosuit',80000,{emp:.30,rgp:.30,ec:.05},wsN(4)),
  mkU2('ep19','energy','Energy singularity',250000,{emp:.50,rgp:.50},wsN(5))
);
/* ---- the numbers ---- */
const BASE_REGEN=18;
const lvRegen=()=>Math.min(.5,.005*(((S&&S.lv)||1)-1));
const flatMaxE=()=>200+lvEnergy()+perk('en')*10+(hasBranch('au')?10:0)+UPGRADES.reduce((a,u)=>a+(S.up[u.id]&&u.e?u.e:0),0);
const pctMaxE=()=>Math.min(3,upv('emp'));
const pctRegen=()=>Math.min(3,upv('rgp'))+lvRegen();
const regenDay=()=>(BASE_REGEN+upv('rg'))*(1+pctRegen());
const drinkMax=()=>3+upv('drk')+upv('dr');
const drinkAmt=()=>Math.round(Math.max(30,.15*maxE())*(1+upv('drp')));

function energyCard(){
  const flat=flatMaxE(),pm=pctMaxE(),pr=pctRegen(),r=regenDay();
  const row=(a,b)=>`<div class="kv" style="margin:6px 0 0"><span>${a}</span><b>${b}</b></div>`;
  return `<div class="card" style="margin-bottom:14px"><div class="t">Your energy</div>
  ${row('Max energy',`${maxE()} <span class="f">(${flat} base${pm?` × ${(1+pm).toFixed(2)}`:''})</span>`)}
  ${row('Regen per hour (day / night)',`${regenDay().toFixed(1)} / ${(regenDay()*(1.5+upv('nr'))).toFixed(1)} <span class="f">(${BASE_REGEN+upv('rg')} base${pr?` × ${(1+pr).toFixed(2)}`:''})</span>`)}
  ${row('Empty to full',`${(maxE()/r).toFixed(1)} h`)}
  ${row('Energy drink',`+${drinkAmt()} · ${S.drinks}/${drinkMax()} today`)}
  <div class="s" style="margin-top:10px">Percentage upgrades stack and apply to everything: max energy and regen. Studio level adds +0.5% regen per level, up to +50%.</div></div>`;
}
