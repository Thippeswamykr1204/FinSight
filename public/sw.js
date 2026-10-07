const CACHE = "finsight-static-v2";
const OFFLINE = "/offline.html";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([OFFLINE, "/app-icons/192", "/app-icons/512"])));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("finsight-static-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
  // Financial pages, API responses, and imported statements are never cached.
});
