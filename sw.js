const CACHE_NAME = 'terminology-dictionary-v4'; // ⬅️ Increment this on every major update!
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  'https://unpkg.com/dexie@3/dist/dexie.js',
  './manifest.json',
  './xisaab.json',
  './bayoloji.json',
  './fisikis.json',
  './soomaali_mansuur.json',
  './juqraafi.json',
  './doorashooyinka.json',
  './images/icon-192x192.png',
  './images/icon-512x512.png',
  './images/screen1.jpg',
  './images/screen2.jpg',
];

// Install event — cache core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate worker immediately

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache assets:', err);
      })
  );
});

// Activate event — clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated and old caches cleaned.');
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event — stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests (like POST, PUT, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Clone the request to avoid locking issues
      const fetchRequest = event.request.clone();

      // Fetch from network (in background)
      const fetchPromise = fetch(fetchRequest)
        .then(networkResponse => {
          // Only cache valid responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone response to cache it
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If fetch fails, return cached version (for offline)
          return cachedResponse;
        });

      // Return cached response immediately if available, else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});