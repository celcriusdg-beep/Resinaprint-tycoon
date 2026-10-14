/* Tech tree: each branch is split into rows. Own any upgrade in a row to open the next one. Anything you already own keeps its row open. */
const TIER_N=4;
UCATS.forEach(([cat])=>UPGRADES.filter(u=>u.cat===cat).sort((a,b)=>a.cost-b.cost).forEach((u,i)=>{u.tier=Math.floor(i/TIER_N)}));
const treeOpen=u=>!u.tier||UPGRADES.some(x=>x.cat===u.cat&&((x.tier===u.tier-1)||x.tier>=u.tier)&&S.up[x.id]);
UPGRADES.forEach(u=>{
  const r0=u.req,t0=u.reqText;
  Object.defineProperty(u,'req',{value:()=>treeOpen(u)&&(!r0||r0()),writable:true,configurable:true});
  Object.defineProperty(u,'reqText',{get:()=>treeOpen(u)?(t0||''):`Own any upgrade in row ${u.tier} first`,configurable:true});
});
const TIER_NAMES=['Basics','Improvements','Pro gear','Expert tools','Master class','Legendary','Mythic','Beyond','Endgame','Final'];
function treeItems(cat){
  const list=UPGRADES.filter(u=>u.cat===cat).sort((a,b)=>a.cost-b.cost),rows={};
  list.forEach(u=>(rows[u.tier]=rows[u.tier]||[]).push(u));
  let h='';
  for(const t of Object.keys(rows).map(Number)){
    const us=rows[t],open=us.some(u=>treeOpen(u)),own=us.filter(u=>S.up[u.id]).length;
    h+=`<div class="trow ${open?'open':'shut'}"><div class="tnode"><i>${own===us.length?'✓':t+1}</i><b>${TIER_NAMES[t]||'Row '+(t+1)}</b><span>${open?`${own} of ${us.length} owned`:`locked · own any upgrade in row ${t}`}</span></div><div class="group">`;
    h+=us.map(U=>{const o=S.up[U.id],ok=!U.req||U.req();
      return item(U.name,o||ok?U.desc:`<span class="f">${U.reqText}</span>`,o?'<span class="chip good">Owned</span>':`<button class="btn sm primary" data-a="upgrade" data-k="${U.id}" ${!ok||S.cash<U.cost?'disabled':''}>${fmt(U.cost)}</button>`)}).join('');
    h+='</div></div>';
  }
  return h;
}
