var V = 'resinaprint-v17';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'logo.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin === location.origin) {
    // Own files: try the network first so updates arrive, fall back to the saved copy when offline.
    e.respondWith(
      fetch(r).then(function (res) {
        var cp = res.clone();
        caches.open(V).then(function (c) { c.put(r, cp); });
        return res;
      }).catch(function () {
        return caches.match(r).then(function (m) { return m || caches.match('index.html'); });
      })
    );
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    // Fonts: keep the first download so the app looks the same offline.
    e.respondWith(
      caches.match(r).then(function (m) {
        return m || fetch(r).then(function (res) {
          var cp = res.clone();
          caches.open(V).then(function (c) { c.put(r, cp); });
          return res;
        });
      })
    );
  }
});
