/* Installable app: offline cache and persistent storage for the save. Not part of the game logic. */
/* Repair: open the game with ?repair=1 to drop the offline cache and service worker (your save is NOT touched). */
async function repairCache(){
  try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}catch(e){}
  try{const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(e){}
}
if(/[?&]repair=1/.test(location.search)){repairCache().then(()=>location.replace(location.pathname))}
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  const had = !!navigator.serviceWorker.controller;
  let reloaded = false;
  /* a new version took over: reload once so the new files run (the game saves constantly) */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || reloaded) return;
    reloaded = true;
    try { if (typeof save === 'function' && S) save(); } catch (e) {}
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* iOS: block pinch gestures. Double-tap zoom is prevented by touch-action:manipulation in the CSS. */
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
