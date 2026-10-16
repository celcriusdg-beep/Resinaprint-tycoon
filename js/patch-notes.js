/* Version number and patch notes popup. */
/* ---------- 2.0: levels, trends, difficulty, stats, themes, patch notes ---------- */
const VERSION='4.23';
const PATCH_TITLE='Resinaprint 4.22 · Moulds';
const PATCH=[
 {h:'New in 4.23',i:[
  'Equipping a power-up now shows every printer, machine or person as a card with its picture, what it is doing and the power-ups it already holds. The one with the fewest is marked.'
 ]},
 {h:'New in 4.22',i:[
  '<b>A mould for every figure.</b> Every product can now be injection moulded: all your own designs, every licensed figure from all five games and every prop. Shop › Gear & moulds lists them in tabs per product line, with a button to buy all moulds of a line at once.'
 ]},
 {h:'New in 4.21',i:[
  '<b>Showroom.</b> Lease a shop front (Studio tab) and build it tile by tile in an isometric room. 22 pieces of furniture: figure shelves, glass vitrines, a turning plinth, a prop wall, a hero statue, tills, a gacha machine, an arcade cabinet, an aquarium, a sakura tree, neon signs, a video wall, shop windows and more. Your real products stand on the shelves.',
  'Furniture adds traffic (people walking in), appeal (how many buy) and display slots. Every piece has a style tag: three, six or nine of a tag give a set bonus. Five floor and wall styles, and the shop grows from a corner shop to a flagship store.',
  'Customers walk in, browse, show a heart when they want something, walk to the till and pay. Every coin you see is a real counter sale.',
  '<b>Commissions</b> (Orders › Commissions). Customers ask for one-off pieces. Print the base model, let a painter (or you) paint it to the brief and deliver before the deadline. Standard, Premium or Masterpiece, with a tip for 4.5 stars.',
  '<b>Collector club</b> (Orders › Club). Monthly mystery boxes in three tiers. Choose what goes in each box and set the price. Members pay on box day, but every box needs real stock.',
  '<b>Paint studio</b> (Team › Paint studio). Give each product a Basic, Studio or Competition paint tier: slower to paint, worth far more, higher quality. Install the competition bench to enter painting contests, from Local to the World Open, and fill your trophy cabinet. Medals boost demand for that product for good.',
  '<b>Resin lab</b> (Empire › Resin lab). Mix glow-in-the-dark, metallic, crystal, flex and colour-shift resins from your own bottles. Print with a blend and those prints become variant editions that sell for 20% to 60% more.'
 ]},
 {h:'New in 4.20',i:[
  'While the fulfilment partner handles a destination, the dispatch bay only leaves when it is full: no courier pickups and no early sends by logistics staff. You can still press Send yourself.'
 ]},
 {h:'New in 4.19',i:[
  '<b>The fulfilment partner uses your dispatch bay.</b> Instead of making orders vanish, it now packs them into the bay one by one, about 8 an hour and faster when orders pile up. When the bay is full, its van takes every parcel at once. Couriers still collect at their pickup hours too.'
 ]},
 {h:'New in 4.18',i:[
  '<b>Stock plans.</b> Every Production manager and Procurement Bot now has its own shopping list. Open <b>Stock plan</b> on the worker or machine (also in its Details), tick the resins it buys, and set two numbers: when stock falls to the first, it orders bottles until it reaches the second. For example: at 10 L, fill up to 100 L.',
  'Big orders get the 5-pack price. Managers keep a small cash cushion and tell you when they cannot afford a restock.',
  'Without a plan, a manager keeps every resin in use between 1 and 3 bottles. The resin shop shows every plan at the top.'
 ]},
 {h:'New in 4.17',i:[
  '<b>Props.</b> A new Props branch in the skill tree. Open the prop workshop, then unlock life-size replica props in four lanes from small to big: magic items, swords, guns & tech and masks & helmets, 20 in all, each with a cut-out photo. Props need medium or large printers, take a lot of painting and sell for €149 to €999.',
  '<b>The Virtuous Contract.</b> The legendary blade of the Ascendent Abyss crowns the branch: unlock the top prop of all four lanes to forge it. It sells for about €4,999.',
  'Props get their own catalogue tab and a Prop armoury shelf.'
 ]},
 {h:'New in 4.16',i:[
  '<b>R&D lab</b> (Empire › R&D). Fund 15 research projects, from Rapid photopolymer to Quantum curing: faster prints, fewer failures, more demand, faster staff, cheaper shipping, lower IP royalties and daily hype. Research takes game time and can fail; failures refund 30% and make the next try 15% more likely. Technicians and engineers raise the odds, and up to 3 benches run at once. Breakthroughs survive rebirth.',
  '<b>A new catalogue.</b> Tabs for Selling, Own designs, each IP and Not listed, compact cards with a clear stats row, and the less-used controls (sell-off, stop making, auto-price, pre-orders) folded under More options.',
  '<b>Smoother live floor.</b> Scrolling over the Studio no longer stutters: the floor pauses while you scroll and draws far less each frame.'
 ]},
 {h:'New in 4.15',i:[
  '<b>IP licences.</b> A new IP & figures branch in the skill tree. Buy the rights from the company behind a game (Riot Games, HoYoverse, Kuro Games, Smilegate), then unlock its figures one by one, from a 10 cm mini to a 1/4 statue. Each one you unlock goes straight into your catalogue.',
  '<b>50 licensed figures</b>, 10 each from League of Legends, Genshin Impact, Wuthering Waves, Zenless Zone Zero and Epic Seven, all with real cut-out pictures. They sell for far more than your own designs (up to €1,800 for a Genshin statue) but pay a 12 to 18% royalty. The old busts are retired.',
  'If you already owned the Licensing deal, you get the Riot Games licence for free. Figure shelves now have one set per game.'
 ]},
 {h:'New in 4.14',i:[
  '<b>Power crates.</b> A new Shop catalogue with five crates, from Scrap to Void, full of power-ups for your staff, machines and printers in 12 rarities: Common up to Primordial and Singular. Open one or ten at a time, see the exact odds, and fuse three of the same into the next rarity.',
  '<b>Equip without limits.</b> Equip power-ups from Empire › Items or Team › Power-ups, as many per unit as you like. People get Focus and Spirit, machines get Overclock and Cryo coolant, printers get Turbo lasers and Precision optics.',
  '<b>Every rarity has its own look.</b> A unit takes the look of its rarest power-up, from brushed steel, emerald sweeps, sapphire glints, lightning and molten gold, through dragonfire, holy rays, a night sky and a nebula, to ghost light, a blood-red heartbeat and a black-hole void. It shows on printer stations, team cards, machine cards and the live floor. Tap any unit in Team › Power-ups to see its full loadout.'
 ]},
 {h:'New in 4.13',i:[
  '<b>Big deals.</b> From level 5, named clients (a board-game publisher, an anime con, a film studio, a theme park...) offer big orders of several figures with a deadline, in Orders › Big deals. Deliver in parts as stock comes in, or let Auto or a sales rep do it. Each finished deal pays a lump sum, a chest and +1% demand forever, and raises your supplier rank for bigger deals. Missing one only costs rating and hype.',
  '<b>Live floor.</b> The Studio now opens with a top-down view of your workshop: printers glow and fill up while printing, people and machines walk to their stations, prints fly to the wash, parcels roll to the bay and the van drives off at pickup. Tap a printer to open it. The floor changes with every space you move to.'
 ]},
 {h:'New in 4.12',i:[
  '<b>Real wash and paint stations.</b> The Wash station shows the wash & cure machine you own (Elegoo Mercury, Anycubic Wash & Cure, Formlabs Form Wash) with bubbles while it runs, and the Paint station shows a real miniature painting kit. The wash machines also show their photo in Shop › Gear.',
  '<b>Real resin photos</b> in Shop › Resin & supplies.'
 ]},
 {h:'New in 4.11',i:[
  '<b>Real resin photos.</b> Elegoo, Anycubic, Siraya Tech, Monocure and Formlabs resins now show their official bottle and cartridge, cut out on a transparent background, in Shop › Resin & supplies.'
 ]},
 {h:'New in 4.10',i:[
  '<b>Next-day payouts.</b> Everything you pack and send is paid out the next morning, on every channel. The Payout fast-track upgrade (one level, €4,000) makes it instant.',
  '<b>Fair offline time.</b> Away time runs slower and stops after 12 to 48 game hours, the shop closes before it runs into debt, and the bank gives a rescue loan instead of ending your run.'
 ]},
 {h:'New in 4.9',i:[
  '<b>Fair offline time.</b> While you are away the shop runs at a fifth of normal speed and stops after 12 game hours (up to 48 as you level up), instead of racing through weeks. If cash runs low it closes early to keep you out of debt, and nobody quits while you are gone.',
  '<b>No more forced restarts.</b> The bank no longer closes your company. When money runs out it gives a rescue loan, repaid in small weekly parts and skipped in weeks you cannot afford it.',
  '<b>Phoenix perk</b> now pays off your first rescue instead of cancelling bankruptcy.'
 ]},
 {h:'New in 4.8',i:[
  '<b>A real lo-fi soundtrack.</b> Ten tracks by Holizna (free, CC0): seven warm workshop tracks on shuffle, and three slow, dark ones for Rebirth and Singularity. Tracks crossfade and stream, so they do not slow the game down.',
  '<b>Fixed:</b> the daily reward Claim button did nothing.'
 ]},
 {h:'New in 4.7',i:[
  '<b>A real soundtrack and sound effects.</b> Every tap, coin, sale, level up, chest shake, chest opening (three grades, rarer sounds bigger), parcel, van, forge, perk and rival now has its own sound, mixed with reverb and a limiter. A lo-fi workshop loop plays while you work and a deep drifting pad plays in Rebirth and Singularity. Failed actions make a low thud. Music and effect volume are in Empire › More.',
  '<b>Tips, daily rewards and comfort.</b> A short tip appears the first time you open each screen. A daily login streak (7 days, ending in a jackpot) gives cash, items, chests and shards. New settings: low effects (auto on older phones), text size, high contrast and reduce motion.',
  '<b>A rendered chest</b> in the vault and the opening sequence, and rendered icons on the production line stations.'
 ]},
 {h:'New in 4.6',i:[
  '<b>The icons move.</b> The printer scans with UV light, resin bubbles rise, the gear rocks and throws sparks, the workshop chimney smokes, the shop window flickers and twinkles, the van rolls with speed lines, the megaphone sends out sound rings, and the skill network turns. All of it is light on battery and turns off with reduce-motion.'
 ]},
 {h:'New in 4.5',i:[
  '<b>Real icons.</b> The Shop tiles, the dispatch bay and the fleet now use rendered 3D icons made in Figma (parcel pallet, resin printer, resin bottle, gear and paint, workshop, storefront, delivery van, megaphone, skill network) instead of flat blocks and spheres.'
 ]},
 {h:'New in 4.4',i:[
  '<b>Rivals.</b> From a company worth 250k, three rival printing companies appear. They grow, take a share of demand and target your best figures. Undercut them, sabotage them (it can backfire), or buy them out for a permanent demand bonus and a printer.',
  '<b>Unstable black matter.</b> Hold too many Resin Shards and Singularity Cores and the matter gets restless: a daily chance to leak shards, or to surge into cash and hype. Buy Containment to raise the safe limit, or vent shards into cash.',
  '<b>Auto board.</b> Rules that run your empire for you: send the dispatch bay at a fill level, rebuy resin, place stored printers, service worn printers and buy containment. Off until you switch them on.'
 ]},
 {h:'New in 4.3',i:[
  '<b>Singularity.</b> A new Empire tab, a rebirth system without the rebirth. Fuse black matter, cash and a spare printer into Singularity Cores, then forge six impossible printers in the Fusion Reactor: Event Horizon Press, Quasar Lattice, Tachyon Loom, Wormhole Foundry, Dark Matter Reactor and the Omega Singularity. Each needs the one before it, other printers, items and cores. Forged printers go to your inventory first, and Singularity survives rebirths.'
 ]},
 {h:'New in 4.2',i:[
  '<b>Rebirth rebuilt.</b> Resin Shards are now glitching black matter that warps, splits into colour and throws sparks. Ten new, very different perks: Heirloom (keep cash), Shard bank (interest), Starter kit (free printers), Phoenix (survive bankruptcy), Echo sale (double payouts), Event horizon (higher prices), Compound interest, Ghost shift (orders pack themselves), Void forge (figures appear twice) and Fate (a head start on chest pity). Perks are grouped by Economy, Production, Vault and Legacy, with a clear keep/lose list.',
  '<b>Chest printers go to storage.</b> A printer from a chest is no longer placed or sold by itself. Place or sell it in Empire › Items › Printers in storage.',
  '<b>Fleet &amp; garage.</b> A new Shop catalogue with a cargo bike, delivery van, box truck, promo bus, vrachtwagen and trailer rig. They enlarge the dispatch bay, cut shipping, add courier pickups and cost upkeep. Six fleet upgrades from garage bays to night drivers.',
  '<b>A new vault.</b> Wood and iron chests, a shaking and bursting opening sequence with particles, a vault hall with a pity meter, and rarity names whose effects match their meaning: emerald sweep, cut sapphire glints, arcane lightning, molten gold, dragonfire, holy rays, a night sky, a black hole and drifting ether.'
 ]},
 {h:'New in 4.1',i:[
  '<b>Every space looks different again.</b> Hok: a corrugated roller-door wall, a swinging bare bulb and stacked boxes. Small studio: brick, a window, a pendant lamp, a poster and a plant. Workshop: a pegboard of tools, work lights and a safety-stripe floor. Factory hall: steel trusses, high windows, strip lights and hazard stripes. Industrial unit: pipes, valves, a duct and a crane that crosses the ceiling. Production campus: a glass wall with a city skyline that lights up at night.'
 ]},
 {h:'New in 4.0',i:[
  '<b>A new premium look.</b> Graphite and glass instead of brown and rainbow: one gold accent, quiet borders, frosted header, a floating dock, condensed headlines and cleaner numbers.',
  'Every tab, card, button, chip, the Shop, machines, the skill tree and the workshop scene follow the same calm style. Colour is now saved for things that matter: gold for what you can do, green and red for good and bad.'
 ]},
 {h:'New in 3.11',i:[
  '<b>Dispatch bay.</b> Packed orders now wait in a bay (50 to start) until the courier collects them or you press Send. The money chain is longer now: order → pack → bay → send → parcel → delivered, and online sales are paid out a few days after they are sent (webshop 1 day, bol.com 3, Etsy 4).',
  '<b>Dispatch & payouts catalogue in the Shop.</b> Upgrade bay size (up to 300), courier pickups (up to hourly), auto-dispatch, bulk carrier discounts, payout speed (down to instant) and parcel insurance.',
  'Logistics people and machines now run the dispatch bay and send it for you. Fulfilment partners skip the bay.',
  '<b>Production line.</b> A conveyor belt runs under your crew. Fresh prints pile up in an inbox, move through the wash tub, wait in a queue and then go into the paint booth. A painter, person or machine, really paints each figure there: it fills with colour as they work, and only when it is dry does it count as stock and fly to the shelf. Backlogs show up as piles with a count, so you can see where the line is stuck.',
  '<b>Calmer animations.</b> Busy streams of prints and parcels are now bunched into a few flights with a ×count badge. Choose Smart, Calm or Off under Empire › More.'
 ]},
 {h:'New in 3.10',i:[
  '<b>Printing is animated.</b> A printing printer glows with UV light, a scan line sweeps over it and a little copy of the figure builds up from the bottom as the print progresses. A finished print sparkles, and a failed one shakes and smokes.',
  '<b>Prints move through the shop.</b> When you collect a print it flies into the wash tub. Washed prints fly to the finishing bench, and finished figures fly onto the shelf, so you can see them become stock. Shipped orders fly out to the orders board as parcels.',
  '<b>People and machines move differently.</b> People walk, swing a brush, tape boxes and scrub, get tired and go off shift. Machines slide along a rail or hum in place with a blinking light and never stop.',
  'The wash tub, finishing bench and packing table animate while there is work waiting.'
 ]},
 {h:'New in 3.9',i:[
  '<b>Five new machine tiers</b> above Industrial: Advanced, Elite, Quantum, Mythic and Apex. 70 new machines, one per job in every tier, with their own colours and glow. Apex machines run up to 9.5 times the speed of a person.',
  'Each tier unlocks when you own a machine of the tier below. Advanced also needs a factory hall. Find them in Team › Machines › Catalogue and filter by tier.',
  'Workers and machines now say why they are waiting (no resin, prints need washing and so on).',
  '<b>The Omega Forge gets 3 more tiers</b>: Rift, Eternal and Omega, with 42 unique machines (own names and animated art). They run 20, 50 and 100 times faster than the Prime machines they replace. Each tier needs a machine of the tier below.',
  '<b>Fixed:</b> the shelf in the Studio now scrolls sideways, so you can see every figure type you have in stock.'
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

