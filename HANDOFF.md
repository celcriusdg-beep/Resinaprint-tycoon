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
- Packaging: TCGplayer product photos `tcgplayer-cdn.tcgplayer.com/product/{id}_in_1000x1000.jpg` (ids in `cards.json` `sets[].tcg`), drawn pack/box fallback.
- Time: 1 game hour = 20 s, shop day 12 h. End of day: rent/clerk, market drift + meta spikes, new deals. Offline catch-up ≤ 5 days; only a hired clerk sells (from your shelves at your prices).
- Save: localStorage `riftshop-save-v1`, `version` 2; `migrate()` upgrades v1 saves (RGC grades → PSA slabs).
- Debug: `?debug` exposes `window.__store` and `window.__advance(hours)` (used by `tools/smoke.mjs`).

## Ideas not done yet
More sets as Riot releases them (rerun the data script), tournaments/events in the shop, trade-in nights, a price-history graph (riftdex-data has daily history), achievements.
