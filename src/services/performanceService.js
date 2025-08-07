import { useState, useEffect } from 'react';

// Performance monitoring and optimization service
class PerformanceService {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = {
      LCP: 2500, // Largest Contentful Paint
      FID: 100,  // First Input Delay
      CLS: 0.1,  // Cumulative Layout Shift
      TTFB: 600, // Time to First Byte
      FCP: 1800  // First Contentful Paint
    };
    this.isMonitoring = false;
  }

  // Initialize performance monitoring
  initialize() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupWebVitals();
    this.setupResourceTiming();
    this.setupNavigationTiming();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    
    console.log('Performance monitoring initialized');
  }

  // Setup Core Web Vitals monitoring
  setupWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('LCP', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url,
          size: lastEntry.size
        });
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('LCP', lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          this.recordMetric('FID', entry.processingStart - entry.startTime, {
            eventType: entry.name,
            target: entry.target?.tagName
          });
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('FID', fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('CLS', clsValue, {
              sources: entry.sources?.map(source => source.node?.tagName)
            });
          }
        });
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('CLS', clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  // Setup resource timing monitoring
  setupResourceTiming() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          // Monitor slow resources
          if (entry.duration > 1000) {
            this.recordMetric('SLOW_RESOURCE', entry.duration, {
              name: entry.name,
              type: entry.initiatorType,
              size: entry.transferSize
            });
          }
          
          // Monitor failed resources
          if (entry.transferSize === 0 && entry.duration > 0) {
            this.recordMetric('FAILED_RESOURCE', entry.duration, {
              name: entry.name,
              type: entry.initiatorType
            });
          }
        });
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('RESOURCE', resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  // Setup navigation timing
  setupNavigationTiming() {
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          this.recordMetric('TTFB', entry.responseStart - entry.requestStart);
          this.recordMetric('DOM_LOAD', entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart);
          this.recordMetric('FULL_LOAD', entry.loadEventEnd - entry.loadEventStart);
        });
      });
      
      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('NAVIGATION', navigationObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }
  }

  // Setup memory monitoring
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.recordMetric('MEMORY_USED', memory.usedJSHeapSize, {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
        
        // Warn if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn('High memory usage detected:', usagePercent.toFixed(1) + '%');
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Setup network monitoring
  setupNetworkMonitoring() {
    if ('connection' in navigator) {
      const updateConnectionInfo = () => {
        const connection = navigator.connection;
        this.recordMetric('NETWORK_TYPE', connection.effectiveType, {
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };
      
      navigator.connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo(); // Initial reading
    }
  }

  // Record performance metric
  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      metadata,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricHistory = this.metrics.get(name);
    metricHistory.push(metric);
    
    // Keep only last 100 entries per metric
    if (metricHistory.length > 100) {
      metricHistory.shift();
    }
    
    // Check thresholds and warn if exceeded
    this.checkThreshold(name, value);
    
    // Send to analytics if configured
    this.sendToAnalytics(metric);
  }

  // Check performance thresholds
  checkThreshold(metricName, value) {
    const threshold = this.thresholds[metricName];
    if (threshold && value > threshold) {
      console.warn(`Performance threshold exceeded for ${metricName}:`, {
        value,
        threshold,
        exceedsBy: value - threshold
      });
      
      // Trigger performance optimization if needed
      this.triggerOptimization(metricName, value);
    }
  }

  // Trigger performance optimizations
  triggerOptimization(metricName, value) {
    switch (metricName) {
      case 'LCP':
        this.optimizeLCP();
        break;
      case 'FID':
        this.optimizeFID();
        break;
      case 'CLS':
        this.optimizeCLS();
        break;
      case 'MEMORY_USED':
        this.optimizeMemory();
        break;
    }
  }

  // LCP optimization
  optimizeLCP() {
    // Preload critical resources
    const criticalImages = document.querySelectorAll('img[data-critical]');
    criticalImages.forEach(img => {
      if (!img.complete) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src;
        document.head.appendChild(link);
      }
    });
  }

  // FID optimization
  optimizeFID() {
    // Defer non-critical JavaScript
    const scripts = document.querySelectorAll('script[data-defer]');
    scripts.forEach(script => {
      if (!script.defer) {
        script.defer = true;
      }
    });
  }

  // CLS optimization
  optimizeCLS() {
    // Add size attributes to images without them
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });
  }

  // Memory optimization
  optimizeMemory() {
    // Clear old cache entries
    if (window.cacheManager) {
      window.cacheManager.cleanup();
    }
    
    // Suggest garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  // Send metrics to analytics
  sendToAnalytics(metric) {
    // In production, send to your analytics service
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        custom_map: {
          metric_metadata: JSON.stringify(metric.metadata)
        }
      });
    }
  }

  // Get performance report
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      metrics: {},
      summary: {}
    };
    
    // Aggregate metrics
    this.metrics.forEach((history, metricName) => {
      if (history.length > 0) {
        const values = history.map(entry => entry.value);
        const latest = history[history.length - 1];
        
        report.metrics[metricName] = {
          latest: latest.value,
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          lastRecorded: latest.timestamp
        };
      }
    });
    
    // Performance summary
    report.summary = {
      overallScore: this.calculatePerformanceScore(),
      criticalIssues: this.getCriticalIssues(),
      recommendations: this.getRecommendations()
    };
    
    return report;
  }

  // Calculate overall performance score
  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct points for threshold violations
    this.metrics.forEach((history, metricName) => {
      if (history.length > 0) {
        const latest = history[history.length - 1].value;
        const threshold = this.thresholds[metricName];
        
        if (threshold && latest > threshold) {
          const penalty = Math.min(20, (latest / threshold - 1) * 10);
          score -= penalty;
        }
      }
    });
    
    return Math.max(0, Math.round(score));
  }

  // Get critical performance issues
  getCriticalIssues() {
    const issues = [];
    
    this.metrics.forEach((history, metricName) => {
      if (history.length > 0) {
        const latest = history[history.length - 1].value;
        const threshold = this.thresholds[metricName];
        
        if (threshold && latest > threshold * 1.5) { // 50% over threshold
          issues.push({
            metric: metricName,
            value: latest,
            threshold,
            severity: 'critical'
          });
        }
      }
    });
    
    return issues;
  }

  // Get performance recommendations
  getRecommendations() {
    const recommendations = [];
    const issues = this.getCriticalIssues();
    
    issues.forEach(issue => {
      switch (issue.metric) {
        case 'LCP':
          recommendations.push('Optimize images and preload critical resources');
          break;
        case 'FID':
          recommendations.push('Reduce JavaScript execution time and defer non-critical scripts');
          break;
        case 'CLS':
          recommendations.push('Add size attributes to images and reserve space for dynamic content');
          break;
        case 'TTFB':
          recommendations.push('Optimize server response time and use CDN');
          break;
        case 'MEMORY_USED':
          recommendations.push('Optimize memory usage and clear unused data');
          break;
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Cleanup
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
    this.isMonitoring = false;
  }
}

// Global performance service instance
export const performanceService = new PerformanceService();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const [performanceData, setPerformanceData] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    performanceService.initialize();
    setIsMonitoring(true);
    
    // Update performance data every 10 seconds
    const interval = setInterval(() => {
      const report = performanceService.getPerformanceReport();
      setPerformanceData(report);
    }, 10000);

    return () => {
      clearInterval(interval);
      performanceService.cleanup();
      setIsMonitoring(false);
    };
  }, []);

  const getPerformanceScore = () => {
    return performanceData?.summary?.overallScore || 0;
  };

  const getCriticalIssues = () => {
    return performanceData?.summary?.criticalIssues || [];
  };

  const getRecommendations = () => {
    return performanceData?.summary?.recommendations || [];
  };

  return {
    performanceData,
    isMonitoring,
    getPerformanceScore,
    getCriticalIssues,
    getRecommendations
  };
}

// Performance optimization utilities
export const performanceUtils = {
  // Lazy load images
  lazyLoadImages: () => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  },

  // Preload critical resources
  preloadCriticalResources: (resources = []) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as || 'fetch';
      if (resource.type) link.type = resource.type;
      if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
      document.head.appendChild(link);
    });
  },

  // Optimize bundle loading
  optimizeBundleLoading: () => {
    // Preload next likely chunks based on current route
    const currentRoute = window.location.pathname;
    const likelyChunks = getLikelyChunks(currentRoute);
    
    likelyChunks.forEach(chunk => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = chunk;
      document.head.appendChild(link);
    });
  },

  // Measure and optimize render performance
  measureRenderPerformance: (componentName, renderFunction) => {
    const startTime = performance.now();
    
    const result = renderFunction();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performanceService.recordMetric('RENDER_TIME', duration, {
      component: componentName
    });
    
    if (duration > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected in ${componentName}:`, duration + 'ms');
    }
    
    return result;
  }
};

// Get likely chunks based on current route
function getLikelyChunks(currentRoute) {
  const chunkMap = {
    '/dashboard/overview': ['/js/content-features-*.js', '/js/product-features-*.js'],
    '/dashboard/create': ['/js/editor-vendor-*.js', '/js/ui-vendor-*.js'],
    '/dashboard/manage': ['/js/content-features-*.js'],
    '/dashboard/create-product': ['/js/product-features-*.js', '/js/editor-vendor-*.js'],
    '/dashboard/manage-products': ['/js/product-features-*.js'],
    '/dashboard/user-management': ['/js/admin-features-*.js']
  };
  
  return chunkMap[currentRoute] || [];
}

// Initialize performance monitoring on module load
if (typeof window !== 'undefined') {
  // Auto-initialize in production
  if (import.meta.env.PROD) {
    performanceService.initialize();
  }
}