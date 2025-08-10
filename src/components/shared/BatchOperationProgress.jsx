import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import ProgressBar from './ProgressBar';

export default function BatchOperationProgress({
  operations = [],
  onComplete = null,
  onCancel = null,
  title = 'Processing Operations',
  className = ''
}) {
  const [currentOperation, setCurrentOperation] = useState(0);
  const [operationResults, setOperationResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const totalOperations = operations.length;
  const completedOperations = operationResults.length;
  const progress = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;

  const successCount = operationResults.filter(r => r.status === 'success').length;
  const errorCount = operationResults.filter(r => r.status === 'error').length;

  useEffect(() => {
    if (operations.length > 0 && !isRunning) {
      processOperations();
    }
  }, [operations]);

  const processOperations = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < operations.length; i++) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) {
              resolve();
            } else {
              setTimeout(checkPause, 100);
            }
          };
          checkPause();
        });
      }

      setCurrentOperation(i);
      const operation = operations[i];
      
      try {
        await operation.execute();
        setOperationResults(prev => [...prev, {
          id: operation.id,
          name: operation.name,
          status: 'success',
          message: 'Completed successfully'
        }]);
      } catch (error) {
        setOperationResults(prev => [...prev, {
          id: operation.id,
          name: operation.name,
          status: 'error',
          message: error.message
        }]);
      }
      
      // Small delay between operations for better UX
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsRunning(false);
    if (onComplete) {
      onComplete({
        total: totalOperations,
        success: successCount,
        errors: errorCount,
        results: operationResults
      });
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleCancel = () => {
    setIsPaused(true);
    setIsRunning(false);
    if (onCancel) {
      onCancel();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <DynamicTransition show={isRunning || operationResults.length > 0} className={className}>
      <div className="bg-white border border-border rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="flex items-center space-x-2">
            {isRunning && (
              <>
                <button
                  onClick={handlePauseResume}
                  className="btn-secondary btn-sm"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-danger btn-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <ProgressBar
            progress={progress}
            showPercentage={true}
            color={errorCount > 0 ? 'warning' : 'primary'}
            animated={isRunning}
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{completedOperations} of {totalOperations} completed</span>
            <span>
              {successCount} success, {errorCount} errors
            </span>
          </div>
        </div>

        {/* Current Operation */}
        {isRunning && currentOperation < operations.length && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-800">
                Processing: {operations[currentOperation]?.name}
              </span>
            </div>
          </div>
        )}

        {/* Operation Results */}
        {operationResults.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <h4 className="text-sm font-medium text-foreground">Results:</h4>
            {operationResults.map((result, index) => (
              <div
                key={result.id}
                className={`flex items-center space-x-3 p-2 rounded-lg ${
                  result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {result.name}
                  </div>
                  <div className={`text-xs ${
                    result.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completion Summary */}
        {!isRunning && operationResults.length === totalOperations && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-800">
                  Batch operation completed
                </div>
                <div className="text-xs text-green-600">
                  {successCount} successful, {errorCount} failed
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DynamicTransition>
  );
}

// Hook for managing batch operations
export function useBatchOperations() {
  const [operations, setOperations] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);

  const addOperation = (operation) => {
    setOperations(prev => [...prev, {
      id: Date.now() + Math.random(),
      ...operation
    }]);
  };

  const addOperations = (newOperations) => {
    const operationsWithIds = newOperations.map(op => ({
      id: Date.now() + Math.random(),
      ...op
    }));
    setOperations(prev => [...prev, ...operationsWithIds]);
  };

  const clearOperations = () => {
    setOperations([]);
    setResults([]);
  };

  const executeAll = async () => {
    setIsRunning(true);
    setResults([]);
    
    for (const operation of operations) {
      try {
        await operation.execute();
        setResults(prev => [...prev, {
          ...operation,
          status: 'success',
          completedAt: new Date()
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          ...operation,
          status: 'error',
          error: error.message,
          completedAt: new Date()
        }]);
      }
    }
    
    setIsRunning(false);
  };

  return {
    operations,
    results,
    isRunning,
    addOperation,
    addOperations,
    clearOperations,
    executeAll
  };
}