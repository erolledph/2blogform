import { useState, useEffect, useRef } from 'react';

// Simple in-memory cache with TTL support
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttl = 5 * 60 * 1000) { // Default 5 minutes TTL
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  clear() {
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
}

// Global cache instance
const globalCache = new CacheManager();

export function useCache() {
  return {
    set: (key, value, ttl) => globalCache.set(key, value, ttl),
    get: (key) => globalCache.get(key),
    delete: (key) => globalCache.delete(key),
    clear: () => globalCache.clear(),
    has: (key) => globalCache.has(key)
  };
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