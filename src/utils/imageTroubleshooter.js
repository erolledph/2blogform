// Comprehensive image troubleshooting utility
import { imageDebugger } from './imageDebugger';
import { offlineImageHandler } from './offlineImageHandler';
import { imageService } from '@/services/imageService';

export const imageTroubleshooter = {
  // Run complete diagnostic suite
  async runFullDiagnostics(userId, blogId) {
    console.log('=== RUNNING FULL IMAGE DIAGNOSTICS ===');
    
    const diagnostics = {
      timestamp: new Date(),
      userId,
      blogId,
      tests: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalIssues: [],
        recommendations: []
      }
    };

    try {
      // Test 1: Authentication and permissions
      diagnostics.tests.authentication = await this.testAuthentication(userId);
      
      // Test 2: Storage access and rules
      diagnostics.tests.storageAccess = await this.testStorageAccess(userId);
      
      // Test 3: Image upload pipeline
      diagnostics.tests.uploadPipeline = await this.testUploadPipeline(userId);
      
      // Test 4: Data association (content/products)
      diagnostics.tests.dataAssociation = await this.testDataAssociation(userId, blogId);
      
      // Test 5: URL generation and accessibility
      diagnostics.tests.urlAccessibility = await this.testUrlAccessibility(userId, blogId);
      
      // Test 6: Offline cache interference
      diagnostics.tests.offlineCache = await this.testOfflineCache();
      
      // Test 7: Browser compatibility
      diagnostics.tests.browserCompatibility = await this.testBrowserCompatibility();
      
      // Generate summary
      this.generateDiagnosticSummary(diagnostics);
      
      console.log('=== FULL DIAGNOSTICS COMPLETED ===');
      console.log('Results:', diagnostics);
      
      return diagnostics;
      
    } catch (error) {
      console.error('=== DIAGNOSTICS FAILED ===');
      console.error('Error:', error);
      
      diagnostics.error = error.message;
      return diagnostics;
    }
  },

  // Test authentication and user permissions
  async testAuthentication(userId) {
    const test = {
      name: 'Authentication & Permissions',
      success: false,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      // Check if user is authenticated
      const { auth } = await import('@/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        test.issues.push('User not authenticated');
        test.recommendations.push('Ensure user is logged in');
        return test;
      }
      
      if (currentUser.uid !== userId) {
        test.issues.push('User ID mismatch');
        test.recommendations.push('Check user authentication state');
        return test;
      }
      
      test.success = true;
      test.details = {
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified
      };
      
    } catch (error) {
      test.issues.push(`Authentication error: ${error.message}`);
      test.recommendations.push('Check Firebase authentication configuration');
    }

    return test;
  },

  // Test storage access and rules
  async testStorageAccess(userId) {
    const test = {
      name: 'Storage Access & Rules',
      success: false,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      const storageResults = await imageDebugger.debugUserStorage(userId);
      
      let hasAccessiblePath = false;
      const pathResults = {};
      
      Object.entries(storageResults).forEach(([path, result]) => {
        pathResults[path] = result;
        
        if (result.success) {
          hasAccessiblePath = true;
        } else {
          test.issues.push(`Cannot access storage path: ${path}`);
          test.recommendations.push(`Check Firebase Storage rules for ${path}`);
        }
      });
      
      test.success = hasAccessiblePath;
      test.details = { pathResults };
      
      if (!hasAccessiblePath) {
        test.issues.push('No accessible storage paths found');
        test.recommendations.push('Verify Firebase Storage rules allow user access');
      }
      
    } catch (error) {
      test.issues.push(`Storage access error: ${error.message}`);
      test.recommendations.push('Check Firebase Storage configuration');
    }

    return test;
  },

  // Test upload pipeline
  async testUploadPipeline(userId) {
    const test = {
      name: 'Upload Pipeline',
      success: false,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      const { uploadDebugger } = await import('./uploadDebugger');
      const uploadResult = await uploadDebugger.testCompleteUploadFlow(userId);
      
      test.success = uploadResult.success;
      test.details = uploadResult;
      
      if (!uploadResult.success) {
        test.issues.push(`Upload pipeline failed: ${uploadResult.error}`);
        test.recommendations.push('Check upload validation and Firebase Storage configuration');
      }
      
    } catch (error) {
      test.issues.push(`Upload pipeline error: ${error.message}`);
      test.recommendations.push('Check upload components and Firebase integration');
    }

    return test;
  },

  // Test data association
  async testDataAssociation(userId, blogId) {
    const test = {
      name: 'Data Association',
      success: false,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      const associationResult = await imageDebugger.testContentImageAssociations(userId, blogId);
      
      test.success = associationResult.success;
      test.details = associationResult;
      
      if (!associationResult.success) {
        test.issues.push(`Data association failed: ${associationResult.error}`);
        test.recommendations.push('Check API endpoints and database structure');
      } else if (associationResult.totalImages === 0) {
        test.issues.push('No images found in content or products');
        test.recommendations.push('Create content/products with images to test display');
      }
      
    } catch (error) {
      test.issues.push(`Data association error: ${error.message}`);
      test.recommendations.push('Check content and product services');
    }

    return test;
  },

  // Test URL accessibility
  async testUrlAccessibility(userId, blogId) {
    const test = {
      name: 'URL Accessibility',
      success: false,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      // Get image URLs from content/products
      const associationResult = await imageDebugger.testContentImageAssociations(userId, blogId);
      
      if (associationResult.success && associationResult.imageUrls.length > 0) {
        const urlResult = await imageDebugger.testImageUrlAccessibility(associationResult.imageUrls);
        
        test.success = urlResult.success && urlResult.summary.failed === 0;
        test.details = urlResult;
        
        if (urlResult.summary.failed > 0) {
          test.issues.push(`${urlResult.summary.failed} image URLs are not accessible`);
          test.recommendations.push('Check Firebase Storage rules and URL generation');
        }
      } else {
        test.success = true; // No URLs to test
        test.details = { message: 'No image URLs found to test' };
      }
      
    } catch (error) {
      test.issues.push(`URL accessibility error: ${error.message}`);
      test.recommendations.push('Check image URL generation and Firebase Storage configuration');
    }

    return test;
  },

  // Test offline cache
  async testOfflineCache() {
    const test = {
      name: 'Offline Cache',
      success: false,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      const cacheResult = await offlineImageHandler.diagnoseOfflineConflicts();
      
      test.success = cacheResult.success;
      test.details = cacheResult;
      
      if (cacheResult.hasConflicts) {
        cacheResult.conflicts.forEach(conflict => {
          if (conflict.severity === 'high' || conflict.severity === 'medium') {
            test.issues.push(conflict.message);
            test.recommendations.push(conflict.solution);
          }
        });
      }
      
      // Consider test successful if no high-severity conflicts
      const highSeverityConflicts = cacheResult.conflicts?.filter(c => c.severity === 'high') || [];
      test.success = highSeverityConflicts.length === 0;
      
    } catch (error) {
      test.issues.push(`Offline cache error: ${error.message}`);
      test.recommendations.push('Check service worker and cache implementation');
    }

    return test;
  },

  // Test browser compatibility
  async testBrowserCompatibility() {
    const test = {
      name: 'Browser Compatibility',
      success: true,
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      const features = {
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        cacheAPI: 'caches' in window,
        localStorage: typeof localStorage !== 'undefined',
        fileReader: typeof FileReader !== 'undefined',
        canvas: typeof HTMLCanvasElement !== 'undefined'
      };
      
      test.details = { features };
      
      // Check for missing critical features
      if (!features.fetch) {
        test.issues.push('Fetch API not supported');
        test.recommendations.push('Use a fetch polyfill or upgrade browser');
        test.success = false;
      }
      
      if (!features.promises) {
        test.issues.push('Promises not supported');
        test.recommendations.push('Use a Promise polyfill or upgrade browser');
        test.success = false;
      }
      
      if (!features.fileReader) {
        test.issues.push('FileReader API not supported');
        test.recommendations.push('File upload may not work - upgrade browser');
      }
      
    } catch (error) {
      test.issues.push(`Browser compatibility error: ${error.message}`);
      test.recommendations.push('Check browser version and feature support');
      test.success = false;
    }

    return test;
  },

  // Generate comprehensive summary
  generateDiagnosticSummary(diagnostics) {
    const tests = Object.values(diagnostics.tests);
    
    diagnostics.summary.totalTests = tests.length;
    diagnostics.summary.passedTests = tests.filter(t => t.success).length;
    diagnostics.summary.failedTests = tests.filter(t => !t.success).length;
    
    // Collect all issues and recommendations
    tests.forEach(test => {
      diagnostics.summary.criticalIssues.push(...test.issues);
      diagnostics.summary.recommendations.push(...test.recommendations);
    });
    
    // Remove duplicates
    diagnostics.summary.criticalIssues = [...new Set(diagnostics.summary.criticalIssues)];
    diagnostics.summary.recommendations = [...new Set(diagnostics.summary.recommendations)];
    
    // Determine overall health
    diagnostics.summary.overallHealth = diagnostics.summary.failedTests === 0 ? 'healthy' :
                                       diagnostics.summary.failedTests <= 2 ? 'warning' : 'critical';
    
    return diagnostics.summary;
  },

  // Get step-by-step troubleshooting guide
  getStepByStepGuide(diagnostics) {
    const guide = {
      title: 'Image Display Troubleshooting Guide',
      steps: []
    };

    // Step 1: Check authentication
    if (!diagnostics.tests.authentication?.success) {
      guide.steps.push({
        step: 1,
        title: 'Fix Authentication Issues',
        description: 'Resolve user authentication problems',
        actions: [
          'Log out and log back in',
          'Check browser console for auth errors',
          'Verify Firebase Auth configuration'
        ],
        priority: 'high'
      });
    }

    // Step 2: Check storage access
    if (!diagnostics.tests.storageAccess?.success) {
      guide.steps.push({
        step: guide.steps.length + 1,
        title: 'Fix Storage Access',
        description: 'Resolve Firebase Storage permission issues',
        actions: [
          'Check Firebase Storage rules',
          'Verify user has write permissions to their storage path',
          'Test storage access in Firebase console'
        ],
        priority: 'high'
      });
    }

    // Step 3: Check data association
    if (!diagnostics.tests.dataAssociation?.success || diagnostics.tests.dataAssociation?.details?.totalImages === 0) {
      guide.steps.push({
        step: guide.steps.length + 1,
        title: 'Fix Data Association',
        description: 'Ensure images are properly saved to content/products',
        actions: [
          'Check if images are being saved to database records',
          'Verify content/product update functions',
          'Test creating new content with images'
        ],
        priority: 'high'
      });
    }

    // Step 4: Check URL accessibility
    if (!diagnostics.tests.urlAccessibility?.success) {
      guide.steps.push({
        step: guide.steps.length + 1,
        title: 'Fix URL Accessibility',
        description: 'Resolve image URL generation and access issues',
        actions: [
          'Check Firebase Storage rules for public read access',
          'Verify image URLs are being generated correctly',
          'Test image URLs directly in browser'
        ],
        priority: 'medium'
      });
    }

    // Step 5: Check offline cache
    if (diagnostics.tests.offlineCache?.details?.hasConflicts) {
      guide.steps.push({
        step: guide.steps.length + 1,
        title: 'Resolve Cache Conflicts',
        description: 'Fix offline caching interference',
        actions: [
          'Clear browser cache and reload',
          'Temporarily disable service worker',
          'Check service worker image handling logic'
        ],
        priority: 'low'
      });
    }

    // Step 6: Browser compatibility
    if (!diagnostics.tests.browserCompatibility?.success) {
      guide.steps.push({
        step: guide.steps.length + 1,
        title: 'Fix Browser Compatibility',
        description: 'Resolve browser feature support issues',
        actions: [
          'Update to a modern browser version',
          'Add polyfills for missing features',
          'Test in different browsers'
        ],
        priority: 'medium'
      });
    }

    // If no specific issues, provide general troubleshooting
    if (guide.steps.length === 0) {
      guide.steps.push({
        step: 1,
        title: 'General Troubleshooting',
        description: 'All tests passed - try these general solutions',
        actions: [
          'Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)',
          'Clear browser cache and cookies',
          'Try in an incognito/private window',
          'Check browser console for JavaScript errors'
        ],
        priority: 'low'
      });
    }

    return guide;
  },

  // Quick fix suggestions based on common issues
  getQuickFixes() {
    return [
      {
        name: 'Clear All Caches',
        description: 'Clear browser cache, localStorage, and service worker cache',
        severity: 'low',
        action: async () => {
          // Clear browser cache
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          
          // Clear localStorage
          localStorage.clear();
          sessionStorage.clear();
          
          return 'All caches cleared - please refresh the page';
        }
      },
      {
        name: 'Disable Service Worker',
        description: 'Temporarily disable offline functionality',
        severity: 'medium',
        action: async () => {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
            return 'Service worker disabled - please refresh the page';
          }
          return 'No service worker found';
        }
      },
      {
        name: 'Force Image Reload',
        description: 'Reload all images with cache busting',
        severity: 'low',
        action: async () => {
          const images = document.querySelectorAll('img');
          let reloadedCount = 0;
          
          images.forEach(img => {
            if (img.src && (img.src.includes('firebasestorage') || img.src.includes('googleapis'))) {
              const url = new URL(img.src);
              url.searchParams.set('t', Date.now());
              img.src = url.toString();
              reloadedCount++;
            }
          });
          
          return `Reloaded ${reloadedCount} Firebase Storage images`;
        }
      },
      {
        name: 'Test Firebase Connection',
        description: 'Verify Firebase services are accessible',
        severity: 'high',
        action: async () => {
          try {
            const { storage } = await import('@/firebase');
            const { ref, listAll } = await import('firebase/storage');
            
            // Test basic Firebase Storage access
            const testRef = ref(storage, 'test');
            await listAll(testRef);
            
            return 'Firebase Storage connection successful';
          } catch (error) {
            throw new Error(`Firebase connection failed: ${error.message}`);
          }
        }
      }
    ];
  }
};

export default imageTroubleshooter;