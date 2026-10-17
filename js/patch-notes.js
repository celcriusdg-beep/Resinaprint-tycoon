/* Version number and patch notes popup. */
/* ---------- 2.0: levels, trends, difficulty, stats, themes, patch notes ---------- */
const VERSION='4.55';
const PATCH_TITLE='Resinaprint 4.55 · More cheats';
const PATCH=[
 {h:'New in 4.55',i:['Cheats now also add Resin Shards (+10, +100, +1.000) and have a Rebirth now button that skips the rebirth requirements.']},
 {h:'New in 4.54',i:['Printers waiting in storage no longer count towards company worth. A printer counts once you place it in your studio.']},
 {h:'New in 4.53',i:[
  '<b>Your save is protected.</b> If a save ever fails to load, the game no longer starts a new game over it. It keeps the save, tries a safe mode, and shows a recovery screen: restore a backup, copy the save text to send in, or start over on purpose.',
  '<b>Automatic backups.</b> The game keeps up to 3 backups: one every 20 minutes of play and one right before every update. Restore or copy them in Empire › Company › Save backups, where you can also load a save from text.',
  'Printers you get from chests count towards company worth once you place them in the studio.'
 ]},
 {h:'New in 4.52',i:[
  '<b>Company worth counts everything you bought at 90% of its price.</b> New in the count: your wash & cure setup, carriers, permits, sales channels, paint studio equipment, resin lab, resin in stock, a space that is still being built and prints that are not finished yet.',
  'Figures in stock now count at what they cost to make (resin, printer time and labour, at least 35% of their base price) instead of only the resin, so a full stock room adds real worth.',
  'Gear, paint studio and resin lab are counted from what you own, so things you bought before company worth changed count too.'
 ]},
 {h:'New in 4.51',i:[
  '<b>Printer cards show every stat:</b> output, slots, speed, fail rate, quality and wear per job, each with a bar and a green or red arrow against your best printer.'
 ]},
 {h:'New in 4.50',i:[
  '<b>Slimmer header.</b> Rating, hype, payday and energy share one row, so you see more of the game. Tap an empty spot of the header to hide the stats and goal completely; tap again to bring them back.',
  '<b>New shop.</b> "Recommended for you" shows up to 3 smart picks (running low on resin, your next printer upgrade, a better washer, better resin, upgrades ready), and the catalogues are compact tiles in Production, Business and Logistics.',
  '<b>Product cards.</b> Printers and resin show their key stats as bars, with green and red arrows against your best printer or the resin you use now. Locked items say what unlocks them, and you see how much cash you are short.',
  '<b>Filters and sorting.</b> Printers: All, Affordable or Upgrades, sorted by price, output or quality. Resin: All, In use, In stock or Better than mine, sorted by quality, price or name.',
  '<b>Buy preview.</b> Big purchases (a quarter of your cash or more, or €50.000+) show what changes before you confirm: cash after, printer spots, output vs your best. Every purchase gets a small pop.',
  'Tips now show once and go away when you leave the page. Bigger buttons and more room above the bottom bar.'
 ]},
 {h:'New in 4.49',i:[
  '<b>42 new chest items</b>, from energy bars and tip jars to Turbo firmware, TV features, Time crystals, Angel investors, Lottery tickets and Black matter cores. Many give a timed boost: faster prints, more demand, more income, cheaper resin or shipping, double XP, lower wages, calm markets or better quality. Active boosts show at the top of Items.',
  '<b>8 relics.</b> Ultra rare, used straight away and kept forever, even through rebirth: +3% income, 5% faster prints, cheaper resin, more demand, chest luck, better quality, a morning energy boost or extra shards on rebirth. They drop from Cosmic and Ethern chests, Singularity caches and the very rare Relic map. Find them all in the Vault.',
  '<b>5 special chests:</b> Golden chest, Resin crate, Collector\'s chest, Singularity cache and Mystery box. They drop from good chests, big deals (30%) and every rebirth, and you can buy them with Resin Shards in the Vault.',
  '<b>Resin rewards show their own bottle</b>, and chests now give a resin that fits your printers, better at higher rarities.'
 ]},
 {h:'New in 4.48',i:[
  '<b>See where quality comes from.</b> Under More options every figure shows its quality score split up: resin, printer, upgrades, painters and post-processors, inspectors and paint tier, plus the score it is heading to with your current setup.',
  'Everything that adds quality now says how much: resins and printers in the Shop (+0.25 quality), quality upgrades, and paint tiers in the paint studio.'
 ]},
 {h:'New in 4.47',i:[
  '<b>Smart auto price.</b> Every night it tries a slightly lower and a slightly higher price and keeps whichever earns the most profit a day, after fees, material, shipping, royalty and the time each piece takes.',
  'Crowded or flooded markets get a higher price instead of a lower one, so you sell fewer pieces for more and the market calms down. When you are selling out the price goes up too.',
  'The step grows while it keeps moving the same way (up to 15%) and gets smaller once it is close (down to 2%). The price never drops below cost + 15% or 65% of the base price, and better quality raises the ceiling (S tier up to 234% of the base price).',
  'Under More options you see its price range, the reason for the last change and the expected profit a day.'
 ]},
 {h:'New in 4.46',i:[
  '<b>Fix a flooded market.</b> Rest a product and its market recovers faster: 35% a day when unlisted, 25% a day when you stop making it, 15% a day while it keeps selling. The catalogue shows how many days until it is back to busy.',
  '<b>Back in stock.</b> A product you rested for 3 days or more comes back with +25% demand for 4 days.',
  '<b>Fresh campaign.</b> Pay for a campaign to calm one product\'s market by 35%, once a week per product.',
  'Markets hold more buyers in bigger spaces (+20% per space level), so a large studio floods less easily.'
 ]},
 {h:'New in 4.45',i:[
  '<b>Big deals can ask for any product</b>, including ones you cannot make yet (marked in red) and injection-moulded pieces. Things you can make come up most often.',
  'Now and then a client asks for a licensed or prop piece you have not unlocked yet (about 1 in 14 items, marked purple). Unlock it in time or let the offer go.'
 ]},
 {h:'New in 4.44',i:[
  '<b>Big deals are no longer endless.</b> One new client walks in every 2 to 4 days, with at most 3 waiting on the board. Offers leave after 5 days if you do not sign them, and the board no longer refills the moment you sign one.',
  'Calling in new clients still costs money and now works once a week. The board shows when the next client comes and how long each offer stays.'
 ]},
 {h:'New in 4.43',i:[
  '<b>Quality tiers.</b> Every figure shows a quality tier: D Rough, C Decent, B Good, A Excellent or S Masterpiece. It comes from what you made lately: resin, printer, painters, post-processing, inspectors and paint tier. Better tiers sell at higher prices (S: about +30%).',
  '<b>Market reach.</b> How many orders a day customers can find you for. It grows with your space (12 in the hok up to 1.400 on a campus), sales channels, level and every rebirth. Demand above your reach tapers off, so 2.000+ orders a day is a late-game thing. See the top of Orders › Catalog.',
  '<b>Stores rebirth with the company again.</b> Stores, levels, tills, clerks and upgrades reset on rebirth, but your Riftbound packs, boxes, cards, slabs and cards out at PSA come with you. Retail level is kept.',
  '<b>Stores count towards company worth again:</b> fit-out, levels, merges, shelf stock and card shop upgrades at 90%, store tills like cash at 10%.',
  '<b>The Foundry stands on its own.</b> It no longer needs the Singularity printers. It opens after 5 rebirths and costs €500M. Casting tier 1 opens with it, and every next tier and its metal products needs one more rebirth (tier 5 at 9). A foundry you already own is kept.'
 ]},
 {h:'New in 4.42 · Retail',i:[
  '<b>Every store has its own till.</b> Store sales go into the till, and the till pays its own stock, rent, clerks and events. On payday the store keeps two weeks of costs and sends the rest to the studio as a dividend. If the till runs dry, the studio tops it up. Take money out or top it up any time.',
  '<b>Retail level.</b> Every euro your stores take in is retail XP, kept through rebirths. Ten levels unlock extra clerks, store levels 3 to 5, prereleases (level 4), championships (level 8), faster fit-outs and a new store: the <b>Hobby & model shop</b> (retail level 5 and 2 rebirths).',
  '<b>Studio shelf.</b> Stores sell figures from your studio stock. The studio gets its normal price and the store keeps a 25% markup. The hobby shop sells kits and statues, the card shop small pieces and deck boxes.',
  '<b>Real store costs.</b> Rent grows with store level, clerks get raises over time, shoplifters strike (more clerks help) and every store has a reputation that grows when it is open and stocked, and drops when it is closed or empty. Store margins went up to make up for it.',
  'New stores take 3 to 7 days to fit out before they open. The Anime café now needs 1 rebirth.'
 ]},
 {h:'New in 4.42 · Pacing',i:[
  '<b>Market saturation.</b> Every product has a market. Sell lots of one product and its demand drops until the market recovers, so spread your catalogue. The catalogue shows when a market is busy, crowded or flooded.',
  '<b>Dutch taxes.</b> Eenmanszaak: inkomstenbelasting 35,82% / 37,48% / 49,5% per tax year, after zelfstandigenaftrek and MKB-winstvrijstelling, minus algemene heffingskorting and arbeidskorting. BV: vennootschapsbelasting 19% / 25,8% plus box 2 on the half you pay yourself. Paid every payday on the profit so far this year. Small companies pay little, big ones a lot. See Empire › Company.',
  '<b>Build times.</b> Moving to a bigger space takes 2 to 10 days, the foundry hall 7 days and each casting machine 3 to 10 days to install.',
  '<b>Rebirth unlocks.</b> Megaprojects open after 2 rebirths and the Foundry after 3. The Rebirth tab shows them under Business.'
 ]},
 {h:'New in 4.41',i:[
  '<b>Singles filters.</b> Sort your singles by price (high or low), rarity, name, card number, most copies or how far your price sits above market. Filter by rarity, listed or not listed, and minimum worth.',
  'List or unlist every card you are looking at in one tap, and see how many cards match and what they are worth. Long collections load 60 at a time with a Show more button.'
 ]},
 {h:'New in 4.40',i:[
  '<b>Rebirth is harder to earn.</b> The goal now grows ×4 every rebirth: €1M, €4M, €16M, €64M, €256M, €1B and so on.',
  '<b>Your studio has to earn it.</b> Besides company worth, a rebirth needs studio sales this run of at least half the goal. Branches, stores, the foundry, the theme park and other side income do not count.',
  '<b>Minimum run length.</b> A run has to last at least 7 days, plus 3 for every rebirth you have done (up to 30). The Rebirth tab shows all three goals with progress bars.',
  'Branches pay half as much (√best × 0.25 a day) and the rebirth boost no longer multiplies branch income. The theme park pays 0.4% of the goal a day instead of 1%. Cash counts for 10% of company worth instead of 15%.'
 ]},
 {h:'New in 4.39',i:[
  '<b>Stores are permanent.</b> A store you buy is its own business now, not part of the studio. Rebirths and restarts no longer touch it: its level, stock, clerks and the whole card shop (sealed stock, binder, singles, slabs, upgrades) carry over into every run.',
  'Stores no longer count towards company worth, just like the foundry, so keeping them does not make your next rebirth easier.'
 ]},
 {h:'New in 4.38',i:[
  '<b>Stores tab.</b> Own a store and a Stores tab appears next to Studio. Pick any store you own and run it from an animated scene: customers walk in, shelves fill with your stock, the sign glows.',
  '<b>The card shop goes deep.</b> Stock sealed packs, boxes and accessories (binders, sleeves, deck boxes, playmats, toploaders) and sell them at your own prices. Unlock distributor accounts (B2B) to buy at 80%, 70% or 60% of market.',
  'List any card you pulled as a single at your own price, and collectors buy it over time. Send cards to PSA: they come back as slabs graded 7 to 10, and a PSA 10 is worth about 4× the raw card.',
  'Host events, from league nights to prereleases and a regional championship, for entry fees, pack sales and hype. Upgrade the store with shelving, display cases, a play area, a grading partnership and marketing.'
 ]},
 {h:'New in 4.37',i:[
  '<b>TCG counter.</b> Own the trading card shop and Shop gets a TCG counter for Riftbound: League of Legends TCG – Spiritforged. Buy booster packs, boxes (24 packs) and cases (6 boxes) at TCGplayer market prices, then rip packs open card by card: commons first, the best card last, with holo foils.',
  'The set has 122 official Spiritforged cards with their real art: all 30 Overnumbered cards, all 12 Signatures and 80 others across every rarity, each priced at its market value. Build your binder, chase the €3,334 Ahri Signature, and sell singles, duplicates or bulk at 90% of market price.',
  'Printers in storage can now be sorted by price.'
 ]},
 {h:'New in 4.36',i:[
  '15% of the cash in your bank now counts towards company worth, on top of everything you own at 90% of its cost.'
 ]},
 {h:'New in 4.35',i:[
  '<b>Company worth</b> no longer counts the cash in your bank. It is everything your company owns, each at 90% of what it cost: printers, machines, space, stores, upgrades, moulds, dispatch, vans, the showroom, equipment and stock, minus loans and BTW owed. Empire › Company shows the breakdown. Spending on your company now grows its worth, and the rebirth goal works the same way.'
 ]},
 {h:'New in 4.34',i:[
  '<b>No more carrying money.</b> Heirloom (keep cash through a rebirth) and Head start (start with extra cash) are gone. Every shard you spent on them has been refunded.',
  '<b>18 new rebirth perks:</b> Steady hands, Ultrasonic memory, Packing muscle, Calm vats, Golden plate, Mentor, Loyal crew, Friendly landlord, Courier deals, Marketplace VIP, Momentum, Fast start, Fan club, Five-star memory, Architect, Master smelter, Lucky streak and Shard quarry.',
  '<b>Singularity printers in the shop.</b> Once you forge your first Singularity printer, a new ✦ Singularity tab appears in Shop › Printers. Every printer you have forged there can be bought for cash, as many as you have room for.'
 ]},
 {h:'New in 4.33',i:[
  '<b>The Foundry.</b> Forge all six Singularity printers and a new Foundry tab appears: metal casting, a whole business of its own. The foundry costs €25M and stays yours through every rebirth.',
  'Five casting machines, each a tier up: Sand-casting cell (€10M), Lost-wax investment line (€30M), High-pressure die-cast press (€80M), Vacuum titanium caster (€200M) and Binder-jet & HIP foundry (€500M). They cost a fortune in upkeep every day and wear with every pour: service them or they cast defects and break down.',
  'Buy aluminium, brass, bronze, steel, silver, titanium and gold by the kilo. Cast 15 metal products, from €1,800 die-cast cars to a €1.5M gold-leaf throne, set prices and sell to collectors. Museums, cities and film studios offer projects that pay fortunes.',
  'Eight foundry upgrades and a hall that grows from 4 to 16 machine bays. Switch machines off to stop their upkeep: after a rebirth every machine starts switched off, so a fresh run is not drained.'
 ]},
 {h:'New in 4.32',i:[
  '<b>Megaprojects</b> (Empire › Megaprojects). Six giant builds for the late game: the Resin Refinery, Global Logistics Hub, Resin Saga Anime Studio, Resinaland Theme Park, Orbital Print Lab and the Grand Resin Museum. Each has four stages: Groundwork, Structure, Fit-out and Grand opening. Every stage costs millions (scaled to your rebirth goal), a delivery of figures from your stock and days of building, and you watch the building grow.',
  'Finished projects give big bonuses for the rest of the run: cheaper resin and shipping, more demand, daily park income, faster printers, a chest every day. Every project you ever finish adds +2% income for good (Legacy) and 25 Resin Shards.',
  'Megaprojects open after your first rebirth or once your company is worth €5M.'
 ]},
 {h:'New in 4.31',i:[
  'Injection machines now match their class: the Arburg Allrounder counts as a large machine and the Engel e-mac 180 as an industrial one, so they can mould statues, full-colour figures and other big products (buy the mould first). The Babyplast stays medium.'
 ]},
 {h:'New in 4.30',i:[
  '<b>Music fixed on phones.</b> The soundtrack no longer goes quiet after one blocked song: any track the phone blocks starts again on your next tap. On iPhone the game now asks to play its audio even with the silent switch on, as long as sound and music are on in Settings.'
 ]},
 {h:'New in 4.29',i:[
  '<b>Branch income fixed.</b> A branch used to pay 0.01% of its best company value every day, so one huge run could pay hundreds of thousands every midnight. It now scales with the square root: €1M best pays €500 a day, €100M pays €5,000 and €5B pays €35,000.',
  'The money log now merges every sale of the same kind within an hour into one line.'
 ]},
 {h:'New in 4.28',i:[
  '<b>Money log</b> (Empire › Company). Every change to your cash, grouped per hour and category, with the biggest moves since yesterday at the top. Now you can see exactly why your money jumps.',
  '<b>Copy save</b> (same place): copies your save as text so it can be checked when something looks wrong.'
 ]},
 {h:'New in 4.27',i:[
  'The rebirth goal now grows with every rebirth: €1M for the first, then €3M, €9M, €27M, €81M and so on (×3 each time).'
 ]},
 {h:'New in 4.26',i:[
  '<b>Rebirth unlocks.</b> Desktop and Pro printers are open from the start. Large printers unlock after 1 rebirth, Industrial after 2 and Laboratorium after 3. Machines: Basic and Pro from the start, then Industrial, Advanced, Elite, Quantum, Mythic and Apex open one rebirth at a time. The Omega Forge opens after 3 rebirths. You no longer need to own the previous generation. The Rebirth tab shows what is open and what the next rebirth brings.',
  '<b>Licences and props cost far more.</b> IP licences now cost €250k to €650k, and their figures up to twice the licence. The prop workshop costs €1M, prop replicas €200k to €3.2M and the Virtuous Contract €25M. Anything you already own stays yours.',
  '<b>Slower late game.</b> Hype counts in full up to 100, then with diminishing returns. 800 hype used to multiply demand by 17, now by about 5.'
 ]},
 {h:'New in 4.25',i:[
  '<b>Rebirth boost.</b> Every rebirth now gives a permanent +10% on all income, and it stacks: Rebirth boost I is +10%, II is +20%, III is +30%, and so on. See your level on the Rebirth tab. Loans, refunds and selling your own equipment are not boosted.'
 ]},
 {h:'New in 4.24',i:[
  'Team: tap a job (Painter, Print, Production and more) to see only those machines or people. All shows everyone again. Works in People, Machines and the Omega Forge.'
 ]},
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

