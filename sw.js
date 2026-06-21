const CACHE_NAME = 'bit-app-v1';

// Tous les fichiers du "coquille applicative" à mettre en cache
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/firebase-config.js',
  './js/roles.js',
  './js/auth.js',
  './js/agences.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Laisse passer Firebase directement (jamais intercepté par le cache)
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com')) {
    return;
  }

  const isAppShell = FILES_TO_CACHE.some(f => event.request.url.includes(f.replace('./',''))) ||
                      event.request.mode === 'navigate';

  if (isAppShell) {
    // Réseau d'abord (toujours la dernière version si en ligne), cache en secours
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Reste : cache d'abord, réseau en secours
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
