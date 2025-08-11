import { useState, useCallback } from 'react';
import { realTimeManager } from '@/services/realTimeService';
import { webSocketService } from '@/services/webSocketService';
import { realTimeAnalyticsService } from '@/services/realTimeAnalytics';
import { performanceService } from '@/services/performanceService';
import toast from 'react-hot-toast';

// Hook for handling real-time operations with optimistic updates
export function useRealTimeOperations() {
  const [pendingOperations, setPendingOperations] = useState(new Map());

  const executeOperation = useCallback(async (operation) => {
    const operationId = `${operation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Track operation start for analytics
    const startTime = performance.now();
    
    // Add to pending operations
    setPendingOperations(prev => new Map(prev).set(operationId, {
      ...operation,
      status: 'pending',
      timestamp: Date.now()
    }));

    // Add optimistic update if provided
    if (operation.optimisticUpdate) {
      realTimeManager.addOptimisticUpdate(operationId, operation.optimisticUpdate);
      
      // Notify subscribers immediately
      realTimeManager.notifySubscribers(operation.dataKey, {
        type: 'optimistic',
        data: operation.optimisticUpdate,
        operationId
      });
    }

    try {
      // Execute the actual operation
      const result = await operation.execute();
      
      // Track operation completion
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Track performance
      performanceService.recordMetric('API_RESPONSE_TIME', responseTime);
      performanceService.trackOperation(true);
      
      // Remove from pending operations
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });

      // Remove optimistic update
      realTimeManager.removeOptimisticUpdate(operationId);

      // Notify subscribers of success
      realTimeManager.notifySubscribers(operation.dataKey, {
        type: 'success',
        data: result,
        operationId
      });

      // Show success notification
      if (operation.successMessage) {
        toast.success(operation.successMessage);
      }
      
      // Broadcast operation success to collaborators
      webSocketService.notifySubscribers('operation-success', {
        type: operation.type,
        result,
        operationId,
        userId: webSocketService.userId
      });
      
      // Call success callback
      if (operation.onSuccess) {
        operation.onSuccess(result);
      }

      return result;
    } catch (error) {
      console.error('Operation failed:', error);
      
      // Track operation failure
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      performanceService.recordMetric('API_RESPONSE_TIME', responseTime);
      performanceService.trackOperation(false);
      
      // Update operation status
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        const op = newMap.get(operationId);
        if (op) {
          newMap.set(operationId, { ...op, status: 'failed', error: error.message });
        }
        return newMap;
      });

      // Remove optimistic update on error
      realTimeManager.removeOptimisticUpdate(operationId);

      // Notify subscribers of error
      realTimeManager.notifySubscribers(operation.dataKey, {
        type: 'error',
        error: error.message,
        operationId
      });


      // Queue for retry if retryable
      if (operation.retryable !== false) {
        realTimeManager.queueOperation(operation);
      }
      
      // Call error callback
      if (operation.onError) {
        operation.onError(error);
      } else if (operation.errorMessage) {
        toast.error(operation.errorMessage);
      } else {
        toast.error(error.message || 'Operation failed');
      }

      throw error;
    }
  }, []);

  const retryFailedOperations = useCallback(async () => {
    await realTimeManager.processPendingOperations();
  }, []);

  return {
    executeOperation,
    pendingOperations: Array.from(pendingOperations.values()),
    retryFailedOperations,
    connectionStatus: realTimeManager.getConnectionStatus()
  };
}

// Hook for auto-save functionality
export function useAutoSave(data, saveFunction, options = {}) {
  const {
    delay = 2000,
    enabled = true,
    showIndicator = true,
    onSave = null,
    onError = null
  } = options;

  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showNotification } = useSmartNotifications();

  const debouncedSave = useCallback(
    debounce(async (dataToSave) => {
      if (!enabled) return;
      
      setAutoSaveStatus('saving');
      try {
        await saveFunction(dataToSave);
        setAutoSaveStatus('saved');
        setLastSaved(new Date());
        setRetryCount(0);
        
        if (onSave) onSave();
        
        if (showIndicator) {
          showNotification('Draft saved automatically', 'success', {
            duration: 2000,
            priority: 'low'
          });
        }
      } catch (error) {
        setRetryCount(prev => prev + 1);
        
        if (retryCount < 3) {
          setAutoSaveStatus('retrying');
          // Retry with exponential backoff
          setTimeout(() => debouncedSave(dataToSave), Math.min(1000 * Math.pow(2, retryCount), 10000));
        } else {
          setAutoSaveStatus('error');
        }
        
        console.error('Auto-save failed:', error);
        
        if (onError) onError(error);
        
        showNotification('Auto-save failed - will retry', 'warning', {
          duration: 3000,
          actions: [
            {
              label: 'Retry Now',
              onClick: () => debouncedSave(dataToSave),
              primary: true
            }
          ]
        });
      }
    }, delay),
    [saveFunction, enabled, delay, onSave, onError, showIndicator, retryCount, showNotification]
  );

  // Trigger auto-save when data changes
  React.useEffect(() => {
    if (data && enabled) {
      setAutoSaveStatus('pending');
      debouncedSave(data);
    }
  }, [data, debouncedSave, enabled]);

  return {
    autoSaveStatus,
    lastSaved,
    forceSave: () => debouncedSave(data),
    retryCount
  };
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}