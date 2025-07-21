const CACHE_NAME = 'terminology-dictionary-v1';

// The base path of your application on the server.
// This is crucial for GitHub Pages deployment.
const BASE_PATH = '/dexie/';


// A list of all the files and assets we want to cache for offline use.
const URLS_TO_CACHE = [
    BASE_PATH,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}style.css`,
    `${BASE_PATH}app.js`,
    `${BASE_PATH}https://unpkg.com/dexie@3/dist/dexie.js`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}biology.json`,
    `${BASE_PATH}physics.json`,
    `${BASE_PATH}geography.json`,
    `${BASE_PATH}soomaali_mansuur.json`,
    `${BASE_PATH}images/icon-192x192.png`,
    `${BASE_PATH}images/icon-512x512.png`,
    `${BASE_PATH}images/screen1.jpg`,
    `${BASE_PATH}images/screen2.jpg`,
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