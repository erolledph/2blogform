import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { imageTroubleshooter } from '@/utils/imageTroubleshooter';
import { TestTube, AlertTriangle, CheckCircle, XCircle, Zap, RefreshCw, Eye, Settings } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function ImageTroubleshootingPanel({ activeBlogId, className = '' }) {
  const { currentUser } = useAuth();
  const [diagnostics, setDiagnostics] = useState(null);
  const [running, setRunning] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [applyingFix, setApplyingFix] = useState(null);

  const runDiagnostics = async () => {
    if (!currentUser?.uid || !activeBlogId) {
      toast.error('Please ensure you are logged in and have an active blog');
      return;
    }

    setRunning(true);
    setDiagnostics(null);

    try {
      const results = await imageTroubleshooter.runFullDiagnostics(currentUser.uid, activeBlogId);
      setDiagnostics(results);

      if (results.summary.failedTests === 0) {
        toast.success('All diagnostic tests passed!');
      } else {
        toast.error(`${results.summary.failedTests} test(s) failed. Check results for solutions.`);
      }
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast.error('Diagnostics failed: ' + error.message);
    } finally {
      setRunning(false);
    }
  };

  const applyQuickFix = async (fix) => {
    try {
      setApplyingFix(fix.name);
      const result = await fix.action();
      toast.success(result);
    } catch (error) {
      console.error('Quick fix failed:', error);
      toast.error(`Failed to apply fix: ${error.message}`);
    } finally {
      setApplyingFix(null);
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTestIcon = (success) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Diagnostics Panel */}
      <div className="card border-indigo-200 bg-indigo-50">
        <div className="card-content p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <TestTube className="h-6 w-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-indigo-800">Image Troubleshooting</h3>
            </div>
            {diagnostics && (
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getHealthColor(diagnostics.summary.overallHealth)}`}>
                {diagnostics.summary.overallHealth.toUpperCase()}
              </div>
            )}
          </div>
          
          <p className="text-sm text-indigo-700 mb-6">
            Comprehensive diagnostics to identify and fix image upload and display issues.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={runDiagnostics}
              disabled={running || !currentUser?.uid || !activeBlogId}
              className="btn-primary flex-1"
            >
              {running ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <TestTube className="h-5 w-5 mr-2" />
                  Run Full Diagnostics
                </>
              )}
            </button>
            
            {diagnostics && (
              <button
                onClick={() => setShowGuide(true)}
                className="btn-secondary flex-1"
              >
                <Settings className="h-5 w-5 mr-2" />
                View Troubleshooting Guide
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Results Summary */}
      {diagnostics && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Diagnostic Results Summary</h3>
            <p className="card-description">
              {diagnostics.summary.passedTests}/{diagnostics.summary.totalTests} tests passed
            </p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(diagnostics.tests).map(([testName, test]) => (
                <div key={testName} className={`p-4 border rounded-lg ${
                  test.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-3 mb-2">
                    {getTestIcon(test.success)}
                    <h4 className="font-medium text-foreground">{test.name}</h4>
                  </div>
                  {test.issues.length > 0 && (
                    <div className="text-sm text-red-700">
                      <strong>Issues:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {test.issues.slice(0, 2).map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Fixes */}
            {diagnostics.summary.failedTests > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-4">Quick Fixes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {imageTroubleshooter.getQuickFixes().map((fix, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg">
                      <h5 className="font-medium text-foreground mb-2">{fix.name}</h5>
                      <p className="text-sm text-muted-foreground mb-3">{fix.description}</p>
                      <button
                        onClick={() => applyQuickFix(fix)}
                        disabled={applyingFix === fix.name}
                        className="btn-secondary btn-sm w-full"
                      >
                        {applyingFix === fix.name ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Apply Fix
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Troubleshooting Guide Modal */}
      <Modal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="Step-by-Step Troubleshooting Guide"
        size="xl"
      >
        {diagnostics && (
          <TroubleshootingGuide 
            diagnostics={diagnostics}
            onClose={() => setShowGuide(false)}
          />
        )}
      </Modal>
    </div>
  );
}

// Troubleshooting guide component
function TroubleshootingGuide({ diagnostics, onClose }) {
  const guide = imageTroubleshooter.getStepByStepGuide(diagnostics);

  const getPriorityColor = (priority) => {
    switch (priority) {
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
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Diagnostic Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
          <div>Tests Passed: {diagnostics.summary.passedTests}/{diagnostics.summary.totalTests}</div>
          <div>Overall Health: {diagnostics.summary.overallHealth}</div>
          <div>Critical Issues: {diagnostics.summary.criticalIssues.length}</div>
          <div>Recommendations: {diagnostics.summary.recommendations.length}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Troubleshooting Steps</h3>
        {guide.steps.map((step, index) => (
          <div key={index} className={`p-4 border-2 rounded-lg ${getPriorityColor(step.priority)}`}>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-sm">
                {step.step}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                <div className="space-y-1">
                  <strong className="text-sm">Actions to take:</strong>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {step.actions.map((action, actionIndex) => (
                      <li key={actionIndex}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button onClick={onClose} className="btn-primary">
          Close Guide
        </button>
      </div>
    </div>
  );
}