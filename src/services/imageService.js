import { ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@/firebase';

// Enhanced image service with better error handling and debugging
export const imageService = {
  // Get image with comprehensive error handling
  async getImageWithFallback(imagePath, fallbackPath = null) {
    console.log('Getting image with fallback:', { imagePath, fallbackPath });
    
    try {
      // Try primary image path
      const imageRef = ref(storage, imagePath);
      const downloadURL = await getDownloadURL(imageRef);
      
      // Verify image is accessible
      const response = await fetch(downloadURL, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Image not accessible: HTTP ${response.status}`);
      }
      
      console.log('Primary image loaded successfully:', downloadURL);
      return {
        success: true,
        url: downloadURL,
        source: 'primary',
        path: imagePath
      };
      
    } catch (primaryError) {
      console.warn('Primary image failed:', primaryError.message);
      
      // Try fallback if provided
      if (fallbackPath) {
        try {
          const fallbackRef = ref(storage, fallbackPath);
          const fallbackURL = await getDownloadURL(fallbackRef);
          
          console.log('Fallback image loaded:', fallbackURL);
          return {
            success: true,
            url: fallbackURL,
            source: 'fallback',
            path: fallbackPath
          };
          
        } catch (fallbackError) {
          console.error('Fallback image also failed:', fallbackError.message);
        }
      }
      
      // Return error result
      return {
        success: false,
        error: primaryError.message,
        path: imagePath
      };
    }
  },

  // Batch load images with progress tracking
  async loadImagesWithProgress(imagePaths, onProgress = null) {
    console.log('Loading images with progress:', imagePaths.length, 'images');
    
    const results = [];
    let completed = 0;
    
    for (const path of imagePaths) {
      try {
        const result = await this.getImageWithFallback(path);
        results.push(result);
        
        completed++;
        if (onProgress) {
          onProgress({
            completed,
            total: imagePaths.length,
            percentage: (completed / imagePaths.length) * 100,
            currentPath: path
          });
        }
        
      } catch (error) {
        console.error(`Failed to load image ${path}:`, error);
        results.push({
          success: false,
          error: error.message,
          path
        });
        
        completed++;
        if (onProgress) {
          onProgress({
            completed,
            total: imagePaths.length,
            percentage: (completed / imagePaths.length) * 100,
            currentPath: path,
            error: error.message
          });
        }
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log('Batch image loading completed:', {
      total: results.length,
      successful: successCount,
      failed: failureCount
    });
    
    return {
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        successRate: (successCount / results.length) * 100
      }
    };
  },

  // Preload images for better performance
  async preloadImages(imageUrls) {
    console.log('Preloading images:', imageUrls.length);
    
    const preloadPromises = imageUrls.map(url => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log('Preloaded:', url);
          resolve({ url, success: true });
        };
        img.onerror = () => {
          console.warn('Preload failed:', url);
          resolve({ url, success: false });
        };
        img.src = url;
      });
    });
    
    const results = await Promise.all(preloadPromises);
    const successCount = results.filter(r => r.success).length;
    
    console.log('Preloading completed:', {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount
    });
    
    return results;
  },

  // Validate image URL accessibility
  async validateImageUrl(url) {
    try {
      // Test fetch
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        return {
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url
        };
      }
      
      // Test image loading
      const img = new Image();
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('Image load failed'));
        setTimeout(() => reject(new Error('Image load timeout')), 5000);
      });
      
      img.src = url;
      await loadPromise;
      
      return {
        valid: true,
        contentType: response.headers.get('content-type'),
        size: response.headers.get('content-length'),
        url
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        url
      };
    }
  },

  // Clear image cache
  async clearImageCache() {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          // Delete only image requests
          const imageRequests = requests.filter(req => {
            const url = new URL(req.url);
            return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                   url.hostname.includes('firebasestorage');
          });
          
          await Promise.all(imageRequests.map(req => cache.delete(req)));
          console.log(`Cleared ${imageRequests.length} cached images from ${cacheName}`);
        }
      }
      
      return { success: true, message: 'Image cache cleared successfully' };
    } catch (error) {
      console.error('Error clearing image cache:', error);
      return { success: false, error: error.message };
    }
  }
};

export default imageService;