// Offline image handling utilities
export const offlineImageHandler = {
  // Check if image is available offline
  async isImageAvailableOffline(imageUrl) {
    try {
      if (!('caches' in window)) return false;
      
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(imageUrl);
        if (response) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking offline image availability:', error);
      return false;
    }
  },

  // Cache image for offline use
  async cacheImageForOffline(imageUrl, cacheName = 'admin-cms-images') {
    try {
      if (!('caches' in window)) {
        throw new Error('Cache API not supported');
      }
      
      const cache = await caches.open(cacheName);
      
      // Fetch and cache the image
      const response = await fetch(imageUrl);
      if (response.ok) {
        await cache.put(imageUrl, response);
        return { success: true, cached: true };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error caching image:', error);
      return { success: false, error: error.message };
    }
  },

  // Get cached image or fetch fresh
  async getImageWithOfflineSupport(imageUrl) {
    try {
      // Try cache first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const cachedResponse = await cache.match(imageUrl);
          
          if (cachedResponse) {
            console.log('Serving cached image:', imageUrl);
            return {
              success: true,
              source: 'cache',
              response: cachedResponse
            };
          }
        }
      }
      
      // If not in cache, fetch fresh
      const response = await fetch(imageUrl);
      
      if (response.ok) {
        // Cache for future use
        this.cacheImageForOffline(imageUrl);
        
        return {
          success: true,
          source: 'network',
          response: response
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error getting image with offline support:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Clear image cache
  async clearImageCache() {
    try {
      if (!('caches' in window)) return { success: false, error: 'Cache API not supported' };
      
      const cacheNames = await caches.keys();
      let clearedCount = 0;
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        // Only delete image requests
        const imageRequests = requests.filter(req => {
          const url = new URL(req.url);
          return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                 url.hostname.includes('firebasestorage');
        });
        
        await Promise.all(imageRequests.map(req => cache.delete(req)));
        clearedCount += imageRequests.length;
      }
      
      return { 
        success: true, 
        clearedCount,
        message: `Cleared ${clearedCount} cached images`
      };
      
    } catch (error) {
      console.error('Error clearing image cache:', error);
      return { success: false, error: error.message };
    }
  },

  // Diagnose offline conflicts
  async diagnoseOfflineConflicts() {
    try {
      const conflicts = [];
      
      // Check service worker status
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          conflicts.push({
            type: 'service_worker',
            message: 'Service worker is active and may be intercepting image requests',
            severity: 'medium',
            solution: 'Temporarily disable service worker or check its image handling logic'
          });
        }
      }
      
      // Check for stale cached images
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          const imageRequests = requests.filter(req => {
            const url = new URL(req.url);
            return url.hostname.includes('firebasestorage');
          });
          
          if (imageRequests.length > 0) {
            conflicts.push({
              type: 'stale_cache',
              message: `${imageRequests.length} Firebase Storage images are cached in ${cacheName}`,
              severity: 'low',
              solution: 'Clear cache if images appear outdated'
            });
          }
        }
      }
      
      // Check localStorage for image-related data
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('image') || key.includes('cache') || key.includes('cms')
      );
      
      if (localStorageKeys.length > 0) {
        conflicts.push({
          type: 'local_storage',
          message: `${localStorageKeys.length} image-related items in localStorage`,
          severity: 'low',
          solution: 'Clear localStorage if experiencing issues'
        });
      }
      
      return {
        success: true,
        conflicts,
        hasConflicts: conflicts.length > 0
      };
      
    } catch (error) {
      console.error('Error diagnosing offline conflicts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default offlineImageHandler;