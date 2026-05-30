const CACHE = "hendrix-tms-v2";
const ASSETS = [
  "/ProFlow/",
  "/ProFlow/index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"
];

// ── INSTALL & CACHE ───────────────────────────────────────────────────────────
self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", ev => {
  if(ev.request.url.includes("supabase.co") || ev.request.url.includes("resend.com")) return;
  ev.respondWith(
    fetch(ev.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(ev.request, clone));
      return res;
    }).catch(() => caches.match(ev.request))
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener("push", ev => {
  if(!ev.data) return;
  let data;
  try { data = ev.data.json(); } catch(e) { data = { title: "Hendrix TMS", body: ev.data.text() }; }

  ev.waitUntil(
    self.registration.showNotification(data.title || "Hendrix TMS", {
      body: data.body || "",
      icon: "/ProFlow/icon-192.png",
      badge: "/ProFlow/icon-192.png",
      tag: data.tag || "hendrix-tms",
      data: data.url || "/ProFlow/",
      vibrate: [200, 100, 200],
      requireInteraction: data.urgent || false,
      actions: data.actions || []
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", ev => {
  ev.notification.close();
  const url = ev.notification.data || "/ProFlow/";
  ev.waitUntil(
    clients.matchAll({type: "window"}).then(clientList => {
      for(const client of clientList) {
        if(client.url.includes("/ProFlow/") && "focus" in client) {
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
