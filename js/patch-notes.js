/* Version number and patch notes popup. */
/* ---------- 2.0: levels, trends, difficulty, stats, themes, patch notes ---------- */
const VERSION='2.8';
const PATCH_TITLE='Resinaprint 2.8 · Restart & Cutouts';
const PATCH=[
 {h:'New in 2.8',i:[
  '<b>Restart options.</b> Empire › More now has Restart this run (keeps shards, perks, branches and the vault) and Delete everything (asks twice).',
  'Going bankrupt no longer wipes your shards, perks or vault.',
  'Printer and figure photos are cut out, with no white background.'
 ]},
 {h:'New in 2.7',i:[
  '<b>Real photos.</b> Printers and figures now show official product photos. The Laboratorium printers keep their drawings.'
 ]},
 {h:'New in 2.6',i:[
  '<b>New look.</b> Flatter and warmer: solid colours, chunky buttons, a plain bottom tab bar and new fonts.',
  'The fonts now come with the game, so it looks the same offline.'
 ]},
 {h:'New in 2.5',i:[
  '<b>3D world.</b> Each rebirth you pick a country on a globe: Netherlands, Japan, USA, Germany, UK, Brazil, Australia or South Korea.',
  '<b>Country rules.</b> Demand, rent, wages, shipping, resin and tax change per country, and each one favours certain figures. A country you have not opened before gives bonus Resin Shards.',
  '<b>Branches.</b> Your old company stays open, pays out every day and gives a permanent perk. Map: Empire › Rebirth › World.'
 ]},
 {h:'New in 2.4',i:[
  '<b>Rebirth.</b> At a company value of €1.000.000 you can restart in the hok and earn <b>Resin Shards</b>.',
  '<b>Perks.</b> Spend shards on permanent bonuses in Empire › Rebirth.',
  'Shards, perks and the vault are kept. Everything else resets.'
 ]},
 {h:'New in 2.3',i:[
  '<b>Laboratorium.</b> A new level of printers in Buy › Printers. Eight machines beyond PolyJet and injection moulding: <b>Aurora Photonic Forge, Helix Volumetric V1, Nebula Holo-Press, Chronos Time-Lattice, Valkyrie Quantum Caster, Leviathan Mega-Forge, Singularity Nano-Assembler</b> and the <b>Omega Genesis Engine</b>. They make every product with no moulds and no washing, in huge batches, with almost no failures and a quality bonus.',
  'To unlock them you need an industrial unit, the 3-phase power connection and the new <b>Laboratorium wing</b> (Buy › Space). They use new Laboratorium resins.',
  '<b>Chests now give printers and free upgrades</b> too. Rarer chests give bigger printers, and Cosmic and Ethern chests can give a Laboratorium printer.'
 ]},
 {h:'New in 2.2',i:[
  '<b>The Vault.</b> Every level-up now earns a chest. Open it in Empire › Vault (or from the Studio tab) for cash, energy, hype, resin and temporary demand boosts.',
  '<b>10 rarities.</b> Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine, Celestial, Cosmic and finally <b>Ethern</b>. The rarer it is, the wilder it looks. A higher studio level means better luck, and every 5th level gives a crate with better odds.',
  'Saves from before 2.2 get a chest for each level you already reached.'
 ]},
 {h:'New in 2.1',i:[
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
function patchHTML(){return `<div class="kicker">Update ${VERSION}</div><h3>${PATCH_TITLE}</h3><p>What changed:</p>${PATCH.map(g=>`<div class="pn"><h4>${g.h}</h4><ul>${g.i.map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}<div class="acts"><button class="btn primary" data-choice="0">Let's go</button></div>`}
const patchDue=()=>!!S&&S.started&&!S.over&&S.seenVer!==VERSION;
function showPatch(after){pending=[{f:()=>{S.seenVer=VERSION;if(typeof after==='function')after()}}];modal(patchHTML())}
function maybePatchNotes(){
  if(!S||!S.started||S.over||S.seenVer===VERSION)return;
  if(Date.now()-(S.lastT||0)>4000){setTimeout(maybePatchNotes,500);return}
  if(modalOpen()){if(!queue.some(q=>q.patch))queue.push({patch:1});return}
  showPatch();
}

