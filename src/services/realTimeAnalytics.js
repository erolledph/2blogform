// Real-time analytics service
class RealTimeAnalyticsService {
  constructor() {
    this.subscribers = new Map();
    this.metrics = {
      apiCalls: [],
      pageViews: [],
      userInteractions: [],
      errors: []
    };
    
    this.startTracking();
  }

  startTracking() {
    // Track API calls
    this.originalFetch = window.fetch;
    window.fetch = this.trackFetch.bind(this);
    
    // Track page views
    this.trackPageViews();
    
    // Track user interactions
    this.trackUserInteractions();
  }

  async trackFetch(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await this.originalFetch(url, options);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.trackApiCall(options.method || 'GET', responseTime, response.ok);
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.trackApiCall(options.method || 'GET', responseTime, false);
      throw error;
    }
  }

  trackApiCall(method, responseTime, success) {
    const call = {
      method,
      responseTime,
      success,
      timestamp: new Date()
    };
    
    this.metrics.apiCalls.push(call);
    
    // Keep only last 100 calls
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-100);
    }
    
    this.notifySubscribers('api-call', call);
    
    // Update live metrics
    this.updateLiveMetrics();
  }

  trackPageViews() {
    // Track initial page view
    this.trackPageView(window.location.pathname);
    
    // Track navigation changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };
    
    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });
  }

  trackPageView(path) {
    const view = {
      path,
      timestamp: new Date(),
      userAgent: navigator.userAgent.substring(0, 100)
    };
    
    this.metrics.pageViews.push(view);
    
    if (this.metrics.pageViews.length > 50) {
      this.metrics.pageViews = this.metrics.pageViews.slice(-50);
    }
    
    this.notifySubscribers('page-view', view);
    this.updateLiveMetrics();
  }

  trackUserInteractions() {
    ['click', 'scroll', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        this.trackInteraction(eventType, e.target);
      }, { passive: true });
    });
  }

  trackInteraction(type, target) {
    const interaction = {
      type,
      target: target.tagName || 'unknown',
      timestamp: new Date()
    };
    
    this.metrics.userInteractions.push(interaction);
    
    if (this.metrics.userInteractions.length > 100) {
      this.metrics.userInteractions = this.metrics.userInteractions.slice(-100);
    }
    
    this.notifySubscribers('user-interaction', interaction);
  }

  updateLiveMetrics() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentApiCalls = this.metrics.apiCalls.filter(call => call.timestamp > oneMinuteAgo);
    const recentPageViews = this.metrics.pageViews.filter(view => view.timestamp > oneMinuteAgo);
    const recentInteractions = this.metrics.userInteractions.filter(interaction => interaction.timestamp > oneMinuteAgo);
    
    const liveMetrics = {
      apiCalls: recentApiCalls.length,
      pageViews: recentPageViews.length,
      interactions: recentInteractions.length,
      apiResponseTime: recentApiCalls.length > 0 
        ? recentApiCalls.reduce((sum, call) => sum + call.responseTime, 0) / recentApiCalls.length 
        : 0,
      errorRate: recentApiCalls.length > 0
        ? (recentApiCalls.filter(call => !call.success).length / recentApiCalls.length) * 100
        : 0
    };
    
    this.notifySubscribers('live-metrics', liveMetrics);
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
          console.error('Error in analytics subscriber:', error);
        }
      });
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Global instance
export const realTimeAnalyticsService = new RealTimeAnalyticsService();

export default realTimeAnalyticsService;