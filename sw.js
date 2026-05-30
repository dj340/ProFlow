const CACHE = "hendrix-tms-v1";
const ASSETS = [
  "/ProFlow/",
  "/ProFlow/index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", ev => {
  // Network first for API calls, cache first for assets
  if(ev.request.url.includes("supabase.co") || ev.request.url.includes("resend.com")) {
    return; // Always network for API
  }
  ev.respondWith(
    fetch(ev.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(ev.request, clone));
        return res;
      })
      .catch(() => caches.match(ev.request))
  );
});