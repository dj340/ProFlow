const CACHE_NAME = 'bfx-qms-v5';
const ASSETS = [
  '/bfm/',
  '/bfm/index.html',
  '/bfm/manifest.json',
  '/bfm/icon-192.png',
  '/bfm/icon-512.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(data.title || 'Black Fox QMS', {
    body: data.body || 'You have a new notification',
    icon: '/bfm/icon-192.png',
    badge: '/bfm/icon-192.png',
  }));
});
