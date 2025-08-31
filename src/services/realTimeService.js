// Real-time service for managing optimistic updates and data synchronization
class RealTimeManager {
  constructor() {
    this.subscribers = new Map();
    this.optimisticUpdates = new Map();
    this.pendingOperations = [];
    this.connectionStatus = {
      status: 'disconnected',
      isOnline: navigator.onLine,
      lastSync: null,
      pendingOperations: 0,
      optimisticUpdates: 0
    };
    
    this.setupNetworkListeners();
  }

  // Setup network status listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.connectionStatus.isOnline = true;
      this.notifySubscribers('connection', this.connectionStatus);
      this.processPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.connectionStatus.isOnline = false;
      this.notifySubscribers('connection', this.connectionStatus);
    });
  }

  // Subscribe to events
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(callback);
    
    return () => {
      const eventSubscribers = this.subscribers.get(eventType);
      if (eventSubscribers) {
        eventSubscribers.delete(callback);
        if (eventSubscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  // Notify subscribers
  notifySubscribers(eventType, data) {
    const eventSubscribers = this.subscribers.get(eventType);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Add optimistic update
  addOptimisticUpdate(operationId, updateData) {
    this.optimisticUpdates.set(operationId, {
      ...updateData,
      timestamp: Date.now()
    });
    
    this.updateConnectionStatus();
  }

  // Remove optimistic update
  removeOptimisticUpdate(operationId) {
    this.optimisticUpdates.delete(operationId);
    this.updateConnectionStatus();
  }

  // Queue operation for retry
  queueOperation(operation) {
    this.pendingOperations.push({
      ...operation,
      queuedAt: Date.now(),
      retryCount: 0
    });
    
    this.updateConnectionStatus();
  }

  // Process pending operations
  async processPendingOperations() {
    if (!this.connectionStatus.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await operation.execute();
        console.log('Pending operation completed:', operation.type);
      } catch (error) {
        console.error('Pending operation failed:', error);
        
        // Retry with exponential backoff
        if (operation.retryCount < 3) {
          operation.retryCount++;
          setTimeout(() => {
            this.pendingOperations.push(operation);
          }, Math.min(1000 * Math.pow(2, operation.retryCount), 30000));
        }
      }
    }

    this.updateConnectionStatus();
  }

  // Update connection status
  updateConnectionStatus() {
    this.connectionStatus = {
      ...this.connectionStatus,
      pendingOperations: this.pendingOperations.length,
      optimisticUpdates: this.optimisticUpdates.size,
      lastSync: new Date()
    };
    
    this.notifySubscribers('connection', this.connectionStatus);
  }

  // Get connection status
  getConnectionStatus() {
    return { ...this.connectionStatus };
  }

  // Clear all data
  clear() {
    this.optimisticUpdates.clear();
    this.pendingOperations = [];
    this.updateConnectionStatus();
  }
}

// Create singleton instance
export const realTimeManager = new RealTimeManager();

export default realTimeManager;