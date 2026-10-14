/* Shop hub (3.7): one place for everything you can buy that is not a worker or a machine. */
const SHOP_ICO={
  printers:'<rect x="3" y="3" width="10" height="11" rx="1.5"/><path d="M5 6h6M8 6v4M5.5 12h5"/>',
  resin:'<path d="M6 1.5h4M6.5 1.5v3L4 8v5.5h8V8L9.5 4.5v-3M4 10h8"/>',
  gear:'<circle cx="8" cy="8" r="2.4"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>',
  space:'<path d="M2 14V6l6-4 6 4v8M6 14V9h4v5"/>',
  skill:'<circle cx="8" cy="3" r="1.8"/><circle cx="3.5" cy="12" r="1.8"/><circle cx="12.5" cy="12" r="1.8"/><path d="M8 4.8v3M8 7.8L4.3 10.4M8 7.8l3.7 2.6"/>',
  stores:'<path d="M2 6l1-4h10l1 4M2 6v8h12V6M2 6h12M6 14V9h4v5"/>',
  carriers:'<path d="M1.5 4h8v7h-8zM9.5 7h3l2 2.2V11h-5"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="11.5" cy="12" r="1.5"/>',
  channels:'<path d="M2 9V6l8-3v9zM2 9l1.2 4M12 5.5a3 3 0 0 1 0 3.5"/>'
};
function shopTiles(){
  const printersOk=Object.keys(PRINTERS).filter(t=>!printerLock(PRINTERS[t])&&PRINTERS[t].cost<=S.cash).length;
  const upBuy=typeof nodeState==='function'?UPGRADES.filter(u=>u.br&&nodeState(u)==='buy').length:0;
  const upOwn=UPGRADES.filter(u=>u.br&&S.up[u.id]).length,upTot=UPGRADES.filter(u=>u.br).length;
  const storesOpen=Object.keys(STORES).filter(k=>!(S.stores&&S.stores[k])).length;
  return [
    {k:'printers',n:'Printers',d:`${S.printers.length} of ${space().printers} spots`,badge:S.printers.length<space().printers?printersOk:0,col:'#9d89ff'},
    {k:'resin',n:'Resin & supplies',d:'Bottles, cartridges, pellets',col:'#5bd6a6'},
    {k:'gear',n:'Gear & moulds',d:`${WASHERS[S.washer].name}`,col:'#f0a53a'},
    {k:'space',n:'Space & permits',d:SPACES[S.ws].name,col:'#cfc7b6'},
    {k:'skill',n:'Upgrades',d:`Skill tree · ${upOwn} of ${upTot}`,badge:upBuy,col:'#ff7fa8',big:1},
    {k:'stores',n:'Stores',d:storesOpen?`${storesOpen} to open`:'All open',col:'#5aa6ff'},
    {k:'carriers',n:'Carriers',d:'Who ships your parcels',col:'#ff8a5c'},
    {k:'channels',n:'Media & channels',d:'Channels, hype, sales, campaigns',col:'#7ff3ff'}
  ];
}
function shopHub(){
  let h=label('Shop',`${fmt(S.cash)} to spend`)+`<div class="card" style="margin-bottom:12px"><div class="s">Everything you can buy for your studio, in one place. Pick a catalogue. Workers and machines are in the Team tab.</div></div><div class="shopgrid">`;
  for(const t of shopTiles())h+=`<button class="stile${t.big?' wide':''}" data-a="shopGo" data-k="${t.k}" style="--c:${t.col}"><span class="sico"><svg viewBox="0 0 16 16" aria-hidden="true">${SHOP_ICO[t.k]}</svg></span><span class="stt"><b>${t.n}</b><small>${t.d}</small></span>${t.badge?`<em class="sbadge">${t.badge} ready</em>`:''}</button>`;
  return h+'</div>';
}
function shopBack(label_){
  return `<div class="shopbar"><button class="btn sm" data-a="shopGo" data-k="hub">← Shop</button><b>${label_}</b><span class="s">${fmt(S.cash)}</span></div>`;
}
Object.assign(A,{shopGo(d){
  const k=d.k;
  if(k==='skill'){openSkill();return}
  sub.buy=k;window.scrollTo({top:0});
}});
/* the Buy tab becomes the Shop: hub first, then each catalogue with a way back */
const _vBuy0=vBuy;
vBuy=function(){
  if(!['printers','resin','gear','space','stores','carriers','channels'].includes(sub.buy))return shopHub();
  const names={printers:'Printers',resin:'Resin & supplies',gear:'Gear & moulds',space:'Space & permits',stores:'Stores',carriers:'Carriers',channels:'Media & channels'};
  if(sub.buy==='stores')return shopBack(names.stores)+storesView();
  if(sub.buy==='carriers')return shopBack(names.carriers)+`<div class="card" style="margin-top:12px"><div class="s">Pick the carriers you want to ship with. Choose which one handles which country in Orders › Delivery.</div></div>`+carriersView();
  if(sub.buy==='channels')return shopBack(names.channels)+`<div class="card" style="margin-top:12px"><div class="s">Where customers find you, plus your hype, site-wide sale, social accounts and campaigns.</div></div>`+channelsView()+mediaView();
  return shopBack(names[sub.buy])+_vBuy0();
};
VIEWS.buy=vBuy;
/* tapping the Shop tab again goes back to the hub */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-tab]');if(b&&b.dataset.tab==='buy'&&tab==='buy')sub.buy='hub'},true);
