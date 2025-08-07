import React from 'react';

// WebSocket service for real-time communication
class WebSocketService {
  constructor() {
    this.ws = null;
    this.eventSource = null;
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.userId = null;
    this.blogId = null;
    this.presenceData = new Map();
    this.collaborators = new Map();
    this.heartbeatInterval = null;
  }

  // Initialize WebSocket connection
  async initialize(userId, blogId) {
    this.userId = userId;
    this.blogId = blogId;
    
    try {
      this.connectionStatus = 'connecting';
      this.notifySubscribers('connection', { status: 'connecting' });
      
      // In a production environment, you would connect to actual WebSocket server
      // For now, we'll simulate WebSocket behavior with enhanced real-time features
      await this.simulateWebSocketConnection();
      
      this.connectionStatus = 'connected';
      this.notifySubscribers('connection', { status: 'connected' });
      
      // Start presence tracking
      this.startPresenceTracking();
      
      // Start heartbeat
      this.startHeartbeat();
      
      console.log('WebSocket service initialized for user:', userId, 'blog:', blogId);
    } catch (error) {
      console.error('Failed to initialize WebSocket service:', error);
      this.connectionStatus = 'error';
      this.notifySubscribers('connection', { status: 'error', error: error.message });
    }
  }

  // Simulate WebSocket connection for development
  async simulateWebSocketConnection() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.setupEventSource();
        resolve();
      }, 500);
    });
  }

  // Setup Server-Sent Events for live updates
  setupEventSource() {
    // In production, this would connect to actual SSE endpoint
    // For now, we'll simulate with periodic updates
    this.eventSource = {
      close: () => clearInterval(this.simulationInterval)
    };
    
    // Simulate live events every 10 seconds
    this.simulationInterval = setInterval(() => {
      this.simulateLiveEvent();
    }, 10000);
  }

  // Simulate live events for demonstration
  simulateLiveEvent() {
    const eventTypes = ['page_view', 'interaction', 'user_joined', 'user_left'];
    const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const eventData = {
      type: randomEvent,
      timestamp: new Date(),
      userId: this.userId,
      blogId: this.blogId,
      data: this.generateEventData(randomEvent)
    };
    
    this.notifySubscribers('live-event', eventData);
  }

  // Generate sample event data
  generateEventData(eventType) {
    switch (eventType) {
      case 'page_view':
        return {
          contentId: `content-${Math.random().toString(36).substr(2, 9)}`,
          userAgent: 'Sample Browser',
          referrer: 'Direct'
        };
      case 'interaction':
        return {
          type: 'click',
          contentId: `content-${Math.random().toString(36).substr(2, 9)}`,
          metadata: { button: 'share' }
        };
      case 'user_joined':
        return {
          userId: `user-${Math.random().toString(36).substr(2, 9)}`,
          userName: 'Anonymous User',
          location: 'content-editor'
        };
      case 'user_left':
        return {
          userId: `user-${Math.random().toString(36).substr(2, 9)}`,
          location: 'content-editor'
        };
      default:
        return {};
    }
  }

  // Start presence tracking
  startPresenceTracking() {
    // Track current user's presence
    this.updatePresence({
      userId: this.userId,
      userName: 'Current User',
      location: 'dashboard',
      lastSeen: new Date(),
      isActive: true
    });

    // Simulate other users for demonstration
    this.simulateCollaborators();
  }

  // Simulate collaborators for demonstration
  simulateCollaborators() {
    const collaborators = [
      { id: 'user-1', name: 'Alice Johnson', color: '#3b82f6', location: 'content-editor' },
      { id: 'user-2', name: 'Bob Smith', color: '#10b981', location: 'product-manager' },
      { id: 'user-3', name: 'Carol Davis', color: '#f59e0b', location: 'analytics' }
    ];

    collaborators.forEach((collaborator, index) => {
      setTimeout(() => {
        this.addCollaborator(collaborator);
      }, (index + 1) * 2000);
    });
  }

  // Add collaborator
  addCollaborator(collaborator) {
    this.collaborators.set(collaborator.id, {
      ...collaborator,
      joinedAt: new Date(),
      cursor: { x: 0, y: 0 },
      isTyping: false
    });
    
    this.notifySubscribers('collaborator-joined', collaborator);
  }

  // Remove collaborator
  removeCollaborator(collaboratorId) {
    const collaborator = this.collaborators.get(collaboratorId);
    if (collaborator) {
      this.collaborators.delete(collaboratorId);
      this.notifySubscribers('collaborator-left', collaborator);
    }
  }

  // Update user presence
  updatePresence(presenceData) {
    this.presenceData.set(presenceData.userId, presenceData);
    this.notifySubscribers('presence-update', presenceData);
  }

  // Broadcast cursor position
  broadcastCursorPosition(position) {
    const message = {
      type: 'cursor-move',
      userId: this.userId,
      position,
      timestamp: new Date()
    };
    
    this.notifySubscribers('cursor-update', message);
  }

  // Start heartbeat to maintain connection
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.notifySubscribers('heartbeat', { timestamp: new Date() });
      }
    }, 30000); // Every 30 seconds
  }

  // Subscribe to events
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

  // Notify subscribers
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

  // Get current collaborators
  getCollaborators() {
    return Array.from(this.collaborators.values());
  }

  // Get presence data
  getPresenceData() {
    return Array.from(this.presenceData.values());
  }

  // Cleanup
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    
    this.connectionStatus = 'disconnected';
    this.subscribers.clear();
    this.collaborators.clear();
    this.presenceData.clear();
  }
}

// Global WebSocket service instance
export const webSocketService = new WebSocketService();

// React hook for real-time collaboration
export function useCollaboration(location = 'dashboard') {
  const [collaborators, setCollaborators] = React.useState([]);
  const [presenceData, setPresenceData] = React.useState([]);
  const [isTyping, setIsTyping] = React.useState(false);

  React.useEffect(() => {
    // Subscribe to collaborator events
    const unsubscribeJoined = webSocketService.subscribe('collaborator-joined', (collaborator) => {
      setCollaborators(prev => [...prev.filter(c => c.id !== collaborator.id), collaborator]);
    });

    const unsubscribeLeft = webSocketService.subscribe('collaborator-left', (collaborator) => {
      setCollaborators(prev => prev.filter(c => c.id !== collaborator.id));
    });

    const unsubscribePresence = webSocketService.subscribe('presence-update', (presence) => {
      setPresenceData(prev => [...prev.filter(p => p.userId !== presence.userId), presence]);
    });

    // Update current user's location
    webSocketService.updatePresence({
      userId: webSocketService.userId,
      userName: 'Current User',
      location,
      lastSeen: new Date(),
      isActive: true
    });

    return () => {
      unsubscribeJoined();
      unsubscribeLeft();
      unsubscribePresence();
    };
  }, [location]);

  const broadcastTyping = (typing) => {
    setIsTyping(typing);
    webSocketService.notifySubscribers('typing-status', {
      userId: webSocketService.userId,
      isTyping: typing,
      location
    });
  };

  const broadcastCursor = (position) => {
    webSocketService.broadcastCursorPosition(position);
  };

  return {
    collaborators,
    presenceData,
    isTyping,
    broadcastTyping,
    broadcastCursor
  };
}