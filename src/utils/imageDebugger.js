// Image debugging utility for troubleshooting display issues
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/firebase';

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
  async debugUserStorage(userId) {
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
  }
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  window.imageDebugger = imageDebugger;
}