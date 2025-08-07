import React from 'react';

// Enhanced Real-time service for WebSocket and Server-Sent Events management
import { webSocketService } from './webSocketService';
import { realTimeAnalyticsService } from './realTimeAnalytics';
import { performanceService } from './performanceService';

class RealTimeManager {
  constructor() {
    this.ws = null;
    this.eventSource = null;
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pendingOperations = [];
    this.optimisticUpdates = new Map();
    this.lastSyncTime = null;
    this.crossTabChannel = null;
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    
    // Enhanced collaboration features
    this.collaborationEnabled = true;
    this.conflictResolution = new Map();
    this.editLocks = new Map();
    this.presenceHeartbeat = null;
    
    // Intelligent prefetching
    this.prefetchQueue = new Map();
    this.prefetchCache = new Map();
    this.behaviorPatterns = new Map();
    this.prefetchEnabled = true;
    
    this.initializeCrossTabSync();
    this.setupOnlineOfflineHandlers();
    this.initializePrefetching();
  }

  // Initialize intelligent prefetching system
  initializePrefetching() {
    // Track user navigation patterns
    this.trackNavigationPattern();
    
    // Setup prefetch based on user behavior
    this.setupBehaviorBasedPrefetch();
    
    // Setup idle time prefetching
    this.setupIdlePrefetch();
  }

  // Track navigation patterns for predictive prefetching
  trackNavigationPattern() {
    let lastRoute = window.location.pathname;
    
    const trackNavigation = () => {
      const currentRoute = window.location.pathname;
      if (currentRoute !== lastRoute) {
        const pattern = `${lastRoute}->${currentRoute}`;
        const count = this.behaviorPatterns.get(pattern) || 0;
        this.behaviorPatterns.set(pattern, count + 1);
        
        // Predict next likely routes
        this.predictAndPrefetch(currentRoute);
        
        lastRoute = currentRoute;
      }
    };
    
    // Use both popstate and a periodic check for SPA navigation
    window.addEventListener('popstate', trackNavigation);
    setInterval(trackNavigation, 1000);
  }

  // Setup behavior-based prefetching
  setupBehaviorBasedPrefetch() {
    let idleTimer;
    let isIdle = false;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      isIdle = false;
      
      idleTimer = setTimeout(() => {
        isIdle = true;
        this.executePrefetchQueue();
      }, 2000); // 2 seconds of inactivity
    };
    
    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });
    
    resetIdleTimer();
  }

  // Setup idle time prefetching
  setupIdlePrefetch() {
    if ('requestIdleCallback' in window) {
      const idlePrefetch = (deadline) => {
        while (deadline.timeRemaining() > 0 && this.prefetchQueue.size > 0) {
          const [key, prefetchTask] = this.prefetchQueue.entries().next().value;
          this.prefetchQueue.delete(key);
          
          try {
            prefetchTask.execute();
          } catch (error) {
            console.warn('Idle prefetch failed:', error);
          }
        }
        
        // Schedule next idle callback
        requestIdleCallback(idlePrefetch);
      };
      
      requestIdleCallback(idlePrefetch);
    }
  }

  // Predict and prefetch likely next routes
  predictAndPrefetch(currentRoute) {
    if (!this.prefetchEnabled) return;
    
    // Find most common next routes from current route
    const predictions = Array.from(this.behaviorPatterns.entries())
      .filter(([pattern]) => pattern.startsWith(currentRoute))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3) // Top 3 predictions
      .map(([pattern]) => pattern.split('->')[1]);
    
    // Queue prefetch tasks for predicted routes
    predictions.forEach(route => {
      this.queuePrefetch(`route-${route}`, {
        priority: 'medium',
        execute: () => this.prefetchRouteData(route)
      });
    });
  }

  // Queue prefetch task
  queuePrefetch(key, task) {
    if (this.prefetchCache.has(key)) return; // Already prefetched
    
    this.prefetchQueue.set(key, {
      ...task,
      timestamp: Date.now()
    });
  }

  // Execute prefetch queue
  async executePrefetchQueue() {
    if (!this.prefetchEnabled || this.prefetchQueue.size === 0) return;
    
    const startTime = performance.now();
    
    // Sort by priority
    const sortedTasks = Array.from(this.prefetchQueue.entries())
      .sort(([,a], [,b]) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
    
    // Execute high priority tasks first
    for (const [key, task] of sortedTasks.slice(0, 5)) { // Limit concurrent prefetches
      try {
        await task.execute();
        this.prefetchCache.set(key, { prefetched: true, timestamp: Date.now() });
        this.prefetchQueue.delete(key);
        
        // Track prefetch performance
        const duration = performance.now() - startTime;
        performanceService.recordMetric('PREFETCH_TIME', duration, { key });
        
      } catch (error) {
        console.warn('Prefetch failed for', key, error);
        this.prefetchQueue.delete(key);
      }
    }
  }

  // Prefetch route data
  async prefetchRouteData(route) {
    const routeDataMap = {
      '/dashboard/manage': () => this.prefetchContentData(),
      '/dashboard/manage-products': () => this.prefetchProductsData(),
      '/dashboard/analytics': () => this.prefetchAnalyticsData(),
      '/dashboard/storage': () => this.prefetchStorageData()
    };
    
    const prefetchFunction = routeDataMap[route];
    if (prefetchFunction) {
      await prefetchFunction();
    }
  }

  // Prefetch content data
  async prefetchContentData() {
    // This would prefetch content list data
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ type: 'content', prefetched: true });
      }, 100);
    });
  }

  // Prefetch products data
  async prefetchProductsData() {
    // This would prefetch products list data
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ type: 'products', prefetched: true });
      }, 100);
    });
  }

  // Prefetch analytics data
  async prefetchAnalyticsData() {
    // This would prefetch analytics data
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ type: 'analytics', prefetched: true });
      }, 150);
    });
  }

  // Prefetch storage data
  async prefetchStorageData() {
    // This would prefetch storage data
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ type: 'storage', prefetched: true });
      }, 120);
    });
  }

  // Get prefetch statistics
  getPrefetchStats() {
    return {
      queueSize: this.prefetchQueue.size,
      cacheSize: this.prefetchCache.size,
      behaviorPatterns: this.behaviorPatterns.size,
      enabled: this.prefetchEnabled
    };
  }

  // Enable/disable prefetching
  setPrefetchEnabled(enabled) {
    this.prefetchEnabled = enabled;
    if (!enabled) {
      this.prefetchQueue.clear();
    }
  }
  // Initialize cross-tab synchronization
  initializeCrossTabSync() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.crossTabChannel = new BroadcastChannel('admin-cms-sync');
      this.crossTabChannel.onmessage = (event) => {
        this.handleCrossTabMessage(event.data);
      };
    }
  }

  // Setup online/offline handlers
  setupOnlineOfflineHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  // Initialize real-time connections
  async initialize(userId, blogId) {
    this.userId = userId;
    this.blogId = blogId;
    
    try {
      // For production, you would set up actual WebSocket connections here
      // For now, we'll use a hybrid approach with polling and optimistic updates
      this.connectionStatus = 'connecting';
      this.notifySubscribers('connection', { status: 'connecting' });
      
      // Initialize WebSocket service for collaboration
      await webSocketService.initialize(userId, blogId);
      
      // Initialize real-time analytics
      realTimeAnalyticsService.startStreaming(userId, blogId);
      
      // Simulate connection establishment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.connectionStatus = 'connected';
      this.lastSyncTime = new Date();
      this.notifySubscribers('connection', { status: 'connected' });
      
      // Start periodic sync for real-time feel
      this.startPeriodicSync();
      
      // Start presence heartbeat
      this.startPresenceHeartbeat();
      
      console.log('Real-time manager initialized for user:', userId, 'blog:', blogId);
    } catch (error) {
      console.error('Failed to initialize real-time manager:', error);
      this.connectionStatus = 'error';
      this.notifySubscribers('connection', { status: 'error', error: error.message });
    }
  }

  // Subscribe to real-time updates
  subscribe(dataKey, callback) {
    if (!this.subscribers.has(dataKey)) {
      this.subscribers.set(dataKey, new Set());
    }
    this.subscribers.get(dataKey).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(dataKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(dataKey);
        }
      }
    };
  }

  // Notify subscribers of updates
  notifySubscribers(dataKey, data) {
    const callbacks = this.subscribers.get(dataKey);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Add optimistic update with automatic rollback
  addOptimisticUpdate(id, data, rollbackData = null) {
    this.optimisticUpdates.set(id, {
      data,
      rollbackData,
      timestamp: Date.now()
    });
    
    // Auto-remove after 30 seconds if not manually removed
    setTimeout(() => {
      if (this.optimisticUpdates.has(id)) {
        console.warn(`Optimistic update ${id} timed out, removing`);
        this.optimisticUpdates.delete(id);
      }
    }, 30000);
  }

  // Remove optimistic update
  removeOptimisticUpdate(id) {
    this.optimisticUpdates.delete(id);
  }

  // Rollback optimistic update
  rollbackOptimisticUpdate(id) {
    const update = this.optimisticUpdates.get(id);
    if (update && update.rollbackData) {
      this.notifySubscribers('rollback', {
        id,
        data: update.rollbackData
      });
    }
    this.optimisticUpdates.delete(id);
  }

  // Execute operation with optimistic updates and error recovery
  async executeOperation(operation) {
    const operationId = `${operation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Add optimistic update if provided
      if (operation.optimisticUpdate) {
        this.addOptimisticUpdate(operationId, operation.optimisticUpdate, operation.rollbackData);
        
        // Notify subscribers immediately for instant UI feedback
        this.notifySubscribers(operation.dataKey, {
          type: 'optimistic',
          data: operation.optimisticUpdate,
          operationId
        });
      }

      // Execute the operation
      const result = await operation.execute();
      
      // Remove optimistic update on success
      this.removeOptimisticUpdate(operationId);
      
      // Notify subscribers of successful completion
      this.notifySubscribers(operation.dataKey, {
        type: 'success',
        data: result,
        operationId
      });

      // Broadcast to other tabs
      this.broadcastToTabs({
        type: 'operation-success',
        dataKey: operation.dataKey,
        data: result,
        operationId
      });

      return result;
    } catch (error) {
      console.error('Operation failed:', error);
      
      // Rollback optimistic update
      this.rollbackOptimisticUpdate(operationId);
      
      // Notify subscribers of error
      this.notifySubscribers(operation.dataKey, {
        type: 'error',
        error: error.message,
        operationId
      });

      // Queue for retry if retryable and online
      if (operation.retryable !== false && this.isOnline) {
        this.queueOperation({ ...operation, operationId, retryCount: 0 });
      } else if (!this.isOnline) {
        this.offlineQueue.push({ ...operation, operationId });
      }

      throw error;
    }
  }

  // Queue operation for retry
  queueOperation(operation) {
    this.pendingOperations.push({
      ...operation,
      timestamp: Date.now(),
      retryCount: operation.retryCount || 0
    });
    
    // Process queue after delay
    setTimeout(() => this.processPendingOperations(), this.getRetryDelay(operation.retryCount));
  }

  // Get retry delay with exponential backoff
  getRetryDelay(retryCount) {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  // Process pending operations
  async processPendingOperations() {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await operation.execute();
        this.notifySubscribers('operation-retry-success', operation);
      } catch (error) {
        operation.retryCount++;
        if (operation.retryCount < 3) {
          this.pendingOperations.push(operation);
        } else {
          this.notifySubscribers('operation-failed', { operation, error });
        }
      }
    }
  }

  // Handle online event
  handleOnline() {
    this.isOnline = true;
    this.notifySubscribers('connection', { status: 'online' });
    
    // Process offline queue
    this.processOfflineQueue();
  }

  // Handle offline event
  handleOffline() {
    this.isOnline = false;
    this.notifySubscribers('connection', { status: 'offline' });
  }

  // Process offline queue when back online
  async processOfflineQueue() {
    const operations = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Failed to process offline operation:', error);
      }
    }
  }

  // Broadcast message to other tabs
  broadcastToTabs(message) {
    if (this.crossTabChannel) {
      this.crossTabChannel.postMessage({
        ...message,
        timestamp: Date.now(),
        userId: this.userId,
        blogId: this.blogId
      });
    }
  }

  // Handle cross-tab messages
  handleCrossTabMessage(message) {
    if (message.userId === this.userId && message.blogId === this.blogId) {
      this.notifySubscribers('cross-tab-sync', message);
    }
  }

  // Start periodic sync for real-time feel
  startPeriodicSync() {
    // Sync every 10 seconds for live feel
    this.syncInterval = setInterval(() => {
      this.lastSyncTime = new Date();
      this.notifySubscribers('periodic-sync', { timestamp: this.lastSyncTime });
    }, 10000);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      isOnline: this.isOnline,
      lastSync: this.lastSyncTime,
      pendingOperations: this.pendingOperations.length,
      optimisticUpdates: this.optimisticUpdates.size
    };
  }

  // Start presence heartbeat
  startPresenceHeartbeat() {
    this.presenceHeartbeat = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        webSocketService.updatePresence({
          userId: this.userId,
          userName: 'Current User',
          location: 'dashboard',
          lastSeen: new Date(),
          isActive: document.hasFocus()
        });
      }
    }, 30000); // Every 30 seconds
  }

  // Enhanced conflict detection
  detectEditConflict(localData, serverData) {
    if (!localData || !serverData) return null;
    
    const localTimestamp = new Date(localData.updatedAt || 0);
    const serverTimestamp = new Date(serverData.updatedAt || 0);
    
    if (serverTimestamp > localTimestamp && 
        JSON.stringify(localData) !== JSON.stringify(serverData)) {
      
      const conflictId = `conflict-${Date.now()}`;
      const conflict = {
        id: conflictId,
        type: 'concurrent_edit',
        localData,
        serverData,
        timestamp: new Date(),
        resolved: false
      };
      
      this.conflictResolution.set(conflictId, conflict);
      this.notifySubscribers('edit-conflict', conflict);
      
      return conflict;
    }
    
    return null;
  }

  // Resolve edit conflict
  resolveEditConflict(conflictId, resolution) {
    const conflict = this.conflictResolution.get(conflictId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution;
      this.conflictResolution.set(conflictId, conflict);
      this.notifySubscribers('conflict-resolved', { conflictId, resolution });
    }
  }

  // Request edit lock
  async requestEditLock(resourceId, fieldName, userId) {
    const lockKey = `${resourceId}-${fieldName}`;
    const existingLock = this.editLocks.get(lockKey);
    
    // Check if lock is available or expired
    if (!existingLock || existingLock.expires < new Date()) {
      const lock = {
        resourceId,
        fieldName,
        userId,
        acquired: new Date(),
        expires: new Date(Date.now() + 30000) // 30 seconds
      };
      
      this.editLocks.set(lockKey, lock);
      this.notifySubscribers('edit-lock-acquired', lock);
      
      // Auto-release lock after expiration
      setTimeout(() => {
        this.releaseEditLock(resourceId, fieldName, userId);
      }, 30000);
      
      return lock;
    }
    
    throw new Error('Field is currently being edited by another user');
  }

  // Release edit lock
  releaseEditLock(resourceId, fieldName, userId) {
    const lockKey = `${resourceId}-${fieldName}`;
    const lock = this.editLocks.get(lockKey);
    
    if (lock && lock.userId === userId) {
      this.editLocks.delete(lockKey);
      this.notifySubscribers('edit-lock-released', { resourceId, fieldName, userId });
    }
  }

  // Get active collaborators
  getActiveCollaborators() {
    return webSocketService.getCollaborators();
  }

  // Get edit locks
  getEditLocks() {
    return Array.from(this.editLocks.values());
  }

  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.syncInterval) {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat);
    }
    
    // Disconnect collaboration services
    webSocketService.disconnect();
    realTimeAnalyticsService.stopStreaming();
    
    // Clear prefetch data
    this.prefetchQueue.clear();
    this.prefetchCache.clear();
    this.behaviorPatterns.clear();
      clearInterval(this.syncInterval);
    }
    if (this.crossTabChannel) {
      this.crossTabChannel.close();
    }
    
    this.connectionStatus = 'disconnected';
    this.subscribers.clear();
    this.optimisticUpdates.clear();
    this.pendingOperations = [];
    this.offlineQueue = [];
    this.conflictResolution.clear();
    this.editLocks.clear();
  }
}

// Global instance
export const realTimeManager = new RealTimeManager();

// React hook for real-time data with optimistic updates
export function useRealTimeData(dataKey, fetchFunction, dependencies = [], options = {}) {
  const {
    enableOptimistic = true,
    enableCrossTab = true,
    refreshInterval = 30000,
    retryOnError = true
  } = options;

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [optimisticUpdates, setOptimisticUpdates] = React.useState([]);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  // Subscribe to real-time updates
  React.useEffect(() => {
    const unsubscribe = realTimeManager.subscribe(dataKey, (update) => {
      switch (update.type) {
        case 'optimistic':
          if (enableOptimistic) {
            setOptimisticUpdates(prev => [...prev, update]);
          }
          break;
        case 'success':
          setOptimisticUpdates(prev => prev.filter(u => u.operationId !== update.operationId));
          setData(update.data);
          setLastUpdated(new Date());
          break;
        case 'error':
          setOptimisticUpdates(prev => prev.filter(u => u.operationId !== update.operationId));
          setError(update.error);
          break;
        case 'rollback':
          setOptimisticUpdates(prev => prev.filter(u => u.operationId !== update.operationId));
          break;
      }
    });

    return unsubscribe;
  }, [dataKey, enableOptimistic]);

  // Subscribe to cross-tab sync
  React.useEffect(() => {
    if (!enableCrossTab) return;

    const unsubscribe = realTimeManager.subscribe('cross-tab-sync', (message) => {
      if (message.dataKey === dataKey) {
        // Refresh data when other tabs make changes
        fetchData();
      }
    });

    return unsubscribe;
  }, [dataKey, enableCrossTab]);

  // Initial data fetch
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      if (retryOnError) {
        // Retry after delay
        setTimeout(fetchData, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, retryOnError]);

  React.useEffect(() => {
    fetchData();
  }, dependencies);

  // Periodic refresh
  React.useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    optimisticUpdates,
    lastUpdated,
    refetch: fetchData
  };
}

// Hook for real-time operations with comprehensive error handling
export function useRealTimeOperations() {
  const [pendingOperations, setPendingOperations] = React.useState(new Map());

  const executeOperation = React.useCallback(async (operation) => {
    return await realTimeManager.executeOperation(operation);
  }, []);

  const retryFailedOperations = React.useCallback(async () => {
    await realTimeManager.processPendingOperations();
  }, []);

  return {
    executeOperation,
    pendingOperations: Array.from(pendingOperations.values()),
    retryFailedOperations,
    connectionStatus: realTimeManager.getConnectionStatus()
  };
}