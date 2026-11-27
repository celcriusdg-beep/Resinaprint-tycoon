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
  Spiritforged/Radiance/Vendetta boxes from TCGplayer listings found by web search (Oct–Nov 2026); their pack/case prices are estimates (`est`).
- Refresh: clone the two repos into `../.data/` and run `npm run data` in `riftshop-src/`.

## Game rules (src/game)
- `packs.ts`: 14-card booster = 7 C, 3 U, 2 Rare+ (Epic 12.5% per slot ≈ 1 per 4 packs), 1 foil slot (alt art 2/24, overnumbered 1/72, 10% of those signed, else a foil C/U/R/E 55/28/12/5%), 1 rune (alt rune 1/24 where it exists).
- `economy.ts`: values (foil ×4 C/U, ×1.6 R/E; grade multipliers 10 → ×3/×3.5, 9 ×1.5 …), wholesale (max(62% MSRP, 70% market)), daily allocation (older OGN/SFD limited, no cases), shop levels, grading tiers (Value $18/5 days, Standard $40/2 days, Express $95/4 h), fees (online 12.5%, buylist 55%).
- `sim.ts`: real-time shop (1 game hour = 20 s, shop day 12 h = 4 min). Customers: pack buyers, box buyers, singles hunters (display case), sellers offering cards at 45–80% of market. Reputation from fair pricing. End of day: rent/clerk, market drift (per-card random walk pulled back to the real price, older sets' sealed slowly appreciate, ~22%/day chance of a champion meta spike). Offline catch-up up to 5 days; only a hired clerk sells while away.
- Save: localStorage `riftshop-save-v1`, every 5 s and on hide.

## Ideas not done yet
More sets as Riot releases them (rerun the data script), tournaments/events in the shop, trade-in nights, a price-history graph (riftdex-data has daily history), achievements.
