// Performance monitoring service
import { useState, useEffect } from 'react';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      API_RESPONSE_TIME: 1000, // 1 second
      MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
      RENDER_TIME: 16, // 16ms for 60fps
      BUNDLE_SIZE: 1024 * 1024, // 1MB
      CACHE_HIT_RATE: 80 // 80%
    };
    
    this.startMonitoring();
  }

  // Start performance monitoring
  startMonitoring() {
    // Monitor API response times
    this.interceptFetch();
    
    // Monitor memory usage
    this.monitorMemory();
    
    // Monitor render performance
    this.monitorRenderPerformance();
    
    // Monitor bundle size
    this.monitorBundleSize();
  }

  // Intercept fetch to monitor API performance
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordMetric('API_RESPONSE_TIME', responseTime);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordMetric('API_RESPONSE_TIME', responseTime, false);
        throw error;
      }
    };
  }

  // Monitor memory usage
  monitorMemory() {
    if ('memory' in performance) {
      setInterval(() => {
        const memoryInfo = performance.memory;
        this.recordMetric('MEMORY_USAGE', memoryInfo.usedJSHeapSize);
      }, 5000);
    }
  }

  // Monitor render performance
  monitorRenderPerformance() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure') {
              this.recordMetric('RENDER_TIME', entry.duration);
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (error) {
        console.warn('Performance observer not available:', error);
      }
    }
  }

  // Monitor bundle size
  monitorBundleSize() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'resource' && entry.name.includes('.js')) {
              this.recordMetric('BUNDLE_SIZE', entry.transferSize);
            }
          });
        });
        
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource observer not available:', error);
      }
    }
  }

  // Record metric
  recordMetric(metricName, value, success = true) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, {
        values: [],
        latest: 0,
        average: 0,
        min: Infinity,
        max: 0,
        successRate: 100
      });
    }
    
    const metric = this.metrics.get(metricName);
    metric.values.push({ value, success, timestamp: Date.now() });
    
    // Keep only last 100 values
    if (metric.values.length > 100) {
      metric.values.shift();
    }
    
    // Update statistics
    const successfulValues = metric.values.filter(v => v.success).map(v => v.value);
    metric.latest = value;
    metric.average = successfulValues.reduce((sum, val) => sum + val, 0) / successfulValues.length || 0;
    metric.min = Math.min(...successfulValues);
    metric.max = Math.max(...successfulValues);
    metric.successRate = (metric.values.filter(v => v.success).length / metric.values.length) * 100;
  }

  // Get performance score (0-100)
  getPerformanceScore() {
    let score = 100;
    
    Object.entries(this.thresholds).forEach(([metricName, threshold]) => {
      const metric = this.metrics.get(metricName);
      if (metric && metric.latest > 0) {
        if (metric.latest > threshold) {
          score -= 20; // Deduct 20 points for each threshold violation
        } else if (metric.latest > threshold * 0.8) {
          score -= 10; // Deduct 10 points for near-threshold values
        }
      }
    });
    
    return Math.max(0, score);
  }

  // Get critical issues
  getCriticalIssues() {
    const issues = [];
    
    Object.entries(this.thresholds).forEach(([metricName, threshold]) => {
      const metric = this.metrics.get(metricName);
      if (metric && metric.latest > threshold) {
        issues.push({
          metric: metricName,
          value: metric.latest,
          threshold,
          severity: metric.latest > threshold * 1.5 ? 'high' : 'medium'
        });
      }
    });
    
    return issues;
  }

  // Get recommendations
  getRecommendations() {
    const recommendations = [];
    const issues = this.getCriticalIssues();
    
    issues.forEach(issue => {
      switch (issue.metric) {
        case 'API_RESPONSE_TIME':
          recommendations.push('Consider implementing request caching or optimizing API endpoints');
          break;
        case 'MEMORY_USAGE':
          recommendations.push('Check for memory leaks and optimize component re-renders');
          break;
        case 'RENDER_TIME':
          recommendations.push('Optimize component rendering and consider virtualization for large lists');
          break;
        case 'BUNDLE_SIZE':
          recommendations.push('Consider code splitting and removing unused dependencies');
          break;
      }
    });
    
    return recommendations;
  }

  // Get all metrics
  getAllMetrics() {
    const result = {};
    this.metrics.forEach((metric, name) => {
      result[name] = { ...metric };
    });
    return result;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for using performance monitoring
export function usePerformanceMonitoring() {
  const [performanceData, setPerformanceData] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(true);

  useEffect(() => {
    const updateData = () => {
      setPerformanceData({
        metrics: performanceMonitor.getAllMetrics(),
        score: performanceMonitor.getPerformanceScore(),
        issues: performanceMonitor.getCriticalIssues(),
        recommendations: performanceMonitor.getRecommendations()
      });
    };

    // Initial update
    updateData();
    
    // Update every 5 seconds
    const interval = setInterval(updateData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getPerformanceScore = () => {
    return performanceMonitor.getPerformanceScore();
  };

  const getCriticalIssues = () => {
    return performanceMonitor.getCriticalIssues();
  };

  const getRecommendations = () => {
    return performanceMonitor.getRecommendations();
  };

  return {
    performanceData,
    isMonitoring,
    getPerformanceScore,
    getCriticalIssues,
    getRecommendations
  };
}

export default performanceMonitor;