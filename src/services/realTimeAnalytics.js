import { useState, useEffect } from 'react';

// Real-time analytics service for live data streaming
class RealTimeAnalyticsService {
  constructor() {
    this.subscribers = new Map();
    this.metricsBuffer = new Map();
    this.isStreaming = false;
    this.streamInterval = null;
    this.performanceMetrics = {
      apiCalls: 0,
      averageResponseTime: 0,
      errorCount: 0,
      successCount: 0
    };
  }

  // Start real-time analytics streaming
  startStreaming(userId, blogId) {
    this.userId = userId;
    this.blogId = blogId;
    this.isStreaming = true;
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    console.log('Real-time analytics streaming started');
  }

  // Stop streaming
  stopStreaming() {
    this.isStreaming = false;
    
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    console.log('Real-time analytics streaming stopped');
  }

  // Start collecting metrics
  startMetricsCollection() {
    this.streamInterval = setInterval(() => {
      if (this.isStreaming) {
        this.generateLiveMetrics();
      }
    }, 10000); // Update every 10 seconds
  }

  // Start performance monitoring
  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(() => {
      if (this.isStreaming) {
        this.collectPerformanceMetrics();
      }
    }, 5000); // Update every 5 seconds
  }

  // Generate simulated live metrics
  generateLiveMetrics() {
    const metrics = {
      timestamp: new Date(),
      pageViews: Math.floor(Math.random() * 10) + 1,
      interactions: Math.floor(Math.random() * 5) + 1,
      activeUsers: Math.floor(Math.random() * 20) + 5,
      bounceRate: (Math.random() * 30 + 40).toFixed(1), // 40-70%
      avgSessionDuration: Math.floor(Math.random() * 300 + 120), // 2-7 minutes
      topPages: this.generateTopPages(),
      trafficSources: this.generateTrafficSources(),
      deviceTypes: this.generateDeviceTypes()
    };

    this.notifySubscribers('live-metrics', metrics);
  }

  // Collect performance metrics
  collectPerformanceMetrics() {
    const metrics = {
      timestamp: new Date(),
      apiResponseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      memoryUsage: Math.floor(Math.random() * 30) + 40, // 40-70%
      cpuUsage: Math.floor(Math.random() * 20) + 10, // 10-30%
      activeConnections: Math.floor(Math.random() * 50) + 10,
      errorRate: Math.random() * 2, // 0-2%
      throughput: Math.floor(Math.random() * 100) + 50, // 50-150 req/min
      cacheHitRate: (Math.random() * 20 + 80).toFixed(1) // 80-100%
    };

    this.notifySubscribers('performance-metrics', metrics);
  }

  // Generate sample top pages data
  generateTopPages() {
    const pages = [
      'getting-started-with-react-hooks',
      'building-responsive-layouts-css-grid',
      'introduction-typescript-developers',
      'advanced-javascript-concepts',
      'modern-web-development-guide'
    ];

    return pages.slice(0, 3).map(page => ({
      slug: page,
      views: Math.floor(Math.random() * 50) + 10,
      title: page.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }

  // Generate sample traffic sources
  generateTrafficSources() {
    const sources = [
      { name: 'Direct', percentage: Math.floor(Math.random() * 20) + 30 },
      { name: 'Google', percentage: Math.floor(Math.random() * 15) + 25 },
      { name: 'Social Media', percentage: Math.floor(Math.random() * 10) + 15 },
      { name: 'Referral', percentage: Math.floor(Math.random() * 10) + 10 }
    ];

    // Normalize percentages
    const total = sources.reduce((sum, source) => sum + source.percentage, 0);
    return sources.map(source => ({
      ...source,
      percentage: Math.round((source.percentage / total) * 100)
    }));
  }

  // Generate sample device types
  generateDeviceTypes() {
    return [
      { name: 'Desktop', percentage: Math.floor(Math.random() * 20) + 50 },
      { name: 'Mobile', percentage: Math.floor(Math.random() * 15) + 30 },
      { name: 'Tablet', percentage: Math.floor(Math.random() * 10) + 10 }
    ];
  }

  // Track API call performance
  trackApiCall(endpoint, responseTime, success = true) {
    this.performanceMetrics.apiCalls++;
    
    if (success) {
      this.performanceMetrics.successCount++;
    } else {
      this.performanceMetrics.errorCount++;
    }

    // Update average response time
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime + responseTime) / 2;

    // Notify subscribers of API performance update
    this.notifySubscribers('api-performance', {
      endpoint,
      responseTime,
      success,
      timestamp: new Date(),
      totalCalls: this.performanceMetrics.apiCalls,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      errorRate: (this.performanceMetrics.errorCount / this.performanceMetrics.apiCalls) * 100
    });
  }

  // Subscribe to real-time analytics events
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
          console.error('Error in analytics subscriber callback:', error);
        }
      });
    }
  }

  // Get current streaming status
  getStreamingStatus() {
    return {
      isStreaming: this.isStreaming,
      userId: this.userId,
      blogId: this.blogId,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
      performanceMetrics: this.performanceMetrics
    };
  }
}

// Global real-time analytics service
export const realTimeAnalyticsService = new RealTimeAnalyticsService();

// React hook for live analytics
export function useLiveAnalytics(blogId) {
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Subscribe to live metrics
    const unsubscribeMetrics = realTimeAnalyticsService.subscribe('live-metrics', (metrics) => {
      setLiveMetrics(metrics);
    });

    const unsubscribePerformance = realTimeAnalyticsService.subscribe('performance-metrics', (performance) => {
      setPerformanceData(performance);
    });

    // Start streaming
    realTimeAnalyticsService.startStreaming(blogId, blogId);
    setIsStreaming(true);

    return () => {
      unsubscribeMetrics();
      unsubscribePerformance();
      realTimeAnalyticsService.stopStreaming();
      setIsStreaming(false);
    };
  }, [blogId]);

  return {
    liveMetrics,
    performanceData,
    isStreaming
  };
}

// Hook for tracking user interactions in real-time
export function useInteractionTracking() {
  const trackInteraction = (type, data = {}) => {
    realTimeAnalyticsService.notifySubscribers('live-event', {
      type: 'interaction',
      data: {
        type,
        ...data,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
  };

  const trackPageView = (contentId, slug) => {
    realTimeAnalyticsService.notifySubscribers('live-event', {
      type: 'page_view',
      data: {
        contentId,
        slug,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href
      }
    });
  };

  return {
    trackInteraction,
    trackPageView
  };
}