/* Skill tree: every upgrade is a node in a branch. A node opens when any node linked above it is owned (anything you already own keeps its row open). */
const BRANCHES=[
  {id:'energy',n:'Energy',col:'#5bd6a6',gated:1},{id:'prod',n:'Production',col:'#9d89ff',gated:1},{id:'sales',n:'Sales',col:'#f0a53a',gated:1},
  {id:'team',n:'Team',col:'#ff7fa8',gated:1},{id:'biz',n:'Business',col:'#5aa6ff',gated:1},{id:'social',n:'Media',col:'#ff8a5c'},{id:'site',n:'Site',col:'#cfc7b6'}
];
const ROW_W=[1,3,4,4,3],LANE=54,ROW_H=64,R0=210,TREE_C=2000;
const UBY={};UPGRADES.forEach(u=>UBY[u.id]=u);
(function buildTree(){
  BRANCHES.forEach((B,bi)=>{
    const list=UPGRADES.filter(u=>u.cat===B.id).sort((a,b)=>a.cost-b.cost),rows=[];
    let i=0,r=0;while(i<list.length){const w=Math.min(ROW_W[r%ROW_W.length],list.length-i);rows.push(list.slice(i,i+w));i+=w;r++}
    const ang=(-90+bi*360/BRANCHES.length)*Math.PI/180,dx=Math.cos(ang),dy=Math.sin(ang),px=-dy,py=dx;
    B.ang=ang;B.rows=rows.length;B.total=list.length;
    rows.forEach((row,ri)=>row.forEach((u,ci)=>{
      u.br=B;u.row=ri;u.col=ci;u.w=row.length;
      const lat=(ci-(row.length-1)/2)*LANE,rad=R0+ri*ROW_H;
      u.x=TREE_C+dx*rad+px*lat;u.y=TREE_C+dy*rad+py*lat;u.key=ri>0&&row.length===1;
      u.par=[];
      if(ri>0){const prev=rows[ri-1],pu=(ci+.5)/row.length;
        const sc=prev.map((p,j)=>({p,d:Math.abs((j+.5)/prev.length-pu)})).sort((a,b)=>a.d-b.d);
        const k=row.length===1?prev.length:prev.length===1?1:2;sc.slice(0,k).forEach(s=>u.par.push(s.p.id))}
    }));
  });
})();
const treeOpen=u=>{
  if(!u.br||!u.br.gated||!u.row)return true;
  return u.par.some(id=>S.up[id])||UPGRADES.some(x=>x.cat===u.cat&&x.row>=u.row&&S.up[x.id]);
};
UPGRADES.forEach(u=>{
  const r0=u.req,t0=u.reqText;
  Object.defineProperty(u,'req',{value:()=>treeOpen(u)&&(!r0||r0()),writable:true,configurable:true});
  Object.defineProperty(u,'reqText',{get:()=>treeOpen(u)?(t0||''):`Own ${u.par.map(id=>UBY[id].name).slice(0,2).join(' or ')} first`,configurable:true});
});
/* list view (below the tree card): the same rows, as plain lists */
const TIER_NAMES=['Basics','Improvements','Pro gear','Expert tools','Master class','Legendary','Mythic','Beyond','Endgame','Final'];
function treeItems(cat){
  const list=UPGRADES.filter(u=>u.cat===cat).sort((a,b)=>a.cost-b.cost),rows={};
  list.forEach(u=>(rows[u.row]=rows[u.row]||[]).push(u));
  let h='';
  for(const t of Object.keys(rows).map(Number)){
    const us=rows[t],open=us.some(u=>treeOpen(u)),own=us.filter(u=>S.up[u.id]).length;
    h+=`<div class="trow ${open?'open':'shut'}"><div class="tnode"><i>${own===us.length?'✓':t+1}</i><b>Row ${t+1}</b><span>${open?`${own} of ${us.length} owned`:'locked'}</span></div><div class="group">`;
    h+=us.map(U=>{const o=S.up[U.id],ok=!U.req||U.req();
      return item(U.name,o||ok?U.desc:`<span class="f">${U.reqText}</span>`,o?'<span class="chip good">Owned</span>':`<button class="btn sm primary" data-a="upgrade" data-k="${U.id}" ${!ok||S.cash<U.cost?'disabled':''}>${fmt(U.cost)}</button>`)}).join('');
    h+='</div></div>';
  }
  return h;
}
