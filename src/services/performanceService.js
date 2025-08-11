import React from 'react';

// Performance monitoring service
class PerformanceMonitoringService {
  constructor() {
    this.metrics = new Map();
    this.subscribers = new Set();
    this.isMonitoring = false;
    this.performanceObserver = null;
    
    this.thresholds = {
      API_RESPONSE_TIME: 1000, // 1 second
      COMPONENT_RENDER_TIME: 100, // 100ms
      MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
      ERROR_RATE: 5 // 5%
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor navigation timing
    this.trackNavigationTiming();
    
    // Monitor resource timing
    this.trackResourceTiming();
    
    // Monitor memory usage
    this.trackMemoryUsage();
    
    // Monitor error rate
    this.trackErrorRate();
    
    console.log('Performance monitoring started');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    console.log('Performance monitoring stopped');
  }

  trackNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.recordMetric('NAVIGATION_LOAD_TIME', navigation.loadEventEnd - navigation.fetchStart);
        this.recordMetric('DOM_CONTENT_LOADED', navigation.domContentLoadedEventEnd - navigation.fetchStart);
        this.recordMetric('FIRST_PAINT', navigation.responseEnd - navigation.fetchStart);
      }
    }
  }

  trackResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.recordMetric('RESOURCE_LOAD_TIME', entry.duration);
            } else if (entry.entryType === 'measure') {
              this.recordMetric('CUSTOM_MEASURE', entry.duration);
            }
          });
        });
        
        this.performanceObserver.observe({ entryTypes: ['resource', 'measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  trackMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.recordMetric('MEMORY_USED', memory.usedJSHeapSize);
        this.recordMetric('MEMORY_TOTAL', memory.totalJSHeapSize);
        this.recordMetric('MEMORY_LIMIT', memory.jsHeapSizeLimit);
      }, 10000); // Every 10 seconds
    }
  }

  trackErrorRate() {
    let errorCount = 0;
    let totalOperations = 0;
    
    // Track global errors
    window.addEventListener('error', () => {
      errorCount++;
      this.recordMetric('ERROR_RATE', (errorCount / Math.max(totalOperations, 1)) * 100);
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', () => {
      errorCount++;
      this.recordMetric('ERROR_RATE', (errorCount / Math.max(totalOperations, 1)) * 100);
    });
    
    // Track successful operations (you would call this from your API calls)
    this.trackOperation = (success = true) => {
      totalOperations++;
      if (!success) errorCount++;
      this.recordMetric('ERROR_RATE', (errorCount / totalOperations) * 100);
    };
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        values: [],
        latest: value,
        average: value,
        min: value,
        max: value,
        count: 1
      });
    } else {
      const metric = this.metrics.get(name);
      metric.values.push(value);
      metric.latest = value;
      metric.count++;
      
      // Keep only last 100 values for memory efficiency
      if (metric.values.length > 100) {
        metric.values = metric.values.slice(-100);
      }
      
      // Calculate statistics
      metric.average = metric.values.reduce((sum, val) => sum + val, 0) / metric.values.length;
      metric.min = Math.min(...metric.values);
      metric.max = Math.max(...metric.values);
      
      this.metrics.set(name, metric);
    }
    
    // Notify subscribers of metric update
    this.notifySubscribers('metric-updated', { name, value, metric: this.metrics.get(name) });
    
    // Check for performance issues
    this.checkPerformanceThresholds(name, value);
  }

  checkPerformanceThresholds(metricName, value) {
    const threshold = this.thresholds[metricName];
    if (threshold && value > threshold) {
      this.notifySubscribers('performance-warning', {
        metric: metricName,
        value,
        threshold,
        severity: value > threshold * 2 ? 'critical' : 'warning'
      });
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getPerformanceScore() {
    const metrics = this.getMetrics();
    let score = 100;
    
    // Deduct points for poor performance
    Object.entries(this.thresholds).forEach(([metricName, threshold]) => {
      const metric = metrics[metricName];
      if (metric && metric.latest > threshold) {
        const penalty = Math.min(30, (metric.latest / threshold - 1) * 20);
        score -= penalty;
      }
    });
    
    return Math.max(0, Math.round(score));
  }

  getCriticalIssues() {
    const issues = [];
    const metrics = this.getMetrics();
    
    Object.entries(this.thresholds).forEach(([metricName, threshold]) => {
      const metric = metrics[metricName];
      if (metric && metric.latest > threshold * 2) {
        issues.push({
          metric: metricName,
          value: metric.latest,
          threshold,
          severity: 'critical'
        });
      }
    });
    
    return issues;
  }

  getRecommendations() {
    const recommendations = [];
    const metrics = this.getMetrics();
    
    if (metrics.API_RESPONSE_TIME?.latest > this.thresholds.API_RESPONSE_TIME) {
      recommendations.push('Consider implementing request caching or optimizing API endpoints');
    }
    
    if (metrics.MEMORY_USED?.latest > this.thresholds.MEMORY_USAGE) {
      recommendations.push('Memory usage is high - consider implementing virtual scrolling or data pagination');
    }
    
    if (metrics.ERROR_RATE?.latest > this.thresholds.ERROR_RATE) {
      recommendations.push('Error rate is elevated - review error handling and user input validation');
    }
    
    return recommendations;
  }

  subscribe(eventType, callback) {
    this.subscribers.add({ eventType, callback });
    
    return () => {
      this.subscribers.delete({ eventType, callback });
    };
  }

  notifySubscribers(eventType, data) {
    this.subscribers.forEach(({ eventType: subEventType, callback }) => {
      if (subEventType === eventType) {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in performance subscriber:', error);
        }
      }
    });
  }
}

// Global instance
export const performanceService = new PerformanceMonitoringService();

// Hook for using performance monitoring
export function usePerformanceMonitoring() {
  const [performanceData, setPerformanceData] = React.useState(null);
  const [isMonitoring, setIsMonitoring] = React.useState(false);

  React.useEffect(() => {
    setIsMonitoring(performanceService.isMonitoring);
    setPerformanceData({
      metrics: performanceService.getMetrics(),
      score: performanceService.getPerformanceScore(),
      issues: performanceService.getCriticalIssues(),
      recommendations: performanceService.getRecommendations()
    });

    const unsubscribe = performanceService.subscribe('metric-updated', () => {
      setPerformanceData({
        metrics: performanceService.getMetrics(),
        score: performanceService.getPerformanceScore(),
        issues: performanceService.getCriticalIssues(),
        recommendations: performanceService.getRecommendations()
      });
    });

    return unsubscribe;
  }, []);

  return {
    performanceData,
    isMonitoring,
    getPerformanceScore: () => performanceService.getPerformanceScore(),
    getCriticalIssues: () => performanceService.getCriticalIssues(),
    getRecommendations: () => performanceService.getRecommendations()
  };
}

export default performanceService;