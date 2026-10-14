/* Event wiring and game start. */
document.addEventListener('click',e=>{
  const tb=e.target.closest('[data-tab]');if(tb){tab=tb.dataset.tab;render();window.scrollTo({top:0});return}
  const ch=e.target.closest('[data-choice]');if(ch){if(ch.disabled)return;const o=pending[+ch.dataset.choice];pending=[];closeModal();o&&o.f&&o.f();save();render();nextQueued();return}
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
  if(modalOpen())return;
  A[b.dataset.a]({...b.dataset});
  if(b.dataset.a!=='endDay'&&b.dataset.a!=='wait'){if(b.dataset.a!=='togglePr'&&b.dataset.a!=='sub')save();render()}
  if(b.dataset.a==='sub')window.scrollTo({top:0});
});
document.addEventListener('change',e=>{
  const ck=e.target.closest('[data-chk]');if(ck){const p=S.printers.find(x=>x.id==ck.dataset.id);if(p){p[ck.dataset.chk]=ck.checked;save();render()}return}
  const sh=e.target.closest('[data-ship]');if(sh){S.ship[sh.dataset.ship]=sh.value;save();render();return}
  const s=e.target.closest('[data-sel]');if(!s)return;const p=S.printers.find(x=>x.id==s.dataset.id);if(!p||p.state==='printing')return;
  if(s.dataset.sel==='prod')p.prod=s.value;
  else if(s.value!==p.resin){if(!PRINTERS[p.type].form&&p.vat>0){S.resin[p.resin]=(S.resin[p.resin]||0)+p.vat;p.vat=0;toast('Vat drained back into its bottle')}p.resin=s.value}
  save();render();
});

function start(data){
  S=(data&&data.S&&data.S.v===2&&patch(data.S))||load()||fresh();
  if(!S.offers.length&&!S.contracts.length)refreshOffers();
  if(S.started&&!S.trend)newTrend();
  if(data&&data.tab)tab=data.tab;
  render();
  if(S.over)gameOver();else if(!S.started)intro();
  initCloud().finally(()=>setTimeout(maybePatchNotes,350));
  setInterval(liveTick,250);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S&&S.started&&!modalOpen()){S.lastT=Date.now();save()}});
}
window.claude?.hot?.snapshot?.(()=>({S,tab}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});

/* If something throws, show it instead of silently freezing, and keep the clock from getting stuck. */
let lastErr='';
function reportError(err){
  const msg=(err&&err.message)||String(err);if(S)S.lastT=Date.now();
  if(msg===lastErr)return;lastErr=msg;console.error(err);
  let bar=document.getElementById('errbar');
  if(!bar){bar=document.createElement('div');bar.id='errbar';bar.style.cssText='position:fixed;left:8px;right:8px;bottom:78px;z-index:99;background:#7a1f1a;color:#fff;border-radius:10px;padding:10px 12px;font:12px/1.35 system-ui;box-shadow:0 4px 18px #0008';document.body.appendChild(bar)}
  bar.innerHTML='<b>Something broke:</b> '+msg.replace(/</g,'&lt;')+' <u onclick="this.parentNode.remove();lastErr=\'\'" style="margin-left:6px">Dismiss</u>';
}
addEventListener('error',e=>reportError(e.error||e.message));
addEventListener('unhandledrejection',e=>reportError(e.reason));
