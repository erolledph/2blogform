import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { imageDebugger } from '@/utils/imageDebugger';
import { TestTube, CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye, Database, Wifi, HardDrive } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import ProgressiveImage from './ProgressiveImage';
import toast from 'react-hot-toast';
import DynamicTransition from './DynamicTransition';

export default function ImageDisplayDiagnostics({ activeBlogId, className = '' }) {
  const { currentUser } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  const runComprehensiveTest = async () => {
    if (!currentUser?.uid || !activeBlogId) {
      toast.error('Please ensure you are logged in and have an active blog');
      return;
    }

    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('Starting comprehensive image display test...');
      
      const results = await imageDebugger.testImageDisplay(currentUser.uid, activeBlogId);
      setTestResults(results);
      
      if (results.summary?.issues.length === 0) {
        toast.success('All image display tests passed!');
      } else {
        toast.error(`Found ${results.summary.issues.length} issue(s). Check results for details.`);
      }
      
    } catch (error) {
      console.error('Comprehensive test failed:', error);
      toast.error('Test failed: ' + error.message);
      setTestResults({
        error: error.message,
        timestamp: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        toast.success('Browser cache cleared');
      }
      
      // Also clear localStorage cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cms-') || key.startsWith('cache-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Reload page to ensure fresh state
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    }
  };

  const getResultIcon = (success) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-amber-500 bg-amber-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="card border-purple-200 bg-purple-50">
        <div className="card-content p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Image Display Diagnostics</h3>
          <p className="text-sm text-purple-700 mb-6">
            Run comprehensive tests to diagnose image upload, storage, and display issues.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={runComprehensiveTest}
              disabled={testing || !currentUser?.uid || !activeBlogId}
              className="btn-primary flex-1"
            >
              <TestTube className="h-5 w-5 mr-2" />
              {testing ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
            </button>
            
            <button
              onClick={clearCache}
              className="btn-secondary flex-1"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Clear Cache & Reload
            </button>
          </div>
          
          {(!currentUser?.uid || !activeBlogId) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Please ensure you are logged in and have an active blog to run diagnostics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="card-title">Diagnostic Results</h3>
              <button
                onClick={() => setShowDetailedResults(true)}
                className="btn-secondary btn-sm"
              >
                View Details
              </button>
            </div>
          </div>
          <div className="card-content">
            {testResults.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-800">Test Failed: {testResults.error}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                {testResults.summary && (
                  <div className={`p-4 border-2 rounded-lg ${getSeverityColor(testResults.summary.severity)}`}>
                    <h4 className="font-medium mb-2">
                      Summary: {testResults.summary.issues.length} issue(s) found
                    </h4>
                    {testResults.summary.issues.length === 0 ? (
                      <p className="text-sm text-green-700">✅ All tests passed! Images should display correctly.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Issues:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {testResults.summary.issues.map((issue, index) => (
                              <li key={index} className="text-red-700">{issue}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-sm">
                          <strong>Recommendations:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {testResults.summary.recommendations.map((rec, index) => (
                              <li key={index} className="text-blue-700">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Results */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <Database className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg font-bold text-blue-900">
                      {testResults.content?.totalImages || 0}
                    </div>
                    <div className="text-xs text-blue-600">Images in Data</div>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                    <Wifi className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-bold text-green-900">
                      {testResults.urls?.summary?.accessible || 0}
                    </div>
                    <div className="text-xs text-green-600">URLs Accessible</div>
                  </div>
                  
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <div className="text-lg font-bold text-red-900">
                      {testResults.urls?.summary?.failed || 0}
                    </div>
                    <div className="text-xs text-red-600">URLs Failed</div>
                  </div>
                  
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                    <HardDrive className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-lg font-bold text-purple-900">
                      {testResults.cache?.imagesCached || 0}
                    </div>
                    <div className="text-xs text-purple-600">Cached Images</div>
                  </div>
                </div>

                {/* Sample Images Test */}
                {testResults.urls?.results && testResults.urls.results.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Sample Image Display Test</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {testResults.urls.results.slice(0, 8).map((imageData, index) => (
                        <div key={index} className="relative">
                          <ProgressiveImage
                            src={imageData.url}
                            alt={`Test ${index + 1}`}
                            className="aspect-square rounded-lg border border-border"
                            debug={true}
                          />
                          <div className={`absolute top-1 right-1 w-4 h-4 rounded-full ${
                            imageData.accessible ? 'bg-green-500' : 'bg-red-500'
                          }`} title={imageData.accessible ? 'Accessible' : 'Failed to load'}>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                            {imageData.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Results Modal */}
      <Modal
        isOpen={showDetailedResults}
        onClose={() => setShowDetailedResults(false)}
        title="Detailed Diagnostic Results"
        size="xl"
      >
        {testResults && (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Storage Results */}
            {testResults.storage && (
              <div>
                <h4 className="font-medium mb-3">Storage Access Results</h4>
                <div className="space-y-2">
                  {Object.entries(testResults.storage).map(([path, result]) => (
                    <div key={path} className={`p-3 border rounded-lg ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {getResultIcon(result.success)}
                        <code className="text-sm font-mono">{path}</code>
                      </div>
                      {result.success ? (
                        <div className="text-sm text-green-700">
                          Found {result.totalImages || 0} images
                        </div>
                      ) : (
                        <div className="text-sm text-red-700">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URL Accessibility Results */}
            {testResults.urls?.results && (
              <div>
                <h4 className="font-medium mb-3">URL Accessibility Results</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {testResults.urls.results.map((result, index) => (
                    <div key={index} className={`p-3 border rounded-lg ${
                      result.accessible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        {getResultIcon(result.accessible)}
                        <span className="text-sm font-medium">
                          {result.source} - {result.itemTitle?.substring(0, 30)}...
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 font-mono break-all">
                        {result.url}
                      </div>
                      {!result.accessible && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cache Results */}
            {testResults.cache && (
              <div>
                <h4 className="font-medium mb-3">Cache Analysis</h4>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Service Worker:</strong> {testResults.cache.serviceWorkerActive ? 'Active' : 'Inactive'}
                    </div>
                    <div>
                      <strong>Cached Images:</strong> {testResults.cache.imagesCached}
                    </div>
                    <div className="col-span-2">
                      <strong>Cache Names:</strong> {testResults.cache.cacheNames.join(', ') || 'None'}
                    </div>
                  </div>
                  {testResults.cache.potentialConflicts.length > 0 && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                      <div className="text-sm text-amber-800">
                        <strong>Potential Cache Conflicts:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {testResults.cache.potentialConflicts.map((conflict, index) => (
                            <li key={index}>
                              {conflict.cacheName}: {conflict.imageCount} cached images
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// Quick fix component for common issues
export function ImageDisplayQuickFix({ className = '' }) {
  const [fixing, setFixing] = useState(false);

  const quickFixes = [
    {
      name: 'Clear Browser Cache',
      description: 'Clear all cached images and data',
      action: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        localStorage.clear();
        sessionStorage.clear();
        toast.success('Cache cleared - please refresh the page');
      }
    },
    {
      name: 'Disable Service Worker',
      description: 'Temporarily disable offline features',
      action: async () => {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
          toast.success('Service worker disabled - please refresh the page');
        } else {
          toast.info('No service worker found');
        }
      }
    },
    {
      name: 'Force Reload Images',
      description: 'Reload all images with cache busting',
      action: async () => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (img.src) {
            const url = new URL(img.src);
            url.searchParams.set('t', Date.now());
            img.src = url.toString();
          }
        });
        toast.success('Images reloaded with cache busting');
      }
    }
  ];

  const runQuickFix = async (fix) => {
    try {
      setFixing(true);
      await fix.action();
    } catch (error) {
      console.error('Quick fix failed:', error);
      toast.error(`Failed to ${fix.name.toLowerCase()}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="font-medium text-foreground">Quick Fixes</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickFixes.map((fix, index) => (
          <div key={index} className="p-4 border border-border rounded-lg">
            <h5 className="font-medium text-foreground mb-2">{fix.name}</h5>
            <p className="text-sm text-muted-foreground mb-3">{fix.description}</p>
            <button
              onClick={() => runQuickFix(fix)}
              disabled={fixing}
              className="btn-secondary btn-sm w-full"
            >
              {fixing ? <LoadingSpinner size="sm" /> : 'Apply Fix'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}