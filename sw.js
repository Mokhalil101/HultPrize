/* Startup Tycoon service worker: cache the app shell so the game works offline after the first visit. */
const VERSION = "startup-tycoon-v1";
const ASSETS = ["./", "./index.html", "./css/style.css", "./js/data.js", "./js/engine.js", "./js/save.js", "./js/i18n.js", "./js/ui.js", "./manifest.webmanifest", "./favicon.svg"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit || caches.match("./index.html"));
      return hit || net;
    })
  );
});
