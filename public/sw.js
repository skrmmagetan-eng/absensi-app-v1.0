const CACHE_NAME = 'skrm-v7-' + Date.now();
const STATIC_CACHE = 'skrm-static-v7';
const DYNAMIC_CACHE = 'skrm-dynamic-v7';
const OFFLINE_CACHE = 'skrm-offline-v7';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/style.css',
    '/src/mobile.css',
    '/src/loading.css',
    '/src/main.js',
    '/src/lib/router.js',
    '/src/lib/supabase.js',
    // Quick Order assets
    '/src/services/ShoppingCart.js',
    '/src/services/QuickOrderManager.js',
    '/src/services/VisitContextService.js',
    '/src/utils/offline-manager.js'
];

// API endpoints that can work offline
const OFFLINE_FALLBACKS = {
    '/api/products': '/offline/products.json',
    '/api/customers': '/offline/customers.json'
};

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
            // Initialize offline cache
            caches.open(OFFLINE_CACHE).then((cache) => {
                console.log('📴 Service Worker: Initializing offline cache');
                return Promise.resolve();
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
            // Delete old caches (keep offline cache)
            caches.keys().then((cacheNames) => {
                const deletePromises = cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== DYNAMIC_CACHE && 
                        cacheName !== OFFLINE_CACHE) {
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

// Message handler for manual update triggers and offline operations
self.addEventListener('message', (event) => {
    const { action, data } = event.data || {};
    
    if (action === 'skipWaiting') {
        console.log('🚀 Service Worker: Manual update triggered');
        self.skipWaiting();
    }
    
    if (action === 'clearAllCaches') {
        console.log('🧹 Service Worker: Clearing all caches');
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
    
    // Quick Order offline operations
    if (action === 'cacheProductData') {
        event.waitUntil(cacheProductData(data));
    }
    
    if (action === 'cacheCustomerData') {
        event.waitUntil(cacheCustomerData(data));
    }
    
    if (action === 'getCacheStatus') {
        event.waitUntil(
            getCacheStatus().then(status => {
                event.ports[0]?.postMessage(status);
            })
        );
    }
});

// Fetch Event - Enhanced with offline support for Quick Order
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests or external origins
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    const url = new URL(event.request.url);
    
    // API requests - Handle with offline fallback
    if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
        event.respondWith(handleApiRequest(event.request));
        return;
    }
    
    // Images - Cache first strategy
    if (url.pathname.includes('/images/') || url.pathname.includes('/uploads/') || 
        event.request.destination === 'image') {
        event.respondWith(handleImageRequest(event.request));
        return;
    }
    
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

// Handle API requests with offline support
async function handleApiRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses for offline use
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        console.log('📴 API request failed, trying offline fallback:', url.pathname);
        
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try offline fallback data
        const fallbackPath = OFFLINE_FALLBACKS[url.pathname];
        if (fallbackPath) {
            const fallbackResponse = await caches.match(fallbackPath);
            if (fallbackResponse) {
                return fallbackResponse;
            }
        }
        
        // Return offline error response
        return new Response(
            JSON.stringify({
                error: 'Offline',
                message: 'Data tidak tersedia saat offline',
                offline: true,
                timestamp: Date.now()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Offline-Response': 'true'
                }
            }
        );
    }
}

// Handle image requests with offline support
async function handleImageRequest(request) {
    try {
        // Try cache first for images
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache the image
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        // Return placeholder image for offline
        return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                <rect width="200" height="200" fill="#f5f5f5" stroke="#ddd" stroke-width="2"/>
                <text x="100" y="90" text-anchor="middle" fill="#999" font-size="14">📷</text>
                <text x="100" y="110" text-anchor="middle" fill="#999" font-size="12">Offline</text>
                <text x="100" y="125" text-anchor="middle" fill="#999" font-size="10">Image not available</text>
            </svg>`,
            {
                headers: { 
                    'Content-Type': 'image/svg+xml',
                    'X-Offline-Placeholder': 'true'
                }
            }
        );
    }
}

// Cache product data for offline use
async function cacheProductData(products) {
    try {
        const cache = await caches.open(OFFLINE_CACHE);
        
        // Cache products list
        await cache.put(
            '/offline/products.json',
            new Response(JSON.stringify(products), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
        
        // Cache product images
        const imagePromises = products
            .filter(product => product.image_url)
            .map(async (product) => {
                try {
                    const imageResponse = await fetch(product.image_url);
                    if (imageResponse.ok) {
                        await cache.put(product.image_url, imageResponse);
                    }
                } catch (error) {
                    console.warn('Failed to cache product image:', product.image_url);
                }
            });
        
        await Promise.allSettled(imagePromises);
        console.log('📴 Product data cached for offline use');
    } catch (error) {
        console.error('📴 Failed to cache product data:', error);
    }
}

// Cache customer data for offline use
async function cacheCustomerData(customers) {
    try {
        const cache = await caches.open(OFFLINE_CACHE);
        
        await cache.put(
            '/offline/customers.json',
            new Response(JSON.stringify(customers), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
        
        console.log('📴 Customer data cached for offline use');
    } catch (error) {
        console.error('📴 Failed to cache customer data:', error);
    }
}

// Get cache status
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            status[cacheName] = keys.length;
        }
        
        return {
            caches: status,
            totalCaches: cacheNames.length,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('📴 Failed to get cache status:', error);
        return { error: error.message };
    }
}

// Background sync for offline orders
self.addEventListener('sync', (event) => {
    console.log('📴 Background sync triggered:', event.tag);
    
    if (event.tag === 'quick-order-sync') {
        event.waitUntil(syncOfflineOrders());
    }
});

// Sync offline orders when connection is restored
async function syncOfflineOrders() {
    try {
        const clients = await self.clients.matchAll();
        
        for (const client of clients) {
            client.postMessage({
                type: 'SYNC_OFFLINE_DATA',
                timestamp: Date.now()
            });
        }
        
        console.log('📴 Offline sync message sent to clients');
    } catch (error) {
        console.error('📴 Background sync failed:', error);
    }
}
