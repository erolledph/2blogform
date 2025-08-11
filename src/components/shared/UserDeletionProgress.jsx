import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, User, Database, HardDrive, Shield } from 'lucide-react';
import ProgressBar from './ProgressBar';

// Component to show detailed user deletion progress
export default function UserDeletionProgress({
  isVisible = false,
  onClose = null,
  deletionResult = null,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible || !deletionResult) return null;

  const { deletionSummary } = deletionResult;
  const progress = deletionSummary ? 
    (deletionSummary.successfulOperations / deletionSummary.totalOperations) * 100 : 0;

  const getStepIcon = (category, progress) => {
    if (progress.failed > 0) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else if (progress.successful > 0) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else {
      return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepColor = (category, progress) => {
    if (progress.failed > 0) {
      return 'border-red-200 bg-red-50';
    } else if (progress.successful > 0) {
      return 'border-green-200 bg-green-50';
    } else {
      return 'border-gray-200 bg-gray-50';
    }
  };

  const deletionSteps = [
    {
      key: 'blogs',
      title: 'Blogs & Content',
      description: 'User blogs, content, and products',
      icon: Database
    },
    {
      key: 'settings',
      title: 'User Settings',
      description: 'Preferences and configuration',
      icon: User
    },
    {
      key: 'analytics',
      title: 'Analytics Data',
      description: 'Page views and interactions',
      icon: Database
    },
    {
      key: 'storage',
      title: 'File Storage',
      description: 'Uploaded images and files',
      icon: HardDrive
    },
    {
      key: 'auth',
      title: 'Authentication',
      description: 'User account and login',
      icon: Shield
    }
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${className}`}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">User Deletion Results</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-foreground">Deletion Progress</h4>
              <span className="text-sm text-muted-foreground">
                {deletionSummary?.successfulOperations || 0}/{deletionSummary?.totalOperations || 0} operations
              </span>
            </div>
            <ProgressBar
              progress={progress}
              showPercentage={true}
              color={deletionSummary?.failedOperations > 0 ? 'warning' : 'success'}
            />
          </div>

          {/* Deletion Steps */}
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-foreground">Deletion Steps</h4>
            {deletionSteps.map((step) => {
              const stepProgress = deletionSummary?.details?.[step.key] || { attempted: 0, successful: 0, failed: 0 };
              const StepIcon = step.icon;
              
              return (
                <div key={step.key} className={`p-4 border rounded-lg ${getStepColor(step.key, stepProgress)}`}>
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step.key, stepProgress)}
                    <StepIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{step.title}</div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    </div>
                    <div className="text-right text-sm">
                      {stepProgress.attempted > 0 ? (
                        <div>
                          <div className="font-medium">
                            {stepProgress.successful}/{stepProgress.attempted}
                          </div>
                          <div className="text-muted-foreground">completed</div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No data</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className={`p-4 border rounded-lg ${
            deletionSummary?.failedOperations > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
          }`}>
            <div className="flex items-start space-x-3">
              {deletionSummary?.failedOperations > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${
                  deletionSummary?.failedOperations > 0 ? 'text-amber-800' : 'text-green-800'
                }`}>
                  {deletionSummary?.failedOperations > 0 ? 'Deletion Completed with Issues' : 'Deletion Completed Successfully'}
                </h4>
                <p className={`text-sm ${
                  deletionSummary?.failedOperations > 0 ? 'text-amber-700' : 'text-green-700'
                }`}>
                  {deletionSummary?.failedOperations > 0 
                    ? `${deletionSummary.failedOperations} operations failed. The user account has been removed but some data cleanup may be incomplete.`
                    : 'All user data has been successfully removed from the system.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Results Toggle */}
          {deletionSummary?.details && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showDetails ? 'Hide' : 'Show'} Detailed Results
              </button>
              
              {showDetails && (
                <div className="mt-3 space-y-2">
                  {Object.entries(deletionSummary.details).map(([category, progress]) => (
                    <div key={category} className="text-xs text-muted-foreground">
                      <strong>{category}:</strong> {progress.successful} successful, {progress.failed} failed, {progress.attempted} total
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            {onClose && (
              <button onClick={onClose} className="btn-primary">
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}