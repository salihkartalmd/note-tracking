const CACHE_NAME = 'mss-tracker-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch((err) => console.warn('SW cache addAll failed:', err))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch - network first for navigation, cache first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    (async () => {
      // For navigation requests, try network first
      if (event.request.mode === 'navigate') {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, response.clone());
            return response;
          }
        } catch (e) { /* network failed, fall through to cache */ }
        const cached = await caches.match(event.request);
        return cached || caches.match('./index.html');
      }

      // For other requests, try cache first
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        // Only cache same-origin successful responses
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (e) {
        // Return a basic offline response for failed requests
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
