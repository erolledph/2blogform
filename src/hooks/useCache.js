import { useState, useEffect, useRef } from 'react';

// Simple in-memory cache with TTL support
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.prefetchQueue = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0
    };
    this.maxSize = 100; // Maximum number of cached items
    this.cleanupInterval = null;
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // Start periodic cleanup to prevent memory leaks
  startPeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Cleanup expired entries and enforce size limits
  cleanup() {
    const now = Date.now();
    let removedCount = 0;
    
    // Remove expired entries
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.delete(key);
        removedCount++;
      }
    }
    
    // Enforce size limit by removing oldest entries
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.maxSize);
      toRemove.forEach(([key]) => this.delete(key));
      removedCount += toRemove.length;
    }
    
    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} entries`);
    }
  }
  set(key, value, ttl = 5 * 60 * 1000) { // Default 5 minutes TTL
    this.stats.sets++;
    
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Enforce size limit before adding new entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return item.value;
  }

  delete(key) {
    this.stats.deletes++;
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  clear() {
    this.stats.clears++;
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;
    
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  // Get most accessed items
  getMostAccessed(limit = 10) {
    return Array.from(this.cache.entries())
      .sort(([,a], [,b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key, item]) => ({
        key,
        accessCount: item.accessCount,
        lastAccessed: new Date(item.lastAccessed)
      }));
  }

  // Prefetch data intelligently
  async prefetch(key, fetchFunction, priority = 'low') {
    if (this.has(key)) return this.get(key);
    
    // Add to prefetch queue if not already prefetching
    if (!this.prefetchQueue.has(key)) {
      this.prefetchQueue.set(key, {
        fetchFunction,
        priority,
        timestamp: Date.now()
      });
      
      // Execute immediately for high priority
      if (priority === 'high') {
        return this.executePrefetch(key);
      }
    }
    
    return null;
  }

  // Initialize prefetch queue if not exists
  // Execute prefetch task
  async executePrefetch(key) {
    const task = this.prefetchQueue.get(key);
    if (!task) return null;
    
    try {
      const data = await task.fetchFunction();
      this.set(key, data, 10 * 60 * 1000); // 10 minutes TTL for prefetched data
      this.prefetchQueue.delete(key);
      return data;
    } catch (error) {
      console.warn('Prefetch failed for', key, error);
      this.prefetchQueue.delete(key);
      return null;
    }
  }

  // Execute all queued prefetch tasks
  async executePrefetchQueue() {
    const tasks = Array.from(this.prefetchQueue.entries())
      .sort(([,a], [,b]) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
    
    // Execute up to 3 tasks concurrently
    const concurrentTasks = tasks.slice(0, 3);
    await Promise.allSettled(
      concurrentTasks.map(([key]) => this.executePrefetch(key))
    );
  }

  // Set maximum cache size
  setMaxSize(size) {
    this.maxSize = size;
    this.cleanup(); // Cleanup if current size exceeds new limit
  }

  // Destroy cache manager
  destroy() {
    this.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global cache instance
const globalCache = new CacheManager();

export function useCache() {
  // Return the global cache instance directly to prevent infinite re-renders
  return globalCache;
}

// Hook for cached data fetching
export function useCachedData(key, fetchFunction, dependencies = [], ttl = 5 * 60 * 1000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cache = useCache();
  const fetchFunctionRef = useRef(fetchFunction);

  // Update ref when fetchFunction changes
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first unless force refresh
      if (!forceRefresh && cache.has(key)) {
        const cachedData = cache.get(key);
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }

      // Fetch fresh data
      const freshData = await fetchFunctionRef.current();
      
      // Cache the result
      cache.set(key, freshData, ttl);
      setData(freshData);
      
      return freshData;
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching data for key ${key}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = () => fetchData(true);
  const invalidate = () => {
    cache.delete(key);
    fetchData(true);
  };

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isFromCache: cache.has(key)
  };
}