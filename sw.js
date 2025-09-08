// IMPORTANT: Change this version number every time you update your app's files.
const CACHE_NAME = 'terminology-dictionary-v7'; 
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

// Install event: cache all the core assets.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching all assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // <-- IMPORTANT: Forces the waiting service worker to become the active service worker.
    );
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If the cache name is not in our whitelist, delete it.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // <-- IMPORTANT: Takes control of all open clients (pages) so that the new service worker can handle them.
    );
});


// Fetch event: serve from cache first for fast offline access.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response from cache
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            })
    );
});