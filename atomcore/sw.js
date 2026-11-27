// Replaces ATOMCORE's old service worker: clears only ATOMCORE's caches,
// unregisters itself and sends open windows to Rift Shop.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.includes('/atomcore/')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach((w) => w.navigate(new URL('../riftshop/', self.registration.scope).href));
  })());
});
