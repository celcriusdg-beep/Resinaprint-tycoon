/* Version number and patch notes popup. */
/* ---------- 2.0: levels, trends, difficulty, stats, themes, patch notes ---------- */
const VERSION='3.9';
const PATCH_TITLE='Resinaprint 3.9 · Five More Machine Tiers';
const PATCH=[
 {h:'New in 3.9',i:[
  '<b>Five new machine tiers</b> above Industrial: Advanced, Elite, Quantum, Mythic and Apex. 70 new machines, one per job in every tier, with their own colours and glow. Apex machines run up to 9.5 times the speed of a person.',
  'Each tier unlocks when you own a machine of the tier below. Advanced also needs a factory hall. Find them in Team › Machines › Catalogue and filter by tier.',
  'Workers and machines now say why they are waiting (no resin, prints need washing and so on).'
 ]},
 {h:'New in 3.8',i:[
  '<b>A new look.</b> The flat dark page is now a lit workshop at night: lamp and resin glow in the corners, drifting sparks, a vignette, raised glossy panels, a glass header and dock, and glowing section titles.',
  'The glow colour changes with the tab: amber in Studio, blue in Orders, gold in the Shop, pink in Team and violet in Empire. Your colour theme from Empire › More still works.'
 ]},
 {h:'New in 3.7',i:[
  '<b>One Shop for everything you buy.</b> The Buy tab is now the Shop: pick a catalogue (Printers, Resin & supplies, Gear & moulds, Space & permits, Upgrades, Stores, Carriers, Sales channels). Upgrades open the skill tree. Tap the Shop tab again to return to the hub.',
  '<b>Machines are a proper catalogue.</b> Each of the 46 machines has its own illustration, spec bars (speed, output, upkeep), a payback calculator against hiring a person, filters by tier and job, sorting, and a spec sheet.',
  '<b>Fleet dashboard.</b> See bays, workforce power, upkeep and how much you save against hiring. Each machine shows how busy it was and how many tasks it has done.',
  '<b>Tuning.</b> Tune any machine from Mk I up to Mk IV for +25% speed per step.',
  '<b>The Shop is the only place to buy.</b> Stores, carriers and sales channels moved into the Shop, and the Stores, Upgrades and Media tabs are gone from Empire. Media & channels (hype, site-wide sale, social accounts and campaigns) now live in the Shop too. Only delivery rules stay in Orders.'
 ]},
 {h:'New in 3.6',i:[
  '<b>A real skill tree.</b> Shop › Upgrades opens a full-screen map: seven branches (Energy, Production, Sales, Team, Business, Media, Site) grow out of your studio. Drag to explore, pinch to zoom, tap a node to read it and buy it.',
  'Nodes link to the ones above them. Own any linked node to open the next, and bigger keystone nodes sit where branches merge. Everything you already own stays unlocked.',
  'Best buy jumps to the most useful thing you can afford. The old list is still there under the tree card.'
 ]},
 {h:'New in 3.5',i:[
  '<b>Your workshop is a picture.</b> The Studio tab now shows your real printers on desks with progress rings and glowing lamps. Tap a printer to start, collect or clean it. Your team and machines stand in the room, finished figures sit on the shelf, and the wall changes with your space and the time of day.',
  '<b>Chapters and a goal strip.</b> A story from the hok to Resin legend, with objectives, rewards and a goal that stays pinned at the top of every tab.',
  '<b>Tech tree.</b> Upgrades are now rows in a tree. Own any upgrade in a row to open the next one.',
  '<b>Regulars.</b> Eight named customers who love certain figures. Sell them what they like and they level up: more demand, gift chests.',
  '<b>Figure shelf.</b> Fill sets of figures for a chest and +4% demand forever.',
  '<b>Weekly events.</b> Convention Week, Collector Rush and Resin Fair, each with a goal and a reward.',
  '<b>Painting bench.</b> An optional daily mini-game for hype, XP and items.',
  '<b>Juice.</b> Flying money, confetti, sounds and sheets that slide up. Sound can be turned off in Empire › More.'
 ]},
 {h:'New in 3.1',i:[
  '<b>Machines.</b> Team now has three tabs: People, Machines and the Omega Forge.',
  '26 machines do the same jobs as people. They never get tired, work day and night and only cost upkeep.',
  '<b>The Omega Forge</b> holds 20 laboratory machines with 2.6 to 5.5 times the speed of a person. It needs the Laboratorium wing.',
  'Bays: 2 + 3 per space level for machines, 8 for the Forge. Sell any machine for 40% back.'
 ]},
 {h:'New in 3.0',i:[
  '<b>Inventory.</b> Usable items now drop from chests and daily goals. Open them in Empire › Items (or from the Studio tab) and tap Use.',
  '14 items: service kit (a free FEP, tank or screw), double espresso, hot meal, time skip ticket, express wash pass, shipping label book, demand ticket, viral post pack, free sale pass, training manual, staff course voucher, painter\'s masterclass, lucky charm and workshop day.',
  '<b>Contract stock is now really reserved.</b> Manga store walk-ins, wholesale offers, giveaways, replacements and event losses no longer take figures that are held for a contract.',
  'Everyone gets one service kit to start. Items stay when you rebirth or restart. Free upgrades from chests are still permanent and show as active.'
 ]},
 {h:'New in 2.9',i:[
  '<b>Faster energy.</b> Base regen is up from 10 to 18 an hour, and every studio level adds +0.5% regen.',
  '<b>Percentage upgrades.</b> 19 new upgrades in Empire › Upgrades › Energy raise max energy and regen by a percentage, from +5% up to +50%. They stack.',
  '<b>Better drinks.</b> 3 energy drinks a day, and each gives 15% of your max energy (at least 30). New upgrades add more drinks and make them stronger.',
  'Empire › Upgrades › Energy shows a breakdown of your max energy, regen and drinks.'
 ]},
 {h:'New in 2.8',i:[
  '<b>Restart options.</b> Empire › More now has Restart this run (keeps shards, perks, branches and the vault) and Delete everything (asks twice).',
  'Going bankrupt no longer wipes your shards, perks or vault.',
  'Printer and figure photos are cut out, with no white background.',
  '<b>XP by product.</b> Every figure you sell now gives XP by its value (chibi 1, bust 2, desk 2, kit 3, premium 5, statue 10). Contracts pay the XP for every figure straight away, plus 10.'
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
function patchHTML(){return `<div class="kicker">Update ${VERSION}</div><h3>${PATCH_TITLE}</h3><p>What changed:</p>${PATCH.slice(0,2).map(g=>`<div class="pn"><h4>${g.h}</h4><ul>${g.i.map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}<div class="acts"><button class="btn primary" data-choice="0">Let's go</button></div>`}
const patchDue=()=>!!S&&S.started&&!S.over&&S.seenVer!==VERSION;
function showPatch(after){pending=[{f:()=>{S.seenVer=VERSION;if(typeof after==='function')after()}}];modal(patchHTML())}
function maybePatchNotes(){
  if(!S||!S.started||S.over||S.seenVer===VERSION)return;
  if(Date.now()-(S.lastT||0)>4000){setTimeout(maybePatchNotes,500);return}
  if(modalOpen()){if(!queue.some(q=>q.patch))queue.push({patch:1});return}
  showPatch();
}

