const CACHE_NAME = 'bfx-qms-v4';
const ASSETS = [
  '/BFM/',
  '/BFM/index.html',
  '/BFM/manifest.json',
  '/BFM/icon-192.png',
  '/BFM/icon-512.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Black Fox QMS', {
      body: data.body || 'You have a new notification',
      icon: '/BFM/icon-192.png',
      badge: '/BFM/icon-192.png',
    })
  );
});
