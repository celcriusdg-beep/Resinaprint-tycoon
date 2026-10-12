# Resinaprint Tycoon 2.1

Mobile resin-printing tycoon game, split from the original single file
(`original/Resinaprint-Tycoon-v2.1.html`, kept for reference) into a multi-file project.
No build step: open `index.html` directly or serve the folder with any static server.

```
index.html          markup (header, tab bar, modal/toast roots)
css/style.css       all styles
js/data.js          products, printers, resins, roles, spaces, carriers, upgrades, campaigns, goals
js/state.js         helpers, game state, save migration, local + cloud save, derived stats
js/simulation.js    production, delivery, messages, contracts, live clock, staff AI, admin, events
js/actions.js       player actions, modals, intro, game over, away report
js/expansions.js    v10–v12 content: social media, word of mouth, offers, catalog, quests, reviews
js/art.js           SVG printer and figure pictures
js/images.js        embedded product photos
js/patch-notes.js   version + patch notes popup
js/progression.js   studio level, trends, difficulty, themes, Empire › More
js/viewer3d.js      WebGL 3D viewer
js/views.js         Studio / Orders / Buy / Team / Empire screens and render()
js/main.js          event wiring and start
```

The files are plain (non-module) scripts loaded in order, so they share one global scope exactly
like the original `<script>` did, and the game still works from `file://`. The JS is the original
code byte for byte, cut at its own section markers. The save key (`resinaprint-tycoon-v2`) is
unchanged, so existing saves keep working.

## Equivalence test

`node tests/compare.mjs [days]` runs the original and the copy side by side in a 390 px Chromium
with seeded randomness and a frozen clock, plays the same scripted days, and compares full game
state, every rendered screen, 3D geometry, screenshots, the live clock, the away report and
save/reload. Latest result: `tests/REPORT.md`; side-by-side screenshots: `tests/screenshots/`.
