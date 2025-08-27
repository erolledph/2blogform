import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { imageDebugger } from '@/utils/imageDebugger';
import { uploadDebugger } from '@/utils/uploadDebugger';
import { TestTube, CheckCircle, XCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Quick test button for debugging upload and display issues
export default function UploadTestButton({ className = '' }) {
  const { currentUser } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runQuickTest = async () => {
    if (!currentUser?.uid) {
      toast.error('Please log in first');
      return;
    }

    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('Starting quick upload and display test...');
      
      // Test 1: Debug user storage
      const storageResults = await imageDebugger.debugUserStorage(currentUser.uid);
      
      // Test 2: Test upload flow
      const uploadResults = await uploadDebugger.testCompleteUploadFlow(currentUser.uid);
      
      const results = {
        storage: storageResults,
        upload: uploadResults,
        timestamp: new Date()
      };
      
      setTestResults(results);
      
      if (uploadResults.success) {
        toast.success('Upload and display test completed successfully!');
      } else {
        toast.error('Upload test failed. Check console for details.');
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test failed: ' + error.message);
      setTestResults({
        error: error.message,
        timestamp: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  const getResultIcon = (success) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <button
          onClick={runQuickTest}
          disabled={testing || !currentUser?.uid}
          className="btn-secondary inline-flex items-center"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Quick Test
            </>
          )}
        </button>
        
        <span className="text-sm text-muted-foreground">
          Test upload and display functionality
        </span>
      </div>

      {testResults && (
        <div className="card border-blue-200 bg-blue-50">
          <div className="card-content p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-3">Test Results</h4>
            
            {testResults.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">Test Failed: {testResults.error}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.upload && (
                  <div className={`p-3 border rounded-lg ${
                    testResults.upload.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {getResultIcon(testResults.upload.success)}
                      <span className={`text-sm font-medium ${
                        testResults.upload.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Upload Test: {testResults.upload.success ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    {testResults.upload.message && (
                      <p className="text-xs text-gray-600 mt-1">{testResults.upload.message}</p>
                    )}
                  </div>
                )}
                
                {testResults.storage && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-blue-700">Storage Paths:</h5>
                    {Object.entries(testResults.storage).map(([path, result]) => (
                      <div key={path} className={`p-2 border rounded text-xs ${
                        result.success 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {getResultIcon(result.success)}
                          <span className="font-mono">{path}</span>
                        </div>
                        {result.totalImages !== undefined && (
                          <div className="ml-6 mt-1">
                            Images: {result.successfulImages || 0}/{result.totalImages || 0}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-3 text-xs text-blue-600">
              Check browser console for detailed logs
            </div>
          </div>
        </div>
      )}
    </div>
  );
}