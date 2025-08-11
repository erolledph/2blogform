import { useState, useEffect, useRef } from 'react';
import { useCache } from './useCache';
import { debounce } from '@/utils/helpers';
import { useLocation } from 'react-router-dom';

// Intelligent prefetching hook with user behavior analysis
export function useIntelligentPrefetch() {
  const location = useLocation();
  const cache = useCache();
  const [prefetchQueue, setPrefetchQueue] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const behaviorRef = useRef({
    navigationPatterns: new Map(),
    contentTypes: new Map(),
    timeSpent: new Map(),
    lastActions: [],
    currentPage: location.pathname,
    pageEnterTime: Date.now()
  });

  // Track page changes
  useEffect(() => {
    const behavior = behaviorRef.current;
    const previousPage = behavior.currentPage;
    const currentPage = location.pathname;
    
    if (previousPage !== currentPage) {
      // Track navigation pattern
      const pattern = `${previousPage}->${currentPage}`;
      behavior.navigationPatterns.set(pattern, 
        (behavior.navigationPatterns.get(pattern) || 0) + 1
      );
      
      // Track time spent on previous page
      const timeSpent = Date.now() - behavior.pageEnterTime;
      behavior.timeSpent.set(`${previousPage}_duration`, timeSpent);
      
      // Update current page tracking
      behavior.currentPage = currentPage;
      behavior.pageEnterTime = Date.now();
      
      // Trigger prefetching for likely next pages
      debouncedPrefetch();
    }
  }, [location.pathname]);

  // Track user behavior patterns
  const trackBehavior = (action, data = {}) => {
    const behavior = behaviorRef.current;
    const timestamp = Date.now();
    
    // Track navigation patterns
    if (action === 'navigate') {
      const pattern = `${data.from}->${data.to}`;
      behavior.navigationPatterns.set(pattern, 
        (behavior.navigationPatterns.get(pattern) || 0) + 1
      );
    }
    
    // Track content type preferences
    if (action === 'view_content') {
      const contentType = data.type || 'unknown';
      behavior.contentTypes.set(contentType,
        (behavior.contentTypes.get(contentType) || 0) + 1
      );
    }
    
    // Track time spent on pages
    if (action === 'page_enter') {
      behavior.timeSpent.set(data.page, timestamp);
      behavior.pageEnterTime = timestamp;
    } else if (action === 'page_exit') {
      const enterTime = behavior.timeSpent.get(data.page);
      if (enterTime) {
        const duration = timestamp - enterTime;
        behavior.timeSpent.set(`${data.page}_duration`, duration);
      }
    }
    
    // Keep last 50 actions for pattern analysis
    behavior.lastActions = [
      { action, data, timestamp },
      ...behavior.lastActions.slice(0, 49)
    ];
  };

  // Predict next likely actions based on behavior
  const predictNextActions = () => {
    const behavior = behaviorRef.current;
    const predictions = [];
    
    // Analyze navigation patterns
    const currentPage = window.location.pathname;
    const relevantPatterns = Array.from(behavior.navigationPatterns.entries())
      .filter(([pattern]) => pattern.startsWith(currentPage))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    relevantPatterns.forEach(([pattern, frequency]) => {
      const targetPage = pattern.split('->')[1];
      predictions.push({
        type: 'navigation',
        target: targetPage,
        confidence: frequency / 10, // Normalize confidence score
        priority: 'medium'
      });
    });
    
    // Predict based on common dashboard patterns
    if (currentPage === '/dashboard/overview') {
      predictions.push(
        { type: 'navigation', target: '/dashboard/manage', confidence: 0.8, priority: 'high' },
        { type: 'navigation', target: '/dashboard/create', confidence: 0.6, priority: 'medium' },
        { type: 'navigation', target: '/dashboard/analytics', confidence: 0.5, priority: 'low' }
      );
    } else if (currentPage === '/dashboard/manage') {
      predictions.push(
        { type: 'navigation', target: '/dashboard/create', confidence: 0.7, priority: 'high' },
        { type: 'navigation', target: '/dashboard/analytics', confidence: 0.6, priority: 'medium' }
      );
    } else if (currentPage.includes('/dashboard/create')) {
      predictions.push(
        { type: 'navigation', target: '/dashboard/manage', confidence: 0.9, priority: 'high' },
        { type: 'navigation', target: '/dashboard/storage', confidence: 0.5, priority: 'medium' }
      );
    }
    
    // Analyze content type preferences
    const preferredContentTypes = Array.from(behavior.contentTypes.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);
    
    preferredContentTypes.forEach(([contentType, frequency]) => {
      predictions.push({
        type: 'content_type',
        target: contentType,
        confidence: frequency / 20,
        priority: 'low'
      });
    });
    
    // Time-based predictions (if user typically stays long, prefetch related content)
    const recentActions = behavior.lastActions.slice(0, 10);
    const hasLongSessions = recentActions.some(action => 
      action.data.duration && action.data.duration > 60000 // 1 minute
    );
    
    if (hasLongSessions) {
      predictions.push({
        type: 'related_content',
        target: 'current_page_related',
        confidence: 0.7,
        priority: 'high'
      });
    }
    
    return predictions.filter(p => p.confidence > 0.3); // Only high-confidence predictions
  };

  // Execute prefetch operations
  const executePrefetch = async (prediction) => {
    try {
      switch (prediction.type) {
        case 'navigation':
          await prefetchPageData(prediction.target);
          break;
        case 'content_type':
          await prefetchContentByType(prediction.target);
          break;
        case 'related_content':
          await prefetchRelatedContent();
          break;
      }
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  };

  // Prefetch page data
  const prefetchPageData = async (pagePath) => {
    const cacheKey = `prefetch-page-${pagePath}`;
    
    if (cache.has(cacheKey)) return;
    
    // Prefetch data based on page type
    let pageData = { page: pagePath, prefetched: true, timestamp: Date.now() };
    
    try {
      if (pagePath.includes('/dashboard/manage')) {
        // Prefetch content list
        const { contentService } = await import('@/services/contentService');
        const userId = getCurrentUserId();
        const blogId = getCurrentBlogId();
        if (userId && blogId) {
          pageData.content = await contentService.fetchAllContent(userId, blogId);
        }
      } else if (pagePath.includes('/dashboard/analytics')) {
        // Prefetch analytics data
        const { analyticsService } = await import('@/services/analyticsService');
        const userId = getCurrentUserId();
        const blogId = getCurrentBlogId();
        if (userId && blogId) {
          pageData.analytics = await analyticsService.getSiteAnalytics(userId, blogId);
        }
      } else if (pagePath.includes('/dashboard/storage')) {
        // Prefetch storage stats
        const { storageService } = await import('@/services/storageService');
        const userId = getCurrentUserId();
        if (userId) {
          pageData.storageStats = await storageService.getUserStorageStats(userId);
        }
      }
    } catch (error) {
      console.warn('Error prefetching page data:', error);
      // Continue with basic page data
    }
    
    cache.set(cacheKey, pageData, 5 * 60 * 1000); // 5 minutes TTL
  };

  // Prefetch content by type
  const prefetchContentByType = async (contentType) => {
    const cacheKey = `prefetch-content-${contentType}`;
    
    if (cache.has(cacheKey)) return;
    
    try {
      const { contentService } = await import('@/services/contentService');
      const userId = getCurrentUserId();
      const blogId = getCurrentBlogId();
      
      if (userId && blogId) {
        const allContent = await contentService.fetchAllContent(userId, blogId);
        const filteredContent = allContent.filter(item => 
          item.categories?.includes(contentType) || 
          item.tags?.includes(contentType)
        );
        
        const contentData = { 
          type: contentType, 
          items: filteredContent, 
          prefetched: true 
        };
        
        cache.set(cacheKey, contentData, 3 * 60 * 1000); // 3 minutes TTL
      }
    } catch (error) {
      console.warn('Error prefetching content by type:', error);
    }
  };

  // Prefetch related content
  const prefetchRelatedContent = async () => {
    const cacheKey = 'prefetch-related-current';
    
    if (cache.has(cacheKey)) return;
    
    try {
      const currentPath = window.location.pathname;
      
      if (currentPath.includes('/dashboard/edit/') || currentPath.includes('/dashboard/create')) {
        // Prefetch storage images for content creation
        const { storageService } = await import('@/services/storageService');
        const userId = getCurrentUserId();
        
        if (userId) {
          const relatedData = { 
            related: true, 
            storageImages: await getStorageImages(userId),
            prefetched: true 
          };
          
          cache.set(cacheKey, relatedData, 2 * 60 * 1000); // 2 minutes TTL
        }
      }
    } catch (error) {
      console.warn('Error prefetching related content:', error);
    }
  };

  // Helper functions
  const getCurrentUserId = () => {
    // Get from auth context or localStorage
    return window.currentUser?.uid || null;
  };

  const getCurrentBlogId = () => {
    // Get from current context or URL
    return window.activeBlogId || null;
  };

  const getStorageImages = async (userId) => {
    try {
      const { storage } = await import('@/firebase');
      const { ref, listAll } = await import('firebase/storage');
      
      const storageRef = ref(storage, `users/${userId}/public_images`);
      const result = await listAll(storageRef);
      
      return result.items.slice(0, 20).map(item => ({
        name: item.name,
        fullPath: item.fullPath
      }));
    } catch (error) {
      console.warn('Error getting storage images:', error);
      return [];
    }
  };

  // Debounced prefetch execution
  const debouncedPrefetch = debounce(async () => {
    if (!isActive) return;
    
    const predictions = predictNextActions();
    
    // Sort by priority and confidence
    const sortedPredictions = predictions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const scoreA = priorityWeight[a.priority] * a.confidence;
      const scoreB = priorityWeight[b.priority] * b.confidence;
      return scoreB - scoreA;
    });
    
    // Execute top 3 predictions
    const topPredictions = sortedPredictions.slice(0, 3);
    
    for (const prediction of topPredictions) {
      await executePrefetch(prediction);
    }
  }, 1000);

  // Monitor user activity for prefetching
  useEffect(() => {
    const handleUserActivity = () => {
      debouncedPrefetch();
    };

    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
    };

    // Track mouse movement and clicks for activity detection
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [debouncedPrefetch]);

  // Prefetch specific data
  const prefetchData = async (key, fetchFunction, priority = 'medium') => {
    if (cache.has(key)) return cache.get(key);
    
    setPrefetchQueue(prev => [...prev, { key, priority, timestamp: Date.now() }]);
    
    try {
      const data = await fetchFunction();
      cache.set(key, data, 5 * 60 * 1000); // 5 minutes default TTL
      
      setPrefetchQueue(prev => prev.filter(item => item.key !== key));
      return data;
    } catch (error) {
      setPrefetchQueue(prev => prev.filter(item => item.key !== key));
      throw error;
    }
  };

  // Get prefetch statistics
  const getPrefetchStats = () => {
    return {
      queueLength: prefetchQueue.length,
      cacheSize: cache.size || 0,
      isActive,
      behaviorPatterns: {
        navigationPatterns: behaviorRef.current.navigationPatterns.size,
        contentTypes: behaviorRef.current.contentTypes.size,
        recentActions: behaviorRef.current.lastActions.length
      }
    };
  };

  // Prefetch for specific routes
  const prefetchRoute = async (route) => {
    return prefetchData(`route-${route}`, async () => {
      // Route-specific prefetching logic
      return { route, prefetched: true, timestamp: Date.now() };
    }, 'high');
  };

  return {
    trackBehavior,
    prefetchData,
    prefetchRoute,
    getPrefetchStats,
    isActive,
    setIsActive
  };
}

// Hook for route-based prefetching
export function useRoutePrefetch(routes = []) {
  const { prefetchData } = useIntelligentPrefetch();
  const [prefetchedRoutes, setPrefetchedRoutes] = useState(new Set());

  const prefetchRoute = async (route) => {
    if (prefetchedRoutes.has(route)) return;
    
    try {
      await prefetchData(`route-${route}`, async () => {
        // This would fetch route-specific data
        return { route, prefetched: true, timestamp: Date.now() };
      });
      
      setPrefetchedRoutes(prev => new Set([...prev, route]));
    } catch (error) {
      console.warn(`Failed to prefetch route ${route}:`, error);
    }
  };

  const prefetchAllRoutes = async () => {
    const promises = routes.map(route => prefetchRoute(route));
    await Promise.allSettled(promises);
  };

  return {
    prefetchRoute,
    prefetchAllRoutes,
    prefetchedRoutes: Array.from(prefetchedRoutes)
  };
}

// Hook for content-based prefetching
export function useContentPrefetch(contentId, blogId) {
  const { prefetchData } = useIntelligentPrefetch();

  const prefetchRelatedContent = async () => {
    return prefetchData(`related-${contentId}`, async () => {
      // This would fetch related content based on tags, categories, etc.
      return { contentId, related: [], prefetched: true };
    });
  };

  const prefetchContentAnalytics = async () => {
    return prefetchData(`analytics-${contentId}`, async () => {
      // This would fetch analytics data for the content
      return { contentId, analytics: {}, prefetched: true };
    });
  };

  const prefetchContentImages = async () => {
    return prefetchData(`images-${contentId}`, async () => {
      // This would prefetch images used in the content
      return { contentId, images: [], prefetched: true };
    });
  };

  return {
    prefetchRelatedContent,
    prefetchContentAnalytics,
    prefetchContentImages
  };
}