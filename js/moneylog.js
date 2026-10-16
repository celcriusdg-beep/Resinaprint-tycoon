/* Money log (4.28): every euro in and out, grouped per game hour and category, so big jumps are easy to explain.
   Also a Copy save button for sharing a save when something looks wrong. */
const mlogOf=()=>S.mlog||(S.mlog=[]);
function mlogAdd(cat,a){
  if(!a||!S||simulating&&awayMode&&Math.abs(a)<1)return;
  const L=mlogOf(),hit=L.slice(0,40).find(x=>x.d===S.day&&x.h===S.hour&&x.c===cat&&Math.sign(x.a)===Math.sign(a));
  if(hit){hit.a+=a;hit.n++}
  else{L.unshift({d:S.day,h:S.hour,c:cat,a,n:1});if(L.length>120)L.length=120}
}
const _earnML=earn;earn=function(cat,a){const c0=S.cash;const r=_earnML(cat,a);mlogAdd(cat,S.cash-c0);return r};
const _spendML=spend;spend=function(cat,a){const c0=S.cash;const r=_spendML(cat,a);mlogAdd(cat,S.cash-c0);return r};
function mlogView(){
  const L=mlogOf(),big=[...L].filter(x=>x.d>=S.day-1).sort((x,y)=>Math.abs(y.a)-Math.abs(x.a)).slice(0,5);
  const row=x=>`<div class="item ml-row"><span class="logd">D${x.d} ${String(x.h).padStart(2,'0')}h</span><div class="grow"><div class="t">${x.c}${x.n>1?` <small>×${x.n}</small>`:''}</div></div><b class="num ${x.a>=0?'good':'bad'}">${x.a>=0?'+':'−'}${fmt(Math.abs(x.a))}</b></div>`;
  let h=label('Money log','every change to your cash, newest first');
  if(!L.length)return h+`<div class="card"><div class="s">Nothing yet. Money coming in and going out shows up here.</div></div>`;
  if(big.length)h+=`<div class="card ml-big"><div class="t">Biggest moves since yesterday</div>${big.map(x=>`<div class="ml-b"><span>${x.c} <small>D${x.d} ${x.h}h</small></span><b class="${x.a>=0?'good':'bad'}">${x.a>=0?'+':'−'}${fmt(Math.abs(x.a))}</b></div>`).join('')}</div>`;
  h+=`<div class="group ml-list">${L.slice(0,mlogMore?120:25).map(row).join('')}</div>`;
  if(L.length>25)h+=`<div class="opts"><button class="btn sm ghost" data-a="mlogMore">${mlogMore?'Show less':`Show all ${L.length}`}</button></div>`;
  return h;
}
let mlogMore=false;
Object.assign(A,{
  mlogMore(){mlogMore=!mlogMore},
  copySave(){const j=JSON.stringify(S);const ok=()=>toast(`Save copied (${Math.round(j.length/1024)} kB). Paste it in the chat.`);
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(j).then(ok,()=>saveBox(j));else saveBox(j)}
});
function saveBox(j){modal(`<h3>Your save</h3><p>Select all of this text and copy it.</p><textarea readonly style="width:100%;height:220px;font-size:11px;border-radius:12px;background:#0006;color:inherit;border:1px solid var(--hair);padding:8px">${j.replace(/</g,'&lt;')}</textarea><div class="acts"><button class="btn primary" data-choice="0">Done</button></div>`);pending=[{f:()=>{}}];const t=document.querySelector('#modalRoot textarea');if(t){t.focus();t.select()}}
/* Empire › Company gets the log and the copy button at the bottom */
const _cvML=companyView;companyView=function(){return _cvML.apply(this,arguments)+mlogView()+`<div class="card" style="margin-top:12px"><div class="t">Share your save</div><div class="s" style="margin-top:4px">Copies your whole save as text, for a bug report.</div><div class="opts"><button class="btn sm" data-a="copySave">Copy save</button></div></div>`};
