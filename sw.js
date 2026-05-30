const CACHE_NAME = "hendrix-tms-v3";
const ASSETS = [
  "/ProFlow/",
  "/ProFlow/index.html",
];

// ── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener("install", ev => {
  console.log("SW installing v3");
  ev.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{}))
  );
  self.skipWaiting(); // Activate immediately without waiting
});

// ── ACTIVATE — Clean old caches ───────────────────────────────────────────────
self.addEventListener("activate", ev => {
  console.log("SW activating v3 — clearing old caches");
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log("Deleting old cache:", k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Take control immediately
  );
  // Notify all open tabs to reload
  self.clients.matchAll({type:"window"}).then(clients => {
    clients.forEach(client => {
      client.postMessage({type:"SW_UPDATED", version:"v3"});
    });
  });
});

// ── FETCH — Network first, cache fallback ─────────────────────────────────────
self.addEventListener("fetch", ev => {
  // Never cache API calls
  if(ev.request.url.includes("supabase.co") || 
     ev.request.url.includes("resend.com") ||
     ev.request.url.includes("googleapis.com")) return;

  ev.respondWith(
    fetch(ev.request, {cache: "no-cache"})
      .then(res => {
        if(res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(ev.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(ev.request))
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener("push", ev => {
  if(!ev.data) return;
  let data;
  try { data = ev.data.json(); } catch(e) { data = {title:"Hendrix TMS", body:ev.data.text()}; }

  ev.waitUntil(
    self.registration.showNotification(data.title || "Hendrix TMS", {
      body: data.body || "",
      icon: "/ProFlow/icon-192.png",
      badge: "/ProFlow/icon-192.png",
      tag: data.tag || "hendrix-tms",
      data: data.url || "/ProFlow/",
      vibrate: data.urgent ? [300,100,300,100,300] : [200,100,200],
      requireInteraction: data.urgent || false,
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", ev => {
  ev.notification.close();
  ev.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(clientList => {
      for(const client of clientList) {
        if(client.url.includes("/ProFlow/") && "focus" in client) return client.focus();
      }
      return clients.openWindow("/ProFlow/");
    })
  );
});
