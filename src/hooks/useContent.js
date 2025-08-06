import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { contentService } from '@/services/contentService';
import { useCachedData } from '@/hooks/useCache';

export function useContent(blogId) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Use cached data with 3-minute TTL for content
  const {
    data: cachedContent,
    loading: cacheLoading,
    error: cacheError,
    refetch: refetchCached,
    invalidate
  } = useCachedData(
    `content-${currentUser?.uid}-${blogId}`,
    () => contentService.fetchAllContent(currentUser?.uid, blogId),
    [currentUser?.uid, blogId],
    3 * 60 * 1000 // 3 minutes TTL
  );

  // Update local state when cached data changes
  useEffect(() => {
    if (cachedContent) {
      setContent(cachedContent);
    }
    setLoading(cacheLoading);
    setError(cacheError);
  }, [cachedContent, cacheLoading, cacheError]);

  const fetchContent = async () => {
    if (!currentUser?.uid || !blogId) {
      setContent([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await contentService.fetchAllContent(currentUser.uid, blogId);
      setContent(data);
      // Update cache with fresh data
      invalidate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    content,
    setContent,
    loading,
    error,
    refetch: refetchCached,
    invalidateCache: invalidate
  };
}

export function useContentStats(blogId) {
  const [stats, setStats] = useState({
    totalContent: 0,
    publishedContent: 0,
    draftContent: 0,
    recentContent: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.uid || !blogId) {
        setStats({
          totalContent: 0,
          publishedContent: 0,
          draftContent: 0,
          recentContent: 0
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await contentService.getContentStats(currentUser.uid, blogId);
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

export function useContentById(id, blogId) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!id || !currentUser?.uid || !blogId) {
      setContent(null);
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await contentService.fetchContentById(currentUser.uid, id, blogId);
        setContent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, currentUser?.uid, blogId]);

  return { content, loading, error };
}