/* Offline support. Game files: network first (updates arrive when online), cache as fallback.
   Google Fonts: cache first. Bump VERSION when the file list changes. */
const VERSION = 'resinaprint-4.23-1';
try { importScripts('sw-assets.js'); } catch (e) { self.OFFICIAL_FILES = []; }
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'css/fonts.css', 'fonts/BarlowCondensed-500-latin-ext.woff2', 'fonts/BarlowCondensed-500-latin.woff2', 'fonts/BarlowCondensed-600-latin-ext.woff2', 'fonts/BarlowCondensed-600-latin.woff2', 'fonts/BarlowCondensed-700-latin-ext.woff2', 'fonts/BarlowCondensed-700-latin.woff2', 'fonts/Bungee-400-latin-ext.woff2', 'fonts/Bungee-400-latin.woff2', 'fonts/Karla-400-800-latin-ext.woff2', 'fonts/Karla-400-800-latin.woff2',
  'js/data.js', 'js/state.js', 'js/simulation.js', 'js/actions.js', 'js/expansions.js', 'js/art.js', 'js/images.js',
  'js/patch-notes.js', 'js/progression.js', 'js/vault.js', 'js/energy.js', 'js/inventory.js', 'js/machines.js', 'js/machart.js', 'js/machui.js', 'js/machtiers.js', 'js/fx.js', 'js/story.js', 'js/tree.js', 'js/skilltree.js', 'js/minigame.js', 'js/shop.js', 'js/workshop.js', 'js/spaces.js', 'js/chests.js', 'js/rebirth2.js', 'js/fleet.js', 'js/singularity.js', 'js/endgame.js', 'js/iconfx.js', 'js/audio.js', 'js/retention.js', 'js/offline.js', 'js/deals.js', 'js/floor.js', 'js/powerups.js', 'js/ip.js', 'js/props.js', 'js/ip2.js', 'js/catalog2.js', 'js/research.js', 'js/stockplan.js', 'js/clients.js', 'js/craft.js', 'js/showroom.js', 'js/moulds.js', 'css/showroom.css', 'css/powerups.css', 'css/deals.css', 'css/retention.css', 'audio/bad.mp3', 'audio/buy.mp3', 'audio/cash.mp3', 'audio/chest_open0.mp3', 'audio/chest_open1.mp3', 'audio/chest_open2.mp3', 'audio/chest_shake.mp3', 'audio/coin.mp3', 'audio/forge.mp3', 'audio/glitch.mp3', 'audio/good.mp3', 'audio/level.mp3', 'audio/notify.mp3', 'audio/off.mp3', 'audio/on.mp3', 'audio/pack.mp3', 'audio/perk.mp3', 'audio/print_done.mp3', 'audio/rival.mp3', 'audio/select.mp3', 'audio/send.mp3', 'audio/tap.mp3', 'audio/unstable.mp3', 'audio/whoosh.mp3', 'css/iconfx.css', 'img/ui/channels.webp', 'img/ui/chest.webp', 'img/ui/paint.webp', 'img/ui/wash-mercury.webp', 'img/ui/wash-acplus.webp', 'img/ui/wash-wcmax.webp', 'img/ui/wash-formwc.webp', 'img/ui/wash-formwcl.webp', 'img/ui/dispatch.webp', 'img/ui/fleet.webp', 'img/ui/gear.webp', 'img/ui/printers.webp', 'img/ui/resin.webp', 'img/ui/skill.webp', 'img/ui/space.webp', 'img/ui/stores.webp',  'css/endgame.css', 'css/singularity.css', 'css/fleet.css', 'css/rebirth2.css', 'css/chests.css', 'js/animate.js', 'js/dispatch.js', 'js/line.js', 'css/game.css', 'css/premium.css', 'age-of-resin/index.html', 'age-of-resin/style.css', 'age-of-resin/data.js', 'age-of-resin/art.js', 'age-of-resin/game.js', 'js/rebirth.js', 'js/world.js', 'js/viewer3d.js', 'js/views.js', 'js/main.js', 'js/pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES).then(() => Promise.allSettled((self.OFFICIAL_FILES || []).map(u => c.add(u))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/music/')) return; // streamed with range requests, not cached
  if (url.origin === location.origin) {
    e.respondWith(fetch(req,{cache:'no-cache'}).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION + '-fonts').then(c => c.put(req, copy)); return res;
    })));
  }
});
