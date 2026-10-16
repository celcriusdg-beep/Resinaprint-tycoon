/* Moulds (4.22): every product can now be injection moulded, so every figure, licensed figure and prop has its own steel mould.
   The Gear catalogue lists them in tabs per product line with a buy-all button. */
for(const k of PKEYS){PRODUCTS[k].inj0=!!PRODUCTS[k].inj;if(PRODUCTS[k].req!=='retired')PRODUCTS[k].inj=1}
let mouldTab='own';
function mouldGroups(){
  const ks=PKEYS.filter(k=>unlocked(k)&&PRODUCTS[k].inj),g=[{id:'own',n:'Own designs',keys:ks.filter(k=>!PRODUCTS[k].ip&&!PRODUCTS[k].prop)}];
  if(typeof IP_GAMES!=='undefined')for(const G of IP_GAMES){const x=ks.filter(k=>PRODUCTS[k].ip===G.id);if(x.length)g.push({id:G.id,n:G.short,col:G.col,keys:x})}
  const pr=ks.filter(k=>PRODUCTS[k].prop);if(pr.length)g.push({id:'props',n:'Props',col:'#c75bff',keys:pr});
  return g.filter(x=>x.keys.length);
}
Object.assign(A,{
  mouldTab(d){mouldTab=d.k},
  mouldAll(d){const G=mouldGroups().find(x=>x.id===d.k);if(!G)return;const need=G.keys.filter(k=>!S.moulds[k]),c=need.reduce((a,k)=>a+mouldCost(k),0);if(!need.length)return;if(S.cash<c)return toast('Not enough cash');
    spend('Moulds',c);need.forEach(k=>S.moulds[k]=true);log(`Bought ${need.length} steel moulds for ${G.n} for ${fmt(c)}.`,'good');toast(`${need.length} moulds bought`);if(typeof snd==='function')snd('buy');if(typeof confetti==='function')confetti(30)}
});
function mouldView(){
  const G=mouldGroups();if(!G.length)return '';if(!G.some(g=>g.id===mouldTab))mouldTab=G[0].id;
  const cur=G.find(g=>g.id===mouldTab),own=PKEYS.filter(k=>S.moulds[k]&&PRODUCTS[k].inj).length,tot=G.reduce((a,g)=>a+g.keys.length,0);
  const need=cur.keys.filter(k=>!S.moulds[k]),allC=need.reduce((a,k)=>a+mouldCost(k),0);
  let h=label('Injection moulds',`${own} of ${tot} owned`);
  h+=`<div class="cat-tabs">${G.map(g=>`<button class="${g.id===mouldTab?'on':''}" data-a="mouldTab" data-k="${g.id}" ${g.col?`style="--tc:${g.col}"`:''}>${g.n}<span>${g.keys.filter(k=>S.moulds[k]).length}/${g.keys.length}</span></button>`).join('')}</div>`;
  h+=`<div class="group">${cur.keys.map(k=>`<div class="item">${artBox(prodArt(k),'cm-art','',['f',k])}<div class="grow"><div class="t">${PRODUCTS[k].name}</div><div class="s">${S.moulds[k]?'Ready for the injection machine':`Steel mould · parts need no washing`}</div></div>${S.moulds[k]?'<span class="chip good">Owned</span>':price('mould',k,mouldCost(k),S.cash<mouldCost(k))}</div>`).join('')}</div>`;
  if(need.length>1)h+=`<div class="opts" style="margin-top:10px"><button class="btn sm primary" data-a="mouldAll" data-k="${cur.id}" ${S.cash<allC?'disabled':''}>Buy all ${need.length} ${cur.n} moulds · ${fmt(allC)}</button></div>`;
  return h;
}
