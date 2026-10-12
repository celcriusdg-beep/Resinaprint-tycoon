/* Offline support. Game files: network first (updates arrive when online), cache as fallback.
   Google Fonts: cache first. Bump VERSION when the file list changes. */
const VERSION = 'resinaprint-2.5-1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/data.js', 'js/state.js', 'js/simulation.js', 'js/actions.js', 'js/expansions.js', 'js/art.js', 'js/images.js',
  'js/patch-notes.js', 'js/progression.js', 'js/vault.js', 'js/rebirth.js', 'js/world.js', 'js/viewer3d.js', 'js/views.js', 'js/main.js', 'js/pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
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
