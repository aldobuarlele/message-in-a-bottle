// === Message in a Bottle — Service Worker ===
// Memberikan kemampuan PWA: offline support, caching, dan installable app

const CACHE_NAME = 'message-in-a-bottle-v1';

// Aset yang akan di-cache saat service worker diinstall
const PRECACHE_URLS = [
  '/',
  '/Index.html',
  '/Script.js',
  '/config.js',
  '/public/manifest.json',
  '/public/404.html',
  '/public/icons/icon-192.svg',
  '/public/icons/icon-512.svg',
];

// ============================
// INSTALL — Pre-cache aset statis
// ============================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================
// ACTIVATE — Bersihkan cache lama
// ============================
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ============================
// FETCH — Strategi: Network First, fallback ke cache
// ============================
self.addEventListener('fetch', (event) => {
  // API requests — jangan di-cache (privacy: pesan tidak boleh tersimpan di cache)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response karena response stream hanya bisa dikonsumsi sekali
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Jika network fail, ambil dari cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika tidak ada di cache, kembalikan halaman 404 kustom
          return caches.match('/public/404.html');
        });
      })
  );
});
