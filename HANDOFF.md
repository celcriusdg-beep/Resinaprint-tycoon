# Handoff: Rift Shop

A private, phone-first Riftbound card-shop game (the user plays it alone on an iPhone 17 Pro, as a PWA).
It replaced ATOMCORE (the nuclear tycoon), which was removed on 27 Nov 2026 and is still in git history
(last commit containing it: the parent of the commit "Replace ATOMCORE with Rift Shop").

- Repo: `celcriusdg-beep/Resinaprint-tycoon`, working branch **`claude/atomcore-nuclear-tycoon-py4rcf`** (push only there). GitHub Pages serves the branch.
- Built game: `riftshop/` (served at `/riftshop/`). `npm run build` in `riftshop-src/` writes it. Always rebuild before committing.
- `atomcore/` is only a redirect (index.html + a self-unregistering sw.js that clears ATOMCORE's caches) so the old home-screen icon opens Rift Shop.
- Other games in the repo (Resinaprint at the root, `age-of-resin/`, `realm-heroes/`) are untouched.

## Stack
Vite 5 + React 18 + TypeScript + Zustand, vite-plugin-pwa (Workbox; Riot CDN images cached CacheFirst as `card-art`). No 3D.
Tests: `npx vitest run` (pull-rate statistics, shop flow, grading, bulk). Browser check: `npx vite preview --port 4174`, then
`PLAYWRIGHT_PATH=$(npm root -g)/playwright node tools/smoke.mjs http://localhost:4174/ <outDir>` (iPhone 13 profile).
The cloud sandbox cannot reach Riot's CDN, so screenshots show the drawn card faces; on the phone the official art loads.

## Data (`src/data/cards.json`, built by `tools/build-data.py`)
- Cards: Riot's official card gallery via `github.com/Dystorted888/riftbound-card-data` (snapshot 26 Oct 2026): 1,369 printings
  in the five booster sets OGN Origins, SFD Spiritforged, UNL Unleashed, RAD Radiance, VEN Vendetta (Proving Grounds starter set excluded).
  `kind`: std / alt (alternate art) / over (overnumbered) / sig (signed overnumbered). `img` = Riot CDN URL (never copied into the repo).
- Prices: TCGplayer market USD via `github.com/rleutz/riftbound-prices` (27 Nov 2026), keyed by printed code (`OGN-299*` → `OGN-299-SIG`). 5 missing → set/rarity median (`est`).
- Sealed: Origins and Unleashed pack/box/case from `github.com/ehreese/riftdex-data` (TCGplayer product ids 635366/635368/635369, 678149/678150/678152);
  all five sets' pack/box/case market prices come from riftdex-data by TCGplayer product id (see `TCG` in the build script). Release order: OGN, SFD, UNL, VEN, RAD.
- Refresh: clone the four repos into `../.data/` and run `npm run data` in `riftshop-src/`.

## Game rules (src/game) — v2: the player decides everything
- Nothing sells unless the player lists it: sealed stacks go on **shelves** (`shelf`, slots by shop level) and singles/slabs in the **display case** (`display`), each at the player's price. Customers (`sim.ts`) pick a listed item and buy if price ≤ market × 0.85–1.35 (a little more with reputation); otherwise the log says what they'd have paid. Selling at/under market builds reputation; >1.5× hurts it.
- Buying cheap: distributor (wholesale max(62% MSRP, 70% market), daily allocation, older OGN/SFD limited), a daily **deals board** (6 sealed/singles at 0.55–1.12× market, refreshed each shop day) and walk-in **sellers** at the counter (0.45–0.85×).
- `packs.ts`: 14-card booster = 7 C, 3 U, 2 Rare+ (Epic 12.5% per slot), foil slot (alt art 2/24, overnumbered 1/72, 10% signed, else foil C/U/R/E 55/28/12/5%), rune (alt 1/24).
- `grading.ts`: **PSA** (Value $39.99/6 days, Regular $79.99/3, Express $149/1) whole grades; **Beckett BGS** (Base $17.95/7, Standard $34.95/4, Express $79.95/1) four subgrades, overall ≤ lowest+1, Pristine 10, Black Label (all four 10s, ~1 in 5,000). Value multipliers in `slabMult` (PSA 10 ×3–4; BGS Pristine 10 = 95% of PSA 10; BGS 9.5 ×2.2–2.8; Black Label ×10, ×12 on chase cards ≥ $20 — a $3k card ≈ $36k). Returned slabs queue in `reveals` → full-screen reveal. Slab art is CSS (`ui/visuals.tsx`), no logos copied.
- Card pictures (`ui/CardImage.tsx`): Riot art via Sanity CDN (`cdn.sanity.io/images/dsfx7636/game_data_live/…?w=&fm=webp`), then Riot's own server; TCGplayer's small card photo (`{tcg}_200w.jpg`, ids from `github.com/KalimbaPro/riftbound-api`, 1,051 of 1,369 cards) underneath as a placeholder; img classes are `ci-base`/`ci-top` (never reuse `.top`, the header class!); footer "Picture check" tests each image host on the device; shimmer placeholder until something loads; `preloadCards` when packs open. Foil prices: real TCGplayer foil price (riftdex-data by tcg id) where known, else ×2.5 C/U, ×1.6 R/E.
- Store UI (`ui/ShopScreen.tsx`): storefront — wall shelves (3 per row) with product photos and price tags, glass display case, customer at the counter, 3-line ticker, collapsible Manage shop. Empty spots open pickers; `ui/ShelveSheet.tsx` has the shelve/case price sheets (market/distributor/your price, quick % buttons).
- `tools/smoke-images.mjs` serves stand-in images for both CDNs to check image layering (the sandbox can't reach them).
- Data completeness: the gallery snapshot lacked Radiance's 14 signed overnumbered cards and 13 regular Radiance cards; the build script adds cards from riftbound-api (booster sets, no tokens/Korea-exclusives) and creates signed printings for any `XXX-NNN-SIG` TCGplayer price whose overnumbered card exists (same art). 1,396 cards: 168 overnumbered/signed.
- Singles market (Market tab): search/filter any card, buy at market × `SINGLES_MARKUP` (1.1) via `buySingle`.
- Sheets (`Modal` in `ui/common.tsx`) render through a React portal into <body> (inside the scrolling `.content` iOS trapped them under the tab bar and they couldn't scroll); `.modal-body` scrolls, optional `footer` prop pins the main button.
- Packaging: TCGplayer product photos `tcgplayer-cdn.tcgplayer.com/product/{id}_in_1000x1000.jpg` (ids in `cards.json` `sets[].tcg`), drawn pack/box fallback.
- Time: 1 game hour = 20 s, shop day 12 h. End of day: rent/clerk, market drift + meta spikes, new deals. Offline catch-up ≤ 5 days; only a hired clerk sells (from your shelves at your prices).
- Save: localStorage `riftshop-save-v1`, `version` 6; `migrate()` upgrades v1 saves (RGC grades → PSA slabs), v2 saves (XP from past revenue + packs opened) v3 saves (furniture matching the old shelf/case space, via `starterFurniture`) and v4 saves (phase 3 fields default from `newGame()`).
- **Progression (`src/game/progression.ts`, `ui/GoalsScreen.tsx`, Goals tab)** — tycoon phase 1:
  - Levels 1–50, `xpForLevel(l) = 100·l^1.6`; XP from sales ($1 = 1 XP), packs (+5), boxes (+20), deals (+10), grading (+30 / +300 for a 10 / +3,000 Black Label), goals and milestones. Each level pays `levelReward` cash; `g.levelUps` queues the level-up popup (`LevelUp`).
  - `UNLOCKS` gate by level: Vendetta + Radiance at start, online selling 2, PSA + Corner Shop 3, Unleashed + singles market 4, PSA Regular + ads 5, Beckett + shop 3 at 6, Spiritforged 7, BGS Standard + cases 8, Origins + clerk + shop 4 at 10, express tiers 12, shop 5 at 15, shop 6 at 22. Sim functions return an error string when locked; the UI shows 🔒 Level N. Locked sets still appear on the deals board.
  - `bump(g, counter)` tracks lifetime `counts` and `todayCounts`; 3 daily goals per shop day (scaled by level), ~32 milestones (claim for cash + XP); gold dot on the Goals tab = things to claim.
  - Net worth = cash + sealed + raw cards + slabs at market; `closeDay` logs it to `g.history` (graph) and `bestWorth`.
- Save safety (`store.ts`): a copy of the game never overwrites a newer save — `save()` compares the stored `savedAt` with the one this copy last loaded/wrote and reloads instead (stale tabs / old copies kept in memory used to roll progress back). Background (hidden) copies don't autosave. Backups in localStorage `riftshop-backups` (8 newest): each shop day, before a version migration, before restore/start over, and any save that fails to load (never discarded; the player gets a popup). Footer "Backups" sheet: restore, copy/paste a save, and set level/cash by hand for progress lost before backups existed.
- Debug: `?debug` exposes `window.__store` and `window.__advance(hours)` (used by `tools/smoke.mjs`).

- **Shop building (`src/game/shop.ts`, `ui/BuildSheet.tsx`)** — tycoon phase 2:
  - Shelf and case spots now come from furniture on the floor (`g.furniture`): wall shelf (3/5/7 shelf spots), glass case (6/10/14 case spots), pack endcap, play table (2 tiles, +rep daily, more competitive players), slab desk (`slabcase`: 4/6/8 slab-only spots in `g.slabDesk`, drawn as its own gold counter in the shop; collectors pay +8% for slabs bought there; v6 migration moves display-case slabs onto an existing desk), plant/poster/neon/collector lounge (atmosphere → `vibeTraffic` up to +100% visitors, small willingness boost). Floor tiles per shop level in `SHOP_LEVELS.floor`. Upgrades cost 2×/4× base; selling refunds half and is refused if the listings wouldn't fit.
  - Back room: `SPACE` pack 1 / box 24 / case 144; cap = `SHOP_LEVELS.storage` + racks × 240 (max racks per shop level). Distributor and deals refuse purchases that don't fit (`roomFor`); shelved stock doesn't count.
  - Customers (`sim.ts` `shopper`): types kid / casual / player / collector / investor / seller with mix from `customerMix` (furniture shifts it; investors from shop level 3). Each has a lognormal budget (bigger shops richer; 5% whales for collectors/investors), interests (`interested`), and willingness range. Feed lines carry the type icon.
  - Card requests (`g.requests`, max 2 + shop level): players want playable Rares/Epics/Legends, collectors alt/overnumbered/foil Epics; pay 1.15–1.5× market; expire after 2–3 days (−rep). `fillRequest` takes a raw copy from the binder or the case. Shop tab shows the board with "Hand it over" / "Order it" (singles market).

- **Events, tournaments, launches, staff (`src/game/events.ts`, `ui/EventsSheet.tsx`)** — tycoon phase 3. Hooks: `closeEvents` at the end of a shop day (resolves today's tournament), `openEvents` at the start (hype decay, price manager, launch delivery, release scheduling, random event roll). `eventTraffic` / `eventMix` / `eventBudget` feed the customer sim.
  - Tournaments (`g.tournament`, planned for tomorrow): casual night (Lv 2, 1 table star), weekly (Lv 5, 2), regional qualifier (Lv 12, 4). Seats = 6 per play-table star. Turnout from rep, shop size, fee vs. usual fee and prize packs (taken from the back room when planned). On the day: +25% traffic, 3× competitive players. Result: entry fees, rep, XP, and the winner's champion becomes the market spike.
  - Releases (`g.release`): announced on day 5 and every 12 days after for an unlocked set, launch 3 days later. Pre-orders (`g.preorders`) at 58% of MSRP per box, limited by shop level, delivered on launch day ignoring the back-room cap. Launch day: `g.hype[set]` ×1.35 (decays 20%/day; also used by viral video/spoiler events, applied in `sealedValue`), +40% traffic, shoppers go for the launch set first.
  - Random events (`EVENTS`, ~40% of days from day 3): rain, sunny, school holiday, payday, card show, streamer, viral pull video, spoiler season, power cut, shoplifter, leaky roof. Popups queue in `g.notices` (`NoticePopup` in App, after level-ups).
  - Staff (`g.staff`, optional, wages at closing): cashier (Lv 5, +20% customers), singles seller (Lv 6, `autoList` each shop hour: raw cards worth ≥ $0.50 and ≤ `staffCfg.listMax`, most valuable first, at market × `listMarkup`, keeps one per printing if `listKeepOne`, skips requested cards; case spots first, then online up to 30 if `listOnline`), stocker (Lv 7, refills shelf stacks from the back room at your price via `restock`), buyer (Lv 9, auto-buys walk-in offers ≤ `staffCfg.buyerMax` of value, keeps $500), price manager (Lv 11, reprices everything to market × `staffCfg.markup` each morning). The clerk moved into the Staff sheet.

## Roadmap (agreed with the user)
- Phase 2: done (above).
- Phase 3: done (above).

## Ideas not done yet
More sets as Riot releases them (rerun the data script), tournaments/events in the shop, trade-in nights, a price-history graph (riftdex-data has daily history), achievements.
