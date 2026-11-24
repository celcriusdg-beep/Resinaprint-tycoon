I want to build a ROBLOX game called ATOMCORE: a realistic nuclear power plant tycoon. I already built a full web version (TypeScript + Three.js) and everything it does is described below. We are NOT porting it in one go. We start from zero and build up slowly, one small playable step at a time, and every step must work and be tested before we move on.

Before you write any code, read this whole brief, then ask me any questions you have, then propose the plan for Phase 0 only.

=====================================================================
1. HOW YOU MUST WORK (rules)
=====================================================================

TOOLS
- Everything is built DIRECTLY IN ROBLOX STUDIO on my PC. No Rojo, no GitHub, no external code sync.
- Luau with --!strict typing in every script.
- If you have a Roblox Studio connection/tool (e.g. a Studio MCP plugin), use it to create and edit scripts and instances in Studio yourself. If not, give me each script complete (never partial snippets), and tell me exactly where it goes in the Explorer (e.g. ServerScriptService > Sim > ReactorPhysics, a ModuleScript), what type it is (Script / LocalScript / ModuleScript), and what to name it.
- Keep a clean Explorer structure: ServerScriptService (server logic), ServerStorage (server-only modules/data), ReplicatedStorage (shared modules, RemoteEvents, assets), StarterPlayerScripts / StarterGui (client UI and visuals). Set it up in Phase 0 and document it.
- Backups instead of git: after every working step, tell me to save/publish (File > Publish to Roblox, which keeps version history) and to save a local .rbxl copy with the phase number in the name (e.g. ATOMCORE_phase2_cables.rbxl).
- BLENDER FOR ALL ASSETS. Every 3D model (reactors, turbines, cooling towers, pylons, cables, pipes, trucks, excavators, terrain props) is made in Blender — no free-model toolbox assets, no plain Part-boxes as final art.
  - If you can run Blender from the command line, write Blender Python scripts (bpy) that generate the models, keep those scripts in a project folder on my PC (ATOMCORE/blender/scripts), and export FBX into ATOMCORE/blender/exports.
  - If you can't run Blender yourself, write the bpy script anyway and tell me exactly how to run it and how to import the FBX into Studio (3D Importer / Asset Manager).
  - Keep models low-poly and stylised-realistic, real-world scale (1 stud ≈ 0.28 m; say which scale you use), sensible triangle budgets for mobile, pivot at the footprint centre on the ground, separate meshes for moving parts (fans, turbine shafts, wheels, cranes) so they can be animated.
  - Name things consistently: ReactorPWR_T2, TurbineHall_T1, CoolingTower_T2, etc.
- OBSIDIAN DOCUMENTATION. Keep an Obsidian vault in a folder on my PC (ATOMCORE/docs). Document EVERYTHING you build, as you build it:
  - One note per system (e.g. "Reactor Physics.md", "Power Grid & Cables.md", "Fuel Cycle.md", "Water System.md", "Economy.md", "Save System.md").
  - Each note says: what it does in game terms, how it works (formulas, numbers, units, sources for the realism), how it's made (which scripts/modules and their exact Explorer path, which Blender files, data flow), how to test it, known limitations.
  - Also keep the full current source of every script in the notes (or in ATOMCORE/docs/Scripts/), so the vault is a complete backup of the code.
  - One note per asset with the Blender script name, poly count, materials, and how it was imported.
  - A "Devlog.md" with a dated entry for every work session: what was done, what was tested, what's next.
  - An "Index.md" (map of content) linking everything with [[wikilinks]], plus tags like #system #asset #todo.
  - A "Roadmap.md" mirroring the phases below with checkboxes.

ARCHITECTURE
- Server-authoritative. All simulation (physics, money, power flow) runs on the server in ModuleScripts; the client only renders, animates and sends requests through RemoteFunctions/RemoteEvents. Validate every client request on the server (anti-exploit: cost, ownership, placement, rate limits).
- Keep the simulation pure and separate from visuals: a Sim module that takes state + dt and returns new state, testable without any 3D. Use a fixed tick (e.g. 10 Hz) with sub-stepping for the fast physics.
- Each player gets their own plot (a fenced site on the map). Plots must work for multiple players on one server.
- Saving with DataStoreService (versioned save format with migration, autosave, save on leave, retry with backoff, session locking).
- Write unit tests for the simulation (a simple test runner ModuleScript plus a Script that runs all tests when I press Play, or that I can run from the command bar) and run them every phase.
- Mobile + PC controls from day one (touch, mouse/keyboard; also design UI for phones).

REALISM — THIS IS THE CORE OF THE GAME
- Physics/engineering must be realistic (simplified, but physically correct in behaviour and units).
- NOTHING connects by magic. The player must physically build the connections:
  - POWER CABLES: generators → step-up transformer → switchyard/substation → transmission line on pylons → grid connection point at the plot edge. Cables are actual objects the player places, routed along pylons/cable trays, with a max span between pylons, visible sag (catenary), voltage level (LV / MV / HV / EHV), a current/MW rating, and resistive losses (I²R) that depend on length and voltage. Wrong voltage = needs a transformer. Overloaded cable = heats up, trips its breaker, and can fail.
  - STEAM PIPES: reactor/steam generator → turbine. Pipe diameter limits flow; long pipes lose pressure and heat.
  - COOLING WATER PIPES: condenser ↔ cooling tower (or river intake), with pumps that need electricity.
  - WATER PIPES: intake/wells → treatment → reactor make-up.
  - Plant house load: pumps, fans and control systems consume electricity from your own plant or from the grid.
- A building that isn't connected doesn't work, and the Status screen tells the player exactly which connection is missing.

=====================================================================
2. THE GAME (what my web version already has)
=====================================================================

CORE LOOP
Reactor makes heat → steam → turbine makes electricity → cooling rejects waste heat → electricity is exported to the grid and sold → money → build/upgrade/research → bigger plants. Starts with a small pilot reactor, ends with gigawatt reactors, fusion, mining empires and multiple sites.

TIME
1 real second = 0.1 game hours; a game day = 240 real seconds (demand and price follow a day curve with a morning ramp and an evening peak).

REACTOR PHYSICS (simplified but real behaviour)
- One-group point kinetics with delayed neutrons: β (delayed neutron fraction) ≈ 650 pcm for LWRs, ~330 for molten salt, ~350 for fast reactors; precursor decay λ ≈ 0.08/s. Prompt jump. Prompt-critical excursion if reactivity ≥ β. Neutron source floor so a shut-down core reads ~0.1%.
- Reactivity (pcm) = fuel excess (falls with burnup, rises with enrichment) − control rods (S-curve integral worth) − soluble boron (≈10 pcm/ppm, PWR/SMR only) − xenon − Doppler (fuel temperature) + moderator temperature coefficient (more negative with less boron; clamp) + BWR void/recirculation-flow coefficient.
- Xenon/Iodine: I half-life ~6.6 h, Xe ~9.1 h (scaled to game time), xenon burnout by neutron flux; xenon peak after shutdown can stop a restart ("xenon pit").
- Reactor period meter: stable period (β−ρ)/(λρ). Automatic rod control aims for a ~20–30 s period on startup and never shorter; automatic boron (chemical shim) dilutes while the core is subcritical and STOPS once power is rising (bug I had: dilution kept going and caused short-period trips — avoid this).
- Temperatures: coolant and fuel centreline, heat-up from energy balance; warn/trip/boil temperatures per reactor type.
- Decay heat after shutdown: two-group model (~4.5% decaying over ~10 game-time units + ~2% decaying slower).
- Safety systems: Reactor Protection System trips (SCRAM) on high flux (118%), short period (<10 s), high temperature, low coolant level, loss of offsite power. Rare ATWS (failure to scram) needing a manual SCRAM. Residual heat removal when shut down (needs powered pumps), battery-backed emergency feedwater for 60 s of blackout, steam dump, ECCS refills coolant when powered, passive cooling for small/advanced designs.
- Core damage: fuel > 1200 °C damages cladding, ~2800 °C melts; results in an INES-rated incident, a destroyed reactor that must be decommissioned, fines and public outcry.
- Control room UI: power target, rods (auto/manual), boron (auto/manual), coolant pump speed, period, k-eff, decay heat, temperature bars with warn/trip/boil marks, reactivity balance breakdown, SCRAM button, restart.

REACTOR TYPES (tiered)
T1 Pilot reactor (24 MWth) and SMR (80 MWth); T2 PWR (650 MWth) and SMR Power Park (6 modules, 900 MWth); T3 BWR (1800 MWth) and Sodium Fast Reactor (3000 MWth, 40% efficient, breeds fuel); T4 Gigawatt Gen III+ PWR (4500 MWth, double containment) and Molten Salt Reactor (5200 MWth, online refuelling by dissolving enriched uranium); T5 Fusion demonstration plant.

PLANT SYSTEMS
- Turbines: steam capacity limits usable heat; better turbines also add efficiency points (T1 small hall, T2 medium +1, T3 large +2, T4 supercritical +4, T5 sCO₂ +7 and MHD topping cycle +10). Plant efficiency is the steam-weighted average, capped ~60%.
- Cooling: must reject (heat − electricity). Wet (evaporates water) vs water-free (dry condensers, once-through river/sea cooling, radiative sky cooling). Cooling overload → temperature rises → trip.
- Water: evaporation ≈ 1.6 m³/h per MW rejected wet; demineralised make-up ≈ 0.04 m³/h per MWth. Sources: wells, river intake, reverse osmosis (uses electricity), pumping stations; treatment plants make demineralised water; tanks/reservoirs buffer it. Not enough demineralised water → reactors derate (this confused me once: "50% power but no MW" — the Status tab must explain such things clearly).
- Grid: export capacity from substations/HVDC; contracts get power first, then the regional market (demand limited), surplus sells at 20% price; batteries, molten-salt thermal storage and pumped hydro shift energy to the evening peak.
- Emergency power: diesel / gas-turbine backup must cover pumps during a grid blackout or big reactors melt.
- Staff capacity (admin/HQ), maintenance crews (slower wear, auto-repair), research labs.

FUEL CYCLE
Open-pit mine (buy excavators from compact to bucket-wheel, and haul trucks; dig vs haul bottleneck; ore reserves deplete; upgrading digs deeper) → ore mill (10 t ore : 1 yellowcake) → enrichment (3–5% U-235, higher enrichment needs more yellowcake) → fuel fabrication (quality-assurance slider: faster line = more defective rods) → inspection lab catches defects → fuel assemblies.
- Reactors refuel in outages (batch = 1/3 core, or full core). Defective rods can fail in the core → leak, power limits.
- Market fuel is limited per game day and gets pricier the more you buy that day; rail terminals raise the quota.
- Spent fuel goes to the reactor's pool (1.5 cores per reactor). Pools full = no refuelling. Dry cask pads/underground vaults move it out ($ per assembly); ship to reprocessing (returns some uranium).
- Material order board: buyers pay a premium for self-produced ore/yellowcake/enriched uranium (not resold market stock).
- Higher tiers: underground mine (no vehicles), in-situ recovery wellfield (makes yellowcake directly), heap-leach mill, centrifuge and laser enrichment, robotic fabrication, automated inspection, high-bay fuel vault.

INDUSTRY ON SITE
Data centre (buys power behind the meter at 1.8× price; shortfall imported at 2×), hydrogen electrolysis (eats unsellable power at 75% price), medical isotopes (income from neutron flux), visitor centre (tourism; more for running reactors and cooling towers).

TIER RULE (important)
Every category's build menu is split into tier tabs: T1 Basic, T2 Improved, T3 Advanced, T4 Industrial, T5 Cutting-edge. Inside a tier, buildings are sorted weakest → best. Within the same job (e.g. fuel storage), EVERY building in a higher tier must beat EVERY building in a lower tier on its main stat. Enforce this with a unit test. Cards show tier badge, main stat, value per tile and per $1k, upkeep, staff, build time, size, lock reason.

ECONOMY & PROGRESSION
- Electricity price follows a daily curve plus a slow random market walk; regional demand grows with company level.
- Power contracts (local → regional → national → global): deliver X MW for a duration for a premium, bonus on completion, penalty on under-delivery.
- Upkeep, salaries, water costs, maintenance; emergency credit line with interest so you can never soft-lock.
- Research tree (~60 projects in 9 categories) unlocking buildings and bonuses; company levels from XP (MWh sold); achievements; milestones with rewards; daily objectives; prestige; multiple sites (river valley, coastal, desert with no water, arctic) with different ambient temperatures, water and ore grades.
- Land: plots start small and you buy expansions (cost grows each step, per-site max size).
- Moving buildings is free and instant, and does NOT interrupt anything (reactors keep running, upgrades keep progress). With physical cables/pipes, moving a building must either drag its connections along or mark them as disconnected — decide this with me.
- Random events (heatwave, grid blackout, equipment failure, fuel price spike, demand surge), wear and breakdowns, repairs.
- Offline earnings (capped), autosave.

STATUS SCREEN
A tab listing everything that's OK and everything that's wrong, per system (reactors, turbines, cooling, water, fuel, grid, staff, safety), each problem with a plain-language explanation and a one-tap fix button (open the reactor, build X, refuel, repair, buy fuel…). The headline per reactor explains exactly why it isn't producing.

=====================================================================
3. ROADMAP — START SMALL, BUILD UP
=====================================================================
Do these in order. Each phase ends with: playtest in Studio, unit tests passing, Obsidian notes + devlog updated, place saved/published and a local .rbxl backup. Stop after each phase and show me what to test.

Phase 0 — Setup: Explorer folder structure in Studio, --!strict, test runner, Obsidian vault skeleton (Index, Roadmap, Devlog, Conventions), Blender pipeline test (one simple bpy-generated asset imported in Studio), empty baseplate with one player plot.
Phase 1 — Plot & building placement: grid snapping, rotation, collision check, ghost preview (green/red), free instant move, demolish, mobile + PC controls, one placeholder building from Blender.
Phase 2 — The physical connection system: placeable power cables with pylons (span limit, sag, voltage levels, ratings, I²R losses, transformers), steam pipes and water pipes, a connection graph on the server, and a debug overlay showing flows. No reactor yet — test with a dummy generator and a dummy load.
Phase 3 — First power: pilot reactor (simple heat output at first), small turbine, fan cooling, transformer + substation + grid connection at the plot edge, money from selling power, basic HUD.
Phase 4 — Real reactor physics: point kinetics, rods, temperatures, SCRAM and restart, control room UI, decay heat. Unit tests for startup without trips.
Phase 5 — Saving (DataStore), economy loop, upkeep, staff, levels/XP, Status screen.
Phase 6 — Water system and cooling realism; xenon and boron; SMR.
Phase 7 — Fuel cycle (burnup, refuelling, market fuel limits, spent fuel pools, dry casks).
Phase 8 — Research tree, tiers T1–T3, PWR/BWR, big turbines and cooling towers (Blender hero assets).
Phase 9 — Mining, processing, vehicles; contracts and order board; events.
Phase 10 — T4–T5, multiple sites, industry, prestige, polish, performance on mobile.

Start with Phase 0. First ask me your questions.
