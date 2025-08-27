import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

// Progressive data loader with virtual scrolling for large datasets
export default function ProgressiveDataLoader({
  data = [],
  renderItem,
  itemHeight = 60,
  containerHeight = 400,
  loadMoreThreshold = 5,
  onLoadMore = null,
  loading = false,
  hasMore = false,
  skeleton = null,
  className = ''
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  
  // Intersection observer for load more
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px'
  });

  // Calculate visible items based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 5, data.length); // Buffer of 5 items
      
      setScrollTop(scrollTop);
      setVisibleRange({ start: Math.max(0, start - 5), end });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener('scroll', handleScroll);
  }, [data.length, itemHeight]);

  // Trigger load more when in view
  useEffect(() => {
    if (inView && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  const visibleItems = data.slice(visibleRange.start, visibleRange.end);
  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={item.id || visibleRange.start + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
        
        {/* Load more trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            {loading ? (
              skeleton || (
                <div className="animate-pulse flex space-x-4 w-full p-4">
                  <div className="rounded-full bg-muted h-10 w-10"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Scroll to load more...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for progressive data loading
export function useProgressiveLoading(fetchFunction, pageSize = 20) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(null);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);
      
      const newData = await fetchFunction(page, pageSize);
      
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      
      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setData([]);
    setPage(0);
    setHasMore(true);
    setError(null);
    await loadMore();
  };

  // Initial load
  useEffect(() => {
    loadMore();
  }, []);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    refresh
  };
}