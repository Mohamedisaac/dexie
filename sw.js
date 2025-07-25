const CACHE_NAME = 'terminology-dictionary-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    'https://unpkg.com/dexie@3/dist/dexie.js',
    './manifest.json',
    './biology.json',
    './physics.json',
    './soomaali_mansuur.json',
    './geography.json',
    './images/icon-192x192.png',
    './images/icon-512x512.png',
    './images/screen1.jpg',
    './images/screen2.jpg',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});