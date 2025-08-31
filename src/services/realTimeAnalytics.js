// Real-time analytics service for performance monitoring
class RealTimeAnalyticsService {
  constructor() {
    this.subscribers = new Map();
    this.metrics = {
      apiCalls: [],
      pageViews: [],
      interactions: [],
      performance: {
        apiResponseTime: 0,
        memoryUsage: 0,
        renderTime: 0
      }
    };
    
    this.startPerformanceMonitoring();
  }

  // Subscribe to analytics events
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
          console.error('Error in analytics subscriber:', error);
        }
      });
    }
  }

  // Track API call performance
  trackApiCall(endpoint, responseTime, success = true) {
    const callData = {
      endpoint,
      responseTime,
      success,
      timestamp: Date.now()
    };
    
    this.metrics.apiCalls.push(callData);
    
    // Keep only last 100 calls
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls.shift();
    }
    
    // Update performance metrics
    this.metrics.performance.apiResponseTime = responseTime;
    
    this.notifySubscribers('api-call', callData);
    this.notifySubscribers('performance-metrics', this.metrics.performance);
  }

  // Track page view
  trackPageView(page, userId, blogId) {
    const viewData = {
      page,
      userId,
      blogId,
      timestamp: Date.now()
    };
    
    this.metrics.pageViews.push(viewData);
    
    // Keep only last 50 views
    if (this.metrics.pageViews.length > 50) {
      this.metrics.pageViews.shift();
    }
    
    this.notifySubscribers('page-view', viewData);
    this.updateLiveMetrics();
  }

  // Track user interaction
  trackInteraction(type, target, userId, blogId) {
    const interactionData = {
      type,
      target,
      userId,
      blogId,
      timestamp: Date.now()
    };
    
    this.metrics.interactions.push(interactionData);
    
    // Keep only last 50 interactions
    if (this.metrics.interactions.length > 50) {
      this.metrics.interactions.shift();
    }
    
    this.notifySubscribers('interaction', interactionData);
    this.updateLiveMetrics();
  }

  // Update live metrics
  updateLiveMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentViews = this.metrics.pageViews.filter(view => view.timestamp > oneMinuteAgo);
    const recentInteractions = this.metrics.interactions.filter(interaction => interaction.timestamp > oneMinuteAgo);
    
    const liveMetrics = {
      pageViews: recentViews.length,
      interactions: recentInteractions.length,
      timestamp: now
    };
    
    this.notifySubscribers('live-metrics', liveMetrics);
  }

  // Start performance monitoring
  startPerformanceMonitoring() {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.performance.memoryUsage = performance.memory.usedJSHeapSize;
        this.notifySubscribers('performance-metrics', this.metrics.performance);
      }, 10000); // Every 10 seconds
    }
    
    // Monitor render performance
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              this.metrics.performance.renderTime = entry.duration;
              this.notifySubscribers('performance-metrics', this.metrics.performance);
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  // Get current metrics
  getMetrics() {
    return { ...this.metrics };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {
      apiCalls: [],
      pageViews: [],
      interactions: [],
      performance: {
        apiResponseTime: 0,
        memoryUsage: 0,
        renderTime: 0
      }
    };
  }
}

// Create singleton instance
export const realTimeAnalyticsService = new RealTimeAnalyticsService();

export default realTimeAnalyticsService;