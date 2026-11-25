# ATOMCORE — session handoff

Read this first when continuing work. Last updated 2026-11-25.

## Where things are
- Repo: `celcriusdg-beep/Resinaprint-tycoon`, working branch **`claude/atomcore-nuclear-tycoon-py4rcf`** (push only there).
- Web game source: `atomcore-src/` (TypeScript, React, Vite, Three.js / React Three Fiber, Zustand, IndexedDB saves, vite-plugin-pwa).
- Built game (served by GitHub Pages): `atomcore/` — `npm run build` in `atomcore-src/` writes here. Always rebuild before committing.
- Feature list (implemented vs planned): `atomcore-src/README.md`.
- Roblox version brief (for the user's PC Claude, built directly in Roblox Studio, Blender assets, Obsidian docs): `ROBLOX_PROMPT.md`.
- Other folders at repo root (`age-of-resin`, `realm-heroes`, resin tycoon files) are older projects — leave them alone.

## How to work on it
- `cd atomcore-src && npm install` (if needed), `npx tsc --noEmit -p .`, `npx vitest run` (78 tests incl. a ~30 s balance bot), `npm run build`.
- Browser checks: `npx vite preview --port 4173`, then Playwright (pre-installed: `require(\`${npm root -g}/playwright\`)`). URL params: `?debug=1` (exposes `window.__store`, `__ui`, `__atom`), `?quality=low|medium|high`, `?showcase=1` (sandbox with every building, never saved). Dismiss the welcome dialog ("Start operating") first.
- The user plays on an iPhone (PWA, Add to Home Screen) — check UI at iPhone 13 size.
- Commit messages end with the session attribution lines; push with `git push -u origin claude/atomcore-nuclear-tycoon-py4rcf`.

## Architecture (atomcore-src/src)
- `game/` pure simulation (no rendering): `engine.ts` (tick), `simulation/plant.ts` (site step: water, mining, reactors, turbines, cooling, on-site industry, grid, money), `simulation/reactor.ts` + `physics.ts` (point kinetics, rods, boron, xenon, temps, trips, decay heat, core damage), `supply/fuelcycle.ts` (mining, mill→enrich→fab→QA, market quota, orders, refuelling, spent fuel/casks/shipping), `supply/water.ts`, `economy/market.ts`, `buildings/defs.ts` (all buildings, tiers, `SECTIONS` lines, `buildingScore`), `research/tree.ts`, `diagnostics.ts` (Status tab issues + fix actions), `actions.ts` (player actions), `state.ts`, `dev.ts` (showcase).
- `components/buildings/models/*.ts` procedural 3D models (reactors, plant, supply, industry, tiers) registered in `registry.ts`.
- `components/panels/*` UI (BuildPanel = tier tabs, SupplyPanel, ReactorControl, StatusPanel, BuildingPanel…), `systems/save/serialize.ts` (versioned saves, `mergeDefaults` migration).

## Recent work (newest first)
1. Roblox brief written (`ROBLOX_PROMPT.md`), Studio-only (no Rojo/GitHub). Also gave the user (in chat only) a Blender asset-quality prompt + critique of their Roblox vessel model (bad valves = stick + disc, crumpled-foil cladding, flat heads, no flanges/bevels, floating parts, random colours).
2. Buildings can be moved at any time without interrupting anything (reactors keep running, upgrades keep progress); only destroyed reactors are locked.
3. Build menu sub-tabs are **tiers T1 Basic → T5 Cutting-edge**. Inside a tier, buildings are grouped by job ("line") and sorted weakest → best; a unit test enforces that every higher-tier building beats every lower-tier one of the same line (`tests/tiers.test.ts`).
4. 30 tiered buildings added (SMR Park, Sodium Fast Reactor, medium/supercritical/sCO₂/MHD turbines with efficiency bonuses, hybrid/fan-assisted/once-through/sky cooling, underground mine, ISR wellfield, large mill, centrifuge/laser enrichment, robotic fab/inspection, fuel vault, spent-fuel vault, 400 kV yard, superconducting link, thermal/pumped storage, river pumping station, EDI, reservoir, HQ, research campus, robotics hub, gas-turbine backup) + 9 research nodes.
5. Fuel Storage Facility moved to Fuel Cycle tab; dry casks got visible capacity, faster loading, reprocessing shipments.
6. Late-game megaprojects (Gigawatt reactor, Mega tower, HVDC, data centre, hydrogen, RO water, isotopes, visitor centre, rail terminal).
7. Fixed PWR startup short-period trips (boron dilution stops once supercritical).
8. Supply chain made meaningful (daily market fuel quota, MSR burns enriched uranium, material order board).

## User preferences learned
- Wants things to feel big, cool and realistic, but clear and easy to read on a phone.
- Asks to be told the plan and asked questions before big changes.
- Moving buildings must be free and must never stop anything.
- Tiers must be strictly better than the tier below.

## Open ideas / not done
- Nothing pending from the last request. Possible next steps: more polish of new 3D models, checking late-game balance with the new tiers in a long bot run, physical cables/pipes in the web version (the Roblox brief plans these).
