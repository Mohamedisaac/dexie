const CACHE_NAME = 'terminology-dictionary-v4'; // bump version when updating
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
    './images/icon-192x192.png',
    './images/icon-512x512.png',
    './images/screen1.jpg',
    './images/screen2.jpg',
];

// Install - cache essential assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // activate immediately
});

// Fetch - stale-while-revalidate strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request)
                    .then(networkResponse => {
                        // Update the cache with a fresh copy
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => response); // fallback to cache if offline
                return response || fetchPromise;
            });
        })
    );
});

// Activate - clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // take control of all pages immediately
});
