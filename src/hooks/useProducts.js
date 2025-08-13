import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { productsService } from '@/services/productsService';
import { useCachedData } from '@/hooks/useCache';
import { realTimeManager } from '@/services/realTimeService';

export function useProducts(blogId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Use cached data with 3-minute TTL for products
  const {
    data: cachedProducts,
    loading: cacheLoading,
    error: cacheError,
    refetch: refetchCached,
    invalidate
  } = useCachedData(
    `products-${currentUser?.uid}-${blogId}`,
    () => productsService.fetchAllProducts(currentUser?.uid, blogId),
    [currentUser?.uid, blogId],
    2 * 60 * 1000 // Reduced to 2 minutes TTL for more frequent updates
  );

  // Subscribe to real-time product updates
  useEffect(() => {
    const unsubscribe = realTimeManager.subscribe('product-update', (update) => {
      if (update.blogId === blogId) {
        handleRealTimeProductUpdate(update);
      }
    });
    
    return unsubscribe;
  }, [blogId]);

  const handleRealTimeProductUpdate = (update) => {
    switch (update.type) {
      case 'created':
        setProducts(prev => [update.data, ...prev]);
        break;
      case 'updated':
        setProducts(prev => prev.map(item => 
          item.id === update.data.id ? { ...item, ...update.data } : item
        ));
        break;
      case 'deleted':
        setProducts(prev => prev.filter(item => item.id !== update.data.id));
        break;
      case 'status-changed':
        setProducts(prev => prev.map(item => 
          item.id === update.data.id 
            ? { ...item, status: update.data.status, updatedAt: new Date() }
            : item
        ));
        break;
    }
  };
  // Update local state when cached data changes
  useEffect(() => {
    if (cachedProducts) {
      // Convert Firestore timestamps to JavaScript Date objects for consistency
      const processedData = cachedProducts.map(item => ({
        ...item,
        createdAt: item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt,
        updatedAt: item.updatedAt?.toDate ? item.updatedAt.toDate() : item.updatedAt
      }));
      setProducts(processedData);
    }
    setLoading(cacheLoading);
    setError(cacheError);
  }, [cachedProducts, cacheLoading, cacheError]);

  const fetchProducts = async () => {
    if (!currentUser?.uid || !blogId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await productsService.fetchAllProducts(currentUser.uid, blogId);
      
      // Convert Firestore timestamps to JavaScript Date objects for consistency
      const processedData = data.map(item => ({
        ...item,
        createdAt: item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt,
        updatedAt: item.updatedAt?.toDate ? item.updatedAt.toDate() : item.updatedAt
      }));
      
      setProducts(processedData);
      // Update cache with fresh data
      if (invalidate) invalidate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced refetch with real-time notification
  const enhancedRefetch = useCallback(async () => {
    try {
      await (refetchCached || fetchProducts)();
      
      // Notify real-time manager of data refresh
      realTimeManager.notifySubscribers('data-refreshed', {
        dataKey: 'products',
        blogId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast.error('Failed to refresh products');
    }
  }, [refetchCached, fetchProducts, blogId]);
  return {
    products,
    setProducts,
    loading,
    error,
    refetch: enhancedRefetch,
    invalidateCache: invalidate || (() => {})
  };
}

export function useProductStats(blogId) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    recentProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.uid || !blogId) {
        setStats({
          totalProducts: 0,
          publishedProducts: 0,
          draftProducts: 0,
          recentProducts: 0
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await productsService.getProductStats(currentUser.uid, blogId);
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser?.uid, blogId]);

  return { stats, loading, error };
}

export function useProductById(id, blogId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!id || !currentUser?.uid || !blogId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productsService.fetchProductById(currentUser.uid, id, blogId);
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, currentUser?.uid, blogId]);

  return { product, loading, error };
}