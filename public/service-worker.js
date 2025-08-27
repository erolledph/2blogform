// Service Worker for Admin CMS - Offline Support and Performance
const CACHE_NAME = 'admin-cms-v1';
const STATIC_CACHE = 'admin-cms-static-v1';
const DYNAMIC_CACHE = 'admin-cms-dynamic-v1';
const API_CACHE = 'admin-cms-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/fire.svg',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/content',
  '/api/product',
  '/.netlify/functions/content-api',
  '/.netlify/functions/product-api'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine cache strategy based on request type
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  let cacheName = DYNAMIC_CACHE;
  
  // Static assets - cache first
  if (isStaticAsset(url)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
    cacheName = STATIC_CACHE;
  }
  
  // API endpoints - stale while revalidate
  else if (isApiEndpoint(url)) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
    cacheName = API_CACHE;
  }
  
  // Images - cache first with fallback
  else if (isImageRequest(url)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
    cacheName = STATIC_CACHE;
  }
  
  // Admin functions - network only (always fresh)
  else if (isAdminFunction(url)) {
    strategy = CACHE_STRATEGIES.NETWORK_ONLY;
  }
  
  event.respondWith(handleRequest(request, strategy, cacheName));
});

// Handle different caching strategies
async function handleRequest(request, strategy, cacheName) {
  const cache = await caches.open(cacheName);
  
  // Special handling for Firebase Storage images
  if (isFirebaseStorageImage(request.url)) {
    return handleFirebaseStorageImage(request, cache);
  }
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cache);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cache);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cache);
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cache.match(request);
      
    default:
      return networkFirst(request, cache);
  }
}

// Special handler for Firebase Storage images
async function handleFirebaseStorageImage(request, cache) {
  try {
    // Always try network first for Firebase Storage to get fresh images
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('Serving cached Firebase Storage image:', request.url);
      return cachedResponse;
    }
    
    // Return network response even if not ok (let browser handle error)
    return networkResponse;
    
  } catch (error) {
    console.warn('Firebase Storage image request failed:', error);
    
    // Try cache as fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for images
    return getOfflineFallback(request);
  }
}

// Check if URL is a Firebase Storage image
function isFirebaseStorageImage(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('firebasestorage') || 
           urlObj.hostname.includes('googleapis.com');
  } catch {
    return false;
  }
}

// Cache first strategy
async function cacheFirst(request, cache) {
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (request.method === 'GET' && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('Service Worker: Network request failed:', error);
    
    // Return offline fallback if available
    return getOfflineFallback(request);
  }
}

// Network first strategy
async function networkFirst(request, cache) {
  try {
    const networkResponse = await fetch(request);
    
    if (request.method === 'GET' && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('Service Worker: Network request failed, trying cache:', error);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineFallback(request);
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cache) {
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh data in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (request.method === 'GET' && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('Service Worker: Background fetch failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    // Don't await the fetch promise - let it update cache in background
    fetchPromise;
    return cachedResponse;
  }
  
  // If no cached response, wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    return getOfflineFallback(request);
  }
}

// Get offline fallback response
function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match('/index.html');
  }
  
  // Return placeholder for images
  if (isImageRequest(url)) {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Offline</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // Return offline JSON for API requests
  if (isApiEndpoint(url)) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline',
        offline: true
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // Default offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Helper functions to categorize requests
function isStaticAsset(url) {
  const pathname = url.pathname;
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
         pathname === '/' ||
         pathname === '/index.html' ||
         pathname.startsWith('/assets/');
}

function isApiEndpoint(url) {
  const pathname = url.pathname;
  return pathname.startsWith('/api/') ||
         pathname.startsWith('/.netlify/functions/') ||
         pathname.includes('/api/content.json') ||
         pathname.includes('/api/products.json');
}

function isImageRequest(url) {
  const pathname = url.pathname.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  
  return pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|bmp|tiff)$/i) ||
         hostname.includes('firebasestorage') ||
         hostname.includes('googleapis.com') ||
         hostname.includes('pexels.com') ||
         pathname.includes('/images/') ||
         pathname.includes('/media/');
}

function isAdminFunction(url) {
  const pathname = url.pathname;
  return pathname.includes('/admin-') ||
         pathname.includes('/import-') ||
         pathname.includes('/export-');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-content') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when back online
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or localStorage
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await executeOfflineAction(action);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync offline action:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Get offline actions (placeholder - would use IndexedDB in production)
async function getOfflineActions() {
  try {
    const actions = localStorage.getItem('offline-actions');
    return actions ? JSON.parse(actions) : [];
  } catch (error) {
    return [];
  }
}

// Execute offline action
async function executeOfflineAction(action) {
  const response = await fetch(action.url, {
    method: action.method,
    headers: action.headers,
    body: action.body
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response;
}

// Remove offline action
async function removeOfflineAction(actionId) {
  try {
    const actions = await getOfflineActions();
    const filteredActions = actions.filter(action => action.id !== actionId);
    localStorage.setItem('offline-actions', JSON.stringify(filteredActions));
  } catch (error) {
    console.error('Failed to remove offline action:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', payload: stats });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'PREFETCH_URLS':
      prefetchUrls(payload.urls).then(() => {
        event.ports[0].postMessage({ type: 'PREFETCH_COMPLETE' });
      });
      break;
  }
});

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }
  
  return stats;
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}

// Prefetch URLs
async function prefetchUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  const fetchPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('Failed to prefetch:', url, error);
    }
  });
  
  await Promise.allSettled(fetchPromises);
}

// Performance monitoring
self.addEventListener('fetch', (event) => {
  // Track performance metrics
  const startTime = performance.now();
  
  event.respondWith(
    handleRequest(event.request, getStrategy(event.request), getCacheName(event.request))
      .then(response => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log slow requests
        if (duration > 1000) {
          console.warn('Slow request detected:', event.request.url, `${duration}ms`);
        }
        
        return response;
      })
  );
});

// Get strategy for request
function getStrategy(request) {
  const url = new URL(request.url);
  
  if (isStaticAsset(url)) return CACHE_STRATEGIES.CACHE_FIRST;
  if (isApiEndpoint(url)) return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  if (isImageRequest(url)) return CACHE_STRATEGIES.CACHE_FIRST;
  if (isAdminFunction(url)) return CACHE_STRATEGIES.NETWORK_ONLY;
  
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

// Get cache name for request
function getCacheName(request) {
  const url = new URL(request.url);
  
  if (isStaticAsset(url)) return STATIC_CACHE;
  if (isApiEndpoint(url)) return API_CACHE;
  if (isImageRequest(url)) return STATIC_CACHE;
  
  return DYNAMIC_CACHE;
}

console.log('Service Worker: Loaded and ready');