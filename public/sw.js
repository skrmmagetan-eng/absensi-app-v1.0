const CACHE_NAME = 'skrm-v7-' + Date.now();
const STATIC_CACHE = 'skrm-static-v7';
const DYNAMIC_CACHE = 'skrm-dynamic-v7';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/style.css',
    '/src/mobile.css',
    '/src/loading.css',
    '/src/main.js',
    '/src/lib/router.js',
    '/src/lib/supabase.js'
];

// Install Event - Force immediate activation for updates
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker: Installing new version...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('📦 Service Worker: Caching static assets');
                return cache.addAll(ASSETS_TO_CACHE);
            }),
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Activate Event - Clean up old caches aggressively
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker: Activating new version...');
    
    event.waitUntil(
        Promise.all([
            // Delete ALL old caches
            caches.keys().then((cacheNames) => {
                const deletePromises = cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                });
                return Promise.all(deletePromises);
            }),
            // Take control of all clients immediately
            self.clients.claim(),
            // Notify all clients about the update
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        message: 'Aplikasi telah diperbarui! Refresh untuk menggunakan versi terbaru.'
                    });
                });
            })
        ])
    );
});

// Message handler for manual update triggers
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        console.log('🚀 Service Worker: Manual update triggered');
        self.skipWaiting();
    }
    
    if (event.data && event.data.action === 'clearAllCaches') {
        console.log('🧹 Service Worker: Clearing all caches');
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

// Fetch Event - Network-first strategy for dynamic content
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests or external origins
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    const url = new URL(event.request.url);
    
    // Static assets - Cache first strategy
    if (ASSETS_TO_CACHE.some(asset => url.pathname.endsWith(asset.replace('/', '')))) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request).then((response) => {
                    const responseClone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
        );
        return;
    }

    // Dynamic content - Network first, fallback to cache
    event.respondWith(
        fetch(event.request).then((response) => {
            // Only cache successful responses
            if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            // Network failed, try cache
            return caches.match(event.request);
        })
    );
});
