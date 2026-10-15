/* IP licences, part 2 (4.15): buying a figure node lists the product right away, old saves get fair prices,
   and players who already had the old licensing deal keep League of Legends. */
const _upg9=A.upgrade;
A.upgrade=function(d){
  const U=UPGRADES.find(u=>u.id===d.k),had=U&&S.up[U.id];
  _upg9(d);
  if(!U||had||!S.up[U.id]||(U.cat!=='ip'&&U.cat!=='props'))return;
  if(U.ipKey){const k=U.ipKey;S.listed[k]=true;if(!(S.prices[k]>0))S.prices[k]=PRODUCTS[k].ref;
    toast(`${PRODUCTS[k].name} is in your catalogue`);if(typeof snd==='function')snd('perk');if(typeof confetti==='function')confetti(30)}
  else if(U.cat==='props'){log('The prop workshop is open. Unlock replicas in the Props branch.','amber');if(typeof confetti==='function')confetti(70);if(typeof snd==='function')snd('level')}
  else{const G=IP_GAMES.find(g=>'ip_'+g.id===U.id);if(G){log(`You bought the ${G.game} licence from ${G.co}. Its figures are now in the skill tree.`,'amber');if(typeof confetti==='function')confetti(70);if(typeof snd==='function')snd('level')}}
};
const _patch9=patch;
patch=function(s){
  _patch9(s);
  for(const k of [...Object.keys(IP_BY),...PROP_KEYS]){const P=PRODUCTS[k];if(s.prices&&(s.prices[k]==null||s.prices[k]<P.ref*.5))s.prices[k]=P.ref}
  if(s.up&&s.up.licensing&&!s.ipGrant){s.ipGrant=1;s.up.ip_lol=true}
  return s;
};
