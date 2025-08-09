// Image debugging utility for troubleshooting display issues
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/firebase';
import { storageService } from '@/services/storageService';

export const imageDebugger = {
  // Test image fetching for a specific path
  async testImageFetching(path) {
    console.log('=== IMAGE FETCHING DEBUG TEST ===');
    console.log('Testing path:', path);
    
    try {
      const storageRef = ref(storage, path);
      console.log('Storage ref created:', storageRef.fullPath);
      
      // List all items in the path
      console.log('Listing items...');
      const result = await listAll(storageRef);
      
      console.log('Found items:', {
        folders: result.prefixes.length,
        files: result.items.length
      });
      
      // Test each image file
      const imageFiles = result.items.filter(itemRef => {
        const name = itemRef.name.toLowerCase();
        return name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/);
      });
      
      console.log('Image files found:', imageFiles.length);
      
      const imageResults = [];
      
      for (const itemRef of imageFiles) {
        try {
          console.log(`Testing image: ${itemRef.name}`);
          
          // Get metadata
          const metadata = await getMetadata(itemRef);
          console.log(`Metadata for ${itemRef.name}:`, {
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated
          });
          
          // Get download URL
          const downloadURL = await getDownloadURL(itemRef);
          console.log(`Download URL for ${itemRef.name}:`, downloadURL);
          
          // Test if URL is accessible
          const testResponse = await fetch(downloadURL, { method: 'HEAD' });
          console.log(`URL accessibility test for ${itemRef.name}:`, {
            status: testResponse.status,
            accessible: testResponse.ok
          });
          
          imageResults.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            downloadURL,
            metadata,
            accessible: testResponse.ok,
            status: testResponse.status
          });
          
        } catch (error) {
          console.error(`Error testing ${itemRef.name}:`, error);
          imageResults.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            error: error.message,
            accessible: false
          });
        }
      }
      
      console.log('=== IMAGE FETCHING TEST RESULTS ===');
      console.log('Total images tested:', imageResults.length);
      console.log('Successful:', imageResults.filter(r => r.accessible).length);
      console.log('Failed:', imageResults.filter(r => !r.accessible).length);
      console.log('Detailed results:', imageResults);
      
      return {
        success: true,
        totalImages: imageResults.length,
        successfulImages: imageResults.filter(r => r.accessible).length,
        failedImages: imageResults.filter(r => !r.accessible).length,
        results: imageResults
      };
      
    } catch (error) {
      console.error('=== IMAGE FETCHING TEST FAILED ===');
      console.error('Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Test a specific image URL
  async testImageUrl(url) {
    console.log('=== TESTING SPECIFIC IMAGE URL ===');
    console.log('URL:', url);
    
    try {
      // Test fetch
      const response = await fetch(url, { method: 'HEAD' });
      console.log('Fetch response:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Test image loading
      const img = new Image();
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Image loaded successfully:', {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          });
          resolve(true);
        };
        img.onerror = (error) => {
          console.error('Image failed to load:', error);
          reject(new Error('Image load failed'));
        };
      });
      
      img.src = url;
      await loadPromise;
      
      console.log('=== IMAGE URL TEST SUCCESSFUL ===');
      return { success: true, accessible: true };
      
    } catch (error) {
      console.error('=== IMAGE URL TEST FAILED ===');
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  },
  
  
  // Comprehensive storage debugging
  debugUserStorage: async (userId) => {
    console.log('=== USER STORAGE DEBUG ===');
    console.log('User ID:', userId);
    
    const currentUser = auth.currentUser;
    console.log('Auth state:', {
      isAuthenticated: !!currentUser,
      uid: currentUser?.uid,
      matches: currentUser?.uid === userId
    });
    
    const paths = [
      `users/${userId}/public_images`,
      `users/${userId}/private`,
      'images' // Legacy path
    ];
    
    const results = {};
    
    for (const path of paths) {
      console.log(`\n--- Testing path: ${path} ---`);
      try {
        const result = await this.testImageFetching(path);
        results[path] = result;
      } catch (error) {
        console.error(`Failed to test path ${path}:`, error);
        results[path] = { success: false, error: error.message };
      }
    }
    
    console.log('=== COMPLETE STORAGE DEBUG RESULTS ===');
    console.log(results);
    
    return results;
  },
  
  // Comprehensive image display test
  testImageDisplay: async (userId, blogId) => {
    console.log('=== TESTING IMAGE DISPLAY PIPELINE ===');
    
    try {
      // Step 1: Test storage access
      console.log('Step 1: Testing storage access...');
      const storageResults = await this.debugUserStorage(userId);
      
      // Step 2: Test content/product image associations
      console.log('Step 2: Testing content image associations...');
      const contentResults = await this.testContentImageAssociations(userId, blogId);
      
      // Step 3: Test image URL accessibility
      console.log('Step 3: Testing image URL accessibility...');
      const urlResults = await this.testImageUrlAccessibility(contentResults.imageUrls);
      
      // Step 4: Test offline cache interference
      console.log('Step 4: Testing offline cache interference...');
      const cacheResults = await this.testOfflineCacheInterference();
      
      return {
        storage: storageResults,
        content: contentResults,
        urls: urlResults,
        cache: cacheResults,
        summary: this.generateDiagnosticSummary(storageResults, contentResults, urlResults, cacheResults)
      };
      
    } catch (error) {
      console.error('=== IMAGE DISPLAY TEST FAILED ===');
      console.error('Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Test content image associations
  testContentImageAssociations: async (userId, blogId) => {
    console.log('Testing content image associations...');
    
    try {
      // Fetch content from API to see what images are associated
      const contentResponse = await fetch(`/users/${userId}/blogs/${blogId}/api/content.json`);
      const contentData = await contentResponse.json();
      const content = Array.isArray(contentData) ? contentData : contentData.data || [];
      
      // Fetch products from API
      const productsResponse = await fetch(`/users/${userId}/blogs/${blogId}/api/products.json`);
      const productsData = await productsResponse.json();
      const products = Array.isArray(productsData) ? productsData : productsData.data || [];
      
      const imageUrls = [];
      
      // Collect all image URLs from content
      content.forEach(item => {
        if (item.featuredImageUrl) {
          imageUrls.push({
            url: item.featuredImageUrl,
            source: 'content',
            itemId: item.id,
            itemTitle: item.title
          });
        }
      });
      
      // Collect all image URLs from products
      products.forEach(item => {
        if (item.imageUrls && Array.isArray(item.imageUrls)) {
          item.imageUrls.forEach((url, index) => {
            imageUrls.push({
              url,
              source: 'product',
              itemId: item.id,
              itemTitle: item.name,
              imageIndex: index
            });
          });
        } else if (item.imageUrl) {
          imageUrls.push({
            url: item.imageUrl,
            source: 'product',
            itemId: item.id,
            itemTitle: item.name,
            imageIndex: 0
          });
        }
      });
      
      console.log('Found image associations:', {
        totalContent: content.length,
        totalProducts: products.length,
        totalImageUrls: imageUrls.length,
        imageUrls
      });
      
      return {
        success: true,
        content,
        products,
        imageUrls,
        totalImages: imageUrls.length
      };
      
    } catch (error) {
      console.error('Error testing content image associations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Test image URL accessibility
  testImageUrlAccessibility: async (imageUrls) => {
    console.log('Testing image URL accessibility...');
    
    const results = [];
    
    for (const imageData of imageUrls) {
      try {
        console.log(`Testing URL: ${imageData.url}`);
        
        // Test fetch
        const response = await fetch(imageData.url, { method: 'HEAD' });
        
        // Test image loading
        const img = new Image();
        const loadPromise = new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = () => reject(new Error('Image load failed'));
          setTimeout(() => reject(new Error('Image load timeout')), 10000);
        });
        
        img.src = imageData.url;
        await loadPromise;
        
        results.push({
          ...imageData,
          accessible: true,
          status: response.status,
          contentType: response.headers.get('content-type')
        });
        
      } catch (error) {
        console.error(`URL test failed for ${imageData.url}:`, error);
        results.push({
          ...imageData,
          accessible: false,
          error: error.message
        });
      }
    }
    
    const accessibleCount = results.filter(r => r.accessible).length;
    const failedCount = results.filter(r => !r.accessible).length;
    
    console.log('URL accessibility results:', {
      total: results.length,
      accessible: accessibleCount,
      failed: failedCount
    });
    
    return {
      success: true,
      results,
      summary: {
        total: results.length,
        accessible: accessibleCount,
        failed: failedCount
      }
    };
  },
  
  // Test offline cache interference
  testOfflineCacheInterference: async () => {
    console.log('Testing offline cache interference...');
    
    try {
      const results = {
        serviceWorkerActive: false,
        cacheNames: [],
        imagesCached: 0,
        potentialConflicts: []
      };
      
      // Check if service worker is active
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        results.serviceWorkerActive = !!registration;
        
        if (registration) {
          console.log('Service worker is active:', registration);
        }
      }
      
      // Check cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        results.cacheNames = cacheNames;
        
        // Check for cached images
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          const imageRequests = requests.filter(req => {
            const url = new URL(req.url);
            return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                   url.hostname.includes('firebasestorage');
          });
          
          results.imagesCached += imageRequests.length;
          
          if (imageRequests.length > 0) {
            results.potentialConflicts.push({
              cacheName,
              imageCount: imageRequests.length,
              urls: imageRequests.slice(0, 5).map(req => req.url)
            });
          }
        }
      }
      
      console.log('Cache interference results:', results);
      
      return {
        success: true,
        ...results
      };
      
    } catch (error) {
      console.error('Error testing cache interference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Generate diagnostic summary
  generateDiagnosticSummary(storageResults, contentResults, urlResults, cacheResults) {
    const issues = [];
    const recommendations = [];
    
    // Analyze storage results
    Object.entries(storageResults).forEach(([path, result]) => {
      if (!result.success) {
        issues.push(`Storage access failed for ${path}: ${result.error}`);
        recommendations.push(`Check Firebase Storage rules for path: ${path}`);
      } else if (result.totalImages === 0) {
        issues.push(`No images found in ${path}`);
        recommendations.push(`Upload images to ${path} or check upload process`);
      }
    });
    
    // Analyze content associations
    if (!contentResults.success) {
      issues.push(`Content image association failed: ${contentResults.error}`);
      recommendations.push('Check API endpoints and data structure');
    } else if (contentResults.totalImages === 0) {
      issues.push('No image URLs found in content/products');
      recommendations.push('Verify images are being saved to content/product records');
    }
    
    // Analyze URL accessibility
    if (urlResults.success && urlResults.summary.failed > 0) {
      issues.push(`${urlResults.summary.failed} image URLs are not accessible`);
      recommendations.push('Check Firebase Storage rules and image URL generation');
    }
    
    // Analyze cache interference
    if (cacheResults.success && cacheResults.imagesCached > 0) {
      issues.push(`${cacheResults.imagesCached} images are cached - potential stale data`);
      recommendations.push('Clear browser cache or disable service worker temporarily');
    }
    
    return {
      issues,
      recommendations,
      severity: issues.length > 3 ? 'high' : issues.length > 1 ? 'medium' : 'low'
    };
  }
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  window.imageDebugger = imageDebugger;
}