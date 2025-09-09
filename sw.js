const CACHE_NAME = 'terminology-dictionary-v4'; // Increment version for new updates
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

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force activate new service worker
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

// Listen for messages from the main app to check for updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
