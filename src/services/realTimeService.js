// Real-time service for managing live updates and operations
class RealTimeManager {
  constructor() {
    this.subscribers = new Map();
    this.pendingOperations = new Map();
    this.optimisticUpdates = new Map();
    this.connectionStatus = {
      status: 'disconnected',
      isOnline: navigator.onLine,
      lastSync: null,
      pendingOperations: 0,
      optimisticUpdates: 0
    };
    
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.connectionStatus.isOnline = true;
      this.notifySubscribers('connection', { status: 'connected', isOnline: true });
      this.processPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.connectionStatus.isOnline = false;
      this.notifySubscribers('connection', { status: 'offline', isOnline: false });
    });
  }

  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  notifySubscribers(eventType, data) {
    const callbacks = this.subscribers.get(eventType);
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

  addOptimisticUpdate(operationId, updateData) {
    this.optimisticUpdates.set(operationId, {
      id: operationId,
      data: updateData,
      timestamp: Date.now()
    });
    
    this.connectionStatus.optimisticUpdates = this.optimisticUpdates.size;
    this.notifySubscribers('optimistic-update-added', { operationId, updateData });
  }

  removeOptimisticUpdate(operationId) {
    this.optimisticUpdates.delete(operationId);
    this.connectionStatus.optimisticUpdates = this.optimisticUpdates.size;
    this.notifySubscribers('optimistic-update-removed', { operationId });
  }

  queueOperation(operation) {
    const operationId = operation.id || `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.pendingOperations.set(operationId, {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    this.connectionStatus.pendingOperations = this.pendingOperations.size;
    
    // Try to process immediately if online
    if (this.connectionStatus.isOnline) {
      this.processPendingOperations();
    }
    
    return operationId;
  }

  async processPendingOperations() {
    if (!this.connectionStatus.isOnline || this.pendingOperations.size === 0) {
      return;
    }

    const operations = Array.from(this.pendingOperations.values());
    
    for (const operation of operations) {
      try {
        await operation.execute();
        this.pendingOperations.delete(operation.id);
        this.notifySubscribers('operation-success', operation);
      } catch (error) {
        operation.retryCount++;
        
        if (operation.retryCount >= (operation.maxRetries || 3)) {
          this.pendingOperations.delete(operation.id);
          this.notifySubscribers('operation-failed', { operation, error });
        }
      }
    }
    
    this.connectionStatus.pendingOperations = this.pendingOperations.size;
    this.connectionStatus.lastSync = new Date();
  }

  getConnectionStatus() {
    return { ...this.connectionStatus };
  }

  // Simulate real-time events for demonstration
  simulateUserEvent(eventType, userData) {
    this.notifySubscribers('user-event', {
      type: eventType,
      data: userData,
      timestamp: new Date()
    });
  }
}

// Global instance
export const realTimeManager = new RealTimeManager();

// Export for use in components
export default realTimeManager;