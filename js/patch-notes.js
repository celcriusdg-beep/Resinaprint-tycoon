/* Version number and patch notes popup. */
/* ---------- 2.0: levels, trends, difficulty, stats, themes, patch notes ---------- */
const VERSION='2.1';
const PATCH_TITLE='Resinaprint 2.1 · 3D Update';
const PATCH=[
 {h:'New',i:[
  '<b>3D view.</b> Tap any printer or figure picture (the little 3D badge) to open it in 3D. Drag to turn it around. Printers glow while they print, figures stand on a glowing base.',
  '<b>Auto-deliver contracts.</b> Each contract has an Auto-deliver button. Your stock stays held for it and it is sent the moment all figures are ready.',
  '<b>Everything from 2.0:</b>',
  '<b>Studio level.</b> Every figure you ship earns XP. Each level pays cash, adds a little demand (up to +30%), and every 5th level gives +10 max energy.',
  '<b>Trending products.</b> Each week one of your figures is hot (+45% demand) and another cools off (−30%). Check the chips on the Studio tab and plan your printers around it.',
  '<b>Difficulty.</b> Chill, Normal or Hard. It changes demand, wages, failures and how hard bad events hit. Find it under Empire › More.',
  '<b>Stats screen.</b> Best sellers, deliveries, peak cash and more under Empire › More.',
  '<b>Colour themes.</b> Resin amber, Sakura, Mint and Ice.',
  '<b>Pictures.</b> Every printer and every product now has its own picture, and Ahri and the garage kit use your real photos.'
 ]},
 {h:'Improved',i:[
  'Whole new look: glass cards, gradient buttons, a floating tab bar, bigger printer pictures and a glowing card while a printer is running.',
  'Printers and products are drawn per model, in elegant anime style instead of chibi.',
  'This patch-notes popup shows once per update. You can read it again under Empire › More.'
 ]},
 {h:'Fixed',i:[
  'Printers with a small vat (like the Sonic Mighty Revo) can be refilled and started again. Batches never exceed the vat size.',
  'Contracts only appear for figures you list and still make.'
 ]}
];
function patchHTML(){return `<div class="kicker">Update ${VERSION}</div><h3>${PATCH_TITLE}</h3><p>New update! Here is what changed.</p>${PATCH.map(g=>`<div class="pn"><h4>${g.h}</h4><ul>${g.i.map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}<div class="acts"><button class="btn primary" data-choice="0">Let's go</button></div>`}
const patchDue=()=>!!S&&S.started&&!S.over&&S.seenVer!==VERSION;
function showPatch(after){pending=[{f:()=>{S.seenVer=VERSION;if(typeof after==='function')after()}}];modal(patchHTML())}
function maybePatchNotes(){
  if(!S||!S.started||S.over||S.seenVer===VERSION)return;
  if(Date.now()-(S.lastT||0)>4000){setTimeout(maybePatchNotes,500);return}
  if(modalOpen()){if(!queue.some(q=>q.patch))queue.push({patch:1});return}
  showPatch();
}

