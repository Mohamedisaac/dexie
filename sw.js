// IMPORTANT: Change this version number every time you deploy an update
// to ensure users receive the new files. Increment it for every change!
const CACHE_NAME = 'terminology-dictionary-v3'; // Increased version to v3
const urlsToCache = [
    './', // Caches the root path (e.g., index.html)
    './index.html',
    './style.css',
    './app.js',
    'https://unpkg.com/dexie@3/dist/dexie.js', // External library
    './manifest.json',
    // Dictionary JSON files
    './xisaab.json',
    './bayoloji.json',
    './fisikis.json',
    './soomaali_mansuur.json',
    './juqraafi.json',
    './doorashooyinka.json',
    // Images
    './images/icon-192x192.png',
    './images/icon-512x512.png',
    './images/screen1.jpg',
    './images/screen2.jpg',
];

// --- INSTALL: Cache the app shell and static assets ---
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Cache:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching all app shell content.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[Service Worker] Failed to open cache or add all URLs:', error);
                // Even if addAll fails for some resources, the service worker might still install.
            })
    );
    // self.skipWaiting() is removed here for silent updates.
    // The new service worker will wait until all old clients are gone.
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating new Service Worker:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete caches that are not the current CACHE_NAME
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // After old caches are cleaned up, claim control over existing clients.
            // This is crucial for the new service worker to take effect without a hard refresh
            // if the user navigates within the app, but without a notification.
            console.log('[Service Worker] Claiming clients.');
            return self.clients.claim();
        }).catch(error => {
            console.error('[Service Worker] Error during activation or cache cleanup:', error);
        })
    );
});

// --- FETCH: Stale-While-Revalidate Strategy ---
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // Fetch the resource from the network (always try to get the latest)
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Check if we received a valid response before caching
                    // (e.g., not a 404, not opaque, etc.)
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        // If valid, clone the response and put it in the cache
                        cache.put(event.request, networkResponse.clone());
                        console.log(`[Service Worker] Fetched and updated cache for: ${event.request.url}`);
                    } else if (networkResponse) {
                        console.warn(`[Service Worker] Not caching invalid network response for: ${event.request.url} (Status: ${networkResponse.status}, Type: ${networkResponse.type})`);
                    }
                    return networkResponse;
                }).catch(error => {
                    // Network request failed (e.g., offline), return cached response if available
                    console.warn(`[Service Worker] Network fetch failed for ${event.request.url}. Serving from cache if available.`, error);
                    return cachedResponse; // In case of network error, rely on cache
                });

                // Return the cached response immediately if it exists,
                // otherwise wait for the network response.
                // This is the core of stale-while-revalidate.
                return cachedResponse || fetchPromise;
            });
        }).catch(error => {
            console.error(`[Service Worker] Error accessing cache in fetch handler for ${event.request.url}:`, error);
            // Fallback to just network if cache access fails
            return fetch(event.request);
        })
    );
});