// WebSocket service for real-time communication
class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.userId = null;
    this.isOnline = navigator.onLine;
    
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.userId) {
        this.connect(this.userId);
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.disconnect();
    });
  }

  connect(userId) {
    if (!this.isOnline) {
      console.log('WebSocket: Cannot connect while offline');
      return;
    }

    this.userId = userId;
    
    // For now, simulate WebSocket connection since we don't have a WebSocket server
    // In a real implementation, you would connect to your WebSocket server here
    this.connectionStatus = 'connected';
    this.reconnectAttempts = 0;
    
    console.log('WebSocket: Simulated connection established for user:', userId);
    this.notifySubscribers('connection', { status: 'connected', userId });
    
    // Simulate periodic events for demonstration
    this.startSimulation();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectionStatus = 'disconnected';
    this.stopSimulation();
    this.notifySubscribers('connection', { status: 'disconnected' });
  }

  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(callback);
    
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
          console.error('Error in WebSocket subscriber:', error);
        }
      });
    }
  }

  // Simulate real-time events for demonstration
  startSimulation() {
    this.simulationInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance of event
        const eventTypes = ['page_view', 'interaction', 'user_joined', 'content_updated'];
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        this.notifySubscribers('live-event', {
          type: randomEvent,
          data: { timestamp: new Date() },
          timestamp: new Date()
        });
      }
    }, 5000);
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  // Send message (simulated)
  send(message) {
    if (this.connectionStatus !== 'connected') {
      console.warn('WebSocket: Cannot send message, not connected');
      return;
    }
    
    console.log('WebSocket: Sending message:', message);
    // In a real implementation, you would send the message via WebSocket
  }

  // Broadcast user presence
  updatePresence(presenceData) {
    this.send({
      type: 'presence-update',
      data: presenceData
    });
  }

  // Broadcast cursor position
  broadcastCursorPosition(position) {
    this.send({
      type: 'cursor-update',
      data: {
        userId: this.userId,
        position,
        timestamp: Date.now()
      }
    });
  }
}

// Global instance
export const webSocketService = new WebSocketService();

// Export for use in components
export default webSocketService;