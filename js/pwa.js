/* Installable app: offline cache and persistent storage for the save. Not part of the game logic. */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
