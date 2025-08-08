import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { uploadDebugger } from '@/utils/uploadDebugger';
import { TestTube, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Debug component to test upload functionality
export default function UploadTestButton({ className = '' }) {
  const { currentUser } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runUploadTest = async () => {
    if (!currentUser?.uid) {
      toast.error('Please log in first');
      return;
    }

    try {
      setTesting(true);
      setTestResults(null);
      
      // Create a small test image blob
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText('TEST', 30, 55);
      
      const testBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      const testPath = `users/${currentUser.uid}/public_images/test-${Date.now()}.png`;
      
      console.log('Starting upload test...');
      const result = await uploadDebugger.testUpload(testBlob, testPath);
      
      setTestResults({
        success: true,
        message: 'Upload test successful!',
        details: result
      });
      
      toast.success('Upload test passed! Your storage configuration is working correctly.');
      
    } catch (error) {
      console.error('Upload test failed:', error);
      
      setTestResults({
        success: false,
        message: error.message,
        error: error
      });
      
      toast.error(`Upload test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const testWritePermission = async () => {
    if (!currentUser?.uid) {
      toast.error('Please log in first');
      return;
    }

    try {
      setTesting(true);
      
      const testPath = `users/${currentUser.uid}/public_images`;
      const canWrite = await uploadDebugger.testWritePermission(currentUser.uid, testPath);
      
      if (canWrite) {
        toast.success('Write permission test passed!');
        setTestResults({
          success: true,
          message: 'Write permissions are correctly configured'
        });
      } else {
        toast.error('Write permission test failed!');
        setTestResults({
          success: false,
          message: 'Write permissions are not correctly configured'
        });
      }
      
    } catch (error) {
      console.error('Permission test failed:', error);
      toast.error(`Permission test failed: ${error.message}`);
      setTestResults({
        success: false,
        message: error.message,
        error: error
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="card border-blue-200 bg-blue-50">
        <div className="card-content p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Upload Diagnostics</h3>
          <p className="text-sm text-blue-700 mb-4">
            Use these tools to diagnose upload issues and verify your Firebase Storage configuration.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={testWritePermission}
              disabled={testing || !currentUser?.uid}
              className="btn-secondary btn-sm flex-1"
            >
              {testing ? 'Testing...' : 'Test Write Permission'}
            </button>
            
            <button
              onClick={runUploadTest}
              disabled={testing || !currentUser?.uid}
              className="btn-primary btn-sm flex-1"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? 'Testing Upload...' : 'Test Full Upload'}
            </button>
          </div>
          
          {testResults && (
            <div className={`mt-4 p-3 rounded-lg border ${
              testResults.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {testResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  testResults.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResults.success ? 'Test Passed' : 'Test Failed'}
                </span>
              </div>
              <p className={`text-sm ${
                testResults.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResults.message}
              </p>
              
              {!testResults.success && (
                <div className="mt-2 text-xs text-red-600">
                  Check the browser console for detailed error information.
                </div>
              )}
            </div>
          )}
          
          {!currentUser?.uid && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Please log in to run upload tests.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}