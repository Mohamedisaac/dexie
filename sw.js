// IMPORTANT: Change this version number every time you deploy an update.
const CACHE_NAME = 'terminology-dictionary-v8';
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

// --- INSTALL: Cache the app shell and assets ---
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Force activation of new service worker
    );
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of open pages
    );
});

// --- FETCH: Stale-While-Revalidate Strategy ---
self.addEventListener('fetch', event => {
    // Ignore non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 1. Create a promise that fetches the request from the network.
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // If we get a valid response, update the cache.
                    if (networkResponse.ok) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });

                // 2. Return the cached response immediately if it exists,
                // while the network request runs in the background.
                // If not in cache, wait for the network response.
                return cachedResponse || fetchPromise;
            });
        })
    );
});