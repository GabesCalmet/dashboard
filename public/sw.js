// Deliberately minimal: this app is live, authenticated, data-driven
// (grades, payments, schedules) — caching real pages or API responses
// risks showing someone stale financial/academic data while "offline"
// looks like it's working. All this does is make the app installable and
// show a friendly screen instead of a browser error when there's no
// connection; every actual page/data request always goes to the network.
const CACHE_NAME = "upfront-shell-v1";
const PRECACHE_URLS = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only intervene for page navigations — never for API/data/action
  // requests, which must always hit the network untouched.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html"))
  );
});
