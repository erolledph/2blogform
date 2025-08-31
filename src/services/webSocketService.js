// WebSocket service for real-time features
class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.userId = null;
    this.blogId = null;
    this.heartbeatInterval = null;
    this.messageQueue = [];
  }

  // Initialize WebSocket connection
  connect(userId, blogId) {
    this.userId = userId;
    this.blogId = blogId;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Use secure WebSocket in production, regular in development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${userId}/${blogId}`;
        
        // For development, simulate WebSocket with EventSource fallback
        if (process.env.NODE_ENV === 'development') {
          this.simulateWebSocket();
          resolve();
          return;
        }
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.notifySubscribers('connection', { status: 'connected' });
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.connectionStatus = 'disconnected';
          this.stopHeartbeat();
          this.notifySubscribers('connection', { status: 'disconnected' });
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionStatus = 'error';
          this.notifySubscribers('connection', { status: 'error', error });
          reject(error);
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  // Simulate WebSocket for development
  simulateWebSocket() {
    this.connectionStatus = 'connected';
    this.notifySubscribers('connection', { status: 'connected' });
    
    // Simulate periodic events for testing
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        this.simulateEvent();
      }
    }, 5000);
  }

  // Simulate random events for development
  simulateEvent() {
    const events = [
      { type: 'page_view', data: { contentId: 'test-content', timestamp: new Date() } },
      { type: 'interaction', data: { type: 'click', contentId: 'test-content', timestamp: new Date() } },
      { type: 'user_joined', data: { userName: 'Test User', location: 'content-editor', timestamp: new Date() } }
    ];
    
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    this.handleMessage(randomEvent);
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'content_update':
        this.notifySubscribers('content-update', data);
        break;
      case 'product_update':
        this.notifySubscribers('product-update', data);
        break;
      case 'user_joined':
        this.notifySubscribers('collaborator-joined', data);
        break;
      case 'user_left':
        this.notifySubscribers('collaborator-left', data);
        break;
      case 'cursor_update':
        this.notifySubscribers('cursor-update', data);
        break;
      case 'typing_status':
        this.notifySubscribers('typing-status', data);
        break;
      case 'live_event':
        this.notifySubscribers('live-event', data);
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  // Send message to server
  send(type, data) {
    const message = {
      type,
      data,
      userId: this.userId,
      blogId: this.blogId,
      timestamp: new Date().toISOString()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
    }
  }

  // Subscribe to events
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(callback);
    
    // Return unsubscribe function
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

  // Start heartbeat to keep connection alive
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Process queued messages
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      } else {
        // Re-queue if connection is lost
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus = 'failed';
      this.notifySubscribers('connection', { status: 'failed' });
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatus = 'reconnecting';
    this.notifySubscribers('connection', { status: 'reconnecting', attempt: this.reconnectAttempts });

    setTimeout(() => {
      if (this.userId && this.blogId) {
        this.connect(this.userId, this.blogId).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
  }

  // Broadcast cursor position
  broadcastCursorPosition(position) {
    this.send('cursor_update', {
      userId: this.userId,
      position,
      timestamp: Date.now()
    });
  }

  // Update user presence
  updatePresence(presenceData) {
    this.send('presence_update', {
      ...presenceData,
      userId: this.userId,
      timestamp: Date.now()
    });
  }

  // Disconnect
  disconnect() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectionStatus = 'disconnected';
    this.subscribers.clear();
    this.messageQueue = [];
  }

  // Get connection status
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      isOnline: navigator.onLine,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Auto-connect when user authentication is available
if (typeof window !== 'undefined') {
  // Listen for auth state changes to auto-connect
  window.addEventListener('auth-state-changed', (event) => {
    const { user, blogId } = event.detail;
    if (user && blogId) {
      webSocketService.connect(user.uid, blogId).catch(error => {
        console.error('Auto-connect failed:', error);
      });
    } else {
      webSocketService.disconnect();
    }
  });
}

export default webSocketService;